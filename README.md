# 🎨 내가 대충 그린 낙서, AI는 얼마나 맞힐 수 있을까?
> **Google Quick, Draw! 신경망 기반의 실시간 듀얼 스크린 드로잉 아케이드 게임**

플레이어가 캔버스에 제시어를 그리면 Google 신경망 AI가 실시간으로 그림을 분석하고 추측합니다.  
1인 챌린지, **2인 동시 대결(듀얼 모니터)**, **반쪽 협동**, **AI와 대결** 모드와 **드로잉 정밀 채점 시스템**을 지원합니다.

---

## ✨ 주요 기능 (Key Features)

### 1. 🤖 Google Quick, Draw! 실시간 필기 인식 API 연동
- 제시어는 Quick, Draw! 카테고리 중 276개(한글 라벨)에서 무작위로 10개를 뽑습니다
- 획(Stroke) 단위 정규화(Bounding Box Normalization, $256 \times 256$ 스케일링) 처리, 0°/90°/180°/270° 회전본을 함께 판정
- 획을 그을 때마다 실시간 추측 Top 5 후보를 보여 주고, **완성** 버튼을 누르거나 20초가 지나면 채점합니다

### 2. 🖥️ 듀얼 스크린 & 멀티 캐비닛 아케이드 아키텍처
- 두 화면 사이 메시지는 **Vite 개발 서버의 WebSocket**으로 중계해서 브라우저·기기가 달라도 이어집니다 (서버가 없는 정적 배포에서는 같은 브라우저 안의 `BroadcastChannel`로 대신)
- **화면 쿼리스트링 모드 (`?screen=`)**:
  - `?screen=a`: **1P 모니터** (홈 화면, 모드 선택, 1P 플레이 및 2P 대기)
  - `?screen=b`: **2P 보조 모니터 / 명예의 전당** (평상시 실시간 랭킹 보드, 2인 모드 시 2P 이름 입력 및 동시 드로잉)
  - `?screen=both`: **개발 및 단일 화면용** 좌우 1:1 분할 뷰

### 3. ✍️ 손글씨 이름 입력
- 터치스크린에 이름을 손으로 쓰면 Google 필기 인식(한국어)으로 읽어 1순위 후보를 이름으로 넣고, 다른 후보도 고를 수 있습니다

### 4. 📐 드로잉 정밀 심사 엔진 (Scoring Engine, 라운드당 1000점)
- **🎯 AI 인식 (300)**: 제시어가 몇 순위 후보였는지 (1위 / 2~3위 / 4~5위)
- **⚡ 속도 (250)**: 인식된 그림을 완성했을 때 남은 시간 비율 (20초 기준)
- **✏️ 스트로크 (250)**: 최적 획수(3~8획)일 때 만점, 너무 적거나 많으면 감점
- **📐 구도 (200)**: 화면 대비 크기와 중앙 배치
- AI가 알아보지 못하면 스트로크·구도 점수의 절반만 인정합니다. 반쪽 협동은 두 사람의 분담·이음새로 협동 배율을 곱합니다

### 5. 🏆 명예의 전당 (Hall of Fame)
- 모든 게임 기록을 서버 노트북의 `data/history.json`에 쌓고, 이름마다 최고 기록으로 Top 10을 뽑습니다 (`localStorage`는 캐시)
- 1~3위 시상대 UI, 전체 기록 관리(이름 수정·삭제·초기화) 지원

### 6. 🎨 커스텀 친구 손그림 데이터셋 & 하이브리드 AI 인식 (Custom Hand-Drawn AI)
- 학생들이 직접 그린 **549장의 손그림 데이터**를 284개 카테고리로 정규화(`src/img/ai/`)
- $16 \times 16$ (256차원) 공간 격자 특성 벡터(`friendsDrawingsSignatures.json`) 추출
- 코사인 유사도(Cosine Similarity) 기반 실시간 오프라인 판정 + Google Quick, Draw! 글로벌 신경망 앙상블로 친구들의 독특한 그림 화풍까지 즉각 인식

### 7. 🍬 라즈베리 파이 5 하드웨어 사탕 디스펜서 (Hardware Candy Dispenser)
- **모터 및 드라이버**: 28BYJ-48 5V 감속 스텝 모터 (64:1 감속비) + ULN2003 드라이버 보드
- **통합 전원**: 라즈베리파이 5 공식 27W 어댑터의 5V 레일(Pin 2, Pin 6)을 직결하여 별도 전원 어댑터 없이 올인원 구동
- **저전력 & 발열 방지**: 모터 동작 직후 4개 제어 핀을 즉시 LOW로 전환하여 대기 전력 0W 유지
- **자동 리워드 연동**: 게임이 끝나면 점수에 따라 REST API(`POST /dispense`)로 사탕을 0~4개 배출합니다 (사탕 1개 = 드럼 360도 1회전)
  - 혼자 하기: 1,000점 이상 1개 · 3,000점 이상 2개 · 5,000점 이상 3개
  - AI와 대결: AI를 이기면 3개, 지면 혼자 하기 기준
  - 반쪽 협동(팀 점수): 1,000점 이상 2개 · 3,500점 이상 3개 · 5,500점 이상 4개
  - 둘이 대결: 1,000점 넘은 사람마다 1개 + 높은 점수가 3,000점·5,000점 넘으면 1개씩 (최대 4개)
  - 사탕 서버 주소는 1P 화면 주소의 호스트 `:8080`입니다. 다르면 브라우저 `localStorage`의 `DISPENSER_HOST`에 IP를 넣으세요
- **3D 프린팅 하드웨어**: Sindoh 3DWOX 최적화 5단 조립식 기구 설계(`candy_dispenser/stl/`)

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend Framework**: React 19 + Vite
- **Language**: TypeScript, Python 3
- **Styling**: Tailwind CSS, Claymorphism Design System (클레이 3D 버튼/카드 UI)
- **Graphics**: HTML5 Canvas API (PointerEvent 기반 크로스 플랫폼 필압/터치 대응)
- **AI/ML API**: Google Quick, Draw! InputTools + Custom Hand-Drawn 256D Feature Engine
- **Hardware Controller**: Raspberry Pi 5 GPIO, Python 3 HTTP Server (`candy_server.py`)
- **Sync Protocol**: Vite dev server WebSocket 중계 (정적 배포 시 BroadcastChannel)

---

## 🔌 하드웨어 배선 가이드 (Hardware Pinout)

라즈베리 파이 5 GPIO 40핀 헤더와 ULN2003 스텝 모터 드라이버 보드를 아래와 같이 연결합니다:

| 라즈베리 파이 5 핀 | GPIO 번호 | ULN2003 모듈 핀 | 기능 설명 |
|---|---|---|---|
| **Pin 2** | 5V Power | **5V+ (VCC)** | 모터 및 드라이버 5V 주전원 (단일 어댑터 직결) |
| **Pin 6** | GND | **GND (-)** | 공통 접지 |
| **Pin 11** | GPIO 17 | **IN1** | 스텝 위상 코일 A |
| **Pin 12** | GPIO 18 | **IN2** | 스텝 위상 코일 B |
| **Pin 13** | GPIO 27 | **IN3** | 스텝 위상 코일 C |
| **Pin 15** | GPIO 22 | **IN4** | 스텝 위상 코일 D |

> 배선은 위 표처럼 순서대로 꽂습니다. 코드(`candy_server.py`의 `PINS = [17, 27, 18, 22]`)가 가운데 두 핀을 바꿔 IN1→IN3→IN2→IN4 순으로 구동해 28BYJ-48 클론의 코일 순서를 맞춥니다 ([WIRING_GUIDE.md](candy_dispenser/docs/WIRING_GUIDE.md)와 같음).
>
> **모터 테스트**: `python3 candy_server.py --test` 명령으로 사탕 1개 배출 동작(360도 1회전)을 점검할 수 있습니다.

---

## 🚀 시작하기 (Getting Started)

### 1. 준비물
- [Node.js](https://nodejs.org) 20 이상
- 라즈베리 파이 5 (사탕 디스펜서 연동 시) 또는 일반 PC
- 인터넷 연결 (Google Quick, Draw! 온라인 API 연동용)

### 2. 받기 및 설치 (처음 한 번)
```bash
git clone https://github.com/Bluemon7894/MDP.git
cd MDP
npm install -g pnpm
pnpm install
```

### 3. 원클릭 실행 (라즈베리 파이 / 리눅스)
```bash
chmod +x start.sh
./start.sh
```
- 게임 웹 서버(`http://localhost:5199`)와 사탕 디스펜서 제어 서버(`http://localhost:8080`)가 한 번에 자동 구동됩니다.

### 4. PC / 윈도우 실행
```bash
start.bat
```
(모니터 2대 듀얼 아케이드 환경은 `start-arcade.bat` 실행)

### 5. 화면 열기
| 화면 | 주소 |
|---|---|
| 1P 화면 (홈·게임) | http://localhost:5199/?screen=a |
| 2P · 랭킹 화면 | http://localhost:5199/?screen=b |

- **한 컴퓨터 + 모니터 2대**: `start-arcade.bat` 실행 → 두 화면이 각 모니터에 전체 화면으로 뜹니다. 모니터 배치가 다르면 파일 안의 `MONITOR2_POS` 를 고치세요.
- **노트북 2대 (같은 와이파이)**: 서버를 켠 노트북에서 `start-arcade.bat a`, 다른 노트북에서 `start-arcade.bat b 서버노트북IP` (IP는 서버 창의 `Network:` 주소)
  - 다른 노트북에서 안 열리면 Windows 와이파이를 "개인 네트워크"로 바꾸거나 방화벽에서 Node.js를 허용하세요. 학교 와이파이는 기기끼리 통신을 막을 수 있으니 휴대폰 핫스팟·공유기를 쓰면 확실합니다.

### 6. 기록
- 랭킹·전체 기록·홈 그림은 서버 노트북의 `data/` 폴더에 저장됩니다 (깃허브에는 올라가지 않음).
- 랭킹 화면의 **전체 기록 관리**에서 이름 수정·삭제·초기화를 할 수 있습니다.

### 7. 라즈베리 파이 서버의 CSS (화면을 고쳤다면 꼭)
- 라즈베리 파이는 Tailwind를 직접 돌리면 멈추기 때문에, 미리 만든 `.prebuilt/index.css`를 대신 씁니다. 파이가 서버를 돌리면 노트북 화면도 이 CSS를 받습니다.
- 그래서 화면 코드에 **새 Tailwind 클래스**를 쓰면, PC에서 아래 명령으로 이 파일을 다시 만든 뒤 함께 커밋·푸시해야 파이 서버에서 스타일이 반영됩니다. (안 하면 버튼이 안 눌리거나 색이 빠질 수 있음)
```bash
pnpm css:prebuilt
```
