import { useEffect, useMemo, useState } from 'react'
import { ArcadeBackground, ArcadePaletteArt, ClayBtn } from './CommonUI'
// 이미지 파일명 및 경로를 실제 위치에 맞게 확인해주세요 (예: ../img/AI.png)
import robotImg from '../img/AI.png'
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

        <p className="inline-flex items-center gap-3 mx-auto h-12 px-6 rounded-full bg-white border-2 border-line font-ui text-xl font-bold text-graphite">
          <span className="w-2.5 h-2.5 rounded-full bg-accent" />
          친구나 AI와 경쟁해서 최고 점수를 갱신해 보세요
        </p>
      </div>

      {/* 시작 버튼 + 연습 공간 */}
      <div className="z-10 mt-4 flex items-center gap-6">
        <ClayBtn color="coral" size="xl" onClick={onStart}>
          ▶ START GAME
        </ClayBtn>
        <ClayBtn color="purple" size="lg" onClick={onPractice}>
          연습하기
        </ClayBtn>
      </div>

      {/* ── 좌측 하단 로봇 캐릭터 & 말풍선 ── */}
      <div className="absolute bottom-0 left-0 z-20 flex flex-col items-start pointer-events-none animate-robot">
        {/* 말풍선 */}
        <div className="relative ml-16 mb-2 bg-white px-5 py-2.5 rounded-2xl border-4 border-[#2B1A40] shadow-[0_6px_0_#2B1A40]">
          <span
            style={{ fontFamily: 'Jua, sans-serif' }}
            className="text-2xl text-[#2B1A40] tracking-wide font-black"
          >
            나를 이기다.
          </span>
          {/* 말풍선 아래쪽 꼬리침 */}
          <div className="absolute -bottom-3 left-8 w-0 h-0 border-x-8 border-x-transparent border-t-[12px] border-t-[#2B1A40]" />
          <div className="absolute -bottom-1.5 left-[34px] w-0 h-0 border-x-[6px] border-x-transparent border-t-[9px] border-t-white" />
        </div>

        {/* 로봇 이미지 */}
        <img
          src={robotImg}
          alt="AI 도발 로봇"
          className="w-56 h-auto md:w-64 object-contain drop-shadow-2xl -ml-2 -mb-2"
        />
      </div>
    </div>
  )
}
