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

  it('zieht Paare aus zwei Multiplikatoren, nie aus Pfeilern mit Minuswert', () => {
    // Im Vorbild laeuft der Strom durch ein Feld wie "x88" und vervielfacht sich sofort.
    // Pfeiler, die man erst von einem Minuswert hochhacken muss, gibt es dort nicht.
    for (const wurf of [0, 0.3, 0.7, 0.99]) {
      const paar = torPaarZiehen(() => wurf, 30)
      expect(paar.map((tor) => tor.wirkung.art)).toEqual(['mal', 'mal'])
      for (const tor of paar) expect([2, 3]).toContain(tor.wirkung.faktor)
    }
  })

  it('gibt den beiden Seiten verschiedene Faktoren, damit die Seitenwahl etwas entscheidet', () => {
    const paar = torPaarZiehen(() => 0, 30)
    expect(paar[0].wirkung.faktor).not.toBe(paar[1].wirkung.faktor)
    // Und unabhaengig von der Truppengroesse: die Faktoren haengen nicht an ihr.
    for (const truppe of [10, 30, 100, 150]) {
      expect(torPaarZiehen(() => 0, truppe).map((tor) => tor.wirkung.faktor)).toEqual(paar.map((tor) => tor.wirkung.faktor))
    }
  })

  it('laesst jedes Tor ein Multiplikator sein und deckt die volle Bahnbreite ab', () => {
    expect(BALANCE.torlauf.tor.malChance).toBe(1)
    // Ohne Luecke in der Mitte: sonst laeuft der Strom mittig hindurch, ohne je ein
    // Tor zu beruehren - genau der Zustand, den Thomas als "bringen gar nichts" sah.
    expect(BALANCE.torlauf.tor.innenkanteAnteil).toBe(0)
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

  it('hebt die Horde farblich ab und laesst die eigene Truppe ungefaerbt', () => {
    // Ohne Trennung sind beide Seiten roetliche Punkte und niemand erkennt, wer Freund
    // und wer Feind ist. Die eigene Truppe bleibt dabei UNGEFAERBT: Ein Tint wird mit
    // der Bildfarbe multipliziert, Blau auf die roetliche Spielerfigur ergibt Schwarz.
    expect(BALANCE.torlauf.crowd.tint).toBeUndefined()
    expect(BALANCE.torlauf.horde.tint).toBe(0x76e05a)
  })

  it('N3.3 hinterlaesst in der Torbahn keine Zeilenend-Semikolons', () => {
    expect(torbahn.split('\n').every((line) => !line.trimEnd().endsWith(';'))).toBe(true)
  })
})
