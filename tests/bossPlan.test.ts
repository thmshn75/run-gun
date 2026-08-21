import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import {
  canSpawnBossCompanion,
  getBossPhase,
  getBossPlan,
  getCombatFirepower,
  getTeamFirepower,
  getWeaponFirepower,
  type BossUpgradeLevels,
} from '../src/systems/bossPlan'

const weaponKeys = ['normal', 'shotgun', 'laser', 'rocket', 'minigun', 'flamethrower', 'chainlightning'] as const

function getReferenceStats(level: number, upgrades: BossUpgradeLevels): { damage: number; rate: number } {
  const reference = BALANCE.boss.referenceFirepower
  return {
    damage: Math.min(reference.damageCap, BALANCE.upgradesShop.damage.base + upgrades.damage * BALANCE.upgradesShop.damage.effectPerLevel + (level - 1) * reference.damagePerLevel),
    rate: Math.min(reference.rateCap, BALANCE.upgradesShop.rate.base + upgrades.rate * BALANCE.upgradesShop.rate.effectPerLevel + (level - 1) * reference.ratePerLevel),
  }
}

const teamSizes = [2, 4, 6, 8, 12, 20, 30]
const levels = [1, 6, 12]
const maxUpgradeLevel = BALANCE.upgradesShop.prices.length
const purchaseStates: ReadonlyArray<Readonly<{ name: string; upgrades: BossUpgradeLevels }>> = [
  { name: 'nothing bought', upgrades: { team: 0, damage: 0, rate: 0 } },
  { name: 'fully built', upgrades: { team: maxUpgradeLevel, damage: maxUpgradeLevel, rate: maxUpgradeLevel } },
]

describe('boss plans', () => {
  it('keeps team firepower as the unchanged crowd-only measure', () => {
    expect(getTeamFirepower(BALANCE.crowd.max)).toBe(32)
    expect(getTeamFirepower(6)).toBe(6)
    expect(getTeamFirepower(12)).toBeCloseTo(12.48)
  })

  it('uses actual weapon and team output for every boss combination in the 15–40 second window', () => {
    for (const purchaseState of purchaseStates) {
      for (const level of levels) {
        for (const weapon of weaponKeys) {
          for (const teamSize of teamSizes) {
            const plan = getBossPlan(level, purchaseState.upgrades, teamSize, weapon)
            const { damage, rate } = getReferenceStats(level, purchaseState.upgrades)
            const expectedDps = getCombatFirepower(teamSize, weapon) * damage * rate

            expect(plan.referenceDps, `${purchaseState.name}, level ${level}, ${weapon}, team ${teamSize}`).toBeCloseTo(expectedDps)
            expect(plan.referenceFightSec, `${purchaseState.name}, level ${level}, ${weapon}, team ${teamSize}`).toBeGreaterThanOrEqual(15)
            expect(plan.referenceFightSec, `${purchaseState.name}, level ${level}, ${weapon}, team ${teamSize}`).toBeLessThanOrEqual(40)
            expect(plan.phaseThresholdHp).toBe(plan.maxHp / 2)
          }
        }
      }
    }
  })

  it('keeps every fight below the cap and the cap below boss pressure contact', () => {
    const reference = BALANCE.boss.referenceFirepower
    const anchorY = 844 - BALANCE.player.anchorBottomOffset
    const pressureContactSec = BALANCE.boss.pressureDelayMs / 1000 + (anchorY - BALANCE.boss.battleY) / BALANCE.boss.advanceSpeed
    expect(reference.maxFightSec).toBeLessThan(pressureContactSec)

    for (const purchaseState of purchaseStates) {
      for (const level of levels) {
        for (const weapon of weaponKeys) {
          for (const teamSize of teamSizes) {
            expect(getBossPlan(level, purchaseState.upgrades, teamSize, weapon).referenceFightSec).toBeLessThanOrEqual(reference.maxFightSec)
          }
        }
      }
    }
  })

  it('makes stronger weapons and larger teams finish monotonically faster', () => {
    const weaponsByFirepower = [...weaponKeys].sort((left, right) => getWeaponFirepower(left) - getWeaponFirepower(right))
    for (const purchaseState of purchaseStates) {
      for (const level of levels) {
        for (const teamSize of teamSizes) {
          let previousFightSec = Number.POSITIVE_INFINITY
          for (const weapon of weaponsByFirepower) {
            const fightSec = getBossPlan(level, purchaseState.upgrades, teamSize, weapon).referenceFightSec
            expect(fightSec, `${purchaseState.name}, level ${level}, team ${teamSize}, ${weapon}`).toBeLessThanOrEqual(previousFightSec)
            previousFightSec = fightSec
          }
        }
        for (const weapon of weaponKeys) {
          let previousFightSec = Number.POSITIVE_INFINITY
          for (const teamSize of teamSizes) {
            const fightSec = getBossPlan(level, purchaseState.upgrades, teamSize, weapon).referenceFightSec
            expect(fightSec, `${purchaseState.name}, level ${level}, ${weapon}, team ${teamSize}`).toBeLessThanOrEqual(previousFightSec)
            previousFightSec = fightSec
          }
        }
      }
    }
  })

  it('normalizes weapon firepower against the normal weapon', () => {
    expect(getWeaponFirepower('normal')).toBe(1)
    expect(getWeaponFirepower('shotgun')).toBe(4.2)
  })

  it('keeps the specified separate dampening values', () => {
    const reference = BALANCE.boss.referenceFirepower
    expect(reference.fightSecAtMaxTeam).toBe(20)
    expect(reference.maxFightSec).toBe(40)
    expect(reference.teamDampening).toBe(0.41)
    expect(reference.weaponDampening).toBe(0.8)
  })

  it('switches phase only below half HP and keeps phase two latched', () => {
    const plan = getBossPlan(6, purchaseStates[0].upgrades, 12, 'normal')
    expect(getBossPhase(plan.phaseThresholdHp, false, plan)).toBe(1)
    expect(getBossPhase(plan.phaseThresholdHp - 1, false, plan)).toBe(2)
    expect(getBossPhase(plan.maxHp, true, plan)).toBe(2)
  })

  it('makes phase two faster and visibly broader while respecting the companion cap', () => {
    const plan = getBossPlan(12, purchaseStates[0].upgrades, 12, 'normal')
    expect(plan.phaseTwo.fireIntervalMs).toBeLessThan(plan.phaseOne.fireIntervalMs)
    expect(plan.phaseTwo.burstCount).toBeGreaterThan(plan.phaseOne.burstCount)
    expect(plan.phaseTwo.moveSpeed).toBeGreaterThan(plan.phaseOne.moveSpeed)
    expect(canSpawnBossCompanion(plan.companionLimit - 1, plan.companionLimit)).toBe(true)
    expect(canSpawnBossCompanion(plan.companionLimit, plan.companionLimit)).toBe(false)
  })
})
