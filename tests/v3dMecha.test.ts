import { describe, expect, it, vi } from 'vitest'
import { NodeIO, type Node as GltfNode } from '@gltf-transform/core'
import { EXTTextureWebP } from '@gltf-transform/extensions'
import sharp from 'sharp'
import * as THREE from 'three'
import { FAHRZEUGE, LEVELS, EIS } from '../src/v3d/balance3d'
import { baueFeldFahrzeug, baueMiniatur, type FahrzeugBau } from '../src/v3d/fahrzeuge'
import { mechaPose } from '../src/v3d/mecha'
import { pruefEinsatz, TEST_FAHRZEUGE } from '../src/v3d/einstieg'
import { Einsatzbilder } from '../src/v3d/lauf'
import { neuerLauf, schritt, starteEinheit } from '../src/v3d/rechnung'
import type { Welt } from '../src/v3d/szene'

const io = new NodeIO().registerExtensions([EXTTextureWebP])

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

  it('wendet die Reißleine mit starren Beinen, 0,12 m Hub und ±4° Pendeln an', () => {
    expect(mechaPose(0, false).rumpfY).toBe(0)
    for (const t of [0,.1,.3,.6,.9,1.2]) {
      const p = mechaPose(t)
      expect(p.links.huefte).toBe(0); expect(p.links.knie).toBe(0)
      expect(p.rechts.huefte).toBe(0); expect(p.rechts.knie).toBe(0)
      expect(p.rumpfY).toBeGreaterThanOrEqual(0)
      expect(p.rumpfY).toBeLessThanOrEqual(.12)
      expect(Math.abs(p.rumpfPendel)).toBeLessThanOrEqual(4)
    }
    expect(mechaPose(0).rumpfY).toBeCloseTo(0, 8)
    expect(mechaPose(.3).rumpfY).toBeCloseTo(.12, 8)
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

  it('feuert aus beiden Armen und zwei sichtbare Vierer-Raketensalven', () => {
    const ctx = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, fillStyle: '' }
    vi.stubGlobal('document', { createElement: () => ({ width: 64, height: 64, getContext: () => ctx }) })
    try {
      const vorlage = new THREE.Group()
      const rumpf = new THREE.Group(); rumpf.name = 'rumpf'; rumpf.add(new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2)))
      vorlage.add(rumpf)
      const bau = { vorlage } as FahrzeugBau
      const welt = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), laufGruppen: [], fahrzeuge: { mecha: bau } } as unknown as Welt
      const bilder = new Einsatzbilder(welt), z = neuerLauf(LEVELS[0], 1)
      z.y = 20; z.Z = 600
      const a = starteEinheit(z, 'mecha')
      a.verstrichen = 3
      bilder.abgleichen(z, [], 0)
      const gruppe = welt.scene.getObjectByName('einsatz-mecha') as THREE.Group
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
      a.verstrichen = 19.05
      bilder.abgleichen(z, [], 0)
      expect(gruppe.position.z).toBeCloseTo(10, 2)
      bilder.gibFrei()
    } finally { vi.unstubAllGlobals() }
  })
})
