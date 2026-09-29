import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import soldatUrl from './modelle/v3d-soldat.glb?url'
import bewegungUrl from './modelle/v3d-bewegung.glb?url'
import { FIGUREN } from './balance3d'

export type SoldatenBewegung = 'laufen' | 'stehen' | 'schiessen' | 'fallen'
export interface SoldatEintrag { x: number; z: number; dreh: number; bewegung: SoldatenBewegung }
export interface SoldatenBau {
  formen: Record<SoldatenBewegung, THREE.BufferGeometry[]>
  material: THREE.MeshStandardMaterial
  atlas: THREE.Texture
  dauer: Record<SoldatenBewegung, number>
  backzeitMs: number
  pruefung: Record<string, number | number[]>
}
const PAARE = [
  ['pelvis','CC_Base_Hip_01','spine_01','CC_Base_Waist_033','unten'],
  ['spine_01','CC_Base_Waist_033','spine_02','CC_Base_Spine01_034','unten'],
  ['spine_02','CC_Base_Spine01_034','spine_03','CC_Base_Spine02_035','oben'],
  ['spine_03','CC_Base_Spine02_035','neck_01','CC_Base_NeckTwist01_036','oben'],
  ['neck_01','CC_Base_NeckTwist01_036','Head','CC_Base_Head_038','oben'],
  ['clavicle_l','CC_Base_L_Clavicle_049','upperarm_l','CC_Base_L_Upperarm_050','oben'],
  ['upperarm_l','CC_Base_L_Upperarm_050','lowerarm_l','CC_Base_L_Forearm_051','oben'],
  ['lowerarm_l','CC_Base_L_Forearm_051','hand_l','CC_Base_L_Hand_055','oben'],
  ['clavicle_r','CC_Base_R_Clavicle_073','upperarm_r','CC_Base_R_Upperarm_074','oben'],
  ['upperarm_r','CC_Base_R_Upperarm_074','lowerarm_r','CC_Base_R_Forearm_077','oben'],
  ['lowerarm_r','CC_Base_R_Forearm_077','hand_r','CC_Base_R_Hand_081','oben'],
  ['thigh_l','CC_Base_L_Thigh_03','calf_l','CC_Base_L_Calf_04','unten'],
  ['calf_l','CC_Base_L_Calf_04','foot_l','CC_Base_L_Foot_05','unten'],
  ['foot_l','CC_Base_L_Foot_05','ball_l','CC_Base_L_ToeBase_07','unten'],
  ['thigh_r','CC_Base_R_Thigh_018','calf_r','CC_Base_R_Calf_021','unten'],
  ['calf_r','CC_Base_R_Calf_021','foot_r','CC_Base_R_Foot_022','unten'],
  ['foot_r','CC_Base_R_Foot_022','ball_r','CC_Base_R_ToeBase_023','unten'],
] as const
const BEWEGUNGEN: Record<SoldatenBewegung,{unten:string;oben:string;bilder:number;zyklus?:number}> = {
  laufen:{unten:'Jog_Fwd_Loop',oben:'Pistol_Aim_Neutral',bilder:12,zyklus:FIGUREN.SOLDAT_LAUF_ZYKLUS_S},
  stehen:{unten:'Pistol_Idle_Loop',oben:'Pistol_Idle_Loop',bilder:8},
  schiessen:{unten:'Pistol_Idle_Loop',oben:'Pistol_Shoot',bilder:8},
  fallen:{unten:'Death01',oben:'Death01',bilder:10},
}
const v=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),d=new THREE.Vector3()
const qa=new THREE.Quaternion(),qb=new THREE.Quaternion(),qc=new THREE.Quaternion()
function weltpunkt(o: THREE.Object3D, out: THREE.Vector3): THREE.Vector3 { return o.getWorldPosition(out) }
function minY(p: Float32Array): number {let y=Infinity;for(let i=1;i<p.length;i+=3)y=Math.min(y,p[i]);return y}
function minYTeil(p: Float32Array, start: number, ende: number): number {let y=Infinity;for(let i=start*3+1;i<ende*3;i+=3)y=Math.min(y,p[i]);return y}
export function entsorgeGLTF(gltf: GLTF): void {
  const geometrien=new Set<THREE.BufferGeometry>(),materialien=new Set<THREE.Material>(),texturen=new Set<THREE.Texture>()
  gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){geometrien.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material]){materialien.add(mat);if(mat instanceof THREE.MeshStandardMaterial&&mat.map)texturen.add(mat.map)}}})
  geometrien.forEach(g=>g.dispose());materialien.forEach(m=>m.dispose());texturen.forEach(t=>t.dispose())
}
export function backeSoldaten(soldat: GLTF, quelle: GLTF): SoldatenBau {
  const start=performance.now(),ziel=soldat.scene,vorlage=quelle.scene
  const netz=ziel.getObjectByName('Soldat_M4_vereint') as THREE.SkinnedMesh | undefined
    ?? (()=>{let gefunden:THREE.SkinnedMesh|undefined;ziel.traverse(o=>{if(o instanceof THREE.SkinnedMesh)gefunden=o});return gefunden})()
  if(!netz || !(netz instanceof THREE.SkinnedMesh))throw new Error('Soldaten-Skin fehlt')
  const atlas=(netz.material as THREE.MeshStandardMaterial).map
  if(!atlas)throw new Error('Soldaten-Atlas fehlt')
  const material=new THREE.MeshStandardMaterial({map:atlas,roughness:.85,metalness:0,side:THREE.FrontSide})
  atlas.colorSpace=THREE.SRGBColorSpace;atlas.flipY=false
  const q=(name:string)=>{const o=vorlage.getObjectByName(name);if(!o)throw new Error(`Vorlagenknochen fehlt: ${name}`);return o}
  const z=(name:string)=>{const o=ziel.getObjectByName(name);if(!o)throw new Error(`Soldatenknochen fehlt: ${name}`);return o}
  for(const p of PAARE){q(p[0]);q(p[2]);z(p[1]);z(p[3])}
  const ruhe=new Map<THREE.Object3D,{rot:THREE.Quaternion;pos:THREE.Vector3}>()
  ziel.traverse(o=>{if(o instanceof THREE.Bone)ruhe.set(o,{rot:o.quaternion.clone(),pos:o.position.clone()})})
  const hip=z('CC_Base_Hip_01'),srcHip=q('pelvis'),srcMixer=new THREE.AnimationMixer(vorlage)
  const clips=new Map(quelle.animations.map(x=>[x.name,x]))
  const idle=clips.get('Pistol_Idle_Loop')
  if(!idle)throw new Error('Ruhebewegung fehlt: Pistol_Idle_Loop')
  srcMixer.clipAction(idle).play();srcMixer.setTime(0);vorlage.updateMatrixWorld(true)
  const basisHip=weltpunkt(srcHip,new THREE.Vector3()).y
  const quelleBein=weltpunkt(srcHip,new THREE.Vector3()).distanceTo(weltpunkt(q('foot_l'),new THREE.Vector3()))
  ziel.updateMatrixWorld(true)
  const zielHipRuhe=weltpunkt(hip,new THREE.Vector3()).clone()
  const zielBein=zielHipRuhe.distanceTo(weltpunkt(z('CC_Base_L_Foot_05'),new THREE.Vector3()))
  if(quelleBein<=0||zielBein<=0)throw new Error('Beinlänge für Hüftbewegung fehlt')
  const faktorHip=zielBein/quelleBein
  srcMixer.stopAllAction()
  const formen={} as SoldatenBau['formen'],dauer={} as SoldatenBau['dauer'],pruefung={} as SoldatenBau['pruefung']
  const extras=netz.geometry.userData as {m4VertexStart?:number;m4VertexCount?:number;m4GripVertex?:number;m4MuzzleVertex?:number}
  const m4Start=extras.m4VertexStart ?? (netz.userData as typeof extras).m4VertexStart ?? -1
  const m4Count=extras.m4VertexCount ?? (netz.userData as typeof extras).m4VertexCount ?? 0
  const richtungen=(name:string,bilder:number,gesamt:number)=>{
    const clip=clips.get(name);if(!clip)throw new Error(`Bewegung fehlt: ${name}`)
    srcMixer.stopAllAction();srcMixer.clipAction(clip).play()
    const frames:{dir:THREE.Vector3;seite:THREE.Vector3}[][]=[];const huefte:number[]=[]
    for(let f=0;f<bilder;f++){
      srcMixer.setTime(gesamt*f/bilder);vorlage.updateMatrixWorld(true)
      huefte.push((weltpunkt(srcHip,a).y-basisHip)*faktorHip)
      frames.push(PAARE.map(p=>({dir:weltpunkt(q(p[2]),b).sub(weltpunkt(q(p[0]),a)).normalize().clone(),seite:weltpunkt(q('thigh_l'),c).sub(weltpunkt(q('thigh_r'),d)).normalize().clone()})))
    }
    srcMixer.stopAllAction();return {frames,huefte}
  }
  const stellen=(unten:{frames:{dir:THREE.Vector3;seite:THREE.Vector3}[][];huefte:number[]},oben:typeof unten,f:number)=>{
    for(const [bone,rest] of ruhe){bone.quaternion.copy(rest.rot);bone.position.copy(rest.pos)}
    ziel.updateMatrixWorld(true)
    PAARE.forEach((p,i)=>{
      const target=(p[4]==='unten'?unten:oben).frames[f][i],bone=z(p[1]),kind=z(p[3])
      bone.updateWorldMatrix(true,true)
      const ist=weltpunkt(kind,b).sub(weltpunkt(bone,a)).normalize()
      qa.setFromUnitVectors(ist,target.dir)
      if(i===0){bone.getWorldQuaternion(qb);qb.premultiply(qa);bone.parent!.getWorldQuaternion(qc);bone.quaternion.copy(qc.invert().multiply(qb));bone.updateWorldMatrix(true,true)
        const seite=weltpunkt(z('CC_Base_L_Thigh_03'),c).sub(weltpunkt(z('CC_Base_R_Thigh_018'),d));const ss=seite.projectOnPlane(target.dir).normalize(),sz=target.seite.clone().projectOnPlane(target.dir).normalize();qa.setFromUnitVectors(ss,sz)}
      bone.getWorldQuaternion(qb);qb.premultiply(qa);bone.parent!.getWorldQuaternion(qc);bone.quaternion.copy(qc.invert().multiply(qb));bone.updateWorldMatrix(true,true)
    })
    const gewuenscht=zielHipRuhe.clone().add(new THREE.Vector3(0,unten.huefte[f],0))
    hip.parent!.updateWorldMatrix(true,false)
    hip.position.copy(hip.parent!.worldToLocal(gewuenscht))
    ziel.updateMatrixWorld(true);netz.skeleton.update()
  }
  const src=netz.geometry,vertexCount=src.attributes.position.count,raw={} as Record<SoldatenBewegung,Float32Array[]>
  const handpunkte={} as Record<SoldatenBewegung,THREE.Vector3[]>,brustpunkte={} as Record<SoldatenBewegung,THREE.Vector3[]>
  const handDrehung={} as Record<SoldatenBewegung,THREE.Quaternion[]>
  const hueftpunkte={} as Record<SoldatenBewegung,THREE.Vector3[]>
  const kopfpunkte={} as Record<SoldatenBewegung,THREE.Vector3[]>,augenpunkte={} as Record<SoldatenBewegung,THREE.Vector3[]>
  for(const bewegung of ['stehen','laufen','schiessen','fallen'] as SoldatenBewegung[]){
    const cfg=BEWEGUNGEN[bewegung],unterClip=clips.get(cfg.unten)!;dauer[bewegung]=cfg.zyklus??unterClip.duration
    const unten=richtungen(cfg.unten,cfg.bilder,unterClip.duration),oben=cfg.oben===cfg.unten?unten:richtungen(cfg.oben,cfg.bilder,unterClip.duration)
    raw[bewegung]=[];handpunkte[bewegung]=[];brustpunkte[bewegung]=[];handDrehung[bewegung]=[];hueftpunkte[bewegung]=[];kopfpunkte[bewegung]=[];augenpunkte[bewegung]=[]
    for(let f=0;f<cfg.bilder;f++){
      stellen(unten,oben,f);const p=new Float32Array(vertexCount*3)
      for(let i=0;i<vertexCount;i++){netz.getVertexPosition(i,v);v.applyMatrix4(netz.matrixWorld);p.set([v.x,v.y,v.z],i*3)}
      raw[bewegung].push(p)
      handpunkte[bewegung].push(weltpunkt(z('CC_Base_R_Hand_081'),new THREE.Vector3()).clone())
      handDrehung[bewegung].push(z('CC_Base_R_Hand_081').getWorldQuaternion(new THREE.Quaternion()))
      brustpunkte[bewegung].push(weltpunkt(z('CC_Base_Spine02_035'),new THREE.Vector3()).clone())
      hueftpunkte[bewegung].push(weltpunkt(hip,new THREE.Vector3()).clone())
      kopfpunkte[bewegung].push(weltpunkt(z('CC_Base_Head_038'),new THREE.Vector3()).clone())
      augenpunkte[bewegung].push(weltpunkt(z('CC_Base_R_Eye_045'),new THREE.Vector3()).add(weltpunkt(z('CC_Base_L_Eye_046'),new THREE.Vector3())).multiplyScalar(.5))
    }
  }
  const stand=raw.stehen[0],refMin=minYTeil(stand,0,m4Start>=0?m4Start:vertexCount),box=new THREE.Box3();for(let i=0;i<stand.length;i+=3)box.expandByPoint(new THREE.Vector3(stand[i],stand[i+1],stand[i+2]))
  const scale=FIGUREN.SOLDAT_HOEHE/(box.max.y-box.min.y),refX=(box.min.x+box.max.x)/2,refZ=(box.min.z+box.max.z)/2
  const umrechne=(p:THREE.Vector3)=>new THREE.Vector3((refX-p.x)*scale,(p.y-refMin)*scale,(refZ-p.z)*scale)
  for(const bewegung of ['laufen','stehen','schiessen','fallen'] as SoldatenBewegung[]){
    formen[bewegung]=[]
    let vorKlemme=Infinity,nachKlemme=Infinity
    const vorFormen:number[]=[],nachFormen:number[]=[]
    raw[bewegung].forEach((p,f)=>{
      for(let i=0;i<p.length;i+=3){p[i]=(refX-p[i])*scale;p[i+1]=(p[i+1]-refMin)*scale;p[i+2]=(refZ-p[i+2])*scale}
      // Die importierte Körperfront liegt bei +z. Die M4 war bereits nach -z
      // ausgerichtet; nach der Körperdrehung bleibt ihr Griff an der Hand und
      // ihr Lauf wird um die Handwurzel wieder zur Horde gedreht.
      if(m4Start>=0){const hand=umrechne(handpunkte[bewegung][f]);for(let i=m4Start*3;i<p.length;i+=3){p[i]=2*hand.x-p[i];p[i+2]=2*hand.z-p[i+2]}}
      const tiefsterKoerper=minYTeil(p,0,m4Start>=0?m4Start:vertexCount)
      const tiefsteWaffe=m4Start>=0?minYTeil(p,m4Start,vertexCount):Infinity
      const vorher=Math.min(tiefsterKoerper,tiefsteWaffe)
      vorFormen.push(vorher);vorKlemme=Math.min(vorKlemme,vorher)
      const anheben=Math.max(0,-tiefsterKoerper,m4Start>=0?-0.03-tiefsteWaffe:0)
      if(anheben>0)for(let i=1;i<p.length;i+=3)p[i]+=anheben
      const nachher=minY(p)
      nachFormen.push(nachher);nachKlemme=Math.min(nachKlemme,nachher)
      handpunkte[bewegung][f].y+=anheben/scale
      brustpunkte[bewegung][f].y+=anheben/scale
      hueftpunkte[bewegung][f].y+=anheben/scale
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3))
      g.setAttribute('uv',src.attributes.uv);g.setIndex(src.index);g.computeVertexNormals()
      if(f>0){g.setAttribute('uv',formen[bewegung][0].attributes.uv);g.setIndex(formen[bewegung][0].index)}
      formen[bewegung].push(g)
    })
    pruefung[`${bewegung}VorKlemmeMinY`]=vorKlemme
    pruefung[`${bewegung}NachKlemmeMinY`]=nachKlemme
    pruefung[`${bewegung}VorKlemmeFormen`]=vorFormen
    pruefung[`${bewegung}NachKlemmeFormen`]=nachFormen
    pruefung[`${bewegung}MinY`]=Math.min(...formen[bewegung].map(g=>minY(g.attributes.position.array as Float32Array)))
  }
  if(m4Start>=0&&m4Count>0){
    const fallenP=formen.fallen.at(-1)!.attributes.position
    let minFigur=Infinity,minWaffe=Infinity
    for(let i=0;i<fallenP.count;i++)if(i<m4Start)minFigur=Math.min(minFigur,fallenP.getY(i));else minWaffe=Math.min(minWaffe,fallenP.getY(i))
    pruefung.debugFallMin=[minFigur,minWaffe]
    for(const bewegung of ['laufen','stehen','schiessen'] as SoldatenBewegung[]){
      const p=formen[bewegung][0].attributes.position,hand=umrechne(handpunkte[bewegung][0])
      const marker=(i:number)=>new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i))
      const gripIndex=extras.m4GripVertex ?? (netz.userData as typeof extras).m4GripVertex
      const muzzleIndex=extras.m4MuzzleVertex ?? (netz.userData as typeof extras).m4MuzzleVertex
      if(gripIndex===undefined||muzzleIndex===undefined)throw new Error('M4-Prüfpunkte fehlen')
      const griff=marker(gripIndex),muzzle=marker(muzzleIndex)
      pruefung[`${bewegung}GriffCm`]=griff.distanceTo(hand)*100
      const brust=umrechne(brustpunkte[bewegung][0]),kopf=umrechne(kopfpunkte[bewegung][0]),augen=umrechne(augenpunkte[bewegung][0])
      pruefung[`${bewegung}MuendungVorBrustM`]=brust.z-muzzle.z
      pruefung[`${bewegung}GesichtVorKopfM`]=kopf.z-augen.z
      if(bewegung==='schiessen'){
        const achse=muzzle.clone().sub(hand).normalize();pruefung.laufWinkelGrad=THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(achse.dot(new THREE.Vector3(0,0,-1)),-1,1)))
        pruefung.muendungBrustM=muzzle.distanceTo(brust)
        pruefung.debugHandQuaternion=handDrehung[bewegung][0].toArray()
        pruefung.debugHand=hand.toArray()
        pruefung.debugMuzzle=muzzle.toArray()
      }
    }
  }
  pruefung.fallenHuefteCm=umrechne(hueftpunkte.fallen.at(-1)!).y*100
  srcMixer.stopAllAction();srcMixer.uncacheRoot(vorlage)
  return {formen,material,atlas,dauer,backzeitMs:performance.now()-start,pruefung}
}
export async function ladeSoldatenDateien(abgebrochen:()=>boolean):Promise<[GLTF,GLTF]|null>{
  const geladen=await Promise.allSettled([new GLTFLoader().loadAsync(soldatUrl),new GLTFLoader().loadAsync(bewegungUrl)])
  for(const r of geladen)if(r.status==='rejected'){for(const x of geladen)if(x.status==='fulfilled')entsorgeGLTF(x.value);throw new Error('Soldaten-Dateien nicht ladbar')}
  const [soldat,quelle]=geladen.map(x=>(x as PromiseFulfilledResult<GLTF>).value)
  if(abgebrochen()){entsorgeGLTF(soldat);entsorgeGLTF(quelle);return null}
  return [soldat,quelle]
}
export function fertigeSoldaten(dateien:[GLTF,GLTF],abgebrochen:()=>boolean):SoldatenBau|null{
  const [soldat,quelle]=dateien
  if(abgebrochen()){entsorgeGLTF(soldat);entsorgeGLTF(quelle);return null}
  let bau:SoldatenBau|undefined
  try{bau=backeSoldaten(soldat,quelle)}finally{entsorgeGLTF(quelle);if(bau){const atlas=bau.atlas; soldat.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose()}});void atlas}else entsorgeGLTF(soldat)}
  if(abgebrochen()){for(const row of Object.values(bau.formen))row.forEach(g=>g.dispose());bau.material.dispose();bau.atlas.dispose();return null}
  return bau
}
export class SoldatenMasse {
  readonly gruppe=new THREE.Group()
  private bau:SoldatenBau
  private netze:Record<SoldatenBewegung,THREE.InstancedMesh[]>={} as Record<SoldatenBewegung,THREE.InstancedMesh[]>
  private starts=new Map<number,number>()
  private zeit=0
  constructor(bau:SoldatenBau,max=FIGUREN.SOLDATEN_SICHTBAR_MAX){
    this.bau=bau
    this.gruppe.name='soldaten-masse'
    for(const bewegung of Object.keys(bau.formen) as SoldatenBewegung[]){this.netze[bewegung]=Array.from({length:FIGUREN.SOLDAT_PHASENGRUPPEN},()=>{
      const mesh=new THREE.InstancedMesh(bau.formen[bewegung][0],bau.material,max);mesh.layers.set(1);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;this.gruppe.add(mesh);return mesh})}
  }
  setze(liste:SoldatEintrag[]):void{
    const zaehler=new Map<THREE.InstancedMesh,number>(),dummy=new THREE.Object3D(),fallen=new Set<number>()
    liste.forEach((s,i)=>{const phase=i%FIGUREN.SOLDAT_PHASENGRUPPEN,netz=this.netze[s.bewegung][phase],n=zaehler.get(netz)??0;if(n>=netz.instanceMatrix.count)throw new Error('Soldaten-Kapazität überschritten')
      if(s.bewegung==='fallen'){fallen.add(i);if(!this.starts.has(i))this.starts.set(i,this.zeit)}
      dummy.position.set(s.x,0,s.z);dummy.rotation.set(0,s.dreh,0);dummy.updateMatrix();netz.setMatrixAt(n,dummy.matrix);zaehler.set(netz,n+1)})
    for(const i of this.starts.keys())if(!fallen.has(i))this.starts.delete(i)
    for(const row of Object.values(this.netze))for(const mesh of row){mesh.count=zaehler.get(mesh)??0;mesh.instanceMatrix.needsUpdate=true}
  }
  aktualisiere(zeit:number):void{
    this.zeit=zeit
    for(const [bewegung,row] of Object.entries(this.netze) as [SoldatenBewegung,THREE.InstancedMesh[]][])
      row.forEach((netz,g)=>{const bilder=this.bau.formen[bewegung],dauer=this.bau.dauer[bewegung],start=bewegung==='fallen'?Math.min(...this.starts.values(),zeit):0,t=bewegung==='fallen'?Math.max(0,zeit-start):zeit,
        bild=bewegung==='fallen'?Math.min(bilder.length-1,Math.floor(t/dauer*bilder.length)):(Math.floor(t/dauer*bilder.length)+Math.round(g*bilder.length/row.length))%bilder.length;netz.geometry=bilder[bild]})
  }
  gibNetzeFrei():void{for(const row of Object.values(this.netze))for(const n of row){this.gruppe.remove(n);n.dispose()}}
  gibFrei():void{this.gibNetzeFrei();for(const row of Object.values(this.bau.formen))row.forEach(g=>g.dispose());this.bau.material.dispose();this.bau.atlas.dispose()}
}
export function truppenAufstellung():SoldatEintrag[]{
  const reihen:Array<SoldatEintrag>=[]
  for(let r=0;r<3;r++)for(let s=0;s<10;s++)reihen.push({x:(s-4.5)*.6,z:.5+r*.9,dreh:0,bewegung:'stehen'})
  return reihen
}
export function laufenderTrupp():SoldatEintrag[]{
  const trupp:Array<SoldatEintrag>=[]
  for(let r=0;r<2;r++)for(let s=0;s<5;s++)trupp.push({x:(s-2)*.6,z:-15+r*.9,dreh:0,bewegung:'laufen'})
  return trupp
}
