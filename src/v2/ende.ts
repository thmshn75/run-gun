import { BALANCE_V2 } from './balanceV2'
import { aktualisiereFront, frontYAusVorrat, type FrontZustand } from './front'

export type Ausgang = 'sieg' | 'niederlage'
export type EndeZustand = Readonly<{
  front: FrontZustand
  bossVorrat: number
  truppenGroesse: number
  bossAbstiegPx: number
  hordeVorstossPx: number
}>

export function endeStartZustand(front: FrontZustand, truppenGroesse = BALANCE_V2.truppe.startGroesse): EndeZustand {
  return { front, bossVorrat: BALANCE_V2.ende.bossStartVorrat, truppenGroesse, bossAbstiegPx: 0, hordeVorstossPx: 0 }
}

/** Wo der Boss gerade steht. */
export function bossY(bossAbstiegPx: number): number {
  return BALANCE_V2.track.horizonY + bossAbstiegPx
}

/** Ist die Horde besiegt? Erst dann betritt der Boss die Bahn. */
export function hordeBesiegt(front: FrontZustand): boolean {
  return front.vorrat <= 0
}

/**
 * Zwei Abschnitte, klar getrennt:
 *
 * 1. Die HORDE kommt - allein, ohne ihren Boss. Sie rueckt mit festem Tempo vor.
 *    Die eigene Flaeche haelt sie auf, indem sie sie aufreibt. Erreicht die Horde
 *    die Truppe, ist das Spiel verloren. Das ist die Uhr dieses Abschnitts.
 *
 * 2. Ist die Horde aufgerieben, kommt der BOSS - und erst jetzt laeuft er los.
 *    Er bleibt vor der eigenen Flaeche stehen und muss sie wegraeumen, waehrend
 *    sie ihm Vorrat abnimmt. Kommt er durch, nimmt er sich die Truppe.
 */
export function aktualisiereEnde(zustand: EndeZustand, dtMs: number): EndeZustand {
  const sekunden = Math.max(0, dtMs) / 1000
  const gerechnet = zustand.front.vorrat > 0 ? aktualisiereFront(zustand.front, dtMs) : zustand.front

  // Abschnitt 1: Die Horde marschiert, solange sie lebt.
  const hordeVorstossPx = gerechnet.vorrat > 0
    ? Math.min(BALANCE_V2.front.hordeMaxVorstossPx, zustand.hordeVorstossPx + BALANCE_V2.front.hordeTempoPxProSek * sekunden)
    : zustand.hordeVorstossPx
  // frontY wird IMMER neu aus dem Vorrat gerechnet, nie auf den alten Wert
  // addiert. Sonst schaukelt sich der Vorstoss auf: Bei leerer Horde reicht
  // aktualisiereFront den Zustand unveraendert durch, und der Aufschlag kaeme in
  // jedem Bild erneut dazu - die Linie rutscht aus dem Bild, der Boss trifft nie
  // auf die eigene Flaeche und die waechst ungebremst weiter.
  const front = { ...gerechnet, frontY: frontYAusVorrat(gerechnet.vorrat) + hordeVorstossPx }

  // Abschnitt 2: Solange die Horde lebt, geht der Boss an ihrem hinteren Ende mit
  // nach unten - sichtbar, aber langsamer als sie, sodass der Abstand waechst.
  // Er greift in dieser Zeit nicht ein.
  if (!hordeBesiegt(front)) {
    const mitgewandert = hordeVorstossPx * BALANCE_V2.ende.bossFolgtHordeAnteil
    return { ...zustand, front, hordeVorstossPx, bossAbstiegPx: mitgewandert }
  }

  // Der Boss stand hinter seiner Horde. Faellt sie, steht er an ihrer Stelle -
  // er faengt also nicht wieder am Horizont an, sondern dort, wo sie zuletzt war.
  const bossStart = Math.max(zustand.bossAbstiegPx, hordeVorstossPx)
  const raeumtProBild = BALANCE_V2.ende.bossSchlagkraftProSek * sekunden
  const vorIhmStehtEtwas = front.eigenerWert > raeumtProBild && bossY(bossStart) >= front.frontY
  const bossAbstiegPx = vorIhmStehtEtwas
    ? bossStart
    : Math.min(BALANCE_V2.ende.bossMaxAbstiegPx, bossStart + BALANCE_V2.ende.bossTempoPxProSek * sekunden)

  const bossVorrat = vorIhmStehtEtwas
    ? Math.max(0, zustand.bossVorrat - front.eigenerWert * BALANCE_V2.front.austauschProSek * sekunden)
    : zustand.bossVorrat

  const geraeumt = bossY(bossStart) >= front.frontY ? Math.min(front.eigenerWert, raeumtProBild) : 0
  const nachBoss = geraeumt > 0 ? { ...front, eigenerWert: Math.max(0, front.eigenerWert - geraeumt) } : front

  const truppenGroesse = !vorIhmStehtEtwas && bossAbstiegPx >= BALANCE_V2.ende.bossMaxAbstiegPx
    ? Math.max(0, zustand.truppenGroesse - BALANCE_V2.ende.bossSchlagkraftProSek * sekunden)
    : zustand.truppenGroesse

  return { ...zustand, front: nachBoss, bossVorrat, bossAbstiegPx, hordeVorstossPx, truppenGroesse }
}

export function ausgangFuer(zustand: EndeZustand): Ausgang | undefined {
  if (zustand.bossVorrat <= 0) return 'sieg'
  // Abschnitt 1 geht verloren, wenn die Horde die Truppe erreicht.
  if (zustand.hordeVorstossPx >= BALANCE_V2.front.hordeMaxVorstossPx && zustand.front.vorrat > 0) return 'niederlage'
  // Abschnitt 2 geht verloren, wenn der Boss durchkommt und die Truppe aufreibt.
  if (zustand.bossAbstiegPx >= BALANCE_V2.ende.bossMaxAbstiegPx && zustand.truppenGroesse <= 0) return 'niederlage'
  if (zustand.truppenGroesse <= 0 && zustand.front.eigenerWert <= 0) return 'niederlage'
  return undefined
}

/** Der Szenenzustand darf einen bereits angezeigten Ausgang nie ein zweites Mal melden. */
export function ausgangEinmal(ausgeloest: boolean, zustand: EndeZustand): Ausgang | undefined {
  return ausgeloest ? undefined : ausgangFuer(zustand)
}
