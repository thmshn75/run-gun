import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { clampStat, RunStats } from '../src/systems/upgrades'
import { getTorlaufStand, torPaarZiehen } from '../src/systems/torlaufPlan'

const gameScene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
const versuch = readFileSync(new URL('../src/systems/versuchBahnen.ts', import.meta.url), 'utf8')
const torbahn = readFileSync(new URL('../src/systems/torbahn.ts', import.meta.url), 'utf8')

describe('Torlauf E2', () => {
  it('laesst die hp-Klemme ohne Override unveraendert und hebt sie nur explizit auf 150', () => {
    for (const level of [1, 12, 20]) expect(clampStat('hp', Number.MAX_SAFE_INTEGER, level)).toBe(clampStat('hp', Number.MAX_SAFE_INTEGER, level, undefined, undefined))
    expect(clampStat('hp', 999, 1, undefined, undefined, 150)).toBe(150)
    const stats = new RunStats(); stats.setHpDeckelOverride(150); stats.set('hp', 999); expect(stats.get('hp')).toBe(150)
  })

  it('setzt den 150er-Deckel nur im bestehenden Torlauf-Probe-Zweig', () => {
    expect(gameScene).toMatch(/if \(probe !== undefined\) \{[\s\S]*if \(this\.istTorlauf\(\)\) this\.runStats\.setHpDeckelOverride\(BALANCE\.torlauf\.crowd\.max\)/)
  })

  it('zieht echte Paare, begrenzt Multiplikatoren und differenziert zwei Plus-Tore', () => {
    const plus = torPaarZiehen(() => 0.99, 30)
    expect(plus.map((tor) => tor.wirkung.art)).toEqual(['plus', 'plus'])
    expect(plus[0].startwert).not.toBe(plus[1].startwert)
    const mal = torPaarZiehen(() => 0, 30)
    expect(mal.some((tor) => tor.wirkung.art === 'mal')).toBe(true)
    for (const tor of mal) if (tor.wirkung.art === 'mal') expect(tor.wirkung.faktor).toBeLessThanOrEqual(3)
  })

  it('begrenzt Startwerte auf die 30 Figuren der Feuerlinie', () => {
    for (const truppe of [10, 30, 100, 150]) {
      const paar = torPaarZiehen(() => 0, truppe)
      for (const tor of paar) expect(tor.startwert).toBeGreaterThanOrEqual(-17)
      for (const tor of paar) expect(tor.startwert).toBeLessThanOrEqual(-8)
    }
  })

  it('liest die korrigierte Tor-Balance einschliesslich des ×3-Anteils', () => {
    expect(BALANCE.torlauf.tor.plusAnteilRest).toBe(0.12)
    expect(BALANCE.torlauf.tor.malChance).toBe(0.25)
    expect(BALANCE.torlauf.tor.malDreiAnteil).toBe(0.1)
    const zufall = [0, 0, 0, 0.09, 0.4]
    const paar = torPaarZiehen(() => zufall.shift() ?? 0, 30)
    expect(paar.find((tor) => tor.wirkung.art === 'mal')?.wirkung).toEqual({ art: 'mal', faktor: 3 })
  })

  it('berechnet Restwert am 150er-Deckel und laesst Ankerseite statt Huelle entscheiden', () => {
    expect(getTorlaufStand(-10, 999, 100)).toBe(Math.max(BALANCE.torlauf.tor.plusMindest, Math.round(0.12 * 50)))
    expect(torbahn).toContain('getCrowdAnchorX')
    expect(torbahn).toContain('const partner = tor.partner')
  })

  it('stellt die Spawnsperre polymorph bereit, ohne instanceof, in-Check oder Cast', () => {
    expect(versuch).toContain('istTorFenster?(): boolean')
    expect(gameScene).toContain('this.walls.istTorFenster?.() ?? false')
  })

  it('enthaelt keinen toten Weichen-Template-String und keine Semikolon-Ketten', () => {
    expect(gameScene).not.toContain('E0-Form der Weiche')
    expect(gameScene).not.toMatch(/void\s+`/)
    expect(torbahn.split('\n').every((line) => (line.match(/;/g) ?? []).length <= 2)).toBe(true)
  })

  it('N3.1 formatiert die Torbahn mit Einrueckung je Klassenzeile', () => {
    const classBody = torbahn.slice(torbahn.indexOf('export class Torbahn'))
    const lines = classBody.split('\n').filter((line) => line.trim() !== '')
    expect(lines.slice(1, -1).every((line) => line.startsWith('  '))).toBe(true)
    expect(lines.every((line) => !/^(this|tor)\./.test(line))).toBe(true)
  })

  it('N3.2 setzt die Feuerlinie bewusst konstant und behaelt die Startwertgrenzen', () => {
    const torlaufPlan = readFileSync(new URL('../src/systems/torlaufPlan.ts', import.meta.url), 'utf8')
    expect(torlaufPlan).toContain('const feuerlinie = BALANCE.crowd.max')
    expect(torlaufPlan).toContain('geht ihre Groesse bewusst nicht in den Startwert ein')
    for (const truppe of [10, 30, 100, 150]) {
      for (const tor of torPaarZiehen(() => 0, truppe)) expect(tor.startwert).toBeGreaterThanOrEqual(-17)
    }
  })

  it('N3.3 hinterlaesst in der Torbahn keine Zeilenend-Semikolons', () => {
    expect(torbahn.split('\n').every((line) => !line.trimEnd().endsWith(';'))).toBe(true)
  })
})
