import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { KeywordMap, MetricBreakdown } from '../types'
import { toKorean } from '../constants/quickdraw'
import { evaluateCoop } from '../utils/scoring'
import { recognizeDrawing } from '../utils/recognize'
import { onArcade, postArcade } from '../utils/arcadeSync'
import { AdvancedAnalysisModal } from './Modals'
import { ToolBar, snapshotOf, useDrawingPad } from './DrawingPad'
import { HalfExample } from './Examples'
import { Button, Label, Overlay, Panel, KeywordTitle } from './ui'

// ─────────────────────────────────────────────────────────────────────────────
// 반쪽 협동: 같은 제시어를 1P 는 왼쪽 반, 2P 는 오른쪽 반만 동시에 그린다.
// 서로의 반쪽은 가려져 있다가, 둘 다 끝나면 1P 화면이 두 반쪽을 이어 붙여 AI 판정·채점을 하고
// 결과(합친 그림 + 점수)를 두 화면에 함께 공개한다. 팀 점수 하나로 랭킹에 오른다.
// ─────────────────────────────────────────────────────────────────────────────

const HALF_W = 600
const CANVAS_H = 750
const TURN_SEC = 20
// 1P 가 시간이 다 됐는데 2P 반쪽이 안 오면 이만큼 더 기다렸다가 있는 것만으로 채점
const PARTNER_GRACE_MS = 6000

type Role = '1P' | '2P'

interface HalfPayload {
  round: number
  role: Role
  strokes: number[][][]
  image: string
  timeLeft: number
}

interface ResultPayload {
  round: number
  report: MetricBreakdown
  image: string
  list: string[]
  /** 제시어가 몇 번째 후보였는지 (0 = 없음) */
  rank: number
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

// 반쪽 캔버스 두 장을 나란히 놓을 수 있는 가장 큰 크기 (16:10)
function useFitBox(ratio: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const { width, height } = el.getBoundingClientRect()
      const w = Math.min(width, height * ratio)
      setSize({ w, h: w / ratio })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ratio])
  return { ref, size }
}

export function ScreenHalf({
  role, round, timeLeft, currentKeyword, p1Name, p2Name, teamScore, onRoundComplete, onHome,
}: {
  role: Role; round: number; timeLeft: number; currentKeyword: KeywordMap
  p1Name: string; p2Name: string; teamScore: number
  /** 1P 화면에서만 불린다 (팀 점수, 합친 그림) */
  onRoundComplete: (score: number, snapshot: string) => void
  onHome: () => void
}) {
  const isHost = role === '1P'
  const side = isHost ? '왼쪽' : '오른쪽'
  const partnerRole: Role = isHost ? '2P' : '1P'
  const partnerName = isHost ? p2Name : p1Name
  const myName = isHost ? p1Name : p2Name

  const [myDone, setMyDone] = useState(false)
  const [partnerDone, setPartnerDone] = useState(false)
  const [result, setResult] = useState<ResultPayload | null>(null)
  const [waitingNext, setWaitingNext] = useState(false)
  const [judging, setJudging] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const halvesRef = useRef<Partial<Record<Role, HalfPayload>>>({})
  const evaluatedRef = useRef(false)
  const combinedRef = useRef<HTMLCanvasElement | null>(null)
  const roundRef = useRef(round)
  roundRef.current = round
  const timeLeftRef = useRef(timeLeft)
  timeLeftRef.current = timeLeft

  const pad = useDrawingPad({ width: HALF_W, height: CANVAS_H, enabled: !myDone && result === null })
  const { canvasRef, hasDrawn } = pad
  const { ref: stageRef, size } = useFitBox(16 / 10)

  // 라운드가 바뀌면 처음부터
  useEffect(() => {
    pad.reset()
    setMyDone(false)
    setPartnerDone(false)
    setResult(null)
    setWaitingNext(false)
    setJudging(false)
    halvesRef.current = {}
    evaluatedRef.current = false
    combinedRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, currentKeyword])

  // 1P: 두 반쪽을 이어 붙여 판정·채점하고 결과를 두 화면에 보낸다
  const evaluate = async () => {
    if (!isHost || evaluatedRef.current) return
    evaluatedRef.current = true
    setJudging(true)
    const thisRound = roundRef.current
    const { '1P': left, '2P': right } = halvesRef.current

    const c = document.createElement('canvas')
    c.width = HALF_W * 2
    c.height = CANVAS_H
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, c.width, c.height)
    try {
      if (left) ctx.drawImage(await loadImage(left.image), 0, 0, HALF_W, CANVAS_H)
      if (right) ctx.drawImage(await loadImage(right.image), HALF_W, 0, HALF_W, CANVAS_H)
    } catch {
      // 그림을 못 읽으면 빈 반쪽으로 둔다
    }
    combinedRef.current = c

    const strokes = [
      ...(left?.strokes ?? []),
      ...(right?.strokes ?? []).map(([xs, ys, ts]) => [xs.map(x => x + HALF_W), ys, ts]),
    ]
    const res = strokes.length ? await recognizeDrawing(strokes, currentKeyword) : null
    // 속도 점수는 둘 중 늦게 끝낸 쪽 기준
    const t = Math.min(left?.timeLeft ?? 0, right?.timeLeft ?? 0)
    const report = evaluateCoop(c, t, res?.rank ?? 0, TURN_SEC)
    if (roundRef.current !== thisRound) return
    postArcade('HALF_RESULT', { round: thisRound, report, image: c.toDataURL('image/jpeg', 0.82), list: res?.list ?? [], rank: res?.rank ?? 0 } satisfies ResultPayload)
  }

  // 메시지: 상대 반쪽 완성, 판정 결과
  useEffect(() => {
    return onArcade(
      ({ type, payload }) => {
        if (!payload || payload.round !== roundRef.current) return
        if (type === 'HALF_DONE') {
          const half = payload as HalfPayload
          if (half.role === partnerRole) setPartnerDone(true)
          if (isHost) {
            halvesRef.current[half.role] = half
            if (halvesRef.current['1P'] && halvesRef.current['2P']) evaluate()
          }
        } else if (type === 'HALF_RESULT') {
          setJudging(false)
          setResult(payload as ResultPayload)
        }
      },
      { includeSelf: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, partnerRole, currentKeyword])

  const submit = () => {
    if (myDone || !canvasRef.current) return
    pad.stopDrawing()
    setMyDone(true)
    postArcade('HALF_DONE', {
      round: roundRef.current,
      role,
      strokes: pad.recognitionStrokes(),
      image: snapshotOf(canvasRef.current, HALF_W, 0.85),
      timeLeft: timeLeftRef.current,
    } satisfies HalfPayload)
  }

  // 시간이 다 되면 자동 완성. 1P 는 상대 반쪽을 조금 더 기다렸다가 있는 것만으로 채점
  useEffect(() => {
    if (timeLeft > 0 || result) return
    if (!myDone) submit()
    if (!isHost) return
    const t = setTimeout(evaluate, PARTNER_GRACE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, result])

  const curTime = isNaN(timeLeft) ? 0 : timeLeft
  const warn = curTime <= 5
  const canDraw = !myDone && result === null

  const partnerCell = (
    <div className="relative h-full bg-paper [background-image:repeating-linear-gradient(135deg,transparent_0_14px,rgba(43,26,64,0.05)_14px_16px)] flex flex-col items-center justify-center text-center px-6">
      <Label>{isHost ? '오른쪽' : '왼쪽'} 반쪽</Label>
      <div className="font-display text-3xl mt-2">{partnerName}님</div>
      <div className={`mt-4 h-9 px-4 inline-flex items-center rounded-full font-display text-lg ${partnerDone ? 'bg-ok text-white' : 'bg-white border-2 border-line text-graphite'}`}>
        {partnerDone ? '완성' : '그리는 중'}
      </div>
      <p className="mt-4 text-sm text-graphite">둘 다 끝나면 공개됩니다</p>
    </div>
  )

  const myCell = (
    <div className="relative h-full bg-white">
      <canvas
        ref={canvasRef}
        width={HALF_W}
        height={CANVAS_H}
        className={`w-full h-full ${!canDraw ? 'pointer-events-none' : ''}`}
        style={{ cursor: 'crosshair', touchAction: 'none' }}
        {...pad.handlers}
      />
      {canDraw && !hasDrawn && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-8 text-center">
          <span className="font-display text-2xl text-graphite/35">{currentKeyword.ko}의 {side} 반쪽을 그리세요</span>
        </div>
      )}
      {myDone && !result && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 pointer-events-none">
          <div className="font-display text-3xl">{judging ? 'AI가 합친 그림을 보는 중' : '완성했습니다'}</div>
          {!judging && !partnerDone && <p className="text-graphite mt-2">{partnerName}님을 기다리고 있습니다</p>}
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-paper font-ui text-ink relative select-none">
      {showExitConfirm && (
        <Overlay>
          <Panel className="p-9 w-[440px] text-center">
            <h3 className="font-display text-3xl">게임을 그만둘까요?</h3>
            <p className="text-graphite mt-3">두 화면 모두 처음으로 돌아가고, 점수는 저장되지 않습니다.</p>
            <div className="flex gap-3 mt-8 justify-center">
              <Button variant="secondary" onClick={() => setShowExitConfirm(false)}>계속하기</Button>
              <Button onClick={onHome}>그만두기</Button>
            </div>
          </Panel>
        </Overlay>
      )}

      {result && !waitingNext && (
        <AdvancedAnalysisModal
          report={result.report}
          subtitle={`${p1Name} · ${p2Name} · ${currentKeyword.ko} (${currentKeyword.en})`}
          image={result.image}
          guesses={result.list.map(toKorean)}
          hit={result.rank}
          mergeHalves
          autoSec={8}
          imageCaption={
            <div className="flex items-center justify-between text-sm text-graphite px-1">
              <span>왼쪽 {p1Name}</span>
              <span>오른쪽 {p2Name}</span>
            </div>
          }
          onDone={() => {
            setWaitingNext(true)
            if (isHost) onRoundComplete(result.report.totalPts, combinedRef.current ? snapshotOf(combinedRef.current, 480, 0.72, true) : '')
          }}
        />
      )}

      {/* 상단: 라운드 · 제시어 · 남은 시간 */}
      <header className="flex items-center gap-8 px-8 h-24 shrink-0 bg-white border-b-2 border-line">
        <Button variant="secondary" size="sm" onClick={() => setShowExitConfirm(true)}>나가기</Button>
        <div>
          <Label>라운드</Label>
          <div className="font-display text-3xl leading-none mt-1 tabular-nums">
            {round}<span className="text-graphite text-xl"> / 10</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <Label>제시어 · 내 담당은 {side} 반쪽</Label>
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
        <div className={`h-full transition-[width] duration-1000 ease-linear ${warn ? 'bg-accent' : 'bg-ok'}`} style={{ width: `${(curTime / TURN_SEC) * 100}%` }} />
      </div>

      <div className="flex flex-1 gap-6 p-6 min-h-0">
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* 한 장의 종이를 반으로 나눈 모양: 내 반쪽만 그릴 수 있다 */}
          <div ref={stageRef} className="flex-1 min-h-0 flex items-center justify-center">
            <div
              className="relative grid grid-cols-2 rounded-3xl overflow-hidden border-2 border-line bg-white"
              style={{ width: size.w, height: size.h }}
            >
              {isHost ? myCell : partnerCell}
              {isHost ? partnerCell : myCell}

              {/* 이음선과 높이 눈금: 이 눈금에 맞춰 그려야 두 반쪽이 이어진다 */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-violet/50 pointer-events-none" />
              {[0.25, 0.5, 0.75].map(f => (
                <div key={f} className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 pointer-events-none" style={{ top: `${f * 100}%` }}>
                  <span className="block w-5 h-0.5 bg-violet/60" />
                  <span className="block w-5 h-0.5 bg-violet/60" />
                </div>
              ))}
            </div>
          </div>

          <ToolBar pad={pad} disabled={!canDraw} onClear={pad.clear} submitLabel="완성" onSubmit={submit} submitDisabled={!canDraw || !hasDrawn} />
        </div>

        <div className="w-64 2xl:w-80 flex flex-col gap-5 shrink-0">
          <Panel className="p-6">
            <Label>팀 점수</Label>
            <div className="font-display text-5xl mt-2 tabular-nums">{(isNaN(teamScore) ? 0 : teamScore).toLocaleString()}</div>
            <div className="mt-4 flex flex-col gap-2">
              {[
                { name: myName, label: `나 · ${side}`, done: myDone },
                { name: partnerName, label: `${isHost ? '오른쪽' : '왼쪽'}`, done: partnerDone },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between py-2 border-t-2 border-line first:border-0">
                  <div className="min-w-0">
                    <div className="font-display text-xl truncate">{p.name}</div>
                    <div className="text-xs text-graphite">{p.label}</div>
                  </div>
                  <span className={`text-sm font-bold ${p.done ? 'text-ok' : 'text-graphite'}`}>{p.done ? '완성' : '그리는 중'}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-6 flex-1 flex flex-col">
            <Label>이렇게 그려요</Label>
            <div className="mt-3">
              <HalfExample myRole={role} />
            </div>
            <p className="mt-3 text-sm text-graphite leading-relaxed">보라색 눈금 높이에 맞춰 {partnerName}님과 크기를 맞춰 보세요. 한 사람만 그리면 협동 배율 때문에 0점입니다.</p>
            {waitingNext && <p className="mt-auto pt-4 font-display text-lg text-violet">다음 라운드를 준비하고 있습니다</p>}
          </Panel>
        </div>
      </div>
    </div>
  )
}
