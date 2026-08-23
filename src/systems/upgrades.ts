import { BALANCE } from '../config/balance'

export type StatKey = 'hp' | 'damage' | 'shotsPerSec' | 'speed'
export function getStatCap(stat: StatKey, level: number): number {
  const { capAtLevelOne, capAtLevelTwelve } = BALANCE.stats[stat]
  if (capAtLevelOne === capAtLevelTwelve) return capAtLevelOne
  const safeLevel = Math.min(12, Math.max(1, Math.floor(level)))
  return capAtLevelOne * (capAtLevelTwelve / capAtLevelOne) ** ((safeLevel - 1) / 11)
}

export function clampStat(stat: StatKey, value: number, level = 1): number {
  const roundedValue = stat === 'hp' || stat === 'speed'
    ? Math.round(value)
    : Math.round(value * 10) / 10
  const { floor } = BALANCE.stats[stat]
  // Der Deckel wird auf dieselbe Stufe gerundet wie der Wert selbst, sonst zeigt die
  // Anzeige einen Wert, der eine Nachkommastelle unter der echten Grenze klebt.
  const cap = stat === 'hp' || stat === 'speed'
    ? Math.round(getStatCap(stat, level))
    : Math.round(getStatCap(stat, level) * 10) / 10
  return Math.min(cap, Math.max(floor, roundedValue))
}

export class RunStats {
  private values!: Record<StatKey, number>
  private level = 1

  public constructor() {
    this.values = {
      hp: BALANCE.stats.hp.base,
      damage: BALANCE.stats.damage.base,
      shotsPerSec: BALANCE.stats.shotsPerSec.base,
      speed: BALANCE.stats.speed.base,
    }
  }

  public get(stat: StatKey): number {
    return this.values[stat]
  }

  /**
   * Levelwechsel. Der Deckel steigt damit; bestehende Werte bleiben unangetastet, weil
   * sie unter dem neuen, hoeheren Deckel liegen. Beim Zurueckspringen auf ein
   * niedrigeres Level (Dev-Werkzeug) werden sie nachgeklemmt.
   */
  public setLevel(level: number): void {
    this.level = Math.max(1, Math.floor(level))
    for (const stat of Object.keys(this.values) as StatKey[]) {
      this.values[stat] = clampStat(stat, this.values[stat], this.level)
    }
  }

  public getLevel(): number {
    return this.level
  }

  public set(stat: StatKey, value: number): void {
    this.values[stat] = clampStat(stat, value, this.level)
  }
}
