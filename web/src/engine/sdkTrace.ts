// Maps engine actions to the exact Pleos Connect SDK calls the APK makes
// (signatures from Vehicle 2.3.2 / NaviHelper 3.0.5 / TextToSpeech 3.3.1 AARs).
// In the browser this renders as a live "SDK call trace"; in the APK the
// native side reports the real calls through window.__kkaeum.onSdkTrace.

import type { VehicleAction } from './types'

const DRV = 'SeatArea(ROW_1_LEFT)'

export function sdkCallsFor(a: VehicleAction): string[] {
  const v = a.value
  switch (a.kind) {
    case 'freshAir':
      return [`vehicle.getHVAC().setHvacRecirculation(${DRV}, ${v ? 'false' : 'true'})  // ${v ? '외기 유입' : '내기순환'}`]
    case 'recirculation':
      return [`vehicle.getHVAC().setHvacRecirculation(${DRV}, ${v ? 'true' : 'false'})`]
    case 'temperature':
      return [`vehicle.getHVAC().setHvacTemperature(${DRV}, ${Number(v).toFixed(1)}f, TemperatureUnit.CELSIUS)`]
    case 'fan':
      return [`vehicle.getHVAC().setHvacFanSpeed(${DRV}, ${v})`]
    case 'ambient': {
      const amb = v as { color: string; brightness: number }
      return [
        `vehicle.getLight().setAmbientLightSwitch(${DRV}, LightSwitch.ON)`,
        `vehicle.getLight().setAmbientLightBrightness(${DRV}, ${amb.brightness})`,
        `vehicle.getLight().setAmbientLightBrightnessColor(${DRV}, 0x${amb.color.slice(1).toUpperCase()})`,
      ]
    }
    case 'seatVent':
      return [`vehicle.getSeat().setHvacSeatVentilation(${DRV}, ${v})`]
    case 'seatRecline':
      return [
        `vehicle.getSeat().moveSeatBackrestAngle(${DRV}, MoveControl.${Number(v) > 20 ? 'BACKWARD' : 'FORWARD'})`,
        `  … ${Number(v) > 20 ? 1800 : 1600}ms → moveSeatBackrestAngle(${DRV}, MoveControl.STOP)`,
      ]
    case 'window':
      return [`vehicle.getWindow().setWindowPosition(WindowArea(ROW_1_LEFT), ${v})`]
    case 'waypoint': {
      const s = (v as { stop: { name: string; lngLat: [number, number] } }).stop
      return [
        `naviHelper.addWaypoint(RequestWaypointInfo(${s.lngLat[1].toFixed(5)}, ${s.lngLat[0].toFixed(5)}, "${s.name}", WaypointIndex.FIRST))`,
      ]
    }
    case 'speak':
      return [`audioFocus.request(GAIN_TRANSIENT_MAY_DUCK) → play voice/${v}.mp3  (fallback: textToSpeech.speak(…))`]
    case 'probe':
      return ['speechToText.startListening()  // onBeginningOfSpeech → reaction time']
    case 'engage':
      return ['speechToText.startListening()  // 각성 퀴즈 답변 인식']
    case 'napStart':
      return [`telltales.PARKING_BRAKE == ON && GEAR_SELECTION == P  ✓  → nap timer ${v}min`]
    case 'napWake':
      return ['nap timer elapsed → wake sequence (light · air · voice)']
    default:
      return []
  }
}

export const READ_CALLS = [
  'carPropertyManager.registerCallback(PERF_VEHICLE_SPEED, SENSOR_RATE_NORMAL)',
  'carPropertyManager.registerCallback(GEAR_SELECTION)',
  `vehicle.getHVAC().registerHvacRecirculation(${DRV}, listener)`,
  'vehicle.getSafety().getTelltalesInfo()  // DRIVER_ATTENTION, PARKING_BRAKE (1 Hz poll)',
  'vehicle.getSteeringWheel().registerSteeringWheelAngle(listener)',
  'vehicle.getOdometer().getCurrentTripDrivingTime()',
  'vehicle.getSeat().getSeatOccupancy(ROW_1/ROW_2)',
  'fusedLocation.requestLocationUpdates(listener)',
  'naviHelper.registerDestinationInfoListener(listener)',
]
