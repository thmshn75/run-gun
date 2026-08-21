import { getScrollProgressDelta, getScrollY } from './roadGeometry'
import {
  getSceneryPlacement,
  getScenerySpawnIntervalMs,
  isSceneryOutsideViewport,
  pickSceneryKind,
  type SceneryKind,
  type ScenerySide,
} from './sceneryLayout'
import { BALANCE } from '../config/balance'

type SimulatedSceneryObject = {
  active: boolean
  side: ScenerySide
  kind: SceneryKind
  randomDistance: number
  progress: number
}

export type ScenerySimulationResult = Readonly<{
  maxActive: number
  failedSpawns: number
  recycledCount: number
  activeObjectCount: number
}>

export function simulateSceneryPool(
  kinds: readonly SceneryKind[],
  rng: () => number,
  width: number,
  height: number,
  poolSize: number,
  durationMs: number,
  dt: number,
  spawnDurationMs = durationMs,
): ScenerySimulationResult {
  const objects: SimulatedSceneryObject[] = Array.from(
    { length: poolSize },
    () => ({ active: false, side: 'left', kind: kinds[0], randomDistance: 0, progress: 0 }),
  )
  let leftSpawnRemainingMs = getScenerySpawnIntervalMs(rng)
  let rightSpawnRemainingMs = getScenerySpawnIntervalMs(rng)
  let maxActive = 0
  let failedSpawns = 0
  let recycledCount = 0

  const spawn = (side: ScenerySide): void => {
    const object = objects.find((candidate) => !candidate.active)
    if (object === undefined) {
      failedSpawns += 1
      return
    }
    object.active = true
    object.side = side
    object.kind = pickSceneryKind(kinds, rng)
    object.randomDistance = rng()
    object.progress = 0
  }

  for (let elapsedMs = 0; elapsedMs < durationMs; elapsedMs += dt) {
    if (elapsedMs < spawnDurationMs) {
      leftSpawnRemainingMs -= dt
      rightSpawnRemainingMs -= dt
      while (leftSpawnRemainingMs <= 0) {
        leftSpawnRemainingMs += getScenerySpawnIntervalMs(rng)
        spawn('left')
      }
      while (rightSpawnRemainingMs <= 0) {
        rightSpawnRemainingMs += getScenerySpawnIntervalMs(rng)
        spawn('right')
      }
    }

    const progressDelta = getScrollProgressDelta(height, dt)
    for (const object of objects) {
      if (!object.active) continue
      object.progress += progressDelta
      const y = getScrollY(height, object.progress)
      const placement = getSceneryPlacement(
        width,
        height,
        y,
        object.side,
        object.kind.baseWidthPx,
        BALANCE.scenery.marginPx,
        BALANCE.scenery.spreadPx,
        object.randomDistance,
      )
      if (isSceneryOutsideViewport(
        width,
        height,
        placement.x,
        y,
        placement.displayWidth,
        object.kind.baseHeightPx * placement.scale,
      )) {
        object.active = false
        recycledCount += 1
      }
    }
    maxActive = Math.max(maxActive, objects.filter((object) => object.active).length)
  }

  return {
    maxActive,
    failedSpawns,
    recycledCount,
    activeObjectCount: objects.filter((object) => object.active).length,
  }
}
