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
 * Startwert eines Tores - immer negativ, und als ANTEIL DER TRUPPE gerechnet
 * (Thomas 2026-09-05: "man muss das halt dann an die teamgroesse und schwierigkeit
 * anpassen"). `zufall` ist eine Zahl in [0, 1).
 *
 * Weil die Trefferrate ebenfalls mit der Truppe waechst, bleibt die Zeit bis zur Null
 * dabei konstant; was waechst, ist der Einsatz. Herleitung bei BALANCE.versuch.tor.
 */
export function getTorStartwert(zufall: number, truppe: number): number {
  const { startAnteilMin, startAnteilMax, startMindest } = BALANCE.versuch.tor
  const sicher = Math.min(Math.max(zufall, 0), 0.9999999999999999)
  const anteil = startAnteilMin + sicher * (startAnteilMax - startAnteilMin)
  return -Math.max(startMindest, Math.round(anteil * Math.max(1, truppe)))
}

/** Wie weit ein Tor ins Plus laufen kann - ebenfalls an der Truppe gemessen. */
export function getTorPlusDeckel(truppe: number): number {
  const { plusAnteil, plusMindest } = BALANCE.versuch.tor
  return Math.max(plusMindest, Math.round(plusAnteil * Math.max(1, truppe)))
}

/**
 * Der Stand eines Tores nach `treffer` Treffern - EIN TREFFER IST EIN PUNKT
 * (Thomas 2026-09-05: "jeder treffer eine punkt +").
 *
 * Zwei Grenzen, die beide gebraucht werden: Nach unten faellt er nie unter den
 * Startwert (ein unbeschossenes Tor kostet genau das, was draufsteht), nach oben endet
 * er bei plusMax - ohne diesen Deckel waere Draufhalten bis zum Anflug immer richtig
 * und die Entscheidung wieder weg.
 */
export function getTorStand(startwert: number, treffer: number, truppe: number): number {
  return Math.min(getTorPlusDeckel(truppe), startwert + Math.max(0, Math.floor(treffer)))
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

/**
 * Wie viele TREFFER ein Fass aushaelt - auch hier zaehlt die Kugel, nicht der Schaden
 * (Thomas 2026-09-05: "zerschiessen jeder treffer ein punkt"). Eine feste Zahl also,
 * keine aus der Feuerkraft abgeleitete: Genau darin besteht die Aenderung.
 */
export function getFassTreffer(truppe: number, schussProSek: number): number {
  const { zielSekunden, trefferJeFigurUndSchuss, trefferMindest } = BALANCE.versuch.fass
  const trefferProSek = Math.max(1, truppe) * Math.max(0.1, schussProSek) * trefferJeFigurUndSchuss
  return Math.max(trefferMindest, Math.round(trefferProSek * zielSekunden))
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
export function getRollBild(streckePx: number, umfangPx: number = BALANCE.versuch.fass.umfangPx): number {
  const { bilder } = BALANCE.versuch.fass
  const phase = Math.floor((streckePx / Math.max(1, umfangPx)) * bilder)
  return (bilder - 1) - (((phase % bilder) + bilder) % bilder)
}

/**
 * Der Umfang, mit dem das Fass abrollen muss, damit es nicht rutscht: Kreisumfang seiner
 * TATSAECHLICHEN Anzeigegroesse. Fest gesetzt war er vorher an der Nenngroesse - sobald
 * das Fass perspektivisch kleiner gezeichnet wird, dreht es sich dann zu langsam, und
 * genau das liest sich als Rutschen statt als Rollen.
 */
export function getRollUmfang(durchmesserPx: number): number {
  return Math.max(1, Math.PI * durchmesserPx)
}

