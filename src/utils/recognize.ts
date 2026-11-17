import { KeywordMap } from '../types'
import { toKorean } from '../constants/quickdraw'
import { normalizeStrokes } from './scoring'
import friendSignatures from '../constants/friendsDrawingsSignatures.json'

// Quick, Draw! 는 학습 데이터가 대부분 바로 선 그림이라 눕혀 그리면 못 알아본다.
// 그래서 0°/90°/180°/270° 로 돌린 그림을 한 번에 보내고, 어느 방향에서든 알아본 결과를 인정한다.
const ANGLES = [0, 90, 180, 270]
const GOOGLE_TIMEOUT_MS = 6000

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
  /** 화면에 보여 줄 더 긴 후보 목록 (list 로 시작하고 그 밖에 떠올린 것이 이어진다. 채점에는 쓰지 않는다) */
  more: string[]
  /** AI가 갈피를 못 잡았는지: 돌려 본 방향마다 1~3위 후보가 하나도 겹치지 않는다 (진짜 알아볼 수 없는 그림) */
  confused: boolean
}

/** 화면에 보여 줄 후보 수 (한글로 바꾼 뒤 겹치는 것을 빼면 조금 줄 수 있다) */
const MORE_MAX = 20

/** 영문 라벨 목록들을 순서대로 이어 붙이되 같은 라벨은 한 번만 */
const mergeLabels = (...lists: string[][]) => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const g of lists.flat()) {
    const key = normEn(g)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(g)
    if (out.length >= MORE_MAX) break
  }
  return out
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

/** 친구 손그림 유사도 (영문 라벨 → 코사인 유사도), 높은 순 */
function friendSimilarities(grid: Float32Array): { en: string; score: number }[] {
  const scores: { en: string; score: number }[] = []
  for (const [cat, data] of Object.entries(friendSignatures)) {
    const targetGrid = (data as { grid: number[] }).grid
    let dot = 0
    for (let i = 0; i < 256; i++) dot += grid[i] * targetGrid[i]
    scores.push({ en: cat, score: dot })
  }
  return scores.sort((a, b) => b.score - a.score)
}

// ── 앙상블 비율: Quick, Draw! 95% + 친구 손그림 5% ─────────────────────────────
// 두 점수를 0~1로 맞춘 뒤 가중합으로 순위를 다시 매긴다. 친구 손그림은 비슷한 후보끼리 순서를 살짝 바꾸는 정도로만 쓴다.
const GOOGLE_WEIGHT = 0.95
const FRIEND_WEIGHT = 0.05
/** Quick, Draw! 후보를 방향마다 몇 위까지 볼지 */
const GOOGLE_DEPTH = 10
/** 똑바로 그린 그림을 가장 믿고, 돌려 본 결과는 조금 덜 믿는다 (눕혀 그린 그림 구제용) */
const ANGLE_WEIGHT = [1, 0.85, 0.85, 0.85]
/** 친구 손그림은 이 유사도 이상일 때만 의미 있는 후보로 본다 */
const FRIEND_MIN_SIM = 0.4
/** 마구 그은 낙서가 흔히 몰리는 범주 (이스터에그 판정용) */
const SCRIBBLE_LABELS = new Set(['camouflage', 'squiggle', 'hurricane', 'tornado', 'bush', 'blackberry', 'zigzag', 'scribble', 'garden'].map(normEn))

export async function recognizeDrawing(strokes: number[][][], kw: KeywordMap): Promise<Recognition | null> {
  // 1. 친구 손그림 유사도 (오프라인, 즉시)
  const grid = extractGrid16(strokes)
  const friends = grid ? friendSimilarities(grid) : []

  // 2. Quick, Draw! 온라인 인식 (0°/90°/180°/270°)
  let google: Map<string, number> | null = null
  let confused = false
  // 네트워크가 멈추면 fetch 가 끝나지 않아 AI 차례·협동 채점이 영원히 기다린다. 제한 시간을 둔다
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MS)
  try {
    const res = await fetch('https://inputtools.google.com/request?ime=handwriting&app=quickdraw', {
      method: 'POST',
      signal: controller.signal,
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
    const lists: string[][] = (data?.[1] ?? []).map((r: unknown[]) => ((r?.[1] as string[]) ?? []).slice(0, GOOGLE_DEPTH))
    if (lists.some(l => l.length)) {
      // 방향마다 1~3위를 모아 두 방향 이상에서 나온 후보가 하나도 없으면 '갈피를 못 잡음'
      const seen = new Map<string, number>()
      lists.forEach(l => new Set(l.slice(0, 3)).forEach(g => seen.set(g, (seen.get(g) ?? 0) + 1)))
      confused = lists.filter(l => l.length).length >= 3 && ![...seen.values()].some(n => n >= 2)
      // 순위 점수: 1위 1, 2위 1/2, 3위 1/3 ... 에 방향 가중치를 곱하고, 방향 중 가장 좋은 값을 쓴다
      google = new Map()
      lists.forEach((l, a) =>
        l.forEach((g, i) => {
          const sc = (ANGLE_WEIGHT[a] ?? 0.85) / (i + 1)
          if (sc > (google!.get(g) ?? 0)) google!.set(g, sc)
        }),
      )
    }
  } catch {
    // 온라인 API 실패 시(인터넷 없음/오프라인/시간 초과)
  } finally {
    clearTimeout(timeoutId)
  }

  if (!google && !friends.length) return null

  // 친구 점수 0~1: 가장 비슷한 것 1, 기준 유사도 아래는 0
  const top = friends[0]?.score ?? 0
  const friendScore = new Map<string, { label: string; s: number }>()
  if (top > FRIEND_MIN_SIM) {
    for (const f of friends.slice(0, MORE_MAX)) {
      const s = (f.score - FRIEND_MIN_SIM) / (top - FRIEND_MIN_SIM)
      if (s > 0) friendScore.set(normEn(f.en), { label: f.en, s })
    }
  }

  // 3. 가중합으로 다시 순위를 매긴다. 인터넷이 안 되면 친구 손그림만으로 판정한다
  const fused = new Map<string, { label: string; score: number; g: number }>()
  if (google) {
    google.forEach((g, label) => fused.set(normEn(label), { label, score: GOOGLE_WEIGHT * g, g }))
    friendScore.forEach(({ label, s }, key) => {
      const cur = fused.get(key)
      if (cur) cur.score += FRIEND_WEIGHT * s
      else fused.set(key, { label, score: FRIEND_WEIGHT * s, g: 0 })
    })
  } else {
    friendScore.forEach(({ label, s }, key) => fused.set(key, { label, score: s, g: 0 }))
  }

  const ranked = [...fused.values()].sort((a, b) => b.score - a.score || b.g - a.g).map(v => v.label)
  const list = ranked.slice(0, 5)
  const idx = list.findIndex(g => isTarget(g, kw))
  // 낙서를 마구 그으면 Quick, Draw! 는 이런 '낙서 같은' 범주로 몰아 버린다. 1~3위 중 둘 이상이 여기면 알아볼 수 없는 그림
  const scribbly = list.slice(0, 3).filter(g => SCRIBBLE_LABELS.has(normEn(g))).length >= 2
  return { list, rank: idx >= 0 ? idx + 1 : 0, more: mergeLabels(ranked), confused: idx < 0 && (confused || scribbly) }
}
