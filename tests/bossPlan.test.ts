import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { canSpawnBossCompanion, getBossPhase, getBossPlan, getTeamFirepower, type BossUpgradeLevels } from '../src/systems/bossPlan'

function getReferenceStats(level: number, upgrades: BossUpgradeLevels): { damage: number; rate: number } {
  const reference = BALANCE.boss.referenceFirepower
  return {
    damage: Math.min(
      reference.damageCap,
      BALANCE.upgradesShop.damage.base + upgrades.damage * BALANCE.upgradesShop.damage.effectPerLevel + (level - 1) * reference.damagePerLevel,
    ),
    rate: Math.min(
      reference.rateCap,
      BALANCE.upgradesShop.rate.base + upgrades.rate * BALANCE.upgradesShop.rate.effectPerLevel + (level - 1) * reference.ratePerLevel,
    ),
  }
}

const teamSizes = [2, 4, 6, 8, 12, 16, 20, 25, 30]
const levels = [1, 6, 12]
const maxUpgradeLevel = BALANCE.upgradesShop.prices.length
const purchaseStates: ReadonlyArray<Readonly<{ name: string; upgrades: BossUpgradeLevels }>> = [
  { name: 'nothing bought', upgrades: { team: 0, damage: 0, rate: 0 } },
  { name: 'fully built', upgrades: { team: maxUpgradeLevel, damage: maxUpgradeLevel, rate: maxUpgradeLevel } },
]

describe('boss plans', () => {
  it('uses the actual team firepower exactly once', () => {
    expect(getTeamFirepower(BALANCE.crowd.max)).toBe(32)
    expect(getTeamFirepower(6)).toBe(6)
    expect(getTeamFirepower(12)).toBeCloseTo(12.48)
  })

  it('keeps every required team, level, and purchase state within the 20–40 second fight window', () => {
    for (const purchaseState of purchaseStates) {
      for (const level of levels) {
        for (const teamSize of teamSizes) {
          const plan = getBossPlan(level, purchaseState.upgrades, teamSize)
          const { damage, rate } = getReferenceStats(level, purchaseState.upgrades)
          const expectedDps = getTeamFirepower(teamSize) * damage * rate * BALANCE.weapon.normal.damageFactor * BALANCE.weapon.normal.bulletsPerShot

          expect(plan.referenceDps, `${purchaseState.name}, level ${level}, team ${teamSize}`).toBeCloseTo(expectedDps)
          expect(plan.referenceFightSec, `${purchaseState.name}, level ${level}, team ${teamSize}`).toBeGreaterThanOrEqual(20)
          expect(plan.referenceFightSec, `${purchaseState.name}, level ${level}, team ${teamSize}`).toBeLessThanOrEqual(40)
          expect(plan.phaseThresholdHp).toBe(plan.maxHp / 2)
        }
      }
    }
  })

  it('makes a larger team finish monotonically faster', () => {
    for (const purchaseState of purchaseStates) {
      for (const level of levels) {
        let previousFightSec = Number.POSITIVE_INFINITY
        for (const teamSize of teamSizes) {
          const fightSec = getBossPlan(level, purchaseState.upgrades, teamSize).referenceFightSec
          expect(fightSec, `${purchaseState.name}, level ${level}, team ${teamSize}`).toBeLessThanOrEqual(previousFightSec)
          previousFightSec = fightSec
        }
      }
    }
  })

  it('keeps fight time team-dependent rather than level-dependent while HP grows with level', () => {
    for (const purchaseState of purchaseStates) {
      for (const teamSize of teamSizes) {
        const levelOne = getBossPlan(1, purchaseState.upgrades, teamSize)
        const levelTwelve = getBossPlan(12, purchaseState.upgrades, teamSize)
        expect(levelOne.referenceFightSec, `${purchaseState.name}, team ${teamSize}`).toBeCloseTo(levelTwelve.referenceFightSec, 1)
        expect(levelTwelve.maxHp, `${purchaseState.name}, team ${teamSize}`).toBeGreaterThan(levelOne.maxHp)
      }
    }
  })

  it('uses only the damped actual-team duration settings', () => {
    const reference = BALANCE.boss.referenceFirepower
    expect(Object.keys(reference).sort()).toEqual([
      'damageCap', 'damagePerLevel', 'fightSecAtMaxTeam', 'maxFightSec',
      'rateCap', 'ratePerLevel', 'teamDampening',
    ])
    expect(reference.fightSecAtMaxTeam).toBe(20)
    expect(reference.maxFightSec).toBe(40)
    expect(reference.teamDampening).toBe(0.41)
  })

  it('switches phase only below half HP and keeps phase two latched', () => {
    const plan = getBossPlan(6, purchaseStates[0].upgrades, 12)
    expect(getBossPhase(plan.phaseThresholdHp, false, plan)).toBe(1)
    expect(getBossPhase(plan.phaseThresholdHp - 1, false, plan)).toBe(2)
    expect(getBossPhase(plan.maxHp, true, plan)).toBe(2)
  })

  it('makes phase two faster and visibly broader while respecting the companion cap', () => {
    const plan = getBossPlan(12, purchaseStates[0].upgrades, 12)
    expect(plan.phaseTwo.fireIntervalMs).toBeLessThan(plan.phaseOne.fireIntervalMs)
    expect(plan.phaseTwo.burstCount).toBeGreaterThan(plan.phaseOne.burstCount)
    expect(plan.phaseTwo.moveSpeed).toBeGreaterThan(plan.phaseOne.moveSpeed)
    expect(canSpawnBossCompanion(plan.companionLimit - 1, plan.companionLimit)).toBe(true)
    expect(canSpawnBossCompanion(plan.companionLimit, plan.companionLimit)).toBe(false)
  })
})
