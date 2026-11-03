package com.kkaeum.copilot.vehicle

import ai.pleos.playground.vehicle.Vehicle
import ai.pleos.playground.vehicle.api.model.area.SeatArea
import ai.pleos.playground.vehicle.api.model.area.WindowArea
import ai.pleos.playground.vehicle.api.model.capability.AreaBounds
import ai.pleos.playground.vehicle.api.model.capability.CapabilityConfig
import ai.pleos.playground.vehicle.constant.area.SeatValue
import ai.pleos.playground.vehicle.constant.control.FanDirectionType
import ai.pleos.playground.vehicle.constant.control.LightSwitch
import ai.pleos.playground.vehicle.constant.control.MoveControl
import android.os.Handler
import android.os.Looper
import com.kkaeum.copilot.util.Barrier
import com.kkaeum.copilot.util.SdkTrace
import com.kkaeum.copilot.util.label
import kotlin.math.abs

/**
 * Second-tier interventions, each gated by its own capability check:
 *
 * - heatOff: seat heating and steering-wheel heating off (warmth deepens sleepiness) — only when on.
 * - fanDirection: air to the FACE (cool airflow on the face is the most alerting distribution).
 * - cabinLight: cabin light on/off (wake sequence after a power nap).
 * - lumbarPulse: a short lumbar-support forward/back movement as a haptic nudge (no posture change).
 * - blind / smartGlass: shade the cabin for a nap (parked only).
 * - backrest save / restore: read the backrest position before a nap and drive it back exactly afterwards
 *   (the SDK moves the seat by jog FORWARD / BACKWARD / STOP only).
 */
class ComfortActuators(
    private val vehicle: Vehicle,
    private val isParked: () -> Boolean,
) {
    private val main = Handler(Looper.getMainLooper())
    private val seat get() = vehicle.getSeat()
    private val driver = SeatArea(SeatValue.ROW_1_LEFT)

    @Volatile private var seatTemp: Map<SeatArea, AreaBounds<Int>> = emptyMap()
    @Volatile private var wheelHeat: AreaBounds<Int>? = null
    @Volatile private var fanDirections: Map<SeatArea, List<FanDirectionType>> = emptyMap()
    @Volatile private var cabinLight: List<LightSwitch> = emptyList()
    @Volatile private var lumbarAreas: List<SeatArea> = emptyList()
    @Volatile private var blindAreas: List<WindowArea> = emptyList()
    @Volatile private var smartGlass = false
    @Volatile private var backrestReadable = false
    @Volatile private var savedBackrest: Int? = null


    fun probe(barrier: Barrier) {
        val hvac = vehicle.getHVAC()
        val light = vehicle.getLight()
        val window = vehicle.getWindow()
        check("Seat.checkSeatTemperatureCapabilities", barrier) { ok, fail ->
            seat.checkSeatTemperatureCapabilities({ cfg: CapabilityConfig, b: Map<SeatArea, AreaBounds<Int>> ->
                if (cfg.writable) seatTemp = b
                ok(b.entries.joinToString { "${it.key.label()}=${it.value.minValue}..${it.value.maxValue}" })
            }, fail)
        }
        check("SteeringWheel.checkHvacSteeringWheelHeatCapabilities", barrier) { ok, fail ->
            vehicle.getSteeringWheel().checkHvacSteeringWheelHeatCapabilities({ cfg: CapabilityConfig, b: AreaBounds<Int> ->
                if (cfg.writable) wheelHeat = b
                ok("${b.minValue}..${b.maxValue}")
            }, fail)
        }
        check("HVAC.checkHvacFanDirectionCapabilities", barrier) { ok, fail ->
            hvac.checkHvacFanDirectionCapabilities({ cfg: CapabilityConfig, m: Map<SeatArea, List<FanDirectionType>> ->
                if (cfg.writable) fanDirections = m
                ok(m.entries.joinToString { "${it.key.label()}=${it.value}" })
            }, fail)
        }
        check("Light.checkCabinLightSwitchCapabilities", barrier) { ok, fail ->
            light.checkCabinLightSwitchCapabilities({ cfg: CapabilityConfig, l: List<LightSwitch> ->
                if (cfg.writable) cabinLight = l
                ok(l.toString())
            }, fail)
        }
        check("Seat.checkMoveSeatLumbarForeAftCapabilities", barrier) { ok, fail ->
            seat.checkMoveSeatLumbarForeAftCapabilities({ cfg: CapabilityConfig, a: List<SeatArea> ->
                if (cfg.writable) lumbarAreas = a
                ok(a.joinToString { it.label() })
            }, fail)
        }
        check("Window.checkMoveWindowBlindCapabilities", barrier) { ok, fail ->
            window.checkMoveWindowBlindCapabilities({ cfg: CapabilityConfig, a: List<WindowArea> ->
                if (cfg.writable) blindAreas = a
                ok(a.joinToString { it.label() })
            }, fail)
        }
        check("Window.checkSmartGlassStateCapabilities", barrier) { ok, fail ->
            window.checkSmartGlassStateCapabilities({ cfg: CapabilityConfig ->
                smartGlass = cfg.writable
                ok(cfg.toString())
            }, fail)
        }
        check("Seat.checkSeatBackrestAnglePositionCapabilities", barrier) { ok, fail ->
            seat.checkSeatBackrestAnglePositionCapabilities({ cfg: CapabilityConfig, b: Map<SeatArea, AreaBounds<Int>> ->
                backrestReadable = b.keys.any { SeatValue.ROW_1_LEFT in it.values } || b.isNotEmpty()
                ok(cfg.toString() + " " + b.entries.joinToString { "${it.key.label()}=${it.value.minValue}..${it.value.maxValue}" })
            }, fail)
        }
    }

    fun capabilities(): Map<String, Boolean> = mapOf(
        "heatOff" to (seatTemp.isNotEmpty() || wheelHeat != null),
        "fanDirection" to fanDirections.isNotEmpty(),
        "cabinLight" to cabinLight.isNotEmpty(),
        "lumbarPulse" to lumbarAreas.isNotEmpty(),
        "blind" to blindAreas.isNotEmpty(),
        "smartGlass" to smartGlass,
        "backrestRestore" to backrestReadable,
    )

    /** Returns null when [kind] is not one of ours. */
    fun act(kind: String, value: Any?): Boolean? = when (kind) {
        "heatOff" -> heatOff()
        "fanDirection" -> fanFace()
        "cabinLight" -> setCabinLight(value == true || value == "on")
        "lumbarPulse" -> lumbarPulse()
        "blind" -> blind(close = value == "close" || value == true)
        "smartGlass" -> setSmartGlass(value == true || value == "on")
        else -> null
    }

    private fun heatOff(): Boolean {
        var any = false
        seatTemp.keys.firstOrNull { SeatValue.ROW_1_LEFT in it.values }?.let { area ->
            any = true
            val get = "Seat.getHvacSeatTemperature(${area.label()})"
            seat.getHvacSeatTemperature(area, { level: Int? ->
                SdkTrace.readOk(get, level ?: "null")
                if ((level ?: 0) > 0) {
                    val call = "Seat.setHvacSeatTemperature(${area.label()}, 0)"
                    seat.setHvacSeatTemperature(area, 0, { _: SeatArea?, _: Int? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
                }
            }, { e -> SdkTrace.fail(get, e) })
        }
        wheelHeat?.let {
            any = true
            val wheel = vehicle.getSteeringWheel()
            val get = "SteeringWheel.getHvacSteeringWheelHeatState"
            wheel.getHvacSteeringWheelHeatState({ level: Int? ->
                SdkTrace.readOk(get, level ?: "null")
                if ((level ?: 0) > 0) {
                    val call = "SteeringWheel.setHvacSteeringWheelHeat(0)"
                    wheel.setHvacSteeringWheelHeat(0, { _: Int? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
                }
            }, { e -> SdkTrace.fail(get, e) })
        }
        return any || unsupported("heatOff (seat / steering-wheel heat)")
    }

    private fun fanFace(): Boolean {
        val entry = fanDirections.entries.firstOrNull { SeatValue.ROW_1_LEFT in it.key.values && FanDirectionType.FACE in it.value }
            ?: fanDirections.entries.firstOrNull { FanDirectionType.FACE in it.value }
            ?: return unsupported("HVAC.setHvacFanDirection(FACE)")
        val call = "HVAC.setHvacFanDirection(${entry.key.label()}, FACE)"
        vehicle.getHVAC().setHvacFanDirection(entry.key, FanDirectionType.FACE, { _: SeatArea?, _: FanDirectionType? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
        return true
    }

    private fun setCabinLight(on: Boolean): Boolean {
        val sw = if (on) LightSwitch.ON else LightSwitch.OFF
        if (sw !in cabinLight) return unsupported("Light.setCabinLightSwitch($sw)")
        val call = "Light.setCabinLightSwitch($sw)"
        vehicle.getLight().setCabinLightSwitch(sw, { _: LightSwitch? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
        return true
    }

    /** Lumbar support out then back: ~0.4 s each way, then STOP. Small enough not to change posture. */
    private fun lumbarPulse(): Boolean {
        val area = lumbarAreas.firstOrNull { SeatValue.ROW_1_LEFT in it.values } ?: return unsupported("Seat.moveSeatLumbarForeAft")
        val base = "Seat.moveSeatLumbarForeAft(${area.label()}"
        val move = { dir: MoveControl -> seat.moveSeatLumbarForeAft(area, dir, { _: SeatArea?, _: MoveControl? -> SdkTrace.ok("$base, $dir)") }, { e -> SdkTrace.fail("$base, $dir)", e) }) }
        move(MoveControl.FORWARD)
        main.postDelayed({ move(MoveControl.BACKWARD) }, PULSE_MS)
        main.postDelayed({ move(MoveControl.STOP) }, PULSE_MS * 2)
        return true
    }

    /** Roof / rear blind for a nap. UNCERTAIN: FORWARD is assumed to close (extend) the blind. */
    private fun blind(close: Boolean): Boolean {
        val call = "Window.moveWindowBlind"
        if (!isParked()) {
            SdkTrace.skip(call, "vehicle not confirmed parked")
            return false
        }
        val area = blindAreas.firstOrNull() ?: return unsupported(call)
        val dir = if (close) MoveControl.FORWARD else MoveControl.BACKWARD
        val window = vehicle.getWindow()
        window.moveWindowBlind(area, dir, { _: WindowArea?, _: MoveControl? -> SdkTrace.ok("$call(${area.label()}, $dir)") }, { e -> SdkTrace.fail(call, e) })
        main.postDelayed({
            window.moveWindowBlind(area, MoveControl.STOP, { _: WindowArea?, _: MoveControl? -> SdkTrace.ok("$call(${area.label()}, STOP)") }, { e -> SdkTrace.fail(call, e) })
        }, BLIND_MS)
        return true
    }

    private fun setSmartGlass(on: Boolean): Boolean {
        if (!smartGlass) return unsupported("Window.setSmartGlassState")
        val call = "Window.setSmartGlassState($on)"
        vehicle.getWindow().setSmartGlassState(on, { _: Boolean? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
        return true
    }

    /** Remember the backrest position before reclining for a nap. */
    fun saveBackrest(area: SeatArea) {
        if (!backrestReadable) return
        val call = "Seat.getCurrentSeatBackrestAnglePosition(${area.label()})"
        runCatching {
            seat.getCurrentSeatBackrestAnglePosition(area, { p: Int? ->
                savedBackrest = p
                SdkTrace.readOk(call, p ?: "null")
            }, { e -> SdkTrace.fail(call, e) })
        }.onFailure { SdkTrace.fail(call, it) }
    }

    /**
     * Drive the backrest back to the saved position: jog toward it, poll the position every 250 ms and STOP
     * when it is within one step (or after [RESTORE_TIMEOUT_MS]). Returns false when nothing was saved.
     */
    fun restoreBackrest(area: SeatArea, fallback: () -> Unit): Boolean {
        val target = savedBackrest ?: return false
        val get = "Seat.getCurrentSeatBackrestAnglePosition(${area.label()})"
        seat.getCurrentSeatBackrestAnglePosition(area, { now: Int? ->
            // A position that did not move although we reclined means the sensor is not tracking
            // (seen on emulator 2.1.0): fall back to the timed jog.
            if (now == null || abs(now - target) <= 1) {
                SdkTrace.line("$get → ${now ?: "null"} (unchanged since nap start) → timed jog fallback")
                savedBackrest = null
                main.post(fallback)
                return@getCurrentSeatBackrestAnglePosition
            }
            // Position grows as the backrest reclines (UNCERTAIN): a smaller target means move FORWARD.
            val dir = if (target < now) MoveControl.FORWARD else MoveControl.BACKWARD
            val call = "Seat.moveSeatBackrestAngle(${area.label()}, $dir) → restore to $target"
            seat.moveSeatBackrestAngle(area, dir, { _: SeatArea?, _: MoveControl? -> SdkTrace.ok(call) }, { e -> SdkTrace.fail(call, e) })
            val started = System.currentTimeMillis()
            val poll = object : Runnable {
                override fun run() {
                    seat.getCurrentSeatBackrestAnglePosition(area, { p: Int? ->
                        val done = p == null || abs(p - target) <= 1 || (dir == MoveControl.FORWARD && p < target) ||
                            (dir == MoveControl.BACKWARD && p > target) || System.currentTimeMillis() - started > RESTORE_TIMEOUT_MS
                        if (done) {
                            seat.moveSeatBackrestAngle(area, MoveControl.STOP, { _: SeatArea?, _: MoveControl? -> SdkTrace.ok("Seat.moveSeatBackrestAngle(STOP) at $p (target $target)") }, { e -> SdkTrace.fail("Seat.moveSeatBackrestAngle(STOP)", e) })
                            savedBackrest = null
                        } else {
                            main.postDelayed(this, 250)
                        }
                    }, { e -> SdkTrace.fail(get, e); seat.moveSeatBackrestAngle(area, MoveControl.STOP, { _: SeatArea?, _: MoveControl? -> }, { }) })
                }
            }
            main.postDelayed(poll, 250)
        }, { e -> SdkTrace.fail(get, e) })
        return true
    }

    private fun check(call: String, barrier: Barrier, run: (ok: (String) -> Unit, fail: (Exception) -> Unit) -> Unit) {
        var arrived = false
        val arrive = { if (!arrived) { arrived = true; barrier.arrive() } }
        try {
            run({ summary -> SdkTrace.ok(call, summary); arrive() }, { e -> SdkTrace.fail(call, e); arrive() })
        } catch (t: Throwable) {
            SdkTrace.fail(call, t)
            arrive()
        }
    }

    private fun unsupported(call: String): Boolean {
        SdkTrace.skip(call, "capability not writable or not supported")
        return false
    }

    companion object {
        /** Number of [probe] arrivals on the shared capability barrier. */
        const val PROBES = 8
        private const val PULSE_MS = 400L
        private const val BLIND_MS = 4_000L
        private const val RESTORE_TIMEOUT_MS = 9_000L
    }
}
