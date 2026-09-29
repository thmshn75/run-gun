import { describe, expect, it } from 'vitest'
import { SpielLauf, type LaufDarstellung } from '../src/v3d/lauf'
import type { Zustand } from '../src/v3d/rechnung'
import { bossFreieAufstellung } from '../src/v3d/bosse'

function laufe(ziel: number, dauer=10) {
  let gezeigt=0, ausgesandt=0, einheiten=0
  const bild: LaufDarstellung={zeige(z:Zustand, s, events){gezeigt=s.size;ausgesandt+=events.filter(e=>e.art==='ausgesandt').reduce((n,e)=>n+e.menge,0);einheiten+=events.filter(e=>e.art==='einheitFrei').length}}
  const lauf=new SpielLauf(undefined,42,bild)
  for(let i=0;i<dauer*10;i++) lauf.schritt(.1,ziel)
  return {lauf,gezeigt,ausgesandt,einheiten}
}
describe('3D-Lauf',()=>{
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
    expect(ausgesandt).toBeGreaterThanOrEqual(27)
    expect(ausgesandt).toBeLessThanOrEqual(33)
    expect(gezeigt).toBe(lauf.zustand.trupps.length)
    expect(lauf.sichtzahlen.formation).toBeLessThanOrEqual(30)
    expect(lauf.sichtzahlen.trupps).toBeLessThanOrEqual(50)
    expect(lauf.sichtzahlen.front).toBeLessThanOrEqual(40)
    expect(lauf.sichtzahlen.zombies).toBeLessThanOrEqual(600)
  })
  it('sammelt links, aber nicht in der Mitte',()=>{
    const links=laufe(-3).lauf
    const mitte=laufe(0).lauf
    expect(links.zustand.T).toBeGreaterThanOrEqual(29)
    expect(links.zustand.T).toBeLessThanOrEqual(31)
    expect(mitte.zustand.T).toBe(10)
  })
  it('schickt rechts zur Säule und wechselt nach Freigabe',()=>{
    const {lauf,einheiten}=laufe(3,80)
    expect(einheiten).toBeGreaterThan(0)
    expect(lauf.zustand.saeulenIndex).toBeGreaterThan(0)
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
