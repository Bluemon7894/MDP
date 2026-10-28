import { MetricBreakdown, MetricItem } from '../types'

// Quick, Draw! 인식률을 높이기 위한 바운딩 박스 정규화 (256x256 스케일링)
export function normalizeStrokes(rawStrokes: number[][][]) {
  if (rawStrokes.length === 0) return []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  rawStrokes.forEach(stroke => {
    const xs = stroke[0], ys = stroke[1]
    for (let i = 0; i < xs.length; i++) {
      if (xs[i] < minX) minX = xs[i]
      if (xs[i] > maxX) maxX = xs[i]
      if (ys[i] < minY) minY = ys[i]
      if (ys[i] > maxY) maxY = ys[i]
    }
  })
  const width = maxX - minX || 1, height = maxY - minY || 1
  const maxDim = Math.max(width, height), scale = 230 / maxDim
  return rawStrokes.map(stroke => [
    stroke[0].map(x => Math.round((x - minX) * scale + (255 - width * scale) / 2)),
    stroke[1].map(y => Math.round((y - minY) * scale + (255 - height * scale) / 2)),
    stroke[2],
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
// 채점 기준 (사람과 AI 동일 적용, 1000점 만점)
//  AI 인식 300 : Quick, Draw! 후보 순위 (1위 / 2~3위 / 4~5위)
//  속도    250 : 인식된 그림을 완성했을 때 남은 시간 비율
//  명암    250 : 형태 안쪽을 얼마나 채웠는지 × 명암 단계를 몇 단계 썼는지 (캔버스 픽셀 분석)
//  구도    200 : 화면 대비 크기 + 중앙 배치
//  AI가 알아보지 못하면 명암·구도 점수의 절반만 인정한다.
//  AI는 명암·구도는 거의 만점이지만 그리는 데 8~13초가 걸린다. 사람은 알아볼 수 있는 형태에
//  명암까지 넣고 AI보다 빨리 끝내야 이길 수 있다.
// ─────────────────────────────────────────────────────────────────────────────
export const MAX_PTS = { recognition: 300, speed: 250, tone: 250, form: 200 }

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function analyzeCanvas(canvas: HTMLCanvasElement) {
  const W = canvas.width, H = canvas.height
  const data = canvas.getContext('2d')!.getImageData(0, 0, W, H).data
  const STEP = 3
  const sw = Math.floor(W / STEP), sh = Math.floor(H / STEP)
  const dark = new Float32Array(sw * sh)
  const xs: number[] = [], ys: number[] = []
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * STEP * W + x * STEP) * 4
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255
      const d = (data[i + 3] / 255) * (1 - lum)
      dark[y * sw + x] = d
      if (d > 0.05) { xs.push(x); ys.push(y) }
    }
  }
  if (xs.length < 30) return { inked: false, tone: 0, form: 0, coverage: 0, levels: 0 }

  // 떨어진 잡티에 휘둘리지 않도록 2~98% 분위로 영역을 잡는다
  const q = (arr: number[], p: number) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))]
  xs.sort((a, b) => a - b)
  ys.sort((a, b) => a - b)
  const x0 = q(xs, 0.02), x1 = q(xs, 0.98), y0 = q(ys, 0.02), y1 = q(ys, 0.98)

  const CELL = 5
  let cells = 0, inkCells = 0
  const bins = new Array(6).fill(0)
  for (let cy = y0; cy <= y1; cy += CELL) {
    for (let cx = x0; cx <= x1; cx += CELL) {
      let sum = 0, n = 0
      for (let y = cy; y < Math.min(cy + CELL, sh); y++) for (let x = cx; x < Math.min(cx + CELL, sw); x++) { sum += dark[y * sw + x]; n++ }
      const avg = n ? sum / n : 0
      cells++
      if (avg > 0.03) {
        inkCells++
        bins[Math.min(5, Math.floor(avg / 0.15))]++
      }
    }
  }
  const coverage = cells ? inkCells / cells : 0
  const levels = bins.filter(b => b >= inkCells * 0.05).length
  const tone = clamp01(coverage / 0.55) * (0.4 + 0.6 * clamp01((levels - 1) / 4))

  const bw = ((x1 - x0) * STEP) / W, bh = ((y1 - y0) * STEP) / H
  const s = Math.max(bw, bh)
  const sizeScore = s < 0.45 ? s / 0.45 : s <= 0.98 ? 1 : 0.8
  const cx = ((x0 + x1) / 2) * STEP, cy = ((y0 + y1) / 2) * STEP
  const off = Math.hypot((cx - W / 2) / (W / 2), (cy - H / 2) / (H / 2))
  const form = 0.6 * sizeScore + 0.4 * (1 - clamp01(off / 0.6))

  return { inked: true, tone, form, coverage, levels }
}

export function evaluateDrawing(canvas: HTMLCanvasElement, timeLeft: number, rank: number, turnSec = 20): MetricBreakdown {
  const a = analyzeCanvas(canvas)
  const recognized = rank > 0
  const left = Math.max(0, isNaN(timeLeft) ? 0 : timeLeft)

  const rankRatio = rank === 1 ? 1 : rank > 0 && rank <= 3 ? 0.73 : rank > 0 ? 0.47 : 0
  const speedRatio = recognized ? clamp01(left / turnSec) : 0
  const half = recognized ? 1 : 0.5

  const items: MetricItem[] = [
    { key: 'recognition', label: 'AI 인식', detail: recognized ? `${rank}순위로 인식` : '인식 실패', ratio: rankRatio, pts: Math.round(rankRatio * MAX_PTS.recognition), max: MAX_PTS.recognition },
    { key: 'speed', label: '속도', detail: recognized ? `${left}초 남기고 완성` : '인식되지 않아 0점', ratio: speedRatio, pts: Math.round(speedRatio * MAX_PTS.speed), max: MAX_PTS.speed },
    { key: 'tone', label: '명암', detail: a.inked ? `채움 ${Math.round(a.coverage * 100)}% · ${a.levels}단계 톤` : '그림 없음', ratio: a.tone, pts: Math.round(a.tone * MAX_PTS.tone * half), max: MAX_PTS.tone },
    { key: 'form', label: '구도', detail: '화면 대비 크기와 중앙 배치', ratio: a.form, pts: Math.round(a.form * MAX_PTS.form * half), max: MAX_PTS.form },
  ]
  const totalPts = items.reduce((s, it) => s + it.pts, 0)

  let verdictTitle: string, verdictDesc: string
  if (!a.inked) {
    verdictTitle = '빈 캔버스'
    verdictDesc = '아무것도 그리지 않았습니다.'
  } else if (!recognized) {
    verdictTitle = 'AI가 알아보지 못했습니다'
    verdictDesc = '명암과 구도 점수의 절반만 인정됩니다. 연필로 특징이 드러나는 외곽선부터 잡아 보세요.'
  } else if (a.tone >= 0.75) {
    verdictTitle = '형태와 명암이 모두 살아 있습니다'
    verdictDesc = `${rank}순위로 인식되었고 ${left}초를 남겼습니다. 사실적인 명암까지 갖춘 그림입니다.`
  } else if (speedRatio >= 0.6) {
    verdictTitle = '빠르고 정확합니다'
    verdictDesc = '목탄으로 형태 안쪽에 명암을 쌓으면 점수가 더 오릅니다.'
  } else {
    verdictTitle = '알아볼 수 있는 그림입니다'
    verdictDesc = '더 빨리 완성하거나 명암을 여러 단계로 쌓으면 점수가 오릅니다.'
  }

  return { items, totalPts, recognized, verdictTitle, verdictDesc }
}

// ─────────────────────────────────────────────────────────────────────────────
// 반쪽 협동 전용: 한 사람만 그려도 점수가 나오는 걸 막는 협동 배율 (0 ~ 1, 합계에 곱한다)
//  균형  : 덜 그린 쪽이 더 그린 쪽의 절반 이상이면 만점. 한쪽이 비어 있으면 0 → 라운드 0점
//  이음새: 가운데 선 양옆에서 같은 높이에 선이 이어지는 정도. 못 맞춰도 배율의 70%는 남긴다
// ─────────────────────────────────────────────────────────────────────────────
export function analyzeTeamwork(canvas: HTMLCanvasElement) {
  const W = canvas.width, H = canvas.height
  const data = canvas.getContext('2d')!.getImageData(0, 0, W, H).data
  const STEP = 3, MID = W / 2, BAND = 60
  const rows = Math.ceil(H / STEP)
  const nearL = new Uint8Array(rows), nearR = new Uint8Array(rows)
  let inkL = 0, inkR = 0
  for (let r = 0; r < rows; r++) {
    const y = r * STEP
    for (let x = 0; x < W; x += STEP) {
      const i = (y * W + x) * 4
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255
      if ((data[i + 3] / 255) * (1 - lum) <= 0.05) continue
      if (x < MID) {
        inkL++
        if (x >= MID - BAND) nearL[r] = 1
      } else {
        inkR++
        if (x < MID + BAND) nearR[r] = 1
      }
    }
  }
  // 눈으로 맞춰 그리는 거라 위아래로 18px 정도 어긋난 건 이어진 것으로 본다
  const spread = (p: Uint8Array) => p.map((_, r) => (p.slice(Math.max(0, r - 6), r + 7).some(Boolean) ? 1 : 0))
  const sl = spread(nearL), sr = spread(nearR)
  let both = 0, either = 0
  for (let r = 0; r < rows; r++) {
    if (sl[r] && sr[r]) both++
    if (sl[r] || sr[r]) either++
  }
  const balance = Math.max(inkL, inkR) ? Math.min(inkL, inkR) / Math.max(inkL, inkR) : 0
  const seam = either ? both / either : 0
  const factor = clamp01(balance / 0.5) * (0.7 + 0.3 * clamp01(seam / 0.5))
  const total = inkL + inkR || 1
  return { factor, balance, seam, shareL: inkL / total, shareR: inkR / total }
}

export function evaluateCoop(canvas: HTMLCanvasElement, timeLeft: number, rank: number, turnSec = 20): MetricBreakdown {
  const base = evaluateDrawing(canvas, timeLeft, rank, turnSec)
  const t = analyzeTeamwork(canvas)
  const pct = (v: number) => Math.round(v * 100)
  const teamwork: MetricItem = {
    key: 'teamwork',
    label: '협동',
    detail: `왼쪽 ${pct(t.shareL)}% · 오른쪽 ${pct(t.shareR)}% · 이음새 ${pct(t.seam)}%`,
    ratio: t.factor,
    pts: 0,
    max: 0,
    multiplier: Math.round(t.factor * 100) / 100,
  }
  const totalPts = Math.round(base.totalPts * t.factor)

  let { verdictTitle, verdictDesc } = base
  if (base.items.some(it => it.key === 'tone' && it.detail === '그림 없음')) {
    // 둘 다 안 그렸으면 기본 문구 그대로
  } else if (t.balance < 0.15) {
    verdictTitle = '한 사람만 그렸습니다'
    verdictDesc = '두 반쪽을 둘 다 그려야 점수가 납니다. 비어 있거나 거의 빈 반쪽이 있으면 협동 배율이 0에 가까워집니다.'
  } else if (t.factor < 0.75) {
    verdictDesc = `${verdictDesc} 두 사람이 비슷하게 나눠 그리고 가운데 선에서 이어지게 하면 협동 배율이 오릅니다.`
  }
  return { ...base, items: [...base.items, teamwork], totalPts, verdictTitle, verdictDesc }
}
