import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import humveeUrl from './modelle/v3d-humvee.glb?url'
import panzerUrl from './modelle/v3d-panzer.glb?url'
import haubitzeUrl from './modelle/v3d-haubitze.glb?url'
import hubschrauberUrl from './modelle/v3d-hubschrauber.glb?url'
import { EIS, FAHRZEUGE, type FahrzeugName } from './balance3d'

const urls: Record<FahrzeugName, string> = {
  humvee: humveeUrl, panzer: panzerUrl, haubitze: haubitzeUrl, hubschrauber: hubschrauberUrl,
}
export const FAHRZEUG_NAMEN = Object.keys(urls) as FahrzeugName[]

export interface FahrzeugBau {
  geometrien: THREE.BufferGeometry[]
  material: THREE.MeshStandardMaterial
  laenge: number
  vorlage: THREE.Group
  gibFrei(): void
}

export function entsorgeFahrzeugGLTF(gltf: GLTF): void {
  const geometrien = new Set<THREE.BufferGeometry>(), materialien = new Set<THREE.Material>(), bilder = new Set<THREE.Texture>()
  gltf.scene.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return
    geometrien.add(o.geometry)
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      materialien.add(m)
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) bilder.add(v)
    }
  })
  bilder.forEach(t => t.dispose()); materialien.forEach(m => m.dispose()); geometrien.forEach(g => g.dispose())
}

export async function ladeFahrzeuge(abgebrochen: () => boolean): Promise<Record<FahrzeugName, FahrzeugBau> | null> {
  const loader = new GLTFLoader(), geladen: GLTF[] = []
  try {
    const dateien = await Promise.all(FAHRZEUG_NAMEN.map(name => loader.loadAsync(urls[name]).then(gltf => {
      if (abgebrochen()) { entsorgeFahrzeugGLTF(gltf); return null }
      geladen.push(gltf); return gltf
    })))
    if (abgebrochen() || dateien.some(g => !g)) { geladen.forEach(entsorgeFahrzeugGLTF); return null }
    const ergebnis = {} as Record<FahrzeugName, FahrzeugBau>
    for (const [i, name] of FAHRZEUG_NAMEN.entries()) {
      const gltf = dateien[i]!
      const meshes: THREE.Mesh[] = []
      gltf.scene.traverse(o => { if (o instanceof THREE.Mesh) meshes.push(o) })
      if (!meshes.length) throw new Error(`${name}: Geometrie fehlt`)
      const alt = meshes[0].material as THREE.MeshStandardMaterial, map = alt.map
      if (!map) throw new Error(`${name}: Farbbild fehlt`)
      map.colorSpace = THREE.SRGBColorSpace; map.flipY = false
      const material = new THREE.MeshStandardMaterial({ map, metalness: 0, roughness: .8 })
      const alteMaterialien = new Set<THREE.Material>()
      for (const mesh of meshes) {
        for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) alteMaterialien.add(m)
        mesh.material = material
        mesh.layers.set(1)
      }
      alteMaterialien.forEach(m => m.dispose())
      const geometrien = [...new Set(meshes.map(m => m.geometry))]
      let frei = false
      ergebnis[name] = { geometrien, material, laenge: FAHRZEUGE[name].LAENGE, vorlage: gltf.scene,
        gibFrei() { if (frei) return; frei = true; geometrien.forEach(g => g.dispose()); material.dispose(); map.dispose() },
      }
    }
    return ergebnis
  } catch (fehler) {
    geladen.forEach(entsorgeFahrzeugGLTF)
    throw fehler
  }
}

export function baueMiniatur(bau: FahrzeugBau, name: FahrzeugName, zielGroesse: readonly [number, number, number], optionen: { eis?: boolean } = {}): THREE.Group {
  const gruppe = bau.vorlage.clone(true)
  gruppe.matrixAutoUpdate = true
  gruppe.name = `fahrzeug-${name}`
  gruppe.traverse(o => { if (o instanceof THREE.Mesh) o.layers.set(1) })
  gruppe.rotation.y = FAHRZEUGE[name].FELD_DREHUNG * Math.PI / 180
  const rotor = gruppe.getObjectByName('rotor')
  if (rotor) {
    rotor.rotation.y = 0
    gruppe.updateMatrixWorld(true)
    const nullBreite = new THREE.Box3().setFromObject(gruppe, true).getSize(new THREE.Vector3()).x
    rotor.rotation.y = Math.PI / 2
    gruppe.updateMatrixWorld(true)
    if (new THREE.Box3().setFromObject(gruppe, true).getSize(new THREE.Vector3()).x >= nullBreite) rotor.rotation.y = 0
  }
  gruppe.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(gruppe, true), groesse = box.getSize(new THREE.Vector3())
  const eis = optionen.eis === true
  const faktor = eis
    ? FAHRZEUGE[name].LAENGE * EIS.MASSSTAB / groesse.z
    : Math.min(zielGroesse[0] / groesse.x, zielGroesse[1] / groesse.y, zielGroesse[2] / groesse.z)
  if (!Number.isFinite(faktor) || faktor <= 0) throw new Error(`${name}: ungültige Größe`)
  gruppe.scale.setScalar(faktor)
  gruppe.position.set(-box.getCenter(new THREE.Vector3()).x * faktor, (eis ? EIS.HUELLE : 0) - box.min.y * faktor, -box.getCenter(new THREE.Vector3()).z * faktor)
  gruppe.updateMatrixWorld(true)
  if (eis) gruppe.userData.eisLaenge = groesse.z * faktor
  return gruppe
}

export function baueFeldFahrzeug(bau: FahrzeugBau, name: FahrzeugName): THREE.Group {
  const kurs = new THREE.Group()
  kurs.name = `einsatz-${name}`
  const drehung = new THREE.Group()
  drehung.rotation.y = FAHRZEUGE[name].FELD_DREHUNG * Math.PI / 180
  kurs.add(drehung)
  const modell = bau.vorlage.clone(true)
  modell.traverse(o => { if (o instanceof THREE.Mesh) o.layers.set(1) })
  drehung.add(modell)
  kurs.updateMatrixWorld(true)
  const roh = new THREE.Box3().setFromObject(kurs, true)
  const skala = FAHRZEUGE[name].LAENGE * FAHRZEUGE[name].SPIEL_SKALA / roh.getSize(new THREE.Vector3()).z
  modell.scale.setScalar(skala)
  kurs.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(kurs, true)
  const mitte = box.getCenter(new THREE.Vector3())
  drehung.position.set(-mitte.x, -box.min.y, -mitte.z)
  return kurs
}
