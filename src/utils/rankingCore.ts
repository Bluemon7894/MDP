import type { RankItem } from '../types'

// 랭킹 규칙 (서버와 브라우저가 같이 쓴다): 이름마다 최고 기록 한 줄, 점수 내림차순 Top 10
// 서버는 모든 게임 기록(history)을 그대로 두고, 명예의 전당은 거기서 이 규칙으로 뽑는다

export const MAX_ENTRIES = 10

const nameKey = (name: string) => (name || '').trim().toLowerCase()

export const generateUniqueId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

// id 앞부분이 만든 시각이라 시각이 없는 예전 기록은 거기서 되살린다
const timeOf = (item: RankItem) => (typeof item.at === 'number' ? item.at : Number(String(item.id).split('_')[0]) || undefined)

/** 모든 게임 기록 정리 (중복 이름도 그대로 둔다), 최신순 */
export function sanitizeRecords(list: unknown): RankItem[] {
  if (!Array.isArray(list)) return []
  return list
    .filter((item): item is RankItem => !!item && typeof item.id === 'string' && typeof item.name === 'string' && !isNaN(Number(item.score)))
    .map(item => ({ id: item.id, name: item.name, score: Number(item.score), mode: item.mode, drawing: item.drawing, keyword: item.keyword, at: timeOf(item) }))
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
}

export function sanitizeRankings(list: unknown): RankItem[] {
  return dedupeRankings(sanitizeRecords(list))
}

export function dedupeRankings(list: RankItem[]) {
  const best = new Map<string, RankItem>()
  list.forEach(item => {
    const cur = best.get(nameKey(item.name))
    if (!cur || item.score > cur.score) best.set(nameKey(item.name), item)
  })
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES)
}

/** 같은 이름이 있으면 더 높은 점수일 때만 갱신한다 */
export function applyRecord(list: RankItem[], item: Omit<RankItem, 'id'>): RankItem[] {
  const score = isNaN(item.score) ? 0 : item.score
  const prev = list.find(it => nameKey(it.name) === nameKey(item.name))
  if (prev && prev.score >= score) return list
  return dedupeRankings([...list.filter(it => it !== prev), { ...item, score, id: prev?.id ?? generateUniqueId() }])
}

export function removeRecord(list: RankItem[], id: string) {
  return list.filter(item => String(item.id) !== String(id))
}

export function bestScoreIn(list: RankItem[], name: string): number | null {
  const hit = list.find(it => nameKey(it.name) === nameKey(name))
  return hit ? hit.score : null
}
