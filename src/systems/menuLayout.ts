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
  playButton: VerticalBounds
}

const TITLE_HEIGHT = 46
const BALANCE_HEIGHT = 28
const SCORE_TITLE_HEIGHT = 26
const SCORE_LINE_HEIGHT = 21
const RESET_BUTTON_HEIGHT = 36
const FOOTER_GAP = 12
const PLAY_BUTTON_HEIGHT = 54

// This function owns the vertical menu stack. In particular, footer items are
// anchored from the lower safe-area edge so they cannot collide on iPhones.
export function computeMenuLayout(height: number, insets: SafeAreaInsets, scoreLines: number): MenuLayout {
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

  return {
    title: { top: insets.top + 25, height: TITLE_HEIGHT },
    balance: { top: insets.top + 86, height: BALANCE_HEIGHT },
    scoresTitle,
    scoreLines: Array.from({ length: visibleScoreLines }, (_value, index) => ({
      top: scoreLineStart + index * SCORE_LINE_HEIGHT,
      height: SCORE_LINE_HEIGHT,
    })),
    resetButton: { top: playButton.top - FOOTER_GAP - RESET_BUTTON_HEIGHT, height: RESET_BUTTON_HEIGHT },
    playButton,
  }
}
