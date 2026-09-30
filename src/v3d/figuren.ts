import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import zombieUrl from './modelle/v3d-zombie.glb?url'
import bUrl from './bilder/v3d-zombie-b.webp?url'
import cUrl from './bilder/v3d-zombie-c.webp?url'
import { DARSTELLUNG, FIGUREN } from './balance3d'

export interface ZombieEintrag { x: number; z: number; dreh: number; variante: number; groesse: number }
export interface ZombieBau { formen: THREE.BufferGeometry[]; materialien: [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial, THREE.MeshStandardMaterial]; bemalungen: THREE.Texture[]; dauer: number; dreiecke: number }

export function bildFuer(gruppe: number, zeit: number, dauer = FIGUREN.ZOMBIE_ZYKLUS_S): number {
  const bild = Math.floor(Math.max(0, zeit) / dauer * FIGUREN.ZOMBIE_FORMEN)
  return ((Math.round(gruppe * FIGUREN.ZOMBIE_FORMEN / FIGUREN.PHASENGRUPPEN) + bild) % FIGUREN.ZOMBIE_FORMEN + FIGUREN.ZOMBIE_FORMEN) % FIGUREN.ZOMBIE_FORMEN
}

export function zombieAufstellung(anzahl: number, startZ: number, seed = 73291): ZombieEintrag[] {
  let zustand = seed >>> 0
  const zufall = () => ((zustand = (Math.imul(zustand, 1664525) + 1013904223) >>> 0) / 4294967296)
  const spalten = Math.floor((FIGUREN.ZOMBIE_X_MAX - FIGUREN.ZOMBIE_X_MIN) / FIGUREN.ZOMBIE_SPALTENABSTAND) + 1
  return Array.from({ length: anzahl }, (_, i) => {
    const reihe = Math.floor(i / spalten), spalte = i % spalten
    return {
      x: Math.max(FIGUREN.ZOMBIE_X_MIN, Math.min(FIGUREN.ZOMBIE_X_MAX,
        (spalte - (spalten - 1) / 2) * FIGUREN.ZOMBIE_SPALTENABSTAND
        + (reihe % 2) * FIGUREN.ZOMBIE_SPALTENABSTAND / 2
        + (zufall() * 2 - 1) * FIGUREN.ZOMBIE_ZUFALLSVERSATZ)),
      z: startZ - reihe * FIGUREN.ZOMBIE_REIHENABSTAND + (zufall() * 2 - 1) * FIGUREN.ZOMBIE_ZUFALLSVERSATZ,
      dreh: (zufall() * 2 - 1) * Math.PI / 12,
      variante: Math.floor(zufall() * 3),
      groesse: 0.92 + zufall() * 0.16,
    }
  })
}

function aufDerStelle(clip: THREE.AnimationClip): void {
  let beste: THREE.KeyframeTrack | null = null, weite = 0
  for (const t of clip.tracks) {
    if (!t.name.endsWith('.position')) continue
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (let i = 0; i < t.values.length; i += 3) { minX = Math.min(minX, t.values[i]); maxX = Math.max(maxX, t.values[i]); minZ = Math.min(minZ, t.values[i+2]); maxZ = Math.max(maxZ, t.values[i+2]) }
    if (maxX-minX+maxZ-minZ > weite) { beste = t; weite = maxX-minX+maxZ-minZ }
  }
  if (beste) for (let i=0;i<beste.values.length;i+=3) { beste.values[i]=beste.values[0]; beste.values[i+2]=beste.values[2] }
}

export function backe(gltf: GLTF, hoehe = FIGUREN.ZOMBIE_HOEHE): THREE.BufferGeometry[] {
  const clip = gltf.animations.find(a => a.name === 'ANIMATION ZOMBIE') ?? gltf.animations[0]
  if (!clip) throw new Error('Zombie-Animation fehlt')
  aufDerStelle(clip)
  const root = gltf.scene, mixer = new THREE.AnimationMixer(root)
  mixer.clipAction(clip).play()
  const netze: THREE.Mesh[] = []
  root.traverse(o => { if (o instanceof THREE.Mesh) netze.push(o) })
  const posen: Float32Array[][] = []
  const grenzen = new THREE.Box3(), v = new THREE.Vector3()
  for (let f=0;f<FIGUREN.ZOMBIE_FORMEN;f++) {
    mixer.setTime(clip.duration * f / FIGUREN.ZOMBIE_FORMEN)
    root.updateMatrixWorld(true)
    const teile: Float32Array[] = []
    for (const netz of netze) {
      const g=netz.geometry, p=new Float32Array(g.attributes.position.count*3)
      if (netz instanceof THREE.SkinnedMesh) netz.skeleton.update()
      for (let i=0;i<g.attributes.position.count;i++) {
        netz.getVertexPosition(i,v); v.applyMatrix4(netz.matrixWorld)
        p.set([v.x,v.y,v.z],i*3); grenzen.expandByPoint(v)
      }
      teile.push(p)
    }
    posen.push(teile)
  }
  const faktor=hoehe/(grenzen.max.y-grenzen.min.y)
  const formen: THREE.BufferGeometry[]=[]
  let referenzX=0,referenzZ=0
  for (let f=0;f<posen.length;f++) {
    const teile: THREE.BufferGeometry[]=[]
    let minY=Infinity, cx=0,cz=0,n=0
    for (const p of posen[f]) for(let i=0;i<p.length;i+=3){minY=Math.min(minY,p[i+1]);cx+=p[i];cz+=p[i+2];n++}
    cx/=n;cz/=n
    if(f===0){referenzX=cx;referenzZ=cz}
    for(let k=0;k<netze.length;k++) {
      const src=netze[k].geometry,p=posen[f][k]
      for(let i=0;i<p.length;i+=3){p[i]=(p[i]-cx+referenzX)*faktor;p[i+1]=(p[i+1]-minY)*faktor;p[i+2]=(p[i+2]-cz+referenzZ)*faktor}
      const teil=new THREE.BufferGeometry()
      teil.setAttribute('position',new THREE.BufferAttribute(p,3))
      teil.setAttribute('uv',src.attributes.uv)
      if(src.index)teil.setIndex(src.index)
      teile.push(teil)
    }
    if(f===0){const merged=mergeGeometries(teile);if(!merged)throw new Error('Zombie-Teilnetze unvereinbar');merged.computeVertexNormals();formen.push(merged)}
    else {
      const form=formen[0].clone(), position=new Float32Array(form.attributes.position.count*3)
      let offset=0
      for(const p of posen[f]){position.set(p,offset);offset+=p.length}
      form.setAttribute('position',new THREE.BufferAttribute(position,3))
      form.setAttribute('uv',formen[0].attributes.uv)
      form.setIndex(formen[0].index)
      form.computeVertexNormals();formen.push(form)
    }
    teile.forEach(t=>t.dispose())
  }
  mixer.stopAllAction();mixer.uncacheRoot(root)
  return formen
}

export async function ladeZombie(renderer: THREE.WebGLRenderer, abgebrochen: () => boolean): Promise<ZombieBau | null> {
  const laden = new THREE.TextureLoader()
  const ergebnisse = await Promise.allSettled([new GLTFLoader().loadAsync(zombieUrl), laden.loadAsync(bUrl), laden.loadAsync(cUrl)] as const)
  const [gltfResult, bResult, cResult] = ergebnisse
  if (gltfResult.status === 'rejected' || bResult.status === 'rejected' || cResult.status === 'rejected') {
    for (const r of [bResult, cResult]) if (r.status === 'fulfilled') r.value.dispose()
    if (gltfResult.status === 'fulfilled') gltfResult.value.scene.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); const mat=o.material as THREE.MeshStandardMaterial; mat.map?.dispose(); mat.dispose() } })
    throw new Error('Zombie-Dateien nicht ladbar')
  }
  const gltf = gltfResult.value, b = bResult.value, c = cResult.value
  const gibQuelleFrei = () => gltf.scene.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose() } })
  const quellTexturen = new Set<THREE.Texture>()
  gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){const mat=o.material as THREE.MeshStandardMaterial;if(mat.map)quellTexturen.add(mat.map)}})
  if(abgebrochen()){b.dispose();c.dispose();quellTexturen.forEach(t=>t.dispose());gibQuelleFrei();return null}
  const a=[...quellTexturen][0]
  if(!a){b.dispose();c.dispose();gibQuelleFrei();throw new Error('Zombie-Bemalung fehlt')}
  for(const t of [a,b,c]){t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;t.wrapS=a.wrapS;t.wrapT=a.wrapT;t.minFilter=a.minFilter;t.magFilter=a.magFilter;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy())}
  const formen=backe(gltf)
  if(abgebrochen()){formen.forEach(g=>g.dispose());b.dispose();c.dispose();quellTexturen.forEach(t=>t.dispose());gibQuelleFrei();return null}
  const materialien=[a,b,c].map(map=>new THREE.MeshStandardMaterial({map,roughness:0.85,metalness:0,side:THREE.FrontSide})) as ZombieBau['materialien']
  gibQuelleFrei()
  return {formen,materialien,bemalungen:[...quellTexturen,b,c],dauer:gltf.animations[0].duration,dreiecke:(formen[0].index?.count??formen[0].attributes.position.count)/3}
}

export class ZombieMasse {
  readonly gruppe = new THREE.Group()
  private netze: THREE.InstancedMesh[][]
  private bau: ZombieBau
  constructor(bau: ZombieBau, materialien: ZombieBau['materialien'], max: number) {
    this.bau=bau;this.gruppe.name='zombie-masse'
    this.netze=materialien.map(mat=>Array.from({length:FIGUREN.PHASENGRUPPEN},(_,g)=>{
      const netz=new THREE.InstancedMesh(bau.formen[bildFuer(g,0)],mat,max)
      netz.layers.set(1);netz.frustumCulled=false;netz.instanceMatrix.setUsage(THREE.DynamicDrawUsage);netz.count=0
      this.gruppe.add(netz);return netz
    }))
  }
  setze(liste: ZombieEintrag[]): void {
    const zaehler=Array.from({length:3},()=>new Array<number>(FIGUREN.PHASENGRUPPEN).fill(0)),dummy=new THREE.Object3D()
    liste.forEach((eintrag,i)=>{
      const v=eintrag.variante,g=i%FIGUREN.PHASENGRUPPEN,netz=this.netze[v]?.[g]
      if(!netz)throw new Error('Ungültige Zombie-Variante')
      const index=zaehler[v][g]++;if(index>=netz.instanceMatrix.count)throw new Error('Zombie-Kapazität überschritten')
      dummy.position.set(eintrag.x,0,eintrag.z);dummy.rotation.set(0,eintrag.dreh,0);dummy.scale.setScalar(eintrag.groesse);dummy.updateMatrix();netz.setMatrixAt(index,dummy.matrix)
    })
    this.netze.forEach((reihe,v)=>reihe.forEach((netz,g)=>{netz.count=zaehler[v][g];netz.instanceMatrix.needsUpdate=true}))
  }
  aktualisiere(zeitSekunden:number):void {this.netze.forEach(reihe=>reihe.forEach((netz,g)=>{netz.geometry=this.bau.formen[bildFuer(g,zeitSekunden)]}))}
  gibNetzeFrei():void {this.netze.forEach(reihe=>reihe.forEach(n=>{this.gruppe.remove(n);n.dispose()}))}
  gibFrei():void {this.gibNetzeFrei();this.bau.formen.forEach(g=>g.dispose());this.bau.materialien.forEach(m=>m.dispose());this.bau.bemalungen.forEach(t=>t.dispose())}
}

export class FallendeZombies {
  readonly gruppe = new THREE.Group()
  private netze: THREE.InstancedMesh[]
  private dummy = new THREE.Object3D()
  private eintraege: { x: number; z: number; dreh: number; groesse: number; variante: number; start: number }[] = []
  constructor(bau: ZombieBau, max = DARSTELLUNG.FALL_ZOMBIES_MAX) {
    this.netze = bau.materialien.map(material => {
      const netz = new THREE.InstancedMesh(bau.formen[0], material, max)
      netz.layers.set(1); netz.frustumCulled = false; netz.instanceMatrix.setUsage(THREE.DynamicDrawUsage); netz.count = 0
      this.gruppe.add(netz)
      return netz
    })
  }
  get aktiv(): number { return this.eintraege.length }
  get frei(): number { return this.netze[0].instanceMatrix.count - this.aktiv }
  starte(x: number, z: number, dreh: number, groesse: number, variante: number, zeit: number): boolean {
    if (this.frei <= 0) return false
    this.eintraege.push({ x, z, dreh, groesse, variante, start: zeit })
    return true
  }
  aktualisiere(zeit: number): void {
    let behalten = 0
    const zaehler = [0, 0, 0]
    for (let i = 0; i < this.eintraege.length; i++) {
      const e = this.eintraege[i], alter = Math.max(0, zeit - e.start)
      if (alter >= 1.1) continue
      this.eintraege[behalten++] = e
      const kipp = Math.min(1, alter / .35)
      this.dummy.position.set(e.x, alter <= .7 ? 0 : -.5 * (alter - .7) / .4, e.z)
      this.dummy.rotation.set(-Math.PI * 85 / 180 * kipp * kipp, e.dreh, 0, 'YXZ')
      this.dummy.scale.setScalar(e.groesse)
      this.dummy.updateMatrix()
      this.netze[e.variante].setMatrixAt(zaehler[e.variante]++, this.dummy.matrix)
    }
    this.eintraege.length = behalten
    for (let i = 0; i < 3; i++) { this.netze[i].count = zaehler[i]; this.netze[i].instanceMatrix.needsUpdate = true }
  }
  gibNetzeFrei(): void { for (const netz of this.netze) { netz.removeFromParent(); netz.dispose() } this.eintraege.length = 0 }
}
