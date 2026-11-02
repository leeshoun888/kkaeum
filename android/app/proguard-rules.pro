# Minify is off for the contest build. If you turn it on:
-keepclassmembers class com.kkaeum.copilot.bridge.KkaeumBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class ai.pleos.playground.** { *; }
-dontwarn ai.pleos.playground.**
