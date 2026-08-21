import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import {
  canSpawnBossCompanion,
  getBossPhase,
  getBossPlan,
  getCombatFirepower,
  getMaxFightSec,
  getTeamFirepower,
  getWeaponFirepower,
  type BossUpgradeLevels,
} from '../src/systems/bossPlan'

const weaponKeys = ['normal', 'shotgun', 'laser', 'rocket', 'minigun', 'flamethrower', 'chainlightning'] as const
const teamSizes = [2, 3, 6, 12, 20, 30]
const damageValues = [1, 3, 10, 20]
const rateValues = [1, 1.5, 3, 8]
const levels = [1, 6, 12]
const maxUpgradeLevel = BALANCE.upgradesShop.prices.length
const purchaseStates: ReadonlyArray<Readonly<{ name: string; upgrades: BossUpgradeLevels }>> = [
  { name: 'nothing bought', upgrades: { team: 0, damage: 0, rate: 0 } },
  { name: 'damage built', upgrades: { team: 0, damage: maxUpgradeLevel, rate: 0 } },
  { name: 'rate built', upgrades: { team: 0, damage: 0, rate: maxUpgradeLevel } },
  { name: 'fully built', upgrades: { team: maxUpgradeLevel, damage: maxUpgradeLevel, rate: maxUpgradeLevel } },
]

describe('boss plans', () => {
  it('keeps team firepower as the unchanged crowd-only measure', () => {
    expect(getTeamFirepower(BALANCE.crowd.max)).toBe(32)
    expect(getTeamFirepower(6)).toBe(6)
    expect(getTeamFirepower(12)).toBeCloseTo(12.48)
  })

  it('uses measured run stats across the complete 8,064-case fight-duration cross product', () => {
    let cases = 0
    for (const purchaseState of purchaseStates) {
      for (const level of levels) {
        for (const weapon of weaponKeys) {
          for (const teamSize of teamSizes) {
            for (const damage of damageValues) {
              for (const rate of rateValues) {
                const plan = getBossPlan(level, purchaseState.upgrades, teamSize, weapon, damage, rate)
                const expectedDps = getCombatFirepower(teamSize, weapon) * damage * rate
                const label = `${purchaseState.name}, L${level}, ${weapon}, team ${teamSize}, damage ${damage}, rate ${rate}`
                expect(plan.referenceDps, label).toBeCloseTo(expectedDps)
                const actualFightSec = plan.maxHp / plan.referenceDps
                // Rounding maxHp by at most 0.5 HP at the minimum 1.12 DPS (laser, team 2, damage/rate 1) deviates by 0.446 s, so allow 0.5 s.
                expect(actualFightSec, label).toBeGreaterThanOrEqual(BALANCE.boss.referenceFirepower.minFightSec - 0.5)
                expect(actualFightSec, label).toBeLessThanOrEqual(getMaxFightSec(level) + 0.5)
                expect(plan.referenceFightSec, label).toBeCloseTo(actualFightSec, 1)
                expect(plan.phaseThresholdHp, label).toBe(plan.maxHp / 2)
                cases += 1
              }
            }
          }
        }
      }
    }
    expect(cases).toBe(8064)
  })

  it('keeps Thomas’s level-one team-3 rocket run within its 18-second cap and below the old guessed HP', () => {
    const upgrades = purchaseStates[0].upgrades
    const actual = getBossPlan(1, upgrades, 3, 'rocket', 1, 1)
    const oldGuessedDps = getCombatFirepower(3, 'rocket') * BALANCE.upgradesShop.damage.base * BALANCE.upgradesShop.rate.base
    const oldGuessedFightSec = Math.min(
      BALANCE.boss.referenceFirepower.maxFightSecCap,
      BALANCE.boss.referenceFirepower.fightSecAtMaxTeam
        * (getTeamFirepower(BALANCE.crowd.max) / getTeamFirepower(3)) ** BALANCE.boss.referenceFirepower.teamDampening
        * (1 / getWeaponFirepower('rocket')) ** (1 - BALANCE.boss.referenceFirepower.weaponDampening),
    )
    const oldGuessedHp = Math.round(oldGuessedDps * oldGuessedFightSec)
    expect(actual.referenceFightSec).toBeLessThanOrEqual(getMaxFightSec(1) + 0.5)
    expect(actual.maxHp).toBeLessThan(oldGuessedHp)
  })

  it('keeps the specified dampening values and level-scaled pressure safety margin', () => {
    const reference = BALANCE.boss.referenceFirepower
    const anchorY = 844 - BALANCE.player.anchorBottomOffset
    const stopY = anchorY - BALANCE.boss.advanceStopBeforeAnchorPx
    const pressureContactSec = BALANCE.boss.pressureDelayMs / 1000 + (stopY - BALANCE.boss.battleY) / BALANCE.boss.advanceSpeed
    expect(reference.fightSecAtMaxTeam).toBe(20)
    expect(reference.minFightSec).toBe(15)
    expect(reference.maxFightSecAtLevelOne).toBe(18)
    expect(reference.maxFightSecPerLevel).toBe(2)
    expect(reference.maxFightSecCap).toBe(40)
    expect(reference.teamDampening).toBe(0.41)
    expect(reference.weaponDampening).toBe(0.8)
    expect(reference.statDampening).toBe(0.8)
    expect(BALANCE.boss.pressureDelayMs).toBe(36_000)
    expect(BALANCE.boss.advanceSpeed).toBe(34)
    expect(BALANCE.boss.battleY).toBe(300)
    expect(BALANCE.boss.advanceStopBeforeAnchorPx).toBe(80)
    expect(pressureContactSec).toBeCloseTo(45.8, 1)
    expect(getMaxFightSec(1)).toBe(18)
    expect(getMaxFightSec(12)).toBe(40)
    for (let level = 1; level <= 12; level += 1) {
      expect(getMaxFightSec(level)).toBeGreaterThanOrEqual(reference.minFightSec)
      expect(getMaxFightSec(level)).toBeLessThan(pressureContactSec)
    }
  })

  it('normalizes weapon firepower against the normal weapon', () => {
    expect(getWeaponFirepower('normal')).toBe(1)
    expect(getWeaponFirepower('shotgun')).toBe(4.2)
  })

  it('switches phase only below half HP and keeps phase two latched', () => {
    const plan = getBossPlan(6, purchaseStates[0].upgrades, 12, 'normal', 1, 3)
    expect(getBossPhase(plan.phaseThresholdHp, false, plan)).toBe(1)
    expect(getBossPhase(plan.phaseThresholdHp - 1, false, plan)).toBe(2)
    expect(getBossPhase(plan.maxHp, true, plan)).toBe(2)
  })

  it('makes phase two faster and visibly broader while respecting the companion cap', () => {
    const plan = getBossPlan(12, purchaseStates[0].upgrades, 12, 'normal', 1, 3)
    expect(plan.phaseTwo.fireIntervalMs).toBeLessThan(plan.phaseOne.fireIntervalMs)
    expect(plan.phaseTwo.burstCount).toBeGreaterThan(plan.phaseOne.burstCount)
    expect(plan.phaseTwo.moveSpeed).toBeGreaterThan(plan.phaseOne.moveSpeed)
    expect(canSpawnBossCompanion(plan.companionLimit - 1, plan.companionLimit)).toBe(true)
    expect(canSpawnBossCompanion(plan.companionLimit, plan.companionLimit)).toBe(false)
  })
})
