import { BALANCE } from '../config/balance'

export type WeltThema = 'stadt' | 'bruecke'

/**
 * Kulisse eines Levels (2026-09-03). Reine Funktion ohne Phaser, damit die
 * Themenwahl ohne laufendes Spiel pruefbar ist.
 *
 * Der Schalter steht in BALANCE.welt.thema und traegt genau die beiden Moeglichkeiten,
 * zwischen denen Thomas nach dem iPhone-Test entscheidet: durchgehend eine Optik
 * ('stadt' oder 'bruecke') oder abwechselnd ('wechsel'). Es gibt bewusst keinen
 * Zufall - ein Level muss bei jedem Anlauf gleich aussehen, sonst laesst sich nicht
 * beurteilen, ob der Wechsel gefaellt.
 */
export function getWeltThema(level: number, istTestgelaende: boolean = false): WeltThema {
  // Das Testgelaende hat ein festes Thema: Dort werden neue Sachen geprueft, und welches
  // Thema seine Levelnummer nach der Wechselregel traefe, waere Zufall.
  if (istTestgelaende) return BALANCE.testground.thema
  const { thema, wechselAlleLevel, ersteBruecke } = BALANCE.welt
  if (thema === 'stadt' || thema === 'bruecke') return thema
  const sicheresLevel = Math.max(1, Math.floor(level))
  const laenge = Math.max(1, Math.floor(wechselAlleLevel))
  // Abschnitte ab dem ersten Brueckenlevel durchzaehlen: Alles davor bleibt Stadt,
  // danach loesen sich Abschnitte gleicher Laenge ab.
  if (sicheresLevel < ersteBruecke) return 'stadt'
  const abschnitt = Math.floor((sicheresLevel - ersteBruecke) / laenge)
  return abschnitt % 2 === 0 ? 'bruecke' : 'stadt'
}
