import { describe, expect, it } from 'vitest'
import { BALANCE, type SquadKind } from '../src/config/balance'
import { getLevelPlan } from '../src/systems/levelPlan'
import { computeSquadOffsets } from '../src/systems/squads'

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
