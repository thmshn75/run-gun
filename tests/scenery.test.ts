import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getRoadHalfWidth, getScrollProgressDelta, getScrollY } from '../src/systems/roadGeometry'
import { sceneryKinds } from '../src/systems/sceneryKinds'
import { simulateSceneryPool } from '../src/systems/scenerySimulation'
import { getSceneryPlacement, getSceneryScale, pickSceneryKind } from '../src/systems/sceneryLayout'

const width = 390
const height = 844
const fixedDt = 1000 / 60

function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

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

  it('shares the road scroll curve and keeps scenery progress free to leave the viewport', () => {
    const roadSource = readFileSync(new URL('../src/systems/road.ts', import.meta.url), 'utf8')
    const scenerySource = readFileSync(new URL('../src/systems/scenery.ts', import.meta.url), 'utf8')
    expect(BALANCE.scrollSpeed).toBe(180)
    expect(getScrollY(height, 0)).toBe(BALANCE.road.horizonY)
    expect(getScrollProgressDelta(height, fixedDt)).toBeCloseTo((BALANCE.scrollSpeed * fixedDt) / (height * 1000))
    expect(roadSource).toContain('getScrollY(height, centerLine.progress)')
    expect(scenerySource).toContain('getScrollY(height, object.progress)')
    const drained = simulateSceneryPool(sceneryKinds, createRng(0x5eeda11), width, height, BALANCE.pools.scenery, 120_000, fixedDt, 114_000)
    expect(drained.recycledCount).toBeGreaterThan(0)
    expect(drained.activeObjectCount).toBe(0)
  })

  it('uses reproducible weighted scenery selection with a tower-majority streetscape', () => {
    const rng = createRng(0x77ab)
    const choices = Array.from({ length: 2_000 }, () => pickSceneryKind(sceneryKinds, rng).texture)
    const repeatRng = createRng(0x77ab)
    const repeatedChoices = Array.from({ length: 2_000 }, () => pickSceneryKind(sceneryKinds, repeatRng).texture)
    const towerCount = choices.filter((texture) => texture.startsWith('scenery-tower-')).length
    expect(repeatedChoices).toEqual(choices)
    expect(towerCount / choices.length).toBeGreaterThan(0.45)
    expect(towerCount / choices.length).toBeLessThan(0.65)
  })

  it('derives the scenery pool from a 120-second deterministic spawn and recycle simulation', () => {
    const measured = simulateSceneryPool(sceneryKinds, createRng(0x5eeda11), width, height, 64, 120_000, fixedDt)
    const sizedPool = simulateSceneryPool(sceneryKinds, createRng(0x5eeda11), width, height, BALANCE.pools.scenery, 120_000, fixedDt)
    expect(measured.maxActive).toBe(16)
    expect(BALANCE.pools.scenery).toBe(measured.maxActive + 4)
    expect(sizedPool.failedSpawns).toBe(0)
  })

  it('registers three transparent tower sprites with their specified horizon heights', () => {
    const bootSource = readFileSync(new URL('../src/scenes/BootScene.ts', import.meta.url), 'utf8')
    for (const tower of [
      ['scenery-tower-a', 150],
      ['scenery-tower-b', 120],
      ['scenery-tower-c', 185],
    ] as const) {
      expect(sceneryKinds).toContainEqual(expect.objectContaining({ texture: tower[0], baseHeightPx: tower[1], weight: 3 }))
      expect(bootSource).toContain(`this.load.image('${tower[0]}'`)
      expect(existsSync(new URL(`../src/assets/${tower[0]}.png`, import.meta.url))).toBe(true)
    }
  })

  it('preallocates all scenery images once in its constructor and places them below the road', () => {
    const source = readFileSync(new URL('../src/systems/scenery.ts', import.meta.url), 'utf8')
    expect(BALANCE.pools.scenery).toBe(20)
    expect(BALANCE.layers.scenery).toBeGreaterThan(BALANCE.layers.background)
    expect(BALANCE.layers.scenery).toBeLessThan(BALANCE.layers.road)
    expect(source.match(/scene\.add\.image/g)).toHaveLength(1)
    expect(source.indexOf('this.objects.push(this.createObject())')).toBeLessThan(source.indexOf('public update'))
    expect(source).toContain('.setOrigin(0.5, 1)')
    expect(source).toContain('getScrollY(height, object.progress)')
    expect(source).not.toContain('object.image.y +=')
  })
})
