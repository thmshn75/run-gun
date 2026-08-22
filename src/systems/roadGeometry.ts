import { BALANCE } from '../config/balance'
import { getCurrentScrollSpeed } from './speed'

export function getScrollProgressDelta(height: number, dt: number): number {
  return (getCurrentScrollSpeed() * dt) / (height * 1000)
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

// Spurtreue Flugbahnen: laneRatio ist der Anteil an der halben Strassenbreite, den ein
// Punkt bei y einnimmt (0 = Mitte, 1 = Strassenkante). Behaelt ein Projektil diesen
// Anteil bei, folgt es der Perspektive statt senkrecht aus der Spur zu laufen.
export function getLaneRatio(width: number, height: number, x: number, y: number): number {
  return (x - width / 2) / getRoadHalfWidth(width, height, y)
}

// Steigung dx/dy einer spurtreuen Bahn je Einheit laneRatio — konstant, weil die
// Strassenbreite linear in y waechst. Dient nur der Sprite-Neigung beim Abschuss.
export function getLaneSlope(width: number, height: number): number {
  const topWidth = width * BALANCE.road.topWidthRatio
  const bottomWidth = width * BALANCE.road.bottomWidthRatio
  return (bottomWidth - topWidth) / (2 * (height - BALANCE.road.horizonY))
}

// Spielfeld = Strasse minus Wandzonen (W2): Gegner und Tore bleiben im Korridor,
// nur die Wandsegmente selbst und der Spieler duerfen in die Randzone.
export function getPlayfieldHalfWidth(width: number, height: number, y: number): number {
  return getRoadHalfWidth(width, height, y) * (1 - BALANCE.walls.laneShare)
}

/**
 * Groessenfaktor eines Objekts auf Hoehe y (Thomas 2026-08-22: "Mobs wachsen lassen,
 * damit mehr als Wand kommen").
 *
 * Bis hierher waren Gegner am Horizont genauso gross gezeichnet wie direkt vor der
 * Truppe. Das kostete nicht nur die Tiefenwirkung - es war der Grund, warum breite
 * Horden konstruktiv unmoeglich waren: Am Horizont ist die Strasse nur halb so breit,
 * die Figuren aber voll gross, also passten dort nur zwei nebeneinander.
 *
 * Bezug ist die Strassenbreite, nicht eine geratene Kurve: Ein Objekt schrumpft genau
 * so, wie die Strasse unter ihm zusammenlaeuft. Normiert wird auf die KAMPFHOEHE
 * (Truppenanker), nicht auf den unteren Bildrand - dort treffen Gegner und Truppe
 * aufeinander, und nur dort muessen ihre Groessen exakt zueinander passen. Unterhalb
 * der Kampfhoehe wird der Faktor groesser als 1; das ist perspektivisch richtig, ein
 * Gegner laeuft dort naeher an der Kamera vorbei.
 */
export function getPerspectiveScale(width: number, height: number, y: number): number {
  const anchorY = height - BALANCE.player.anchorBottomOffset
  return getRoadHalfWidth(width, height, y) / getRoadHalfWidth(width, height, anchorY)
}

// Fahrbereich als halbe Spannweite ab Bildmitte, je Seite getrennt (W4-Korrektur).
// Ohne Wand: bis an die Strassenkante, um inset eingerueckt. Mit Wand: bis die GANZE
// Formation in der Wandzone steht — Innenkante + halbe Formationsbreite + overlapPx,
// gedeckelt auf die Strassenkante. Ohne overlapPx endet die Startformation (2 Figuren,
// beide in der Mittelspur, halbe Breite 0) exakt AUF der Innenkante und trifft gemessen
// 0 von 2 Segmenten; overlapPx schiebt den Schussursprung sicher in die Zone.
export function getDriveLimitHalfWidth(
  width: number,
  height: number,
  y: number,
  hasWall: boolean,
  halfFormationWidth: number,
  inset: number,
  overlapPx: number,
): number {
  const outerLimit = getRoadHalfWidth(width, height, y) - inset
  if (!hasWall) return outerLimit
  return Math.min(getPlayfieldHalfWidth(width, height, y) + halfFormationWidth + overlapPx, outerLimit)
}

// Sichtbare Wand bei y: Die Innenkante sitzt exakt an der Spielfeldkante (Korridor
// bleibt unberuehrt), die Breite ist widthShare der halben Strassenbreite — der Teil
// jenseits von laneShare ragt nach aussen ueber die Strassenkante hinaus.
export function getWallGeometry(width: number, height: number, y: number, side: 'left' | 'right'): { x: number; width: number } {
  const roadHalfWidth = getRoadHalfWidth(width, height, y)
  const innerEdge = roadHalfWidth * (1 - BALANCE.walls.laneShare)
  const wallWidth = roadHalfWidth * BALANCE.walls.widthShare
  const sign = side === 'left' ? -1 : 1
  return {
    x: width / 2 + sign * (innerEdge + wallWidth / 2),
    width: wallWidth,
  }
}
