import React, { useState, useRef } from 'react'
import { ArcadeBackground } from './CommonUI'
import { BackButton, Button, Screen } from './ui'

// 긴 이름도 쓸 수 있게 넓은 패드
const PAD_W = 960
const PAD_H = 270

export function HangulKeyboard({
  title, subtitle, onComplete, onCancel,
}: {
  title: string; subtitle: string; onComplete: (name: string) => void; onCancel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [assembledName, setAssembledName] = useState('')
  const [candidates, setCandidates] = useState<string[]>([])
  const [isRecognizing, setIsRecognizing] = useState(false)

  const last = useRef<{ x: number; y: number } | null>(null)
  const strokesRef = useRef<number[][][]>([])
  const currentStrokeRef = useRef<{ x: number[]; y: number[]; t: number[] }>({ x: [], y: [], t: [] })
  const strokeStartTimeRef = useRef<number>(0)
  // 이름이 길어지면 글자를 줄여 한 줄에 들어가게
  const nameSize = assembledName.length <= 8 ? 'text-6xl' : assembledName.length <= 14 ? 'text-5xl' : 'text-4xl'

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return {
      x: Math.round((e.clientX - r.left) * (c.width / r.width)),
      y: Math.round((e.clientY - r.top) * (c.height / r.height))
    }
  }

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setDrawing(true)
    setHasDrawn(true)
    const pos = getPos(e)
    last.current = pos
    try {
      ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
    } catch {
      // 이미 해제된 포인터면 캡처 없이 진행
    }
    strokeStartTimeRef.current = Date.now()
    currentStrokeRef.current = { x: [pos.x], y: [pos.y], t: [0] }
  }

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || !canvasRef.current || !last.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e)
    ctx.lineWidth = 10
    ctx.strokeStyle = '#2B1A40'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    last.current = pos
    currentStrokeRef.current.x.push(pos.x)
    currentStrokeRef.current.y.push(pos.y)
    currentStrokeRef.current.t.push(Date.now() - strokeStartTimeRef.current)
  }

  const onUp = () => {
    if (!drawing) return
    setDrawing(false)
    last.current = null
    if (currentStrokeRef.current.x.length > 0) {
      strokesRef.current.push([currentStrokeRef.current.x, currentStrokeRef.current.y, currentStrokeRef.current.t])
      recognizeHandwrittenName()
    }
  }

  // Google Handwriting 한글 필기인식 호출
  const recognizeHandwrittenName = async () => {
    if (strokesRef.current.length === 0) return
    setIsRecognizing(true)
    try {
      const res = await fetch("https://inputtools.google.com/request?ime=handwriting&app=mobilesearch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          options: "enable_pre_space",
          requests: [{
            writing_guide: { width: PAD_W, height: PAD_H },
            pre_context: "",
            max_num_results: 5,
            max_completions: 0,
            language: "ko",
            ink: strokesRef.current
          }]
        })
      })
      const data = await res.json()
      if (data?.[1]?.[0]?.[1]) {
        const topList: string[] = data[1][0][1].slice(0, 5)
        setCandidates(topList)
        // 1순위 인식 글자를 닉네임으로 자동 반영 (글자 수 제한 없음)
        setAssembledName(topList[0])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsRecognizing(false)
    }
  }

  // 캔버스 지우고 다시 쓰기
  const clearCanvas = () => {
    if (!canvasRef.current) return
    canvasRef.current.getContext('2d')!.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    strokesRef.current = []
    setHasDrawn(false)
    setAssembledName('')
    setCandidates([])
  }

  return (
    <Screen className="flex flex-col">
      <ArcadeBackground />
      <header className="relative px-14 pt-10">
        <BackButton onClick={onCancel} />
      </header>

      <main className="relative flex-1 flex flex-col items-center justify-center gap-7 px-14 pb-12">
        <div className="text-center">
          <h1 className="font-display text-5xl">{title}</h1>
          <p className="text-lg text-graphite mt-3">{subtitle}</p>
        </div>

        <div className="text-center">
          <div className={`font-display ${nameSize} min-w-[440px] max-w-[90vw] min-h-[5rem] px-8 pb-3 border-b-[3px] border-ink flex items-end justify-center break-all`}>
            {assembledName || <span className="text-graphite/30">이름</span>}
          </div>
          <div className="h-12 mt-3 flex items-center justify-center gap-2">
            {isRecognizing ? (
              <span className="text-sm text-graphite">읽는 중</span>
            ) : (
              candidates.length > 1 && (
                <>
                  <span className="text-sm text-graphite mr-1">다른 후보</span>
                  {candidates.slice(1, 4).map((cand, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAssembledName(cand)}
                      className="h-10 px-4 rounded-xl bg-white border-2 border-line font-display text-lg hover:border-violet/40"
                    >
                      {cand}
                    </button>
                  ))}
                </>
              )
            )}
          </div>
        </div>

        <div className="relative bg-white rounded-3xl border-2 border-line overflow-hidden max-w-[90vw]" style={{ width: PAD_W, aspectRatio: `${PAD_W} / ${PAD_H}` }}>
          <div className="absolute left-10 right-10 top-[72%] border-t-2 border-dashed border-line pointer-events-none" />
          <canvas
            ref={canvasRef}
            width={PAD_W}
            height={PAD_H}
            className="relative w-full h-full cursor-crosshair"
            style={{ touchAction: 'none' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          />
          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="font-display text-2xl text-graphite/35">여기에 손글씨로 이름을 쓰세요</span>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button variant="secondary" size="lg" onClick={clearCanvas}>다시 쓰기</Button>
          <Button size="lg" onClick={() => onComplete(assembledName.trim() || '익명')}>이 이름으로 시작</Button>
        </div>
      </main>
    </Screen>
  )
}
