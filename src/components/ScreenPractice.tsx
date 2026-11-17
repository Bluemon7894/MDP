import { useEffect, useMemo, useRef, useState } from 'react'
import { KeywordMap, MetricBreakdown } from '../types'
import { pickRandomKeywords, toKorean } from '../constants/quickdraw'
import { evaluateDrawing } from '../utils/scoring'
import { recognizeDrawing } from '../utils/recognize'
import { sound } from '../utils/sound'
import { AdvancedAnalysisModal } from './Modals'
import { ToolBar, snapshotOf, useDrawingPad } from './DrawingPad'
import { GuessBoard, toGuessItems } from './GuessBoard'
import { EGG_TEXT, rollGarbageEgg } from '../utils/easterEgg'
import { BackButton, Button, Label, Panel, KeywordTitle } from './ui'

const CANVAS_W = 1200
const CANVAS_H = 750
const TURN_SEC = 20

// 연습 공간: 실전과 같은 20초·같은 채점(속도 포함)으로 그려 보되, 랭킹에는 기록하지 않는다.
// 시계는 첫 획을 긋는 순간부터 간다.
export function ScreenPractice({ onHome }: { onHome: () => void }) {
  const [keyword, setKeyword] = useState<KeywordMap>(() => pickRandomKeywords(1)[0])
  const [guesses, setGuesses] = useState<string[]>([])
  // AI 판정 칸을 채우는 긴 추론 키워드 목록 (한글)
  const [moreGuesses, setMoreGuesses] = useState<string[]>([])
  // 깜짝 이스터에그: 알아볼 수 없는 그림에 아주 가끔 "뭘 그리신 거에요...?" 만 띄우고 후보를 비운다
  const [egg, setEgg] = useState(false)
  const [rank, setRank] = useState(0)
  const [status, setStatus] = useState('아무거나 그려 보세요. AI가 무엇으로 보는지 바로 알려 줍니다.')
  const [report, setReport] = useState<MetricBreakdown | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(TURN_SEC)
  const seq = useRef(0)
  const rankRef = useRef(0)
  const bestRankRef = useRef(0)
  rankRef.current = rank

  // 마지막으로 인식을 마친 그림 (획마다 점 수). 채점 직전에 지금 그림과 다르면 한 번 더 본다
  const strokesSig = () => pad.recognitionStrokes().map(st => st[0].length).join(',')
  const recognizedSigRef = useRef<string | null>(null)
  const finishingRef = useRef(false)

  /** 인식이 끝나면 순위를, 더 새 인식에 밀렸거나 실패하면 null */
  const runRecognition = async (): Promise<number | null> => {
    const strokes = pad.recognitionStrokes()
    if (!strokes.length) {
      setGuesses([])
      setMoreGuesses([])
      setEgg(false)
      setRank(0)
      rankRef.current = 0
      bestRankRef.current = 0
      recognizedSigRef.current = ''
      return 0
    }
    const sig = strokesSig()
    const mySeq = ++seq.current
    setStatus('AI가 보고 있습니다.')
    const res = await recognizeDrawing(strokes, keyword)
    if (mySeq !== seq.current) return null
    if (!res) {
      setStatus('인식 서버에 연결하지 못했습니다.')
      return null
    }
    recognizedSigRef.current = sig
    rankRef.current = res.rank
    setGuesses(res.list.map(toKorean))
    if (rollGarbageEgg(res, strokes.length)) {
      setMoreGuesses([])
      setEgg(true)
      setRank(res.rank)
      setStatus(EGG_TEXT)
      return res.rank
    }
    setEgg(false)
    setMoreGuesses(toGuessItems(res.more))
    setRank(res.rank)
    if (res.rank > 0 && (bestRankRef.current === 0 || res.rank < bestRankRef.current)) {
      bestRankRef.current = res.rank
      sound.playAiRecognized(res.rank)
    }
    setStatus(res.rank ? `${keyword.ko}(으)로 ${res.rank}순위 인식했습니다.` : `${toKorean(res.list[0])}(으)로 보고 있습니다.`)
    return res.rank
  }

  const pad = useDrawingPad({
    width: CANVAS_W,
    height: CANVAS_H,
    enabled: report === null,
    onStrokeEnd: (t, pencilCount) => {
      // 연필 획이든 지우개로 지운 것이든 그림이 바뀌면 AI가 다시 본다
      void t
      void pencilCount
      runRecognition()
    },
  })
  const { canvasRef, hasDrawn } = pad

  // 첫 획부터 20초
  useEffect(() => {
    if (hasDrawn && startedAt === null && !report) setStartedAt(Date.now())
  }, [hasDrawn, startedAt, report])

  /** 채점: 누른 순간의 남은 시간으로, 마지막 획의 인식까지 기다린 순위로 */
  const judge = async (left: number) => {
    if (!canvasRef.current || report || finishingRef.current) return
    finishingRef.current = true
    pad.stopDrawing()
    let r = rankRef.current
    if (pad.recognitionStrokes().length && recognizedSigRef.current !== strokesSig()) {
      setStatus('AI가 마지막 획까지 확인하고 있습니다.')
      r = (await runRecognition()) ?? rankRef.current
    }
    finishingRef.current = false
    if (canvasRef.current) setReport(evaluateDrawing(canvasRef.current, left, r, TURN_SEC, pad.recognitionStrokes()))
  }

  useEffect(() => {
    if (startedAt === null || report) return
    const t = setInterval(() => {
      const left = Math.max(0, TURN_SEC - Math.floor((Date.now() - startedAt) / 1000))
      setTimeLeft(left)
      // 시간이 다 되면 실전처럼 그대로 채점
      if (left === 0) {
        sound.playSubmit()
        judge(0)
      }
    }, 200)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, report])

  useEffect(() => {
    if (startedAt !== null && !report && timeLeft >= 1 && timeLeft <= 5) {
      sound.playTimerTick(timeLeft)
    }
  }, [startedAt, report, timeLeft])

  const reportImage = useMemo(
    () => (report && canvasRef.current ? snapshotOf(canvasRef.current, 960, 0.85) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report],
  )

  const clear = () => {
    pad.clear()
    seq.current++
    setGuesses([])
    setMoreGuesses([])
    setEgg(false)
    setRank(0)
    bestRankRef.current = 0
    setStatus('캔버스를 비웠습니다.')
  }

  const nextKeyword = () => {
    let k = pickRandomKeywords(1)[0]
    if (k.en === keyword.en) k = pickRandomKeywords(1)[0]
    setKeyword(k)
    pad.reset()
    seq.current++
    setGuesses([])
    setMoreGuesses([])
    setEgg(false)
    setRank(0)
    bestRankRef.current = 0
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
          {/* AI 판정: 상태 문구 + 칸을 꽉 채우는 추론 키워드 (1~5위는 채점 후보, 그 아래는 그 밖에 떠올린 것) */}
          <Panel className="p-4 2xl:p-5 flex-1 min-h-0 flex flex-col overflow-hidden">
            <Label>AI 판정</Label>
            <p className="shrink-0 font-display text-lg 2xl:text-xl leading-snug mt-2 min-h-[2.5rem]">{status}</p>
            <GuessBoard items={moreGuesses} target={rank > 0 ? keyword.ko : null} waiting={egg ? '' : '그리면 AI가 떠올린 것이 쌓입니다'} />
          </Panel>
        </div>
      </div>
    </div>
  )
}
