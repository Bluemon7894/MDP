import { getAiShape, CanvasPt } from '../constants/aiDrawings'

// ─────────────────────────────────────────────────────────────────────────────
// Super AI 사실화 렌더러
//  1) src/img/ai/<영문 제시어>.png|jpg 가 있으면 그 연필화를 그대로 옮겨 그린다
//     (apple.png 는 직접 받은 소묘, 나머지는 Wikimedia Commons 사진을 흑연 소묘로 변환한 것. 출처는 SOURCES.md)
//  2) 없으면 직접 만든 벡터 도형에 입체 조명 + 흑연 결 텍스처를 입힌 소묘를 절차적으로 만든다
//  3) 그것도 없으면 Quick, Draw! 사람 낙서(aiDoodles.json)를 겹쳐 그은 연필 선화로 그린다
//  완성본을 먼저 오프스크린에 만들고, 붓질 마스크로 조금씩 드러내며 '그리는' 연출을 한다.
// ─────────────────────────────────────────────────────────────────────────────

const REFERENCE_IMAGES = import.meta.glob('../img/ai/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const referenceFor = (en: string) => {
  const key = en.toLowerCase().trim().replace(/\s+/g, '_')
  const hit = Object.entries(REFERENCE_IMAGES).find(([path]) => path.split('/').pop()!.replace(/\.\w+$/, '').toLowerCase() === key)
  return hit?.[1]
}

export interface RevealStroke { pts: CanvasPt[]; width: number; alpha: number }

export interface AiArtwork {
  art: HTMLCanvasElement
  // 단계별 붓질: 윤곽 잡기 → 큰 덩어리 → 명암 쌓기 → 마무리
  phases: RevealStroke[][]
  strokes: number[][][]
  complexity: number
}

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

// 반복 박스 블러 (가우시안 근사)
function blur(src: Float32Array, w: number, h: number, r: number, iterations = 3) {
  let a = src.slice()
  let b = new Float32Array(a.length)
  for (let it = 0; it < iterations; it++) {
    for (let y = 0; y < h; y++) {
      let acc = 0
      const row = y * w
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))]
      for (let x = 0; x < w; x++) {
        b[row + x] = acc / (2 * r + 1)
        acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)]
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x]
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc / (2 * r + 1)
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]
      }
    }
  }
  return a
}

// 벡터 도형 → 입체 연필 소묘
function renderProcedural(fills: CanvasPt[][], lines: CanvasPt[][], W: number, H: number) {
  const maskC = makeCanvas(W, H)
  const mctx = maskC.getContext('2d')!
  mctx.fillStyle = '#fff'
  mctx.beginPath()
  fills.forEach(poly => {
    poly.forEach(([x, y], i) => (i ? mctx.lineTo(x, y) : mctx.moveTo(x, y)))
    mctx.closePath()
  })
  mctx.fill('evenodd')
  const md = mctx.getImageData(0, 0, W, H).data
  const cov = new Float32Array(W * H)
  let x0 = W, x1 = 0, y0 = H, y1 = 0
  for (let i = 0; i < cov.length; i++) {
    cov[i] = md[i * 4 + 3] / 255
    if (cov[i] > 0.5) {
      const x = i % W, y = (i / W) | 0
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  const size = Math.max(40, Math.min(x1 - x0, y1 - y0))
  const r = Math.round(Math.max(8, Math.min(48, size * 0.11)))
  const height = blur(cov, W, H, r)
  const shadow = blur(cov, W, H, Math.round(r * 1.6))

  const Lx = -0.5, Ly = -0.62, Lz = 0.6
  const Ll = Math.hypot(Lx, Ly, Lz)
  const k = r * 2.2
  const dir = -0.95, dc = Math.cos(dir), ds = Math.sin(dir)
  const dc2 = Math.cos(dir + 1.25), ds2 = Math.sin(dir + 1.25)

  const out = new ImageData(W, H)
  const px = out.data
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      const c = cov[i]
      let dark = 0

      if (c > 0.01) {
        const gx = (height[i + 1] - height[i - 1]) * 0.5 * k
        const gy = (height[i + W] - height[i - W]) * 0.5 * k
        const nl = Math.hypot(gx, gy, 1)
        const nx = -gx / nl, ny = -gy / nl, nz = 1 / nl
        const diff = Math.max(0, (nx * Lx + ny * Ly + nz * Lz) / Ll)
        // 명부·중간톤·암부·반사광
        const rim = Math.max(0, 1 - nz) * Math.max(0, nx * 0.6 + ny * 0.8) * 0.35
        const light = Math.min(1, 0.04 + 1.05 * Math.pow(diff, 1.35) + rim)
        dark = Math.pow(1 - light, 1.15) * 0.92
        // 가장자리 윤곽 눌림
        const edge = Math.abs(cov[i + 1] - cov[i - 1]) + Math.abs(cov[i + W] - cov[i - W])
        dark = Math.min(1, dark + edge * 0.35)
        dark *= c
      }
      // 바닥 그림자 (오른쪽 아래로 드리움)
      const sx = x - Math.round(r * 0.9), sy = y - Math.round(r * 0.5)
      if (sx > 0 && sy > 0 && c < 0.99) {
        const s = shadow[sy * W + sx] * (1 - c) * 0.28 * Math.min(1, Math.max(0, (y - y0) / Math.max(1, y1 - y0)) * 1.4)
        dark = Math.max(dark, s)
      }

      if (dark > 0.004) {
        // 흑연 결: 길쭉한 해시 셀 (주 방향 + 어두운 곳에 교차 방향)
        const u = x * dc + y * ds, v = -x * ds + y * dc
        const g1 = hash(Math.floor(u / 16), Math.floor(v / 2.2))
        const u2 = x * dc2 + y * ds2, v2 = -x * ds2 + y * dc2
        const g2 = hash(Math.floor(u2 / 12) + 91, Math.floor(v2 / 2.2))
        const grain = hash(x, y)
        let tex = 0.55 * g1 + 0.25 * grain + 0.2
        if (dark > 0.5) tex = tex * 0.6 + g2 * 0.4
        dark *= 0.62 + 0.62 * tex
        if (grain > 0.965) dark *= 0.45 // 종이 결 사이 빈 점
      }

      const v = Math.round(255 * (1 - Math.min(1, dark)))
      px[i * 4] = v
      px[i * 4 + 1] = v
      px[i * 4 + 2] = Math.min(255, v + 3)
      px[i * 4 + 3] = 255
    }
  }

  const art = makeCanvas(W, H)
  const actx = art.getContext('2d')!
  actx.fillStyle = '#fff'
  actx.fillRect(0, 0, W, H)
  actx.putImageData(out, 0, 0)

  // 디테일 선: 같은 자리를 여러 번 겹쳐 그은 연필선
  actx.lineCap = 'round'
  actx.lineJoin = 'round'
  actx.strokeStyle = '#1d1d1f'
  lines.forEach(line => {
    for (let pass = 0; pass < 3; pass++) {
      actx.globalAlpha = 0.35 + pass * 0.15
      actx.lineWidth = 2 + pass * 1.2
      actx.beginPath()
      line.forEach(([x, y], i) => {
        const jx = x + (hash(x + pass, y) - 0.5) * 2.2, jy = y + (hash(y, x - pass) - 0.5) * 2.2
        i ? actx.lineTo(jx, jy) : actx.moveTo(jx, jy)
      })
      actx.stroke()
    }
  })
  // 외곽 윤곽을 얇게 한 번 더
  actx.globalAlpha = 0.45
  actx.lineWidth = 1.6
  fills.forEach(poly => {
    actx.beginPath()
    poly.forEach(([x, y], i) => (i ? actx.lineTo(x, y) : actx.moveTo(x, y)))
    actx.stroke()
  })
  actx.globalAlpha = 1
  return art
}

// 사진도 벡터 도형도 없는 제시어: 사람 낙서를 여러 번 겹쳐 그은 연필 선화로 + 아래로 번진 흑연 그림자
function renderDoodle(lines: CanvasPt[][], W: number, H: number) {
  const art = makeCanvas(W, H)
  const ctx = art.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const trace = (dx: number, dy: number, jitter: number, seed: number) =>
    lines.forEach(line => {
      ctx.beginPath()
      line.forEach(([x, y], i) => {
        const jx = x + dx + (hash(x + seed, y) - 0.5) * jitter, jy = y + dy + (hash(y, x - seed) - 0.5) * jitter
        i ? ctx.lineTo(jx, jy) : ctx.moveTo(jx, jy)
      })
      ctx.stroke()
    })

  ctx.strokeStyle = '#2b2b30'
  ctx.filter = 'blur(10px)'
  ctx.globalAlpha = 0.16
  ctx.lineWidth = 26
  trace(14, 18, 0, 0)
  ctx.filter = 'none'
  for (let pass = 0; pass < 3; pass++) {
    ctx.globalAlpha = 0.32 + pass * 0.18
    ctx.lineWidth = 2.4 + pass * 1.3
    trace(0, 0, 3, pass * 7)
  }
  ctx.globalAlpha = 1
  return art
}

// 참고 연필화 → 종이색을 흰색으로 정리해 캔버스에 배치
async function renderReference(url: string, W: number, H: number) {
  const img = new Image()
  img.src = url
  await img.decode()
  const scale = Math.min((H * 0.96) / img.height, (W * 0.9) / img.width)
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
  const art = makeCanvas(W, H)
  const ctx = art.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)

  const data = ctx.getImageData(0, 0, W, H)
  const px = data.data
  // 명도 분포는 그림이 놓인 영역 안에서만 잰다 (바깥 흰 여백 제외)
  const hist = new Array(256).fill(0)
  const ix0 = Math.round((W - w) / 2), iy0 = Math.round((H - h) / 2)
  for (let y = iy0; y < iy0 + h; y++) {
    for (let x = ix0; x < ix0 + w; x++) {
      const i = (y * W + x) * 4
      hist[Math.round(px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114)]++
    }
  }
  const pct = (p: number) => {
    let acc = 0
    const target = p * w * h
    for (let v = 0; v < 256; v++) if ((acc += hist[v]) >= target) return v
    return 255
  }
  const lo = pct(0.005)
  const hi = pct(0.4) - 18
  // 그림 테두리가 이미 흰색이면(사진에서 변환한 소묘) 손대지 않고, 회색 종이 사진만 레벨·가장자리를 정리한다
  let edgeSum = 0, edgeN = 0
  const lumAt = (x: number, y: number) => {
    const i = (y * W + x) * 4
    return px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
  }
  for (let x = ix0 + 2; x < ix0 + w - 2; x += 3) { edgeSum += lumAt(x, iy0 + 2) + lumAt(x, iy0 + h - 3); edgeN += 2 }
  for (let y = iy0 + 2; y < iy0 + h - 2; y += 3) { edgeSum += lumAt(ix0 + 2, y) + lumAt(ix0 + w - 3, y); edgeN += 2 }
  const needsFade = edgeSum / Math.max(1, edgeN) < 240
  const rx0 = (W - w) / 2, ry0 = (H - h) / 2
  for (let i = 0; i < px.length; i += 4) {
    const l = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
    // 종이 가장자리의 비네팅은 흰 종이로 서서히 날려 사각형 경계가 보이지 않게 한다
    const x = (i / 4) % W, y = (i / 4 / W) | 0
    const ex = Math.min(x - rx0, rx0 + w - x) / (w * 0.22)
    const ey = Math.min(y - ry0, ry0 + h - y) / (h * 0.16)
    const fade = needsFade ? 1 - Math.max(0, Math.min(1, Math.min(ex, ey))) : 0
    // 이미 정리된 소묘는 명도를 그대로 쓰고, 종이 사진만 레벨을 다시 맞춘다
    const t = needsFade ? Math.min(1, Math.max(0, (l - lo) / Math.max(1, hi - lo)) + fade * 1.2) : l / 255
    const v = Math.round(255 * Math.pow(t, 1.05))
    px[i] = v
    px[i + 1] = v
    px[i + 2] = Math.min(255, v + 3)
  }
  ctx.putImageData(data, 0, 0)
  return art
}

// 완성본의 명도 분포를 보고 붓질 순서를 설계
function planStrokes(art: HTMLCanvasElement): RevealStroke[][] {
  const W = art.width, H = art.height
  const data = art.getContext('2d')!.getImageData(0, 0, W, H).data
  const darkAt = (x: number, y: number) => {
    const i = (Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4
    return 1 - data[i] / 255
  }

  const CELL = 18
  const cells: { x: number; y: number; dark: number; edge: number }[] = []
  for (let y = CELL / 2; y < H; y += CELL) {
    for (let x = CELL / 2; x < W; x += CELL) {
      let sum = 0, mx = 0
      for (let dy = -6; dy <= 6; dy += 6) for (let dx = -6; dx <= 6; dx += 6) {
        const d = darkAt(x + dx, y + dy)
        sum += d
        mx = Math.max(mx, d)
      }
      const dark = sum / 9
      if (mx < 0.035) continue
      const edge = Math.abs(darkAt(x + 8, y) - darkAt(x - 8, y)) + Math.abs(darkAt(x, y + 8) - darkAt(x, y - 8))
      cells.push({ x, y, dark, edge })
    }
  }

  const stroke = (cx: number, cy: number, len: number, width: number, alpha: number, angle: number): RevealStroke => {
    const a = angle + (Math.random() - 0.5) * 0.5
    const dx = Math.cos(a), dy = Math.sin(a), bow = (Math.random() - 0.5) * len * 0.2
    const pts = [-0.5, -0.25, 0, 0.25, 0.5].map(t => [
      cx + dx * len * t - dy * bow * (1 - 4 * t * t),
      cy + dy * len * t + dx * bow * (1 - 4 * t * t),
    ] as CanvasPt)
    return { pts, width, alpha }
  }
  const jitter = () => (Math.random() - 0.5) * CELL
  const byRows = (list: RevealStroke[]) =>
    list.map(s => ({ s, k: s.pts[2][1] + Math.random() * 90 })).sort((a, b) => a.k - b.k).map(q => q.s)
  const edgeAngle = (x: number, y: number) => {
    const gx = darkAt(x + 6, y) - darkAt(x - 6, y), gy = darkAt(x, y + 6) - darkAt(x, y - 6)
    return Math.atan2(gy, gx) + Math.PI / 2
  }

  // 1) 윤곽 잡기: 명도 변화가 큰 곳을 형태 방향으로 얇게
  const contour = cells
    .filter(c => c.edge > 0.25)
    .map(c => stroke(c.x + jitter() * 0.4, c.y + jitter() * 0.4, 30, 7, 0.55, edgeAngle(c.x, c.y)))
  // 2) 큰 덩어리: 굵고 연한 붓질
  const block = cells.filter((_, i) => i % 2 === 0).map(c => stroke(c.x + jitter(), c.y + jitter(), 90, 44, 0.3, -0.95))
  // 3) 명암 쌓기: 어두운 곳 위주로
  const build = cells.filter(c => c.dark > 0.22).map(c => stroke(c.x + jitter(), c.y + jitter(), 54, 26, 0.55, c.edge > 0.3 ? edgeAngle(c.x, c.y) : -0.95))
  // 4) 마무리: 전체를 빈틈없이 덮어 완성본과 일치시킴
  const finish = cells.map(c => stroke(c.x, c.y, 34, 30, 1, -0.95))

  return [byRows(contour), byRows(block), byRows(build), byRows(finish)]
}

export async function createAiArtwork(en: string, W: number, H: number): Promise<AiArtwork> {
  const shape = getAiShape(en, W, H)
  const ref = referenceFor(en)
  // 사진 소묘 → 직접 만든 입체 도형 → 사람 낙서 선화 순으로 있는 것을 쓴다
  const fallback = () => (shape.fills.length ? renderProcedural(shape.fills, shape.lines, W, H) : renderDoodle(shape.doodleLines, W, H))
  let art: HTMLCanvasElement
  try {
    art = ref ? await renderReference(ref, W, H) : fallback()
  } catch {
    art = fallback()
  }
  return { art, phases: planStrokes(art), strokes: shape.strokes, complexity: shape.complexity }
}
