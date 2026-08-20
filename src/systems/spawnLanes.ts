export type SpawnLaneEnemy = {
  readonly lane: number
  readonly y: number
  readonly speedFactor: number
  readonly bodyWidth: number
  readonly bodyHeight: number
}

export type SpawnLaneType = Omit<SpawnLaneEnemy, 'lane' | 'y'>

type Interval = {
  readonly start: number
  readonly end: number
}

function canMeet(newEnemy: SpawnLaneEnemy, existingEnemy: SpawnLaneEnemy, height: number): boolean {
  const verticalDistance = existingEnemy.y - newEnemy.y
  const overlapDistance = (newEnemy.bodyHeight + existingEnemy.bodyHeight) / 2
  if (verticalDistance < overlapDistance) return true
  if (newEnemy.speedFactor <= existingEnemy.speedFactor) return false

  const catchUpTime = (verticalDistance - overlapDistance) / (newEnemy.speedFactor - existingEnemy.speedFactor)
  const exitTime = (height + existingEnemy.bodyHeight / 2 - existingEnemy.y) / existingEnemy.speedFactor
  return catchUpTime < exitTime
}

export function chooseSpawnLane(
  activeEnemies: readonly SpawnLaneEnemy[],
  newEnemy: SpawnLaneType & Pick<SpawnLaneEnemy, 'y'>,
  roadHalfWidthTop: number,
  height: number,
  random: () => number,
  safetyGap: number,
): number | undefined {
  const maxLane = Math.max(0, (roadHalfWidthTop - newEnemy.bodyWidth / 2) / roadHalfWidthTop)
  const blocked = activeEnemies
    .filter((enemy) => canMeet({ ...newEnemy, lane: 0 }, enemy, height))
    .map((enemy) => {
      const minimumLaneDistance = ((newEnemy.bodyWidth + enemy.bodyWidth) / 2 + safetyGap) / roadHalfWidthTop
      return {
        start: Math.max(-maxLane, enemy.lane - minimumLaneDistance),
        end: Math.min(maxLane, enemy.lane + minimumLaneDistance),
      }
    })
    .filter((interval) => interval.start < interval.end)
    .sort((left, right) => left.start - right.start)

  const allowed: Interval[] = []
  let cursor = -maxLane
  for (const interval of blocked) {
    if (interval.start > cursor) allowed.push({ start: cursor, end: interval.start })
    cursor = Math.max(cursor, interval.end)
  }
  if (cursor < maxLane) allowed.push({ start: cursor, end: maxLane })

  const totalLength = allowed.reduce((sum, interval) => sum + interval.end - interval.start, 0)
  if (totalLength <= 0) return undefined

  let offset = Math.min(Math.max(random(), 0), 0.9999999999999999) * totalLength
  for (const interval of allowed) {
    const length = interval.end - interval.start
    if (offset < length) return interval.start + offset
    offset -= length
  }
  return allowed[allowed.length - 1].end
}
