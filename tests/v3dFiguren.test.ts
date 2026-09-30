import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { NodeIO } from '@gltf-transform/core'
import { EXTTextureWebP } from '@gltf-transform/extensions'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { backe, bildFuer, zombieAufstellung, FallendeZombies, type ZombieBau } from '../src/v3d/figuren'
import * as THREE from 'three'
import { BUEHNE, FIGUREN } from '../src/v3d/balance3d'

const pfad = 'src/v3d/modelle/v3d-zombie.glb'
const daten = readFileSync(pfad)
function glbJson() {
  expect(daten.toString('ascii',0,4)).toBe('glTF')
  expect(daten.readUInt32LE(4)).toBe(2)
  const laenge=daten.readUInt32LE(12)
  expect(daten.toString('ascii',16,20)).toBe('JSON')
  return JSON.parse(daten.subarray(20,20+laenge).toString())
}

describe('Zombie-Figur', () => {
  it('kippt mit dem Kopf nach vorne und leert den Fall-Pool nach 1,1 s',()=>{
    const bau:ZombieBau={formen:[new THREE.BoxGeometry(.3,FIGUREN.ZOMBIE_HOEHE,.3)],materialien:[new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial()],bemalungen:[],dauer:1,dreiecke:12}
    const fall=new FallendeZombies(bau,2)
    expect(fall.starte(0,-2,0,1,0,0)).toBe(true)
    fall.aktualisiere(.35)
    const matrix=new THREE.Matrix4()
    ;(fall.gruppe.children[0] as THREE.InstancedMesh).getMatrixAt(0,matrix)
    const kopf=new THREE.Vector3(0,FIGUREN.ZOMBIE_HOEHE,0).applyMatrix4(matrix)
    expect(kopf.z).toBeLessThan(-2)
    expect(kopf.y).toBeLessThan(.2)
    fall.aktualisiere(1.1)
    expect(fall.aktiv).toBe(0)
    fall.gibNetzeFrei()
  })
  it('erhält die Teilnetze und Dreiecke der geprüften Referenz', () => {
    const vorlage=readFileSync('modelle-quelle/zombie-vereinfacht.glb')
    const quellJson=JSON.parse(vorlage.subarray(20,20+vorlage.readUInt32LE(12)).toString())
    const teile=(g: typeof quellJson)=>g.meshes.map((m: {name:string,primitives:{indices:number}[]})=>({
      name:m.name,
      dreiecke:m.primitives.reduce((n:number,p:{indices:number})=>n+g.accessors[p.indices].count/3,0),
    }))
    expect(teile(glbJson())).toEqual(teile(quellJson))
  })
  it('hat ein kleines Modell mit nur einer 512er-Bemalung', () => {
    const g=glbJson()
    const dreiecke=g.meshes.flatMap((m: {primitives: {indices: number}[]})=>m.primitives).reduce((n: number,p: {indices:number})=>n+g.accessors[p.indices].count/3,0)
    expect(dreiecke).toBeGreaterThanOrEqual(900);expect(dreiecke).toBeLessThanOrEqual(1100)
    expect(g.images).toHaveLength(1);expect(g.animations.length).toBeGreaterThanOrEqual(1)
    expect(statSync(pfad).size).toBeLessThanOrEqual(1048576)
    for(const m of g.materials){const p=m.pbrMetallicRoughness;expect(p.baseColorFactor??[1,1,1,1]).toEqual([1,1,1,1]);expect(p.metallicFactor).toBe(0);expect(p.roughnessFactor).toBe(.85);expect(p.baseColorTexture).toBeTruthy();for(const slot of ['normalTexture','occlusionTexture','emissiveTexture'])expect(m[slot]).toBeUndefined();expect(p.metallicRoughnessTexture).toBeUndefined()}
    const io=new NodeIO().registerExtensions([EXTTextureWebP])
    return io.read(pfad).then(async doc=>{
      const sharp=(await import('sharp')).default
      const meta=await sharp(doc.getRoot().listTextures()[0].getImage()).metadata()
      expect([meta.width,meta.height]).toEqual([512,512])
      let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity
      for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
        const uv=p.getAttribute('TEXCOORD_0')!
        for(let i=0;i<uv.getCount();i++){const [u,v]=uv.getElement(i,[0,0]);minU=Math.min(minU,u);maxU=Math.max(maxU,u);minV=Math.min(minV,v);maxV=Math.max(maxV,v)}
      }
      expect(maxU-minU).toBeGreaterThanOrEqual(.9);expect(maxV-minV).toBeGreaterThanOrEqual(.9)
    })
  })
  it('backt bodenfeste, ruhige und geschlossene Formen mit gemeinsamen UVs und Indizes', async () => {
    const io=new NodeIO().registerExtensions([EXTTextureWebP]),d=await io.read(pfad)
    for(const m of d.getRoot().listMaterials())m.setBaseColorTexture(null)
    for(const t of d.getRoot().listTextures())t.dispose()
    for(const e of d.getRoot().listExtensionsUsed())e.dispose()
    const b=await io.writeBinary(d)
    const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer,'')
    const formen=backe(gltf)
    expect(formen).toHaveLength(12)
    const schwerpunkt: [number,number][]=[]
    for(const f of formen){
      const p=f.attributes.position;let minY=Infinity,maxY=-Infinity,x=0,z=0
      for(let i=0;i<p.count;i++){minY=Math.min(minY,p.getY(i));maxY=Math.max(maxY,p.getY(i));x+=p.getX(i);z+=p.getZ(i)}
      expect(minY).toBeCloseTo(0,1);expect(maxY).toBeLessThanOrEqual(FIGUREN.ZOMBIE_HOEHE+.001)
      expect(f.attributes.uv).toBe(formen[0].attributes.uv);expect(f.index).toBe(formen[0].index)
      schwerpunkt.push([x/p.count,z/p.count])
    }
    const abstand=(a:[number,number],b:[number,number])=>Math.hypot(a[0]-b[0],a[1]-b[1])
    const spruenge=schwerpunkt.slice(1).map((p,i)=>abstand(p,schwerpunkt[i]))
    expect(Math.max(...spruenge)).toBeLessThan(.05)
    expect(abstand(schwerpunkt[11],schwerpunkt[0])).toBeLessThanOrEqual(Math.max(...spruenge)+1e-5)
    formen.forEach(f=>f.dispose())
  })
  it('verteilt Gruppen und 400 Figuren deterministisch im mittleren Streifen',()=>{
    expect(bildFuer(0,0)).toBe(0);expect(bildFuer(1,0)).toBe(2);expect(bildFuer(7,0)).toBe(11)
    expect(bildFuer(0,1.1)).toBe(0);expect(bildFuer(1,.55)).toBe(8)
    expect(FIGUREN.ZOMBIE_HOEHE).toBe(1.95)
    expect(FIGUREN.ZOMBIES_SICHTBAR_MAX).toBe(600)
    expect(FIGUREN.ZOMBIES_BUEHNE).toBe(400)
    expect(FIGUREN.ZOMBIE_X_MIN).toBeCloseTo(-(BUEHNE.MITTE_HALB - .35))
    expect(FIGUREN.ZOMBIE_X_MAX).toBeCloseTo(BUEHNE.MITTE_HALB - .35)
    const spalten = Math.floor((FIGUREN.ZOMBIE_X_MAX - FIGUREN.ZOMBIE_X_MIN) / FIGUREN.ZOMBIE_SPALTENABSTAND) + 1
    expect(spalten).toBe(10)
    const a=zombieAufstellung(FIGUREN.ZOMBIES_BUEHNE,-35)
    expect(a).toEqual(zombieAufstellung(400,-35));expect(a).toHaveLength(400)
    for(const [i,v] of a.entries()){
      expect(v.x).toBeGreaterThanOrEqual(FIGUREN.ZOMBIE_X_MIN);expect(v.x).toBeLessThanOrEqual(FIGUREN.ZOMBIE_X_MAX)
      const reihe=Math.floor(i/spalten)
      expect(v.z).toBeGreaterThanOrEqual(-35-reihe*FIGUREN.ZOMBIE_REIHENABSTAND-FIGUREN.ZOMBIE_ZUFALLSVERSATZ)
      expect(v.z).toBeLessThanOrEqual(-35-reihe*FIGUREN.ZOMBIE_REIHENABSTAND+FIGUREN.ZOMBIE_ZUFALLSVERSATZ)
      expect(v.groesse).toBeGreaterThanOrEqual(.92);expect(v.groesse).toBeLessThanOrEqual(1.08)
      expect(v.variante).toBeGreaterThanOrEqual(0);expect(v.variante).toBeLessThan(3)
    }
    const vollast=zombieAufstellung(FIGUREN.ZOMBIES_SICHTBAR_MAX,-15,49183)
    expect(vollast).toHaveLength(600)
    expect(vollast).toEqual(zombieAufstellung(600,-15,49183))
    for(const v of vollast){
      expect(v.x).toBeGreaterThanOrEqual(FIGUREN.ZOMBIE_X_MIN)
      expect(v.x).toBeLessThanOrEqual(FIGUREN.ZOMBIE_X_MAX)
    }
    const lizenz=readFileSync('docs/lizenzen.md','utf8');expect(lizenz).toContain('Zombie Walk Test');expect(lizenz).toContain('OSCAR CREATIVO')
  })
})
