import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { chooseEnemyType } from './enemyTypes'
import { getRoadHalfWidth } from './road'
import { chooseSpawnLane, type SpawnLaneEnemy } from './spawnLanes'
import type { RunStats } from './upgrades'

type EnemyType = (typeof BALANCE.enemy.types)[number]

type SpawnResult = 'spawned' | 'no-lane' | 'pool-exhausted'

export class Spawner {
  private readonly scene: Phaser.Scene
  private readonly runStats: RunStats
  private readonly enemies: Phaser.Physics.Arcade.Group
  private spawnAccumulatorMs: number
  private elapsedMs: number
  private lastPoolWarningAtMs: number
  private deferredType: EnemyType | undefined
  private intervalSpawnCount: number
  private intervalDeferredCount: number
  private intervalPlannedCount: number
  private lastSpawnMetricsAtMs: number

  public constructor(scene: Phaser.Scene, runStats: RunStats) {
    this.scene = scene
    this.runStats = runStats
    this.enemies = scene.physics.add.group()
    this.spawnAccumulatorMs = 0
    this.elapsedMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs
    this.deferredType = undefined
    this.intervalSpawnCount = 0
    this.intervalDeferredCount = 0
    this.intervalPlannedCount = 0
    this.lastSpawnMetricsAtMs = 0
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
    if (this.deferredType !== undefined && this.spawn(this.deferredType) === 'spawned') this.deferredType = undefined
    const spawnIntervalMs = Math.max(
      BALANCE.enemy.spawnIntervalMinMs,
      BALANCE.enemy.spawnIntervalMs - (this.elapsedMs / 1000) * BALANCE.enemy.spawnRampPerSec,
    )
    while (this.spawnAccumulatorMs >= spawnIntervalMs) {
      this.spawnAccumulatorMs -= spawnIntervalMs
      this.intervalPlannedCount += 1
      const type = chooseEnemyType(this.elapsedMs, () => Phaser.Math.RND.frac())
      if (this.deferredType !== undefined) continue
      if (this.spawn(type) === 'no-lane') {
        this.deferredType = type
        this.intervalDeferredCount += 1
      }
    }
    this.logSpawnMetrics()

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

  private spawn(type: EnemyType): SpawnResult {
    const enemy = this.enemies.getChildren().find((child) => !child.active) as Phaser.Physics.Arcade.Image | undefined
    if (enemy === undefined) {
      this.warnPoolExhausted()
      return 'pool-exhausted'
    }
    enemy.setTexture(type.texture)
    const y = -type.bodyHeight / 2
    const lane = chooseSpawnLane(
      this.getActiveLaneEnemies(),
      { ...type, y },
      getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, 0),
      this.scene.scale.height,
      () => Phaser.Math.RND.frac(),
      BALANCE.enemy.spawnLaneSafetyGap,
    )
    if (lane === undefined) return 'no-lane'
    const x = this.scene.scale.width / 2 + lane * getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, y)
    enemy.enableBody(true, x, y, true, true)
    const body = enemy.body as Phaser.Physics.Arcade.Body
    body.setSize(type.bodyWidth, type.bodyHeight, true)
    // The spawner moves enemies itself; otherwise Arcade writes offset.x back to the
    // sprite each frame, making the visible enemy jump sideways.
    body.moves = false
    body.updateFromGameObject()
    enemy.setActive(true).setVisible(true).setAlpha(1).clearTint()
    enemy.setData('hp', type.hp)
    enemy.setData('speedFactor', type.speedFactor)
    enemy.setData('contactDamage', type.contactDamage)
    enemy.setData('coinValue', type.coinValue)
    enemy.setData('bodyWidth', type.bodyWidth)
    enemy.setData('bodyHeight', type.bodyHeight)
    enemy.setData('flashUntil', 0)
    enemy.setData('lane', lane)
    this.intervalSpawnCount += 1
    return 'spawned'
  }

  private getActiveLaneEnemies(): SpawnLaneEnemy[] {
    return this.enemies.getChildren().flatMap((child) => {
      const enemy = child as Phaser.Physics.Arcade.Image
      if (!enemy.active) return []
      return [{
        lane: enemy.getData('lane') as number,
        y: enemy.y,
        speedFactor: enemy.getData('speedFactor') as number,
        bodyWidth: enemy.getData('bodyWidth') as number,
        bodyHeight: enemy.getData('bodyHeight') as number,
      }]
    })
  }

  private logSpawnMetrics(): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastSpawnMetricsAtMs < 10000) return
    console.info(
      `Enemy spawns (10 s): ${this.intervalSpawnCount}, deferred: ${this.intervalDeferredCount}, planned: ${this.intervalPlannedCount}`,
    )
    this.intervalSpawnCount = 0
    this.intervalDeferredCount = 0
    this.intervalPlannedCount = 0
    this.lastSpawnMetricsAtMs = this.elapsedMs
  }

  private warnPoolExhausted(): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastPoolWarningAtMs < BALANCE.feedback.poolWarningIntervalMs) return
    console.warn('Enemy pool exhausted; spawn skipped.')
    this.lastPoolWarningAtMs = this.elapsedMs
  }
}
