import { describe, expect, it } from 'vitest'
import { BALANCE, type SquadKind } from '../src/config/balance'
import { getLevelPlan } from '../src/systems/levelPlan'
import { getPlayfieldHalfWidth } from '../src/systems/roadGeometry'
import { chooseSpawnLane } from '../src/systems/spawnLanes'
import { computeHordeOffsets, computeSquadOffsets, getSquadWidth } from '../src/systems/squads'

const PHONE_WIDTH = 390
const HORIZON_ROAD_WIDTH = PHONE_WIDTH * BALANCE.road.topWidthRatio
const WIDEST_ENEMY = Math.max(...BALANCE.enemy.types.map((type) => type.bodyWidth))
const TALLEST_ENEMY = Math.max(...BALANCE.enemy.types.map((type) => type.bodyHeight))

function expectNonOverlappingAndInsideRoad(kind: SquadKind, size: number): void {
  const offsets = computeSquadOffsets(kind, size, BALANCE.level.squads.spacingPx, BALANCE.level.squads.rowSpacingPx)
  expect(offsets).toHaveLength(size)

  for (const offset of offsets) {
    expect(Math.abs(offset.laneOffset) + WIDEST_ENEMY / 2).toBeLessThanOrEqual(HORIZON_ROAD_WIDTH / 2)
  }
  for (let index = 0; index < offsets.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < offsets.length; otherIndex += 1) {
      const horizontalOverlap = Math.abs(offsets[index].laneOffset - offsets[otherIndex].laneOffset) < WIDEST_ENEMY
      const verticalOverlap = Math.abs(offsets[index].yOffset - offsets[otherIndex].yOffset) < TALLEST_ENEMY
      expect(horizontalOverlap && verticalOverlap).toBe(false)
    }
  }
}

describe('squad geometry', () => {
  it('keeps every squad size reachable through level 500 separate and on the horizon road', () => {
    const reachableSquads = new Map<string, { kind: SquadKind, size: number }>()

    for (let level = 1; level <= 500; level += 1) {
      for (const squad of getLevelPlan(level).squads) {
        reachableSquads.set(`${squad.kind}:${squad.size}`, squad)
      }
    }

    expect(reachableSquads.size).toBeGreaterThan(0)
    for (const { kind, size } of reachableSquads.values()) {
      expectNonOverlappingAndInsideRoad(kind, size)
    }
  })

  it('puts a wedge point in front and makes its rear row wider', () => {
    const wedge = computeSquadOffsets('wedge', 6, BALANCE.level.squads.spacingPx, BALANCE.level.squads.rowSpacingPx)
    expect(wedge[0].yOffset).toBeGreaterThan(wedge[1].yOffset)
    expect(wedge.filter((offset) => offset.yOffset === wedge[wedge.length - 1].yOffset)).toHaveLength(3)
  })
})

describe('horde density rule and centering (W3)', () => {
  const spacing = BALANCE.level.squads.spacingPx
  const rowSpacing = BALANCE.level.squads.rowSpacingPx

  it('squeezes spacing instead of shrinking when a light wedge exceeds the width cap', () => {
    const light = BALANCE.enemy.types.find((type) => type.key === 'light')!
    const layout = computeHordeOffsets('wedge', 8, spacing, rowSpacing, light.bodyWidth, 92)
    expect(layout.size).toBe(8)
    expect(layout.spacing).toBeLessThan(spacing)
    expect(layout.spacing).toBeGreaterThanOrEqual(light.bodyWidth + 4)
    expect(getSquadWidth(layout.offsets, light.bodyWidth)).toBeLessThanOrEqual(92 + 1e-9)
  })

  it('keeps squeezed formations overlap-free within a row', () => {
    const light = BALANCE.enemy.types.find((type) => type.key === 'light')!
    const layout = computeHordeOffsets('row', 4, spacing, rowSpacing, light.bodyWidth, 92)
    const sameRow = layout.offsets.filter((offset) => offset.yOffset === layout.offsets[0].yOffset)
    for (let index = 1; index < sameRow.length; index += 1) {
      expect(Math.abs(sameRow[index].laneOffset - sameRow[index - 1].laneOffset)).toBeGreaterThanOrEqual(light.bodyWidth)
    }
  })

  it('only shrinks when even the densest formation stays too wide', () => {
    const heavy = BALANCE.enemy.types.find((type) => type.key === 'heavy')!
    const layout = computeHordeOffsets('row', 4, spacing, rowSpacing, heavy.bodyWidth, 92)
    expect(layout.size).toBeLessThan(4)
    expect(getSquadWidth(layout.offsets, heavy.bodyWidth)).toBeLessThanOrEqual(92 + 1e-9)
  })

  it('caps every reachable horde at the derived bottom width so the budget holds', () => {
    // Deckel oben = hordeMax x (playfieldTop / playfieldBottom); unten waechst die
    // Breite exakt um den Kehrwert — der Budget-Deckel gilt damit an der Spielerhoehe.
    const playfieldTop = getPlayfieldHalfWidth(390, 844, BALANCE.road.horizonY)
    const playfieldBottom = getPlayfieldHalfWidth(390, 844, 844)
    const maxWidthTop = Math.min(playfieldTop * 2, BALANCE.walls.hordeMaxWidthPx * (playfieldTop / playfieldBottom))
    for (let level = 1; level <= 24; level += 1) {
      for (const squad of getLevelPlan(level).squads) {
        const layout = computeHordeOffsets(squad.kind, squad.size, spacing, rowSpacing, WIDEST_ENEMY, maxWidthTop)
        const widthTop = getSquadWidth(layout.offsets, WIDEST_ENEMY)
        expect(widthTop * (playfieldBottom / playfieldTop)).toBeLessThanOrEqual(BALANCE.walls.hordeMaxWidthPx + 1e-9)
      }
    }
    expect(BALANCE.walls.hordeMaxWidthPx).toBeLessThanOrEqual(BALANCE.walls.minCorridorPx)
  })

  it('keeps every spawn centroid inside its middle band over 500 random draws', () => {
    const rng = (() => { let s = 0x77a3 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 } })()
    const playfieldTop = getPlayfieldHalfWidth(390, 844, BALANCE.road.horizonY)
    for (const [band, bodyWidth] of [
      [BALANCE.enemy.spawnBands.hordeLaneShare, 92],
      [BALANCE.enemy.spawnBands.singleLaneShare, 40],
    ] as const) {
      for (let index = 0; index < 500; index += 1) {
        const lane = chooseSpawnLane([], { bodyWidth, bodyHeight: 49, speedFactor: 1, y: BALANCE.road.horizonY }, playfieldTop, 844, rng, BALANCE.enemy.spawnLaneSafetyGap, band)
        expect(lane).not.toBeUndefined()
        // Schwerpunkt bleibt im Band — und weil x = lane x playfieldHalf(y) gilt,
        // bleibt er es in JEDER Tiefe (der Anteil ist y-unabhaengig).
        expect(Math.abs(lane!)).toBeLessThanOrEqual(band)
      }
    }
  })
})
