import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getEnemySpawnCenterY, getSquadSpawnBaseY, isRevealedAtHorizon } from '../src/systems/horizonReveal'
import { computeSquadOffsets } from '../src/systems/squads'

describe('horizon reveal (W1: Gegner erscheinen am Horizont wie die Haeuser)', () => {
  it('spawns every single enemy with its hull bottom exactly on the horizon line, fully revealed', () => {
    for (const type of BALANCE.enemy.types) {
      const centerY = getEnemySpawnCenterY(type.bodyHeight)
      const bottomY = centerY + type.bodyHeight / 2
      expect(bottomY).toBe(BALANCE.road.horizonY)
      expect(isRevealedAtHorizon(bottomY)).toBe(true)
      expect(centerY).toBeLessThan(BALANCE.road.horizonY)
    }
  })

  it('reveals squad members one after another as their bottom edge reaches the line', () => {
    const maxBodyHeight = Math.max(...BALANCE.enemy.types.map((type) => type.bodyHeight))
    for (const kind of ['wedge', 'row', 'cluster'] as const) {
      for (const size of [3, 5, 8]) {
        const offsets = computeSquadOffsets(kind, size, BALANCE.level.squads.spacingPx, BALANCE.level.squads.rowSpacingPx)
        const maxYOffset = Math.max(...offsets.map((offset) => offset.yOffset))
        const baseY = getSquadSpawnBaseY(maxBodyHeight, maxYOffset)
        for (const offset of offsets) {
          const bottomY = baseY + offset.yOffset + maxBodyHeight / 2
          expect(bottomY).toBeLessThanOrEqual(BALANCE.road.horizonY)
          // Nur das unterste Mitglied ist beim Spawn schon enthuellt; alle anderen folgen.
          expect(isRevealedAtHorizon(bottomY)).toBe(offset.yOffset === maxYOffset)
        }
      }
    }
  })

  it('applies the same reveal rule the buildings use: visible exactly from the horizon line on', () => {
    expect(isRevealedAtHorizon(BALANCE.road.horizonY - 1)).toBe(false)
    expect(isRevealedAtHorizon(BALANCE.road.horizonY)).toBe(true)
    expect(isRevealedAtHorizon(BALANCE.road.horizonY + 1)).toBe(true)
  })

  it('reveals enemies in the spawner via the shared rule instead of fading or cropping them', () => {
    const source = readFileSync(new URL('../src/systems/spawner.ts', import.meta.url), 'utf8')
    expect(source).toContain('applyHorizonReveal')
    expect(source).toContain('isRevealedAtHorizon')
    expect(source).toContain('getEnemySpawnCenterY')
    expect(source).toContain('getSquadSpawnBaseY')
    expect(source).not.toContain('entryFadePx')
    expect(source).not.toContain('setCrop')
  })
})
