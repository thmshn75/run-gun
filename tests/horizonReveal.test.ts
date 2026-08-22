import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getEnemySpawnCenterY, getHiddenTopPx, getSquadSpawnBaseY } from '../src/systems/horizonReveal'
import { computeSquadOffsets } from '../src/systems/squads'

describe('horizon reveal (W1: Gegner erscheinen aus dem Horizont)', () => {
  it('spawns every single enemy with its hull bottom exactly on the horizon line', () => {
    for (const type of BALANCE.enemy.types) {
      const centerY = getEnemySpawnCenterY(type.bodyHeight)
      expect(centerY + type.bodyHeight / 2).toBe(BALANCE.road.horizonY)
      expect(centerY).toBeLessThan(BALANCE.road.horizonY)
    }
  })

  it('keeps every squad member at or above the horizon at spawn time', () => {
    const maxBodyHeight = Math.max(...BALANCE.enemy.types.map((type) => type.bodyHeight))
    for (const kind of ['wedge', 'row', 'cluster'] as const) {
      for (const size of [3, 5, 8]) {
        const offsets = computeSquadOffsets(kind, size, BALANCE.level.squads.spacingPx, BALANCE.level.squads.rowSpacingPx)
        const baseY = getSquadSpawnBaseY(maxBodyHeight, Math.max(...offsets.map((offset) => offset.yOffset)))
        for (const offset of offsets) {
          expect(baseY + offset.yOffset + maxBodyHeight / 2).toBeLessThanOrEqual(BALANCE.road.horizonY)
        }
      }
    }
  })

  it('hides exactly the pixels above the horizon and nothing below it', () => {
    expect(getHiddenTopPx(BALANCE.road.horizonY - 30)).toBe(30)
    expect(getHiddenTopPx(BALANCE.road.horizonY)).toBe(0)
    expect(getHiddenTopPx(BALANCE.road.horizonY + 30)).toBe(0)
  })

  it('crops enemies at the horizon in the spawner instead of alpha-fading them below it', () => {
    const source = readFileSync(new URL('../src/systems/spawner.ts', import.meta.url), 'utf8')
    expect(source).toContain('applyHorizonCrop')
    expect(source).toContain('getHiddenTopPx')
    expect(source).toContain('getEnemySpawnCenterY')
    expect(source).toContain('getSquadSpawnBaseY')
    expect(source).not.toContain('entryFadePx')
    expect(source).not.toContain('setAlpha(0)')
  })
})
