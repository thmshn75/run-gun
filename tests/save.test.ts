import { afterEach, describe, expect, it } from 'vitest'
import {
  addScore,
  defaultSave,
  loadSave,
  parseSave,
  qualifiesForScores,
  serializeSave,
  writeSave,
  type SaveData,
} from '../src/systems/save'
import { getUpgradePrice, getUpgradeStartValue, purchaseUpgrade } from '../src/systems/upgrades'

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
      upgrades: { team: 2, damage: 3, rate: 4 },
      highestLevel: 5,
      scores: [{ coins: 12, level: 2, timeMs: 3456 }],
      runsSinceExport: 4,
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
      '{"version":1,"coins":NaN,"upgrades":{"team":0,"damage":0,"rate":0},"highestLevel":1,"scores":[]}',
      JSON.stringify({ ...defaultSave(), coins: -5 }),
      JSON.stringify({ ...defaultSave(), upgrades: { team: 9, damage: 0, rate: 0 } }),
      JSON.stringify({ ...defaultSave(), scores: Array.from({ length: 11 }, () => ({ coins: 1, level: 1, timeMs: 1 })) }),
      JSON.stringify({ ...defaultSave(), scores: [{ coins: 1, level: 1, timeMs: -1 }] }),
    ]) expect(parseSave(text).ok).toBe(false)
  })

  it('keeps the stored game untouched after a rejected import', () => {
    const saved = { ...defaultSave(), coins: 88, upgrades: { team: 1, damage: 0, rate: 0 } }
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
    const saved = { ...defaultSave(), coins: 88, runsSinceExport: 10 }
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

  it('accepts save texts from before runsSinceExport existed', () => {
    const { runsSinceExport: _runsSinceExport, ...legacySave } = defaultSave()
    expect(parseSave(JSON.stringify(legacySave))).toEqual({ ok: true, data: defaultSave() })
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

  it('buys exactly one upgrade level and persists it across a reload', () => {
    const save = { ...defaultSave(), coins: 170 }
    expect(getUpgradeStartValue('team', 0)).toBe(2)
    expect(getUpgradeStartValue('rate', 0)).toBe(3)
    const bought = purchaseUpgrade(save, 'team')
    expect(bought).toEqual({ ...save, coins: 120, upgrades: { team: 1, damage: 0, rate: 0 } })
    expect(save).toEqual({ ...defaultSave(), coins: 170 })
    if (bought === undefined) throw new Error('Expected purchase to succeed')
    writeSave(bought)
    expect(loadSave()).toEqual(bought)
    expect(getUpgradeStartValue('team', bought.upgrades.team)).toBe(3)
    expect(getUpgradeStartValue('team', 5)).toBe(7)
    expect(getUpgradeStartValue('damage', 5)).toBe(3.5)
    expect(getUpgradeStartValue('rate', 5)).toBe(4.5)
  })

  it('does not buy an unaffordable or fully upgraded shop item', () => {
    expect(getUpgradePrice('damage', 0)).toBe(50)
    expect(getUpgradePrice('damage', 5)).toBeUndefined()
    expect(purchaseUpgrade({ ...defaultSave(), coins: 49 }, 'damage')).toBeUndefined()
    expect(purchaseUpgrade({ ...defaultSave(), coins: 9999, upgrades: { team: 5, damage: 0, rate: 0 } }, 'team')).toBeUndefined()
  })
})
