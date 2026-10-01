import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { NodeIO } from '@gltf-transform/core'
import { EXTTextureWebP } from '@gltf-transform/extensions'
import sharp from 'sharp'
import * as THREE from 'three'
import { EIS, FAHRZEUGE, LEVELS, type FahrzeugName } from '../src/v3d/balance3d'
import { baueMiniatur, baueFeldFahrzeug, type FahrzeugBau } from '../src/v3d/fahrzeuge'
import { Einsatzbilder } from '../src/v3d/lauf'
import { neuerLauf, starteEinheit } from '../src/v3d/rechnung'
import type { Welt } from '../src/v3d/szene'
import { Explosionen } from '../src/v3d/anzeigen'
import { EisEffekte, baueEishuelle } from '../src/v3d/eis'
import { baueKamera } from '../src/v3d/kamera'
import { pruefEinsatz, startePruefEinsatz } from '../src/v3d/einstieg'

const namen = ['humvee','panzer','haubitze','hubschrauber'] as const
const io = new NodeIO().registerExtensions([EXTTextureWebP])

describe('3D-Fahrzeuge', () => {
  it('richtet Feldmodelle an Haube und Heckrotor aus, ohne Miniaturdrehung zu ändern', async () => {
    for (const name of ['humvee', 'hubschrauber'] as const) {
      const root = (await io.read(`src/v3d/modelle/v3d-${name}.glb`)).getRoot()
      const vorlage = new THREE.Group()
      for (const node of root.listNodes().filter(n => n.getMesh())) {
        const knoten = new THREE.Group()
        knoten.name = node.getName()
        knoten.matrix.fromArray(node.getWorldMatrix())
        knoten.matrixAutoUpdate = false
        for (const primitive of node.getMesh()!.listPrimitives()) {
          const positionen = primitive.getAttribute('POSITION')!
          const werte = new Float32Array(positionen.getCount() * 3)
          for (let i = 0; i < positionen.getCount(); i++) positionen.getElement(i, werte.subarray(i * 3, i * 3 + 3))
          const geometrie = new THREE.BufferGeometry()
          geometrie.setAttribute('position', new THREE.BufferAttribute(werte, 3))
          knoten.add(new THREE.Mesh(geometrie))
        }
        vorlage.add(knoten)
      }
      const bau = { vorlage } as FahrzeugBau
      const kurs = baueFeldFahrzeug(bau, name)
      expect(FAHRZEUGE[name].DREHUNG).toBe(180)
      expect(FAHRZEUGE[name].FELD_DREHUNG).toBe(0)
      expect(new THREE.Box3().setFromObject(kurs).getSize(new THREE.Vector3()).x / 2).toBeCloseTo(name === 'humvee' ? FAHRZEUGE.humvee.SCHNEISE_HALB : 2.43, 2)
      if (name === 'hubschrauber') {
        const heck = kurs.getObjectByName('heckrotor')!, haupt = kurs.getObjectByName('rotor')!
        kurs.updateMatrixWorld(true)
        expect(heck.getWorldPosition(new THREE.Vector3()).z).toBeGreaterThan(0)
        expect(haupt.getWorldPosition(new THREE.Vector3()).z).toBeLessThan(0)
        expect(heck.getWorldPosition(new THREE.Vector3()).z).toBeGreaterThan(haupt.getWorldPosition(new THREE.Vector3()).z)
      } else {
        // Im Originalnetz liegt die niedrige Motorhaube am negativen z-Ende.
        const punkte = root.listMeshes()[0].listPrimitives()[0].getAttribute('POSITION')!
        let haube = Infinity
        for (let i = 0; i < punkte.getCount(); i++) {
          const [x, y, z] = punkte.getElement(i, [0, 0, 0])
          if (Math.abs(x) < .3 && y < 1.3) haube = Math.min(haube, z)
        }
        expect(haube).toBeLessThan(-2)
        expect(kurs.localToWorld(new THREE.Vector3(0, 0, haube * FAHRZEUGE[name].SPIEL_SKALA)).z).toBeLessThan(0)
      }
      const muendung = FAHRZEUGE[name].MUENDUNG
      expect(kurs.localToWorld(new THREE.Vector3(0, 0, muendung[2] * FAHRZEUGE[name].SPIEL_SKALA)).z).toBeLessThan(0)
    }
  })
  it('umhüllt vier stillstehende Fahrzeuge und lässt die Feldmaße unverändert', async () => {
    const ctx = {clearRect:vi.fn(),createRadialGradient:()=>({addColorStop:vi.fn()}),fillRect:vi.fn()}
    vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>ctx})})
    try {
      const eis = new EisEffekte(new THREE.Scene(), null)
      const laengen: Record<string,number> = {}, hoehen: Record<string,number> = {}, feldLaengen: Record<string,number> = {}
      const huellBoxen = {} as Record<FahrzeugName, THREE.Box3>
      const fahrzeugBoxen = {} as Record<FahrzeugName, THREE.Box3>
      for (const name of namen) {
        const root = (await io.read(`src/v3d/modelle/v3d-${name}.glb`)).getRoot()
        const vorlage = new THREE.Group()
        for (const node of root.listNodes().filter(n => n.getMesh())) {
          const knoten = new THREE.Group(); knoten.name = node.getName(); knoten.matrix.fromArray(node.getWorldMatrix()); knoten.matrixAutoUpdate = false
          for (const primitive of node.getMesh()!.listPrimitives()) {
            const positionen = primitive.getAttribute('POSITION')!, werte = new Float32Array(positionen.getCount() * 3)
            for (let i = 0; i < positionen.getCount(); i++) positionen.getElement(i, werte.subarray(i * 3, i * 3 + 3))
            const geometrie = new THREE.BufferGeometry(); geometrie.setAttribute('position', new THREE.BufferAttribute(werte, 3))
            const indices = primitive.getIndices()
            if (indices) geometrie.setIndex(Array.from(indices.getArray()!))
            knoten.add(new THREE.Mesh(geometrie))
          }
          vorlage.add(knoten)
        }
        const bau = {vorlage} as FahrzeugBau
        const feld = baueFeldFahrzeug(bau, name)
        const feldBoxVor = new THREE.Box3().setFromObject(feld, true).getSize(new THREE.Vector3())
        feldLaengen[name] = feldBoxVor.z
        expect(feldLaengen[name]).toBeCloseTo(FAHRZEUGE[name].LAENGE * FAHRZEUGE[name].SPIEL_SKALA, 3)
        const mini = baueMiniatur(bau, name, [0, 0, 0], {eis:true})
        const fahrzeugBox = new THREE.Box3().setFromObject(mini, true)
        fahrzeugBoxen[name] = fahrzeugBox.clone()
        const masse = baueEishuelle(mini, eis)
        const feldBoxNach = new THREE.Box3().setFromObject(baueFeldFahrzeug(bau, name), true).getSize(new THREE.Vector3())
        expect(feldBoxNach.toArray(),name).toEqual(feldBoxVor.toArray())
        eis.huellDreiecke += masse.dreiecke; eis.huellBytes += masse.bytes
        const huelle = mini.userData.huelle as THREE.Group
        const huellBox = new THREE.Box3().setFromObject(huelle, true)
        huellBoxen[name] = huellBox.clone()
        const weltX = huellBox.clone().translate(new THREE.Vector3((EIS.INNEN_X + EIS.AUSSEN_X) / 2, 0, 0))
        laengen[name] = huellBox.getSize(new THREE.Vector3()).z
        hoehen[name] = huellBox.max.y
        expect(weltX.min.x,name).toBeGreaterThanOrEqual(EIS.INNEN_X - 1e-5)
        expect(weltX.max.x,name).toBeLessThanOrEqual(EIS.AUSSEN_X + 1e-5)
        expect(laengen[name],name).toBeLessThanOrEqual(EIS.ZIEL_LAENGE + 1e-4)
        expect(laengen[name],name).toBeGreaterThanOrEqual(3)
        expect(fahrzeugBox.min.y,name).toBeCloseTo(EIS.HUELLE, 3)
        for (const x of [fahrzeugBox.min.x,fahrzeugBox.max.x]) for (const y of [fahrzeugBox.min.y,fahrzeugBox.max.y]) for (const z of [fahrzeugBox.min.z,fahrzeugBox.max.z]) {
          expect(huellBox.containsPoint(new THREE.Vector3(x,y,z)),name).toBe(true)
        }
        expect(mini.localToWorld(new THREE.Vector3(...FAHRZEUGE[name].MUENDUNG)).z,name).toBeLessThan(0)
      }
      expect(eis.huellDreiecke).toBeGreaterThan(0)
      expect((512*512*4*4/3 + 512*512*4 + EIS.SPLITTER_POOL*16*4 + eis.huellBytes)/1048576).toBeLessThanOrEqual(3)
      const camera = baueKamera(390, 844), xMitte = (EIS.INNEN_X + EIS.AUSSEN_X) / 2
      const bildBox = (box:THREE.Box3) => {
        const punkte:THREE.Vector3[]=[]
        for(const x of [box.min.x,box.max.x]) for(const y of [box.min.y,box.max.y]) for(const z of [box.min.z,box.max.z]) punkte.push(new THREE.Vector3(x,y,z).project(camera))
        return {l:Math.min(...punkte.map(p=>p.x)),r:Math.max(...punkte.map(p=>p.x)),o:Math.min(...punkte.map(p=>p.y)),u:Math.max(...punkte.map(p=>p.y))}
      }
      const hoch = new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion), rechts = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion)
      const mitte = new THREE.Vector3(xMitte,hoehen.humvee+.85,-12)
      const tafelPunkte = [-.6,.6].flatMap(x=>[-.234375,.5].map(y=>mitte.clone().addScaledVector(rechts,x).addScaledVector(hoch,y).project(camera)))
      const tafel = {l:Math.min(...tafelPunkte.map(p=>p.x)),r:Math.max(...tafelPunkte.map(p=>p.x)),o:Math.min(...tafelPunkte.map(p=>p.y)),u:Math.max(...tafelPunkte.map(p=>p.y))}
      const eigenes=bildBox(fahrzeugBoxen.humvee.clone().translate(new THREE.Vector3(xMitte,0,-12)))
      const folge=bildBox(fahrzeugBoxen.haubitze.clone().translate(new THREE.Vector3(xMitte,0,-20)))
      const schnitt=(b:typeof tafel)=>Math.max(0,Math.min(tafel.r,b.r)-Math.max(tafel.l,b.l))*Math.max(0,Math.min(tafel.u,b.u)-Math.max(tafel.o,b.o))
      const eigeneUeberdeckung=schnitt(eigenes), eigenerAnteil=eigeneUeberdeckung/((eigenes.r-eigenes.l)*(eigenes.u-eigenes.o))
      const folgeAnteil=schnitt(folge)/((folge.r-folge.l)*(folge.u-folge.o))
      const ziffernPx=Math.abs(new THREE.Vector3(xMitte,hoehen.humvee+.35,-12).project(camera).y-new THREE.Vector3(xMitte,hoehen.humvee+1.35,-12).project(camera).y)*844/2*96/128
      console.info('Eishüllen-Messung', {laengen, hoehen, feldLaengen, dreiecke:eis.huellDreiecke, bytes:eis.huellBytes, eigenerAnteil, folgeAnteil, ziffernPx})
      // Bounding-Box-Schnitt: 2,25 % (Antennenspitze); im Browserbild nicht sichtbar (Claude 2026-10-01).
      expect(eigenerAnteil).toBeLessThanOrEqual(.05)
      expect(folgeAnteil).toBeLessThanOrEqual(.2)
      expect(ziffernPx).toBeGreaterThanOrEqual(18)
    } finally {vi.unstubAllGlobals()}
  })
  it('gibt den Prüf-Einsatz nur mit pruefung=1 frei', () => {
    expect(pruefEinsatz('?einsatz=panzer')).toEqual([])
    expect(pruefEinsatz('?pruefung=soldat&einsatz=panzer')).toEqual([])
    expect(pruefEinsatz('?pruefung=1&einsatz=falsch')).toEqual([])
    expect(pruefEinsatz('?pruefung=1&einsatz=haubitze')).toEqual(['haubitze'])
    const zustand=neuerLauf(LEVELS[0],1)
    expect(startePruefEinsatz(zustand,'?pruefung=1&einsatz=haubitze',true)).toBe(false)
    expect(zustand.aktiv).toHaveLength(0)
    expect(startePruefEinsatz(zustand,'?pruefung=1&einsatz=haubitze',false)).toBe(true)
    expect(zustand.aktiv.map(a=>a.einheit)).toEqual(['haubitze'])
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
      a.verstrichen=5.2;bilder.abgleichen(z,[{art:'spezialTreffer',einheit:'haubitze',menge:90,t:5.2}],0)
      expect(explosion.mock.calls[1][0].x).toBeGreaterThanOrEqual(1.2)
      expect(explosion.mock.calls[1][0].x).toBeLessThanOrEqual(2.2)
      a.verstrichen=6;bilder.abgleichen(z,[],0)
      expect(gruppe.position.z).toBeGreaterThan(-5-7.3*.5/2-1)
      a.verstrichen=6.75;z.aktiv=[];bilder.abgleichen(z,[],0)
      expect(gruppe.position.z).toBe(10)
      expect(scene.getObjectByName('einsatz-haubitze')).toBeUndefined()
      const panzer=starteEinheit(z,'panzer')
      bilder.abgleichen(z,[],0)
      expect((scene.getObjectByName('einsatz-panzer') as THREE.Group).position.x).toBe(0)
      panzer.verstrichen=2.7;bilder.abgleichen(z,[],0)
      panzer.verstrichen=3.6;bilder.abgleichen(z,[{art:'spezialTreffer',einheit:'panzer',menge:20,t:3.6}],0)
      expect(bilder.nimmTreffer()[0].punkt.x).toBeGreaterThanOrEqual(1.2)
      panzer.verstrichen=4.2;bilder.abgleichen(z,[],0)
      const panzerZiele=explosion.mock.calls.slice(2)
      expect(panzerZiele).toHaveLength(4)
      panzerZiele.forEach(([punkt,durchmesser],i)=>{
        expect(durchmesser).toBe(4)
        expect(punkt.x).toBeGreaterThanOrEqual(i<2?-2.2:1.2)
        expect(punkt.x).toBeLessThanOrEqual(i<2?-1.2:2.2)
        expect(punkt.z).toBeGreaterThanOrEqual(-z.y-6)
        expect(punkt.z).toBeLessThanOrEqual(-z.y-4)
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
      expect((bilder.objekt.material as THREE.MeshBasicMaterial).depthTest).toBe(false)
      bilder.starte(new THREE.Vector3(4,0,-20),7)
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

  it('teilt die Fahrzeugressourcen mit der Eisminiatur', () => {
    for (const name of namen) {
      const geometrie = new THREE.BoxGeometry(2, 1, 4), material = new THREE.MeshStandardMaterial(), vorlage = new THREE.Group()
      vorlage.add(new THREE.Mesh(geometrie,material))
      const bau: FahrzeugBau = {geometrien:[geometrie],material,laenge:FAHRZEUGE[name].LAENGE,vorlage,gibFrei(){}}
      const mini = baueMiniatur(bau,name,[0,0,0],{eis:true}), mesh = mini.children[0] as THREE.Mesh
      expect(mesh.geometry).toBe(geometrie); expect(mesh.material).toBe(material)
      expect(new THREE.Box3().setFromObject(mini,true).min.y).toBeCloseTo(EIS.HUELLE)
    }
  })

  it('ordnet Säulen und Credits den gewählten Modellen zu', () => {
    expect(LEVELS[0].saeulen).toEqual(['humvee','haubitze','panzer','hubschrauber'])
    const lizenzen=readFileSync('docs/lizenzen.md','utf8')
    for(const text of ['Low Poly Humvee vehicle',"Duane's Mind",'AMX-56 Low Poly','Waroxed','M144 155mm Howitzer low poly','Cyan_dev10','Low Poly Apache Gunship'])expect(lizenzen).toContain(text)
    expect((namen as readonly FahrzeugName[]).every(name=>lizenzen.includes(`v3d-${name}`)||lizenzen.includes(name==='panzer'?'AMX-56':name==='haubitze'?'M144':name==='hubschrauber'?'Apache':'Humvee'))).toBe(true)
  })
})
