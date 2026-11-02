package com.kkaeum.copilot.location

import ai.pleos.playground.location.fused.FusedLocation
import ai.pleos.playground.location.fused.listener.FusedLocationListener
import ai.pleos.playground.location.fused.model.LocationData
import android.content.Context
import com.kkaeum.copilot.util.SdkTrace
import com.kkaeum.copilot.util.errorName

/**
 * FusedLocation 1.1.3 → position [lng, lat] and heading for the web engine.
 * Needs the runtime grant of `pleos.car.permission.FUSED_LOCATION` (dangerous); start after it is granted.
 * LocationData has no speed field. Coordinates are never written to the SDK trace (PII).
 */
class LocationGateway(context: Context, private val onLocation: (lat: Double, lon: Double, heading: Double) -> Unit) {

    private val fused = FusedLocation(context)
    private var registered = false

    private val listener = object : FusedLocationListener {
        override fun onChanged(location: LocationData?) {
            location ?: return
            onLocation(location.latitude, location.longitude, location.heading.toDouble())
        }

        override fun onError(exception: Exception) {
            SdkTrace.readFail("FusedLocation.onChanged", exception)
        }
    }

    /** Returns false when FusedLocation is not supported on this car (caller may fall back to navi). */
    fun start(): Boolean {
        if (registered) return true
        return try {
            if (!fused.isSupported()) {
                SdkTrace.skip("FusedLocation.registerFusedLocationCallback", "isSupported() == false")
                return false
            }
            fused.initialize()
            fused.getLastKnownLocation(listener)
            fused.registerFusedLocationCallback(listener)
            registered = true
            SdkTrace.ok("FusedLocation.registerFusedLocationCallback")
            true
        } catch (t: Throwable) {
            SdkTrace.line("FusedLocation.registerFusedLocationCallback → FAILED ${t.errorName()}")
            false
        }
    }

    fun release() {
        if (registered) runCatching { fused.unregisterFusedLocationCallback(listener) }
        registered = false
        runCatching { fused.release() }
    }
}
