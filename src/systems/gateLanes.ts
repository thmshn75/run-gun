import { BALANCE } from '../config/balance'
import type { WeaponKey } from './weapons'

export interface GateLane { readonly centerX: number; readonly width: number }

export type GateLaneKind = 'stat' | 'weapon'

// Returns the scale that fits a label's natural width inside a lane.
export function getLabelScale(naturalTextWidth: number, laneWidth: number, insetPx: number): number {
  if (naturalTextWidth <= 0) return 1
  return naturalTextWidth <= laneWidth - insetPx ? 1 : (laneWidth - insetPx) / naturalTextWidth
}

export type GateSpawnLayout = Readonly<{
  laneCount: 2 | 3
  weaponLaneCounter: number
  laneKinds: readonly [GateLaneKind, GateLaneKind] | readonly [GateLaneKind, GateLaneKind, GateLaneKind]
  weapon: WeaponKey | undefined
}>

export function getGateLanes(laneCount: 2 | 3, roadCenterX: number, roadWidth: number, gapPx: number): GateLane[] {
  const laneWidth = (roadWidth - gapPx * (laneCount - 1)) / laneCount
  const leftEdge = roadCenterX - roadWidth / 2
  return Array.from({ length: laneCount }, (_value, index) => ({
    centerX: leftEdge + laneWidth / 2 + index * (laneWidth + gapPx),
    width: laneWidth,
  }))
}

export function selectedLaneIndex(anchorX: number, lanes: readonly GateLane[]): number {
  if (lanes.length === 0) throw new Error('At least one gate lane is required.')
  let selectedIndex = 0
  let smallestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < lanes.length; index += 1) {
    const lane = lanes[index]
    const left = lane.centerX - lane.width / 2
    const right = lane.centerX + lane.width / 2
    const distance = anchorX < left ? left - anchorX : anchorX > right ? anchorX - right : 0
    if (distance < smallestDistance) {
      selectedIndex = index
      smallestDistance = distance
    }
  }
  return selectedIndex
}

export function getGateSpawnLayout(
  configuredLaneCount: 2 | 3,
  weaponLaneCounter: number,
  weaponChoices: readonly WeaponKey[],
  rng: () => number,
): GateSpawnLayout {
  if (configuredLaneCount === 2) {
    return { laneCount: 2, weaponLaneCounter, laneKinds: ['stat', 'stat'], weapon: undefined }
  }

  const nextCounter = weaponLaneCounter + 1
  const hasWeaponLane = nextCounter % BALANCE.gates.weaponLaneEvery === 0 && weaponChoices.length > 0
  if (!hasWeaponLane) {
    return { laneCount: 2, weaponLaneCounter: nextCounter, laneKinds: ['stat', 'stat'], weapon: undefined }
  }

  const weapon = weaponChoices[Math.min(weaponChoices.length - 1, Math.floor(rng() * weaponChoices.length))]
  const laneKinds: readonly [GateLaneKind, GateLaneKind, GateLaneKind] = rng() < 0.5
    ? ['weapon', 'stat', 'stat']
    : ['stat', 'stat', 'weapon']
  return { laneCount: 3, weaponLaneCounter: nextCounter, laneKinds, weapon }
}
