import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS } from '../config/colors'
import { advanceAlongRoad, getRoadScale, getRoadSegment } from './road'
import { getRoadHalfWidth } from './roadGeometry'
import { getCurrentScrollSpeed } from './speed'
import { computeBlockFormation } from './formation'
import { getBobOffsetPx, getPhaseOffset, getStepCycleHz } from './gamefeel'
import { getLevelPlan } from './levelPlan'
import { torGeometrieMitte } from './torObjekt'
import { torFaktorZiehen, type TorWirkung } from './torlaufPlan'
import { istImTorFenster } from './versuchPlan'
import type { BahnSystem } from './versuchBahnen'
import type { WeaponKey } from './weapons'

type TorZustand = {
  bild: Phaser.Physics.Arcade.Image
  label: Phaser.GameObjects.Text
  restLabel: Phaser.GameObjects.Text
  seite: 'links' | 'rechts'
  wirkung: TorWirkung
  anchorY: number
  startwert: number
  treffer: number
  aktiv: boolean
  partner: TorZustand | undefined
}

type KachelZustand = {
  bild: Phaser.Physics.Arcade.Image
  label: Phaser.GameObjects.Text
  anchorY: number
  aktiv: boolean
}

export type HordeZustand = {
  /** Unsichtbarer Kollisionskoerper ueber die Bahnbreite; die Optik machen `figuren`. */
  bild: Phaser.Physics.Arcade.Image
  figuren: Phaser.GameObjects.Image[]
  label: Phaser.GameObjects.Text
  anchorY: number
  y: number
  punkte: number
  aktiv: boolean
  haelt: boolean
  /** Zeit seit dem letzten Treffer; steuert, ob die Horde haelt oder vorrueckt. */
  ohneTrefferMs: number
}

/** Zwei getrennte Kollisionsobjekte bilden ein gemeinsames Los: der Anker entscheidet. */
export class Torbahn implements BahnSystem {
  private readonly walls: Phaser.Physics.Arcade.Group
  private readonly rewards: Phaser.Physics.Arcade.Group
  private readonly tore: TorZustand[] = []
  private readonly zuTor = new Map<Phaser.GameObjects.GameObject, TorZustand>()
  private readonly kacheln: KachelZustand[] = []
  private readonly zuKachel = new Map<Phaser.GameObjects.GameObject, KachelZustand>()
  private horde: HordeZustand | undefined
  /** Eigene Uhr fuer den Gehtakt der Hordenfiguren. */
  private hordeZeitMs = 0
  private abstand = BALANCE.torlauf.tor.abstandPx
  private kachelAbstand = BALANCE.torlauf.kachel.abstandPx
  private nextSpawnId = 1
  public paareVerbraucht = 0
  private readonly scene: Phaser.Scene
  private readonly zufall: () => number

  public constructor(
    scene: Phaser.Scene,
    _getTeamSize: () => number,
    _getCrowdAnchorX: () => number,
    zufall: () => number,
    _applyReinforcement: (apply: (current: number) => number, popup: string) => void,
  ) {
    this.scene = scene
    this.zufall = zufall
    this.walls = scene.physics.add.group()
    this.rewards = scene.physics.add.group()
    for (let i = 0; i < 8; i += 1) {
      const tor = this.erzeugeTor()
      this.tore.push(tor)
      this.zuTor.set(tor.bild, tor)
    }
    for (let i = 0; i < BALANCE.pools.kacheln; i += 1) {
      const kachel = this.erzeugeKachel()
      this.kacheln.push(kachel)
      this.zuKachel.set(kachel.bild, kachel)
    }
  }

  public getWalls(): Phaser.Physics.Arcade.Group { return this.walls }

  public getRewards(): Phaser.Physics.Arcade.Group { return this.rewards }

  public hasActivePair(): boolean { return this.tore.some((tor) => tor.aktiv) || this.kacheln.some((kachel) => kachel.aktiv) || this.horde?.aktiv === true }

  public resetForLevel(_level: number): void {
    this.deactivateAll()
    this.abstand = BALANCE.torlauf.tor.abstandPx
    this.kachelAbstand = BALANCE.torlauf.kachel.abstandPx
  }

  public deactivateAll(): void {
    for (const tor of this.tore) this.recycle(tor)
    for (const kachel of this.kacheln) this.recycleKachel(kachel)
  }

  public istTorFenster(): boolean {
    const t = BALANCE.torlauf.tor
    return istImTorFenster(this.abstand, t.abstandPx, t.gegnerSperreVorPx, t.gegnerSperreNachPx)
  }

  public isWall(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    return this.zuTor.has(candidate)
  }

  public istHorde(candidate: Phaser.GameObjects.GameObject): boolean { return this.horde?.bild === candidate && this.horde.aktiv }

  public spawneHorde(level: number): void {
    if (this.horde === undefined) this.horde = this.erzeugeHorde()
    const horde = this.horde
    horde.anchorY = BALANCE.road.horizonY
    horde.y = BALANCE.road.horizonY
    horde.punkte = BALANCE.torlauf.horde.basis * getLevelPlan(level).hardness
    horde.aktiv = true
    horde.haelt = false
    horde.ohneTrefferMs = 0
    horde.bild.enableBody(true, 0, 0, true, true).setActive(true).setVisible(true)
    ;(horde.bild.body as Phaser.Physics.Arcade.Body).moves = false
    horde.label.setActive(true).setVisible(true)
    this.beschrifteHorde(horde)
  }

  public getHorde(): HordeZustand | undefined { return this.horde?.aktiv ? this.horde : undefined }

  public damageHorde(punkte: number): boolean {
    const horde = this.getHorde()
    if (horde === undefined) return false
    horde.punkte = Math.max(0, horde.punkte - punkte)
    horde.ohneTrefferMs = 0
    this.beschrifteHorde(horde)
    return horde.punkte === 0
  }

  public recycleHorde(): void {
    const horde = this.horde
    if (horde === undefined) return
    horde.aktiv = false
    horde.bild.disableBody(true, true).setActive(false).setVisible(false)
    for (const figur of horde.figuren) figur.setActive(false).setVisible(false)
    horde.label.setActive(false).setVisible(false)
  }

  public istKachel(candidate: Phaser.GameObjects.GameObject): boolean {
    return this.zuKachel.get(candidate)?.aktiv === true
  }

  public getTorWirkung(candidate: Phaser.GameObjects.GameObject): TorWirkung | undefined {
    return this.zuTor.get(candidate)?.wirkung
  }

  public recyclePaar(wall: Phaser.Physics.Arcade.Image): void {
    const tor = this.zuTor.get(wall)
    if (tor === undefined || !tor.aktiv) return
    const partner = tor.partner
    this.recycle(tor)
    if (partner !== undefined) this.recycle(partner)
    this.paareVerbraucht += 1
  }

  public recycleKachelBild(wall: Phaser.Physics.Arcade.Image): void {
    const kachel = this.zuKachel.get(wall)
    if (kachel !== undefined) this.recycleKachel(kachel)
  }

  public getWallPresence(): Readonly<{ left: boolean; right: boolean }> {
    return { left: false, right: false }
  }

  public isPickupSegment(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    return this.zuTor.get(candidate)?.aktiv === true
  }

  public isDrainSegment(_candidate: Phaser.GameObjects.GameObject): boolean { return false }

  public isReward(_candidate: Phaser.GameObjects.GameObject): _candidate is Phaser.Physics.Arcade.Image { return false }

  public collect(_reward: Phaser.Physics.Arcade.Image): WeaponKey | undefined { return undefined }

  public getSegmentHeight(_side: 'left' | 'right'): number { return BALANCE.torlauf.tor.hoehePx }

  public collectPickup(wall: Phaser.Physics.Arcade.Image): number {
    // Im Torlauf darf die Truppenhuelle nie mehr × oder + auf die Quelle anwenden.
    this.recyclePaar(wall)
    return 0
  }

  /** Ein Treffer ist ein Restwert-Punkt, unabhängig von Schaden und Waffe. */
  public damage(wall: Phaser.Physics.Arcade.Image, _damage: number): boolean {
    const tor = this.zuTor.get(wall)
    if (tor === undefined || !tor.aktiv) return false
    tor.treffer += 1
    this.beschrifte(tor)
    return false
  }

  public update(dt: number): void {
    const bewegung = getCurrentScrollSpeed() * dt / 1000
    this.abstand += bewegung
    // Kein Nachschub mehr im Takt: Es gibt GENAU EIN Tor, es steht fest in der Mitte
    // und bleibt dauerhaft stehen (Thomas 2026-09-19).
    this.sorgeFuerMitteltor()
    this.kachelAbstand += bewegung
    if (this.kachelAbstand >= BALANCE.torlauf.kachel.abstandPx) {
      this.kachelAbstand -= BALANCE.torlauf.kachel.abstandPx
      this.spawneKachel()
    }
    for (const tor of this.tore) {
      if (!tor.aktiv) continue
      // Feste Hoehe, kein Mitlaufen mit der Strasse und kein Recycling: Das Tor ist ein
      // Fixpunkt der Bahn, durch den der Strom immer wieder hindurchlaeuft.
      const mitteY = BALANCE.torlauf.tor.festY
      const scale = getRoadScale(this.scene.scale.width, this.scene.scale.height, mitteY)
      const hoehe = BALANCE.torlauf.tor.hoehePx * scale
      const geo = torGeometrieMitte(this.scene.scale.width, this.scene.scale.height, mitteY)
      tor.bild.setPosition(geo.x, mitteY).setDisplaySize(geo.breite, hoehe).setAlpha(1)
      ;(tor.bild.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      tor.label.setPosition(geo.x, mitteY).setScale(scale).setAlpha(1)
      tor.restLabel.setAlpha(0)
    }
    for (const kachel of this.kacheln) {
      if (!kachel.aktiv) continue
      kachel.anchorY = advanceAlongRoad(this.scene.scale.width, this.scene.scale.height, kachel.anchorY, bewegung)
      const segment = getRoadSegment(this.scene.scale.width, this.scene.scale.height, kachel.anchorY, BALANCE.torlauf.tor.hoehePx)
      const halbbreite = getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, segment.centerY)
      const massstab = getRoadScale(this.scene.scale.width, this.scene.scale.height, segment.centerY)
      const breite = halbbreite * BALANCE.torlauf.kachel.breiteAnteil
      const hoehe = breite * BALANCE.torlauf.kachel.hoeheAnteil
      // Linke Aussenkante: Strassenrand + perspektivischer Spalt, dann die halbe Platte.
      const x = this.scene.scale.width / 2 - halbbreite + BALANCE.torlauf.kachel.randSpaltPx * massstab + breite / 2
      kachel.bild.setPosition(x, segment.centerY).setDisplaySize(breite, hoehe)
      ;(kachel.bild.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      kachel.label.setPosition(x, segment.centerY).setScale(breite / 48)
      if (segment.centerY - segment.height / 2 > this.scene.scale.height) this.recycleKachel(kachel)
    }
    const horde = this.getHorde()
    if (horde !== undefined) {
      this.hordeZeitMs += dt
      // EIGENES, langsames Tempo statt des Strassenscrolls: Mit der Bahngeschwindigkeit
      // rauschte die Horde heran, bevor der am Tor verdoppelte Strom sie erreichen
      // konnte. Jetzt braucht sie vom Horizont bis zur Truppe rund 18 s, und der
      // Strom trifft sie die ganze Zeit ueber (Thomas 2026-09-19: "die Horde schon
      // viel frueher kommen, aber langsam").
      horde.ohneTrefferMs += dt
      if (!horde.haelt) {
        horde.y += BALANCE.torlauf.horde.anflugTempoPxPerSec * dt / 1000
        if (horde.y >= BALANCE.torlauf.horde.haltY) horde.haelt = true
      } else if (horde.ohneTrefferMs >= BALANCE.torlauf.horde.ohneTrefferVorrueckenMs) {
        // Nur ohne Beschuss geht es weiter nach vorn. Unter Beschuss bleibt die Horde
        // auf ihrem Kampfplatz hinter dem Tor stehen.
        horde.y += BALANCE.torlauf.horde.vorrueckTempoPxPerSec * dt / 1000
      }
      // Harte Grenze auf Hoehe der Truppe: ohne sie wanderte die Horde unbegrenzt weiter
      // nach unten, verliess das Bild und kam nie in Beruehrung - der Nahkampf fand nie
      // statt. Hier stehenbleiben heisst Dauerkontakt mit der Huelle, also fressen.
      horde.y = Math.min(horde.y, this.scene.scale.height - BALANCE.torlauf.horde.grenzeBodenAbstandPx)
      this.positioniereHorde(horde)
    }
  }

  private spawneKachel(): void {
    const kachel = this.kacheln.find((candidate) => !candidate.aktiv)
    if (kachel === undefined) return
    kachel.anchorY = BALANCE.road.horizonY
    kachel.aktiv = true
    kachel.bild.enableBody(true, 0, 0, true, true).setActive(true).setVisible(true)
    ;(kachel.bild.body as Phaser.Physics.Arcade.Body).moves = false
    kachel.label.setActive(true).setVisible(true)
  }

  private sorgeFuerMitteltor(): void {
    if (this.tore.some((tor) => tor.aktiv)) return
    const tor = this.tore.find((kandidat) => !kandidat.aktiv)
    if (tor === undefined) return
    tor.seite = 'links'
    tor.wirkung = { art: 'mal', faktor: torFaktorZiehen(this.zufall) }
    tor.startwert = 0
    tor.treffer = 0
    tor.aktiv = true
    tor.anchorY = BALANCE.torlauf.tor.festY
    tor.bild.setData('spawnId', this.nextSpawnId)
    this.nextSpawnId += 1
    tor.bild.enableBody(true, 0, 0, true, true).setActive(true).setVisible(true).setAlpha(1)
    ;(tor.bild.body as Phaser.Physics.Arcade.Body).moves = false
    tor.label.setActive(true).setVisible(true).setAlpha(1)
    tor.restLabel.setActive(false).setVisible(false)
    this.beschrifte(tor)
  }

  private beschrifte(tor: TorZustand): void {
    // Nur noch der Faktor. Die zweite Zeile trug frueher den Reststand eines Pfeilers,
    // den der Strom erst aufhacken musste - den gibt es nicht mehr.
    tor.label.setText(`×${tor.wirkung.faktor}`).setColor('#ffffff')
    tor.restLabel.setText('')
    tor.bild.setTexture('wall-segment-right')
  }

  private recycle(tor: TorZustand): void {
    tor.aktiv = false
    tor.partner = undefined
    tor.bild.disableBody(true, true).setActive(false).setVisible(false)
    tor.label.setActive(false).setVisible(false)
    tor.restLabel.setActive(false).setVisible(false)
  }

  private recycleKachel(kachel: KachelZustand): void {
    kachel.aktiv = false
    kachel.bild.disableBody(true, true).setActive(false).setVisible(false)
    kachel.label.setActive(false).setVisible(false)
  }

  private erzeugeTor(): TorZustand {
    const bild = this.scene.physics.add.image(0, 0, 'wall-segment-bad').setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    ;(bild.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
    bild.disableBody(true, true)
    this.walls.add(bild)
    // 44 px statt 30: Der Faktor ist die einzige Information am Tor und muss aus der
    // Entfernung lesbar sein. Weiss auf dunklem Rand statt des blassen Lila, das auf
    // dem blauen Torband kaum zu sehen war.
    const text = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '44px',
      color: '#ffffff',
      stroke: HUD_COLORS.textDark,
      strokeThickness: 6,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(BALANCE.layers.wallContent).setActive(false).setVisible(false)
    const restLabel = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#ff6b6b',
      stroke: HUD_COLORS.textDark,
      strokeThickness: 3,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(BALANCE.layers.wallContent).setActive(false).setVisible(false)
    return {
      bild,
      label: text,
      restLabel,
      seite: 'links',
      wirkung: { art: 'mal', faktor: 2 },
      anchorY: BALANCE.road.horizonY,
      startwert: -1,
      treffer: 0,
      aktiv: false,
      partner: undefined,
    }
  }

  private erzeugeKachel(): KachelZustand {
    const bild = this.scene.physics.add.image(0, 0, 'wall-segment-right').setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    ;(bild.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
    bild.disableBody(true, true)
    this.walls.add(bild)
    const label = this.scene.add.text(0, 0, '+1', { fontFamily: 'system-ui', fontSize: '24px', color: '#3ddc84', stroke: HUD_COLORS.textDark, strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5).setDepth(BALANCE.layers.wallContent).setActive(false).setVisible(false)
    return { bild, label, anchorY: BALANCE.road.horizonY, aktiv: false }
  }

  private erzeugeHorde(): HordeZustand {
    // Der Koerper traegt die Kollision ueber die ganze Bahnbreite, wird aber NICHT
    // gezeichnet (Alpha 0): Eine rote Wand mit Zahl ist keine Horde. Gesehen wird die
    // Masse aus `figuren`, die mit jedem abgebauten Stueck sichtbar duenner wird.
    const bild = this.scene.physics.add.image(0, 0, 'wall-segment-bad').setDepth(BALANCE.layers.gameplay).setAlpha(0).setActive(false).setVisible(false)
    ;(bild.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
    bild.disableBody(true, true)
    this.walls.add(bild)
    const figuren: Phaser.GameObjects.Image[] = []
    for (let index = 0; index < BALANCE.pools.hordeFiguren; index += 1) {
      const figur = this.scene.add.image(0, 0, 'enemy-standard')
        .setDepth(BALANCE.layers.gameplay)
        .setScale(BALANCE.render.figureTextureScale * BALANCE.torlauf.crowd.figureScale)
        .setTint(BALANCE.torlauf.horde.tint)
        .setActive(false).setVisible(false)
      figur.setData('phaseOffset', getPhaseOffset(index))
      figuren.push(figur)
    }
    const label = this.scene.add.text(0, 0, '', { fontFamily: 'system-ui', fontSize: '34px', color: '#ffffff', stroke: HUD_COLORS.textDark, strokeThickness: 5, fontStyle: 'bold' }).setOrigin(0.5).setDepth(BALANCE.layers.wallContent).setActive(false).setVisible(false)
    return { bild, figuren, label, anchorY: BALANCE.road.horizonY, y: BALANCE.road.horizonY, punkte: 0, aktiv: false, haelt: false, ohneTrefferMs: 0 }
  }

  private positioniereHorde(horde: HordeZustand): void {
    const mitte = this.scene.scale.width / 2
    const breite = getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, horde.y) * 2
    horde.bild.setPosition(mitte, horde.y).setDisplaySize(breite, BALANCE.torlauf.horde.hoehePx)
    ;(horde.bild.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
    this.stelleHordeAuf(horde, mitte, breite)
  }

  /**
   * Verteilt so viele Figuren auf die Kollisionsflaeche, wie die Horde noch Punkte hat.
   * Damit schrumpft die Masse sichtbar, waehrend der Strom sie abarbeitet - das ist der
   * Unterschied zwischen "rote Wand, deren Zahl kleiner wird" und einer Horde.
   */
  private stelleHordeAuf(horde: HordeZustand, mitte: number, breite: number): void {
    const konfig = BALANCE.torlauf.horde
    const gewuenscht = Math.min(konfig.maxFiguren, Math.ceil(horde.punkte / konfig.punkteJeSichtbarerFigur))
    const plaetze = computeBlockFormation(gewuenscht, {
      rowSpacingY: konfig.reihenAbstandPx,
      colSpacing: konfig.spaltenAbstandPx,
      minColSpacing: Math.min(konfig.spaltenAbstandPx, 9),
      maxWidth: breite * 0.92,
      maxDepth: konfig.hoehePx * 0.8,
      plaetzeJeReihe: konfig.plaetzeJeReihe,
    })
    // Vorderste Reihe an der Unterkante: Die Horde laeuft der Truppe entgegen, also
    // stehen die hinteren Reihen weiter oben, Richtung Horizont.
    const unterkante = horde.y + konfig.hoehePx / 2
    for (let index = 0; index < horde.figuren.length; index += 1) {
      const figur = horde.figuren[index]
      const platz = plaetze[index]
      if (platz === undefined) {
        if (figur.visible) figur.setActive(false).setVisible(false)
        continue
      }
      const figurY = unterkante - platz.offsetY
      const wippen = getBobOffsetPx(this.hordeZeitMs, getStepCycleHz(figur.displayHeight / BALANCE.torlauf.crowd.figureScale), figur.getData('phaseOffset') as number, BALANCE.gamefeel.bobAmplitudePx * BALANCE.torlauf.crowd.figureScale)
      figur.setPosition(mitte + platz.offsetX, figurY + wippen).setActive(true).setVisible(true)
    }
    // Die Zahl sitzt direkt ueber der hintersten Reihe, nicht ueber der (viel hoeheren)
    // Kollisionsflaeche: sonst schwebt sie weit vor der Masse in der Bahn.
    const tiefe = plaetze.length === 0 ? 0 : Math.max(...plaetze.map((platz) => platz.offsetY))
    horde.label.setPosition(mitte, unterkante - tiefe - BALANCE.torlauf.zahlAbstandPx * 0.6)
  }

  private beschrifteHorde(horde: HordeZustand): void { horde.label.setText(`${Math.ceil(horde.punkte)}`) }
}
