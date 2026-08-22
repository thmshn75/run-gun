import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getFigureOverscanFactor, getPerspectiveScale, getPlayfieldHalfWidth, getRoadHalfWidth } from '../src/systems/roadGeometry'
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
    // 0,72: klein genug fuer Tiefe, gross genug, um einen Gegner am Horizont zu
    // erkennen (Thomas 2026-08-22: "die mobs sind jetzt voll klein").
    expect(amHorizont).toBeLessThan(0.78)
    expect(amHorizont).toBeGreaterThan(0.68)
    let vorher = 0
    for (let y = BALANCE.road.horizonY; y <= H; y += 20) {
      const jetzt = getPerspectiveScale(W, H, y)
      expect(jetzt).toBeGreaterThan(vorher)
      vorher = jetzt
    }
  })

  it('waechst frueher als die Strasse, trifft die Kampfhoehe aber exakt', () => {
    // Thomas 2026-08-22 nach dem iPhone-Test: "wachsen bis zu mir zur vollen Groesse -
    // sollte schon frueher passieren". Die Groesse folgt der Strasse deshalb nicht mehr
    // eins zu eins, sondern liegt auf der ganzen Anflugstrecke DARUEBER. Nur zwei
    // Punkte sind gebunden: die Kampfhoehe (exakt 1, dort trifft die Truppe auf die
    // Gegner) und der Horizont (horizonScale).
    expect(getPerspectiveScale(W, H, ANCHOR_Y)).toBeCloseTo(1, 10)
    expect(getPerspectiveScale(W, H, BALANCE.road.horizonY)).toBeCloseTo(BALANCE.road.perspective.horizonScale, 10)
    for (const y of [BALANCE.road.horizonY, 300, 432, 500]) {
      const ausStrasse = getRoadHalfWidth(W, H, y) / getRoadHalfWidth(W, H, ANCHOR_Y)
      expect(getPerspectiveScale(W, H, y)).toBeGreaterThan(ausStrasse)
    }
    // Auf halber Anflugstrecke (y = 432) 91 % statt 79 % der vollen Groesse.
    expect(getPerspectiveScale(W, H, 432)).toBeCloseTo(0.911, 2)
  })

  it('haelt Gegner trotz der groesseren Ferndarstellung aus der Wandzone', () => {
    // Preis der frueheren Groesse: Die Figur schrumpft nach oben langsamer als der
    // Korridor. Ohne Aufschlag stuende sie am Horizont in der Wand - deshalb rechnet
    // die Spurwahl den Randabstand mit getFigureOverscanFactor.
    const faktor = getFigureOverscanFactor(W, H)
    // Die Spitze sitzt NICHT am Horizont, sondern kurz darunter - die Groesse waechst
    // gekruemmt, der Korridor linear. Am Horizont selbst waeren es nur 1,26.
    const amHorizont = BALANCE.road.perspective.horizonScale
      / (getRoadHalfWidth(W, H, BALANCE.road.horizonY) / getRoadHalfWidth(W, H, ANCHOR_Y))
    expect(amHorizont).toBeCloseTo(1.26, 2)
    expect(faktor).toBeCloseTo(1.31, 2)
    expect(faktor).toBeGreaterThan(amHorizont)
    // Der Aufschlag deckt jede Hoehe ab, nicht nur den Horizont.
    for (let y = BALANCE.road.horizonY; y <= ANCHOR_Y; y += 10) {
      const anteilKorridor = getPlayfieldHalfWidth(W, H, y) / getPlayfieldHalfWidth(W, H, ANCHOR_Y)
      expect(getPerspectiveScale(W, H, y)).toBeLessThanOrEqual(anteilKorridor * faktor + 1e-6)
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
