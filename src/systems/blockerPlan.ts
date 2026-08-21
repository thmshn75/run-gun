import { BALANCE } from '../config/balance'
import { getCombatFirepower } from './bossPlan'
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

export function getBlockerPlan(teamSize: number, weapon: WeaponKey, damage: number, rate: number): BlockerPlan {
  const referenceDps = getCombatFirepower(teamSize, weapon) * damage * rate
  // Measured run stats keep every blocker at the fixed two-second target.
  const maxHp = Math.round(referenceDps * BALANCE.blockers.referenceDestroySec)

  return { maxHp, referenceDps, referenceDestroySec: maxHp / referenceDps }
}
