import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { bahnKanten, BALANCE_V2 } from '../src/v2/balanceV2'

const v2Root = new URL('../src/v2/', import.meta.url)

function v2Sources(directory = v2Root): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = new URL(entry.name, directory)
    return entry.isDirectory() ? v2Sources(path) : [readFileSync(path, 'utf8')]
  })
}

describe('Run Gun V2 — S1 Geruest', () => {
  it('registriert die neue Szene unter ihrem eigenen Schluessel', () => {
    const scene = readFileSync(new URL('../src/v2/RunGunV2Scene.ts', import.meta.url), 'utf8')
    const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')
    expect(scene).toContain("super('RunGunV2Scene')")
    expect(main).toMatch(/import \{ RunGunV2Scene \} from '\.\/v2\/RunGunV2Scene'/)
    expect(main).toMatch(/scene: \[[^\]]*RunGunV2Scene[^\]]*\]/)
  })

  it('koppelt V2 weder an bestehende Systeme noch an deren Balance oder Speicher', () => {
    const source = v2Sources().join('\n')
    const importLines = source.split('\n').filter((line) => /^import\b/.test(line.trim()))
    expect(importLines.join('\n')).not.toMatch(/src\/systems|\.\.\/systems|src\/config\/balance|\.\.\/config\/balance/)
    expect(source).not.toContain('localStorage')
    expect(source).not.toContain('indexedDB')
  })

  it('laesst Testgelaende und Probelauf neben V2 bestehen', () => {
    const menu = readFileSync(new URL('../src/scenes/MenuScene.ts', import.meta.url), 'utf8')
    for (const label of ['TESTGELÄNDE', 'PROBELAUF']) expect(menu).toContain(`'${label}'`)
    expect(menu).toContain("this.scene.start('RunGunV2Scene')")
  })

  it('berechnet die Bahn an Horizont und Unterkante symmetrisch zur Bildmitte', () => {
    const width = 390
    const height = 844
    const k = bahnKanten(width, height)
    const centerX = width / 2
    const topHalfWidth = width * BALANCE_V2.track.topWidthRatio / 2
    const bottomHalfWidth = width * BALANCE_V2.track.bottomWidthRatio / 2

    expect(k).toMatchObject({
      horizonY: BALANCE_V2.track.horizonY,
      bottomY: height,
      topLeftX: centerX - topHalfWidth,
      topRightX: centerX + topHalfWidth,
      bottomLeftX: centerX - bottomHalfWidth,
      bottomRightX: centerX + bottomHalfWidth,
    })
    expect((k.topLeftX + k.topRightX) / 2).toBe(centerX)
    expect((k.bottomLeftX + k.bottomRightX) / 2).toBe(centerX)
  })
})
