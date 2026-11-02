# Fills the organizer's official application form (접수양식 = 기획서) with the KKAEUM proposal.
# Keeps the form's own layout: content is written into the eight answer boxes (tables 1–8).
# Usage: python3 docs/build_proposal.py  → docs/깨움_KKAEUM_접수양식_기획서.docx
import copy
import os
import sys

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

HERE = os.path.dirname(os.path.abspath(__file__))
FORM = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'research', 'consent.docx')
OUT = os.path.join(HERE, '깨움_KKAEUM_접수양식_기획서.docx')
IMG = os.path.join(HERE, 'img')

REPO = 'https://github.com/leeshoun888/kkaeum'
DEMO = 'https://leeshoun888.github.io/kkaeum/'

TEAL = RGBColor(0x00, 0x8F, 0x7A)
INK = RGBColor(0x14, 0x1A, 0x24)
GREY = RGBColor(0x5F, 0x6B, 0x7A)
FONT = '맑은 고딕'


def set_cell_bg(cell, hex_):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_)
    tcPr.append(shd)


def style_run(r, size=9.5, bold=False, color=INK, italic=False):
    r.font.name = FONT
    r._element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.italic = italic
    r.font.color.rgb = color


class Box:
    """Writes rich content into one answer cell."""

    def __init__(self, cell):
        self.cell = cell
        for p in list(cell.paragraphs):
            p._element.getparent().remove(p._element)
        self.first = True

    def _p(self, space_before=2, space_after=2):
        p = self.cell.add_paragraph()
        pf = p.paragraph_format
        pf.space_before = Pt(space_before)
        pf.space_after = Pt(space_after)
        pf.line_spacing = 1.18
        return p

    def rich(self, p, text, size=9.5, color=INK, bold=False):
        # **bold** markup inside a line
        parts = text.split('**')
        for i, part in enumerate(parts):
            if part:
                style_run(p.add_run(part), size=size, bold=bold or i % 2 == 1, color=color)

    def h(self, text):
        p = self._p(8 if not self.first else 2, 3)
        self.first = False
        style_run(p.add_run('■ '), size=10.5, bold=True, color=TEAL)
        style_run(p.add_run(text), size=10.5, bold=True, color=INK)

    def para(self, text, size=9.5, color=INK):
        self.first = False
        self.rich(self._p(), text, size=size, color=color)

    def lead(self, text):
        self.first = False
        p = self._p(2, 6)
        self.rich(p, text, size=11, color=INK, bold=True)

    def bullets(self, items, size=9.3):
        for it in items:
            p = self._p(1, 1)
            p.paragraph_format.left_indent = Cm(0.45)
            p.paragraph_format.first_line_indent = Cm(-0.3)
            style_run(p.add_run('• '), size=size, color=TEAL, bold=True)
            self.rich(p, it, size=size)

    def note(self, text):
        self.para(text, size=7.8, color=GREY)

    def table(self, header, rows, widths=None, size=8.3):
        self.first = False
        t = self.cell.add_table(rows=1, cols=len(header))
        t.style = 'Table Grid'
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for i, htext in enumerate(header):
            c = t.rows[0].cells[i]
            set_cell_bg(c, '0F2A33')
            c.paragraphs[0].text = ''
            style_run(c.paragraphs[0].add_run(htext), size=size, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF))
        for ri, row in enumerate(rows):
            cells = t.add_row().cells
            for i, v in enumerate(row):
                cells[i].paragraphs[0].text = ''
                self.rich(cells[i].paragraphs[0], str(v), size=size)
                if ri % 2:
                    set_cell_bg(cells[i], 'F2F7F8')
        if widths:
            for row in t.rows:
                for i, w in enumerate(widths):
                    row.cells[i].width = Cm(w)
        self._p(0, 2)

    def image(self, name, width_cm=15.5, caption=None):
        path = os.path.join(IMG, name)
        if not os.path.exists(path):
            self.note(f'[이미지 누락: {name}]')
            return
        p = self._p(4, 2)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(path, width=Cm(width_cm))
        if caption:
            c = self._p(0, 6)
            c.alignment = WD_ALIGN_PARAGRAPH.CENTER
            style_run(c.add_run(caption), size=7.8, color=GREY, italic=True)


def fill_line(doc, label, value):
    """Fill '앱명 / 프로젝트명: ____' style lines."""
    for p in doc.paragraphs:
        if p.text.strip().startswith(label) and '_' in p.text:
            for r in p.runs:
                r.text = ''
            run = p.runs[0] if p.runs else p.add_run()
            run.text = f'{label} {value}'
            style_run(run, size=10, bold=True)


def main():
    doc = Document(FORM)
    fill_line(doc, '앱명 / 프로젝트명:', '깨움 (KKAEUM): 졸음이 오기 전에, 차가 먼저 깨운다')
    boxes = [Box(doc.tables[i].rows[0].cells[0]) for i in range(1, 9)]

    # 1. 한 줄 소개 ───────────────────────────────────────────────
    b = boxes[0]
    b.lead('차량 데이터로 졸음을 “예측”하고, 공조·조명·시트·내비게이션을 직접 움직여 졸음이 오기 전에 운전자를 깨우는 Pleos Connect 졸음운전 예방 코파일럿')
    b.para('경고만 하던 졸음운전 대응을 **예측(Predict) → 개입(Intervene) → 회복(Recover)** 의 닫힌 고리로 바꿉니다. 스마트폰은 할 수 없고, 차량만 할 수 있는 방식으로.')

    # 2. 기획 배경 ────────────────────────────────────────────────
    b = boxes[1]
    b.h('문제: 고속도로 사망의 70%가 “졸음·주시태만”, 그런데 차는 아직 “경고”만 한다')
    b.bullets([
        '2026년 상반기 고속도로 사망자 95명 중 **졸음·주시태만 68명(71.6%)**, 3년 평균 대비 +47.8% 증가 (한국도로공사, 2026.07).',
        '졸음운전 사고 100건당 사망 **2.9명, 음주운전(1.5명)의 약 2배**, 고속도로에서는 8.3명 (경찰청 2019–2023).',
        '사업용 차량이 더 위험: 10만 대당 졸음사고 승합 11.2·화물 10.6건 vs 승용 7.8건, 화물차 사망사고 원인의 76%가 졸음·주시태만 (경찰청 / 한국도로공사 2023–2025).',
    ])
    b.h('우리가 직접 분석한 공공데이터: 한국도로공사 고속도로 졸음운전 사고 원자료 694건 (2023–2025)')
    b.image('accident_hours.png', 15.0, '그림 1. 시간대별 졸음운전 사고: 새벽(04~06시)과 이른 오후(13~15시) 두 개의 정점 = 인간 생체리듬의 두 저점')
    b.bullets([
        '**100건당 사망자 10.1명(2023) → 12.5명(2024) → 17.8명(2025)**: 고속도로 졸음사고는 해마다 더 치명적이 되고 있음.',
        '사고의 **32%가 교통량이 가장 적은 00~06시**에 집중, 오후 13~15시에 두 번째 정점 → “시각(생체리듬)”만으로도 위험을 미리 알 수 있음.',
        '노선별 **경부선 102건으로 최다** → 본 기획의 대표 시나리오(서울→부산 경부고속도로)로 채택.',
    ])
    b.h('놓치고 있던 원인: 닫힌 차 안의 공기')
    b.bullets([
        '창문을 닫고 내기순환만 쓰면 실내 CO₂가 **약 30분 만에 600 → 5,000ppm**, 2,000ppm 이상에서 졸음·두통·집중력 저하 (한국도로공사, 2026.07).',
        '1,000ppm에서도 의사결정 능력 9개 척도 중 6개가 유의하게 하락 (Satish et al., EHP 2012). 3인 이상 탑승 내기순환 시 15분 안에 2,500ppm 초과 (Deng et al., Sensors 2020).',
        '27℃ 실내는 21℃보다 신호 놓침 50%↑, 반응시간 22%↑ (Wyon et al., Ergonomics 1996). 운전자의 “졸림”의 일부는 **차가 만든 것**.',
    ])
    b.h('기존 해법의 한계 (Pain Points)')
    b.table(
        ['구분', '현재', '한계'],
        [
            ['차량 기본 DAW(운전자 주의 경고)', '카메라·조향 패턴으로 주의 저하 감지 → 휴식 권유 문구·경고음 (기아 MV1 매뉴얼)', '주의가 이미 떨어진 “뒤”에 경고, 원인(공기·온도)은 그대로, 내비 경유지 연결 없음'],
            ['CO₂ 자동 환기 (사양 적용 차량)', '실내 CO₂ 증가 시 외기 자동 유입 (현대 인포테인먼트 매뉴얼 · 2014 제네시스 최초, 2,000ppm 기준)', '센서 장착 차량에서 임계값 “반응형”, 졸음 예측·휴식 계획과 연결되지 않음, Pleos SDK로 CO₂ 값 미제공'],
            ['졸음쉼터 인프라', '고속도로 253개소, 설치 구간 사고 47%↓(국토부 2014)', '2012년 68개 → 최근 연 10개 미만 신설: 물리 인프라 확충은 한계, “제때 들르게” 하는 것이 관건'],
            ['스마트폰 앱', '운전점수·졸음 알림', '차량 공조·조명·시트를 움직일 수 없고, 주행 중 조작 불가'],
            ['법인차·렌터카 플릿', '렌터카 약 101만 대(2020.7, 렌터카연합회), 출장·영업 장거리 운행', '휴식은 운전자 자율, 관리자는 운행 중 졸음 위험을 실시간으로 알 수 없음'],
        ],
        widths=[3.2, 5.6, 7.2],
    )
    b.para('**핵심 니즈**: 운전자는 “졸리기 전에” 알고 싶고, 졸릴 때 손을 쓰지 않고 해결되길 원한다. 동승 가족은 운전자가 무리하지 않길 원하고, 법인·렌터카 플릿 운영사는 안전정책 준수와 사고 예방을 데이터로 증명하고 싶다.')

    # 3. 주요 기능 및 차량 특화 요소 ───────────────────────────────
    b = boxes[2]
    b.image('console.png', 15.8, '그림 2. 깨움 Mission Control: Pleos Connect-S 헤드유닛 안의 실제 앱, 예측 졸음 리본 지도, 3D 캐빈 디지털트윈, 설명가능 졸음모델, 실시간 Pleos SDK 호출 트레이스')
    b.h('① 졸음 예측 엔진: “지금 졸린가”가 아니라 “언제 졸려질까”')
    b.bullets([
        '수면과학 표준인 **3-Process 각성 모델(Åkerstedt & Folkard)**로 기상 시각·수면시간·생체리듬을 계산하고, 이를 **KSS(카롤린스카 졸음척도 1–9)**로 환산.',
        '여기에 차량 신호를 결합: 연속 운전시간(Odometer), 도로 단조로움(크루즈·조향·방향지시등), 실내 CO₂, 실내 온도, 차량 주의경고(DRIVER_ATTENTION 텔테일), 음성 반응속도.',
        '각 요인이 졸음지수에 몇 점을 더했는지 **설명 가능한 형태(Explainable)**로 보여주고, 현재 추세로 **KSS 7(위험) 도달 시각을 예측**.',
    ])
    b.h('② 캐빈 CO₂ 디지털트윈: 센서 없이 차 안 공기를 “계산”')
    b.bullets([
        '질량수지 물리모델 dC/dt = N·G/V − λ(C − C_out). 실내 3.1m³, 1인 0.28L/min, 내기순환 공기교환율 λ = 0.060×mph − 0.88 등 **현대 엘란트라 실측 계수(Deng 2020)** 사용 → 공조 상태(HVAC)·탑승 인원(Seat 착좌)·속도만으로 CO₂ 추정.',
        'CO₂ 1,200ppm 초과 시 자동 **외기 전환**. 바깥 미세먼지가 나쁘면 CO₂와 미세먼지 유입을 동시에 최소화하는 **듀티사이클 펄스 환기**로 최적화.',
        '**왜 추정인가**: 일부 차량에 CO₂ 자동 환기(센서)가 있지만 Pleos Vehicle SDK 2.3.2는 CO₂·공기질 값을 3rd-party 앱에 제공하지 않음(공조 상태·자동 내기 상태만 제공). 깨움은 센서 유무와 무관하게 모든 Pleos 차량에서 동작하고, 차량 기능보다 **낮은 기준(1,200ppm)에서 졸음 예측과 결합해 먼저** 움직임.',
    ])
    b.h('기존 차량 기능과의 관계: 대체가 아니라 “그 위의 예측·오케스트레이션 계층”')
    b.image('positioning.png', 15.8, '그림 3. DAW·CO₂ 자동 환기는 임계값을 넘은 “뒤” 반응. 깨움은 그 신호를 입력으로 받아 넘기 “전에” 공조·조명·시트·내비를 한 흐름으로 움직임 (새 센서·하드웨어 불필요)')
    b.h('③ 단계별 개입(L0–L4): 운전 조작에는 절대 개입하지 않고, “캐빈”으로 깨운다')
    b.table(
        ['단계', '조건', '차량이 하는 일 (Pleos SDK)'],
        [
            ['L1 리프레시', 'KSS ≥ 5', '설정온도 −1.5℃, 송풍 +1, 앰비언트 청백색 (HVAC·Light)'],
            ['L2 인게이지', 'KSS ≥ 6', '통풍시트, 경로 기반 각성 퀴즈·대화, 음성 반응속도 측정 (Seat·TTS·STT)'],
            ['L3 휴식', 'KSS ≥ 7 / 반응지연 / 차량 주의경고', '앰버 조명, 휴식 권고, 쉼터 경유지 추가 (Light·NaviHelper)'],
            ['L4 위험', 'KSS ≥ 8', '반복 음성 경고, 즉시 정차 권고'],
        ],
        widths=[2.6, 4.2, 9.2],
    )
    b.h('④ 예측 휴식 플래너: “졸리기 전에 도착할 수 있는 마지막 쉼터”')
    b.bullets([
        '공공데이터 **전국 졸음쉼터 253개소 + 고속도로 휴게소**를 경로에 정합하고, 졸음 예측 곡선과 교차해 **위험 도달 전에 도착 가능한 가장 먼 쉼터**를 선택(법인·렌터카 플릿은 회사 휴식정책: 예: 2시간마다 15분: 도 제약조건으로 반영).',
        '운전자가 “응” 하면 **NaviHelper.addWaypoint()**로 현재 경로에 바로 경유지 추가, 화면 조작 0회.',
    ])
    b.h('⑤ 차가 침실이 된다: 파워냅 모드 (정차 맥락)')
    b.bullets([
        'P단·주차브레이크 확인 시 10/15/20분 파워냅: 시트 등받이 젖힘, 22.5℃·저소음 송풍·외기(수면 중 CO₂ 축적 방지), 저조도 웜톤 조명.',
        '타이머 종료 시 빛·바람·소리를 단계적으로 높이는 **기상 시퀀스** + 출발 전 반응속도 재측정. 근거: 15분 미만 낮잠+카페인 150mg 병행 시 운전 사고(incident)가 위약 대비 9% 수준, 휴식만으로는 효과 미미(Reyner & Horne 1997) → 쉼터 도착 시 “커피 한 잔 후 15분 파워냅”을 안내.',
    ])
    b.h('⑥ 말로 하는 코파일럿 & Gleo 연동')
    b.bullets([
        '“좀 졸린데” 한마디에 상태 조회 → 환기·온도·통풍 조절 → 쉼터 경유지 제안까지 수행하는 **음성 에이전트(함수 호출 기반)**. 각성 퀴즈는 지나는 지역 이야기로 구성(오프라인 콘텐츠 팩 내장).',
        '**Gleo Interface(schema.json)**에 “내 졸음 상태 알려줘”, “가까운 졸음쉼터 들르자”, “파워냅 시작” 3개 기능을 등록해 차량 기본 AI 비서에서도 호출.',
    ])
    b.h('차량 특화성: 모바일 대비 우위')
    b.table(
        ['', '스마트폰 앱', '깨움 (차량 앱)'],
        [
            ['졸음 원인 제거', '불가', '공조·외기·온도·통풍시트·조명 직접 제어'],
            ['입력 신호', 'GPS·가속도 추정', '차량 주의경고, 조향, 크루즈, 기어, 착좌, 공조상태, 주행시간'],
            ['쉼터 안내', '앱 전환·수동 검색', '내비 경로에 경유지 즉시 추가'],
            ['정차 휴식', '알람 정도', '시트·공조·조명이 함께 움직이는 파워냅'],
            ['주행 중 사용', '조작 위험', '음성 우선, Pleos 주의분산 가이드라인 준수 UI'],
        ],
        widths=[3.0, 4.6, 8.4],
    )

    # 4. 주요 사용 시나리오 ────────────────────────────────────────
    b = boxes[3]
    b.h('시나리오 A: 추석 귀성길, 금요일 밤 22:30 서울 → 부산 (가족 4인)')
    b.para('운전자 40대 직장인. 06:30 기상, 6시간 수면. 미세먼지 때문에 내기순환을 켠 채 출발. (아래 시각은 앱 시뮬레이터 실측 결과)')
    b.table(
        ['시각', '상황', '깨움의 동작'],
        [
            ['22:30', '출발. 기상 후 16시간 경과, KSS 5.3', '“오늘 이동 내내 살피다가 먼저 깨워 드릴게요.” 예측: 약 2시간 뒤 위험 도달'],
            ['22:31', '4인 내기순환으로 CO₂ 급상승', '외기 유입 전환 + 송풍 3단 (HVAC). 음성 안내 1문장'],
            ['22:46', '예측 플래너 실행', '“졸음이 오기 전에 쉬어 가요. 망향휴게소를 경유지로 추가할까요?” → “응” → NaviHelper 경유지 추가'],
            ['23:0x', 'KSS 6 진입 (졸음 신호)', '통풍시트·서늘한 공기·청백색 조명, “천안 지나는 중인데 퀴즈 하나!” + 음성 반응속도 측정'],
            ['23:25', '휴게소 도착, P단', '20분 파워냅: 등받이 젖힘, 22.5℃, 웜톤 조명 → 기상 시퀀스 → 반응속도 재측정 후 출발'],
            ['00:00~', '새벽 생체리듬 저점 진입', '같은 고리 반복, 위험 단계(L3) 진입 전 휴식 3~4회로 부산 도착'],
        ],
        widths=[1.5, 5.0, 9.5],
    )
    b.para('**결과**: 시뮬레이션에서 깨움이 개입할 때는 KSS 7(위험)에 **한 번도 도달하지 않고** 도착. 동승 가족은 화면의 “다음 휴식” 카드와 음성으로 상황을 함께 공유.')
    b.h('시나리오 B: 점심 직후 1인 출장 복귀 (13:10, 히터 25℃, 미세먼지 나쁨)')
    b.bullets([
        '식후 저각성 구간을 미리 반영해 출발 직후부터 위험 예측. 미세먼지 때문에 상시 외기 대신 **펄스 환기**로 CO₂ 관리.',
        '25℃ 히터 → 단계적으로 온도를 낮추고, 오후 정점(14~15시) 전에 휴게소 1회 + 파워냅 제안.',
    ])
    b.h('시나리오 C: 법인 영업직 새벽 03:40 부산 출장 (B2B 플릿)')
    b.bullets([
        '회사 안전정책(**2시간 연속운전마다 15분 휴식**)을 계획 제약으로 사용해 정책 안에서 가장 효율적인 쉼터를 제안.',
        '플릿 관리자는 **Fleet 콘솔**에서 차량별 졸음지수·연속운전시간·휴식 이행을 실시간 확인하고, 위험 차량에 휴식 경유지를 원격 전송.',
    ])
    b.image('car.png', 12.5, '그림 4. 차량 앱 화면 (Connect-S 가로 창 1700×1212dp): 각성 게이지, 예측 기반 휴식 제안, CO₂ 디지털트윈, 깨움이 한 일')

    # 5. 개발 계획 ───────────────────────────────────────────────
    b = boxes[4]
    b.h('구현 현황: 기획서 단계가 아닌, 동작하는 소프트웨어')
    b.bullets([
        f'**GitHub 저장소(소스 + release APK)**: {REPO}',
        f'**웹 라이브 데모 (Mission Control · 차량앱 · Fleet 콘솔)**: {DEMO}',
        'Android(Pleos Connect, AAOS) 앱: Kotlin 호스트 + 실제 Pleos SDK(Vehicle 2.3.2 · NaviHelper 3.0.5 · TextToSpeech/SpeechToText 3.3.1 · FusedLocation 1.1.3) 연동 브릿지 구현.',
    ])
    b.h('아키텍처: 하나의 엔진, 세 개의 화면')
    b.image('architecture.png', 15.8, '그림 5. 시스템 구성: 졸음 엔진(TypeScript)은 차량 앱(WebView)·웹 콘솔·Fleet에서 동일 코드로 동작하고, Kotlin 브릿지가 Pleos SDK를 호출')
    b.bullets([
        'UI·엔진: React + TypeScript 단일 코드베이스를 APK에 번들(WebViewAssetLoader, HTTPS 가상 오리진, 원격 디버깅 비활성: Pleos WebView 보안 가이드 준수).',
        '네이티브: Kotlin `KkaeumNative` 브릿지: 차량 신호를 1Hz로 엔진에 전달, 엔진의 개입 명령을 SDK 호출로 변환하고 모든 호출을 **SDK Call Trace**로 기록.',
        '개인정보: 졸음 추론은 **전부 온디바이스**. 음성 원본·위치는 서버로 보내지 않음(선택 기능인 AI 리포트만 요약 수치 전송).',
    ])
    b.h('Pleos Connect SDK / API 사용 계획')
    b.table(
        ['SDK / API', '사용 API (실제 시그니처)', '용도'],
        [
            ['Vehicle · HVAC', 'setHvacRecirculation, setHvacTemperature, setHvacFanSpeed, registerHvacRecirculation', 'CO₂ 트윈 입력, 외기 전환·온도·송풍 개입'],
            ['Vehicle · Light', 'setAmbientLightSwitch / Brightness / BrightnessColor', '각성(청백)·경고(앰버)·수면(웜톤)·기상 조명'],
            ['Vehicle · Seat', 'setHvacSeatVentilation, moveSeatBackrestAngle(MoveControl), 착좌 조회', '통풍 개입, 파워냅 리클라인, 탑승 인원'],
            ['Vehicle · Safety', 'getTelltalesInfo() → DRIVER_ATTENTION, PARKING_BRAKE', '차량 주의경고 융합, 정차 확인'],
            ['Vehicle · SteeringWheel / Odometer / Window', 'registerSteeringWheelAngle, 트립 주행시간, setWindowPosition', '단조로움 지표, 연속운전, 환기'],
            ['CarPropertyManager (AAOS)', 'PERF_VEHICLE_SPEED, GEAR_SELECTION', '주행/정차 맥락 판단'],
            ['NaviHelper', 'addWaypoint(RequestWaypointInfo(...FIRST)), 목적지 정보 리스너', '예측 쉼터 경유지 추가, 남은 시간'],
            ['TextToSpeech / SpeechToText', 'speak / startListening (onBeginningOfSpeech)', '음성 안내, 퀴즈 응답, 음성 반응속도(PVT) 측정'],
            ['FusedLocation', 'requestLocationUpdates', '경로 진행·지역 콘텐츠'],
            ['Gleo Interface', 'assets/schema.json 3개 함수 + APP_ACTION_RESPONSE', 'Gleo AI 음성비서에서 깨움 기능 호출'],
        ],
        widths=[3.3, 7.4, 5.3],
        size=7.8,
    )
    b.h('플랫폼 정책 준수 & 리스크 대응')
    b.bullets([
        '주의분산: 주행 중 애니메이션·스크롤 없음, 1~2초 내 파악 가능한 정보만, 버튼 96dp 이상, 음성 우선(Pleos “Easy & Safe”). 가로/세로 창 모두 지원, CCP 뒤로가기 시 moveTaskToBack.',
        '권한: 모든 제어 전 checkXxxCapabilities()로 지원 여부 확인 → 미지원·미승인 시 **음성 권고로 자동 대체**(그레이스풀 디그레이드). CONTROL 권한은 App Market과 사전 협의 예정.',
        '안전: 가속·조향·제동 등 주행 조작에는 어떤 개입도 하지 않음. 의료 진단 아님을 명시.',
    ])
    b.h('PT 심사(12/3)까지 일정')
    b.table(
        ['기간', '내용'],
        [
            ['~11/15', '엔진·차량앱·웹콘솔·Fleet·APK 1차 완성 (제출 완료 범위)'],
            ['11/16~11/26', 'Pleos Connect Emulator·Virtual Console 실기 검증, 앰비언트 색상 인코딩·시트 조그 타이밍 보정, Gleo 연동 테스트'],
            ['11/27~12/02', '실주행 데이터로 모델 보정(반응속도·KSS 자가보고), 시연 영상·PT 리허설'],
        ],
        widths=[2.6, 13.4],
    )

    # 6. 기대효과 및 발전 가능성 ───────────────────────────────────
    b = boxes[5]
    b.h('타깃 고객')
    b.table(
        ['세그먼트', '규모(근거)', '핵심 가치'],
        [
            ['장거리·야간·명절 운전자 (B2C)', '자동차 2,651.5만 대(국토부 2025말), 추석 기간 고속도로 일평균 541만 대(2025)', '졸음 전 예측·자동 개입, 가족 안심'],
            ['법인차·렌터카 플릿 (B2B Fleet)', '렌터카 약 101만 대(2020.7, 렌터카연합회). Pleos Connect 첫 탑재 차종 그랜저(2026.5)·아반떼는 법인·렌터카 주력 차종', '휴식정책 자동 준수, 사고·보험 비용 절감'],
            ['보험사 (B2B2C)', '운전점수 연계 보험특약 가입자 약 500만 명(TMAP)', '“졸음 관리 주행” 데이터 기반 UBI 할인'],
            ['Pleos 차량 기본 경험', '2030년 현대·기아·제네시스 약 2,000만 대 탑재 목표', '차량 안전·웰니스 차별화 기능'],
        ],
        widths=[3.6, 7.0, 5.4],
    )
    b.h('사용자·리텐션 목표: 목표치와 근거를 분리 표기')
    b.table(
        ['지표', '2027', '2028', '2030', '산정식 · 근거'],
        [
            ['Pleos 탑재 차량(국내)', '50만', '150만', '400만', '[목표·가정] 2026.5 그랜저 양산 데뷔 → 아반떼 등 확대, 2030 글로벌 2,000만 대 목표(현대차그룹 2026.04)의 국내 비중 가정'],
            ['설치율', '15%', '25%', '30%', '[목표·가정] 안전 카테고리 추천 · 기본앱 제안 시. 벤치마크: 현대차·기아 커넥티드 서비스 글로벌 가입자 1,000만 명 돌파(2023.6)'],
            ['MAU', '6만', '30만', '96만', '[계산] 탑재 대수 × 설치율 × 월 1회 이상 주행 모니터링 80%'],
            ['30일 리텐션', '55%', '60%', '65%', '[목표·가정] 실행 조작 없이 주행 시 자동 동작 → 사용 부담 낮음'],
            ['Fleet 파일럿', '500대', '5,000대', '3만 대', '[목표] 렌터카 약 101만 대(렌터카연합회 2020.7) 중 Pleos 탑재 신차 비중'],
        ],
        widths=[3.0, 1.4, 1.5, 1.5, 8.6],
    )
    b.note('※ [목표·가정]은 공식 수치가 아닌 팀의 사업 목표이며, [계산]은 표 안의 가정으로 산출. 외부 수치는 출처 표기.')
    b.h('가치 산정: 졸음 사고 1건을 막는 것의 의미')
    b.table(
        ['항목', '수치', '출처'],
        [
            ['사망 1명당 평균 사고비용', '5억 3,379만 원 (중상 6,890만 · 경상 520만)', '도로교통공단 2022 기준 (세계일보 2024.02.15)'],
            ['교통사고 사회적 비용', '약 55조 원 (2023, 전년 대비 +23.5%)', '한국교통연구원 (2025.08 보도)'],
            ['고속도로 졸음사고 치사율', '100건당 17.8명 (2025)', '한국도로공사 원자료 694건 팀 직접 분석'],
            ['졸음쉼터 효과', '설치 구간 졸음사고 28%↓ · 사망 55%↓', '국토교통부 (메트로신문 2023.10.01)'],
        ],
        widths=[4.0, 5.6, 6.4],
    )
    b.para('**Fleet 1,000대 기준**: 졸음 사망사고 1건 예방 = 약 5.3억 원의 사고비용 절감. 차량당 월 구독료 대비 명확한 ROI를 플릿 운영사·보험사에 제시.')
    b.h('수익 모델')
    b.bullets([
        'B2C: 기본 기능 무료(안전 기능 보편 제공) + 프리미엄(개인화 생체리듬 학습, 동승자 알림, 상세 리포트) 월 구독.',
        'B2B Fleet SaaS: 차량당 월 과금: 관리자 콘솔, 규정 준수 리포트, 위험 알림 (Pleos Fleet 연계).',
        'B2B2C 보험: 졸음 관리 주행 데이터(동의 기반, 요약 지표만) 제공 → 보험 할인 연계 수수료.',
    ])
    b.h('사회적 효과')
    b.bullets([
        '졸음쉼터는 설치 구간 사고 47% 감소 효과가 있었지만 신규 설치는 한계. **이미 있는 253개 쉼터를 “제때” 쓰게 만드는 소프트웨어 인프라**.',
        '100km/h에서 3초 졸면 약 83m 무인 주행. 위험 도달 “전” 휴식으로 이 3초를 없애는 것이 목표.',
    ])
    b.h('확장 로드맵')
    b.bullets([
        '2026 Q4 PoC(Pleos Connect 에뮬레이터 검증 완료 → 실차) → 2027 Pleos App Market 출시 → 2028 법인·렌터카 Fleet·보험 연동, 기아·제네시스 확대.',
        'DMS 카메라·조향 토크 등 추가 신호 연동 시 정확도 향상 · EU GSR(DDAW 2022~, ADDW 신차 2026.7 의무)과 결합한 글로벌 버전 · 화물·버스(법정 2시간 휴게 의무) 상용 확장 · 택시(택시발전법 근로시간) · 전기차 충전 대기 시간 파워냅 연계.',
    ])

    # 7. 참고자료 ─────────────────────────────────────────────────
    b = boxes[6]
    b.bullets([
        f'GitHub 저장소 (소스 코드 + APK: apk/ 폴더): {REPO}',
        f'웹 라이브 데모: {DEMO}  (#/console Mission Control · #/car 차량 앱 · #/fleet Fleet 콘솔 · #/report 주행 리포트)',
        '시연 영상: 저장소 README 및 docs/ 폴더 참고',
        '사용 공공데이터: 한국도로공사 전국 졸음쉼터 표준데이터(2026.02), 고속도로 졸음운전 사고통계(2023–2025), 휴게소 정보 OpenAPI',
        '주요 근거 문헌: Åkerstedt & Folkard 3-Process Model / Deng et al., Sensors 2020 / Satish et al., EHP 2012 / Wyon et al., Ergonomics 1996 / Reyner & Horne, Psychophysiology 1997 / Basner & Dinges 2011 (PVT)',
    ])
    b.image('fleet.png', 15.0, '그림 6. Fleet Safety Console: 법인차·렌터카 플릿 관리자용 실시간 졸음·휴식정책 준수 대시보드')

    # 8. 숏폼 링크 ────────────────────────────────────────────────
    b = boxes[7]
    b.para('(선택) 게시 후 링크 기재 예정')

    doc.save(OUT)
    print('saved', OUT)


if __name__ == '__main__':
    main()
