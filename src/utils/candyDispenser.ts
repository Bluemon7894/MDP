/**
 * candyDispenser.ts - Client integration for the Retro Candy Dispenser.
 * Triggers physical candy dispensing over HTTP to the Raspberry Pi 5 dispenser service.
 */

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
  message: string
}

/**
 * Triggers a physical candy dispense operation on the Raspberry Pi 5.
 * Non-blocking with 5s timeout; safe to call without crashing the game if hardware is offline.
 */
export async function dispenseCandy(reason = 'victory'): Promise<DispenseResult> {
  const baseUrl = getDispenserBaseUrl()
  const endpoint = `${baseUrl}/dispense`

  console.log(`[CANDY DISPENSER] Triggering candy dispense (Reason: ${reason}) -> ${endpoint}`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, timestamp: Date.now() }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      console.log('[CANDY DISPENSER] Physical candy dispensed successfully!')
      return { success: true, message: '사탕이 성공적으로 배출되었습니다!' }
    } else {
      console.warn(`[CANDY DISPENSER] Server returned HTTP ${res.status}`)
      return { success: false, message: `배출 서버 응답 오류: ${res.status}` }
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    const errMsg = err.name === 'AbortError' ? '디스펜서 연결 시간 초과' : err.message
    console.warn(`[CANDY DISPENSER] Dispense request failed: ${errMsg}`)
    return { success: false, message: `디스펜서 통신 실패: ${errMsg}` }
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
