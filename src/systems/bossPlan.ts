import { BALANCE } from '../config/balance'
import { getCrowdDamageMultiplier } from './crowdDamage'
import { getLevelPlan } from './levelPlan'

export type BossPhase = 1 | 2

export type BossUpgradeLevels = Readonly<{
  readonly team: number
  readonly damage: number
  readonly rate: number
}>

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

export function getReferenceTeamAtBoss(upgrades: BossUpgradeLevels): number {
  const teamUpgrade = BALANCE.upgradesShop.team
  const startTeam = teamUpgrade.base + upgrades.team * teamUpgrade.effectPerLevel
  return Math.min(BALANCE.crowd.max, startTeam * BALANCE.boss.referenceFirepower.teamGrowthFactor)
}

export function getBossPlan(level: number, upgrades: BossUpgradeLevels): BossPlan {
  const safeLevel = Math.max(1, Math.floor(level))
  const reference = BALANCE.boss.referenceFirepower
  const damageUpgrade = BALANCE.upgradesShop.damage
  const rateUpgrade = BALANCE.upgradesShop.rate
  const damage = Math.min(
    reference.damageCap,
    damageUpgrade.base + upgrades.damage * damageUpgrade.effectPerLevel + (safeLevel - 1) * reference.damagePerLevel,
  )
  const rate = Math.min(
    reference.rateCap,
    rateUpgrade.base + upgrades.rate * rateUpgrade.effectPerLevel + (safeLevel - 1) * reference.ratePerLevel,
  )
  const referenceTeam = getReferenceTeamAtBoss(upgrades)
  const activeShooters = Math.min(referenceTeam, BALANCE.crowd.shootersPerSalvo)
  const referenceDps = activeShooters
    * damage
    * rate
    * getCrowdDamageMultiplier(referenceTeam)
    * BALANCE.weapon.normal.damageFactor
    * BALANCE.weapon.normal.bulletsPerShot
  // Permanent upgrades remain stronger against regular enemies and squads. Only boss HP
  // tracks their damage/rate values, so each purchase state keeps the intended 20 s fight.
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
    companionLimit: getLevelPlan(safeLevel).companionLimit,
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
