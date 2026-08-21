import { BALANCE } from '../config/balance'
import { getCombatFirepower, type BossUpgradeLevels } from './bossPlan'
import type { WeaponKey } from './weapons'

export type BlockerPlan = Readonly<{
  maxHp: number
  referenceDps: number
  referenceDestroySec: number
}>

export function getBlockerIntervalMs(designLevel: number): number {
  const index = Math.max(1, Math.min(BALANCE.blockers.spawnIntervalMsByDesignLevel.length, Math.floor(designLevel))) - 1
  return BALANCE.blockers.spawnIntervalMsByDesignLevel[index]
}

export function getBlockerPlan(level: number, upgrades: BossUpgradeLevels, teamSize: number, weapon: WeaponKey): BlockerPlan {
  const safeLevel = Math.max(1, Math.floor(level))
  const reference = BALANCE.boss.referenceFirepower
  const damage = Math.min(
    reference.damageCap,
    BALANCE.upgradesShop.damage.base + upgrades.damage * BALANCE.upgradesShop.damage.effectPerLevel + (safeLevel - 1) * reference.damagePerLevel,
  )
  const rate = Math.min(
    reference.rateCap,
    BALANCE.upgradesShop.rate.base + upgrades.rate * BALANCE.upgradesShop.rate.effectPerLevel + (safeLevel - 1) * reference.ratePerLevel,
  )
  const referenceDps = getCombatFirepower(teamSize, weapon) * damage * rate
  // Same purchased-stat and crowd multiplier reference as the boss: 2 s is centered
  // inside E9's 1.5–2.5 s target, so those two systems cannot drift apart silently.
  const maxHp = Math.round(referenceDps * BALANCE.blockers.referenceDestroySec)

  return { maxHp, referenceDps, referenceDestroySec: maxHp / referenceDps }
}
