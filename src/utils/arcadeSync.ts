import { RankItem } from '../types'

// 두 화면(1P / 2P·랭킹) 사이 메시지.
// dev 서버의 웹소켓으로 중계해서 Chrome 계정·브라우저·기기가 달라도 이어지고,
// 서버 웹소켓이 없을 때(정적 배포)만 같은 브라우저 안의 BroadcastChannel 로 대신한다.

export interface ArcadeMessage {
  type: string
  payload?: any
}

const TAB_ID = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const hot = import.meta.hot
const channel = !hot && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('arcade_display_sync') : null
// 같은 탭 안에서도 받아야 하는 구독자 (개발용 반반 분할 화면에서 두 화면이 한 탭에 있을 때)
const selfListeners = new Set<(msg: ArcadeMessage) => void>()

export function postArcade(type: string, payload?: unknown) {
  if (hot) hot.send('arcade:msg', { from: TAB_ID, type, payload })
  else channel?.postMessage({ type, payload })
  selfListeners.forEach(fn => fn({ type, payload }))
}

/** includeSelf: 이 탭에서 보낸 메시지도 받는다 (보낸 쪽을 payload 로 직접 걸러야 한다) */
export function onArcade(handler: (msg: ArcadeMessage) => void, { includeSelf = false } = {}): () => void {
  if (includeSelf) selfListeners.add(handler)
  const offSelf = () => selfListeners.delete(handler)

  if (hot) {
    const listener = (data: ArcadeMessage & { from?: string }) => {
      if (data?.from !== TAB_ID) handler(data)
    }
    hot.on('arcade:msg', listener)
    return () => {
      offSelf()
      hot.off('arcade:msg', listener)
    }
  }
  if (!channel) return offSelf
  const listener = (e: MessageEvent) => handler(e.data)
  channel.addEventListener('message', listener)
  return () => {
    offSelf()
    channel.removeEventListener('message', listener)
  }
}

/** 다른 화면에서 랭킹이 바뀌었을 때 (서버가 알려 줌) */
export function onRankingsChanged(handler: (list: RankItem[]) => void): () => void {
  if (!hot) return () => {}
  hot.on('arcade:rankings', handler)
  return () => hot.off('arcade:rankings', handler)
}
