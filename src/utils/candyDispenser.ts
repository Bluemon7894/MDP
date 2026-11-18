// 게임이 끝나면 라즈베리 파이의 사탕 서버(candy_server.py, 포트 8080)에 배출을 요청한다.

const getDispenserBaseUrl = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:8080'

  // 1. LocalStorage override if custom IP was set
  const savedHost = localStorage.getItem('DISPENSER_HOST')
  if (savedHost) {
    return savedHost.startsWith('http') ? savedHost : `http://${savedHost}:8080`
  }

  // 2. If running directly on the Pi browser or same host
  const hostname = window.location.hostname || 'localhost'
  return `http://${hostname}:8080`
}

export interface DispenseResult {
  success: boolean
  count: number
  message: string
}

/**
 * Triggers a physical candy dispense operation on the Raspberry Pi 5.
 * Non-blocking with 5s timeout; safe to call without crashing the game if hardware is offline.
 */
export async function dispenseCandy(reason = 'victory', count = 1): Promise<DispenseResult> {
  if (count <= 0) {
    return { success: true, count: 0, message: '' }
  }

  const baseUrl = getDispenserBaseUrl()
  const endpoint = `${baseUrl}/dispense`

  console.log(`[CANDY DISPENSER] Triggering ${count} candy dispense (Reason: ${reason}) -> ${endpoint}`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, count, timestamp: Date.now() }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      console.log(`[CANDY DISPENSER] Queued ${count} physical candy dispense(s) successfully!`)
      return { success: true, count, message: `사탕 ${count}개가 배출됩니다!` }
    } else {
      console.warn(`[CANDY DISPENSER] Server returned HTTP ${res.status}`)
      return { success: false, count: 0, message: `배출 서버 응답 오류: ${res.status}` }
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    const errMsg = err.name === 'AbortError' ? '디스펜서 연결 시간 초과' : err.message
    console.warn(`[CANDY DISPENSER] Dispense request failed: ${errMsg}`)
    return { success: false, count: 0, message: `디스펜서 통신 실패: ${errMsg}` }
  }
}

/**
 * Checks if the Raspberry Pi dispenser service is reachable and ready.
 */
export async function checkDispenserStatus(): Promise<{ ready: boolean; device?: string; mock?: boolean }> {
  const baseUrl = getDispenserBaseUrl()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 2000)

  try {
    const res = await fetch(`${baseUrl}/status`, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (res.ok) {
      const data = await res.json()
      return { ready: true, device: data.device, mock: data.mock_mode }
    }
    return { ready: false }
  } catch {
    clearTimeout(timeoutId)
    return { ready: false }
  }
}
