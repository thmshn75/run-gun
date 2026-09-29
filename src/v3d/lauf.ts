import { BUEHNE, DARSTELLUNG, FIGUREN, LEVELS, type Level } from './balance3d'
import { neuerLauf, schritt, type Ereignis, type Trupp, type Zustand } from './rechnung'
import { glaetteX, kernX } from './steuerung'
import { bossFreieAufstellung } from './bosse'
import type { Welt } from './szene'
import type { SoldatEintrag } from './soldaten'
import { ZahlAnzeige } from './anzeigen'
import { setzeSchildText } from './schilder'

type Sicht = { x: number; phase: number }
export interface LaufDarstellung { zeige(z: Zustand, trupps: ReadonlyMap<Trupp, Sicht>, ereignisse: Ereignis[], dt: number, x: number): void; gibFrei?(): void }
export class SpielLauf {
  zustand: Zustand
  x = 0
  private sichten = new Map<Trupp, Sicht>()
  private phase = 0
  private darstellung?: LaufDarstellung
  constructor(level: Level = LEVELS[0], seed = Date.now(), darstellung?: LaufDarstellung) { this.zustand = neuerLauf(level, seed); this.darstellung = darstellung }
  schritt(dt: number, ziel: number | null, pausiert = false): Ereignis[] {
    if (pausiert || !Number.isFinite(dt) || dt <= 0 || this.zustand.ergebnis !== 'laeuft') return []
    dt = Math.min(dt, 0.1)
    if (ziel !== null) this.x = glaetteX(this.x, ziel, dt)
    const alt = new Set(this.zustand.trupps)
    const ereignisse = schritt(this.zustand, { x: kernX(this.x) }, dt)
    for (const trupp of this.zustand.trupps) if (!alt.has(trupp)) this.sichten.set(trupp, { x: this.x, phase: this.phase++ % FIGUREN.SOLDAT_PHASENGRUPPEN })
    for (const trupp of this.sichten.keys()) if (!this.zustand.trupps.includes(trupp)) this.sichten.delete(trupp)
    this.darstellung?.zeige(this.zustand, this.sichten, ereignisse, dt, this.x)
    return ereignisse
  }
  gibLaufFrei(): void { this.darstellung?.gibFrei?.(); this.sichten.clear() }
  get sichtzahlen() { return { formation: Math.min(Math.floor(this.zustand.T), 30), trupps: Math.min(50, this.zustand.trupps.reduce((n,t)=>n+Math.min(t.anzahl,10),0)), front: Math.min(Math.floor(this.zustand.F),40), zombies: Math.min(Math.ceil(this.zustand.Z),600) } }
}

export class WeltDarstellung implements LaufDarstellung {
  private welt: Welt
  private truppeZahl = new ZahlAnzeige()
  private frontZahl = new ZahlAnzeige()
  private saeuleZahl = new ZahlAnzeige(1.3)
  private letzteHorde = -1
  private hordeZeit = -Infinity
  private tempo = 2
  private plusOffset = 0
  private letzteSaeule = -1
  private letzteT = -1
  private letzteF = -1
  private letzteTrupps = ''
  private innenSichtbar = true
  private letzterFaktor = NaN
  constructor(welt: Welt) {
    this.welt=welt
    welt.scene.add(this.truppeZahl.objekt, this.frontZahl.objekt, this.saeuleZahl.objekt)
    welt.laufGruppen.push(this.truppeZahl.objekt, this.frontZahl.objekt, this.saeuleZahl.objekt)
  }
  zeige(z: Zustand, trupps: ReadonlyMap<Trupp, Sicht>, ereignisse: Ereignis[], dt: number, x: number): void {
    const w = this.welt
    const t = z.t
    if (z.level.k !== this.letzterFaktor) {
      this.letzterFaktor = z.level.k
      setzeSchildText(w.wand, { breite: 2 * BUEHNE.MITTE_HALB, hoehe: BUEHNE.WAND_HOEHE, text: `×${z.level.k}`, farbe: BUEHNE.WAND_FARBE })
    }
    const gesammelt = ereignisse.some(e => e.art === 'eingesammelt')
    const soll = gesammelt ? DARSTELLUNG.SCHILDER_TEMPO_SCHNELL : DARSTELLUNG.SCHILDER_TEMPO_LANGSAM
    this.tempo += Math.max(-24 * dt, Math.min(24 * dt, soll - this.tempo))
    this.plusOffset = (this.plusOffset + this.tempo * dt) % BUEHNE.PLUS_ABSTAND
    w.plusSchilder.forEach((schild,i) => {
      schild.position.z = -(i + 1) * BUEHNE.PLUS_ABSTAND + this.plusOffset
      schild.visible = schild.position.z < 0
      schild.scale.setScalar(gesammelt && schild.position.z > -1 ? 1.1 : 1)
    })
    this.truppeZahl.setze(z.T,t); this.truppeZahl.objekt.position.set(x, 2.8, 1)
    this.frontZahl.setze(z.F,t); this.frontZahl.objekt.position.set(0, 2.8, Math.min(-1, -z.y+2.5))
    const formation = Math.min(DARSTELLUNG.FORMATION_MAX, Math.floor(z.T))
    if (formation !== this.letzteT) {
      w.truppe.setze(Array.from({length:formation},(_,i):SoldatEintrag=>({x:(i%10-4.5)*.6,z:Math.floor(i/10)*.7,dreh:0,bewegung:'stehen',phase:i%8})))
      this.letzteT = formation
    }
    w.truppe.gruppe.position.x = x
    const front = Math.min(DARSTELLUNG.FRONT_MAX,Math.floor(z.F))
    if (front !== this.letzteF) {
      w.front.setze(Array.from({length:front},(_,i):SoldatEintrag=>({x:(i%10-4.5)*.6,z:Math.floor(i/10)*.7,dreh:0,bewegung:'stehen',phase:i%8})))
      this.letzteF = front
    }
    w.front.gruppe.position.z = Math.min(-3.1,-z.y+1.5)
    const eintraege: SoldatEintrag[] = []
    for (const [trupp,sicht] of trupps) {
      const zielX = trupp.pos < z.level.wand ? sicht.x : trupp.ziel === 'saeule' ? BUEHNE.SAEULE_X : 0
      sicht.x += Math.max(-8*dt,Math.min(8*dt,zielX-sicht.x))
      if (trupp.ziel === 'front') sicht.x = Math.max(-2.8, Math.min(2.8, sicht.x))
      const pos = trupp.ziel === 'front' ? Math.min(trupp.pos,Math.max(1,z.y-1.5)) : trupp.pos
      if (trupp.ziel === 'front' && trupp.pos >= Math.max(1,z.y-1.5)) continue
      for (let i=0;i<Math.min(10,trupp.anzahl);i++) eintraege.push({x:sicht.x+(i%5-2)*.42,z:-pos+Math.floor(i/5)*.5,dreh:0,bewegung:'laufen',phase:(sicht.phase+i)%8})
    }
    const sichtbar = eintraege.slice(0,DARSTELLUNG.TRUPPS_MAX)
    const key = sichtbar.map(e=>`${e.x},${e.z},${e.phase}`).join(';')
    if (key !== this.letzteTrupps) {w.laufTrupp.setze(sichtbar); this.letzteTrupps=key}
    const zombies = z.y <= 0 ? 0 : Math.min(DARSTELLUNG.HORDE_MAX,Math.ceil(z.Z))
    if (zombies !== this.letzteHorde && t-this.hordeZeit >= .25) {
      w.zombieMasse.setze(zombies ? bossFreieAufstellung(zombies,0,FIGUREN.MINIBOSS_FREIRADIUS,73291,-1,true) : [])
      this.letzteHorde=zombies;this.hordeZeit=t
    }
    w.zombieMasse.gruppe.position.z=-z.y
    w.miniboss.objekt.visible=z.y>0&&z.miniBoss.imFeld&&z.miniBoss.B>0
    w.miniboss.objekt.position.z=-z.y-1
    w.eliteboss.objekt.visible=z.y>0&&z.eliteBoss.imFeld&&z.eliteBoss.B>0
    const spalten=Math.floor((FIGUREN.ZOMBIE_X_MAX-FIGUREN.ZOMBIE_X_MIN)/FIGUREN.ZOMBIE_SPALTENABSTAND)+1
    w.eliteboss.objekt.position.z=-z.y-(zombies?Math.ceil(zombies/spalten)*FIGUREN.ZOMBIE_REIHENABSTAND+2:0)
    w.saeule.visible=z.P!==null
    if (ereignisse.some(e => e.art === 'einheitFrei')) this.innenSichtbar = false
    if (z.saeulenIndex !== this.letzteSaeule) {this.letzteSaeule=z.saeulenIndex; this.innenSichtbar = z.P !== null}
    w.saeulenInnen.visible=z.P!==null && this.innenSichtbar
    if (z.P!==null) {this.saeuleZahl.setze(Math.ceil(z.P),t);this.saeuleZahl.objekt.visible=true}
    else this.saeuleZahl.objekt.visible=false
    this.saeuleZahl.objekt.position.set(BUEHNE.SAEULE_X,4.7,-12)
  }
  gibFrei():void {
    this.truppeZahl.gibFrei(); this.frontZahl.gibFrei(); this.saeuleZahl.gibFrei()
    this.welt.laufGruppen = this.welt.laufGruppen.filter(obj => obj !== this.truppeZahl.objekt && obj !== this.frontZahl.objekt && obj !== this.saeuleZahl.objekt)
  }
}
