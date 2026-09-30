import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { FAHRZEUGE, LEVELS } from '../src/v3d/balance3d'
import { Explosionen } from '../src/v3d/anzeigen'
import { Einsatzbilder, PruefDiagnose } from '../src/v3d/lauf'
import { neuerLauf, starteEinheit } from '../src/v3d/rechnung'
import type { FahrzeugBau } from '../src/v3d/fahrzeuge'
import type { Welt } from '../src/v3d/szene'

function weltAttrappe(): Welt {
  const ctx = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, fillStyle: '' }
  vi.stubGlobal('document', { createElement: () => ({ width: 64, height: 64, getContext: () => ctx }) })
  const vorlage = new THREE.Group()
  vorlage.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 10), new THREE.MeshStandardMaterial()))
  const bau = { vorlage, laenge: 10 } as FahrzeugBau
  return { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), laufGruppen: [], fahrzeuge: { haubitze: bau, panzer: bau, humvee: bau, hubschrauber: bau } } as unknown as Welt
}
type Blitz = { id: number; pos: THREE.Vector3; rest: number; dauer: number; durchmesser: number; klein: boolean }
function blitze(bilder: Einsatzbilder): Blitz[] { return (bilder as unknown as { blitzPunkte: Blitz[] }).blitzPunkte }
function schiesse(bilder: Einsatzbilder, stand: object): void {
  ;(bilder as unknown as { schiesse: (s: object, ziel: THREE.Vector3, d: number) => void }).schiesse(stand, new THREE.Vector3(0, .2, -30), 7)
}
afterEach(() => vi.unstubAllGlobals())

describe('Fahrzeug-Mündungsfeuer und Prüfdiagnose', () => {
  it('legt die Farbe der Explosion schon beim Bau an', () => {
    weltAttrappe()
    const explosionen = new Explosionen()
    expect(explosionen.objekt.instanceColor).not.toBeNull()
    expect(explosionen.objekt.count).toBe(0)
    explosionen.gibFrei()
  })

  it('wärmt beide Effekte außerhalb des Bildes auf und zeigt im ersten Laufbild keinen Platzhalter', () => {
    const welt = weltAttrappe(), bilder = new Einsatzbilder(welt)
    bilder.explosionen.vorwaermen(); bilder.blitze.vorwaermen()
    expect(bilder.explosionen.objekt.count).toBe(1)
    expect(bilder.blitze.objekt.count).toBe(1)
    const matrix = new THREE.Matrix4(), pos = new THREE.Vector3()
    bilder.explosionen.objekt.getMatrixAt(0, matrix)
    expect(pos.setFromMatrixPosition(matrix).z).toBeLessThan(-100000)
    bilder.explosionen.zuruecksetzen(); bilder.blitze.setze([], welt.camera)
    expect(bilder.explosionen.objekt.count).toBe(0)
    expect(bilder.blitze.objekt.count).toBe(0)
    bilder.gibFrei()
  })

  it('setzt den Haubitzenblitz mit 2,4 m, 0,15 s und 0,72 m vor die Mündung; große Blitze verdrängen kleine', () => {
    const welt = weltAttrappe(), bilder = new Einsatzbilder(welt), z = neuerLauf(LEVELS[0], 1)
    const a = starteEinheit(z, 'haubitze')
    a.verstrichen = 1.2
    bilder.abgleichen(z, [], 0)
    const stand = [...(bilder as unknown as { fahrzeuge: Map<object, object> }).fahrzeuge.values()][0]
    schiesse(bilder, stand)
    const blitz = blitze(bilder)[0]
    expect(blitz.durchmesser).toBe(2.4)
    expect(blitz.dauer).toBe(.15)
    const gruppe = welt.scene.getObjectByName('einsatz-haubitze') as THREE.Group
    const p = FAHRZEUGE.haubitze.MUENDUNG
    const muendung = gruppe.localToWorld(new THREE.Vector3(...p).multiplyScalar(FAHRZEUGE.haubitze.SPIEL_SKALA))
    const richtung = new THREE.Vector3(0, 0, -1).applyQuaternion(gruppe.getWorldQuaternion(new THREE.Quaternion()))
    expect(blitz.pos.distanceTo(muendung.clone().addScaledVector(richtung, .72))).toBeLessThan(1e-8)
    expect((bilder.blitze.objekt.material as THREE.MeshBasicMaterial).depthTest).toBe(false)
    expect(bilder.blitze.objekt.renderOrder).toBe(bilder.explosionen.objekt.renderOrder)
    blitze(bilder).splice(0, blitze(bilder).length, ...Array.from({ length: 4 }, (_, id) => ({ id: id + 100, pos: new THREE.Vector3(), rest: .1, dauer: .15, durchmesser: .45, klein: true })))
    schiesse(bilder, stand)
    expect(blitze(bilder)).toHaveLength(4)
    expect(blitze(bilder).filter(b => !b.klein)).toHaveLength(1)
    expect(blitze(bilder).some(b => b.id === 100)).toBe(false)
    bilder.gibFrei()
  })

  for (const dt of [1 / 60, .1]) it(`erzeugt beim ersten und zweiten Haubitzenschuss je einen Blitz und Einschlag (dt ${dt})`, () => {
    const welt = weltAttrappe(), bilder = new Einsatzbilder(welt), z = neuerLauf(LEVELS[0], 1)
    z.y = 20; z.Z = 600
    const a = starteEinheit(z, 'haubitze')
    const explosion = vi.spyOn(bilder.explosionen, 'starte')
    for (const zeit of [1.2, 5.2]) {
      a.verstrichen = zeit
      const vorher = blitze(bilder).map(b => b.id)
      bilder.abgleichen(z, [{ art: 'spezialTreffer', einheit: 'haubitze', menge: 1, t: zeit }], dt)
      expect(blitze(bilder).filter(b => !vorher.includes(b.id))).toHaveLength(1)
      expect(explosion).toHaveBeenCalledTimes(zeit === 1.2 ? 1 : 2)
      expect(explosion).toHaveBeenLastCalledWith(expect.any(THREE.Vector3), 7)
      expect(bilder.explosionen.objekt.count).toBeGreaterThan(0)
    }
    bilder.gibFrei()
  })

  for (const dt of [1 / 60, .1]) for (const [name, anzahl] of [['panzer', 4], ['haubitze', 2]] as const) {
    it(`zeigt jeden der ${anzahl} ${name}-Blitze mindestens drei Bilder (dt ${dt})`, () => {
      const welt = weltAttrappe(), bilder = new Einsatzbilder(welt), z = neuerLauf(LEVELS[0], 1)
      const a = starteEinheit(z, name)
      bilder.abgleichen(z, [], 0)
      const stand = [...(bilder as unknown as { fahrzeuge: Map<object, object> }).fahrzeuge.values()][0]
      for (let schuss = 0; schuss < anzahl; schuss++) {
        schiesse(bilder, stand)
        const id = blitze(bilder).at(-1)!.id
        for (let bild = 1; bild <= 3; bild++) {
          bilder.nachlauf(dt)
          expect(bilder.blitze.objekt.count).toBeGreaterThan(0)
          expect(bilder.blitzAktiv(id)).toBe(true)
          const farbe = new THREE.Color()
          bilder.blitze.objekt.getColorAt(0, farbe)
          expect(farbe.r).toBeGreaterThan(0)
        }
        while (bilder.blitzAktiv(id)) bilder.nachlauf(dt)
      }
      bilder.gibFrei()
    })
  }

  it('zählt nur nach einem gezeichneten Bild aktive Schusseffekte und bleibt sonst aus', () => {
    const welt = weltAttrappe(), bilder = new Einsatzbilder(welt)
    expect(bilder.pruefDiagnose).toBeUndefined()
    const diagnose = new PruefDiagnose(true)
    bilder.pruefDiagnose = diagnose
    diagnose.vorBild(1000, 12)
    const blitz = blitze(bilder)
    blitz.push({ id: 1, pos: new THREE.Vector3(), rest: .15, dauer: .15, durchmesser: 2.4, klein: false })
    bilder.blitze.setze([blitz[0].pos], welt.camera, 1, [2.4], [1])
    const explosionId = bilder.explosionen.starte(new THREE.Vector3(), 7)
    bilder.explosionen.schritt(0, welt.camera)
    diagnose.schuss('haubitze', 1, 1.2, 1, explosionId)
    expect(diagnose.text()).toContain('Blitz 0 Bilder · Explosion 0 Bilder')
    diagnose.bild(1016, 16, 12, bilder)
    expect(diagnose.text()).toContain('Blitz 1 Bilder · Explosion 1 Bilder')
    blitz.length = 0; bilder.blitze.setze([], welt.camera); bilder.explosionen.zuruecksetzen()
    diagnose.bild(1032, 16, 13, bilder)
    expect(diagnose.text()).toContain('Blitz 1 Bilder · Explosion 1 Bilder')
    expect(diagnose.text()).toContain('neue Programme 1')
    diagnose.vorBild(5000, 13)
    diagnose.schuss('haubitze', 2, 5.2, -1, -1)
    diagnose.bild(6001, 16, 13, bilder)
    expect(diagnose.programmZahlen).toEqual([12, 13])
    bilder.gibFrei()
  })

  it('zeichnet alle Fahrzeuggrößen im selben Instanz-Netz und lässt sie ausklingen', () => {
    const welt = weltAttrappe(), bilder = new Einsatzbilder(welt)
    const werte = [
      ['haubitze', 2.4, .15], ['panzer', 1.6, .12], ['humvee', .45, .15], ['hubschrauber', .45, .08],
    ] as const
    for (const [name, durchmesser, dauer] of werte) {
      const stand = { name, gruppe: new THREE.Group(), schuss: 0, letzteZiele: [] }
      schiesse(bilder, stand)
      expect(blitze(bilder).at(-1)).toMatchObject({ durchmesser, dauer })
    }
    bilder.nachlauf(0)
    bilder.nachlauf(.02)
    expect(bilder.blitze.objekt).toBeInstanceOf(THREE.InstancedMesh)
    expect(bilder.blitze.objekt.count).toBe(4)
    const matrix = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), scale = new THREE.Vector3()
    const erwartete = [2.4 * (.6 + .4 * (.13 / .15)), 1.6 * (.6 + .4 * (.1 / .12)), .45 * (.6 + .4 * (.13 / .15)), .45 * (.6 + .4 * (.06 / .08))]
    const groessen: number[] = []
    for (let i = 0; i < 4; i++) {
      bilder.blitze.objekt.getMatrixAt(i, matrix)
      matrix.decompose(pos, q, scale)
      groessen.push(scale.x)
      const farbe = new THREE.Color()
      bilder.blitze.objekt.getColorAt(i, farbe)
      expect(farbe.r).toBeLessThan(1)
      expect(farbe.r).toBeGreaterThan(0)
    }
    groessen.sort((a, b) => a - b)
    erwartete.sort((a, b) => a - b).forEach((wert, i) => expect(groessen[i]).toBeCloseTo(wert, 6))
    bilder.gibFrei()
  })
})
