// Pleos Connect-S (17", 2560×1440 @160dpi) head unit, laid out from the real emulator 2.1.0 frame:
// driving view 853×1300 (left), status bar 90 dp, app window 1682×1210 at (853, 90) with the window
// handle on the right, and the 140 dp GNB with climate controls. Day / night follows the vehicle theme,
// so the judges see the app exactly as it sits inside the car.

import { useEffect, useRef, useState } from 'react'
import { useSim } from '../state/store'
import { CarApp, useTheme } from '../car/CarApp'
import '../car/car.css'
import './ivi.css'

const W = 2560
const H = 1440
const APP = { x: 853, y: 90, w: 1682, h: 1210 }

export function Ivi() {
  const ref = useRef<HTMLDivElement>(null)
  const [s, setS] = useState(0.3)
  const snap = useSim((st) => st.snap)
  const theme = useTheme(snap)
  useEffect(() => {
    const el = ref.current!
    const ro = new ResizeObserver(() => setS(el.clientWidth / W))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="ivi-wrap" style={{ height: H * s }}>
      <div className={`ivi ${theme}`} style={{ width: W, height: H, transform: `scale(${s})` }}>
        <DrivingView />
        <StatusBar />
        <div className="ivi-app" style={{ left: APP.x, top: APP.y, width: APP.w, height: APP.h }}>
          <div className="landscape" style={{ width: 1700, height: 1212, transform: `scale(${APP.w / 1700})` }}>
            <CarApp />
          </div>
        </div>
        <div className="ivi-handle" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <Gnb />
      </div>
    </div>
  )
}

function StatusBar() {
  const t = useSim((s) => s.snap?.sig.t ?? Date.now())
  const d = new Date(t)
  const h = d.getHours()
  const label = `${String(h % 12 || 12).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? '오전' : '오후'}`
  return (
    <div className="ivi-status">
      <Svg d="M10 15V11a6 6 0 0 1 12 0v4M8 15h16v12H8z" />
      <Svg d="M14 6a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM20 20l7 7" />
      <span className="grow" />
      <span className="avatar">운</span>
      <Svg d="M10 9l12 12-6 5V6l6 5-12 12" />
      <span className="signal">
        <i style={{ height: 8 }} />
        <i style={{ height: 14 }} />
        <i style={{ height: 20 }} />
        <i style={{ height: 26 }} />
      </span>
      <span className="sep" />
      <span className="time">{label}</span>
    </div>
  )
}

function DrivingView() {
  const snap = useSim((s) => s.snap)
  if (!snap) return <div className="ivi-drive" />
  const { sig, waypoint } = snap
  const ambient = sig.ambient?.color ?? '#3CF2C8'
  const left = waypoint ? Math.max(0, waypoint.km - (sig.routeProgressKm ?? 0)) : 0
  return (
    <div className="ivi-drive">
      <div className="dv-top">
        <span className="batt">
          <i />
        </span>
        <span className="odo">{(sig.routeProgressKm ?? 0).toFixed(0)}km</span>
        <span className="grow" />
        <span className="prnd">
          {(['P', 'R', 'N', 'D'] as const).map((g) => (
            <b key={g} className={sig.gear === g ? 'on' : ''}>
              {g}
            </b>
          ))}
        </span>
      </div>
      <div className="dv-speed">
        <b>{Math.round(sig.speedKph)}</b>
        <span>km/h</span>
      </div>
      {waypoint && (
        <div className="dv-tbt">
          <svg width="64" height="64" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 28V8M9 15l7-7 7 7" />
          </svg>
          <div>
            <b>
              {left < 10 ? left.toFixed(1) : left.toFixed(0)}
              <small>km</small>
            </b>
            <span>{waypoint.name} 방면</span>
          </div>
        </div>
      )}
      <div className="dv-car">
        <svg viewBox="0 0 300 220" width="300" height="220">
          <defs>
            <radialGradient id="amb" cx="50%" cy="40%" r="60%">
              <stop offset="0" stopColor={ambient} stopOpacity={0.55} />
              <stop offset="1" stopColor={ambient} stopOpacity={0} />
            </radialGradient>
            <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="car-hi" />
              <stop offset="1" className="car-lo" />
            </linearGradient>
          </defs>
          <ellipse cx="150" cy="204" rx="128" ry="12" className="car-shadow" />
          <path d="M38 150 Q36 110 60 96 L92 50 Q100 38 118 36 L182 36 Q200 38 208 50 L240 96 Q264 110 262 150 L262 186 Q262 196 250 196 L50 196 Q38 196 38 186 Z" fill="url(#body)" />
          <path d="M98 56 L202 56 Q210 58 214 66 L232 98 L68 98 L86 66 Q90 58 98 56 Z" className="car-glass" />
          <path d="M98 56 L202 56 Q210 58 214 66 L232 98 L68 98 L86 66 Q90 58 98 56 Z" fill="url(#amb)" />
          <rect x="52" y="122" width="58" height="12" rx="6" className="car-lamp" />
          <rect x="190" y="122" width="58" height="12" rx="6" className="car-lamp" />
          <rect x="122" y="150" width="56" height="16" rx="3" className="car-plate" />
          <rect x="44" y="186" width="44" height="22" rx="6" className="car-tyre" />
          <rect x="212" y="186" width="44" height="22" rx="6" className="car-tyre" />
        </svg>
      </div>
      <div className="dv-quick">
        <Svg d="M6 20h20M9 20l2-6h10l2 6M11 14l1-4h8l1 4" />
        <Svg d="M16 6v6M8 9l3 4M24 9l-3 4M8 22h16M10 18h12" />
        <Svg d="M7 8h18v16H7zM7 14h18M12 19l8-8" />
        <Svg d="M6 10h20v12H6zM6 15h20M13 19h6" />
      </div>
      <div className="dv-dots">
        <i />
        <i className="on" />
        <i />
        <i />
      </div>
    </div>
  )
}

function Gnb() {
  const sig = useSim((s) => s.snap?.sig)
  if (!sig) return <div className="ivi-gnb" />
  return (
    <div className="ivi-gnb">
      <div className="g-climate">
        <Chevron dir="down" />
        <span className="g-temp">
          <Fan on={sig.fanSpeed > 0} />
          {sig.setTempC.toFixed(1)}°<small className={sig.recirculation ? '' : 'on'}>A/C</small>
        </span>
        <Chevron dir="up" />
      </div>
      <div className="g-icons">
        <Svg d="M8 10h16M8 15h16M10 6v4M16 6v4M22 6v4M10 20l4 6M18 20l4 6" />
        <Svg d={`M10 26h8l2-10h-8zM12 16l-2-8M22 6v6M26 6v6`} className={sig.seatVentDriver ? 'hot' : ''} />
        <Svg d="M16 6a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8 16h16M16 16v10" />
      </div>
      <div className="g-apps">
        <span className="g-app">
          <Svg d="M8 22v-6l3-6h10l3 6v6zM8 22v3M24 22v3M11 18h2M19 18h2" />
        </span>
        <span className="g-app">
          <svg width="44" height="44" viewBox="0 0 32 32">
            <path d="M16 4 L26 28 L16 22 L6 28 Z" fill="currentColor" />
          </svg>
        </span>
        <span className="g-app">
          <Svg d="M10 6l4 4-3 3a14 14 0 0 0 8 8l3-3 4 4-3 4C14 26 6 18 6 9z" fill />
        </span>
        <span className="g-app plain">
          <svg width="44" height="44" viewBox="0 0 32 32" fill="currentColor">
            <rect x="6" y="6" width="9" height="9" />
            <rect x="17" y="6" width="9" height="9" />
            <rect x="6" y="17" width="9" height="9" />
            <rect x="17" y="17" width="9" height="9" />
          </svg>
        </span>
        <span className="g-div" />
        <span className="g-app on">
          <svg width="56" height="56" viewBox="0 0 32 32" fill="none" stroke="#3CF2C8" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 18c3.2-5.6 8-8.4 13-8.4S25.8 12.4 29 18" />
            <path d="M10 18a6 6 0 0 1 12 0" />
            <path d="M5 22.5h22" opacity=".55" />
            <path d="M16 5v2.4M8.5 7.6l1.3 1.6M23.5 7.6l-1.3 1.6" />
          </svg>
        </span>
      </div>
      <div className="g-icons">
        <Svg d={`M10 26h8l2-10h-8zM12 16l-2-8M22 8c2 2 2 4 0 6M26 6c3 3 3 7 0 10`} className={sig.seatVentDriver ? 'cool' : ''} />
        <Svg d="M6 20h18l2-4-4-6H10l-4 6zM10 24a2 2 0 1 0 0 .1M22 24a2 2 0 1 0 0 .1M18 10c4-4 8-2 8 2l-3-1" className={sig.recirculation ? 'cool' : ''} />
        <Svg d="M8 26l6-16 6 16M10 21h8M22 8a2 2 0 1 0 0 .1M20 14l4 10" />
      </div>
      <div className="g-climate">
        <Chevron dir="down" />
        <span className="g-temp">
          <Fan on={sig.fanSpeed > 0} />
          22.0°<small className="on">A/C</small>
        </span>
        <Chevron dir="up" />
      </div>
    </div>
  )
}

const Svg = ({ d, className, fill }: { d: string; className?: string; fill?: boolean }) => (
  <svg width="44" height="44" viewBox="0 0 32 32" className={className} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const Chevron = ({ dir }: { dir: 'up' | 'down' }) => (
  <svg width="40" height="40" viewBox="0 0 32 32" className={`chev ${dir}`} fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d={dir === 'up' ? 'M8 20l8-8 8 8' : 'M8 12l8 8 8-8'} />
  </svg>
)

const Fan = ({ on }: { on: boolean }) => (
  <svg width="30" height="30" viewBox="0 0 32 32" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className="fan">
    <path d="M16 16c0-6 2-10 6-10s4 6-6 10zM16 16c6 0 10 2 10 6s-6 4-10-6zM16 16c0 6-2 10-6 10s-4-6 6-10zM16 16c-6 0-10-2-10-6s6-4 10 6z" />
  </svg>
)

