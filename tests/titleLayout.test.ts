import { describe, expect, it } from 'vitest'
import { computeTitleLayout } from '../src/systems/titleLayout'
import type { SafeAreaInsets } from '../src/systems/safeArea'

const TITLE_HEIGHT = 844

function expectSafeAndSeparate(insets: SafeAreaInsets): void {
  const layout = computeTitleLayout(TITLE_HEIGHT, insets)
  const safeBottom = TITLE_HEIGHT - insets.bottom
  for (const item of [layout.title, layout.startButton]) {
    expect(item.top).toBeGreaterThanOrEqual(insets.top)
    expect(item.top + item.height).toBeLessThanOrEqual(safeBottom)
  }
  expect(layout.title.top + layout.title.height).toBeLessThanOrEqual(layout.startButton.top)
}

describe('title layout', () => {
  it('keeps title and start button safe and separate without safe-area insets', () => {
    expectSafeAndSeparate({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  it('keeps title and start button safe and separate on an iPhone safe area', () => {
    expectSafeAndSeparate({ top: 47, right: 0, bottom: 34, left: 0 })
  })
})
