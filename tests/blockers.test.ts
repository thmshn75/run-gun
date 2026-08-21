import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { computeBlockerPlacement } from '../src/systems/blockerPlacement'
import { getBlockerIntervalMs, getBlockerPlan } from '../src/systems/blockerPlan'
import { getCombatFirepower } from '../src/systems/bossPlan'
import { getLevelPlan } from '../src/systems/levelPlan'
import type { WeaponKey } from '../src/systems/weapons'

const weaponKeys: readonly WeaponKey[] = ['normal', 'shotgun', 'laser', 'rocket', 'minigun', 'flamethrower', 'chainlightning']

function seededRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
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

  it('uses measured run stats for 1.5–2.5 second kills across the full cross product', () => {
    let cases = 0
    for (const level of [1, 6, 12]) {
      for (const purchaseState of [
        { damage: 0, rate: 0 },
        { damage: BALANCE.upgradesShop.prices.length, rate: 0 },
        { damage: 0, rate: BALANCE.upgradesShop.prices.length },
        { damage: BALANCE.upgradesShop.prices.length, rate: BALANCE.upgradesShop.prices.length },
      ]) {
        for (const weapon of weaponKeys) {
          for (const teamSize of [2, 3, 6, 12, 20, 30]) {
            for (const damage of [1, 3, 10, 20]) {
              for (const rate of [1, 1.5, 3, 8]) {
                const plan = getBlockerPlan(teamSize, weapon, damage, rate)
                const dps = getCombatFirepower(teamSize, weapon) * damage * rate
                expect(plan.referenceDps, `L${level}, damage upgrade ${purchaseState.damage}, rate upgrade ${purchaseState.rate}`).toBeCloseTo(dps)
                expect(plan.referenceDestroySec).toBeGreaterThanOrEqual(BALANCE.blockers.minDestroySec)
                expect(plan.referenceDestroySec).toBeLessThanOrEqual(BALANCE.blockers.maxDestroySec)
                cases += 1
              }
            }
          }
        }
      }
    }
    expect(cases).toBe(8064)
  })

  it('only assigns blocker cadence to the level-table entries that reserve blockers', () => {
    for (let level = 1; level <= BALANCE.level.plans.length; level += 1) {
      const plan = getLevelPlan(level)
      expect(getBlockerIntervalMs(plan.designLevel) > 0).toBe(plan.reserved.blockers)
    }
  })
})
