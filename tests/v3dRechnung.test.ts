import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { LEVELS, type Level } from '../src/v3d/balance3d'
import { neuerLauf, schritt, starteEinheit, gesamtDauer, phaseBei, type Ereignis } from '../src/v3d/rechnung'

const dt = 1 / 30
const testLevel = (aenderung: Partial<Level>): Level => ({ ...LEVELS[0],
  wellen: LEVELS[0].wellen.map(w => ({ ...w })), saeulen: [...LEVELS[0].saeulen], ...aenderung })
const summe = (e: Ereignis[], art: Ereignis['art']) => e.filter(x => x.art === art).reduce((s, x) => s + x.menge, 0)
const nah = (a: number, b: number) => {
  if (Math.abs(a - b) > 1e-6 || Number.isNaN(a) || Number.isNaN(b))
    throw new Error(`Bilanzabweichung: ${a} statt ${b}`)
}

describe('3D-Spielrechnung', () => {
  it('wirkt je Ablauf unabhängig von der Schrittweite exakt wie die Tabelle', () => {
    for (const [name, dauer, wirkung] of [['humvee',8,120],['haubitze',6.75,180],['panzer',9.2,160],['hubschrauber',14,240]] as const) {
      expect(gesamtDauer(name)).toBeCloseTo(dauer, 8)
      for (const zeitSchritt of [1/30,.1,1]) {
        const z = neuerLauf(testLevel({ wellen: [], saeulen: [], eliteBossZeit: 999, startY: 1000 }), 5)
        z.Z = 10000
        starteEinheit(z, name)
        let gesamt = 0
        while (z.aktiv.length) {
          const e = schritt(z, {x:0}, zeitSchritt)
          gesamt += e.filter(x => x.art === 'spezialTreffer').reduce((s,x)=>s+x.menge,0)
        }
        expect(gesamt).toBeCloseTo(wirkung, 6)
      }
    }
  })
  it('hat in der Fahrt keine Wirkung und teilt Grenzschritte anteilig', () => {
    const z = neuerLauf(testLevel({wellen:[],saeulen:[],eliteBossZeit:999,startY:1000}), 1)
    z.Z=1000
    const a=starteEinheit(z,'humvee')
    expect(summe(schritt(z,{x:0},1),'spezialTreffer')).toBe(0)
    expect(summe(schritt(z,{x:0},1),'spezialTreffer')).toBe(0)
    a.verstrichen=1.5
    expect(summe(schritt(z,{x:0},1),'spezialTreffer')).toBeCloseTo(10)
    expect(phaseBei('humvee',2.5)).toMatchObject({index:1,art:'schneise',lokal:.5})
  })
  it('setzt zwei Haubitzeneinschläge auf die geplanten Zeitpunkte und wirkt bei der Abfahrt nicht', () => {
    for (const zeitSchritt of [1/30,.1,1]) {
      const z=neuerLauf(testLevel({wellen:[],saeulen:[],eliteBossZeit:999,startY:1000}),1)
      z.Z=1000
      const start=z.t
      starteEinheit(z,'haubitze')
      const treffer:Ereignis[]=[]
      while(z.aktiv.length) treffer.push(...schritt(z,{x:0},zeitSchritt).filter(e=>e.art==='spezialTreffer'))
      expect(treffer).toHaveLength(2)
      treffer.forEach((e,i)=>{expect(e.menge).toBe(90);expect(e.t).toBeGreaterThanOrEqual(start+1.2+4*i-zeitSchritt);expect(e.t).toBeLessThan(start+1.2+4*i)})
    }
  })
  it('bilanziert jeden Schritt in 1000 deterministischen Zufallsläufen', () => {
    const start = performance.now()
    let schritte = 0
    for (let lauf = 1; lauf <= 1000; lauf++) {
      const z = neuerLauf(LEVELS[0], lauf)
      let unterwegs = 0
      let letzterK = 2
      let eingabe = 0
      let wechsel = 0
      // Separater Test-Zufall: keine Math.random-Abhängigkeit und wiederholbarer Test.
      let rng = (lauf * 2654435761) >>> 0
      const zufall = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296 }
      while (z.ergebnis === 'laeuft' && z.t < 300) {
        if (z.t >= wechsel) {
          eingabe = [-1, 0, 1][Math.floor(zufall() * 3)]
          wechsel = z.t + 0.5 + 4.5 * zufall()
        }
        const vor = { T: z.T, F: z.F, Z: z.Z, P: z.P,
          miniBoss: z.miniBoss.B, eliteBoss: z.eliteBoss.B,
          miniImFeld: z.miniBoss.imFeld, eliteImFeld: z.eliteBoss.imFeld }
        const e = schritt(z, { x: eingabe }, dt)
        schritte++
        nah(z.T - vor.T, summe(e, 'eingesammelt') - summe(e, 'ausgesandt'))
        const deltaUnterwegs = summe(e, 'ausgesandt') + summe(e, 'vervielfacht')
          - summe(e, 'angekommenFront')
        unterwegs += deltaUnterwegs
        // Die Summe wird nur aus Ereignissen fortgeschrieben, nie je Schritt neu berechnet.
        nah(summe(e, 'ausgesandt') + summe(e, 'vervielfacht'),
          summe(e, 'angekommenFront') + deltaUnterwegs)
        nah(z.F - vor.F, summe(e, 'angekommenFront') - summe(e, 'soldatGefallen'))
        nah(z.Z - vor.Z, summe(e, 'welle') - summe(e, 'zombieGefallen') - summe(e, 'spezialTreffer'))
        if (vor.miniImFeld) nah(z.miniBoss.B - vor.miniBoss,
          -e.filter(x => x.art === 'bossTreffer' && x.boss === 'miniBoss').reduce((s, x) => s + x.menge, 0))
        if (vor.eliteImFeld) nah(z.eliteBoss.B - vor.eliteBoss,
          -e.filter(x => x.art === 'bossTreffer' && x.boss === 'eliteBoss').reduce((s, x) => s + x.menge, 0))
        if (vor.P !== null && z.P !== null && !e.some(x => x.art === 'einheitFrei'))
          nah(z.P - vor.P, -summe(e, 'saeuleTreffer'))
        for (const wert of [z.t, z.T, z.F, z.Z, z.y, z.P, z.sendeRest, z.seedZustand,
          z.miniBoss.B, z.eliteBoss.B, z.gestarteteWellen, z.saeulenIndex, unterwegs, z.durchWand, z.kAktuell, ...z.aktiv.map(a => a.verstrichen)]) {
          if (wert !== null && Number.isNaN(wert)) throw new Error('NaN im Zustand')
        }
        expect(z.kAktuell).toBeGreaterThanOrEqual(letzterK)
        expect(z.kAktuell).toBeLessThanOrEqual(4)
        letzterK = z.kAktuell
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
    schritt(z, { x: -1 }, dt)
    z.Z = 0
    z.F = 5
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
    expect(z.ergebnis).toBe('niederlage')
    expect(z.eliteBoss.B).toBeGreaterThan(0)
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
    nah(z.T, T + 6)
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

  it('begrenzt das Senden auf die Mitte und den Vorrat und verwirft den Sendrest', () => {
    const z = neuerLauf(testLevel({ wellen: [], eliteBossZeit: 999 }), 1)
    z.T = 0
    expect(summe(schritt(z, { x: 0 }, .1), 'ausgesandt')).toBe(0)
    z.T = 10
    schritt(z, { x: 0 }, .1)
    expect(z.sendeRest).toBeCloseTo(.8)
    expect(summe(schritt(z, { x: -1 }, .1), 'ausgesandt')).toBe(0)
    expect(z.sendeRest).toBe(0)
    const T = z.T
    expect(summe(schritt(z, { x: 1 }, .1), 'ausgesandt')).toBe(0)
    expect(z.T).toBe(T)
    expect(z.P).toBeLessThan(150)
    z.T = .9
    schritt(z, { x: 0 }, .1)
    expect(z.sendeRest).toBe(0)
    z.T = 1
    expect(summe(schritt(z, { x: 0 }, .2), 'ausgesandt')).toBe(0)
    expect(z.T).toBe(1)
    expect(z.sendeRest).toBe(0)
    z.T = 2
    expect(summe(schritt(z, { x: 0 }, .2), 'ausgesandt')).toBe(1)
    expect(z.T).toBe(1)
    expect(z.sendeRest).toBe(0)
  })

  it('steigert die Wand exakt nach 100 und 200 ursprünglichen Soldaten', () => {
    const z = neuerLauf(testLevel({ wellen: [], eliteBossZeit: 999, startY: 1000 }), 1)
    const durch = (anzahl: number) => {
      z.trupps.push({ ziel: 'front', pos: 4.9, anzahl, vervielfacht: false, k: 1 })
      return schritt(z, { x: -1 }, .1)
    }
    expect(summe(durch(99), 'wandStufe')).toBe(0)
    expect(z.kAktuell).toBe(2)
    expect(summe(durch(1), 'wandStufe')).toBe(3)
    expect(z.kAktuell).toBe(3)
    expect(summe(durch(100), 'wandStufe')).toBe(4)
    expect(z.kAktuell).toBe(4)
    expect(summe(durch(100), 'wandStufe')).toBe(0)
    expect(z.durchWand).toBe(300)
  })

  it('lässt bei Säulenfall Überschuss verfallen und startet die Einheit sofort', () => {
    const z = neuerLauf(testLevel({ P: 1, wellen: [{ t: 0, groesse: 100 }], streuung: 0,
      miniBossWelle: null, eliteBossZeit: 999 }), 1)
    z.T = 100
    const e = schritt(z, { x: 1 }, 1)
    expect(summe(e, 'saeuleTreffer')).toBe(1)
    expect(z.P).toBe(1)
    expect(z.saeulenIndex).toBe(1)
    expect(z.T).toBe(100)
    expect(e.some(x => x.art === 'einheitAktiv' && x.einheit === 'humvee')).toBe(true)
    expect(summe(e, 'spezialTreffer')).toBe(0)
  })

  it('lässt die Haubitze genau zweimal und zwei Einheiten gemeinsam wirken', () => {
    const z = neuerLauf(testLevel({ wellen: [{ t: 0, groesse: 1000 }], streuung: 0,
      miniBossWelle: null, eliteBossZeit: 999 }), 1)
    starteEinheit(z, 'haubitze'); starteEinheit(z, 'humvee')
    let haubitze = 0, humvee = 0, ende = 0
    for (let i = 0; i < 7; i++) {
      const e = schritt(z, { x: -1 }, 1)
      haubitze += e.filter(x => x.art === 'spezialTreffer' && x.einheit === 'haubitze').length
      humvee += e.filter(x => x.art === 'spezialTreffer' && x.einheit === 'humvee').length
      ende += e.filter(x => x.art === 'einheitEnde' && x.einheit === 'haubitze').length
    }
    expect(haubitze).toBe(2)
    expect(humvee).toBe(5)
    expect(ende).toBe(1)
  })

  it('lässt den Hubschrauber zuerst den Mini-Boss treffen', () => {
    const z = neuerLauf(testLevel({ wellen: [], eliteBossZeit: 999 }), 1)
    z.miniBoss.imFeld = true
    z.eliteBoss.imFeld = true
    starteEinheit(z, 'hubschrauber')
    schritt(z, { x: -1 }, 1); schritt(z, { x: -1 }, 1)
    const e = schritt(z, { x: -1 }, 1)
    expect(e.filter(x => x.art === 'bossTreffer').map(x => x.boss)).toEqual(['miniBoss'])
    expect(z.miniBoss.B).toBe(375)
    expect(z.eliteBoss.B).toBe(3000)
  })

  it('weist ungültige Schrittzeiten zurück', () => {
    const z = neuerLauf(LEVELS[0], 1)
    for (const dt of [0, -1, NaN, Infinity]) expect(() => schritt(z, { x: 0 }, dt)).toThrow(RangeError)
  })
})
