import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { computeTextResolution } from '../src/systems/textResolution'

/**
 * Schrift-Schaerfe (Thomas 2026-08-24: "die weisse Schrift in den orangen Buttons ist
 * etwas unscharf"). Gemessen wurde: Der Zeichenbereich ist 390 Punkte breit und wird auf
 * einem iPhone auf 1.170 Geraetepunkte gestreckt - Faktor 3.
 */
const MAX = BALANCE.render.maxTextResolution

describe('Schrift-Aufloesung', () => {
  it('entspricht der tatsaechlichen Streckung', () => {
    // iPhone: 390 Punkte Zeichenbereich, 390 CSS-Punkte breit, dreifache Geraetepixel.
    expect(computeTextResolution(390, 390, 3, MAX)).toBeCloseTo(3, 5)
    // Aelteres Geraet ohne Verdopplung.
    expect(computeTextResolution(390, 390, 1, MAX)).toBeCloseTo(1, 5)
    // Grosses Fenster am Rechner: die Streckung zaehlt, nicht das Geraetepixel-Verhaeltnis.
    expect(computeTextResolution(390, 780, 1, MAX)).toBeCloseTo(2, 5)
  })

  it('faellt nie unter 1 - ein kleineres Fenster braucht keine feinere Schrift', () => {
    expect(computeTextResolution(390, 300, 1, MAX)).toBe(1)
    expect(computeTextResolution(390, 195, 1, MAX)).toBe(1)
  })

  it('ist nach oben gedeckelt - jede Stufe kostet quadratisch Texturflaeche', () => {
    expect(computeTextResolution(390, 390, 8, MAX)).toBe(MAX)
    expect(MAX).toBeLessThanOrEqual(4)
  })

  it('kommt mit unbrauchbaren Werten zurecht, statt das Spiel zu stoeren', () => {
    expect(computeTextResolution(390, 0, 3, MAX)).toBe(1)
    expect(computeTextResolution(0, 390, 3, MAX)).toBe(1)
    expect(computeTextResolution(390, 390, Number.NaN, MAX)).toBe(1)
    expect(computeTextResolution(Number.NaN, 390, 3, MAX)).toBe(1)
  })
})
