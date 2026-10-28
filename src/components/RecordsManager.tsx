import { useEffect, useMemo, useState } from 'react'
import { GameMode, RankItem } from '../types'
import { clearAllRecords, deleteRecord, fetchRecords, RecordsState, renameRecord } from '../utils/storage'
import { onRankingsChanged } from '../utils/arcadeSync'
import { ArcadeBackground } from './CommonUI'
import { MODE_LABEL, ModeChip } from './ModeChip'
import { BackButton, Button, Label, Overlay, Panel } from './ui'

type ModeFilter = 'all' | GameMode | 'none'
type Sort = 'latest' | 'score'

const FILTERS: { id: ModeFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'solo', label: MODE_LABEL.solo },
  { id: 'pvp', label: MODE_LABEL.pvp },
  { id: 'coop', label: MODE_LABEL.coop },
  { id: 'ai', label: MODE_LABEL.ai },
  { id: 'none', label: '모드 없음' },
]

const two = (n: number) => String(n).padStart(2, '0')
const formatTime = (at?: number) => {
  if (!at) return '-'
  const d = new Date(at)
  return `${d.getMonth() + 1}/${d.getDate()} ${two(d.getHours())}:${two(d.getMinutes())}`
}
const isToday = (at?: number) => !!at && new Date(at).toDateString() === new Date().toDateString()

/** 모든 게임 기록 보기·고치기·지우기 (명예의 전당 화면에서 연다) */
export function RecordsManager({ onClose, onRankings }: { onClose: () => void; onRankings: (list: RankItem[]) => void }) {
  const [records, setRecords] = useState<RankItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<ModeFilter>('all')
  const [sort, setSort] = useState<Sort>('latest')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = () =>
    fetchRecords().then(list => {
      setFailed(list === null)
      if (list) setRecords(list)
    })

  // 다른 화면에서 게임이 끝나 기록이 늘면 다시 불러온다
  useEffect(() => {
    load()
    return onRankingsChanged(() => load())
  }, [])

  const apply = async (job: Promise<RecordsState | null>) => {
    setBusy(true)
    const res = await job
    setBusy(false)
    if (!res) {
      setFailed(true)
      return
    }
    setRecords(res.records)
    onRankings(res.rankings)
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (records ?? [])
      .filter(r => (mode === 'all' ? true : mode === 'none' ? !r.mode : r.mode === mode))
      .filter(r => !q || r.name.toLowerCase().includes(q) || (r.keyword ?? '').toLowerCase().includes(q))
      .sort((a, b) => (sort === 'score' ? b.score - a.score : (b.at ?? 0) - (a.at ?? 0)))
  }, [records, query, mode, sort])

  const all = records ?? []
  const today = all.filter(r => isToday(r.at)).length
  const avg = all.length ? Math.round(all.reduce((s, r) => s + r.score, 0) / all.length) : 0

  return (
    // 명예의 전당 위를 통째로 덮는다
    <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-paper font-ui text-ink select-none">
      <ArcadeBackground />

      {confirmClear && (
        <Overlay>
          <Panel className="w-[480px] p-10">
            <h3 className="font-display text-3xl">모든 기록을 지울까요?</h3>
            <p className="text-graphite mt-3 leading-relaxed">
              전체 기록 {all.length.toLocaleString()}건과 명예의 전당이 모두 사라집니다.
              <br />
              지운 기록은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3 mt-8 justify-end">
              <Button variant="secondary" onClick={() => setConfirmClear(false)}>취소</Button>
              <Button
                disabled={busy}
                onClick={async () => {
                  await apply(clearAllRecords())
                  setConfirmClear(false)
                }}
              >
                모두 지우기
              </Button>
            </div>
          </Panel>
        </Overlay>
      )}

      <div className="relative w-full max-w-6xl mx-auto px-10 pt-8 pb-6 flex-1 flex flex-col min-h-0">
        <header className="flex items-end justify-between gap-6">
          <div>
            <BackButton onClick={onClose}>명예의 전당으로</BackButton>
            <h1 className="font-display text-5xl mt-2">전체 기록</h1>
          </div>
          <div className="flex gap-6 pb-1 text-right">
            {[
              ['전체', `${all.length.toLocaleString()}판`],
              ['오늘', `${today.toLocaleString()}판`],
              ['평균', `${avg.toLocaleString()}점`],
            ].map(([k, v]) => (
              <div key={k}>
                <Label>{k}</Label>
                <div className="font-display text-3xl tabular-nums">{v}</div>
              </div>
            ))}
          </div>
        </header>

        {/* 찾기 · 모드 · 정렬 */}
        <div className="mt-6 flex items-center gap-3 whitespace-nowrap">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="이름이나 제시어로 찾기"
            className="h-11 w-60 shrink-0 px-4 rounded-xl bg-white border-2 border-line font-ui text-base outline-none focus:border-violet/60"
          />
          <div className="flex bg-white border-2 border-line rounded-xl p-1 min-w-0 overflow-x-auto [scrollbar-width:none]">
            {FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setMode(f.id)}
                className={`h-8 px-3 rounded-lg text-sm font-bold transition-colors ${mode === f.id ? 'bg-ink text-white' : 'text-graphite hover:bg-paper'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex bg-white border-2 border-line rounded-xl p-1 shrink-0">
            {(['latest', 'score'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={`h-8 px-3 rounded-lg text-sm font-bold transition-colors ${sort === s ? 'bg-ink text-white' : 'text-graphite hover:bg-paper'}`}
              >
                {s === 'latest' ? '최신순' : '점수순'}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" onClick={() => setConfirmClear(true)} disabled={!all.length}>
            전체 초기화
          </Button>
        </div>

        {/* 목록 */}
        <div className="mt-4 flex-1 min-h-0 bg-white rounded-3xl border-2 border-line overflow-y-auto">
          {failed ? (
            <div className="h-full flex items-center justify-center text-graphite text-lg">서버에 연결하지 못해 전체 기록을 불러올 수 없습니다.</div>
          ) : records === null ? (
            <div className="h-full flex items-center justify-center text-graphite text-lg">불러오는 중</div>
          ) : shown.length === 0 ? (
            <div className="h-full flex items-center justify-center text-graphite text-lg">{all.length ? '조건에 맞는 기록이 없습니다.' : '아직 기록이 없습니다.'}</div>
          ) : (
            shown.map(r => (
              <div key={r.id} className="flex items-center gap-5 px-6 py-3 border-b-2 border-line last:border-0">
                <div className="w-24 shrink-0 aspect-[16/10] rounded-lg border border-line bg-white overflow-hidden flex items-center justify-center">
                  {r.drawing ? (
                    <img src={r.drawing} alt={`${r.name}의 그림`} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[11px] text-graphite/60">그림 없음</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {editing?.id === r.id ? (
                    <form
                      className="flex items-center gap-2"
                      onSubmit={async e => {
                        e.preventDefault()
                        if (!editing.name.trim()) return
                        await apply(renameRecord(r.id, editing.name))
                        setEditing(null)
                      }}
                    >
                      <input
                        autoFocus
                        value={editing.name}
                        onChange={e => setEditing({ id: r.id, name: e.target.value })}
                        className="h-10 flex-1 min-w-0 px-3 rounded-lg border-2 border-violet/60 font-display text-xl outline-none"
                      />
                      <Button size="sm" type="submit" disabled={busy || !editing.name.trim()}>저장</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>취소</Button>
                    </form>
                  ) : (
                    <>
                      <div className="font-display text-2xl truncate">{r.name || '익명'}</div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-graphite">
                        <ModeChip mode={r.mode} className="h-6 px-2.5 text-xs" />
                        {r.keyword && <span className="truncate">최고 그림: {r.keyword}</span>}
                      </div>
                    </>
                  )}
                </div>

                <div className="w-28 text-right font-display text-3xl tabular-nums shrink-0">{r.score.toLocaleString()}</div>
                <div className="w-24 text-right text-sm text-graphite tabular-nums shrink-0">{formatTime(r.at)}</div>

                <div className="w-44 flex justify-end gap-2 shrink-0">
                  {deleting === r.id ? (
                    <>
                      <Button size="sm" disabled={busy} onClick={async () => {
                        await apply(deleteRecord(r.id))
                        setDeleting(null)
                      }}>
                        삭제
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setDeleting(null)}>취소</Button>
                    </>
                  ) : (
                    editing?.id !== r.id && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => setEditing({ id: r.id, name: r.name })}>이름</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleting(r.id)}>삭제</Button>
                      </>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <p className="mt-3 text-sm text-graphite">
          명예의 전당에는 이름마다 가장 높은 기록 하나만 올라갑니다. 여기서 기록을 지우거나 이름을 고치면 명예의 전당도 바로 바뀝니다.
        </p>
      </div>
    </div>
  )
}
