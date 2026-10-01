import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LEVELS } from '../src/v3d/balance3d'
import { neuerLauf, schritt } from '../src/v3d/rechnung'
import { ladeBestlaeufe, ladeFortschritt, merkeSieg } from '../src/v3d/speicher'
import { direktStart, eisPruefLevel, testLevel } from '../src/v3d/einstieg'

const summe = (l: (typeof LEVELS)[number]) => l.wellen.reduce((s, w) => s + w.groesse, 0)

describe('D7 Level-Tabelle', () => {
  it('hat 10 Level, Level 1 ist der bisherige Stand', () => {
    expect(LEVELS).toHaveLength(10)
    expect(LEVELS[0].wellen).toEqual([{ t: 0, groesse: 250 }, { t: 20, groesse: 250 }, { t: 40, groesse: 250 }])
    expect([LEVELS[0].B_elite, LEVELS[0].B_mini, LEVELS[0].P, LEVELS[0].kMax, LEVELS[0].eliteBossZeit]).toEqual([3000, 400, 150, 4, 60])
  })

  it('wird nie leichter: Zombies gesamt, Boss-Leben und Säulen steigen monoton', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      const a = LEVELS[i - 1], b = LEVELS[i]
      expect(summe(b), `Level ${i + 1}`).toBeGreaterThanOrEqual(summe(a))
      expect(b.B_elite).toBeGreaterThan(a.B_elite)
      expect(b.B_mini).toBeGreaterThan(a.B_mini)
      expect(b.P).toBeGreaterThanOrEqual(a.P)
      expect(b.eliteBossZeit).toBe(20 * b.wellen.length)
    }
    expect(summe(LEVELS[9])).toBeGreaterThan(summe(LEVELS[0]) * 1.5)
  })

  it('passiv verliert auf jedem Level (20 Seeds)', () => {
    for (const level of LEVELS) for (let seed = 1; seed <= 20; seed++) {
      const z = neuerLauf(level, seed)
      while (z.ergebnis === 'laeuft' && z.t < 400) schritt(z, { x: 0 }, 1 / 30)
      expect(z.ergebnis).toBe('niederlage')
    }
  })
})

describe('D7 Fortschritt und beste Läufe', () => {
  let speicher: Map<string, string>
  beforeEach(() => {
    speicher = new Map([['rungun_save_v1', '{"coins":5}']])
    vi.stubGlobal('localStorage', { getItem: (k: string) => speicher.get(k) ?? null, setItem: (k: string, v: string) => { speicher.set(k, v) } })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('schaltet das nächste Level frei, merkt nur schnellere Siege und lässt den 2D-Stand unberührt', () => {
    expect(ladeFortschritt().hoechstesLevel).toBe(1)
    expect(merkeSieg(1, { zeit: 120, besiegt: 700 }, 10)).toBe(true)
    expect(ladeFortschritt().hoechstesLevel).toBe(2)
    expect(merkeSieg(1, { zeit: 130, besiegt: 800 }, 10)).toBe(false)
    expect(ladeBestlaeufe()[1]).toEqual({ zeit: 120, besiegt: 700 })
    expect(merkeSieg(1, { zeit: 100, besiegt: 650 }, 10)).toBe(true)
    expect(ladeFortschritt().hoechstesLevel).toBe(2)
    merkeSieg(10, { zeit: 200, besiegt: 1200 }, 10)
    expect(ladeFortschritt().hoechstesLevel).toBe(10)
    expect(speicher.get('rungun_save_v1')).toBe('{"coins":5}')
    expect([...speicher.keys()].filter(k => k !== 'rungun_save_v1').every(k => k.startsWith('rg3d.'))).toBe(true)
  })

  it('übersteht kaputte Einträge', () => {
    speicher.set('rg3d.beste.v1', '{kaputt')
    expect(ladeBestlaeufe()).toEqual({})
    speicher.set('rg3d.beste.v1', JSON.stringify({ version: 1, level: { 2: { zeit: 'x' }, 3: { zeit: 90, besiegt: 10 } } }))
    expect(ladeBestlaeufe()).toEqual({ 3: { zeit: 90, besiegt: 10 } })
  })
})

describe('D7 Lobby-Weichen', () => {
  it('startet nur mit Prüfparametern direkt', () => {
    expect(direktStart('')).toBe(false)
    expect(direktStart('?wasser=0')).toBe(false)
    expect(direktStart('?pruefung=1&schnell=1')).toBe(true)
  })
  it('Testgelände ist Level 1 mit schnellen Säulen; Prüfschalter wirken auf das gewählte Level', () => {
    expect(testLevel().P).toBe(10); expect(testLevel().wellen).toEqual(LEVELS[0].wellen)
    expect(eisPruefLevel('?pruefung=1&eis=20', LEVELS[4]).wellen).toEqual(LEVELS[4].wellen)
    expect(eisPruefLevel('', LEVELS[4])).toBe(LEVELS[4])
  })
})
