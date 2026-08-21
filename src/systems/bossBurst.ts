export function getBurstOffsets(burstCount: number, burstSpreadPx: number): number[] {
  if (burstCount <= 1) return [0]
  const startOffsetX = -burstSpreadPx / 2
  const stepX = burstSpreadPx / (burstCount - 1)
  return Array.from({ length: burstCount }, (_, index) => startOffsetX + stepX * index)
}
