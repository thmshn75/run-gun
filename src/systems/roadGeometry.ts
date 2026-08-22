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

// Spielfeld = Strasse minus Wandzonen (W2): Gegner und Tore bleiben im Korridor,
// nur die Wandsegmente selbst und der Spieler duerfen in die Randzone.
export function getPlayfieldHalfWidth(width: number, height: number, y: number): number {
  return getRoadHalfWidth(width, height, y) * (1 - BALANCE.walls.laneShare)
}

// Wandzone bei y: Mitte und Breite folgen der Strassenkante (Anteil laneShare der
// halben Strassenbreite, perspektivisch skalierend wie die Strasse selbst).
export function getWallGeometry(width: number, height: number, y: number, side: 'left' | 'right'): { x: number; width: number } {
  const roadHalfWidth = getRoadHalfWidth(width, height, y)
  const sign = side === 'left' ? -1 : 1
  return {
    x: width / 2 + sign * roadHalfWidth * (1 - BALANCE.walls.laneShare / 2),
    width: roadHalfWidth * BALANCE.walls.laneShare,
  }
}
