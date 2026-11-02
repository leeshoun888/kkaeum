// VehicleBus: the single seam between the engine and a vehicle.
// - SimVehicle (browser demo / judges' console) implements it with a physics simulation.
// - NativeVehicle (inside the APK) forwards to Kotlin, which talks to the Pleos Connect
//   Vehicle / NaviHelper / TextToSpeech / SpeechToText / FusedLocation SDKs.

import type { RestStop, VehicleAction, VehicleSignals } from './types'

export interface Capabilities {
  hvacRecirculation: boolean
  hvacTemperature: boolean
  hvacFan: boolean
  ambientLight: boolean
  seatVentilation: boolean
  seatRecline: boolean
  window: boolean
  navWaypoint: boolean
  tts: boolean
  stt: boolean
  llm: boolean
  daw: boolean
  source: 'simulation' | 'pleos'
}

export interface VehicleBus {
  readonly kind: 'sim' | 'native'
  capabilities(): Capabilities
  read(): VehicleSignals
  apply(action: VehicleAction): Promise<boolean>
  addWaypoint(stop: RestStop): Promise<boolean>
  /** Advance simulated time; native implementations ignore this. */
  advance?(dtMs: number): void
}

export const SIM_CAPS: Capabilities = {
  hvacRecirculation: true,
  hvacTemperature: true,
  hvacFan: true,
  ambientLight: true,
  seatVentilation: true,
  seatRecline: true,
  window: true,
  navWaypoint: true,
  tts: true,
  stt: true,
  llm: true,
  daw: true,
  source: 'simulation',
}
