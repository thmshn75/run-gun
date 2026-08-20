import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { chooseEnemyType } from './enemyTypes'
import { getRoadHalfWidth } from './road'
import type { RunStats } from './upgrades'

export class Spawner {
  private readonly scene: Phaser.Scene
  private readonly runStats: RunStats
  private readonly getSpawnRange: () => Readonly<{ min: number; max: number }>
  private readonly enemies: Phaser.Physics.Arcade.Group
  private spawnAccumulatorMs: number
  private elapsedMs: number
  private lastPoolWarningAtMs: number

  public constructor(scene: Phaser.Scene, runStats: RunStats, getSpawnRange: () => Readonly<{ min: number; max: number }>) {
    this.scene = scene
    this.runStats = runStats
    this.getSpawnRange = getSpawnRange
    this.enemies = scene.physics.add.group()
    this.spawnAccumulatorMs = 0
    this.elapsedMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs
    for (let index = 0; index < BALANCE.pools.enemies; index += 1) {
      const enemy = scene.physics.add.image(0, 0, BALANCE.enemy.types[0].texture)
      enemy.setActive(false).setVisible(false)
      enemy.disableBody(true, true)
      this.enemies.add(enemy)
    }
  }

  public getEnemies(): Phaser.Physics.Arcade.Group {
    return this.enemies
  }

  public getEnemySpeed(): number {
    return this.runStats.get('speed')
  }

  public recycle(enemy: Phaser.Physics.Arcade.Image): void {
    enemy.disableBody(true, true)
    enemy.setActive(false).setVisible(false)
  }

  public damage(enemy: Phaser.Physics.Arcade.Image, damage: number, gameTimeMs: number): boolean {
    const remainingHp = (enemy.getData('hp') as number) - damage
    enemy.setData('hp', remainingHp)
    enemy.setTintFill(0xffffff)
    enemy.setData('flashUntil', gameTimeMs + BALANCE.feedback.hitFlashMs)
    if (remainingHp <= 0) {
      this.recycle(enemy)
      return true
    }
    return false
  }

  public update(dt: number): void {
    this.elapsedMs += dt
    this.spawnAccumulatorMs += dt
    const spawnIntervalMs = Math.max(
      BALANCE.enemy.spawnIntervalMinMs,
      BALANCE.enemy.spawnIntervalMs - (this.elapsedMs / 1000) * BALANCE.enemy.spawnRampPerSec,
    )
    while (this.spawnAccumulatorMs >= spawnIntervalMs) {
      this.spawnAccumulatorMs -= spawnIntervalMs
      this.spawn()
    }

    const enemySpeed = this.getEnemySpeed()
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Phaser.Physics.Arcade.Image
      if (!enemy.active) continue
      enemy.y += (enemySpeed * (enemy.getData('speedFactor') as number) * dt) / 1000
      enemy.x = this.scene.scale.width / 2 + (enemy.getData('lane') as number) * getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, enemy.y)
      ;(enemy.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      if ((enemy.getData('flashUntil') as number) <= this.elapsedMs) enemy.clearTint()
      if (enemy.y - enemy.displayHeight / 2 > this.scene.scale.height) this.recycle(enemy)
    }
  }

  private spawn(): void {
    const enemy = this.enemies.getChildren().find((child) => !child.active) as Phaser.Physics.Arcade.Image | undefined
    if (enemy === undefined) {
      this.warnPoolExhausted()
      return
    }
    const type = chooseEnemyType(this.elapsedMs, () => Phaser.Math.RND.frac())
    enemy.setTexture(type.texture)
    const range = this.getSpawnRange()
    const spawnX = Phaser.Math.Between(Math.round(range.min), Math.round(range.max))
    const y = -enemy.displayHeight / 2
    const lane = (spawnX - this.scene.scale.width / 2) / (this.scene.scale.width / 2)
    const x = this.scene.scale.width / 2 + lane * getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, y)
    enemy.enableBody(true, x, y, true, true)
    const body = enemy.body as Phaser.Physics.Arcade.Body
    body.setSize(type.bodyWidth, enemy.displayHeight, true)
    body.updateFromGameObject()
    enemy.setActive(true).setVisible(true).setAlpha(1).clearTint()
    enemy.setData('hp', type.hp)
    enemy.setData('speedFactor', type.speedFactor)
    enemy.setData('contactDamage', type.contactDamage)
    enemy.setData('coinValue', type.coinValue)
    enemy.setData('flashUntil', 0)
    enemy.setData('lane', lane)
    body.setVelocity(0, 0)
  }

  private warnPoolExhausted(): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastPoolWarningAtMs < BALANCE.feedback.poolWarningIntervalMs) return
    console.warn('Enemy pool exhausted; spawn skipped.')
    this.lastPoolWarningAtMs = this.elapsedMs
  }
}
