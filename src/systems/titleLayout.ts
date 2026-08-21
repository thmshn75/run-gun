import type { SafeAreaInsets } from './safeArea'

export interface TitleLayout {
  title: { top: number; height: number }
  startButton: { top: number; height: number }
}

const TITLE_TOP_OFFSET = 25
const TITLE_HEIGHT = 46
const START_BUTTON_BOTTOM_OFFSET = 20
const START_BUTTON_HEIGHT = 54

// The title and start button deliberately use opposite safe-area edges.
// This prevents the iPhone-only overlap caused by sharing a mixed anchor.
export function computeTitleLayout(height: number, insets: SafeAreaInsets): TitleLayout {
  return {
    title: { top: insets.top + TITLE_TOP_OFFSET, height: TITLE_HEIGHT },
    startButton: {
      top: height - insets.bottom - START_BUTTON_BOTTOM_OFFSET - START_BUTTON_HEIGHT,
      height: START_BUTTON_HEIGHT,
    },
  }
}
