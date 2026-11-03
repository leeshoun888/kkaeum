// The in-vehicle app (what runs in the Pleos Connect window). Glanceable, voice-first and
// motion-restrained while driving (Pleos driver-distraction guideline). Visual language follows the
// Pleos Connect design system: Asta Sans type scale, basic_* greys, informative colours, and the
// system day / night theme so the window sits inside the head unit instead of on top of it.

import type React from 'react'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSim } from '../state/store'
import { useVoice, voice } from '../voice/voice'
import { clock, dur, LEVEL } from '../ui/format'
import {
  IcAlert,
  IcCheck,
  IcCoffee,
  IcFan,
  IcLight,
  IcMic,
  IcMoon,
  IcPin,
  IcRecirc,
  IcSeat,
  IcSpeaker,
  IcSun,
  IcTemp,
  IcWind,
  IcWindow,
  Logo,
} from '../ui/icons'
import type { Snapshot } from '../engine/runtime'
import type { RiskLevel, VehicleAction } from '../engine/types'
import './car.css'

/** Portrait window (840 × 1184 dp): components that draw fixed-size SVG read this to size themselves. */
const Portrait = createContext(false)

const LAND = { w: 1700, h: 1212 }
const PORT = { w: 840, h: 1184 }

/** Scales the fixed dp design to whatever box it is mounted in (APK window or console frame). */
export function CarFrame({ portrait }: { portrait?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current!
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const auto = portrait ?? box.h > box.w * 1.05
  const d = auto ? PORT : LAND
  const s = box.w ? Math.min(box.w / d.w, box.h / d.h) : 0
  return (
    <div ref={ref} className="car-frame">
      <div
        className={`car ${auto ? 'portrait' : 'landscape'}`}
        style={{ width: d.w, height: d.h, transform: `translate(-50%,-50%) scale(${s})` }}
      >
        <Portrait.Provider value={auto}>
          <CarApp />
        </Portrait.Provider>
      </div>
    </div>
  )
}

/** Day / night: the vehicle's UI mode when running in the APK, otherwise the console setting (auto = sim clock). */
export function useTheme(snap: Snapshot | null): 'day' | 'night' {
  const pref = useSim((s) => s.carTheme)
  if (!snap) return 'night'
  if (snap.sig.uiNight !== undefined) return snap.sig.uiNight ? 'night' : 'day'
  if (pref !== 'auto') return pref
  const h = new Date(snap.sig.t).getHours()
  return h >= 7 && h < 19 ? 'day' : 'night'
}

export function CarApp() {
  const snap = useSim((s) => s.snap)
  const rt = useSim((s) => s.runtime)
  const theme = useTheme(snap)
  if (!snap || !rt) {
    return (
      <div className="car-app boot" data-theme={theme}>
        <Logo size={120} />
      </div>
    )
  }
  const resting = snap.mode === 'napping' || snap.mode === 'waking'
  const driving = snap.sig.speedKph > 3
  return (
    <div
      className={`car-app lv${snap.est.level} ${driving ? 'driving' : 'stopped'} mode-${snap.mode}`}
      data-theme={resting ? 'night' : theme}
      style={{ '--amb': snap.sig.ambient?.color ?? 'transparent' } as React.CSSProperties}
    >
      <Header snap={snap} />
      {resting ? <NapView snap={snap} /> : snap.mode === 'parked' ? <ParkedView snap={snap} /> : <DriveView snap={snap} />}
      <VoiceBar />
      <QuizOverlay />
      <ProbeOverlay />
      <CriticalOverlay snap={snap} />
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ snap }: { snap: Snapshot }) {
  const enabled = useVoice((s) => s.enabled)
  const live = snap.caps.source === 'pleos'
  const state = snap.mode === 'driving' ? '주행 모니터링' : snap.mode === 'napping' ? '파워냅 중' : snap.mode === 'waking' ? '기상 중' : '정차'
  return (
    <header className="hd">
      <div className="hd-brand">
        <Logo size={44} />
        <b>깨움</b>
        <span className={`hd-chip ${live ? 'live' : ''}`}>
          <i />
          {live ? 'Pleos 차량 연결' : '시뮬레이션'}
          <em>{state}</em>
        </span>
      </div>
      <button className={`hd-voice ${enabled ? 'on' : ''}`} onClick={() => useVoice.getState().setEnabled(!enabled)}>
        <IcSpeaker size={30} />
        {enabled ? '음성 안내 켜짐' : '음성 안내 꺼짐'}
      </button>
    </header>
  )
}

// ─── Drive ────────────────────────────────────────────────────────────────────

function DriveView({ snap }: { snap: Snapshot }) {
  return (
    <main className="drive">
      <section className="panel alert-panel">
        <div className="panel-k">
          <span>졸음 예측</span>
          <LevelChip level={snap.est.level} />
        </div>
        <Gauge snap={snap} />
        <ForecastStrip snap={snap} />
      </section>
      <section className="side">
        <AirLine snap={snap} />
        <RestCard snap={snap} />
        <AirCard snap={snap} />
        <ActivityCard snap={snap} />
      </section>
    </main>
  )
}

const LevelChip = ({ level }: { level: RiskLevel }) => (
  <span className={`lv-chip l${level}`}>
    <i />
    {LEVEL[level].name}
  </span>
)

// Gauge geometry: 270° arc, KSS 1 at the lower left, 9 at the lower right.
const G_START = 135
const G_SWEEP = 270
const kssAngle = (k: number) => G_START + ((Math.min(9, Math.max(1, k)) - 1) / 8) * G_SWEEP
const ZONES: [number, number, RiskLevel][] = [
  [1, 5, 0],
  [5, 6, 1],
  [6, 7, 2],
  [7, 8, 3],
  [8, 9, 4],
]
function polar(c: number, r: number, a: number): [number, number] {
  return [c + r * Math.cos((a * Math.PI) / 180), c + r * Math.sin((a * Math.PI) / 180)]
}
function arcPath(c: number, r: number, a0: number, a1: number) {
  const [x0, y0] = polar(c, r, a0)
  const [x1, y1] = polar(c, r, a1)
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

/**
 * Alertness instrument. Zoned track (each zone in its level colour), solid fill to the current KSS,
 * and a hollow "ghost" marker where the model expects the driver to be one hour from now.
 */
function Gauge({ snap }: { snap: Snapshot }) {
  const rt = useSim((s) => s.runtime)!
  const { est, sig } = snap
  const minute = Math.floor(sig.t / 60000)
  const ahead = useMemo(
    () => rt.fatigue.forecastCurve(sig, est.kss, 60, 60).at(-1)?.kss ?? est.kss,
    // the forecast moves slowly: once per sim minute is plenty
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rt, minute],
  )
  const S = 560
  const c = S / 2
  const r = 226
  const w = 30
  const a = kssAngle(est.kss)
  const [kx, ky] = polar(c, r, a)
  const [gx, gy] = polar(c, r, kssAngle(ahead))
  const [lx, ly] = polar(c, r + 52, kssAngle(ahead))
  const rising = ahead - est.kss > 0.15
  return (
    <div className="gauge">
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
        {ZONES.map(([k0, k1, l]) => (
          <path key={l} d={arcPath(c, r, kssAngle(k0) + 1.2, kssAngle(k1) - 1.2)} className={`g-zone l${l}`} strokeWidth={w} />
        ))}
        <path d={arcPath(c, r, G_START, Math.max(G_START + 0.5, a))} className={`g-fill l${est.level}`} strokeWidth={w} />
        {[5, 6, 7, 8].map((k) => {
          const [tx, ty] = polar(c, r - w / 2 - 26, kssAngle(k))
          return (
            <text key={k} x={tx} y={ty + 8} className={`g-tick ${k === 7 ? 'warn' : ''}`} textAnchor="middle">
              {k}
            </text>
          )
        })}
        {rising && (
          <g className="g-ghost">
            <circle cx={gx} cy={gy} r={13} />
            <text x={lx} y={ly + 8} textAnchor="middle">
              1시간 뒤
            </text>
          </g>
        )}
        <circle cx={kx} cy={ky} r={22} className={`g-knob l${est.level}`} />
      </svg>
      <div className="g-center">
        <span className="g-label">졸음지수</span>
        <span className="g-value">
          {est.kss.toFixed(1)}
          <small>/9</small>
        </span>
        <span className={`g-desc l${est.level}`}>{LEVEL[est.level].desc}</span>
      </div>
    </div>
  )
}

/** The signature view: the next four hours of predicted sleepiness, the danger line and the planned stop. */
function ForecastStrip({ snap }: { snap: Snapshot }) {
  const rt = useSim((s) => s.runtime)!
  const { est, sig, plan, waypoint, proposal } = snap
  const minute = Math.floor(sig.t / 60000)
  const curve = useMemo(
    () => rt.fatigue.forecastCurve(sig, est.kss, 240, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rt, minute],
  )
  const portrait = useContext(Portrait)
  const W = portrait ? 712 : 680
  const H = portrait ? 92 : 172
  const top = 14
  const x = (m: number) => (m / 240) * W
  const y = (k: number) => top + (1 - (Math.min(9, Math.max(3, k)) - 3) / 6) * (H - top - 6)
  const line = curve.map((p, i) => `${i ? 'L' : 'M'}${x(p.min).toFixed(1)},${y(p.kss).toFixed(1)}`).join('')
  const area = curve.length ? `${line}L${x(curve.at(-1)!.min)},${H}L0,${H}Z` : ''
  const cross = curve.find((p) => p.kss >= 7)
  const stopEta = waypoint
    ? ((waypoint.km - (sig.routeProgressKm ?? 0)) / 95) * 60
    : proposal?.etaMin ?? plan?.etaMin
  const stopName = (waypoint ?? proposal?.stop ?? plan?.stop)?.name
  const mtd = est.minutesToDanger
  return (
    <div className="forecast">
      <div className="fc-head">
        <span>앞으로 4시간</span>
        <b className={mtd !== null && mtd < 45 ? 'warn' : ''}>
          {mtd === null ? '4시간 내 졸음 위험 없음' : mtd === 0 ? '졸음 위험 구간' : `졸음 위험까지 ${dur(mtd)}`}
        </b>
      </div>
      <svg width={W} height={H + 34} viewBox={`0 0 ${W} ${H + 34}`} className="fc-chart">
        <defs>
          <linearGradient id="fcArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="fc-area-top" />
            <stop offset="1" className="fc-area-bot" />
          </linearGradient>
        </defs>
        <rect x={0} y={top} width={W} height={y(7) - top} className="fc-danger" />
        <line x1={0} x2={W} y1={y(7)} y2={y(7)} className="fc-danger-line" />
        <text x={W - 6} y={y(7) - 10} textAnchor="end" className="fc-danger-label">
          위험 7
        </text>
        {[60, 120, 180].map((m) => (
          <line key={m} x1={x(m)} x2={x(m)} y1={top} y2={H} className="fc-grid" />
        ))}
        <path d={area} fill="url(#fcArea)" />
        <path d={line} className="fc-line" />
        {cross && <circle cx={x(cross.min)} cy={y(7)} r={8} className="fc-cross" />}
        {stopEta !== undefined && stopEta >= 0 && stopEta <= 240 && (
          <g className={`fc-stop ${waypoint ? 'set' : ''}`}>
            <line x1={x(stopEta)} x2={x(stopEta)} y1={top + 26} y2={H} />
            <rect x={x(stopEta) - 15} y={top} width={30} height={30} rx={9} />
            <path d={`M${x(stopEta) - 5},${top + 15} l4,4 l7,-8`} />
          </g>
        )}
        <circle cx={0} cy={y(est.kss)} r={9} className={`fc-now l${est.level}`} />
        {[0, 60, 120, 180, 240].map((m) => (
          <text key={m} x={m === 0 ? 2 : m === 240 ? W - 2 : x(m)} y={H + 28} textAnchor={m === 0 ? 'start' : m === 240 ? 'end' : 'middle'} className="fc-time">
            {m === 0 ? '지금' : clock(sig.t + m * 60_000)}
          </text>
        ))}
      </svg>
      {stopName && stopEta !== undefined && (
        <p className="fc-note">
          <IcPin size={24} />
          {waypoint ? '경유지' : '추천 휴식'} <b>{stopName}</b> · {Math.max(0, Math.round(stopEta))}분 뒤 도착
        </p>
      )}
    </div>
  )
}

// ─── Side cards ───────────────────────────────────────────────────────────────

function RestCard({ snap }: { snap: Snapshot }) {
  const rt = useSim((s) => s.runtime)!
  const { plan, proposal, waypoint } = snap
  const km = snap.sig.routeProgressKm ?? 0
  if (waypoint) {
    const left = Math.max(0, waypoint.km - km)
    return (
      <div className="panel rest set">
        <div className="panel-k">
          <span className="k-icon ok"><IcCheck size={26} /></span>
          <span>경유지로 안내 중</span>
          <StopTag kind={waypoint.kind} />
        </div>
        <h3 className="rest-name">{waypoint.name}</h3>
        <div className="rest-meta">
          <Metric v={left.toFixed(0)} u="km" />
          <Metric v={String(Math.round((left / 95) * 60))} u="분 뒤 도착" />
        </div>
        <p className="rest-why">도착하면 커피 한 잔과 15분 파워냅을 준비해 드릴게요.</p>
      </div>
    )
  }
  const target = proposal ? { stop: proposal.stop, etaMin: proposal.etaMin, kssAtArrival: plan?.kssAtArrival } : plan
  if (!target) {
    return (
      <div className="panel rest empty">
        <div className="panel-k">
          <span>다음 휴식</span>
        </div>
        <h3 className="rest-name dim">주변 쉼터를 찾는 중</h3>
        <p className="rest-why">진행 방향의 졸음쉼터·휴게소를 공공데이터에서 찾고 있어요.</p>
      </div>
    )
  }
  const arrive = target.kssAtArrival
  return (
    <div className={`panel rest ${proposal ? 'ask' : ''}`}>
      <div className="panel-k">
        <span className="k-icon">{target.stop.kind === 'service' ? <IcCoffee size={26} /> : <IcPin size={26} />}</span>
        <span>{proposal ? '깨움이 휴식을 제안해요' : '예측 기반 추천 휴식지'}</span>
        <StopTag kind={target.stop.kind} />
      </div>
      <h3 className="rest-name">{target.stop.name}</h3>
      <div className="rest-meta">
        <Metric v={Math.max(0, target.stop.km - km).toFixed(0)} u="km" />
        <Metric v={String(Math.round(target.etaMin))} u="분" />
        {arrive !== undefined && <Metric v={arrive.toFixed(1)} u="도착 시 졸음지수" level={arrive >= 7 ? 3 : arrive >= 6 ? 2 : arrive >= 5 ? 1 : 0} />}
      </div>
      {proposal ? (
        <div className="rest-actions">
          <button className="btn primary" onClick={() => rt.acceptProposal()}>
            <IcPin size={30} /> 경유지 추가
          </button>
          <button className="btn" onClick={() => rt.declineProposal()}>
            나중에
          </button>
        </div>
      ) : (
        <p className="rest-why">{plan?.reason}</p>
      )}
    </div>
  )
}

const StopTag = ({ kind }: { kind: 'service' | 'drowsy' }) => <span className="stop-tag">{kind === 'service' ? '휴게소' : '졸음쉼터'}</span>

const Metric = ({ v, u, level }: { v: string; u: string; level?: RiskLevel }) => (
  <span className={`metric ${level !== undefined ? `l${level}` : ''}`}>
    <b>{v}</b>
    <small>{u}</small>
  </span>
)

const CO2_MIN = 400
const CO2_MAX = 5000
const CO2_BANDS: [number, string, string][] = [
  [1000, 'good', '쾌적'],
  [2000, 'fair', '환기 필요'],
  [3500, 'poor', '졸음 유발'],
  [CO2_MAX, 'bad', '두통·졸음'],
]

function AirCard({ snap }: { snap: Snapshot }) {
  const { co2, sig } = snap
  const band = CO2_BANDS.find(([max]) => co2 < max) ?? CO2_BANDS[CO2_BANDS.length - 1]
  const pos = (v: number) => ((Math.min(CO2_MAX, Math.max(CO2_MIN, v)) - CO2_MIN) / (CO2_MAX - CO2_MIN)) * 100
  let prev = CO2_MIN
  return (
    <div className="panel air">
      <div className="air-main">
        <div className="panel-k">
          <span>실내 CO₂</span>
          <small>디지털 트윈 추정</small>
        </div>
        <div className={`co2 ${band[1]}`}>
          <b>{Math.round(co2).toLocaleString()}</b>
          <small>ppm</small>
          <em>{band[2]}</em>
        </div>
        <div className="co2-bar">
          {CO2_BANDS.map(([max, cls]) => {
            const el = <i key={cls} className={cls} style={{ left: `${pos(prev)}%`, width: `calc(${pos(max) - pos(prev)}% - 4px)` }} />
            prev = max
            return el
          })}
          <span className="co2-mark" style={{ left: `${pos(co2)}%` }} />
        </div>
      </div>
      <div className="air-tiles">
        <Tile icon={sig.recirculation ? <IcRecirc size={30} /> : <IcWind size={30} />} k="공기" v={sig.recirculation ? '내기순환' : '외기유입'} on={!sig.recirculation} />
        <Tile icon={<IcTemp size={30} />} k="설정 온도" v={`${sig.setTempC.toFixed(1)}°`} />
        <Tile icon={<IcFan size={30} />} k="송풍" v={`${sig.fanSpeed}단`} />
        <Tile icon={<IcLight size={30} />} k="앰비언트" v={sig.ambient ? <i className="swatch" style={{ background: sig.ambient.color }} /> : '자동'} />
      </div>
    </div>
  )
}

/** Portrait-only one-line cabin summary (the full AirCard does not fit an 840 dp window). */
function AirLine({ snap }: { snap: Snapshot }) {
  const { co2, sig } = snap
  const band = CO2_BANDS.find(([max]) => co2 < max) ?? CO2_BANDS[CO2_BANDS.length - 1]
  return (
    <div className="panel air-line">
      <span className="al-k">실내 CO₂</span>
      <b className={`co2v ${band[1]}`}>{Math.round(co2).toLocaleString()}<small>ppm</small></b>
      <em className={`co2 ${band[1]}`}><em>{band[2]}</em></em>
      <span className={`al-mode ${sig.recirculation ? '' : 'on'}`}>
        {sig.recirculation ? <IcRecirc size={26} /> : <IcWind size={26} />}
        {sig.recirculation ? '내기순환' : '외기유입'}
      </span>
      <span className="al-temp"><IcTemp size={26} />{sig.setTempC.toFixed(1)}°</span>
    </div>
  )
}

const Tile = ({ icon, k, v, on }: { icon: ReactNode; k: string; v: ReactNode; on?: boolean }) => (
  <div className={`tile ${on ? 'on' : ''}`}>
    {icon}
    <span>{k}</span>
    <b>{v}</b>
  </div>
)

const ACTION_ICON: Partial<Record<VehicleAction['kind'], ReactNode>> = {
  freshAir: <IcWind size={24} />,
  recirculation: <IcRecirc size={24} />,
  temperature: <IcTemp size={24} />,
  fan: <IcFan size={24} />,
  ambient: <IcLight size={24} />,
  seatVent: <IcSeat size={24} />,
  seatRecline: <IcSeat size={24} />,
  window: <IcWindow size={24} />,
  waypoint: <IcPin size={24} />,
  probe: <IcMic size={24} />,
  speak: <IcSpeaker size={24} />,
}

function ActivityCard({ snap }: { snap: Snapshot }) {
  const rt = useSim((s) => s.runtime)!
  const items = snap.timeline.filter((e) => e.actions.length).slice(-1)
  const tot = rt.fatigue.timeOnTaskMin
  const peak = Math.max(snap.stats.maxKss, snap.est.kss)
  return (
    <div className="panel activity">
      <div className="panel-k">
        <span>이번 주행</span>
      </div>
      <div className="trip">
        <Metric v={tot < 1 ? '0분' : dur(tot)} u="연속 운전" />
        <Metric v={peak.toFixed(1)} u="최고 졸음지수" level={peak >= 7 ? 3 : peak >= 6 ? 2 : peak >= 5 ? 1 : 0} />
        <Metric v={String(snap.stats.interventions)} u="깨움 개입" />
      </div>
      <div className="act-k">최근 개입</div>
      {items.length === 0 && <p className="act-empty">아직 개입이 필요하지 않았어요. 계속 지켜보고 있어요.</p>}
      <ul>
        {items.map((e, i) => {
          const kinds = [...new Set(e.actions.map((a) => a.kind))].filter((k) => ACTION_ICON[k]).slice(0, 4)
          return (
            <li key={e.t + e.title + i}>
              <i className={`l${e.level}`} />
              <time>{clock(e.t)}</time>
              <span>{e.title.replace(/^L\d\s*/, '')}</span>
              <em>{kinds.map((k) => <span key={k}>{ACTION_ICON[k]}</span>)}</em>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── Parked / nap ─────────────────────────────────────────────────────────────

function ParkedView({ snap }: { snap: Snapshot }) {
  const rt = useSim((s) => s.runtime)!
  const [min, setMin] = useState(15)
  return (
    <main className="parked">
      <section className="panel parked-hero">
        <div className="moon">
          <IcMoon size={96} />
        </div>
        <h1>잠깐 눈을 붙이고 가세요</h1>
        <p>
          주차가 확인됐어요. 지금 졸음지수 <b className={`l${snap.est.level}`}>{snap.est.kss.toFixed(1)}</b>
          <br />
          커피 한 잔 뒤 15분 낮잠이 가장 효과적이에요. 시트·공기·조명을 맞추고 정확히 깨워 드릴게요.
        </p>
        <div className="seg" role="radiogroup">
          {[10, 15, 20].map((m) => (
            <button key={m} role="radio" aria-checked={min === m} className={min === m ? 'on' : ''} onClick={() => setMin(m)}>
              {m}분
            </button>
          ))}
        </div>
        <button className="btn primary wide" onClick={() => rt.startNap(min)}>
          <IcMoon size={34} /> {min}분 파워냅 시작
        </button>
        <button className="btn wide" onClick={() => voice.manualProbe(rt)}>
          <IcMic size={32} /> 출발 전 반응속도 확인
        </button>
      </section>
      <section className="parked-side">
        <div className="panel nap-plan">
          <div className="panel-k"><span>파워냅이 시작되면</span></div>
          <ol>
            <li><IcSeat size={32} /><span><b>등받이를 뒤로</b>편하게 기댈 수 있게 천천히 젖혀요</span></li>
            <li><IcWind size={32} /><span><b>바깥 공기 유입</b>잠든 사이 CO₂가 쌓이지 않게 해요</span></li>
            <li><IcTemp size={32} /><span><b>22.5℃ · 약한 바람</b>잠들기 좋은 온도와 소음</span></li>
            <li><IcLight size={32} /><span><b>은은한 웜톤 조명</b>멜라토닌을 방해하지 않는 밝기</span></li>
            <li><IcSun size={32} /><span><b>빛과 바람으로 기상</b>90초에 걸쳐 부드럽게 깨워요</span></li>
          </ol>
        </div>
      </section>
    </main>
  )
}

function NapView({ snap }: { snap: Snapshot }) {
  const rt = useSim((s) => s.runtime)!
  const waking = snap.mode === 'waking'
  const total = rt.orch.napMinutes
  const left = snap.napRemainingMin ?? 0
  const frac = waking ? 1 : Math.min(1, Math.max(0, 1 - left / total))
  const R = 300
  const C = 2 * Math.PI * R
  const mm = Math.floor(left)
  const ss = Math.floor((left % 1) * 60)
  return (
    <main className={`nap ${waking ? 'waking' : ''}`}>
      <div className="nap-dial">
        <svg width={680} height={680} viewBox="0 0 680 680">
          <circle cx={340} cy={340} r={R} className="nd-track" />
          <circle cx={340} cy={340} r={R} className="nd-fill" strokeDasharray={`${C * frac} ${C}`} transform="rotate(-90 340 340)" />
        </svg>
        <div className="nd-center">
          <span>{waking ? '기상 시퀀스' : '파워냅'}</span>
          <b>{waking ? <IcSun size={110} /> : `${mm}:${String(ss).padStart(2, '0')}`}</b>
          <em>{waking ? '빛과 바람으로 깨우는 중' : `${clock(snap.sig.t + left * 60_000)}에 깨워 드릴게요`}</em>
        </div>
      </div>
      <div className="nap-side">
        <NapStep on icon={<IcSeat size={32} />} t="등받이 젖힘" />
        <NapStep on icon={<IcTemp size={32} />} t={`${snap.sig.setTempC.toFixed(1)}℃ · 송풍 ${snap.sig.fanSpeed}단`} />
        <NapStep on={!snap.sig.recirculation} icon={<IcWind size={32} />} t="외기 유입 · CO₂ 축적 방지" />
        <NapStep on icon={<IcLight size={32} />} t={waking ? '주광색 조명으로 각성' : '저조도 웜톤 조명'} />
        {!waking && (
          <button className="btn wide" onClick={() => rt.wakeNow()}>
            지금 깨우기
          </button>
        )}
      </div>
    </main>
  )
}

const NapStep = ({ on, icon, t }: { on: boolean; icon: ReactNode; t: string }) => (
  <div className={`nap-step ${on ? 'on' : ''}`}>
    {icon}
    <span>{t}</span>
    {on && <IcCheck size={26} />}
  </div>
)

// ─── Voice and overlays ───────────────────────────────────────────────────────

function VoiceBar() {
  const caption = useVoice((s) => s.caption)
  return (
    <footer className={`voicebar ${caption ? 'speaking' : ''}`}>
      <span className="orb" aria-hidden />
      <span className="vb-text">{caption ?? '“깨움아” 라고 부르거나 스티어링 휠 음성 버튼을 눌러 말해 보세요'}</span>
    </footer>
  )
}

function QuizOverlay() {
  const quiz = useVoice((s) => s.quiz)
  const driving = useSim((s) => s.snap?.mode === 'driving')
  // The quiz is an in-motion engagement tool: never show it over the nap / parked screens.
  if (!quiz || !driving) return null
  return (
    <div className="sheet quiz">
      <div className="sheet-k">각성 퀴즈 · {quiz.region}</div>
      <h2>{quiz.q}</h2>
      <div className="choices">
        {quiz.choices.map((c, i) => {
          const state = quiz.picked === undefined ? '' : i === quiz.answer ? 'right' : i === quiz.picked ? 'wrong' : 'dim'
          return (
            <button key={c} className={`choice ${state}`} onClick={() => voice.answer(i)}>
              <em>{i + 1}</em>
              {c}
            </button>
          )
        })}
      </div>
      <p className="sheet-hint">“{quiz.choices[0]}” 또는 “{quiz.choices[1]}” 라고 말씀하세요</p>
    </div>
  )
}

function ProbeOverlay() {
  const probe = useVoice((s) => s.probe)
  if (probe.phase === 'idle') return null
  const slow = (probe.rt ?? 0) > 500
  return (
    <div className="sheet probe">
      <div className="sheet-k">음성 반응속도 측정</div>
      {probe.phase === 'done' ? (
        <>
          <h2 className={`rt ${slow ? 'slow' : 'ok'}`}>
            {Math.round(probe.rt ?? 0)}
            <small>ms</small>
          </h2>
          <p>{slow ? '반응이 늦어졌어요. 500ms를 넘으면 주의 지연이에요.' : '반응속도가 좋아요.'}</p>
        </>
      ) : (
        <>
          <span className={`probe-orb ${probe.phase}`} />
          <h2>{probe.phase === 'listening' ? '지금 “네” 라고 말하세요' : '띵 소리가 나면 “네” 라고 말하세요'}</h2>
        </>
      )}
    </div>
  )
}

/** L4, or the vehicle's own attention warning with no rest stop set: one clear action, nothing else. */
function CriticalOverlay({ snap }: { snap: Snapshot }) {
  const rt = useSim((s) => s.runtime)!
  const { est, sig, plan, waypoint } = snap
  const [dismissedAt, setDismissedAt] = useState(0)
  const critical = snap.mode === 'driving' && !waypoint && (est.level >= 4 || sig.dawWarning)
  if (!critical || sig.t - dismissedAt < 5 * 60_000) return null
  const stop = snap.proposal?.stop ?? plan?.stop
  return (
    <div className="critical" role="alertdialog">
      <div className="crit-card">
        <span className="crit-icon"><IcAlert size={64} /></span>
        <h2>{sig.dawWarning ? '차량이 주의 저하를 감지했어요' : '지금 바로 쉬어야 해요'}</h2>
        <p>졸음지수 {est.kss.toFixed(1)} · 3초만 졸아도 약 80m를 운전자 없이 달립니다.</p>
        {stop && (
          <button className="btn danger wide" onClick={() => void rt.commitWaypoint(stop)}>
            <IcPin size={32} /> {stop.name}로 안내
          </button>
        )}
        <button className="btn wide" onClick={() => setDismissedAt(sig.t)}>
          잠시 후 다시 알림
        </button>
      </div>
    </div>
  )
}
