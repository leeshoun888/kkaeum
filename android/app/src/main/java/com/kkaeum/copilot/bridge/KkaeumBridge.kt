package com.kkaeum.copilot.bridge

import android.util.Log
import android.webkit.JavascriptInterface
import com.kkaeum.copilot.BuildConfig
import com.kkaeum.copilot.navi.NaviGateway
import com.kkaeum.copilot.vehicle.VehicleGateway
import com.kkaeum.copilot.voice.VoiceGateway
import org.json.JSONObject

/**
 * JS → native half of the bridge, exposed as `window.KkaeumNative` (contract: web/src/engine/native.ts).
 *
 * Methods run on the WebView's JavaBridge thread. Every method first checks that the top-level page is our
 * own `https://appassets.androidplatform.net` origin (Pleos WebView rule: minimal, guarded JS bridge).
 */
class KkaeumBridge(
    private val vehicle: VehicleGateway,
    private val navi: NaviGateway,
    private val voice: VoiceGateway,
    private val isTrustedPage: () -> Boolean,
) {

    /** `{kind, value, reason}` → Vehicle SDK setter. False when unsupported/refused; SDK result goes to the trace. */
    @JavascriptInterface
    fun act(json: String): Boolean {
        if (!isTrustedPage()) return false
        val action = runCatching { JSONObject(json) }.getOrNull() ?: return false
        val kind = action.optString("kind")
        val value = if (action.isNull("value")) null else action.opt("value")
        return vehicle.act(kind, value)
    }

    /** RestStop `{id, name, kind, highway, direction?, lngLat: [lng, lat], km}` → NaviHelper.addWaypoint. */
    @JavascriptInterface
    fun addWaypoint(json: String): Boolean {
        if (!isTrustedPage()) return false
        val stop = runCatching { JSONObject(json) }.getOrNull() ?: return false
        val lngLat = stop.optJSONArray("lngLat") ?: return false
        if (lngLat.length() < 2) return false
        val lng = lngLat.optDouble(0)
        val lat = lngLat.optDouble(1)
        if (lat.isNaN() || lng.isNaN()) return false
        val address = listOf(stop.optString("highway"), stop.optString("direction"))
            .filter { it.isNotBlank() }
            .joinToString(" ")
        return navi.addWaypoint(
            lat = lat,
            lon = lng,
            name = stop.optString("name").ifBlank { "휴게소" },
            poiId = stop.optString("id"),
            address = address,
        )
    }

    @JavascriptInterface
    fun capabilities(): String {
        if (!isTrustedPage()) return "{}"
        return vehicle.capabilities()
            .put("navWaypoint", navi.connected)
            .put("tts", voice.ttsReady)
            .put("stt", voice.sttReady)
            .put("llm", false) // LLM SDK discontinued; Gleo is inbound-only
            .toString()
    }

    @JavascriptInterface
    fun speak(key: String, text: String) {
        if (!isTrustedPage()) return
        voice.speak(key, text)
    }

    @JavascriptInterface
    fun listen(requestId: String) {
        if (!isTrustedPage()) return
        voice.listen(requestId)
    }

    @JavascriptInterface
    fun log(msg: String) {
        if (!isTrustedPage()) return
        // Debug builds only: web logs may carry driving data (Pleos security guide: no PII in release logs).
        if (BuildConfig.DEBUG) Log.d("KkaeumWeb", msg.take(MAX_LOG))
    }

    private companion object {
        const val MAX_LOG = 500
    }
}
