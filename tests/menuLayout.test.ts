import { describe, expect, it } from 'vitest'
import { computeMenuLayout, type VerticalBounds } from '../src/systems/menuLayout'
import type { SafeAreaInsets } from '../src/systems/safeArea'

const MENU_HEIGHT = 844

function allBounds(layout: ReturnType<typeof computeMenuLayout>): VerticalBounds[] {
  return [layout.title, layout.balance, layout.scoresTitle, ...layout.scoreLines, layout.resetButton, layout.playButton]
}

function expectSafeAndSeparate(insets: SafeAreaInsets): void {
  const layout = computeMenuLayout(MENU_HEIGHT, insets, 5)
  const bounds = allBounds(layout)
  const safeBottom = MENU_HEIGHT - insets.bottom
  for (const item of bounds) {
    expect(item.top).toBeGreaterThanOrEqual(insets.top)
    expect(item.top + item.height).toBeLessThanOrEqual(safeBottom)
  }
  for (let index = 0; index < bounds.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < bounds.length; otherIndex += 1) {
      const first = bounds[index]
      const second = bounds[otherIndex]
      expect(first.top + first.height <= second.top || second.top + second.height <= first.top).toBe(true)
    }
  }
}

describe('menu layout', () => {
  it('keeps the full menu inside and separate without safe-area insets', () => {
    expectSafeAndSeparate({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  it('keeps the full menu inside and separate on an iPhone safe area', () => {
    expectSafeAndSeparate({ top: 47, right: 0, bottom: 34, left: 0 })
  })
})
