import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getGateLanes, getGateSpawnLayout, selectedLaneIndex } from '../src/systems/gateLanes'
import { getRoadHalfWidth } from '../src/systems/roadGeometry'

describe('gate lanes', () => {
  it('keeps three decision lanes at least 90px wide at the real trigger position', () => {
    const roadWidth = getRoadHalfWidth(390, 844, 679) * 2
    const lanes = getGateLanes(3, 390 / 2, roadWidth, BALANCE.gates.gapBetween)

    expect(lanes).toHaveLength(3)
    for (const lane of lanes) expect(lane.width).toBeGreaterThanOrEqual(90)
  })

  it('centers non-overlapping lanes and fills the road except for the configured gaps', () => {
    const roadCenterX = 195
    const roadWidth = 340
    const lanes = getGateLanes(3, roadCenterX, roadWidth, 8)

    expect(lanes.map((lane) => lane.width)).toEqual([108, 108, 108])
    expect(lanes[0].centerX - lanes[0].width / 2).toBe(25)
    expect(lanes[2].centerX + lanes[2].width / 2).toBe(365)
    expect(lanes[1].centerX - lanes[0].centerX).toBe(lanes[0].width + 8)
    expect(lanes[2].centerX - lanes[1].centerX).toBe(lanes[1].width + 8)
  })

  it('selects the touched or nearest lane for two and three lanes', () => {
    const twoLanes = getGateLanes(2, 195, 340, 8)
    const threeLanes = getGateLanes(3, 195, 340, 8)

    expect(twoLanes.map((lane) => selectedLaneIndex(lane.centerX, twoLanes))).toEqual([0, 1])
    expect(selectedLaneIndex(195, twoLanes)).toBe(0)
    expect(selectedLaneIndex(0, twoLanes)).toBe(0)
    expect(selectedLaneIndex(390, twoLanes)).toBe(1)
    expect(threeLanes.map((lane) => selectedLaneIndex(lane.centerX, threeLanes))).toEqual([0, 1, 2])
    expect(selectedLaneIndex(137, threeLanes)).toBe(0)
    expect(selectedLaneIndex(253, threeLanes)).toBe(1)
    expect(selectedLaneIndex(0, threeLanes)).toBe(0)
    expect(selectedLaneIndex(390, threeLanes)).toBe(2)
  })

  it('keeps the math lanes adjacent while placing weapon offers on either outer side', () => {
    const leftWeapon = getGateSpawnLayout(3, 2, ['laser'], () => 0)
    const rightWeapon = getGateSpawnLayout(3, 2, ['laser'], () => 0.9)

    expect(leftWeapon.laneKinds).toEqual(['weapon', 'stat', 'stat'])
    expect(rightWeapon.laneKinds).toEqual(['stat', 'stat', 'weapon'])
  })

  it('offers weapons only on every configured three-lane gate and never advances in two-lane levels', () => {
    const noAdvance = getGateSpawnLayout(2, 0, ['laser'], () => 0)
    const first = getGateSpawnLayout(3, noAdvance.weaponLaneCounter, ['laser'], () => 0)
    const second = getGateSpawnLayout(3, first.weaponLaneCounter, ['laser'], () => 0)
    const third = getGateSpawnLayout(3, second.weaponLaneCounter, ['laser'], () => 0)

    expect(noAdvance).toMatchObject({ laneCount: 2, weaponLaneCounter: 0 })
    expect(first.laneCount).toBe(2)
    expect(second.laneCount).toBe(2)
    expect(third).toMatchObject({ laneCount: 3, weaponLaneCounter: BALANCE.gates.weaponLaneEvery, weapon: 'laser' })
    expect(getGateSpawnLayout(3, 2, [], () => 0).laneCount).toBe(2)
  })

  it('uses the fixed group pool without runtime allocation or the retired two-lane selector', () => {
    const gatesSource = readFileSync(new URL('../src/systems/gates.ts', import.meta.url), 'utf8')

    expect(BALANCE.pools.gateGroups).toBe(2)
    expect('gatePairs' in BALANCE.pools).toBe(false)
    expect(gatesSource).not.toContain('isLeftSelected')
    expect(gatesSource).not.toContain('.destroy()')
    expect(gatesSource).toContain('for (let index = 0; index < BALANCE.pools.gateGroups; index += 1)')
  })
})
