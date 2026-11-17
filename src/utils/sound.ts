/**
 * sound.ts - Arcade BGM (Menu / In-Game MP3s) & Synthesized SFX Manager
 *
 * Strictly plays ONLY on the Player 1 screen (?screen=a or ?screen=both).
 * The Ranking / 2P monitor (?screen=b) stays completely silent.
 */

import menuBgmUrl from '../assets/audio/Buoyant Town Loop.mp3'
import gameBgmUrl from '../assets/audio/Bouncy Puzzle Groove.mp3'

export type BgmTrack = 'none' | 'menu' | 'game'

const BGM_VOLUME: Record<Exclude<BgmTrack, 'none'>, number> = {
  menu: 0.36,
  game: 0.32,
}

function isScreenBFromLocation(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('screen') === 'b'
}

class SoundManager {
  private ctx: AudioContext | null = null
  private screenAllowed: boolean = !isScreenBFromLocation()
  private bgmEnabled: boolean = true
  private sfxEnabled: boolean = true
  private desiredTrack: BgmTrack = 'none'
  private currentTrack: BgmTrack = 'none'
  private pendingUnlock: boolean = false

  private audios: Partial<Record<Exclude<BgmTrack, 'none'>, HTMLAudioElement>> = {}
  private fadeTimers: Partial<Record<Exclude<BgmTrack, 'none'>, number>> = {}

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        if (!this.screenAllowed) return
        this.ensureContext()
        if (this.pendingUnlock || (this.bgmEnabled && this.desiredTrack !== 'none')) {
          this.pendingUnlock = false
          this.syncBgm()
        }
      }
      window.addEventListener('pointerdown', unlock, { passive: true })
      window.addEventListener('keydown', unlock, { passive: true })
      window.addEventListener('touchstart', unlock, { passive: true })
    }
  }

  public setScreenAllowed(allowed: boolean) {
    if (this.screenAllowed === allowed) return
    this.screenAllowed = allowed
    if (!allowed) {
      this.stopAllBgmImmediate()
    } else {
      this.syncBgm()
    }
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled
  }

  public toggleBgm(enable?: boolean): boolean {
    this.bgmEnabled = enable !== undefined ? enable : !this.bgmEnabled
    this.syncBgm()
    return this.bgmEnabled
  }

  public toggleSound(enable?: boolean): boolean {
    const next = enable !== undefined ? enable : !(this.bgmEnabled && this.sfxEnabled)
    this.bgmEnabled = next
    this.sfxEnabled = next
    this.syncBgm()
    return next
  }

  public setBgmTrack(track: BgmTrack) {
    if (this.desiredTrack === track) return
    this.desiredTrack = track
    this.syncBgm()
  }

  private getAudio(track: Exclude<BgmTrack, 'none'>): HTMLAudioElement {
    let el = this.audios[track]
    if (!el) {
      el = new Audio(track === 'menu' ? menuBgmUrl : gameBgmUrl)
      el.loop = true
      el.preload = 'auto'
      el.volume = 0
      this.audios[track] = el
    }
    return el
  }

  private clearFade(track: Exclude<BgmTrack, 'none'>) {
    const t = this.fadeTimers[track]
    if (t !== undefined) {
      window.clearInterval(t)
      delete this.fadeTimers[track]
    }
  }

  private fadeTo(track: Exclude<BgmTrack, 'none'>, targetVol: number, durationMs = 280, pauseWhenZero = false) {
    const el = this.getAudio(track)
    this.clearFade(track)

    const startVol = el.volume
    const steps = 14
    const intervalMs = Math.max(15, Math.floor(durationMs / steps))
    let step = 0

    this.fadeTimers[track] = window.setInterval(() => {
      step++
      const ratio = Math.min(1, step / steps)
      el.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * ratio))
      if (step >= steps) {
        this.clearFade(track)
        if (pauseWhenZero && targetVol <= 0.001) {
          el.pause()
        }
      }
    }, intervalMs)
  }

  private stopAllBgmImmediate() {
    ;(['menu', 'game'] as const).forEach(t => {
      this.clearFade(t)
      const el = this.audios[t]
      if (el) {
        el.pause()
        el.volume = 0
      }
    })
    this.currentTrack = 'none'
  }

  private syncBgm() {
    if (typeof window === 'undefined') return

    const target: BgmTrack = this.screenAllowed && this.bgmEnabled ? this.desiredTrack : 'none'

    // Fade out any track that shouldn't be playing
    ;(['menu', 'game'] as const).forEach(t => {
      if (t !== target && this.audios[t] && !this.audios[t]!.paused) {
        this.fadeTo(t, 0, 260, true)
      }
    })

    if (target === 'none') {
      this.currentTrack = 'none'
      return
    }

    const el = this.getAudio(target)
    const isTrackSwitch = this.currentTrack !== target
    if (isTrackSwitch && el.paused) {
      el.currentTime = 0
    }
    this.currentTrack = target

    if (el.paused) {
      el.volume = 0
      const p = el.play()
      if (p && typeof p.then === 'function') {
        p.then(() => {
          this.pendingUnlock = false
          if (this.currentTrack === target && this.screenAllowed && this.bgmEnabled) {
            this.fadeTo(target, BGM_VOLUME[target], 320, false)
          } else {
            el.pause()
            el.volume = 0
          }
        }).catch(() => {
          // Browser blocked autoplay before user gesture; will retry on first click/touch
          this.pendingUnlock = true
          this.currentTrack = 'none'
        })
      }
    } else {
      this.fadeTo(target, BGM_VOLUME[target], 260, false)
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Web Audio Synthesizer for Clean, Cozy & Bouncy Arcade SFX
  // ───────────────────────────────────────────────────────────────────────────

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined' || !this.screenAllowed) return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return null
      this.ctx = new AudioCtx()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  private canPlaySfx(): AudioContext | null {
    if (!this.screenAllowed || !this.sfxEnabled) return null
    return this.ensureContext()
  }

  private tone(
    ctx: AudioContext,
    {
      freq,
      endFreq,
      type = 'triangle',
      delay = 0,
      duration = 0.08,
      volume = 0.14,
      attack = 0.008,
    }: {
      freq: number
      endFreq?: number
      type?: OscillatorType
      delay?: number
      duration?: number
      volume?: number
      attack?: number
    },
  ) {
    const start = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration)
    }

    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(volume, start + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(start)
    osc.stop(start + duration + 0.01)
  }

  /** 일반 버튼 클릭음 (통통 튀는 따뜻한 팝) */
  public playClick() {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    this.tone(ctx, { freq: 520, endFreq: 760, type: 'triangle', duration: 0.06, volume: 0.14 })
  }

  /** 시작/강조 버튼 (경쾌한 3음 상승) */
  public playStart() {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    this.tone(ctx, { freq: 523.25, type: 'triangle', delay: 0, duration: 0.08, volume: 0.14 })
    this.tone(ctx, { freq: 659.25, type: 'triangle', delay: 0.055, duration: 0.09, volume: 0.15 })
    this.tone(ctx, { freq: 783.99, type: 'sine', delay: 0.11, duration: 0.14, volume: 0.16 })
  }

  /** 뒤로가기 / 취소 / 닫기 */
  public playBack() {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    this.tone(ctx, { freq: 440, endFreq: 300, type: 'triangle', duration: 0.075, volume: 0.12 })
  }

  /** 연필/지우개/굵기/후보 선택 (작고 가벼운 톡 소리) */
  public playTool() {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    this.tone(ctx, { freq: 640, endFreq: 780, type: 'sine', duration: 0.038, volume: 0.09 })
  }

  /** 되돌리기 (Undo) */
  public playUndo() {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    this.tone(ctx, { freq: 620, endFreq: 420, type: 'triangle', delay: 0, duration: 0.06, volume: 0.11 })
  }

  /** 전체 지우기 (Clear) */
  public playClear() {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    this.tone(ctx, { freq: 480, endFreq: 220, type: 'sine', delay: 0, duration: 0.11, volume: 0.12 })
    this.tone(ctx, { freq: 340, endFreq: 170, type: 'triangle', delay: 0.03, duration: 0.1, volume: 0.08 })
  }

  /** 그림 완성 제출 */
  public playSubmit() {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    this.tone(ctx, { freq: 523.25, type: 'triangle', delay: 0, duration: 0.09, volume: 0.14 })
    this.tone(ctx, { freq: 783.99, type: 'triangle', delay: 0.06, duration: 0.15, volume: 0.16 })
  }

  /** 게임 시작 전 카운트다운 (3, 2, 1, GO!) */
  public playCountdown(count: number) {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    if (count > 0) {
      this.tone(ctx, { freq: 587.33, type: 'triangle', duration: 0.11, volume: 0.16 })
    } else {
      // GO!
      this.tone(ctx, { freq: 523.25, type: 'triangle', delay: 0, duration: 0.09, volume: 0.16 })
      this.tone(ctx, { freq: 659.25, type: 'triangle', delay: 0.05, duration: 0.09, volume: 0.16 })
      this.tone(ctx, { freq: 1046.5, type: 'sine', delay: 0.1, duration: 0.28, volume: 0.2 })
    }
  }

  /** 남은 시간 5초 이하 경고 틱 */
  public playTimerTick(secLeft: number) {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    const freq = secLeft <= 2 ? 987.77 : 783.99
    this.tone(ctx, { freq, type: 'sine', duration: 0.045, volume: 0.1 })
  }

  /** AI가 그림을 정답(1~3순위)으로 실시간 인식했을 때 */
  public playAiRecognized(rank: number) {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    if (rank === 1) {
      this.tone(ctx, { freq: 659.25, type: 'sine', delay: 0, duration: 0.09, volume: 0.14 })
      this.tone(ctx, { freq: 783.99, type: 'sine', delay: 0.06, duration: 0.09, volume: 0.15 })
      this.tone(ctx, { freq: 1046.5, type: 'sine', delay: 0.12, duration: 0.22, volume: 0.17 })
    } else {
      this.tone(ctx, { freq: 587.33, type: 'sine', delay: 0, duration: 0.08, volume: 0.12 })
      this.tone(ctx, { freq: 783.99, type: 'sine', delay: 0.06, duration: 0.15, volume: 0.13 })
    }
  }

  /** 협동/대결 상대방이 완성을 눌렀을 때 */
  public playPartnerDone() {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    this.tone(ctx, { freq: 880, type: 'sine', delay: 0, duration: 0.07, volume: 0.1 })
    this.tone(ctx, { freq: 1174.66, type: 'sine', delay: 0.06, duration: 0.14, volume: 0.11 })
  }

  /** 반쪽 협동 그림 합쳐질 때 */
  public playMerge() {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    this.tone(ctx, { freq: 330, endFreq: 660, type: 'sine', delay: 0, duration: 0.22, volume: 0.12 })
    this.tone(ctx, { freq: 783.99, type: 'triangle', delay: 0.22, duration: 0.12, volume: 0.15 })
  }

  /** AI 심사 확대 포커스 단계 전환 */
  public playInspect(step: number) {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    const freqs = [523.25, 587.33, 659.25, 783.99]
    const f = freqs[step % freqs.length]
    this.tone(ctx, { freq: f, endFreq: f * 1.12, type: 'sine', duration: 0.065, volume: 0.1 })
  }

  /** 결과 모달 항목 카드 팝업 */
  public playScoreItem(index: number) {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    const scale = [523.25, 587.33, 659.25, 783.99]
    this.tone(ctx, { freq: scale[index % scale.length], type: 'triangle', duration: 0.07, volume: 0.11 })
  }

  /** 라운드 총점 확정 (Slam) */
  public playRoundResult(good: boolean) {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    if (good) {
      this.tone(ctx, { freq: 523.25, type: 'triangle', delay: 0, duration: 0.1, volume: 0.15 })
      this.tone(ctx, { freq: 659.25, type: 'triangle', delay: 0.07, duration: 0.1, volume: 0.15 })
      this.tone(ctx, { freq: 783.99, type: 'triangle', delay: 0.14, duration: 0.1, volume: 0.15 })
      this.tone(ctx, { freq: 1046.5, type: 'sine', delay: 0.21, duration: 0.34, volume: 0.18 })
    } else {
      this.tone(ctx, { freq: 392.0, type: 'triangle', delay: 0, duration: 0.12, volume: 0.13 })
      this.tone(ctx, { freq: 349.23, type: 'triangle', delay: 0.11, duration: 0.24, volume: 0.12 })
    }
  }

  /** 최종 게임 완주 / 승리 팡파레 */
  public playVictory() {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    const notes = [
      { freq: 523.25, delay: 0, duration: 0.1 },
      { freq: 659.25, delay: 0.09, duration: 0.1 },
      { freq: 783.99, delay: 0.18, duration: 0.1 },
      { freq: 1046.5, delay: 0.27, duration: 0.18 },
      { freq: 783.99, delay: 0.42, duration: 0.1 },
      { freq: 1046.5, delay: 0.52, duration: 0.48 },
    ]
    notes.forEach(n => this.tone(ctx, { ...n, type: 'triangle', volume: 0.17 }))
    this.tone(ctx, { freq: 523.25, type: 'sine', delay: 0.52, duration: 0.48, volume: 0.12 })
    this.tone(ctx, { freq: 659.25, type: 'sine', delay: 0.52, duration: 0.48, volume: 0.11 })
  }

  /** 최종 패배 (AI에게 졌을 때) */
  public playDefeat() {
    const ctx = this.canPlaySfx()
    if (!ctx) return
    this.tone(ctx, { freq: 493.88, type: 'triangle', delay: 0, duration: 0.14, volume: 0.14 })
    this.tone(ctx, { freq: 440.0, type: 'triangle', delay: 0.14, duration: 0.14, volume: 0.14 })
    this.tone(ctx, { freq: 392.0, type: 'triangle', delay: 0.28, duration: 0.14, volume: 0.14 })
    this.tone(ctx, { freq: 329.63, type: 'sine', delay: 0.42, duration: 0.36, volume: 0.15 })
  }
}

export const sound = new SoundManager()
