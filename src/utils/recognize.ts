import { KeywordMap } from '../types'
import { toKorean } from '../constants/quickdraw'
import { normalizeStrokes } from './scoring'
import friendSignatures from '../constants/friendsDrawingsSignatures.json'

// Quick, Draw! 는 학습 데이터가 대부분 바로 선 그림이라 눕혀 그리면 못 알아본다.
// 그래서 0°/90°/180°/270° 로 돌린 그림을 한 번에 보내고, 어느 방향에서든 알아본 결과를 인정한다.
const ANGLES = [0, 90, 180, 270]

function rotate(strokes: number[][][], deg: number) {
  if (deg === 0) return strokes
  let cx = 0, cy = 0, n = 0
  strokes.forEach(([xs, ys]) => xs.forEach((x, i) => { cx += x; cy += ys[i]; n++ }))
  cx /= n || 1
  cy /= n || 1
  const rad = (deg * Math.PI) / 180, c = Math.round(Math.cos(rad)), s = Math.round(Math.sin(rad))
  return strokes.map(([xs, ys, ts]) => [
    xs.map((x, i) => Math.round(cx + (x - cx) * c - (ys[i] - cy) * s)),
    xs.map((x, i) => Math.round(cy + (x - cx) * s + (ys[i] - cy) * c)),
    ts,
  ])
}

const normEn = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '')
const isTarget = (g: string, kw: KeywordMap) => normEn(g) === normEn(kw.en) || toKorean(g) === kw.ko

export interface Recognition {
  /** 방향별 결과를 합친 상위 5개 (영문 라벨) */
  list: string[]
  /** 제시어가 몇 위로 인식됐는지 (0 = 5위 밖) */
  rank: number
}

/**
 * 친구들의 278개 카테고리 실물 손그림 데이터셋(friendsDrawingsSignatures)과
 * 플레이어 스트로크의 16x16 공간 밀도 격자(Cosine Similarity)를 0.001초 만에 비교 매칭합니다.
 */
function extractGrid16(strokes: number[][][]): Float32Array | null {
  if (!strokes || strokes.length === 0) return null
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const s of strokes) {
    const xs = s[0], ys = s[1]
    for (let i = 0; i < xs.length; i++) {
      if (xs[i] < minX) minX = xs[i]
      if (xs[i] > maxX) maxX = xs[i]
      if (ys[i] < minY) minY = ys[i]
      if (ys[i] > maxY) maxY = ys[i]
    }
  }
  const w = (maxX - minX) || 1, h = (maxY - minY) || 1
  const maxDim = Math.max(w, h)
  const pad = maxDim * 0.15
  const total = maxDim + 2 * pad
  const ox = pad + (maxDim - w) / 2
  const oy = pad + (maxDim - h) / 2

  const grid = new Float32Array(256)
  for (const s of strokes) {
    const xs = s[0], ys = s[1]
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = ((xs[i] - minX + ox) / total) * 16
      const y0 = ((ys[i] - minY + oy) / total) * 16
      const x1 = ((xs[i + 1] - minX + ox) / total) * 16
      const y1 = ((ys[i + 1] - minY + oy) / total) * 16

      const dist = Math.hypot(x1 - x0, y1 - y0)
      const steps = Math.max(1, Math.ceil(dist * 2))
      for (let st = 0; st <= steps; st++) {
        const t = st / steps
        const gx = Math.min(15, Math.max(0, Math.floor(x0 + (x1 - x0) * t)))
        const gy = Math.min(15, Math.max(0, Math.floor(y0 + (y1 - y0) * t)))
        grid[gy * 16 + gx] = Math.min(1.0, grid[gy * 16 + gx] + 0.35)
      }
    }
  }

  let sumSq = 0
  for (let i = 0; i < 256; i++) sumSq += grid[i] * grid[i]
  const norm = Math.sqrt(sumSq)
  if (norm > 1e-6) {
    for (let i = 0; i < 256; i++) grid[i] /= norm
  }
  return grid
}

function matchFriendDataset(grid: Float32Array, kw: KeywordMap): { list: string[]; rank: number } {
  const scores: { en: string; score: number }[] = []
  const targetEn = normEn(kw.en)

  for (const [cat, data] of Object.entries(friendSignatures)) {
    const targetGrid = (data as any).grid as number[]
    let dot = 0
    for (let i = 0; i < 256; i++) {
      dot += grid[i] * targetGrid[i]
    }
    scores.push({ en: cat, score: dot })
  }

  scores.sort((a, b) => b.score - a.score)
  const top5 = scores.slice(0, 5).map(s => s.en)

  let rank = 0
  for (let i = 0; i < scores.length; i++) {
    if (normEn(scores[i].en) === targetEn || toKorean(scores[i].en) === kw.ko) {
      // 0.40 이상 유사도일 때 인식 성공으로 판정
      if (scores[i].score >= 0.40) {
        rank = i < 5 ? i + 1 : 0
      }
      break
    }
  }

  return { list: top5, rank }
}

export async function recognizeDrawing(strokes: number[][][], kw: KeywordMap): Promise<Recognition | null> {
  // 1. 친구들 손그림 기반 로컬 AI 모델 매칭 (초고속 오프라인 추론)
  let friendResult: { list: string[]; rank: number } | null = null
  const grid = extractGrid16(strokes)
  if (grid) {
    friendResult = matchFriendDataset(grid, kw)
  }

  // 2. 구글 Quick, Draw! 온라인 API 호출 (병행 앙상블)
  let googleResult: Recognition | null = null
  try {
    const res = await fetch('https://inputtools.google.com/request?ime=handwriting&app=quickdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_type: 0,
        requests: ANGLES.map(deg => ({
          language: 'quickdraw',
          writing_guide: { width: 256, height: 256 },
          ink: normalizeStrokes(rotate(strokes, deg)),
        })),
      }),
    })
    const data = await res.json()
    const lists: string[][] = (data?.[1] ?? []).map((r: unknown[]) => ((r?.[1] as string[]) ?? []).slice(0, 5))
    if (lists.some(l => l.length)) {
      const best = new Map<string, { rank: number; angle: number }>()
      lists.forEach((l, a) => l.forEach((g, i) => {
        const cur = best.get(g)
        if (!cur || i + 1 < cur.rank) best.set(g, { rank: i + 1, angle: a })
      }))
      const target = [...best.keys()].find(g => isTarget(g, kw))
      const rank = target ? best.get(target)!.rank : 0
      const list = [...best.entries()]
        .filter(([g]) => g !== target)
        .sort(([, a], [, b]) => a.rank - b.rank || a.angle - b.angle)
        .map(([g]) => g)
      if (target) list.splice(rank - 1, 0, target)
      googleResult = { list: list.slice(0, 5), rank }
    }
  } catch {
    // 온라인 API 실패 시(인터넷 없음/오프라인)
  }

  // 3. 앙상블: 친구들 모델과 구글 모델 중 더 높은(유리한) 순위를 채택!
  if (friendResult && googleResult) {
    let bestRank = 0
    if (friendResult.rank > 0 && googleResult.rank > 0) {
      bestRank = Math.min(friendResult.rank, googleResult.rank)
    } else {
      bestRank = Math.max(friendResult.rank, googleResult.rank)
    }

    const mergedList = [...new Set([...friendResult.list, ...googleResult.list])].slice(0, 5)
    return { list: mergedList, rank: bestRank }
  }

  if (friendResult && friendResult.rank > 0) {
    return { list: friendResult.list, rank: friendResult.rank }
  }

  return googleResult || (friendResult ? { list: friendResult.list, rank: 0 } : null)
}
