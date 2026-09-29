import { describe, expect, it } from 'vitest'
import { SpielLauf, baueLaufSpuren, spurFaktor, type LaufSoldat, type LaufDarstellung } from '../src/v3d/lauf'
import type { Zustand } from '../src/v3d/rechnung'
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
