import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getLevelPlan } from '../src/systems/levelPlan'

vi.mock('phaser', () => ({ default: { Scene: class {} } }))

import { GameScene } from '../src/scenes/GameScene'
import { Torbahn } from '../src/systems/torbahn'

const gameScene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
const torbahn = readFileSync(new URL('../src/systems/torbahn.ts', import.meta.url), 'utf8')

describe('Torlauf Horde E3', () => {
  it('berechnet die Hordenzahl aus Basis mal Level-Haerte', () => {
    expect(BALANCE.torlauf.horde.basis * getLevelPlan(1).hardness).toBe(120)
    expect(BALANCE.torlauf.horde.basis * getLevelPlan(5).hardness).toBeCloseTo(141.6)
    expect(BALANCE.torlauf.horde.basis * getLevelPlan(12).hardness).toBeCloseTo(179.4)
    expect(torbahn).toContain('horde.punkte = BALANCE.torlauf.horde.basis * getLevelPlan(level).hardness')
    expect(BALANCE.torlauf.horde.haltY).toBe(300)
    expect(BALANCE.torlauf.horde.vorrueckTempoPxPerSec).toBe(40)
  })

  it('hinterlegt die Horde separat, nicht in Toren oder Kacheln, und haelt den Collider aktiv', () => {
    expect(torbahn).toContain('private horde: HordeZustand | undefined')
    expect(torbahn).toContain('this.horde?.aktiv === true')
    const board = Object.create(Torbahn.prototype) as Torbahn & { tore: unknown[]; kacheln: unknown[]; zuTor: Map<unknown, unknown>; horde: { bild: unknown; aktiv: boolean } }
    const bild = {}
    board.tore = []
    board.kacheln = []
    board.zuTor = new Map()
    board.horde = { bild, aktiv: true }
    expect(board.hasActivePair()).toBe(true)
    expect(board.istHorde(bild as never)).toBe(true)
    expect(board.isWall(bild as never)).toBe(false)
  })

  it('verbraucht eine Stromfigur und einen Hordenpunkt', () => {
    const bild = { active: true, x: 100, y: 300, texture: { key: 'wall-segment-bad' }, scaleX: 1, scaleY: 1 }
    const board = Object.create(Torbahn.prototype) as Torbahn & { horde: { bild: typeof bild; punkte: number; aktiv: boolean; label: { setText: () => void } } }
    board.horde = { bild, punkte: 2, aktiv: true, label: { setText: () => undefined } }
    const figur = { active: true, x: 100, y: 400, texture: { key: 'player' }, scaleX: 1, scaleY: 1 }
    const scene = {
      walls: board,
      strom: { recycleFigure: vi.fn() },
      sterbeeffekte: { spawn: vi.fn() },
      handleHordeDefeated: vi.fn(),
    }
    const handler = (GameScene.prototype as unknown as { handleStromTreffer: (figur: never, wall: never) => void }).handleStromTreffer
    handler.call(scene, figur as never, bild as never)
    expect(board.horde.punkte).toBe(1)
    expect(scene.strom.recycleFigure).toHaveBeenCalledWith(figur)
  })

  it('verrechnet den Huellenkontakt einmal pro Bild und unabhaengig von der Bildrate', () => {
    const simuliere = (schrittMs: number): { hp: number; punkte: number } => {
      const bild = {}
      const board = Object.create(Torbahn.prototype) as Torbahn & { horde: { bild: unknown; punkte: number; aktiv: boolean; label: { setText: () => void } } }
      board.horde = { bild, punkte: 100, aktiv: true, label: { setText: () => undefined } }
      let hp = 100
      const scene = {
        hordeKontakt: true,
        walls: board,
        levelPhase: 'horde',
        runStats: { get: () => hp, set: (_key: string, value: number) => { hp = value } },
        syncCrowdSize: vi.fn(), updateHud: vi.fn(), handleHordeDefeated: vi.fn(),
      }
      const update = (GameScene.prototype as unknown as { updateHordeKontakt: (dt: number) => void }).updateHordeKontakt
      for (let ms = 0; ms < 2000; ms += schrittMs) { scene.hordeKontakt = true; update.call(scene, schrittMs) }
      return { hp, punkte: board.horde.punkte }
    }
    const beiAcht = simuliere(8)
    const beiSechzehn = simuliere(16)
    expect(beiAcht.hp).toBeCloseTo(beiSechzehn.hp)
    expect(beiAcht.punkte).toBeCloseTo(beiSechzehn.punkte)
    expect(beiAcht.hp).toBeCloseTo(84)
    expect(beiAcht.punkte).toBeCloseTo(84)
  })

  it('laesst Huellenkontakt vor dem Wand-return passieren und startet die Horde nie neu', () => {
    expect(gameScene.indexOf('this.walls.istHorde(target)')).toBeLessThan(gameScene.indexOf('if (this.walls.isWall(target)) return'))
    const scene = { levelPhase: 'horde', phaseRemainingMs: 0, startLevel: vi.fn() }
    const update = (GameScene.prototype as unknown as { updateLevelPhase: (dt: number) => void }).updateLevelPhase
    for (let time = 0; time < 5000; time += 16) update.call(scene, 16)
    expect(scene.startLevel).not.toHaveBeenCalled()
  })

  it('wechselt im Torlauf nach normal in die Horde und leitet Quelle null in den Probelauf-Abbruch', () => {
    const board = Object.create(Torbahn.prototype) as Torbahn
    board.deactivateAll = vi.fn()
    board.spawneHorde = vi.fn()
    const scene = { levelPhase: 'normal', phaseRemainingMs: 0, walls: board, currentLevel: 5, istTorlauf: () => true }
    const update = (GameScene.prototype as unknown as { updateLevelPhase: (dt: number) => void }).updateLevelPhase
    update.call(scene, 16)
    expect(scene.levelPhase).toBe('horde')
    expect(board.deactivateAll).toHaveBeenCalledOnce()
    expect(board.spawneHorde).toHaveBeenCalledWith(5)
    const gameOver = (GameScene.prototype as unknown as { triggerGameOver: () => void }).triggerGameOver
    const probe = { istProbelauf: () => true, beendeProbelauf: vi.fn() }
    gameOver.call(probe)
    expect(probe.beendeProbelauf).toHaveBeenCalledOnce()
  })

  it('raeumt die Horde bei null ab, klaert das Level und erhoeht es genau einmal', () => {
    const board = Object.create(Torbahn.prototype) as Torbahn
    board.recycleHorde = vi.fn()
    const horde = { x: 195, y: 300, texture: { key: 'wall-segment-bad' }, scaleX: 1, scaleY: 1 }
    const scene = {
      levelPhase: 'horde', walls: board, currentLevel: 5,
      sterbeeffekte: { spawn: vi.fn() }, syncBossColliders: vi.fn(),
      levelOverlayBackground: { setVisible: vi.fn() }, levelOverlay: { setText: vi.fn(() => ({ setVisible: vi.fn() })) },
    }
    const defeated = (GameScene.prototype as unknown as { handleHordeDefeated: (horde: never) => void }).handleHordeDefeated
    defeated.call(scene, horde as never)
    expect(scene.levelPhase).toBe('cleared')
    expect(scene.currentLevel).toBe(6)
    expect(board.recycleHorde).toHaveBeenCalledOnce()
  })

  it('sperrt Durchbruch, Shop und Bossbalken waehrend der Horde', () => {
    expect(gameScene).toContain("if (this.levelPhase !== 'normal') return")
    expect(gameScene).toContain("const visible = this.levelPhase === 'boss' && bossEnemy.active")
    expect(gameScene).toContain("if (this.levelPhase === 'boss' || this.levelPhase === 'shop' || this.levelPhase === 'horde') return")
  })
})
