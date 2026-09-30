import { describe, expect, it } from 'vitest'
import { computeTitleLayout } from '../src/systems/titleLayout'
import type { SafeAreaInsets } from '../src/systems/safeArea'

function expectSafeAndSeparate(height: number, insets: SafeAreaInsets): void {
  const layout = computeTitleLayout(height, insets)
  const safeBottom = height - insets.bottom
  for (const item of [layout.title, layout.standardButton, layout.threeDButton]) {
    expect(item.top).toBeGreaterThanOrEqual(insets.top)
    expect(item.top + item.height).toBeLessThanOrEqual(safeBottom)
  }
  expect(layout.standardButton.height).toBeGreaterThanOrEqual(56)
  expect(layout.threeDButton.height).toBe(layout.standardButton.height)
  expect(layout.title.top + layout.title.height).toBeLessThanOrEqual(layout.standardButton.top)
  expect(layout.standardButton.top + layout.standardButton.height).toBeLessThanOrEqual(layout.threeDButton.top)
}

describe('title layout', () => {
  it('haelt Titel und beide gleichwertigen Knoepfe bei 390×844 und 375×667 getrennt', () => {
    for (const height of [844, 667]) {
      expectSafeAndSeparate(height, { top: 0, right: 0, bottom: 0, left: 0 })
      expectSafeAndSeparate(height, { top: 47, right: 0, bottom: 34, left: 0 })
      expectSafeAndSeparate(height, { top: 59, right: 0, bottom: 34, left: 0 })
    }
  })
})
