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

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend Framework**: React 18+
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Claymorphism Design System (클레이 3D 버튼/카드 UI)
- **Graphics**: HTML5 Canvas API (PointerEvent 기반 크로스 플랫폼 필압/터치 대응)
- **AI/ML API**: Google Quick, Draw! InputTools Handwriting Recognition
- **Sync Protocol**: Web BroadcastChannel API

---

## 🚀 시작하기 (Getting Started)

### 1. 저장소 클론 및 패키지 설치
```bash
git clone [https://github.com/Bluemon7894/MDP.git](https://github.com/Bluemon7894/MDP.git)
cd MDP/niga
npm install
