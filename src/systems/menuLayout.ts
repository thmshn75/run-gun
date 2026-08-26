import type { SafeAreaInsets } from './safeArea'

export interface VerticalBounds {
  top: number
  height: number
}

export interface MenuLayout {
  title: VerticalBounds
  balance: VerticalBounds
  scoresTitle: VerticalBounds
  scoreLines: VerticalBounds[]
  /**
   * FORTSCHRITT ZURUECKHOLEN nach einem versehentlichen Zuruecksetzen (2026-08-26).
   * Nur belegt, wenn es etwas zurueckzuholen gibt - sonst Hoehe 0.
   *
   * Er steht an der Stelle, an der bis zum 2026-08-26 ZURUECKSETZEN stand. Der ist aus
   * dem Menue verschwunden: Benni ist dort unabsichtlich hineingeraten.
   */
  restoreButton: VerticalBounds
  /** Fuehrt in die eigene Ansicht der dauerhaften Aufwertungen (E4). */
  shopButton: VerticalBounds
  /** Fuehrt ins Testgelaende, in dem jede Waffe ohne Risiko auszuprobieren ist. */
  testButton: VerticalBounds
  playButton: VerticalBounds
  /** Nur belegt, wenn ein angefangener Run vorliegt (B3). */
  continueButton: VerticalBounds
}

const TITLE_HEIGHT = 46
const BALANCE_HEIGHT = 28
const SCORE_TITLE_HEIGHT = 26
const SCORE_LINE_HEIGHT = 21
const RESTORE_BUTTON_HEIGHT = 44
const TEST_BUTTON_HEIGHT = 36
const SHOP_BUTTON_HEIGHT = 44
const FOOTER_GAP = 12
const PLAY_BUTTON_HEIGHT = 54
const CONTINUE_BUTTON_HEIGHT = 54

// This function owns the vertical menu stack. In particular, footer items are
// anchored from the lower safe-area edge so they cannot collide on iPhones.
export function computeMenuLayout(
  height: number,
  insets: SafeAreaInsets,
  scoreLines: number,
  hasOpenRun = false,
  hasRestorableSave = false,
): MenuLayout {
  // Der Upgrade-Shop ist am 2026-08-23 entfallen (Thomas: "Den Shop kannst du
  // streichen"). Die Bestenliste rueckt an seine Stelle, damit das Menue nicht mit
  // einer Luecke oeffnet.
  const scoresTitle = { top: insets.top + 150, height: SCORE_TITLE_HEIGHT }
  const visibleScoreLines = Math.max(1, scoreLines)
  const scoreLineStart = scoresTitle.top + scoresTitle.height + 4
  const playButton = {
    top: height - insets.bottom - 20 - PLAY_BUTTON_HEIGHT,
    height: PLAY_BUTTON_HEIGHT,
  }

  // FORTSETZEN sitzt ueber SPIELEN und schiebt ZURUECKSETZEN nach oben. Liegt kein
  // angefangener Run vor, bleibt der Platz leer statt die Knoepfe wandern zu lassen -
  // eine Schaltflaeche, die je nach Spielstand ihre Position wechselt, ist fuer ein Kind
  // schwerer zu treffen als eine, die immer dort ist.
  const continueButton = {
    top: playButton.top - FOOTER_GAP - CONTINUE_BUTTON_HEIGHT,
    height: hasOpenRun ? CONTINUE_BUTTON_HEIGHT : 0,
  }
  // SHOP sitzt ueber FORTSETZEN/SPIELEN und schiebt ZURUECKSETZEN weiter nach oben.
  // Er bekommt einen EIGENEN Slot, statt sich einen zu teilen: menuLayout kennt sonst
  // sechs Bloecke ohne Reserve, und zwei Linien a fuenf Stufen passen dort nicht
  // dazwischen - deshalb liegen die Aufwertungen in einer eigenen Ansicht und hier steht
  // nur die Tuer dorthin.
  const shopButton = {
    top: (hasOpenRun ? continueButton.top : playButton.top) - FOOTER_GAP - SHOP_BUTTON_HEIGHT,
    height: SHOP_BUTTON_HEIGHT,
  }
  // TESTGELAENDE sitzt zwischen SHOP und ZURUECKSETZEN: Es ist kein Spielmodus, den man
  // aus Versehen starten soll, aber auch nichts Verstecktes - Benni soll es finden.
  const testButton = {
    top: shopButton.top - FOOTER_GAP - TEST_BUTTON_HEIGHT,
    height: TEST_BUTTON_HEIGHT,
  }
  const restoreTop = testButton.top - FOOTER_GAP - RESTORE_BUTTON_HEIGHT

  return {
    title: { top: insets.top + 25, height: TITLE_HEIGHT },
    balance: { top: insets.top + 86, height: BALANCE_HEIGHT },
    scoresTitle,
    scoreLines: Array.from({ length: visibleScoreLines }, (_value, index) => ({
      top: scoreLineStart + index * SCORE_LINE_HEIGHT,
      height: SCORE_LINE_HEIGHT,
    })),
    restoreButton: { top: restoreTop, height: hasRestorableSave ? RESTORE_BUTTON_HEIGHT : 0 },
    shopButton,
    testButton,
    playButton,
    continueButton,
  }
}
