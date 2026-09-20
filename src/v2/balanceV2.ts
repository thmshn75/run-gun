/**
 * Ausschliesslich fuer Run Gun V2. Diese Zahlen werden absichtlich kopiert statt aus
 * dem bestehenden Spiel importiert: V2 bleibt ein vollstaendig getrennter Probelauf.
 */
export const BALANCE_V2 = {
  track: {
    // 150 px: aus der bestehenden Bahn abgelesene Horizonthoehe bei 844 px Spielhoehe.
    horizonY: 150,
    // 0,52 * 390 px = 202,8 px breite Bahn am Horizont, als eigene V2-Zahl kopiert.
    topWidthRatio: 0.52,
    // 1 * 390 px = volle Bildschirmbreite am unteren Rand, wie die bestehende Bahn.
    bottomWidthRatio: 1,
    // 2 px: sichtbare Kante zwischen Bahn und Mauer.
    wallWidthPx: 2,
  },
  colors: {
    // Eigene V2-Farben; keine Farbkonfiguration des bestehenden Spiels wird gelesen.
    sky: 0x80c8ee,
    road: 0x39434d,
    wall: 0x697682,
    wallEdge: 0xb8c4cb,
    menuButton: 0x263d55,
    menuButtonEdge: 0xe8f4ff,
    menuText: '#f4fbff',
  },
} as const

/**
 * Berechnet die vier Bahnecken in Bildschirmkoordinaten. Die Szene und der Test
 * verwenden dieselbe Rechnung, damit keine Polygon-Verschiebung die Bahn teilt.
 */
export function bahnKanten(width: number, height: number) {
  const centerX = width / 2
  const topHalfWidth = width * BALANCE_V2.track.topWidthRatio / 2
  const bottomHalfWidth = width * BALANCE_V2.track.bottomWidthRatio / 2

  return {
    horizonY: BALANCE_V2.track.horizonY,
    bottomY: height,
    topLeftX: centerX - topHalfWidth,
    topRightX: centerX + topHalfWidth,
    bottomLeftX: centerX - bottomHalfWidth,
    bottomRightX: centerX + bottomHalfWidth,
  }
}
