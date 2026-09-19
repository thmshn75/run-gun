import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { computeBlockFormation, computeFormation } from './formation'
import { approachAngle, createCrowdMotionProfiles, getBobOffsetPx, getLeanRadians, getStepCycleHz, getStepSquash, getStepSwayRadians, type CrowdMotionProfile } from './gamefeel'
import { getDriveLimitHalfWidth } from './roadGeometry'
import { overlapsVisibleFigure, type RectangleBounds } from './rectangles'

type FormationMember = {
  readonly sprite: Phaser.GameObjects.Image
  readonly shadow: Phaser.GameObjects.Image
  offsetX: number
  offsetY: number
  row: number
  readonly motion: CrowdMotionProfile
}

export type FormationsProfil = Readonly<{
  poolGroesse: number
  max: number
  figureScale: number
  rowSpacingY: number
  colSpacing: number
  minColSpacing: number
  maxWidthRatio: number
  form: 'dreieck' | 'block'
  plaetzeJeReihe: number
  huelleFolgtFormation: boolean
  bottomMargin: number
  hullWidthFigures: number
  hullHeightFigures: number
}>

export class Crowd {
  private readonly scene: Phaser.Scene
  private readonly profil: FormationsProfil
  private readonly members: FormationMember[]
  private figuresAlpha: number
  private readonly hull: Phaser.GameObjects.Zone
  private readonly figureWidth: number
  private readonly figureHeight: number
  private anchorX: number
  private readonly anchorY: number
  private salvoCursor: number
  private halfFormationWidth: number = 0
  private formationstiefe: number = 0
  private elapsedMs: number = 0
  private lastAnchorX: number
  private leanRadians: number = 0
  private wallPresenceProvider: ((y: number, halfSpanPx: number) => Readonly<{ left: boolean; right: boolean }>) | null = null

  public constructor(scene: Phaser.Scene, anchorX: number, anchorY: number, profil: FormationsProfil) {
    this.scene = scene
    this.profil = profil
    this.anchorX = anchorX
    this.lastAnchorX = anchorX
    this.anchorY = anchorY
    this.salvoCursor = 0
    this.figuresAlpha = 1
    this.members = []

    // Die Spielerfigur liegt seit W7 in doppelter Aufloesung vor - erst nach setScale
    // stimmt displayWidth wieder mit der Spielgroesse ueberein, an der Formation,
    // Fahrbereich und Schatten haengen.
    const firstSprite = scene.add.image(anchorX, anchorY, 'player').setScale(BALANCE.render.figureTextureScale * profil.figureScale)
    this.figureWidth = firstSprite.displayWidth
    this.figureHeight = firstSprite.displayHeight
    const hullWidth = firstSprite.displayWidth * profil.hullWidthFigures
    const hullHeight = firstSprite.displayHeight * profil.hullHeightFigures
    firstSprite.setActive(false).setVisible(false)

    // Bodenschatten: einmal je Poolplatz erzeugt, nie zur Laufzeit.
    const shadowWidth = this.figureWidth * BALANCE.shadow.widthOfFigure
    const motionProfiles = createCrowdMotionProfiles(profil.poolGroesse, () => Phaser.Math.RND.frac())
    for (let index = 0; index < profil.poolGroesse; index += 1) {
      const sprite = index === 0
        ? firstSprite
        : scene.add.image(anchorX, anchorY, 'player').setScale(BALANCE.render.figureTextureScale * profil.figureScale)
      sprite.setActive(false).setVisible(false)
      const shadow = scene.add.image(anchorX, anchorY, 'figure-shadow')
        .setDepth(BALANCE.layers.shadow)
        .setDisplaySize(shadowWidth, shadowWidth * BALANCE.shadow.heightOfWidth)
        .setAlpha(BALANCE.shadow.alpha)
        .setActive(false)
        .setVisible(false)
      this.members.push({ sprite, shadow, offsetX: 0, offsetY: 0, row: 0, motion: motionProfiles[index] })
    }

    this.hull = scene.add.zone(anchorX, anchorY, hullWidth, hullHeight)
    scene.physics.add.existing(this.hull)
    const body = this.hull.body as Phaser.Physics.Arcade.Body
    body.setSize(hullWidth, hullHeight)
    body.setAllowGravity(false)
    this.update(0)
  }

  public setSize(count: number): void {
    const size = Phaser.Math.Clamp(Math.floor(count), 0, this.profil.max)
    const options = {
      rowSpacingY: this.profil.rowSpacingY,
      colSpacing: this.profil.colSpacing,
      minColSpacing: this.profil.minColSpacing,
      maxWidth: this.scene.scale.width * this.profil.maxWidthRatio,
      maxDepth: this.scene.scale.height - this.anchorY - this.figureHeight / 2 - this.profil.bottomMargin,
    }
    const slots = this.profil.form === 'block'
      ? computeBlockFormation(size, { ...options, plaetzeJeReihe: this.profil.plaetzeJeReihe })
      : computeFormation(size, options)

    this.halfFormationWidth = slots.reduce((widest, slot) => Math.max(widest, Math.abs(slot.offsetX)), 0)
    this.formationstiefe = slots.reduce((deepest, slot) => Math.max(deepest, slot.offsetY), 0) + (slots.length > 0 ? this.figureHeight : 0)
    if (this.profil.huelleFolgtFormation) {
      const width = this.halfFormationWidth * 2 + this.figureWidth
      this.hull.setSize(width, this.formationstiefe)
      ;(this.hull.body as Phaser.Physics.Arcade.Body).setSize(width, this.formationstiefe)
    }

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

  public getFigureWidth(): number {
    return this.figureWidth
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
      // Optische Bewegung darf den Schussursprung nicht verschieben.
      origins.push({ x: this.anchorX + member.offsetX, y: this.anchorY + member.offsetY })
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
    const cycleHz = getStepCycleHz(this.figureHeight / this.profil.figureScale)

    for (let index = 0; index < this.members.length; index += 1) {
      const member = this.members[index]
      if (!member.sprite.active) continue
      const motion = member.motion
      const individualCycleHz = cycleHz * motion.frequencyFactor
      const bobAmplitude = BALANCE.gamefeel.bobAmplitudePx * this.profil.figureScale * motion.bobFactor
      const bob = getBobOffsetPx(this.elapsedMs, individualCycleHz, motion.phaseOffset, bobAmplitude, bobAmplitude * BALANCE.gamefeel.bobSecondWaveAmplitudeShare, BALANCE.gamefeel.bobSecondWaveFrequencyRatio)
      const x = this.anchorX + member.offsetX
      const groundY = this.anchorY + member.offsetY
      member.sprite.setPosition(x, groundY + bob)
      // Wiegen im Schritttakt kommt zur Neigung beim Lenken dazu: Das Lenken ist die
      // Reaktion auf den Finger, das Wiegen laeuft immer. Beide sind Drehungen um
      // dieselbe Achse und addieren sich.
      const sway = getStepSwayRadians(this.elapsedMs, individualCycleHz, motion.phaseOffset, BALANCE.gamefeel.stepSwayMaxDeg * motion.swayFactor)
      member.sprite.setRotation(this.leanRadians + sway)
      // Federn beim Aufsetzen. Die Truppe traegt ihre Kollision in einer eigenen Huelle
      // (this.hull), die Sprites haben keine — hier darf die Skalierung deshalb ohne
      // Umweg auf die Figur.
      const squash = getStepSquash(this.elapsedMs, individualCycleHz, motion.phaseOffset, BALANCE.gamefeel.stepSquashShare * motion.squashFactor)
      member.sprite.setScale(
        BALANCE.render.figureTextureScale * this.profil.figureScale * squash.scaleX,
        BALANCE.render.figureTextureScale * this.profil.figureScale * squash.scaleY,
      )
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
    if (this.profil.huelleFolgtFormation) {
      this.hull.setPosition(this.anchorX, this.anchorY + this.formationstiefe / 2)
    } else {
      this.hull.setPosition(this.anchorX, this.anchorY)
    }
    ;(this.hull.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
  }
}
