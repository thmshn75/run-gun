import { BALANCE } from '../config/balance'
import { getCrowdDamageMultiplier } from './crowdDamage'
import { getLevelPlan } from './levelPlan'
import { getStatCap } from './upgrades'
import type { WeaponKey } from './weapons'

export type BossPhase = 1 | 2

type BossPhaseTwoConfig = typeof BALANCE.boss.phaseTwo

export type BossPhaseOneProfile = typeof BALANCE.boss.phaseOne & Readonly<{
  hordeIntervalMs: number
}>

export type BossPhaseTwoProfile = BossPhaseTwoConfig & Readonly<{
  hordeIntervalMs: number
}>

export type BossPlan = {
  readonly level: number
  readonly maxHp: number
  readonly phaseThresholdHp: number
  readonly referenceDps: number
  readonly referenceFightSec: number
  readonly phaseOne: BossPhaseOneProfile
  readonly phaseTwo: BossPhaseTwoProfile
  readonly hordeSize: number
  readonly maxActiveCalled: number
  readonly pressureDelayMs: number
  readonly advanceSpeed: number
  readonly advanceStopBeforeAnchorPx: number
  readonly advanceContactDamage: number
}

// The same capped-shooter and crowd-bonus term used by the live combat damage.
// Das Level gehoert dazu, seit der Schadensbonus mit ihm waechst (2026-08-23).
export function getTeamFirepower(teamSize: number, level = 1): number {
  return Math.min(teamSize, BALANCE.crowd.shootersPerSalvo) * getCrowdDamageMultiplier(teamSize, level)
}

// Weapon firepower normalized to normal. Splash and chaining intentionally do not count: a boss is one target.
export function getWeaponFirepower(weapon: WeaponKey): number {
  const config = BALANCE.weapon[weapon]
  return (config.shootersPerSalvo / BALANCE.crowd.shootersPerSalvo)
    * config.rateFactor * (config.damageFactor * config.bulletsPerShot)
}

// Actual combat output uses the weapon's real shooter count, which matters for small teams.
export function getCombatFirepower(teamSize: number, weapon: WeaponKey, level = 1): number {
  const config = BALANCE.weapon[weapon]
  return Math.min(teamSize, config.shootersPerSalvo)
    * getCrowdDamageMultiplier(teamSize, level)
    * config.rateFactor * config.damageFactor * config.bulletsPerShot
}

/**
 * Gegnerdruck der Normalphase kurz vor dem Boss, in Gegnern je Sekunde. Bezugsgroesse
 * fuer den Hordendruck des Bosses: Beim Bossstart schaltet die GameScene den
 * Normalspawner ab, der Boss ersetzt ihn also vollstaendig.
 *
 * Zwei Groessen aus der Leveltabelle: die erwartete Zahl Gegner je Spawn-Ereignis
 * (Einzelner oder Horde, gewichtet nach squadChance und den Squad-Gewichten) und das
 * Spawn-Intervall am ENDE der Rampe - denn dort steht das Level, wenn der Boss kommt.
 */
export function getNormalPhaseEnemiesPerSec(level: number): number {
  const plan = getLevelPlan(Math.max(1, Math.floor(level)))
  const totalWeight = plan.squads.reduce((sum, squad) => sum + squad.weight, 0)
  const expectedSquadSize = totalWeight === 0
    ? 1
    : plan.squads.reduce((sum, squad) => sum + squad.weight * squad.size, 0) / totalWeight
  const squadChance = plan.squads.length === 0 ? 0 : plan.squadChance
  const enemiesPerEvent = (1 - squadChance) * 1 + squadChance * expectedSquadSize
  // Die Rampe verkuerzt das Intervall um spawnRampPerSec je Sekunde, gedeckelt am
  // Minimum. Am Ende der Normalphase steht es hier.
  const rampedIntervalMs = Math.max(
    plan.spawnIntervalMinMs,
    plan.spawnIntervalMs - plan.normalPhaseSec * BALANCE.enemy.spawnRampPerSec,
  )
  // KORREKTUR 2026-08-22: Bis hierher wurde nur durch das Intervall geteilt. Der
  // Spawner setzt nach einer Horde aber eine NACHLAUFPAUSE, die das Intervall
  // ueberschreibt (spawner.ts: spawnAccumulatorMs = min(acc, interval - pause)). Bei
  // Level 12 ergab die alte Rechnung 31,9 Gegner/s, real spawnt der Takt dort 6,8/s -
  // Faktor 4,7 zu hoch. Der Fehler blieb unbemerkt, weil der Boss-Ruftakt in seine
  // Untergrenze minIntervalMs lief und die ueberhoehte Zahl dort abgeschnitten wurde.
  // Mit den groesseren Horden waere daraus eine geschlossene Gegnerwand geworden.
  const squadPauseMs = BALANCE.level.squads.pauseBaseMs + expectedSquadSize * BALANCE.level.squads.pausePerMemberMs
  const secondsPerEvent = ((1 - squadChance) * rampedIntervalMs + squadChance * Math.max(rampedIntervalMs, squadPauseMs)) / 1000
  return secondsPerEvent <= 0 ? 0 : enemiesPerEvent / secondsPerEvent
}

/**
 * Der Boss ruft ganze Horden - so gross wie die groessten des Levels, aber mit EIGENEM
 * Deckel.
 *
 * Der Levelnummern-Deckel der Normalphase (getMaxSquadSize) waechst seit 2026-08-23 mit;
 * der Bossdruck darf ihm NICHT folgen. W5 ist auf hoechstens zwei gleichzeitige Horden
 * ausgelegt und so gemessen (maxActiveCalled = 2 x bossHordeSizeCap): Waechst die
 * Hordengroesse mit, passt nur noch EINE Horde in den Deckel und der Bossdruck saenke
 * still - das Gegenteil der Absicht. Der Levelaufbau kommt beim Boss deshalb ueber den
 * Ruf-TAKT (getBossHordeIntervalMs steigt mit getNormalPhaseEnemiesPerSec mit), nicht
 * ueber die Groesse.
 */
export function getBossHordeSize(level: number): number {
  const plan = getLevelPlan(Math.max(1, Math.floor(level)))
  const largest = plan.squads.reduce((size, squad) => Math.max(size, squad.size), 0)
  return Math.max(BALANCE.level.squads.minSize, Math.min(BALANCE.boss.hordePressure.hordeSizeCap, largest))
}

/**
 * Ruf-Takt, damit der Hordenfluss dem gewuenschten Anteil am Normaldruck entspricht:
 * Hordengroesse / Intervall = Normaldruck x Anteil.
 */
export function getBossHordeIntervalMs(level: number, pressureShare: number): number {
  const enemiesPerSec = getNormalPhaseEnemiesPerSec(level) * pressureShare
  if (enemiesPerSec <= 0) return Number.POSITIVE_INFINITY
  return Math.max(BALANCE.boss.hordePressure.minIntervalMs, 1000 * getBossHordeSize(level) / enemiesPerSec)
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
  return {
    ...BALANCE.boss.phaseOne,
    hordeIntervalMs: getBossHordeIntervalMs(level, BALANCE.boss.phaseOne.hordePressureShare),
  }
}

export function getPhaseTwoProfile(level: number): BossPhaseTwoProfile {
  return {
    ...BALANCE.boss.phaseTwo,
    hordeIntervalMs: getBossHordeIntervalMs(level, BALANCE.boss.phaseTwo.hordePressureShare),
  }
}

export function getBossPlan(
  level: number,
  teamSize: number,
  weapon: WeaponKey,
  damage: number,
  rate: number,
): BossPlan {
  const safeLevel = Math.max(1, Math.floor(level))
  const reference = BALANCE.boss.referenceFirepower
  // Erwarteter Ausbaustand beim Bosskampf. Frueher aus gekauften Shop-Stufen plus
  // einem Levelzuschlag geschaetzt; seit der Shop entfallen ist (2026-08-23) ist es
  // schlicht der Level-Deckel - dort steht der Spieler beim Boss, weil die Sammelbahnen
  // ihn in unter einer Minute fuellen. Das ist nicht nur einfacher, sondern genauer.
  const assumedDamage = Math.min(reference.damageCap, getStatCap('damage', safeLevel))
  const assumedRate = Math.min(reference.rateCap, getStatCap('shotsPerSec', safeLevel))
  const referenceDps = getCombatFirepower(teamSize, weapon, safeLevel) * damage * rate
  const maxFirepower = getTeamFirepower(BALANCE.crowd.max, safeLevel)
  const statTerm = (assumedDamage * assumedRate / (damage * rate)) ** (1 - reference.statDampening)
  const unclampedFightSec =
    reference.fightSecAtMaxTeam
    * (maxFirepower / getTeamFirepower(teamSize, safeLevel)) ** reference.teamDampening
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
    hordeSize: getBossHordeSize(safeLevel),
    maxActiveCalled: BALANCE.boss.hordePressure.maxActiveCalled,
    pressureDelayMs: BALANCE.boss.pressureDelayMs,
    advanceSpeed: BALANCE.boss.advanceSpeed,
    advanceStopBeforeAnchorPx: BALANCE.boss.advanceStopBeforeAnchorPx,
    advanceContactDamage: BALANCE.boss.advanceContactDamage,
  }
}

export function getBossPhase(currentHp: number, phaseTwoStarted: boolean, plan: BossPlan): BossPhase {
  return phaseTwoStarted || currentHp < plan.phaseThresholdHp ? 2 : 1
}

export function canSpawnBossHorde(activeCalled: number, hordeSize: number, maxActiveCalled: number): boolean {
  // Ganze Horde oder gar keine: Eine halb gespawnte Horde waere keine Formation mehr.
  return activeCalled + hordeSize <= maxActiveCalled
}
