// Pre-renders the copilot's fixed voice prompts with OpenAI TTS so the in-car app
// speaks with a natural voice even offline. Usage: OPENAI_API_KEY=... node tools/gen-voice.mjs
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

export const LINES = {
  welcome: '안녕하세요, 깨움이에요. 오늘 이동 내내 졸음 신호를 살피다가, 필요할 때 먼저 깨워 드릴게요.',
  air_fresh: '실내 이산화탄소가 높아졌어요. 바깥 공기로 환기할게요.',
  pm_pulse: '바깥 미세먼지가 나빠서, 짧게 나눠서 환기할게요.',
  refresh: '조금 피곤하실 시간이에요. 실내를 시원하고 밝게 바꿔 드릴게요.',
  plan_offer: '졸음이 오기 전에 쉬어 가는 게 좋겠어요. 화면의 쉼터를 경유지로 추가할까요?',
  plan_accept: '경유지로 추가했어요. 도착하면 짧은 휴식을 도와 드릴게요.',
  engage: '잠깐 저랑 퀴즈 하나 해요. 지금 지나는 지역에 관한 문제예요.',
  probe: '띵 소리가 들리면, 바로 네 라고 대답해 주세요.',
  rest_now: '졸음 위험 신호가 이어지고 있어요. 다음 쉼터에서 꼭 쉬어 가세요.',
  critical: '위험합니다. 지금 바로 안전한 곳에 차를 세워 주세요.',
  nap_offer: '주차가 확인됐어요. 이십 분 파워냅을 준비해 드릴까요?',
  nap_start: '편히 쉬세요. 이십 분 뒤에 빛과 바람으로 부드럽게 깨워 드릴게요.',
  nap_wake: '잘 쉬셨어요? 천천히 기지개를 켜고, 물 한 잔 드신 뒤 출발하세요.',
  ready: '반응속도가 회복됐어요. 이제 출발하셔도 좋아요.',
  calm: '컨디션이 좋아졌네요. 실내를 평소대로 돌려 놓을게요.',
}

const out = new URL('../web/public/voice/', import.meta.url)
await mkdir(out, { recursive: true })
for (const [key, text] of Object.entries(LINES)) {
  const file = new URL(`${key}.mp3`, out)
  if (existsSync(file)) continue
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'marin',
      input: text,
      instructions: '차량 안에서 운전자에게 말하는 따뜻하고 또렷한 한국어 코파일럿. 차분하지만 활기 있게, 문장 끝을 흐리지 말고 자연스러운 속도로.',
      response_format: 'mp3',
    }),
  })
  if (!r.ok) { console.error(key, r.status, await r.text()); continue }
  await writeFile(file, Buffer.from(await r.arrayBuffer()))
  console.log('ok', key)
}
