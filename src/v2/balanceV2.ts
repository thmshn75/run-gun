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
  truppe: {
    // 10 Figuren: die im Video sichtbare kleine Starttruppe, bewusst ohne Spielstand.
    startGroesse: 10,
    // 60 Figuren: genug fuer spaetere Zunahme, ohne den Haufen unlesbar zu machen.
    maxSichtbar: 60,
    // 52 px: dichter Haufen, der bei 60 Figuren noch klar als eine Gruppe lesbar bleibt.
    haufenRadiusMaxPx: 52,
    // 0,22: die Player-Textur bleibt deutlich kleiner als die Bahnbreite.
    figurTextureScale: 0.22,
    // 92 px ueber der Unterkante: genug Abstand fuer Figur und Bildschirmrand.
    abstandVonUntenPx: 92,
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

/** Ermittelt eine Bahnkante auf einer Höhe aus genau den vier S1-Eckpunkten. */
export function bahnKantenBeiY(width: number, height: number, y: number) {
  const kanten = bahnKanten(width, height)
  const fortschritt = Math.min(1, Math.max(0, (y - kanten.horizonY) / (kanten.bottomY - kanten.horizonY)))
  return {
    leftX: kanten.topLeftX + (kanten.bottomLeftX - kanten.topLeftX) * fortschritt,
    rightX: kanten.topRightX + (kanten.bottomRightX - kanten.topRightX) * fortschritt,
  }
}
