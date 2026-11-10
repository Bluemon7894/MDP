import { Label } from './ui'

export function DrawingTipsCard() {
  return (
    <div className="mt-auto pt-3 border-t-2 border-line">
      <Label className="text-xs">채점 기준 (1,000점 만점)</Label>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-graphite">AI 인식</span>
          <span className="font-display text-xs text-ink tabular-nums">300점</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-graphite">남은 시간</span>
          <span className="font-display text-xs text-ink tabular-nums">250점</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-graphite">스트로크</span>
          <span className="font-display text-xs text-ink tabular-nums">250점</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-graphite">구도·크기</span>
          <span className="font-display text-xs text-ink tabular-nums">200점</span>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-graphite/80 leading-tight">
        핵심 형태를 3~8획 이내로 빠르게 완성하세요.
      </p>
    </div>
  )
}
