import { BALANCE } from '../config/balance'
import type { SafeAreaInsets } from './safeArea'

export interface WeaponRowLayout {
  /** Mitte der Beschriftung "STARTWAFFE". */
  readonly titelY: number
  /** Mitte der ERSTEN Kachelreihe; jede weitere liegt kachelHoehe + luecke tiefer. */
  readonly ersteReiheY: number
  readonly kachelBreite: number
  readonly kachelHoehe: number
  readonly luecke: number
  readonly reihen: number
  readonly proReihe: number
}

/**
 * WO DIE STARTWAFFEN-KACHELN LIEGEN - gerechnet, nicht gesetzt.
 *
 * DER FEHLER, DEN DAS BEHEBT (2026-08-25): Die Reihe stand auf einer festen Zahl
 * (`weaponRowY: 516`), zu der die obere Safe Area ADDIERT wurde. Der Knopf
 * "SPEICHERN & BEENDEN" haengt dagegen an der UNTEREN Safe Area. Auf einem iPhone
 * (oben rund 59, unten 34 Punkte) laufen beide aufeinander zu: Die zweite Kachelreihe
 * endete bei 660, der Knopf begann bei 626 - die zweite Reihe lag unter dem Knopf und
 * war nicht mehr antippbar. Am Schreibtisch (Insets 0) faellt das nie auf, weil dort
 * 178 px frei sind statt 85.
 *
 * Deshalb rechnet diese Funktion den freien Raum zwischen dem zweiten Kaufknopf und
 * "SPEICHERN & BEENDEN" aus und teilt ihn auf. Die Kachel wird nur so gross, wie sie
 * darf; passt sie nicht in voller Groesse, schrumpft sie, statt zu verschwinden.
 */
export function computeWeaponRowLayout(insets: SafeAreaInsets, hoehe: number): WeaponRowLayout {
  const ui = BALANCE.shop.ui
  // Unterkante des zweiten Kaufknopfes - dort beginnt der freie Raum.
  const knopfUnterkante = insets.top + ui.firstButtonY + 2 * ui.buttonHeight + ui.buttonGap
  // Oberkante von "SPEICHERN & BEENDEN" - dort endet er. Dieselbe Kette wie im Overlay.
  const weiterY = hoehe - insets.bottom - ui.continueBottomOffset
  const beendenOberkante = weiterY - ui.continueHeight - ui.quitGap - ui.quitHeight / 2

  const oben = knopfUnterkante + ui.weaponRowMargin + ui.weaponTitleHeight
  const frei = Math.max(0, beendenOberkante - ui.weaponRowMargin - oben)
  const reihen = ui.weaponRows
  const luecke = ui.weaponTileGap
  const kachelHoehe = Math.max(
    ui.weaponTileMinHeight,
    Math.min(ui.weaponTileHeight, Math.floor((frei - (reihen - 1) * luecke) / reihen)),
  )
  const reihenHoehe = reihen * kachelHoehe + (reihen - 1) * luecke
  // Rest mittig verteilen. Reicht der Platz nicht einmal fuer die Mindestgroesse, bleibt
  // der Wert 0 - die Reihe klebt dann am Kaufknopf, statt in den Knopf darunter zu rutschen.
  const ersteReiheY = oben + Math.max(0, (frei - reihenHoehe) / 2) + kachelHoehe / 2

  return {
    titelY: ersteReiheY - kachelHoehe / 2 - ui.weaponTitleHeight / 2,
    ersteReiheY,
    kachelBreite: ui.weaponTileWidth,
    kachelHoehe,
    luecke,
    reihen,
    proReihe: ui.weaponsPerRow,
  }
}
