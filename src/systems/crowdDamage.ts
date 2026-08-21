import { BALANCE } from '../config/balance'

export function getCrowdDamageMultiplier(crowdSize: number): number {
  return Math.min(
    BALANCE.crowd.damageMultiplierCap,
    1 + Math.max(0, crowdSize - BALANCE.crowd.shootersPerSalvo) * BALANCE.crowd.damagePerExtraFigure,
  )
}
