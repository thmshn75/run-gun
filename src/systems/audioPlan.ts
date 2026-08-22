import { BALANCE } from '../config/balance'

export type AudioEventKind = keyof typeof BALANCE.audio.events

/**
 * Nachholpuffer der Ratenbremse. Eine feste Mindestpause klingt harmlos, hat aber
 * einen Fehler: Trifft der Eingangstakt nicht auf das Drosselraster, fallen Toene
 * aus. Gemessen bei Minigun (17,6 Salven/s) gegen 125 ms Drossel: 5,9 statt 8 Toene
 * je Sekunde - die schnellste Waffe im Spiel haette langsamer geklungen als die
 * Standardwaffe. Deshalb eine Rate statt einer Pause: Jeder Ton kostet eine Marke,
 * Marken wachsen mit 1 / minGapMs nach, der Rest verfaellt nicht. 2 Marken als Deckel
 * erlauben ein kurzes Nachholen (zwei Treffer dicht hintereinander duerfen beide
 * klingen), aber keinen Dauerburst.
 */
const BURST_TOKENS = 2

/**
 * Entscheidet, OB ein Ton gespielt werden darf - ohne Web Audio, ohne Phaser, damit
 * die Regel testbar bleibt. Zwei Bremsen:
 * 1. Ratenbremse je Ereignisart (verhindert Teppiche aus Schuss- und Sterbetoenen).
 * 2. Stimmen-Deckel fuer die haeufigen Toene (verhindert Verzerrung, wenn viele
 *    gleichzeitig anliegen). Seltene, wichtige Toene umgehen ihn.
 */
export class AudioScheduler {
  private readonly tokens: Map<AudioEventKind, number>
  private readonly lastRefillMs: Map<AudioEventKind, number>
  // Fixes Array statt push/splice: laeuft bei jedem Schuss, soll nichts allozieren.
  private readonly casualVoiceEndsMs: number[]
  private casualVoiceCount: number

  public constructor() {
    this.tokens = new Map()
    this.lastRefillMs = new Map()
    this.casualVoiceEndsMs = new Array<number>(BALANCE.audio.maxCasualVoices).fill(0)
    this.casualVoiceCount = 0
  }

  public request(kind: AudioEventKind, nowMs: number): boolean {
    const config = BALANCE.audio.events[kind]
    const available = this.refill(kind, nowMs)
    if (config.minGapMs > 0 && available < 1) return false

    if (config.casual) {
      this.expireCasualVoices(nowMs)
      if (this.casualVoiceCount >= BALANCE.audio.maxCasualVoices) return false
      this.casualVoiceEndsMs[this.casualVoiceCount] = nowMs + config.durationMs
      this.casualVoiceCount += 1
    }

    if (config.minGapMs > 0) this.tokens.set(kind, available - 1)
    return true
  }

  /** Nach einem Laufende: keine Drosselung aus dem alten Lauf in den neuen schleppen. */
  public reset(): void {
    this.tokens.clear()
    this.lastRefillMs.clear()
    this.casualVoiceCount = 0
  }

  public getActiveCasualVoices(nowMs: number): number {
    this.expireCasualVoices(nowMs)
    return this.casualVoiceCount
  }

  /** Schreibt den Markenstand fort und gibt zurueck, wie viele jetzt verfuegbar sind. */
  private refill(kind: AudioEventKind, nowMs: number): number {
    const config = BALANCE.audio.events[kind]
    if (config.minGapMs <= 0) return BURST_TOKENS
    const lastMs = this.lastRefillMs.get(kind)
    this.lastRefillMs.set(kind, nowMs)
    if (lastMs === undefined) {
      // Erster Ton dieser Art: eine Marke, damit er sofort kommt statt erst nach der Pause.
      this.tokens.set(kind, 1)
      return 1
    }
    const grown = (this.tokens.get(kind) ?? 1) + Math.max(0, nowMs - lastMs) / config.minGapMs
    const available = Math.min(BURST_TOKENS, grown)
    this.tokens.set(kind, available)
    return available
  }

  private expireCasualVoices(nowMs: number): void {
    let write = 0
    for (let read = 0; read < this.casualVoiceCount; read += 1) {
      const endsAtMs = this.casualVoiceEndsMs[read]
      if (endsAtMs > nowMs) {
        this.casualVoiceEndsMs[write] = endsAtMs
        write += 1
      }
    }
    this.casualVoiceCount = write
  }
}
