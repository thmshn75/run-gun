import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { computeBlockerPlacement } from '../src/systems/blockerPlacement'
import { getBlockerIntervalMs, getBlockerPlan } from '../src/systems/blockerPlan'
import { getTeamFirepower } from '../src/systems/bossPlan'
import { getLevelPlan } from '../src/systems/levelPlan'

function seededRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

function referenceDps(level: number, upgrades: { team: number; damage: number; rate: number }, teamSize: number): number {
  const reference = BALANCE.boss.referenceFirepower
  const damage = Math.min(reference.damageCap, BALANCE.upgradesShop.damage.base + upgrades.damage * BALANCE.upgradesShop.damage.effectPerLevel + (level - 1) * reference.damagePerLevel)
  const rate = Math.min(reference.rateCap, BALANCE.upgradesShop.rate.base + upgrades.rate * BALANCE.upgradesShop.rate.effectPerLevel + (level - 1) * reference.ratePerLevel)
  return getTeamFirepower(teamSize) * damage * rate * BALANCE.weapon.normal.damageFactor * BALANCE.weapon.normal.bulletsPerShot
}

describe('blockers', () => {
  it('always leaves a full crowd hull plus margin inside the road over 500 placements', () => {
    const minGapPx = BALANCE.crowd.hullWidthFigures * BALANCE.blockers.figureWidthPx + BALANCE.blockers.passageMarginPx
    const rng = seededRng(0xE9)
    for (let index = 0; index < 500; index += 1) {
      const roadHalfWidth = 90 + rng() * 190
      const placement = computeBlockerPlacement(roadHalfWidth, minGapPx, rng)
      expect(placement.passageWidth).toBeGreaterThanOrEqual(minGapPx)
      expect(placement.centerOffset - placement.width / 2).toBeGreaterThanOrEqual(-roadHalfWidth)
      expect(placement.centerOffset + placement.width / 2).toBeLessThanOrEqual(roadHalfWidth)
    }
  })

  it('uses actual spawn-time team firepower for 1.5–2.5 second kills', () => {
    const full = BALANCE.upgradesShop.prices.length
    const purchaseStates = [{ team: 0, damage: 0, rate: 0 }, { team: full, damage: full, rate: full }]
    for (const level of [1, 6, 12]) {
      for (const upgrades of purchaseStates) {
        for (const teamSize of [2, 4, 6, 8, 12, 16, 20, 25, 30]) {
          const plan = getBlockerPlan(level, upgrades, teamSize)
          const dps = referenceDps(level, upgrades, teamSize)
          const destroySec = plan.maxHp / dps
          expect(plan.referenceDps).toBeCloseTo(dps)
          expect(destroySec).toBeGreaterThanOrEqual(BALANCE.blockers.minDestroySec)
          expect(destroySec).toBeLessThanOrEqual(BALANCE.blockers.maxDestroySec)
        }
      }
    }
  })

  it('only assigns blocker cadence to the level-table entries that reserve blockers', () => {
    for (let level = 1; level <= BALANCE.level.plans.length; level += 1) {
      const plan = getLevelPlan(level)
      expect(getBlockerIntervalMs(plan.designLevel) > 0).toBe(plan.reserved.blockers)
    }
  })
})
