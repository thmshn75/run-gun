import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { NodeIO } from '@gltf-transform/core'
import { EXTTextureWebP } from '@gltf-transform/extensions'
import sharp from 'sharp'
import * as THREE from 'three'
import { FAHRZEUGE, LEVELS, type FahrzeugName } from '../src/v3d/balance3d'
import { baueMiniatur, type FahrzeugBau } from '../src/v3d/fahrzeuge'

const namen = ['humvee','panzer','haubitze','hubschrauber'] as const
const io = new NodeIO().registerExtensions([EXTTextureWebP])

describe('3D-Fahrzeuge', () => {
  it('hält die vier GLB-Grenzen, Material- und Rotorvorgaben ein', async () => {
    for (const name of namen) {
      const pfad = `src/v3d/modelle/v3d-${name}.glb`
      const root = (await io.read(pfad)).getRoot()
      const dreiecke = root.listMeshes().flatMap(m => m.listPrimitives()).reduce((n,p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0)
      expect(dreiecke).toBe(FAHRZEUGE[name].DREIECKE)
      expect(dreiecke).toBeLessThanOrEqual(4000)
      expect(statSync(pfad).size).toBeLessThanOrEqual(1048576)
      expect(root.listMaterials()).toHaveLength(1)
      expect(root.listTextures()).toHaveLength(1)
      expect(root.listAnimations()).toHaveLength(0)
      const mat = root.listMaterials()[0], bilder = root.listTextures()
      expect(mat.getBaseColorTexture()).toBe(bilder[0])
      expect(mat.getMetallicFactor()).toBe(0)
      expect(mat.getRoughnessFactor()).toBe(.8)
      expect([mat.getMetallicRoughnessTexture(),mat.getNormalTexture(),mat.getEmissiveTexture(),mat.getOcclusionTexture()]).toEqual([null,null,null,null])
      expect(mat.listExtensions()).toHaveLength(0)
      const meta = await sharp(bilder[0].getImage()).metadata()
      expect([meta.width,meta.height,meta.format]).toEqual(name==='haubitze'?[64,64,'webp']:[512,512,'webp'])
      expect(root.listMeshes()).toHaveLength(name==='hubschrauber'?3:1)
      if(name==='hubschrauber') expect(root.listNodes().map(n=>n.getName())).toEqual(expect.arrayContaining(['rotor','heckrotor']))
      const box = new THREE.Box3()
      for(const node of root.listNodes().filter(n=>n.getMesh())) for(const p of node.getMesh()!.listPrimitives()) {
        const a=p.getAttribute('POSITION')!,m=new THREE.Matrix4().fromArray(node.getWorldMatrix())
        for(let i=0;i<a.getCount();i++)box.expandByPoint(new THREE.Vector3(...a.getElement(i,[0,0,0])).applyMatrix4(m))
      }
      expect(box.min.y).toBeCloseTo(0,4)
      expect((box.max.z-box.min.z)).toBeCloseTo(FAHRZEUGE[name].LAENGE,3)
      expect(box.min.x+box.max.x).toBeCloseTo(0,3)
      expect(box.min.z+box.max.z).toBeCloseTo(0,3)
    }
  })

  it('teilt Ressourcen und hält jede Miniatur innerhalb von 1,5 m je Achse', () => {
    for (const name of namen) {
      const geometrie=new THREE.BoxGeometry(2,1,4),material=new THREE.MeshStandardMaterial(),vorlage=new THREE.Group()
      vorlage.add(new THREE.Mesh(geometrie,material))
      const bau: FahrzeugBau={geometrien:[geometrie],material,laenge:FAHRZEUGE[name].LAENGE,vorlage,gibFrei(){}}
      const mini=baueMiniatur(bau,name,[1.5,1.5,1.5]),mesh=mini.children[0] as THREE.Mesh
      expect(mesh.geometry).toBe(geometrie);expect(mesh.material).toBe(material)
      const box=new THREE.Box3().setFromObject(mini,true),size=box.getSize(new THREE.Vector3())
      expect(box.min.y).toBeCloseTo(0)
      expect(size.x).toBeLessThanOrEqual(1.5+1e-6)
      expect(size.y).toBeLessThanOrEqual(1.5+1e-6)
      expect(size.z).toBeLessThanOrEqual(1.5+1e-6)
    }
  })

  it('ordnet Säulen und Credits den gewählten Modellen zu', () => {
    expect(LEVELS[0].saeulen).toEqual(namen)
    const lizenzen=readFileSync('docs/lizenzen.md','utf8')
    for(const text of ['Low Poly Humvee vehicle',"Duane's Mind",'AMX-56 Low Poly','Waroxed','M144 155mm Howitzer low poly','Cyan_dev10','Low Poly Apache Gunship'])expect(lizenzen).toContain(text)
    expect((namen as readonly FahrzeugName[]).every(name=>lizenzen.includes(`v3d-${name}`)||lizenzen.includes(name==='panzer'?'AMX-56':name==='haubitze'?'M144':name==='hubschrauber'?'Apache':'Humvee'))).toBe(true)
  })
})
