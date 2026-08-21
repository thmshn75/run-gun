import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getRoadHalfWidth } from '../src/systems/roadGeometry'
import { getSceneryPlacement, getSceneryScale } from '../src/systems/sceneryLayout'

const width = 390
const height = 844

describe('scenery layout', () => {
  it('keeps every sampled roadside object fully outside the road through getRoadHalfWidth', () => {
    for (const y of [BALANCE.road.horizonY, 260, 430, 620, height]) {
      for (const side of ['left', 'right'] as const) {
        for (const random of [0, 0.25, 0.5, 0.75, 1]) {
          const placement = getSceneryPlacement(width, height, y, side, 60, BALANCE.scenery.marginPx, BALANCE.scenery.spreadPx, random)
          const roadEdge = width / 2 + (side === 'left' ? -1 : 1) * getRoadHalfWidth(width, height, y)
          if (side === 'left') expect(placement.x + placement.displayWidth / 2).toBeLessThanOrEqual(roadEdge - BALANCE.scenery.marginPx)
          else expect(placement.x - placement.displayWidth / 2).toBeGreaterThanOrEqual(roadEdge + BALANCE.scenery.marginPx)
        }
      }
    }
  })

  it('uses the road-width ratio itself as the scenery perspective scale', () => {
    const atHorizon = getSceneryScale(width, height, BALANCE.road.horizonY)
    const atBottom = getSceneryScale(width, height, height)
    const roadRatio = getRoadHalfWidth(width, height, height) / getRoadHalfWidth(width, height, BALANCE.road.horizonY)
    expect(atHorizon).toBe(1)
    expect(atBottom).toBeGreaterThan(atHorizon)
    expect(atBottom).toBeCloseTo(roadRatio)
  })

  it('preallocates all scenery images once in its constructor and places them below the road', () => {
    const source = readFileSync(new URL('../src/systems/scenery.ts', import.meta.url), 'utf8')
    expect(BALANCE.pools.scenery).toBe(16)
    expect(BALANCE.layers.scenery).toBeGreaterThan(BALANCE.layers.background)
    expect(BALANCE.layers.scenery).toBeLessThan(BALANCE.layers.road)
    expect(source.match(/scene\.add\.image/g)).toHaveLength(1)
    expect(source.indexOf('this.objects.push(this.createObject())')).toBeLessThan(source.indexOf('public update'))
    expect(source).toContain('.setOrigin(0.5, 1)')
  })
})
