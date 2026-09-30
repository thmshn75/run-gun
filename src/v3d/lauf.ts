import { BUEHNE, DARSTELLUNG, FAHRZEUGE, FIGUREN, LEVELS, SPEZIAL, type FahrzeugName, type Level } from './balance3d'
import { neuerLauf, schritt, phaseBei, type AktiveEinheit, type Ereignis, type Trupp, type Zustand } from './rechnung'
import { glaetteX, kernX } from './steuerung'
import { bossFreieAufstellung } from './bosse'
import type { Welt } from './szene'
import type { SoldatEintrag } from './soldaten'
import { SoldatenMasse } from './soldaten'
import { BossBalken, Explosionen, Muendungsblitze, ZahlAnzeige } from './anzeigen'
import { baueFeldFahrzeug } from './fahrzeuge'
import type { ZombieEintrag } from './figuren'
import { setzeSchildText } from './schilder'
import { setzeEinheitenBanner } from './oberflaeche'
import * as THREE from 'three'

const SPUR_FOLGE = [4, 7, 1, 9, 2, 5, 0, 8, 3, 6] as const
type FeldStand = { gruppe: THREE.Group; name: FahrzeugName; halt1: number; halt2?: number; schneiseZ?: number; gasseBegonnen?: boolean; abgang: number; abgangPos?: THREE.Vector3; abgangKurs?: number; schuss: number; schussUhr: number; rest: number; ziel?: THREE.Vector3; zielPhase?: number; offsetX: number; kreisVersatz: number; bossSchuss: number; bossExplosionen: Set<string>; letzteZiele: THREE.Vector3[] }
export type HordeTreffer = { punkt: THREE.Vector3; menge: number; radius: number }

export class Einsatzbilder {
  private welt: Welt
  readonly explosionen = new Explosionen()
  readonly blitze = new Muendungsblitze(4)
  private fahrzeuge = new Map<AktiveEinheit, FeldStand>()
  private blitzPunkte: { pos: THREE.Vector3; rest: number }[] = []
  private blitzPositionen: THREE.Vector3[] = []
  private treffer: HordeTreffer[] = []
  private offeneTreffer: Ereignis[] = []
  private zufallZustand = 1
  private wegwerf = new THREE.Vector3()
  private rotorUhr = 0
  readonly gasse = new HordeGasse()
  constructor(welt: Welt) {
    this.welt = welt
    welt.scene.add(this.explosionen.objekt, this.blitze.objekt)
    welt.laufGruppen.push(this.explosionen.objekt, this.blitze.objekt)
  }
  setzeSeed(seed: number): void { this.zufallZustand = (seed ^ 0x9e3779b9) >>> 0 }
  private zufall(): number {
    let n = this.zufallZustand = (this.zufallZustand + 0x6D2B79F5) >>> 0
    n = Math.imul(n ^ (n >>> 15), n | 1); n ^= n + Math.imul(n ^ (n >>> 7), n | 61)
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
  nimmTreffer(): HordeTreffer[] { return this.treffer.splice(0) }
  get anzahl(): number { return this.fahrzeuge.size }
  schuesse(a: AktiveEinheit): number { return this.fahrzeuge.get(a)?.schuss ?? 0 }
  letzteZiele(a: AktiveEinheit): readonly THREE.Vector3[] { return this.fahrzeuge.get(a)?.letzteZiele ?? [] }
  private muendung(stand: FeldStand): THREE.Vector3 {
    const p = FAHRZEUGE[stand.name].MUENDUNG
    stand.gruppe.updateMatrixWorld(true)
    return stand.gruppe.localToWorld(this.wegwerf.set(p[0], p[1], p[2]).clone().multiplyScalar(FAHRZEUGE[stand.name].SPIEL_SKALA))
  }
  private schiesse(stand: FeldStand, ziel: THREE.Vector3, durchmesser: number, menge = 0, radius = 0): void {
    stand.schuss++
    stand.letzteZiele.push(ziel.clone())
    if (this.blitzPunkte.length < 4) this.blitzPunkte.push({ pos: this.muendung(stand), rest: .08 })
    this.explosionen.starte(ziel, durchmesser)
    if (menge > 0) this.treffer.push({ punkt: ziel.clone(), menge, radius })
  }
  private entferne(a: AktiveEinheit, stand: FeldStand): void {
    stand.gruppe.removeFromParent()
    this.welt.laufGruppen = this.welt.laufGruppen.filter(o => o !== stand.gruppe)
    this.fahrzeuge.delete(a)
  }
  private ticke(dt: number): void {
    this.rotorUhr += Math.max(0, dt)
    this.explosionen.schritt(dt, this.welt.camera)
    this.blitzPositionen.length = 0
    for (let i = this.blitzPunkte.length - 1; i >= 0; i--) {
      const blitz = this.blitzPunkte[i]
      blitz.rest -= dt
      if (blitz.rest <= 0) this.blitzPunkte.splice(i, 1)
      else this.blitzPositionen.push(blitz.pos)
    }
    this.blitze.setze(this.blitzPositionen, this.welt.camera)
    for (const stand of this.fahrzeuge.values()) if (stand.name === 'hubschrauber') {
      stand.gruppe.getObjectByName('rotor')?.rotation.set(0, this.rotorUhr * 8 * Math.PI, 0)
      stand.gruppe.getObjectByName('heckrotor')?.rotation.set(this.rotorUhr * 12 * Math.PI, 0, 0)
    }
    for (const [a, stand] of this.fahrzeuge) if (stand.abgang >= 0) {
      stand.abgang += dt
      const dauer = stand.name === 'panzer' ? .6 : stand.name === 'hubschrauber' ? 1 : .8
      stand.gruppe.scale.setScalar(Math.max(0, 1 - stand.abgang / dauer))
      const p = stand.abgangPos!
      if (stand.name === 'panzer' && stand.schneiseZ !== undefined) stand.gruppe.position.z = p.z - (stand.halt2! - stand.schneiseZ) / SPEZIAL.panzer.ablauf[4].dauer * Math.min(stand.abgang, dauer)
      else if (stand.name === 'hubschrauber') stand.gruppe.position.set(p.x + 12 * Math.min(stand.abgang, dauer) * -Math.sin(stand.abgangKurs!), p.y + 3 * Math.min(stand.abgang, dauer), p.z - 12 * Math.min(stand.abgang, dauer) * Math.cos(stand.abgangKurs!))
      else if (stand.name === 'humvee') stand.gruppe.position.z = p.z + 6 * Math.min(stand.abgang, dauer)
      if (stand.abgang >= dauer) this.entferne(a, stand)
    }
  }
  abgleichen(z: Zustand, ereignisse: readonly Ereignis[], dt: number, bossPunkt?: THREE.Vector3, bossPunkte?: readonly (THREE.Vector3 | undefined)[]): void {
    this.gasse.schritt(dt, ereignisse.some(e => e.art === 'welle'))
    for (const a of z.aktiv) {
      if (!this.fahrzeuge.has(a)) {
        const name = a.einheit, bau = this.welt.fahrzeuge?.[name]
        if (!bau) continue
        const gruppe = baueFeldFahrzeug(bau, name)
        const boden = name !== 'hubschrauber'
        const belegte = [...this.fahrzeuge.values()].filter(s => s.name !== 'hubschrauber' && s.abgang < 0).map(s => s.offsetX)
        const offsetX = boden ? (belegte.includes(0) ? belegte.includes(2) ? -2 : 2 : 0) : 0
        const kreisVersatz = !boden && [...this.fahrzeuge.values()].some(s => s.name === 'hubschrauber' && s.abgang < 0) ? Math.PI : 0
        gruppe.position.set(offsetX, name === 'hubschrauber' ? 9 : 0, 10)
        this.welt.scene.add(gruppe); this.welt.laufGruppen.push(gruppe)
        const halt1 = -5 - FAHRZEUGE[name].LAENGE * FAHRZEUGE[name].SPIEL_SKALA / 2 - 1
        const phase = phaseBei(name, a.verstrichen)
        const geplant = name === 'panzer' ? [1.45, 1.85, 3.7, 4.1].filter(t => t <= a.verstrichen + 1e-9).length : 0
        const stand: FeldStand = { gruppe, name, halt1, abgang: -1, schuss: geplant, schussUhr: 0, rest: 0, offsetX, kreisVersatz, bossSchuss: 0, bossExplosionen: new Set(), letzteZiele: [] }
        if (name === 'humvee') {
          const halt = -(5 + Math.max(0, z.y - 5) / 2)
          stand.halt2 = halt <= halt1 - 2 ? halt : halt1
        }
        this.fahrzeuge.set(a, stand)
        if (name === 'panzer' && phase.index === 4) { this.gasse.beginne(offsetX, FAHRZEUGE.panzer.SCHNEISE_HALB); stand.gasseBegonnen = true }
      }
    }
    for (const [a, stand] of this.fahrzeuge) {
      if (stand.abgang >= 0) continue
      const phase = phaseBei(a.einheit, a.verstrichen)
      if (stand.name === 'hubschrauber') {
        const theta = 2 * Math.PI * phase.lokal / FAHRZEUGE.hubschrauber.KREIS_S + stand.kreisVersatz
        const mitte = -z.y - 5, r = FAHRZEUGE.hubschrauber.KREIS_RADIUS
        if (phase.index === 0) {
          stand.gruppe.position.set(THREE.MathUtils.lerp(0, r * Math.cos(stand.kreisVersatz), phase.anteil), THREE.MathUtils.lerp(9, FAHRZEUGE.hubschrauber.FLUGHOEHE, phase.anteil), THREE.MathUtils.lerp(10, mitte - r * Math.sin(stand.kreisVersatz), phase.anteil))
          const dx = r * Math.cos(stand.kreisVersatz)
          const dz = mitte - r * Math.sin(stand.kreisVersatz) - 10
          const kursFahrt = Math.atan2(-dx, -dz)
          const blend = Math.max(0, (phase.lokal - 1.6) / .4)
          stand.gruppe.rotation.y = kursFahrt + Math.atan2(Math.sin(stand.kreisVersatz - kursFahrt), Math.cos(stand.kreisVersatz - kursFahrt)) * blend
        } else {
          stand.gruppe.position.set(r * Math.cos(theta), FAHRZEUGE.hubschrauber.FLUGHOEHE, mitte - r * Math.sin(theta))
          stand.gruppe.rotation.y = theta
        }
      } else if (stand.name === 'humvee') {
        const L = FAHRZEUGE.humvee.LAENGE * FAHRZEUGE.humvee.SPIEL_SKALA
        const zielZ = Math.min(stand.halt1, Math.max(stand.halt2!, -z.y + L / 2 + 2))
        stand.gruppe.position.z = phase.index === 0 ? THREE.MathUtils.lerp(10, zielZ, phase.anteil) : zielZ
      } else if (phase.index === 0) stand.gruppe.position.z = THREE.MathUtils.lerp(10, stand.halt1, phase.anteil)
      else if (stand.name === 'haubitze') stand.gruppe.position.z = phase.index === 2
        ? THREE.MathUtils.lerp(stand.halt1, 10, phase.anteil) : stand.halt1
      else {
        if (phase.index >= 2 && stand.halt2 === undefined) {
          const ziel = -(5 + Math.max(0, z.y - 5) / 2)
          stand.halt2 = ziel <= stand.halt1 - 2 ? ziel : stand.halt1
        }
        if (phase.index === 1) stand.gruppe.position.z = stand.halt1
        if (phase.index === 2) stand.gruppe.position.z = THREE.MathUtils.lerp(stand.halt1, stand.halt2!, phase.anteil)
        if (phase.index === 3) stand.gruppe.position.z = stand.halt2!
        if (phase.index === 4) {
          if (stand.schneiseZ === undefined) {
            const sichtbar = z.y <= 0 ? 0 : Math.min(DARSTELLUNG.HORDE_MAX, Math.ceil(z.Z))
            const aufstellung = baueHorde(sichtbar, new Set()).eintraege
            const tiefe = aufstellung.length ? -Math.min(...aufstellung.map(e => e.z)) : 0
            stand.schneiseZ = -z.y - tiefe - 4
          }
          stand.gruppe.position.z = THREE.MathUtils.lerp(stand.halt2!, stand.schneiseZ, phase.anteil)
          if (!stand.gasseBegonnen) { this.gasse.beginne(stand.offsetX, FAHRZEUGE.panzer.SCHNEISE_HALB); stand.gasseBegonnen = true }
          this.gasse.erweitere(stand.gruppe.position.z - FAHRZEUGE.panzer.LAENGE * FAHRZEUGE.panzer.SPIEL_SKALA / 2 + z.y)
        }
      }
    }
    const offen = this.offeneTreffer
    offen.length = 0
    for (const ereignis of ereignisse) if (ereignis.art === 'spezialTreffer') offen.push(ereignis)
    for (const [a, stand] of this.fahrzeuge) {
      const ereignisIndex = offen.findIndex(e => e.einheit === stand.name)
      const ereignis = ereignisIndex < 0 ? undefined : offen.splice(ereignisIndex, 1)[0]
      const aktuellePhase = phaseBei(a.einheit, a.verstrichen).index
      if (stand.name === 'humvee' || stand.name === 'hubschrauber') {
        if (ereignis) stand.rest += ereignis.menge
        const ausloeser = !!ereignis || stand.name === 'hubschrauber' && aktuellePhase === 1 && !!bossPunkt
        if (ausloeser) {
          const takt = stand.name === 'humvee' ? DARSTELLUNG.HUMVEE_TAKT_S : DARSTELLUNG.HUBSCHRAUBER_TAKT_S
          stand.schussUhr = Math.min(stand.schussUhr + dt, 2 * takt)
          while (stand.schussUhr >= takt - 1e-9) {
            stand.schussUhr -= takt
            const boss = stand.name === 'hubschrauber' && !!bossPunkt && (!ereignis || (stand.bossSchuss + 1) % 3 === 0)
            if (stand.name === 'hubschrauber') stand.bossSchuss++
            const s = stand.schuss
            const x = stand.name === 'humvee' ? -2.6 + 5.2 * (s % 24 <= 12 ? s % 24 : 24 - s % 24) / 12 : -2.8 + 5.6 * this.zufall()
            const tief = stand.name === 'humvee' ? .5 + 2 * this.zufall() : 1 + 8 * this.zufall()
            const ziel = boss ? bossPunkt!.clone() : new THREE.Vector3(x, .2, -z.y - tief)
            const menge = boss ? 0 : Math.floor(stand.rest + 1e-9)
            if (!boss) stand.rest -= menge
            this.schiesse(stand, ziel, stand.name === 'humvee' ? 1.5 : 2.5, menge, stand.name === 'humvee' ? 1.5 : 2)
          }
        }
        continue
      }
      if (stand.name === 'panzer' && ereignis && (aktuellePhase === 1 || aktuellePhase === 3) && stand.zielPhase !== aktuellePhase) {
        stand.zielPhase = aktuellePhase
        stand.ziel = new THREE.Vector3((aktuellePhase === 1 ? -1.7 : 1.7) + (this.zufall() - .5), .2, -z.y - 4 * this.zufall())
      }
      const geplant = stand.name === 'panzer' ? [1.45, 1.85, 3.7, 4.1].filter(t => t <= a.verstrichen + 1e-9).length : 0
      const schuesse = stand.name === 'haubitze' ? (ereignis ? 1 : 0) : geplant - stand.schuss
      for (let i = 0; i < Math.max(0, schuesse); i++) {
        const nummer = stand.schuss
        const links = stand.name === 'haubitze' ? nummer === 0 : nummer < 2
        if (!(stand.name === 'panzer' && (nummer === 0 || nummer === 2) && stand.zielPhase === (nummer === 0 ? 1 : 3))) {
          const zielX = (links ? -1.7 : 1.7) + (this.zufall() - .5)
          const tief = stand.name === 'haubitze' ? 3 + 7 * this.zufall() : 4 * this.zufall()
          stand.ziel = new THREE.Vector3(zielX, .2, -z.y - tief)
        }
        this.schiesse(stand, stand.ziel!, stand.name === 'haubitze' ? 7 : 4)
      }
      if (ereignis && stand.name === 'haubitze' && stand.ziel) this.treffer.push({ punkt: stand.ziel.clone(), menge: ereignis.menge, radius: 3 })
      if (ereignis && stand.name === 'panzer') {
        if (aktuellePhase === 4) stand.rest = 0
        else stand.rest += ereignis.menge
        const menge = Math.floor(stand.rest + 1e-9)
        stand.rest -= menge
        if (menge && stand.ziel) this.treffer.push({ punkt: stand.ziel.clone(), menge, radius: 2 })
      }
      if (stand.name === 'panzer' && aktuellePhase === 4 && bossPunkte) for (let i = 0; i < bossPunkte.length; i++) {
        const ziel = bossPunkte[i]
        if (!ziel || stand.bossExplosionen.has(String(i)) || Math.abs(stand.gruppe.position.z - FAHRZEUGE.panzer.LAENGE * FAHRZEUGE.panzer.SPIEL_SKALA / 2 - ziel.z) >= 1.5) continue
        stand.bossExplosionen.add(String(i))
        this.explosionen.starte(ziel, 2.5)
      }
    }
    for (const [a, stand] of this.fahrzeuge) if ((z.ergebnis !== 'laeuft' || !z.aktiv.includes(a)) && stand.abgang < 0) {
      if (stand.name === 'haubitze' && a.verstrichen >= 4.75 - 1e-9) this.entferne(a, stand)
      else { stand.abgang = 0; stand.abgangPos = stand.gruppe.position.clone(); stand.abgangKurs = stand.gruppe.rotation.y }
    }
    this.ticke(dt)
  }
  nachlauf(dt: number): void { this.ticke(dt) }
  zuruecksetzen(): void {
    for (const [a, stand] of this.fahrzeuge) this.entferne(a, stand)
    this.explosionen.zuruecksetzen(); this.blitzPunkte.length = 0; this.blitzPositionen.length = 0; this.blitze.setze(this.blitzPositionen, this.welt.camera)
    this.treffer.length = 0; this.offeneTreffer.length = 0; this.rotorUhr = 0; this.gasse.zuruecksetzen()
  }
  gibFrei(): void {
    this.zuruecksetzen(); this.explosionen.gibFrei(); this.blitze.gibFrei()
    this.welt.laufGruppen = this.welt.laufGruppen.filter(o => o !== this.explosionen.objekt && o !== this.blitze.objekt)
  }
}
export const ZAHL_HOEHEN = { front: 2.8, horde: 2.4 } as const
export class HordeGasse {
  aktiv = false
  x = 0
  halb = 0
  bis = 0
  version = 0
  private schliessZeit = -1
  private startBis = 0
  beginne(x: number, halb: number): void { this.aktiv = true; this.x = x; this.halb = halb; this.bis = 0; this.schliessZeit = -1; this.version++ }
  enthaelt(e: ZombieEintrag): boolean { return this.aktiv && Math.abs(e.x - this.x) < this.halb && e.z >= this.bis }
  erweitere(bis: number): void { if (this.aktiv && this.schliessZeit < 0 && bis < this.bis) { this.bis = bis; this.version++ } }
  schritt(dt: number, welle: boolean): void {
    if (!this.aktiv) return
    if (welle && this.schliessZeit < 0) { this.schliessZeit = 0; this.startBis = this.bis }
    if (this.schliessZeit >= 0) {
      this.schliessZeit += Math.max(0, dt)
      this.bis = this.startBis * Math.max(0, 1 - this.schliessZeit / DARSTELLUNG.GASSE_SCHLIESSEN_S)
      this.version++
      if (this.schliessZeit >= DARSTELLUNG.GASSE_SCHLIESSEN_S) { this.aktiv = false; this.version++ }
    }
  }
  zuruecksetzen(): void { this.aktiv = false; this.bis = 0; this.schliessZeit = -1; this.version++ }
}

function basis(n: number): ZombieEintrag[] { return bossFreieAufstellung(n, 0, FIGUREN.MINIBOSS_FREIRADIUS, 73291, -1, true) }
export function baueHorde(zahl: number, loecher: ReadonlySet<number>, gasse?: HordeGasse): { eintraege: ZombieEintrag[]; basisLaenge: number } {
  if (!zahl) return { eintraege: [], basisLaenge: 0 }
  const f = gasse?.aktiv ? Math.min(.95, 2 * gasse.halb / (FIGUREN.ZOMBIE_X_MAX - FIGUREN.ZOMBIE_X_MIN)) : 0
  let n = Math.ceil((zahl + loecher.size) / (1 - f)) + 20
  for (let versuch = 0; versuch < 4; versuch++) {
    const eintraege = basis(n).filter((e, i) => !loecher.has(i) && !gasse?.enthaelt(e)).slice(0, zahl)
    if (eintraege.length === zahl) return { eintraege, basisLaenge: n }
    n += Math.ceil((zahl - eintraege.length) / (1 - f)) + 20
  }
  throw new Error('Horde in vier Durchgängen nicht vollständig')
}

export class HordeLoecher {
  readonly indizes = new Set<number>()
  private entstanden = new Map<number, number>()
  private zeit = 0
  private naechsteHeilung = 0
  version = 0
  passeAn(basisLaenge: number): void {
    for (const index of [...this.indizes].sort((a, b) => b - a)) {
      if (index < basisLaenge) continue
      this.indizes.delete(index); this.entstanden.delete(index); this.version++
    }
    if (!this.indizes.size) this.naechsteHeilung = 0
  }
  treffer(zahl: number, gruppenZ: number, punkt: THREE.Vector3, menge: number, radius: number, basisLaenge = zahl + this.indizes.size, gasse?: HordeGasse): number {
    this.passeAn(basisLaenge)
    if (zahl <= 0 || menge <= 0) return 0
    const moeglich = basis(basisLaenge)
      .map((eintrag, index) => ({ index, eintrag, abstand: Math.hypot(eintrag.x - punkt.x, eintrag.z + gruppenZ - punkt.z) }))
      .filter(k => !this.indizes.has(k.index) && !gasse?.enthaelt(k.eintrag) && k.abstand <= radius)
      .sort((a, b) => a.abstand - b.abstand || a.index - b.index)
    const anzahl = Math.min(Math.floor(menge), moeglich.length, DARSTELLUNG.LOECHER_MAX - this.indizes.size)
    for (let i = 0; i < anzahl; i++) { this.indizes.add(moeglich[i].index); this.entstanden.set(moeglich[i].index, this.zeit) }
    if (anzahl) this.version++
    return anzahl
  }
  schritt(dt: number): void {
    this.zeit += Math.max(0, dt)
    for (const [index, entstanden] of this.entstanden) {
      const faellig = Math.max(entstanden + DARSTELLUNG.LOCH_STANDZEIT_S, this.naechsteHeilung)
      if (faellig > this.zeit + 1e-9) break
      this.indizes.delete(index); this.entstanden.delete(index); this.version++
      this.naechsteHeilung = faellig + DARSTELLUNG.LOCH_HEILEN_S
    }
    if (!this.indizes.size) this.naechsteHeilung = 0
  }
  zuruecksetzen(): void { this.indizes.clear(); this.entstanden.clear(); this.naechsteHeilung = this.zeit = 0; this.version++ }
}
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
  private letzteLochVersion = -1
  private loecher = new HordeLoecher()
  private bossZiel = new THREE.Vector3()
  private bossPunkte = [new THREE.Vector3(), new THREE.Vector3()]
  private bossListe: (THREE.Vector3 | undefined)[] = [undefined, undefined]
  private letzteGasseVersion = -1
  private basisLaenge = 0
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
  private einsatz: Einsatzbilder
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
    this.einsatz = new Einsatzbilder(welt)
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
  setzeSeed(seed: number): void { this.zufallZustand = seed >>> 0; this.einsatz.setzeSeed(seed) }
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
  nachlauf(dt: number): void {
    this.uhr += Math.max(0, dt); this.tickeNeu(); this.einsatz.nachlauf(dt); this.loecher.schritt(dt)
    if (this.letzterStand) this.aktualisiereHorde(this.letzterStand.z)
  }
  private aktualisiereHorde(z: Zustand): number {
    const zombies = z.y <= 0 ? 0 : Math.min(DARSTELLUNG.HORDE_MAX, Math.ceil(z.Z))
    if (this.basisLaenge) this.loecher.passeAn(this.basisLaenge)
    if ((zombies !== this.letzteHorde || this.loecher.version !== this.letzteLochVersion || this.einsatz.gasse.version !== this.letzteGasseVersion) && this.uhr - this.hordeZeit >= .1) {
      const gebaut = baueHorde(zombies, this.loecher.indizes, this.einsatz.gasse)
      this.welt.zombieMasse.setze(gebaut.eintraege)
      this.basisLaenge = gebaut.basisLaenge
      this.letzteHorde = zombies; this.hordeZeit = this.uhr; this.letzteLochVersion = this.loecher.version; this.letzteGasseVersion = this.einsatz.gasse.version
    }
    return zombies
  }
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
    this.bossListe[0] = w.miniboss.objekt.visible ? this.bossPunkte[0].copy(w.miniboss.objekt.position).add(this.bossZiel.set(0, 1.5, 0)) : undefined
    this.bossListe[1] = w.eliteboss.objekt.visible ? this.bossPunkte[1].copy(w.eliteboss.objekt.position).add(this.bossZiel.set(0, 1.5, 0)) : undefined
    this.einsatz.abgleichen(z, ereignisse, dt, this.bossListe[0] ?? this.bossListe[1], this.bossListe)
    this.loecher.schritt(dt)
    const zombiesSichtbar = z.y <= 0 ? 0 : Math.min(DARSTELLUNG.HORDE_MAX, Math.ceil(z.Z))
    const treffListe = this.einsatz.nimmTreffer()
    if (treffListe.length && !this.basisLaenge) this.basisLaenge = baueHorde(zombiesSichtbar, this.loecher.indizes, this.einsatz.gasse).basisLaenge
    for (const treffer of treffListe) this.loecher.treffer(zombiesSichtbar, -z.y, treffer.punkt, treffer.menge, treffer.radius, this.basisLaenge, this.einsatz.gasse)
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
    this.tempo += Math.max(-DARSTELLUNG.SCHILDER_BESCHLEUNIGUNG * dt, Math.min(DARSTELLUNG.SCHILDER_BESCHLEUNIGUNG * dt, soll - this.tempo))
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
    const zombies = this.aktualisiereHorde(z)
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
    this.einsatz.gibFrei()
    this.loecher.zuruecksetzen()
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
        this.vorgaenger.einsatz.zuruecksetzen()
        this.vorgaenger.loecher.zuruecksetzen()
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
