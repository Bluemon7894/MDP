export type ScreenTarget = 'a' | 'b' | 'both'
export type CabAState = 'idle' | 'modeSelect' | 'nickname1P' | 'waiting2P' | 'inGame' | 'practice'
export type CabBState = 'leaderboard' | 'nickname2P' | 'inGame'
export type ActivePlayer = '1P' | '2P'
export type BtnColor = 'coral' | 'mint' | 'yellow' | 'sky' | 'purple'

export interface KeywordMap {
  ko: string
  en: string
}

export type GameMode = 'solo' | 'pvp' | 'ai' | 'coop'

export interface RankItem {
  id: string
  name: string
  score: number
  /** 이 점수를 낸 모드 (예전 기록에는 없을 수 있음) */
  mode?: GameMode
  /** 그 게임에서 가장 점수가 높았던 라운드의 그림 (JPEG data URL) */
  drawing?: string
  /** 그 그림의 제시어 */
  keyword?: string
  /** 기록한 시각 (ms) */
  at?: number
}

/** 한 게임 동안 플레이어별 최고 점수 그림 */
export interface BestDrawing {
  score: number
  drawing: string
  keyword: string
}

export interface MetricItem {
  key: 'recognition' | 'speed' | 'tone' | 'form' | 'teamwork'
  /** 점수를 더하지 않고 합계에 곱하는 항목 (반쪽 협동의 협동 배율) */
  multiplier?: number
  label: string
  detail: string
  ratio: number
  pts: number
  max: number
}

export interface MetricBreakdown {
  items: MetricItem[]
  totalPts: number
  recognized: boolean
  verdictTitle: string
  verdictDesc: string
}

export interface CustomModalState {
  isOpen: boolean
  title: string
  message: string
  type: 'alert' | 'confirm'
  onConfirm?: () => void
  onCancel?: () => void
}
