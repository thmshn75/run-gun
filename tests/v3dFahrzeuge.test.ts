import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { NodeIO } from '@gltf-transform/core'
import { EXTTextureWebP } from '@gltf-transform/extensions'
import sharp from 'sharp'
import * as THREE from 'three'
import { FAHRZEUGE, LEVELS, type FahrzeugName } from '../src/v3d/balance3d'
import { baueMiniatur, baueFeldFahrzeug, type FahrzeugBau } from '../src/v3d/fahrzeuge'
import { Einsatzbilder } from '../src/v3d/lauf'
import { neuerLauf, starteEinheit } from '../src/v3d/rechnung'
import type { Welt } from '../src/v3d/szene'
import { Explosionen } from '../src/v3d/anzeigen'
import { pruefEinsatz } from '../src/v3d/einstieg'

const namen = ['humvee','panzer','haubitze','hubschrauber'] as const
const io = new NodeIO().registerExtensions([EXTTextureWebP])

describe('3D-Fahrzeuge', () => {
  it('gibt den Prüf-Einsatz nur mit pruefung=1 frei', () => {
    expect(pruefEinsatz('?einsatz=panzer')).toBeNull()
    expect(pruefEinsatz('?pruefung=soldat&einsatz=panzer')).toBeNull()
    expect(pruefEinsatz('?pruefung=1&einsatz=falsch')).toBeNull()
    expect(pruefEinsatz('?pruefung=1&einsatz=haubitze')).toBe('haubitze')
  })
  it('fährt über Zustand zum Halt, entfernt sich nach Sieg und lässt geteilte Ressourcen stehen', () => {
    const ctx={createRadialGradient:()=>({addColorStop:vi.fn()}),fillRect:vi.fn(),fillStyle:''}
    vi.stubGlobal('document',{createElement:()=>({width:64,height:64,getContext:()=>ctx})})
    try {
      const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),laufGruppen:THREE.Object3D[]=[]
      const geometrie=new THREE.BoxGeometry(2,2,9.8),material=new THREE.MeshStandardMaterial(),vorlage=new THREE.Group()
      vorlage.add(new THREE.Mesh(geometrie,material))
      const bau: FahrzeugBau={geometrien:[geometrie],material,laenge:9.8,vorlage,gibFrei(){}}
      const welt={scene,camera,laufGruppen,fahrzeuge:{panzer:bau,haubitze:bau}} as unknown as Welt
      const frei=vi.spyOn(geometrie,'dispose')
      const feld=baueFeldFahrzeug(bau,'panzer')
      expect(new THREE.Box3().setFromObject(feld,true).getSize(new THREE.Vector3()).z).toBeCloseTo(9.8*.8,3)
      const bilder=new Einsatzbilder(welt),z=neuerLauf(LEVELS[0],1),a=starteEinheit(z,'panzer')
      bilder.abgleichen(z,[],0)
      expect(bilder.anzahl).toBe(1)
      const gruppe=scene.getObjectByName('einsatz-panzer') as THREE.Group
      expect(gruppe.position.z).toBe(10)
      expect(gruppe.position.x).toBe(0)
      a.verstrichen=1.2;bilder.abgleichen(z,[],0)
      expect(gruppe.position.z).toBeCloseTo(-5-9.8*.8/2-1,2)
      z.y=10;a.verstrichen=4.2;bilder.abgleichen(z,[],0)
      expect(gruppe.position.z).toBeCloseTo(-5-9.8*.8/2-1,2)
      const b=starteEinheit(z,'panzer')
      z.y=30;b.verstrichen=4.2;bilder.abgleichen(z,[],0)
      const zweiter=scene.children.filter(o=>o.name==='einsatz-panzer').at(-1) as THREE.Group
      expect(zweiter.position.z).toBeCloseTo(-17.5,2)
      z.ergebnis='sieg';bilder.abgleichen(z,[],.8)
      expect(scene.getObjectByName('einsatz-panzer')).toBeUndefined()
      bilder.gibFrei()
      expect(welt.laufGruppen).toHaveLength(0)
      expect(frei).not.toHaveBeenCalled()
    } finally { vi.unstubAllGlobals() }
  })
  it('setzt beide Fahrzeuge mittig, zielt links und rechts und fährt die Haubitze rückwärts ab', () => {
    const ctx={createRadialGradient:()=>({addColorStop:vi.fn()}),fillRect:vi.fn(),fillStyle:''}
    vi.stubGlobal('document',{createElement:()=>({width:64,height:64,getContext:()=>ctx})})
    try {
      const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),laufGruppen:THREE.Object3D[]=[]
      const geometrie=new THREE.BoxGeometry(2,2,7.3),material=new THREE.MeshStandardMaterial(),vorlage=new THREE.Group()
      vorlage.add(new THREE.Mesh(geometrie,material))
      const bau: FahrzeugBau={geometrien:[geometrie],material,laenge:7.3,vorlage,gibFrei(){}}
      const welt={scene,camera,laufGruppen,fahrzeuge:{panzer:bau,haubitze:bau}} as unknown as Welt
      const bilder=new Einsatzbilder(welt),z=neuerLauf(LEVELS[0],1),a=starteEinheit(z,'haubitze')
      const explosion=vi.spyOn(bilder.explosionen,'starte')
      bilder.abgleichen(z,[],0)
      const gruppe=scene.getObjectByName('einsatz-haubitze') as THREE.Group
      expect(gruppe.position.x).toBe(0)
      expect(new THREE.Box3().setFromObject(gruppe,true).getSize(new THREE.Vector3()).z).toBeCloseTo(7.3*.5,3)
      a.verstrichen=1.2;bilder.abgleichen(z,[{art:'spezialTreffer',einheit:'haubitze',menge:90,t:1.2}],0)
      expect(gruppe.position.z).toBeCloseTo(-5-7.3*.5/2-1)
      expect(explosion).toHaveBeenLastCalledWith(expect.objectContaining({x:expect.any(Number)}),7)
      expect(explosion.mock.calls[0][0].x).toBeGreaterThanOrEqual(-2.2)
      expect(explosion.mock.calls[0][0].x).toBeLessThanOrEqual(-1.2)
      expect(bilder.nimmTreffer()).toMatchObject([{menge:90,radius:3}])
      a.verstrichen=2.2;bilder.abgleichen(z,[{art:'spezialTreffer',einheit:'haubitze',menge:90,t:2.2}],0)
      expect(explosion.mock.calls[1][0].x).toBeGreaterThanOrEqual(1.2)
      expect(explosion.mock.calls[1][0].x).toBeLessThanOrEqual(2.2)
      a.verstrichen=3;bilder.abgleichen(z,[],0)
      expect(gruppe.position.z).toBeGreaterThan(-5-7.3*.5/2-1)
      a.verstrichen=3.75;z.aktiv=[];bilder.abgleichen(z,[],0)
      expect(gruppe.position.z).toBe(10)
      expect(scene.getObjectByName('einsatz-haubitze')).toBeUndefined()
      const panzer=starteEinheit(z,'panzer')
      bilder.abgleichen(z,[],0)
      expect((scene.getObjectByName('einsatz-panzer') as THREE.Group).position.x).toBe(0)
      panzer.verstrichen=2.7;bilder.abgleichen(z,[],0)
      panzer.verstrichen=4.3;bilder.abgleichen(z,[{art:'spezialTreffer',einheit:'panzer',menge:20,t:4.3}],0)
      expect(bilder.nimmTreffer()[0].punkt.x).toBeGreaterThanOrEqual(1.2)
      panzer.verstrichen=5.7;bilder.abgleichen(z,[],0)
      const panzerZiele=explosion.mock.calls.slice(2)
      expect(panzerZiele).toHaveLength(6)
      panzerZiele.forEach(([punkt,durchmesser],i)=>{
        expect(durchmesser).toBe(4)
        expect(punkt.x).toBeGreaterThanOrEqual(i<3?-2.2:1.2)
        expect(punkt.x).toBeLessThanOrEqual(i<3?-1.2:2.2)
        expect(punkt.z).toBeGreaterThanOrEqual(-z.y-4)
        expect(punkt.z).toBeLessThanOrEqual(-z.y)
      })
      bilder.gibFrei()
    } finally { vi.unstubAllGlobals() }
  })
  it('begrenzt Explosionen auf acht, davon zwei große', () => {
    const ctx={createRadialGradient:()=>({addColorStop:vi.fn()}),fillRect:vi.fn(),fillStyle:''}
    vi.stubGlobal('document',{createElement:()=>({width:64,height:64,getContext:()=>ctx})})
    try {
      const bilder=new Explosionen()
      for(let i=0;i<10;i++)bilder.starte(new THREE.Vector3(),i<4?5:2.5)
      expect(bilder.anzahl).toBe(8);expect(bilder.grosse).toBe(2)
      bilder.schritt(.45,new THREE.PerspectiveCamera())
      expect(bilder.anzahl).toBe(8)
      bilder.schritt(.15,new THREE.PerspectiveCamera())
      expect(bilder.anzahl).toBe(0)
      bilder.gibFrei()
    } finally { vi.unstubAllGlobals() }
  })
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
