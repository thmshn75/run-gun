import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { LEVELS, SPEZIAL, WERKSTATT, type Level } from '../src/v3d/balance3d'
import { neuerLauf, schritt, starteEinheit, gesamtDauer, phaseBei, saeulenStartP } from '../src/v3d/rechnung'
import { leereStufen, muenzenFuerLauf, preis, wendeStufenAn, zaehleBesiegt } from '../src/v3d/werkstatt'
import { bucheMuenzen, kaufe, ladeWerkstatt } from '../src/v3d/speicher'
import { bucheEndeEinmal, direktStart, eisPruefLevel, testLevel, zaehltFuerKonto } from '../src/v3d/einstieg'
import { Einsatzbilder, panzerSchusszeiten } from '../src/v3d/lauf'
import { fuelleLobby, fuelleWerkstatt } from '../src/v3d/oberflaeche'
import type { Welt } from '../src/v3d/szene'
import type { FahrzeugBau } from '../src/v3d/fahrzeuge'

const werte = new Map<string, string>()
beforeEach(() => {
  werte.clear()
  vi.stubGlobal('localStorage', { getItem: (k: string) => werte.get(k) ?? null, setItem: (k: string, v: string) => { werte.set(k, v) } })
})

describe('Werkstattkonto', () => {
  it('heilt jedes kaputte Feld einzeln und lässt den 2D-Spielstand bytegleich', () => {
    const alt = ' { "roh" : [1,2] } '
    werte.set('rungun_save_v1', alt)
    expect(ladeWerkstatt()).toEqual({ version: 1, muenzen: 0, stufen: leereStufen() })
    werte.set('rg3d.werkstatt.v1', '{')
    expect(ladeWerkstatt().muenzen).toBe(0)
    werte.set('rg3d.werkstatt.v1', JSON.stringify({ version: 1, muenzen: -1, stufen: { truppe: 2, feuer: 1.5, eis: 6, panzer: 1, mecha: -2 } }))
    expect(ladeWerkstatt()).toEqual({ version: 1, muenzen: 0, stufen: { ...leereStufen(), truppe: 2, panzer: 1 } })
    expect(bucheMuenzen(9999999)).toBe(999999)
    expect(ladeWerkstatt().muenzen).toBe(999999)
    expect(werte.get('rungun_save_v1')).toBe(alt)
  })
  it('prüft Preis, Kontostand, Maximum und den gespeicherten Kauf', () => {
    expect(preis('truppe', 0)).toBe(100)
    expect(preis('truppe', 5)).toBeNull()
    expect(kaufe('truppe')).toBe(false)
    bucheMuenzen(2100)
    const setzen = vi.fn((k: string, v: string) => werte.set(k, v))
    vi.stubGlobal('localStorage', { getItem: (k: string) => werte.get(k) ?? null, setItem: setzen })
    expect(kaufe('truppe')).toBe(true)
    expect(setzen).toHaveBeenCalledTimes(1)
    expect(ladeWerkstatt().muenzen).toBe(2000)
    for (let i = 0; i < 4; i++) expect(kaufe('truppe')).toBe(true)
    expect(kaufe('truppe')).toBe(false)
    expect(ladeWerkstatt().stufen.truppe).toBe(5)
    const vorher = ladeWerkstatt()
    vi.stubGlobal('localStorage', { getItem: (k: string) => werte.get(k) ?? null, setItem: () => { throw Error('gesperrt') } })
    expect(kaufe('panzer')).toBe(false)
    expect(ladeWerkstatt()).toEqual(vorher)
  })
  it('meldet einen Kauf bei fehlender Rücklesebestätigung als gescheitert', () => {
    bucheMuenzen(400)
    vi.stubGlobal('localStorage', { getItem: (k: string) => werte.get(k) ?? null, setItem: () => {} })
    expect(kaufe('panzer')).toBe(false)
    expect(ladeWerkstatt().stufen.panzer).toBe(0)
  })
})

describe('Werkstattrechnung', () => {
  const leer = leereStufen()
  it('ändert bei Stufe null keine Werte und kopiert Arrays und Abläufe', () => {
    const basis = LEVELS[0]
    const stufeNull = wendeStufenAn(basis, leer)
    expect(stufeNull).toMatchObject({ T0: basis.T0, zombieTreffer: basis.zombieTreffer, P: basis.P })
    expect(stufeNull).not.toBe(basis)
    expect(stufeNull.wellen).not.toBe(basis.wellen)
    expect(stufeNull.wellen[0]).not.toBe(basis.wellen[0])
    expect(stufeNull.saeulen).not.toBe(basis.saeulen)
    const panzer = wendeStufenAn(basis, { ...leer, panzer: 1 })
    expect(panzer.spezial?.panzer?.ablauf).not.toBe(WERKSTATT.panzer.ablauf)
  })
  it('wendet Grundstufen nur im Normallauf an und lässt Direktstart und Testgelände aus', () => {
    const alle = { ...leer, truppe: 3, feuer: 3, eis: 3, humvee: 1 }
    const normal = wendeStufenAn(LEVELS[0], alle)
    expect(normal.T0).toBe(LEVELS[0].T0 + 15)
    expect(normal.zombieTreffer).toBeCloseTo(LEVELS[0].zombieTreffer * 1.3)
    for (let i = 0; i < 10; i++) expect(saeulenStartP(normal, i)).toBeCloseTo(saeulenStartP(LEVELS[0], i) * .7, 0)
    const test = wendeStufenAn(testLevel(), alle, true)
    expect(test.P).toBe(10)
    expect(test.T0).toBe(LEVELS[0].T0)
    expect(test.zombieTreffer).toBe(LEVELS[0].zombieTreffer)
    expect(gesamtDauer(starteEinheit(neuerLauf(test, 1), 'humvee'))).toBe(18)
    expect(direktStart('?pruefung=1')).toBe(true)
    expect(direktStart('?nahaufnahme=mecha')).toBe(true)
    expect(eisPruefLevel('?pruefung=1&eis=10', LEVELS[0]).P).toBe(10)
    expect(LEVELS[0].spezial).toBeUndefined()
    expect(zaehltFuerKonto(null, false)).toBe(true)
    expect(zaehltFuerKonto('panzer', false)).toBe(false)
    expect(zaehltFuerKonto(null, true)).toBe(false)
  })
  it('setzt Fahrzeugwirkung und Einschlagzeiten aus dem individuellen Ablauf um', () => {
    const stufen = { ...leer, panzer: 1, haubitze: 1, humvee: 1, hubschrauber: 1, mecha: 1 }
    const level: Level = { ...wendeStufenAn(LEVELS[0], stufen), wellen: [], saeulen: [], eliteBossZeit: 999, startY: 1000 }
    for (const [name, wirkung] of [['panzer', 190], ['haubitze', 270], ['mecha', 330], ['humvee', 160], ['hubschrauber', 320]] as const) {
      const z = neuerLauf(level, 1); z.Z = 10000
      const a = starteEinheit(z, name), einschlaege: number[] = []
      while (z.aktiv.length) for (const e of schritt(z, { x: 0 }, .05)) if (e.art === 'spezialTreffer' && (name === 'haubitze' || name === 'mecha')) einschlaege.push(e.t)
      expect(10000 - z.Z).toBeCloseTo(wirkung, 5)
      if (name === 'haubitze') {
        expect(einschlaege).toHaveLength(3)
        einschlaege.forEach((t, i) => expect(t).toBeCloseTo(1.2 + 4 * i, 5))
      }
      if (name === 'panzer') {
        panzerSchusszeiten(a.ablauf).forEach((s, i) => expect(s.zeit).toBeCloseTo([1.45, 1.85, 3.7, 4.1, 5.95, 6.35][i], 8))
        expect(phaseBei(a, 5.95).art).toBe('feuer')
      }
    }
  })
  it('lässt Tabellen nach fünf Läufen mit allen Stufen unverändert', () => {
    const vorherLevels = structuredClone(LEVELS), vorherSpezial = structuredClone(SPEZIAL)
    const basis = structuredClone(LEVELS[0])
    Object.freeze(basis); Object.freeze(basis.wellen); Object.freeze(basis.saeulen)
    const voll = { truppe: 5, feuer: 5, eis: 5, panzer: 1, haubitze: 1, humvee: 1, hubschrauber: 1, mecha: 1 }
    for (let seed = 1; seed <= 5; seed++) {
      const z = neuerLauf(wendeStufenAn(basis, voll), seed)
      z.Z = 10000
      for (const name of ['panzer', 'haubitze', 'humvee', 'hubschrauber', 'mecha'] as const) starteEinheit(z, name)
      for (let i = 0; i < 600 && z.aktiv.length; i++) schritt(z, { x: 0 }, .05)
      expect(z.aktiv).toHaveLength(0)
    }
    expect(LEVELS).toEqual(vorherLevels)
    expect(SPEZIAL).toEqual(vorherSpezial)
  })
  it('zählt für Tafel, Bots und Münzen dieselben Ereignisse und bucht ein Ende einmal', () => {
    const ereignisse = [{ art: 'zombieGefallen', menge: 660 }, { art: 'spezialTreffer', menge: 100 }, { art: 'bossTreffer', menge: 1000 }]
    expect(zaehleBesiegt(ereignisse)).toBe(760)
    expect(muenzenFuerLauf(1, 'sieg', 760)).toBe(151)
    expect(muenzenFuerLauf(1, 'niederlage', 760)).toBe(76)
    const stand = { gutgeschrieben: false, betrag: 0 }
    expect(bucheEndeEinmal(stand, 1, 'sieg', 760, null, false)).toBe(151)
    expect(bucheEndeEinmal(stand, 1, 'sieg', 760, null, false)).toBe(151)
    expect(ladeWerkstatt().muenzen).toBe(151)
    const testStand = { gutgeschrieben: false, betrag: 0 }
    expect(bucheEndeEinmal(testStand, 1, 'sieg', 760, 'panzer', false)).toBe(0)
    expect(ladeWerkstatt().muenzen).toBe(151)
  })
})

class ElementProbe {
  style: Record<string, string> = {}
  dataset: Record<string, string> = {}
  children: ElementProbe[] = []
  textContent = ''
  disabled = false
  private listeners = new Map<string, () => void>()
  setAttribute() {}
  addEventListener(art: string, fn: () => void) { this.listeners.set(art, fn) }
  click() { if (!this.disabled) this.listeners.get('click')?.() }
  append(...children: ElementProbe[]) { this.children.push(...children) }
  replaceChildren(...children: ElementProbe[]) { this.children = children }
}

describe('Werkstattansicht und Einsatzbilder', () => {
  it('kauft aus der Lobby, kehrt zurück und liefert die neue Stufe für SPIELEN', () => {
    vi.stubGlobal('document', { createElement: () => new ElementProbe() })
    try {
      bucheMuenzen(400)
      const lobby = new ElementProbe(), werkstatt = new ElementProbe()
      let gestarteteTruppe = 0
      const zeigeLobby = () => fuelleLobby(lobby as unknown as HTMLDivElement,
        { hoechstes: 1, levelAnzahl: 1, beste: {}, fahrzeuge: [], muenzen: ladeWerkstatt().muenzen },
        () => { gestarteteTruppe = wendeStufenAn(LEVELS[0], ladeWerkstatt().stufen).T0 }, () => {},
        () => fuelleWerkstatt(werkstatt as unknown as HTMLDivElement, zeigeLobby))
      zeigeLobby()
      lobby.children[3].children[1].click()
      expect(werkstatt.children[2].children).toHaveLength(8)
      const truppe = werkstatt.children[2].children[0]
      expect(truppe.style.minHeight).toBe('56px')
      truppe.children[2].click()
      expect(ladeWerkstatt().stufen.truppe).toBe(1)
      werkstatt.children[0].children[0].click()
      lobby.children[3].children[0].click()
      expect(gestarteteTruppe).toBe(LEVELS[0].T0 + 5)
    } finally { vi.unstubAllGlobals() }
  })

  it('zeigt bei fehlgeschlagenem Speichern die Fehlermeldung', () => {
    bucheMuenzen(400)
    vi.stubGlobal('localStorage', { getItem: (k: string) => werte.get(k) ?? null, setItem: () => { throw Error('gesperrt') } })
    vi.stubGlobal('document', { createElement: () => new ElementProbe() })
    try {
      const element = new ElementProbe()
      fuelleWerkstatt(element as unknown as HTMLDivElement, () => {})
      element.children[2].children[3].children[2].click()
      expect(element.children[1].textContent).toBe('Speichern nicht möglich')
      expect(ladeWerkstatt().stufen.panzer).toBe(0)
    } finally { vi.unstubAllGlobals() }
  })

  it('zeichnet mit Fahrzeugstufe 6/3 Schussbilder und 3 Mecha-Salven', () => {
    const ctx = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {} }
    vi.stubGlobal('document', { createElement: () => ({ width: 64, height: 64, getContext: () => ctx }) })
    try {
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(), laufGruppen: THREE.Object3D[] = []
      const vorlage = new THREE.Group(); vorlage.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 6), new THREE.MeshStandardMaterial()))
      const bau = { vorlage } as FahrzeugBau
      const welt = { scene, camera, laufGruppen, fahrzeuge: { panzer: bau, haubitze: bau, mecha: bau } } as unknown as Welt
      const bilder = new Einsatzbilder(welt)
      const level = wendeStufenAn(LEVELS[0], { ...leereStufen(), panzer: 1, haubitze: 1, mecha: 1 })
      const z = neuerLauf(level, 1); z.Z = 10000; z.y = 20
      const panzer = starteEinheit(z, 'panzer')
      bilder.abgleichen(z, [], 0)
      panzer.verstrichen = 1.25
      bilder.abgleichen(z, [{ art: 'spezialTreffer', menge: 2, t: 1.25, einheit: 'panzer' }], .05)
      const erstesZiel = bilder.nimmTreffer()[0].punkt
      for (const { zeit } of panzerSchusszeiten(panzer.ablauf)) { panzer.verstrichen = zeit; bilder.abgleichen(z, [{ art: 'spezialTreffer', menge: 2, t: zeit, einheit: 'panzer' }], .05) }
      expect(bilder.schuesse(panzer)).toBe(6)
      const ziele = bilder.letzteZiele(panzer)
      expect(ziele.map(p => Math.sign(p.x))).toEqual([-1, -1, 1, 1, -1, -1])
      expect(ziele[0].equals(ziele[1])).toBe(true)
      expect(ziele[0].equals(erstesZiel)).toBe(true)
      expect(ziele[2].equals(ziele[3])).toBe(true)
      const haubitze = starteEinheit(z, 'haubitze')
      for (const zeit of [1.2, 5.2, 9.2]) { haubitze.verstrichen = zeit; bilder.abgleichen(z, [{ art: 'spezialTreffer', menge: 90, t: zeit, einheit: 'haubitze' }], .05) }
      expect(bilder.schuesse(haubitze)).toBe(3)
      expect(bilder.letzteZiele(haubitze).map(p => Math.sign(p.x))).toEqual([-1, 1, -1])
      const mecha = starteEinheit(z, 'mecha')
      for (const zeit of [15, 19, 23]) { mecha.verstrichen = zeit; bilder.abgleichen(z, [{ art: 'spezialTreffer', menge: 70, t: zeit, einheit: 'mecha' }], 1) }
      expect(bilder.letzteZiele(mecha)).toHaveLength(12)
      bilder.gibFrei()
    } finally { vi.unstubAllGlobals() }
  })
})
