import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import {
  addScore,
  defaultSave,
  loadSave,
  migrateToV4,
  parseSave,
  qualifiesForScores,
  resetSave,
  serializeSave,
  writeSave,
  type SaveData,
} from '../src/systems/save'

const SAVE_KEY = 'rungun_save_v1'
const BACKUP_SAVE_KEY = 'rungun_save_v1_backup'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  public get length(): number {
    return this.values.size
  }

  public clear(): void {
    this.values.clear()
  }

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  public key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  public removeItem(key: string): void {
    this.values.delete(key)
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const storage = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })

afterEach(() => storage.clear())

describe('save system', () => {
  it('returns defaults for empty and broken storage', () => {
    expect(loadSave()).toEqual(defaultSave())
    storage.setItem(SAVE_KEY, '{broken')
    expect(loadSave()).toEqual(defaultSave())
  })

  it('round-trips a saved game', () => {
    const save: SaveData = {
      version: 1,
      coins: 42,
      highestLevel: 5,
      scores: [{ coins: 12, level: 2, timeMs: 3456 }],
      // Bereits migriert - sonst leert loadSave() die Bestenliste, und der Test pruefte
      // die Migration statt den Rundlauf.
      v4Migrated: true,
    }
    writeSave(save)
    expect(loadSave()).toEqual(save)
    expect(parseSave(serializeSave(save))).toEqual({ ok: true, data: save })
  })

  it('writes a valid backup entry with every save', () => {
    const saved = { ...defaultSave(), coins: 73 }
    writeSave(saved)

    expect(parseSave(storage.getItem(BACKUP_SAVE_KEY)!)).toEqual({ ok: true, data: saved })
  })

  it('rejects wrong versions and invalid numeric values', () => {
    expect(parseSave(JSON.stringify({ ...defaultSave(), version: 2 }))).toEqual({ ok: false, reason: 'Spielstand stammt aus einer anderen Version.' })
    for (const text of [
      '{"version":1,"coins":NaN,"highestLevel":1,"scores":[]}',
      JSON.stringify({ ...defaultSave(), coins: -5 }),
      JSON.stringify({ ...defaultSave(), scores: Array.from({ length: 11 }, () => ({ coins: 1, level: 1, timeMs: 1 })) }),
      JSON.stringify({ ...defaultSave(), scores: [{ coins: 1, level: 1, timeMs: -1 }] }),
    ]) expect(parseSave(text).ok).toBe(false)
  })

  it('keeps the stored game untouched after a rejected import', () => {
    const saved = { ...defaultSave(), coins: 88 }
    writeSave(saved)
    const parsed = parseSave('{kaputt')
    if (parsed.ok) writeSave(parsed.data)
    expect(parsed).toEqual({ ok: false, reason: 'Text ist kein gültiger Spielstand.' })
    expect(loadSave()).toEqual(saved)
  })

  it('drops unknown fields from valid imports', () => {
    const result = parseSave(JSON.stringify({ ...defaultSave(), unexpected: 'discard me' }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).not.toHaveProperty('unexpected')
  })

  it('recovers a broken primary save from a valid backup and restores the primary entry', () => {
    const saved = { ...defaultSave(), coins: 88 }
    storage.setItem(SAVE_KEY, '{broken')
    storage.setItem(BACKUP_SAVE_KEY, serializeSave(saved))

    expect(loadSave()).toEqual(saved)
    expect(parseSave(storage.getItem(SAVE_KEY)!)).toEqual({ ok: true, data: saved })
  })

  it('returns defaults without an error when both save entries are broken', () => {
    storage.setItem(SAVE_KEY, '{broken')
    storage.setItem(BACKUP_SAVE_KEY, '{also broken')

    expect(loadSave()).toEqual(defaultSave())
  })

  it('accepts old save texts with runsSinceExport and discards the field', () => {
    const result = parseSave(JSON.stringify({ ...defaultSave(), runsSinceExport: 10 }))
    expect(result).toEqual({ ok: true, data: defaultSave() })
  })

  it('resets and persists both save copies', () => {
    writeSave({
      ...defaultSave(),
      coins: 91,
      highestLevel: 8,
      scores: [{ coins: 91, level: 8, timeMs: 1000 }],
    })

    expect(resetSave()).toEqual(defaultSave())
    expect(loadSave()).toEqual(defaultSave())
    expect(storage.getItem(SAVE_KEY)).toBe(serializeSave(defaultSave()))
    expect(storage.getItem(BACKUP_SAVE_KEY)).toBe(serializeSave(defaultSave()))
  })

  it('keeps the ten best scores without mutating its input', () => {
    const full = {
      ...defaultSave(),
      scores: Array.from({ length: 10 }, (_value, index) => ({ coins: 10 - index, level: 1, timeMs: index })),
    }
    const original = structuredClone(full)
    const better = addScore(full, { coins: 20, level: 2, timeMs: 100 })
    expect(better.scores[0]).toEqual({ coins: 20, level: 2, timeMs: 100 })
    expect(better.scores).toHaveLength(10)
    expect(full).toEqual(original)
    expect(addScore(full, { coins: 0, level: 1, timeMs: 1 })).toEqual(full)
    expect(qualifiesForScores(full, 11)).toBe(true)
    expect(qualifiesForScores(full, 0)).toBe(false)
  })

  it('liest alte Spielstaende mit upgrades-Feld weiter und wirft nur das Feld weg', () => {
    // Der Upgrade-Shop ist am 2026-08-23 entfallen. Ein Geraet, auf dem schon gespielt
    // wurde, hat das alte Feld noch im Speicher - es darf den Stand NICHT ungueltig
    // machen, sonst verliert Thomas seine Bestenliste. Der einzige Grund, warum dieser
    // Test existiert.
    const alt = {
      version: 1,
      coins: 873,
      upgrades: { team: 5, damage: 5, rate: 5 },
      highestLevel: 12,
      scores: [{ coins: 3200, level: 12, timeMs: 463000 }],
    }
    const result = parseSave(JSON.stringify(alt))
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('alter Spielstand wurde abgelehnt')
    expect(result.data).toEqual({
      version: 1,
      coins: 873,
      highestLevel: 12,
      scores: [{ coins: 3200, level: 12, timeMs: 463000 }],
    })
    expect('upgrades' in result.data).toBe(false)
  })
})

/**
 * DIE EINMALIGE V4-UMSTELLUNG (E1, 2026-08-24).
 *
 * Diese Gruppe sichert die beiden Faelle ab, die im Plan als groesstes Risiko stehen:
 * dass die Bestenliste bei JEDEM Start geleert wird statt einmal, und dass ein neues
 * Feld einen bespielten V3-Spielstand verwirft. Beide Fehler waeren schlimmer als das
 * Problem, das die Migration loest.
 */
describe('V4-Umstellung', () => {
  const v3Spielstand = () => ({
    version: 1 as const,
    coins: 8400,
    highestLevel: 16,
    scores: [
      { coins: 9100, level: 16, timeMs: 900_000 },
      { coins: 3200, level: 7, timeMs: 400_000 },
    ],
    run: {
      level: 16, hp: 100, damage: 7, shotsPerSec: 8, weapon: 'laser',
      firepowerSteps: 11, teamSteps: 11, runCoins: 9100, bookedCoins: 9100, continuesUsed: 1,
    },
  })

  beforeEach(() => localStorage.clear())

  it('stuft einen offenen Run oberhalb Level zwoelf zurueck und behaelt alles andere', () => {
    // Bennis Fall: Sein Run stand auf Level 16. Unter V3 hiess das die Gegnermischung
    // von Level 4; nach E1 hiesse es die haerteste Mischung des Spiels plus vier Level
    // Aufschlag - mit denselben festen Werten im Snapshot.
    const alt = v3Spielstand()
    localStorage.setItem('rungun_save_v1', JSON.stringify(alt))

    const geladen = loadSave()

    expect(geladen.run?.level).toBe(BALANCE.level.endless.fromLevel)
    // Werte, Waffe, Stufen und Muenzen bleiben unangetastet - kein Fortschrittsverlust.
    expect(geladen.run).toMatchObject({
      hp: 100, damage: 7, shotsPerSec: 8, weapon: 'laser',
      firepowerSteps: 11, teamSteps: 11, runCoins: 9100, continuesUsed: 1,
    })
    // DAS KONTO BLEIBT - Benni hat es erspielt, und E4 baut darauf auf.
    expect(geladen.coins).toBe(8400)
    expect(geladen.scores).toEqual([])
  })

  it('leert die Bestenliste GENAU EINMAL, auch ueber mehrere Starts', () => {
    localStorage.setItem('rungun_save_v1', JSON.stringify(v3Spielstand()))

    expect(loadSave().scores).toEqual([])

    // Nach der Umstellung erspielter Eintrag - er muss den naechsten Start ueberleben.
    const nachher = addScore(loadSave(), { coins: 500, level: 13, timeMs: 60_000, runId: 7 })
    writeSave(nachher)

    expect(loadSave().scores).toHaveLength(1)
    expect(loadSave().scores).toHaveLength(1)
    expect(loadSave().scores[0].coins).toBe(500)
  })

  it('stuft einen spaeteren, ehrlich erspielten Endlos-Run NICHT zurueck', () => {
    // Der gefaehrlichste denkbare Fehler dieser Etappe: Ohne die Kopplung an den Marker
    // wuerde jeder Endlos-Run bei jedem Laden auf Level 12 zurueckfallen.
    writeSave({
      ...defaultSave(),
      run: {
        level: 24, hp: 130, damage: 9, shotsPerSec: 8, weapon: 'grenade',
        firepowerSteps: 4, teamSteps: 3, runCoins: 20_000, bookedCoins: 18_000,
        continuesUsed: 0, runId: 42,
      },
    })

    expect(loadSave().run?.level).toBe(24)
    expect(loadSave().run?.level).toBe(24)
  })

  it('nimmt einen V3-Spielstand ohne die neuen Felder an, statt ihn zu verwerfen', () => {
    // Dieselbe Falle wie beim 'run'- und beim entfernten 'upgrades'-Feld: Eine strenge
    // Pruefung neuer Felder war dem Geraet schon zweimal fast die ganze Bestenliste wert.
    const ohneNeueFelder = parseSave(JSON.stringify(v3Spielstand()))

    expect(ohneNeueFelder.ok).toBe(true)
    if (!ohneNeueFelder.ok) return
    expect(ohneNeueFelder.data.coins).toBe(8400)
    expect(ohneNeueFelder.data.scores).toHaveLength(2)
    expect(ohneNeueFelder.data.run?.level).toBe(16)
    expect(ohneNeueFelder.data.v4Migrated).toBeUndefined()
  })

  it('reicht den Marker durch Schreiben und Lesen durch', () => {
    // Ginge er hier verloren, liefe die Migration bei jedem Start erneut - die
    // Bestenliste waere dauerhaft leer und niemand wuesste warum.
    const migriert = migrateToV4(v3Spielstand()).data
    writeSave(migriert)

    const wiedergelesen = parseSave(serializeSave(migriert))
    expect(wiedergelesen.ok && wiedergelesen.data.v4Migrated).toBe(true)
    expect(migrateToV4(loadSave()).changed).toBe(false)
  })
})

describe('Bestenliste bei Speichern & Beenden', () => {
  beforeEach(() => localStorage.clear())

  it('ersetzt den Zwischenstand desselben Runs, statt ihn zu verdoppeln', () => {
    // Ein Endlos-Run wird ueber mehrere Abende gespielt und jedes Mal beendet. Ohne die
    // Run-Kennung fuellte er die Zehnerliste allein mit lauter schlechteren Fassungen
    // seiner selbst.
    let stand = defaultSave()
    for (const muenzen of [1200, 4800, 11_500]) {
      stand = addScore(stand, { coins: muenzen, level: 20, timeMs: 600_000, runId: 99 })
    }

    expect(stand.scores).toHaveLength(1)
    expect(stand.scores[0].coins).toBe(11_500)
  })

  it('laesst Eintraege anderer Runs und solche ohne Kennung stehen', () => {
    let stand = addScore(defaultSave(), { coins: 5000, level: 9, timeMs: 300_000 })
    stand = addScore(stand, { coins: 3000, level: 6, timeMs: 200_000, runId: 1 })
    stand = addScore(stand, { coins: 4000, level: 8, timeMs: 250_000, runId: 1 })

    expect(stand.scores).toHaveLength(2)
    expect(stand.scores.map((eintrag) => eintrag.coins)).toEqual([5000, 4000])
  })
})
