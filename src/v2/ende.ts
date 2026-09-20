import { BALANCE_V2 } from './balanceV2'
import { aktualisiereFront, type FrontZustand } from './front'

export type Ausgang = 'sieg' | 'niederlage'
export type EndeZustand = Readonly<{ front: FrontZustand, bossVorrat: number, truppenGroesse: number }>

export function endeStartZustand(front: FrontZustand, truppenGroesse = BALANCE_V2.truppe.startGroesse): EndeZustand {
  return { front, bossVorrat: BALANCE_V2.ende.bossStartVorrat, truppenGroesse }
}

/**
 * Erst wird die rote Flaeche abgebaut. Ist die blaue Flaeche leer, trifft der
 * weiterhin vorhandene rote Druck die Truppe direkt; auch dort bleiben Bruchteile
 * erhalten. Erst nach leerer roter Flaeche wird der Boss angegriffen.
 */
export function aktualisiereEnde(zustand: EndeZustand, dtMs: number): EndeZustand {
  if (zustand.front.vorrat > 0) {
    const front = aktualisiereFront(zustand.front, dtMs)
    if (front.eigenerWert > 0) return { ...zustand, front }
    const sekunden = Math.max(0, dtMs) / 1000
    const truppenGroesse = Math.max(0, zustand.truppenGroesse
      - zustand.front.vorrat * BALANCE_V2.front.verlustProVorratProSek * sekunden)
    return { ...zustand, front, truppenGroesse }
  }
  const sekunden = Math.max(0, dtMs) / 1000
  const bossVorrat = Math.max(0, zustand.bossVorrat
    - zustand.front.eigenerWert * BALANCE_V2.front.abbauProEigenerEinheitProSek * sekunden)
  return { ...zustand, bossVorrat }
}

export function ausgangFuer(zustand: EndeZustand): Ausgang | undefined {
  if (zustand.bossVorrat <= 0) return 'sieg'
  if (zustand.truppenGroesse <= 0) return 'niederlage'
  return undefined
}

/** Der Szenenzustand darf einen bereits angezeigten Ausgang nie ein zweites Mal melden. */
export function ausgangEinmal(ausgeloest: boolean, zustand: EndeZustand): Ausgang | undefined {
  return ausgeloest ? undefined : ausgangFuer(zustand)
}
