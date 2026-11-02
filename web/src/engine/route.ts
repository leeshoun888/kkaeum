import routeData from '../data/route.json'
import type { LngLat, RestStop } from './types'

export interface Route {
  name: string
  totalKm: number
  points: [number, number, number][] // lng, lat, cumulative km
}

export const ROUTE: Route = routeData as Route

export function pointAtKm(route: Route, km: number): { lngLat: LngLat; heading: number } {
  const p = route.points
  if (km <= 0) return { lngLat: [p[0][0], p[0][1]], heading: bearing(p[0], p[1]) }
  let lo = 0
  let hi = p.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (p[mid][2] < km) lo = mid
    else hi = mid
  }
  const a = p[lo]
  const b = p[hi]
  const f = b[2] === a[2] ? 0 : Math.min(1, Math.max(0, (km - a[2]) / (b[2] - a[2])))
  return { lngLat: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], heading: bearing(a, b) }
}

function bearing(a: number[], b: number[]) {
  const toR = Math.PI / 180
  const y = Math.sin((b[0] - a[0]) * toR) * Math.cos(b[1] * toR)
  const x = Math.cos(a[1] * toR) * Math.sin(b[1] * toR) - Math.sin(a[1] * toR) * Math.cos(b[1] * toR) * Math.cos((b[0] - a[0]) * toR)
  return (Math.atan2(y, x) / toR + 360) % 360
}

function distKm(a: LngLat, b: LngLat) {
  const R = 6371
  const toR = Math.PI / 180
  const dLat = (b[1] - a[1]) * toR
  const dLng = (b[0] - a[0]) * toR
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toR) * Math.cos(b[1] * toR) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Projects arbitrary POIs onto the route; keeps those within `maxOffKm` and returns them with route km. */
export function snapToRoute(
  route: Route,
  pois: Omit<RestStop, 'km'>[],
  maxOffKm = 0.7,
): RestStop[] {
  const out: RestStop[] = []
  for (const poi of pois) {
    let best = Infinity
    let bestKm = 0
    for (const p of route.points) {
      const d = distKm(poi.lngLat, [p[0], p[1]])
      if (d < best) {
        best = d
        bestKm = p[2]
      }
    }
    if (best <= maxOffKm) out.push({ ...poi, km: bestKm })
  }
  return out.sort((a, b) => a.km - b.km)
}

export function roadClassAt(route: Route, km: number): 'urban' | 'highway' {
  return km < 14 || km > route.totalKm - 12 ? 'urban' : 'highway'
}
