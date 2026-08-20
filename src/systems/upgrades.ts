import { BALANCE } from '../config/balance'
import type { SaveData } from './save'

export type StatKey = 'hp' | 'damage' | 'shotsPerSec' | 'speed'
export type ShopUpgradeKey = 'team' | 'damage' | 'rate'

const shopKeys: readonly ShopUpgradeKey[] = ['team', 'damage', 'rate']

export function getShopUpgradeKeys(): readonly ShopUpgradeKey[] {
  return shopKeys
}

export function getUpgradePrice(_key: ShopUpgradeKey, level: number): number | undefined {
  if (level < 0 || level >= BALANCE.upgradesShop.prices.length) return undefined
  return BALANCE.upgradesShop.prices[level]
}

export function getUpgradeStartValue(key: ShopUpgradeKey, level: number): number {
  const config = BALANCE.upgradesShop[key]
  return config.base + config.effectPerLevel * level
}

export function purchaseUpgrade(save: SaveData, key: ShopUpgradeKey): SaveData | undefined {
  const level = save.upgrades[key]
  const price = getUpgradePrice(key, level)
  if (price === undefined || save.coins < price) return undefined
  return {
    ...save,
    coins: save.coins - price,
    upgrades: { ...save.upgrades, [key]: level + 1 },
    scores: save.scores.map((score) => ({ ...score })),
  }
}

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
