import { BALANCE } from '../config/balance'

/** Nur noch Multiplikatoren: Die +1-Felder am Rand sind keine Tore, sondern Kacheln. */
export type TorWirkung = { readonly art: 'mal'; readonly faktor: 2 | 3 }
export type TorPaar = readonly [{ readonly seite: 'links'; readonly wirkung: TorWirkung; readonly startwert: number }, { readonly seite: 'rechts'; readonly wirkung: TorWirkung; readonly startwert: number }]

/** Der Faktor des einen, fest stehenden Tors in der Bahnmitte. */
export function torFaktorZiehen(zufall: () => number): 2 | 3 {
  return zufall() < BALANCE.torlauf.tor.malDreiAnteil ? 3 : 2
}


/**
 * Zieht ein Paar. BEIDE Haelften sind Multiplikatoren, und zwar mit verschiedenen
 * Faktoren: Der Strom laeuft mittig aus der Truppe nach vorn, also entscheidet die
 * Seite, auf der die Truppe steht, durch welches Tor er geht. Frueher standen hier
 * Pfeiler mit Minuswerten, die der Strom erst aufhacken musste - die gibt es im
 * Vorbild nicht (Thomas 2026-09-19).
 */
export function torPaarZiehen(zufall: () => number, _truppe: number, pxSeitLetztemMal = Number.POSITIVE_INFINITY): TorPaar {
  const tor = BALANCE.torlauf.tor
  const nahDran = pxSeitLetztemMal < tor.malMindestabstandPx
  // Steht das letzte Paar noch zu nah, faellt das schwaechere Tor auf x2 zurueck,
  // damit sich die Faktoren nicht in wenigen Metern aufschaukeln.
  const hoch: 2 | 3 = !nahDran && zufall() < tor.malDreiAnteil ? 3 : 2
  const niedrig: 2 | 3 = 2
  const hochLinks = zufall() < 0.5
  const links = { seite: 'links' as const, wirkung: { art: 'mal' as const, faktor: hochLinks ? hoch : niedrig }, startwert: 0 }
  const rechts = { seite: 'rechts' as const, wirkung: { art: 'mal' as const, faktor: hochLinks ? niedrig : hoch }, startwert: 0 }
  return [links, rechts]
}

export function getTorlaufStand(startwert: number, treffer: number, truppe: number): number {
  const tor = BALANCE.torlauf.tor
  const plusDeckel = Math.max(tor.plusMindest, Math.round(tor.plusAnteilRest * Math.max(0, BALANCE.torlauf.crowd.max - Math.max(0, truppe))))
  return Math.min(plusDeckel, startwert + Math.max(0, Math.floor(treffer)))
}
