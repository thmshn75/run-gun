import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { canSpawnBossCompanion, getBossPhase, getBossPlan, type BossUpgradeLevels } from '../src/systems/bossPlan'
import { getCrowdDamageMultiplier } from '../src/systems/crowdDamage'

function normalDps(teamSize: number, damage: number, rate: number): number {
  const activeShooters = Math.min(teamSize, BALANCE.crowd.shootersPerSalvo)
  return activeShooters
    * damage
    * rate
    * getCrowdDamageMultiplier(teamSize)
    * BALANCE.weapon.normal.damageFactor
    * BALANCE.weapon.normal.bulletsPerShot
}

function fightDurationSec(maxHp: number, teamSize: number, damage: number, rate: number): number {
  return maxHp / normalDps(teamSize, damage, rate)
}

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

const levels = [1, 6, 12, 30]
const maxUpgradeLevel = BALANCE.upgradesShop.prices.length
const purchaseStates: ReadonlyArray<Readonly<{ name: string; upgrades: BossUpgradeLevels }>> = [
  { name: 'nothing bought', upgrades: { team: 0, damage: 0, rate: 0 } },
  { name: 'half built', upgrades: { team: Math.floor(maxUpgradeLevel / 2), damage: Math.floor(maxUpgradeLevel / 2), rate: Math.floor(maxUpgradeLevel / 2) } },
  { name: 'fully built', upgrades: { team: maxUpgradeLevel, damage: maxUpgradeLevel, rate: maxUpgradeLevel } },
]

describe('boss plans', () => {
  it('keeps every purchase-state/level combination between 18 and 24 seconds without hitting the HP cap', () => {
    for (const purchaseState of purchaseStates) {
      for (const level of levels) {
        const plan = getBossPlan(level, purchaseState.upgrades)
        const { damage, rate } = getReferenceStats(level, purchaseState.upgrades)

        // This must stay coupled to upgradesShop: menu upgrades still dominate normal
        // enemies and squads, while a boss scales to the same purchased firepower.
        expect(plan.level, purchaseState.name).toBe(level)
        expect(plan.referenceDps, purchaseState.name).toBeCloseTo(normalDps(BALANCE.boss.referenceFirepower.teamAtBoss, damage, rate))
        expect(fightDurationSec(plan.maxHp, BALANCE.boss.referenceFirepower.teamAtBoss, damage, rate), purchaseState.name).toBeGreaterThanOrEqual(18)
        expect(fightDurationSec(plan.maxHp, BALANCE.boss.referenceFirepower.teamAtBoss, damage, rate), purchaseState.name).toBeLessThanOrEqual(24)
        expect(plan.maxHp, purchaseState.name).toBeLessThan(BALANCE.boss.hpCap)
        expect(plan.phaseThresholdHp, purchaseState.name).toBe(plan.maxHp / 2)
      }
    }
  })

  it('switches phase only below half HP and keeps phase two latched', () => {
    const plan = getBossPlan(6, purchaseStates[0].upgrades)
    expect(getBossPhase(plan.phaseThresholdHp, false, plan)).toBe(1)
    expect(getBossPhase(plan.phaseThresholdHp - 1, false, plan)).toBe(2)
    expect(getBossPhase(plan.maxHp, true, plan)).toBe(2)
  })

  it('makes phase two faster and visibly broader while respecting the companion cap', () => {
    const plan = getBossPlan(12, purchaseStates[0].upgrades)
    expect(plan.phaseTwo.fireIntervalMs).toBeLessThan(plan.phaseOne.fireIntervalMs)
    expect(plan.phaseTwo.burstCount).toBeGreaterThan(plan.phaseOne.burstCount)
    expect(plan.phaseTwo.moveSpeed).toBeGreaterThan(plan.phaseOne.moveSpeed)
    expect(canSpawnBossCompanion(plan.companionLimit - 1, plan)).toBe(true)
    expect(canSpawnBossCompanion(plan.companionLimit, plan)).toBe(false)
  })
})
