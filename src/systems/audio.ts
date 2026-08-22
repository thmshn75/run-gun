import type Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { AudioScheduler, type AudioEventKind } from './audioPlan'

// Eigener Speicherschluessel statt eines Feldes im Spielstand: parseSave gibt nur
// bekannte Felder weiter und wuerde ein neues stillschweigend verwerfen.
const MUTE_STORAGE_KEY = 'rungun_audio_muted'

// Anstieg der Huellkurve. Unter ~3 ms knackt der Einsatz hoerbar, darueber wirkt ein
// 60-ms-Schuss weich statt trocken.
const ATTACK_SEC = 0.004
// exponentialRampToValueAtTime erreicht die Null nie - dieser Wert ist praktisch stumm.
const SILENCE = 0.0001
// Laenge des einmalig erzeugten Rauschpuffers. Der laengste Rauschton ist der
// Wandbruch mit 220 ms; 0,4 s traegt ihn mit Reserve und kostet ~19 KB Speicher.
const NOISE_BUFFER_SEC = 0.4

interface ToneOptions {
  readonly type: OscillatorType
  readonly fromHz: number
  readonly toHz: number
  readonly durationSec: number
  readonly peak: number
  readonly delaySec?: number
}

interface NoiseOptions {
  readonly durationSec: number
  readonly filterFromHz: number
  readonly filterToHz: number
  readonly peak: number
  readonly delaySec?: number
}

/**
 * Synthetischer Spielton ueber Web Audio - keine Audiodateien, nichts nachzuladen,
 * offline identisch. Der AudioContext kommt von Phasers Sound-Manager, weil der die
 * auf iOS zwingende Freischaltung per Nutzergeste bereits mitbringt.
 *
 * Zu den Knoten je Ton: Ein OscillatorNode ist in Web Audio ein Einwegobjekt
 * (start() genau einmal), ein Pool waere hier nicht moeglich. Der Browser raeumt sie
 * nach stop() selbst ab; bei hoechstens acht Toenen je Sekunde ist das unkritisch -
 * die Pool-Regel des Projekts zielt auf Phaser-Objekte im Zeichenpfad.
 */
export class GameAudio {
  private readonly context: AudioContext | undefined
  private readonly master: GainNode | undefined
  private readonly scheduler: AudioScheduler
  private noise: AudioBuffer | undefined
  private muted: boolean

  public constructor(scene: Phaser.Scene) {
    this.scheduler = new AudioScheduler()
    this.muted = readStoredMuted()
    // NoAudio- und HTML5-Sound-Manager haben keinen context. Dann bleibt das Spiel
    // stumm statt abzustuerzen.
    const context = (scene.sound as unknown as { context?: AudioContext }).context
    if (context === undefined) {
      this.context = undefined
      this.master = undefined
      return
    }
    this.context = context
    this.master = context.createGain()
    this.master.gain.value = this.muted ? 0 : BALANCE.audio.masterVolume
    this.master.connect(context.destination)
  }

  public isMuted(): boolean {
    return this.muted
  }

  public setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master !== undefined) this.master.gain.value = muted ? 0 : BALANCE.audio.masterVolume
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0')
    } catch {
      // Privater Modus ohne Speicher: Der Schalter wirkt, er ueberlebt nur den Neustart nicht.
    }
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }

  /** Nach Laufende: Drosselzustand des alten Laufs nicht in den neuen mitnehmen. */
  public resetRun(): void {
    this.scheduler.reset()
  }

  public play(kind: AudioEventKind): void {
    const context = this.context
    if (this.muted || context === undefined || this.master === undefined) return
    if (context.state === 'suspended') {
      // Noch nicht freigegeben - iOS gibt Web Audio erst nach einer Nutzergeste frei.
      // resume() laeuft asynchron, deshalb den Ton danach nachholen statt verfallen
      // lassen: sonst bliebe ausgerechnet die erste Quittung stumm.
      void context.resume().then(() => {
        if (context.state === 'running') this.playNow(kind)
      })
      return
    }
    this.playNow(kind)
  }

  private playNow(kind: AudioEventKind): void {
    const context = this.context
    if (this.muted || context === undefined || this.master === undefined) return
    if (!this.scheduler.request(kind, context.currentTime * 1000)) return
    const volume = BALANCE.audio.events[kind].volume
    switch (kind) {
      case 'shot':
        // Trockener Knall: kurzer gefilterter Rauschstoss plus tiefer Koerper.
        this.noiseBurst({ durationSec: 0.055, filterFromHz: 1800, filterToHz: 700, peak: volume })
        this.tone({ type: 'sine', fromHz: 190, toHz: 90, durationSec: 0.055, peak: volume * 0.6 })
        break
      case 'enemyDown':
        // Fallender Gleitton - liest sich als Umkippen, nicht als Explosion.
        this.tone({ type: 'triangle', fromHz: 420, toHz: 140, durationSec: 0.13, peak: volume })
        break
      case 'wallBreak':
        // Bruch: breites Rauschen, das nach unten wegsackt, mit tiefem Wuchtanteil.
        this.noiseBurst({ durationSec: 0.22, filterFromHz: 3200, filterToHz: 260, peak: volume * 0.9 })
        this.tone({ type: 'sine', fromHz: 110, toHz: 45, durationSec: 0.2, peak: volume * 0.9 })
        break
      case 'crowdUp':
        // A5 -> Cis6, grosse Terz aufwaerts: hoert sich nach "mehr" an.
        this.tone({ type: 'triangle', fromHz: 880, toHz: 880, durationSec: 0.09, peak: volume })
        this.tone({ type: 'triangle', fromHz: 1108.7, toHz: 1108.7, durationSec: 0.13, peak: volume, delaySec: 0.08 })
        break
      case 'crowdDown':
        // Dieselbe Terz abwaerts (A5 -> F5): die Truppe ist kleiner geworden.
        this.tone({ type: 'triangle', fromHz: 880, toHz: 880, durationSec: 0.09, peak: volume })
        this.tone({ type: 'triangle', fromHz: 698.5, toHz: 698.5, durationSec: 0.13, peak: volume, delaySec: 0.08 })
        break
      case 'weaponSwap':
        // C-Dur-Dreiklang aufwaerts (C6-E6-G6): eindeutig als Gewinn lesbar.
        this.tone({ type: 'triangle', fromHz: 1046.5, toHz: 1046.5, durationSec: 0.07, peak: volume })
        this.tone({ type: 'triangle', fromHz: 1318.5, toHz: 1318.5, durationSec: 0.07, peak: volume, delaySec: 0.065 })
        this.tone({ type: 'triangle', fromHz: 1568, toHz: 1568, durationSec: 0.12, peak: volume, delaySec: 0.13 })
        break
      case 'playerHit':
        // Tiefer Absturz mit dumpfem Rauschanteil - begleitet das Kamerawackeln.
        this.tone({ type: 'sawtooth', fromHz: 200, toHz: 55, durationSec: 0.26, peak: volume * 0.8 })
        this.noiseBurst({ durationSec: 0.12, filterFromHz: 900, filterToHz: 200, peak: volume * 0.5 })
        break
    }
  }

  private tone(options: ToneOptions): void {
    const context = this.context
    if (context === undefined || this.master === undefined) return
    const startSec = context.currentTime + (options.delaySec ?? 0)
    const endSec = startSec + options.durationSec
    const oscillator = context.createOscillator()
    oscillator.type = options.type
    oscillator.frequency.setValueAtTime(options.fromHz, startSec)
    if (options.toHz !== options.fromHz) oscillator.frequency.exponentialRampToValueAtTime(options.toHz, endSec)
    const gain = context.createGain()
    gain.gain.setValueAtTime(SILENCE, startSec)
    gain.gain.exponentialRampToValueAtTime(options.peak, startSec + ATTACK_SEC)
    gain.gain.exponentialRampToValueAtTime(SILENCE, endSec)
    oscillator.connect(gain).connect(this.master)
    oscillator.start(startSec)
    oscillator.stop(endSec + 0.02)
  }

  private noiseBurst(options: NoiseOptions): void {
    const context = this.context
    if (context === undefined || this.master === undefined) return
    const startSec = context.currentTime + (options.delaySec ?? 0)
    const endSec = startSec + options.durationSec
    const source = context.createBufferSource()
    source.buffer = this.noiseBuffer(context)
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(options.filterFromHz, startSec)
    filter.frequency.exponentialRampToValueAtTime(options.filterToHz, endSec)
    const gain = context.createGain()
    gain.gain.setValueAtTime(SILENCE, startSec)
    gain.gain.exponentialRampToValueAtTime(options.peak, startSec + ATTACK_SEC)
    gain.gain.exponentialRampToValueAtTime(SILENCE, endSec)
    source.connect(filter).connect(gain).connect(this.master)
    source.start(startSec)
    source.stop(endSec + 0.02)
  }

  private noiseBuffer(context: AudioContext): AudioBuffer {
    if (this.noise !== undefined) return this.noise
    const length = Math.floor(context.sampleRate * NOISE_BUFFER_SEC)
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1
    this.noise = buffer
    return buffer
  }
}

function readStoredMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

// Eine Instanz je Spiel, nicht je Szene: Der AudioContext lebt auf Spielebene, und die
// GameScene wird bei jedem Lauf neu erzeugt.
let shared: GameAudio | undefined

export function getGameAudio(scene: Phaser.Scene): GameAudio {
  if (shared === undefined) shared = new GameAudio(scene)
  return shared
}
