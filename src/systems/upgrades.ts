import { BALANCE } from '../config/balance'

export type StatKey = 'hp' | 'damage' | 'shotsPerSec' | 'projectiles'

export function clampStat(stat: StatKey, value: number): number {
  const roundedValue = stat === 'hp' || stat === 'projectiles' ? Math.round(value) : value
  const floor = stat === 'hp' ? 0 : 1
  return Math.min(BALANCE.stats[stat].cap, Math.max(floor, roundedValue))
}

export class RunStats {
  private values!: Record<StatKey, number>

  public constructor() {
    this.values = {
      hp: BALANCE.stats.hp.base,
      damage: BALANCE.stats.damage.base,
      shotsPerSec: BALANCE.stats.shotsPerSec.base,
      projectiles: BALANCE.stats.projectiles.base,
    }
  }

  public get(stat: StatKey): number {
    return this.values[stat]
  }

  public set(stat: StatKey, value: number): void {
    this.values[stat] = clampStat(stat, value)
  }
}
