import { BALANCE } from '../config/balance'
import { getRoadHalfWidth } from './roadGeometry'

export type ScenerySide = 'left' | 'right'

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
