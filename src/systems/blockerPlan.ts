import { BALANCE } from '../config/balance'
import { getCombatFirepower } from './bossPlan'
import type { WeaponKey } from './weapons'

export type BlockerPlan = Readonly<{
  maxHp: number
  referenceDps: number
  referenceDestroySec: number
}>

export function getBlockerPlan(teamSize: number, weapon: WeaponKey, damage: number, rate: number): BlockerPlan {
  const referenceDps = getCombatFirepower(teamSize, weapon) * damage * rate
  // Measured run stats keep every blocker at the fixed two-second target.
  const maxHp = Math.round(referenceDps * BALANCE.blockers.referenceDestroySec)

  return { maxHp, referenceDps, referenceDestroySec: maxHp / referenceDps }
}
