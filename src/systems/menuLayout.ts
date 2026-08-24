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
  resetButton: VerticalBounds
  /** Fuehrt in die eigene Ansicht der dauerhaften Aufwertungen (E4). */
  shopButton: VerticalBounds
  playButton: VerticalBounds
  /** Nur belegt, wenn ein angefangener Run vorliegt (B3). */
  continueButton: VerticalBounds
}

const TITLE_HEIGHT = 46
const BALANCE_HEIGHT = 28
const SCORE_TITLE_HEIGHT = 26
const SCORE_LINE_HEIGHT = 21
const RESET_BUTTON_HEIGHT = 36
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
  const resetTop = shopButton.top - FOOTER_GAP - RESET_BUTTON_HEIGHT

  return {
    title: { top: insets.top + 25, height: TITLE_HEIGHT },
    balance: { top: insets.top + 86, height: BALANCE_HEIGHT },
    scoresTitle,
    scoreLines: Array.from({ length: visibleScoreLines }, (_value, index) => ({
      top: scoreLineStart + index * SCORE_LINE_HEIGHT,
      height: SCORE_LINE_HEIGHT,
    })),
    resetButton: { top: resetTop, height: RESET_BUTTON_HEIGHT },
    shopButton,
    playButton,
    continueButton,
  }
}
