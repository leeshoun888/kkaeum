// Builds the offline route-aware engagement pack (quiz + local story) for each region
// along the Gyeongbu Expressway using an OpenAI model with a strict JSON schema.
import { writeFile } from 'node:fs/promises'

const REGIONS = [
  { id: 'seoul', name: '서울 강남·서초', fromKm: 0, toKm: 18 },
  { id: 'seongnam', name: '성남·용인(수지·기흥)', fromKm: 18, toKm: 45 },
  { id: 'osan', name: '오산·평택·안성', fromKm: 45, toKm: 85 },
  { id: 'cheonan', name: '천안', fromKm: 85, toKm: 112 },
  { id: 'cheongju', name: '청주·세종(오송)', fromKm: 112, toKm: 140 },
  { id: 'daejeon', name: '대전', fromKm: 140, toKm: 165 },
  { id: 'okcheon', name: '옥천·영동', fromKm: 165, toKm: 215 },
  { id: 'gimcheon', name: '추풍령·김천', fromKm: 215, toKm: 250 },
  { id: 'gumi', name: '구미·칠곡', fromKm: 250, toKm: 285 },
  { id: 'daegu', name: '대구·경산', fromKm: 285, toKm: 315 },
  { id: 'yeongcheon', name: '영천·경주', fromKm: 315, toKm: 355 },
  { id: 'yangsan', name: '양산·부산', fromKm: 355, toKm: 395 },
]

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['regions'],
  properties: {
    regions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'story', 'quizzes'],
        properties: {
          id: { type: 'string' },
          story: { type: 'string', description: '운전자에게 들려줄 30초 분량 지역 이야기(2~3문장, 구어체)' },
          quizzes: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['q', 'choices', 'answer', 'explain'],
              properties: {
                q: { type: 'string', description: '음성으로 듣고 바로 답할 수 있는 짧은 질문' },
                choices: { type: 'array', items: { type: 'string' }, description: '정확히 2개의 짧은 보기' },
                answer: { type: 'integer', description: '정답 보기 번호 (1 또는 2)' },
                explain: { type: 'string', description: '정답 해설 한 문장' },
              },
            },
          },
        },
      },
    },
  },
}

const r = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-5.5',
    reasoning: { effort: 'medium' },
    input: [
      {
        role: 'system',
        content:
          '너는 운전 중 졸음을 깨우는 차량 AI 코파일럿의 콘텐츠 작가다. 운전자의 인지 각성을 높이되 시선을 빼앗지 않는, 귀로만 듣고 답하는 퀴즈를 만든다. 사실관계가 확실한 내용만 쓴다(불확실하면 쓰지 마라). 보기는 정확히 2개, 각 10자 이내. 질문은 40자 이내. 존댓말.',
      },
      {
        role: 'user',
        content: `경부고속도로를 따라 서울→부산으로 가는 운전자를 위해 각 지역별로 story 1개와 quizzes 3개를 만들어라. 지역 목록: ${JSON.stringify(REGIONS.map(({ id, name }) => ({ id, name })))}`,
      },
    ],
    text: { format: { type: 'json_schema', name: 'route_pack', schema, strict: true } },
  }),
})
const j = await r.json()
if (!r.ok) { console.error(JSON.stringify(j).slice(0, 800)); process.exit(1) }
const text = j.output.find((o) => o.type === 'message').content[0].text
const data = JSON.parse(text)
const merged = REGIONS.map((reg) => ({ ...reg, ...(data.regions.find((x) => x.id === reg.id) ?? { story: '', quizzes: [] }) }))
await writeFile(new URL('../web/src/data/routePack.json', import.meta.url), JSON.stringify(merged, null, 1))
console.log('regions', merged.length, 'quizzes', merged.reduce((a, b) => a + b.quizzes.length, 0))
