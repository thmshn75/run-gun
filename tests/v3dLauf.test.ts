import { describe, expect, it, vi } from 'vitest'
import { SpielLauf, WeltDarstellung, Einsatzbilder, baueHorde, HordeLoecher, baueLaufSpuren, spurFaktor, formationsFiguren, formationsBewegung, BlitzTakt, wandText, ZAHL_HOEHEN, bossBewegung, type LaufSoldat, type LaufDarstellung, type BossStand } from '../src/v3d/lauf'
import type { Zustand } from '../src/v3d/rechnung'
import { neuerLauf, starteEinheit, gesamtDauer, schritt, saeulenStartP } from '../src/v3d/rechnung'
import type { FahrzeugBau } from '../src/v3d/fahrzeuge'
import { bannerEintraege } from '../src/v3d/oberflaeche'
import { MessBotSteuerung } from '../src/v3d/messung'
import { bossFreieAufstellung } from '../src/v3d/bosse'
import { saeulenBlick } from '../src/v3d/lauf'
import { BUEHNE, DARSTELLUNG, EIS, FAHRZEUGE, FIGUREN, LEVELS, type FahrzeugName } from '../src/v3d/balance3d'
import { statusZeile } from '../src/v3d/oberflaeche'
import { EisEffekte } from '../src/v3d/eis'
import { startePruefEinsatz } from '../src/v3d/einstieg'
import * as THREE from 'three'
import { BossBalken, ZahlAnzeige } from '../src/v3d/anzeigen'
import { ZombieMasse, type ZombieBau } from '../src/v3d/figuren'
import { SoldatenMasse, type SoldatenBau } from '../src/v3d/soldaten'
import type { Welt } from '../src/v3d/szene'
import { saeulenZiele } from '../src/v3d/szene'

function baueWeltAttrappe() {
  const namenBreiten: number[]=[]
  const kontext={font:'',clearRect:vi.fn(),fillRect:vi.fn(),fillText:vi.fn(function(this:{font:string},name:string){
    if(LEVELS[0].saeulen.some(n=>n.toUpperCase()===name))namenBreiten.push(name.length*Number.parseInt(this.font.match(/\d+/)?.[0]??'0')*.64)
  }),measureText:vi.fn(function(this:{font:string},name:string){return {width:name.length*Number.parseInt(this.font.match(/\d+/)?.[0]??'0')*.64}}),createRadialGradient:()=>({addColorStop:vi.fn()}),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn()}
  vi.stubGlobal('document',{createElement:()=>({width:256,height:128,getContext:()=>kontext})})
  const form=()=>new THREE.BoxGeometry(.3,2,.3)
  const zombieBau:ZombieBau={formen:[form()],materialien:[new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial()],bemalungen:[],dauer:1.1,dreiecke:12}
  const soldatBau:SoldatenBau={formen:{laufen:[form()],stehen:[form()],schiessen:[form()],fallen:[form(),form(),form(),form()]},material:new THREE.MeshStandardMaterial(),atlas:new THREE.Texture(),dauer:{laufen:1,stehen:1,schiessen:1,fallen:1},backzeitMs:0,pruefung:{debugMuzzle:[0,1.3,-.5]}}
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),truppe=new SoldatenMasse(soldatBau,40),laufTrupp=new SoldatenMasse(soldatBau,50),front=new SoldatenMasse(soldatBau,40),zombieMasse=new ZombieMasse(zombieBau,zombieBau.materialien,600)
  const wand=new THREE.Group(),eis=new EisEffekte(scene,null)
  const saeulen=LEVELS[0].saeulen.map((_,i)=>{const g=new THREE.Group();g.name=`saeule-${i}`;g.position.set(BUEHNE.SAEULE_X,0,-12);return g})
  const miniaturen=LEVELS[0].saeulen.map(name=>{const innen=new THREE.Group();innen.name=`fahrzeug-${name}`;innen.position.y=1;innen.userData.hoehe=2;const halb=FAHRZEUGE[name as FahrzeugName].LAENGE*EIS.MASSSTAB/2+EIS.HUELLE;innen.userData.huelleZ=[-halb,halb];const huelle=new THREE.Group();huelle.name='eishuelle';huelle.add(new THREE.Mesh(new THREE.BoxGeometry(1,2,1),eis.basis));innen.add(huelle);innen.userData.huelle=huelle;innen.userData.rissMeshes=[new THREE.Mesh(new THREE.BoxGeometry(1,2,1),eis.rissMaterial)];return innen})
  const saeulenBloecke=saeulen.map(g=>{const block=new THREE.Group();g.add(block);return block})
  const saeulenSchilder=saeulen.map(g=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(document.createElement('canvas'))}));m.userData.canvas=document.createElement('canvas');g.add(m);return m})

  const bossObjekt=new THREE.Group(),bossMaterial=new THREE.MeshStandardMaterial({color:'#777777'})
  bossObjekt.add(new THREE.Mesh(form(),bossMaterial))
  const miniSpiele=vi.fn(),eliteSpiele=vi.fn()
  const miniboss={objekt:bossObjekt,breite:1,spiele:miniSpiele,aktualisiere:vi.fn(),gibFrei:vi.fn()}
  const eliteboss={objekt:new THREE.Group(),breite:1,spiele:eliteSpiele,aktualisiere:vi.fn(),gibFrei:vi.fn()}
  scene.add(truppe.gruppe,laufTrupp.gruppe,front.gruppe,zombieMasse.gruppe,wand,...saeulen,bossObjekt,eliteboss.objekt)
  const vorlage=new THREE.Group(),fahrzeugGeometrie=new THREE.BoxGeometry(2,2,9.8),fahrzeugMaterial=new THREE.MeshStandardMaterial()
  vorlage.add(new THREE.Mesh(fahrzeugGeometrie,fahrzeugMaterial))
  const bau: FahrzeugBau={geometrien:[fahrzeugGeometrie],material:fahrzeugMaterial,laenge:9.8,vorlage,gibFrei(){}}
  const welt={scene,camera,bemalungen:[new THREE.Texture(),new THREE.Texture()],wasser:{} as Welt['wasser'],zombieBau,zombieMasse,nahaufnahme:false,soldatNahaufnahme:false,soldatBau,truppe,laufTrupp,front,laufGruppen:[truppe.gruppe,laufTrupp.gruppe,front.gruppe,zombieMasse.gruppe],plusSchilder:[],wand,saeulen,miniaturen,saeulenBloecke,saeulenSchilder,eis,miniboss,eliteboss,fahrzeuge:{panzer:bau,haubitze:bau}} as Welt
  return {welt,miniSpiele,bossMaterial,namenBreiten,raume:()=>vi.unstubAllGlobals()}
}

function laufe(ziel: number, dauer=10) {
  let gezeigt=0, ausgesandt=0, einheiten=0
  const bild: LaufDarstellung={zeige(z:Zustand, s, events){gezeigt=s.size;ausgesandt+=events.filter(e=>e.art==='ausgesandt').reduce((n,e)=>n+e.menge,0);einheiten+=events.filter(e=>e.art==='einheitFrei').length}}
  const lauf=new SpielLauf(undefined,42,bild)
  lauf.x=ziel
  for(let i=0;i<dauer*10;i++) lauf.schritt(.1,ziel)
  return {lauf,gezeigt,ausgesandt,einheiten}
}
describe('3D-Lauf',()=>{
  it('entfernt Einschlag-Zombies vor Ort bei gleicher sichtbarer Zahl und heilt langsam',()=>{
    const loecher=new HordeLoecher(),punkt=new THREE.Vector3(-1.7,.2,-25)
    const imRadius=(eintraege: ReturnType<typeof baueHorde>)=>eintraege.filter(e=>Math.hypot(e.x-punkt.x,e.z-20-punkt.z)<=3).length
    const vorher=imRadius(baueHorde(600,loecher.indizes).eintraege)
    const getroffen=loecher.treffer(600,-20,punkt,90,3)
    const nachher=baueHorde(600,loecher.indizes).eintraege
    expect(getroffen).toBeGreaterThanOrEqual(.8*Math.min(90,vorher))
    expect(imRadius(nachher)).toBeLessThanOrEqual(vorher-.8*Math.min(90,vorher))
    expect(nachher).toHaveLength(600)
    loecher.zuruecksetzen()
    expect(loecher.treffer(600,-20,punkt,90,100)).toBe(90)
    loecher.schritt(20)
    expect(loecher.indizes.size).toBe(17)
    expect(baueHorde(600,loecher.indizes).eintraege).toHaveLength(600)
    loecher.schritt(2.5)
    expect(loecher.indizes.size).toBe(7)
    loecher.schritt(1.75)
    expect(loecher.indizes.size).toBe(0)
    expect(baueHorde(600,loecher.indizes).eintraege).toHaveLength(600)
    loecher.treffer(600,-20,punkt,90,100)
    loecher.passeAn(510)
    expect(baueHorde(510,loecher.indizes).eintraege).toHaveLength(510)
  })
  it('hält die Horde mit Panzerschneisen-Löchern bei der sichtbaren Sollzahl',()=>{
    const {welt,raume}=baueWeltAttrappe()
    try {
      const anzeige=new WeltDarstellung(welt),z=neuerLauf(LEVELS[0],1)
      z.Z=600;z.y=20;z.t=10
      const a=starteEinheit(z,'panzer');a.verstrichen=4.8
      const calls: ReturnType<typeof baueHorde>[]=[]
      const original=welt.zombieMasse.setze.bind(welt.zombieMasse)
      vi.spyOn(welt.zombieMasse,'setze').mockImplementation(e=>{
        calls.push([...e])
        original(e)
      })
      anzeige.zeige(z,new Map(),[{art:'spezialTreffer',menge:20,t:10,einheit:'panzer'}],.1,0)
      expect(calls.at(-1)).toHaveLength(600)
      const gruppe=welt.scene.getObjectByName('einsatz-panzer')!
      const bug=gruppe.position.z-FAHRZEUGE.panzer.LAENGE*FAHRZEUGE.panzer.SPIEL_SKALA/2
      const amBug=(eintraege: ReturnType<typeof baueHorde>)=>eintraege.filter(p=>Math.hypot(p.x,p.z-z.y-bug)<=1.4).length
      expect(amBug(calls.at(-1)!)).toBeLessThan(amBug(baueHorde(600,new Set()).eintraege))
      z.aktiv=[];z.t+=.1;anzeige.zeige(z,new Map(),[],.1,0)
      anzeige.nachlauf(3)
      expect(calls.at(-1)).toHaveLength(600)
      z.t+=3;anzeige.zeige(z,new Map(),[],0,0)
      expect(calls.at(-1)).toHaveLength(600)
      anzeige.gibFrei()
    } finally {raume()}
  })
  it('lässt die Panzer-Gasse nach der Durchfahrt bis zur nächsten Welle offen',()=>{
    const {welt,raume}=baueWeltAttrappe()
    try {
      const einsatz=new Einsatzbilder(welt),z=neuerLauf(LEVELS[0],1)
      z.y=20;z.Z=540
      const a=starteEinheit(z,'panzer')
      for(let i=0;i<=50;i++) {
        a.verstrichen=4.2+i*.1
        einsatz.abgleichen(z,[{art:'spezialTreffer',menge:2,t:i*.1,einheit:'panzer'}],.1)
      }
      expect(einsatz.nimmTreffer()).toHaveLength(0)
      expect(einsatz.gasse.bis).toBeLessThan(-20)
      const gebaut=baueHorde(540,new Set(),einsatz.gasse)
      expect(gebaut.eintraege).toHaveLength(540)
      expect(gebaut.eintraege.some(e=>einsatz.gasse.enthaelt(e))).toBe(false)
      einsatz.nachlauf(10)
      expect(einsatz.gasse.aktiv).toBe(true)
      einsatz.abgleichen(z,[{art:'welle',menge:250,t:0}],1.5)
      expect(einsatz.gasse.aktiv).toBe(true)
      einsatz.abgleichen(z,[],1.5)
      expect(einsatz.gasse.aktiv).toBe(false)
      einsatz.gibFrei()
    } finally {raume()}
  })
  it('zeigt zwei Panzerschüsse je Halt und zwei Haubitzeneinschläge links und rechts',()=>{
    const {welt,raume}=baueWeltAttrappe()
    try {
      const einsatz=new Einsatzbilder(welt),z=neuerLauf(LEVELS[0],1)
      z.y=20;z.Z=600
      const panzer=starteEinheit(z,'panzer')
      einsatz.abgleichen(z,[],0)
      const schuesse=vi.spyOn(einsatz.explosionen,'starte')
      for(const zeit of [1.45,1.85,3.7,4.1]) {
        panzer.verstrichen=zeit
        einsatz.abgleichen(z,[{art:'spezialTreffer',menge:4,t:zeit,einheit:'panzer'}],.1)
      }
      expect(schuesse).toHaveBeenCalledTimes(4)
      expect(schuesse.mock.calls.map(c=>Math.sign(c[0].x))).toEqual([-1,-1,1,1])
      const haubitze=starteEinheit(z,'haubitze')
      for(const zeit of [1.2,3.2]) {
        haubitze.verstrichen=zeit
        einsatz.abgleichen(z,[{art:'spezialTreffer',menge:90,t:zeit,einheit:'haubitze'}],.1)
      }
      expect(schuesse).toHaveBeenCalledTimes(6)
      expect(schuesse.mock.calls.slice(4).map(c=>Math.sign(c[0].x))).toEqual([-1,1])
      einsatz.gibFrei()
    } finally {raume()}
  })
  it('legt Panzer- und Haubitzenziele bei kleiner und großer Horde hinter die Front',()=>{
    for (const dt of [1/60,.1]) for (const zahl of [20,600]) {
      const {welt,raume}=baueWeltAttrappe()
      try {
        const einsatz=new Einsatzbilder(welt),z=neuerLauf(LEVELS[0],1)
        z.y=20;z.Z=zahl
        const tiefe=-Math.min(...baueHorde(zahl,new Set()).eintraege.map(e=>e.z))
        const explosionen=vi.spyOn(einsatz.explosionen,'starte')
        const panzer=starteEinheit(z,'panzer')
        einsatz.abgleichen(z,[],0)
        for (const zeit of [1.45,1.85,3.7,4.1]) {
          panzer.verstrichen=zeit
          einsatz.abgleichen(z,[{art:'spezialTreffer',menge:4,t:zeit,einheit:'panzer'}],dt)
        }
        const haubitze=starteEinheit(z,'haubitze')
        for (const zeit of [1.2,5.2]) {
          haubitze.verstrichen=zeit
          einsatz.abgleichen(z,[{art:'spezialTreffer',menge:90,t:zeit,einheit:'haubitze'}],dt)
          expect(einsatz.nimmTreffer().at(-1)?.punkt).toEqual(explosionen.mock.lastCall?.[0])
        }
        expect(explosionen).toHaveBeenCalledTimes(6)
        explosionen.mock.calls.forEach(([punkt],index)=>{
          const nah=Math.max(index<4?4:4.5,.4*tiefe)
          const fern=Math.max(6,.85*tiefe)
          expect(-z.y-punkt.z).toBeGreaterThanOrEqual(nah-1e-9)
          expect(-z.y-punkt.z).toBeLessThanOrEqual(fern+1e-9)
        })
        einsatz.gibFrei()
      } finally {raume()}
    }
  })
  it('startet beide Prüf-Haubitzeneinschläge erst ohne Ladeabdeckung und zeigt den ersten auch bei vollem Pool',()=>{
    const {welt,raume}=baueWeltAttrappe()
    try {
      const einsatz=new Einsatzbilder(welt),z=neuerLauf(LEVELS[0],1)
      z.y=20;z.Z=600
      const suche='?pruefung=1&einsatz=haubitze'
      expect(startePruefEinsatz(z,suche,true)).toBe(false)
      expect(z.aktiv).toHaveLength(0)
      for(let i=0;i<DARSTELLUNG.EXPLOSIONEN_MAX;i++) einsatz.explosionen.starte(new THREE.Vector3(i,0,-10),2.5)
      expect(einsatz.explosionen.anzahl).toBe(DARSTELLUNG.EXPLOSIONEN_MAX)
      expect(startePruefEinsatz(z,suche,false)).toBe(true)
      const haubitze=z.aktiv[0]
      const explosionen=vi.spyOn(einsatz.explosionen,'starte')
      for(const zeit of [1.2,5.2]) {
        haubitze.verstrichen=zeit
        einsatz.abgleichen(z,[{art:'spezialTreffer',menge:90,t:zeit,einheit:'haubitze'}],.1)
        expect(einsatz.explosionen.grosse).toBeGreaterThan(0)
      }
      expect(explosionen.mock.calls.filter(([,d])=>d===7)).toHaveLength(2)
      expect((einsatz.explosionen.objekt.material as THREE.MeshBasicMaterial).depthTest).toBe(false)
      einsatz.gibFrei()
    } finally {raume()}
  })
  it('zeigt den ersten normalen Haubitzeneinschlag hinter der Kampflinie trotz vollem Pool und Vordergrund',()=>{
    const {welt,raume}=baueWeltAttrappe()
    try {
      const einsatz=new Einsatzbilder(welt),z=neuerLauf(LEVELS[0],1)
      z.y=20;z.Z=600
      for(let i=0;i<DARSTELLUNG.EXPLOSIONEN_MAX;i++) einsatz.explosionen.starte(new THREE.Vector3(i,0,-10),2.5)
      const haubitze=starteEinheit(z,'haubitze')
      einsatz.abgleichen(z,[],0)
      haubitze.verstrichen=1.2
      einsatz.abgleichen(z,[{art:'spezialTreffer',menge:90,t:1.2,einheit:'haubitze'}],1/60)
      const ziel=einsatz.letzteZiele(haubitze)[0]
      expect(ziel).toBeDefined()
      expect(ziel.x).toBeLessThan(-1.2)
      expect(ziel.z).toBeLessThan(-z.y-4.5)
      expect(einsatz.explosionen.grosse).toBe(1)
      expect(einsatz.explosionen.anzahl).toBe(DARSTELLUNG.EXPLOSIONEN_MAX)
      expect(einsatz.explosionen.objekt.renderOrder).toBeGreaterThan(10)
      expect((einsatz.explosionen.objekt.material as THREE.MeshBasicMaterial).depthTest).toBe(false)
      einsatz.gibFrei()
    } finally {raume()}
  })
  it('setzt Einheiten-Banner mindestens sechs Pixel unter die Statuszeile',async()=>{
    vi.resetModules()
    const {setzeEinheitenBanner,zeigeOberflaeche,versteckeOberflaeche}=await import('../src/v3d/oberflaeche')
    const elemente: { tag: string; style: Record<string,string>; children: unknown[]; textContent: string; getBoundingClientRect: () => {top:number;bottom:number}; appendChild: (child:unknown)=>void; append: (...children:unknown[])=>void; replaceChildren: (...children:unknown[])=>void; addEventListener:()=>void }[]=[]
    const createElement=(tag:string)=>{
      const element={tag,style:{} as Record<string,string>,children:[] as unknown[],textContent:'',
        getBoundingClientRect:()=>({top:tag==='div'&&elemente.indexOf(element)===0?10:20,bottom:90}),
        appendChild(child:unknown){this.children.push(child)},append(...children:unknown[]){this.children.push(...children)},
        replaceChildren(...children:unknown[]){this.children=children},addEventListener(){} }
      elemente.push(element)
      return element
    }
    vi.stubGlobal('document',{body:{appendChild:vi.fn()},createElement})
    try {
      const ui=zeigeOberflaeche(()=>{},()=>{},1)
      ui.zahlen.textContent='Level 1 · Welle 2/3'
      const z = neuerLauf(LEVELS[0], 1)
      starteEinheit(z, 'humvee').verstrichen = 2.1
      setzeEinheitenBanner(z.aktiv)
      const banner=elemente.find(e=>e.children.some(c=>(c as {textContent?:string}).textContent==='HUMVEE · 12 s'))!
      expect(Number.parseFloat(banner.style.top)+10).toBeGreaterThanOrEqual(ui.zahlen.getBoundingClientRect().bottom+6)
    } finally { versteckeOberflaeche();vi.unstubAllGlobals() }
  })
  it('zeigt Frontkampf und gedeckelte Fall-Soldaten und räumt eigene Netze auf',()=>{
    const {welt,miniSpiele,bossMaterial,raume}=baueWeltAttrappe()
    try {
      const gruppenVorher=new Set(welt.scene.children.filter(o=>o instanceof THREE.Group))
      const matFrei=vi.spyOn(welt.soldatBau.material,'dispose'),zombieFrei=vi.spyOn(welt.zombieBau.materialien[0],'dispose')
      const anzeige=new WeltDarstellung(welt,7),lauf=new SpielLauf(undefined,7,anzeige),z=lauf.zustand
      expect(welt.scene.children.filter(o=>o instanceof THREE.Group && !gruppenVorher.has(o))).toHaveLength(1)
      z.F=40;z.Z=100;z.y=20;z.miniBoss.imFeld=true
      anzeige.zeige(z,new Map(),[{art:'zombieGefallen',menge:1000,t:0},{art:'soldatGefallen',menge:1000,t:0}],.1,0)
      expect(anzeige.diag().frontBewegung).toBe('schiessen')
      expect(anzeige.diag().frontBlitze).toBeGreaterThan(0)
      expect(anzeige.diag().frontBlitze).toBeLessThanOrEqual(8)
      expect(welt.scene.getObjectByName('fallZombies')).toBeUndefined()
      expect('fallZombiesAktiv' in anzeige.diag()).toBe(false)
      expect(anzeige.diag().fallSoldatenAktiv).toBeLessThanOrEqual(8)
      expect(miniSpiele).toHaveBeenCalledWith('attack_1',false)
      z.miniBoss.B=0;z.miniBoss.imFeld=false
      anzeige.zeige(z,new Map(),[{art:'bossTreffer',boss:'miniBoss',menge:1,t:0}],.1,0)
      expect(anzeige.diag().bossZustand).toBe('stirbt')
      expect(miniSpiele).toHaveBeenLastCalledWith('death_1',true)
      expect(bossMaterial.color.getHexString()).not.toBe('777777')
      z.Z=0;z.F=0;z.miniBoss.imFeld=false
      anzeige.zeige(z,new Map(),[],.1,0)
      expect(anzeige.diag().frontBewegung).toBe('stehen')
      expect(anzeige.diag().frontBlitze).toBe(0)
      z.ergebnis='sieg'
      anzeige.zeige(z,new Map(),[{art:'zombieGefallen',menge:1000,t:0}],.1,0)
      anzeige.nachlauf(2)
      expect(anzeige.diag().bossZustand).toBe('weg')
      anzeige.gibFrei()
      expect(welt.laufGruppen).toHaveLength(4)
      expect(matFrei).not.toHaveBeenCalled()
      expect(zombieFrei).not.toHaveBeenCalled()
      expect(bossMaterial.color.getHexString()).toBe('777777')
    } finally { raume() }
  })
  it('setzt den Vorgänger nach der Bot-Darstellung samt Boss-Clip zurück',()=>{
    const {welt,miniSpiele,raume}=baueWeltAttrappe()
    try {
      const vorn=new WeltDarstellung(welt,1),z=new SpielLauf().zustand
      z.F=10;z.Z=10;z.miniBoss.imFeld=true
      vorn.zeige(z,new Map(),[],.1,0)
      const bot=new WeltDarstellung(welt,2)
      bot.zeige(z,new Map(),[{art:'zombieGefallen',menge:10,t:0}],.1,0)
      bot.gibFrei()
      expect(miniSpiele).toHaveBeenLastCalledWith('attack_1',false)
      expect(vorn.diag().bossZustand).toBe('kaempft')
      vorn.gibFrei()
    } finally { raume() }
  })
  it('merkt den ersten Protokollfehler mit Soll und Ist',()=>{
    const lauf=new SpielLauf(undefined,1)
    lauf.zustand.T+=10
    lauf.schritt(1/30,null)
    expect(lauf.protokollFehler).toContain('T Soll')
    const erster=lauf.protokollFehler
    lauf.schritt(1/30,null)
    expect(lauf.protokollFehler).toBe(erster)
    lauf.protokollNeuBasieren()
    expect(lauf.protokollFehler).toBeNull()
  })
  it('prüft das Ereignisprotokoll mit fünf Bot-Seeds bis zum Ende',()=>{
    for (const seed of [1,2,3,4,5]) {
      const bot=new MessBotSteuerung(),lauf=new SpielLauf(undefined,seed)
      for(let i=0;i<900*30 && lauf.zustand.ergebnis==='laeuft';i++) lauf.schritt(1/30,bot.ziel(lauf.zustand))
      expect(lauf.zustand.ergebnis).not.toBe('laeuft')
      expect(lauf.protokollFehler).toBeNull()
    }
  })
  it('führt den Mini-Boss vom Lauf über Angriff und Tod aus dem Bild',()=>{
    let stand:BossStand={zustand:'weg',clip:'walk',einmal:false,sichtbar:false,balken:false,z:0,todSeit:-Infinity}
    stand=bossBewegung(stand,{t:0,y:30,kontakt:false,imFeld:true,B:100,todesDauer:1})
    expect([stand.zustand,stand.clip,stand.z]).toEqual(['laeuft','walk',-31])
    stand=bossBewegung(stand,{t:1,y:29,kontakt:true,imFeld:true,B:100,todesDauer:1})
    expect([stand.zustand,stand.clip]).toEqual(['kaempft','attack_1'])
    stand=bossBewegung(stand,{t:2,y:28,kontakt:true,imFeld:false,B:0,todesDauer:1})
    expect([stand.zustand,stand.clip,stand.einmal,stand.balken,stand.z]).toEqual(['stirbt','death_1',true,false,-30])
    expect(bossBewegung(stand,{t:3,y:20,kontakt:false,imFeld:false,B:0,todesDauer:1}).sichtbar).toBe(true)
    expect(bossBewegung(stand,{t:4,y:20,kontakt:false,imFeld:false,B:0,todesDauer:1}).zustand).toBe('weg')
  })
  it('setzt Schildertempo und Hordenzahl an den rechten Rand',()=>{
    expect(DARSTELLUNG.SCHILDER_TEMPO_LANGSAM).toBe(4)
    expect(DARSTELLUNG.SCHILDER_TEMPO_SCHNELL).toBe(21)
    const {welt,raume}=baueWeltAttrappe()
    try {
      const anzeige=new WeltDarstellung(welt),z=new SpielLauf().zustand
      z.Z=20;z.y=20
      anzeige.zeige(z,new Map(),[],.1,0)
      const zahl=welt.scene.children.find(o=>o instanceof THREE.Mesh && o.position.x===FIGUREN.ZOMBIE_X_MAX+.6)!
      expect(zahl.position.y).toBe(2.4)
      expect(zahl.position.z).toBe(-z.y+1)
      expect(Math.abs(zahl.position.x-welt.miniboss.objekt.position.x)).toBeGreaterThanOrEqual(2)
      anzeige.gibFrei()
    } finally {raume()}
  })
  it('beschleunigt die +1-Schilder mit 64 m/s²',()=>{
    const {welt,raume}=baueWeltAttrappe()
    try {
      const schild=new THREE.Group();welt.plusSchilder.push(schild)
      const anzeige=new WeltDarstellung(welt),z=new SpielLauf().zustand
      anzeige.zeige(z,new Map(),[{art:'eingesammelt',menge:1,t:0}],.1,0)
      expect(schild.position.z).toBeCloseTo(-BUEHNE.PLUS_ABSTAND+1.04)
      anzeige.gibFrei()
    } finally {raume()}
  })
  it('rückt Eisplätze im Kreis und setzt sie beim Zweitstart zurück',()=>{
    const {welt,raume}=baueWeltAttrappe()
    try {
      const anzeige=new WeltDarstellung(welt),z=new SpielLauf().zustand
      anzeige.zeige(z,new Map(),[],.1,0)
      expect(welt.saeulen.filter(s=>s.visible)).toHaveLength(4)
      expect(welt.miniaturen[0].rotation.y).toBe(0)
      z.saeulenIndex=1;z.P=150;z.PStart=150
      anzeige.zeige(z,new Map(),[{art:'einheitFrei',menge:1,t:0}],.1,0)
      expect(welt.eis.diagnose.splitter).toBeGreaterThanOrEqual(24)
      expect(welt.saeulenBloecke[0].scale.x).toBeCloseTo(.3)
      for(let i=0;i<6;i++)anzeige.zeige(z,new Map(),[],.1,0)
      expect(welt.saeulen[1].position.z).toBeCloseTo(saeulenZiele(LEVELS[0],1,welt.miniaturen,4)[0])
      expect(welt.saeulenBloecke[0].scale.x).toBe(1)
      expect(welt.saeulen.filter(s=>s.visible)).toHaveLength(4)
      anzeige.gibFrei()
      const nochmal=new WeltDarstellung(welt),neu=new SpielLauf().zustand
      nochmal.zeige(neu,new Map(),[],.1,0)
      expect(welt.saeulen[0].position.z).toBe(saeulenZiele(LEVELS[0],0,welt.miniaturen,4)[0])
      expect(welt.eis.diagnose.splitter).toBe(0)
      expect(welt.eis.diagnose.stufe).toBe(0)
      expect(((welt.saeulenBloecke[0].children.find(o=>o.name.startsWith('fahrzeug-'))!.userData.huelle as THREE.Group).children[0] as THREE.Mesh)).toHaveProperty('material',welt.eis.treffer)
      nochmal.gibFrei()
    } finally {raume()}
  })
  it('ordnet nach echten Freigaben Fahrzeuge und Zahlen dem nachgerückten Block zu',()=>{
    const {welt,raume}=baueWeltAttrappe()
    try {
      const level={...LEVELS[0],P:1,startY:1000,wellen:[],eliteBossZeit:1000}
      const z=neuerLauf(level,1),anzeige=new WeltDarstellung(welt)
      const tafeln=vi.spyOn(anzeige as unknown as {zeichneTafel:(schild:THREE.Mesh,wert:number)=>void},'zeichneTafel')
      anzeige.zeige(z,new Map(),[],.1,0)
      for(let fall=1;fall<=6;fall++) {
        let ereignisse: ReturnType<typeof schritt> = []
        while (!ereignisse.some(e=>e.art==='einheitFrei')) ereignisse=schritt(z,{x:1},.1)
        anzeige.zeige(z,new Map(),ereignisse,.1,0)
        for(let bild=0;bild<6;bild++) anzeige.zeige(z,new Map(),[],.1,0)
        if (![1,2,5,6].includes(fall)) continue
        for(let j=0;j<welt.saeulen.length;j++) {
          const platz=welt.saeulen.find(s=>Math.abs(s.position.z-saeulenZiele(level,z.saeulenIndex,welt.miniaturen,4)[j])<1e-6)!
          const name=level.saeulen[(z.saeulenIndex+j)%level.saeulen.length]
          expect(platz.children.some(c=>c.children.some(m=>m.name===`fahrzeug-${name}`)),`Fall ${fall}, Platz ${j}`).toBe(true)
          const schild=welt.saeulenSchilder[welt.saeulen.indexOf(platz)]
          const wert=j===0?z.P!:saeulenStartP(level,z.saeulenIndex+j)
          expect(tafeln.mock.calls.some(([s,n])=>s===schild&&n===wert),`Zahl Fall ${fall}, Platz ${j}`).toBe(true)
        }
      }
      anzeige.gibFrei()
    } finally {raume()}
  })
  it('hält Eisfahrzeuge still und setzt das Treffer-Material zurück',()=>{
    const {welt,raume}=baueWeltAttrappe()
    try {
      const anzeige=new WeltDarstellung(welt),z=new SpielLauf().zustand
      anzeige.zeige(z,new Map(),[{art:'saeuleTreffer',menge:1,t:0}],.5,0)
      const rotation=welt.miniaturen[0].rotation.y,hoehe=welt.miniaturen[0].position.y
      expect(welt.eis.treffer.color.equals(welt.eis.grundfarbe)).toBe(false)
      z.t=.1;anzeige.zeige(z,new Map(),[],.5,0)
      anzeige.nachlauf(5)
      expect(welt.miniaturen[0].rotation.y).toBe(rotation)
      expect(welt.miniaturen[0].position.y).toBe(hoehe)
      anzeige.gibFrei()
      expect(welt.eis.treffer.color.equals(welt.eis.grundfarbe)).toBe(true)
    } finally {raume()}
  })
  it('zeichnet zwei gleichzeitig aktive Humvees ohne Fehler',()=>{
    const {welt,raume}=baueWeltAttrappe()
    try {
      const anzeige=new WeltDarstellung(welt),z=new SpielLauf().zustand
      starteEinheit(z,'humvee');starteEinheit(z,'humvee')
      expect(()=>anzeige.zeige(z,new Map(),[],.1,0)).not.toThrow()
      anzeige.gibFrei()
    } finally {raume()}
  })
  it('zerspringt pro Fall genau einmal und lässt die übrigen Blöcke unversehrt',()=>{
    const {welt,raume}=baueWeltAttrappe()
    try {
      const anzeige=new WeltDarstellung(welt),z=new SpielLauf().zustand
      const zer=vi.spyOn(welt.eis,'zerspringe')
      anzeige.zeige(z,new Map(),[],.1,0)
      z.saeulenIndex=1;z.P=1.5;z.PStart=1.5
      const fall={art:'einheitFrei' as const,einheit:'humvee',menge:1,t:0}
      anzeige.zeige(z,new Map(),[fall],.1,0)
      anzeige.zeige(z,new Map(),[fall],.1,0)
      expect(zer).toHaveBeenCalledTimes(1)
      expect(((welt.saeulenBloecke[1].children.find(o=>o.name.startsWith('fahrzeug-'))!.userData.huelle as THREE.Group).children[0] as THREE.Mesh)).toHaveProperty('material',welt.eis.treffer)
      expect(((welt.saeulenBloecke[2].children.find(o=>o.name.startsWith('fahrzeug-'))!.userData.huelle as THREE.Group).children[0] as THREE.Mesh)).toHaveProperty('material',welt.eis.basis)
      expect(welt.eis.auflage.parent).toBe(welt.saeulenBloecke[1])
      anzeige.gibFrei()
    } finally {raume()}
  })
  it('behält Geometrien und Texturen vom ersten bis zum sechsten Fall',()=>{
    const {welt,raume}=baueWeltAttrappe()
    try {
      const anzeige=new WeltDarstellung(welt),z=new SpielLauf().zustand
      const zaehle=()=>{
        const g=new Set<THREE.BufferGeometry>(),t=new Set<THREE.Texture>()
        welt.scene.traverse(o=>{if(o instanceof THREE.Mesh){g.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if('map' in m && m.map instanceof THREE.Texture)t.add(m.map)}})
        return [g.size,t.size]
      }
      anzeige.zeige(z,new Map(),[],.1,0)
      z.saeulenIndex=1;z.P=150;z.PStart=150
      anzeige.zeige(z,new Map(),[{art:'einheitFrei',menge:1,t:0}],.1,0)
      const nachErstem=zaehle()
      for(let i=2;i<=6;i++){z.saeulenIndex=i;anzeige.zeige(z,new Map(),[{art:'einheitFrei',menge:1,t:0}],.1,0)}
      expect(zaehle()).toEqual(nachErstem)
      anzeige.gibFrei()
    } finally {raume()}
  })
  it('führt den Mess-Bot mit S=60 abwechselnd über Mitte und Säule',()=>{
    const bot = new MessBotSteuerung()
    const z = new SpielLauf().zustand
    expect(bot.ziel(z)).toBe(-3)
    z.T = 60
    expect(bot.ziel(z)).toBe(0)
    z.T = 1
    expect(bot.ziel(z)).toBe(-3)
    z.T = 60
    expect(bot.ziel(z)).toBe(3)
    z.saeulenIndex++
    expect(bot.ziel(z)).toBe(0)
  })
  it('dreht den Vorwärtsvektor aus mehreren Lagen zur Säule',()=>{
    const saeuleZ=-11
    for (const [x,figurX,figurZ] of [[0,0,0],[3,-2,0],[-3,2,-3],[0,1,-15]]) {
      const winkel=saeulenBlick(x,figurX,figurZ,saeuleZ)
      const blick=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),winkel)
      const ziel=new THREE.Vector3(BUEHNE.SAEULE_X-x-figurX,0,saeuleZ-figurZ).normalize()
      expect(blick.dot(ziel)).toBeGreaterThan(.95)
    }
  })
  it('zeigt Welle und Horde anhand der Kernereignisse',()=>{
    const lauf=new SpielLauf()
    const welle=lauf.schritt(.1,null)
    expect(welle.some(e=>e.art==='welle')).toBe(true)
    expect(statusZeile(1,lauf.zustand.t,lauf.zustand.T,lauf.zustand.F,lauf.zustand.gestarteteWellen,lauf.zustand.level.wellen.length)).toContain('Welle 1/3')
    lauf.zustand.t=20
    const zweite=lauf.schritt(.1,null)
    expect(zweite.some(e=>e.art==='welle')).toBe(true)
    expect(statusZeile(1,lauf.zustand.t,lauf.zustand.T,lauf.zustand.F,lauf.zustand.gestarteteWellen,lauf.zustand.level.wellen.length)).toContain('Welle 2/3')
  })
  it('malt Horde und Bossleben höchstens viermal pro Sekunde neu',()=>{
    const kontext={clearRect:vi.fn(),fillRect:vi.fn(),fillText:vi.fn()}
    vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>kontext})})
    try {
      const horde=new ZahlAnzeige(1.8,'ceil')
      const boss=new BossBalken(400)
      horde.setze(249.2,0);boss.setze(399.2,0)
      expect(horde.angezeigt).toBe(250)
      expect(boss.angezeigt).toBe(400)
      horde.setze(248.1,.1);boss.setze(300.2,.1)
      expect(horde.angezeigt).toBe(250)
      expect(boss.angezeigt).toBe(400)
      horde.setze(248.1,.25);boss.setze(300.2,.25)
      expect(horde.angezeigt).toBe(249)
      expect(boss.angezeigt).toBe(301)
      horde.gibFrei();boss.gibFrei()
    } finally { vi.unstubAllGlobals() }
  })
  it('erreicht in der 60-s-Messstufe Welle und Säulentreffer',()=>{
    const bot = new MessBotSteuerung()
    const lauf = new SpielLauf(undefined, 12345)
    const arten = new Set<string>()
    for (let i = 0; i < 1800 && lauf.zustand.ergebnis === 'laeuft'; i++) {
      for (const e of lauf.schritt(1/30, bot.ziel(lauf.zustand))) arten.add(e.art)
    }
    expect(arten.has('ausgesandt')).toBe(true)
    expect(arten.has('saeuleTreffer')).toBe(true)
  })
  it('zeigt den Vorrat als höchstens 30 Figuren und lässt ihn beim Senden schrumpfen',()=>{
    expect(formationsFiguren(40)).toHaveLength(30)
    expect(formationsFiguren(10.9)).toHaveLength(10)
    const lauf=new SpielLauf()
    lauf.zustand.T=32
    expect(formationsFiguren(lauf.zustand.T)).toHaveLength(30)
    lauf.schritt(.1,0)
    expect(formationsFiguren(lauf.zustand.T)).toHaveLength(Math.min(Math.floor(lauf.zustand.T),30))
    for(let i=0;i<10;i++)lauf.schritt(.1,0)
    expect(formationsFiguren(lauf.zustand.T).length).toBeLessThan(30)
  })
  it('startet Läufer an Plätzen der vorderen Formationsreihe',()=>{
    let starts:number[]=[]
    const bild:LaufDarstellung={zeige(_z,sichten){starts=[...sichten.values()].flatMap(s=>s.soldaten.map(e=>e.startX))}}
    const lauf=new SpielLauf(undefined,42,bild)
    lauf.zustand.T=20
    for(let i=0;i<5;i++)lauf.schritt(.1,0)
    expect(starts.length).toBeGreaterThan(1)
    expect(new Set(starts).size).toBeGreaterThan(1)
    expect(starts.every(x=>formationsFiguren(20).slice(0,10).some(f=>f.x===x))).toBe(true)
    const laufender:LaufSoldat={nummer:0,pos:0,x:0,ziel:'front',vervielfacht:false,k:1,spur:4,phase:0,aufklappen:1,startX:starts[0]}
    expect(baueLaufSpuren([laufender],1)[0].x).toBe(starts[0])
  })
  it('wechselt rechts in Schießen, beendet es links und begrenzt Mündungsblitze',()=>{
    const treffer={art:'saeuleTreffer' as const,menge:1,t:0}
    expect(formationsBewegung([treffer])).toBe('schiessen')
    expect(formationsBewegung([{art:'eingesammelt',menge:1,t:0}])).toBe('stehen')
    expect(formationsBewegung([])).toBe('stehen')
    const takt=new BlitzTakt()
    expect(takt.schritt(3,0,true)).toBe(12)
    expect(takt.enden).toHaveLength(12)
    for(let i=0;i<100;i++){takt.schritt(.1,i*.1,true);expect(takt.enden.length).toBeLessThanOrEqual(12)}
    takt.schritt(.1,10.1,false)
    expect(takt.enden).toHaveLength(0)
  })
  it('wechselt den Wandtext bei wandStufe und zählt aktive Banner bis einheitEnde herunter',()=>{
    const lauf=new SpielLauf()
    const z=lauf.zustand
    expect(wandText(z)).toBe('×2')
    z.durchWand=99;z.T=20
    let wandEreignis=false
    for(let i=0;i<50&&!wandEreignis;i++) wandEreignis=lauf.schritt(.1,0).some(e=>e.art==='wandStufe')
    expect(wandEreignis).toBe(true)
    expect(wandText(z)).toBe('×3')
    z.P=.1;lauf.x=3
    const frei=lauf.schritt(.1,3)
    expect(frei.some(e=>e.art==='einheitAktiv')).toBe(true)
    expect(bannerEintraege(z.aktiv)).toEqual(['HUMVEE · 14 s'])
    const bannerZ = neuerLauf(LEVELS[0], 1)
    starteEinheit(bannerZ, 'humvee').verstrichen = 2.1
    starteEinheit(bannerZ, 'panzer').verstrichen = 3.5
    expect(bannerEintraege(bannerZ.aktiv)).toEqual(['HUMVEE · 12 s','PANZER · 6 s'])
    for(let i=0;i<10;i++)lauf.schritt(.1,0)
    expect(bannerEintraege(z.aktiv)).toEqual(['HUMVEE · 13 s'])
    z.aktiv[0].verstrichen=gesamtDauer('humvee')-.01
    const ende=lauf.schritt(.1,0)
    expect(ende.some(e=>e.art==='einheitEnde')).toBe(true)
    expect(bannerEintraege(z.aktiv)).toEqual([])
  })
  it('verteilt zehn aufeinanderfolgende Soldaten auf zehn feste Spuren',()=>{
    const folge=[4,7,1,9,2,5,0,8,3,6]
    const soldaten:LaufSoldat[]=folge.map((spur,i)=>({nummer:i,pos:i*.9,x:0,ziel:'front',vervielfacht:false,k:2,spur,phase:i%8,aufklappen:1}))
    const sichtbar=baueLaufSpuren(soldaten,1)
    expect(new Set(sichtbar.map(s=>s.x)).size).toBe(10)
    expect(Math.max(...sichtbar.map(s=>s.x))-Math.min(...sichtbar.map(s=>s.x))).toBeCloseTo(5.4)
    expect(sichtbar.map(s=>s.z)).toEqual(soldaten.map(s=>-s.pos))
    expect(sichtbar.map(s=>s.phase)).toEqual(soldaten.map(s=>s.phase))
  })
  it('vergibt die Spuren beim Aussenden fest und reihum',()=>{
    let spuren:number[]=[]
    const bild:LaufDarstellung={zeige(_z,sichten){spuren=[...sichten.values()].flatMap(s=>s.soldaten.map(e=>e.spur))}}
    const lauf=new SpielLauf(undefined,42,bild)
    lauf.zustand.T=20
    for(let i=0;i<50;i++) lauf.schritt(.1,0)
    expect(spuren.slice(0,10)).toEqual([4,7,1,9,2,5,0,8,3,6])
    expect(spuren[10]).toBe(4)
  })
  it('verdoppelt jeden Läufer seitlich in 0,3 s und hält Paare unter 50 Figuren',()=>{
    const basis:LaufSoldat={nummer:0,pos:5.1,x:0,ziel:'front',vervielfacht:true,k:2,spur:4,phase:2,aufklappen:0}
    expect(baueLaufSpuren([basis],1).map(s=>s.x)).toEqual([-.3,-.3])
    expect(baueLaufSpuren([{...basis,aufklappen:1}],1).map(s=>s.x)).toEqual([-.475,-.125])
    const soldaten:LaufSoldat[]=Array.from({length:80},(_,i)=>({...basis,nummer:i,pos:5+i*.2,spur:i%10,phase:i%8,aufklappen:1}))
    const faktor=spurFaktor(soldaten)
    expect(Number.isInteger(faktor)).toBe(true)
    expect(faktor).toBeGreaterThan(1)
    expect(baueLaufSpuren(soldaten,faktor).length).toBeLessThanOrEqual(50)
    expect(baueLaufSpuren(soldaten,faktor).length%2).toBe(0)
    expect(baueLaufSpuren(soldaten,1)).toHaveLength(50)
  })
  it('behält bei Faktor 2 die Spur, wenn der älteste Läufer verschwindet',()=>{
    const soldaten:LaufSoldat[]=Array.from({length:60},(_,nummer)=>({
      nummer,pos:2+nummer*.1,x:0,ziel:'front',vervielfacht:false,k:1,
      spur:nummer%10,phase:nummer%8,aufklappen:1,
    }))
    const vorher=new Map(baueLaufSpuren(soldaten,2).map(s=>[s.z,s.x]))
    const nachher=new Map(baueLaufSpuren(soldaten.slice(1),2).map(s=>[s.z,s.x]))
    expect(nachher.size).toBe(29)
    for(const [z,x] of nachher) expect(x).toBe(vorher.get(z))
    expect(spurFaktor(soldaten,30)).toBe(spurFaktor(soldaten.slice(1),30))
  })
  it('begrenzt den seitlichen Startwechsel auf 0,3 m je Zehntelsekunde',()=>{
    for(const spur of [0,4,9]) {
      const soldat:LaufSoldat={nummer:spur,pos:0,x:0,ziel:'front',vervielfacht:false,k:1,
        spur,phase:0,aufklappen:1,startX:-2.7}
      const start=baueLaufSpuren([soldat],1)[0].x
      const danach=baueLaufSpuren([{...soldat,pos:.6}],1)[0].x
      expect(start).toBe(-2.7)
      expect(Math.abs(danach-start)).toBeLessThanOrEqual(.30000001)
    }
  })
  it('überspringt unzulässige Zeit und deckelt Sprünge',()=>{
    const l=new SpielLauf()
    l.schritt(0,0);l.schritt(NaN,0)
    expect(l.zustand.t).toBe(0)
    l.schritt(5,0)
    expect(l.zustand.t).toBeCloseTo(.1)
    l.schritt(.1,0,true)
    expect(l.zustand.t).toBeCloseTo(.1)
  })
  it('sendet 10 Sekunden nach Kernformel und hält Sichtgrenzen',()=>{
    const {lauf,gezeigt,ausgesandt}=laufe(0)
    expect(ausgesandt).toBe(9)
    expect(gezeigt).toBe(lauf.zustand.trupps.length)
    expect(lauf.sichtzahlen.formation).toBeLessThanOrEqual(30)
    expect(lauf.sichtzahlen.trupps).toBeLessThanOrEqual(50)
    expect(lauf.sichtzahlen.front).toBeLessThanOrEqual(40)
    expect(lauf.sichtzahlen.zombies).toBeLessThanOrEqual(600)
  })
  it('sammelt links, aber nicht in der Mitte',()=>{
    const links=laufe(-3).lauf
    const mitte=laufe(0).lauf
    expect(links.zustand.T).toBeGreaterThanOrEqual(69)
    expect(links.zustand.T).toBeLessThanOrEqual(71)
    expect(mitte.zustand.T).toBe(1)
    expect(links.zustand.trupps).toHaveLength(0)
  })
  it('beschießt rechts die Säule ohne Aussenden',()=>{
    const {lauf,ausgesandt}=laufe(3,10)
    expect(ausgesandt).toBe(0)
    expect(lauf.zustand.T).toBe(10)
    expect(lauf.zustand.P).toBeLessThan(150)
  })
  it('stellt 600 Zombies mit Loch vor dem Mini-Boss auf',()=>{
    const voll = bossFreieAufstellung(600,0,1.102,73291,-1,true)
    const nachVerlust = bossFreieAufstellung(590,0,1.102,73291,-1,true)
    expect(voll).toHaveLength(600)
    expect(nachVerlust).toHaveLength(590)
    expect(Math.max(...voll.map(e=>e.z))).toBeLessThanOrEqual(0.12+1e-9)
    expect(voll.every(e=>Math.hypot(e.x,e.z+1)>=1.102)).toBe(true)
    for (const n of [1,300,590,600]) {
      const teil=bossFreieAufstellung(n,0,1.102,73291,-1,true)
      expect(teil).toHaveLength(n)
      expect(teil).toEqual(voll.slice(0,n))
    }
  })
})
