import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'

describe('Bodenschatten', () => {
  it('liegt zwischen Strasse und allem, was auf ihr steht', () => {
    expect(BALANCE.layers.shadow).toBeGreaterThan(BALANCE.layers.road)
    expect(BALANCE.layers.shadow).toBeLessThan(BALANCE.layers.gameplay)
    // Auch unter dem Wandinhalt, sonst laege ein Fleck ueber der Waffe im Wandsegment.
    expect(BALANCE.layers.shadow).toBeLessThan(BALANCE.layers.wallContent)
  })

  it('bleibt schmaler als die Figur und flach genug fuer die Aufsicht', () => {
    // Breiter als die Figur laese sich als Teller lesen, nicht als Schatten.
    expect(BALANCE.shadow.widthOfFigure).toBeLessThan(1)
    expect(BALANCE.shadow.widthOfFigure).toBeGreaterThan(0.5)
    // Die Kamera schaut schraeg von oben: ein runder Fleck erscheint stark gestaucht.
    expect(BALANCE.shadow.heightOfWidth).toBeLessThan(0.5)
  })

  it('sitzt an den Fuessen, nicht in der Figurenmitte', () => {
    // Der Sprite-Ursprung liegt mittig, die Fuesse also bei halber Hoehe.
    // Etwas darueber, damit der Schatten unter der Figur hervorschaut statt hinter ihr.
    expect(BALANCE.shadow.footOffsetOfHeight).toBeLessThanOrEqual(0.5)
    expect(BALANCE.shadow.footOffsetOfHeight).toBeGreaterThan(0.3)
  })

  it('schrumpft beim Wippen, verschwindet aber nie ganz', () => {
    // Beim vollen Hub muss noch ein Rest bleiben - ein verschwindender Schatten
    // laese die Figur springen statt laufen.
    const restBeiVollemHub = 1 - BALANCE.gamefeel.bobAmplitudePx * BALANCE.shadow.liftShrinkPerPx
    expect(restBeiVollemHub).toBeGreaterThan(0.5)
    expect(restBeiVollemHub).toBeLessThan(1)
  })

  it('zeichnet die Textur ohne Verlauf, weil generateTexture ihn verschluckt', () => {
    // fillGradientStyle wirkt nur im WebGL-Pfad und wird von generateTexture
    // stillschweigend auf die erste Farbe reduziert (Lesson 2026-08-20).
    const boot = readFileSync(new URL('../src/scenes/BootScene.ts', import.meta.url), 'utf8')
    const shadowBlock = boot.slice(boot.indexOf('private createShadowTexture'), boot.indexOf('private createRoadTextures'))
    expect(shadowBlock).toContain('fillEllipse')
    expect(shadowBlock).not.toContain('fillGradientStyle')
    expect(BALANCE.shadow.textureRings).toBeGreaterThanOrEqual(4)
  })

  it('haengt an Truppe, Gegnern und Boss', () => {
    const lies = (pfad: string): string => readFileSync(new URL(pfad, import.meta.url), 'utf8')
    for (const pfad of ['../src/systems/crowd.ts', '../src/systems/spawner.ts', '../src/systems/boss.ts']) {
      expect(lies(pfad), pfad).toContain("'figure-shadow'")
      // Kein create() im laufenden Spiel: Die Schatten entstehen beim Aufbau.
      expect(lies(pfad), pfad).toContain('BALANCE.layers.shadow')
    }
    // Beim Blinken nach einem Treffer muss der Schatten mitgehen.
    expect(lies('../src/systems/crowd.ts')).toContain('this.figuresAlpha')
  })
})
