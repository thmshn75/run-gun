import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { approachAngle, getBobOffsetPx, getLeanRadians, getPhaseOffset, getPopScale, getStepCycleHz } from '../src/systems/gamefeel'

const FIGURE_H = 46 // player.png

describe('Lebendigkeit', () => {
  it('leitet die Schrittfrequenz aus dem Tempo ab statt sie zu setzen', () => {
    // Herleitung: Schrittlaenge = strideOfHeight x Figurenhoehe, Schritte/s =
    // scrollSpeed / Schrittlaenge, ein Wippzyklus sind zwei Schritte.
    const strideLengthPx = FIGURE_H * BALANCE.gamefeel.strideOfHeight
    expect(getStepCycleHz(FIGURE_H)).toBeCloseTo(BALANCE.scrollSpeed / strideLengthPx / 2)
    // Und es haengt wirklich am Tempo: langsamere Welt, gemaechlicherer Schritt.
    expect(getStepCycleHz(FIGURE_H * 2)).toBeLessThan(getStepCycleHz(FIGURE_H))
  })

  it('wippt nach unten weg und nie nach oben ueber die Ruhelage', () => {
    // Ein Laeufer faellt und stoesst sich ab; ein symmetrischer Sinus saehe aus wie
    // Schweben. Der Versatz muss deshalb immer <= 0 sein.
    const cycleHz = getStepCycleHz(FIGURE_H)
    let sawDeep = false
    for (let ms = 0; ms <= 2000; ms += 7) {
      const offset = getBobOffsetPx(ms, cycleHz, 0, BALANCE.gamefeel.bobAmplitudePx)
      expect(offset).toBeLessThanOrEqual(1e-9)
      expect(offset).toBeGreaterThanOrEqual(-BALANCE.gamefeel.bobAmplitudePx - 1e-9)
      if (offset < -BALANCE.gamefeel.bobAmplitudePx * 0.9) sawDeep = true
    }
    expect(sawDeep).toBe(true)
  })

  it('streut den Takt ueber die Formation, damit die Truppe kein Block ist', () => {
    const offsets = Array.from({ length: 8 }, (_v, index) => getPhaseOffset(index))
    for (const offset of offsets) {
      expect(offset).toBeGreaterThanOrEqual(0)
      expect(offset).toBeLessThan(1)
    }
    // Keine zwei Nachbarn im Gleichschritt.
    for (let index = 1; index < offsets.length; index += 1) {
      expect(Math.abs(offsets[index] - offsets[index - 1])).toBeGreaterThan(0.1)
    }
    // Und ueber acht Figuren gut verteilt statt geklumpt.
    const sortiert = [...offsets].sort((a, b) => a - b)
    const groessteLuecke = sortiert.reduce((max, value, index) => (index === 0 ? max : Math.max(max, value - sortiert[index - 1])), 0)
    expect(groessteLuecke).toBeLessThan(0.35)
  })

  it('neigt die Truppe in Fahrtrichtung und deckelt den Ausschlag', () => {
    const maxRad = (BALANCE.gamefeel.leanMaxDeg * Math.PI) / 180
    expect(getLeanRadians(0)).toBe(0)
    expect(getLeanRadians(BALANCE.gamefeel.leanFullSpeedPxPerSec)).toBeCloseTo(maxRad)
    expect(getLeanRadians(-BALANCE.gamefeel.leanFullSpeedPxPerSec)).toBeCloseTo(-maxRad)
    // Auch ein sehr schneller Wisch kippt die Figuren nicht um.
    expect(getLeanRadians(99_999)).toBeCloseTo(maxRad)
    expect(getLeanRadians(-99_999)).toBeCloseTo(-maxRad)
  })

  it('glaettet die Neigung frameratenunabhaengig', () => {
    // Gleiche Zeitspanne, unterschiedliche Bildrate: dasselbe Ergebnis. Ohne das
    // haengt das Spielgefuehl an der Bildwiederholrate des Geraets.
    const halfLife = BALANCE.gamefeel.leanHalfLifeMs
    let grob = 0
    for (let step = 0; step < 6; step += 1) grob = approachAngle(grob, 1, 100 / 6, halfLife)
    let fein = 0
    for (let step = 0; step < 60; step += 1) fein = approachAngle(fein, 1, 100 / 60, halfLife)
    expect(Math.abs(grob - fein)).toBeLessThan(0.01)
    // Eine Halbwertszeit bringt genau die halbe Strecke.
    expect(approachAngle(0, 1, halfLife, halfLife)).toBeCloseTo(0.5)
  })

  it('ploppt beim Einsammeln ueber die Zielgroesse und kehrt zurueck', () => {
    expect(getPopScale(0, BALANCE.gamefeel.popOvershoot)).toBeCloseTo(1)
    expect(getPopScale(0.5, BALANCE.gamefeel.popOvershoot)).toBeCloseTo(1 + BALANCE.gamefeel.popOvershoot)
    expect(getPopScale(1, BALANCE.gamefeel.popOvershoot)).toBeCloseTo(1)
    // Ausserhalb 0..1 bleibt es stabil statt zu kippen.
    expect(getPopScale(-5, 0.4)).toBeCloseTo(1)
    expect(getPopScale(5, 0.4)).toBeCloseTo(1)
  })

  it('haelt die Kollisionshuelle aus dem Wippen heraus', () => {
    // Sonst haengt Schaden am Zufall des Laufzyklus statt an der Position.
    const source = readFileSync(new URL('../src/systems/crowd.ts', import.meta.url), 'utf8')
    expect(source).toContain('this.hull.setPosition(this.anchorX, this.anchorY)')
    expect(source).not.toContain('this.hull.setPosition(this.anchorX, this.anchorY + bob')
  })

  it('zieht den Wippanteil bei Gegnern wieder ab, statt ihn aufzuaddieren', () => {
    // Ohne das Abziehen wandert die logische Laufstrecke mit jedem Frame davon.
    const source = readFileSync(new URL('../src/systems/spawner.ts', import.meta.url), 'utf8')
    expect(source).toContain('const previousBob')
    expect(source).toContain('enemy.y - previousBob')
  })

  it('haelt die Popups in einem festen Pool ohne create im Hot Path', () => {
    const source = readFileSync(new URL('../src/systems/popups.ts', import.meta.url), 'utf8')
    expect(source).toContain('BALANCE.gamefeel.popupPool')
    // spawn() darf nur wiederverwenden, nie neu erzeugen.
    const spawnBody = source.slice(source.indexOf('public spawn('), source.indexOf('public update('))
    expect(spawnBody).not.toContain('scene.add')
    expect(spawnBody).not.toContain('destroy')
  })
})
