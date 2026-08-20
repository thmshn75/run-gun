import Phaser from 'phaser'
import { BALANCE } from '../config/balance'

export class Weapons {
  private readonly projectiles: Phaser.Physics.Arcade.Group
  private readonly getAnchorPosition: () => Readonly<{ x: number; y: number }>
  private fireAccumulatorMs: number
  private lastPoolWarningAtMs: number
  private elapsedMs: number

  public constructor(scene: Phaser.Scene, getAnchorPosition: () => Readonly<{ x: number; y: number }>) {
    this.getAnchorPosition = getAnchorPosition
    this.projectiles = scene.physics.add.group()
    this.fireAccumulatorMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs
    this.elapsedMs = 0

    for (let index = 0; index < BALANCE.pools.projectiles; index += 1) {
      const projectile = scene.physics.add.image(0, 0, 'projectile')
      projectile.setActive(false).setVisible(false)
      projectile.disableBody(true, true)
      this.projectiles.add(projectile)
    }
  }

  public getProjectiles(): Phaser.Physics.Arcade.Group {
    return this.projectiles
  }

  public recycle(projectile: Phaser.Physics.Arcade.Image): void {
    projectile.disableBody(true, true)
    projectile.setActive(false).setVisible(false)
  }

  public update(dt: number): void {
    this.elapsedMs += dt
    this.fireAccumulatorMs += dt
    while (this.fireAccumulatorMs >= BALANCE.weapon.fireRateMs) {
      this.fireAccumulatorMs -= BALANCE.weapon.fireRateMs
      this.fire()
    }

    for (const child of this.projectiles.getChildren()) {
      const projectile = child as Phaser.Physics.Arcade.Image
      if (!projectile.active) continue
      projectile.y -= (BALANCE.weapon.projectileSpeed * dt) / 1000
      ;(projectile.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      if (projectile.y + projectile.displayHeight / 2 < 0) this.recycle(projectile)
    }
  }

  private fire(): void {
    const projectile = this.projectiles.getChildren().find((child) => !child.active) as Phaser.Physics.Arcade.Image | undefined
    if (projectile === undefined) {
      this.warnPoolExhausted()
      return
    }
    const anchor = this.getAnchorPosition()
    projectile.enableBody(true, anchor.x, anchor.y, true, true)
    projectile.setActive(true).setVisible(true).setAlpha(1).clearTint()
    ;(projectile.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
  }

  private warnPoolExhausted(): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastPoolWarningAtMs < BALANCE.feedback.poolWarningIntervalMs) return
    console.warn('Projectile pool exhausted; shot skipped.')
    this.lastPoolWarningAtMs = this.elapsedMs
  }
}
