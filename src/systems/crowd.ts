import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { computeFormation } from './formation'

type FormationMember = { readonly sprite: Phaser.GameObjects.Image; offsetX: number; offsetY: number; row: number }

export class Crowd {
  private readonly scene: Phaser.Scene
  private readonly members: FormationMember[]
  private readonly hull: Phaser.GameObjects.Zone
  private readonly figureHeight: number
  private anchorX: number
  private readonly anchorY: number

  public constructor(scene: Phaser.Scene, anchorX: number, anchorY: number) {
    this.scene = scene
    this.anchorX = anchorX
    this.anchorY = anchorY
    this.members = []

    const firstSprite = scene.add.image(anchorX, anchorY, 'player')
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
        .setDepth(slot.row)
        .setActive(true)
        .setVisible(true)
        .setAlpha(1)
    }
  }

  public setAnchorX(x: number): void {
    const halfHullWidth = this.hull.width / 2
    this.anchorX = Phaser.Math.Clamp(
      x,
      halfHullWidth + BALANCE.player.dragClampMargin,
      this.scene.scale.width - halfHullWidth - BALANCE.player.dragClampMargin,
    )
  }

  public getAnchorX(): number {
    return this.anchorX
  }

  public getAnchorY(): number {
    return this.anchorY
  }

  public getHullBounds(): Phaser.GameObjects.Zone {
    return this.hull
  }

  public setFiguresAlpha(alpha: number): void {
    for (const member of this.members) {
      if (member.sprite.active) member.sprite.setAlpha(alpha)
    }
  }

  public getShooterPositions(maxShooters: number): Array<{ x: number; y: number }> {
    return this.members
      .filter((member) => member.sprite.active)
      .sort((left, right) => left.row - right.row || Math.abs(left.offsetX) - Math.abs(right.offsetX) || left.offsetX - right.offsetX)
      .slice(0, Math.max(0, Math.floor(maxShooters)))
      .map((member) => ({ x: member.sprite.x, y: member.sprite.y }))
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
