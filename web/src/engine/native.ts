// NativeVehicle: VehicleBus backed by the Android host (Pleos Connect APK).
// Kotlin pushes signal snapshots into window.__kkaeum.onSignals(json) and exposes
// window.KkaeumNative (an @JavascriptInterface) for actuation:
//   act(actionJson) → Vehicle SDK (HVAC / Light / Seat / Window) calls
//   addWaypoint(stopJson) → NaviHelper SDK
//   speak(key, text) → TextToSpeech SDK ;  listen() → SpeechToText SDK
//   capabilities() → JSON from checkXXXCapabilities() results

import type { Capabilities, VehicleBus } from './bus'
import type { RestStop, VehicleAction, VehicleSignals } from './types'
import { ROUTE, bearing, distKm, pointAtKm, projectOnRoute } from './route'

interface NativeApi {
  act(json: string): boolean
  addWaypoint(json: string): boolean
  capabilities(): string
  speak(key: string, text: string): void
  listen(requestId: string): void
  log(msg: string): void
}

declare global {
  interface Window {
    KkaeumNative?: NativeApi
    __kkaeum?: {
      onSignals: (json: string) => void
      onSpeech: (requestId: string, event: string, payload: string) => void
      onSdkTrace: (line: string) => void
      onGleo?: (json: string) => { status: string; message: string; data?: unknown }
    }
  }
}

export const isNative = () => typeof window !== 'undefined' && Boolean(window.KkaeumNative)

type SpeechListener = (requestId: string, event: string, payload: string) => void
const speechListeners = new Set<SpeechListener>()
const traceListeners = new Set<(line: string) => void>()
export const onNativeSpeech = (fn: SpeechListener) => (speechListeners.add(fn), () => speechListeners.delete(fn))
export const onSdkTrace = (fn: (line: string) => void) => (traceListeners.add(fn), () => traceListeners.delete(fn))

export class NativeVehicle implements VehicleBus {
  readonly kind = 'native' as const
  private sig: VehicleSignals = {
    t: Date.now(),
    speedKph: 0,
    gear: 'P',
    parkingBrake: true,
    recirculation: false,
    setTempC: 22,
    fanSpeed: 2,
    occupants: 1,
  }
  private caps: Capabilities
  private odoKm = 0
  private routeKm = 0
  private lastReadAt = 0
  private lastFix: [number, number] | null = null
  private courseDeg: number | undefined

  constructor() {
    const api = window.KkaeumNative!
    let parsed: Partial<Capabilities> = {}
    try {
      parsed = JSON.parse(api.capabilities())
    } catch {
      /* host returned nothing · assume minimal */
    }
    this.caps = {
      hvacRecirculation: false,
      hvacTemperature: false,
      hvacFan: false,
      ambientLight: false,
      seatVentilation: false,
      seatRecline: false,
      window: false,
      navWaypoint: false,
      tts: true,
      stt: true,
      llm: false,
      daw: false,
      ...parsed,
      source: 'pleos',
    }
    window.__kkaeum = {
      onSignals: (json) => {
        try {
          this.sig = { ...this.sig, ...JSON.parse(json), t: Date.now() }
        } catch {
          /* ignore malformed frame */
        }
      },
      onSpeech: (id, ev, payload) => speechListeners.forEach((l) => l(id, ev, payload)),
      onSdkTrace: (line) => traceListeners.forEach((l) => l(line)),
      onGleo: (json) => gleoHandler(json),
    }
  }

  capabilities() {
    return this.caps
  }

  read(): VehicleSignals {
    const now = Date.now()
    const s: VehicleSignals = { ...this.sig, t: now }
    // Distance driven, integrated from speed (the Odometer trip API is not available on every build).
    if (this.lastReadAt) this.odoKm += (Math.max(0, s.speedKph) * Math.min(5000, now - this.lastReadAt)) / 3.6e6
    this.lastReadAt = now
    // Corridor tracking: on the bundled route (heading the same way) progress is the projected route km;
    // anywhere else it is distance driven, and the runtime picks stops from the heading cone instead.
    // Course over ground from successive fixes: provider bearing is often 0/absent (emulator, tunnels).
    if (s.position) {
      if (!this.lastFix) this.lastFix = s.position
      else if (distKm(this.lastFix, s.position) > 0.03) {
        this.courseDeg = bearing(this.lastFix, s.position)
        this.lastFix = s.position
      }
      if (this.courseDeg !== undefined) s.headingDeg = this.courseDeg
    }
    let onRoute = false
    if (s.position) {
      const pr = projectOnRoute(ROUTE, s.position)
      const routeHeading = pointAtKm(ROUTE, pr.km).heading
      const moving = s.speedKph > 5 && s.headingDeg !== undefined
      const aligned = !moving || Math.abs(((routeHeading - (s.headingDeg ?? 0) + 540) % 360) - 180) < 75
      onRoute = pr.offKm < 2.5 && aligned
      if (onRoute) this.routeKm = pr.km
    }
    s.onRoute = onRoute
    s.routeProgressKm = onRoute ? this.routeKm : this.odoKm
    return s
  }

  async apply(action: VehicleAction) {
    if (action.kind === 'speak') return true
    return window.KkaeumNative!.act(JSON.stringify(action))
  }

  async addWaypoint(stop: RestStop) {
    return window.KkaeumNative!.addWaypoint(JSON.stringify(stop))
  }
}

// Gleo Interface (schema.json) actions arrive here and must be answered synchronously.
type GleoHandler = (json: string) => { status: string; message: string; data?: unknown }
let gleoHandler: GleoHandler = () => ({ status: 'fail', message: '깨움이 아직 준비 중이에요.' })
export const setGleoHandler = (fn: GleoHandler) => {
  gleoHandler = fn
}
