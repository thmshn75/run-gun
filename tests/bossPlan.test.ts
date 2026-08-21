import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { canSpawnBossCompanion, getBossPhase, getBossPlan } from '../src/systems/bossPlan'
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

describe('boss plans', () => {
  it('provides capped, level-specific plans for representative and repeated levels', () => {
    for (const level of [1, 6, 12, 30]) {
      const plan = getBossPlan(level)
      expect(plan.level).toBe(level)
      expect(plan.maxHp).toBeLessThanOrEqual(BALANCE.boss.hpCap)
      expect(plan.phaseThresholdHp).toBe(plan.maxHp / 2)
      expect(plan.companionIntervalMs).toBe(BALANCE.boss.companionIntervalMs)
      expect(plan.pressureDelayMs).toBe(BALANCE.boss.pressureDelayMs)
      expect(plan.referenceFightSec).toBeGreaterThanOrEqual(20)
      expect(plan.referenceFightSec).toBeLessThanOrEqual(40)
    }
  })

  it('keeps the reference fight time in range and HP capped at every tested level', () => {
    for (let level = 1; level <= 400; level += 1) {
      const plan = getBossPlan(level)
      expect(plan.maxHp).toBeLessThanOrEqual(BALANCE.boss.hpCap)
      expect(plan.referenceFightSec).toBeGreaterThanOrEqual(20)
      expect(plan.referenceFightSec).toBeLessThanOrEqual(40)
    }
  })

  it('models the shared multiplier and leaves weak and strong teams in playable ranges', () => {
    for (let level = 1; level <= 400; level += 1) {
      const plan = getBossPlan(level)
      const reference = BALANCE.boss.referenceFirepower
      const damage = Math.min(reference.damageCap, reference.damageStart + (level - 1) * reference.damagePerLevel)
      const rate = Math.min(reference.rateCap, reference.rateStart + (level - 1) * reference.ratePerLevel)

      // This assertion derives boss DPS through the same pure function used by GameScene.
      expect(plan.referenceDps).toBeCloseTo(normalDps(reference.teamAtBoss, damage, rate))

      const weakFightSec = fightDurationSec(plan.maxHp, BALANCE.crowd.shootersPerSalvo, damage, rate)
      const strongFightSec = fightDurationSec(plan.maxHp, BALANCE.crowd.max, damage, rate)
      // A weak eight-figure team can trigger the 36s advance, while a max team must not melt the boss below 10s.
      expect(weakFightSec).toBeGreaterThanOrEqual(45)
      expect(weakFightSec).toBeLessThanOrEqual(75)
      expect(strongFightSec).toBeGreaterThanOrEqual(10)
      expect(strongFightSec).toBeLessThanOrEqual(20)
    }
  })

  it('switches phase only below half HP and keeps phase two latched', () => {
    const plan = getBossPlan(6)
    expect(getBossPhase(plan.phaseThresholdHp, false, plan)).toBe(1)
    expect(getBossPhase(plan.phaseThresholdHp - 1, false, plan)).toBe(2)
    expect(getBossPhase(plan.maxHp, true, plan)).toBe(2)
  })

  it('makes phase two faster and visibly broader while respecting the companion cap', () => {
    const plan = getBossPlan(12)
    expect(plan.phaseTwo.fireIntervalMs).toBeLessThan(plan.phaseOne.fireIntervalMs)
    expect(plan.phaseTwo.burstCount).toBeGreaterThan(plan.phaseOne.burstCount)
    expect(plan.phaseTwo.moveSpeed).toBeGreaterThan(plan.phaseOne.moveSpeed)
    expect(canSpawnBossCompanion(plan.companionLimit - 1, plan)).toBe(true)
    expect(canSpawnBossCompanion(plan.companionLimit, plan)).toBe(false)
  })
})
