import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { LEVELS, type Level } from '../src/v3d/balance3d'
import { neuerLauf, schritt, type Ereignis } from '../src/v3d/rechnung'

const dt = 1 / 30
const testLevel = (aenderung: Partial<Level>): Level => ({ ...LEVELS[0],
  wellen: LEVELS[0].wellen.map(w => ({ ...w })), saeulen: [...LEVELS[0].saeulen], ...aenderung })
const summe = (e: Ereignis[], art: Ereignis['art']) => e.filter(x => x.art === art).reduce((s, x) => s + x.menge, 0)
const nah = (a: number, b: number) => {
  if (Math.abs(a - b) > 1e-6 || Number.isNaN(a) || Number.isNaN(b))
    throw new Error(`Bilanzabweichung: ${a} statt ${b}`)
}

describe('3D-Spielrechnung', () => {
  it('bilanziert jeden Schritt in 1000 deterministischen Zufallsläufen', () => {
    const start = performance.now()
    let schritte = 0
    for (let lauf = 1; lauf <= 1000; lauf++) {
      const z = neuerLauf(LEVELS[0], lauf)
      let unterwegs = 0
      let eingabe = 0
      let wechsel = 0
      // Separater Test-Zufall: keine Math.random-Abhängigkeit und wiederholbarer Test.
      let rng = (lauf * 2654435761) >>> 0
      const zufall = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296 }
      while (z.ergebnis === 'laeuft' && z.t < 300) {
        if (z.t >= wechsel) {
          eingabe = [-1, 0, 1][Math.floor(zufall() * 3)]
          wechsel = z.t + 0.5 + 2.5 * zufall()
        }
        const vor = { T: z.T, F: z.F, Z: z.Z, P: z.P,
          miniBoss: z.miniBoss.B, eliteBoss: z.eliteBoss.B,
          miniImFeld: z.miniBoss.imFeld, eliteImFeld: z.eliteBoss.imFeld }
        const e = schritt(z, { x: eingabe }, dt)
        schritte++
        nah(z.T - vor.T, summe(e, 'eingesammelt'))
        const deltaUnterwegs = summe(e, 'ausgesandt') + summe(e, 'vervielfacht')
          - summe(e, 'angekommenFront') - summe(e, 'angekommenSaeule')
        unterwegs += deltaUnterwegs
        // Die Summe wird nur aus Ereignissen fortgeschrieben, nie je Schritt neu berechnet.
        nah(summe(e, 'ausgesandt') + summe(e, 'vervielfacht'),
          summe(e, 'angekommenFront') + summe(e, 'angekommenSaeule') + deltaUnterwegs)
        nah(z.F - vor.F, summe(e, 'angekommenFront') - summe(e, 'soldatGefallen'))
        nah(z.Z - vor.Z, summe(e, 'welle') - summe(e, 'zombieGefallen'))
        if (vor.miniImFeld) nah(z.miniBoss.B - vor.miniBoss,
          -e.filter(x => x.art === 'bossTreffer' && x.boss === 'miniBoss').reduce((s, x) => s + x.menge, 0))
        if (vor.eliteImFeld) nah(z.eliteBoss.B - vor.eliteBoss,
          -e.filter(x => x.art === 'bossTreffer' && x.boss === 'eliteBoss').reduce((s, x) => s + x.menge, 0))
        if (vor.P !== null && z.P !== null && !e.some(x => x.art === 'einheitFrei'))
          nah(z.P - vor.P, -summe(e, 'angekommenSaeule'))
        for (const wert of [z.t, z.T, z.F, z.Z, z.y, z.P, z.sendeRest, z.seedZustand,
          z.miniBoss.B, z.eliteBoss.B, z.gestarteteWellen, z.saeulenIndex, unterwegs]) {
          if (wert !== null && Number.isNaN(wert)) throw new Error('NaN im Zustand')
        }
        for (const trupp of z.trupps) {
          if (Number.isNaN(trupp.pos) || Number.isNaN(trupp.anzahl)) throw new Error('NaN im Trupp')
        }
      }
      nah(unterwegs, z.trupps.reduce((s, x) => s + x.anzahl, 0))
    }
    console.log(`Bilanz: 1000 Läufe, ${schritte} Schritte in ${((performance.now() - start) / 1000).toFixed(2)} s`)
  }, 120_000)

  it('misst die Laufzeit eines 300-s-Laufs', () => {
    const z = neuerLauf(testLevel({ wellen: [], eliteBossZeit: 301 }), 1)
    const start = performance.now()
    while (z.t < 300) schritt(z, { x: 0 }, dt)
    console.log(`300-s-Lauf: ${((performance.now() - start) / 1000).toFixed(3)} s`)
    expect(z.ergebnis).toBe('laeuft')
  })

  it('stoppt die Front nach dem letzten Zombie und lässt den Elite-Boss allein marschieren', () => {
    const level = testLevel({ wellen: [{ t: 0, groesse: 50 }], streuung: 0,
      miniBossWelle: null, eliteBossZeit: 60, B_elite: 30,
      startY: 60, C: 100, zombieTreffer: 10, soldatenVerlust: 0 })
    const z = neuerLauf(level, 7)
    while (z.Z > 0 || z.t < 40) schritt(z, { x: -1 }, dt)
    expect(z.Z).toBe(0)
    const pauseY = z.y
    while (z.t < 59) schritt(z, { x: -1 }, dt)
    nah(z.y, pauseY)
    z.F = 0
    z.trupps = []
    while (!z.eliteErschienen) schritt(z, { x: -1 }, dt)
    expect(z.eliteErschienen).toBe(true)
    expect(z.y).toBeLessThan(pauseY)
    expect(z.ergebnis).toBe('laeuft')
    while (z.ergebnis === 'laeuft' && z.t < 200) schritt(z, { x: -1 }, dt)
    expect(z.ergebnis).toBe('sieg')
    expect(z.eliteBoss.B).toBe(0)
  })

  it('befreit genau vier Einheiten in Reihenfolge', () => {
    const level = testLevel({ P: 20, startY: 1000, wellen: [], eliteBossZeit: 1000 })
    const z = neuerLauf(level, 8)
    const frei: string[] = []
    while (z.t < 100) {
      for (const e of schritt(z, { x: 1 }, dt)) if (e.art === 'einheitFrei') frei.push(e.einheit!)
    }
    expect(frei).toEqual(level.saeulen)
    expect(z.P).toBeNull()
    expect(z.saeulenIndex).toBe(4)
  })

  it('marschiert ohne Frontsoldaten und sammelt links exakt', () => {
    const z = neuerLauf(testLevel({ wellen: [{ t: 0, groesse: 20 }], streuung: 0,
      miniBossWelle: null, eliteBossZeit: 1000, startY: 1000 }), 9)
    const y = z.y
    const T = z.T
    for (let i = 0; i < 30; i++) schritt(z, { x: -1 }, dt)
    nah(z.y, y - 0.8)
    nah(z.T, T + 2)
  })

  it('friert nach Sieg und Niederlage vollständig ein', () => {
    const sieg = neuerLauf(testLevel({ wellen: [], eliteBossZeit: 0, B_elite: 0 }), 1)
    schritt(sieg, { x: 0 }, dt)
    expect(sieg.ergebnis).toBe('sieg')
    const siegVorher = structuredClone(sieg)
    expect(schritt(sieg, { x: -1 }, dt)).toEqual([])
    expect(sieg).toEqual(siegVorher)
    const verloren = neuerLauf(testLevel({ startY: 0, wellen: [{ t: 0, groesse: 1 }] }), 1)
    schritt(verloren, { x: 0 }, dt)
    expect(verloren.ergebnis).toBe('niederlage')
    const verlorenVorher = structuredClone(verloren)
    expect(schritt(verloren, { x: -1 }, dt)).toEqual([])
    expect(verloren).toEqual(verlorenVorher)
  })

  it('liefert mit gleichem Seed und Eingaben identische Verläufe', () => {
    const a = neuerLauf(LEVELS[0], 1234)
    const b = neuerLauf(LEVELS[0], 1234)
    for (let i = 0; i < 3000; i++) {
      const x = [-1, 0, 1][Math.floor(i / 47) % 3]
      expect(schritt(a, { x }, dt)).toEqual(schritt(b, { x }, dt))
      expect(a).toEqual(b)
    }
  })
})
