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
  private musicGain: GainNode | undefined
  private droneOsc: OscillatorNode | undefined

  private musicTimer: ReturnType<typeof setInterval> | undefined
  private musicChordIndex = 0

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
    // Effekte sind seit 2026-08-24 abgeschaltet (BALANCE.audio.effectsEnabled) - nur
    // die Hintergrundmusik bleibt. Die Pruefung steht hier an der EINEN Stelle, durch
    // die jede Quittung laeuft, statt an den zehn Aufrufstellen im Spiel.
    if (!BALANCE.audio.effectsEnabled) return
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

  /**
   * Ruhige Hintergrundmusik (Thomas 2026-08-23: "ich moechte einfach eine angenehme
   * Musikuntermalung"). Synthetisch wie der Rest des Tons - keine Audiodatei, nichts
   * nachzuladen, offline identisch.
   *
   * Sie haengt am selben Master-Regler wie die Effekte, der Stummschalter im Menue
   * erfasst sie also mit. Auf iOS ist Web Audio bis zur ersten Nutzergeste gesperrt;
   * deshalb derselbe resume()-Umweg wie bei den Effekten.
   */
  public startMusic(): void {
    const context = this.context
    if (context === undefined || this.master === undefined || this.musicTimer !== undefined) return
    if (context.state === 'suspended') {
      void context.resume().then(() => {
        if (context.state === 'running' && this.musicTimer === undefined) this.startMusic()
      })
      return
    }
    const gain = context.createGain()
    gain.gain.value = 1
    gain.connect(this.master)
    this.musicGain = gain
    this.musicChordIndex = 0
    this.startDrone()
    this.playChord()
    this.musicTimer = setInterval(() => this.playChord(), BALANCE.audio.music.chordSeconds * 1000)
  }

  /**
   * Durchgehender tiefer Grundton unter der Musik.
   *
   * Er laeuft als EIN Oszillator ueber die ganze Szene, nicht je Akkord neu: Ein Drone,
   * der alle vier Sekunden neu einsetzt, wird zur Begleitstimme und faellt auf. Genau
   * das soll er nicht - er soll da sein, ohne dass man ihn bemerkt.
   */
  private startDrone(): void {
    const context = this.context
    const ziel = this.musicGain
    if (context === undefined || ziel === undefined || this.droneOsc !== undefined) return
    const musik = BALANCE.audio.music
    const osz = context.createOscillator()
    osz.type = 'sine'
    osz.frequency.value = musik.droneHz
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = musik.filterHz
    const huelle = context.createGain()
    // Langsam einblenden, sonst setzt der Grundton mit einem Schlag ein.
    huelle.gain.setValueAtTime(SILENCE, context.currentTime)
    huelle.gain.exponentialRampToValueAtTime(musik.droneVolume, context.currentTime + musik.attackSeconds)
    osz.connect(filter)
    filter.connect(huelle)
    huelle.connect(ziel)
    osz.start(context.currentTime)
    this.droneOsc = osz
  }

  public stopMusic(): void {
    if (this.musicTimer !== undefined) {
      clearInterval(this.musicTimer)
      this.musicTimer = undefined
    }
    // Der Drone laeuft als EIN Oszillator ueber die ganze Szene und muss deshalb hier
    // ausdruecklich enden. Ohne das liefe er nach dem Szenenwechsel weiter (unhoerbar,
    // weil musicGain getrennt wird, aber weiter rechnend) - und schlimmer: startDrone
    // prueft auf droneOsc und wuerde im naechsten Run gar nicht mehr anspringen, die
    // Musik waere ab dem zweiten Lauf ohne Fundament.
    if (this.droneOsc !== undefined) {
      const drone = this.droneOsc
      this.droneOsc = undefined
      try { drone.stop((this.context?.currentTime ?? 0) + 0.5) } catch { /* schon beendet */ }
      setTimeout(() => drone.disconnect(), 700)
    }
    if (this.musicGain !== undefined) {
      // Nicht hart abschneiden: Ein laufendes Pad knackt sonst beim Szenenwechsel.
      const jetzt = this.context?.currentTime ?? 0
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, jetzt)
      this.musicGain.gain.exponentialRampToValueAtTime(SILENCE, jetzt + 0.4)
      const alt = this.musicGain
      setTimeout(() => alt.disconnect(), 600)
      this.musicGain = undefined
    }
  }

  private playChord(): void {
    const context = this.context
    const ziel = this.musicGain
    if (context === undefined || ziel === undefined) return
    const musik = BALANCE.audio.music
    const akkord = musik.chords[this.musicChordIndex % musik.chords.length]
    this.musicChordIndex += 1
    const start = context.currentTime
    // Die Toene ueberlappen bewusst (Dauer > Akkordabstand): So gibt es keine Luecke
    // zwischen den Akkorden, sie gehen ineinander ueber.
    const dauer = musik.chordSeconds + musik.releaseSeconds
    for (const hz of akkord) {
      const osz = context.createOscillator()
      osz.type = 'sine'
      osz.frequency.value = hz
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = musik.filterHz
      const huelle = context.createGain()
      huelle.gain.setValueAtTime(SILENCE, start)
      huelle.gain.exponentialRampToValueAtTime(musik.volume / akkord.length, start + musik.attackSeconds)
      huelle.gain.setValueAtTime(musik.volume / akkord.length, start + musik.chordSeconds)
      huelle.gain.exponentialRampToValueAtTime(SILENCE, start + dauer)
      osz.connect(filter)
      filter.connect(huelle)
      huelle.connect(ziel)
      osz.start(start)
      osz.stop(start + dauer + 0.05)
    }
    this.playMelody(start)
  }

  /**
   * Melodiestimme ueber dem laufenden Akkord (2026-08-24, Thomas: "zu langsam und mehr
   * Melodie gewuenscht").
   *
   * Die Toene werden im VORAUS auf der Web-Audio-Uhr geplant, nicht per Timer
   * nachgetaktet: setInterval schwankt im Browser um zweistellige Millisekunden und
   * unter Last deutlich mehr - eine so getaktete Melodie eiert hoerbar. Die Audio-Uhr
   * ist von der Bildrate unabhaengig, deshalb liegen die vier Toene exakt im Raster,
   * auch wenn das Spiel gerade ruckelt.
   */
  private playMelody(start: number): void {
    const context = this.context
    const ziel = this.musicGain
    if (context === undefined || ziel === undefined) return
    const musik = BALANCE.audio.music
    const noten = musik.melody[(this.musicChordIndex - 1) % musik.melody.length]
    const abstand = musik.chordSeconds / noten.length

    noten.forEach((hz, index) => {
      // 0 heisst PAUSE. Die Stille ist Teil des Klangbilds, nicht eine Luecke -
      // siehe Herleitung bei BALANCE.audio.music.melody.
      if (hz <= 0) return
      const tonStart = start + index * abstand
      const osz = context.createOscillator()
      osz.type = 'triangle'
      osz.frequency.value = hz
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = musik.melodyFilterHz
      const huelle = context.createGain()
      // Kurzer Anstieg, langer Ausklang - das klingt gezupft. Ein symmetrischer
      // Verlauf wie bei den Pads wuerde die Toene ineinanderlaufen lassen und genau
      // den stehenden Eindruck erzeugen, der behoben werden soll.
      huelle.gain.setValueAtTime(SILENCE, tonStart)
      huelle.gain.exponentialRampToValueAtTime(musik.melodyVolume, tonStart + 0.04)
      huelle.gain.exponentialRampToValueAtTime(SILENCE, tonStart + musik.melodyNoteSeconds)
      osz.connect(filter)
      filter.connect(huelle)
      huelle.connect(ziel)
      osz.start(tonStart)
      osz.stop(tonStart + musik.melodyNoteSeconds + 0.05)
    })
  }

  private playNow(kind: AudioEventKind): void {
    const context = this.context
    if (this.muted || context === undefined || this.master === undefined) return
    const volume = BALANCE.audio.events[kind].volume
    // Auf 0 gestellte Ereignisse gar nicht erst erzeugen (Schuss und Sterbeton seit
    // 2026-08-23). Der Zweig darunter bleibt stehen, damit ein Zurueckdrehen eine
    // Zahl ist und kein Umbau.
    if (volume <= 0) return
    if (!this.scheduler.request(kind, context.currentTime * 1000)) return
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
