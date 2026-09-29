import * as THREE from 'three'
import strassenUrl from './bilder/v3d-strasse.webp?url'
import normalenUrl from './bilder/v3d-wasser-normalen.webp?url'
import { BUEHNE } from './balance3d'
import { baueKamera } from './kamera'
import { ladeZombie, ZombieMasse, zombieAufstellung, type ZombieBau } from './figuren'
import { baueWasser, type WasserHalter, type WasserStufe } from './wasser'

export const DATEIEN_FEHLER = '3D-Dateien nicht ladbar – App neu öffnen'
export interface Welt {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  bemalungen: [THREE.Texture, THREE.Texture]
  wasser: WasserHalter
  zombieBau: ZombieBau
  zombieMasse: ZombieMasse
  nahaufnahme: boolean
}

function textBild(text: string, farbe: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = farbe; ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = 'bold 112px system-ui'; ctx.fillText(text, 128, 130)
  const textur = new THREE.CanvasTexture(canvas)
  textur.colorSpace = THREE.SRGBColorSpace
  return textur
}

function box(gruppe: THREE.Group | THREE.Scene, name: string, groesse: [number, number, number], pos: [number, number, number], farbe: string, layer = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...groesse), new THREE.MeshStandardMaterial({ color: farbe }))
  mesh.name = name
  mesh.position.set(...pos)
  mesh.layers.set(layer)
  gruppe.add(mesh)
  return mesh
}

function schild(gruppe: THREE.Group, name: string, breite: number, hoehe: number, x: number, y: number, z: number, textur: THREE.Texture): void {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(breite, hoehe), new THREE.MeshBasicMaterial({ map: textur, side: THREE.DoubleSide, transparent: true }))
  mesh.name = name
  mesh.position.set(x, y, z)
  gruppe.add(mesh)
}

function platzhalter(scene: THREE.Scene): void {
  const gruppe = new THREE.Group()
  gruppe.name = 'platzhalter'
  gruppe.visible = new URLSearchParams(location.search).get('platzhalter') !== '0'
  scene.add(gruppe)
  box(gruppe, 'vervielfacher', [12, 1.2, 0.18], [0, 0.6, -5], '#8e36c0')
  schild(gruppe, 'vervielfacher-zahl', 2.2, 1, 0, 0.6, -4.88, textBild('×2', '#8e36c0'))
  const plus = textBild('+1', '#168bd2')
  for (let z = 6; z >= -60; z -= 3.5) schild(gruppe, 'plus-eins', 1.2, 0.8, -5.2, 0.8, z, plus)
  schild(gruppe, 'plus-eins', 1.2, 0.8, -5.2, 0.8, -60, plus)
  box(gruppe, 'saeule', [1.6, 4, 1.6], [4.6, 2, -12], '#aaaeb3')
  schild(gruppe, 'saeule-zahl', 1.4, 0.7, 4.6, 3.4, -11.18, textBild('150', '#777c82'))
  box(gruppe, 'truppe', [6, 0.9, 3], [0, 0.45, 1.5], '#2875bd', 1)
}

export async function baueSzene(renderer: THREE.WebGLRenderer, stufe: WasserStufe, abgebrochen: () => boolean, beiLadeFehler: (hinweis: string) => void): Promise<Welt | null> {
  const loader = new THREE.TextureLoader()
  const geladen: THREE.Texture[] = []
  let vorbei = false
  let geladenesZombieBau: ZombieBau | null = null
  const freigabeZombie = () => { if (geladenesZombieBau) { geladenesZombieBau.formen.forEach(g => g.dispose()); geladenesZombieBau.materialien.forEach(m => m.dispose()); geladenesZombieBau.bemalungen.forEach(t => t.dispose()); geladenesZombieBau = null } }
  const lade = (url: string) => loader.loadAsync(url).then(textur => {
    if (vorbei || abgebrochen()) textur.dispose()
    else geladen.push(textur)
    return textur
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const beide = Promise.all([lade(strassenUrl), lade(normalenUrl), ladeZombie(renderer, () => vorbei || abgebrochen()).then(bau => { if (bau && (vorbei || abgebrochen())) { bau.formen.forEach(g => g.dispose()); bau.materialien.forEach(m => m.dispose()); bau.bemalungen.forEach(t => t.dispose()); return null } return bau })])
    const zeitlimit = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(DATEIEN_FEHLER)), 8000) })
    const [strasse, normalen, zombieBau] = await Promise.race([beide, zeitlimit])
    if (!zombieBau) { geladen.forEach(t => t.dispose()); return null }
    geladenesZombieBau = zombieBau
    if (abgebrochen()) { geladen.forEach(t => t.dispose()); freigabeZombie(); return null }
    strasse.colorSpace = THREE.SRGBColorSpace
    strasse.wrapS = THREE.ClampToEdgeWrapping
    strasse.wrapT = THREE.RepeatWrapping
    strasse.repeat.set(1, 40)
    strasse.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    normalen.wrapS = normalen.wrapT = THREE.RepeatWrapping
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(BUEHNE.DUNST_FARBE)
    scene.fog = new THREE.Fog(BUEHNE.DUNST_FARBE, BUEHNE.DUNST_NAH, BUEHNE.DUNST_FERN)
    const camera = baueKamera(innerWidth, innerHeight)
    scene.add(new THREE.HemisphereLight(0xe5f3ff, 0x596576, 2.1))
    const sonne = new THREE.DirectionalLight(0xfff3dc, 2.3)
    sonne.position.set(...BUEHNE.SONNE)
    scene.add(sonne)
    const beton = new THREE.MeshStandardMaterial({ color: '#b9bdbe', roughness: 0.9 })
    const asphalt = new THREE.MeshStandardMaterial({ map: strasse, roughness: 0.95 })
    const decke = new THREE.Mesh(new THREE.PlaneGeometry(BUEHNE.BAHN_BREITE, 240), asphalt)
    decke.name = 'strasse'; decke.rotation.x = -Math.PI / 2; decke.position.z = -100
    scene.add(decke)
    for (const x of [-6, 6]) {
      box(scene, 'dammwand', [0.1, 0.6, 240], [x, -0.3, -100], '#b9bdbe')
      box(scene, 'randmauer', [0.3, 0.35, 240], [x, 0.175, -100], '#c9cbca')
    }
    // Der Boden des Damms schließt die Seiten bis y = -0,6.
    const damm = new THREE.Mesh(new THREE.PlaneGeometry(12, 240), beton)
    damm.rotation.x = Math.PI / 2; damm.position.set(0, -0.6, -100); damm.name = 'damm-unterseite'; scene.add(damm)
    platzhalter(scene)
    const nahaufnahme = new URLSearchParams(location.search).get('nahaufnahme') === '1'
    const zombieMasse = new ZombieMasse(zombieBau, zombieBau.materialien, 600)
    zombieMasse.setze(nahaufnahme ? [-0.65, 0, 0.65].map((x, i) => ({ x, z: 0, dreh: 0, variante: i, groesse: 1 })) : zombieAufstellung(600, -35))
    scene.add(zombieMasse.gruppe)
    if (nahaufnahme) {
      scene.background = new THREE.Color('#777c7e'); scene.fog = null
      scene.traverse(obj => { if (obj instanceof THREE.Mesh && !zombieMasse.gruppe.children.includes(obj)) obj.visible = false })
      camera.position.set(0, 1.35, Math.max(3.8, 2.7 / (2 * Math.tan(THREE.MathUtils.degToRad(17.5)) * innerWidth / innerHeight))); camera.lookAt(0, 0.65, 0); camera.near = 0.1; camera.fov = 35; camera.updateProjectionMatrix()
    }
    const wasser = baueWasser(scene, renderer, normalen, stufe)
    if (nahaufnahme) scene.children.filter(o => o instanceof THREE.Mesh).forEach(o => { o.visible = false })
    geladenesZombieBau = null
    return { scene, camera, bemalungen: [strasse, normalen], wasser, zombieBau, zombieMasse, nahaufnahme }
  } catch {
    geladen.forEach(t => t.dispose())
    freigabeZombie()
    if (!abgebrochen()) beiLadeFehler(DATEIEN_FEHLER)
    return null
  } finally {
    vorbei = true
    if (timer) clearTimeout(timer)
  }
}

export function gibSzeneFrei(welt: Welt): void {
  welt.wasser.gibFrei()
  welt.zombieMasse.gibFrei()
  welt.scene.remove(welt.zombieMasse.gruppe)
  const geometrien = new Set<THREE.BufferGeometry>()
  const materialien = new Set<THREE.Material>()
  const texturen = new Set<THREE.Texture>(welt.bemalungen)
  const sammle = (wert: unknown) => {
    if (wert instanceof THREE.Texture) texturen.add(wert)
    else if (Array.isArray(wert)) wert.forEach(sammle)
    else if (wert && typeof wert === 'object' && 'value' in wert) sammle((wert as { value: unknown }).value)
  }
  welt.scene.traverse(obj => {
    if (!(obj instanceof THREE.Mesh)) return
    geometrien.add(obj.geometry)
    for (const material of Array.isArray(obj.material) ? obj.material : [obj.material]) {
      materialien.add(material)
      Object.values(material).forEach(sammle)
      if (material instanceof THREE.ShaderMaterial) Object.values(material.uniforms).forEach(sammle)
    }
  })
  if (welt.scene.environment instanceof THREE.Texture) texturen.add(welt.scene.environment)
  if (welt.scene.background instanceof THREE.Texture) texturen.add(welt.scene.background)
  welt.scene.environment = null; welt.scene.background = null
  texturen.forEach(t => t.dispose())
  materialien.forEach(m => m.dispose())
  geometrien.forEach(g => g.dispose())
  welt.scene.clear()
}
