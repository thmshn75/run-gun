import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { BALANCE, RUN_FORMATIONS_PROFIL } from '../src/config/balance'
import { getPlayerPower } from '../src/systems/enemyTypes'
import { computeBlockFormation } from '../src/systems/formation'
import { getStepCycleHz } from '../src/systems/gamefeel'
import { getRoadHalfWidth, getRoadScale } from '../src/systems/roadGeometry'

vi.mock('phaser', () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
      RND: { frac: () => 0.5 },
    },
  },
}))

import { Crowd } from '../src/systems/crowd'

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
    expect(gameScene).toMatch(/if \(this\.istTorlauf\(\)\) \{\s*\n\s*this\.walls = new Torbahn\(\s*\n\s*this,/)
    expect(gameScene).toMatch(/\} else if \(this\.nutztBahnen\(\)\) \{\s*\n\s*this\.walls = this\.baueVersuchsBahnen\(\)\s*\n\s*\} else \{/)
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

describe('Torlauf E1 sichtbare Masse', () => {
  it('haelt die +1-Kachel als aufrechte Tafel am linken Rand ausserhalb der 214-px-Formation', () => {
    const breite = 390
    const hoehe = 844
    const mitte = breite / 2
    const kampfhoehe = hoehe - BALANCE.torlauf.anchorBottomOffset
    const halbbreite = getRoadHalfWidth(breite, hoehe, kampfhoehe)
    const kachelBreite = halbbreite * BALANCE.torlauf.kachel.breiteAnteil
    const kachelHoehe = kachelBreite * BALANCE.torlauf.kachel.hoeheAnteil
    const linkeKante = mitte - halbbreite + BALANCE.torlauf.kachel.randSpaltPx * getRoadScale(breite, hoehe, kampfhoehe)
    const rechteKante = linkeKante + kachelBreite

    expect(BALANCE.torlauf.kachel).toMatchObject({ breiteAnteil: 0.3, hoeheAnteil: 2.6, randSpaltPx: 2 })
    // Aufrecht, nicht liegend: Thomas hat die flache Platte zweimal als "zu klein"
    // gemeldet. Hoeher als breit ist hier die eigentliche Anforderung.
    expect(kachelHoehe).toBeGreaterThan(kachelBreite * 2)
    // Die 214-px-Formation braucht ab Mitte 107 px je Seite frei.
    expect(mitte - rechteKante).toBeGreaterThan(214 / 2)
  })

  it('haelt das Run-Profil unveraendert und gibt dem Torlauf 150 kleine Blockfiguren', () => {
    expect(RUN_FORMATIONS_PROFIL).toMatchObject({ poolGroesse: 30, max: 30, figureScale: 1, form: 'dreieck', huelleFolgtFormation: false })
    expect(BALANCE.torlauf).toMatchObject({ anchorBottomOffset: 220, crowd: { poolGroesse: 150, max: 150, figureScale: 0.6, form: 'block', plaetzeJeReihe: 20, huelleFolgtFormation: true } })
    expect(BALANCE.crowd.max).toBe(30)
    expect(BALANCE.pools.crowd).toBe(30)
  })

  it('bildet im Torlauf zentrierte Blockreihen und klemmt die sichtbare Menge auf 150', () => {
    const options = { rowSpacingY: 9, colSpacing: 10, minColSpacing: 8, maxWidth: 214.5, maxDepth: 198, plaetzeJeReihe: 20 }
    expect(computeBlockFormation(54, options)).toHaveLength(54)
    expect(new Set(computeBlockFormation(54, options).map((slot) => slot.row)).size).toBe(3)
    const full = computeBlockFormation(150, options)
    expect(full).toHaveLength(150)
    expect(new Set(full.map((slot) => slot.row)).size).toBe(8)
    expect(full.at(-1)).toMatchObject({ offsetX: 45, row: 7 })
  })

  it('legt fuer die Torlauf-Crowd 150 und fuer das Run-Profil 30 Member-Objekte an', () => {
    const scene = createCrowdSceneStub()
    const torlaufCrowd = new Crowd(scene as never, 195, 624, BALANCE.torlauf.crowd)
    const runCrowd = new Crowd(scene as never, 195, 714, RUN_FORMATIONS_PROFIL)

    expect(getMembers(torlaufCrowd)).toHaveLength(150)
    expect(getMembers(runCrowd)).toHaveLength(30)
  })

  it('laesst die Feuerkraft ab 30 unveraendert und injiziert nur dem Spawner die Torlaufhoehe', () => {
    expect(getPlayerPower(30, 4, 2, 12)).toBe(getPlayerPower(150, 4, 2, 12))
    expect(gameScene).toContain("this.istTorlauf() ? BALANCE.torlauf.crowd : RUN_FORMATIONS_PROFIL")
    expect(gameScene).toContain('private getAnchorBottomOffset(): number')
    expect(gameScene).toContain('BALANCE.torlauf.anchorBottomOffset')
    expect(spawnerDirectAnchorReaders()).toBe(0)
    expect((roadGeometry.match(/BALANCE\.player\.anchorBottomOffset/g) ?? [])).toHaveLength(6)
    expect((bruecke.match(/BALANCE\.player\.anchorBottomOffset/g) ?? [])).toHaveLength(1)
  })

  it('laesst die Huelle nach update an der Ankeroberkante und die Mess-Sonde nur im DEV-Build', () => {
    expect(crowd).toContain('this.hull.setSize(width, this.formationstiefe)')
    expect(crowd).toContain('this.hull.setPosition(this.anchorX, this.anchorY + this.formationstiefe / 2)')
    expect(crowd).toContain('this.hull.setPosition(this.anchorX, this.anchorY)')
    expect(readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')).toMatch(/if \(import\.meta\.env\.DEV\) \{[\s\S]*__runGunMessung[\s\S]*bildzeit/)
  })

  it('N1.1 behaelt mit dem Run-Profil den bisherigen Schritttakt und Hub bei', () => {
    const runFigureHeight = 92 * BALANCE.render.figureTextureScale
    const cycleHz = getStepCycleHz(runFigureHeight)
    const bobAmplitude = BALANCE.gamefeel.bobAmplitudePx

    expect(getStepCycleHz(runFigureHeight / RUN_FORMATIONS_PROFIL.figureScale)).toBe(cycleHz)
    expect(BALANCE.gamefeel.bobAmplitudePx * RUN_FORMATIONS_PROFIL.figureScale).toBe(bobAmplitude)
  })

  it('N1.2 zeichnet den Torlauf im Run-Takt und mit 1,8 px Hub', () => {
    const runFigureHeight = 92 * BALANCE.render.figureTextureScale
    const torlaufFigureHeight = runFigureHeight * BALANCE.torlauf.crowd.figureScale

    expect(getStepCycleHz(torlaufFigureHeight / BALANCE.torlauf.crowd.figureScale)).toBe(getStepCycleHz(runFigureHeight))
    expect(BALANCE.gamefeel.bobAmplitudePx * BALANCE.torlauf.crowd.figureScale).toBeCloseTo(1.8)
  })
})

const crowd = readFileSync(new URL('../src/systems/crowd.ts', import.meta.url), 'utf8')
const roadGeometry = readFileSync(new URL('../src/systems/roadGeometry.ts', import.meta.url), 'utf8')
const bruecke = readFileSync(new URL('../src/systems/bruecke.ts', import.meta.url), 'utf8')
const spawnerSource = readFileSync(new URL('../src/systems/spawner.ts', import.meta.url), 'utf8')

function spawnerDirectAnchorReaders(): number {
  return (spawnerSource.match(/BALANCE\.player\.anchorBottomOffset/g) ?? []).length
}

function createCrowdSceneStub(): object {
  const image = () => {
    const stub = {
      active: true,
      displayWidth: 40,
      displayHeight: 56,
      setScale(scaleX: number, scaleY = scaleX) { this.displayWidth = 40 * scaleX; this.displayHeight = 56 * scaleY; return this },
      setActive() { return this },
      setVisible() { return this },
      setDepth() { return this },
      setDisplaySize(width: number, height: number) { this.displayWidth = width; this.displayHeight = height; return this },
      setAlpha() { return this },
      setPosition() { return this },
      setRotation() { return this },
    }
    return stub
  }
  const zone = () => {
    const body = { setSize: () => body, setAllowGravity: () => body, updateFromGameObject: () => undefined }
    return { body, setSize: () => undefined, setPosition: () => undefined }
  }
  return {
    add: { image, zone },
    physics: { add: { existing: () => undefined } },
    scale: { width: 390, height: 844 },
  }
}

function getMembers(crowdInstance: Crowd): unknown[] {
  return (crowdInstance as unknown as { members: unknown[] }).members
}
