import { BUEHNE, DARSTELLUNG, FAHRZEUGE, FIGUREN, LEVELS, SPEZIAL, type FahrzeugName, type Level } from './balance3d'
import { neuerLauf, schritt, phaseBei, saeulenStartP, type AktiveEinheit, type Ereignis, type Trupp, type Zustand } from './rechnung'
import { glaetteX, kernX } from './steuerung'
import { bossFreieAufstellung } from './bosse'
import { saeulenZiele, type Welt } from './szene'
import { eisZahl } from './eis'
import type { SoldatEintrag } from './soldaten'
import { SoldatenMasse } from './soldaten'
import { BossBalken, Explosionen, Muendungsblitze, Rauchwolken, ZahlAnzeige } from './anzeigen'
import { baueFeldFahrzeug } from './fahrzeuge'
import { MECHA_ACHSEN, mechaPose } from './mecha'
import type { ZombieEintrag } from './figuren'
import { setzeSchildText } from './schilder'
import * as THREE from 'three'

const SPUR_FOLGE = [4, 7, 1, 9, 2, 5, 0, 8, 3, 6] as const
type FeldStand = { gruppe: THREE.Group; name: FahrzeugName; halt1: number; halt2?: number; schneiseZ?: number; gasseBegonnen?: boolean; abgang: number; abgangPos?: THREE.Vector3; abgangKurs?: number; schuss: number; schussUhr: number; rest: number; ziel?: THREE.Vector3; zielPhase?: number; offsetX: number; kreisVersatz: number; bossSchuss: number; bossExplosionen: Set<string>; letzteZiele: THREE.Vector3[]; raketenSalven?: number; feuert?: boolean }
type Rakete = { start: THREE.Vector3; ziel: THREE.Vector3; alter: number; menge: number; bilder: number; puffs: number }
export type HordeTreffer = { punkt: THREE.Vector3; menge: number; radius: number }

type PruefSchuss = { name: 'haubitze' | 'panzer'; nummer: number; t: number; zeit: number; blitzId: number; explosionId: number; blitzBilder: number; explosionsBilder: number; laengstesBild: number; programmeVorher: number; neueProgramme: number }
export class PruefDiagnose {
  private schuesse: PruefSchuss[] = []
  private letzteBilder: { zeit: number; dauer: number }[] = []
  private zeit = 0
  private programmeVorher = 0
  private programmeNachZweitem: number | null = null
  readonly vorwaermen: boolean
  constructor(vorwaermen: boolean) { this.vorwaermen = vorwaermen }
  vorBild(zeit: number, programmeVorher: number): void { this.zeit = zeit; this.programmeVorher = programmeVorher }
  schuss(name: 'haubitze' | 'panzer', nummer: number, t: number, blitzId: number, explosionId: number): void {
    const letzte = this.letzteBilder.filter(b => this.zeit - b.zeit <= 500)
    this.schuesse.push({ name, nummer, t, zeit: this.zeit, blitzId, explosionId, blitzBilder: 0, explosionsBilder: 0,
      laengstesBild: Math.max(0, ...letzte.map(b => b.dauer)), programmeVorher: this.programmeVorher, neueProgramme: 0 })
  }
  bild(zeit: number, dauer: number, programme: number, bilder: Einsatzbilder): void {
    this.letzteBilder.push({ zeit, dauer })
    this.letzteBilder = this.letzteBilder.filter(b => zeit - b.zeit <= 500)
    for (const s of this.schuesse) {
      if (zeit - s.zeit <= 500) s.laengstesBild = Math.max(s.laengstesBild, dauer)
      if (zeit >= s.zeit) {
        if (bilder.blitzAktiv(s.blitzId)) s.blitzBilder++
        if (bilder.explosionen.istAktiv(s.explosionId)) s.explosionsBilder++
        if (zeit - s.zeit <= 500) s.neueProgramme = Math.max(s.neueProgramme, programme - s.programmeVorher)
      }
    }
    const zweiter = this.schuesse.find(s => s.name === 'haubitze' && s.nummer === 2)
    if (zweiter && zeit - zweiter.zeit >= 1000 && this.programmeNachZweitem === null) this.programmeNachZweitem = programme
  }
  get anzahl(): number { return this.schuesse.length }
  get programmZahlen(): readonly [number | null, number | null] { return [this.schuesse.find(s => s.name === 'haubitze' && s.nummer === 1)?.programmeVorher ?? null, this.programmeNachZweitem] }
  text(): string {
    const [vor, nach] = this.programmZahlen
    return this.schuesse.map(s => `${s.name === 'haubitze' ? 'Haubitze' : 'Panzer'} Schuss ${s.nummer} · t ${s.t.toFixed(2)} s · Blitz ${s.blitzBilder} Bilder · Explosion ${s.explosionsBilder} Bilder · laengstes Bild ${Math.round(s.laengstesBild)} ms · neue Programme ${s.neueProgramme} · Vorwaermen ${this.vorwaermen ? 'an' : 'aus'}`).join('\n') + (vor === null ? '' : `\nProgramme vor Schuss 1: ${vor} · 1 s nach Schuss 2: ${nach ?? 'ausstehend'}`)
  }
}

export class Einsatzbilder {
  private welt: Welt
  readonly explosionen = new Explosionen()
  readonly blitze = new Muendungsblitze(4)
  readonly rauch = new Rauchwolken()
  // Feste acht Instanzen für zwei Salven; inaktive Matrizen haben Skalierung null.
  readonly raketen = new THREE.InstancedMesh(new THREE.ConeGeometry(.15, .68, 6), new THREE.MeshBasicMaterial({ color: '#d03920' }), 8)
  private laufGeometrie = new THREE.CylinderGeometry(.035, .035, .38, 6)
  private laufMaterial = new THREE.MeshStandardMaterial({ color: '#252b30', metalness: 0, roughness: .8 })
  private raketenFlug: (Rakete | null)[] = Array(8).fill(null)
  private wartendeRaketen: Rakete[] = []
  private raketenMatrix = new THREE.Matrix4()
  private fahrzeuge = new Map<AktiveEinheit, FeldStand>()
  private blitzPunkte: { id: number; pos: THREE.Vector3; rest: number; dauer: number; durchmesser: number; klein: boolean; bilder?: number }[] = []
  private blitzPositionen: THREE.Vector3[] = []
  private blitzGroessen: number[] = []
  private blitzHelligkeiten: number[] = []
  private naechsterBlitz = 0
  pruefDiagnose?: PruefDiagnose
  private treffer: HordeTreffer[] = []
  private offeneTreffer: Ereignis[] = []
  private zufallZustand = 1
  private wegwerf = new THREE.Vector3()
  private rotorUhr = 0
  readonly gasse = new HordeGasse()
  constructor(welt: Welt) {
    this.welt = welt
    this.raketen.count = 0
    welt.scene.add(this.explosionen.objekt, this.blitze.objekt, this.rauch.objekt, this.raketen)
    welt.laufGruppen.push(this.explosionen.objekt, this.blitze.objekt, this.rauch.objekt, this.raketen)
  }
  setzeSeed(seed: number): void { this.zufallZustand = (seed ^ 0x9e3779b9) >>> 0 }
  private zufall(): number {
    let n = this.zufallZustand = (this.zufallZustand + 0x6D2B79F5) >>> 0
    n = Math.imul(n ^ (n >>> 15), n | 1); n ^= n + Math.imul(n ^ (n >>> 7), n | 61)
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
  private schussTiefe(z: Zustand, haubitze: boolean): number {
    const sichtbar = z.y <= 0 ? 0 : Math.min(DARSTELLUNG.HORDE_MAX, Math.ceil(z.Z))
    const aufstellung = baueHorde(sichtbar, new Set()).eintraege
    const tiefe = aufstellung.length ? -Math.min(...aufstellung.map(e => e.z)) : 0
    const nah = Math.max(haubitze ? 4.5 : 4, .4 * tiefe)
    const fern = Math.max(6, .85 * tiefe)
    return nah + (fern - nah) * this.zufall()
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
  private mechaPunkt(stand: FeldStand, links: boolean, rakete: boolean, nummer = 0): THREE.Vector3 {
    stand.gruppe.updateMatrixWorld(true)
    const x = (links ? -1 : 1) * (rakete ? .7 : 1.15) + (rakete ? (nummer % 2 ? .1 : -.1) : 0)
    return stand.gruppe.localToWorld(new THREE.Vector3(x, rakete ? 3.95 : 2.65, rakete ? -.35 : -1.15))
  }
  private starteRaketen(stand: FeldStand, z: Zustand, menge: number): void {
    const tiefe = this.schussTiefe(z, true)
    const ziel = new THREE.Vector3((this.zufall() - .5) * 2.5, .2, -z.y - tiefe)
    for (let i = 0; i < 4; i++) {
      const slot = this.raketenFlug.findIndex(r => r === null)
      const punkt = ziel.clone().add(new THREE.Vector3((i % 2 ? 1 : -1) * .55, 0, i < 2 ? -.5 : .5))
      const start = this.mechaPunkt(stand, i < 2, true, i)
      const rakete = { start, ziel: punkt, alter: 0, menge: menge / 4, bilder: 0, puffs: 0 }
      if (slot < 0) this.wartendeRaketen.push(rakete)
      else this.raketenFlug[slot] = rakete
      if (this.blitzPunkte.length >= 4) this.blitzPunkte.splice(Math.max(0, this.blitzPunkte.findIndex(b => b.klein)), 1)
      this.blitzPunkte.push({ id: ++this.naechsterBlitz, pos: start.clone(), rest: .12, dauer: .12, durchmesser: .8, klein: false, bilder: 0 })
      this.rauch.starte(start, .6, 1.4, .5)
      stand.letzteZiele.push(punkt.clone())
    }
  }
  private setzeMecha(stand: FeldStand, zeit: number, laufend: boolean): void {
    const p = mechaPose(zeit, laufend), rumpf = stand.gruppe.getObjectByName('rumpf')
    if (!rumpf) return
    rumpf.position.y = p.rumpfY
    rumpf.rotation.z = THREE.MathUtils.degToRad(p.rumpfPendel)
    for (const [seite, bein] of [['l', p.links], ['r', p.rechts]] as const) {
      const o = stand.gruppe.getObjectByName(`oberschenkel_${seite}`)
      const u = stand.gruppe.getObjectByName(`unterschenkel_${seite}`)
      const f = stand.gruppe.getObjectByName(`fuss_${seite}`)
      const achse = (werte: readonly [number, number, number]) => new THREE.Vector3(...werte).normalize()
      if (o) o.quaternion.setFromAxisAngle(achse(MECHA_ACHSEN.huefte), THREE.MathUtils.degToRad(bein.huefte))
      if (u) u.quaternion.setFromAxisAngle(achse(seite === 'l' ? MECHA_ACHSEN.knieL : MECHA_ACHSEN.knieR), THREE.MathUtils.degToRad(bein.knie))
      if (f) f.quaternion.setFromAxisAngle(achse(MECHA_ACHSEN.knoechel), THREE.MathUtils.degToRad(bein.fuss))
    }
  }
  private baueMechaLaeufe(gruppe: THREE.Group): void {
    for (const links of [true, false]) {
      const rotator = new THREE.Group()
      rotator.name = links ? 'mecha-lauf-l' : 'mecha-lauf-r'
      rotator.position.set(links ? -1.15 : 1.15, 2.65, -1.15)
      for (let i = 0; i < 3; i++) {
        const lauf = new THREE.Mesh(this.laufGeometrie, this.laufMaterial)
        const winkel = i * 2 * Math.PI / 3
        lauf.position.set(Math.cos(winkel) * .11, Math.sin(winkel) * .11, -.2)
        lauf.rotation.x = Math.PI / 2
        lauf.layers.set(1)
        rotator.add(lauf)
      }
      gruppe.add(rotator)
    }
  }
  blitzAktiv(id: number): boolean { return this.blitze.objekt.count > 0 && this.blitzPunkte.some(b => b.id === id) }
  private schiesse(stand: FeldStand, ziel: THREE.Vector3, durchmesser: number, menge = 0, radius = 0, t = 0, mechaSeite?: boolean): void {
    stand.schuss++
    stand.letzteZiele.push(ziel.clone())
    const werte = DARSTELLUNG.FAHRZEUG_BLITZ[stand.name]
    const klein = stand.name === 'humvee' || stand.name === 'hubschrauber' || stand.name === 'mecha'
    if (this.blitzPunkte.length >= 4 && !klein) {
      const index = this.blitzPunkte.findIndex(b => b.klein)
      this.blitzPunkte.splice(index >= 0 ? index : 0, 1)
    }
    let blitzId = -1
    if (this.blitzPunkte.length < 4) {
      const richtung = new THREE.Vector3(0, 0, -1)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), FAHRZEUGE[stand.name].FELD_DREHUNG * Math.PI / 180)
        .applyQuaternion(stand.gruppe.getWorldQuaternion(new THREE.Quaternion()))
      blitzId = ++this.naechsterBlitz
      const pos = stand.name === 'mecha' ? this.mechaPunkt(stand, mechaSeite ?? true, false) : this.muendung(stand)
      this.blitzPunkte.push({ id: blitzId, pos: pos.addScaledVector(richtung, .3 * werte.durchmesser), rest: werte.dauer, dauer: werte.dauer, durchmesser: werte.durchmesser, klein, bilder: 0 })
    }
    const explosionId = stand.name === 'mecha' ? -1 : this.explosionen.starte(ziel, durchmesser)
    if (stand.name === 'haubitze' || stand.name === 'panzer') this.pruefDiagnose?.schuss(stand.name, stand.schuss, t, blitzId, explosionId)
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
    let sichtbar = false
    for (let i = 0; i < this.raketenFlug.length; i++) {
      const rakete = this.raketenFlug[i]
      if (!rakete) { this.raketen.setMatrixAt(i, this.raketenMatrix.makeScale(0, 0, 0)); continue }
      rakete.alter += Math.max(0, dt); rakete.bilder++
      const anteil = Math.min(1, rakete.alter / .6)
      const punkt = rakete.start.clone().lerp(rakete.ziel, anteil)
      punkt.y += 3 * 4 * anteil * (1 - anteil)
      while (rakete.puffs < 4 && anteil >= (rakete.puffs + 1) / 5) {
        const spur = ++rakete.puffs / 5
        const pos = rakete.start.clone().lerp(rakete.ziel, spur)
        pos.y += 12 * spur * (1 - spur)
        this.rauch.starte(pos, .25, .45, .4)
      }
      const tangent = rakete.ziel.clone().sub(rakete.start).add(new THREE.Vector3(0, 12 * (1 - 2 * anteil), 0)).normalize()
      this.raketenMatrix.compose(punkt, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent), new THREE.Vector3(1, 1, 1))
      this.raketen.setMatrixAt(i, this.raketenMatrix); sichtbar = true
      if (anteil === 1 && rakete.bilder >= 3) {
        this.explosionen.starte(rakete.ziel, 4)
        this.treffer.push({ punkt: rakete.ziel.clone(), menge: rakete.menge, radius: 2 })
        this.raketenFlug[i] = null
      }
    }
    this.raketen.count = sichtbar ? 8 : 0
    this.raketen.instanceMatrix.needsUpdate = true
    this.rauch.schritt(dt, this.welt.camera)
    while (this.wartendeRaketen.length) {
      const slot = this.raketenFlug.findIndex(r => r === null)
      if (slot < 0) break
      this.raketenFlug[slot] = this.wartendeRaketen.shift()!
    }
    this.blitzPositionen.length = 0
    this.blitzGroessen.length = 0; this.blitzHelligkeiten.length = 0
    for (let i = this.blitzPunkte.length - 1; i >= 0; i--) {
      const blitz = this.blitzPunkte[i]
      const bilder = blitz.bilder ?? 0
      if (bilder > 0) blitz.rest -= dt
      blitz.bilder = bilder + 1
      if (blitz.rest <= 0 && blitz.bilder > 3) this.blitzPunkte.splice(i, 1)
      else {
        const anteil = blitz.rest > 0 ? blitz.rest / blitz.dauer : .2
        this.blitzPositionen.push(blitz.pos)
        this.blitzGroessen.push(blitz.durchmesser * (.6 + .4 * anteil))
        this.blitzHelligkeiten.push(anteil)
      }
    }
    this.blitze.setze(this.blitzPositionen, this.welt.camera, this.blitzPositionen.length, this.blitzGroessen, this.blitzHelligkeiten)
    for (const stand of this.fahrzeuge.values()) if (stand.name === 'hubschrauber') {
      stand.gruppe.getObjectByName('rotor')?.rotation.set(0, this.rotorUhr * 8 * Math.PI, 0)
      stand.gruppe.getObjectByName('heckrotor')?.rotation.set(this.rotorUhr * 12 * Math.PI, 0, 0)
    }
    for (const stand of this.fahrzeuge.values()) if (stand.name === 'mecha') {
      stand.gruppe.getObjectByName('mecha-lauf-l')?.rotation.set(0, 0, stand.feuert ? this.rotorUhr * 20 : 0)
      stand.gruppe.getObjectByName('mecha-lauf-r')?.rotation.set(0, 0, stand.feuert ? -this.rotorUhr * 20 : 0)
    }
    for (const [a, stand] of this.fahrzeuge) if (stand.abgang >= 0) {
      stand.abgang += dt
      const dauer = stand.name === 'panzer' ? .6 : stand.name === 'hubschrauber' ? 1 : .8
      stand.gruppe.scale.setScalar(Math.max(0, 1 - stand.abgang / dauer))
      const p = stand.abgangPos!
      if ((stand.name === 'panzer' || stand.name === 'humvee') && stand.schneiseZ !== undefined) {
        const start = stand.name === 'panzer' ? stand.halt2! : stand.halt1
        const schneiseDauer = stand.name === 'panzer' ? SPEZIAL.panzer.ablauf[4].dauer : SPEZIAL.humvee.ablauf[1].dauer
        stand.gruppe.position.z = p.z - (start - stand.schneiseZ) / schneiseDauer * Math.min(stand.abgang, dauer)
      }
      else if (stand.name === 'hubschrauber') stand.gruppe.position.set(p.x + 12 * Math.min(stand.abgang, dauer) * -Math.sin(stand.abgangKurs!), p.y + 3 * Math.min(stand.abgang, dauer), p.z - 12 * Math.min(stand.abgang, dauer) * Math.cos(stand.abgangKurs!))
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
        if (name === 'mecha') this.baueMechaLaeufe(gruppe)
        const boden = name !== 'hubschrauber'
        const belegte = [...this.fahrzeuge.values()].filter(s => s.name !== 'hubschrauber' && s.abgang < 0).map(s => s.offsetX)
        const offsetX = boden ? (belegte.includes(0) ? belegte.includes(2) ? -2 : 2 : 0) : 0
        const kreisVersatz = !boden && [...this.fahrzeuge.values()].some(s => s.name === 'hubschrauber' && s.abgang < 0) ? Math.PI : 0
        gruppe.position.set(offsetX, name === 'hubschrauber' ? 9 : 0, 10)
        this.welt.scene.add(gruppe); this.welt.laufGruppen.push(gruppe)
        const halt1 = name === 'mecha' ? (-5 - Math.max(5, z.y)) / 2 : -5 - FAHRZEUGE[name].LAENGE * FAHRZEUGE[name].SPIEL_SKALA / 2 - 1
        const phase = phaseBei(name, a.verstrichen)
        const geplant = name === 'panzer' ? [1.45, 1.85, 3.7, 4.1].filter(t => t <= a.verstrichen + 1e-9).length : 0
        const stand: FeldStand = { gruppe, name, halt1, abgang: -1, schuss: geplant, schussUhr: 0, rest: 0, offsetX, kreisVersatz, bossSchuss: 0, bossExplosionen: new Set(), letzteZiele: [], raketenSalven: 0 }
        this.fahrzeuge.set(a, stand)
        if (phase.art === 'schneise' && (name === 'panzer' || name === 'humvee')) {
          this.gasse.beginne(offsetX, FAHRZEUGE[name].SCHNEISE_HALB); stand.gasseBegonnen = true
        }
      }
    }
    for (const [a, stand] of this.fahrzeuge) {
      if (stand.abgang >= 0) continue
      const phase = phaseBei(a.einheit, a.verstrichen)
      if (stand.name === 'mecha') {
        stand.feuert = phase.index === 1
        if (phase.index === 0) stand.gruppe.position.z = THREE.MathUtils.lerp(10, stand.halt1, phase.anteil)
        else if (phase.index === 3) stand.gruppe.position.z = THREE.MathUtils.lerp(stand.halt1, 10, phase.anteil)
        else stand.gruppe.position.z = stand.halt1
        this.setzeMecha(stand, phase.index === 3 ? -phase.lokal : phase.lokal, phase.index === 0 || phase.index === 3)
      } else if (stand.name === 'hubschrauber') {
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
        if (phase.index === 0) stand.gruppe.position.z = THREE.MathUtils.lerp(10, stand.halt1, phase.anteil)
        else {
          if (stand.schneiseZ === undefined) {
            const sichtbar = z.y <= 0 ? 0 : Math.min(DARSTELLUNG.HORDE_MAX, Math.ceil(z.Z))
            const aufstellung = baueHorde(sichtbar, new Set()).eintraege
            const tiefe = aufstellung.length ? -Math.min(...aufstellung.map(e => e.z)) : 0
            stand.schneiseZ = -z.y - tiefe - 4
          }
          stand.gruppe.position.z = THREE.MathUtils.lerp(stand.halt1, stand.schneiseZ, phase.anteil)
          if (!stand.gasseBegonnen) { this.gasse.beginne(stand.offsetX, FAHRZEUGE.humvee.SCHNEISE_HALB); stand.gasseBegonnen = true }
          this.gasse.erweitere(stand.gruppe.position.z - FAHRZEUGE.humvee.LAENGE * FAHRZEUGE.humvee.SPIEL_SKALA / 2 + z.y)
        }
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
      if (stand.name === 'mecha') {
        if (aktuellePhase === 1) {
          if (ereignis) stand.rest += ereignis.menge
          if (ereignis || bossPunkt) {
            stand.schussUhr = Math.min(stand.schussUhr + dt, .5)
            while (stand.schussUhr >= .25 - 1e-9) {
              stand.schussUhr -= .25
              const menge = Math.floor(stand.rest + 1e-9)
              stand.rest -= menge
              for (const links of [true, false]) {
                const boss = !!bossPunkt && (stand.bossSchuss++ % 3 === 0)
                const ziel = boss ? bossPunkt!.clone() : new THREE.Vector3((this.zufall() - .5) * 4, .2, -z.y - this.schussTiefe(z, false))
                this.schiesse(stand, ziel, 0, boss ? 0 : links ? Math.ceil(menge / 2) : Math.floor(menge / 2), 1.2, a.verstrichen, links)
              }
            }
          }
        } else if (aktuellePhase === 2 && ereignis && (stand.raketenSalven ?? 0) < 2) {
          this.starteRaketen(stand, z, ereignis.menge)
          stand.raketenSalven = (stand.raketenSalven ?? 0) + 1
        }
        continue
      }
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
            const x = stand.name === 'humvee' ? stand.offsetX - 1.2 + 2.4 * (s % 24 <= 12 ? s % 24 : 24 - s % 24) / 12 : -2.8 + 5.6 * this.zufall()
            const tief = stand.name === 'humvee' ? .5 + 2 * this.zufall() : DARSTELLUNG.HUBSCHRAUBER_FRONTABSTAND + (9 - DARSTELLUNG.HUBSCHRAUBER_FRONTABSTAND) * this.zufall()
            const ziel = boss ? bossPunkt!.clone() : new THREE.Vector3(x, .2, stand.name === 'humvee' ? stand.gruppe.position.z - FAHRZEUGE.humvee.LAENGE * FAHRZEUGE.humvee.SPIEL_SKALA / 2 - tief : -z.y - tief)
            if (boss) ziel.z = Math.min(ziel.z - DARSTELLUNG.HUBSCHRAUBER_BOSS_VERSATZ, -z.y - DARSTELLUNG.HUBSCHRAUBER_FRONTABSTAND)
            const menge = boss ? 0 : Math.floor(stand.rest + 1e-9)
            if (stand.name === 'humvee') stand.rest = 0
            else if (!boss) stand.rest -= menge
            this.schiesse(stand, ziel, stand.name === 'humvee' ? 3 : 2.5, stand.name === 'humvee' ? 0 : menge, stand.name === 'humvee' ? 0 : 2, a.verstrichen)
          }
        }
        continue
      }
      if (stand.name === 'panzer' && ereignis && (aktuellePhase === 1 || aktuellePhase === 3) && stand.zielPhase !== aktuellePhase) {
        stand.zielPhase = aktuellePhase
        stand.ziel = new THREE.Vector3((aktuellePhase === 1 ? -1.7 : 1.7) + (this.zufall() - .5), .2, -z.y - this.schussTiefe(z, false))
      }
      const geplant = stand.name === 'panzer' ? [1.45, 1.85, 3.7, 4.1].filter(t => t <= a.verstrichen + 1e-9).length : 0
      const schuesse = stand.name === 'haubitze' ? (ereignis ? 1 : 0) : geplant - stand.schuss
      for (let i = 0; i < Math.max(0, schuesse); i++) {
        const nummer = stand.schuss
        const links = stand.name === 'haubitze' ? nummer === 0 : nummer < 2
        if (!(stand.name === 'panzer' && (nummer === 0 || nummer === 2) && stand.zielPhase === (nummer === 0 ? 1 : 3))) {
          const zielX = (links ? -1.7 : 1.7) + (this.zufall() - .5)
          const tief = this.schussTiefe(z, stand.name === 'haubitze')
          stand.ziel = new THREE.Vector3(zielX, .2, -z.y - tief)
        }
        this.schiesse(stand, stand.ziel!, stand.name === 'haubitze' ? 7 : 4, 0, 0, a.verstrichen)
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
      if (stand.name === 'haubitze' && a.verstrichen >= SPEZIAL.haubitze.ablauf.reduce((summe, phase) => summe + phase.dauer, 0) - 1e-9) this.entferne(a, stand)
      else { stand.abgang = 0; stand.abgangPos = stand.gruppe.position.clone(); stand.abgangKurs = stand.gruppe.rotation.y }
    }
    this.ticke(dt)
  }
  nachlauf(dt: number): void { this.ticke(dt) }
  zuruecksetzen(): void {
    for (const [a, stand] of this.fahrzeuge) this.entferne(a, stand)
    this.explosionen.zuruecksetzen(); this.rauch.zuruecksetzen(); this.blitzPunkte.length = 0; this.blitzPositionen.length = 0; this.blitze.setze(this.blitzPositionen, this.welt.camera)
    this.treffer.length = 0; this.offeneTreffer.length = 0; this.rotorUhr = 0; this.gasse.zuruecksetzen()
    this.raketenFlug.fill(null); this.wartendeRaketen.length = 0; this.raketen.count = 0
  }
  gibFrei(): void {
    this.zuruecksetzen(); this.explosionen.gibFrei(); this.blitze.gibFrei(); this.rauch.gibFrei()
    this.raketen.removeFromParent(); this.raketen.geometry.dispose(); (this.raketen.material as THREE.Material).dispose()
    this.laufGeometrie.dispose(); this.laufMaterial.dispose()
    this.welt.laufGruppen = this.welt.laufGruppen.filter(o => o !== this.explosionen.objekt && o !== this.blitze.objekt && o !== this.rauch.objekt && o !== this.raketen)
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

export function saeulenBlick(x: number, figurX: number, figurZ: number, saeuleZ: number): number {
  const dx = BUEHNE.SAEULE_X - x - figurX
  const dz = saeuleZ - figurZ
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
// D6: Der Elite-Boss hat nur eine Bewegungsaufnahme; sein Tod wird gerechnet:
// 1,6 s nach hinten (weg von der Truppe) umkippen, dabei 0,8 m einsinken, nach 2,5 s weg.
export const ELITE_TOD = { KIPP_S: 1.6, DAUER_S: 2.5, SINKEN_M: .8, EXPLOSIONEN_S: [0, .45, 1] } as const
export function eliteSterben(alter: number): { kipp: number; sinken: number; sichtbar: boolean } {
  const a = Math.min(1, Math.max(0, alter / ELITE_TOD.KIPP_S)), weich = a * a * (3 - 2 * a)
  return { kipp: -Math.PI / 2 * weich, sinken: ELITE_TOD.SINKEN_M * weich, sichtbar: alter < ELITE_TOD.DAUER_S }
}
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
  readonly einsatz: Einsatzbilder
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
  private bild = 0
  private blockZuordnung: number[] = []
  private saeulenZiele: number[] = []
  private letzteZahlZeit = -Infinity
  constructor(welt: Welt, seed = 12345, pruefDiagnose?: PruefDiagnose) {
    this.welt=welt
    const ziele = saeulenZiele(LEVELS[0], 0, welt.miniaturen, welt.saeulen.length)
    welt.saeulen.forEach((saeule, i) => {
      saeule.position.z = ziele[i]
      saeule.visible = i <= DARSTELLUNG.SAEULEN_VORSCHAU
      welt.saeulenBloecke[i].visible = saeule.visible
    })
    this.zufallZustand = seed >>> 0
    this.fallSoldaten = new SoldatenMasse(welt.soldatBau, DARSTELLUNG.FALL_SOLDATEN_MAX)
    this.einsatz = new Einsatzbilder(welt)
    this.einsatz.pruefDiagnose = pruefDiagnose
    this.bossOriginal = originalBossFarben(welt.miniboss.objekt)
    this.eliteBasisY = welt.eliteboss.objekt.position.y
    this.setzeBossZurueck()
    this.miniBalken = new BossBalken(LEVELS[0].B_mini)
    this.eliteBalken = new BossBalken(LEVELS[0].B_elite)
    this.vorgaenger = weltDarstellungen.get(welt)
    weltDarstellungen.set(welt, this)
    this.setzeEisZurueck()
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
  private eliteTodSeit = -Infinity
  private eliteWarSichtbar = false
  private eliteExplosionen = 0
  private eliteBasisY = 0
  private truppeGefallen = false
  private aktualisiereElite(): void {
    if (this.eliteTodSeit === -Infinity) return
    const boss = this.welt.eliteboss.objekt, alter = this.uhr - this.eliteTodSeit, s = eliteSterben(alter)
    while (this.eliteExplosionen < ELITE_TOD.EXPLOSIONEN_S.length && alter >= ELITE_TOD.EXPLOSIONEN_S[this.eliteExplosionen]) {
      this.einsatz.explosionen.starte(boss.position.clone().add(new THREE.Vector3((this.eliteExplosionen - 1) * .9, 1.6 + this.eliteExplosionen * .6, 0)), 3)
      this.eliteExplosionen++
    }
    boss.visible = s.sichtbar; boss.rotation.x = s.kipp; boss.position.y = this.eliteBasisY - s.sinken
    this.eliteBalken.objekt.visible = false
  }
  private setzeBossZurueck(): void {
    this.eliteTodSeit = -Infinity; this.eliteWarSichtbar = false; this.eliteExplosionen = 0; this.truppeGefallen = false
    this.welt.eliteboss.objekt.rotation.x = 0; this.welt.eliteboss.objekt.position.y = this.eliteBasisY
    this.welt.miniboss.spiele('walk')
    this.welt.miniboss.objekt.visible = false
    this.bossOriginal.forEach((farbe, material) => material.color.copy(farbe))
    this.bossStand = { zustand: 'weg', clip: 'walk', einmal: false, sichtbar: false, balken: false, z: 0, todSeit: -Infinity }
    this.bossBlitzBis = this.letzterBossBlitz = -Infinity
  }
  diag(): Readonly<LaufDiag> { return { frontBewegung: this.letzteFrontBewegung, frontBlitze: this.frontBlitzAktiv, fallSoldatenAktiv: this.fallSoldatenListe.length, fallSoldatenEntstanden: this.fallSoldatenGesamt, bossZustand: this.bossStand.zustand } }
  setzeBild(bild: number): void { this.bild = bild }
  private ordneMiniaturen(level: Level, index: number): void {
    for (const mini of this.welt.miniaturen) mini.removeFromParent()
    const vergeben = new Set<THREE.Object3D>()
    for (let j = 0; j < this.welt.saeulen.length; j++) {
      const name = level.saeulen[(index + j) % level.saeulen.length]
      const mini = this.welt.miniaturen.find(m => m.name === `fahrzeug-${name}` && !vergeben.has(m))
      if (mini) {
        vergeben.add(mini)
        const i = this.blockZuordnung[j], block = this.welt.saeulenBloecke[i]
        block.add(mini); mini.visible = true
        this.welt.saeulenSchilder[i].position.y = (mini.userData.hoehe as number ?? 0) + .85
      }
    }
  }
  private setzeEisZurueck(): void {
    const w = this.welt
    w.eis.zuruecksetzen()
    this.blockZuordnung = w.saeulen.map((_, i) => i)
    this.saeulenZiele = saeulenZiele(this.letzterStand?.z.level ?? LEVELS[0], 0, w.miniaturen, w.saeulen.length)
    w.saeulen.forEach((s, i) => {
      s.position.set(BUEHNE.SAEULE_X, 0, this.saeulenZiele[i])
      s.visible = true
      w.saeulenBloecke[i].visible = true; w.saeulenBloecke[i].scale.setScalar(1)
      w.saeulenSchilder[i].visible = true
    })
    this.ordneMiniaturen(this.letzterStand?.z.level ?? LEVELS[0], 0)
    w.saeulenBloecke.forEach((block, i) => w.eis.setzeMaterial(block, i === 0))
    w.eis.setzeAktiv(w.saeulenBloecke[0], 0)
    this.letzteSaeule = -1; this.letzteSchildSaeule = -1; this.letzteSaeulenZahl = null
  }
  private zeichneTafel(schild: THREE.Mesh, wert: number): void {
    const canvas = schild.userData.canvas as HTMLCanvasElement, ctx = canvas.getContext('2d')!
    const zahl = eisZahl(wert)
    ctx.clearRect(0, 0, 256, 128)
    ctx.fillStyle = '#142d39e8'; ctx.fillRect(0, 0, 256, 94)
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    let px = 96; ctx.font = `bold ${px}px system-ui`
    while (px > 30 && ctx.measureText(zahl).width > 238) ctx.font = `bold ${--px}px system-ui`
    ctx.fillText(zahl, 128, 56)
    ;((schild.material as THREE.MeshBasicMaterial).map as THREE.CanvasTexture).needsUpdate = true
  }
  private tickeNeu(): void {
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
    this.aktualisiereElite()
    const stand = this.letzterStand?.z
    if (stand?.ergebnis === 'niederlage' && !this.truppeGefallen) {
      this.truppeGefallen = true
      this.welt.truppe.setze(formationsFiguren(stand.T, 'fallen').map(e => ({ ...e, start: this.uhr })))
    }
    this.welt.eis.aktualisiere(dt, this.bild)
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
    this.miniBalken.setzeMaximum(z.level.B_mini); this.eliteBalken.setzeMaximum(z.level.B_elite)
    const w = this.welt
    const t = z.t
    this.uhr += dt
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
      w.truppe.setze(formationsFiguren(z.T, bewegung).map(e => ({ ...e, dreh: saeulenBlick(x, e.x, e.z, this.saeulenZiele[0]) * this.drehAnteil })))
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
      const dreh = saeulenBlick(x, figur.x, figur.z, this.saeulenZiele[0]) * this.drehAnteil
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
    const eliteLebt=z.y>0&&z.eliteBoss.imFeld&&z.eliteBoss.B>0
    if(!eliteLebt&&this.eliteWarSichtbar&&z.eliteBoss.B<=0&&this.eliteTodSeit===-Infinity){this.eliteTodSeit=this.uhr;this.eliteExplosionen=0}
    this.eliteWarSichtbar=eliteLebt
    const spalten=Math.floor((FIGUREN.ZOMBIE_X_MAX-FIGUREN.ZOMBIE_X_MIN)/FIGUREN.ZOMBIE_SPALTENABSTAND)+1
    if(this.eliteTodSeit===-Infinity){
      w.eliteboss.objekt.visible=eliteLebt
      w.eliteboss.objekt.position.z=-z.y-(zombies?Math.ceil(zombies/spalten)*FIGUREN.ZOMBIE_REIHENABSTAND+2:0)
    }
    this.eliteBalken.objekt.visible=w.eliteboss.objekt.visible&&this.eliteTodSeit===-Infinity
    this.aktualisiereElite()
    if (this.eliteBalken.objekt.visible) this.eliteBalken.setze(z.eliteBoss.B,t)
    this.eliteBalken.objekt.position.set(w.eliteboss.objekt.position.x,FIGUREN.ELITEBOSS_HOEHE+.5,w.eliteboss.objekt.position.z)
    const fall = ereignisse.some(e => e.art === 'einheitFrei')
    const treffer = !fall && ereignisse.some(e => e.art === 'saeuleTreffer') && t - this.letzterGlasBlitz >= .2
    if (treffer) {
      this.letzterGlasBlitz = t; this.glasBlitzBis = t + .08
      const aktiv = w.saeulenBloecke[this.blockZuordnung[0]]
      if (aktiv) w.eis.trefferSplitter(new THREE.Box3().setFromObject(aktiv).getCenter(new THREE.Vector3()), this.bild)
    }
    w.eis.treffer.color.copy(w.eis.grundfarbe).lerp(w.eis.blitzfarbe, t < this.glasBlitzBis ? .65 : 0)
    if (z.saeulenIndex !== this.letzteSaeule) {
      if (this.letzteSaeule >= 0 && fall) {
        const alt = this.blockZuordnung.shift()!
        const block = w.saeulenBloecke[alt]
        w.eis.zerspringe(new THREE.Box3().setFromObject(block).getCenter(new THREE.Vector3()), this.bild)
        block.visible = false; w.saeulenSchilder[alt].visible = false
        this.blockZuordnung.push(alt)
        this.saeulenZiele = saeulenZiele(z.level, z.saeulenIndex, w.miniaturen, w.saeulen.length)
        w.saeulen[alt].position.z = this.saeulenZiele.at(-1)!
        block.scale.setScalar(.3)
        w.eis.treffer.color.copy(w.eis.grundfarbe)
        this.ordneMiniaturen(z.level, z.saeulenIndex)
        w.eis.setzeAktiv(w.saeulenBloecke[this.blockZuordnung[0]], z.saeulenIndex)
      } else {
        this.ordneMiniaturen(z.level, z.saeulenIndex)
        this.saeulenZiele = saeulenZiele(z.level, z.saeulenIndex, w.miniaturen, w.saeulen.length)
      }
      this.saeulenVon = this.blockZuordnung.map(i => w.saeulen[i].position.z)
      this.saeulenStart = this.uhr
      this.letzteSaeule = z.saeulenIndex
      this.letzteSchildSaeule = -1
      w.saeulenBloecke.forEach((block, i) => w.eis.setzeMaterial(block, i === this.blockZuordnung[0]))
    }
    const anteil = Math.min(1, (this.uhr - this.saeulenStart) / .6)
    this.blockZuordnung.forEach((i, j) => {
      const saeule = w.saeulen[i]
      const ziel = this.saeulenZiele[j]
      saeule.position.z = THREE.MathUtils.lerp(this.saeulenVon[j] ?? ziel, ziel, anteil)
      if (j === w.saeulen.length - 1 && w.saeulenBloecke[i].scale.x < 1) {
        w.saeulenBloecke[i].visible = true
        w.saeulenBloecke[i].scale.setScalar(anteil >= 1 - 1e-9 ? 1 : .3 + .7 * anteil)
        w.saeulenSchilder[i].visible = anteil >= 1 - 1e-9
      }
      w.saeulenSchilder[i].quaternion.copy(w.camera.quaternion)
    })
    w.eis.risse(z.P ?? 0, z.PStart ?? 0)
    w.eis.aktualisiere(dt, this.bild)
    const zahl = z.P === null ? null : Math.ceil(z.P)
    if (z.saeulenIndex !== this.letzteSchildSaeule || (zahl !== this.letzteSaeulenZahl && t - this.letzteZahlZeit >= .1)) {
      this.blockZuordnung.forEach((i, j) => this.zeichneTafel(w.saeulenSchilder[i], j === 0 ? z.P ?? 0 : saeulenStartP(z.level, z.saeulenIndex + j)))
      this.letzteSchildSaeule = z.saeulenIndex; this.letzteSaeulenZahl = zahl; this.letzteZahlZeit = t
    }
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
    this.welt.wand.scale.setScalar(1)
    this.setzeEisZurueck()
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
          this.vorgaenger.setzeEisZurueck()
          this.vorgaenger.letzteSaeule = -1
          this.vorgaenger.eliteTodSeit = -Infinity; this.vorgaenger.eliteWarSichtbar = false; this.vorgaenger.truppeGefallen = false
          this.welt.eliteboss.objekt.rotation.x = 0; this.welt.eliteboss.objekt.position.y = this.vorgaenger.eliteBasisY
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
