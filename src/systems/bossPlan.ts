import { BALANCE } from '../config/balance'
import { getCrowdDamageMultiplier } from './crowdDamage'

export type BossPhase = 1 | 2

export type BossPlan = {
  readonly level: number
  readonly maxHp: number
  readonly phaseThresholdHp: number
  readonly referenceDps: number
  readonly referenceFightSec: number
  readonly phaseOne: typeof BALANCE.boss.phaseOne
  readonly phaseTwo: typeof BALANCE.boss.phaseTwo
  readonly companionIntervalMs: number
  readonly companionLimit: number
  readonly pressureDelayMs: number
  readonly advanceSpeed: number
  readonly advanceStopBeforeAnchorPx: number
  readonly advanceContactDamage: number
}

export function getBossPlan(level: number): BossPlan {
  const safeLevel = Math.max(1, Math.floor(level))
  const reference = BALANCE.boss.referenceFirepower
  const damage = Math.min(reference.damageCap, reference.damageStart + (safeLevel - 1) * reference.damagePerLevel)
  const rate = Math.min(reference.rateCap, reference.rateStart + (safeLevel - 1) * reference.ratePerLevel)
  const activeShooters = Math.min(reference.teamAtBoss, BALANCE.crowd.shootersPerSalvo)
  const referenceDps = activeShooters
    * damage
    * rate
    * getCrowdDamageMultiplier(reference.teamAtBoss)
    * BALANCE.weapon.normal.damageFactor
    * BALANCE.weapon.normal.bulletsPerShot
  const maxHp = Math.min(BALANCE.boss.hpCap, Math.round(referenceDps * reference.targetFightSec))

  return {
    level: safeLevel,
    maxHp,
    phaseThresholdHp: maxHp / 2,
    referenceDps,
    referenceFightSec: maxHp / referenceDps,
    phaseOne: BALANCE.boss.phaseOne,
    phaseTwo: BALANCE.boss.phaseTwo,
    companionIntervalMs: BALANCE.boss.companionIntervalMs,
    companionLimit: BALANCE.boss.companionLimit,
    pressureDelayMs: BALANCE.boss.pressureDelayMs,
    advanceSpeed: BALANCE.boss.advanceSpeed,
    advanceStopBeforeAnchorPx: BALANCE.boss.advanceStopBeforeAnchorPx,
    advanceContactDamage: BALANCE.boss.advanceContactDamage,
  }
}

export function getBossPhase(currentHp: number, phaseTwoStarted: boolean, plan: BossPlan): BossPhase {
  return phaseTwoStarted || currentHp < plan.phaseThresholdHp ? 2 : 1
}

export function canSpawnBossCompanion(activeCompanions: number, plan: BossPlan): boolean {
  return activeCompanions < plan.companionLimit
}
