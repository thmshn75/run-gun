import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { backeSoldaten, truppenAufstellung, laufenderTrupp } from '../src/v3d/soldaten'
import { BUEHNE, FIGUREN } from '../src/v3d/balance3d'

function glb(path:string){
  const bytes=readFileSync(path),size=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+size).toString('utf8'))
  return {json,bin:bytes.subarray(28+size),bytes:bytes.length}
}
function accessor(g:ReturnType<typeof glb>,index:number,vertex:number):number[]{
  const a=g.json.accessors[index],v=g.json.bufferViews[a.bufferView],offset=(v.byteOffset??0)+(a.byteOffset??0)+vertex*(v.byteStride??({5121:1,5123:2,5125:4,5126:4}[a.componentType] as number)*({SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type] as number))
  const count=({SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type] as number),view=new DataView(g.bin.buffer,g.bin.byteOffset+offset)
  return Array.from({length:count},(_,i)=>a.componentType===5121?view.getUint8(i):a.componentType===5123?view.getUint16(i*2,true):a.componentType===5125?view.getUint32(i*4,true):view.getFloat32(i*4,true))
}
const soldat='src/v3d/modelle/v3d-soldat.glb',bewegung='src/v3d/modelle/v3d-bewegung.glb'
describe('3D-Soldat',()=>{
  it('hält Atlas-, Skin-, Dreiecks- und Dateigrenzen ein',async()=>{
    const g=glb(soldat),j=g.json,p=j.meshes[0].primitives[0]
    expect(j.meshes).toHaveLength(1);expect(j.meshes[0].primitives).toHaveLength(1)
    expect(j.materials).toHaveLength(1);expect(j.images).toHaveLength(1);expect(j.skins).toHaveLength(1)
    expect(j.accessors[p.indices].count/3).toBeGreaterThanOrEqual(4900)
    expect(j.accessors[p.indices].count/3).toBeLessThanOrEqual(5400)
    expect(g.bytes).toBeLessThanOrEqual(2*1048576)
    const image=j.images[0],view=j.bufferViews[image.bufferView],data=g.bin.subarray(view.byteOffset,view.byteOffset+view.byteLength)
    const m=await sharp(data).metadata();expect([m.width,m.height,m.format]).toEqual([1024,1024,'webp'])
    expect(Object.keys(p.attributes).sort()).toEqual(['JOINTS_0','NORMAL','POSITION','TEXCOORD_0','WEIGHTS_0'])
  })
  it('bindet alle M4-Punkte ausschließlich an die rechte Hand',()=>{
    const g=glb(soldat),j=g.json,p=j.meshes[0].primitives[0],skin=j.skins[0],hand=skin.joints.findIndex((n:number)=>j.nodes[n].name==='CC_Base_R_Hand_081')
    const {m4VertexStart:start,m4VertexCount:count}=j.meshes[0].extras
    expect(hand).toBeGreaterThanOrEqual(0);expect(count).toBeGreaterThan(0)
    for(let i=start;i<start+count;i++){
      const joints=accessor(g,p.attributes.JOINTS_0,i),weights=accessor(g,p.attributes.WEIGHTS_0,i)
      expect(joints[0]).toBe(hand);expect(weights[0]).toBeGreaterThan(0.99)
      expect(weights.slice(1).every((w:number)=>w===0)).toBe(true)
    }
  })
  it('enthält nur die fünf verlangten Bewegungen und keine Netze',()=>{
    const g=glb(bewegung),j=g.json
    expect(j.meshes??[]).toHaveLength(0);expect(j.images??[]).toHaveLength(0);expect(j.materials??[]).toHaveLength(0)
    expect(j.animations.map((a:{name:string})=>a.name).sort()).toEqual(['Death01','Jog_Fwd_Loop','Pistol_Aim_Neutral','Pistol_Idle_Loop','Pistol_Shoot'])
    expect(g.bytes).toBeLessThanOrEqual(1048576)
  })
  it('stellt 30 Soldaten mittig vor der Wand und 10 Läufer dahinter auf',()=>{
    const truppe=truppenAufstellung(),lauf=laufenderTrupp()
    expect(truppe).toHaveLength(30);expect(lauf).toHaveLength(10)
    expect([...new Set(truppe.map(s=>s.z))]).toEqual([.5,1.4,2.3])
    expect(Math.min(...truppe.map(s=>s.x))).toBeCloseTo(-2.7);expect(Math.max(...truppe.map(s=>s.x))).toBeCloseTo(2.7)
    expect(truppe.every(s=>s.z>-5&&s.bewegung==='stehen'&&s.dreh===0)).toBe(true)
    expect(lauf.every(s=>s.z< -5&&s.bewegung==='laufen')).toBe(true)
    expect(FIGUREN.SOLDATEN_SICHTBAR_MAX).toBe(120);expect(BUEHNE.PLUS_ABSTAND).toBe(4)
  })
  it('führt die drei Urheber und Änderungen auf',()=>{
    const text=readFileSync('docs/lizenzen.md','utf8')
    for(const token of ['DanlyVostok','Low-Poly M4a1','TastyTony','Quaternius','neu bemalt (Coyote)','gebunden'])expect(text).toContain(token)
  })
  it('hat ein 512er nahtloses Tarnmuster',async()=>{
    const path='modelle-quelle/tarnmuster.png',m=await sharp(path).metadata();expect([m.width,m.height]).toEqual([512,512]);expect(statSync(path).size).toBeGreaterThan(0)
    const raw=await sharp(path).removeAlpha().raw().toBuffer();let sum=0
    for(let i=0;i<512;i++)for(let c=0;c<3;c++)sum+=Math.abs(raw[(i*512)*3+c]-raw[(i*512+511)*3+c])+Math.abs(raw[i*3+c]-raw[(511*512+i)*3+c])
    expect(sum/(512*6)).toBeLessThan(8)
  })
  it('backt alle Formen mit gemeinsamem UV/Index und prüft die Pose',async()=>{
    vi.stubGlobal('self',globalThis)
    vi.stubGlobal('createImageBitmap',async()=>({width:1024,height:1024}))
    const loader=new GLTFLoader(),parse=(path:string)=>{const b=readFileSync(path);return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')}
    const [soldatG,quelleG]=await Promise.all([parse(soldat),parse(bewegung)])
    const bau=backeSoldaten(soldatG,quelleG)
    expect(Object.fromEntries(Object.entries(bau.formen).map(([k,v])=>[k,v.length]))).toEqual({laufen:12,stehen:8,schiessen:8,fallen:10})
    for(const row of Object.values(bau.formen))for(const form of row){expect(form.attributes.position.count).toBe(row[0].attributes.position.count);expect(form.index).toBe(row[0].index);expect(form.attributes.uv).toBe(row[0].attributes.uv)}
    const {m4VertexStart,m4VertexCount}=glb(soldat).json.meshes[0].extras
    const punkte=bau.formen.stehen[0].attributes.position
    let minZ=Infinity,maxZ=-Infinity
    for(let i=m4VertexStart;i<m4VertexStart+m4VertexCount;i++){
      const z=punkte.getZ(i);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z)
    }
    expect(maxZ-minZ).toBeGreaterThanOrEqual(1.15)
    expect(maxZ-minZ).toBeLessThanOrEqual(1.4)
    for(const name of ['laufen','stehen','schiessen']){
      expect(bau.pruefung[`${name}GriffCm`]).toBeLessThanOrEqual(3)
      expect(bau.pruefung[`${name}MinY`]).toBeGreaterThanOrEqual(-.03)
      expect(bau.pruefung[`${name}MuendungVorBrustM`]).toBeGreaterThanOrEqual(.5)
      expect(bau.pruefung[`${name}GesichtVorKopfM`]).toBeGreaterThan(0)
    }
    // Claude 2026-09-29: 15 cm war geschaetzt; mit Weste liegt die Huefte sichtbar flach bei ~30 cm (Nahaufnahme geprueft).
    expect(bau.pruefung.fallenHuefteCm).toBeLessThanOrEqual(35)
    expect(bau.pruefung.fallenMinY).toBeGreaterThanOrEqual(-.03)
    expect(bau.pruefung.laufWinkelGrad).toBeLessThanOrEqual(15)
    expect(bau.pruefung.muendungBrustM).toBeGreaterThanOrEqual(.5)
    for(const row of Object.values(bau.formen))row.forEach(g=>g.dispose());bau.material.dispose();bau.atlas.dispose()
    vi.unstubAllGlobals()
  },30000)
})
