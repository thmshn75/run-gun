import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getScrollSpeed } from '../src/systems/speed'

describe('Tempo je Level', () => {
  it('startet auf dem abgenommenen Tempo und wird jedes Level ein wenig schneller', () => {
    // Level 1 bleibt genau der Wert, den Thomas am 2026-08-22 abgenommen hat.
    expect(getScrollSpeed(1)).toBe(BALANCE.scrollSpeed)
    for (let level = 2; level <= 12; level += 1) {
      expect(getScrollSpeed(level)).toBeGreaterThan(getScrollSpeed(level - 1))
    }
  })

  it('bleibt unter dem Tempo, das schon einmal als zu schnell gemeldet wurde', () => {
    // 180 px/s war Thomas' Befund "die Waende sind zu schnell". Level 12 landet
    // gerechnet bei 175 und darf diese Grenze nie ueberschreiten.
    expect(getScrollSpeed(12)).toBeCloseTo(175, 0)
    for (let level = 1; level <= 60; level += 1) {
      expect(getScrollSpeed(level)).toBeLessThanOrEqual(BALANCE.levelSpeed.maxPxPerSec)
      expect(BALANCE.levelSpeed.maxPxPerSec).toBeLessThan(180)
    }
  })

  it('steigt sanft genug, dass ein einzelner Levelwechsel nicht als Ruck wirkt', () => {
    // Ueber 2,5 % Sprung von Level zu Level liest sich als Tempowechsel statt als
    // Steigerung - der Wert ist die Grenze, bei der es noch beilaeufig bleibt.
    for (let level = 2; level <= 12; level += 1) {
      const sprung = getScrollSpeed(level) / getScrollSpeed(level - 1)
      expect(sprung).toBeLessThanOrEqual(1.025)
    }
  })

  it('behandelt unsinnige Level wie Level 1', () => {
    expect(getScrollSpeed(0)).toBe(getScrollSpeed(1))
    expect(getScrollSpeed(-5)).toBe(getScrollSpeed(1))
    expect(getScrollSpeed(1.9)).toBe(getScrollSpeed(1))
  })
})

describe('Verkabelung des Tempos', () => {
  it('liest kein System mehr die feste Grundgeschwindigkeit', async () => {
    // Sonst liefe ein System weiter mit Level-1-Tempo, waehrend der Rest schneller
    // wird - genau der Bruch, den die eine gemeinsame Zahl verhindern soll.
    const { readFileSync } = await import('node:fs')
    const dateien = ['blockers.ts', 'coins.ts', 'roadGeometry.ts', 'gamefeel.ts']
    for (const datei of dateien) {
      const quelle = readFileSync(new URL(`../src/systems/${datei}`, import.meta.url), 'utf8')
      expect(quelle, datei).not.toContain('BALANCE.scrollSpeed')
      expect(quelle, datei).toContain('getCurrentScrollSpeed()')
    }
  })

  it('setzt das Tempo bei jedem Levelstart neu', async () => {
    const { readFileSync } = await import('node:fs')
    const scene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
    expect(scene).toContain('setCurrentScrollSpeed(getScrollSpeed(this.currentLevel))')
    // Auch beim Start des ersten Laufs, sonst bliebe das Tempo des vorigen stehen.
    expect((scene.match(/setCurrentScrollSpeed\(/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })
})
