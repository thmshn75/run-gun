import { describe, expect, it } from 'vitest'
import { SpielLauf, baueLaufSpuren, spurFaktor, formationsFiguren, formationsBewegung, BlitzTakt, wandText, type LaufSoldat, type LaufDarstellung } from '../src/v3d/lauf'
import type { Zustand } from '../src/v3d/rechnung'
import { bannerEintraege } from '../src/v3d/oberflaeche'
import { MessBotSteuerung } from '../src/v3d/messung'
import { bossFreieAufstellung } from '../src/v3d/bosse'

function laufe(ziel: number, dauer=10) {
  let gezeigt=0, ausgesandt=0, einheiten=0
  const bild: LaufDarstellung={zeige(z:Zustand, s, events){gezeigt=s.size;ausgesandt+=events.filter(e=>e.art==='ausgesandt').reduce((n,e)=>n+e.menge,0);einheiten+=events.filter(e=>e.art==='einheitFrei').length}}
  const lauf=new SpielLauf(undefined,42,bild)
  lauf.x=ziel
  for(let i=0;i<dauer*10;i++) lauf.schritt(.1,ziel)
  return {lauf,gezeigt,ausgesandt,einheiten}
}
describe('3D-Lauf',()=>{
  it('führt den Mess-Bot mit S=60 abwechselnd über Mitte und Säule',()=>{
    const bot = new MessBotSteuerung()
    const z = new SpielLauf().zustand
    expect(bot.ziel(z)).toBe(-3)
    z.T = 60
    expect(bot.ziel(z)).toBe(0)
    z.T = .5
    expect(bot.ziel(z)).toBe(-3)
    z.T = 60
    expect(bot.ziel(z)).toBe(3)
    z.saeulenIndex++
    expect(bot.ziel(z)).toBe(0)
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
    const laufender:LaufSoldat={pos:0,x:0,ziel:'front',vervielfacht:false,k:1,spur:4,phase:0,aufklappen:1,startX:starts[0]}
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
    const soldaten:LaufSoldat[]=folge.map((spur,i)=>({pos:i*.9,x:0,ziel:'front',vervielfacht:false,k:2,spur,phase:i%8,aufklappen:1}))
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
    const basis:LaufSoldat={pos:5.1,x:0,ziel:'front',vervielfacht:true,k:2,spur:4,phase:2,aufklappen:0}
    expect(baueLaufSpuren([basis],1).map(s=>s.x)).toEqual([-.3,-.3])
    expect(baueLaufSpuren([{...basis,aufklappen:1}],1).map(s=>s.x)).toEqual([-.475,-.125])
    const soldaten:LaufSoldat[]=Array.from({length:80},(_,i)=>({...basis,pos:5+i*.2,spur:i%10,phase:i%8,aufklappen:1}))
    const faktor=spurFaktor(soldaten)
    expect(Number.isInteger(faktor)).toBe(true)
    expect(faktor).toBeGreaterThan(1)
    expect(baueLaufSpuren(soldaten,faktor).length).toBeLessThanOrEqual(50)
    expect(baueLaufSpuren(soldaten,faktor).length%2).toBe(0)
    expect(baueLaufSpuren(soldaten,1)).toHaveLength(50)
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
    expect(ausgesandt).toBe(10)
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
    expect(mitte.zustand.T).toBe(0)
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
    expect(Math.max(...voll.map(e=>e.z))).toBe(0)
    expect(voll.every(e=>Math.hypot(e.x,e.z+1)>=1.102)).toBe(true)
  })
})
