import { describe, expect, it } from 'vitest'
import { computeFormation } from '../src/systems/formation'

// Diese Fixtures wurden am 2026-09-19 aus computeFormation vor der E1-Aenderung
// erzeugt. 390 x 844 ist die iPhone-Referenzgroesse; maxDepth = 99 wie im Bestand.
const fixtures = {
  1: [{ offsetX: 0, offsetY: 0, row: 0 }],
  8: [{ offsetX: 0, offsetY: 0, row: 0 }, { offsetX: -12, offsetY: 14, row: 1 }, { offsetX: 12, offsetY: 14, row: 1 }, { offsetX: -24, offsetY: 28, row: 2 }, { offsetX: 0, offsetY: 28, row: 2 }, { offsetX: 24, offsetY: 28, row: 2 }, { offsetX: -12, offsetY: 42, row: 3 }, { offsetX: 12, offsetY: 42, row: 3 }],
  30: [{ offsetX: 0, offsetY: 0, row: 0 }, { offsetX: -12, offsetY: 14, row: 1 }, { offsetX: 12, offsetY: 14, row: 1 }, { offsetX: -24, offsetY: 28, row: 2 }, { offsetX: 0, offsetY: 28, row: 2 }, { offsetX: 24, offsetY: 28, row: 2 }, { offsetX: -36, offsetY: 42, row: 3 }, { offsetX: -12, offsetY: 42, row: 3 }, { offsetX: 12, offsetY: 42, row: 3 }, { offsetX: 36, offsetY: 42, row: 3 }, { offsetX: -39, offsetY: 56, row: 4 }, { offsetX: -19.5, offsetY: 56, row: 4 }, { offsetX: 0, offsetY: 56, row: 4 }, { offsetX: 19.5, offsetY: 56, row: 4 }, { offsetX: 39, offsetY: 56, row: 4 }, { offsetX: -39, offsetY: 70, row: 5 }, { offsetX: -23.4, offsetY: 70, row: 5 }, { offsetX: -7.8, offsetY: 70, row: 5 }, { offsetX: 7.8, offsetY: 70, row: 5 }, { offsetX: 23.4, offsetY: 70, row: 5 }, { offsetX: 39, offsetY: 70, row: 5 }, { offsetX: -39, offsetY: 84, row: 6 }, { offsetX: -26, offsetY: 84, row: 6 }, { offsetX: -13, offsetY: 84, row: 6 }, { offsetX: 0, offsetY: 84, row: 6 }, { offsetX: 13, offsetY: 84, row: 6 }, { offsetX: 26, offsetY: 84, row: 6 }, { offsetX: 39, offsetY: 84, row: 6 }, { offsetX: -12, offsetY: 98, row: 7 }, { offsetX: 12, offsetY: 98, row: 7 }],
} as const

const runOptions = { rowSpacingY: 14, colSpacing: 24, minColSpacing: 11, maxWidth: 78, maxDepth: 99 }

describe('Dreiecksformation vor E1', () => {
  for (const count of [1, 8, 30] as const) {
    it(`liefert fuer ${count} Figuren bitgleiche Slots`, () => {
      expect(computeFormation(count, runOptions)).toEqual(fixtures[count])
    })
  }
})
