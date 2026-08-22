import { describe, expect, it } from 'vitest'
import { decideGoodie } from '../src/systems/reinforcementPlan'

describe('Goodie-Garantie der rechten Wand', () => {
  // Die Verstaerkungs-Angebote der linken Wand sind am 2026-08-22 entfallen: Links
  // ist seither eine Sammelbahn aus gleichen +1-Plaettchen zum Durchfahren.
  it('guarantees a goodie after maxDry misses and never fires with zero chance before', () => {
    expect(decideGoodie(0, 0, 16, () => 0.99)).toBe(false)
    expect(decideGoodie(15, 0, 16, () => 0.99)).toBe(false)
    expect(decideGoodie(16, 0, 16, () => 0.99)).toBe(true)
    expect(decideGoodie(0, 1, 16, () => 0.5)).toBe(true)
  })
})
