import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ladeFortschritt, speichereFortschritt } from '../src/v3d/speicher'

const werte = new Map<string, string>()
beforeEach(() => {
  werte.clear()
  vi.stubGlobal('localStorage', { getItem: (key: string) => werte.get(key) ?? null, setItem: (key: string, wert: string) => { werte.set(key, wert) } })
})
describe('3D-Speicher', () => {
  it('faellt bei fehlenden oder kaputten Daten auf Level 1 zurueck', () => {
    expect(ladeFortschritt().hoechstesLevel).toBe(1)
    for (const wert of ['{', '{"version":2,"hoechstesLevel":3}', '{"version":1,"hoechstesLevel":0}']) {
      werte.set('rg3d.v1', wert)
      expect(ladeFortschritt().hoechstesLevel).toBe(1)
    }
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('gesperrt') }, setItem: () => { throw Error('gesperrt') } })
    expect(ladeFortschritt().hoechstesLevel).toBe(1)
    expect(() => speichereFortschritt(4)).not.toThrow()
  })
  it('schreibt nur den eigenen Schluessel und erhaelt den alten Spielstand bytegleich', () => {
    werte.set('rungun_save_v1', ' { "roh" : [1,2] } ')
    speichereFortschritt(4)
    expect(ladeFortschritt().hoechstesLevel).toBe(4)
    expect(werte.get('rungun_save_v1')).toBe(' { "roh" : [1,2] } ')
    expect([...werte.keys()]).toEqual(['rungun_save_v1', 'rg3d.v1'])
  })
})
