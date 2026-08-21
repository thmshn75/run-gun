import { BALANCE } from '../config/balance'
import { getRoadHalfWidth } from './roadGeometry'

export type ScenerySide = 'left' | 'right'

export type SceneryKind = Readonly<{
  texture: string
  baseHeightPx: number
  baseWidthPx: number
  weight: number
}>

export type SceneryPlacement = Readonly<{
  x: number
  scale: number
  displayWidth: number
}>

export function getSceneryScale(width: number, height: number, y: number): number {
  return getRoadHalfWidth(width, height, y) / getRoadHalfWidth(width, height, BALANCE.road.horizonY)
}

export function getSceneryPlacement(
  width: number,
  height: number,
  y: number,
  side: ScenerySide,
  baseWidthPx: number,
  marginPx: number,
  spreadPx: number,
  random: number,
): SceneryPlacement {
  const scale = getSceneryScale(width, height, y)
  const displayWidth = baseWidthPx * scale
  const roadEdge = width / 2 + (side === 'left' ? -1 : 1) * getRoadHalfWidth(width, height, y)
  const outsideDistance = marginPx + spreadPx * random
  const x = roadEdge + (side === 'left' ? -1 : 1) * (outsideDistance + displayWidth / 2)
  return { x, scale, displayWidth }
}

export function pickSceneryKind(kinds: readonly SceneryKind[], rng: () => number): SceneryKind {
  const totalWeight = kinds.reduce((sum, kind) => sum + kind.weight, 0)
  let remainingWeight = rng() * totalWeight
  for (const kind of kinds) {
    remainingWeight -= kind.weight
    if (remainingWeight < 0) return kind
  }
  return kinds[kinds.length - 1]
}

export function getScenerySpawnIntervalMs(rng: () => number): number {
  return BALANCE.scenery.spawnIntervalMs * (0.75 + rng() * 0.5)
}

export function isSceneryOutsideViewport(
  width: number,
  height: number,
  x: number,
  y: number,
  displayWidth: number,
  displayHeight: number,
): boolean {
  return y - displayHeight > height || x + displayWidth / 2 < 0 || x - displayWidth / 2 > width
}
