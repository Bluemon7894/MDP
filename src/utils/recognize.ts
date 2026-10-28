import { KeywordMap } from '../types'
import { toKorean } from '../constants/quickdraw'
import { normalizeStrokes } from './scoring'

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

export async function recognizeDrawing(strokes: number[][][], kw: KeywordMap): Promise<Recognition | null> {
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
    if (!lists.some(l => l.length)) return null

    // 라벨마다 가장 좋은 순위를 고르고, 같은 순위면 원래 방향 결과를 앞에 둔다
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
    // 제시어는 어느 방향에서든 가장 잘 나온 순위 자리에 놓는다
    if (target) list.splice(rank - 1, 0, target)
    return { list: list.slice(0, 5), rank }
  } catch {
    return null
  }
}
