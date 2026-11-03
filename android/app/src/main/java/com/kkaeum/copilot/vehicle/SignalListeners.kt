package com.kkaeum.copilot.vehicle

import ai.pleos.playground.vehicle.Vehicle
import ai.pleos.playground.vehicle.api.model.area.SeatArea
import ai.pleos.playground.vehicle.api.model.area.WindowArea
import ai.pleos.playground.vehicle.api.model.telltale.Telltales
import ai.pleos.playground.vehicle.constant.area.SeatValue
import ai.pleos.playground.vehicle.constant.area.WindowValue
import ai.pleos.playground.vehicle.constant.control.CruiseControl
import ai.pleos.playground.vehicle.constant.control.LightState
import ai.pleos.playground.vehicle.constant.control.WiperState
import ai.pleos.playground.vehicle.constant.telltale.TelltaleState
import ai.pleos.playground.vehicle.constant.telltale.TelltaleType
import ai.pleos.playground.vehicle.listener.BrakePedalStatusListener
import ai.pleos.playground.vehicle.listener.CruiseControlStateListener
import ai.pleos.playground.vehicle.listener.CruiseControlTargetSpeedListener
import ai.pleos.playground.vehicle.listener.DrivingTimeListener
import ai.pleos.playground.vehicle.listener.EvBatteryStateOfChargeListener
import ai.pleos.playground.vehicle.listener.HvacFanSpeedListener
import ai.pleos.playground.vehicle.listener.HvacRecirculationStateListener
import ai.pleos.playground.vehicle.listener.HvacSeatTemperatureListener
import ai.pleos.playground.vehicle.listener.HvacSteeringWheelHeatStateListener
import ai.pleos.playground.vehicle.listener.HvacTemperatureListener
import ai.pleos.playground.vehicle.listener.LightStateListener
import ai.pleos.playground.vehicle.listener.RangeRemainingListener
import ai.pleos.playground.vehicle.listener.TelltaleInfoListener
import ai.pleos.playground.vehicle.listener.WiperStateListener
import com.kkaeum.copilot.util.SdkTrace

/**
 * Vehicle SDK change listeners (Pleos performance guide: prefer listeners over polling; < 5 % CPU while
 * driving). Each listener writes one or more `VehicleSignals` keys through [put]; a registration that
 * fails (unsupported on this build, no permission) is traced and the 10 s poll in [SignalCollector]
 * remains the fallback for that value.
 *
 * Signals added for the fatigue model and the interventions:
 * headlightsOn (dark outside), cruiseOn / cruiseTargetKph (monotony), raining (wiper), brakeEvents
 * (pedal presses, for reaction-time context), socPct / rangeKm (charge-aware rest stops), seatHeat /
 * wheelHeat (warmth that deepens sleepiness), recirculation / fanSpeed / setTempC, dawWarning and
 * parkingBrake (telltales), tripMinutes (continuous driving time).
 */
class SignalListeners(
    private val vehicle: Vehicle,
    private val put: (String, Any?) -> Unit,
    private val areaFor: (String) -> SeatArea?,
    private val onParkingBrakeTelltale: (Boolean) -> Unit,
) {
    @Volatile var telltalesLive = false
        private set
    @Volatile var hvacLive = false
        private set
    private var brakeEvents = 0
    private var lastBrake = false
    private val undo = mutableListOf<() -> Unit>()

    fun start() {
        val light = vehicle.getLight()
        reg("Light.registerLowBeamLightState", {
            val l = object : LightStateListener {
                override fun onLightStateUpdated(state: LightState?) {
                    state?.let { put("headlightsOn", it == LightState.ON) }
                }
                override fun onFailed(e: Exception) = SdkTrace.readFail("Light.onLowBeamLightStateUpdated", e)
            }
            light.registerLowBeamLightState(l)
            undo += { light.unregisterLowBeamLightState(l) }
        })

        val drive = vehicle.getDrivingMode()
        reg("DrivingMode.registerCruiseControlState", {
            val l = object : CruiseControlStateListener {
                override fun onCruiseControlStateUpdated(state: CruiseControl?) {
                    state?.let { put("cruiseOn", it == CruiseControl.ACTIVATED || it == CruiseControl.USER_OVERRIDE) }
                }
                override fun onFailed(e: Exception) = SdkTrace.readFail("DrivingMode.onCruiseControlStateUpdated", e)
            }
            drive.registerCruiseControlState(l)
            undo += { drive.unregisterCruiseControlState(l) }
        })
        reg("DrivingMode.registerCruiseControlTargetSpeed", {
            val l = object : CruiseControlTargetSpeedListener {
                // Virtual Console range 5.556–27.778 → m/s; reported to the web in km/h.
                override fun onCruiseControlTargetSpeedUpdated(speed: Float?) {
                    speed?.let { put("cruiseTargetKph", (it * 3.6).toDouble()) }
                }
                override fun onFailed(e: Exception) = SdkTrace.readFail("DrivingMode.onCruiseControlTargetSpeedUpdated", e)
            }
            drive.registerCruiseControlTargetSpeed(l)
            undo += { drive.unregisterCruiseControlTargetSpeed(l) }
        })

        val wiper = vehicle.getWiper()
        val front = WindowArea(WindowValue.FRONT_WINDSHIELD)
        reg("Wiper.registerWiperState(FRONT_WINDSHIELD)", {
            val l = object : WiperStateListener {
                override fun onWiperStateUpdated(state: WiperState?) {
                    state?.let { put("raining", it == WiperState.ON) }
                }
                override fun onFailed(e: Exception) = SdkTrace.readFail("Wiper.onWiperStateUpdated", e)
            }
            wiper.registerWiperState(front, l)
            undo += { wiper.unregisterWiperState(front, l) }
        })

        val brake = vehicle.getBrake()
        reg("Brake.registerBrakePedalStatus", {
            val l = object : BrakePedalStatusListener {
                override fun onBrakePedalStatusUpdated(pressed: Boolean?) {
                    if (pressed == true && !lastBrake) put("brakeEvents", ++brakeEvents)
                    lastBrake = pressed == true
                }
                override fun onFailed(e: Exception) = SdkTrace.readFail("Brake.onBrakePedalStatusUpdated", e)
            }
            brake.registerBrakePedalStatus(l)
            undo += { brake.unregisterBrakePedalStatus(l) }
        })

        val ev = vehicle.getEvBattery()
        reg("EvBattery.registerEvBatteryStateOfCharge", {
            val l = object : EvBatteryStateOfChargeListener {
                override fun onEvBatteryStateOfChargeUpdated(soc: Int?) {
                    soc?.let { put("socPct", it) }
                }
                override fun onFailed(e: Exception) = SdkTrace.readFail("EvBattery.onEvBatteryStateOfChargeUpdated", e)
            }
            ev.registerEvBatteryStateOfCharge(l)
            undo += { ev.unregisterEvBatteryStateOfCharge(l) }
        })
        val odo = vehicle.getOdometer()
        reg("Odometer.registerRangeRemainingListener", {
            val l = object : RangeRemainingListener {
                // UNCERTAIN unit (undocumented): metres on AAOS RANGE_REMAINING; values > 2,000 are treated as metres.
                override fun onRangeRemainingChanged(range: Float?) {
                    range?.let { put("rangeKm", if (it > 2000f) it / 1000.0 else it.toDouble()) }
                }
                override fun onFailed(e: Exception) = SdkTrace.readFail("Odometer.onRangeRemainingChanged", e)
            }
            odo.registerRangeRemainingListener(l)
            undo += { odo.unregisterRangeRemainingListener(l) }
        })
        reg("Odometer.registerTripCurrentDrivingTime", {
            val l = object : DrivingTimeListener {
                // UNCERTAIN unit (undocumented): minutes, as for getTripCurrentDrivingTime.
                override fun onDrivingTimeUpdated(minutes: Int?) {
                    minutes?.let { put("tripMinutes", it) }
                }
                override fun onFailed(e: Exception) = SdkTrace.readFail("Odometer.onDrivingTimeUpdated", e)
            }
            odo.registerTripCurrentDrivingTime(l)
            undo += { odo.unregisterTripCurrentDrivingTime(l) }
        })

        val safety = vehicle.getSafety()
        reg("Safety.registerTelltales", {
            val l = object : TelltaleInfoListener {
                override fun onTelltaleInfoUpdated(t: Telltales?) {
                    val list = t?.telltales.orEmpty()
                    fun active(type: TelltaleType) = list.any { it.type == type && it.state != TelltaleState.OFF }
                    put("dawWarning", active(TelltaleType.DRIVER_ATTENTION))
                    onParkingBrakeTelltale(active(TelltaleType.PARKING_BRAKE) || active(TelltaleType.ELECTRONIC_PARKING_BRAKE))
                }
                override fun onFailed(e: Exception) = SdkTrace.readFail("Safety.onTelltaleInfoUpdated", e)
            }
            safety.registerTelltales(l)
            undo += { safety.unregisterTelltales(l) }
            telltalesLive = true
        })

        // HVAC: register on the capability-reported areas (driver-only areas are refused on Pleos 2.1.0).
        val hvac = vehicle.getHVAC()
        areaFor("recirculation")?.let { area ->
            reg("HVAC.registerHvacRecirculationState", {
                val l = object : HvacRecirculationStateListener {
                    override fun onHvacAutoRecirculationStateUpdated(on: Boolean?) {
                        on?.let { put("recirculation", it) }
                    }
                    override fun onFailed(e: Exception) = SdkTrace.readFail("HVAC.onHvacRecirculationStateUpdated", e)
                }
                hvac.registerHvacRecirculationState(area, l)
                undo += { hvac.unregisterHvacRecirculationState(area, l) }
                hvacLive = true
            })
        }
        areaFor("fan")?.let { area ->
            reg("HVAC.registerHvacFanSpeed", {
                val l = object : HvacFanSpeedListener {
                    override fun onHvacFanSpeedUpdated(speed: Int?) {
                        speed?.let { put("fanSpeed", it) }
                    }
                    override fun onFailed(e: Exception) = SdkTrace.readFail("HVAC.onHvacFanSpeedUpdated", e)
                }
                hvac.registerHvacFanSpeed(area, l)
                undo += { hvac.unregisterHvacFanSpeed(area, l) }
            })
        }
        areaFor("temperature")?.let { area ->
            reg("HVAC.registerHvacTemperature", {
                val l = object : HvacTemperatureListener {
                    override fun onHvacTemperatureUpdated(c: Float?) {
                        c?.let { put("setTempC", it.toDouble()) }
                    }
                    override fun onFailed(e: Exception) = SdkTrace.readFail("HVAC.onHvacTemperatureUpdated", e)
                }
                hvac.registerHvacTemperature(area, l)
                undo += { hvac.unregisterHvacTemperature(area, l) }
            })
        }
        val seat = vehicle.getSeat()
        val driver = SeatArea(SeatValue.ROW_1_LEFT)
        reg("Seat.registerHvacSeatTemperature(driver)", {
            val l = object : HvacSeatTemperatureListener {
                // Pleos seat climate: negative = ventilation, positive = heating (Virtual Console V3..H3).
                override fun onHvacSeatTemperatureUpdated(level: Int?) {
                    level?.let { put("seatHeat", maxOf(0, it)) }
                }
                override fun onFailed(e: Exception) = SdkTrace.readFail("Seat.onHvacSeatTemperatureUpdated", e)
            }
            seat.registerHvacSeatTemperature(driver, l)
            undo += { seat.unregisterHvacSeatTemperature(driver, l) }
        })
        val wheel = vehicle.getSteeringWheel()
        reg("SteeringWheel.registerHvacSteeringWheelHeatState", {
            val l = object : HvacSteeringWheelHeatStateListener {
                override fun onHvacSteeringWheelHeatStateUpdated(level: Int?) {
                    level?.let { put("wheelHeat", it) }
                }
                override fun onFailed(e: Exception) = SdkTrace.readFail("SteeringWheel.onHvacSteeringWheelHeatStateUpdated", e)
            }
            wheel.registerHvacSteeringWheelHeatState(l)
            undo += { wheel.unregisterHvacSteeringWheelHeatState(l) }
        })
    }

    fun stop() {
        undo.forEach { runCatching(it) }
        undo.clear()
    }

    private fun reg(call: String, block: () -> Unit) {
        try {
            block()
            SdkTrace.ok(call)
        } catch (t: Throwable) {
            SdkTrace.fail(call, t)
        }
    }
}
