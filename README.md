# 🎨 내가 대충 그린 낙서, AI는 얼마나 맞힐 수 있을까?
> **Google Quick, Draw! 신경망 기반의 실시간 듀얼 스크린 드로잉 아케이드 게임**

플레이어가 캔버스에 제시어를 그리면 Google 신경망 AI가 실시간으로 그림을 분석하고 추측합니다.  
단일 기기 1인 챌린지 모드뿐만 아니라 `BroadcastChannel`을 활용한 **2인 캐비닛(듀얼 모니터) 턴제 배틀** 및 **기하학적 드로잉 정밀 채점 시스템**을 지원합니다.

---

## ✨ 주요 기능 (Key Features)

### 1. 🤖 Google Quick, Draw! 실시간 필기 인식 API 연동
- 공식 345개 카테고리 데이터셋 매핑 및 한글 라벨링 지원
- 획(Stroke) 단위 정규화(Bounding Box Normalization, $256 \times 256$ 스케일링) 처리
- 플레이어가 선을 그릴 때마다 실시간 추측 Top 5 후보 반환 및 정답 자동 판정 (3초 유지 시 라운드 클리어)

### 2. 🖥️ 듀얼 스크린 & 멀티 캐비닛 아케이드 아키텍처
- `BroadcastChannel API ('arcade_display_sync')`를 이용해 별도 백엔드 소켓 서버 없이 브라우저 탭 간 제로 레이턴시 상태 동기화 지원
- **화면 쿼리스트링 모드 (`?screen=`)**:
  - `?screen=a`: **1P 모니터** (홈 화면, 모드 선택, 1P 플레이 및 2P 대기)
  - `?screen=b`: **2P 보조 모니터 / 명예의 전당** (평상시 실시간 랭킹 보드, 2인 모드 시 2P 닉네임 입력 및 턴제 드로잉/관전)
  - `?screen=both`: **개발 및 단일 화면용** 좌우 1:1 분할 뷰

### 3. ⌨️ 가상 한글 자모 조합 오토마타 (Virtual Hangul Keyboard)
- 터치스크린 및 아케이드 환경을 위한 풀 커스텀 가상 자판 제공
- 초성, 중성(이중모음 결합 포함), 종성(복자음 결합 포함)을 온프레미스로 조합하는 한글 오토마타 로직 탑재 (유니코드 `0xAC00` 연산)

### 4. 📐 4축 기하학적 드로잉 정밀 심사 엔진 (Scoring Engine)
단순 정답 여부뿐만 아니라 드로잉의 기하학적 완성도를 분석해 라운드 점수를 산출합니다.
- **⚡ 속도 지표**: 남은 제한시간(20초 기준) 비례 가산점
- **✏️ 획수 최적화**: 너무 복잡하거나 단순하지 않은 최적 스트로크(3~10획) 보너스
- **📐 종횡비 & 조형 균형**: 외곽 바운딩 박스 너비/높이 비율 대칭도 점수
- **🎯 AI 확신도**: Quick, Draw! 모델의 예측 순위(1순위 통과 시 최고점) 반영

### 5. 🏆 명예의 전당 (Hall of Fame)
- `localStorage` 기반 상위 Top 10 랭킹 자동 정렬 및 영구 저장
- 점수 중복 저장 방지 가드(`useRef`) 적용
- 1~3위 시상대 UI 및 개별 기록 관리(삭제 확인 모달) 지원

### 6. 🎨 커스텀 친구 손그림 데이터셋 & 하이브리드 AI 인식 (Custom Hand-Drawn AI)
- 학생들이 직접 그린 **549장의 손그림 데이터**를 284개 카테고리로 정규화(`src/img/ai/`)
- $16 \times 16$ (256차원) 공간 격자 특성 벡터(`friendsDrawingsSignatures.json`) 추출
- 코사인 유사도(Cosine Similarity) 기반 실시간 오프라인 판정 + Google Quick, Draw! 글로벌 신경망 앙상블로 친구들의 독특한 그림 화풍까지 즉각 인식

### 7. 🍬 라즈베리 파이 5 하드웨어 사탕 디스펜서 (Hardware Candy Dispenser)
- **모터 및 드라이버**: 28BYJ-48 5V 감속 스텝 모터 (64:1 감속비) + ULN2003 드라이버 보드
- **통합 전원**: 라즈베리파이 5 공식 27W 어댑터의 5V 레일(Pin 2, Pin 6)을 직결하여 별도 전원 어댑터 없이 올인원 구동
- **저전력 & 발열 방지**: 모터 동작 직후 4개 제어 핀을 즉시 LOW로 전환하여 대기 전력 0W 유지
- **자동 리워드 연동**: 솔로 챌린지 클리어, AI 대전 승리, 협동 모드 목표 달성, 2인 배틀 승리 시 REST API(`POST /dispense`)로 1회(360도 1슬롯) 사탕 자동 배출
- **3D 프린팅 하드웨어**: Sindoh 3DWOX 최적화 5단 조립식 기구 설계(`candy_dispenser/stl/`)

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend Framework**: React 18+
- **Language**: TypeScript, Python 3
- **Styling**: Tailwind CSS, Claymorphism Design System (클레이 3D 버튼/카드 UI)
- **Graphics**: HTML5 Canvas API (PointerEvent 기반 크로스 플랫폼 필압/터치 대응)
- **AI/ML API**: Google Quick, Draw! InputTools + Custom Hand-Drawn 256D Feature Engine
- **Hardware Controller**: Raspberry Pi 5 GPIO, Python 3 HTTP Server (`candy_server.py`)
- **Sync Protocol**: Web BroadcastChannel API

---

## 🔌 하드웨어 배선 가이드 (Hardware Pinout)

라즈베리 파이 5 GPIO 40핀 헤더와 ULN2003 스텝 모터 드라이버 보드를 아래와 같이 연결합니다:

| 라즈베리 파이 5 핀 | GPIO 번호 | ULN2003 모듈 핀 | 기능 설명 |
|---|---|---|---|
| **Pin 2** | 5V Power | **5V+ (VCC)** | 모터 및 드라이버 5V 주전원 (단일 어댑터 직결) |
| **Pin 6** | GND | **GND (-)** | 공통 접지 |
| **Pin 11** | GPIO 17 | **IN1** | 스텝 위상 코일 A |
| **Pin 13** | GPIO 27 | **IN2** | 스텝 위상 코일 B (28BYJ-48 클론 역상 보정) |
| **Pin 12** | GPIO 18 | **IN3** | 스텝 위상 코일 C |
| **Pin 15** | GPIO 22 | **IN4** | 스텝 위상 코일 D |

> **모터 테스트**: `python3 candy_server.py --test` 명령으로 즉시 LED 및 360도 회전 동작을 점검할 수 있습니다.

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

### 4. 화면 열기
| 화면 | 주소 |
|---|---|
| 1P 화면 (홈·게임) | http://localhost:5199/?screen=a |
| 2P · 랭킹 화면 | http://localhost:5199/?screen=b |

- **한 컴퓨터 + 모니터 2대**: `start-arcade.bat` 실행 → 두 화면이 각 모니터에 전체 화면으로 뜹니다. 모니터 배치가 다르면 파일 안의 `MONITOR2_POS` 를 고치세요.
- **노트북 2대 (같은 와이파이)**: 서버를 켠 노트북에서 `start-arcade.bat a`, 다른 노트북에서 `start-arcade.bat b 서버노트북IP` (IP는 서버 창의 `Network:` 주소)
  - 다른 노트북에서 안 열리면 Windows 와이파이를 "개인 네트워크"로 바꾸거나 방화벽에서 Node.js를 허용하세요. 학교 와이파이는 기기끼리 통신을 막을 수 있으니 휴대폰 핫스팟·공유기를 쓰면 확실합니다.

### 5. 기록
- 랭킹·전체 기록·홈 그림은 서버 노트북의 `data/` 폴더에 저장됩니다 (깃허브에는 올라가지 않음).
- 랭킹 화면의 **전체 기록 관리**에서 이름 수정·삭제·초기화를 할 수 있습니다.
