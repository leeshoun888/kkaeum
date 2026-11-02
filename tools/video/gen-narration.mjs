// Renders the demo-video narration with OpenAI TTS (one mp3 per scene).
// Usage: OPENAI_API_KEY=... node tools/video/gen-narration.mjs <outDir>
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = process.argv[2] ?? join(here, 'out')
const key = process.env.OPENAI_API_KEY
if (!key) throw new Error('OPENAI_API_KEY is not set')

const scenes = JSON.parse(await readFile(join(here, 'narration.json'), 'utf8'))
await mkdir(out, { recursive: true })
for (const s of scenes) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'marin',
      input: s.text,
      instructions: '차분하고 신뢰감 있는 한국어 다큐멘터리 내레이터. 또렷한 발음, 문장 사이 짧은 호흡, 과장 없이 따뜻하게.',
      response_format: 'mp3',
    }),
  })
  if (!res.ok) throw new Error(`${s.id}: ${res.status} ${await res.text()}`)
  await writeFile(join(out, `${s.id}.mp3`), Buffer.from(await res.arrayBuffer()))
  console.log('ok', s.id)
}
