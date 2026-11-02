package com.kkaeum.copilot.vehicle

import ai.pleos.playground.vehicle.Vehicle
import ai.pleos.playground.vehicle.api.model.area.SeatArea
import ai.pleos.playground.vehicle.api.model.area.WindowArea
import ai.pleos.playground.vehicle.api.model.telltale.Telltales
import ai.pleos.playground.vehicle.constant.area.SeatValue
import ai.pleos.playground.vehicle.constant.area.TurnSignalValue
import ai.pleos.playground.vehicle.constant.area.WindowValue
import ai.pleos.playground.vehicle.constant.control.CruiseControl
import ai.pleos.playground.vehicle.constant.telltale.TelltaleState
import ai.pleos.playground.vehicle.constant.telltale.TelltaleType
import ai.pleos.playground.vehicle.constant.unit.TemperatureUnit
import ai.pleos.playground.vehicle.listener.SteeringWheelAngleListener
import ai.pleos.playground.vehicle.listener.TurnSignalStateListener
import android.os.Handler
import android.os.Looper
import com.kkaeum.copilot.util.SdkTrace
import com.kkaeum.copilot.util.errorName
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.sqrt

/**
 * Merges every signal source into the partial `VehicleSignals` object the web engine expects
 * (web/src/engine/types.ts) and pushes it about once per second.
 *
 * Sources: Vehicle SDK getters (slow poll) + steering/turn-signal listeners, CarPropertySource (speed, gear,
 * parking brake, outside temp), LocationGateway (position/heading) and NaviGateway (remaining km / ETA),
 * which write through [put]. Only keys that have a real value are sent: the web keeps its defaults otherwise.
 */
class SignalCollector(private val vehicle: Vehicle, private val push: (String) -> Unit) {

    private val main = Handler(Looper.getMainLooper())
    private val values = ConcurrentHashMap<String, Any>()

    /** Reads that failed permanently (unsupported / no permission) are not polled again. */
    private val dead = ConcurrentHashMap.newKeySet<String>()
    private val occupancy = ConcurrentHashMap<SeatValue, Boolean>()

    private val steeringSamples = ArrayDeque<Float>()
    @Volatile private var steeringAngle: Float? = null
    @Volatile private var turnEvents = 0
    @Volatile private var lastTurnActiveAt = 0L

    // Fallback trip counters when the Odometer trip API is unavailable.
    @Volatile private var sdkTripTime = false
    @Volatile private var sdkTripDistance = false
    @Volatile private var aaosParkingBrake = false
    private var fallbackDriveSec = 0.0
    private var fallbackKm = 0.0

    private var ticks = 0
    private var running = false

    private val steeringListener = object : SteeringWheelAngleListener {
        override fun onSteeringWheelAngleUpdated(angle: Float?) {
            steeringAngle = angle
        }

        override fun onFailed(e: Exception) = SdkTrace.readFail("SteeringWheel.onSteeringWheelAngleUpdated", e)
    }

    private val turnListener = object : TurnSignalStateListener {
        override fun onTurnSignalStateUpdated(state: TurnSignalValue?) {
            if (state == null || state == TurnSignalValue.OFF) return
            // Count a new "use" of the indicator, not every blink edge.
            val now = System.currentTimeMillis()
            if (now - lastTurnActiveAt > TURN_DEBOUNCE_MS) turnEvents++
            lastTurnActiveAt = now
            put("turnSignalEvents", turnEvents)
        }

        override fun onFailed(e: Exception) = SdkTrace.readFail("TurnSignal.onTurnSignalStateUpdated", e)
    }

    fun put(key: String, value: Any?) {
        if (value == null) values.remove(key) else values[key] = value
    }

    /** True only when the car is positively known to be stopped in P (or stopped with the parking brake on). */
    fun isParked(): Boolean {
        val gear = values["gear"] as? String
        val speed = values["speedKph"] as? Double
        val brake = values["parkingBrake"] as? Boolean
        return when {
            gear != null -> gear == "P" && (speed == null || speed < 1.0)
            else -> speed != null && speed < 1.0 && brake == true
        }
    }

    fun start() {
        if (running) return
        running = true
        register("SteeringWheel.registerSteeringWheelAngle") { vehicle.getSteeringWheel().registerSteeringWheelAngle(steeringListener) }
        register("TurnSignal.registerTurnSignalState") { vehicle.getTurnSignal().registerTurnSignalState(turnListener) }
        put("turnSignalEvents", 0)
        main.post(tick)
    }

    fun stop() {
        running = false
        main.removeCallbacks(tick)
        runCatching { vehicle.getSteeringWheel().unregisterSteeringWheelAngle(steeringListener) }
        runCatching { vehicle.getTurnSignal().unregisterTurnSignalState(turnListener) }
    }

    private val tick = object : Runnable {
        override fun run() {
            if (!running) return
            ticks++
            if (ticks % 2 == 1) pollTelltales()
            if (ticks % 3 == 1) pollVehicle()
            sampleSteering()
            accumulateTripFallback()
            push(snapshot())
            main.postDelayed(this, TICK_MS)
        }
    }

    private fun snapshot(): String {
        val o = JSONObject()
        for ((k, v) in values) {
            o.put(k, if (v is DoubleArray) JSONArray(v.toList()) else v)
        }
        return o.toString()
    }

    // ---- Vehicle SDK polling ------------------------------------------------------------------------------

    private fun pollVehicle() {
        val hvac = vehicle.getHVAC()
        read<Float>("HVAC.getHvacTemperature(driver, CELSIUS)", "setTempC") { ok, fail -> hvac.getHvacTemperature(DRIVER, TemperatureUnit.CELSIUS, ok, fail) }
        read<Float>("HVAC.getHvacTemperatureCurrent(driver, CELSIUS)", "cabinTempC") { ok, fail -> hvac.getHvacTemperatureCurrent(DRIVER, TemperatureUnit.CELSIUS, ok, fail) }
        read<Boolean>("HVAC.getHvacRecirculationState(driver)", "recirculation") { ok, fail -> hvac.getHvacRecirculationState(DRIVER, ok, fail) }
        read<Int>("HVAC.getHvacFanSpeed(driver)", "fanSpeed") { ok, fail -> hvac.getHvacFanSpeed(DRIVER, ok, fail) }
        read<Boolean>("HVAC.getHvacAcState(driver)", "acOn") { ok, fail -> hvac.getHvacAcState(DRIVER, ok, fail) }
        read<Int>("Seat.getHvacSeatVentilationState(driver)", "seatVentDriver") { ok, fail -> vehicle.getSeat().getHvacSeatVentilationState(DRIVER, ok, fail) }
        read<Int>("Window.getCurrentWindowPosition(ROW_1_LEFT)", "windowOpenPct") { ok, fail -> vehicle.getWindow().getCurrentWindowPosition(DRIVER_WINDOW, ok, fail) }

        // UNCERTAIN units (undocumented): trip time assumed minutes, distance assumed km.
        read<Int>("Odometer.getTripCurrentDrivingTime", "tripMinutes", { sdkTripTime = true; it }) { ok, fail -> vehicle.getOdometer().getTripCurrentDrivingTime(ok, fail) }
        read<Float>("Odometer.getTripCurrentDrivingDistance", "tripKm", { sdkTripDistance = true; it }) { ok, fail -> vehicle.getOdometer().getTripCurrentDrivingDistance(ok, fail) }

        val drive = vehicle.getDrivingMode()
        read<CruiseControl>("DrivingMode.getCruiseControlState", "cruiseOn", { it == CruiseControl.ACTIVATED || it == CruiseControl.USER_OVERRIDE }) { ok, fail -> drive.getCruiseControlState(ok, fail) }
        read<Any>("DrivingMode.getCurrentDrivingModeState", "driveMode", { it.toString().lowercase() }) { ok, fail -> drive.getCurrentDrivingModeState(ok, fail) }

        for (s in OCCUPANCY_SEATS) {
            val call = "Seat.getCurrentSeatOccupancy(${s.name})"
            if (call in dead) continue
            guarded(call) {
                vehicle.getSeat().getCurrentSeatOccupancy(SeatArea(s), { v: Boolean? ->
                    if (v != null) {
                        SdkTrace.readOk(call, v)
                        occupancy[s] = v
                        put("occupants", maxOf(1, occupancy.values.count { it }))
                    }
                }, { e -> onReadFailed(call, e) })
            }
        }
    }

    /** DAW: TelltaleType.DRIVER_ATTENTION via getTelltalesInfo (registerTelltales needs PRIVATE_CAR_SAFETY). */
    private fun pollTelltales() {
        val call = "Safety.getTelltalesInfo"
        if (call in dead) return
        guarded(call) {
            vehicle.getSafety().getTelltalesInfo({ t: Telltales? ->
                val list = t?.telltales.orEmpty()
                SdkTrace.readOk(call, "${list.size} telltales")
                fun active(type: TelltaleType) = list.any { it.type == type && it.state != TelltaleState.OFF }
                put("dawWarning", active(TelltaleType.DRIVER_ATTENTION))
                // Parking brake has no Vehicle SDK getter; use telltales unless the AAOS property is feeding it.
                if (!aaosParkingBrake) {
                    put("parkingBrake", active(TelltaleType.PARKING_BRAKE) || active(TelltaleType.ELECTRONIC_PARKING_BRAKE))
                }
            }, { e -> onReadFailed(call, e) })
        }
    }

    /** The AAOS PARKING_BRAKE_ON feed, once seen, wins over the telltale fallback. */
    fun putParkingBrakeFromCar(on: Boolean) {
        aaosParkingBrake = true
        put("parkingBrake", on)
    }

    private fun <T> read(
        call: String,
        key: String,
        map: (T) -> Any? = { it },
        fetch: (ok: (T?) -> Unit, fail: (Exception) -> Unit) -> Unit,
    ) {
        if (call in dead) return
        guarded(call) {
            fetch({ v ->
                if (v != null) {
                    SdkTrace.readOk(call, v)
                    put(key, map(v)?.let(::jsonValue))
                }
            }, { e -> onReadFailed(call, e) })
        }
    }

    private inline fun guarded(call: String, block: () -> Unit) {
        try {
            block()
        } catch (t: Throwable) {
            SdkTrace.readFail(call, t)
            dead += call
        }
    }

    private fun onReadFailed(call: String, e: Exception) {
        SdkTrace.readFail(call, e)
        if (e.errorName() in PERMANENT_ERRORS) dead += call
    }

    private fun register(call: String, block: () -> Unit) {
        try {
            block()
            SdkTrace.ok(call)
        } catch (t: Throwable) {
            SdkTrace.fail(call, t)
        }
    }

    // ---- derived signals ----------------------------------------------------------------------------------

    /**
     * steeringActivity 0..1 from the standard deviation of the wheel angle over the last minute.
     * HEURISTIC: 8° σ maps to 1.0; highway lane-keeping is typically 1–3° σ (≈0.15–0.4), matching the web sim.
     */
    private fun sampleSteering() {
        val a = steeringAngle ?: return
        steeringSamples.addLast(a)
        while (steeringSamples.size > STEERING_WINDOW) steeringSamples.removeFirst()
        if (steeringSamples.size < 10) return
        val mean = steeringSamples.average()
        val sd = sqrt(steeringSamples.sumOf { (it - mean) * (it - mean) } / steeringSamples.size)
        put("steeringActivity", (sd / STEERING_SD_FULL).coerceIn(0.0, 1.0))
    }

    private fun accumulateTripFallback() {
        val speed = values["speedKph"] as? Double ?: return
        if (speed < 5.0) return
        fallbackDriveSec += TICK_MS / 1000.0
        fallbackKm += speed * TICK_MS / 3_600_000.0
        if (!sdkTripTime) put("tripMinutes", fallbackDriveSec / 60.0)
        if (!sdkTripDistance) put("tripKm", fallbackKm)
    }

    private fun jsonValue(v: Any): Any = when (v) {
        is Float -> v.toDouble()
        else -> v
    }

    private companion object {
        const val TICK_MS = 1_000L
        const val STEERING_WINDOW = 60
        const val STEERING_SD_FULL = 8.0
        const val TURN_DEBOUNCE_MS = 2_000L

        val DRIVER = SeatArea(SeatValue.ROW_1_LEFT)
        val DRIVER_WINDOW = WindowArea(WindowValue.ROW_1_LEFT)
        val OCCUPANCY_SEATS = listOf(
            SeatValue.ROW_1_LEFT, SeatValue.ROW_1_RIGHT,
            SeatValue.ROW_2_LEFT, SeatValue.ROW_2_CENTER, SeatValue.ROW_2_RIGHT,
        )
        val PERMANENT_ERRORS = setOf(
            "ERROR_NOT_SUPPORTED_PROPERTY", "ERROR_NOT_SUPPORTED_AREA",
            "ERROR_NOT_SUPPORTED_VALUE_TYPE", "ERROR_SECURITY_PERMISSION",
        )
    }
}
