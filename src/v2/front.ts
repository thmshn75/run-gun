import { BALANCE_V2 } from './balanceV2'

export type FrontZustand = Readonly<{ vorrat: number, eigenerWert: number, staerke: number, frontY: number }>
export type FrontRaten = Readonly<{ austauschProSek: number }>

/** Die Grenzlinie kennt nur den roten Vorrat, nie einzelne Figuren oder Kollisionen. */
export function frontYAusVorrat(vorrat: number): number {
  const anteil = Math.min(1, Math.max(0, vorrat / BALANCE_V2.front.gegnerStartVorrat))
  return BALANCE_V2.track.horizonY + (BALANCE_V2.front.frontStartY - BALANCE_V2.track.horizonY) * anteil
}

export function frontStartZustand(): FrontZustand {
  return {
    vorrat: BALANCE_V2.front.gegnerStartVorrat,
    eigenerWert: BALANCE_V2.truppe.startGroesse,
    staerke: BALANCE_V2.staerke.start,
    frontY: frontYAusVorrat(BALANCE_V2.front.gegnerStartVorrat),
  }
}

/**
 * Jeder Kontakt verbraucht eine eigene Einheit. Bei Grundstaerke verbraucht er
 * genau eine gegnerische Einheit; Staerke verschiebt nur den gegnerischen Verlust.
 */
export function aktualisiereFront(
  zustand: FrontZustand,
  dtMs: number,
  raten: FrontRaten = BALANCE_V2.front,
): FrontZustand {
  const sekunden = Math.max(0, dtMs) / 1000
  const staerke = zustand.staerke ?? BALANCE_V2.staerke.start
  const begegnungen = Math.min(zustand.eigenerWert, zustand.vorrat) * raten.austauschProSek * sekunden
  const eigenerVerlust = begegnungen
  const gegnerVerlust = begegnungen * (staerke / BALANCE_V2.staerke.start)
  // Eine Einheit ist unteilbar: Ohne diese Schwelle naehert sich der Rest der Null
  // nur asymptotisch, weil der Umsatz selbst vom Restbestand abhaengt - das Spiel
  // haengt dann am Ende ewig an einem Bruchteil einer Figur fest.
  const vorrat = restOhneBruchteil(zustand.vorrat - gegnerVerlust)
  const eigenerWert = restOhneBruchteil(zustand.eigenerWert - eigenerVerlust)
  return { vorrat, eigenerWert, staerke, frontY: frontYAusVorrat(vorrat) }
}

/** Unter einer ganzen Einheit ist die Flaeche leer; siehe Begruendung in aktualisiereFront. */
function restOhneBruchteil(wert: number): number {
  return wert < 1 ? 0 : wert
}

/** Ankommende Stromfiguren erhoehen die blaue Flaeche ganzzahlig; die Bilanz bleibt fliessend. */
export function mitAnkunft(zustand: FrontZustand, anzahl = 1): FrontZustand {
  return { ...zustand, eigenerWert: zustand.eigenerWert + Math.max(0, anzahl) }
}
