import { BALANCE } from '../config/balance'

export type StatKey = 'hp' | 'damage' | 'shotsPerSec' | 'speed'

export function clampStat(stat: StatKey, value: number): number {
  const roundedValue = stat === 'hp' || stat === 'speed'
    ? Math.round(value)
    : Math.round(value * 10) / 10
  const { cap, floor } = BALANCE.stats[stat]
  return Math.min(cap, Math.max(floor, roundedValue))
}

export class RunStats {
  private values!: Record<StatKey, number>

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

  public set(stat: StatKey, value: number): void {
    this.values[stat] = clampStat(stat, value)
  }
}
