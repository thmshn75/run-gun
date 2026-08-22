import { getScrollProgressDelta, getScrollY } from './roadGeometry'
import { CityPlanner, type CityConfig } from './cityPlan'
import {
  getSceneryPlacement,
  isSceneryOutsideViewport,
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
  // Frames, in denen mindestens eine Seite eine Silhouettenluecke zeigt (= sichtbare
  // Querstrasse). In einem Lauf ohne geplante Querstrassen muss das 0 sein.
  gapFrames: number
  // Frames, in denen genau eine Seite eine Luecke zeigt — misst die Synchronitaet der
  // Querstrassen (klein gegenueber gapFrames = beidseitig gleichzeitig).
  asyncGapFrames: number
}>

// Silhouettenluecke einer Seite: ein Teil des Bereichs [horizonY, unterster Gebaeudefuss]
// wird von keinem Gebaeudebild [topY, bottomY] ueberdeckt. Gemessen wird an dem, was
// gezeichnet wuerde (Lesson 2026-08-20: Verlauf/Abdeckung messen, nicht ansehen).
function hasSilhouetteGap(intervals: Array<{ top: number; bottom: number }>): boolean {
  if (intervals.length === 0) return false
  intervals.sort((a, b) => a.top - b.top)
  const deepestBottom = Math.max(...intervals.map((interval) => interval.bottom))
  let reach: number = BALANCE.road.horizonY
  for (const interval of intervals) {
    if (interval.top > reach + 0.5) return true
    reach = Math.max(reach, interval.bottom)
  }
  return reach < deepestBottom - 0.5
}

export function simulateCityScenery(
  kinds: readonly SceneryKind[],
  rng: () => number,
  width: number,
  height: number,
  poolSize: number,
  durationMs: number,
  dt: number,
  spawnDurationMs = durationMs,
  config: CityConfig = BALANCE.scenery,
): ScenerySimulationResult {
  const objects: SimulatedSceneryObject[] = Array.from(
    { length: poolSize },
    () => ({ active: false, side: 'left', kind: kinds[0], randomDistance: 0, progress: 0 }),
  )
  const planner = new CityPlanner(kinds, rng, config)
  const lastBuilding: Record<ScenerySide, SimulatedSceneryObject | null> = { left: null, right: null }
  let maxActive = 0
  let failedSpawns = 0
  let recycledCount = 0
  let gapFrames = 0
  let asyncGapFrames = 0

  const topYOf = (object: SimulatedSceneryObject): number => {
    const y = getScrollY(height, object.progress)
    const placement = getSceneryPlacement(width, height, y, object.side, object.kind.baseWidthPx, BALANCE.scenery.marginPx, BALANCE.scenery.spreadPx, object.randomDistance)
    return y - object.kind.baseHeightPx * placement.scale
  }

  for (let elapsedMs = 0; elapsedMs < durationMs; elapsedMs += dt) {
    if (elapsedMs < spawnDurationMs) {
      const commands = planner.step(dt, {
        left: lastBuilding.left !== null && lastBuilding.left.active ? topYOf(lastBuilding.left) : null,
        right: lastBuilding.right !== null && lastBuilding.right.active ? topYOf(lastBuilding.right) : null,
      })
      for (const command of commands) {
        const object = objects.find((candidate) => !candidate.active)
        if (object === undefined) {
          failedSpawns += 1
          continue
        }
        object.active = true
        object.side = command.side
        object.kind = command.kind
        object.randomDistance = command.randomDistance
        object.progress = 0
        if (command.kind.category === 'building') lastBuilding[command.side] = object
      }
    }

    const progressDelta = getScrollProgressDelta(height, dt)
    const silhouettes: Record<ScenerySide, Array<{ top: number; bottom: number }>> = { left: [], right: [] }
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
      const displayHeight = object.kind.baseHeightPx * placement.scale
      if (isSceneryOutsideViewport(width, height, placement.x, y, placement.displayWidth, displayHeight)) {
        object.active = false
        recycledCount += 1
        continue
      }
      if (object.kind.category === 'building') silhouettes[object.side].push({ top: y - displayHeight, bottom: y })
    }
    const gapLeft = hasSilhouetteGap(silhouettes.left)
    const gapRight = hasSilhouetteGap(silhouettes.right)
    if (gapLeft || gapRight) gapFrames += 1
    if (gapLeft !== gapRight) asyncGapFrames += 1
    maxActive = Math.max(maxActive, objects.filter((object) => object.active).length)
  }

  return {
    maxActive,
    failedSpawns,
    recycledCount,
    activeObjectCount: objects.filter((object) => object.active).length,
    gapFrames,
    asyncGapFrames,
  }
}
