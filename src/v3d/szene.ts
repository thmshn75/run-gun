import * as THREE from 'three'
import strassenUrl from './bilder/v3d-strasse.webp?url'
import normalenUrl from './bilder/v3d-wasser-normalen.webp?url'
import { BUEHNE, DARSTELLUNG, FIGUREN, LEVELS } from './balance3d'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { baueKamera } from './kamera'
import { ladeZombie, ZombieMasse, type ZombieBau } from './figuren'
import { ladeSoldatenDateien, fertigeSoldaten, entsorgeGLTF, SoldatenMasse, type SoldatenBau } from './soldaten'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { baueSchild, gibSchilderFrei } from './schilder'
import { baueWasser, type WasserHalter, type WasserStufe } from './wasser'
import { baueBoss, entsorgeBossGLTF, ladeBossDateien, type Boss } from './bosse'

export const DATEIEN_FEHLER = '3D-Dateien nicht ladbar – App neu öffnen'
export interface Welt {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  bemalungen: [THREE.Texture, THREE.Texture]
  wasser: WasserHalter
  zombieBau: ZombieBau
  zombieMasse: ZombieMasse
  nahaufnahme: boolean
  soldatNahaufnahme: boolean
  soldatBau: SoldatenBau
  truppe: SoldatenMasse
  laufTrupp: SoldatenMasse
  front: SoldatenMasse
  laufGruppen: THREE.Object3D[]
  plusSchilder: THREE.Object3D[]
  wand: THREE.Object3D
  saeulen: THREE.Group[]
  saeulenInnen: THREE.Object3D[]
  saeulenSchilder: THREE.Mesh[]
  miniboss: Boss
  eliteboss: Boss
}

function box(gruppe: THREE.Group | THREE.Scene, name: string, groesse: [number, number, number], pos: [number, number, number], farbe: string, layer = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...groesse), new THREE.MeshStandardMaterial({ color: farbe }))
  mesh.name = name
  mesh.position.set(...pos)
  mesh.layers.set(layer)
  gruppe.add(mesh)
  return mesh
}

export function platzhalter(scene: THREE.Scene) {
  const gruppe = new THREE.Group()
  gruppe.name = 'platzhalter'
  gruppe.visible = new URLSearchParams(location.search).get('platzhalter') !== '0'
  scene.add(gruppe)
  const wand = baueSchild({ breite: 2 * BUEHNE.MITTE_HALB, hoehe: BUEHNE.WAND_HOEHE, text: '×2', farbe: BUEHNE.WAND_FARBE })
  wand.name = 'vervielfacher'; wand.position.z = -5; gruppe.add(wand)
  const plusSchilder: THREE.Object3D[] = []
  for (let z = 6; z >= -60; z -= BUEHNE.PLUS_ABSTAND) {
    const plus = baueSchild({ breite: BUEHNE.PLUS_BREITE, hoehe: BUEHNE.PLUS_HOEHE, text: '+1', farbe: '#168bd2', unterkante: 0.5, neigungGrad: -10, pfosten: false })
    plus.name = 'plus-eins'; plus.position.set(BUEHNE.PLUS_X, 0, z); gruppe.add(plus); plusSchilder.push(plus)
  }
  const innenGeometrie = new THREE.BoxGeometry(1, 0.6, 1.2)
  const glasGeometrie = new THREE.BoxGeometry(1.6, 4, 1.6)
  const schildGeometrie = new THREE.PlaneGeometry(1.6, .9)
  const kanten: THREE.BufferGeometry[] = []
  const kante = (masse: [number, number, number], pos: [number, number, number]) => {
    const g = new THREE.BoxGeometry(...masse); g.translate(...pos); kanten.push(g)
  }
  for (const x of [-.8, .8]) for (const z of [-.8, .8]) kante([.06, 4, .06], [x, 2, z])
  for (const y of [0, 4]) {
    for (const z of [-.8, .8]) kante([1.6, .06, .06], [0, y, z])
    for (const x of [-.8, .8]) kante([.06, .06, 1.6], [x, y, 0])
  }
  const rahmenGeometrie = mergeGeometries(kanten)
  kanten.forEach(g => g.dispose())
  if (!rahmenGeometrie) throw new Error('Säulenrahmen nicht zusammenführbar')
  const innenMaterial = new THREE.MeshStandardMaterial({ color: '#244a32' })
  const glasMaterial = new THREE.MeshStandardMaterial({ color: '#c8ecf7', transparent: true, opacity: .3, depthWrite: false, roughness: .1 })
  const rahmenMaterial = new THREE.MeshStandardMaterial({ color: '#e5f6fa' })
  const saeulen: THREE.Group[] = [], saeulenInnen: THREE.Object3D[] = [], saeulenSchilder: THREE.Mesh[] = []
  for (const [index, name] of LEVELS[0].saeulen.entries()) {
    if (index > DARSTELLUNG.SAEULEN_VORSCHAU) break
    const saeule = new THREE.Group()
    saeule.name = `saeule-${name}`
    saeule.position.set(BUEHNE.SAEULE_X, 0, -12 - index * BUEHNE.SAEULEN_ABSTAND)
    const innen = new THREE.Mesh(innenGeometrie, innenMaterial)
    innen.name = 'spezialeinheit-platzhalter'; innen.position.y = .3; innen.renderOrder = 1
    const glas = new THREE.Mesh(glasGeometrie, glasMaterial)
    glas.name = 'saeule'; glas.position.y = 2; glas.renderOrder = 2
    const rahmen = new THREE.Mesh(rahmenGeometrie, rahmenMaterial)
    rahmen.name = 'saeule-rahmen'; rahmen.renderOrder = 3
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#102437d9'; ctx.fillRect(0, 0, 256, 128)
    ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    let schrift = 34
    ctx.font = `bold ${schrift}px system-ui`
    while (schrift > 10 && ctx.measureText(name.toUpperCase()).width > canvas.width - 16) {
      ctx.font = `bold ${--schrift}px system-ui`
    }
    ctx.fillText(name.toUpperCase(), 128, 48)
    const textur = new THREE.CanvasTexture(canvas); textur.colorSpace = THREE.SRGBColorSpace
    const schild = new THREE.Mesh(schildGeometrie, new THREE.MeshBasicMaterial({ map: textur, transparent: true, depthTest: false, side: THREE.DoubleSide }))
    schild.name = `saeule-name-${name.toUpperCase()}`; schild.position.y = 4.95; schild.renderOrder = 10
    schild.userData.canvas = canvas
    saeule.add(innen, glas, rahmen, schild); gruppe.add(saeule)
    saeulen.push(saeule); saeulenInnen.push(innen); saeulenSchilder.push(schild)
  }
  return { gruppe, wand, plusSchilder, saeulen, saeulenInnen, saeulenSchilder }
}

export async function baueSzene(renderer: THREE.WebGLRenderer, stufe: WasserStufe, abgebrochen: () => boolean, beiLadeFehler: (hinweis: string) => void): Promise<Welt | null> {
  const loader = new THREE.TextureLoader()
  const geladen: THREE.Texture[] = []
  let vorbei = false
  let geladenesZombieBau: ZombieBau | null = null
  let dateien: [GLTF, GLTF] | null = null
  let soldatBau: SoldatenBau | null = null
  let bossDateien: [GLTF,GLTF] | null = null
  let bosse: [Boss,Boss] | null = null
  const freigabeZombie = () => { if (geladenesZombieBau) { geladenesZombieBau.formen.forEach(g => g.dispose()); geladenesZombieBau.materialien.forEach(m => m.dispose()); geladenesZombieBau.bemalungen.forEach(t => t.dispose()); geladenesZombieBau = null } }
  const lade = (url: string) => loader.loadAsync(url).then(textur => {
    if (vorbei || abgebrochen()) textur.dispose()
    else geladen.push(textur)
    return textur
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const beide = Promise.all([lade(strassenUrl), lade(normalenUrl), ladeZombie(renderer, () => vorbei || abgebrochen()).then(bau => { if (bau && (vorbei || abgebrochen())) { bau.formen.forEach(g => g.dispose()); bau.materialien.forEach(m => m.dispose()); bau.bemalungen.forEach(t => t.dispose()); return null } return bau }), ladeSoldatenDateien(() => vorbei || abgebrochen()).then(result => { if(result && (vorbei || abgebrochen())) { result.forEach(entsorgeGLTF); return null } dateien=result; return result }),ladeBossDateien(()=>vorbei||abgebrochen()).then(result=>{bossDateien=result;return result})])
    const zeitlimit = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(DATEIEN_FEHLER)), 8000) })
    const [strasse, normalen, zombieBau, soldatDateien, geladeneBosse] = await Promise.race([beide, zeitlimit])
    if (!zombieBau || !soldatDateien || !geladeneBosse) {
      geladen.forEach(t => t.dispose())
      if (zombieBau) { geladenesZombieBau = zombieBau; freigabeZombie() }
      if (soldatDateien) { soldatDateien.forEach(entsorgeGLTF); dateien = null }
      if (geladeneBosse) { geladeneBosse.forEach(entsorgeBossGLTF);bossDateien=null }
      return null
    }
    geladenesZombieBau = zombieBau
    if (abgebrochen()) { geladen.forEach(t => t.dispose()); freigabeZombie(); soldatDateien.forEach(entsorgeGLTF); dateien = null;geladeneBosse.forEach(entsorgeBossGLTF);bossDateien=null; return null }
    if(timer){clearTimeout(timer);timer=undefined}
    soldatBau=fertigeSoldaten(soldatDateien,abgebrochen)
    dateien=null
    if(!soldatBau){geladen.forEach(t=>t.dispose());freigabeZombie();geladeneBosse.forEach(entsorgeBossGLTF);bossDateien=null;return null}
    bosse=[baueBoss('miniboss',geladeneBosse[0]),baueBoss('eliteboss',geladeneBosse[1])]
    bossDateien=null
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
      box(scene, 'randmauer', [0.3, 0.35, 240], [x, 0.175, -100], BUEHNE.RANDMAUER_FARBE)
    }
    const kantenLaenge = BUEHNE.KANTE_Z_VORNE - BUEHNE.KANTE_Z_HINTEN
    const kantenMitte = (BUEHNE.KANTE_Z_VORNE + BUEHNE.KANTE_Z_HINTEN) / 2
    for (const x of [-BUEHNE.MITTE_HALB, BUEHNE.MITTE_HALB]) {
      box(scene, 'streifenkante', [BUEHNE.KANTE_BREITE, BUEHNE.KANTE_HOEHE, kantenLaenge],
        [x, BUEHNE.KANTE_HOEHE / 2, kantenMitte], BUEHNE.RANDMAUER_FARBE)
    }
    // Der Boden des Damms schließt die Seiten bis y = -0,6.
    const damm = new THREE.Mesh(new THREE.PlaneGeometry(12, 240), beton)
    damm.rotation.x = Math.PI / 2; damm.position.set(0, -0.6, -100); damm.name = 'damm-unterseite'; scene.add(damm)
    const platz = platzhalter(scene)
    const nahWert = new URLSearchParams(location.search).get('nahaufnahme')
    const nahaufnahme = nahWert === '1' || nahWert === 'soldat'
    const soldatNahaufnahme = nahWert === 'soldat'
    const buehnenAnzahl = FIGUREN.ZOMBIES_SICHTBAR_MAX
    const zombieMasse = new ZombieMasse(zombieBau, zombieBau.materialien, buehnenAnzahl)
    zombieMasse.setze(nahWert === '1' ? [-0.85, 0, 0.85].map((x, i) => ({ x, z: 0, dreh: 0, variante: i, groesse: 1 })) : [])
    scene.add(zombieMasse.gruppe)
    bosse[0].objekt.position.z=-36;bosse[1].objekt.position.z=-66
    scene.add(bosse[0].objekt,bosse[1].objekt)
    const truppe=new SoldatenMasse(soldatBau)
    const laufTrupp=new SoldatenMasse(soldatBau)
    const front=new SoldatenMasse(soldatBau)
    truppe.setze(soldatNahaufnahme ? [-1.5,-.5,.5,1.5].map((x,i)=>({x,z:0,dreh:0,bewegung:(['laufen','stehen','schiessen','fallen'] as const)[i]})) : [])
    laufTrupp.setze([])
    scene.add(truppe.gruppe,laufTrupp.gruppe,front.gruppe)
    if (nahaufnahme) {
      bosse.forEach(b=>{b.objekt.visible=false})
      scene.background = new THREE.Color('#777c7e'); scene.fog = null
      scene.traverse(obj => { if (obj instanceof THREE.Mesh && !(soldatNahaufnahme?truppe.gruppe:zombieMasse.gruppe).children.includes(obj)) obj.visible = false })
      camera.position.set(0, 1.95, Math.max(3.8, 2.9 / (2 * Math.tan(THREE.MathUtils.degToRad(17.5)) * innerWidth / innerHeight))); camera.lookAt(0, 0.95, 0); camera.near = 0.1; camera.fov = 35; camera.updateProjectionMatrix()
    }
    const wasser = baueWasser(scene, renderer, normalen, stufe)
    if (nahaufnahme) scene.children.filter(o => o instanceof THREE.Mesh).forEach(o => { o.visible = false })
    geladenesZombieBau = null
    return { scene, camera, bemalungen: [strasse, normalen], wasser, zombieBau, zombieMasse, nahaufnahme, soldatNahaufnahme, soldatBau, truppe, laufTrupp,front,miniboss:bosse[0],eliteboss:bosse[1], laufGruppen:[truppe.gruppe,laufTrupp.gruppe,front.gruppe,zombieMasse.gruppe,bosse[0].objekt,bosse[1].objekt,platz.gruppe], plusSchilder:platz.plusSchilder,wand:platz.wand,saeulen:platz.saeulen,saeulenInnen:platz.saeulenInnen,saeulenSchilder:platz.saeulenSchilder }
  } catch {
    geladen.forEach(t => t.dispose())
    freigabeZombie()
    if(dateien)dateien.forEach(entsorgeGLTF)
    if(bossDateien)bossDateien.forEach(entsorgeBossGLTF)
    if(bosse)bosse.forEach(b=>b.gibFrei())
    if(soldatBau){for(const row of Object.values(soldatBau.formen))row.forEach(g=>g.dispose());soldatBau.material.dispose();soldatBau.atlas.dispose()}
    gibSchilderFrei()
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
  welt.laufTrupp.gibNetzeFrei()
  welt.front.gibNetzeFrei()
  welt.truppe.gibFrei()
  welt.miniboss.gibFrei();welt.eliteboss.gibFrei()
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
  gibSchilderFrei()
  materialien.forEach(m => m.dispose())
  geometrien.forEach(g => g.dispose())
  welt.scene.clear()
}
