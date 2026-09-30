import type { SafeAreaInsets } from './safeArea'

export interface TitleLayout {
  title: { top: number; height: number }
  standardButton: { top: number; height: number }
  threeDButton: { top: number; height: number }
}

const TITLE_TOP_OFFSET = 25
const TITLE_HEIGHT = 46
const BUTTON_BOTTOM_OFFSET = 20
const BUTTON_HEIGHT = 56
const BUTTON_GAP = 12

// The title and buttons deliberately use opposite safe-area edges.
// This prevents the iPhone-only overlap caused by sharing a mixed anchor.
export function computeTitleLayout(height: number, insets: SafeAreaInsets): TitleLayout {
  return {
    title: { top: insets.top + TITLE_TOP_OFFSET, height: TITLE_HEIGHT },
    standardButton: {
      top: height - insets.bottom - BUTTON_BOTTOM_OFFSET - 2 * BUTTON_HEIGHT - BUTTON_GAP,
      height: BUTTON_HEIGHT,
    },
    threeDButton: {
      top: height - insets.bottom - BUTTON_BOTTOM_OFFSET - BUTTON_HEIGHT,
      height: BUTTON_HEIGHT,
    },
  }
}
