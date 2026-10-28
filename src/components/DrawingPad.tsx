import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from './ui'

// 게임 화면들이 같이 쓰는 그림판: 도구(연필·목탄·문지르기·지우개), 붓 칠하기, 되돌리기, 도구 막대

export const INK = '#2B1A40'

export type Tool = 'pencil' | 'charcoal' | 'blend' | 'eraser'

export const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'pencil', label: '연필', hint: '외곽선 · AI 인식용' },
  { id: 'charcoal', label: '목탄', hint: '부드러운 명암' },
  { id: 'blend', label: '문지르기', hint: '톤 번지게' },
  { id: 'eraser', label: '지우개', hint: '하이라이트' },
]
export const SIZES: Record<Tool, number[]> = {
  pencil: [3, 6, 11],
  charcoal: [26, 48, 80],
  blend: [24, 44, 72],
  eraser: [16, 40, 90],
}
export const STRENGTHS = [
  { label: '연하게', alpha: 0.05 },
  { label: '보통', alpha: 0.1 },
  { label: '진하게', alpha: 0.2 },
]

// 목탄 붓 끝: 가장자리로 갈수록 옅어지고 종이 결처럼 거친 입자
export function makeCharcoalDab(r: number) {
  const c = document.createElement('canvas')
  c.width = c.height = r * 2
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(r * 2, r * 2)
  for (let y = 0; y < r * 2; y++) {
    for (let x = 0; x < r * 2; x++) {
      const d = Math.hypot(x - r + 0.5, y - r + 0.5) / r
      if (d >= 1) continue
      const i = (y * r * 2 + x) * 4
      img.data[i] = 0x2b
      img.data[i + 1] = 0x1a
      img.data[i + 2] = 0x40
      img.data[i + 3] = Math.round(255 * Math.pow(1 - d, 1.4) * (0.35 + 0.65 * Math.random()))
    }
  }
  ctx.putImageData(img, 0, 0)
  return c
}

// 그림이 있는 영역(+여백)을 캔버스와 같은 비율로 잡는다. 그림이 작아도 카드에 꽉 차 보이게
function inkFrame(canvas: HTMLCanvasElement) {
  const W = canvas.width, H = canvas.height
  const data = canvas.getContext('2d')!.getImageData(0, 0, W, H).data
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  for (let y = 0; y < H; y += 4) {
    for (let x = 0; x < W; x += 4) {
      const i = (y * W + x) * 4
      const dark = (data[i + 3] / 255) * (1 - (data[i] + data[i + 1] + data[i + 2]) / 765)
      if (dark < 0.08) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return { sx: 0, sy: 0, sw: W, sh: H }
  const ratio = W / H
  let sw = (x1 - x0) * 1.3 + 40, sh = (y1 - y0) * 1.3 + 40
  if (sw / sh > ratio) sh = sw / ratio
  else sw = sh * ratio
  sw = Math.min(W, sw)
  sh = Math.min(H, sh)
  const sx = Math.max(0, Math.min(W - sw, (x0 + x1) / 2 - sw / 2))
  const sy = Math.max(0, Math.min(H - sh, (y0 + y1) / 2 - sh / 2))
  return { sx, sy, sw, sh }
}

/** 흰 종이 위에 얹은 JPEG (랭킹 카드·화면 사이 전송용). crop 이면 그림 둘레만 잘라 낸다 */
export function snapshotOf(canvas: HTMLCanvasElement, width = 480, quality = 0.72, crop = false) {
  const w = width, h = Math.round((w * canvas.height) / canvas.width)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  const { sx, sy, sw, sh } = crop ? inkFrame(canvas) : { sx: 0, sy: 0, sw: canvas.width, sh: canvas.height }
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, w, h)
  return c.toDataURL('image/jpeg', quality)
}

export function useDrawingPad({
  width,
  height,
  enabled,
  onStrokeEnd,
}: {
  width: number
  height: number
  enabled: boolean
  /** 획 하나를 다 그었을 때 (지우개·문지르기 제외). pencilCount = 지금까지 연필 획 수 */
  onStrokeEnd?: (tool: Tool, pencilCount: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('pencil')
  const [sizeIdx, setSizeIdx] = useState(1)
  const [strengthIdx, setStrengthIdx] = useState(1)
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [undoCount, setUndoCount] = useState(0)
  const last = useRef<{ x: number; y: number } | null>(null)

  // 연필 획은 AI 인식에 쓰고, 명암 획은 연필이 없을 때만 대신 쓴다
  const pencilStrokesRef = useRef<number[][][]>([])
  const otherStrokesRef = useRef<number[][][]>([])
  const currentStrokeRef = useRef<{ x: number[]; y: number[]; t: number[] }>({ x: [], y: [], t: [] })
  const strokeStartRef = useRef(0)
  const undoRef = useRef<{ image: ImageData; pencil: number; other: number }[]>([])
  const onStrokeEndRef = useRef(onStrokeEnd)
  onStrokeEndRef.current = onStrokeEnd

  const dabs = useMemo(() => (typeof document === 'undefined' ? [] : SIZES.charcoal.map(s => makeCharcoalDab(Math.round(s / 2)))), [])

  const reset = () => {
    canvasRef.current?.getContext('2d')!.clearRect(0, 0, width, height)
    pencilStrokesRef.current = []
    otherStrokesRef.current = []
    undoRef.current = []
    setUndoCount(0)
    setHasDrawn(false)
    setDrawing(false)
    last.current = null
  }

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }
  }
  const pressureOf = (e: React.PointerEvent) => (e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5)

  const pushUndo = () => {
    const ctx = canvasRef.current!.getContext('2d')!
    undoRef.current.push({ image: ctx.getImageData(0, 0, width, height), pencil: pencilStrokesRef.current.length, other: otherStrokesRef.current.length })
    if (undoRef.current.length > 12) undoRef.current.shift()
    setUndoCount(undoRef.current.length)
  }

  const paint = (from: { x: number; y: number }, to: { x: number; y: number }, pressure: number) => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const size = SIZES[tool][sizeIdx]
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (tool === 'pencil') {
      ctx.globalAlpha = 0.85 + 0.15 * pressure
      ctx.strokeStyle = INK
      ctx.lineWidth = size * (0.7 + 0.6 * pressure)
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = size
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
    } else {
      const r = size / 2
      const dist = Math.hypot(to.x - from.x, to.y - from.y)
      const steps = Math.max(1, Math.ceil(dist / (r * 0.3)))
      for (let i = 1; i <= steps; i++) {
        const x = from.x + ((to.x - from.x) * i) / steps
        const y = from.y + ((to.y - from.y) * i) / steps
        if (tool === 'charcoal') {
          ctx.globalAlpha = Math.min(1, STRENGTHS[strengthIdx].alpha * (0.5 + pressure))
          ctx.drawImage(dabs[sizeIdx], x - r, y - r)
        } else {
          // 문지르기: 직전 위치의 톤을 끌고 와서 번지게
          const px = from.x + ((to.x - from.x) * (i - 1)) / steps
          const py = from.y + ((to.y - from.y) * (i - 1)) / steps
          ctx.save()
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.clip()
          ctx.globalAlpha = 0.45
          ctx.drawImage(canvas, px - r, py - r, r * 2, r * 2, x - r, y - r, r * 2, r * 2)
          ctx.restore()
        }
      }
    }
    ctx.globalAlpha = 1
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled) return
    pushUndo()
    setDrawing(true)
    setHasDrawn(true)
    const pos = getPos(e)
    last.current = pos
    try {
      ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
    } catch {
      // 이미 해제된 포인터면 캡처 없이 진행
    }
    strokeStartRef.current = Date.now()
    currentStrokeRef.current = { x: [Math.round(pos.x)], y: [Math.round(pos.y)], t: [0] }
    paint(pos, pos, pressureOf(e))
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled || !drawing || !last.current) return
    const pos = getPos(e)
    paint(last.current, pos, pressureOf(e))
    last.current = pos
    currentStrokeRef.current.x.push(Math.round(pos.x))
    currentStrokeRef.current.y.push(Math.round(pos.y))
    currentStrokeRef.current.t.push(Date.now() - strokeStartRef.current)
  }

  const onPointerUp = () => {
    if (!enabled || !drawing) return
    setDrawing(false)
    last.current = null
    const s = currentStrokeRef.current
    if (tool === 'eraser' || tool === 'blend' || s.x.length === 0) return
    ;(tool === 'pencil' ? pencilStrokesRef : otherStrokesRef).current.push([s.x, s.y, s.t])
    onStrokeEndRef.current?.(tool, pencilStrokesRef.current.length)
  }

  /** 되돌렸으면 true */
  const undo = () => {
    const snap = undoRef.current.pop()
    setUndoCount(undoRef.current.length)
    if (!snap || !canvasRef.current) return false
    canvasRef.current.getContext('2d')!.putImageData(snap.image, 0, 0)
    pencilStrokesRef.current = pencilStrokesRef.current.slice(0, snap.pencil)
    otherStrokesRef.current = otherStrokesRef.current.slice(0, snap.other)
    setHasDrawn(pencilStrokesRef.current.length + otherStrokesRef.current.length > 0)
    return true
  }

  const clear = () => {
    if (!canvasRef.current) return
    pushUndo()
    canvasRef.current.getContext('2d')!.clearRect(0, 0, width, height)
    pencilStrokesRef.current = []
    otherStrokesRef.current = []
    setHasDrawn(false)
  }

  /** AI 인식에 보낼 획: 연필이 있으면 연필만, 없으면 명암 획 */
  const recognitionStrokes = () => (pencilStrokesRef.current.length ? pencilStrokesRef.current : otherStrokesRef.current)

  return {
    canvasRef,
    tool, setTool, sizeIdx, setSizeIdx, strengthIdx, setStrengthIdx,
    hasDrawn, undoCount,
    reset, undo, clear, recognitionStrokes,
    stopDrawing: () => setDrawing(false),
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp },
  }
}

export type DrawingPad = ReturnType<typeof useDrawingPad>

/** 도구 · 굵기 · 진하기 고르기 + 되돌리기 · 전체 지우기 · 완성 */
export function ToolBar({
  pad,
  disabled,
  onUndo,
  onClear,
  submitLabel,
  onSubmit,
  submitDisabled,
}: {
  pad: DrawingPad
  disabled: boolean
  /** 되돌린 뒤 할 일 (예: AI 인식 다시) */
  onUndo?: () => void
  onClear: () => void
  submitLabel: string
  onSubmit: () => void
  submitDisabled: boolean
}) {
  const { tool, setTool, sizeIdx, setSizeIdx, strengthIdx, setStrengthIdx } = pad
  // 막대 폭을 직접 재서 맞춘다. 화면 배율·창 크기와 상관없이 한 줄에 다 들어가고 완성 버튼이 가려지지 않게
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1200)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.getBoundingClientRect().width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const roomy = width >= 1150
  const tight = width < 960

  const toolPad = roomy ? 'px-5' : tight ? 'px-2' : 'px-3'
  const sizeW = roomy ? 'w-14' : tight ? 'w-9' : 'w-11'
  const strengthPad = roomy ? 'px-4' : tight ? 'px-1.5' : 'px-2.5'
  const iconBtn = 'w-11 px-0'

  return (
    // 한 줄에 모두 놓고, 남는 폭은 완성 버튼이 채워서 빈자리가 생기지 않게 한다
    <div ref={ref} className={`flex items-center gap-2 whitespace-nowrap ${disabled ? 'opacity-35 pointer-events-none' : ''}`}>
      <div className="flex shrink-0 bg-white border-2 border-line rounded-2xl p-1">
        {TOOLS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            className={`h-14 ${toolPad} rounded-xl text-left transition-colors ${tool === t.id ? 'bg-ink text-white' : 'text-ink hover:bg-paper'}`}
          >
            <div className={`font-display leading-tight ${tight ? 'text-base' : 'text-lg'}`}>{t.label}</div>
            {roomy && <div className={`text-[11px] font-medium ${tool === t.id ? 'text-white/60' : 'text-graphite'}`}>{t.hint}</div>}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 bg-white border-2 border-line rounded-2xl p-1">
        {SIZES[tool].map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSizeIdx(i)}
            aria-label={`굵기 ${i + 1}`}
            className={`${sizeW} h-14 rounded-xl flex items-center justify-center transition-colors ${sizeIdx === i ? 'bg-paper ring-2 ring-ink' : 'hover:bg-paper'}`}
          >
            <span className="rounded-full bg-ink" style={{ width: 6 + i * 7, height: 6 + i * 7, opacity: tool === 'charcoal' ? 0.55 : 1 }} />
          </button>
        ))}
      </div>

      {/* 진하기는 목탄에서만 쓴다. 늘 보이게 두되 다른 도구일 때는 흐리게 잠가서, 빈자리도 버튼 밀림도 없게 */}
      <div
        className={`flex shrink-0 bg-white border-2 border-line rounded-2xl p-1 transition-opacity ${tool === 'charcoal' ? '' : 'opacity-35 pointer-events-none'}`}
        aria-disabled={tool !== 'charcoal'}
        title={tool === 'charcoal' ? undefined : '목탄 진하기'}
      >
        {STRENGTHS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            tabIndex={tool === 'charcoal' ? 0 : -1}
            onClick={() => setStrengthIdx(i)}
            className={`h-14 ${strengthPad} rounded-xl font-display ${tight ? 'text-base' : 'text-lg'} transition-colors ${strengthIdx === i ? 'bg-ink text-white' : 'hover:bg-paper'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 좁을 때는 되돌리기·전체 지우기를 아이콘으로 줄인다 */}
      <Button variant="secondary" size="sm" className={tight ? iconBtn : ''} title="되돌리기" onClick={() => pad.undo() && onUndo?.()} disabled={pad.undoCount === 0}>
        {tight ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-label="되돌리기">
            <path d="M7.5 5L3.5 9l4 4M4 9h7.5a4.5 4.5 0 010 9H9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          '되돌리기'
        )}
      </Button>
      <Button variant="secondary" size="sm" className={tight ? iconBtn : ''} title="전체 지우기" onClick={onClear}>
        {tight ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-label="전체 지우기">
            <path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          '전체 지우기'
        )}
      </Button>
      <Button size="md" className="flex-1 min-w-24" onClick={onSubmit} disabled={submitDisabled}>
        {submitLabel}
      </Button>
    </div>
  )
}
