import { useState, useEffect, useMemo, useRef } from 'react'
import { ActivePlayer, KeywordMap, MetricBreakdown } from '../types'
import { toKorean } from '../constants/quickdraw'
import { createAiArtwork } from '../utils/aiRender'
import { evaluateDrawing } from '../utils/scoring'
import { recognizeDrawing } from '../utils/recognize'
import { AdvancedAnalysisModal } from './Modals'
import { Button, Label, Overlay, Panel, KeywordTitle } from './ui'
import { INK, ToolBar, snapshotOf, useDrawingPad } from './DrawingPad'
import { DrawStepsExample } from './Examples'

const CANVAS_W = 1200
const CANVAS_H = 750
const TURN_SEC = 20
function PencilCursor({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: `${(x / CANVAS_W) * 100}%`, top: `${(y / CANVAS_H) * 100}%`, transform: 'translate(-2px, -46px)' }}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <g transform="rotate(35 24 24)">
          <rect x="20" y="2" width="9" height="32" rx="1.5" fill="#FFD43B" stroke={INK} strokeWidth="2" />
          <rect x="20" y="2" width="9" height="6" rx="1.5" fill="#FF8787" stroke={INK} strokeWidth="2" />
          <path d="M20 34 L24.5 45 L29 34 Z" fill="#F4E3C8" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M23.2 41.5 L24.5 45 L25.8 41.5 Z" fill={INK} />
        </g>
      </svg>
    </div>
  )
}

export function ScreenGame({
  role, round, timeLeft, currentKeyword, p1Name, p2Name, p1Score, p2Score, activePlayer, isTwoPlayer, vsAi,
  simultaneous = false, doneRoles = [], onRoundComplete, onHome,
}: {
  role: '1P' | '2P'; round: number; timeLeft: number; currentKeyword: KeywordMap
  p1Name: string; p2Name: string; p1Score: number; p2Score: number; activePlayer: ActivePlayer; isTwoPlayer: boolean; vsAi: boolean
  /** 둘이 대결: 두 화면이 같은 제시어를 동시에 그린다 (번갈아 그리지 않음) */
  simultaneous?: boolean
  /** 동시 대결에서 이번 라운드를 끝낸 사람 */
  doneRoles?: ActivePlayer[]
  onRoundComplete: (score: number, snapshot: string, player: ActivePlayer) => void; onHome: () => void
}) {
  const isAiPlayer = vsAi && activePlayer === '2P'
  const isMyTurn = simultaneous || ((!isTwoPlayer || vsAi || role === activePlayer) && !isAiPlayer)
  const totalRounds = 10
  // 동시 대결에서는 이 화면의 주인이 그리는 사람
  const drawer: ActivePlayer = simultaneous ? role : activePlayer
  const drawerName = drawer === '1P' ? p1Name : p2Name
  const opponentName = drawer === '1P' ? p2Name : p1Name
  // 이번 라운드 그림을 이미 냈는지 (동시 대결에서 상대를 기다리는 동안 다시 채점하지 않게)
  const [submitted, setSubmitted] = useState(false)

  const [statusText, setStatusText] = useState('')
  const [guesses, setGuesses] = useState<string[]>([])
  const [rank, setRank] = useState(0)
  const rankRef = useRef(0)
  const recogSeq = useRef(0)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [analysisReport, setAnalysisReport] = useState<MetricBreakdown | null>(null)
  const [aiPenPos, setAiPenPos] = useState<{ x: number; y: number } | null>(null)

  const pad = useDrawingPad({
    width: CANVAS_W,
    height: CANVAS_H,
    enabled: isMyTurn && analysisReport === null && !submitted,
    // 연필 획을 그을 때마다(연필이 없으면 명암 획으로) AI가 다시 본다
    onStrokeEnd: (t, pencilCount) => {
      if (t === 'pencil' || pencilCount === 0) runRecognition()
    },
  })
  const { canvasRef, hasDrawn } = pad

  // 채점 순간의 그림을 결과 창 심사 연출에 띄운다
  const reportImage = useMemo(
    () => (analysisReport && canvasRef.current ? snapshotOf(canvasRef.current, 960, 0.85) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analysisReport],
  )

  const timeLeftRef = useRef(timeLeft)
  timeLeftRef.current = timeLeft

  const setRecognition = (r: number, list: string[]) => {
    rankRef.current = r
    setRank(r)
    setGuesses(list.map(toKorean))
  }

  // 라운드/턴 변경 시 초기화
  useEffect(() => {
    pad.reset()
    setSubmitted(false)
    setAnalysisReport(null)
    setRecognition(0, [])
    setAiPenPos(null)
    recogSeq.current++

    if (isAiPlayer) setStatusText('AI가 구도를 잡고 있습니다.')
    else if (isMyTurn) setStatusText('연필로 형태를 잡고, 목탄으로 명암을 넣으세요.')
    else setStatusText(`${drawerName}님이 그리고 있습니다.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, activePlayer, isMyTurn, isAiPlayer, currentKeyword])

  // ── AI 차례: 완성본을 만들어 두고 붓질로 드러내며 그린다. 채점은 사람과 같은 기준 ──
  useEffect(() => {
    if (!isAiPlayer || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    let cancelled = false
    let animId = 0

    const finish = async (strokes: number[][][]) => {
      setAiPenPos(null)
      const doneAt = timeLeftRef.current
      setStatusText('완성했습니다. AI 판정을 받는 중입니다.')
      const res = await recognizeDrawing(strokes, currentKeyword)
      if (cancelled) return
      const r = res?.rank ?? 0
      setRecognition(r, res?.list ?? [])
      setStatusText(res ? (r ? `${r}순위로 인식되었습니다.` : '인식되지 않았습니다.') : '인식 서버에 연결하지 못했습니다.')
      setAnalysisReport(evaluateDrawing(canvas, doneAt, r, TURN_SEC))
    }

    createAiArtwork(currentKeyword.en, CANVAS_W, CANVAS_H).then(({ art, phases, strokes, complexity }) => {
      if (cancelled) return
      const pattern = ctx.createPattern(art, 'no-repeat')!
      // 복잡한 제시어일수록 오래 걸린다 (약 8~13초)
      const total = Math.min(13000, 7400 + complexity * 220 + Math.random() * 1600)
      const bounds = [0, 0.2, 0.48, 0.78, 1].map(f => f * total)
      const drawn = phases.map(() => 0)
      const messages = ['윤곽을 잡는 중입니다.', '큰 명암을 올리는 중입니다.', '어두운 부분을 쌓는 중입니다.', '마무리하는 중입니다.']
      let lastPhase = -1
      const start = performance.now()

      const loop = (now: number) => {
        if (cancelled) return
        const t = now - start
        ctx.strokeStyle = pattern
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        let pen: [number, number] | null = null
        phases.forEach((list, p) => {
          const f = Math.max(0, Math.min(1, (t - bounds[p]) / (bounds[p + 1] - bounds[p])))
          const target = Math.floor(f * list.length)
          while (drawn[p] < target) {
            const s = list[drawn[p]++]
            ctx.globalAlpha = s.alpha
            ctx.lineWidth = s.width
            ctx.beginPath()
            s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
            ctx.stroke()
            pen = s.pts[s.pts.length - 1]
          }
          if (t >= bounds[p] && p > lastPhase && t < total) {
            lastPhase = p
            setStatusText(messages[p])
          }
        })
        ctx.globalAlpha = 1
        if (pen) setAiPenPos({ x: pen[0], y: pen[1] })

        if (t < total) {
          animId = requestAnimationFrame(loop)
          return
        }
        ctx.drawImage(art, 0, 0)
        finish(strokes)
      }
      animId = requestAnimationFrame(loop)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(animId)
      ctx.globalAlpha = 1
    }
  }, [isAiPlayer, currentKeyword])

  // 시간 초과: 그리던 화면에서만 채점 (마지막 인식 결과는 인정, 속도 점수는 0)
  useEffect(() => {
    if (timeLeft === 0 && isMyTurn && !submitted && analysisReport === null && canvasRef.current) {
      pad.stopDrawing()
      setAnalysisReport(evaluateDrawing(canvasRef.current, 0, rankRef.current, TURN_SEC))
    }
  }, [timeLeft, isMyTurn, analysisReport, submitted])

  const runRecognition = async () => {
    const strokes = pad.recognitionStrokes()
    if (!strokes.length) {
      setRecognition(0, [])
      return
    }
    const seq = ++recogSeq.current
    setStatusText('AI가 그림을 보고 있습니다.')
    const res = await recognizeDrawing(strokes, currentKeyword)
    if (seq !== recogSeq.current) return
    if (!res) {
      setStatusText('인식 서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.')
      return
    }
    const r = res.rank
    setRecognition(r, res.list)
    setStatusText(r ? `${r}순위로 알아봤습니다. 명암을 더하거나 바로 완성하세요.` : `${toKorean(res.list[0])}(으)로 보고 있습니다.`)
  }

  const clearCanvas = () => {
    if (!isMyTurn || analysisReport !== null) return
    pad.clear()
    recogSeq.current++
    setRecognition(0, [])
    setStatusText('캔버스를 비웠습니다.')
  }

  const submit = () => {
    if (!canvasRef.current || analysisReport !== null || submitted) return
    setAnalysisReport(evaluateDrawing(canvasRef.current, timeLeft, rankRef.current, TURN_SEC))
  }

  const curTime = isNaN(timeLeft) ? 0 : timeLeft
  const warn = curTime <= 5
  const canDraw = isMyTurn && analysisReport === null && !submitted

  // 점수판 상태: 동시 대결은 둘 다 그리는 중/완성, 번갈아 하는 모드는 차례인 사람만 그리는 중
  const playerState = (id: ActivePlayer) =>
    simultaneous ? (doneRoles.includes(id) ? '완성' : '그리는 중') : activePlayer === id ? '그리는 중' : id

  const players = [
    { id: '1P' as const, name: p1Name, score: p1Score },
    ...(isTwoPlayer ? [{ id: '2P' as const, name: p2Name, score: p2Score }] : []),
  ]

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-paper font-ui text-ink relative select-none">
      {showExitConfirm && (
        <Overlay>
          <Panel className="p-9 w-[440px] text-center">
            <h3 className="font-display text-3xl">게임을 그만둘까요?</h3>
            <p className="text-graphite mt-3">지금까지의 점수는 저장되지 않습니다.</p>
            <div className="flex gap-3 mt-8 justify-center">
              <Button variant="secondary" onClick={() => setShowExitConfirm(false)}>계속하기</Button>
              <Button onClick={onHome}>그만두기</Button>
            </div>
          </Panel>
        </Overlay>
      )}

      {analysisReport && (
        <AdvancedAnalysisModal
          report={analysisReport}
          subtitle={`${drawerName} · ${currentKeyword.ko} (${currentKeyword.en})`}
          image={reportImage}
          guesses={guesses}
          hit={rank}
          onDone={() => {
            const pts = analysisReport.totalPts
            const snap = canvasRef.current && !isAiPlayer ? snapshotOf(canvasRef.current, 480, 0.72, true) : ''
            setAnalysisReport(null)
            setSubmitted(true)
            onRoundComplete(pts, snap, drawer)
          }}
        />
      )}

      {/* 상단: 라운드 · 제시어 · 남은 시간 */}
      <header className="flex items-center gap-8 px-8 h-24 shrink-0 bg-white border-b-2 border-line">
        <Button variant="secondary" size="sm" onClick={() => setShowExitConfirm(true)}>나가기</Button>
        <div>
          <Label>라운드</Label>
          <div className="font-display text-3xl leading-none mt-1 tabular-nums">
            {round}<span className="text-graphite text-xl"> / {totalRounds}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center">
          <Label>제시어</Label>
          <div className="font-display text-5xl leading-none mt-1">
            <KeywordTitle ko={currentKeyword.ko} en={currentKeyword.en} />
          </div>
        </div>

        <div className="w-36 text-right">
          <Label>남은 시간</Label>
          <div className={`font-display text-5xl leading-none mt-1 tabular-nums ${warn ? 'text-accent' : ''}`}>
            {curTime}<span className="text-xl text-graphite ml-1">초</span>
          </div>
        </div>
      </header>
      <div className="h-1.5 bg-line shrink-0">
        <div className={`h-full transition-[width] duration-1000 ease-linear ${warn ? 'bg-accent' : 'bg-violet'}`} style={{ width: `${(curTime / TURN_SEC) * 100}%` }} />
      </div>

      <div className="flex flex-1 gap-6 p-6 min-h-0">
        {/* 캔버스 + 도구 */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className={`flex-1 relative rounded-3xl overflow-hidden bg-white border-2 transition-colors ${rank > 0 && canDraw ? 'border-ok' : 'border-line'}`}>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className={`w-full h-full ${!canDraw ? 'pointer-events-none' : ''}`}
              style={{ cursor: 'crosshair', touchAction: 'none' }}
              {...pad.handlers}
            />

            {isAiPlayer && aiPenPos && <PencilCursor x={aiPenPos.x} y={aiPenPos.y} />}
            {isAiPlayer && (
              <div className="absolute top-5 left-5 px-4 py-2 rounded-xl bg-ink text-white font-display text-lg">AI 차례</div>
            )}

            {!isMyTurn && !isAiPlayer && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/85 pointer-events-none">
                <Label>관전 중</Label>
                <div className="font-display text-4xl mt-2">{drawerName}님이 그리고 있습니다</div>
              </div>
            )}

            {/* 동시 대결: 먼저 끝낸 사람은 상대를 기다린다 */}
            {simultaneous && submitted && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/85 pointer-events-none">
                <Label>이번 라운드 완성</Label>
                <div className="font-display text-4xl mt-2">
                  {doneRoles.length >= 2 ? '다음 라운드를 준비하고 있습니다' : `${opponentName}님을 기다리고 있습니다`}
                </div>
              </div>
            )}

            {canDraw && !hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="font-display text-2xl text-graphite/35">여기에 그리세요</span>
              </div>
            )}
          </div>

          {/* 도구 막대 */}
          <ToolBar pad={pad} disabled={!canDraw} onUndo={runRecognition} onClear={clearCanvas} submitLabel="완성" onSubmit={submit} submitDisabled={!hasDrawn} />
        </div>

        {/* 우측: 점수 · AI 판정 */}
        <div className="w-64 2xl:w-80 flex flex-col gap-5 shrink-0">
          <Panel className="p-6">
            <Label>점수</Label>
            <div className="mt-3">
              {players.map(p => (
                <div key={p.id} className="flex items-center justify-between py-3 border-b-2 border-line last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${playerState(p.id) === '그리는 중' ? 'bg-accent' : playerState(p.id) === '완성' ? 'bg-ok' : 'bg-line'}`} />
                    <div className="min-w-0">
                      <div className="font-display text-xl truncate">{p.name}</div>
                      <div className="text-xs text-graphite">{playerState(p.id)}</div>
                    </div>
                  </div>
                  <div className="font-display text-3xl tabular-nums">{(isNaN(p.score) ? 0 : p.score).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-6 flex-1 flex flex-col">
            <Label>AI 판정</Label>
            <p className="font-display text-xl leading-snug mt-3 min-h-[3.5rem]">{statusText}</p>
            {guesses.length > 0 && (
              <ol className="mt-5 flex flex-col gap-1.5">
                {guesses.map((g, i) => (
                  <li key={i} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${rank === i + 1 ? 'bg-ok/10 text-ok' : ''}`}>
                    <span className="w-5 text-sm font-bold text-graphite tabular-nums">{i + 1}</span>
                    <span className="font-display text-lg">{g}</span>
                  </li>
                ))}
              </ol>
            )}
            {isMyTurn && (
              <div className="mt-auto pt-5">
                <DrawStepsExample />
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
