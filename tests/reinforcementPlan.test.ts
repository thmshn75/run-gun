import { describe, expect, it } from 'vitest'
import { decideGoodie, getReinforcementOffer } from '../src/systems/reinforcementPlan'

function seededRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

describe('reinforcement offers (W4: linke Dauerwand)', () => {
  it('scales the additive offer with the current team, so the same spot differs by state', () => {
    const small = getReinforcementOffer(3, () => 0)
    const large = getReinforcementOffer(20, () => 0)
    expect(small.label).toBe('+2')
    expect(large.label).toBe('+7')
    expect(small.apply(3)).toBe(5)
    expect(large.apply(20)).toBe(27)
  })

  it('keeps the shown operator true when applied to a later, different team size', () => {
    // Der Operator wird beim Spawn gezogen, aber auf den Stand bei der Einloesung
    // angewandt — die Anzeige veraltet nie (W4-Haertungsbefund).
    const offer = getReinforcementOffer(10, () => 0.4)
    expect(offer.label).toBe('×1.3')
    expect(offer.apply(4)).toBe(5)
    expect(offer.apply(20)).toBe(26)
  })

  it('never offers a reduction: every offer strictly grows a positive team', () => {
    const rng = seededRng(0x4711)
    for (let index = 0; index < 200; index += 1) {
      const team = 1 + Math.floor(rng() * 29)
      const offer = getReinforcementOffer(team, rng)
      expect(offer.apply(team)).toBeGreaterThan(team)
    }
  })

  it('guarantees a goodie after maxDry misses and never fires with zero chance before', () => {
    expect(decideGoodie(0, 0, 16, () => 0.99)).toBe(false)
    expect(decideGoodie(15, 0, 16, () => 0.99)).toBe(false)
    expect(decideGoodie(16, 0, 16, () => 0.99)).toBe(true)
    expect(decideGoodie(0, 1, 16, () => 0.5)).toBe(true)
  })
})
