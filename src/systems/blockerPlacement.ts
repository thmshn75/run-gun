export type BlockerPlacement = Readonly<{
  centerOffset: number
  width: number
  passageWidth: number
}>

// This deliberately has no Phaser import: tests can prove the road-edge and bypass
// guarantees independently of the rendering and physics layer.
export function computeBlockerPlacement(roadHalfWidth: number, minGapPx: number, rng: () => number): BlockerPlacement {
  const safeHalfWidth = Math.max(0, roadHalfWidth)
  const roadWidth = safeHalfWidth * 2
  const maxBlockerWidth = Math.max(0, roadWidth - minGapPx)
  const width = maxBlockerWidth * (0.55 + 0.3 * rng())
  const side = rng() < 0.5 ? -1 : 1

  return {
    centerOffset: side * (safeHalfWidth - width / 2),
    width,
    passageWidth: roadWidth - width,
  }
}
