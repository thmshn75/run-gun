import { BALANCE } from '../config/balance'

export type TorWirkung = { readonly art: 'plus' } | { readonly art: 'mal'; readonly faktor: 2 | 3 }
export type TorPaar = readonly [{ readonly seite: 'links'; readonly wirkung: TorWirkung; readonly startwert: number }, { readonly seite: 'rechts'; readonly wirkung: TorWirkung; readonly startwert: number }]

function startwert(zufall: number, _truppe: number): number {
  const tor = BALANCE.torlauf.tor
  const sicher = Math.min(Math.max(zufall, 0), 0.9999999999999999)
  // Im Torlauf ist die Feuerlinie immer gleich: Acht Schuetzen rotieren ueber die
  // Truppe, daher geht ihre Groesse bewusst nicht in den Startwert ein.
  const feuerlinie = BALANCE.crowd.max
  return -Math.max(tor.startMindest, Math.round((tor.startAnteilMin + sicher * (tor.startAnteilMax - tor.startAnteilMin)) * feuerlinie))
}

/** Zieht ein Paar; beide Seiten sind absichtlich erst hier und nicht im Phaser-Pool entschieden. */
export function torPaarZiehen(zufall: () => number, truppe: number, pxSeitLetztemMal = Number.POSITIVE_INFINITY): TorPaar {
  const mal = pxSeitLetztemMal >= BALANCE.torlauf.tor.malMindestabstandPx && zufall() < BALANCE.torlauf.tor.malChance
  const linksStart = startwert(zufall(), truppe)
  let rechtsStart = startwert(zufall(), truppe)
  if (!mal && rechtsStart === linksStart) rechtsStart = linksStart - 1
  const plus: TorWirkung = { art: 'plus' }
  const faktor: 2 | 3 = zufall() < BALANCE.torlauf.tor.malDreiAnteil ? 3 : 2
  const links = mal && zufall() < 0.5 ? { seite: 'links' as const, wirkung: { art: 'mal' as const, faktor }, startwert: linksStart } : { seite: 'links' as const, wirkung: plus, startwert: linksStart }
  const rechts = mal && links.wirkung.art === 'plus' ? { seite: 'rechts' as const, wirkung: { art: 'mal' as const, faktor }, startwert: rechtsStart } : { seite: 'rechts' as const, wirkung: plus, startwert: rechtsStart }
  return [links, rechts]
}

export function getTorlaufStand(startwert: number, treffer: number, truppe: number): number {
  const tor = BALANCE.torlauf.tor
  const plusDeckel = Math.max(tor.plusMindest, Math.round(tor.plusAnteilRest * Math.max(0, BALANCE.torlauf.crowd.max - Math.max(0, truppe))))
  return Math.min(plusDeckel, startwert + Math.max(0, Math.floor(treffer)))
}
