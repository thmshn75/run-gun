import type { SceneryKind } from './sceneryLayout'

export const sceneryKinds: readonly SceneryKind[] = [
  { texture: 'scenery-tower-a', baseHeightPx: 150, baseWidthPx: 60, weight: 3 },
  { texture: 'scenery-tower-b', baseHeightPx: 120, baseWidthPx: 84, weight: 3 },
  { texture: 'scenery-tower-c', baseHeightPx: 185, baseWidthPx: 67 + 5 / 6, weight: 3 },
  { texture: 'scenery-oak', baseHeightPx: 54, baseWidthPx: 45, weight: 2 },
  { texture: 'scenery-conifer', baseHeightPx: 58, baseWidthPx: 116 / 3, weight: 2 },
  { texture: 'scenery-bush', baseHeightPx: 28, baseWidthPx: 4928 / 117, weight: 1 },
  { texture: 'scenery-stone', baseHeightPx: 22, baseWidthPx: 3872 / 117, weight: 1 },
  { texture: 'scenery-cottage', baseHeightPx: 36, baseWidthPx: 6336 / 117, weight: 1 },
]
