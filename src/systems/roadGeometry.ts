import { BALANCE } from '../config/balance'

export function getScrollProgressDelta(height: number, dt: number): number {
  return (BALANCE.scrollSpeed * dt) / (height * 1000)
}

export function getScrollY(height: number, progress: number): number {
  return BALANCE.road.horizonY + (height - BALANCE.road.horizonY) * progress * progress
}

export function getRoadHalfWidth(width: number, height: number, y: number): number {
  const topWidth = width * BALANCE.road.topWidthRatio
  const bottomWidth = width * BALANCE.road.bottomWidthRatio
  const progress = Math.min(1, Math.max(0, (y - BALANCE.road.horizonY) / (height - BALANCE.road.horizonY)))
  return (topWidth + (bottomWidth - topWidth) * progress) / 2
}
