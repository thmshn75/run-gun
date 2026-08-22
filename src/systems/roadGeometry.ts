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

/**
 * Halbe Strassenbreite OHNE Klemmung an den Bildraendern.
 *
 * getRoadHalfWidth klemmt den Fortschritt auf [0,1] - richtig zum Zeichnen, falsch zum
 * Rechnen: Unterhalb des Bildrands bliebe die Breite konstant, und ein Objekt, dessen
 * Tempo an ihr haengt, wuerde dort stehenbleiben statt aus dem Bild zu fahren.
 */
function getRoadHalfWidthUnclamped(width: number, height: number, y: number): number {
  const topWidth = width * BALANCE.road.topWidthRatio
  const bottomWidth = width * BALANCE.road.bottomWidthRatio
  return (topWidth + (bottomWidth - topWidth) * ((y - BALANCE.road.horizonY) / (height - BALANCE.road.horizonY))) / 2
}

function getRoadHalfWidthSlope(width: number, height: number): number {
  return (width * (BALANCE.road.bottomWidthRatio - BALANCE.road.topWidthRatio)) / (2 * (height - BALANCE.road.horizonY))
}

function getYFromRoadHalfWidth(width: number, height: number, halfWidth: number): number {
  return BALANCE.road.horizonY + (halfWidth - (width * BALANCE.road.topWidthRatio) / 2) / getRoadHalfWidthSlope(width, height)
}

/**
 * WELTMASSSTAB der Strasse auf Hoehe y: 1 auf Kampfhoehe, 0,57 am Horizont, 1,10 am
 * unteren Bildrand. Anders als getPerspectiveScale ist das die ungeschoente Groesse,
 * die direkt aus der Strassenbreite kommt - fuer alles, was AUF der Strasse liegt und
 * mit ihr zusammenlaufen muss (Wandsegmente). Figuren nutzen bewusst die geschoente
 * Kurve, damit Gegner frueher gross wirken.
 */
export function getRoadScale(width: number, height: number, y: number): number {
  return getRoadHalfWidthUnclamped(width, height, y) / getRoadHalfWidth(width, height, height - BALANCE.player.anchorBottomOffset)
}

/**
 * Ein Objekt um `worldPx` WELT-Pixel nach vorn ruecken und die neue Bildschirmhoehe
 * zurueckgeben.
 *
 * Welt-Pixel sind in Kampfhoehe gemessen: Dieselbe Weltstrecke deckt am Horizont
 * weniger Bildschirmpixel ab als direkt vor der Truppe - genau das erzeugt den
 * Eindruck von Entfernung. Bis 2026-08-22 fuhren Wandsegmente stattdessen mit
 * konstanter Bildschirmgeschwindigkeit; am Horizont waren sie damit 5,1x schneller
 * als die Haeuser daneben (der Bruch war in balance.scrollSpeed dokumentiert).
 *
 * Geschlossene Loesung statt Schrittintegration: Aus dy/dw = r(y)/r_anchor und einer
 * in y linearen Strassenbreite r folgt r(w) = r0 * e^(lambda * w) mit
 * lambda = r'(y) / r_anchor. Eine Euler-Naeherung je Bild waere von der Bildrate
 * abhaengig - bei 30 fps wuerde die Wand messbar anders laufen als bei 120.
 */
export function advanceAlongRoad(width: number, height: number, y: number, worldPx: number): number {
  const lambda = getRoadHalfWidthSlope(width, height) / getRoadHalfWidth(width, height, height - BALANCE.player.anchorBottomOffset)
  const halfWidth = getRoadHalfWidthUnclamped(width, height, y) * Math.exp(lambda * worldPx)
  return getYFromRoadHalfWidth(width, height, halfWidth)
}

/**
 * Bildschirm-Abbild eines Objekts, das `worldPx` Welt-Pixel lang ist und dessen
 * WELTANKER auf y sitzt: wo es zu zeichnen ist (centerY) und wie hoch (height).
 *
 * Beides exakt aus derselben Abbildung wie advanceAlongRoad, nicht als worldPx x
 * Massstab genaehert - nur so grenzen aufeinanderfolgende Kettenglieder luecken- und
 * ueberlappungsfrei aneinander. Die Naeherung laege bei einer 72-px-Kachel um rund 4 px
 * daneben, sichtbar als Fuge zwischen den Segmenten.
 *
 * centerY ist NICHT y: Die Abbildung ist gekruemmt, also liegt die Bildschirmmitte des
 * Objekts etwas unterhalb seines Weltankers (bei einer Kachel rund 0,03 px). Klingt
 * nach nichts, ist aber ein systematischer Versatz - wer die gezeichnete Mitte im
 * naechsten Bild wieder als Anker nimmt, sammelt ihn Bild fuer Bild auf. Deshalb
 * fuehren Aufrufer den Anker getrennt weiter und zeichnen nur nach centerY.
 */
export function getRoadSegment(width: number, height: number, y: number, worldPx: number): { centerY: number; height: number } {
  const lambda = getRoadHalfWidthSlope(width, height) / getRoadHalfWidth(width, height, height - BALANCE.player.anchorBottomOffset)
  const halfWidth = getRoadHalfWidthUnclamped(width, height, y)
  const oben = getYFromRoadHalfWidth(width, height, halfWidth * Math.exp((-lambda * worldPx) / 2))
  const unten = getYFromRoadHalfWidth(width, height, halfWidth * Math.exp((lambda * worldPx) / 2))
  return { centerY: (oben + unten) / 2, height: unten - oben }
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
 * Bezug ist die Strassenperspektive, nicht eine geratene Kurve: Die Position zwischen
 * Horizont und KAMPFHOEHE (Truppenanker) kommt aus der Strassenbreite. Normiert wird
 * auf die Kampfhoehe und nicht auf den unteren Bildrand - dort treffen Gegner und
 * Truppe aufeinander, und nur dort muessen ihre Groessen exakt zueinander passen.
 * Unterhalb der Kampfhoehe wird der Faktor groesser als 1; das ist richtig, ein Gegner
 * laeuft dort naeher an der Kamera vorbei.
 *
 * Die GROESSE folgt dieser Position seit Thomas' iPhone-Test (2026-08-22: "die mobs
 * sind jetzt voll klein und wachsen bis zu mir zur vollen Groesse - sollte schon
 * frueher passieren") bewusst nicht mehr eins zu eins, sondern ueber zwei Regler:
 * horizonScale hebt die Ferngroesse an, growthExponent < 1 zieht das Wachstum nach
 * vorne. Die Figur ist damit auf halbem Weg schon fast voll gross, waehrend die
 * Strasse unter ihr weiter linear zulaeuft. Herleitung und Grenzen: BALANCE.road.perspective.
 */
export function getPerspectiveScale(width: number, height: number, y: number): number {
  const anchorY = height - BALANCE.player.anchorBottomOffset
  const anchorHalfWidth = getRoadHalfWidth(width, height, anchorY)
  const horizonRatio = getRoadHalfWidth(width, height, BALANCE.road.horizonY) / anchorHalfWidth
  // 0 am Horizont, 1 auf Kampfhoehe, groesser darunter. Oberhalb des Horizonts klemmt
  // getRoadHalfWidth bereits, ein Gegner beim Einblenden bleibt also auf Ferngroesse.
  const progress = (getRoadHalfWidth(width, height, y) / anchorHalfWidth - horizonRatio) / (1 - horizonRatio)
  const { horizonScale, growthExponent } = BALANCE.road.perspective
  return horizonScale + (1 - horizonScale) * Math.max(0, progress) ** growthExponent
}

/**
 * Um wieviel eine Figur weiter oben ueber ihren Platz im KAMPFHOEHEN-System hinausragt.
 *
 * Notwendig, seit die Groesse nicht mehr streng an der Strasse haengt (siehe
 * getPerspectiveScale): Die Spurwahl reserviert Plaetze auf Kampfhoehe, wo die
 * Skalierung 1 ist. Weiter oben schrumpft der Korridor auf 57 % der Kampfhoehenbreite,
 * die Figur aber nur auf horizonScale = 72 % - sie ragt dort also um Faktor 1,26 weiter
 * nach aussen, als ihre Spurreservierung erlaubt. Ohne diesen Aufschlag steht ein
 * Gegner am Horizont mit der Schulter im Wandsegment (gemessen 0,35 px bei einem
 * leichten, 5 px bei einem schweren Gegner ganz aussen).
 *
 * Der Aufschlag gilt NUR fuer den Randabstand, nicht fuer die Abstaende zwischen
 * Gegnern. Dort waere er zwar ebenso richtig, wuerde aber den Spawn-Durchsatz kosten -
 * und ueberlappende Gegner sind ausdruecklich kein Fehler (siehe spawnLanes.canMeet).
 */
/**
 * Hoehe, ab der Schuesse dieser Waffe nicht weiter fliegen (Thomas 2026-08-22: "Ja
 * Schuss Weite begrenzen", Nachtrag "an Waffen anpassen - Vergleich zur Realitaet").
 * `share` ist der Anteil der ANFLUGSTRECKE zwischen Kampfhoehe und Horizont, den die
 * Waffe abdeckt (BALANCE.weapon.<name>.engageShare) - so sitzt die Linie auf jedem
 * Geraet an derselben Stelle des Spielfelds statt an einer festen Pixelzahl.
 */
export function getEngageLineY(height: number, share: number): number {
  const anchorY = height - BALANCE.player.anchorBottomOffset
  return anchorY - (anchorY - BALANCE.road.horizonY) * Math.min(1, Math.max(0, share))
}

const overscanCache = new Map<string, number>()

export function getFigureOverscanFactor(width: number, height: number): number {
  const key = `${width}x${height}`
  const gemerkt = overscanCache.get(key)
  if (gemerkt !== undefined) return gemerkt
  const anchorY = height - BALANCE.player.anchorBottomOffset
  const anchorHalfWidth = getPlayfieldHalfWidth(width, height, anchorY)
  // Abgetastet statt am Horizont abgelesen: Weil die Groesse gekruemmt waechst und der
  // Korridor linear, sitzt das groesste Missverhaeltnis NICHT am Horizont, sondern kurz
  // darunter (bei 390 x 844 auf y = 182 mit Faktor 1,31 gegen 1,26 am Horizont selbst).
  let faktor = 1
  for (let schritt = 0; schritt <= BALANCE.road.perspective.overscanSamples; schritt += 1) {
    const y = BALANCE.road.horizonY + ((anchorY - BALANCE.road.horizonY) * schritt) / BALANCE.road.perspective.overscanSamples
    const anteilKorridor = getPlayfieldHalfWidth(width, height, y) / anchorHalfWidth
    faktor = Math.max(faktor, getPerspectiveScale(width, height, y) / anteilKorridor)
  }
  overscanCache.set(key, faktor)
  return faktor
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
