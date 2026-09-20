import { BALANCE_V2 } from './balanceV2'
import { aktualisiereFront, type FrontZustand } from './front'

export type Ausgang = 'sieg' | 'niederlage'
export type EndeZustand = Readonly<{ front: FrontZustand, bossVorrat: number, truppenGroesse: number, bossAbstiegPx: number }>

export function endeStartZustand(front: FrontZustand, truppenGroesse = BALANCE_V2.truppe.startGroesse): EndeZustand {
  return { front, bossVorrat: BALANCE_V2.ende.bossStartVorrat, truppenGroesse, bossAbstiegPx: 0 }
}

/** Wo der Boss gerade steht. */
export function bossY(bossAbstiegPx: number): number {
  return BALANCE_V2.track.horizonY + bossAbstiegPx
}

/**
 * Der Boss laeuft nach vorn, aber er laeuft durch nichts hindurch: Sobald er die
 * eigene Flaeche erreicht, bleibt er stehen und muss sie erst wegraeumen. Sie
 * nimmt ihm dabei Vorrat ab. Weil staendig Nachschub kommt, ist das ein Wettlauf
 * zwischen seiner Schlagkraft und dem eigenen Zustrom - genau dort entscheidet
 * der Torfaktor das Spiel. Erst wenn nichts mehr vor ihm steht, geht er weiter
 * bis zur Truppe und raeumt auch die weg.
 *
 * Die Bilanz der beiden Flaechen laeuft davon unabhaengig immer weiter.
 */
export function aktualisiereEnde(zustand: EndeZustand, dtMs: number): EndeZustand {
  const sekunden = Math.max(0, dtMs) / 1000
  const front = zustand.front.vorrat > 0 ? aktualisiereFront(zustand.front, dtMs) : zustand.front
  // Aufgehalten wird er nur von dem, was er in diesem Augenblick NICHT wegraeumen
  // kann. Ein winziger Rest, den er ohnehin mitnimmt, ist kein Hindernis - sonst
  // blockierte ihn schon ein Bruchteil einer Figur dauerhaft.
  const raeumtProBild = BALANCE_V2.ende.bossSchlagkraftProSek * sekunden
  const vorIhmStehtEtwas = front.eigenerWert > raeumtProBild && bossY(zustand.bossAbstiegPx) >= front.frontY

  const bossAbstiegPx = vorIhmStehtEtwas
    ? zustand.bossAbstiegPx
    : Math.min(BALANCE_V2.ende.bossMaxAbstiegPx, zustand.bossAbstiegPx + BALANCE_V2.ende.bossTempoPxProSek * sekunden)

  // Angegriffen wird der Boss nur von dem, was ihn auch erreicht: der eigenen
  // Flaeche, sobald sie an ihm steht.
  const bossVorrat = vorIhmStehtEtwas
    ? Math.max(0, zustand.bossVorrat - front.eigenerWert * BALANCE_V2.front.austauschProSek * sekunden)
    : zustand.bossVorrat

  // Er raeumt auch dann, wenn ihn der Rest nicht mehr aufhaelt.
  const geraeumt = bossY(zustand.bossAbstiegPx) >= front.frontY
    ? Math.min(front.eigenerWert, raeumtProBild)
    : 0
  const nachBoss = geraeumt > 0 ? { ...front, eigenerWert: Math.max(0, front.eigenerWert - geraeumt) } : front

  // Ganz vorn angekommen und nichts mehr davor: Jetzt nimmt er sich die Truppe.
  const truppenGroesse = !vorIhmStehtEtwas && bossAbstiegPx >= BALANCE_V2.ende.bossMaxAbstiegPx
    ? Math.max(0, zustand.truppenGroesse - BALANCE_V2.ende.bossSchlagkraftProSek * sekunden)
    : zustand.truppenGroesse

  return { ...zustand, front: nachBoss, bossVorrat, bossAbstiegPx, truppenGroesse }
}

export function ausgangFuer(zustand: EndeZustand): Ausgang | undefined {
  if (zustand.bossVorrat <= 0) return 'sieg'
  // Verloren ist erst, wenn der Boss ganz vorn steht UND die Truppe aufgerieben
  // hat. Blosses Ankommen genuegt nicht mehr - er muss sie erst wegraeumen.
  if (zustand.bossAbstiegPx >= BALANCE_V2.ende.bossMaxAbstiegPx && zustand.truppenGroesse <= 0) return 'niederlage'
  if (zustand.truppenGroesse <= 0 && zustand.front.eigenerWert <= 0) return 'niederlage'
  return undefined
}

/** Der Szenenzustand darf einen bereits angezeigten Ausgang nie ein zweites Mal melden. */
export function ausgangEinmal(ausgeloest: boolean, zustand: EndeZustand): Ausgang | undefined {
  return ausgeloest ? undefined : ausgangFuer(zustand)
}
