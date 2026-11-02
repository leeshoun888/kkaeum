// Records each demo-video scene from the running web app (vite on 127.0.0.1:5173) with
// headless Chrome screencasts. Scene lengths follow the narration mp3 durations.
// Usage: PATH=<dir with ffmpeg>:$PATH node tools/video/record.cjs <videoDir> [scene...]
const puppeteer = require('puppeteer-core')
const { execFileSync } = require('node:child_process')
const path = require('node:path')

const OUT = process.argv[2]
const only = process.argv.slice(3)
const BASE = 'http://127.0.0.1:5173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// ffmpeg -i prints "Duration: hh:mm:ss.xx" on stderr; that is enough for our needs.
function narration(id) {
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-i', path.join(OUT, 'nar', `${id}.mp3`)], { stdio: 'pipe' })
  } catch (e) {
    const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(e.stderr.toString())
    if (m) return (+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1000
  }
  throw new Error('no narration for ' + id)
}

async function smoothScrollTo(page, selector, ms) {
  await page.evaluate(
    (sel, ms) =>
      new Promise((res) => {
        const el = document.querySelector(sel)
        const y0 = window.scrollY
        const y1 = el ? el.getBoundingClientRect().top + y0 - 40 : y0
        const t0 = performance.now()
        const step = (now) => {
          const k = Math.min(1, (now - t0) / ms)
          const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
          window.scrollTo(0, y0 + (y1 - y0) * e)
          k < 1 ? requestAnimationFrame(step) : res()
        }
        requestAnimationFrame(step)
      }),
    selector,
    ms,
  )
}

const SCENES = {
  // Landing hero, then a gentle drift down.
  async s1_hero(page, ms) {
    await page.goto(BASE + '#/', { waitUntil: 'networkidle2' })
    await sleep(2500)
    return async () => {
      await sleep(ms * 0.75)
      await page.evaluate(() => window.scrollTo({ top: 260, behavior: 'smooth' }))
      await sleep(ms * 0.25)
    }
  },
  async s2_data(page, ms) {
    await page.goto(BASE + '#/', { waitUntil: 'networkidle2' })
    await page.evaluate(() => document.querySelector('#data')?.scrollIntoView())
    await sleep(1500)
    await page.evaluate(() => window.scrollTo(0, 0))
    await sleep(800)
    return async () => {
      await smoothScrollTo(page, '#data', 2200)
      await sleep(ms * 0.45)
      await page.evaluate(() => window.scrollBy({ top: 520, behavior: 'smooth' }))
      await sleep(ms * 0.55 - 2200)
    }
  },
  // s3 (paused overview) + s4 + s5 (playing) are one continuous take.
  async console_drive(page, ms, parts) {
    await page.goto(BASE + '#/console?scenario=chuseok-night&speed=60', { waitUntil: 'networkidle2' })
    await sleep(4000)
    return async () => {
      await sleep(parts[0])
      await page.click('.tb-ctrl .play')
      await sleep(parts[1] + parts[2])
    }
  },
  async s6_nap(page, ms) {
    await page.goto(BASE + '#/console?scenario=chuseok-night&skip=66&speed=110', { waitUntil: 'networkidle2' })
    await sleep(4000)
    return async () => {
      await page.click('.tb-ctrl .play')
      await sleep(ms)
    }
  },
  // Fallback for the APK scene when no emulator footage is available: the Pleos SDK section.
  async s9_sdk(page, ms) {
    await page.goto(BASE + '#/', { waitUntil: 'networkidle2' })
    await page.evaluate(() => document.querySelector('#sdk')?.scrollIntoView())
    await sleep(2500)
    return async () => {
      await sleep(ms * 0.5)
      await page.evaluate(() => window.scrollBy({ top: 480, behavior: 'smooth' }))
      await sleep(ms * 0.5)
    }
  },
  async s8_fleet(page, ms) {
    await page.goto(BASE + '#/fleet', { waitUntil: 'networkidle2' })
    await page.waitForFunction(() => document.querySelectorAll('.fl-list-row, .fl-row, tbody tr').length >= 10 || document.body.innerText.includes('24대'), { timeout: 120000 }).catch(() => {})
    await sleep(6000)
    return async () => {
      await sleep(ms * 0.55)
      await page.evaluate(() => window.scrollBy({ top: 420, behavior: 'smooth' }))
      await sleep(ms * 0.45)
    }
  },
}

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    userDataDir: '/Volumes/Transcend/devtools/tmp/chrome-rec',
    args: [...(process.env.GL === 'sw' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']), '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
  })
  const plan = [
    ['s1_hero', ['s1_hero']],
    ['s2_data', ['s2_data']],
    ['console_drive', ['s3_console', 's4_intervene', 's5_waypoint']],
    ['s6_nap', ['s6_nap']],
    ['s8_fleet', ['s8_fleet']],
    ['s9_sdk', ['s9_apk']],
  ]
  for (const [scene, nars] of plan) {
    if (only.length && !only.includes(scene)) continue
    const parts = nars.map((n) => narration(n) + 600)
    const total = parts.reduce((a, b) => a + b, 0)
    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    const run = await SCENES[scene](page, total, parts)
    const rec = await page.screencast({ path: path.join(OUT, 'raw', `${scene}.webm`) })
    await run()
    await rec.stop()
    await page.close()
    console.log('recorded', scene, Math.round(total / 1000) + 's')
  }
  await browser.close()
})()
