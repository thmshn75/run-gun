import { describe, expect, it, vi } from 'vitest'
import { NodeIO, type Node as GltfNode } from '@gltf-transform/core'
import { EXTTextureWebP } from '@gltf-transform/extensions'
import sharp from 'sharp'
import * as THREE from 'three'
import { FAHRZEUGE, LEVELS, EIS } from '../src/v3d/balance3d'
import { baueFeldFahrzeug, baueMiniatur, type FahrzeugBau } from '../src/v3d/fahrzeuge'
import { MECHA_ACHSEN, mechaPose, mechaSchrittProbe } from '../src/v3d/mecha'
import { pruefEinsatz, TEST_FAHRZEUGE } from '../src/v3d/einstieg'
import { Einsatzbilder } from '../src/v3d/lauf'
import { neuerLauf, schritt, starteEinheit } from '../src/v3d/rechnung'
import type { Welt } from '../src/v3d/szene'

const io = new NodeIO().registerExtensions([EXTTextureWebP])
const gliedMitte = (glied: THREE.Object3D) => glied.getWorldPosition(new THREE.Vector3())

async function modell(): Promise<FahrzeugBau> {
  const root = (await io.read('src/v3d/modelle/v3d-mecha.glb')).getRoot()
  const vorlage = new THREE.Group(), geometrien: THREE.BufferGeometry[] = []
  function knoten(n: GltfNode): THREE.Group {
    const gruppe = new THREE.Group()
    gruppe.name = n.getName(); gruppe.position.fromArray(n.getTranslation()); gruppe.quaternion.fromArray(n.getRotation()); gruppe.scale.fromArray(n.getScale())
    for (const p of n.getMesh()?.listPrimitives() ?? []) {
      const a = p.getAttribute('POSITION')!, g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(a.getArray()!, 3))
      if (p.getIndices()) g.setIndex(Array.from(p.getIndices()!.getArray()!))
      gruppe.add(new THREE.Mesh(g)); geometrien.push(g)
    }
    n.listChildren().forEach(c => gruppe.add(knoten(c)))
    return gruppe
  }
  root.listScenes()[0].listChildren().forEach(n => vorlage.add(knoten(n)))
  return { vorlage, geometrien, material: new THREE.MeshStandardMaterial(), laenge: 6, gibFrei() {} }
}

describe('D7r Mecha', () => {
  it('liefert sieben Glieder, ein 512er Farbbild und höchstens 6000 Dreiecke', async () => {
    const root = (await io.read('src/v3d/modelle/v3d-mecha.glb')).getRoot()
    const namen = root.listMeshes().map(m => m.getName())
    expect(namen).toEqual(['rumpf','oberschenkel_l','unterschenkel_l','fuss_l','oberschenkel_r','unterschenkel_r','fuss_r'])
    expect(root.listMaterials()).toHaveLength(1)
    expect(root.listTextures()).toHaveLength(1)
    expect(root.listAnimations()).toHaveLength(0)
    const tri = root.listMeshes().flatMap(m => m.listPrimitives()).reduce((sum,p) => sum + (p.getIndices()?.getCount() ?? 0) / 3, 0)
    expect(tri).toBe(FAHRZEUGE.mecha.DREIECKE)
    expect(tri).toBeLessThanOrEqual(6000)
    const meta = await sharp(root.listTextures()[0].getImage()).metadata()
    expect([meta.width,meta.height,meta.format]).toEqual([512,512,'webp'])
  })

  it('ordnet die gedrehten Gelenke und beide Beine spiegelgleich zu', async () => {
    const bau = await modell()
    const glb = (await io.read('src/v3d/modelle/v3d-mecha.glb')).getRoot()
    const knoten = (name: string) => glb.listNodes().find(n => n.getName() === name)!
    expect(knoten('oberschenkel_l').getTranslation()[1]).toBeCloseTo(2.440, 2)
    expect(knoten('oberschenkel_l').getExtras().gelenkachse).toEqual([.999871, 0, -.016093])
    expect(knoten('unterschenkel_l').getExtras().gelenkachse).toEqual([.984680, -.173648, -.015847])
    expect(knoten('unterschenkel_r').getExtras().gelenkachse).toEqual([.984680, .173648, -.015846])
    for (const glied of ['oberschenkel', 'unterschenkel', 'fuss']) {
      const links = bau.vorlage.getObjectByName(`${glied}_l`)!
      const rechts = bau.vorlage.getObjectByName(`${glied}_r`)!
      const l = new THREE.Box3().setFromObject(links, true)
      const r = new THREE.Box3().setFromObject(rechts, true)
      expect(l.getCenter(new THREE.Vector3()).x).toBeLessThan(-.5)
      expect(r.getCenter(new THREE.Vector3()).x).toBeGreaterThan(.5)
      expect(Math.abs(l.getSize(new THREE.Vector3()).y - r.getSize(new THREE.Vector3()).y)).toBeLessThan(.12)
    }
    expect(bau.vorlage.getObjectByName('oberschenkel_l')!.position.y).toBeCloseTo(2.440, 2)
    expect(bau.vorlage.getObjectByName('unterschenkel_l')!.position.y).toBeCloseTo(-.838, 2)
  })

  it('steht im Feld 4,5 m und im Eis 4,8 m hoch; Front zeigt nach −z', async () => {
    const bau = await modell()
    const feld = baueFeldFahrzeug(bau, 'mecha'), eis = baueMiniatur(bau, 'mecha', [0,0,0], { eis: true })
    const feldBox = new THREE.Box3().setFromObject(feld, true), eisBox = new THREE.Box3().setFromObject(eis, true)
    expect(feldBox.getSize(new THREE.Vector3()).y).toBeCloseTo(4.5, 3)
    expect(eisBox.getSize(new THREE.Vector3()).y).toBeCloseTo(6 * EIS.MASSSTAB, 3)
    expect(eisBox.min.y).toBeCloseTo(EIS.HUELLE, 3)
    expect(feld.localToWorld(new THREE.Vector3(0, 2.65, -1.15)).z).toBeLessThan(0)
    expect(eis.localToWorld(new THREE.Vector3(...FAHRZEUGE.mecha.MUENDUNG)).z).toBeLessThan(0)
  })

  it('misst an der echten GLB für jede Kontakt-Ecke höchstens 0,05 m zusätzliche Spaltweite', async () => {
    const bau = await modell()
    bau.vorlage.updateMatrixWorld(true)
    const daten = (name: string) => {
      const glied = bau.vorlage.getObjectByName(name)!
      const mesh = glied.children.find(o => o instanceof THREE.Mesh) as THREE.Mesh
      const position = mesh.geometry.getAttribute('position'), index = mesh.geometry.getIndex()!
      const punkte = Array.from({ length: position.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld))
      // Die Vereinfachung lässt unbenutzte POSITION-Einträge zurück. Nur Ecken
      // der tatsächlich indizierten Dreiecke gehören zur sichtbaren GLB.
      const ecken = [...new Map(Array.from({ length: index.count }, (_, i) => punkte[index.getX(i)]).map(p => [p.toArray().map(v => v.toFixed(5)).join(','), p])).values()]
      const dreiecke: THREE.Triangle[] = []
      for (let i = 0; i < index.count; i += 3) dreiecke.push(new THREE.Triangle(punkte[index.getX(i)], punkte[index.getX(i + 1)], punkte[index.getX(i + 2)]))
      return { ecken, dreiecke }
    }
    const abstand = (punkt: THREE.Vector3, flaechen: THREE.Triangle[]) => {
      const naechster = new THREE.Vector3()
      let best = Infinity
      for (const dreieck of flaechen) {
        dreieck.closestPointToPoint(punkt, naechster)
        best = Math.min(best, punkt.distanceToSquared(naechster))
      }
      return Math.sqrt(best)
    }
    for (const seite of ['l', 'r'] as const) for (const [gelenk, eltern, kind, achse] of [
      ['huefte', 'rumpf', `oberschenkel_${seite}`, MECHA_ACHSEN.huefte],
      ['knie', `oberschenkel_${seite}`, `unterschenkel_${seite}`, seite === 'l' ? MECHA_ACHSEN.knieL : MECHA_ACHSEN.knieR],
      ['fuss', `unterschenkel_${seite}`, `fuss_${seite}`, MECHA_ACHSEN.knoechel],
    ] as const) {
      const parent = daten(eltern), child = daten(kind)
      // N6: Nur Kind-Ecken nahe einer Eltern-Dreiecksfläche im Grundstand.
      const kontakt = child.ecken.filter(p => abstand(p, parent.dreiecke) <= .08)
      expect(kontakt.length).toBeGreaterThan(0)
      const ruheSpalte = kontakt.map(p => abstand(p, parent.dreiecke))
      const mitte = gliedMitte(bau.vorlage.getObjectByName(kind)!)
      const richtung = new THREE.Vector3(...achse).normalize()
      let zunahme = 0
      for (let phase = 0; phase < 8; phase++) {
        const pose = mechaPose(phase * .15)
        const bein = seite === 'l' ? pose.links : pose.rechts
        const winkel = gelenk === 'huefte' ? bein.huefte : gelenk === 'knie' ? bein.knie : bein.fuss
        const q = new THREE.Quaternion().setFromAxisAngle(richtung, THREE.MathUtils.degToRad(winkel))
        for (const [i, p] of kontakt.entries()) {
          const gedreht = p.clone().sub(mitte).applyQuaternion(q).add(mitte)
          zunahme = Math.max(zunahme, abstand(gedreht, parent.dreiecke) - ruheSpalte[i])
        }
      }
      expect(zunahme, `${seite}/${gelenk}: ${zunahme.toFixed(4)} m`).toBeLessThanOrEqual(.05)
    }
  })

  it('geht gegenphasig mit 18° Hüfte, 0–35° Knie, höchstens 0,06 m Hub und ohne Pendeln', () => {
    expect(mechaPose(0, false).rumpfY).toBe(0)
    for (const t of [0,.1,.3,.6,.9,1.2]) {
      const p = mechaPose(t)
      expect(p).toEqual(mechaSchrittProbe(t))
      expect(p.links.huefte).toBeCloseTo(-p.rechts.huefte, 8)
      expect(p.links.knie).toBeLessThanOrEqual(0)
      expect(p.rechts.knie).toBeLessThanOrEqual(0)
      expect(p.links.fuss).toBeCloseTo(-p.links.huefte - p.links.knie, 8)
      expect(p.rumpfY).toBeGreaterThanOrEqual(0)
      expect(p.rumpfY).toBeLessThanOrEqual(.06)
      expect(p.rumpfPendel).toBe(0)
    }
    expect(mechaPose(.3).links.huefte).toBeCloseTo(18)
    expect(mechaPose(.6).links.knie).toBeCloseTo(-35)
    expect(mechaPose(0).rumpfY).toBeCloseTo(0, 8)
    expect(mechaPose(.3).rumpfY).toBeCloseTo(.06, 8)
    expect(mechaPose(.6).rumpfY).toBeCloseTo(0, 8)
  })

  it('fügt eine fünfte Säule und den Prüfknopf hinzu', () => {
    expect(LEVELS.every(l => l.saeulen.join(',') === 'humvee,haubitze,panzer,hubschrauber,mecha')).toBe(true)
    expect(TEST_FAHRZEUGE).toContain('mecha')
    expect(pruefEinsatz('?pruefung=1&einsatz=mecha')).toEqual(['mecha'])
  })

  it('tötet über den Rechenkern mit Mecha 260 ±5 % zusätzliche Zombies', () => {
    const level = { ...LEVELS[0], wellen: [], saeulen: [], eliteBossZeit: 999, startY: 1000 }
    const ohne = neuerLauf(level, 7), mit = neuerLauf(level, 7)
    ohne.Z = mit.Z = 10000
    starteEinheit(mit, 'mecha')
    for (let i = 0; i < 200; i++) { schritt(ohne, { x: 0 }, .1); schritt(mit, { x: 0 }, .1) }
    const differenz = ohne.Z - mit.Z
    expect(differenz).toBeGreaterThanOrEqual(260 * .95)
    expect(differenz).toBeLessThanOrEqual(260 * 1.05)
  })

  it('geht beim Ein- und Rückweg mit echten GLB-Gliedern und steht beim Feuern still', async () => {
    const ctx = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, fillStyle: '' }
    vi.stubGlobal('document', { createElement: () => ({ width: 64, height: 64, getContext: () => ctx }) })
    try {
      const bau = await modell()
      const welt = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), laufGruppen: [], fahrzeuge: { mecha: bau } } as unknown as Welt
      const bilder = new Einsatzbilder(welt), z = neuerLauf(LEVELS[0], 1)
      z.y = 20; z.Z = 600
      const a = starteEinheit(z, 'mecha')
      const achse = new THREE.Vector3(...MECHA_ACHSEN.huefte).normalize()
      a.verstrichen = .3
      bilder.abgleichen(z, [], 0)
      const gruppe = welt.scene.getObjectByName('einsatz-mecha') as THREE.Group
      const links = gruppe.getObjectByName('oberschenkel_l')!
      expect(links.quaternion.angleTo(new THREE.Quaternion().setFromAxisAngle(achse, THREE.MathUtils.degToRad(18)))).toBeLessThan(1e-6)
      a.verstrichen = 3
      bilder.abgleichen(z, [], 0)
      expect(links.quaternion.angleTo(new THREE.Quaternion())).toBeLessThan(1e-6)
      expect(gruppe.position.z).toBeCloseTo(-12.5, 2)
      a.verstrichen = 3.25
      bilder.abgleichen(z, [{ art: 'spezialTreffer', einheit: 'mecha', menge: 3, t: 3.25 }], .25)
      expect(bilder.schuesse(a)).toBe(2)
      expect(bilder.nimmTreffer().reduce((n, e) => n + e.menge, 0)).toBe(3)
      a.verstrichen = 13
      bilder.abgleichen(z, [{ art: 'spezialTreffer', einheit: 'mecha', menge: 70, t: 13 }], 0)
      expect(bilder.raketen.count).toBe(8)
      bilder.nachlauf(.6)
      expect(bilder.nimmTreffer().reduce((n, e) => n + e.menge, 0)).toBe(0)
      bilder.nachlauf(.02); bilder.nachlauf(.02)
      expect(bilder.nimmTreffer().reduce((n, e) => n + e.menge, 0)).toBe(70)
      a.verstrichen = 17
      bilder.abgleichen(z, [{ art: 'spezialTreffer', einheit: 'mecha', menge: 70, t: 17 }], 0)
      bilder.nachlauf(.6); bilder.nachlauf(.02); bilder.nachlauf(.02)
      expect(bilder.nimmTreffer().reduce((n, e) => n + e.menge, 0)).toBe(70)
      a.verstrichen = 17.35
      bilder.abgleichen(z, [], 0)
      expect(links.quaternion.angleTo(new THREE.Quaternion().setFromAxisAngle(achse, THREE.MathUtils.degToRad(-18)))).toBeLessThan(1e-6)
      a.verstrichen = 19.05
      bilder.abgleichen(z, [], 0)
      expect(gruppe.position.z).toBeCloseTo(10, 2)
      bilder.gibFrei()
    } finally { vi.unstubAllGlobals() }
  })
})
