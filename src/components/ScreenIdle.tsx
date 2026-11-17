import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArcadeBackground, ArcadePaletteArt, ClayBtn } from './CommonUI'
import robotImg from '../img/AI.png'
import robotSurprisedImg from '../img/AI_surprised.png'
import { sound } from '../utils/sound'
import { RankItem } from '../types'
import { fetchGallery, GalleryItem } from '../utils/gallery'

// 부채꼴로 놓인 카드 세 장의 자리
const SLOTS = [
  'translate-x-[-252px] translate-y-3 -rotate-[6deg]',
  '-translate-y-2 z-10',
  'translate-x-[252px] translate-y-3 rotate-[6deg]',
]
const SWAP_MS = 3500

/** 사람들이 그린 그림을 무작위로 세 장 띄우고, 몇 초마다 한 장씩 바꾼다. 그림이 하나도 없으면 원래 로고 */
function DrawingShowcase({ rankings }: { rankings: RankItem[] }) {
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  useEffect(() => {
    let alive = true
    const load = () => fetchGallery().then(list => alive && setGallery(list))
    load()
    const t = setInterval(load, 60_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  // 갤러리 + 명예의 전당 그림 (갤러리가 아직 비어 있을 때도 보이게)
  const pool = useMemo(() => {
    const fromRanks: GalleryItem[] = rankings
      .filter(r => r.drawing)
      .map(r => ({ id: `rank_${r.id}`, drawing: r.drawing!, keyword: r.keyword ?? '', name: r.name, score: r.score }))
    const seen = new Set<string>()
    return [...gallery, ...fromRanks].filter(it => !seen.has(it.drawing) && seen.add(it.drawing))
  }, [gallery, rankings])

  const [shown, setShown] = useState<GalleryItem[]>([])
  useEffect(() => {
    if (!pool.length) return
    const pickOther = (current: GalleryItem[]) => {
      const rest = pool.filter(it => !current.some(c => c.id === it.id))
      const from = rest.length ? rest : pool
      return from[Math.floor(Math.random() * from.length)]
    }
    const first: GalleryItem[] = []
    for (let i = 0; i < Math.min(3, pool.length); i++) first.push(pickOther(first))
    setShown(first)
    if (pool.length <= 3) return
    let slot = 0
    const t = setInterval(() => {
      setShown(prev => {
        const next = [...prev]
        next[slot] = pickOther(prev)
        slot = (slot + 1) % next.length
        return next
      })
    }, SWAP_MS)
    return () => clearInterval(t)
  }, [pool])

  if (!pool.length) return <ArcadePaletteArt />

  const slots = shown.length === 1 ? [1] : shown.length === 2 ? [0, 2] : [0, 1, 2]
  return (
    <div className="relative w-[780px] h-56 flex items-center justify-center">
      {shown.map((it, i) => (
        <div key={i} className={`absolute ${SLOTS[slots[i]]}`}>
          <figure key={it.id} className="animate-card-in w-60 rounded-2xl bg-white border-2 border-ink p-2 shadow-[0_6px_0_var(--color-ink)]">
            <img src={it.drawing} alt={`${it.name}님이 그린 ${it.keyword}`} className="w-full aspect-[16/10] object-contain rounded-xl bg-white" />
            <figcaption className="flex items-baseline justify-between gap-2 px-1 pt-1.5">
              <span className="font-display text-lg text-ink truncate">{it.keyword}</span>
              <span className="font-ui text-xs text-graphite truncate">{it.name}</span>
            </figcaption>
          </figure>
        </div>
      ))}
    </div>
  )
}

export function ScreenIdle({ onStart, onPractice, rankings = [] }: { onStart: () => void; onPractice: () => void; rankings?: RankItem[] }) {
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center gap-10 overflow-hidden select-none">
      <ArcadeBackground />

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

        @keyframes robotBob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-robot {
          animation: robotBob 3s ease-in-out infinite;
        }

        /* ── 로봇 누르기: 움찔 → 덜덜 → 발광 ── */
        @keyframes robotJolt {
          0% { transform: translateY(0) scale(1); }
          35% { transform: translateY(-18px) scale(1.06, 0.95); }
          100% { transform: translateY(0) scale(1); }
        }
        .animate-robot-jolt { animation: robotJolt 0.22s ease-out; transform-origin: 50% 100%; }
        @keyframes robotShake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-4px, 1px) rotate(-3deg); }
          75% { transform: translate(4px, -1px) rotate(3deg); }
        }
        .animate-robot-shake { animation: robotShake 0.14s linear infinite; transform-origin: 50% 100%; }
        /* 발광: 펄쩍펄쩍 뛰고 좌우로 뒤집히며 마구 흔들린다 */
        @keyframes robotBerserk {
          0%   { transform: translate(0, 0) rotate(0deg) scale(1, 1); }
          12%  { transform: translate(-16px, -46px) rotate(-14deg) scale(-1.08, 1.08); }
          25%  { transform: translate(14px, 0) rotate(10deg) scale(-1.12, 0.88); }
          37%  { transform: translate(22px, -60px) rotate(18deg) scale(1.1, 1.1); }
          50%  { transform: translate(-8px, 0) rotate(-8deg) scale(1.15, 0.85); }
          62%  { transform: translate(-24px, -38px) rotate(-20deg) scale(-1.05, 1.12); }
          75%  { transform: translate(10px, 0) rotate(12deg) scale(-1.1, 0.9); }
          87%  { transform: translate(18px, -52px) rotate(15deg) scale(1.08, 1.08); }
          100% { transform: translate(0, 0) rotate(0deg) scale(1, 1); }
        }
        .animate-robot-berserk { animation: robotBerserk 0.42s linear infinite; transform-origin: 50% 100%; }
        @keyframes bubblePop {
          0% { transform: scale(0.6); }
          60% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        .animate-bubble-pop { animation: bubblePop 0.22s ease-out; transform-origin: 30px 100%; }
        @keyframes bubbleJitter {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1.05); }
          25% { transform: translate(-5px, 2px) rotate(-4deg) scale(1.12); }
          50% { transform: translate(4px, -3px) rotate(3deg) scale(1.02); }
          75% { transform: translate(-3px, -2px) rotate(-2deg) scale(1.1); }
        }
        .animate-bubble-jitter { animation: bubbleJitter 0.12s linear infinite; transform-origin: 30px 100%; }
        /* 누를 때마다 로봇 머리 위로 튀어 오르는 ?! */
        @keyframes markFly {
          0% { transform: translate(-50%, 0) rotate(var(--r)) scale(0.4); opacity: 0; }
          20% { opacity: 1; transform: translate(calc(-50% + var(--dx) * 0.3), -30px) rotate(var(--r)) scale(1.2); }
          100% { transform: translate(calc(-50% + var(--dx)), var(--dy)) rotate(calc(var(--r) * 2)) scale(0.9); opacity: 0; }
        }
        .animate-mark-fly { animation: markFly 0.9s cubic-bezier(0.2, 0.8, 0.3, 1) both; }
      `}</style>

      {/* 사람들이 그린 그림 (없으면 팔레트 로고) */}
      <div className="z-10 mt-6">
        <DrawingShowcase rankings={rankings} />
      </div>

      {/* 메인 타이틀 영역 */}
      <div className="text-center px-8 z-10 flex flex-col gap-5">
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

        {/* 부제: 제목과 같은 Jua 글꼴을 한 톤 낮춰 (테두리·점 없이 배경에 녹아들게) */}
        <p
          className="font-display tracking-wide text-[#6E5A8A]"
          style={{ fontSize: 'clamp(1.25rem, 1.8vw, 1.75rem)', textShadow: '2px 2px 0 #FFFFFF' }}
        >
          친구나 AI와 경쟁해서 최고 점수를 갱신해 보세요
        </p>
      </div>

      {/* 시작 버튼 + 연습 공간 */}
      <div className="z-10 mt-4 flex items-center gap-6">
        <ClayBtn color="coral" size="xl" sfx="start" onClick={onStart}>
          ▶ START GAME
        </ClayBtn>
        <ClayBtn color="purple" size="lg" sfx="click" onClick={onPractice}>
          연습하기
        </ClayBtn>
      </div>

      {/* ── 좌측 하단 로봇 캐릭터 & 말풍선 (누르면 ?!!?!?, 연타하면 발광) ── */}
      <TauntRobot />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 홈 화면 로봇: 누르면 놀란 얼굴로 "?!!?!?". 연타할수록 덜덜 떨다가
// 계속 두드리면 펄쩍펄쩍 뛰고 뒤집히고 얼굴이 번쩍번쩍 바뀌며 발광한다. 손을 떼면 진정한다.
// ─────────────────────────────────────────────────────────────────────────────
/** 이 간격 안에 다시 누르면 연타로 센다 */
const TAP_GAP_MS = 900
/** 마지막으로 누른 뒤 놀란 상태를 유지하는 시간 */
const SURPRISE_MS = 1400
/** 이만큼 연달아 누르면 덜덜 떤다 */
const SHAKE_TAPS = 3
/** 이만큼 연달아 누르면 발광한다 */
const BERSERK_TAPS = 7
const MARKS = ['?', '!', '?!', '!?', '!!', '??']

interface Mark {
  id: number
  text: string
  dx: number
  dy: number
  r: number
  size: number
}

function TauntRobot() {
  const [taps, setTaps] = useState(0)
  const [surprised, setSurprised] = useState(false)
  const [marks, setMarks] = useState<Mark[]>([])
  const [flicker, setFlicker] = useState(false)
  const tapsRef = useRef(0)
  const lastTapRef = useRef(0)
  const markIdRef = useRef(0)
  const calmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (calmTimerRef.current) clearTimeout(calmTimerRef.current)
  }, [])

  const calmDown = () => {
    tapsRef.current = 0
    setTaps(0)
    setSurprised(false)
  }

  const poke = () => {
    const now = Date.now()
    const next = now - lastTapRef.current <= TAP_GAP_MS ? tapsRef.current + 1 : 1
    lastTapRef.current = now
    tapsRef.current = next
    if (calmTimerRef.current) clearTimeout(calmTimerRef.current)

    sound.playRobotPoke(Math.min(next, 9))
    setTaps(next)
    setSurprised(true)
    calmTimerRef.current = setTimeout(calmDown, SURPRISE_MS)

    // 머리 위로 ?! 가 튀어 오른다 (많이 누를수록 더 많이, 더 크게)
    const count = next >= BERSERK_TAPS ? 3 : next >= SHAKE_TAPS ? 2 : 1
    const born = Array.from({ length: count }, () => ({
      id: ++markIdRef.current,
      text: MARKS[Math.floor(Math.random() * MARKS.length)],
      dx: (Math.random() - 0.3) * 260,
      dy: -(120 + Math.random() * 160),
      r: (Math.random() - 0.5) * 50,
      size: (next >= BERSERK_TAPS ? 44 : 32) + Math.random() * 18,
    }))
    setMarks(list => [...list.slice(-24), ...born])
    window.setTimeout(() => setMarks(list => list.filter(m => !born.includes(m))), 950)
  }

  // 단계: 0 평소, 1 놀람, 2 덜덜, 3 발광
  const stage = !surprised ? 0 : taps >= BERSERK_TAPS ? 3 : taps >= SHAKE_TAPS ? 2 : 1
  const text = ['나를 이기다.', '?!!?!?', '?!!?!?!!?', '?!?!!?!?!!?!'][stage]

  // 발광 중에는 웃는 얼굴과 놀란 얼굴이 번쩍번쩍 바뀐다
  useEffect(() => {
    if (stage !== 3) {
      setFlicker(false)
      return
    }
    const t = setInterval(() => setFlicker(f => !f), 90)
    return () => clearInterval(t)
  }, [stage])

  const openMouth = surprised && !flicker
  // 누를 때마다 움찔 (taps 를 key 로 걸어 애니메이션을 다시 건다)
  const motion = stage === 3 ? 'animate-robot-berserk' : stage === 2 ? 'animate-robot-shake' : stage === 1 ? 'animate-robot-jolt' : ''

  return (
    <div className="absolute bottom-0 left-0 z-20 flex flex-col items-start pointer-events-none animate-robot">
      {/* 말풍선 */}
      <div
        className={`relative ml-16 mb-2 px-5 py-2.5 rounded-2xl border-4 border-[#2B1A40] shadow-[0_6px_0_#2B1A40] ${
          stage === 3 ? 'bg-[#FF6B6B] animate-bubble-jitter' : 'bg-white'
        } ${stage === 1 || stage === 2 ? 'animate-bubble-pop' : ''}`}
        key={stage === 3 ? 'berserk' : taps}
      >
        <span
          style={{ fontFamily: 'Jua, sans-serif' }}
          className={`tracking-wide font-black ${stage === 3 ? 'text-3xl text-white' : stage > 0 ? 'text-3xl text-[#2B1A40]' : 'text-2xl text-[#2B1A40]'}`}
        >
          {text}
        </span>
        {/* 말풍선 아래쪽 꼬리침 */}
        <div className="absolute -bottom-3 left-8 w-0 h-0 border-x-8 border-x-transparent border-t-[12px] border-t-[#2B1A40]" />
        <div
          className={`absolute -bottom-1.5 left-[34px] w-0 h-0 border-x-[6px] border-x-transparent border-t-[9px] ${stage === 3 ? 'border-t-[#FF6B6B]' : 'border-t-white'}`}
        />
      </div>

      {/* 로봇 이미지 (이 부분만 누를 수 있다) */}
      <button
        type="button"
        aria-label="로봇 누르기"
        onPointerDown={poke}
        className="relative pointer-events-auto -ml-2 -mb-2 cursor-pointer touch-manipulation"
      >
        {/* 튀어 오르는 ?! */}
        {marks.map(m => (
          <span
            key={m.id}
            className="absolute left-1/2 top-6 pointer-events-none font-display text-[#FF6B6B] animate-mark-fly"
            style={
              {
                fontSize: m.size,
                WebkitTextStroke: '2px #2B1A40',
                textShadow: '3px 3px 0 #2B1A40',
                '--dx': `${m.dx}px`,
                '--dy': `${m.dy}px`,
                '--r': `${m.r}deg`,
              } as React.CSSProperties
            }
          >
            {m.text}
          </span>
        ))}
        <img
          key={stage === 1 ? taps : stage}
          src={openMouth ? robotSurprisedImg : robotImg}
          alt={openMouth ? '놀란 AI 로봇' : 'AI 도발 로봇'}
          draggable={false}
          className={`w-56 h-auto md:w-64 object-contain drop-shadow-2xl select-none ${motion}`}
          style={stage === 3 ? { filter: 'drop-shadow(0 0 18px rgba(255, 70, 70, 0.85))' } : undefined}
        />
      </button>
    </div>
  )
}
