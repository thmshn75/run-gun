import { BALANCE } from '../config/balance'
import { pickSceneryKind, type SceneryKind, type ScenerySide } from './sceneryLayout'

export type CityConfig = Readonly<{
  spawnIntervalMs: number
  blockBuildingsMin: number
  blockBuildingsMax: number
  crossStreetGapPx: number
  greeneryChance: number
}>

export type CitySpawnCommand = Readonly<{
  side: ScenerySide
  kind: SceneryKind
  randomDistance: number
}>

// Oberkante des zuletzt gespawnten Gebaeudes je Seite in Bildschirm-px; null, solange keines aktiv ist.
export type CityLastBuildingTopY = Readonly<{ left: number | null; right: number | null }>

const SIDES: readonly ScenerySide[] = ['left', 'right']

// Erzeugt den Stadtplan: Bloecke aus lueckenlos aufeinanderfolgenden Gebaeuden, getrennt durch
// beidseitig synchrone Querstrassen. Die Fassade ist konstruktiv geschlossen, weil der Nachfolger
// im festen Takt spawnt, waehrend die Oberkante des Vorgaengers noch weit ueber dem Horizont liegt.
// Eine Querstrasse beginnt erst, wenn BEIDE Seiten ihren Block beendet haben, und endet erst, wenn
// die Oberkante des letzten Gebaeudes beider Seiten crossStreetGapPx unter den Horizont gewandert
// ist — dadurch liegen die Luecken links und rechts an derselben Scroll-Position.
export class CityPlanner {
  private readonly rng: () => number
  private readonly buildings: readonly SceneryKind[]
  private readonly greenery: readonly SceneryKind[]
  private readonly config: CityConfig
  private phase: 'block' | 'gap'
  private readonly remaining: Record<ScenerySide, number> = { left: 0, right: 0 }
  private readonly spawnTimerMs: Record<ScenerySide, number> = { left: 0, right: 0 }
  // Eine Bauflucht je Block und Seite: derselbe Abstand zur Strasse fuer alle Gebaeude des Blocks.
  private readonly blockDistance: Record<ScenerySide, number> = { left: 0, right: 0 }
  private readonly gapGreenery: Record<ScenerySide, boolean> = { left: false, right: false }

  public constructor(kinds: readonly SceneryKind[], rng: () => number, config: CityConfig = BALANCE.scenery) {
    this.rng = rng
    this.buildings = kinds.filter((kind) => kind.category === 'building')
    this.greenery = kinds.filter((kind) => kind.category === 'greenery')
    this.config = config
    this.phase = 'block'
    this.startBlock()
  }

  public step(dt: number, lastBuildingTopY: CityLastBuildingTopY): CitySpawnCommand[] {
    const commands: CitySpawnCommand[] = []
    if (this.phase === 'block') {
      for (const side of SIDES) {
        this.spawnTimerMs[side] -= dt
        while (this.spawnTimerMs[side] <= 0 && this.remaining[side] > 0) {
          this.spawnTimerMs[side] += this.config.spawnIntervalMs
          this.remaining[side] -= 1
          commands.push({ side, kind: pickSceneryKind(this.buildings, this.rng), randomDistance: this.blockDistance[side] })
        }
      }
      if (this.remaining.left === 0 && this.remaining.right === 0) {
        this.phase = 'gap'
        for (const side of SIDES) this.gapGreenery[side] = this.rng() < this.config.greeneryChance
      }
    } else {
      for (const side of SIDES) {
        if (this.gapGreenery[side] && this.clearancePx(lastBuildingTopY[side]) >= this.config.crossStreetGapPx * 0.4) {
          this.gapGreenery[side] = false
          commands.push({ side, kind: pickSceneryKind(this.greenery, this.rng), randomDistance: this.rng() })
        }
      }
      if (SIDES.every((side) => this.clearancePx(lastBuildingTopY[side]) >= this.config.crossStreetGapPx)) {
        this.phase = 'block'
        this.startBlock()
      }
    }
    return commands
  }

  private clearancePx(topY: number | null): number {
    return topY === null ? Number.POSITIVE_INFINITY : topY - BALANCE.road.horizonY
  }

  private startBlock(): void {
    const span = this.config.blockBuildingsMax - this.config.blockBuildingsMin + 1
    const count = this.config.blockBuildingsMin + Math.floor(this.rng() * span)
    for (const side of SIDES) {
      this.remaining[side] = count
      this.spawnTimerMs[side] = 0
      this.blockDistance[side] = this.rng()
    }
  }
}
