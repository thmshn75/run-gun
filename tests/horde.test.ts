import { describe, expect, it, vi } from 'vitest'
import { BALANCE } from '../src/config/balance'

vi.mock('phaser', () => ({ default: { Scene: class {} } }))

import { GameScene } from '../src/scenes/GameScene'

/**
 * Der Torlauf hatte bis zum 2026-09-19 EINE Horde als Block mit Gesamtzaehler. Thomas'
 * Befund: "im Test sind die Horden zu leicht zu besiegen, aber wahrscheinlich weil
 * nichts nachkommt." Seitdem kommt der Gegnernachschub aus dem normalen Spawner -
 * ununterbrochen von oben - und der Boss beendet das Level.
 */
describe('Torlauf Gegnernachschub', () => {
  it('laesst die Laufphase lange genug laufen, dass wirklich nachkommt', () => {
    expect(BALANCE.torlauf.laufphaseSec).toBeGreaterThanOrEqual(30)
  })

  it('verkleinert die Gegner auf die Groesse der eigenen Truppe', () => {
    // 0,78 (Truppe) / 1,25 (enemy.figureScale) = 0,62; sonst stehen Gegner in voller
    // Run-Groesse neben einer verkleinerten Truppe.
    expect(BALANCE.torlauf.gegnerMassstab).toBeCloseTo(BALANCE.torlauf.crowd.figureScale / BALANCE.enemy.figureScale, 2)
  })

  it('bindet die Stromfigur an den Gegner, statt sie beim ersten Treffer zu verbrauchen', () => {
    // Thomas 2026-09-19: "so dass meine ausgeschickten Truppen anstehen, sich dort
    // sammeln und von den Gegnern auch zerstoert werden." Der Schaden faellt deshalb
    // nicht mehr beim Treffer an, sondern ueber die Standzeit im Strom-Update.
    const gegner = { active: true, x: 100, y: 200, getData: (key: string) => key === 'hp' ? 5 : undefined }
    const figur = { active: true, x: 90, y: 250, texture: { key: 'player' }, scaleX: 1, scaleY: 1, getData: () => new Set<number>() }
    const scene = {
      damageEnemy: vi.fn(),
      sterbeeffekte: { spawn: vi.fn() },
      strom: { bindeAnZiel: vi.fn(), recycleFigure: vi.fn() },
      walls: {},
    }
    const treffer = (GameScene.prototype as unknown as { handleStromTreffer: (f: unknown, w: unknown) => void }).handleStromTreffer
    treffer.call(scene, figur, gegner)
    expect(scene.strom.bindeAnZiel).toHaveBeenCalledWith(figur, gegner)
    expect(scene.strom.recycleFigure).not.toHaveBeenCalled()
  })

  it('laesst eine Stromfigur an Objekten ohne Lebenspunkte unberuehrt', () => {
    // Tore und Kacheln haben kein hp: Sie duerfen den Gegner-Zweig nicht ausloesen.
    const kachel = { active: true, x: 70, y: 500, getData: () => undefined }
    const figur = { active: true, x: 90, y: 550, texture: { key: 'player' }, scaleX: 1, scaleY: 1, getData: () => new Set<number>() }
    const scene = { damageEnemy: vi.fn(), sterbeeffekte: { spawn: vi.fn() }, strom: { bindeAnZiel: vi.fn(), recycleFigure: vi.fn() }, walls: {} }
    const treffer = (GameScene.prototype as unknown as { handleStromTreffer: (f: unknown, w: unknown) => void }).handleStromTreffer
    treffer.call(scene, figur, kachel)
    expect(scene.strom.bindeAnZiel).not.toHaveBeenCalled()
    expect(scene.strom.recycleFigure).not.toHaveBeenCalled()
  })
})
