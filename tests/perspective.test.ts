import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getPerspectiveScale, getPlayfieldHalfWidth, getRoadHalfWidth } from '../src/systems/roadGeometry'
import { computeHordeOffsets } from '../src/systems/squads'

const W = 390
const H = 844
const ANCHOR_Y = H - BALANCE.player.anchorBottomOffset

// Perspektivische Groesse (Thomas 2026-08-22: "Mobs wachsen lassen, damit mehr als
// Wand kommen"). Vorher war eine Figur am Horizont genauso gross wie direkt vor der
// Truppe - das kostete die Tiefe und machte breite Horden konstruktiv unmoeglich.
describe('perspektivische Groesse', () => {
  it('ist auf Kampfhoehe genau 1, damit Gegner und Truppe dort zusammenpassen', () => {
    expect(getPerspectiveScale(W, H, ANCHOR_Y)).toBeCloseTo(1, 10)
  })

  it('schrumpft zum Horizont und waechst monoton nach unten', () => {
    const amHorizont = getPerspectiveScale(W, H, BALANCE.road.horizonY)
    expect(amHorizont).toBeLessThan(0.65)
    expect(amHorizont).toBeGreaterThan(0.45)
    let vorher = 0
    for (let y = BALANCE.road.horizonY; y <= H; y += 20) {
      const jetzt = getPerspectiveScale(W, H, y)
      expect(jetzt).toBeGreaterThan(vorher)
      vorher = jetzt
    }
  })

  it('folgt exakt der Strasse, statt eine eigene Kurve zu erfinden', () => {
    // Figur und Untergrund muessen synchron zusammenlaufen - sonst schwebt oder
    // versinkt die Figur beim Naeherkommen.
    for (const y of [BALANCE.road.horizonY, 300, 500, ANCHOR_Y, H]) {
      const ausStrasse = getRoadHalfWidth(W, H, y) / getRoadHalfWidth(W, H, ANCHOR_Y)
      expect(getPerspectiveScale(W, H, y)).toBeCloseTo(ausStrasse, 10)
    }
  })

  it('laesst am Horizont fast doppelt so viele Gegner nebeneinander zu wie zuvor', () => {
    const schwer = Math.max(...BALANCE.enemy.types.map((type) => type.bodyWidth))
    const spacing = BALANCE.level.squads.spacingPx
    const anchorKorridor = getPlayfieldHalfWidth(W, H, ANCHOR_Y) * 2
    const budget = Math.min(anchorKorridor, BALANCE.walls.hordeMaxWidthPx)
    const proReihe = Math.floor((budget - schwer) / spacing) + 1
    expect(proReihe).toBeGreaterThanOrEqual(5)
    // Zum Vergleich die alte Rechnung: Budget am Horizont gegen volle Figurenbreite.
    const alt = Math.min(
      getPlayfieldHalfWidth(W, H, BALANCE.road.horizonY) * 2,
      BALANCE.walls.hordeMaxWidthPx * (getPlayfieldHalfWidth(W, H, BALANCE.road.horizonY) / getPlayfieldHalfWidth(W, H, H)),
    )
    expect(Math.floor((alt - schwer) / spacing) + 1).toBeLessThanOrEqual(2)
  })

  it('stellt die groesste Horde als Block auf, nicht als Kolonne', () => {
    const schwer = Math.max(...BALANCE.enemy.types.map((type) => type.bodyWidth))
    const budget = Math.min(getPlayfieldHalfWidth(W, H, ANCHOR_Y) * 2, BALANCE.walls.hordeMaxWidthPx)
    const layout = computeHordeOffsets(
      'cluster', BALANCE.level.squads.maxSize,
      BALANCE.level.squads.spacingPx, BALANCE.level.squads.rowSpacingPx, schwer, budget,
    )
    expect(layout.size).toBe(BALANCE.level.squads.maxSize)
    const reihen = new Set(layout.offsets.map((offset) => offset.yOffset)).size
    // 14 Gegner in hoechstens drei Reihen - vorher waren es sechs bis sieben.
    expect(reihen).toBeLessThanOrEqual(3)
  })

  it('zieht Kollisionskoerper, Schatten und Spurabstand mit der Groesse mit', () => {
    const spawner = readFileSync(new URL('../src/systems/spawner.ts', import.meta.url), 'utf8')
    const boss = readFileSync(new URL('../src/systems/boss.ts', import.meta.url), 'utf8')
    // Body in Texturpixeln: Arcade skaliert ihn mit, sonst ginge der Faktor doppelt ein.
    expect(spawner).toContain('body.setSize(type.bodyWidth, type.bodyHeight, true)')
    expect(spawner).toContain('enemy.setScale(faktor)')
    // Der Schatten liegt im BILDSCHIRM-System und braucht die skalierte Breite ...
    expect(spawner).toContain("(enemy.getData('scaledWidth') as number) * BALANCE.shadow.widthOfFigure")
    // ... die Spurwahl dagegen rechnet im KAMPFHOEHEN-System, wo die Skalierung 1 ist,
    // und braucht die Rohbreite. Beides zu vermischen legte den Spawner still lahm:
    // Breiten in Bildschirmpixeln gegen ein Kampfhoehen-Budget - keine Horde fand mehr
    // eine Spur, 1970 Spawn-Versuche in Folge scheiterten mit 'no-lane'.
    expect(spawner).toContain("bodyWidth: enemy.getData('bodyWidth') as number")
    expect(spawner).toContain('anchorHalfWidth,')
    // Der Boss waechst beim Vorruecken mit.
    expect(boss).toContain('this.applyPerspectiveScale()')
    expect(boss).toContain('BALANCE.boss.bodyWidth * this.enemy.scaleX')
  })
})
