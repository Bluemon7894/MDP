import type { Recognition } from './recognize'

// ─────────────────────────────────────────────────────────────────────────────
// 깜짝 이스터에그: 진짜 알아볼 수 없게 그렸을 때 아주 가끔
//  AI 판정에 "AI가 도대체 뭘 그리신 거에요...?" 만 띄우고 후보 목록은 텅 비운다.
//  · 4획 이상 그렸는데도 정답이 없고, AI가 방향마다 딴소리를 할 때(confused)만 후보가 된다
//  · 그중 EGG_CHANCE 확률, 한 번 나오면 EGG_COOLDOWN_MS 동안은 다시 안 나온다
// ─────────────────────────────────────────────────────────────────────────────
export const EGG_TEXT = 'AI가 도대체 뭘 그리신 거에요...?'
const EGG_CHANCE = 0.12
const EGG_MIN_STROKES = 4
const EGG_COOLDOWN_MS = 4 * 60_000

let lastEggAt = 0

export function rollGarbageEgg(res: Recognition, strokeCount: number): boolean {
  if (!res.confused || res.rank > 0 || strokeCount < EGG_MIN_STROKES) return false
  if (Date.now() - lastEggAt < EGG_COOLDOWN_MS) return false
  if (Math.random() >= EGG_CHANCE) return false
  lastEggAt = Date.now()
  return true
}
