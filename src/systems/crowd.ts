import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { computeFormation } from './formation'
import { approachAngle, getBobOffsetPx, getLeanRadians, getPhaseOffset, getStepCycleHz } from './gamefeel'
import { getDriveLimitHalfWidth } from './roadGeometry'
import { overlapsVisibleFigure, type RectangleBounds } from './rectangles'

type FormationMember = {
  readonly sprite: Phaser.GameObjects.Image
  readonly shadow: Phaser.GameObjects.Image
  offsetX: number
  offsetY: number
  row: number
}

export class Crowd {
  private readonly scene: Phaser.Scene
  private readonly members: FormationMember[]
  private figuresAlpha: number
  private readonly hull: Phaser.GameObjects.Zone
  private readonly figureWidth: number
  private readonly figureHeight: number
  private anchorX: number
  private readonly anchorY: number
  private salvoCursor: number
  private halfFormationWidth: number = 0
  private elapsedMs: number = 0
  private lastAnchorX: number
  private leanRadians: number = 0
  private wallPresenceProvider: ((y: number, halfSpanPx: number) => Readonly<{ left: boolean; right: boolean }>) | null = null

  public constructor(scene: Phaser.Scene, anchorX: number, anchorY: number) {
    this.scene = scene
    this.anchorX = anchorX
    this.lastAnchorX = anchorX
    this.anchorY = anchorY
    this.salvoCursor = 0
    this.figuresAlpha = 1
    this.members = []

    // Die Spielerfigur liegt seit W7 in doppelter Aufloesung vor - erst nach setScale
    // stimmt displayWidth wieder mit der Spielgroesse ueberein, an der Formation,
    // Fahrbereich und Schatten haengen.
    const firstSprite = scene.add.image(anchorX, anchorY, 'player').setScale(BALANCE.render.figureTextureScale)
    this.figureWidth = firstSprite.displayWidth
    this.figureHeight = firstSprite.displayHeight
    const hullWidth = firstSprite.displayWidth * BALANCE.crowd.hullWidthFigures
    const hullHeight = firstSprite.displayHeight * BALANCE.crowd.hullHeightFigures
    firstSprite.setActive(false).setVisible(false)

    // Bodenschatten: einmal je Poolplatz erzeugt, nie zur Laufzeit.
    const shadowWidth = this.figureWidth * BALANCE.shadow.widthOfFigure
    for (let index = 0; index < BALANCE.pools.crowd; index += 1) {
      const sprite = index === 0
        ? firstSprite
        : scene.add.image(anchorX, anchorY, 'player').setScale(BALANCE.render.figureTextureScale)
      sprite.setActive(false).setVisible(false)
      const shadow = scene.add.image(anchorX, anchorY, 'figure-shadow')
        .setDepth(BALANCE.layers.shadow)
        .setDisplaySize(shadowWidth, shadowWidth * BALANCE.shadow.heightOfWidth)
        .setAlpha(BALANCE.shadow.alpha)
        .setActive(false)
        .setVisible(false)
      this.members.push({ sprite, shadow, offsetX: 0, offsetY: 0, row: 0 })
    }

    this.hull = scene.add.zone(anchorX, anchorY, hullWidth, hullHeight)
    scene.physics.add.existing(this.hull)
    const body = this.hull.body as Phaser.Physics.Arcade.Body
    body.setSize(hullWidth, hullHeight)
    body.setAllowGravity(false)
    this.update(0)
  }

  public setSize(count: number): void {
    const size = Phaser.Math.Clamp(Math.floor(count), 0, BALANCE.crowd.max)
    const slots = computeFormation(size, {
      rowSpacingY: BALANCE.crowd.rowSpacingY,
      colSpacing: BALANCE.crowd.colSpacing,
      minColSpacing: BALANCE.crowd.minColSpacing,
      maxWidth: this.scene.scale.width * BALANCE.crowd.maxWidthRatio,
      maxDepth: this.scene.scale.height - this.anchorY - this.figureHeight / 2 - BALANCE.crowd.bottomMargin,
    })

    this.halfFormationWidth = slots.reduce((widest, slot) => Math.max(widest, Math.abs(slot.offsetX)), 0)

    for (let index = 0; index < this.members.length; index += 1) {
      const member = this.members[index]
      const slot = slots[index]
      if (slot === undefined) {
        member.sprite.setActive(false).setVisible(false)
        member.shadow.setActive(false).setVisible(false)
        continue
      }
      member.offsetX = slot.offsetX
      member.offsetY = slot.offsetY
      member.row = slot.row
      member.sprite
        .setPosition(this.anchorX + slot.offsetX, this.anchorY + slot.offsetY)
        .setDepth(BALANCE.layers.gameplay + slot.row)
        .setActive(true)
        .setVisible(true)
        .setAlpha(1)
      member.shadow.setActive(true).setVisible(true)
    }
    this.salvoCursor = 0
  }

  public setAnchorX(x: number): void {
    const range = this.getAnchorRange()
    this.anchorX = Phaser.Math.Clamp(x, range.min, range.max)
  }

  public setWallPresenceProvider(provider: (y: number, halfSpanPx: number) => Readonly<{ left: boolean; right: boolean }>): void {
    this.wallPresenceProvider = provider
  }

  public getAnchorRange(): Readonly<{ min: number; max: number }> {
    // Dynamischer Fahrbereich (Thomas 2026-08-22): In einer Wand-Luecke geht es bis an
    // den Strassenrand hinaus. Neben einem Wandsegment darf die Truppe sich seit der
    // Treffer-Korrektur an die Wand DRUECKEN statt am Korridor zu stoppen — gemessen
    // (390 x 844, Truppenhoehe y=714): am Korridor endet die Truppe auf Spuranteil
    // 0,519, die Wand beginnt erst bei 0,660. Mit spurtreuen Kugeln traf sie von dort
    // kein einziges Segment mehr. Der Anker darf deshalb bis Wandinnenkante + halbe
    // Formationsbreite + Ueberstand (driveIntoWallFigures), sodass die GANZE Formation
    // in der Wandzone steht und die HP-Herleitung aus der vollen Feuerkraft wieder
    // aufgeht. Die Strassenkante bleibt harte Grenze; Wandkontakt kostet nichts.
    const inset = this.figureWidth * BALANCE.player.dragClampFigures + BALANCE.player.dragClampMargin
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    const presence = this.wallPresenceProvider === null ? undefined : this.wallPresenceProvider(this.anchorY, this.figureHeight / 2)
    const overlapPx = this.figureWidth * BALANCE.walls.driveIntoWallFigures
    const limit = (hasWall: boolean): number =>
      getDriveLimitHalfWidth(width, height, this.anchorY, hasWall, this.halfFormationWidth, inset, overlapPx)
    const leftHalf = limit(presence === undefined || presence.left)
    const rightHalf = limit(presence === undefined || presence.right)
    const center = width / 2
    return { min: center - leftHalf, max: center + rightHalf }
  }

  public getAnchorX(): number {
    return this.anchorX
  }

  public getAnchorY(): number {
    return this.anchorY
  }

  public getFigureHeight(): number {
    return this.figureHeight
  }

  public getHullBounds(): Phaser.GameObjects.Zone {
    return this.hull
  }

  public overlapsFigure(rect: RectangleBounds): boolean {
    return overlapsVisibleFigure(rect, this.members)
  }

  public setFiguresAlpha(alpha: number): void {
    // Beim Blinken nach einem Treffer muss der Schatten mitgehen, sonst bleibt ein
    // Fleck auf der Strasse stehen, waehrend die Figur verschwunden ist. update()
    // schreibt die Schatten-Deckkraft jedes Bild neu, deshalb hier nur merken.
    this.figuresAlpha = alpha
    for (const member of this.members) {
      if (member.sprite.active) member.sprite.setAlpha(alpha)
    }
  }

  public getNextSalvoPositions(maxPerSalvo: number): Array<{ x: number; y: number }> {
    const activeMembers = this.members.filter((member) => member.sprite.active)
    if (activeMembers.length === 0) {
      this.salvoCursor = 0
      return []
    }

    const count = Math.min(activeMembers.length, Math.max(0, Math.floor(maxPerSalvo)))
    const start = this.salvoCursor % activeMembers.length
    const origins: Array<{ x: number; y: number }> = []
    for (let offset = 0; offset < count; offset += 1) {
      const member = activeMembers[(start + offset) % activeMembers.length]
      origins.push({ x: member.sprite.x, y: member.sprite.y })
    }
    this.salvoCursor = (start + count) % activeMembers.length
    return origins
  }

  public update(dt: number): void {
    // Rueckt ein Wandabschnitt auf Truppenhoehe, schiebt der enger gewordene Bereich
    // die Truppe sanft in den Korridor zurueck statt sie hart zu versetzen.
    const range = this.getAnchorRange()
    const clamped = Phaser.Math.Clamp(this.anchorX, range.min, range.max)
    if (clamped !== this.anchorX) {
      const maxStep = (BALANCE.player.wallNudgeSpeedPxPerSec * dt) / 1000
      this.anchorX += Phaser.Math.Clamp(clamped - this.anchorX, -maxStep, maxStep)
    }

    // Lebendigkeit: Wippen im Laufrhythmus und Neigung beim Lenken. Beides rechnet
    // gamefeel.ts, damit die Herleitung ohne Phaser pruefbar bleibt.
    this.elapsedMs += dt
    const anchorSpeed = dt > 0 ? ((this.anchorX - this.lastAnchorX) * 1000) / dt : 0
    this.lastAnchorX = this.anchorX
    this.leanRadians = approachAngle(
      this.leanRadians,
      getLeanRadians(anchorSpeed),
      dt,
      BALANCE.gamefeel.leanHalfLifeMs,
    )
    const cycleHz = getStepCycleHz(this.figureHeight)

    for (let index = 0; index < this.members.length; index += 1) {
      const member = this.members[index]
      if (!member.sprite.active) continue
      const bob = getBobOffsetPx(this.elapsedMs, cycleHz, getPhaseOffset(index), BALANCE.gamefeel.bobAmplitudePx)
      const x = this.anchorX + member.offsetX
      const groundY = this.anchorY + member.offsetY
      member.sprite.setPosition(x, groundY + bob)
      member.sprite.setRotation(this.leanRadians)
      // Der Schatten bleibt am Boden, waehrend die Figur wippt, und schrumpft mit der
      // Hebung. Erst dadurch liest man das Wippen als Schritt statt als Zittern.
      // bob ist negativ (nach oben), deshalb der Betrag.
      const lift = Math.abs(bob)
      const shrink = Math.max(0, 1 - lift * BALANCE.shadow.liftShrinkPerPx)
      const width = this.figureWidth * BALANCE.shadow.widthOfFigure * shrink
      member.shadow.setPosition(x, groundY + this.figureHeight * BALANCE.shadow.footOffsetOfHeight)
      member.shadow.setDisplaySize(width, width * BALANCE.shadow.heightOfWidth)
      member.shadow.setAlpha(BALANCE.shadow.alpha * shrink * this.figuresAlpha)
    }
    // Die Kollisionshuelle bleibt bewusst ruhig: Sie darf nicht mitwippen, sonst
    // haengt Schaden am Zufall des Laufzyklus.
    this.hull.setPosition(this.anchorX, this.anchorY)
    ;(this.hull.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
  }
}
