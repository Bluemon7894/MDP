import { useState, useEffect, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────
type ScreenTarget = 'a' | 'b' | 'both'
type CabAState = 'idle' | 'modeSelect' | 'nickname1P' | 'waiting2P' | 'inGame'
type CabBState = 'leaderboard' | 'nickname2P' | 'inGame'
type ActivePlayer = '1P' | '2P'
type BtnColor = 'coral' | 'mint' | 'yellow' | 'sky' | 'purple'

interface KeywordMap {
  ko: string
  en: string
}

interface RankItem {
  id: string
  name: string
  score: number
  candy: number
  date: string
}

interface MetricBreakdown {
  speed: number
  strokeEff: number
  balance: number
  aiRank: number
  timePts: number
  strokePts: number
  balancePts: number
  rankPts: number
  totalPts: number
  verdictTitle: string
  verdictDesc: string
}

interface CustomModalState {
  isOpen: boolean
  title: string
  message: string
  type: 'alert' | 'confirm'
  icon?: string
  onConfirm?: () => void
  onCancel?: () => void
}

// ── Google Quick, Draw! 345개 공식 카테고리 ──────────────────────────────
const ALL_QUICKDRAW_DATASET: KeywordMap[] = [
  { ko: '항공모함', en: 'aircraft carrier' }, { ko: '비행기', en: 'airplane' }, { ko: '알람시계', en: 'alarm clock' },
  { ko: '구급차', en: 'ambulance' }, { ko: '천사', en: 'angel' }, { ko: '개미', en: 'ant' }, { ko: '모루', en: 'anvil' },
  { ko: '사과', en: 'apple' }, { ko: '팔', en: 'arm' }, { ko: '아스파라거스', en: 'asparagus' }, { ko: '도끼', en: 'axe' },
  { ko: '배낭', en: 'backpack' }, { ko: '바나나', en: 'banana' }, { ko: '붕대', en: 'bandage' }, { ko: '헛간', en: 'barn' },
  { ko: '야구공', en: 'baseball' }, { ko: '야구방망이', en: 'baseball bat' }, { ko: '바구니', en: 'basket' },
  { ko: '농구공', en: 'basketball' }, { ko: '박쥐', en: 'bat' }, { ko: '욕조', en: 'bathtub' }, { ko: '해변', en: 'beach' },
  { ko: '곰', en: 'bear' }, { ko: '수염', en: 'beard' }, { ko: '침대', en: 'bed' }, { ko: '꿀벌', en: 'bee' },
  { ko: '허리띠', en: 'belt' }, { ko: '벤치', en: 'bench' }, { ko: '자전거', en: 'bicycle' }, { ko: '쌍안경', en: 'binoculars' },
  { ko: '새', en: 'bird' }, { ko: '생일케이크', en: 'birthday cake' }, { ko: '블랙베리', en: 'blackberry' },
  { ko: '블루베리', en: 'blueberry' }, { ko: '책', en: 'book' }, { ko: '부메랑', en: 'boomerang' }, { ko: '병', en: 'bottle' },
  { ko: '나비넥타이', en: 'bowtie' }, { ko: '팔찌', en: 'bracelet' }, { ko: '뇌', en: 'brain' }, { ko: '빵', en: 'bread' },
  { ko: '다리(교량)', en: 'bridge' }, { ko: '브로콜리', en: 'broccoli' }, { ko: '빗자루', en: 'broom' }, { ko: '양동이', en: 'bucket' },
  { ko: '불도저', en: 'bulldozer' }, { ko: '버스', en: 'bus' }, { ko: '덤불', en: 'bush' }, { ko: '나비', en: 'butterfly' },
  { ko: '선인장', en: 'cactus' }, { ko: '케이크', en: 'cake' }, { ko: '계산기', en: 'calculator' }, { ko: '달력', en: 'calendar' },
  { ko: '낙타', en: 'camel' }, { ko: '카메라', en: 'camera' }, { ko: '모닥불', en: 'campfire' }, { ko: '촛불', en: 'candle' },
  { ko: '대포', en: 'cannon' }, { ko: '카누', en: 'canoe' }, { ko: '자동차', en: 'car' }, { ko: '당근', en: 'carrot' },
  { ko: '성(캐슬)', en: 'castle' }, { ko: '고양이', en: 'cat' }, { ko: '천장선풍기', en: 'ceiling fan' }, { ko: '첼로', en: 'cello' },
  { ko: '휴대전화', en: 'cell phone' }, { ko: '의자', en: 'chair' }, { ko: '샹들리에', en: 'chandelier' }, { ko: '교회', en: 'church' },
  { ko: '동그라미', en: 'circle' }, { ko: '클라리넷', en: 'clarinet' }, { ko: '시계', en: 'clock' }, { ko: '구름', en: 'cloud' },
  { ko: '커피잔', en: 'coffee cup' }, { ko: '나침반', en: 'compass' }, { ko: '컴퓨터', en: 'computer' }, { ko: '쿠키', en: 'cookie' },
  { ko: '소파', en: 'couch' }, { ko: '젖소', en: 'cow' }, { ko: '게', en: 'crab' }, { ko: '크레용', en: 'crayon' },
  { ko: '악어', en: 'crocodile' }, { ko: '왕관', en: 'crown' }, { ko: '크루즈선', en: 'cruise ship' }, { ko: '컵', en: 'cup' },
  { ko: '다이아몬드', en: 'diamond' }, { ko: '식기세척기', en: 'dishwasher' }, { ko: '다이빙대', en: 'diving board' }, { ko: '강아지', en: 'dog' },
  { ko: '돌고래', en: 'dolphin' }, { ko: '도넛', en: 'donut' }, { ko: '문', en: 'door' }, { ko: '용', en: 'dragon' },
  { ko: '서랍장', en: 'dresser' }, { ko: '드릴', en: 'drill' }, { ko: '드럼', en: 'drums' }, { ko: '오리', en: 'duck' },
  { ko: '아령', en: 'dumbbell' }, { ko: '귀', en: 'ear' }, { ko: '팔꿈치', en: 'elbow' }, { ko: '코끼리', en: 'elephant' },
  { ko: '편지봉투', en: 'envelope' }, { ko: '지우개', en: 'eraser' }, { ko: '눈', en: 'eye' }, { ko: '안경', en: 'eyeglasses' },
  { ko: '얼굴', en: 'face' }, { ko: '선풍기', en: 'fan' }, { ko: '깃털', en: 'feather' }, { ko: '울타리', en: 'fence' },
  { ko: '손가락', en: 'finger' }, { ko: '소화전', en: 'fire hydrant' }, { ko: '벽난로', en: 'fireplace' }, { ko: '소방차', en: 'firetruck' },
  { ko: '물고기', en: 'fish' }, { ko: '홍학', en: 'flamingo' }, { ko: '손전등', en: 'flashlight' }, { ko: '꽃', en: 'flower' },
  { ko: 'UFO', en: 'flying saucer' }, { ko: '발', en: 'foot' }, { ko: '포크', en: 'fork' }, { ko: '개구리', en: 'frog' },
  { ko: '후라이팬', en: 'frying pan' }, { ko: '정원', en: 'garden' }, { ko: '기린', en: 'giraffe' }, { ko: '골프채', en: 'golf club' },
  { ko: '포도', en: 'grapes' }, { ko: '잔디', en: 'grass' }, { ko: '기타', en: 'guitar' }, { ko: '햄버거', en: 'hamburger' },
  { ko: '망치', en: 'hammer' }, { ko: '손', en: 'hand' }, { ko: '하모니카', en: 'harmonica' }, { ko: '모자', en: 'hat' },
  { ko: '헤드폰', en: 'headphones' }, { ko: '고슴도치', en: 'hedgehog' }, { ko: '헬리콥터', en: 'helicopter' }, { ko: '헬멧', en: 'helmet' },
  { ko: '육각형', en: 'hexagon' }, { ko: '말', en: 'horse' }, { ko: '병원', en: 'hospital' }, { ko: '핫도그', en: 'hot dog' },
  { ko: '모래시계', en: 'hourglass' }, { ko: '집', en: 'house' }, { ko: '이글루', en: 'igloo' }, { ko: '캥거루', en: 'kangaroo' },
  { ko: '주전자', en: 'kettle' }, { ko: '열쇠', en: 'key' }, { ko: '키보드', en: 'keyboard' }, { ko: '무릎', en: 'knee' },
  { ko: '칼', en: 'knife' }, { ko: '사다리', en: 'ladder' }, { ko: '노트북', en: 'laptop' }, { ko: '나뭇잎', en: 'leaf' },
  { ko: '전구', en: 'light bulb' }, { ko: '등대', en: 'lighthouse' }, { ko: '번개', en: 'lightning' }, { ko: '직선', en: 'line' },
  { ko: '사자', en: 'lion' }, { ko: '립스틱', en: 'lipstick' }, { ko: '바닷가재', en: 'lobster' }, { ko: '사탕', en: 'lollipop' },
  { ko: '우체통', en: 'mailbox' }, { ko: '마이크', en: 'microphone' }, { ko: '원숭이', en: 'monkey' }, { ko: '달', en: 'moon' },
  { ko: '모기', en: 'mosquito' }, { ko: '산', en: 'mountain' }, { ko: '생쥐', en: 'mouse' }, { ko: '콧수염', en: 'moustache' },
  { ko: '머그컵', en: 'mug' }, { ko: '버섯', en: 'mushroom' }, { ko: '못', en: 'nail' }, { ko: '목걸이', en: 'necklace' },
  { ko: '코', en: 'nose' }, { ko: '바다', en: 'ocean' }, { ko: '팔각형', en: 'octagon' }, { ko: '문어', en: 'octopus' },
  { ko: '양파', en: 'onion' }, { ko: '오븐', en: 'oven' }, { ko: '부엉이', en: 'owl' }, { ko: '페인트통', en: 'paint can' },
  { ko: '붓', en: 'paintbrush' }, { ko: '야자수', en: 'palm tree' }, { ko: '판다', en: 'panda' }, { ko: '바지', en: 'pants' },
  { ko: '클립', en: 'paper clip' }, { ko: '낙하산', en: 'parachute' }, { ko: '앵무새', en: 'parrot' }, { ko: '여권', en: 'passport' },
  { ko: '땅콩', en: 'peanut' }, { ko: '서양배', en: 'pear' }, { ko: '연필', en: 'pencil' }, { ko: '펭귄', en: 'penguin' },
  { ko: '피아노', en: 'piano' }, { ko: '트럭', en: 'pickup truck' }, { ko: '액자', en: 'picture frame' }, { ko: '돼지', en: 'pig' },
  { ko: '베개', en: 'pillow' }, { ko: '파인애플', en: 'pineapple' }, { ko: '피자', en: 'pizza' }, { ko: '경찰차', en: 'police car' },
  { ko: '수영장', en: 'pool' }, { ko: '아이스바', en: 'popsicle' }, { ko: '엽서', en: 'postcard' }, { ko: '감자', en: 'potato' },
  { ko: '토끼', en: 'rabbit' }, { ko: '라디오', en: 'radio' }, { ko: '비', en: 'rain' }, { ko: '무지개', en: 'rainbow' },
  { ko: '코뿔소', en: 'rhinoceros' }, { ko: '총', en: 'rifle' }, { ko: '강', en: 'river' }, { ko: '롤러코스터', en: 'roller coaster' },
  { ko: '요트', en: 'sailboat' }, { ko: '샌드위치', en: 'sandwich' }, { ko: '톱', en: 'saw' }, { ko: '색소폰', en: 'saxophone' },
  { ko: '스쿨버스', en: 'school bus' }, { ko: '가위', en: 'scissors' }, { ko: '전갈', en: 'scorpion' }, { ko: '드라이버', en: 'screwdriver' },
  { ko: '상어', en: 'shark' }, { ko: '양', en: 'sheep' }, { ko: '신발', en: 'shoe' }, { ko: '반바지', en: 'shorts' },
  { ko: '삽', en: 'shovel' }, { ko: '싱크대', en: 'sink' }, { ko: '스케이트보드', en: 'skateboard' }, { ko: '해골', en: 'skull' },
  { ko: '빌딩', en: 'skyscraper' }, { ko: '웃는얼굴', en: 'smiley face' }, { ko: '달팽이', en: 'snail' }, { ko: '뱀', en: 'snake' },
  { ko: '스노클', en: 'snorkel' }, { ko: '눈사람', en: 'snowman' }, { ko: '눈송이', en: 'snowflake' }, { ko: '축구공', en: 'soccer ball' },
  { ko: '양말', en: 'sock' }, { ko: '보트', en: 'speedboat' }, { ko: '거미', en: 'spider' }, { ko: '숟가락', en: 'spoon' },
  { ko: '네모', en: 'square' }, { ko: '구불구불선', en: 'squiggle' }, { ko: '다람쥐', en: 'squirrel' }, { ko: '계단', en: 'stairs' },
  { ko: '별', en: 'star' }, { ko: '잠수함', en: 'submarine' }, { ko: '태양', en: 'sun' }, { ko: '백조', en: 'swan' },
  { ko: '티셔츠', en: 't-shirt' }, { ko: '테이블', en: 'table' }, { ko: '찻잔', en: 'teapot' }, { ko: '전화기', en: 'telephone' },
  { ko: '텔레비전', en: 'television' }, { ko: '텐트', en: 'tent' }, { ko: '호랑이', en: 'tiger' }, { ko: '토스터', en: 'toaster' },
  { ko: '변기', en: 'toilet' }, { ko: '치아', en: 'tooth' }, { ko: '칫솔', en: 'toothbrush' }, { ko: '토네이도', en: 'tornado' },
  { ko: '트랙터', en: 'tractor' }, { ko: '신호등', en: 'traffic light' }, { ko: '기차', en: 'train' }, { ko: '나무', en: 'tree' },
  { ko: '세모', en: 'triangle' }, { ko: '트럭', en: 'truck' }, { ko: '우산', en: 'umbrella' }, { ko: '속옷', en: 'underwear' },
  { ko: '꽃병', en: 'vase' }, { ko: '바이올린', en: 'violin' }, { ko: '세탁기', en: 'washing machine' }, { ko: '수박', en: 'watermelon' },
  { ko: '고래', en: 'whale' }, { ko: '바퀴', en: 'wheel' }, { ko: '풍차', en: 'windmill' }, { ko: '와인잔', en: 'wine glass' },
  { ko: '요가', en: 'yoga' }, { ko: '얼룩말', en: 'zebra' }, { ko: '지퍼', en: 'zipper' }
]

const QUICKDRAW_DICT: Record<string, string> = {}
ALL_QUICKDRAW_DATASET.forEach(item => {
  const raw = item.en.toLowerCase().trim()
  QUICKDRAW_DICT[raw] = item.ko
  QUICKDRAW_DICT[raw.replace(/\s+/g, '')] = item.ko
  QUICKDRAW_DICT[raw.replace(/\s+/g, '_')] = item.ko
})

function toKorean(enWord: string): string {
  if (!enWord) return ''
  const clean = enWord.toLowerCase().trim()
  const noSpace = clean.replace(/[\s_\-]+/g, '')
  return QUICKDRAW_DICT[clean] || QUICKDRAW_DICT[noSpace] || clean
}

function pickRandomKeywords(count = 10): KeywordMap[] {
  const shuffled = [...ALL_QUICKDRAW_DATASET]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

// ── 로컬스토리지 랭킹 관리 ────────────────────────────────────────────────
const RANKING_STORAGE_KEY = 'arcade_ranking_board_v5'

function generateUniqueId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function getLocalRankings(): RankItem[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(RANKING_STORAGE_KEY)
    if (!data) return []
    const parsed: RankItem[] = JSON.parse(data)
    return parsed.filter(item => item && typeof item.id === 'string' && !isNaN(item.score))
  } catch {
    return []
  }
}

function saveLocalRanking(newItem: Omit<RankItem, 'id' | 'date'>): RankItem[] {
  const cur = getLocalRankings()
  const safeScore = isNaN(newItem.score) ? 0 : newItem.score
  const safeCandy = isNaN(newItem.candy) ? 0 : newItem.candy
  const today = new Date().toISOString().split('T')[0]
  
  const updated = [
    ...cur,
    { ...newItem, score: safeScore, candy: safeCandy, id: generateUniqueId(), date: today }
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  try {
    localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error(e)
  }
  return updated
}

function deleteLocalRanking(targetId: string): RankItem[] {
  const cur = getLocalRankings()
  const updated = cur.filter(item => String(item.id) !== String(targetId))
  try {
    localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error(e)
  }
  return updated
}

const JAMO_ROWS = [
  ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'],
  ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'],
  ['ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ'],
]

const BTNS: Record<BtnColor, { bg: string; sh: string; tx: string; inset: string }> = {
  coral:  { bg: '#FF6B6B', sh: '#D93838', tx: '#FFFFFF', inset: 'rgba(255,255,255,0.4)' },
  mint:   { bg: '#20C997', sh: '#0CA678', tx: '#FFFFFF', inset: 'rgba(255,255,255,0.4)' },
  yellow: { bg: '#FFD43B', sh: '#E67700', tx: '#495057', inset: 'rgba(255,255,255,0.6)' },
  sky:    { bg: '#339AF0', sh: '#1C7ED6', tx: '#FFFFFF', inset: 'rgba(255,255,255,0.4)' },
  purple: { bg: '#845EF7', sh: '#5F3DC4', tx: '#FFFFFF', inset: 'rgba(255,255,255,0.4)' },
}

const arcadeChannel = typeof window !== 'undefined' ? new BroadcastChannel('arcade_display_sync') : null

// ── 한글 오토마타 ──────────────────────────────────────────────────────────
const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const JUNGSUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const JONGSUNG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

const COMPLEX_VOWELS: Record<string, string> = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' }
const COMPLEX_CONSONANTS: Record<string, string> = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' }

function assembleHangul(jamos: string[]): string {
  let result = '', i = 0
  while (i < jamos.length) {
    const cur = jamos[i], choIdx = CHOSUNG.indexOf(cur)
    if (choIdx === -1) {
      if (JUNGSUNG.includes(cur)) {
        if (i + 1 < jamos.length && COMPLEX_VOWELS[cur + jamos[i + 1]]) {
          result += COMPLEX_VOWELS[cur + jamos[i + 1]]; i += 2
        } else { result += cur; i += 1 }
      } else { result += cur; i += 1 }
      continue
    }
    if (i + 1 < jamos.length && JUNGSUNG.includes(jamos[i + 1])) {
      let jung = jamos[i + 1], step = 2
      if (i + 2 < jamos.length && COMPLEX_VOWELS[jung + jamos[i + 2]]) {
        jung = COMPLEX_VOWELS[jung + jamos[i + 2]]; step = 3
      }
      const jungIdx = JUNGSUNG.indexOf(jung)
      let jongIdx = 0
      if (i + step < jamos.length) {
        const potentialJong = jamos[i + step]
        const nextNext = i + step + 1 < jamos.length ? jamos[i + step + 1] : null
        if (!(nextNext && JUNGSUNG.includes(nextNext))) {
          if (nextNext && !JUNGSUNG.includes(nextNext)) {
            const nextNextNext = i + step + 2 < jamos.length ? jamos[i + step + 2] : null
            if (COMPLEX_CONSONANTS[potentialJong + nextNext] && !(nextNextNext && JUNGSUNG.includes(nextNextNext))) {
              jongIdx = JONGSUNG.indexOf(COMPLEX_CONSONANTS[potentialJong + nextNext]); step += 2
            } else if (JONGSUNG.includes(potentialJong)) {
              jongIdx = JONGSUNG.indexOf(potentialJong); step += 1
            }
          } else if (JONGSUNG.includes(potentialJong)) {
            jongIdx = JONGSUNG.indexOf(potentialJong); step += 1
          }
        }
      }
      result += String.fromCharCode(0xAC00 + (choIdx * 588) + (jungIdx * 28) + jongIdx)
      i += step
    } else { result += cur; i += 1 }
  }
  return result
}

// ── UI Primitives ──────────────────────────────────────────────────────────
function ClayBtn({
  children, color = 'coral', onClick, pulse = false, size = 'md', className = '',
}: { children: React.ReactNode; color?: BtnColor; onClick?: () => void; pulse?: boolean; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const [pressed, setPressed] = useState(false)
  const c = BTNS[color]
  const pad: Record<string, string> = {
    xs: 'px-4 py-2 text-sm', sm: 'px-6 py-3 text-base', md: 'px-8 py-4 text-xl', lg: 'px-12 py-5 text-2xl', xl: 'px-16 py-6 text-3xl',
  }

  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className={`rounded-[2rem] font-black tracking-wide select-none transition-all duration-100 ${pulse ? 'animate-pulse' : ''} ${pad[size]} ${className}`}
      style={{
        background: c.bg, color: c.tx, fontFamily: 'Jua, sans-serif',
        boxShadow: pressed ? `0 0 0 transparent, inset 0 6px 12px rgba(0,0,0,0.15)` : `0 10px 0 ${c.sh}, 0 20px 25px rgba(0,0,0,0.15), inset 0 5px 0 ${c.inset}`,
        transform: pressed ? 'translateY(10px)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

function Card({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-[2.5rem] bg-white border-4 border-[#F1E5FC] ${className}`}
      style={{
        boxShadow: '12px 12px 24px rgba(210, 195, 225, 0.5), -12px -12px 24px rgba(255, 255, 255, 0.8), inset 0 4px 10px rgba(255,255,255,0.5)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// 동그라미 패턴을 제거한 깔끔한 소프트 크림 배경
function ArcadeBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-br from-[#FFFDF9] via-[#FAF4FE] to-[#F2F7FD]" />
  )
}

// ── 이젤 대신 새롭게 디자인된 아케이드 인터랙티브 팔레트 & 매직 펜 아트 ─────
function ArcadePaletteArt() {
  return (
    <div className="relative w-56 h-56 flex items-center justify-center drop-shadow-2xl">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <linearGradient id="palGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF9F2" />
            <stop offset="100%" stopColor="#EFE3D5" />
          </linearGradient>
          <linearGradient id="penGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#845EF7" />
            <stop offset="100%" stopColor="#5F3DC4" />
          </linearGradient>
        </defs>

        {/* 3D 클레이 스타일 팔레트 보드 */}
        <path
          d="M 100 25 C 145 25 180 55 175 105 C 170 145 135 175 95 175 C 65 175 35 155 30 125 C 25 90 55 25 100 25 Z"
          fill="url(#palGrad)"
          stroke="#D8C7B5"
          strokeWidth="8"
        />

        {/* 손가락 파지 홀 */}
        <ellipse cx="65" cy="120" rx="14" ry="18" fill="#F4EAE0" stroke="#D8C7B5" strokeWidth="5" />

        {/* 캔디 컬러 물감 방울들 */}
        <circle cx="95" cy="55" r="14" fill="#FF6B6B" stroke="#E03131" strokeWidth="3" />
        <circle cx="135" cy="70" r="13" fill="#FFD43B" stroke="#F08C00" strokeWidth="3" />
        <circle cx="150" cy="110" r="13" fill="#20C997" stroke="#0CA678" strokeWidth="3" />
        <circle cx="125" cy="145" r="12" fill="#339AF0" stroke="#1C7ED6" strokeWidth="3" />

        {/* 매직 브러쉬 */}
        <g transform="rotate(32 100 100)">
          <rect x="94" y="20" width="12" height="110" rx="6" fill="url(#penGrad)" stroke="#43289E" strokeWidth="3" />
          <path d="M 94 130 C 94 130 90 148 100 160 C 110 148 106 130 106 130 Z" fill="#FF6B6B" stroke="#D93838" strokeWidth="3" />
          <line x1="94" y1="100" x2="106" y2="100" stroke="#FFE066" strokeWidth="6" />
        </g>
      </svg>
    </div>
  )
}

// ── 자체 커스텀 디자인 알림/확인 모달 (alert/confirm 대체) ────────────────
function CustomAlertModal({ modal, onClose }: { modal: CustomModalState; onClose: () => void }) {
  if (!modal.isOpen) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#2B1A40]/75 backdrop-blur-md p-6 animate-fade-in select-none">
      <Card className="p-8 max-w-md w-full flex flex-col items-center text-center gap-5 border-[6px] border-white shadow-2xl animate-bounce-short">
        <div className="text-6xl">{modal.icon || '📢'}</div>
        <h3 style={{ fontFamily: 'Jua, sans-serif' }} className="text-3xl text-[#2B1A40]">
          {modal.title}
        </h3>
        <p className="text-base font-bold text-gray-600 whitespace-pre-line leading-relaxed">
          {modal.message}
        </p>

        <div className="flex gap-4 mt-2 w-full justify-center">
          {modal.type === 'confirm' && (
            <button
              onClick={() => {
                modal.onCancel?.()
                onClose()
              }}
              className="px-6 py-3 rounded-2xl font-black bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-300 transition-all text-base"
            >
              취소
            </button>
          )}
          <ClayBtn
            color="coral"
            size="md"
            onClick={() => {
              modal.onConfirm?.()
              onClose()
            }}
          >
            확인
          </ClayBtn>
        </div>
      </Card>
    </div>
  )
}

// ── Screen A: 메인 홈 화면 (주기적 띠용 바운스 애니메이션 적용) ───────────────
function ScreenIdle({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center gap-10 overflow-hidden">
      <ArcadeBackground />

      {/* 주기적 젤리 바운스 CSS 인라인 삽입 */}
      <style>{`
        @keyframes jellyBounce {
          0%, 80%, 100% { transform: scale(1, 1); }
          85% { transform: scale(1.12, 0.88); }
          90% { transform: scale(0.92, 1.08); }
          95% { transform: scale(1.04, 0.96); }
        }
        .animate-jelly {
          animation: jellyBounce 3.5s infinite ease-in-out;
          transform-origin: center bottom;
        }
      `}</style>

      <div className="z-10 mt-6"><ArcadePaletteArt /></div>

      <div className="text-center px-8 z-10 flex flex-col gap-4">
        {/* 띠용거리는 메인 타이틀 */}
        <h1
          className="animate-jelly"
          style={{
            fontFamily: 'Jua, sans-serif',
            fontSize: 'clamp(3rem, 5vw, 5rem)',
            color: '#2B1A40',
            lineHeight: 1.15,
            textShadow: '3px 3px 0 #FFFFFF, 6px 6px 0 rgba(132, 94, 247, 0.2)',
          }}
        >
          내가 대충 그린 낙서<br /> AI는 얼마나 맞힐 수 있을까?
        </h1>

        <p className="font-bold text-[#845EF7] text-2xl bg-white/70 px-8 py-2.5 rounded-full inline-block mx-auto border-2 border-white backdrop-blur-sm shadow-sm">
          상대와 경쟁하거나 자신과 경쟁하여 높은 점수를 갱신해보세요!
        </p>
      </div>

      <div className="z-10 mt-4"><ClayBtn color="coral" size="xl" onClick={onStart}>▶ START GAME</ClayBtn></div>
    </div>
  )
}

function ModeModal({ onClose, on1P, on2P }: { onClose: () => void; on1P: () => void; on2P: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#2B1A40]/60 backdrop-blur-sm">
      <Card className="relative p-10 shadow-2xl border-[6px] border-white" style={{ width: '90%', maxWidth: 560 }}>
        <button onClick={onClose} className="absolute top-5 right-5 w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-black transition-colors">✕</button>
        <h2 style={{ fontFamily: 'Jua, sans-serif' }} className="text-4xl text-[#2B1A40] text-center mb-2">플레이 방식 선택</h2>
        <p className="text-center text-[#845EF7] font-bold text-lg mb-8">어떤 모드로 시작할까요?</p>

        <button onClick={on1P} className="w-full text-left rounded-[2rem] p-6 transition-transform hover:-translate-y-2 mb-5 border-4 border-[#FFD8A8] bg-gradient-to-r from-[#FFF4E6] to-[#FFE8CC] shadow-[0_8px_0_#FFC078]">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-5xl shadow-inner border-2 border-[#FFE8CC]">👤</div>
            <div>
              <div style={{ fontFamily: 'Jua, sans-serif' }} className="text-3xl text-[#D9480F]">1인 챌린지 (1P)</div>
              <div className="text-[#E8590C] font-semibold mt-1">이름 등록 후 10개 랜덤 제시어 AI 평가 도전!</div>
            </div>
          </div>
        </button>

        <button onClick={on2P} className="w-full text-left rounded-[2rem] p-6 transition-transform hover:-translate-y-2 border-4 border-[#D0BFFF] bg-gradient-to-r from-[#F3F0FF] to-[#E5DBFF] shadow-[0_8px_0_#B197FC]">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-5xl shadow-inner border-2 border-[#E5DBFF]">👥</div>
            <div>
              <div style={{ fontFamily: 'Jua, sans-serif' }} className="text-3xl text-[#5F3DC4]">2인 턴제 배틀 (2P)</div>
              <div className="text-[#6741D9] font-semibold mt-1">1P와 2P가 한 턴씩 번갈아가며 스코어 대결!</div>
            </div>
          </div>
        </button>
      </Card>
    </div>
  )
}

function CountdownOverlay({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#2B1A40]/85 backdrop-blur-md animate-fade-in select-none">
      <div className="text-center">
        <div style={{ fontFamily: 'Jua, sans-serif' }} className="text-4xl text-yellow-300 tracking-wider mb-4 animate-pulse">
          ARE YOU READY?
        </div>
        <div
          key={count}
          style={{ fontFamily: 'Jua, sans-serif', textShadow: '0 10px 30px rgba(255,107,107,0.8)' }}
          className="text-[12rem] font-black text-white transform animate-bounce leading-none"
        >
          {count > 0 ? count : 'GO!'}
        </div>
        <div className="mt-8 text-2xl font-bold text-white/80">
          {count > 0 ? '플레이어 준비 완료! 게임이 곧 시작됩니다!' : '지금 바로 스케치를 시작하세요!'}
        </div>
      </div>
    </div>
  )
}

function HangulKeyboard({
  title, subtitle, onComplete, onCancel,
}: {
  title: string; subtitle: string; onComplete: (name: string) => void; onCancel: () => void
}) {
  const [jamoList, setJamoList] = useState<string[]>([])

  const pressKey = (k: string) => { if (jamoList.length < 14) setJamoList(prev => [...prev, k]) }
  const backspace = () => setJamoList(prev => prev.slice(0, -1))
  const space = () => { if (jamoList.length < 14) setJamoList(prev => [...prev, ' ']) }

  const assembledName = assembleHangul(jamoList)

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-6 p-8 relative bg-[#FDF9F1]">
      <ArcadeBackground />

      <button
        onClick={onCancel}
        className="absolute top-6 right-8 w-12 h-12 rounded-full bg-white/80 hover:bg-red-50 text-gray-400 hover:text-red-500 font-black text-2xl flex items-center justify-center border-2 border-gray-200 shadow-sm transition-all z-20"
        title="취소하고 돌아가기"
      >
        ✕
      </button>

      <h2 style={{ fontFamily: 'Jua, sans-serif' }} className="text-5xl text-[#2B1A40] text-center leading-snug z-10 drop-shadow-sm">
        {title}<br />
        <span className="text-xl font-bold font-sans text-[#845EF7] bg-white px-6 py-2 rounded-full inline-block mt-2 border-2 border-purple-200">
          {subtitle}
        </span>
      </h2>

      <div className="rounded-[2.5rem] px-14 py-6 text-center bg-white shadow-[0_10px_0_#E9ECEF] border-4 border-gray-200 min-w-[420px] z-10">
        <div style={{ fontFamily: 'Jua, sans-serif' }} className="text-6xl text-[#2B1A40] tracking-widest min-h-[4rem] flex items-center justify-center">
          {assembledName || <span className="text-gray-300">_ _ _ _ _ _</span>}
        </div>
        <div className="text-sm text-gray-400 mt-2 font-black">{assembledName.length} / 최대 6자</div>
      </div>

      <div className="flex flex-col items-center gap-2.5 w-full max-w-2xl z-10 mt-1">
        {JAMO_ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-2.5 justify-center">
            {row.map(k => (
              <button
                key={k} onClick={() => pressKey(k)}
                className="w-16 h-16 rounded-2xl bg-white shadow-[0_6px_0_#E9ECEF] active:translate-y-1 active:shadow-none font-black text-2xl text-[#2B1A40] border-4 border-gray-100 hover:bg-purple-50 transition-all"
              >{k}</button>
            ))}
          </div>
        ))}
        <div className="flex gap-4 mt-2">
          <button onClick={backspace} className="px-10 py-3.5 rounded-2xl font-black bg-[#FF6B6B] border-[4px] border-[#E03131] text-white shadow-[0_6px_0_#C92A2A] text-xl active:translate-y-1">← 지우기</button>
          <button onClick={space} className="px-10 py-3.5 rounded-2xl font-black bg-[#339AF0] border-[4px] border-[#1C7ED6] text-white shadow-[0_6px_0_#1864AB] text-xl active:translate-y-1">␣ 띄어쓰기</button>
        </div>
      </div>

      <div className="z-10 mt-2">
        <ClayBtn color="mint" size="xl" onClick={() => onComplete(assembledName.trim() || '익명플레이어')}>
          입력 완료! ✅
        </ClayBtn>
      </div>
    </div>
  )
}

function AdvancedAnalysisModal({
  report, onDone,
}: {
  report: MetricBreakdown; onDone: () => void
}) {
  const [autoSec, setAutoSec] = useState(3)
  const [animatedTotal, setAnimatedTotal] = useState(0)

  useEffect(() => {
    const target = report.totalPts
    const step = Math.max(1, Math.ceil(target / 25))
    let current = 0
    const countTimer = setInterval(() => {
      current += step
      if (current >= target) {
        setAnimatedTotal(target)
        clearInterval(countTimer)
      } else {
        setAnimatedTotal(current)
      }
    }, 30)

    const autoTimer = setInterval(() => {
      setAutoSec(s => {
        if (s <= 1) {
          clearInterval(autoTimer)
          clearInterval(countTimer)
          onDone()
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => {
      clearInterval(countTimer)
      clearInterval(autoTimer)
    }
  }, [report, onDone])

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#1E1035]/80 backdrop-blur-md p-6 select-none animate-fade-in">
      <Card className="p-8 max-w-xl w-full border-[6px] border-white shadow-2xl relative overflow-hidden flex flex-col gap-5">
        <div className="flex items-center justify-between border-b pb-3 border-purple-100">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-black text-purple-900 text-lg">AI 기하학적 드로잉 정밀 심사 리포트</span>
          </div>
          <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">
            {autoSec}초 후 자동으로 다음 턴 ⏭️
          </span>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border-2 border-purple-200">
          <div className="text-sm font-black text-purple-950 mb-1">{report.verdictTitle}</div>
          <div className="text-xs font-semibold text-purple-700 leading-relaxed">{report.verdictDesc}</div>
        </div>

        <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-gray-600">⚡ 획 속도 및 남은 시간 지표 ({report.speed}%)</span>
              <span className="text-red-500">+{report.timePts}점</span>
            </div>
            <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
              <div className="bg-red-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${report.speed}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-gray-600">✏️ 획수 최적화 및 간결성 지표 ({report.strokeEff}%)</span>
              <span className="text-blue-500">+{report.strokePts}점</span>
            </div>
            <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${report.strokeEff}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-gray-600">📐 바운딩 박스 종횡비 & 대칭 균형 ({report.balance}%)</span>
              <span className="text-emerald-500">+{report.balancePts}점</span>
            </div>
            <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${report.balance}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-gray-600">🎯 Quick, Draw! 신경망 확신도 ({report.aiRank}%)</span>
              <span className="text-purple-600">+{report.rankPts}점</span>
            </div>
            <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
              <div className="bg-purple-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${report.aiRank}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-700 to-indigo-800 rounded-2xl text-white shadow-lg">
          <div className="flex flex-col">
            <span className="text-xs text-purple-200 font-bold uppercase tracking-wider">Earned Score</span>
            <span className="text-sm font-semibold">이번 라운드 획득 점수</span>
          </div>
          <div className="text-4xl font-black text-yellow-300 drop-shadow-md animate-pulse" style={{ fontFamily: 'Jua, sans-serif' }}>
            +{animatedTotal.toLocaleString()} P
          </div>
        </div>
      </Card>
    </div>
  )
}

function ScreenGame({
  role, round, timeLeft, currentKeyword, p1Name, p2Name, p1Candy, p2Candy, p1Score, p2Score, activePlayer, isTwoPlayer,
  onRoundComplete, onHome,
}: {
  role: '1P' | '2P'; round: number; timeLeft: number; currentKeyword: KeywordMap;
  p1Name: string; p2Name: string; p1Candy: number; p2Candy: number; p1Score: number; p2Score: number; activePlayer: ActivePlayer; isTwoPlayer: boolean;
  onRoundComplete: (score: number, success: boolean) => void; onHome: () => void
}) {
  const isMyTurn = !isTwoPlayer || role === activePlayer

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const last = useRef<{ x: number; y: number } | null>(null)
  const strokesRef = useRef<number[][][]>([])
  const currentStrokeRef = useRef<{ x: number[]; y: number[]; t: number[] }>({ x: [], y: [], t: [] })
  const strokeStartTimeRef = useRef<number>(0)
  
  const [aiMessage, setAiMessage] = useState<string>('그림을 기다리고 있습니다.')
  const [guesses, setGuesses] = useState<string[]>([])

  const [matchedCountdown, setMatchedCountdown] = useState<number | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [analysisReport, setAnalysisReport] = useState<MetricBreakdown | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    strokesRef.current = []
    setHasDrawn(false)
    setMatchedCountdown(null)
    setAnalysisReport(null)
    setGuesses([])
    setAiMessage(isMyTurn ? '당신의 차례입니다! 자유롭게 그려보세요 🎨' : `상대방(${activePlayer === '1P' ? p1Name : p2Name})이 그리고 있습니다. 관전 중! 👀`)
  }, [round, activePlayer, isMyTurn, p1Name, p2Name])

  useEffect(() => {
    if (matchedCountdown === null) return
    if (matchedCountdown <= 0) {
      const report = computeGeometricMetrics(true, 1)
      setAnalysisReport(report)
      setMatchedCountdown(null)
      return
    }
    const t = setTimeout(() => {
      setMatchedCountdown(c => (c !== null ? c - 1 : null))
    }, 1000)
    return () => clearTimeout(t)
  }, [matchedCountdown])

  useEffect(() => {
    if (timeLeft === 0 && matchedCountdown === null && analysisReport === null) {
      const report = computeGeometricMetrics(false, 0)
      setAnalysisReport(report)
    }
  }, [timeLeft, matchedCountdown, analysisReport])

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return { x: Math.round((e.clientX - r.left) * (c.width / r.width)), y: Math.round((e.clientY - r.top) * (c.height / r.height)) }
  }

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || analysisReport !== null) return

    if (matchedCountdown !== null) {
      setMatchedCountdown(null)
      setAiMessage('수정 중... 선을 떼면 AI가 다시 판정합니다. ✏️')
    }

    setDrawing(true)
    setHasDrawn(true)
    const pos = getPos(e)
    last.current = pos
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
    if (tool === 'pen') { strokeStartTimeRef.current = Date.now(); currentStrokeRef.current = { x: [pos.x], y: [pos.y], t: [0] } }
  }

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || !drawing || !canvasRef.current || !last.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e)
    ctx.lineWidth = tool === 'eraser' ? 35 : 8
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : '#2B1A40'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    last.current = pos
    if (tool === 'pen') {
      currentStrokeRef.current.x.push(pos.x)
      currentStrokeRef.current.y.push(pos.y)
      currentStrokeRef.current.t.push(Date.now() - strokeStartTimeRef.current)
    }
  }

  const onUp = () => {
    if (!isMyTurn || !drawing) return
    setDrawing(false)
    last.current = null
    if (tool === 'pen' && currentStrokeRef.current.x.length > 0) {
      strokesRef.current.push([currentStrokeRef.current.x, currentStrokeRef.current.y, currentStrokeRef.current.t])
      fetchQuickDrawPrediction()
    }
  }

  const normalizeStrokes = (rawStrokes: number[][][]) => {
    if (rawStrokes.length === 0) return []
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    rawStrokes.forEach(stroke => {
      const xs = stroke[0], ys = stroke[1]
      for (let i = 0; i < xs.length; i++) {
        if (xs[i] < minX) minX = xs[i]; if (xs[i] > maxX) maxX = xs[i]
        if (ys[i] < minY) minY = ys[i]; if (ys[i] > maxY) maxY = ys[i]
      }
    })
    const width = maxX - minX || 1, height = maxY - minY || 1
    const maxDim = Math.max(width, height), scale = 230 / maxDim
    return rawStrokes.map(stroke => [
      stroke[0].map(x => Math.round((x - minX) * scale + (255 - width * scale) / 2)),
      stroke[1].map(y => Math.round((y - minY) * scale + (255 - height * scale) / 2)),
      stroke[2]
    ])
  }

  const computeGeometricMetrics = (isMatchedResult: boolean, rank: number): MetricBreakdown => {
    const rawStrokes = strokesRef.current
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    let totalPoints = 0

    rawStrokes.forEach(stroke => {
      const xs = stroke[0], ys = stroke[1]
      totalPoints += xs.length
      for (let i = 0; i < xs.length; i++) {
        if (xs[i] < minX) minX = xs[i]; if (xs[i] > maxX) maxX = xs[i]
        if (ys[i] < minY) minY = ys[i]; if (ys[i] > maxY) maxY = ys[i]
      }
    })

    const w = (maxX !== -Infinity && minX !== Infinity) ? Math.max(1, maxX - minX) : 1
    const h = (maxY !== -Infinity && minY !== Infinity) ? Math.max(1, maxY - minY) : 1
    const strokeCount = rawStrokes.length || 0

    const curTime = isNaN(timeLeft) ? 0 : timeLeft
    const speedRatio = Math.round((curTime / 20) * 100)
    const timePts = isMatchedResult ? Math.round(curTime * 25) : 0

    let strokeEff = 50
    let strokePts = 80
    if (strokeCount >= 3 && strokeCount <= 10) { strokeEff = 100; strokePts = 200 }
    else if (strokeCount > 10 && strokeCount <= 18) { strokeEff = 75; strokePts = 130 }
    else if (strokeCount > 0) { strokeEff = 40; strokePts = 50 }

    const minSide = Math.min(w, h), maxSide = Math.max(w, h, 1)
    const balanceRatio = Math.round(Math.max(0, Math.min(1, minSide / maxSide)) * 100)
    const balancePts = Math.round((balanceRatio / 100) * 150)

    let aiRankRate = 0
    let rankPts = 0
    if (isMatchedResult) {
      if (rank === 1) { aiRankRate = 100; rankPts = 150 }
      else if (rank <= 3) { aiRankRate = 75; rankPts = 100 }
      else { aiRankRate = 50; rankPts = 50 }
    }

    const totalPts = isMatchedResult
      ? timePts + strokePts + balancePts + rankPts
      : Math.round(balancePts * 0.5)

    let vTitle = ''
    let vDesc = ''

    if (isMatchedResult) {
      if (rank === 1 && strokeCount <= 6) {
        vTitle = '🎯 최소 획 특징 포착 (Mastery)'
        vDesc = `단 ${strokeCount}개의 절제된 스트로크로 핵심 윤곽을 완벽히 살려 1순위로 즉각 통과했습니다.`
      } else if (timePts >= 350) {
        vTitle = '⚡ 초스피드 직관 드로잉 (Speedster)'
        vDesc = `번개같은 순발력으로 남은 시간 ${curTime}초를 확보하여 대량의 스피드 가산점을 획득했습니다.`
      } else {
        vTitle = '📐 안정적인 조형 밸런스 (Solid Balance)'
        vDesc = `너비와 높이의 종횡비율(${balanceRatio}%)이 자연스러워 형태 완성도 점수를 높게 평가받았습니다.`
      }
    } else {
      vTitle = '⏰ 제한시간 만료 (Time Out)'
      vDesc = '시간이 초과되었습니다. 사물의 외곽 형태를 조금 더 단순하고 과감하게 표현해 보세요.'
    }

    return {
      speed: speedRatio,
      strokeEff,
      balance: balanceRatio,
      aiRank: aiRankRate,
      timePts: isNaN(timePts) ? 0 : timePts,
      strokePts: isNaN(strokePts) ? 0 : strokePts,
      balancePts: isNaN(balancePts) ? 0 : balancePts,
      rankPts: isNaN(rankPts) ? 0 : rankPts,
      totalPts: isNaN(totalPts) ? 50 : totalPts,
      verdictTitle: vTitle,
      verdictDesc: vDesc,
    }
  }

  const fetchQuickDrawPrediction = async () => {
    if (strokesRef.current.length === 0 || analysisReport !== null) return
    setAiMessage('AI가 선과 형태를 실시간 분석 중... 🧐')
    try {
      const res = await fetch("https://inputtools.google.com/request?ime=handwriting&app=quickdraw", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input_type: 0, requests: [{ language: "quickdraw", writing_guide: { width: 256, height: 256 }, ink: normalizeStrokes(strokesRef.current) }] })
      })
      const data = await res.json()
      if (data?.[1]?.[0]?.[1]) {
        const rawTopGuesses: string[] = data[1][0][1].slice(0, 5)
        const koreanGuesses = rawTopGuesses.map(toKorean)
        setGuesses(koreanGuesses)

        const targetEn = currentKeyword.en.toLowerCase().replace(/[\s_\-]+/g, '')
        const matchIdx = rawTopGuesses.findIndex(g => g.toLowerCase().replace(/[\s_\-]+/g, '') === targetEn)
        const isTargetMatched = matchIdx !== -1 || koreanGuesses.includes(currentKeyword.ko)

        if (isTargetMatched) {
          setMatchedCountdown(3)
          setAiMessage(`🎉 정답! [ ${currentKeyword.ko} ] 일치 확인! (3초 유지 시 완료 / 펜 대면 수정)`)
        } else {
          setAiMessage(`혹시... ${koreanGuesses[0]} 인가요?! 🧐`)
        }
      }
    } catch {
      setAiMessage('네트워크 연결 상태를 확인해 주세요.')
    }
  }

  const clearCanvas = () => {
    if (!canvasRef.current || !isMyTurn || analysisReport !== null) return
    canvasRef.current.getContext('2d')!.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    strokesRef.current = []
    setHasDrawn(false); setGuesses([]); setMatchedCountdown(null); setAiMessage('캔버스가 초기화되었습니다.')
  }

  const handlePass = () => {
    const report = computeGeometricMetrics(false, 0)
    setAnalysisReport(report)
  }

  const R = 27, CIRC = 2 * Math.PI * R
  const curTime = isNaN(timeLeft) ? 0 : timeLeft
  const dashOff = CIRC * (1 - curTime / 20)
  const ringColor = curTime <= 5 ? '#FF6B6B' : curTime <= 10 ? '#FFD43B' : '#20C997'
  const warn = curTime <= 5

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#F4F0FA] relative">
      {showExitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#2B1A40]/70 backdrop-blur-sm p-6">
          <Card className="p-8 max-w-md w-full text-center flex flex-col items-center gap-4 border-4 border-white shadow-2xl animate-fade-in">
            <div className="text-5xl">⚠️</div>
            <h3 style={{ fontFamily: 'Jua, sans-serif' }} className="text-3xl text-[#2B1A40]">메인으로 나갈까요?</h3>
            <p className="text-sm font-bold text-gray-500">진행 중인 게임 및 점수가 초기화됩니다.</p>
            <div className="flex gap-4 mt-2 w-full justify-center">
              <button onClick={() => setShowExitConfirm(false)} className="px-6 py-3 rounded-2xl font-black bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">계속 그리기</button>
              <button onClick={onHome} className="px-6 py-3 rounded-2xl font-black bg-red-500 text-white hover:bg-red-600 transition-colors">종료하고 나가기</button>
            </div>
          </Card>
        </div>
      )}

      {analysisReport && (
        <AdvancedAnalysisModal
          report={analysisReport}
          onDone={() => {
            onRoundComplete(analysisReport.totalPts, analysisReport.aiRank > 0)
            setAnalysisReport(null)
          }}
        />
      )}

      <div className="flex items-center gap-6 px-8 py-5 flex-shrink-0 bg-white border-b-[6px] border-[#E9ECEF] shadow-sm">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="w-14 h-14 rounded-2xl bg-gray-100 hover:bg-red-50 hover:text-red-600 border-2 border-gray-300 text-2xl flex items-center justify-center font-bold text-gray-700 transition-all active:translate-y-1"
          title="홈으로 나가기"
        >🏠</button>

        <div className="flex items-center gap-3">
          <div className={`px-5 py-2.5 rounded-2xl font-black text-lg border-2 ${activePlayer === '1P' ? 'bg-[#FF6B6B] text-white border-[#E03131] shadow-[0_4px_0_#C92A2A]' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
            1P: {p1Name} ({(isNaN(p1Score) ? 0 : p1Score).toLocaleString()}P)
          </div>
          {isTwoPlayer && (
            <div className={`px-5 py-2.5 rounded-2xl font-black text-lg border-2 ${activePlayer === '2P' ? 'bg-[#845EF7] text-white border-[#5F3DC4] shadow-[0_4px_0_#5F3DC4]' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
              2P: {p2Name} ({(isNaN(p2Score) ? 0 : p2Score).toLocaleString()}P)
            </div>
          )}
        </div>

        <div className="flex-1" />

        <div className={`flex items-center gap-4 rounded-full px-10 py-3 border-[4px] shadow-md transition-all ${matchedCountdown !== null ? 'bg-emerald-100 border-emerald-500 scale-105' : 'bg-[#E6FCF5] border-[#63E6BE]'}`}>
          <span className="text-sm font-black text-[#08A073]">이번 턴 랜덤 제시어</span>
          <span style={{ fontFamily: 'Jua, sans-serif' }} className="text-3xl text-[#099268]">{currentKeyword.ko}</span>
          {matchedCountdown !== null && (
            <span className="bg-emerald-600 text-white font-black px-3 py-1 rounded-full text-sm ml-2 animate-pulse">
              정답 유지 중! ({matchedCountdown}초)
            </span>
          )}
        </div>

        <div className="flex-1" />

        <div className={`relative bg-gray-50 rounded-2xl p-2 border-2 border-gray-200 ${warn ? 'animate-bounce' : ''}`}>
          <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={32} cy={32} r={R} fill="none" stroke="#F1F3F5" strokeWidth={8} />
            <circle cx={32} cy={32} r={R} fill="none" stroke={ringColor} strokeWidth={8} strokeDasharray={CIRC} strokeDashoffset={dashOff} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontFamily: 'Jua, sans-serif' }} className={`text-2xl ${warn ? 'text-[#FF6B6B]' : 'text-[#2B1A40]'}`}>{curTime}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-6 p-8 overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div className={`flex-1 relative rounded-[2rem] overflow-hidden bg-white border-[6px] shadow-[inset_0_4px_20px_rgba(0,0,0,0.05)] transition-all ${matchedCountdown !== null ? 'border-emerald-400 ring-4 ring-emerald-300' : 'border-gray-200'}`}>
            <canvas
              ref={canvasRef} width={1200} height={750}
              className={`w-full h-full ${!isMyTurn ? 'pointer-events-none opacity-30' : ''}`}
              style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
            />

            {!isMyTurn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/10 backdrop-blur-[1px] select-none pointer-events-none">
                <div className="text-6xl mb-4 animate-bounce">👀</div>
                <div style={{ fontFamily: 'Jua, sans-serif' }} className="text-4xl text-[#2B1A40]">
                  {activePlayer === '1P' ? p1Name : p2Name}님의 턴입니다!
                </div>
                <div className="text-lg font-bold text-gray-500 mt-2">상대방의 그림을 관전하고 응원해 주세요!</div>
              </div>
            )}

            {isMyTurn && !hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-gray-300">내 차례입니다! 자유롭게 그려보세요 ✏️</span>
              </div>
            )}

            {matchedCountdown !== null && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                <div className="bg-emerald-600/95 text-white px-8 py-3 rounded-full font-black text-xl shadow-xl flex items-center gap-3 border-2 border-white animate-bounce-short">
                  <span>🎉 정답 일치! ({matchedCountdown}초 뒤 자동 심사)</span>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full">펜을 대면 다시 수정할 수 있습니다! ✏️</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-5 justify-center">
            <button onClick={() => setTool('pen')} disabled={!isMyTurn} className={`w-32 h-16 rounded-2xl font-black text-xl border-[4px] transition-all ${!isMyTurn ? 'opacity-40 cursor-not-allowed' : 'active:translate-y-1'} ${tool === 'pen' ? 'bg-[#FF6B6B] border-[#E03131] text-white shadow-[0_6px_0_#C92A2A]' : 'bg-white border-gray-200 text-gray-600 shadow-[0_6px_0_#E9ECEF]'}`}>✏️ 펜</button>
            <button onClick={() => setTool('eraser')} disabled={!isMyTurn} className={`w-32 h-16 rounded-2xl font-black text-xl border-[4px] transition-all ${!isMyTurn ? 'opacity-40 cursor-not-allowed' : 'active:translate-y-1'} ${tool === 'eraser' ? 'bg-[#FFD43B] border-[#F08C00] text-[#D9480F] shadow-[0_6px_0_#E67700]' : 'bg-white border-gray-200 text-gray-600 shadow-[0_6px_0_#E9ECEF]'}`}>🩹 지우개</button>
            <button onClick={clearCanvas} disabled={!isMyTurn} className="w-32 h-16 rounded-2xl font-black text-xl bg-white border-[4px] border-gray-200 text-gray-600 shadow-[0_6px_0_#E9ECEF] transition-all active:translate-y-1 disabled:opacity-40">초기화</button>
            <div className="ml-4"><ClayBtn color="purple" size="sm" onClick={handlePass}>PASS ⏭️</ClayBtn></div>
          </div>
        </div>

        <div className="w-96 flex flex-col gap-6 flex-shrink-0">
          <Card className="p-6 flex flex-col border-[4px] border-[#D0BFFF]">
            <div className="text-sm font-black text-[#845EF7] mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="text-xl">🤖</span> AI 실시간 추측</span>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">인식 가동 중</span>
            </div>

            <div className="bg-[#F3F0FF] p-4 rounded-2xl text-base font-bold text-[#5F3DC4] border-2 border-[#E5DBFF] mb-3">
              {aiMessage}
            </div>

            {guesses.length > 0 && (
              <div className="text-xs text-[#6741D9] bg-white p-3 rounded-xl border border-gray-200">
                <span className="font-black text-gray-500 block mb-1">인식 후보 TOP 3</span>
                <span className="font-bold">{guesses.slice(0, 3).join(', ')}</span>
              </div>
            )}
          </Card>

          <Card className="p-6 text-center border-[4px] border-[#FFE066] bg-gradient-to-b from-white to-[#FFF9DB]">
            <div className="text-sm font-black text-[#E67700] mb-3">누적 배틀 스코어</div>
            <div className="flex justify-around items-center my-2">
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-gray-500 mb-1">{p1Name} (1P)</span>
                <span style={{ fontFamily: 'Jua, sans-serif' }} className="text-3xl text-[#FF6B6B]">{(isNaN(p1Score) ? 0 : p1Score).toLocaleString()}P</span>
                <span className="text-xs font-bold text-gray-600">🍬 {isNaN(p1Candy) ? 0 : p1Candy}개</span>
              </div>
              {isTwoPlayer && (
                <>
                  <span className="text-2xl font-black text-gray-300">VS</span>
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-gray-500 mb-1">{p2Name} (2P)</span>
                    <span style={{ fontFamily: 'Jua, sans-serif' }} className="text-3xl text-[#845EF7]">{(isNaN(p2Score) ? 0 : p2Score).toLocaleString()}P</span>
                    <span className="text-xs font-bold text-gray-600">🍬 {isNaN(p2Candy) ? 0 : p2Candy}개</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ScreenLeaderboard({
  rankings = [],
  onDeleteOne,
}: {
  rankings?: RankItem[]
  onDeleteOne: (id: string, name: string) => void
}) {
  const safeRankings = Array.isArray(rankings) ? rankings.filter(Boolean) : []
  const top3 = safeRankings.slice(0, 3)
  const rest = safeRankings.slice(3)

  const badges = [
    { badge: '👑 1st', g1: '#FFE566', g2: '#FFB800', sh: '#CC9300' },
    { badge: '🥈 2nd', g1: '#E2E8F0', g2: '#A0AEC0', sh: '#718096' },
    { badge: '🥉 3rd', g1: '#F6AD55', g2: '#DD6B20', sh: '#C05621' },
  ]

  return (
    <div className="h-full w-full flex flex-col justify-between overflow-hidden p-6 relative bg-[#FDF9F1] box-border select-none">
      <ArcadeBackground />

      <div className="py-2 z-10 w-full text-center flex-shrink-0">
        <h2 style={{ fontFamily: 'Jua, sans-serif' }} className="text-4xl text-[#2B1A40] drop-shadow-sm">
          🏆 명예의 전당 랭킹 🏆
        </h2>
      </div>

      {safeRankings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center z-10">
          <div className="text-6xl mb-4 animate-bounce">🎨</div>
          <h3 style={{ fontFamily: 'Jua, sans-serif' }} className="text-3xl text-purple-950 mb-2">
            등록된 랭킹 기록이 없습니다!
          </h3>
          <p className="text-base font-bold text-purple-600/70">
            게임을 플레이하고 첫 번째 명예의 전당 주인공이 되어보세요!
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full z-10 min-h-0 py-2 gap-4">
          <div className="flex gap-4 px-2 items-end justify-center flex-shrink-0">
            {/* 2위 */}
            {top3[1] ? (
              <div
                className="relative flex-1 flex flex-col items-center rounded-3xl p-4 shadow-xl border-4 border-white h-48 justify-center group"
                style={{ background: `linear-gradient(145deg, ${badges[1].g1}, ${badges[1].g2})`, boxShadow: `0 10px 0 ${badges[1].sh}` }}
              >
                <button
                  onClick={() => onDeleteOne(top3[1]?.id ?? '', top3[1]?.name ?? '플레이어')}
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/20 hover:bg-black/40 text-white font-bold text-xs flex items-center justify-center transition-all opacity-40 hover:opacity-100"
                  title="기록 삭제"
                >✕</button>
                <div style={{ fontFamily: 'Jua, sans-serif' }} className="text-lg font-black text-white bg-black/20 px-3 py-0.5 rounded-full mb-1">{badges[1].badge}</div>
                <div style={{ fontFamily: 'Jua, sans-serif' }} className="text-2xl text-gray-900 font-black truncate max-w-[140px]">{top3[1]?.name ?? ''}</div>
                <div className="bg-white px-4 py-1 rounded-full text-base font-black text-gray-900 shadow-inner mt-1">
                  {(Number(top3[1]?.score) || 0).toLocaleString()} P
                </div>
                <div className="text-xs font-black text-gray-800 bg-white/40 px-3 py-0.5 rounded-lg mt-1">🍬 {Number(top3[1]?.candy) || 0}개</div>
              </div>
            ) : <div className="flex-1" />}

            {/* 1위 */}
            {top3[0] ? (
              <div
                className="relative flex-1 flex flex-col items-center rounded-3xl p-5 shadow-2xl border-4 border-white h-56 justify-center group -translate-y-2"
                style={{ background: `linear-gradient(145deg, ${badges[0].g1}, ${badges[0].g2})`, boxShadow: `0 12px 0 ${badges[0].sh}` }}
              >
                <button
                  onClick={() => onDeleteOne(top3[0]?.id ?? '', top3[0]?.name ?? '플레이어')}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/20 hover:bg-black/40 text-white font-bold text-xs flex items-center justify-center transition-all opacity-40 hover:opacity-100"
                  title="기록 삭제"
                >✕</button>
                <div style={{ fontFamily: 'Jua, sans-serif' }} className="text-xl font-black text-white bg-black/20 px-4 py-1 rounded-full mb-1">{badges[0].badge}</div>
                <div style={{ fontFamily: 'Jua, sans-serif' }} className="text-3xl text-gray-900 font-black truncate max-w-[160px]">{top3[0]?.name ?? ''}</div>
                <div className="bg-white px-5 py-1.5 rounded-full text-xl font-black text-gray-900 shadow-inner mt-1">
                  {(Number(top3[0]?.score) || 0).toLocaleString()} P
                </div>
                <div className="text-sm font-black text-gray-800 bg-white/40 px-3 py-0.5 rounded-lg mt-1">🍬 {Number(top3[0]?.candy) || 0}개</div>
              </div>
            ) : <div className="flex-1" />}

            {/* 3위 */}
            {top3[2] ? (
              <div
                className="relative flex-1 flex flex-col items-center rounded-3xl p-4 shadow-xl border-4 border-white h-44 justify-center group"
                style={{ background: `linear-gradient(145deg, ${badges[2].g1}, ${badges[2].g2})`, boxShadow: `0 10px 0 ${badges[2].sh}` }}
              >
                <button
                  onClick={() => onDeleteOne(top3[2]?.id ?? '', top3[2]?.name ?? '플레이어')}
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/20 hover:bg-black/40 text-white font-bold text-xs flex items-center justify-center transition-all opacity-40 hover:opacity-100"
                  title="기록 삭제"
                >✕</button>
                <div style={{ fontFamily: 'Jua, sans-serif' }} className="text-lg font-black text-white bg-black/20 px-3 py-0.5 rounded-full mb-1">{badges[2].badge}</div>
                <div style={{ fontFamily: 'Jua, sans-serif' }} className="text-2xl text-gray-900 font-black truncate max-w-[140px]">{top3[2]?.name ?? ''}</div>
                <div className="bg-white px-4 py-1 rounded-full text-base font-black text-gray-900 shadow-inner mt-1">
                  {(Number(top3[2]?.score) || 0).toLocaleString()} P
                </div>
                <div className="text-xs font-black text-gray-800 bg-white/40 px-3 py-0.5 rounded-lg mt-1">🍬 {Number(top3[2]?.candy) || 0}개</div>
              </div>
            ) : <div className="flex-1" />}
          </div>

          {/* 4위 이하 리스트 */}
          {rest.length > 0 && (
            <div className="flex flex-col gap-2 px-2 max-h-52 overflow-y-auto pr-1">
              {rest.map((p, i) => {
                if (!p) return null
                return (
                  <Card key={p.id || i} className="relative flex items-center gap-4 px-6 py-2.5 border-2 border-gray-100 shadow-sm flex-shrink-0">
                    <div style={{ fontFamily: 'Jua, sans-serif' }} className="text-xl text-gray-400 w-8 text-center">{i + 4}</div>
                    <div style={{ fontFamily: 'Jua, sans-serif' }} className="flex-1 text-lg text-[#2B1A40] truncate">{p.name || ''}</div>
                    <div className="font-black text-lg text-[#845EF7] bg-purple-50 px-3 py-0.5 rounded-lg">
                      {(Number(p.score) || 0).toLocaleString()} P
                    </div>
                    <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-lg">🍬 {Number(p.candy) || 0}개</div>
                    <button
                      onClick={() => onDeleteOne(p.id, p.name || '플레이어')}
                      className="w-6 h-6 rounded-full bg-gray-200 hover:bg-red-500 hover:text-white text-gray-500 font-bold text-xs flex items-center justify-center transition-colors ml-2"
                      title="기록 삭제"
                    >✕</button>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
      <div className="h-2" />
    </div>
  )
}

// ── App Root (점수 중복 등록 완벽 차단 & 커스텀 알림창 라우터) ─────────────
export default function App() {
  const getScreenMode = (): ScreenTarget => {
    if (typeof window === 'undefined') return 'a'
    const scr = new URLSearchParams(window.location.search).get('screen')
    if (scr === 'b') return 'b'
    if (scr === 'both') return 'both'
    return 'a'
  }

  const [screenMode, setScreenMode] = useState<ScreenTarget>(getScreenMode)
  const [cabA, setCabA] = useState<CabAState>('idle')
  const [cabB, setCabB] = useState<CabBState>('leaderboard')
  
  const [isTwoPlayer, setIsTwoPlayer] = useState(false)
  const [p1Name, setP1Name] = useState('1P')
  const [p2Name, setP2Name] = useState('2P')
  const [activePlayer, setActivePlayer] = useState<ActivePlayer>('1P')
  const [round, setRound] = useState(1)
  const [timeLeft, setTimeLeft] = useState(20)

  const [p1Candy, setP1Candy] = useState(0)
  const [p2Candy, setP2Candy] = useState(0)
  const [p1Score, setP1Score] = useState(0)
  const [p2Score, setP2Score] = useState(0)

  const [rankings, setRankings] = useState<RankItem[]>(getLocalRankings)
  const [gameKeywords, setGameKeywords] = useState<KeywordMap[]>(() => pickRandomKeywords(10))
  const [countdown, setCountdown] = useState<number | null>(null)

  // 커스텀 클레이 모달 상태
  const [customModal, setCustomModal] = useState<CustomModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
  })

  // ★ 점수 중복 저장 방지 플래그 (게임당 1회만 등록)
  const gameFinishedRef = useRef(false)
  const isPlayingGame = cabA === 'inGame' || cabB === 'inGame'

  useEffect(() => {
    const handlePopState = () => setScreenMode(getScreenMode())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!arcadeChannel) return

    const handleMessage = (e: MessageEvent) => {
      const { type, payload } = e.data

      if (type === 'REQUEST_2P_MODE') {
        setIsTwoPlayer(true)
        setCabA('waiting2P')
        setCabB('nickname2P')
        setGameKeywords(payload.keywords)
        setP1Name(payload.p1Name)
        gameFinishedRef.current = false
      } else if (type === 'P2_READY_TRIGGER') {
        setP2Name(payload.p2Name)
        startSimultaneousCountdown()
      } else if (type === 'START_GAME_NOW') {
        setCabA('inGame')
        setCabB(payload.isTwoPlayer ? 'inGame' : 'leaderboard')
        setCountdown(null)
        setRound(1)
        setTimeLeft(20)
        setP1Candy(0)
        setP2Candy(0)
        setP1Score(0)
        setP2Score(0)
        setActivePlayer('1P')
        gameFinishedRef.current = false
      } else if (type === 'NEXT_TURN') {
        setActivePlayer(payload.nextPlayer)
        setRound(payload.nextRound)
        setTimeLeft(20)
      } else if (type === 'UPDATE_SCORES') {
        setP1Candy(payload.p1Candy)
        setP2Candy(payload.p2Candy)
        setP1Score(payload.p1Score)
        setP2Score(payload.p2Score)
      } else if (type === 'UPDATE_RANKINGS') {
        setRankings(payload.rankings)
      } else if (type === 'GOTO_HOME') {
        setCabA('idle')
        setCabB('leaderboard')
        setIsTwoPlayer(false)
        setCountdown(null)
        gameFinishedRef.current = false
      }
    }

    arcadeChannel.addEventListener('message', handleMessage)
    return () => arcadeChannel.removeEventListener('message', handleMessage)
  }, [isTwoPlayer, activePlayer, p1Candy, p2Candy, p1Score, p2Score])

  const startSimultaneousCountdown = () => {
    setCountdown(3)
    let c = 3
    const interval = setInterval(() => {
      c -= 1
      if (c >= 0) {
        setCountdown(c)
      } else {
        clearInterval(interval)
        setCabA('inGame')
        setCabB(isTwoPlayer ? 'inGame' : 'leaderboard')
        setCountdown(null)
        setRound(1)
        setTimeLeft(20)
        setP1Candy(0)
        setP2Candy(0)
        setP1Score(0)
        setP2Score(0)
        setActivePlayer('1P')
        gameFinishedRef.current = false
        arcadeChannel?.postMessage({
          type: 'START_GAME_NOW',
          payload: { isTwoPlayer }
        })
      }
    }, 1000)
  }

  useEffect(() => {
    const isPlaying = (screenMode === 'a' && cabA === 'inGame') || (screenMode === 'b' && cabB === 'inGame') || (screenMode === 'both' && cabA === 'inGame')
    if (!isPlaying || countdown !== null || timeLeft <= 0) return

    const t = setInterval(() => setTimeLeft(n => Math.max(0, n - 1)), 1000)
    return () => clearInterval(t)
  }, [cabA, cabB, screenMode, countdown, timeLeft])

  // ★ 점수 저장 로직 (중복 등록 방지 가드 적용)
  const finishGameAndSaveRanking = (finalP1Score: number, finalP1Candy: number, finalP2Score: number, finalP2Candy: number) => {
    if (gameFinishedRef.current) return
    gameFinishedRef.current = true

    let updated = rankings
    if (!isTwoPlayer) {
      updated = saveLocalRanking({ name: p1Name, score: finalP1Score, candy: finalP1Candy })
      setRankings(updated)
      arcadeChannel?.postMessage({ type: 'UPDATE_RANKINGS', payload: { rankings: updated } })

      setCustomModal({
        isOpen: true,
        type: 'alert',
        icon: '🏆',
        title: '1인 챌린지 완주!',
        message: `${p1Name}님의 최종 점수: ${finalP1Score.toLocaleString()}P (🍬 ${finalP1Candy}개)\n명예의 전당 랭킹에 성공적으로 등록되었습니다!`,
        onConfirm: () => home(),
      })
    } else {
      updated = saveLocalRanking({ name: p1Name, score: finalP1Score, candy: finalP1Candy })
      updated = saveLocalRanking({ name: p2Name, score: finalP2Score, candy: finalP2Candy })
      setRankings(updated)
      arcadeChannel?.postMessage({ type: 'UPDATE_RANKINGS', payload: { rankings: updated } })

      const winnerText = finalP1Score > finalP2Score ? `🏆 ${p1Name} 승리!` : finalP1Score < finalP2Score ? `🏆 ${p2Name} 승리!` : '무승부!'
      setCustomModal({
        isOpen: true,
        type: 'alert',
        icon: '🥊',
        title: '1:1 드로잉 배틀 종료!',
        message: `${p1Name}: ${finalP1Score.toLocaleString()}P  VS  ${p2Name}: ${finalP2Score.toLocaleString()}P\n\n${winnerText}\n양쪽 플레이어의 점수가 랭킹에 등록되었습니다!`,
        onConfirm: () => home(),
      })
    }
  }

  const handleRoundComplete = (roundScore: number, success: boolean) => {
    const safeScore = isNaN(roundScore) ? 0 : roundScore
    let newP1Score = isNaN(p1Score) ? 0 : p1Score
    let newP2Score = isNaN(p2Score) ? 0 : p2Score
    let newP1Candy = isNaN(p1Candy) ? 0 : p1Candy
    let newP2Candy = isNaN(p2Candy) ? 0 : p2Candy

    if (activePlayer === '1P') {
      newP1Score += safeScore
      if (success) newP1Candy += 3
      setP1Score(newP1Score)
      setP1Candy(newP1Candy)
    } else {
      newP2Score += safeScore
      if (success) newP2Candy += 3
      setP2Score(newP2Score)
      setP2Candy(newP2Candy)
    }

    arcadeChannel?.postMessage({
      type: 'UPDATE_SCORES',
      payload: { p1Candy: newP1Candy, p2Candy: newP2Candy, p1Score: newP1Score, p2Score: newP2Score }
    })

    if (!isTwoPlayer) {
      if (round < 10) {
        setRound(r => r + 1)
        setTimeLeft(20)
      } else {
        finishGameAndSaveRanking(newP1Score, newP1Candy, newP2Score, newP2Candy)
      }
      return
    }

    const nextPlayer: ActivePlayer = activePlayer === '1P' ? '2P' : '1P'
    const nextRound = activePlayer === '2P' ? round + 1 : round

    if (nextRound > 5) {
      finishGameAndSaveRanking(newP1Score, newP1Candy, newP2Score, newP2Candy)
      return
    }

    setActivePlayer(nextPlayer)
    setRound(nextRound)
    setTimeLeft(20)

    arcadeChannel?.postMessage({
      type: 'NEXT_TURN',
      payload: { nextPlayer, nextRound }
    })
  }

  const handleSelect1PMode = () => {
    setIsTwoPlayer(false)
    setCabA('nickname1P')
    setCabB('leaderboard')
    gameFinishedRef.current = false
  }

  const handleSelect2PMode = () => {
    setIsTwoPlayer(true)
    setCabA('nickname1P')
    gameFinishedRef.current = false
  }

  const handleComplete1PName = (name: string) => {
    setP1Name(name)
    const newKeywords = pickRandomKeywords(10)
    setGameKeywords(newKeywords)

    if (!isTwoPlayer) {
      setCabB('leaderboard')
      startSimultaneousCountdown()
    } else {
      setCabA('waiting2P')
      setCabB('nickname2P')
      arcadeChannel?.postMessage({
        type: 'REQUEST_2P_MODE',
        payload: { keywords: newKeywords, p1Name: name }
      })
    }
  }

  const handleComplete2PName = (name: string) => {
    setP2Name(name)
    arcadeChannel?.postMessage({
      type: 'P2_READY_TRIGGER',
      payload: { p2Name: name }
    })
    startSimultaneousCountdown()
  }

  // 랭킹 삭제 커스텀 모달
  const handleDeleteRankingPrompt = (id: string, name: string) => {
    setCustomModal({
      isOpen: true,
      type: 'confirm',
      icon: '🗑️',
      title: '기록 삭제 확인',
      message: `'${name}' 님의 명예의 전당 기록을 삭제하시겠습니까?\n삭제된 기록은 복구할 수 없습니다.`,
      onConfirm: () => {
        const updated = deleteLocalRanking(id)
        setRankings(updated)
        arcadeChannel?.postMessage({
          type: 'UPDATE_RANKINGS',
          payload: { rankings: updated }
        })
      },
    })
  }

  const home = () => {
    setCabA('idle')
    setCabB('leaderboard')
    setIsTwoPlayer(false)
    setCountdown(null)
    gameFinishedRef.current = false
    arcadeChannel?.postMessage({ type: 'GOTO_HOME' })
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden select-none font-sans bg-black">
      {/* 커스텀 디자인 알림창 */}
      <CustomAlertModal
        modal={customModal}
        onClose={() => setCustomModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* 게임 진행 중이 아닐 때만 노출되는 모니터 전환 바 */}
      {!isPlayingGame && (
        <div className="absolute top-2 left-2 z-50 flex gap-2 opacity-30 hover:opacity-100 transition-opacity">
          <button onClick={() => { window.location.search = '?screen=a' }} className={`px-4 py-2 rounded-full text-sm font-bold ${screenMode === 'a' ? 'bg-[#FFD43B] text-[#D9480F]' : 'bg-white text-gray-700'}`}>1P 모니터</button>
          <button onClick={() => { window.location.search = '?screen=b' }} className={`px-4 py-2 rounded-full text-sm font-bold ${screenMode === 'b' ? 'bg-[#FFD43B] text-[#D9480F]' : 'bg-white text-gray-700'}`}>2P 모니터/랭킹</button>
        </div>
      )}

      {countdown !== null && <CountdownOverlay count={countdown} />}

      {/* ── [화면 1] Cabinet A (1P 모니터) ── */}
      {screenMode === 'a' && (
        <div className="w-full h-full bg-white relative">
          {cabA === 'idle' && <ScreenIdle onStart={() => setCabA('modeSelect')} />}
          
          {cabA === 'modeSelect' && (
            <ModeModal onClose={() => setCabA('idle')} on1P={handleSelect1PMode} on2P={handleSelect2PMode} />
          )}

          {cabA === 'nickname1P' && (
            <HangulKeyboard
              title="1P 플레이어 이름 등록"
              subtitle="명예의 전당 랭킹에 등록될 닉네임을 적어주세요!"
              onComplete={handleComplete1PName}
              onCancel={() => setCabA('modeSelect')}
            />
          )}

          {cabA === 'waiting2P' && (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-[#FDF9F1] relative">
              <ArcadeBackground />
              <button
                onClick={home}
                className="absolute top-6 right-8 w-12 h-12 rounded-full bg-white/80 hover:bg-red-50 text-gray-400 hover:text-red-500 font-black text-2xl flex items-center justify-center border-2 border-gray-200 shadow-sm transition-all z-20"
                title="대기 취소"
              >✕</button>
              <div className="text-7xl mb-6 animate-spin">⏳</div>
              <h2 style={{ fontFamily: 'Jua, sans-serif' }} className="text-4xl text-[#2B1A40]">{p1Name}님 등록 완료!</h2>
              <p className="text-2xl font-bold text-[#845EF7] mt-3">2P 플레이어가 보조 화면에서 이름을 입력하고 있습니다...</p>
              <p className="text-sm font-bold text-gray-400 mt-2">2P 등록이 끝나면 양쪽 모니터가 동시에 출발합니다!</p>
            </div>
          )}

          {cabA === 'inGame' && (
            <ScreenGame
              role="1P"
              round={round}
              timeLeft={timeLeft}
              currentKeyword={gameKeywords[(round - 1) % gameKeywords.length]}
              p1Name={p1Name}
              p2Name={p2Name}
              p1Candy={p1Candy}
              p2Candy={p2Candy}
              p1Score={p1Score}
              p2Score={p2Score}
              activePlayer={activePlayer}
              isTwoPlayer={isTwoPlayer}
              onRoundComplete={handleRoundComplete}
              onHome={home}
            />
          )}
        </div>
      )}

      {/* ── [화면 2] Cabinet B (2P 모니터 및 명예의 전당 랭킹) ── */}
      {screenMode === 'b' && (
        <div className="w-full h-full bg-white relative">
          {cabB === 'leaderboard' && (
            <ScreenLeaderboard
              rankings={rankings}
              onDeleteOne={handleDeleteRankingPrompt}
            />
          )}

          {cabB === 'nickname2P' && (
            <HangulKeyboard
              title="2P 플레이어 이름 등록"
              subtitle={`${p1Name}님과의 1:1 대결을 위해 2P 닉네임을 입력해 주세요!`}
              onComplete={handleComplete2PName}
              onCancel={home}
            />
          )}

          {cabB === 'inGame' && (
            <ScreenGame
              role="2P"
              round={round}
              timeLeft={timeLeft}
              currentKeyword={gameKeywords[(round - 1) % gameKeywords.length]}
              p1Name={p1Name}
              p2Name={p2Name}
              p1Candy={p1Candy}
              p2Candy={p2Candy}
              p1Score={p1Score}
              p2Score={p2Score}
              activePlayer={activePlayer}
              isTwoPlayer={isTwoPlayer}
              onRoundComplete={handleRoundComplete}
              onHome={home}
            />
          )}
        </div>
      )}

      {/* ── 개발용 (반반 분할 보기) ── */}
      {screenMode === 'both' && (
        <div className="flex w-full h-full bg-white">
          <div className="w-1/2 h-full border-r-[8px] border-[#2B1A40] relative">
            {cabA === 'idle' && <ScreenIdle onStart={() => setCabA('modeSelect')} />}
            {cabA === 'modeSelect' && <ModeModal onClose={() => setCabA('idle')} on1P={handleSelect1PMode} on2P={handleSelect2PMode} />}
            {cabA === 'nickname1P' && <HangulKeyboard title="1P 이름 등록" subtitle="닉네임을 적어주세요" onComplete={handleComplete1PName} onCancel={() => setCabA('modeSelect')} />}
            {cabA === 'waiting2P' && (
              <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-[#FDF9F1] relative">
                <button onClick={home} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white border text-gray-400 font-bold">✕</button>
                <div className="text-5xl mb-4 animate-spin">⏳</div>
                <h2 style={{ fontFamily: 'Jua, sans-serif' }} className="text-2xl text-[#2B1A40]">2P 플레이어 입력 대기 중...</h2>
              </div>
            )}
            {cabA === 'inGame' && (
              <ScreenGame
                role="1P" round={round} timeLeft={timeLeft} currentKeyword={gameKeywords[(round - 1) % gameKeywords.length]}
                p1Name={p1Name} p2Name={p2Name} p1Candy={p1Candy} p2Candy={p2Candy} p1Score={p1Score} p2Score={p2Score} activePlayer={activePlayer} isTwoPlayer={isTwoPlayer}
                onRoundComplete={handleRoundComplete} onHome={home}
              />
            )}
          </div>
          <div className="w-1/2 h-full relative">
            {cabB === 'leaderboard' && (
              <ScreenLeaderboard
                rankings={rankings}
                onDeleteOne={handleDeleteRankingPrompt}
              />
            )}
            {cabB === 'nickname2P' && <HangulKeyboard title="2P 이름 등록" subtitle="닉네임을 적어주세요" onComplete={handleComplete2PName} onCancel={home} />}
            {cabB === 'inGame' && (
              <ScreenGame
                role="2P" round={round} timeLeft={timeLeft} currentKeyword={gameKeywords[(round - 1) % gameKeywords.length]}
                p1Name={p1Name} p2Name={p2Name} p1Candy={p1Candy} p2Candy={p2Candy} p1Score={p1Score} p2Score={p2Score} activePlayer={activePlayer} isTwoPlayer={isTwoPlayer}
                onRoundComplete={handleRoundComplete} onHome={home}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}