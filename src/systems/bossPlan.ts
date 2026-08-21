import { BALANCE } from '../config/balance'
import { getCrowdDamageMultiplier } from './crowdDamage'
import { getLevelPlan } from './levelPlan'
import type { WeaponKey } from './weapons'

export type BossPhase = 1 | 2

type BossPhaseTwoConfig = typeof BALANCE.boss.phaseTwo

export type BossPhaseOneProfile = Omit<typeof BALANCE.boss.phaseOne, 'burstCount'> & Readonly<{
  burstCount: number
}>

export type BossPhaseTwoProfile = Omit<
  BossPhaseTwoConfig,
  'burstCount' | 'burstCountAtLevelOne' | 'burstCountPerThreeLevels'
  | 'burstSpreadPx' | 'burstSpreadPxAtLevelOne' | 'burstSpreadPxPerLevel'
> & Readonly<{
  burstCount: number
  burstSpreadPx: number
}>

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
  readonly phaseOne: BossPhaseOneProfile
  readonly phaseTwo: BossPhaseTwoProfile
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

// Weapon firepower normalized to normal. Splash and chaining intentionally do not count: a boss is one target.
export function getWeaponFirepower(weapon: WeaponKey): number {
  const config = BALANCE.weapon[weapon]
  return (config.shootersPerSalvo / BALANCE.crowd.shootersPerSalvo)
    * config.rateFactor * (config.damageFactor * config.bulletsPerShot)
}

// Actual combat output uses the weapon's real shooter count, which matters for small teams.
export function getCombatFirepower(teamSize: number, weapon: WeaponKey): number {
  const config = BALANCE.weapon[weapon]
  return Math.min(teamSize, config.shootersPerSalvo)
    * getCrowdDamageMultiplier(teamSize)
    * config.rateFactor * config.damageFactor * config.bulletsPerShot
}

export function getBossCompanionLimit(level: number): number {
  return getLevelPlan(Math.max(1, Math.floor(level))).companionLimit
}

export function getMaxFightSec(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level))
  const reference = BALANCE.boss.referenceFirepower
  return Math.max(
    reference.minFightSec,
    Math.min(
      reference.maxFightSecCap,
      reference.maxFightSecAtLevelOne + reference.maxFightSecPerLevel * (safeLevel - 1),
    ),
  )
}

export function getPhaseOneProfile(level: number): BossPhaseOneProfile {
  const safeLevel = Math.max(1, Math.floor(level))
  return {
    ...BALANCE.boss.phaseOne,
    burstCount: Math.min(BALANCE.boss.phaseOne.burstCount, safeLevel),
  }
}

export function getPhaseTwoProfile(level: number): BossPhaseTwoProfile {
  const safeLevel = Math.max(1, Math.floor(level))
  const {
    burstCount,
    burstCountAtLevelOne,
    burstCountPerThreeLevels,
    burstSpreadPx,
    burstSpreadPxAtLevelOne,
    burstSpreadPxPerLevel,
    ...unchangedPhaseTwo
  } = BALANCE.boss.phaseTwo

  return {
    ...unchangedPhaseTwo,
    burstCount: Math.min(
      burstCount,
      safeLevel,
      burstCountAtLevelOne + Math.floor((safeLevel - 1) / 3) * burstCountPerThreeLevels,
    ),
    burstSpreadPx: Math.min(burstSpreadPx, burstSpreadPxAtLevelOne + burstSpreadPxPerLevel * (safeLevel - 1)),
  }
}

export function getBossPlan(
  level: number,
  upgrades: BossUpgradeLevels,
  teamSize: number,
  weapon: WeaponKey,
  damage: number,
  rate: number,
): BossPlan {
  const safeLevel = Math.max(1, Math.floor(level))
  const reference = BALANCE.boss.referenceFirepower
  const damageUpgrade = BALANCE.upgradesShop.damage
  const rateUpgrade = BALANCE.upgradesShop.rate
  const assumedDamage = Math.min(
    reference.damageCap,
    damageUpgrade.base + upgrades.damage * damageUpgrade.effectPerLevel + (safeLevel - 1) * reference.damagePerLevel,
  )
  const assumedRate = Math.min(
    reference.rateCap,
    rateUpgrade.base + upgrades.rate * rateUpgrade.effectPerLevel + (safeLevel - 1) * reference.ratePerLevel,
  )
  const referenceDps = getCombatFirepower(teamSize, weapon) * damage * rate
  const maxFirepower = getTeamFirepower(BALANCE.crowd.max)
  const statTerm = (assumedDamage * assumedRate / (damage * rate)) ** (1 - reference.statDampening)
  const unclampedFightSec =
    reference.fightSecAtMaxTeam
    * (maxFirepower / getTeamFirepower(teamSize)) ** reference.teamDampening
    * (1 / getWeaponFirepower(weapon)) ** (1 - reference.weaponDampening)
    * statTerm
  const fightSec = Math.min(getMaxFightSec(safeLevel), Math.max(reference.minFightSec, unclampedFightSec))
  const maxHp = Math.round(referenceDps * fightSec)

  return {
    level: safeLevel,
    maxHp,
    phaseThresholdHp: maxHp / 2,
    referenceDps,
    referenceFightSec: maxHp / referenceDps,
    phaseOne: getPhaseOneProfile(safeLevel),
    phaseTwo: getPhaseTwoProfile(safeLevel),
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
