import { describe, expect, it } from 'vitest'
import { auswerten, speicherMB, urteil } from '../src/v3d/rechnen'

describe('3D-Messrechnung', () => {
  it('zaehlt eine 512er-Bemalung nur einmal', () => {
    const bild = { width: 512, height: 512 }
    expect(speicherMB([bild]).bemalungen).toBeCloseTo(4 / 3)
    expect(speicherMB([bild, bild]).bemalungen).toBeCloseTo(4 / 3)
  })
  it('berechnet fps und langsamste 5 Prozent und verwirft Ausreisser', () => {
    const werte = [...Array(19).fill(20), 25, 251]
    const a = auswerten(werte)
    expect(a.fps).toBeCloseTo(1000 / (405 / 20))
    expect(a.p95).toBe(25)
    expect(a.verworfen).toBe(1)
    expect(auswerten([])).toEqual({ fps: null, p95: null, gueltig: 0, verworfen: 0 })
  })
  it('behandelt Grenzwerte und zu wenig gueltige Bilder', () => {
    const grenze = { fps: 55, p95: 25, gueltig: 90, verworfen: 10 }
    expect(urteil(grenze, 10, 60)).toBe('✅ im Budget')
    expect(urteil({ ...grenze, fps: 54.99 }, 10, 60)).toContain('❌')
    expect(urteil({ ...grenze, p95: 25.01 }, 10, 60)).toContain('❌')
    expect(urteil(grenze, 10.01, 60)).toContain('❌')
    expect(urteil(grenze, 10, 60.01)).toContain('❌')
    expect(urteil(auswerten([]), 0, 0)).toBe('❌ außerhalb: zu wenig gültige Bilder')
    expect(urteil({ ...grenze, verworfen: 11 }, 0, 0)).toBe('❌ außerhalb: zu wenig gültige Bilder')
  })
})
