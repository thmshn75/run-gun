import * as THREE from 'three'
import strassenUrl from './bilder/v3d-strasse.webp?url'
import normalenUrl from './bilder/v3d-wasser-normalen.webp?url'
import eisUrl from './bilder/v3d-eis.webp?url'
import { EisEffekte, baueEishuelle, ladeEisBemalung } from './eis'
import { BUEHNE, DARSTELLUNG, FAHRZEUGE, FIGUREN, LEVELS, type FahrzeugName, type Level } from './balance3d'
import { baueKamera } from './kamera'
import { ladeZombie, ZombieMasse, type ZombieBau } from './figuren'
import { ladeSoldatenDateien, fertigeSoldaten, entsorgeGLTF, SoldatenMasse, type SoldatenBau } from './soldaten'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { baueSchild, gibSchilderFrei } from './schilder'
import { baueWasser, type WasserHalter, type WasserStufe } from './wasser'
import { baueBoss, entsorgeBossGLTF, ladeBossDateien, type Boss } from './bosse'
import { baueMiniatur, ladeFahrzeuge, type FahrzeugBau } from './fahrzeuge'

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
  fahrzeugNahaufnahme: boolean
  fahrzeuge: Record<FahrzeugName, FahrzeugBau>
  fahrzeugGross: THREE.Group[]
  fahrzeugText: HTMLElement | null
  soldatBau: SoldatenBau
  truppe: SoldatenMasse
  laufTrupp: SoldatenMasse
  front: SoldatenMasse
  laufGruppen: THREE.Object3D[]
  plusSchilder: THREE.Object3D[]
  wand: THREE.Object3D
  saeulen: THREE.Group[]
  miniaturen: THREE.Object3D[]
  eis: EisEffekte
  saeulenBloecke: THREE.Group[]
  saeulenSchilder: THREE.Mesh[]
  miniboss: Boss
  eliteboss: Boss
}

export function saeulenZiele(level: Level, index: number, miniaturen: readonly THREE.Object3D[], anzahl: number): number[] {
  const ziele: number[] = []
  let vorderkante = -9
  for (let j = 0; j < anzahl; j++) {
    const name = level.saeulen[(index + j) % level.saeulen.length]
    const mini = miniaturen.find(m => m.name === `fahrzeug-${name}`)
    if (!mini) throw new Error(`${name}: Eis-Miniatur fehlt`)
    const [minZ, maxZ] = mini.userData.huelleZ as [number, number]
    const ziel = vorderkante - maxZ
    ziele.push(ziel)
    vorderkante = ziel + minZ - 1.5
  }
  return ziele
}

function box(gruppe: THREE.Group | THREE.Scene, name: string, groesse: [number, number, number], pos: [number, number, number], farbe: string, layer = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...groesse), new THREE.MeshStandardMaterial({ color: farbe }))
  mesh.name = name
  mesh.position.set(...pos)
  mesh.layers.set(layer)
  gruppe.add(mesh)
  return mesh
}

export function platzhalter(scene: THREE.Scene, fahrzeuge: Record<FahrzeugName, FahrzeugBau>, eisTextur: THREE.Texture | null = null) {
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
  const eis = new EisEffekte(scene, eisTextur)
  const tafGeometrie = new THREE.PlaneGeometry(1.2, 1.0)
  const saeulen: THREE.Group[] = [], miniaturen: THREE.Object3D[] = [], saeulenSchilder: THREE.Mesh[] = [], saeulenBloecke: THREE.Group[] = []
  for (const name of LEVELS[0].saeulen) {
    const mini = baueMiniatur(fahrzeuge[name as FahrzeugName], name as FahrzeugName, [0, 0, 0], { eis: true })
    const masse = baueEishuelle(mini, eis)
    eis.huellDreiecke += masse.dreiecke; eis.huellBytes += masse.bytes
    const huellBox = new THREE.Box3().setFromObject(mini.userData.huelle as THREE.Group, true)
    mini.userData.huelleZ = [huellBox.min.z, huellBox.max.z]
    mini.userData.hoehe = new THREE.Box3().setFromObject(mini, true).max.y
    miniaturen.push(mini)
  }
  const anzahl = Math.min(LEVELS[0].saeulen.length, DARSTELLUNG.SAEULEN_VORSCHAU + 1)
  const ziele = saeulenZiele(LEVELS[0], 0, miniaturen, anzahl)
  for (let index = 0; index < anzahl; index++) {
    const saeule = new THREE.Group()
    saeule.name = `saeule-${index}`
    saeule.position.set(BUEHNE.SAEULE_X, 0, ziele[index])
    const block = new THREE.Group()
    block.name = 'eishuelle-platz'
    block.add(miniaturen[index])
    eis.setzeMaterial(block, index === 0)
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128
    const textur = new THREE.CanvasTexture(canvas); textur.colorSpace = THREE.SRGBColorSpace
    const schild = new THREE.Mesh(tafGeometrie, new THREE.MeshBasicMaterial({ map: textur, transparent: true, depthTest: true, side: THREE.DoubleSide }))
    schild.name = 'eis-zahl'; schild.position.y = (miniaturen[index].userData.hoehe as number) + .35 + .5; schild.renderOrder = 10
    schild.userData.canvas = canvas
    saeule.add(block, schild); gruppe.add(saeule)
    saeulen.push(saeule); saeulenSchilder.push(schild); saeulenBloecke.push(block)
  }
  eis.setzeAktiv(saeulenBloecke[0], 0)
  return { gruppe, wand, plusSchilder, saeulen, miniaturen, saeulenSchilder, saeulenBloecke, eis }

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
  let fahrzeuge: Record<FahrzeugName, FahrzeugBau> | null = null
  let fahrzeugText: HTMLElement | null = null
  const freigabeZombie = () => { if (geladenesZombieBau) { geladenesZombieBau.formen.forEach(g => g.dispose()); geladenesZombieBau.materialien.forEach(m => m.dispose()); geladenesZombieBau.bemalungen.forEach(t => t.dispose()); geladenesZombieBau = null } }
  const lade = (url: string) => loader.loadAsync(url).then(textur => {
    if (vorbei || abgebrochen()) textur.dispose()
    else geladen.push(textur)
    return textur
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const beide = Promise.all([lade(strassenUrl), lade(normalenUrl), ladeZombie(renderer, () => vorbei || abgebrochen()).then(bau => { if (bau && (vorbei || abgebrochen())) { bau.formen.forEach(g => g.dispose()); bau.materialien.forEach(m => m.dispose()); bau.bemalungen.forEach(t => t.dispose()); return null } return bau }), ladeSoldatenDateien(() => vorbei || abgebrochen()).then(result => { if(result && (vorbei || abgebrochen())) { result.forEach(entsorgeGLTF); return null } dateien=result; return result }),ladeBossDateien(()=>vorbei||abgebrochen()).then(result=>{bossDateien=result;return result}),ladeFahrzeuge(()=>vorbei||abgebrochen()).then(result=>{fahrzeuge=result;return result})])
    const zeitlimit = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(DATEIEN_FEHLER)), 8000) })
    const eisBild = await ladeEisBemalung(() => loader.loadAsync(eisUrl), abgebrochen)
    if (!eisBild) console.warn('Eisbild nicht geladen; Grundfarbe wird verwendet')
    else { eisBild.colorSpace = THREE.SRGBColorSpace; eisBild.generateMipmaps = true; geladen.push(eisBild) }
    const [strasse, normalen, zombieBau, soldatDateien, geladeneBosse, geladeneFahrzeuge] = await Promise.race([beide, zeitlimit])
    if (!zombieBau || !soldatDateien || !geladeneBosse || !geladeneFahrzeuge) {
      geladen.forEach(t => t.dispose())
      if (zombieBau) { geladenesZombieBau = zombieBau; freigabeZombie() }
      if (soldatDateien) { soldatDateien.forEach(entsorgeGLTF); dateien = null }
      if (geladeneBosse) { geladeneBosse.forEach(entsorgeBossGLTF);bossDateien=null }
      if (geladeneFahrzeuge) { Object.values(geladeneFahrzeuge).forEach(b=>b.gibFrei());fahrzeuge=null }
      return null
    }
    geladenesZombieBau = zombieBau
    if (abgebrochen()) { geladen.forEach(t => t.dispose()); freigabeZombie(); soldatDateien.forEach(entsorgeGLTF); dateien = null;geladeneBosse.forEach(entsorgeBossGLTF);bossDateien=null;Object.values(geladeneFahrzeuge).forEach(b=>b.gibFrei());fahrzeuge=null; return null }
    if(timer){clearTimeout(timer);timer=undefined}
    soldatBau=fertigeSoldaten(soldatDateien,abgebrochen)
    dateien=null
    if(!soldatBau){geladen.forEach(t=>t.dispose());freigabeZombie();geladeneBosse.forEach(entsorgeBossGLTF);bossDateien=null;Object.values(geladeneFahrzeuge).forEach(b=>b.gibFrei());fahrzeuge=null;return null}
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
    const platz = platzhalter(scene, geladeneFahrzeuge, eisBild)
    const nahWert = new URLSearchParams(location.search).get('nahaufnahme')
    const nahaufnahme = nahWert === '1' || nahWert === 'soldat' || nahWert === 'fahrzeuge'
    const soldatNahaufnahme = nahWert === 'soldat'
    const fahrzeugNahaufnahme = nahWert === 'fahrzeuge'
    const fahrzeugGross: THREE.Group[] = []
    let fahrzeugVorschau: THREE.Group | null = null
    if (fahrzeugNahaufnahme) {
      const vorschau = new THREE.Group()
      vorschau.name = 'fahrzeug-nahaufnahme'
      fahrzeugVorschau = vorschau
      scene.add(vorschau)
      const radien = LEVELS[0].saeulen.map(name => {
        const box = new THREE.Box3().setFromObject(geladeneFahrzeuge[name as FahrzeugName].vorlage, true)
        const mass = box.getSize(new THREE.Vector3())
        return Math.hypot(mass.x, mass.z) / 2
      })
      const abstand = 2
      const positionen: number[] = []
      let x = 0
      for (let i = 0; i < radien.length; i++) {
        if (i) x += radien[i - 1] + radien[i] + abstand
        positionen.push(x)
      }
      const mitte = (positionen[0] - radien[0] + positionen.at(-1)! + radien.at(-1)!) / 2
      const spannweite = positionen.at(-1)! + radien.at(-1)! - (positionen[0] - radien[0])
      fahrzeugText = document.createElement('div')
      fahrzeugText.setAttribute('aria-label', 'Fahrzeugdaten')
      Object.assign(fahrzeugText.style, { position: 'fixed', left: '8px', right: '8px', bottom: 'calc(env(safe-area-inset-bottom) + 8px)', zIndex: '10', pointerEvents: 'none', color: 'white', background: '#152535e8', padding: '8px', borderRadius: '6px', font: '12px/1.35 system-ui' })
      for (const [i, name] of LEVELS[0].saeulen.entries()) {
        const bau = geladeneFahrzeuge[name as FahrzeugName]
        const modell = baueMiniatur(bau, name as FahrzeugName, [100, 100, 100])
        modell.scale.setScalar(1)
        modell.position.set(positionen[i] - mitte, 0, 0)
        vorschau.add(modell)
        fahrzeugGross.push(modell)
        const zeile = document.createElement('div')
        zeile.textContent = `${name.toUpperCase()} · ${bau.laenge} m · ${FAHRZEUGE[name as FahrzeugName].DREIECKE} Dreiecke · Drehung beim Normieren: ${FAHRZEUGE[name as FahrzeugName].DREHUNG}°`
        fahrzeugText.appendChild(zeile)
      }
      const boden = new THREE.Mesh(new THREE.PlaneGeometry(spannweite + 8, 42), new THREE.MeshStandardMaterial({ color: '#60686c', roughness: 1 }))
      boden.name = 'fahrzeug-boden'
      boden.rotation.x = -Math.PI / 2
      boden.position.y = -0.04
      vorschau.add(boden)
      scene.background=new THREE.Color('#777c7e');scene.fog=null
      const setzeKamera=()=>{
        camera.aspect=innerWidth/innerHeight;camera.fov=35
        const entfernung = spannweite / (1.8 * Math.tan(THREE.MathUtils.degToRad(17.5)) * camera.aspect)
        camera.position.set(0, 1 + entfernung * Math.sin(THREE.MathUtils.degToRad(20)), entfernung * Math.cos(THREE.MathUtils.degToRad(20)))
        camera.lookAt(0, 1, 0)
        camera.near=.1;camera.far=Math.max(500,entfernung+50);camera.updateProjectionMatrix()
      }
      setzeKamera()
      let zuletzt=0,zeit=0
      scene.onBeforeRender=()=>{setzeKamera();const jetzt=performance.now(),dt=zuletzt?Math.min(.1,(jetzt-zuletzt)/1000):0;zuletzt=jetzt
        if(document.hidden)return
        zeit+=dt
        for(const modell of fahrzeugGross){modell.rotation.y=zeit*2*Math.PI/FAHRZEUGE.DREH_S
          modell.getObjectByName('rotor')?.rotation.set(0,zeit*8*Math.PI,0)
          modell.getObjectByName('heckrotor')?.rotation.set(zeit*12*Math.PI,0,0)
        }
      }
    }
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
    if (nahaufnahme && !fahrzeugNahaufnahme) {
      bosse.forEach(b=>{b.objekt.visible=false})
      scene.background = new THREE.Color('#777c7e'); scene.fog = null
      scene.traverse(obj => { if (obj instanceof THREE.Mesh && !(soldatNahaufnahme?truppe.gruppe:zombieMasse.gruppe).children.includes(obj)) obj.visible = false })
      camera.position.set(0, 1.95, Math.max(3.8, 2.9 / (2 * Math.tan(THREE.MathUtils.degToRad(17.5)) * innerWidth / innerHeight))); camera.lookAt(0, 0.95, 0); camera.near = 0.1; camera.fov = 35; camera.updateProjectionMatrix()
    }
    const wasser = baueWasser(scene, renderer, normalen, stufe)
    if (fahrzeugVorschau) scene.children.forEach(o => { if (o !== fahrzeugVorschau && !(o instanceof THREE.Light)) o.visible = false })
    if (fahrzeugText) document.body.appendChild(fahrzeugText)
    if (nahaufnahme && !fahrzeugNahaufnahme) scene.children.filter(o => o instanceof THREE.Mesh).forEach(o => { o.visible = false })
    geladenesZombieBau = null
    return { scene, camera, bemalungen: [strasse, normalen], wasser, zombieBau, zombieMasse, nahaufnahme, soldatNahaufnahme, fahrzeugNahaufnahme, fahrzeuge:geladeneFahrzeuge, fahrzeugGross, fahrzeugText, soldatBau, truppe, laufTrupp,front,miniboss:bosse[0],eliteboss:bosse[1], laufGruppen:[truppe.gruppe,laufTrupp.gruppe,front.gruppe,zombieMasse.gruppe,bosse[0].objekt,bosse[1].objekt,platz.gruppe,platz.eis.splitter,platz.eis.blitz], plusSchilder:platz.plusSchilder,wand:platz.wand,saeulen:platz.saeulen,miniaturen:platz.miniaturen,saeulenSchilder:platz.saeulenSchilder,saeulenBloecke:platz.saeulenBloecke,eis:platz.eis }
  } catch {
    fahrzeugText?.remove()
    geladen.forEach(t => t.dispose())
    freigabeZombie()
    if(dateien)dateien.forEach(entsorgeGLTF)
    if(bossDateien)bossDateien.forEach(entsorgeBossGLTF)
    if(bosse)bosse.forEach(b=>b.gibFrei())
    if(fahrzeuge)Object.values(fahrzeuge as Record<FahrzeugName,FahrzeugBau>).forEach(b=>b.gibFrei())
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
  welt.fahrzeugText?.remove()
  welt.wasser.gibFrei()
  welt.zombieMasse.gibFrei()
  welt.laufTrupp.gibNetzeFrei()
  welt.front.gibNetzeFrei()
  welt.truppe.gibFrei()
  welt.miniboss.gibFrei();welt.eliteboss.gibFrei()
  Object.values(welt.fahrzeuge).forEach(b=>b.gibFrei())
  welt.scene.remove(welt.zombieMasse.gruppe)
  for (const mini of welt.miniaturen) for (const mesh of (mini.userData.rissMeshes as THREE.Mesh[] | undefined) ?? []) mesh.geometry.dispose()
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
  welt.eis.basis.dispose(); welt.eis.treffer.dispose(); welt.eis.rissMaterial.dispose(); welt.eis.textur.dispose(); (welt.eis.blitz.material as THREE.Material).dispose()
  gibSchilderFrei()
  materialien.forEach(m => m.dispose())
  geometrien.forEach(g => g.dispose())
  welt.scene.clear()
}
