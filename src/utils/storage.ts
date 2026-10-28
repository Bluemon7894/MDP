import { RankItem } from '../types'
import { applyRecord, removeRecord, sanitizeRankings, sanitizeRecords } from './rankingCore'

// 랭킹은 서버(/api/rankings, vite.config.ts 의 arcadeServer)에 저장해서 Chrome 계정·브라우저가 달라도 같이 본다.
// localStorage 는 서버 응답을 기억해 두는 캐시이자, 서버가 없을 때(정적 배포)의 대체 저장소다.

const CACHE_KEY = 'arcade_ranking_board_v5'
const MIGRATED_KEY = 'arcade_ranking_migrated_v1'
const BACKUP_KEY = 'arcade_ranking_backup_v1'

function readCache(): RankItem[] {
  if (typeof window === 'undefined') return []
  try {
    return sanitizeRankings(JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'))
  } catch {
    return []
  }
}

function writeCache(list: RankItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list))
  } catch {
    // 용량이 모자라면 4위 아래 그림을 빼고 다시 저장
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(list.map((it, i) => (i < 3 ? it : { ...it, drawing: undefined }))))
    } catch (e) {
      console.error(e)
    }
  }
}

async function request(method: string, path: string, body?: unknown): Promise<RankItem[] | null> {
  try {
    const res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const list = sanitizeRankings(await res.json())
    // 서버와 한 번이라도 주고받았으면 이후 캐시는 서버 사본이므로 다시 올리지 않는다
    try {
      localStorage.setItem(MIGRATED_KEY, '1')
    } catch {
      // 무시
    }
    writeCache(list)
    return list
  } catch {
    return null
  }
}

/** 첫 화면용: 마지막으로 받아 둔 랭킹 (서버 응답 전까지) */
export function getCachedRankings(): RankItem[] {
  return readCache()
}

/** 서버 랭킹을 받아 온다. 이 브라우저에만 있던 예전 기록은 한 번 서버로 합친다. */
export async function fetchRankings(): Promise<RankItem[]> {
  let migrated = false
  try {
    migrated = localStorage.getItem(MIGRATED_KEY) === '1'
  } catch {
    migrated = true
  }
  const local = readCache()
  if (!migrated && local.length) {
    // 서버로 옮기기 전 이 브라우저의 기록을 따로 남겨 둔다 (캐시가 서버 목록으로 덮여도 복구할 수 있게)
    try {
      if (!localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, JSON.stringify(local))
    } catch {
      // 무시
    }
    const merged = await request('POST', '/api/rankings/import', local)
    if (merged) {
      try {
        localStorage.setItem(MIGRATED_KEY, '1')
      } catch {
        // 무시
      }
      return merged
    }
  }
  return (await request('GET', '/api/rankings')) ?? local
}

/** 기록 등록: 같은 이름은 더 높은 점수일 때만 갱신 */
export async function submitRanking(item: Omit<RankItem, 'id'>): Promise<RankItem[]> {
  const list = await request('POST', '/api/rankings', item)
  if (list) return list
  const fallback = applyRecord(readCache(), item)
  writeCache(fallback)
  return fallback
}

export async function deleteRanking(id: string): Promise<RankItem[]> {
  const list = await request('DELETE', `/api/rankings/${encodeURIComponent(id)}`)
  if (list) return list
  const fallback = removeRecord(readCache(), id)
  writeCache(fallback)
  return fallback
}

// ── 전체 기록 관리 (랭킹 화면의 '전체 기록 관리') ─────────────────────────────
// 서버에만 있는 기능이라, 서버가 없으면(정적 배포) null 을 돌려준다

export interface RecordsState {
  records: RankItem[]
  rankings: RankItem[]
}

async function recordsRequest(method: string, path: string, body?: unknown): Promise<RecordsState | null> {
  try {
    const res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const rankings = sanitizeRankings(data.rankings)
    writeCache(rankings)
    return { records: sanitizeRecords(data.records), rankings }
  } catch {
    return null
  }
}

export async function fetchRecords(): Promise<RankItem[] | null> {
  try {
    const res = await fetch('/api/records', { cache: 'no-store' })
    return res.ok ? sanitizeRecords(await res.json()) : null
  } catch {
    return null
  }
}

export const renameRecord = (id: string, name: string) => recordsRequest('PATCH', `/api/records/${encodeURIComponent(id)}`, { name })
export const deleteRecord = (id: string) => recordsRequest('DELETE', `/api/records/${encodeURIComponent(id)}`, {})
export const clearAllRecords = () => recordsRequest('DELETE', '/api/records', { confirm: '전체 삭제' })
