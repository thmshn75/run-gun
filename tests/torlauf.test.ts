import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const gameScene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
const menuScene = readFileSync(new URL('../src/scenes/MenuScene.ts', import.meta.url), 'utf8')
const torbahn = readFileSync(new URL('../src/systems/torbahn.ts', import.meta.url), 'utf8')
const balance = readFileSync(new URL('../src/config/balance.ts', import.meta.url), 'utf8')

describe('Torlauf E0', () => {
  it('ist eine Probelauf-Variante und erbt dessen unveraenderten Speicherschutz', () => {
    expect(gameScene).toMatch(/private probe: \{ readonly startLevel: number; readonly variante: 'bahnen' \| 'torlauf' \} \| undefined/)
    expect(gameScene).toMatch(/this\.probe = data\.einstieg === 'probe' \? \{ startLevel, variante: data\.probeVariante \?\? 'bahnen' \} : undefined/)
    expect(gameScene).toMatch(/private istProbelauf\(\): boolean \{\s*\n\s*return this\.probe !== undefined/)
    expect(gameScene).toMatch(/private istTorlauf\(\): boolean \{\s*\n\s*return this\.probe\?\.variante === 'torlauf'/)
    expect(gameScene).toMatch(/private speichere\(data: SaveData\): void \{\s*\n\s*if \(this\.istTestgelaende\(\) \|\| this\.istProbelauf\(\)\) return/)
    expect(gameScene).toMatch(/private triggerGameOver\(\): void \{\s*\n\s*if \(this\.istProbelauf\(\)\) return this\.beendeProbelauf\(\)/)
    expect(gameScene).toMatch(/this\.kontoStand = \(this\.istProbelauf\(\) \? this\.kontoStand : saved\.coins\) \+ offen/)
    // Die Variante darf NUR in istTorlauf() gelesen werden: Fragt eine der vierzehn
    // Sonderstellen sie direkt ab, faellt der Torlauf still aus dem Speicherschutz.
    const varianteZugriffe = gameScene.split('\n').filter((zeile) => /probe\??\.variante/.test(zeile))
    expect(varianteZugriffe).toHaveLength(1)
    expect(varianteZugriffe[0]).toMatch(/return this\.probe\?\.variante === 'torlauf'/)
  })

  it('baut in einer einzigen if/else-if/else-Kette die passende Bahn und lässt Torlauf-Gegner frontal kommen', () => {
    expect(gameScene).toMatch(/if \(this\.istTorlauf\(\)\) \{\s*\n\s*this\.walls = new Torbahn\(this\)\s*\n\s*\} else if \(this\.nutztBahnen\(\)\) \{\s*\n\s*this\.walls = this\.baueVersuchsBahnen\(\)\s*\n\s*\} else \{/)
    expect(gameScene).toMatch(/this\.spawner\.setVersuchsBahnen\(this\.nutztBahnen\(\) && !this\.istTorlauf\(\)\)/)
  })

  it('stellt Menü, leere Torbahn und die nachgeführte Truppenzahl bereit', () => {
    expect(menuScene).toMatch(/'TORLAUF'/)
    expect(menuScene).toMatch(/probeVariante: variante/)
    for (const method of ['getWalls', 'getRewards', 'hasActivePair', 'resetForLevel', 'deactivateAll', 'isWall', 'getWallPresence', 'isPickupSegment', 'isDrainSegment', 'collectPickup', 'isReward', 'collect', 'damage', 'update', 'getSegmentHeight']) {
      expect(torbahn).toMatch(new RegExp(`public ${method}\\(`))
    }
    expect(torbahn).toMatch(/this\.walls = scene\.physics\.add\.group\(\)/)
    expect(torbahn).toMatch(/this\.rewards = scene\.physics\.add\.group\(\)/)
    expect(gameScene).toMatch(/setVisible\(this\.istTorlauf\(\)\)/)
    expect(gameScene).toMatch(/if \(this\.torlaufZahl\.text !== label\) this\.torlaufZahl\.setText\(label\)/)
    expect(balance).toMatch(/torlauf: \{[\s\S]*zahlFontPx: 28,[\s\S]*zahlAbstandPx: 42,/)
  })
})
