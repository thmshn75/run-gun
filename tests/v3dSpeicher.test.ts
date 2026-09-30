import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ladeFortschritt, speichereFortschritt } from '../src/v3d/speicher'
import { ladeLetzteMessung, speichereLetzteMessung } from '../src/v3d/info'

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

  it('liest und schreibt bei Fortschritt und Messergebnis nur rg3d-Schluessel', () => {
    const zugriffe: string[] = []
    const zweiDStand = ' { "roh" : [1,2] } '
    werte.set('rungun_save_v1', zweiDStand)
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => { zugriffe.push(key); return werte.get(key) ?? null },
      setItem: (key: string, wert: string) => { zugriffe.push(key); werte.set(key, wert) },
      removeItem: (key: string) => { zugriffe.push(key); werte.delete(key) },
    })
    ladeFortschritt()
    speichereFortschritt(3)
    ladeFortschritt()
    speichereLetzteMessung('Test')
    ladeLetzteMessung()
    expect(zugriffe.length).toBeGreaterThan(0)
    expect(zugriffe.every(key => key.startsWith('rg3d'))).toBe(true)
    expect(werte.get('rungun_save_v1')).toBe(zweiDStand)
  })
})
