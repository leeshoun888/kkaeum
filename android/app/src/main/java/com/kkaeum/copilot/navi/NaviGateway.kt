package com.kkaeum.copilot.navi

import ai.pleos.playground.navi.constants.NaviErrorCode
import ai.pleos.playground.navi.constants.WaypointIndex
import ai.pleos.playground.navi.data.CurrentLocationInfo
import ai.pleos.playground.navi.data.DestinationInfo
import ai.pleos.playground.navi.data.RequestWaypointInfo
import ai.pleos.playground.navi.data.RouteInfo
import ai.pleos.playground.navi.data.RouteStateInfo
import ai.pleos.playground.navi.constants.RouteOption
import ai.pleos.playground.navi.data.WaypointChangedInfo
import ai.pleos.playground.navi.helper.NaviHelper
import ai.pleos.playground.navi.helper.listener.NaviHelperEventListener
import android.content.Context
import android.os.Handler
import android.os.Looper
import com.kkaeum.copilot.util.SdkTrace

/**
 * NaviHelper 3.0.5: rest-stop waypoints and route remaining distance / ETA.
 *
 * Getters return Unit; results arrive on [NaviHelperEventListener] (which events fire depends on the
 * Pleos Navigation app state). Coordinates are LATITUDE FIRST since 3.0.5 (the docs' Java samples are wrong).
 */
class NaviGateway(
    context: Context,
    private val onRoute: (remainingKm: Double?, etaMin: Double?) -> Unit,
    private val onLocation: (lat: Double, lon: Double, heading: Double) -> Unit,
) {
    private val helper = NaviHelper(context)
    private val main = Handler(Looper.getMainLooper())

    @Volatile var connected = false
        private set

    /** When FusedLocation is unavailable, navi's current-location events feed position/heading instead. */
    @Volatile var useAsLocationSource = false

    /** Whether route guidance is active (from RouteStateInfo / route events). A waypoint needs a route. */
    @Volatile private var routing = false

    private val listener = object : NaviHelperEventListener {
        override fun onDestinationInfo(info: DestinationInfo) {
            // UNCERTAIN units (undocumented): remainDistance assumed metres, remainTime assumed seconds.
            onRoute(info.remainDistance / 1000.0, info.remainTime / 60.0)
        }

        override fun onRouteStateInfo(info: RouteStateInfo) {
            routing = info.isRouting
            if (!info.isRouting) onRoute(null, null)
        }

        override fun onRouteCancelled() { routing = false; onRoute(null, null) }
        override fun onRoutingCompleted() { routing = false; onRoute(null, null) }
        override fun onRouteStarted(info: ai.pleos.playground.navi.data.RouteStartInfo) { routing = true; refresh() }
        override fun onDestinationChanged() = refresh()

        override fun onWaypointChanged(info: WaypointChangedInfo) {
            SdkTrace.ok("NaviHelperEventListener.onWaypointChanged", "${info.index} ${info.cmdType}")
            refresh()
        }

        override fun onError(code: NaviErrorCode) {
            SdkTrace.line("NaviHelperEventListener.onError → $code")
        }

        override fun onCurrentLocationInfo(info: CurrentLocationInfo) {
            if (useAsLocationSource) onLocation(info.latitude, info.longitude, info.heading)
        }
    }

    private val poll = object : Runnable {
        override fun run() {
            refresh()
            main.postDelayed(this, POLL_MS)
        }
    }

    fun start(onReady: (Boolean) -> Unit) {
        try {
            helper.initialize({
                connected = true
                SdkTrace.ok("NaviHelper.initialize()", "connected")
                helper.addListener(listener)
                main.post(poll)
                onReady(true)
            }, { t: Throwable ->
                connected = false
                SdkTrace.fail("NaviHelper.initialize()", t)
                onReady(false)
            })
        } catch (t: Throwable) {
            SdkTrace.fail("NaviHelper.initialize()", t)
            onReady(false)
        }
    }

    fun refresh() {
        if (!connected) return
        runCatching {
            helper.getRouteStateInfo()
            helper.getDestinationInfo()
            if (useAsLocationSource) helper.getCurrentLocationInfo()
        }
    }

    /**
     * Adds a rest stop as the FIRST waypoint (max 2). Result arrives as onWaypointChanged / onError.
     * UNCERTAIN: whether the navi accepts our own stop id as poiId (the samples use a navi POI id).
     */
    fun addWaypoint(lat: Double, lon: Double, name: String, poiId: String, address: String): Boolean {
        val call = "NaviHelper.addWaypoint(RequestWaypointInfo(lat=%.5f, lon=%.5f, \"%s\", FIRST))".format(lat, lon, name)
        if (!connected) {
            SdkTrace.skip(call, "NaviHelper not connected")
            return false
        }
        if (!routing) return requestRouteTo(lat, lon, name, poiId, address)
        return try {
            helper.addWaypoint(
                // (latitude, longitude, poiName, waypointIndex, poiId, address, poiSubId, poiProvider)
                RequestWaypointInfo(lat, lon, name, WaypointIndex.FIRST, poiId, address, "0", ""),
            )
            SdkTrace.ok(call, "requested")
            true
        } catch (t: Throwable) {
            SdkTrace.fail(call, t)
            false
        }
    }

    /**
     * No active guidance (driving without a destination): a waypoint cannot be inserted, so the rest stop
     * becomes the destination instead. Verified on Pleos Connect emulator 2.1.0, where addWaypoint without
     * a route only opened the navigation home screen.
     */
    private fun requestRouteTo(lat: Double, lon: Double, name: String, poiId: String, address: String): Boolean {
        val call = "NaviHelper.requestRoute(RouteInfo(lat=%.5f, lon=%.5f, \"%s\", RECOMMENDED))".format(lat, lon, name)
        return try {
            // (latitude, longitude, displayLat, displayLon, poiName, poiId, address, poiSubId, routeOption, poiProvider, isMobileRequest)
            helper.requestRoute(RouteInfo(lat, lon, null, null, name, poiId, address, "0", RouteOption.RECOMMENDED, "", false))
            SdkTrace.ok(call, "requested (no active route → destination)")
            true
        } catch (t: Throwable) {
            SdkTrace.fail(call, t)
            false
        }
    }

    fun release() {
        main.removeCallbacks(poll)
        runCatching { helper.removeListener(listener) }
        runCatching { helper.release() }
        connected = false
    }

    private companion object {
        const val POLL_MS = 10_000L
    }
}
