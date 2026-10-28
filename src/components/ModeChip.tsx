import { GameMode } from '../types'

// 기록이 어떤 모드에서 나왔는지 (명예의 전당·전체 기록 관리에서 같이 쓴다)

export const MODE_LABEL: Record<GameMode, string> = { solo: '혼자 하기', pvp: '둘이 대결', ai: 'AI와 대결', coop: '반쪽 협동' }
const MODE_CLS: Record<GameMode, string> = {
  solo: 'bg-violet/10 text-violet-deep',
  pvp: 'bg-accent/10 text-accent-deep',
  ai: 'bg-ink text-white',
  coop: 'bg-ok/10 text-ok',
}

export function ModeChip({ mode, className = '' }: { mode?: GameMode; className?: string }) {
  if (!mode) return null
  return <span className={`inline-flex items-center h-7 px-3 rounded-full text-sm font-bold whitespace-nowrap ${MODE_CLS[mode]} ${className}`}>{MODE_LABEL[mode]}</span>
}
