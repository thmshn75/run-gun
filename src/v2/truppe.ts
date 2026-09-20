import { bahnKantenBeiY, BALANCE_V2 } from './balanceV2'

export type HaufenPlatz = Readonly<{ dx: number, dy: number }>

export type TruppeGrenzen = Readonly<{ minX: number, maxX: number }>

const GOLDENER_WINKEL = Math.PI * (3 - Math.sqrt(5))

/**
 * Verteilt Figuren als gedrängte Sonnenblume statt als Reihenformation. Die äusserste
 * Figur bleibt bei bis zu maxSichtbar Figuren innerhalb des festgelegten Haufenradius.
 */
export function haufenPlaetze(anzahl: number): readonly HaufenPlatz[] {
  const sichtbareAnzahl = Math.max(0, Math.floor(anzahl))
  if (sichtbareAnzahl === 0) return []

  const letzterIndex = Math.max(1, Math.min(sichtbareAnzahl, BALANCE_V2.truppe.maxSichtbar) - 1)
  return Array.from({ length: sichtbareAnzahl }, (_, index) => {
    const radius = BALANCE_V2.truppe.haufenRadiusMaxPx
      * Math.sqrt(Math.min(index, letzterIndex) / letzterIndex)
      * (1 - Number.EPSILON)
    const winkel = index * GOLDENER_WINKEL
    return { dx: Math.cos(winkel) * radius, dy: Math.sin(winkel) * radius }
  })
}

/**
 * Die Breite wird allein aus der festen Haufenform und der Bildbreite abgeleitet.
 * Sie darf nicht aus bereits verschobenen Figurenpositionen zurückgelesen werden.
 */
export function haufenHalbeBreite(anzahl: number, figurBreite: number): number {
  const plaetze = haufenPlaetze(anzahl)
  if (plaetze.length === 0) return 0
  return Math.max(...plaetze.map((platz) => Math.abs(platz.dx))) + Math.max(0, figurBreite) / 2
}

/** Setzt alle Figuren aus dem unveränderlichen Mittelpunkt und ihren festen Versätzen. */
export function haufenPositionenX(mittelpunktX: number, plaetze: readonly HaufenPlatz[]): readonly number[] {
  return plaetze.map((platz) => mittelpunktX + platz.dx)
}

/**
 * Der Mittelpunkt darf nur so weit fahren, dass der komplette Haufen auch an seiner
 * obersten (und damit im neuen Trichter schmalsten) Stelle innerhalb der Bahn bleibt.
 */
export function truppeGrenzen(width: number, height: number, halbeBreiteDesHaufens: number): TruppeGrenzen {
  const obersteHaufenHoehe = height - BALANCE_V2.truppe.abstandVonUntenPx - BALANCE_V2.truppe.haufenRadiusMaxPx
  const { leftX, rightX } = bahnKantenBeiY(width, height, obersteHaufenHoehe)
  const rand = Math.max(0, halbeBreiteDesHaufens)
  return { minX: leftX + rand, maxX: rightX - rand }
}

export function sichtbareFiguren(truppenGroesse: number): number {
  return Math.min(Math.max(0, Math.floor(truppenGroesse)), BALANCE_V2.truppe.maxSichtbar)
}

export function truppenAnzeige(truppenGroesse: number): Readonly<{ sichtbareFiguren: number, zaehler: string }> {
  return { sichtbareFiguren: sichtbareFiguren(truppenGroesse), zaehler: String(Math.max(0, Math.floor(truppenGroesse))) }
}
