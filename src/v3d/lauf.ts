import { BUEHNE, DARSTELLUNG, FAHRZEUGE, FIGUREN, LEVELS, type Level } from './balance3d'
import { neuerLauf, schritt, type Ereignis, type Trupp, type Zustand } from './rechnung'
import { glaetteX, kernX } from './steuerung'
import { bossFreieAufstellung } from './bosse'
import type { Welt } from './szene'
import type { SoldatEintrag } from './soldaten'
import { SoldatenMasse } from './soldaten'
import { BossBalken, Muendungsblitze, ZahlAnzeige } from './anzeigen'
import { setzeSchildText } from './schilder'
import { setzeEinheitenBanner } from './oberflaeche'
import * as THREE from 'three'

const SPUR_FOLGE = [4, 7, 1, 9, 2, 5, 0, 8, 3, 6] as const
export const ZAHL_HOEHEN = { front: 2.8, horde: 2.4 } as const
type Sicht = { x: number; soldaten: { nummer: number; spur: number; phase: number; startX: number }[]; vervielfachtUm?: number }
export interface LaufSoldat { nummer: number; pos: number; x: number; ziel: Trupp['ziel']; vervielfacht: boolean; k: number; spur: number; phase: number; aufklappen: number; startX?: number }

export function formationsFiguren(T: number, bewegung: SoldatEintrag['bewegung'] = 'stehen'): SoldatEintrag[] {
  return Array.from({ length: Math.min(DARSTELLUNG.FORMATION_MAX, Math.max(0, Math.floor(T))) }, (_, i) => ({
    x: (i % 10 - 4.5) * .6, z: Math.floor(i / 10) * .7, dreh: 0, bewegung, phase: i % 8,
  }))
}

export function saeulenBlick(x: number, figurX: number, figurZ: number): number {
  const dx = BUEHNE.SAEULE_X - x - figurX
  const dz = -12 - figurZ
  return Math.atan2(-dx, -dz)
}

export function formationsBewegung(ereignisse: readonly Ereignis[]): SoldatEintrag['bewegung'] {
  return ereignisse.some(e => e.art === 'saeuleTreffer') ? 'schiessen' : 'stehen'
}

export function wandText(z: Zustand): string { return `×${z.kAktuell}` }

export class BlitzTakt {
  readonly enden: number[] = []
  private rest = 0
  schritt(dt: number, zeit: number, schiesst: boolean): number {
    for (let i = this.enden.length - 1; i >= 0; i--) if (this.enden[i] <= zeit) this.enden.splice(i, 1)
    if (!schiesst) { this.rest = 0; return 0 }
    this.rest += dt * DARSTELLUNG.BLITZE_PRO_SEKUNDE
    let neu = 0
    while (this.rest >= 1) {
      this.rest--
      if (this.enden.length < DARSTELLUNG.BLITZE_MAX) { this.enden.push(zeit + DARSTELLUNG.BLITZ_DAUER); neu++ }
    }
    return neu
  }
}

// Ein Kernsoldat behält seine Spur und wird hinter der Wand als k Figuren gezeigt.
export function baueLaufSpuren(soldaten: readonly LaufSoldat[], faktor: number, max = DARSTELLUNG.TRUPPS_MAX): SoldatEintrag[] {
  const gruppen: SoldatEintrag[][] = []
  let anzahl = 0
  const gewicht = Math.max(1, Math.floor(faktor))
  // Bei voller Sichtgrenze fallen die ältesten Läufer zuerst weg; Paare bleiben ganz.
  for (let i = soldaten.length - 1; i >= 0; i--) {
    if (soldaten[i].nummer % gewicht !== 0) continue
    const s = soldaten[i], kopien = s.vervielfacht ? s.k : 1
    if (anzahl + kopien > max) break
    const spuren = 10
    const spur = s.spur
    const spurX = s.x + (spur - (spuren - 1) / 2) * .6
    const startX = s.startX ?? spurX
    const seitweg = THREE.MathUtils.clamp(spurX - startX, -s.pos * .5, s.pos * .5)
    const gruppe: SoldatEintrag[] = []
    for (let j = 0; j < kopien; j++) gruppe.push({
      x: startX + seitweg + (j - (kopien - 1) / 2) * .35 * s.aufklappen,
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
  while (soldaten.reduce((n, s) => n + (s.nummer % faktor === 0 ? s.vervielfacht ? s.k : 1 : 0), 0) > max) faktor++
  return faktor
}
export function hatKontakt(z: Zustand): boolean {
  return z.F > 0 && (z.Z > 0 || (z.miniBoss.imFeld && z.miniBoss.B > 0) || (z.eliteBoss.imFeld && z.eliteBoss.B > 0))
}

export type BossZustand = 'weg' | 'laeuft' | 'kaempft' | 'stirbt'
export interface BossStand { zustand: BossZustand; clip: string; einmal: boolean; sichtbar: boolean; balken: boolean; z: number; todSeit: number }
export function bossBewegung(vorher: BossStand, eingabe: { t: number; y: number; kontakt: boolean; imFeld: boolean; B: number; todesDauer: number }): BossStand {
  const { t, y, kontakt, imFeld, B, todesDauer } = eingabe
  if (vorher.zustand === 'stirbt') return t - vorher.todSeit >= Math.max(2, todesDauer)
    ? { ...vorher, zustand: 'weg', sichtbar: false, balken: false }
    : vorher
  if (vorher.zustand !== 'weg' && B <= 0) return { zustand: 'stirbt', clip: 'death_1', einmal: true, sichtbar: true, balken: false, z: vorher.z, todSeit: t }
  if (!imFeld || B <= 0 || y <= 0) return { zustand: 'weg', clip: 'walk', einmal: false, sichtbar: false, balken: false, z: -y - 1, todSeit: -Infinity }
  const kampf = kontakt
  return { zustand: kampf ? 'kaempft' : 'laeuft', clip: kampf ? 'attack_1' : 'walk', einmal: false, sichtbar: true, balken: true, z: -y - 1, todSeit: -Infinity }
}

export interface LaufDiag { frontBewegung: SoldatEintrag['bewegung']; frontBlitze: number; fallSoldatenAktiv: number; fallSoldatenEntstanden: number; bossZustand: BossZustand }
export interface LaufDarstellung { zeige(z: Zustand, trupps: ReadonlyMap<Trupp, Sicht>, ereignisse: Ereignis[], dt: number, x: number): void; nachlauf?(dt: number): void; diag?(): Readonly<LaufDiag>; setzeSeed?(seed: number): void; gibFrei?(): void }
const weltDarstellungen = new WeakMap<Welt, WeltDarstellung>()
const bossFarben = new WeakMap<THREE.Object3D, Map<THREE.MeshStandardMaterial, THREE.Color>>()
function originalBossFarben(objekt: THREE.Object3D): Map<THREE.MeshStandardMaterial, THREE.Color> {
  let farben = bossFarben.get(objekt)
  if (!farben) {
    farben = new Map()
    objekt.traverse(o => { if (o instanceof THREE.Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m instanceof THREE.MeshStandardMaterial) farben!.set(m, m.color.clone()) })
    bossFarben.set(objekt, farben)
  }
  return farben
}
export class SpielLauf {
  zustand: Zustand
  x = 0
  private sichten = new Map<Trupp, Sicht>()
  private soldatNummer = 0
  private darstellung?: LaufDarstellung
  protokollFehler: string | null = null
  private basis!: { T: number; miniBoss: number; eliteBoss: number }
  private summen!: Record<'eingesammelt' | 'ausgesandt' | 'welle' | 'zombieGefallen' | 'spezialTreffer' | 'angekommenFront' | 'soldatGefallen' | 'miniBoss' | 'eliteBoss', number>
  private nachlaufZeit = 0
  constructor(level: Level = LEVELS[0], seed = Date.now(), darstellung?: LaufDarstellung) { this.zustand = neuerLauf(level, seed); this.darstellung = darstellung; darstellung?.setzeSeed?.(seed); this.protokollNeuBasieren() }
  protokollNeuBasieren(): void {
    const z = this.zustand
    this.basis = { T: z.T, miniBoss: z.miniBoss.B, eliteBoss: z.eliteBoss.B }
    this.summen = { eingesammelt: 0, ausgesandt: 0, welle: z.Z, zombieGefallen: 0, spezialTreffer: 0, angekommenFront: z.F, soldatGefallen: 0, miniBoss: 0, eliteBoss: 0 }
    this.protokollFehler = null
  }
  private pruefe(ereignisse: readonly Ereignis[]): void {
    for (const e of ereignisse) {
      if (e.art === 'bossTreffer' && e.boss) this.summen[e.boss] += e.menge
      else if (e.art in this.summen) this.summen[e.art as keyof typeof this.summen] += e.menge
    }
    const z = this.zustand, s = this.summen
    const werte: [string, number, number][] = [
      ['T', this.basis.T + s.eingesammelt - s.ausgesandt, z.T],
      ['Z', s.welle - s.zombieGefallen - s.spezialTreffer, z.Z],
      ['F', s.angekommenFront - s.soldatGefallen, z.F],
      ['miniBoss.B', this.basis.miniBoss - s.miniBoss, z.miniBoss.B],
      ['eliteBoss.B', this.basis.eliteBoss - s.eliteBoss, z.eliteBoss.B],
    ]
    const diag = this.darstellung?.diag?.()
    if (diag) {
      werte.push(['Fall-Soldaten', s.soldatGefallen, diag.fallSoldatenEntstanden])
    }
    for (const [name, soll, ist] of werte) {
      const toleranz = 1e-6 * Math.max(1, Math.abs(soll))
      const zuViel = name.startsWith('Fall-') ? ist > soll + toleranz : Math.abs(ist - soll) > toleranz
      if (zuViel && this.protokollFehler === null) this.protokollFehler = `${z.t.toFixed(2)} s: ${name} Soll ${soll}, Ist ${ist}`
    }
  }
  schritt(dt: number, ziel: number | null, pausiert = false): Ereignis[] {
    if (pausiert || !Number.isFinite(dt) || dt <= 0) return []
    dt = Math.min(dt, 0.1)
    if (this.zustand.ergebnis !== 'laeuft') { if (this.nachlaufZeit < 3) { this.darstellung?.nachlauf?.(Math.min(dt, 3 - this.nachlaufZeit)); this.nachlaufZeit += dt } return [] }
    if (ziel !== null) this.x = glaetteX(this.x, ziel, dt)
    const vorherT = this.zustand.T
    const alt = new Set(this.zustand.trupps)
    const ereignisse = schritt(this.zustand, { x: kernX(this.x) }, dt)
    for (const trupp of this.zustand.trupps) {
      if (!alt.has(trupp)) this.sichten.set(trupp, { x: this.x, soldaten: Array.from({length: trupp.anzahl / trupp.k}, () => {
        const nummer = this.soldatNummer++
        return { nummer, spur: SPUR_FOLGE[nummer % SPUR_FOLGE.length], phase: nummer % FIGUREN.SOLDAT_PHASENGRUPPEN,
          startX: this.x + (nummer % Math.min(10, Math.max(1, Math.floor(vorherT))) - 4.5) * .6 }
      }) })
      else if (trupp.vervielfacht && this.sichten.get(trupp)?.vervielfachtUm === undefined) this.sichten.get(trupp)!.vervielfachtUm = this.zustand.t
    }
    for (const trupp of this.sichten.keys()) if (!this.zustand.trupps.includes(trupp)) this.sichten.delete(trupp)
    this.darstellung?.zeige(this.zustand, this.sichten, ereignisse, dt, this.x)
    this.pruefe(ereignisse)
    return ereignisse
  }
  gibLaufFrei(): void { this.darstellung?.gibFrei?.(); this.sichten.clear() }
  get sichtzahlen() { return { formation: Math.min(Math.floor(this.zustand.T), 30), trupps: Math.min(50, this.zustand.trupps.reduce((n,t)=>n+Math.min(t.anzahl,10),0)), front: Math.min(Math.floor(this.zustand.F),40), zombies: Math.min(Math.ceil(this.zustand.Z),600) } }
}

export class WeltDarstellung implements LaufDarstellung {
  private welt: Welt
  private vorgaenger?: WeltDarstellung
  private letzterStand?: { z: Zustand; trupps: ReadonlyMap<Trupp, Sicht>; x: number }
  private truppeZahl = new ZahlAnzeige()
  private frontZahl = new ZahlAnzeige()
  private hordeZahl = new ZahlAnzeige(1.8, 'ceil', '#6e1414')
  private miniBalken: BossBalken
  private eliteBalken: BossBalken
  private letzteSaeulenZahl: number | null = null
  private letzteSchildSaeule = -1
  private letzteHorde = -1
  private hordeZeit = -Infinity
  private tempo: number = DARSTELLUNG.SCHILDER_TEMPO_LANGSAM
  private plusOffset = 0
  private letzteSaeule = -1
  private saeulenStart = 0
  private saeulenVon: number[] = []
  private letzteT = -1
  private letzteF = -1
  private letzteTrupps = ''
  private figurFaktor = 1
  private faktorZeit = -Infinity
  private aufblenden: THREE.Sprite[]
  private aufblendTextur: THREE.CanvasTexture
  private aufblendMaterial: THREE.SpriteMaterial
  private letzterFaktor = NaN
  private drehAnteil = 0
  private letzteDrehung = NaN
  private letztesX = NaN
  private letzteBewegung: SoldatEintrag['bewegung'] = 'stehen'
  private blitzTakt = new BlitzTakt()
  private blitzPunkte: { ende: number; pos: THREE.Vector3 }[] = []
  private blitze = new Muendungsblitze(DARSTELLUNG.BLITZE_MAX)
  private frontBlitze = new Muendungsblitze(DARSTELLUNG.FRONT_BLITZE_MAX)
  private frontBlitzPunkte = Array.from({ length: DARSTELLUNG.FRONT_BLITZE_MAX }, () => new THREE.Vector3())
  private frontBlitzEnden = new Float64Array(DARSTELLUNG.FRONT_BLITZE_MAX)
  private frontBlitzAktiv = 0
  private frontBlitzRest = 0
  private frontFiguren: SoldatEintrag[] = []
  private letzteFrontBewegung: SoldatEintrag['bewegung'] = 'stehen'
  private fallSoldaten: SoldatenMasse
  private fallSoldatenListe: SoldatEintrag[] = []
  private fallSoldatenEnden = new Float64Array(DARSTELLUNG.FALL_SOLDATEN_MAX)
  private fallSoldatRest = 0
  private fallSoldatenGesamt = 0
  private uhr = 0
  private zufallZustand: number
  private bossStand: BossStand = { zustand: 'weg', clip: 'walk', einmal: false, sichtbar: false, balken: false, z: 0, todSeit: -Infinity }
  private bossBlitzBis = -Infinity
  private letzterBossBlitz = -Infinity
  private bossOriginal: Map<THREE.MeshStandardMaterial, THREE.Color>
  private wandPulsBis = -Infinity
  private glasBlitzBis = -Infinity
  private letzterGlasBlitz = -Infinity
  private glasMaterial: THREE.MeshStandardMaterial | null
  private glasFarbe: THREE.Color | null
  constructor(welt: Welt, seed = 12345) {
    this.welt=welt
    welt.saeulen.forEach((saeule, i) => {
      saeule.position.z = -12 - i * BUEHNE.SAEULEN_ABSTAND
      saeule.visible = i <= DARSTELLUNG.SAEULEN_VORSCHAU
      welt.saeulenInnen[i].visible = saeule.visible
    })
    this.zufallZustand = seed >>> 0
    this.fallSoldaten = new SoldatenMasse(welt.soldatBau, DARSTELLUNG.FALL_SOLDATEN_MAX)
    this.bossOriginal = originalBossFarben(welt.miniboss.objekt)
    this.setzeBossZurueck()
    this.miniBalken = new BossBalken(LEVELS[0].B_mini)
    this.eliteBalken = new BossBalken(LEVELS[0].B_elite)
    this.vorgaenger = weltDarstellungen.get(welt)
    weltDarstellungen.set(welt, this)
    const glas = welt.saeulen[0]?.getObjectByName('saeule')
    this.glasMaterial = glas instanceof THREE.Mesh && glas.material instanceof THREE.MeshStandardMaterial ? glas.material : null
    this.glasFarbe = this.glasMaterial ? new THREE.Color('#c8ecf7') : null
    if (this.glasMaterial && this.glasFarbe) { this.glasMaterial.color.copy(this.glasFarbe); this.glasMaterial.opacity = .15 }
    const canvas = document.createElement('canvas')
    canvas.width = 128; canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.font = 'bold 48px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(`×${LEVELS[0].kStart}`, 64, 32)
    this.aufblendTextur = new THREE.CanvasTexture(canvas)
    this.aufblendMaterial = new THREE.SpriteMaterial({map:this.aufblendTextur,transparent:true,depthTest:false})
    this.aufblenden = Array.from({length:8},()=>{const s=new THREE.Sprite(this.aufblendMaterial);s.visible=false;s.scale.set(1.5,.75,1);s.renderOrder=11;welt.scene.add(s);return s})
    welt.scene.add(this.truppeZahl.objekt, this.frontZahl.objekt, this.hordeZahl.objekt, this.miniBalken.objekt, this.eliteBalken.objekt)
    welt.scene.add(this.blitze.objekt, this.frontBlitze.objekt, this.fallSoldaten.gruppe)
    welt.laufGruppen.push(this.truppeZahl.objekt, this.frontZahl.objekt, this.hordeZahl.objekt, this.miniBalken.objekt, this.eliteBalken.objekt,this.blitze.objekt,this.frontBlitze.objekt,this.fallSoldaten.gruppe,...this.aufblenden)
  }
  private zufall(): number {
    let n = this.zufallZustand = (this.zufallZustand + 0x6D2B79F5) >>> 0
    n = Math.imul(n ^ (n >>> 15), n | 1); n ^= n + Math.imul(n ^ (n >>> 7), n | 61)
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
  setzeSeed(seed: number): void { this.zufallZustand = seed >>> 0 }
  private setzeBossZurueck(): void {
    this.welt.miniboss.spiele('walk')
    this.welt.miniboss.objekt.visible = false
    this.bossOriginal.forEach((farbe, material) => material.color.copy(farbe))
    this.bossStand = { zustand: 'weg', clip: 'walk', einmal: false, sichtbar: false, balken: false, z: 0, todSeit: -Infinity }
    this.bossBlitzBis = this.letzterBossBlitz = -Infinity
  }
  diag(): Readonly<LaufDiag> { return { frontBewegung: this.letzteFrontBewegung, frontBlitze: this.frontBlitzAktiv, fallSoldatenAktiv: this.fallSoldatenListe.length, fallSoldatenEntstanden: this.fallSoldatenGesamt, bossZustand: this.bossStand.zustand } }
  private bewegeMiniaturen(): void {
    for (const miniatur of this.welt.saeulenInnen) {
      miniatur.rotation.y = this.uhr * 2 * Math.PI / FAHRZEUGE.DREH_S
      const basisY = miniatur.userData.miniBasisY
      if (typeof basisY === 'number') miniatur.position.y = basisY + .08 * Math.sin(this.uhr * Math.PI)
      miniatur.getObjectByName('rotor')?.rotation.set(0, this.uhr * 8 * Math.PI, 0)
      miniatur.getObjectByName('heckrotor')?.rotation.set(this.uhr * 12 * Math.PI, 0, 0)
    }
  }
  private tickeNeu(): void {
    this.bewegeMiniaturen()
    let geaendert = false
    for (let i = this.fallSoldatenListe.length - 1; i >= 0; i--) if (this.fallSoldatenEnden[this.fallSoldatenListe[i].phase!] <= this.uhr) { this.fallSoldatenListe.splice(i, 1); geaendert = true }
    if (geaendert) this.fallSoldaten.setze(this.fallSoldatenListe)
    this.fallSoldaten.aktualisiere(this.uhr)
    let aktiv = 0
    for (let i = 0; i < this.frontBlitzAktiv; i++) if (this.frontBlitzEnden[i] > this.uhr) {
      this.frontBlitzPunkte[aktiv].copy(this.frontBlitzPunkte[i]); this.frontBlitzEnden[aktiv++] = this.frontBlitzEnden[i]
    }
    this.frontBlitzAktiv = aktiv
    this.frontBlitze.setze(this.frontBlitzPunkte, this.welt.camera, aktiv)
    this.bossOriginal.forEach((farbe, material) => material.color.copy(farbe).multiplyScalar(this.uhr < this.bossBlitzBis ? 1.7 : 1))
    if (this.bossStand.zustand === 'stirbt') this.aktualisiereBoss(null)
  }
  nachlauf(dt: number): void { this.uhr += Math.max(0, dt); this.tickeNeu() }
  private aktualisiereBoss(z: Zustand | null): void {
    const alt = this.bossStand
    const neu = bossBewegung(alt, { t: this.uhr, y: z?.y ?? 0, kontakt: z ? hatKontakt(z) : false, imFeld: z?.miniBoss.imFeld ?? false, B: z?.miniBoss.B ?? 0, todesDauer: 2 })
    if (neu.zustand !== alt.zustand) this.welt.miniboss.spiele(neu.clip, neu.einmal)
    this.bossStand = neu
    this.welt.miniboss.objekt.visible = neu.sichtbar
    this.welt.miniboss.objekt.position.z = neu.z
    this.miniBalken.objekt.visible = neu.balken
  }
  zeige(z: Zustand, trupps: ReadonlyMap<Trupp, Sicht>, ereignisse: Ereignis[], dt: number, x: number): void {
    this.letzterStand = { z, trupps, x }
    const w = this.welt
    const t = z.t
    this.uhr += dt
    this.bewegeMiniaturen()
    if (z.kAktuell !== this.letzterFaktor) {
      this.letzterFaktor = z.kAktuell
      setzeSchildText(w.wand, { breite: 2 * BUEHNE.MITTE_HALB, hoehe: BUEHNE.WAND_HOEHE, text: wandText(z), farbe: BUEHNE.WAND_FARBE })
    }
    if (ereignisse.some(e => e.art === 'wandStufe')) this.wandPulsBis = t + .4
    const pulsRest = this.wandPulsBis - t
    const puls = pulsRest > 0 ? Math.sin(Math.PI * (1 - pulsRest / .4)) : 0
    w.wand.scale.setScalar(1 + .08 * puls)
    const wandFront = w.wand.getObjectByName('schild-vorderseite')
    if (wandFront instanceof THREE.Mesh && wandFront.material instanceof THREE.MeshBasicMaterial)
      wandFront.material.color.setScalar(pulsRest > .32 ? 1.7 : 1)
    const gesammelt = ereignisse.some(e => e.art === 'eingesammelt')
    const soll = gesammelt ? DARSTELLUNG.SCHILDER_TEMPO_SCHNELL : DARSTELLUNG.SCHILDER_TEMPO_LANGSAM
    this.tempo += Math.max(-48 * dt, Math.min(48 * dt, soll - this.tempo))
    this.plusOffset = (this.plusOffset + this.tempo * dt) % BUEHNE.PLUS_ABSTAND
    w.plusSchilder.forEach((schild,i) => {
      schild.position.z = -(i + 1) * BUEHNE.PLUS_ABSTAND + this.plusOffset
      schild.visible = schild.position.z < 0
      schild.scale.setScalar(gesammelt && schild.position.z > -1 ? 1.1 : 1)
    })
    this.truppeZahl.setze(z.T,t); this.truppeZahl.objekt.position.set(x, 2.8, 1)
    this.frontZahl.setze(z.F,t); this.frontZahl.objekt.position.set(0, ZAHL_HOEHEN.front, Math.min(-1, -z.y+2.5))
    const formation = Math.min(DARSTELLUNG.FORMATION_MAX, Math.floor(z.T))
    const schiesst = formationsBewegung(ereignisse) === 'schiessen'
    this.drehAnteil = THREE.MathUtils.clamp(this.drehAnteil + (schiesst ? 1 : -1) * dt / .3, 0, 1)
    const bewegung = schiesst ? 'schiessen' : 'stehen'
    if (formation !== this.letzteT || this.drehAnteil !== this.letzteDrehung || bewegung !== this.letzteBewegung || (this.drehAnteil > 0 && x !== this.letztesX)) {
      w.truppe.setze(formationsFiguren(z.T, bewegung).map(e => ({ ...e, dreh: saeulenBlick(x, e.x, e.z) * this.drehAnteil })))
      this.letzteT = formation
      this.letzteDrehung = this.drehAnteil
      this.letztesX = x
      this.letzteBewegung = bewegung
    }
    w.truppe.gruppe.position.x = x
    this.blitzPunkte = this.blitzPunkte.filter(b => b.ende > t)
    const neueBlitze = this.blitzTakt.schritt(dt, t, schiesst && formation > 0)
    const muendung = w.soldatBau.pruefung.debugMuzzle
    const lokal = Array.isArray(muendung) ? new THREE.Vector3(...muendung as [number,number,number]) : new THREE.Vector3(0,1.3,-.5)
    for (let i = 0; i < neueBlitze; i++) {
      const figur = formationsFiguren(z.T)[Math.floor(this.zufall() * formation)]
      const dreh = saeulenBlick(x, figur.x, figur.z) * this.drehAnteil
      const pos = lokal.clone().applyAxisAngle(new THREE.Vector3(0,1,0), dreh).add(new THREE.Vector3(x + figur.x,0,figur.z))
      this.blitzPunkte.push({ ende: t + DARSTELLUNG.BLITZ_DAUER, pos })
    }
    this.blitze.setze(this.blitzPunkte.map(b => b.pos), w.camera)
    const front = Math.min(DARSTELLUNG.FRONT_MAX,Math.floor(z.F))
    const frontBewegung = hatKontakt(z) ? 'schiessen' : 'stehen'
    if (front !== this.letzteF || frontBewegung !== this.letzteFrontBewegung) {
      this.frontFiguren = Array.from({length:front},(_,i):SoldatEintrag=>({x:(i%10-4.5)*.6,z:Math.floor(i/10)*.7,dreh:0,bewegung:frontBewegung,phase:i%8}))
      w.front.setze(this.frontFiguren)
      this.letzteF = front
      this.letzteFrontBewegung = frontBewegung
    }
    w.front.gruppe.position.z = Math.min(-3.1,-z.y+1.5)
    let soldatNeuBild = 0
    if (frontBewegung === 'schiessen' && front > 0) {
      this.frontBlitzRest += dt * DARSTELLUNG.FRONT_BLITZE_PRO_SEKUNDE
      const muendung = w.soldatBau.pruefung.debugMuzzle
      const mx = Array.isArray(muendung) ? muendung[0] : 0, my = Array.isArray(muendung) ? muendung[1] : 1.3, mz = Array.isArray(muendung) ? muendung[2] : -.5
      while (this.frontBlitzRest >= 1) {
        this.frontBlitzRest--
        if (this.frontBlitzAktiv < DARSTELLUNG.FRONT_BLITZE_MAX) {
          const f = this.frontFiguren[Math.floor(this.zufall() * front)]
          const i = this.frontBlitzAktiv++
          this.frontBlitzPunkte[i].set(f.x + mx, my, w.front.gruppe.position.z + f.z + mz)
          this.frontBlitzEnden[i] = this.uhr + .06
        }
      }
    } else this.frontBlitzRest = 0
    if (z.y > 0 && z.ergebnis === 'laeuft') {
      for (const e of ereignisse) {
        if (e.art === 'soldatGefallen') {
          this.fallSoldatRest += e.menge
          const anzahl = Math.floor(this.fallSoldatRest); this.fallSoldatRest -= anzahl
          let neu = Math.min(anzahl, DARSTELLUNG.FALL_SOLDATEN_MAX - this.fallSoldatenListe.length, 2 - soldatNeuBild)
          while (neu-- > 0) {
            let phase = 0
            while (this.fallSoldatenListe.some(s => s.phase === phase)) phase++
            const platz = this.frontFiguren[Math.floor(this.zufall() * Math.min(front, 10))]
            if (!platz) break
            this.fallSoldatenListe.push({ x: platz.x, z: w.front.gruppe.position.z + platz.z, dreh: 0, bewegung: 'fallen', phase, start: this.uhr })
            this.fallSoldatenEnden[phase] = this.uhr + Math.max(1.2, w.soldatBau.dauer.fallen + .4)
            this.fallSoldatenGesamt++
            soldatNeuBild++
          }
          this.fallSoldaten.setze(this.fallSoldatenListe)
        }
      }
    }
    const laufSoldaten: LaufSoldat[] = []
    for (const [trupp,sicht] of trupps) {
      const zielX = trupp.pos < z.level.wand ? sicht.x : 0
      sicht.x += Math.max(-8*dt,Math.min(8*dt,zielX-sicht.x))
      if (trupp.ziel === 'front') sicht.x = Math.max(-2.8, Math.min(2.8, sicht.x))
      const pos = Math.min(trupp.pos,Math.max(1,z.y-1.5))
      if (trupp.pos >= Math.max(1,z.y-1.5)) continue
      for (const soldat of sicht.soldaten) laufSoldaten.push({nummer:soldat.nummer, pos, x:sicht.x, ziel:trupp.ziel, vervielfacht:trupp.vervielfacht,
        k:trupp.k, spur:soldat.spur, phase:soldat.phase, startX:soldat.startX,
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
    this.hordeZahl.objekt.visible=z.y>0&&z.Z>0
    if (this.hordeZahl.objekt.visible) this.hordeZahl.setze(z.Z,t)
    this.hordeZahl.objekt.position.set(FIGUREN.ZOMBIE_X_MAX+.6,ZAHL_HOEHEN.horde,-z.y+1)
    this.aktualisiereBoss(z)
    if (ereignisse.some(e => e.art === 'bossTreffer' && e.boss === 'miniBoss') && this.uhr - this.letzterBossBlitz >= 1/3) { this.letzterBossBlitz = this.uhr; this.bossBlitzBis = this.uhr + .1 }
    if (this.miniBalken.objekt.visible) this.miniBalken.setze(z.miniBoss.B,t)
    this.miniBalken.objekt.position.set(w.miniboss.objekt.position.x,FIGUREN.MINIBOSS_HOEHE+.5,w.miniboss.objekt.position.z)
    w.eliteboss.objekt.visible=z.y>0&&z.eliteBoss.imFeld&&z.eliteBoss.B>0
    const spalten=Math.floor((FIGUREN.ZOMBIE_X_MAX-FIGUREN.ZOMBIE_X_MIN)/FIGUREN.ZOMBIE_SPALTENABSTAND)+1
    w.eliteboss.objekt.position.z=-z.y-(zombies?Math.ceil(zombies/spalten)*FIGUREN.ZOMBIE_REIHENABSTAND+2:0)
    this.eliteBalken.objekt.visible=w.eliteboss.objekt.visible
    if (this.eliteBalken.objekt.visible) this.eliteBalken.setze(z.eliteBoss.B,t)
    this.eliteBalken.objekt.position.set(w.eliteboss.objekt.position.x,FIGUREN.ELITEBOSS_HOEHE+.5,w.eliteboss.objekt.position.z)
    if (ereignisse.some(e => e.art === 'saeuleTreffer') && t - this.letzterGlasBlitz >= .2) { this.letzterGlasBlitz = t; this.glasBlitzBis = t + .08 }
    if (this.glasMaterial && this.glasFarbe) {
      this.glasMaterial.color.copy(this.glasFarbe).lerp(new THREE.Color('#ffffff'), t < this.glasBlitzBis ? .8 : 0)
      this.glasMaterial.opacity = t < this.glasBlitzBis ? .65 : .15
    }
    if (z.saeulenIndex !== this.letzteSaeule) {
      this.saeulenVon = w.saeulen.map(s => s.position.z)
      this.saeulenStart = this.uhr
      this.letzteSaeule = z.saeulenIndex
    }
    const anteil = Math.min(1, (this.uhr - this.saeulenStart) / .6)
    w.saeulen.forEach((saeule, i) => {
      saeule.visible = i >= z.saeulenIndex && i <= z.saeulenIndex + DARSTELLUNG.SAEULEN_VORSCHAU
      if (saeule.visible) {
        const ziel = -12 - (i - z.saeulenIndex) * BUEHNE.SAEULEN_ABSTAND
        saeule.position.z = THREE.MathUtils.lerp(this.saeulenVon[i] ?? ziel, ziel, anteil)
      }
      w.saeulenInnen[i].visible = saeule.visible
    })
    const zahl = z.P === null ? null : Math.ceil(z.P)
    if (z.saeulenIndex !== this.letzteSchildSaeule || zahl !== this.letzteSaeulenZahl) {
      for (const [i, schild] of w.saeulenSchilder.entries()) {
        const canvas = schild.userData.canvas as HTMLCanvasElement
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, 256, 128)
        ctx.fillStyle = '#102437d9'; ctx.fillRect(0, 0, 256, 128)
        ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        const name = LEVELS[0].saeulen[i].toUpperCase()
        let schrift = 34
        ctx.font = `bold ${schrift}px system-ui`
        while (schrift > 10 && ctx.measureText(name).width > canvas.width - 16) {
          ctx.font = `bold ${--schrift}px system-ui`
        }
        ctx.fillText(name, 128, i === z.saeulenIndex ? 36 : 64)
        if (i === z.saeulenIndex && z.P !== null) {
          ctx.font = 'bold 48px system-ui'
          ctx.fillText(String(zahl), 128, 91)
        }
        ;((schild.material as THREE.MeshBasicMaterial).map as THREE.CanvasTexture).needsUpdate = true
      }
      this.letzteSchildSaeule = z.saeulenIndex
      this.letzteSaeulenZahl = zahl
    }
    setzeEinheitenBanner(z.aktiv)
    this.tickeNeu()
  }
  gibFrei():void {
    this.setzeBossZurueck()
    this.truppeZahl.gibFrei(); this.frontZahl.gibFrei(); this.hordeZahl.gibFrei(); this.miniBalken.gibFrei(); this.eliteBalken.gibFrei()
    this.aufblenden.forEach(s=>s.removeFromParent())
    this.aufblendMaterial.dispose(); this.aufblendTextur.dispose()
    this.blitze.gibFrei()
    this.frontBlitze.gibFrei()
    this.fallSoldaten.gruppe.removeFromParent(); this.fallSoldaten.gibNetzeFrei()
    setzeEinheitenBanner([])
    this.welt.wand.scale.setScalar(1)
    if (this.glasMaterial && this.glasFarbe) { this.glasMaterial.color.copy(this.glasFarbe); this.glasMaterial.opacity = .15 }
    this.welt.scene.remove(this.truppeZahl.objekt, this.frontZahl.objekt, this.hordeZahl.objekt, this.miniBalken.objekt, this.eliteBalken.objekt)
    this.welt.laufGruppen = this.welt.laufGruppen.filter(obj => obj !== this.truppeZahl.objekt && obj !== this.frontZahl.objekt && obj !== this.hordeZahl.objekt && obj !== this.miniBalken.objekt && obj !== this.eliteBalken.objekt && obj !== this.blitze.objekt && obj !== this.frontBlitze.objekt && obj !== this.fallSoldaten.gruppe && !this.aufblenden.includes(obj as THREE.Sprite))
    if (weltDarstellungen.get(this.welt) === this) {
      if (this.vorgaenger) {
        weltDarstellungen.set(this.welt, this.vorgaenger)
        if (this.vorgaenger.letzterStand) {
          this.vorgaenger.letzteT = this.vorgaenger.letzteF = this.vorgaenger.letzteHorde = -1
          this.vorgaenger.letzteFrontBewegung = 'stehen'
          this.vorgaenger.hordeZeit = -Infinity
          this.vorgaenger.letzteTrupps = ''
          this.vorgaenger.letzterFaktor = NaN
          this.vorgaenger.letzteSaeule = -1
          this.vorgaenger.letzteSchildSaeule = -1
          this.vorgaenger.uhr = 0
          this.vorgaenger.fallSoldatRest = 0
          this.vorgaenger.fallSoldatenGesamt = 0
          this.vorgaenger.frontBlitzAktiv = this.vorgaenger.frontBlitzRest = 0
          this.vorgaenger.frontBlitze.setze(this.vorgaenger.frontBlitzPunkte, this.welt.camera, 0)
          this.vorgaenger.fallSoldatenListe.length = 0
          this.vorgaenger.fallSoldaten.setze([])
          this.vorgaenger.setzeBossZurueck()
          const { z, trupps, x } = this.vorgaenger.letzterStand
          this.vorgaenger.zeige(z, trupps, [], 0, x)
        }
      } else weltDarstellungen.delete(this.welt)
    }
  }
}
