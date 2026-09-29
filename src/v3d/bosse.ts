import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import miniUrl from './modelle/v3d-miniboss.glb?url'
import eliteUrl from './modelle/v3d-eliteboss.glb?url'
import { FIGUREN } from './balance3d'
import { zombieAufstellung, type ZombieEintrag } from './figuren'

export type BossArt = 'miniboss' | 'eliteboss'
export interface Boss {
  objekt: THREE.Group
  breite: number
  spiele(clipKurzname: string): void
  aktualisiere(dtS: number): void
  gibFrei(): void
}

export function entsorgeBossGLTF(gltf: GLTF): void {
  const geometrien=new Set<THREE.BufferGeometry>(), materialien=new Set<THREE.Material>(), bilder=new Set<THREE.Texture>()
  gltf.scene.traverse(o=>{if(!(o instanceof THREE.Mesh))return;geometrien.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materialien.add(m);for(const v of Object.values(m))if(v instanceof THREE.Texture)bilder.add(v)}if(o instanceof THREE.SkinnedMesh)o.skeleton.dispose()})
  bilder.forEach(t=>t.dispose());materialien.forEach(m=>m.dispose());geometrien.forEach(g=>g.dispose())
}

export async function ladeBossDateien(abgebrochen:()=>boolean):Promise<[GLTF,GLTF]|null>{
  const loader=new GLTFLoader()
  const laden=(url:string)=>loader.loadAsync(url).then(g=>{if(abgebrochen()){entsorgeBossGLTF(g);return null}return g})
  const beide=await Promise.all([laden(miniUrl),laden(eliteUrl)])
  if(beide.some(g=>!g)){beide.forEach(g=>{if(g)entsorgeBossGLTF(g)});return null}
  return beide as [GLTF,GLTF]
}

function aufDerStelle(clip:THREE.AnimationClip):void{
  let beste:THREE.KeyframeTrack|null=null,weite=0
  for(const t of clip.tracks){if(!t.name.endsWith('.position'))continue;let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity
    for(let i=0;i<t.values.length;i+=3){minX=Math.min(minX,t.values[i]);maxX=Math.max(maxX,t.values[i]);minZ=Math.min(minZ,t.values[i+2]);maxZ=Math.max(maxZ,t.values[i+2])}
    if(maxX-minX+maxZ-minZ>weite){weite=maxX-minX+maxZ-minZ;beste=t}
  }
  if(beste)for(let i=0;i<beste.values.length;i+=3){beste.values[i]=beste.values[0];beste.values[i+2]=beste.values[2]}
}

export function baueBoss(art:BossArt,gltf:GLTF):Boss{
  const objekt=gltf.scene,hoehe=art==='miniboss'?FIGUREN.MINIBOSS_HOEHE:FIGUREN.ELITEBOSS_HOEHE
  const clips=gltf.animations
  if(!clips.length)throw new Error(`${art}: Animation fehlt`)
  clips.forEach(aufDerStelle)
  objekt.rotation.y=art==='miniboss'?FIGUREN.MINIBOSS_DREHUNG:FIGUREN.ELITEBOSS_DREHUNG
  objekt.traverse(o=>{if(!(o instanceof THREE.Mesh))return
    const ersetzen=(alt:THREE.Material)=>{const m=alt as THREE.MeshStandardMaterial,map=m.map,normalMap=m.normalMap
      if(!map||!normalMap)throw new Error(`${art}: Farb- oder Reliefbild fehlt`)
      map.colorSpace=THREE.SRGBColorSpace;normalMap.colorSpace=THREE.NoColorSpace
      return new THREE.MeshStandardMaterial({map,normalMap,roughness:.8,metalness:0,side:THREE.FrontSide})}
    const alt=Array.isArray(o.material)?o.material:[o.material]
    o.material=Array.isArray(o.material)?alt.map(ersetzen):ersetzen(alt[0])
    alt.forEach(m=>m.dispose());o.layers.set(1)
  })
  const mixer=new THREE.AnimationMixer(objekt)
  const standard=art==='miniboss'?'walk':'Motion'
  const clip=clips.find(c=>c.name.split('|').at(-1)===standard)!
  if(!clip)throw new Error(`${art}: Standardbewegung fehlt`)
  mixer.clipAction(clip).play();mixer.setTime(0);objekt.updateMatrixWorld(true)
  const box0=new THREE.Box3().setFromObject(objekt,true)
  const faktor=hoehe/(box0.max.y-box0.min.y)
  objekt.scale.setScalar(faktor)
  const boden=new THREE.Box3(),walkBox=new THREE.Box3()
  for(let i=0;i<=Math.ceil(clip.duration*15);i++){
    mixer.setTime(Math.min(clip.duration,i/15));objekt.updateMatrixWorld(true)
    const box=new THREE.Box3().setFromObject(objekt,true);boden.union(box);if(art==='miniboss')walkBox.union(box)
  }
  objekt.position.y=-boden.min.y
  mixer.setTime(0);objekt.updateMatrixWorld(true)
  const breite=art==='miniboss'?walkBox.max.x-walkBox.min.x:boden.max.x-boden.min.x
  return {objekt,breite,spiele(name){const next=clips.find(c=>c.name.split('|').at(-1)===name);if(!next)throw new Error(`${art}: Bewegung ${name} fehlt`);mixer.stopAllAction();mixer.clipAction(next).reset().play()},aktualisiere(dtS){mixer.update(Math.max(0,dtS))},gibFrei(){mixer.stopAllAction();mixer.uncacheRoot(objekt);entsorgeBossGLTF(gltf)}}
}

export function bossFreieAufstellung(anzahl:number,startZ:number,radius:number,seed=73291):ZombieEintrag[]{
  const platz=zombieAufstellung(anzahl+100,startZ,seed)
  return platz.filter(e=>Math.hypot(e.x,e.z+36)>=radius).slice(0,anzahl)
}
