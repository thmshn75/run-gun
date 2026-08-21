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

// The same capped-shooter and crowd-bonus term used by the live combat damage.
export function getTeamFirepower(teamSize: number): number {
  return Math.min(teamSize, BALANCE.crowd.shootersPerSalvo) * getCrowdDamageMultiplier(teamSize)
}

export function getBossCompanionLimit(level: number): number {
  return getLevelPlan(Math.max(1, Math.floor(level))).companionLimit
}

export function getBossPlan(level: number, upgrades: BossUpgradeLevels, teamSize: number): BossPlan {
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
  const referenceDps = getTeamFirepower(teamSize)
    * damage
    * rate
    * BALANCE.weapon.normal.damageFactor
    * BALANCE.weapon.normal.bulletsPerShot
  const maxFirepower = getTeamFirepower(BALANCE.crowd.max)
  const fightSec = Math.min(
    reference.maxFightSec,
    reference.fightSecAtMaxTeam * (maxFirepower / getTeamFirepower(teamSize)) ** reference.teamDampening,
  )
  const maxHp = Math.min(BALANCE.boss.hpCap, Math.round(referenceDps * fightSec))

  return {
    level: safeLevel,
    maxHp,
    phaseThresholdHp: maxHp / 2,
    referenceDps,
    referenceFightSec: maxHp / referenceDps,
    phaseOne: BALANCE.boss.phaseOne,
    phaseTwo: BALANCE.boss.phaseTwo,
    companionIntervalMs: BALANCE.boss.companionIntervalMs,
    companionLimit: getBossCompanionLimit(safeLevel),
    pressureDelayMs: BALANCE.boss.pressureDelayMs,
    advanceSpeed: BALANCE.boss.advanceSpeed,
    advanceStopBeforeAnchorPx: BALANCE.boss.advanceStopBeforeAnchorPx,
    advanceContactDamage: BALANCE.boss.advanceContactDamage,
  }
}

export function getBossPhase(currentHp: number, phaseTwoStarted: boolean, plan: BossPlan): BossPhase {
  return phaseTwoStarted || currentHp < plan.phaseThresholdHp ? 2 : 1
}

export function canSpawnBossCompanion(activeCompanions: number, companionLimit: number): boolean {
  return activeCompanions < companionLimit
}
