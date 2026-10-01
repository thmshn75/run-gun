import { describe, expect, it } from 'vitest'
import { ELITE_TOD, eliteSterben } from '../src/v3d/lauf'
import { endeTafel, eisPruefLevel, zaehleEnde, ENDE_VERZOEGERUNG_MS } from '../src/v3d/einstieg'
import { LEVELS } from '../src/v3d/balance3d'
import { neuerLauf, schritt } from '../src/v3d/rechnung'

describe('D6 Endboss, Sieg und Niederlage', () => {
  it('lässt den Endboss nach hinten umkippen, einsinken und dann verschwinden', () => {
    const mitte = eliteSterben(ELITE_TOD.KIPP_S / 2), liegt = eliteSterben(ELITE_TOD.KIPP_S)
    expect(eliteSterben(0).kipp).toBeCloseTo(0, 9)
    expect(eliteSterben(0).sichtbar).toBe(true)
    expect(mitte.kipp).toBeLessThan(0); expect(mitte.kipp).toBeGreaterThan(-Math.PI / 2)
    expect(liegt.kipp).toBeCloseTo(-Math.PI / 2, 6); expect(liegt.sinken).toBeCloseTo(ELITE_TOD.SINKEN_M, 6)
    expect(eliteSterben(ELITE_TOD.DAUER_S - .01).sichtbar).toBe(true)
    expect(eliteSterben(ELITE_TOD.DAUER_S).sichtbar).toBe(false)
    // Kippen ist monoton – keine Rückfederung.
    let vorher = 0
    for (let a = 0; a <= ELITE_TOD.KIPP_S; a += .05) { const k = eliteSterben(a).kipp; expect(k).toBeLessThanOrEqual(vorher + 1e-12); vorher = k }
  })

  it('zeigt die Tafel erst nach dem Abgang und zählt nur Getötetes', () => {
    expect(ENDE_VERZOEGERUNG_MS.sieg).toBeGreaterThanOrEqual(ELITE_TOD.DAUER_S * 1000)
    const stat = { besiegt: 0, maxT: 0 }
    zaehleEnde(stat, [{ art: 'zombieGefallen', menge: 3.5 }, { art: 'spezialTreffer', menge: 90 }, { art: 'eingesammelt', menge: 9 }, { art: 'ausgesandt', menge: 4 }], 12)
    zaehleEnde(stat, [], 7)
    expect(stat).toEqual({ besiegt: 93.5, maxT: 12 })
    expect(endeTafel('sieg', 125.4, 3, stat)).toEqual({ titel: 'SIEG', zeilen: ['Zeit 2:05', 'Zombies besiegt 94', 'Säulen gebrochen 3', 'Größte Truppe 12'] })
    expect(endeTafel('niederlage', 9, 0, { besiegt: 0, maxT: 10 }).titel).toBe('NIEDERLAGE')
  })

  it('zählt im echten Kernlauf so viele Besiegte, wie Zombies verschwunden sind', () => {
    const z = neuerLauf(LEVELS[0], 3), stat = { besiegt: 0, maxT: 0 }
    let zugang = 0
    while (z.ergebnis === 'laeuft' && z.t < 300) {
      const e = schritt(z, { x: z.T < 30 ? -1 : 0 }, 1 / 30)
      zugang += e.filter(v => v.art === 'welle').reduce((s, v) => s + v.menge, 0)
      zaehleEnde(stat, e, z.T)
    }
    expect(stat.besiegt).toBeCloseTo(zugang - z.Z, 6)
    expect(stat.maxT).toBeGreaterThanOrEqual(30)
  })

  it('gibt den Schnelllauf nur im Prüfmodus frei', () => {
    expect(eisPruefLevel('?schnell=1')).toBe(LEVELS[0])
    const l = eisPruefLevel('?pruefung=1&schnell=1&eis=10')
    expect(l.eliteBossZeit).toBe(10); expect(l.P).toBe(10); expect(l.wellen).toHaveLength(2)
    expect(LEVELS[0].eliteBossZeit).toBe(60)
  })
})
