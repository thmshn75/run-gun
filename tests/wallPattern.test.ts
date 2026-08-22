import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { isWallSlot } from '../src/systems/wallPattern'

describe('wall pattern (W4-Korrektur: Abschnitte mit Luecken)', () => {
  it('produces runLength wall slots followed by gapSlots empty slots, repeating', () => {
    const run = BALANCE.walls.wallRunLength
    const gap = BALANCE.walls.wallGapSlots
    for (let cycleStart = 0; cycleStart < (run + gap) * 3; cycleStart += run + gap) {
      for (let offset = 0; offset < run; offset += 1) expect(isWallSlot(cycleStart + offset, run, gap)).toBe(true)
      for (let offset = run; offset < run + gap; offset += 1) expect(isWallSlot(cycleStart + offset, run, gap)).toBe(false)
    }
  })

  it('offsets the right side so both gaps are never aligned', () => {
    const run = BALANCE.walls.wallRunLength
    const gap = BALANCE.walls.wallGapSlots
    const offset = BALANCE.walls.wallRightOffsetSlots
    // In keinem Slot sind BEIDE Seiten gleichzeitig Luecke — sonst gaebe es Momente
    // ohne jedes Seitenziel und die Ausweichbuchten laegen uninteressant symmetrisch.
    let bothGapSlots = 0
    for (let slot = 0; slot < (run + gap) * 10; slot += 1) {
      if (!isWallSlot(slot, run, gap) && !isWallSlot(slot + offset, run, gap)) bothGapSlots += 1
    }
    expect(bothGapSlots).toBe(0)
  })
})
