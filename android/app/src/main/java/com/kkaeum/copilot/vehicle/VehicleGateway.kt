package com.kkaeum.copilot.vehicle

import ai.pleos.playground.vehicle.Vehicle
import ai.pleos.playground.vehicle.api.model.area.SeatArea
import ai.pleos.playground.vehicle.api.model.area.WindowArea
import ai.pleos.playground.vehicle.api.model.capability.AccessType
import ai.pleos.playground.vehicle.api.model.capability.AreaBounds
import ai.pleos.playground.vehicle.api.model.capability.CapabilityConfig
import ai.pleos.playground.vehicle.api.model.capability.HvacTemperatureConfigArray
import ai.pleos.playground.vehicle.api.model.telltale.Telltales
import ai.pleos.playground.vehicle.constant.area.SeatValue
import ai.pleos.playground.vehicle.constant.area.WindowValue
import ai.pleos.playground.vehicle.constant.control.LightSwitch
import ai.pleos.playground.vehicle.constant.control.MoveControl
import ai.pleos.playground.vehicle.constant.unit.TemperatureUnit
import android.content.Context
import android.os.Handler
import android.os.Looper
import com.kkaeum.copilot.util.Barrier
import com.kkaeum.copilot.util.SdkTrace
import com.kkaeum.copilot.util.errorName
import com.kkaeum.copilot.util.label
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Pleos Vehicle SDK 2.3.2: capability discovery at startup, then `act()` maps web actions to setters.
 *
 * Every setter is gated on a cached capability with WRITE access. Control permissions (CONTROL_CAR_*) need
 * App Market approval, so failures are expected: `act()` returns false when unsupported, and async failures
 * (ERROR_SECURITY_PERMISSION, ERROR_DRIVING_RESTRICTED, ...) are reported through [SdkTrace].
 */
class VehicleGateway(context: Context, private val isParked: () -> Boolean) {

    val vehicle = Vehicle(context)
    private val main = Handler(Looper.getMainLooper())

    private val hvac get() = vehicle.getHVAC()
    private val seat get() = vehicle.getSeat()
    private val light get() = vehicle.getLight()
    private val window get() = vehicle.getWindow()

    // Capability cache (written on SDK callback threads, read on the JS bridge thread).
    @Volatile private var recircAreas: List<SeatArea> = emptyList()
    @Volatile private var powerAreas: List<SeatArea> = emptyList()
    @Volatile private var tempBounds: Map<SeatArea, AreaBounds<Float>> = emptyMap()
    @Volatile private var tempStepC = 0.5f
    @Volatile private var fanBounds: Map<SeatArea, AreaBounds<Int>> = emptyMap()
    @Volatile private var ambientBrightness: Map<SeatArea, AreaBounds<Int>> = emptyMap()
    @Volatile private var ambientColorAreas: List<SeatArea> = emptyList()
    @Volatile private var ambientSwitch: Map<SeatArea, List<LightSwitch>> = emptyMap()
    @Volatile private var seatVentBounds: Map<SeatArea, AreaBounds<Int>> = emptyMap()
    @Volatile private var reclineAreas: List<SeatArea> = emptyList()
    @Volatile private var windowBounds: Map<WindowArea, AreaBounds<Int>> = emptyMap()
    @Volatile var dawReadable = false
        private set

    private val autoColorDisabled = AtomicBoolean(false)
    @Volatile private var reclineDeg = UPRIGHT_GUESS_DEG
    @Volatile private var pendingReclineStop: Runnable? = null

    fun start() {
        try {
            vehicle.initialize()
            SdkTrace.ok("Vehicle.initialize()")
        } catch (t: Throwable) {
            SdkTrace.fail("Vehicle.initialize()", t)
        }
    }

    fun release() {
        pendingReclineStop?.let { main.removeCallbacks(it); it.run() }
        runCatching { vehicle.release() }
    }

    /**
     * The area a getter must be called with, as reported by the capability check. On Pleos Connect 2.1.0
     * recirculation is a whole-cabin area and fan speed a front-row area, so a driver-only SeatArea fails.
     */
    fun readArea(kind: String): SeatArea? = when (kind) {
        "recirculation", "ac" -> recircAreas.pickDriver()
        "fan" -> fanBounds.keys.pickDriver()
        "temperature" -> tempBounds.keys.pickDriver()
        "seatVent" -> seatVentBounds.keys.pickDriver()
        else -> null
    }

    // ---- capabilities -------------------------------------------------------------------------------------

    /** Number of [Barrier.arrive] calls [probe] will make. */
    val probeCount = 11

    fun probe(barrier: Barrier) {
        check("HVAC.checkHvacPowerCapabilities", barrier) { done, fail ->
            hvac.checkHvacPowerCapabilities({ cfg: CapabilityConfig, areas: List<SeatArea> ->
                if (cfg.writable) powerAreas = areas
                done(cfg.summary(areas.map { it.label() }))
            }, fail)
        }
        check("HVAC.checkHvacRecirculationCapabilities", barrier) { done, fail ->
            hvac.checkHvacRecirculationCapabilities({ cfg: CapabilityConfig, areas: List<SeatArea> ->
                if (cfg.writable) recircAreas = areas
                done(cfg.summary(areas.map { it.label() }))
            }, fail)
        }
        check("HVAC.checkHvacTemperatureCapabilities", barrier) { done, fail ->
            hvac.checkHvacTemperatureCapabilities({ cfg: CapabilityConfig, bounds: Map<SeatArea, AreaBounds<Float>>, config: HvacTemperatureConfigArray? ->
                if (cfg.writable) tempBounds = bounds
                config?.incrementCelsius?.takeIf { it > 0f }?.let { tempStepC = it }
                done(cfg.summary(bounds.describe() + "step ${config?.incrementCelsius}°C"))
            }, fail)
        }
        check("HVAC.checkHvacFanSpeedCapabilities", barrier) { done, fail ->
            hvac.checkHvacFanSpeedCapabilities({ cfg: CapabilityConfig, bounds: Map<SeatArea, AreaBounds<Int>> ->
                if (cfg.writable) fanBounds = bounds
                done(cfg.summary(bounds.describe()))
            }, fail)
        }
        check("Light.checkAmbientLightBrightnessCapabilities", barrier) { done, fail ->
            light.checkAmbientLightBrightnessCapabilities({ cfg: CapabilityConfig, bounds: Map<SeatArea, AreaBounds<Int>> ->
                if (cfg.writable) ambientBrightness = bounds
                done(cfg.summary(bounds.describe()))
            }, fail)
        }
        check("Light.checkAmbientLightBrightnessColorCapabilities", barrier) { done, fail ->
            light.checkAmbientLightBrightnessColorCapabilities({ cfg: CapabilityConfig, areas: List<SeatArea> ->
                if (cfg.writable) ambientColorAreas = areas
                done(cfg.summary(areas.map { it.label() }))
                areas.firstOrNull()?.let(::traceCurrentAmbientColor)
            }, fail)
        }
        check("Light.checkAmbientLightSwitchCapabilities", barrier) { done, fail ->
            light.checkAmbientLightSwitchCapabilities({ cfg: CapabilityConfig, switches: Map<SeatArea, List<LightSwitch>> ->
                if (cfg.writable) ambientSwitch = switches
                done(cfg.summary(switches.entries.map { "${it.key.label()}=${it.value}" }))
            }, fail)
        }
        check("Seat.checkSeatVentilationCapabilities", barrier) { done, fail ->
            seat.checkSeatVentilationCapabilities({ cfg: CapabilityConfig, bounds: Map<SeatArea, AreaBounds<Int>> ->
                if (cfg.writable) seatVentBounds = bounds
                done(cfg.summary(bounds.describe()))
            }, fail)
        }
        check("Seat.checkMoveSeatBackrestAngleCapabilities", barrier) { done, fail ->
            seat.checkMoveSeatBackrestAngleCapabilities({ cfg: CapabilityConfig, areas: List<SeatArea> ->
                if (cfg.writable) reclineAreas = areas
                done(cfg.summary(areas.map { it.label() }))
            }, fail)
        }
        check("Window.checkWindowPositionCapabilities", barrier) { done, fail ->
            window.checkWindowPositionCapabilities({ cfg: CapabilityConfig, bounds: Map<WindowArea, AreaBounds<Int>> ->
                if (cfg.writable) windowBounds = bounds
                done(cfg.summary(bounds.entries.map { "${it.key.label()}=${it.value.minValue}..${it.value.maxValue}" }))
            }, fail)
        }
        // checkTelltalesCapabilities needs PRIVATE_CAR_SAFETY, so a successful poll is the capability test.
        check("Safety.getTelltalesInfo", barrier) { done, fail ->
            vehicle.getSafety().getTelltalesInfo({ t: Telltales? ->
                dawReadable = true
                done("${t?.telltales?.size ?: 0} telltales")
            }, fail)
        }
    }

    fun capabilities(): JSONObject = JSONObject()
        .put("hvacRecirculation", recircAreas.isNotEmpty())
        .put("hvacTemperature", tempBounds.isNotEmpty())
        .put("hvacFan", fanBounds.isNotEmpty())
        .put("ambientLight", ambientBrightness.isNotEmpty() || ambientColorAreas.isNotEmpty() || ambientSwitch.isNotEmpty())
        .put("seatVentilation", seatVentBounds.isNotEmpty())
        .put("seatRecline", reclineAreas.isNotEmpty())
        .put("window", windowBounds.isNotEmpty())
        .put("daw", dawReadable)

    /**
     * Runs one capability call; retries ERROR_SERVICE_CONNECTION_FAILURE because `initialize()` has no
     * connected callback and the first IPC can race the service bind.
     */
    private fun check(
        call: String,
        barrier: Barrier,
        attempt: Int = 0,
        run: (done: (String) -> Unit, fail: (Exception) -> Unit) -> Unit,
    ) {
        val arrived = AtomicBoolean(false)
        val arrive = { if (arrived.compareAndSet(false, true)) barrier.arrive() }
        val fail: (Exception) -> Unit = { e ->
            SdkTrace.fail(call, e)
            if (e.errorName() == "ERROR_SERVICE_CONNECTION_FAILURE" && attempt < MAX_RETRIES) {
                main.postDelayed({ check(call, barrier, attempt + 1, run) }, RETRY_DELAY_MS)
            } else {
                arrive()
            }
        }
        try {
            run({ summary -> SdkTrace.ok(call, summary); arrive() }, fail)
        } catch (t: Throwable) {
            SdkTrace.fail(call, t)
            arrive()
        }
    }

    // ---- actions ------------------------------------------------------------------------------------------

    /** Returns true when the request was dispatched to the SDK; the SDK outcome arrives in the trace. */
    fun act(kind: String, value: Any?): Boolean = try {
        when (kind) {
            "freshAir" -> setRecirculation(!(value.asBoolean() ?: true))
            "recirculation" -> setRecirculation(value.asBoolean() ?: true)
            "temperature" -> value.asDouble()?.let(::setTemperature) ?: invalid(kind, value)
            "fan" -> value.asDouble()?.let { setFan(it.roundToInt()) } ?: invalid(kind, value)
            "ambient" -> (value as? JSONObject)?.let(::setAmbient) ?: invalid(kind, value)
            "seatVent" -> value.asDouble()?.let { setSeatVentilation(it.roundToInt()) } ?: invalid(kind, value)
            "seatRecline" -> value.asDouble()?.let(::recline) ?: invalid(kind, value)
            "window" -> value.asDouble()?.let(::setWindow) ?: invalid(kind, value)
            "napStart", "napWake", "probe", "engage" -> {
                SdkTrace.line("act($kind) → handled in app (no Vehicle SDK call)")
                true
            }
            else -> {
                SdkTrace.skip("act($kind)", "unknown action")
                false
            }
        }
    } catch (t: Throwable) { // SecurityException when a permission is not granted, IPC errors, ...
        SdkTrace.fail("act($kind)", t)
        false
    }

    private fun setRecirculation(on: Boolean): Boolean {
        val area = recircAreas.pickDriver() ?: return unsupported("HVAC.setHvacRecirculation")
        val call = "HVAC.setHvacRecirculation(${area.label()}, $on)"
        hvac.setHvacRecirculation(area, on, { _: SeatArea?, _: Boolean? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
        return true
    }

    private fun setTemperature(celsius: Double): Boolean {
        val area = tempBounds.keys.pickDriver() ?: return unsupported("HVAC.setHvacTemperature")
        val b = tempBounds.getValue(area)
        val step = tempStepC.toDouble()
        val stepped = ((celsius / step).roundToInt() * step).toFloat() // VC: 0.5 °C steps
        val t = stepped.coerceIn(b.minValue, b.maxValue)
        val call = "HVAC.setHvacTemperature(${area.label()}, $t, CELSIUS)"
        hvac.setHvacTemperature(area, t, TemperatureUnit.CELSIUS, { _: SeatArea?, _: Float? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
        return true
    }

    private fun setFan(level: Int): Boolean {
        val area = fanBounds.keys.pickDriver() ?: return unsupported("HVAC.setHvacFanSpeed")
        val b = fanBounds.getValue(area)
        val v = level.coerceIn(b.minValue, b.maxValue)
        val call = "HVAC.setHvacFanSpeed(${area.label()}, $v)"
        withHvacPower(area) {
            hvac.setHvacFanSpeed(area, v, { _: SeatArea?, _: Int? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
        }
        return true
    }

    /**
     * Fan speed is NOT_AVAILABLE while the climate system is off (emulator 2.1.0: PropertyAsyncError code 2).
     * getHvacPowerState is not trustworthy there (reported on while the VHAL was off), so request power on,
     * which is idempotent, on the capability-reported power area and continue whatever the outcome.
     */
    private fun withHvacPower(fallback: SeatArea, then: () -> Unit) {
        val area = powerAreas.pickDriver() ?: fallback
        val call = "HVAC.setHvacPower(${area.label()}, true)"
        hvac.setHvacPower(area, true, { _: SeatArea?, _: Boolean? -> SdkTrace.ok(call); main.postDelayed(then, 250) }, { e -> SdkTrace.fail(call, e); then() })
    }

    private fun setSeatVentilation(level: Int): Boolean {
        val area = seatVentBounds.keys.pickDriver() ?: return unsupported("Seat.setHvacSeatVentilation")
        val b = seatVentBounds.getValue(area)
        val v = level.coerceIn(b.minValue, b.maxValue)
        val call = "Seat.setHvacSeatVentilation(${area.label()}, $v)"
        seat.setHvacSeatVentilation(area, v, { _: SeatArea?, _: Int? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
        return true
    }

    /** [openPct] 0 = closed .. 100 = fully open, mapped linearly onto the capability bounds (assumes min = closed). */
    private fun setWindow(openPct: Double): Boolean {
        val area = windowBounds.keys.firstOrNull { WindowValue.ROW_1_LEFT in it.values }
            ?: return unsupported("Window.setWindowPosition")
        val b = windowBounds.getValue(area)
        val v = (b.minValue + openPct.coerceIn(0.0, 100.0) / 100.0 * (b.maxValue - b.minValue)).roundToInt()
        val call = "Window.setWindowPosition(${area.label()}, $v)"
        window.setWindowPosition(area, v, { _: WindowArea?, _: Int? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
        return true
    }

    /** value = { color: '#RRGGBB', brightness: 0..100 } */
    private fun setAmbient(value: JSONObject): Boolean {
        val area = (ambientBrightness.keys + ambientColorAreas + ambientSwitch.keys).pickDriver()
            ?: return unsupported("Light.setAmbientLight*")
        val brightness = value.optDouble("brightness", Double.NaN)
        var dispatched = false

        // Drive-mode auto colour would override us; turn it off once (needs CONTROL_CAR_LIGHTS).
        if (autoColorDisabled.compareAndSet(false, true)) {
            val call = "Light.setAmbientColorAutoByDriveModeEnabled(false)"
            light.setAmbientColorAutoByDriveModeEnabled(false, { _: Boolean? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
        }
        ambientSwitch[area]?.let { supported ->
            val sw = if (!brightness.isNaN() && brightness <= 0.0) LightSwitch.OFF else LightSwitch.ON
            if (sw in supported) {
                val call = "Light.setAmbientLightSwitch(${area.label()}, $sw)"
                light.setAmbientLightSwitch(area, sw, { _: SeatArea?, _: LightSwitch? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
                dispatched = true
            }
        }
        val bounds = ambientBrightness[area]
        if (bounds != null && !brightness.isNaN()) {
            val v = brightness.roundToInt().coerceIn(bounds.minValue, bounds.maxValue)
            val call = "Light.setAmbientLightBrightness(${area.label()}, $v)"
            light.setAmbientLightBrightness(area, v, { _: SeatArea?, _: Int? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
            dispatched = true
        }
        val encoded = value.optString("color").takeIf { it.isNotEmpty() }?.let(AmbientColor::encode)
        if (area in ambientColorAreas && encoded != null) {
            val call = "Light.setAmbientLightBrightnessColor(${area.label()}, ${encoded.value} [${encoded.description}])"
            light.setAmbientLightBrightnessColor(area, encoded.value, { _: SeatArea?, _: Int? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
            dispatched = true
        }
        return dispatched || unsupported("Light.setAmbientLight*")
    }

    /**
     * Seat position is jog-only (FORWARD / BACKWARD / STOP). We estimate a run time from the angle delta and
     * always send STOP afterwards. Refused unless parked: moving the driver's seat while driving is unsafe.
     * UNCERTAIN: BACKWARD is assumed to recline the backrest; the starting angle and jog rate are guesses.
     */
    private fun recline(targetDeg: Double): Boolean {
        val call = "Seat.moveSeatBackrestAngle"
        if (!isParked()) {
            SdkTrace.skip(call, "vehicle not confirmed parked (gear P / speed 0)")
            return false
        }
        val area = reclineAreas.pickDriver() ?: return unsupported(call)
        val delta = targetDeg - reclineDeg
        if (abs(delta) < 2.0) return true
        val dir = if (delta > 0) MoveControl.BACKWARD else MoveControl.FORWARD
        val runMs = (abs(delta) / JOG_DEG_PER_SEC * 1000).toLong().coerceIn(500L, MAX_JOG_MS)

        pendingReclineStop?.let { main.removeCallbacks(it) }
        val start = "$call(${area.label()}, $dir)"
        seat.moveSeatBackrestAngle(area, dir, { _: SeatArea?, _: MoveControl? -> SdkTrace.ok(start) }, { e -> SdkTrace.fail(start, e) })
        val stop = Runnable {
            val s = "$call(${area.label()}, STOP) after ${runMs}ms"
            seat.moveSeatBackrestAngle(area, MoveControl.STOP, { _: SeatArea?, _: MoveControl? -> SdkTrace.ok(s) }, { e -> SdkTrace.fail(s, e) })
            pendingReclineStop = null
        }
        pendingReclineStop = stop
        main.postDelayed(stop, runMs)
        reclineDeg = targetDeg
        return true
    }

    private fun traceCurrentAmbientColor(area: SeatArea) {
        val call = "Light.getAmbientLightBrightnessColor(${area.label()})"
        runCatching {
            light.getAmbientLightBrightnessColor(area, { v: Int? -> SdkTrace.ok(call, "raw=$v hex=0x%06X".format((v ?: 0) and 0xFFFFFF)) }, { e -> SdkTrace.fail(call, e) })
        }
    }

    private fun unsupported(call: String): Boolean {
        SdkTrace.skip(call, "capability not writable or not supported")
        return false
    }

    private fun invalid(kind: String, value: Any?): Boolean {
        SdkTrace.skip("act($kind)", "invalid value $value")
        return false
    }

    companion object {
        private const val MAX_RETRIES = 3
        private const val RETRY_DELAY_MS = 700L
        private const val UPRIGHT_GUESS_DEG = 15.0
        private const val JOG_DEG_PER_SEC = 4.0
        private const val MAX_JOG_MS = 8_000L
    }
}

private val CapabilityConfig.writable: Boolean
    get() = accessType == AccessType.WRITE || accessType == AccessType.READ_WRITE

private fun CapabilityConfig.summary(detail: Any): String = "$accessType $detail"

private fun <N> Map<SeatArea, AreaBounds<N>>.describe(): List<String> =
    entries.map { "${it.key.label()}=${it.value.minValue}..${it.value.maxValue}" }

/** The driver is ROW_1_LEFT (KR LHD); a combined area that contains it also qualifies. */
private fun Collection<SeatArea>.pickDriver(): SeatArea? =
    firstOrNull { SeatValue.ROW_1_LEFT in it.values } ?: firstOrNull()

private fun Any?.asBoolean(): Boolean? = when (this) {
    is Boolean -> this
    is Number -> toDouble() != 0.0
    is String -> toBooleanStrictOrNull()
    else -> null
}

private fun Any?.asDouble(): Double? = when (this) {
    is Number -> toDouble().takeIf { it.isFinite() }
    is String -> toDoubleOrNull()
    else -> null
}
