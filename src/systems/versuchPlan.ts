import { BALANCE } from '../config/balance'
import type { WeaponKey } from './weapons'

// ===========================================================================
// REINE RECHENLOGIK DES VERSUCHS "ZWEI BAHNEN" (nur Testgelaende).
//
// Getrennt von versuchBahnen.ts, weil DIESE Datei kein Phaser zieht: Phaser braucht beim
// Laden ein DOM, und ohne die Trennung liesse sich keine dieser Groessen im Test
// nachrechnen. Dasselbe Muster wie wallPlan.ts neben walls.ts.
// ===========================================================================

export type FassInhalt = 'weapon' | 'damage' | 'rate'

// ---------------------------------------------------------------------------
// REINE RECHENLOGIK - ohne Phaser, damit sie ohne Renderer pruefbar ist.
// ---------------------------------------------------------------------------

/**
 * Was ein Punkt auf dem Torzaehler an Schaden kostet.
 *
 * Der Zaehler ist eine FIGURENZAHL, keine Lebenspunkte. Wuerde jeder Treffer ihn um 1
 * heben, waere ein "-12" bei 40-50 Treffern je Sekunde in einer Viertelsekunde weg.
 * Stattdessen kostet ein Punkt den Schaden, den die Truppe in 1/punkteProSek Sekunden
 * an der Kachel anrichtet - die Zeit bis zur Null ist damit gerechnet statt geraten und
 * skaliert von selbst mit Waffe, Truppe und Level.
 */
export function getSchadenProPunkt(dpsAnDerKachel: number): number {
  return Math.max(0.0001, dpsAnDerKachel) / BALANCE.versuch.tor.punkteProSek
}

/** Startwert eines Tores. Immer negativ; `zufall` ist eine Zahl in [0, 1). */
export function getTorStartwert(zufall: number): number {
  const { startMin, startMax } = BALANCE.versuch.tor
  const spanne = startMax - startMin
  return -(startMin + Math.floor(Math.min(Math.max(zufall, 0), 0.9999999999999999) * (spanne + 1)))
}

/**
 * Der Stand eines Tores nach `schadenssumme` angerichtetem Schaden.
 *
 * Zwei Grenzen, die beide gebraucht werden: Nach unten faellt er nie unter den
 * Startwert (ein unbeschossenes Tor kostet genau das, was draufsteht), nach oben endet
 * er bei plusMax - ohne diesen Deckel waere Draufhalten bis zum Anflug immer richtig
 * und die Entscheidung wieder weg.
 */
export function getTorStand(startwert: number, schadenssumme: number, schadenProPunkt: number): number {
  const punkte = Math.floor(Math.max(0, schadenssumme) / schadenProPunkt)
  return Math.min(BALANCE.versuch.tor.plusMax, startwert + punkte)
}

/**
 * Die Truppe nach dem Durchfahren eines Tores.
 *
 * NIE UNTER EINE FIGUR: Ohne diese Grenze beendet ein einziges verpasstes Tor den Lauf,
 * und die Truppe kann sich nicht mehr freischiessen - der Versuch waere dann nicht mehr
 * beurteilbar, sondern nur noch hart.
 */
export function getTruppeNachTor(aktuell: number, stand: number): number {
  return Math.max(1, aktuell + stand)
}

/**
 * Haelt das Fass auf dieser Hoehe an? Einmal angehalten, bleibt es angehalten - es
 * rutscht auch dann nicht weiter, wenn die Strasse unter ihm laeuft. Genau das ist der
 * Unterschied zur Wand: "stehende Gebilde, die nicht weiterlaufen, wenn ich nicht drauf
 * schiesse" (Thomas 2026-09-05).
 */
export function haeltJetzt(centerY: number, halteY: number, haeltSchon: boolean): boolean {
  return haeltSchon || centerY >= halteY
}

/** Lebenspunkte eines Fasses: so viele, wie `fokusSec` konzentriertes Feuer anrichtet. */
export function getFassLebenspunkte(dpsAnDerKachel: number): number {
  return Math.max(1, Math.round(Math.max(0.0001, dpsAnDerKachel) * BALANCE.versuch.fass.fokusSec))
}

/**
 * Die Waffenreihe der Faesser - AUFSTEIGEND NACH STAERKE (Thomas 2026-09-05: "die
 * waffen in einer logischen reihenfolge nach staerke").
 *
 * Die Reihenfolge wird nicht erfunden, sondern aus der Staffelung des Spiels abgeleitet
 * (BALANCE.weapon[].minLevel) - dieselbe Ordnung, die WEAPON_KEYS in weapons.ts fuehrt.
 * Aus weapons.ts geholt wird sie NICHT: Die Datei zieht Phaser mit, und dann waere hier
 * nichts mehr ohne DOM pruefbar.
 *
 * Die Levelsperre gilt hier NICHT: Im Testgelaende sind ohnehin alle Waffen waehlbar
 * (GameScene, Waffenwechsel-Knopf), und der Sinn des Versuchs ist die Bahn, nicht die
 * Freischaltung.
 */
export const VERSUCH_WAFFENREIHE: readonly WeaponKey[] = ((Object.keys(BALANCE.weapon) as string[])
  .filter((key) => {
    const eintrag = (BALANCE.weapon as Record<string, unknown>)[key]
    return typeof eintrag === 'object' && eintrag !== null && 'minLevel' in eintrag
  }) as WeaponKey[])
  // AUSDRUECKLICH SORTIERT, nicht uebernommen: In BALANCE.weapon stehen die Waffen in
  // der Reihenfolge, in der sie ins Spiel kamen (1, 2, 3, 18, 11, 5, …), nicht in der
  // ihrer Staffelung. Nur weapons.ts fuehrt sie sortiert - und die Datei zieht Phaser.
  .sort((links, rechts) => (BALANCE.weapon[links] as { minLevel: number }).minLevel
    - (BALANCE.weapon[rechts] as { minLevel: number }).minLevel)

/**
 * Was im `index`-ten Fass steckt. Fester Zyklus, kein Zufall: Waffe, DMG, RATE, Waffe, …
 * Damit ist die Reihe vorhersehbar - genau das macht sie als Aufstiegsleiter lesbar.
 */
export function getFassInhalt(index: number): FassInhalt {
  const rest = ((index % 3) + 3) % 3
  return rest === 0 ? 'weapon' : rest === 1 ? 'damage' : 'rate'
}

/** Welche Waffe im `waffenIndex`-ten Waffenfass steckt - der Reihe nach, aufsteigend. */
export function getFassWaffe(waffenIndex: number): WeaponKey {
  const laenge = VERSUCH_WAFFENREIHE.length
  return VERSUCH_WAFFENREIHE[((waffenIndex % laenge) + laenge) % laenge]
}

/**
 * Das Bild der Rollbildfolge zu einer gefahrenen Strecke.
 *
 * RUECKWAERTS abgespielt, und das ist kein Detail: Das Fass steht still, waehrend die
 * Strasse unter ihm auf den Betrachter zulaeuft. Relativ zur Strasse rollt es also VON
 * uns WEG, das Muster wandert nach oben. Vorwaerts abgespielt saehe es aus, als rutsche
 * das Fass - und genau der Eindruck soll ja verschwinden (Thomas 2026-09-05: "wenn die
 * Strasse darunter scrollt sieht es bloed aus").
 */
export function getRollBild(streckePx: number): number {
  const { umfangPx, bilder } = BALANCE.versuch.fass
  const phase = Math.floor((streckePx / umfangPx) * bilder)
  return (bilder - 1) - (((phase % bilder) + bilder) % bilder)
}

