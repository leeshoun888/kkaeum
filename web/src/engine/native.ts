// NativeVehicle: VehicleBus backed by the Android host (Pleos Connect APK).
// Kotlin pushes signal snapshots into window.__kkaeum.onSignals(json) and exposes
// window.KkaeumNative (an @JavascriptInterface) for actuation:
//   act(actionJson) → Vehicle SDK (HVAC / Light / Seat / Window) calls
//   addWaypoint(stopJson) → NaviHelper SDK
//   speak(key, text) → TextToSpeech SDK ;  listen() → SpeechToText SDK
//   capabilities() → JSON from checkXXXCapabilities() results

import type { Capabilities, VehicleBus } from './bus'
import type { RestStop, VehicleAction, VehicleSignals } from './types'

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
    return { ...this.sig, t: Date.now() }
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
