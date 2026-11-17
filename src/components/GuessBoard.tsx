import { useLayoutEffect, useRef, useState } from 'react'
import { toKorean } from '../constants/quickdraw'

// AI 판정 칸의 '추론 키워드' 목록.
// 줄 크기와 간격은 예전 후보 목록과 똑같이 두고, 칸 높이에 들어가는 만큼 줄을 더 보여 준다.
// 위 5개는 채점에 쓰이는 후보(1~5순위), 그 아래는 AI가 그 밖에 떠올린 것들이다.

/** 많아야 이만큼 (칸이 아주 길 때) */
export const GUESS_ROWS = 20
const SCORED = 5
const UNKNOWN = toKorean('__unknown__')
/** 줄 사이 간격 (gap-1 = 4px) */
const GAP = 4

/** 인식 결과(영문 라벨)를 화면용 한글 목록으로: 한글이 겹치거나 사전에 없는 라벨은 뺀다 */
export function toGuessItems(labels: string[]): string[] {
  const out: string[] = []
  for (const ko of labels.map(toKorean)) {
    if (!ko || ko === UNKNOWN || out.includes(ko)) continue
    out.push(ko)
    if (out.length >= GUESS_ROWS) break
  }
  return out
}

export function GuessBoard({
  items,
  target,
  waiting,
  dim = false,
}: {
  /** 한글 후보, 1위부터 */
  items: string[]
  /** 제시어를 맞혔으면 그 한글 (그 줄을 초록으로) */
  target: string | null
  /** 아직 아무것도 안 그렸을 때 첫 줄에 띄울 안내 */
  waiting: string
  /** 관전 중처럼 흐리게 */
  dim?: boolean
}) {
  // 칸 높이에 온전히 들어가는 줄 수만큼 그린다 (줄이 반쯤 잘리지 않게)
  const boxRef = useRef<HTMLOListElement>(null)
  const [rows, setRows] = useState(SCORED)
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const fit = () => {
      const row = box.firstElementChild as HTMLElement | null
      const rowH = row?.getBoundingClientRect().height || 32
      const n = Math.floor((box.clientHeight + GAP) / (rowH + GAP))
      setRows(Math.max(1, Math.min(GUESS_ROWS, n)))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  return (
    <ol ref={boxRef} className={`flex-1 min-h-0 overflow-hidden mt-2.5 flex flex-col gap-1 ${dim ? 'opacity-60' : ''}`}>
      {Array.from({ length: rows }, (_, i) => {
        const g = items[i]
        const hit = !!g && g === target
        return (
          <li key={i} className={`shrink-0 flex items-center gap-2.5 px-2.5 py-1 rounded-lg ${hit ? 'bg-ok/10 text-ok' : ''}`}>
            <span className={`w-4 text-xs font-bold tabular-nums ${i < SCORED ? 'text-graphite' : 'text-graphite/50'}`}>{i + 1}</span>
            {g ? (
              <span key={g} className={`font-display text-base 2xl:text-lg truncate animate-fade-up ${i >= SCORED && !hit ? 'text-graphite' : ''}`}>
                {g}
              </span>
            ) : (
              // 빈 줄도 글자 줄과 같은 높이를 유지한다
              <span className="font-display text-base 2xl:text-lg truncate text-graphite/35">{i === 0 ? waiting : ' '}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
