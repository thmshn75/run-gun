import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getStromFigurenProSek, getStromLaneX } from '../src/systems/stromPlan'
import { getLaneRatio, getRoadHalfWidth } from '../src/systems/roadGeometry'
import { torPaarZiehen } from '../src/systems/torlaufPlan'

vi.mock('phaser', () => ({ default: { Scene: class {} } }))

import { GameScene } from '../src/scenes/GameScene'
import { Strom } from '../src/systems/strom'

const gameScene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
const weapons = readFileSync(new URL('../src/systems/weapons.ts', import.meta.url), 'utf8')

describe('Torlauf Strom E2r', () => {
  it('begrenzt die Quelle auf 24 Figuren je Sekunde', () => {
    expect(getStromFigurenProSek(10)).toBe(4)
    expect(getStromFigurenProSek(60)).toBe(24)
    expect(getStromFigurenProSek(150)).toBe(24)
    expect(BALANCE.pools.strom).toBe(200)
    expect(BALANCE.pools.kacheln).toBe(16)
    expect(BALANCE.torlauf.strom.wellenIntervallMs).toBe(1200)
  })

  it('gibt den angesammelten Strom nur als 1200-ms-Wellen aus', () => {
    const origins = Array.from({ length: 60 }, (_value, index) => ({ x: 80 + index * 4, y: 700 + (index % 3) * 8 }))
    const spawned: Array<{ x: number; y: number }> = []
    const strom = Object.create(Strom.prototype) as Strom & Record<string, unknown>
    Object.assign(strom, {
      elapsedMs: 0,
      accumulatorFigures: 0,
      waveAccumulatorMs: 0,
      getTeamSize: () => 60,
      getSalvoPositions: vi.fn((count: number) => origins.slice(0, count)),
      figures: Array.from({ length: BALANCE.pools.strom }, () => ({ active: false })),
      spawn: (x: number, y: number) => spawned.push({ x, y }),
      warnPoolExhausted: vi.fn(),
    })

    strom.update(1199)
    expect(spawned).toHaveLength(0)
    strom.update(1)
    expect(spawned).toHaveLength(29)
    expect(new Set(spawned.map((figure) => figure.y))).toEqual(new Set([700]))
    expect(new Set(spawned.map((figure) => figure.x)).size).toBe(29)
    strom.update(1199)
    expect(spawned).toHaveLength(29)
  })

  it('ignoriert Kacheln im Strom, loest sie aber mit der Truppenhuelle ein', () => {
    const kachel = { active: true, x: 70, y: 500, getData: () => undefined }
    const figur = { active: true, x: 90, y: 550, getData: () => new Set<number>() }
    const walls = {
      istKachel: vi.fn(() => true),
      recycleKachelBild: vi.fn(),
      getTorWirkung: vi.fn(),
      isReward: vi.fn(() => false),
      isPickupSegment: vi.fn(() => false),
      isWall: vi.fn(() => false),
    }
    const scene = {
      walls,
      crowd: { getHullBounds: () => hull, overlapsFigure: () => false },
      runStats: { get: () => 10, set: vi.fn() },
      applyTorlaufReinforcement: vi.fn(),
      findObjectWithData: (first: { getData: (key: string) => unknown }, second: { getData: (key: string) => unknown }, key: string) => first.getData(key) === undefined ? (second.getData(key) === undefined ? undefined : second) : first,
    }
    const hull = { getData: () => undefined }
    const stromTreffer = (GameScene.prototype as unknown as { handleStromTreffer: (figure: unknown, wall: unknown) => void }).handleStromTreffer
    const overlap = (GameScene.prototype as unknown as { handleCombatOverlap: (first: unknown, second: unknown) => void }).handleCombatOverlap

    stromTreffer.call(scene, figur, kachel)
    expect(scene.runStats.set).not.toHaveBeenCalled()
    expect(scene.applyTorlaufReinforcement).not.toHaveBeenCalled()
    expect(walls.recycleKachelBild).not.toHaveBeenCalled()
    overlap.call(scene, hull, kachel)
    expect(scene.applyTorlaufReinforcement).toHaveBeenCalledWith(1, 70, 500)
    expect(walls.recycleKachelBild).toHaveBeenCalledWith(kachel)
  })

  it('folgt dieselbe Strassenspur wie ein Projektil', () => {
    const width = 390
    const height = 844
    const originX = 300
    const originY = 700
    const ratio = getLaneRatio(width, height, originX, originY)
    const laneOriginX = originX - ratio * getRoadHalfWidth(width, height, originY)
    expect(getStromLaneX(width, height, 500, laneOriginX, ratio, 0)).toBeCloseTo(laneOriginX + ratio * getRoadHalfWidth(width, height, 500))
    expect(getStromLaneX(width, height, 250, laneOriginX, ratio, 6)).toBeCloseTo(laneOriginX + ratio * getRoadHalfWidth(width, height, 250) + 6)
  })

  it('laesst bei ausgeschaltetem Feuer keine Salve entstehen und verdrahtet Strom vor Projektilen', () => {
    expect(weapons).toContain('private feuerAktiv: boolean')
    expect(weapons).toContain('while (this.feuerAktiv && this.fireAccumulatorMs >= salvoIntervalMs)')
    expect(gameScene.indexOf("findObjectWithData(first, second, 'strom')")).toBeLessThan(gameScene.indexOf("findObjectWithData(first, second, 'weapon')"))
    expect(gameScene).toContain('this.weapons.setFeuerAktiv(false)')
  })

  it('daempft den hohen Faktor, wenn das letzte Paar noch zu nah steht', () => {
    // Jedes Tor ist ein Multiplikator; der Mindestabstand regelt nur noch, ob ein x3
    // ueberhaupt gezogen werden darf. Sonst schaukeln sich die Faktoren in wenigen
    // Metern zu einer unspielbaren Menge auf.
    const weit = torPaarZiehen(() => 0, 10, BALANCE.torlauf.tor.malMindestabstandPx)
    const nah = torPaarZiehen(() => 0, 10, BALANCE.torlauf.tor.malMindestabstandPx - 1)
    expect(weit.some((tor) => tor.wirkung.faktor === 3)).toBe(true)
    expect(nah.every((tor) => tor.wirkung.faktor === 2)).toBe(true)
  })

  it('schaltet Nachschub aus und springt im Torlauf ohne Boss zu cleared', () => {
    expect(gameScene).toContain('if (this.istTorlauf()) this.spawner.setSpawningEnabled(false)')
    expect(gameScene).toContain("this.levelPhase = 'cleared'")
    expect(gameScene).toContain('this.currentLevel += 1')
    expect(gameScene).toContain('this.hud.weapon.setVisible(!this.istTorlauf())')
  })

  it('N4.1 setzt beim erneuten create alle Collider-Felder zurueck', () => {
    const createStart = gameScene.indexOf('public create(): void {')
    const createBody = gameScene.slice(createStart, gameScene.indexOf('enableSharpText(this)', createStart))
    for (const collider of ['projectileWallCollider', 'crowdRewardCollider', 'crowdPickupCollider', 'stromWallCollider', 'projectileBossCollider', 'crowdBossCollider']) {
      expect(createBody).toContain(`this.${collider} = undefined`)
    }
  })

  it('N4.2 baut nach zwei create-Starts den Strom-Collider fuer die aktuelle Gruppe', () => {
    const firstGroup = { id: 'first' }
    const secondGroup = { id: 'second' }
    let activeGroup: unknown = firstGroup
    const scene = {
      strom: { getGroup: () => activeGroup },
      stromWallCollider: undefined as { object1: unknown, destroy: () => void } | undefined,
      walls: { getWalls: () => ({ id: 'walls' }), hasActivePair: () => true, getRewards: () => ({ id: 'rewards' }) },
      weapons: { getProjectileGroup: () => ({ id: 'projectiles' }) },
      crowd: { getHullBounds: () => ({ id: 'crowd' }) },
      addCombatOverlap(object1: unknown) {
        return { object1, destroy: () => undefined }
      },
    }
    const sync = (GameScene.prototype as unknown as { syncWallColliders: () => void }).syncWallColliders
    sync.call(scene)
    expect(scene.stromWallCollider?.object1).toBe(firstGroup)

    // create() setzt das Feld vor dem zweiten scene.start zurueck.
    scene.stromWallCollider = undefined
    activeGroup = secondGroup
    sync.call(scene)
    expect(scene.stromWallCollider?.object1).toBe(secondGroup)
  })
})
