import { BUEHNE, DARSTELLUNG, FIGUREN, LEVELS, type Level } from './balance3d'
import { neuerLauf, schritt, type Ereignis, type Trupp, type Zustand } from './rechnung'
import { glaetteX, kernX } from './steuerung'
import { bossFreieAufstellung } from './bosse'
import type { Welt } from './szene'
import type { SoldatEintrag } from './soldaten'
import { ZahlAnzeige } from './anzeigen'
import { setzeSchildText } from './schilder'
import * as THREE from 'three'

const SPUR_FOLGE = [4, 7, 1, 9, 2, 5, 0, 8, 3, 6] as const
type Sicht = { x: number; soldaten: { spur: number; phase: number }[]; vervielfachtUm?: number }
export interface LaufSoldat { pos: number; x: number; ziel: Trupp['ziel']; vervielfacht: boolean; k: number; spur: number; phase: number; aufklappen: number }

// Ein Kernsoldat behält seine Spur und wird hinter der Wand als k Figuren gezeigt.
export function baueLaufSpuren(soldaten: readonly LaufSoldat[], faktor: number, max = DARSTELLUNG.TRUPPS_MAX): SoldatEintrag[] {
  const gruppen: SoldatEintrag[][] = []
  let anzahl = 0
  const gewicht = Math.max(1, Math.floor(faktor))
  // Bei voller Sichtgrenze fallen die ältesten Läufer zuerst weg; Paare bleiben ganz.
  for (let i = soldaten.length - 1; i >= 0; i--) {
    if (i % gewicht !== 0) continue
    const s = soldaten[i], kopien = s.vervielfacht ? s.k : 1
    if (anzahl + kopien > max) break
    const spuren = 10
    const spur = s.spur
    const spurX = s.x + (spur - (spuren - 1) / 2) * .6
    const gruppe: SoldatEintrag[] = []
    for (let j = 0; j < kopien; j++) gruppe.push({
      x: spurX + (j - (kopien - 1) / 2) * .35 * s.aufklappen,
      z: -s.pos, dreh: 0, bewegung: 'laufen',
      phase: (s.phase + j) % FIGUREN.SOLDAT_PHASENGRUPPEN,
    })
    gruppen.push(gruppe)
    anzahl += kopien
  }
  return gruppen.reverse().flat()
}

export function spurFaktor(soldaten: readonly LaufSoldat[], max = DARSTELLUNG.TRUPPS_MAX): number {
  let faktor = 1
  while (soldaten.reduce((n, s, i) => n + (i % faktor === 0 ? s.vervielfacht ? s.k : 1 : 0), 0) > max) faktor++
  return faktor
}
export interface LaufDarstellung { zeige(z: Zustand, trupps: ReadonlyMap<Trupp, Sicht>, ereignisse: Ereignis[], dt: number, x: number): void; gibFrei?(): void }
export class SpielLauf {
  zustand: Zustand
  x = 0
  private sichten = new Map<Trupp, Sicht>()
  private soldatNummer = 0
  private darstellung?: LaufDarstellung
  constructor(level: Level = LEVELS[0], seed = Date.now(), darstellung?: LaufDarstellung) { this.zustand = neuerLauf(level, seed); this.darstellung = darstellung }
  schritt(dt: number, ziel: number | null, pausiert = false): Ereignis[] {
    if (pausiert || !Number.isFinite(dt) || dt <= 0 || this.zustand.ergebnis !== 'laeuft') return []
    dt = Math.min(dt, 0.1)
    if (ziel !== null) this.x = glaetteX(this.x, ziel, dt)
    const alt = new Set(this.zustand.trupps)
    const ereignisse = schritt(this.zustand, { x: kernX(this.x) }, dt)
    for (const trupp of this.zustand.trupps) {
      if (!alt.has(trupp)) this.sichten.set(trupp, { x: this.x, soldaten: Array.from({length: trupp.anzahl / trupp.k}, () => {
        const nummer = this.soldatNummer++
        return { spur: SPUR_FOLGE[nummer % SPUR_FOLGE.length], phase: nummer % FIGUREN.SOLDAT_PHASENGRUPPEN }
      }) })
      else if (trupp.vervielfacht && this.sichten.get(trupp)?.vervielfachtUm === undefined) this.sichten.get(trupp)!.vervielfachtUm = this.zustand.t
    }
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
  private figurFaktor = 1
  private faktorZeit = -Infinity
  private aufblenden: THREE.Sprite[]
  private aufblendTextur: THREE.CanvasTexture
  private aufblendMaterial: THREE.SpriteMaterial
  private innenSichtbar = true
  private letzterFaktor = NaN
  constructor(welt: Welt) {
    this.welt=welt
    const canvas = document.createElement('canvas')
    canvas.width = 128; canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.font = 'bold 48px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(`×${LEVELS[0].kStart}`, 64, 32)
    this.aufblendTextur = new THREE.CanvasTexture(canvas)
    this.aufblendMaterial = new THREE.SpriteMaterial({map:this.aufblendTextur,transparent:true,depthTest:false})
    this.aufblenden = Array.from({length:8},()=>{const s=new THREE.Sprite(this.aufblendMaterial);s.visible=false;s.scale.set(1.5,.75,1);s.renderOrder=11;welt.scene.add(s);return s})
    welt.scene.add(this.truppeZahl.objekt, this.frontZahl.objekt, this.saeuleZahl.objekt)
    welt.laufGruppen.push(this.truppeZahl.objekt, this.frontZahl.objekt, this.saeuleZahl.objekt,...this.aufblenden)
  }
  zeige(z: Zustand, trupps: ReadonlyMap<Trupp, Sicht>, ereignisse: Ereignis[], dt: number, x: number): void {
    const w = this.welt
    const t = z.t
    if (z.kAktuell !== this.letzterFaktor) {
      this.letzterFaktor = z.kAktuell
      setzeSchildText(w.wand, { breite: 2 * BUEHNE.MITTE_HALB, hoehe: BUEHNE.WAND_HOEHE, text: `×${z.kAktuell}`, farbe: BUEHNE.WAND_FARBE })
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
    const laufSoldaten: LaufSoldat[] = []
    for (const [trupp,sicht] of trupps) {
      const zielX = trupp.pos < z.level.wand ? sicht.x : 0
      sicht.x += Math.max(-8*dt,Math.min(8*dt,zielX-sicht.x))
      if (trupp.ziel === 'front') sicht.x = Math.max(-2.8, Math.min(2.8, sicht.x))
      const pos = Math.min(trupp.pos,Math.max(1,z.y-1.5))
      if (trupp.pos >= Math.max(1,z.y-1.5)) continue
      for (const soldat of sicht.soldaten) laufSoldaten.push({pos, x:sicht.x, ziel:trupp.ziel, vervielfacht:trupp.vervielfacht,
        k:trupp.k, spur:soldat.spur, phase:soldat.phase,
        aufklappen:sicht.vervielfachtUm === undefined ? 1 : Math.min(1, Math.max(0, (t-sicht.vervielfachtUm)/.3))})
    }
    if (t-this.faktorZeit >= 2) {
      this.figurFaktor = Math.max(this.figurFaktor, spurFaktor(laufSoldaten))
      this.faktorZeit = t
    }
    const sichtbar = baueLaufSpuren(laufSoldaten, this.figurFaktor)
    const frische = laufSoldaten.filter(s => s.aufklappen < 1)
    this.aufblenden.forEach((sprite,i)=>{const soldat=frische[i];sprite.visible=!!soldat;if(soldat)sprite.position.set(soldat.x,3.2,-soldat.pos)})
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
    this.aufblenden.forEach(s=>s.removeFromParent())
    this.aufblendMaterial.dispose(); this.aufblendTextur.dispose()
    this.welt.scene.remove(this.truppeZahl.objekt, this.frontZahl.objekt, this.saeuleZahl.objekt)
    this.welt.laufGruppen = this.welt.laufGruppen.filter(obj => obj !== this.truppeZahl.objekt && obj !== this.frontZahl.objekt && obj !== this.saeuleZahl.objekt && !this.aufblenden.includes(obj as THREE.Sprite))
  }
}
