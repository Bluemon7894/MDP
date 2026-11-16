/**
 * calmBgm.ts - Pure Web Audio API synthesized calm, relaxing lofi/chill ambient BGM
 * No external mp3 files required, 0MB overhead, perfect loop.
 */

class CalmBgmSynth {
  private ctx: AudioContext | null = null
  private isPlaying: boolean = false
  private masterGain: GainNode | null = null
  private timerId: number | null = null
  private step: number = 0

  // Calm Pentatonic / Lofi Chill Chord progression (Key of C / Am)
  // Cmaj7 -> Am7 -> Fmaj7 -> Gsus4
  private chords = [
    [261.63, 329.63, 392.00, 493.88], // C, E, G, B (Cmaj7)
    [220.00, 261.63, 329.63, 392.00], // A, C, E, G (Am7)
    [174.61, 261.63, 329.63, 349.23], // F, C, E, F (Fmaj7)
    [196.00, 261.63, 293.66, 392.00], // G, C, D, G (Gsus4)
  ]

  // Gentle melody notes (Hz)
  private melodyNotes = [
    523.25, 659.25, 587.33, 493.88, 392.00, 440.00, 523.25, 659.25,
    783.99, 659.25, 587.33, 523.25, 440.00, 392.00, 329.63, 392.00
  ]

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioCtx()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(0.12, this.ctx.currentTime) // soft, gentle volume
      this.masterGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  private playGentleNote(freq: number, time: number, duration: number, vol: number, wave: OscillatorType = 'sine') {
    if (!this.ctx || !this.masterGain) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = wave
    osc.frequency.setValueAtTime(freq, time)

    // Warm Low-pass filter for cozy lofi sound
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(900, time)

    // Soft attack & long decay
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(vol, time + 0.15)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)

    osc.start(time)
    osc.stop(time + duration)
  }

  private tick = () => {
    if (!this.isPlaying || !this.ctx) return

    const now = this.ctx.currentTime
    const chordIndex = Math.floor(this.step / 8) % this.chords.length
    const currentChord = this.chords[chordIndex]

    // Play soft chord pad on downbeats (every 4 steps)
    if (this.step % 4 === 0) {
      currentChord.forEach((f) => {
        this.playGentleNote(f, now, 2.2, 0.04, 'sine')
        // Sub warm tone
        this.playGentleNote(f * 0.5, now, 2.4, 0.03, 'triangle')
      })
    }

    // Play light mellow melody
    if (this.step % 2 === 0 || Math.random() > 0.4) {
      const note = this.melodyNotes[(this.step * 3) % this.melodyNotes.length]
      this.playGentleNote(note, now + 0.05, 1.2, 0.035, 'sine')
    }

    this.step = (this.step + 1) % (this.chords.length * 8)
    this.timerId = window.setTimeout(this.tick, 450) // Calm tempo (~66 BPM)
  }

  public start() {
    if (this.isPlaying) return
    this.initContext()
    this.isPlaying = true
    this.step = 0
    this.tick()
  }

  public stop() {
    this.isPlaying = false
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  public toggle(enable?: boolean) {
    const target = enable !== undefined ? enable : !this.isPlaying
    if (target) {
      this.start()
    } else {
      this.stop()
    }
    return this.isPlaying
  }

  public get active() {
    return this.isPlaying
  }
}

export const calmBgm = new CalmBgmSynth()
