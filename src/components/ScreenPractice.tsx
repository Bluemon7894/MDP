import { useEffect, useMemo, useRef, useState } from 'react'
import { KeywordMap, MetricBreakdown } from '../types'
import { pickRandomKeywords, toKorean } from '../constants/quickdraw'
import { evaluateDrawing } from '../utils/scoring'
import { recognizeDrawing } from '../utils/recognize'
import { AdvancedAnalysisModal } from './Modals'
import { ToolBar, snapshotOf, useDrawingPad } from './DrawingPad'
import { DrawStepsExample } from './Examples'
import { BackButton, Button, Label, Panel, KeywordTitle } from './ui'

const CANVAS_W = 1200
const CANVAS_H = 750
const TURN_SEC = 20

// 연습 공간: 실전과 같은 20초·같은 채점(속도 포함)으로 그려 보되, 랭킹에는 기록하지 않는다.
// 시계는 첫 획을 긋는 순간부터 간다.
export function ScreenPractice({ onHome }: { onHome: () => void }) {
  const [keyword, setKeyword] = useState<KeywordMap>(() => pickRandomKeywords(1)[0])
  const [guesses, setGuesses] = useState<string[]>([])
  const [rank, setRank] = useState(0)
  const [status, setStatus] = useState('아무거나 그려 보세요. AI가 무엇으로 보는지 바로 알려 줍니다.')
  const [report, setReport] = useState<MetricBreakdown | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(TURN_SEC)
  const seq = useRef(0)
  const rankRef = useRef(0)
  rankRef.current = rank

  const runRecognition = async () => {
    const strokes = pad.recognitionStrokes()
    if (!strokes.length) {
      setGuesses([])
      setRank(0)
      return
    }
    const mySeq = ++seq.current
    setStatus('AI가 보고 있습니다.')
    const res = await recognizeDrawing(strokes, keyword)
    if (mySeq !== seq.current) return
    if (!res) {
      setStatus('인식 서버에 연결하지 못했습니다.')
      return
    }
    setGuesses(res.list.map(toKorean))
    setRank(res.rank)
    setStatus(res.rank ? `${keyword.ko}(으)로 ${res.rank}순위 인식했습니다.` : `${toKorean(res.list[0])}(으)로 보고 있습니다.`)
  }

  const pad = useDrawingPad({
    width: CANVAS_W,
    height: CANVAS_H,
    enabled: report === null,
    onStrokeEnd: (t, pencilCount) => {
      if (t === 'pencil' || pencilCount === 0) runRecognition()
    },
  })
  const { canvasRef, hasDrawn } = pad

  // 첫 획부터 20초
  useEffect(() => {
    if (hasDrawn && startedAt === null && !report) setStartedAt(Date.now())
  }, [hasDrawn, startedAt, report])

  const judge = (left: number) => {
    if (!canvasRef.current || report) return
    pad.stopDrawing()
    setReport(evaluateDrawing(canvasRef.current, left, rankRef.current, TURN_SEC))
  }

  useEffect(() => {
    if (startedAt === null || report) return
    const t = setInterval(() => {
      const left = Math.max(0, TURN_SEC - Math.floor((Date.now() - startedAt) / 1000))
      setTimeLeft(left)
      // 시간이 다 되면 실전처럼 그대로 채점
      if (left === 0) judge(0)
    }, 200)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, report])

  const reportImage = useMemo(
    () => (report && canvasRef.current ? snapshotOf(canvasRef.current, 960, 0.85) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report],
  )

  const clear = () => {
    pad.clear()
    seq.current++
    setGuesses([])
    setRank(0)
    setStatus('캔버스를 비웠습니다.')
  }

  const nextKeyword = () => {
    let k = pickRandomKeywords(1)[0]
    if (k.en === keyword.en) k = pickRandomKeywords(1)[0]
    setKeyword(k)
    pad.reset()
    seq.current++
    setGuesses([])
    setRank(0)
    setStartedAt(null)
    setTimeLeft(TURN_SEC)
    setStatus(`이번에는 ${k.ko}을(를) 그려 보세요. 첫 획부터 20초가 흐릅니다.`)
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-paper font-ui text-ink relative select-none">
      {report && (
        <AdvancedAnalysisModal
          report={report}
          subtitle={`연습 · ${keyword.ko} (${keyword.en})`}
          image={reportImage}
          guesses={guesses}
          hit={rank}
          onDone={() => {
            setReport(null)
            nextKeyword()
          }}
        />
      )}

      <header className="flex items-center gap-8 px-8 h-24 shrink-0 bg-white border-b-2 border-line">
        <BackButton onClick={onHome}>처음으로</BackButton>
        <div>
          <Label>연습 공간</Label>
          <div className="font-display text-2xl leading-none mt-1">실전과 같은 채점 · 기록 안 됨</div>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <Label>제시어</Label>
          <div className="font-display text-5xl leading-none mt-1">
            <KeywordTitle ko={keyword.ko} en={keyword.en} />
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={nextKeyword}>다른 제시어</Button>
        <div className="w-36 text-right">
          <Label>{startedAt === null ? '첫 획부터 시작' : '남은 시간'}</Label>
          <div className={`font-display text-5xl leading-none mt-1 tabular-nums ${startedAt !== null && timeLeft <= 5 ? 'text-accent' : ''}`}>
            {timeLeft}
            <span className="text-xl text-graphite ml-1">초</span>
          </div>
        </div>
      </header>
      <div className="h-1.5 bg-line shrink-0">
        <div
          className={`h-full transition-[width] duration-200 ease-linear ${timeLeft <= 5 && startedAt !== null ? 'bg-accent' : 'bg-violet'}`}
          style={{ width: `${(timeLeft / TURN_SEC) * 100}%` }}
        />
      </div>

      <div className="flex flex-1 gap-6 p-6 min-h-0">
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className={`flex-1 relative rounded-3xl overflow-hidden bg-white border-2 transition-colors ${rank > 0 ? 'border-ok' : 'border-line'}`}>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="w-full h-full"
              style={{ cursor: 'crosshair', touchAction: 'none' }}
              {...pad.handlers}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="font-display text-2xl text-graphite/35">여기에 자유롭게 그려 보세요</span>
              </div>
            )}
          </div>
          <ToolBar
            pad={pad}
            disabled={report !== null}
            onUndo={runRecognition}
            onClear={clear}
            submitLabel="완성"
            onSubmit={() => judge(timeLeft)}
            submitDisabled={!hasDrawn}
          />
        </div>

        <div className="w-64 2xl:w-80 flex flex-col gap-5 shrink-0">
          <Panel className="p-6 flex-1 flex flex-col">
            <Label>AI 판정</Label>
            <p className="font-display text-xl leading-snug mt-3 min-h-[3.5rem]">{status}</p>
            {guesses.length > 0 && (
              <ol className="mt-4 flex flex-col gap-1.5">
                {guesses.map((g, i) => (
                  <li key={i} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${rank === i + 1 ? 'bg-ok/10 text-ok' : ''}`}>
                    <span className="w-5 text-sm font-bold text-graphite tabular-nums">{i + 1}</span>
                    <span className="font-display text-lg">{g}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-auto pt-5">
              <DrawStepsExample />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
