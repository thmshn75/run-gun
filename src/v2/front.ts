import { BALANCE_V2 } from './balanceV2'

export type FrontZustand = Readonly<{ vorrat: number, eigenerWert: number, frontY: number }>
export type FrontRaten = Readonly<{ abbauProEigenerEinheitProSek: number, verlustProVorratProSek: number }>

/** Die Grenzlinie kennt nur den roten Vorrat, nie einzelne Figuren oder Kollisionen. */
export function frontYAusVorrat(vorrat: number): number {
  const anteil = Math.min(1, Math.max(0, vorrat / BALANCE_V2.front.gegnerStartVorrat))
  return BALANCE_V2.track.horizonY + (BALANCE_V2.front.frontStartY - BALANCE_V2.track.horizonY) * anteil
}

export function frontStartZustand(): FrontZustand {
  return {
    vorrat: BALANCE_V2.front.gegnerStartVorrat,
    eigenerWert: BALANCE_V2.truppe.startGroesse,
    frontY: frontYAusVorrat(BALANCE_V2.front.gegnerStartVorrat),
  }
}

/**
 * Eine Rechnung fuer beide Flaechen: eigener Druck verschiebt einen Punkt von rot
 * nach blau, gegnerischer Druck denselben Punkt zurueck. Deshalb bleibt bei exakt
 * gleicher Staerke die Grenze stehen, ohne Ziele, Bindungen oder Collider.
 */
export function aktualisiereFront(
  zustand: FrontZustand,
  dtMs: number,
  raten: FrontRaten = BALANCE_V2.front,
): FrontZustand {
  const sekunden = Math.max(0, dtMs) / 1000
  const eigenerDruck = zustand.eigenerWert * raten.abbauProEigenerEinheitProSek * sekunden
  const gegnerDruck = zustand.vorrat * raten.verlustProVorratProSek * sekunden
  const vorrat = Math.min(
    BALANCE_V2.front.gegnerStartVorrat,
    Math.max(0, zustand.vorrat - eigenerDruck + gegnerDruck),
  )
  const eigenerWert = Math.max(0, zustand.eigenerWert + eigenerDruck - gegnerDruck)
  return { vorrat, eigenerWert, frontY: frontYAusVorrat(vorrat) }
}

/** Ankommende Stromfiguren erhoehen die blaue Flaeche ganzzahlig; die Bilanz bleibt fliessend. */
export function mitAnkunft(zustand: FrontZustand, anzahl = 1): FrontZustand {
  return { ...zustand, eigenerWert: zustand.eigenerWert + Math.max(0, anzahl) }
}
