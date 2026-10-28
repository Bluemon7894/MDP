import { useEffect, useMemo, useState } from 'react'
import doodles from '../constants/aiDoodles.json'

// 배경: 점 모눈 스케치북 종이 + 가장자리에서 한 획씩 그려졌다 사라지는 사람 낙서 (Quick, Draw! 데이터셋)

const DOODLES = Object.values(doodles as Record<string, { strokes: number[][][] }>)
  .map(d => d.strokes)
  // 획이 너무 많으면 그려지는 데 오래 걸리고 지저분해 보인다
  .filter(s => s.length >= 2 && s.length <= 9)

const INKS = ['#FF6B6B', '#845EF7', '#12B886', '#F59F00', '#4DABF7', '#2B1A40']

// 낙서가 놓일 자리 (화면 비율 %). 가운데 콘텐츠 영역 바깥의 양옆 여백에만 둔다.
// 왼쪽 위(뒤로 가기·제목)와 왼쪽 아래(홈 화면 로봇)는 비운다
const SLOTS: { x: number; y: number; size: number }[] = [
  { x: 4, y: 30, size: 100 },
  { x: 3.5, y: 60, size: 95 },
  { x: 96, y: 14, size: 100 },
  { x: 96, y: 44, size: 105 },
  { x: 95.5, y: 74, size: 100 },
  { x: 82, y: 93, size: 90 },
]

const STROKE_MS = 420 // 획 하나 그리는 시간
const HOLD_MS = 3200 // 다 그린 뒤 머무는 시간
const FADE_MS = 900

interface Shown {
  key: number
  paths: string[]
  ink: string
  rotate: number
}

const pick = (): Shown => {
  const strokes = DOODLES[Math.floor(Math.random() * DOODLES.length)]
  return {
    key: Math.random(),
    paths: strokes.map(([xs, ys]) => xs.map((x, i) => `${i ? 'L' : 'M'}${x} ${ys[i]}`).join(' ')),
    ink: INKS[Math.floor(Math.random() * INKS.length)],
    rotate: Math.round((Math.random() - 0.5) * 24),
  }
}

// 한 낙서가 나타나서 사라질 때까지 (그리기 + 머무르기 + 사라지기)
const lifeOf = (d: Shown, still: boolean) => (still ? 0 : d.paths.length * STROKE_MS) + HOLD_MS + FADE_MS

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function DoodleSlot({ x, y, size, startDelay }: { x: number; y: number; size: number; startDelay: number }) {
  const [shown, setShown] = useState<Shown | null>(null)
  const still = useMemo(reducedMotion, [])

  // 가만히 두어도 계속 바뀐다. '애니메이션 줄이기'가 켜져 있으면 획을 그리는 움직임만 빼고 천천히 나타났다 사라진다
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const next = () => {
      const d = pick()
      setShown(d)
      t = setTimeout(next, lifeOf(d, still) + 400 + Math.random() * 1500)
    }
    t = setTimeout(next, startDelay)
    return () => clearTimeout(t)
  }, [still, startDelay])

  if (!shown) return null
  const life = lifeOf(shown, still)
  return (
    <svg
      key={shown.key}
      viewBox="-10 -10 276 276"
      width={size}
      height={size}
      className="absolute animate-doodle-life"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) rotate(${shown.rotate}deg)`,
        animationDuration: `${life}ms`,
      }}
      aria-hidden="true"
    >
      <g fill="none" stroke={shown.ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45">
        {shown.paths.map((d, i) => (
          <path
            key={i}
            d={d}
            pathLength={1}
            strokeDasharray="1"
            className={still ? '' : 'animate-doodle-draw'}
            style={{ animationDuration: `${STROKE_MS}ms`, animationDelay: `${i * STROKE_MS}ms`, strokeDashoffset: still ? 0 : undefined }}
          />
        ))}
      </g>
    </svg>
  )
}

export function SketchbookBackground() {
  // 모든 낙서가 한꺼번에 나타나지 않게 시작 시점을 흩뿌린다
  const delays = useMemo(() => SLOTS.map((_, i) => 300 + i * 900 + Math.random() * 600), [])
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none bg-[#FFFDF9]"
      style={{
        backgroundImage:
          'radial-gradient(rgba(43,26,64,0.09) 1.2px, transparent 1.6px), linear-gradient(135deg, #FFFDF9 0%, #FAF4FE 55%, #F2F7FD 100%)',
        backgroundSize: '26px 26px, 100% 100%',
      }}
    >
      {SLOTS.map((s, i) => (
        <DoodleSlot key={i} {...s} startDelay={delays[i]} />
      ))}
    </div>
  )
}
