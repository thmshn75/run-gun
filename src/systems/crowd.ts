import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { computeFormation } from './formation'
import { getPlayfieldHalfWidth } from './roadGeometry'
import { overlapsVisibleFigure, type RectangleBounds } from './rectangles'

type FormationMember = { readonly sprite: Phaser.GameObjects.Image; offsetX: number; offsetY: number; row: number }

export class Crowd {
  private readonly scene: Phaser.Scene
  private readonly members: FormationMember[]
  private readonly hull: Phaser.GameObjects.Zone
  private readonly figureWidth: number
  private readonly figureHeight: number
  private anchorX: number
  private readonly anchorY: number
  private salvoCursor: number

  public constructor(scene: Phaser.Scene, anchorX: number, anchorY: number) {
    this.scene = scene
    this.anchorX = anchorX
    this.anchorY = anchorY
    this.salvoCursor = 0
    this.members = []

    const firstSprite = scene.add.image(anchorX, anchorY, 'player')
    this.figureWidth = firstSprite.displayWidth
    this.figureHeight = firstSprite.displayHeight
    const hullWidth = firstSprite.displayWidth * BALANCE.crowd.hullWidthFigures
    const hullHeight = firstSprite.displayHeight * BALANCE.crowd.hullHeightFigures
    firstSprite.setActive(false).setVisible(false)

    for (let index = 0; index < BALANCE.pools.crowd; index += 1) {
      const sprite = index === 0 ? firstSprite : scene.add.image(anchorX, anchorY, 'player')
      sprite.setActive(false).setVisible(false)
      this.members.push({ sprite, offsetX: 0, offsetY: 0, row: 0 })
    }

    this.hull = scene.add.zone(anchorX, anchorY, hullWidth, hullHeight)
    scene.physics.add.existing(this.hull)
    const body = this.hull.body as Phaser.Physics.Arcade.Body
    body.setSize(hullWidth, hullHeight)
    body.setAllowGravity(false)
    this.update()
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

    for (let index = 0; index < this.members.length; index += 1) {
      const member = this.members[index]
      const slot = slots[index]
      if (slot === undefined) {
        member.sprite.setActive(false).setVisible(false)
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
    }
    this.salvoCursor = 0
  }

  public setAnchorX(x: number): void {
    const range = this.getAnchorRange()
    this.anchorX = Phaser.Math.Clamp(x, range.min, range.max)
  }

  public getAnchorRange(): Readonly<{ min: number; max: number }> {
    // Seit W4 endet der Drag am Korridor: In die Dauerwaende kann man nicht mehr
    // hineinfahren (Thomas 2026-08-22) — Wandkontakt und Team-Verlust entfallen.
    const inset = this.figureWidth * BALANCE.player.dragClampFigures + BALANCE.player.dragClampMargin
    const playfieldHalf = getPlayfieldHalfWidth(this.scene.scale.width, this.scene.scale.height, this.anchorY)
    const center = this.scene.scale.width / 2
    return { min: center - playfieldHalf + inset, max: center + playfieldHalf - inset }
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

  public update(): void {
    for (const member of this.members) {
      if (!member.sprite.active) continue
      member.sprite.setPosition(this.anchorX + member.offsetX, this.anchorY + member.offsetY)
    }
    this.hull.setPosition(this.anchorX, this.anchorY)
    ;(this.hull.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
  }
}
