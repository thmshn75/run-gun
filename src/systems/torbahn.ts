import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS } from '../config/colors'
import { advanceAlongRoad, getRoadScale, getRoadSegment } from './road'
import { getCurrentScrollSpeed } from './speed'
import { torGeometrie } from './torObjekt'
import { getTorlaufStand, torPaarZiehen, type TorWirkung } from './torlaufPlan'
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

/** Zwei getrennte Kollisionsobjekte bilden ein gemeinsames Los: der Anker entscheidet. */
export class Torbahn implements BahnSystem {
  private readonly walls: Phaser.Physics.Arcade.Group
  private readonly rewards: Phaser.Physics.Arcade.Group
  private readonly tore: TorZustand[] = []
  private readonly zuTor = new Map<Phaser.GameObjects.GameObject, TorZustand>()
  private abstand = BALANCE.torlauf.tor.abstandPx
  private readonly scene: Phaser.Scene
  private readonly getTeamSize: () => number
  private readonly getCrowdAnchorX: () => number
  private readonly zufall: () => number
  private readonly applyReinforcement: (apply: (current: number) => number, popup: string) => void

  public constructor(
    scene: Phaser.Scene,
    getTeamSize: () => number,
    getCrowdAnchorX: () => number,
    zufall: () => number,
    applyReinforcement: (apply: (current: number) => number, popup: string) => void,
  ) {
    this.scene = scene
    this.getTeamSize = getTeamSize
    this.getCrowdAnchorX = getCrowdAnchorX
    this.zufall = zufall
    this.applyReinforcement = applyReinforcement
    this.walls = scene.physics.add.group()
    this.rewards = scene.physics.add.group()
    for (let i = 0; i < 8; i += 1) {
      const tor = this.erzeugeTor()
      this.tore.push(tor)
      this.zuTor.set(tor.bild, tor)
    }
  }

  public getWalls(): Phaser.Physics.Arcade.Group { return this.walls }

  public getRewards(): Phaser.Physics.Arcade.Group { return this.rewards }

  public hasActivePair(): boolean { return this.tore.some((tor) => tor.aktiv) }

  public resetForLevel(_level: number): void {
    this.deactivateAll()
    this.abstand = BALANCE.torlauf.tor.abstandPx
  }

  public deactivateAll(): void {
    for (const tor of this.tore) this.recycle(tor)
  }

  public istTorFenster(): boolean {
    const t = BALANCE.torlauf.tor
    return istImTorFenster(this.abstand, t.abstandPx, t.gegnerSperreVorPx, t.gegnerSperreNachPx)
  }

  public isWall(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    return this.zuTor.has(candidate)
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
    const tor = this.zuTor.get(wall)
    if (tor === undefined || !tor.aktiv || !this.istAnkerseite(tor)) return 0
    const stand = getTorlaufStand(tor.startwert, tor.treffer, this.getTeamSize())
    if (tor.wirkung.art === 'mal' && stand >= 0) {
      const faktor = tor.wirkung.faktor
      this.applyReinforcement((n) => Math.min(BALANCE.torlauf.crowd.max, n * faktor), `×${faktor}`)
    } else {
      this.applyReinforcement((n) => Math.max(1, n + stand), '')
    }
    const partner = tor.partner
    this.recycle(tor)
    if (partner !== undefined) this.recycle(partner)
    return stand
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
    if (this.abstand >= BALANCE.torlauf.tor.abstandPx) {
      this.abstand -= BALANCE.torlauf.tor.abstandPx
      this.spawnePaar()
    }
    for (const tor of this.tore) {
      if (!tor.aktiv) continue
      tor.anchorY = advanceAlongRoad(this.scene.scale.width, this.scene.scale.height, tor.anchorY, bewegung)
      const segment = getRoadSegment(this.scene.scale.width, this.scene.scale.height, tor.anchorY, BALANCE.torlauf.tor.hoehePx)
      const geo = torGeometrie(this.scene.scale.width, this.scene.scale.height, segment.centerY, tor.seite)
      const alpha = Math.min(1, Math.max(0, (segment.centerY - segment.height / 2 - BALANCE.road.horizonY) / BALANCE.road.entryFadePx))
      tor.bild.setPosition(geo.x, segment.centerY).setDisplaySize(geo.breite, segment.height).setAlpha(alpha)
      ;(tor.bild.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      const scale = getRoadScale(this.scene.scale.width, this.scene.scale.height, segment.centerY)
      tor.label.setPosition(geo.x, segment.centerY - 10 * scale).setScale(scale).setAlpha(alpha)
      tor.restLabel.setPosition(geo.x, segment.centerY + 17 * scale).setScale(scale).setAlpha(alpha)
      if (segment.centerY - segment.height / 2 > this.scene.scale.height) this.recycle(tor)
    }
  }

  private spawnePaar(): void {
    const links = this.tore.find((t) => !t.aktiv)
    const rechts = this.tore.find((t) => !t.aktiv && t !== links)
    if (links === undefined || rechts === undefined) return
    const paar = torPaarZiehen(this.zufall, this.getTeamSize())
    this.aktiviere(links, paar[0].seite, paar[0].wirkung, paar[0].startwert)
    this.aktiviere(rechts, paar[1].seite, paar[1].wirkung, paar[1].startwert)
    links.partner = rechts
    rechts.partner = links
  }

  private aktiviere(tor: TorZustand, seite: 'links' | 'rechts', wirkung: TorWirkung, startwert: number): void {
    tor.seite = seite
    tor.wirkung = wirkung
    tor.startwert = startwert
    tor.treffer = 0
    tor.anchorY = BALANCE.road.horizonY
    tor.aktiv = true
    tor.partner = undefined
    tor.bild.enableBody(true, 0, 0, true, true).setActive(true).setVisible(true).setAlpha(0)
    ;(tor.bild.body as Phaser.Physics.Arcade.Body).moves = false
    tor.label.setActive(true).setVisible(true).setAlpha(0)
    tor.restLabel.setActive(true).setVisible(true).setAlpha(0)
    this.beschrifte(tor)
  }

  private beschrifte(tor: TorZustand): void {
    const stand = getTorlaufStand(tor.startwert, tor.treffer, this.getTeamSize())
    if (tor.wirkung.art === 'mal') {
      tor.label.setText(`×${tor.wirkung.faktor}`).setColor(HUD_COLORS.torMal)
      tor.restLabel.setText(stand < 0 ? `${stand}` : '').setColor('#ff6b6b')
    } else {
      tor.label.setText(stand > 0 ? `+${stand}` : `${stand}`).setColor(stand > 0 ? '#3ddc84' : '#ff6b6b')
      tor.restLabel.setText('')
    }
    tor.bild.setTexture(stand > 0 ? 'wall-segment-right' : 'wall-segment-bad')
  }

  private istAnkerseite(tor: TorZustand): boolean {
    return tor.seite === (this.getCrowdAnchorX() >= this.scene.scale.width / 2 ? 'rechts' : 'links')
  }

  private recycle(tor: TorZustand): void {
    tor.aktiv = false
    tor.partner = undefined
    tor.bild.disableBody(true, true).setActive(false).setVisible(false)
    tor.label.setActive(false).setVisible(false)
    tor.restLabel.setActive(false).setVisible(false)
  }

  private erzeugeTor(): TorZustand {
    const bild = this.scene.physics.add.image(0, 0, 'wall-segment-bad').setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    ;(bild.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
    bild.disableBody(true, true)
    this.walls.add(bild)
    const text = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '30px',
      color: '#ffffff',
      stroke: HUD_COLORS.textDark,
      strokeThickness: 4,
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
      wirkung: { art: 'plus' },
      anchorY: BALANCE.road.horizonY,
      startwert: -1,
      treffer: 0,
      aktiv: false,
      partner: undefined,
    }
  }
}
