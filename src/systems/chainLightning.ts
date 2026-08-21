export type ChainLightningTarget = Readonly<{
  id: number
  x: number
  y: number
}>

// This selects damage recipients only. Rendering and projectile allocation stay out of the
// chain, so every jump is guaranteed to be pure radius damage rather than a new projectile.
export function selectChainLightningTargets(
  sourceId: number,
  sourceX: number,
  sourceY: number,
  candidates: readonly ChainLightningTarget[],
  radiusPx: number,
  chainCount: number,
): ChainLightningTarget[] {
  const radiusSquared = radiusPx * radiusPx
  const seen = new Set<number>([sourceId])
  return candidates
    .filter((candidate) => {
      const dx = candidate.x - sourceX
      const dy = candidate.y - sourceY
      return !seen.has(candidate.id) && dx * dx + dy * dy <= radiusSquared && (seen.add(candidate.id), true)
    })
    .sort((left, right) => (
      (left.x - sourceX) ** 2 + (left.y - sourceY) ** 2
      - ((right.x - sourceX) ** 2 + (right.y - sourceY) ** 2)
    ))
    .slice(0, chainCount)
}
