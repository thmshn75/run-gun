import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getStromFigurenProSek, getStromLaneX } from '../src/systems/stromPlan'
import { getLaneRatio, getRoadHalfWidth } from '../src/systems/roadGeometry'
import { torPaarZiehen } from '../src/systems/torlaufPlan'

vi.mock('phaser', () => ({ default: { Scene: class {} } }))

import { GameScene } from '../src/scenes/GameScene'

const gameScene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
const weapons = readFileSync(new URL('../src/systems/weapons.ts', import.meta.url), 'utf8')

describe('Torlauf Strom E2r', () => {
  it('begrenzt die Quelle auf 24 Figuren je Sekunde', () => {
    expect(getStromFigurenProSek(10)).toBe(4)
    expect(getStromFigurenProSek(60)).toBe(24)
    expect(getStromFigurenProSek(150)).toBe(24)
    expect(BALANCE.pools.strom).toBe(200)
    expect(BALANCE.pools.kacheln).toBe(12)
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

  it('zieht nie zwei ×-Platten innerhalb des Mindestabstands', () => {
    const first = torPaarZiehen(() => 0, 10, BALANCE.torlauf.tor.malMindestabstandPx)
    const next = torPaarZiehen(() => 0, 10, BALANCE.torlauf.tor.malMindestabstandPx - 1)
    expect(first.some((tor) => tor.wirkung.art === 'mal')).toBe(true)
    expect(next.every((tor) => tor.wirkung.art === 'plus')).toBe(true)
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
