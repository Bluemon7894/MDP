import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MetricBreakdown } from '../types'
import { Button, Label, Overlay, Panel } from './ui'

const AUTO_SEC = 7
const MERGE_MS = 1300
const STEP_MS = 1150
const ZOOM = 2.3

type Phase = 'merge' | 'inspect' | 'result'
type Pt = { x: number; y: number }

interface InspectStep {
  label: string
  value: string
  /** 확대할 곳 (0~1). 없으면 전체 보기 */
  focus?: Pt
}

// 그림에서 선이 가장 많이 몰린 곳 두 군데를 찾는다 (확대해서 살펴볼 자리)
function useHotspots(image?: string) {
  const [spots, setSpots] = useState<Pt[]>([{ x: 0.42, y: 0.45 }, { x: 0.6, y: 0.55 }])
  useEffect(() => {
    if (!image) return
    const img = new Image()
    img.onload = () => {
      const GW = 8, GH = 5
      const c = document.createElement('canvas')
      c.width = 80
      c.height = 50
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, 80, 50)
      const px = ctx.getImageData(0, 0, 80, 50).data
      const cells: { x: number; y: number; ink: number }[] = []
      for (let gy = 0; gy < GH; gy++) {
        for (let gx = 0; gx < GW; gx++) {
          let ink = 0
          for (let y = gy * 10; y < gy * 10 + 10; y++) {
            for (let x = gx * 10; x < gx * 10 + 10; x++) {
              const i = (y * 80 + x) * 4
              ink += 1 - (px[i] + px[i + 1] + px[i + 2]) / 765
            }
          }
          cells.push({ x: (gx + 0.5) / GW, y: (gy + 0.5) / GH, ink })
        }
      }
      cells.sort((a, b) => b.ink - a.ink)
      if (cells[0].ink < 2) return
      const first = cells[0]
      const second = cells.find(c => Math.hypot(c.x - first.x, (c.y - first.y) * 0.625) > 0.2 && c.ink > 1) ?? first
      setSpots([first, second])
    }
    img.src = image
  }, [image])
  return spots
}

// 0에서 목표까지 쫀득하게(살짝 넘쳤다가) 올라가는 숫자
function CountUp({ to, delay = 0, ms = 700, className = '' }: { to: number; delay?: number; ms?: number; className?: string }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const t = setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const f = Math.min(1, (now - start) / ms)
        // back-out: 끝에서 살짝 넘쳤다 돌아오는 느낌
        const e = 1 + 2.2 * Math.pow(f - 1, 3) + 1.2 * Math.pow(f - 1, 2)
        setV(Math.round(to * Math.min(1.04, e)))
        if (f < 1) raf = requestAnimationFrame(tick)
        else setV(to)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    // 화면 갱신이 멈춰 있어도(창이 가려짐 등) 최종 숫자는 반드시 보이게
    const settle = setTimeout(() => setV(to), delay + ms + 150)
    return () => {
      clearTimeout(t)
      clearTimeout(settle)
      cancelAnimationFrame(raf)
    }
  }, [to, delay, ms])
  return <span className={className}>{v.toLocaleString()}</span>
}

/**
 * 라운드 결과. 그림이 있으면 심사 연출을 먼저 보여 준다.
 *  merge   (반쪽 협동) 어두운 화면에서 두 반쪽이 양옆에서 날아와 맞붙는다
 *  inspect 화면이 어두워지고 그림의 부분을 하나씩 확대하며 무엇을 보는지 보여 준다
 *  result  항목 카드가 통통 튀어나오며 점수가 올라가고, 합계가 쾅 찍힌다
 */
export function AdvancedAnalysisModal({
  report,
  subtitle,
  onDone,
  image,
  guesses = [],
  hit = 0,
  mergeHalves = false,
  imageCaption,
  autoSec: autoSecTotal = AUTO_SEC,
}: {
  report: MetricBreakdown
  subtitle: string
  onDone: () => void
  /** 채점한 그림 (data URL) */
  image?: string
  /** AI가 떠올린 후보 (한글, 1위부터) */
  guesses?: string[]
  /** 제시어가 몇 번째 후보였는지 (0 = 없음) */
  hit?: number
  /** 반쪽 협동: 두 반쪽이 합쳐지는 연출부터 */
  mergeHalves?: boolean
  imageCaption?: React.ReactNode
  autoSec?: number
}) {
  const [phase, setPhase] = useState<Phase>(!image ? 'result' : mergeHalves ? 'merge' : 'inspect')
  const [step, setStep] = useState(0)
  const [autoSec, setAutoSec] = useState(autoSecTotal)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const doneRef = useRef(false)
  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDoneRef.current()
  }

  const spots = useHotspots(image)
  const item = (key: string) => report.items.find(it => it.key === key)
  const steps: InspectStep[] = useMemo(() => {
    const list: InspectStep[] = []
    const team = item('teamwork')
    if (mergeHalves && team) list.push({ label: '이음새', value: team.detail, focus: { x: 0.5, y: spots[0].y } })
    list.push({
      label: 'AI 인식',
      value: hit ? `${hit}순위 · ${guesses[hit - 1]}` : guesses[0] ? `${guesses[0]}(으)로 봤습니다` : '알아보지 못했습니다',
      focus: spots[0],
    })
    list.push({ label: '명암', value: item('tone')?.detail ?? '', focus: spots[1] })
    list.push({ label: '구도', value: '크기와 위치' })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, spots, guesses, hit, mergeHalves])

  // 연출 진행
  useEffect(() => {
    if (phase === 'merge') {
      const t = setTimeout(() => setPhase('inspect'), MERGE_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'inspect') {
      const t = setTimeout(() => (step + 1 < steps.length ? setStep(step + 1) : setPhase('result')), STEP_MS)
      return () => clearTimeout(t)
    }
  }, [phase, step, steps.length])

  // 점수 공개 뒤 몇 초 지나면 자동으로 넘어간다
  useEffect(() => {
    if (phase !== 'result') return
    const timer = setInterval(() => {
      setAutoSec(s => {
        if (s <= 1) {
          clearInterval(timer)
          setTimeout(finish, 0)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const basePts = report.items.reduce((sum, it) => sum + it.pts, 0)
  const multiplier = report.items.find(it => it.multiplier !== undefined)?.multiplier
  const ROW_GAP = 160
  const totalDelay = 250 + report.items.length * ROW_GAP + 350

  const resultBody = (
    <div>
      <div className="flex items-baseline justify-between">
        <Label>{subtitle}</Label>
        <span className="text-sm text-graphite tabular-nums">{autoSec}초 후 계속</span>
      </div>
      <h2 className="font-display text-3xl mt-3 animate-row-pop">{report.verdictTitle}</h2>
      <p className="text-graphite mt-2 leading-relaxed animate-row-pop" style={{ animationDelay: '80ms' }}>{report.verdictDesc}</p>

      <div className="mt-6 flex flex-col gap-3">
        {report.items.map((it, i) => {
          const isMul = it.multiplier !== undefined
          const low = it.ratio < 0.5
          const ratio = isMul ? it.ratio : it.max ? it.pts / it.max : 0
          const delay = 250 + i * ROW_GAP
          return (
            <div key={it.key} className="animate-row-pop rounded-2xl bg-paper px-4 py-3" style={{ animationDelay: `${delay}ms` }}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3 min-w-0">
                  <span className="font-display text-xl shrink-0">{it.label}</span>
                  <span className="text-sm text-graphite truncate">{it.detail}</span>
                </div>
                {isMul ? (
                  <span className={`font-display text-2xl tabular-nums ${low ? 'text-accent' : 'text-ok'}`}>×{it.multiplier!.toFixed(2)}</span>
                ) : (
                  <span className="font-display text-2xl tabular-nums">
                    <CountUp to={it.pts} delay={delay + 120} />
                    <span className="text-sm text-graphite"> / {it.max}</span>
                  </span>
                )}
              </div>
              <div className="h-2.5 mt-2 rounded-full bg-white overflow-hidden">
                <div
                  className={`h-full rounded-full origin-left animate-bar-spring ${isMul ? (low ? 'bg-accent' : 'bg-ok') : 'bg-violet'}`}
                  style={{ width: `${ratio * 100}%`, animationDelay: `${delay + 120}ms` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 pt-5 border-t-2 border-line flex items-end justify-between">
        <div>
          <Label>{multiplier !== undefined ? `이번 라운드 · ${basePts}점 × 협동 ${multiplier.toFixed(2)}` : '이번 라운드'}</Label>
          <div className="font-display text-7xl leading-none mt-2 tabular-nums origin-left animate-slam" style={{ animationDelay: `${totalDelay}ms` }}>
            <CountUp to={report.totalPts} delay={totalDelay} ms={500} />
            <span className="text-2xl text-graphite ml-1">점</span>
          </div>
        </div>
        <Button variant="violet" onClick={finish}>다음</Button>
      </div>
    </div>
  )

  if (!image) {
    return (
      <Overlay>
        <Panel className="w-[600px] p-10 animate-pop-in">{resultBody}</Panel>
      </Overlay>
    )
  }

  const cur = steps[Math.min(step, steps.length - 1)]
  const f = phase === 'inspect' ? cur.focus : undefined
  const zoomStyle: React.CSSProperties = f
    ? { transform: `translate(${(0.5 - f.x) * ZOOM * 100}%, ${(0.5 - f.y) * ZOOM * 100}%) scale(${ZOOM})` }
    : { transform: 'translate(0, 0) scale(1)' }
  const halfStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    backgroundImage: `url(${image})`,
    backgroundSize: '200% 100%',
    backgroundPosition: `${side} center`,
  })

  // 심사 중: 화면이 어두워지고 그림만 크게, 부분을 하나씩 확대
  if (phase !== 'result') {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ink/95 font-ui animate-dim-in">
        <div className="text-white/70 font-display text-2xl">{phase === 'merge' ? '두 반쪽을 합치는 중' : 'AI 심사 중'}</div>
        <div
          className="relative aspect-[16/10] rounded-3xl bg-white overflow-hidden shadow-[0_0_0_6px_rgba(255,255,255,0.08),0_30px_80px_rgba(0,0,0,0.5)]"
          // 화면 높이에도 맞춘다 (위 제목, 아래 라벨·진행 점 자리 빼고)
          style={{ width: 'min(1000px, 78vw, calc((100vh - 280px) * 1.6))' }}
        >
          {phase === 'merge' ? (
            <>
              <div className="absolute inset-y-0 left-0 w-1/2 animate-merge-left" style={halfStyle('left')} />
              <div className="absolute inset-y-0 right-0 w-1/2 animate-merge-right" style={halfStyle('right')} />
            </>
          ) : (
            <img
              src={image}
              alt="심사 중인 그림"
              className="absolute inset-0 w-full h-full object-contain transition-transform duration-[800ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
              style={zoomStyle}
            />
          )}
          {/* 확대할 때 가장자리를 어둡게 눌러 초점을 모은다 */}
          {phase === 'inspect' && (
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${f ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(43,26,64,0.45) 100%)' }}
            />
          )}
          {mergeHalves && phase === 'inspect' && step === 0 && (
            <div className="absolute inset-y-0 left-1/2 w-1.5 bg-violet animate-seam-flash pointer-events-none" />
          )}
        </div>

        {/* 지금 무엇을 보는지 */}
        <div className="h-20 flex items-center">
          {phase === 'inspect' && (
            <div key={step} className="animate-label-pop flex items-center gap-4 h-16 pl-3 pr-7 rounded-2xl bg-white shadow-[0_6px_0_rgba(0,0,0,0.25)]">
              <span className="h-10 px-4 inline-flex items-center rounded-xl bg-violet text-white font-display text-xl">{cur.label}</span>
              <span className="font-display text-2xl text-ink">{cur.value}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <span key={i} className={`h-2 rounded-full transition-all duration-300 ${phase === 'inspect' && i <= step ? 'w-8 bg-violet' : 'w-2 bg-white/25'}`} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-ink/80 font-ui text-ink">
      <Panel className="w-[min(1240px,94vw)] p-8 grid grid-cols-[1.2fr_1fr] gap-10 items-center animate-pop-in">
        <figure>
          <div className="relative aspect-[16/10] rounded-2xl border-2 border-line bg-white overflow-hidden">
            <img src={image} alt="채점한 그림" className="absolute inset-0 w-full h-full object-contain" />
          </div>
          <figcaption className="mt-3 min-h-6">
            {imageCaption}
            {guesses.length > 0 && (
              <p className="text-sm text-graphite mt-1 text-center">
                AI가 본 것: {guesses.slice(0, 3).map((g, i) => (i + 1 === hit ? `${g}(정답)` : g)).join(' · ')}
              </p>
            )}
          </figcaption>
        </figure>
        {resultBody}
      </Panel>
    </div>
  )
}
