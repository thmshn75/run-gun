import { describe, expect, it, vi } from 'vitest'
import { SpielLauf, WeltDarstellung, baueLaufSpuren, spurFaktor, formationsFiguren, formationsBewegung, BlitzTakt, wandText, ZAHL_HOEHEN, bossBewegung, type LaufSoldat, type LaufDarstellung, type BossStand } from '../src/v3d/lauf'
import type { Zustand } from '../src/v3d/rechnung'
import { bannerEintraege } from '../src/v3d/oberflaeche'
import { MessBotSteuerung } from '../src/v3d/messung'
import { bossFreieAufstellung } from '../src/v3d/bosse'
import { saeulenBlick } from '../src/v3d/lauf'
import { BUEHNE } from '../src/v3d/balance3d'
import { statusZeile } from '../src/v3d/oberflaeche'
import * as THREE from 'three'
import { BossBalken, ZahlAnzeige } from '../src/v3d/anzeigen'
import { ZombieMasse, type ZombieBau } from '../src/v3d/figuren'
import { SoldatenMasse, type SoldatenBau } from '../src/v3d/soldaten'
import type { Welt } from '../src/v3d/szene'

function baueWeltAttrappe() {
  const kontext={clearRect:vi.fn(),fillRect:vi.fn(),fillText:vi.fn(),createRadialGradient:()=>({addColorStop:vi.fn()})}
  vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>kontext})})
  const form=()=>new THREE.BoxGeometry(.3,2,.3)
  const zombieBau:ZombieBau={formen:[form()],materialien:[new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial()],bemalungen:[],dauer:1.1,dreiecke:12}
  const soldatBau:SoldatenBau={formen:{laufen:[form()],stehen:[form()],schiessen:[form()],fallen:[form(),form(),form(),form()]},material:new THREE.MeshStandardMaterial(),atlas:new THREE.Texture(),dauer:{laufen:1,stehen:1,schiessen:1,fallen:1},backzeitMs:0,pruefung:{debugMuzzle:[0,1.3,-.5]}}
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),truppe=new SoldatenMasse(soldatBau,40),laufTrupp=new SoldatenMasse(soldatBau,50),front=new SoldatenMasse(soldatBau,40),zombieMasse=new ZombieMasse(zombieBau,zombieBau.materialien,600)
  const wand=new THREE.Group(),saeule=new THREE.Group(),saeulenInnen=new THREE.Group()
  const bossObjekt=new THREE.Group(),bossMaterial=new THREE.MeshStandardMaterial({color:'#777777'})
  bossObjekt.add(new THREE.Mesh(form(),bossMaterial))
  const miniSpiele=vi.fn(),eliteSpiele=vi.fn()
  const miniboss={objekt:bossObjekt,breite:1,spiele:miniSpiele,aktualisiere:vi.fn(),gibFrei:vi.fn()}
  const eliteboss={objekt:new THREE.Group(),breite:1,spiele:eliteSpiele,aktualisiere:vi.fn(),gibFrei:vi.fn()}
  scene.add(truppe.gruppe,laufTrupp.gruppe,front.gruppe,zombieMasse.gruppe,wand,saeule,bossObjekt,eliteboss.objekt)
  const welt={scene,camera,bemalungen:[new THREE.Texture(),new THREE.Texture()],wasser:{} as Welt['wasser'],zombieBau,zombieMasse,nahaufnahme:false,soldatNahaufnahme:false,soldatBau,truppe,laufTrupp,front,laufGruppen:[truppe.gruppe,laufTrupp.gruppe,front.gruppe,zombieMasse.gruppe],plusSchilder:[],wand,saeule,saeulenInnen,miniboss,eliteboss} as Welt
  return {welt,miniSpiele,bossMaterial,raume:()=>vi.unstubAllGlobals()}
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
  it('zeigt Frontkampf und gedeckelte Fall-Pools und räumt eigene Netze auf',()=>{
    const {welt,miniSpiele,bossMaterial,raume}=baueWeltAttrappe()
    try {
      const matFrei=vi.spyOn(welt.soldatBau.material,'dispose'),zombieFrei=vi.spyOn(welt.zombieBau.materialien[0],'dispose')
      const anzeige=new WeltDarstellung(welt,7),lauf=new SpielLauf(undefined,7,anzeige),z=lauf.zustand
      z.F=40;z.Z=100;z.y=20;z.miniBoss.imFeld=true
      anzeige.zeige(z,new Map(),[{art:'zombieGefallen',menge:1000,t:0},{art:'soldatGefallen',menge:1000,t:0}],.1,0)
      expect(anzeige.diag().frontBewegung).toBe('schiessen')
      expect(anzeige.diag().frontBlitze).toBeGreaterThan(0)
      expect(anzeige.diag().frontBlitze).toBeLessThanOrEqual(8)
      expect(anzeige.diag().fallZombiesAktiv).toBeLessThanOrEqual(24)
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
      const vorEnde=anzeige.diag().fallZombiesEntstanden
      anzeige.zeige(z,new Map(),[{art:'zombieGefallen',menge:1000,t:0}],.1,0)
      expect(anzeige.diag().fallZombiesEntstanden).toBe(vorEnde)
      anzeige.nachlauf(2)
      expect(anzeige.diag().fallZombiesAktiv).toBe(0)
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
      expect(vorn.diag().fallZombiesEntstanden).toBe(0)
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
  it('trennt die Hordenzahl vertikal von der Frontzahl',()=>{
    expect(ZAHL_HOEHEN.horde).toBe(4.6)
    expect(ZAHL_HOEHEN.horde-ZAHL_HOEHEN.front).toBeGreaterThanOrEqual(1.5)
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
    for (const [x,figurX,figurZ] of [[0,0,0],[3,-2,0],[-3,2,-3],[0,1,-15]]) {
      const winkel=saeulenBlick(x,figurX,figurZ)
      const blick=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),winkel)
      const ziel=new THREE.Vector3(BUEHNE.SAEULE_X-x-figurX,0,-12-figurZ).normalize()
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
    expect(bannerEintraege(z.aktiv)).toEqual(['HUMVEE · 30 s'])
    expect(bannerEintraege([{einheit:'humvee',rest:29.9},{einheit:'panzer',rest:3.2}])).toEqual(['HUMVEE · 30 s','PANZER · 4 s'])
    for(let i=0;i<10;i++)lauf.schritt(.1,0)
    expect(bannerEintraege(z.aktiv)).toEqual(['HUMVEE · 29 s'])
    z.aktiv[0].rest=.01
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
