import Phaser from 'phaser'
import { BALANCE } from '../config/balance'

type FormationMember = Readonly<{ sprite: Phaser.GameObjects.Image; offsetX: number; offsetY: number }>

export class Crowd {
  private readonly scene: Phaser.Scene
  private readonly members: FormationMember[]
  private readonly hull: Phaser.GameObjects.Zone
  private anchorX: number
  private readonly anchorY: number

  public constructor(scene: Phaser.Scene, anchorX: number, anchorY: number) {
    this.scene = scene
    this.anchorX = anchorX
    this.anchorY = anchorY
    this.members = []

    const firstSprite = scene.add.image(anchorX, anchorY, 'player')
    const hullWidth = firstSprite.displayWidth
    const hullHeight = firstSprite.displayHeight
    firstSprite.setActive(false).setVisible(false)

    for (let index = 0; index < BALANCE.pools.crowd; index += 1) {
      const sprite = index === 0 ? firstSprite : scene.add.image(anchorX, anchorY, 'player')
      sprite.setActive(false).setVisible(false)
      this.members.push({ sprite, offsetX: 0, offsetY: 0 })
    }
    this.members[0].sprite.setActive(true).setVisible(true).setAlpha(1)

    this.hull = scene.add.zone(anchorX, anchorY, hullWidth, hullHeight)
    scene.physics.add.existing(this.hull)
    const body = this.hull.body as Phaser.Physics.Arcade.Body
    body.setSize(hullWidth, hullHeight)
    body.setAllowGravity(false)
    this.update()
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

  public update(): void {
    for (const member of this.members) {
      if (!member.sprite.active) continue
      member.sprite.setPosition(this.anchorX + member.offsetX, this.anchorY + member.offsetY)
    }
    this.hull.setPosition(this.anchorX, this.anchorY)
    ;(this.hull.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
  }
}
