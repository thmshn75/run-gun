import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getRoadHalfWidth, getScrollProgressDelta, getScrollY } from '../src/systems/roadGeometry'
import { sceneryKinds } from '../src/systems/sceneryKinds'
import { simulateCityScenery } from '../src/systems/scenerySimulation'
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
    const drained = simulateCityScenery(sceneryKinds, createRng(0x5eeda11), width, height, BALANCE.pools.scenery, 120_000, fixedDt, 114_000)
    expect(drained.recycledCount).toBeGreaterThan(0)
    expect(drained.activeObjectCount).toBe(0)
  })

  it('keeps every block facade gap-free: a run without cross streets never shows a silhouette gap', () => {
    const endlessBlock = { ...BALANCE.scenery, blockBuildingsMin: 100_000, blockBuildingsMax: 100_000 }
    const result = simulateCityScenery(sceneryKinds, createRng(0x5eeda11), width, height, 64, 120_000, fixedDt, 120_000, endlessBlock)
    expect(result.failedSpawns).toBe(0)
    expect(result.gapFrames).toBe(0)
  })

  it('produces cross streets that appear on both sides at the same scroll position', () => {
    const result = simulateCityScenery(sceneryKinds, createRng(0x5eeda11), width, height, 64, 120_000, fixedDt)
    // Querstrassen kommen vor: Ohne sie waere gapFrames 0 (siehe Test darueber). Zusammen
    // belegt das: Jede Silhouettenluecke ist eine geplante Querstrasse, keine Zufallsluecke.
    expect(result.gapFrames).toBeGreaterThan(0)
    // Synchronitaet: Nur ein kleiner Randanteil der Luecken-Frames ist einseitig
    // (unterschiedliche Turmhoehen versetzen Beginn und Ende der Sichtbarkeit leicht).
    expect(result.asyncGapFrames / result.gapFrames).toBeLessThan(0.25)
  })

  it('derives the scenery pool from the densest case: an uninterrupted block over 120 seconds', () => {
    const endlessBlock = { ...BALANCE.scenery, blockBuildingsMin: 100_000, blockBuildingsMax: 100_000 }
    const densest = simulateCityScenery(sceneryKinds, createRng(0x5eeda11), width, height, 64, 120_000, fixedDt, 120_000, endlessBlock)
    const normal = simulateCityScenery(sceneryKinds, createRng(0x5eeda11), width, height, 64, 120_000, fixedDt)
    const sizedPool = simulateCityScenery(sceneryKinds, createRng(0x5eeda11), width, height, BALANCE.pools.scenery, 120_000, fixedDt)
    expect(BALANCE.scenery.marginPx).toBe(4)
    expect(BALANCE.scenery.spreadPx).toBe(6)
    expect(BALANCE.scenery.spawnIntervalMs).toBe(400)
    expect(densest.maxActive).toBe(24)
    expect(normal.maxActive).toBeLessThanOrEqual(densest.maxActive)
    expect(BALANCE.pools.scenery).toBeGreaterThanOrEqual(densest.maxActive + 4)
    expect(sizedPool.failedSpawns).toBe(0)
  })

  it('registers the tower canyon and removes the cottage asset completely', () => {
    const bootSource = readFileSync(new URL('../src/scenes/BootScene.ts', import.meta.url), 'utf8')
    for (const tower of [
      ['scenery-tower-a', 150],
      ['scenery-tower-b', 120],
      ['scenery-tower-c', 185],
    ] as const) {
      expect(sceneryKinds).toContainEqual(expect.objectContaining({ texture: tower[0], baseHeightPx: tower[1], category: 'building' }))
      expect(bootSource).toContain(`this.load.image('${tower[0]}'`)
      expect(existsSync(new URL(`../src/assets/${tower[0]}.png`, import.meta.url))).toBe(true)
    }
    for (const nature of ['scenery-oak', 'scenery-conifer', 'scenery-bush', 'scenery-stone']) {
      expect(sceneryKinds).toContainEqual(expect.objectContaining({ texture: nature, category: 'greenery' }))
    }
    expect(sceneryKinds.some((kind) => kind.texture === 'scenery-cottage')).toBe(false)
    expect(bootSource).not.toContain('scenery-cottage')
    expect(existsSync(new URL('../src/assets/scenery-cottage.png', import.meta.url))).toBe(false)
  })

  it('keeps weighted selection reproducible within a category', () => {
    const buildings = sceneryKinds.filter((kind) => kind.category === 'building')
    const rng = createRng(0x77ab)
    const choices = Array.from({ length: 500 }, () => pickSceneryKind(buildings, rng).texture)
    const repeatRng = createRng(0x77ab)
    const repeatedChoices = Array.from({ length: 500 }, () => pickSceneryKind(buildings, repeatRng).texture)
    expect(repeatedChoices).toEqual(choices)
    expect(choices.every((texture) => texture.startsWith('scenery-tower-'))).toBe(true)
  })

  it('preallocates all scenery images once in its constructor and places them below the road', () => {
    const source = readFileSync(new URL('../src/systems/scenery.ts', import.meta.url), 'utf8')
    expect(BALANCE.pools.scenery).toBe(30)
    expect(BALANCE.layers.scenery).toBeGreaterThan(BALANCE.layers.background)
    expect(BALANCE.layers.scenery).toBeLessThan(BALANCE.layers.road)
    expect(source.match(/scene\.add\.image/g)).toHaveLength(1)
    expect(source.indexOf('this.objects.push(this.createObject())')).toBeLessThan(source.indexOf('public update'))
    expect(source).toContain('.setOrigin(0.5, 1)')
    expect(source).toContain('getScrollY(height, object.progress)')
    expect(source).not.toContain('object.image.y +=')
  })
})
