import { BALANCE_V2 } from './balanceV2'
import { aktualisiereFront, type FrontZustand } from './front'

export type Ausgang = 'sieg' | 'niederlage'
export type EndeZustand = Readonly<{ front: FrontZustand, bossVorrat: number, truppenGroesse: number, bossAbstiegPx: number }>

export function endeStartZustand(front: FrontZustand, truppenGroesse = BALANCE_V2.truppe.startGroesse): EndeZustand {
  return { front, bossVorrat: BALANCE_V2.ende.bossStartVorrat, truppenGroesse, bossAbstiegPx: 0 }
}

/**
 * Erst wird die rote Flaeche abgebaut. Ist die blaue Flaeche leer, trifft der
 * weiterhin vorhandene rote Druck die Truppe direkt; auch dort bleiben Bruchteile
 * erhalten. Erst nach leerer roter Flaeche wird der Boss angegriffen.
 */
export function aktualisiereEnde(zustand: EndeZustand, dtMs: number): EndeZustand {
  const sekunden = Math.max(0, dtMs) / 1000
  const bossAbstiegPx = Math.min(BALANCE_V2.ende.bossMaxAbstiegPx,
    zustand.bossAbstiegPx + BALANCE_V2.ende.bossTempoPxProSek * sekunden)
  if (zustand.front.vorrat > 0) {
    const front = aktualisiereFront(zustand.front, dtMs)
    return { ...zustand, front, bossAbstiegPx }
  }
  const bossVorrat = Math.max(0, zustand.bossVorrat
    - zustand.front.eigenerWert * BALANCE_V2.front.austauschProSek * (zustand.front.staerke / BALANCE_V2.staerke.start) * sekunden)
  return { ...zustand, bossVorrat, bossAbstiegPx }
}

export function ausgangFuer(zustand: EndeZustand): Ausgang | undefined {
  if (zustand.bossVorrat <= 0) return 'sieg'
  if (zustand.bossAbstiegPx >= BALANCE_V2.ende.bossMaxAbstiegPx) return 'niederlage'
  if (zustand.truppenGroesse <= 0) return 'niederlage'
  return undefined
}

/** Der Szenenzustand darf einen bereits angezeigten Ausgang nie ein zweites Mal melden. */
export function ausgangEinmal(ausgeloest: boolean, zustand: EndeZustand): Ausgang | undefined {
  return ausgeloest ? undefined : ausgangFuer(zustand)
}
