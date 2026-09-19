import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { decayRueckstoss } from '../src/systems/rueckstoss'
import { getEaseOutProgress } from '../src/systems/gamefeel'

vi.mock('phaser', () => ({ default: {} }))

import { Spawner } from '../src/systems/spawner'

const spawner = readFileSync(new URL('../src/systems/spawner.ts', import.meta.url), 'utf8')
const boss = readFileSync(new URL('../src/systems/boss.ts', import.meta.url), 'utf8')
const scene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
const effects = readFileSync(new URL('../src/systems/sterbeeffekte.ts', import.meta.url), 'utf8')

interface SimulatedEnemy { y: number, rueckstossPx: number }

function damage(enemy: SimulatedEnemy, scaleY = 1, isBoss = false): void {
  const data = new Map<string, unknown>([['hp', 1000], ['isBoss', isBoss], ['rueckstossPx', enemy.rueckstossPx]])
  const sprite = {
    y: enemy.y,
    scaleY,
    getData: (key: string) => data.get(key),
    setData: (key: string, value: unknown) => { data.set(key, value); return sprite },
  }
  const spawnerStub = { onEnemyDefeated: undefined, recycle: () => undefined }
  Spawner.prototype.damage.call(spawnerStub as Spawner, sprite as never, 1)
  enemy.y = sprite.y
  enemy.rueckstossPx = data.get('rueckstossPx') as number
}

function frame(enemy: SimulatedEnemy, dt: number, progressPx: number, scaleY = 1): void {
  // Dieselbe Buchfuehrung wie Spawner.update(): Sichtversatz vor dem Fortschritt
  // herausnehmen, danach den abgeklungenen Rest nur optisch wieder auflegen.
  const logicalY = enemy.y - enemy.rueckstossPx + progressPx
  enemy.rueckstossPx = decayRueckstoss(enemy.rueckstossPx, BALANCE.feedback.rueckstossHalfLifeMs, dt)
  enemy.y = logicalY + enemy.rueckstossPx
}

describe('Trefferquittung', () => {
  it('hat keinen Trefferblitz mehr und bewahrt den dokumentierten Grund', () => {
    expect(BALANCE.feedback).not.toHaveProperty('trefferBlitzMs')
    expect(spawner).not.toContain('trefferBlitzMs')
    expect(boss).not.toContain('trefferBlitzMs')
    expect(boss).not.toContain('registerHit')
    expect(BALANCE.feedback.rueckstossPx).toBe(3)
    expect(BALANCE.feedback.rueckstossHalfLifeMs).toBe(30)
    expect(readFileSync(new URL('../src/config/balance.ts', import.meta.url), 'utf8')).not.toContain('rueckstossMs')
    expect(readFileSync(new URL('../src/config/balance.ts', import.meta.url), 'utf8')).toContain('2026-09-19 wurde der Blitz ein zweites Mal vorgeschlagen')
  })

  it('schiebt Treffer ueber mehrere Bilder zum Horizont und klingt innerhalb von 120 ms aus', () => {
    const enemy: SimulatedEnemy = { y: 100, rueckstossPx: 0 }
    damage(enemy)
    expect(enemy.y).toBeLessThan(100)
    expect(enemy.rueckstossPx).toBeLessThan(0)
    for (let elapsed = 0; elapsed < 120; elapsed += 10) frame(enemy, 10, 0)
    expect(enemy.rueckstossPx).toBe(0)
  })

  it('klingt zuerst schnell und dann weich aus, unabhaengig von der Bildrate', () => {
    const start = -24
    const nachErsterHaelfte = decayRueckstoss(start, BALANCE.feedback.rueckstossHalfLifeMs, 30)
    const nachZweiterHaelfte = decayRueckstoss(nachErsterHaelfte, BALANCE.feedback.rueckstossHalfLifeMs, 30)
    expect(Math.abs(start - nachErsterHaelfte)).toBeGreaterThan(Math.abs(nachErsterHaelfte - nachZweiterHaelfte))

    let bei120Hz = start
    for (let elapsed = 0; elapsed < 80; elapsed += 8) bei120Hz = decayRueckstoss(bei120Hz, BALANCE.feedback.rueckstossHalfLifeMs, 8)
    let bei60Hz = start
    for (let elapsed = 0; elapsed < 80; elapsed += 16) bei60Hz = decayRueckstoss(bei60Hz, BALANCE.feedback.rueckstossHalfLifeMs, 16)
    expect(bei120Hz).toBeCloseTo(bei60Hz, 10)
  })

  it('bucht Mehrfachtreffer eines Bildes vollstaendig zurueck', () => {
    const baseline: SimulatedEnemy = { y: 100, rueckstossPx: 0 }
    const getroffen: SimulatedEnemy = { y: 100, rueckstossPx: 0 }
    damage(getroffen)
    damage(getroffen)
    damage(getroffen)
    expect(getroffen.rueckstossPx).toBe(-BALANCE.feedback.rueckstossPx * 2)
    for (let frameIndex = 0; frameIndex < 80; frameIndex += 1) {
      frame(baseline, 10, 2)
      frame(getroffen, 10, 2)
    }
    expect(getroffen.rueckstossPx).toBe(0)
    expect(getroffen.y).toBeCloseTo(baseline.y)
    // Die Erstfassung addierte dreimal +3 px, merkte aber nur einen Wert. Sie waere
    // hier dauerhaft sechs Pixel vor der Vergleichsstrecke geblieben und faellt damit
    // genau an der Regression durch, die A4 verlangt.
    const legacyEndY = baseline.y + BALANCE.feedback.rueckstossPx * 2
    expect(legacyEndY).not.toBeCloseTo(baseline.y)
  })

  it('summiert Rueckstoss auch unter Dauerfeuer nicht ueber die Lebensdauer auf', () => {
    const baseline: SimulatedEnemy = { y: 100, rueckstossPx: 0 }
    const getroffen: SimulatedEnemy = { y: 100, rueckstossPx: 0 }
    for (let frameIndex = 0; frameIndex < 120; frameIndex += 1) {
      if (frameIndex % 3 === 0) damage(getroffen)
      frame(baseline, 10, 2)
      frame(getroffen, 10, 2)
    }
    for (let frameIndex = 0; frameIndex < 24; frameIndex += 1) {
      frame(baseline, 10, 2)
      frame(getroffen, 10, 2)
    }
    expect(getroffen.rueckstossPx).toBe(0)
    expect(getroffen.y).toBeCloseTo(baseline.y)
  })

  it('laesst Trefferflaeche vor dem reinen Sichtversatz und den Boss ohne Rueckstoss', () => {
    const update = spawner.slice(spawner.indexOf('public update('), spawner.indexOf('private getTargetLane'))
    expect(update.indexOf('enemy.y = logicalY + bob')).toBeLessThan(update.indexOf('updateFromGameObject()'))
    expect(update.indexOf('updateFromGameObject()')).toBeLessThan(update.indexOf('enemy.y += rueckstossPx'))
    const damageSource = spawner.slice(spawner.indexOf('public damage('), spawner.indexOf('public update('))
    expect(damageSource).toContain("enemy.getData('isBoss') !== true")

    const nah: SimulatedEnemy = { y: 100, rueckstossPx: 0 }
    const fern: SimulatedEnemy = { y: 100, rueckstossPx: 0 }
    const boss: SimulatedEnemy = { y: 100, rueckstossPx: 0 }
    damage(nah, 1)
    damage(fern, 0.5)
    damage(boss, 1, true)
    expect(nah.y).toBeLessThan(fern.y)
    expect(fern.y).toBeLessThan(100)
    expect(boss.y).toBe(100)
    expect(boss.rueckstossPx).toBe(0)
  })

  it('verwendet einen festen Ringpuffer und blockiert nie den Gegnerpool', () => {
    expect(effects).toContain('BALANCE.pools.sterbeeffekte')
    expect(effects).toContain('this.nextIndex = (this.nextIndex + 1) % this.effekte.length')
    const spawn = effects.slice(effects.indexOf('public spawn('), effects.indexOf('public update('))
    expect(spawn).not.toContain('scene.add')
    const damageSource = spawner.slice(spawner.indexOf('public damage('), spawner.indexOf('public update('))
    expect(damageSource.indexOf('this.onEnemyDefeated?.(enemy)')).toBeLessThan(damageSource.indexOf('this.recycle(enemy)'))
    const bossDefeat = scene.slice(scene.indexOf('private handleBossDefeated'), scene.indexOf('private bucheMuenzenAufsKonto'))
    expect(bossDefeat.indexOf('this.sterbeeffekte.spawn')).toBeLessThan(bossDefeat.indexOf('this.boss.deactivate()'))
    expect(bossDefeat).not.toContain('this.sterbeeffekte.deactivateAll()')
  })

  it('laesst den Sterbeeffekt in 150 ms schnell starten und weich enden, ohne Tween', () => {
    expect(BALANCE.feedback.sterbeeffektMs).toBe(150)
    expect(getEaseOutProgress(0)).toBe(0)
    expect(getEaseOutProgress(1)).toBe(1)
    expect(getEaseOutProgress(0.5)).toBeGreaterThan(0.5)
    expect(effects).toContain('getEaseOutProgress(progress)')
    expect(effects).not.toContain('.tweens.')
  })

  it('zeigt die Boss-Lebenspunkte nur mit sichtbarem Balken und aktualisiert Text nur bei Aenderung', () => {
    const updateBossBar = scene.slice(scene.indexOf('private updateBossBar'), scene.indexOf('private updateIframes'))
    expect(updateBossBar).toContain('this.bossBarText.setVisible(visible)')
    expect(updateBossBar).toContain('if (this.bossBarText.text !== label) this.bossBarText.setText(label)')
  })
})
