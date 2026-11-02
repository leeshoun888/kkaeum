// Assembles the demo video: recorded scenes + narration + burned-in Korean subtitles.
// Usage: FFMPEG=<path> node tools/video/assemble.mjs <videoDir> [apkClip.webm|mp4]
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const V = process.argv[2]
const apkClip = process.argv[3] // optional emulator footage for the APK scene
const FF = process.env.FFMPEG ?? 'ffmpeg'
const PAD = 0.6
const LEAD = 0.25
const nar = Object.fromEntries(JSON.parse(readFileSync(join(here, 'narration.json'), 'utf8')).map((n) => [n.id, n.text]))

const ff = (args) => execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
function seconds(file) {
  try {
    execFileSync(FF, ['-hide_banner', '-i', file], { stdio: 'pipe' })
  } catch (e) {
    const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(e.stderr.toString())
    if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3]
  }
  throw new Error('duration? ' + file)
}

// [output name, video source, narration ids]
const SCENES = [
  ['01', { webm: 'raw/s1_hero.webm' }, ['s1_hero']],
  ['02', { webm: 'raw/s2_data.webm' }, ['s2_data']],
  ['03', { webm: 'raw/console_drive.webm' }, ['s3_console', 's4_intervene', 's5_waypoint']],
  ['04', { webm: 'raw/s6_nap.webm' }, ['s6_nap']],
  ['05', { image: join(here, '../../docs/img/positioning.png'), bg: '#ffffff' }, ['s7_layer']],
  ['06', { webm: 'raw/s8_fleet.webm' }, ['s8_fleet']],
  ['07', { webm: apkClip && existsSync(apkClip) ? apkClip : 'raw/s9_sdk.webm' }, ['s9_apk']],
  ['08', { image: join(V, 'outro.png'), bg: '#05070b' }, ['s10_outro']],
]

const assTime = (t) => {
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = (t % 60).toFixed(2).padStart(5, '0')
  return `${h}:${String(m).padStart(2, '0')}:${s}`
}
/** Splits a narration into subtitle cues (sentence / clause), timed by character share. */
function cues(text, start, len) {
  const parts = text
    .split(/(?<=[.?!])\s+|(?<=,)\s+(?=\S{6,})/)
    .flatMap((p) => (p.length > 34 ? p.split(/(?<=,)\s+/) : [p]))
    .filter(Boolean)
  const total = parts.reduce((a, p) => a + p.length, 0)
  let t = start
  return parts.map((p) => {
    const d = (p.length / total) * len
    const c = [t, t + d, p.trim()]
    t += d
    return c
  })
}

mkdirSync(join(V, 'build'), { recursive: true })
const list = []
for (const [name, src, ids] of SCENES) {
  const durs = ids.map((id) => seconds(join(V, 'nar', `${id}.mp3`)))
  const total = durs.reduce((a, d) => a + d + PAD, 0) + LEAD
  // Audio: narrations back to back with PAD gaps.
  const aIn = ids.flatMap((id) => ['-i', join(V, 'nar', `${id}.mp3`)])
  const aChain = ids.map((_, i) => `[${i}:a]aresample=48000,apad=pad_dur=${PAD}[a${i}]`).join(';')
  const aCat = ids.map((_, i) => `[a${i}]`).join('') + `concat=n=${ids.length}:v=0:a=1,adelay=${LEAD * 1000}|${LEAD * 1000},apad,atrim=0:${total.toFixed(3)}[aout]`
  ff([...aIn, '-filter_complex', `${aChain};${aCat}`, '-map', '[aout]', '-c:a', 'pcm_s16le', join(V, 'build', `${name}.wav`)])

  // Subtitles (ASS) for this scene.
  let t = LEAD
  const events = []
  ids.forEach((id, i) => {
    for (const [a, b, txt] of cues(nar[id], t, durs[i])) events.push(`Dialogue: 0,${assTime(a)},${assTime(b)},K,,0,0,0,,${txt}`)
    t += durs[i] + PAD
  })
  const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: K,Apple SD Gothic Neo,46,&H00FFFFFF,&H00FFFFFF,&H00000000,&H9A05070B,1,0,0,0,100,100,0,0,3,14,0,2,120,120,54,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join('\n')}
`
  const assFile = join(V, 'build', `${name}.ass`)
  writeFileSync(assFile, ass)

  const fade = `fade=t=in:st=0:d=0.35,fade=t=out:st=${(total - 0.35).toFixed(2)}:d=0.35`
  const subs = `subtitles=${assFile.replace(/:/g, '\\:')}:fontsdir=/System/Library/Fonts`
  const out = join(V, 'build', `${name}.mp4`)
  if (src.image) {
    const frames = Math.round(total * 30)
    ff([
      '-loop', '1', '-framerate', '30', '-t', total.toFixed(3), '-i', src.image, '-i', join(V, 'build', `${name}.wav`),
      '-filter_complex',
      `[0:v]scale=1760:-2,pad=1920:1080:(ow-iw)/2:(oh-ih)/2-40:color=${src.bg},scale=3840:-2,zoompan=z='1+0.035*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,${subs},${fade},format=yuv420p[v]`,
      '-map', '[v]', '-map', '1:a', '-t', total.toFixed(3), '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'aac', '-b:a', '160k', out,
    ])
  } else {
    ff([
      '-i', join(V, src.webm), '-i', join(V, 'build', `${name}.wav`),
      '-filter_complex', `[0:v]fps=30,scale=1920:1080,tpad=stop_mode=clone:stop_duration=5,${subs},${fade},format=yuv420p[v]`,
      '-map', '[v]', '-map', '1:a', '-t', total.toFixed(3), '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'aac', '-b:a', '160k', out,
    ])
  }
  list.push(`file '${out}'`)
  console.log('scene', name, total.toFixed(1) + 's')
}
writeFileSync(join(V, 'build', 'list.txt'), list.join('\n'))
const final = join(V, '깨움_KKAEUM_시연영상.mp4')
ff(['-f', 'concat', '-safe', '0', '-i', join(V, 'build', 'list.txt'), '-c', 'copy', '-movflags', '+faststart', final])
console.log('done', final, seconds(final).toFixed(1) + 's')
