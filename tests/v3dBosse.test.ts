import {readFileSync,statSync} from 'node:fs'
import {describe,expect,it,vi} from 'vitest'
import sharp from 'sharp'
import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {baueBoss,bossFreieAufstellung} from '../src/v3d/bosse'
import {BUEHNE,FIGUREN} from '../src/v3d/balance3d'

const arten=['miniboss','eliteboss'] as const
function glb(path:string){const b=readFileSync(path),len=b.readUInt32LE(12);return {json:JSON.parse(b.subarray(20,20+len).toString('utf8')),bin:b.subarray(28+len)}}
function dreiecke(j:any){return j.meshes.flatMap((m:any)=>m.primitives).reduce((n:number,p:any)=>n+j.accessors[p.indices].count/3,0)}
async function parse(art:string){const b=readFileSync(`src/v3d/modelle/v3d-${art}.glb`);return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')}
describe('3D-Bosse',()=>{
  it('bewahrt Geometrie, Material, Clips, Bilder und Dateigrenze',async()=>{
    for(const art of arten){const quelle=glb(`modelle-quelle/${art}-vereinfacht.glb`),ausgabe=glb(`src/v3d/modelle/v3d-${art}.glb`),j=ausgabe.json
      expect(Math.abs(dreiecke(j)/dreiecke(quelle.json)-1)).toBeLessThanOrEqual(.01)
      expect(statSync(`src/v3d/modelle/v3d-${art}.glb`).size).toBeLessThanOrEqual(2*1048576)
      const clips=art==='miniboss'?['walk','Run','attack_1','attack_2','roar','hit_1','death_1'].map(n=>`Creature_armature|${n}`):['Motion']
      expect(j.animations.map((a:any)=>a.name).sort()).toEqual(clips.sort())
      for(const m of j.materials){expect(m.pbrMetallicRoughness.baseColorTexture).toBeTruthy();expect(m.normalTexture).toBeTruthy();expect(m.pbrMetallicRoughness.metallicFactor).toBe(0);expect(m.pbrMetallicRoughness.roughnessFactor).toBeCloseTo(.8);expect(m.emissiveTexture).toBeUndefined();expect(m.occlusionTexture).toBeUndefined();expect(m.pbrMetallicRoughness.metallicRoughnessTexture).toBeUndefined()}
      for(const img of j.images){const v=j.bufferViews[img.bufferView],meta=await sharp(ausgabe.bin.subarray(v.byteOffset,v.byteOffset+v.byteLength)).metadata();expect([meta.width,meta.height,meta.format]).toEqual([512,512,'webp'])}
      expect(j.meshes.flatMap((m:any)=>m.primitives).every((p:any)=>p.attributes.TANGENT===undefined)).toBe(true)
    }
  })
  it('richtet Kopf und Füße in Bild 0 und Clip-Mitte aus und bleibt im Streifen',async()=>{
    vi.stubGlobal('self',globalThis);vi.stubGlobal('createImageBitmap',async()=>({width:512,height:512}))
    try{for(const art of arten){const g=await parse(art),boss=baueBoss(art,g),scene=boss.objekt
      expect(scene.getObjectByProperty('type','SkinnedMesh')).toBeTruthy()
      const clip=g.animations.find(c=>c.name.endsWith(art==='miniboss'?'walk':'Motion'))!
      const kopf=scene.getObjectByName(art==='miniboss'?'Head_015':'Bip001_Head_08')!,becken=scene.getObjectByName(art==='miniboss'?'Hips_ctrl_08':'Bip001_Pelvis_04')!
      for(const t of [0,clip.duration/2]){boss.aktualisiere(t);scene.updateMatrixWorld(true)
        expect(kopf.getWorldPosition(new THREE.Vector3()).z).toBeGreaterThan(becken.getWorldPosition(new THREE.Vector3()).z)
        const box=new THREE.Box3().setFromObject(scene,true);expect(box.min.y).toBeGreaterThanOrEqual(-.05)
      }
      expect(boss.breite/2).toBeLessThan(BUEHNE.MITTE_HALB)
      if(art==='miniboss'){expect(FIGUREN.MINIBOSS_FREIRADIUS).toBeCloseTo(boss.breite/2+.4,2);expect(bossFreieAufstellung(600,-15,FIGUREN.MINIBOSS_FREIRADIUS,49183)).toHaveLength(600);expect(bossFreieAufstellung(600,-15,FIGUREN.MINIBOSS_FREIRADIUS,49183).every(z=>Math.hypot(z.x,z.z+36)>=FIGUREN.MINIBOSS_FREIRADIUS)).toBe(true)}
      boss.gibFrei()
    }}finally{vi.unstubAllGlobals()}
    expect(FIGUREN.MINIBOSS_HOEHE).toBe(3.2);expect(FIGUREN.ELITEBOSS_HOEHE).toBe(4.8)
  },60000)
  it('nennt Urheber und Änderungen',()=>{const text=readFileSync('docs/lizenzen.md','utf8');for(const s of ['Rodolfoisreal1423','Vasian-Digital3D','Mini-Boss und Elite-Boss','Emissive- und Occlusion-Bilder'])expect(text).toContain(s)})
})
