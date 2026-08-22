import type { SceneryKind } from './sceneryLayout'

export const sceneryKinds: readonly SceneryKind[] = [
  { texture: 'scenery-tower-a', baseHeightPx: 150, baseWidthPx: 60, weight: 6, category: 'building' },
  { texture: 'scenery-tower-b', baseHeightPx: 120, baseWidthPx: 84, weight: 6, category: 'building' },
  { texture: 'scenery-tower-c', baseHeightPx: 185, baseWidthPx: 67 + 5 / 6, weight: 6, category: 'building' },
  { texture: 'scenery-oak', baseHeightPx: 54, baseWidthPx: 45, weight: 1, category: 'greenery' },
  { texture: 'scenery-conifer', baseHeightPx: 58, baseWidthPx: 116 / 3, weight: 1, category: 'greenery' },
  { texture: 'scenery-bush', baseHeightPx: 28, baseWidthPx: 4928 / 117, weight: 1, category: 'greenery' },
  { texture: 'scenery-stone', baseHeightPx: 22, baseWidthPx: 3872 / 117, weight: 1, category: 'greenery' },
]
