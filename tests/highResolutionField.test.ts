import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { berechneGeraeteFaktor, FELD } from '../src/config/feld'

const srcRoot = new URL('../src/', import.meta.url)

function sources(directory = srcRoot): readonly [string, string][] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = new URL(entry.isDirectory() ? `${entry.name}/` : entry.name, directory)
    if (entry.isDirectory()) return sources(path)
    return entry.name.endsWith('.ts') ? [[path.pathname, readFileSync(path, 'utf8')]] : []
  })
}

describe('N20 — hochaufloesender Zeichenpuffer', () => {
  it('haelt den Geraetefaktor zwischen eins und zwei', () => {
    expect(berechneGeraeteFaktor(1)).toBe(1)
    expect(berechneGeraeteFaktor(1.5)).toBe(1.5)
    expect(berechneGeraeteFaktor(3)).toBe(2)
    for (const value of [0, -1, Number.NaN, undefined]) expect(berechneGeraeteFaktor(value)).toBe(1)
  })

  it('behaelt das logische Feld bei 390 mal 844, unabhaengig vom Puffer', () => {
    expect(FELD).toEqual({ breite: 390, hoehe: 844 })
    expect(FELD.breite * berechneGeraeteFaktor(2)).toBe(780)
  })

  it('liest ausserhalb des Scale-Managers keine Puffergroesse als Layoutwert', () => {
    for (const [path, source] of sources()) {
      if (path.endsWith('/main.ts')) continue
      expect(source, path).not.toMatch(/\.scale\.(width|height)\b/)
    }
  })
})
