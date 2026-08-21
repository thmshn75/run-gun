import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'

describe('upgrade shop balance', () => {
  it('keeps the deliberately expensive, steep price curve', () => {
    const prices = BALANCE.upgradesShop.prices
    const totalForAllThreeRows = prices.reduce((total, price) => total + price, 0) * 3

    expect(totalForAllThreeRows).toBeGreaterThanOrEqual(20_000)
    expect(totalForAllThreeRows).toBeLessThanOrEqual(25_000)
    expect(prices[0]).toBeGreaterThanOrEqual(150)
    for (let index = 1; index < prices.length; index += 1) {
      expect(prices[index]).toBeGreaterThan(prices[index - 1] * 2)
    }
  })

  it('does not change upgrade effects or their bounds', () => {
    expect(BALANCE.upgradesShop.team).toMatchObject({ base: 2, max: 7, effectPerLevel: 1 })
    expect(BALANCE.upgradesShop.damage).toMatchObject({ base: 1, max: 3.5, effectPerLevel: 0.5 })
    expect(BALANCE.upgradesShop.rate).toMatchObject({ base: 3, max: 4.5, effectPerLevel: 0.3 })
  })
})
