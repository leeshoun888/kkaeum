package com.kkaeum.copilot.vehicle

import android.car.Car
import android.car.VehiclePropertyIds
import android.car.hardware.CarPropertyValue
import android.car.hardware.property.CarPropertyManager
import android.content.Context
import com.kkaeum.copilot.util.SdkTrace
import kotlin.math.abs

/**
 * Standard signals the Pleos Vehicle SDK does not carry, read through the AAOS Car API
 * (Pleos policy: standard data comes from CarPropertyManager; VehicleSpeedListener was removed in 2.3.2).
 *
 * - PERF_VEHICLE_SPEED (m/s, android.car.permission.CAR_SPEED: dangerous → runtime grant)
 * - GEAR_SELECTION, PARKING_BRAKE_ON (CAR_POWERTRAIN)
 * - ENV_OUTSIDE_TEMPERATURE (CAR_EXTERIOR_ENVIRONMENT)
 *
 * - DMS_DROWSINESS_WARNING (Pleos vendor property, Car.PERMISSION_VENDOR_EXTENSION): the vehicle's own camera-based
 *   drowsiness warning. Ids from the Pleos Platform SDK permission matrix (PleosVehiclePropertyIds 557903627,
 *   VehiclePropertyVendorIds 555810772). Third-party apps normally lack the permission; it is tried and traced.
 *
 * Support is checked with getCarPropertyConfig(); missing properties are traced and skipped.
 * The Pleos emulator's Virtual Console has no speed card, so speed stays 0 there.
 */
class CarPropertySource(private val context: Context, private val onValue: (key: String, value: Any) -> Unit) {

    private var car: Car? = null
    private var manager: CarPropertyManager? = null

    private val callback = object : CarPropertyManager.CarPropertyEventCallback {
        override fun onChangeEvent(value: CarPropertyValue<*>) {
            if (value.status != CarPropertyValue.STATUS_AVAILABLE) return
            when (value.propertyId) {
                VehiclePropertyIds.PERF_VEHICLE_SPEED ->
                    (value.value as? Float)?.let { onValue("speedKph", abs(it) * 3.6) }
                VehiclePropertyIds.GEAR_SELECTION ->
                    (value.value as? Int)?.let { g -> gearLetter(g)?.let { onValue("gear", it) } }
                VehiclePropertyIds.PARKING_BRAKE_ON ->
                    (value.value as? Boolean)?.let { onValue("parkingBrake", it) }
                VehiclePropertyIds.ENV_OUTSIDE_TEMPERATURE ->
                    (value.value as? Float)?.let { onValue("outsideTempC", it.toDouble()) }
                in DMS_DROWSINESS_IDS -> onValue("dmsDrowsy", value.value.isActive())
            }
        }

        override fun onErrorEvent(propertyId: Int, zone: Int) {
            SdkTrace.line("CarPropertyManager.onErrorEvent(${VehiclePropertyIds.toString(propertyId)}, zone=$zone)")
        }
    }

    fun start() {
        val c = try {
            Car.createCar(context)
        } catch (t: Throwable) {
            SdkTrace.fail("Car.createCar()", t)
            null
        } ?: return
        car = c
        val m = c.getCarManager(Car.PROPERTY_SERVICE) as? CarPropertyManager ?: return
        manager = m
        subscribe(m, VehiclePropertyIds.PERF_VEHICLE_SPEED, CarPropertyManager.SENSOR_RATE_NORMAL)
        subscribe(m, VehiclePropertyIds.GEAR_SELECTION, CarPropertyManager.SENSOR_RATE_ONCHANGE)
        subscribe(m, VehiclePropertyIds.PARKING_BRAKE_ON, CarPropertyManager.SENSOR_RATE_ONCHANGE)
        subscribe(m, VehiclePropertyIds.ENV_OUTSIDE_TEMPERATURE, CarPropertyManager.SENSOR_RATE_ONCHANGE)
        for (id in DMS_DROWSINESS_IDS) subscribe(m, id, CarPropertyManager.SENSOR_RATE_ONCHANGE, "DMS_DROWSINESS_WARNING($id)")
    }

    private fun subscribe(m: CarPropertyManager, id: Int, rate: Float, label: String = VehiclePropertyIds.toString(id)) {
        val call = "CarPropertyManager.registerCallback($label)"
        try {
            if (m.getCarPropertyConfig(id) == null) {
                SdkTrace.skip(call, "property not supported")
                return
            }
            if (m.registerCallback(callback, id, rate)) SdkTrace.ok(call) else SdkTrace.line("$call → false")
        } catch (t: Throwable) { // SecurityException without CAR_SPEED / CAR_POWERTRAIN grant
            SdkTrace.fail(call, t)
        }
    }

    fun release() {
        runCatching { manager?.unregisterCallback(callback) }
        runCatching { car?.disconnect() }
        manager = null
        car = null
    }

    private fun gearLetter(gear: Int): String? = when (gear) {
        GEAR_PARK -> "P"
        GEAR_REVERSE -> "R"
        GEAR_NEUTRAL -> "N"
        GEAR_UNKNOWN -> null
        else -> if (gear >= GEAR_DRIVE) "D" else null // DRIVE and GEAR_1..GEAR_9
    }

    /** Vendor properties report Boolean, Int (level) or an Int array depending on the build. */
    private fun Any?.isActive(): Boolean = when (this) {
        is Boolean -> this
        is Number -> toInt() != 0
        is IntArray -> any { it != 0 }
        is Array<*> -> any { (it as? Number)?.toInt()?.let { v -> v != 0 } ?: (it == true) }
        else -> false
    }

    private companion object {
        val DMS_DROWSINESS_IDS = setOf(557903627, 555810772)

        // android.car.VehicleGear
        const val GEAR_UNKNOWN = 0x0
        const val GEAR_NEUTRAL = 0x1
        const val GEAR_REVERSE = 0x2
        const val GEAR_PARK = 0x4
        const val GEAR_DRIVE = 0x8
    }
}
