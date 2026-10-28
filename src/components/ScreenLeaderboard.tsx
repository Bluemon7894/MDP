import { useEffect, useRef, useState } from 'react'
import { RankItem } from '../types'
import { ArcadeBackground } from './CommonUI'
import { Button, Label, Screen } from './ui'
import { RecordsManager } from './RecordsManager'
import { ModeChip } from './ModeChip'

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="기록 삭제"
      className="text-sm font-semibold text-graphite hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
    >
      삭제
    </button>
  )
}

// 1~3위: 그 게임에서 가장 점수가 높았던 그림을 액자처럼 건다
function PodiumCard({ item, place, onDelete }: { item: RankItem; place: 1 | 2 | 3; onDelete: () => void }) {
  const first = place === 1
  return (
    <div className={`group relative flex flex-col ${first ? 'w-[36%] -mt-6' : 'w-[29%] mt-6'}`}>
      <div
        className={`relative rounded-3xl bg-white border-2 p-3 ${
          first ? 'border-ink shadow-[0_10px_0_var(--color-ink)]' : 'border-line shadow-[0_8px_0_var(--color-line)]'
        }`}
      >
        <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-white border border-line">
          {item.drawing ? (
            <img src={item.drawing} alt={`${item.name}의 그림${item.keyword ? ` · ${item.keyword}` : ''}`} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-graphite/60 font-display text-xl bg-paper">저장된 그림 없음</div>
          )}
          {item.keyword && (
            <span className="absolute left-3 bottom-3 px-3 h-7 inline-flex items-center rounded-full bg-white/90 border border-line text-sm font-bold">
              {item.keyword}
            </span>
          )}
        </div>
        <span
          className={`absolute -top-5 -left-4 w-14 h-14 rounded-full flex items-center justify-center font-display text-3xl border-2 ${
            first ? 'bg-accent text-white border-ink shadow-[0_4px_0_var(--color-ink)]' : 'bg-white text-violet border-line shadow-[0_4px_0_var(--color-line)]'
          }`}
        >
          {place}
        </span>
      </div>

      <div className="px-2 pt-5">
        <div className="flex items-center justify-between gap-3">
          <span className={`font-display truncate ${first ? 'text-4xl' : 'text-3xl'}`}>{item.name || '익명'}</span>
          <DeleteButton onClick={onDelete} />
        </div>
        <div className="flex items-center justify-between gap-3 mt-2">
          <span className={`font-display tabular-nums ${first ? 'text-5xl text-accent' : 'text-4xl'}`}>
            {(Number(item.score) || 0).toLocaleString()}
            <span className="text-lg text-graphite ml-1">점</span>
          </span>
          <ModeChip mode={item.mode} />
        </div>
      </div>
    </div>
  )
}

export default function ScreenLeaderboard({
  rankings = [],
  onDeleteOne,
  onRankings,
}: {
  rankings?: RankItem[]
  onDeleteOne: (id: string, name: string) => void
  /** 전체 기록 관리에서 기록을 고치거나 지웠을 때 바뀐 명예의 전당 */
  onRankings: (list: RankItem[]) => void
}) {
  const [managing, setManaging] = useState(false)
  const safeRankings = Array.isArray(rankings) ? rankings.filter(Boolean) : []
  const top3 = safeRankings.slice(0, 3)
  const rest = safeRankings.slice(3)
  // 시상대 순서: 2위 · 1위 · 3위
  const podium = [top3[1] && { item: top3[1], place: 2 as const }, top3[0] && { item: top3[0], place: 1 as const }, top3[2] && { item: top3[2], place: 3 as const }].filter(Boolean) as {
    item: RankItem
    place: 1 | 2 | 3
  }[]

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isHoveredRef = useRef(false)

  // 4위 이하가 많으면 천천히 위아래로 자동 스크롤
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el || rest.length <= 3) return

    let animationFrameId: number
    let timeoutId: ReturnType<typeof setTimeout>
    let direction: 'down' | 'up' = 'down'
    let isPaused = false

    const step = () => {
      if (!isPaused && !isHoveredRef.current) {
        const maxScroll = el.scrollHeight - el.clientHeight
        if (maxScroll > 0) {
          el.scrollTop += direction === 'down' ? 0.8 : -1.2
          const atEnd = direction === 'down' ? el.scrollTop >= maxScroll - 1 : el.scrollTop <= 1
          if (atEnd) {
            isPaused = true
            timeoutId = setTimeout(() => {
              direction = direction === 'down' ? 'up' : 'down'
              isPaused = false
            }, 2200)
          }
        }
      }
      animationFrameId = requestAnimationFrame(step)
    }

    timeoutId = setTimeout(() => {
      animationFrameId = requestAnimationFrame(step)
    }, 2000)

    return () => {
      cancelAnimationFrame(animationFrameId)
      clearTimeout(timeoutId)
    }
  }, [rest.length])

  return (
    <Screen className="flex flex-col">
      <ArcadeBackground />
      {managing && <RecordsManager onClose={() => setManaging(false)} onRankings={onRankings} />}
      <div className="relative w-full max-w-6xl mx-auto px-12 pt-12 pb-10 flex-1 flex flex-col min-h-0">
        <div className="flex items-end justify-between">
          <div>
            <Label>이름마다 최고 기록 하나만 남습니다</Label>
            <h1 className="font-display text-6xl mt-2">명예의 전당</h1>
          </div>
          <div className="flex items-center gap-4 pb-1">
            <span className="font-display text-xl text-graphite">상위 {safeRankings.length || 0}명</span>
            <Button variant="secondary" size="sm" onClick={() => setManaging(true)}>전체 기록 관리</Button>
          </div>
        </div>

        {safeRankings.length === 0 ? (
          <div className="mt-10 flex-1 max-h-[420px] rounded-3xl border-2 border-dashed border-line bg-white/60 flex flex-col items-center justify-center text-center">
            <div className="font-display text-4xl">아직 기록이 없습니다</div>
            <p className="text-graphite mt-3 text-lg">첫 번째 그림의 주인공이 되어 보세요.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-center gap-[3%] mt-12">
              {podium.map(({ item, place }) => (
                <PodiumCard key={item.id} item={item} place={place} onDelete={() => onDeleteOne(item.id, item.name || '익명')} />
              ))}
            </div>

            {rest.length > 0 && (
              <div
                ref={scrollContainerRef}
                onMouseEnter={() => { isHoveredRef.current = true }}
                onMouseLeave={() => { isHoveredRef.current = false }}
                onTouchStart={() => { isHoveredRef.current = true }}
                onTouchEnd={() => { isHoveredRef.current = false }}
                className="mt-10 min-h-0 shrink max-h-[260px] bg-white rounded-3xl border-2 border-line overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {rest.map((p, i) => (
                  <div key={p.id || i} className="group flex items-center gap-6 px-8 h-16 border-b-2 border-line last:border-0">
                    <span className="w-8 font-display text-2xl text-graphite tabular-nums">{i + 4}</span>
                    <span className="flex-1 font-display text-2xl truncate">{p.name || '익명'}</span>
                    <DeleteButton onClick={() => onDeleteOne(p.id, p.name || '익명')} />
                    <ModeChip mode={p.mode} />
                    <span className="w-36 text-right font-display text-2xl tabular-nums">{(Number(p.score) || 0).toLocaleString()}점</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Screen>
  )
}
