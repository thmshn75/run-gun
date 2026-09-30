import { afterEach, describe, expect, it, vi } from 'vitest'
import { performance } from 'node:perf_hooks'
import * as THREE from 'three'
import { DARSTELLUNG, FAHRZEUGE, LEVELS } from '../src/v3d/balance3d'
import { baueFeldFahrzeug, type FahrzeugBau } from '../src/v3d/fahrzeuge'
import { Einsatzbilder, HordeGasse, HordeLoecher, baueHorde } from '../src/v3d/lauf'
import { DauertestFahrzeuge } from '../src/v3d/messung'
import { neuerLauf, schritt, starteEinheit, type Ereignis } from '../src/v3d/rechnung'
import { pruefEinsatz } from '../src/v3d/einstieg'
import type { Welt } from '../src/v3d/szene'

function attrappe() {
  const ctx = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, fillStyle: '' }
  vi.stubGlobal('document', { createElement: () => ({ width: 64, height: 64, getContext: () => ctx }) })
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera()
  const geometrie = new THREE.BoxGeometry(2, 2, 10), material = new THREE.MeshStandardMaterial()
  const vorlage = new THREE.Group()
  vorlage.add(new THREE.Mesh(geometrie, material))
  const rotor = new THREE.Group(), heckrotor = new THREE.Group()
  rotor.name = 'rotor'; heckrotor.name = 'heckrotor'
  vorlage.add(rotor, heckrotor)
  const bau: FahrzeugBau = { geometrien: [geometrie], material, laenge: 10, vorlage, gibFrei() {} }
  const welt = { scene, camera, laufGruppen: [], fahrzeuge: { humvee: bau, hubschrauber: bau, panzer: bau, haubitze: bau } } as unknown as Welt
  return { welt, geometrie, material }
}
afterEach(() => vi.unstubAllGlobals())

describe('D5c Feldfahrzeuge', () => {
  it('übernimmt die Prüf-Einsätze genau einmal in angegebener Reihenfolge', () => {
    expect(pruefEinsatz('?pruefung=1&einsatz=hubschrauber,humvee,hubschrauber,falsch,panzer')).toEqual(['hubschrauber', 'humvee', 'panzer'])
    expect(pruefEinsatz('?einsatz=humvee,hubschrauber')).toEqual([])
  })
  it('baut alle vier Kurs-Gruppen mit voller Spielgröße und Ursprung am Boden', () => {
    const { welt } = attrappe()
    for (const name of ['humvee', 'hubschrauber', 'panzer', 'haubitze'] as const) {
      const kurs = baueFeldFahrzeug(welt.fahrzeuge[name], name)
      const box = new THREE.Box3().setFromObject(kurs, true)
      expect(kurs.scale.x).toBe(1)
      expect(kurs.rotation.y).toBe(0)
      expect(box.getSize(new THREE.Vector3()).z).toBeCloseTo(FAHRZEUGE[name].LAENGE * FAHRZEUGE[name].SPIEL_SKALA, 2)
      expect(box.min.y).toBeCloseTo(0, 5)
      expect(box.getCenter(new THREE.Vector3()).x).toBeCloseTo(0, 5)
      expect(box.getCenter(new THREE.Vector3()).z).toBeCloseTo(0, 5)
    }
  })

  for (const dt of [1 / 60, .1]) {
    it(`Humvee fährt zur Front, weicht zurück und schießt am Ort (dt ${dt})`, () => {
      const { welt } = attrappe(), bilder = new Einsatzbilder(welt), z = neuerLauf(LEVELS[0], 1)
      z.y = 20; z.Z = 1000
      const a = starteEinheit(z, 'humvee')
      a.verstrichen = 3
      bilder.abgleichen(z, [], 0)
      const gruppe = welt.scene.getObjectByName('einsatz-humvee') as THREE.Group
      expect(gruppe.position.z).toBeCloseTo(-12.5, 2)
      z.y = 5; a.verstrichen += dt
      bilder.abgleichen(z, [], dt)
      expect(gruppe.position.z).toBeCloseTo(-7.84, 2)
      expect(bilder.schuesse(a)).toBe(0)
      let gemeldet = 0
      for (let t = 0; t < 30 - 2 * dt; t += dt) {
        a.verstrichen = 3 + t
        bilder.abgleichen(z, [{ art: 'spezialTreffer', einheit: 'humvee', menge: 4 * dt, t }], dt)
        gemeldet += bilder.nimmTreffer().reduce((summe, treffer) => summe + treffer.menge, 0)
      }
      expect(bilder.schuesse(a)).toBeGreaterThanOrEqual(118)
      expect(bilder.schuesse(a)).toBeLessThanOrEqual(120)
      expect(gemeldet).toBeGreaterThanOrEqual(118)
      const ziele = bilder.letzteZiele(a)
      expect(Math.min(...ziele.map(p => p.x))).toBeCloseTo(-2.6, 5)
      expect(Math.max(...ziele.map(p => p.x))).toBeCloseTo(2.6, 5)
      expect(ziele.every(p => p.z <= -z.y - .5 && p.z >= -z.y - 2.5)).toBe(true)
      bilder.gibFrei()
    })

    it(`Hubschrauber kreist, hält Höhe und schießt bei Horde oder Boss (dt ${dt})`, () => {
      const { welt } = attrappe(), bilder = new Einsatzbilder(welt), z = neuerLauf(LEVELS[0], 1)
      z.y = 15; z.Z = 1000
      const a = starteEinheit(z, 'hubschrauber')
      a.verstrichen = 2
      bilder.abgleichen(z, [], 0)
      const gruppe = welt.scene.getObjectByName('einsatz-hubschrauber') as THREE.Group
      expect(gruppe.position.x).toBeCloseTo(3, 2)
      expect(gruppe.position.z).toBeCloseTo(-20, 2)
      expect(new THREE.Box3().setFromObject(gruppe, true).min.y).toBeCloseTo(FAHRZEUGE.hubschrauber.FLUGHOEHE, 2)
      expect(gruppe.getObjectByName('rotor')).toBeDefined()
      bilder.nachlauf(dt)
      expect(gruppe.getObjectByName('rotor')!.rotation.y).toBeCloseTo(dt * 8 * Math.PI, 3)
      expect(gruppe.getObjectByName('heckrotor')!.rotation.x).toBeCloseTo(dt * 12 * Math.PI, 3)
      z.y = 17; a.verstrichen = 5
      bilder.abgleichen(z, [], 0)
      expect(gruppe.position.x).toBeCloseTo(-3, 2)
      expect(Math.hypot(gruppe.position.x, gruppe.position.z - (-z.y - 5))).toBeCloseTo(3, 2)
      let gemeldet = 0
      for (let t = 0; t < 12 - 2 * dt; t += dt) {
        a.verstrichen = 2 + t
        bilder.abgleichen(z, [{ art: 'spezialTreffer', einheit: 'hubschrauber', menge: 20 * dt, t }], dt)
        gemeldet += bilder.nimmTreffer().reduce((summe, treffer) => summe + treffer.menge, 0)
      }
      expect(bilder.schuesse(a)).toBeGreaterThanOrEqual(59)
      expect(bilder.schuesse(a)).toBeLessThanOrEqual(60)
      expect(gemeldet).toBeGreaterThanOrEqual(235)
      const boss = new THREE.Vector3(1, 2, -30), vor = bilder.schuesse(a)
      for (let i = 0; i < Math.ceil(.4 / dt); i++) bilder.abgleichen(z, [], dt, boss)
      expect(bilder.schuesse(a)).toBeGreaterThan(vor)
      expect(bilder.nimmTreffer()).toHaveLength(0)
      expect(bilder.letzteZiele(a).at(-1)).toEqual(boss)
      bilder.gibFrei()
    })
  }

  for (const dt of [1 / 60, .1]) {
    it(`richtet beide Hubschrauber beim Anflug zum Ziel aus (dt ${dt})`, () => {
      const { welt } = attrappe(), bilder = new Einsatzbilder(welt), z = neuerLauf(LEVELS[0], 1)
      z.y = 15
      const erster = starteEinheit(z, 'hubschrauber'), zweiter = starteEinheit(z, 'hubschrauber')
      for (let i = 1; i <= Math.round(.5 / dt); i++) {
        erster.verstrichen = i * dt
        zweiter.verstrichen = i * dt
        bilder.abgleichen(z, [], dt)
      }
      const flieger = welt.scene.children.filter(o => o.name === 'einsatz-hubschrauber')
      expect(flieger).toHaveLength(2)
      expect(flieger[0].rotation.y).toBeLessThan(0)
      expect(-Math.sin(flieger[0].rotation.y)).toBeGreaterThan(0)
      expect(-Math.sin(flieger[1].rotation.y)).toBeLessThan(0)
      bilder.gibFrei()
    })
  }

  it('begrenzt Nachholschüsse und versetzt doppelte Fahrzeuge', () => {
    const { welt } = attrappe(), bilder = new Einsatzbilder(welt), z = neuerLauf(LEVELS[0], 1)
    z.y = 20
    const h1 = starteEinheit(z, 'humvee'), h2 = starteEinheit(z, 'humvee')
    const f1 = starteEinheit(z, 'hubschrauber'), f2 = starteEinheit(z, 'hubschrauber')
    for (const a of [h1, h2, f1, f2]) a.verstrichen = 15
    bilder.abgleichen(z, [], 0)
    const humvees = welt.scene.children.filter(o => o.name === 'einsatz-humvee')
    const flieger = welt.scene.children.filter(o => o.name === 'einsatz-hubschrauber')
    expect(Math.abs(humvees[0].position.x - humvees[1].position.x)).toBeGreaterThanOrEqual(2)
    expect(flieger[0].position.distanceTo(flieger[1].position)).toBeGreaterThanOrEqual(5)
    const ereignisse: Ereignis[] = [{ art: 'spezialTreffer', einheit: 'humvee', menge: 4, t: 0 }, { art: 'spezialTreffer', einheit: 'hubschrauber', menge: 20, t: 0 }]
    bilder.abgleichen(z, ereignisse, 1)
    expect(bilder.schuesse(h1)).toBeLessThanOrEqual(2)
    expect(bilder.schuesse(f1)).toBeLessThanOrEqual(2)
    z.ergebnis = 'sieg'
    bilder.abgleichen(z, [], 0)
    bilder.nachlauf(1.5)
    expect(bilder.anzahl).toBe(0)
    bilder.gibFrei()
    expect(welt.laufGruppen).toHaveLength(0)
  })

  it('hält Löcher zwei Sekunden und Gasse bis zur nächsten Welle offen', () => {
    const loecher = new HordeLoecher(), gasse = new HordeGasse()
    const punkt = new THREE.Vector3(0, .2, -20)
    expect(loecher.treffer(600, -15, punkt, 1, 10)).toBe(1)
    const index = [...loecher.indizes][0]
    loecher.schritt(1.99)
    expect(loecher.indizes.has(index)).toBe(true)
    loecher.schritt(.25)
    expect(loecher.indizes.has(index)).toBe(false)
    loecher.zuruecksetzen()
    expect(loecher.treffer(600, -15, punkt, 200, 100)).toBe(150)
    expect(loecher.indizes.size).toBe(150)
    gasse.beginne(0, FAHRZEUGE.panzer.SCHNEISE_HALB)
    gasse.erweitere(-20)
    const aufgebaut = baueHorde(600, new Set(), gasse)
    expect(aufgebaut.eintraege).toHaveLength(600)
    expect(aufgebaut.eintraege.some(e => gasse.enthaelt(e))).toBe(false)
    gasse.schritt(10, false)
    expect(gasse.bis).toBe(-20)
    gasse.schritt(1.5, true)
    expect(gasse.bis).toBeCloseTo(-10, 2)
    gasse.schritt(1.5, false)
    expect(gasse.aktiv).toBe(false)
  })

  it('baut die volle Horde mit offener Gasse im Desktop-Budget', () => {
    const gasse = new HordeGasse()
    gasse.beginne(0, FAHRZEUGE.panzer.SCHNEISE_HALB)
    gasse.erweitere(-50)
    for (let i = 0; i < 5; i++) baueHorde(600, new Set(), gasse)
    const start = performance.now()
    for (let i = 0; i < 30; i++) expect(baueHorde(600, new Set(), gasse).eintraege).toHaveLength(600)
    expect((performance.now() - start) / 30).toBeLessThan(2)
  })

  it('zündet pro Boss genau einmal bei der Panzer-Durchfahrt', () => {
    const { welt } = attrappe(), bilder = new Einsatzbilder(welt), z = neuerLauf(LEVELS[0], 1)
    z.y = 20; z.Z = 600
    const panzer = starteEinheit(z, 'panzer')
    panzer.verstrichen = 4.2
    bilder.abgleichen(z, [], 0)
    const gruppe = welt.scene.getObjectByName('einsatz-panzer') as THREE.Group
    const bossZ = gruppe.position.z - FAHRZEUGE.panzer.LAENGE * FAHRZEUGE.panzer.SPIEL_SKALA / 2
    const mini = new THREE.Vector3(-1, 1.5, bossZ), elite = new THREE.Vector3(1, 1.5, bossZ)
    const explosionen = vi.spyOn(bilder.explosionen, 'starte')
    bilder.abgleichen(z, [], 0, mini, [mini, elite])
    expect(explosionen).toHaveBeenCalledTimes(2)
    bilder.abgleichen(z, [], .1, elite, [undefined, elite])
    expect(explosionen).toHaveBeenCalledTimes(2)
    bilder.gibFrei()
  })

  it('zieht beiden Bossen in der Panzer-Schneise je fünf Prozent Startleben ab', () => {
    for (const dt of [1 / 30, .1]) {
      const z = neuerLauf({ ...LEVELS[0], wellen: [], saeulen: [], eliteBossZeit: 999 }, 1)
      z.Z = 1000; z.miniBoss = { imFeld: true, B: 400 }; z.eliteBoss = { imFeld: true, B: 3000 }
      const a = starteEinheit(z, 'panzer'); a.verstrichen = 4.2
      let mini = 0, elite = 0
      while (a.verstrichen < 9.2 - 1e-8) {
        const ereignisse = schritt(z, { x: 0 }, dt)
        mini += ereignisse.filter(e => e.art === 'bossTreffer' && e.boss === 'miniBoss').reduce((s, e) => s + e.menge, 0)
        elite += ereignisse.filter(e => e.art === 'bossTreffer' && e.boss === 'eliteBoss').reduce((s, e) => s + e.menge, 0)
      }
      expect(mini).toBeCloseTo(20, 1)
      expect(elite).toBeCloseTo(150, 1)
    }
  })

  it('hält beide Fahrzeuge im Dauertest aktiv und räumt sie idempotent weg', () => {
    const { welt, geometrie, material } = attrappe(), freiGeo = vi.spyOn(geometrie, 'dispose'), freiMat = vi.spyOn(material, 'dispose')
    const test = new DauertestFahrzeuge(welt)
    const [humvee, hubschrauber] = test.zustand.aktiv
    for (let sek = 0; sek < 70; sek++) {
      const vorher = test.einsatz.schuesse(humvee) + test.einsatz.schuesse(hubschrauber)
      for (let bild = 0; bild < 10; bild++) test.aktualisiere(.1)
      expect(test.einsatz.schuesse(humvee) + test.einsatz.schuesse(hubschrauber)).toBeGreaterThan(vorher)
    }
    const h = test.einsatz.schuesse(humvee), f = test.einsatz.schuesse(hubschrauber)
    test.aktualisiere(.5)
    expect(test.einsatz.schuesse(humvee) - h).toBeLessThanOrEqual(2)
    expect(test.einsatz.schuesse(hubschrauber) - f).toBeLessThanOrEqual(2)
    test.gibFrei(); test.gibFrei()
    expect(welt.scene.getObjectByName('einsatz-humvee')).toBeUndefined()
    expect(welt.scene.getObjectByName('einsatz-hubschrauber')).toBeUndefined()
    expect(welt.laufGruppen).toHaveLength(0)
    expect(freiGeo).not.toHaveBeenCalled()
    expect(freiMat).not.toHaveBeenCalled()
    expect(DARSTELLUNG.EXPLOSIONEN_MAX).toBe(12)
  })
})
