import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { canSpawnBossCompanion, getBossPlan, type BossUpgradeLevels } from './bossPlan'
import { chooseEnemyType, type EnemyType } from './enemyTypes'
import { getLevelPlan, type LevelPlan } from './levelPlan'
import { getRoadHalfWidth } from './road'
import { chooseSpawnLane, type SpawnLaneEnemy } from './spawnLanes'
import { computeSquadOffsets, getSquadWidth } from './squads'
import type { RunStats } from './upgrades'

type SpawnResult = 'spawned' | 'no-lane' | 'pool-exhausted'

type SpawnRequest =
  | { readonly kind: 'single'; readonly type: EnemyType }
  | { readonly kind: 'squad'; readonly squadKind: 'wedge' | 'row' | 'cluster'; readonly size: number }

export class Spawner {
  private readonly scene: Phaser.Scene
  private readonly runStats: RunStats
  private readonly bossUpgrades: BossUpgradeLevels
  private readonly enemies: Phaser.Physics.Arcade.Group
  private spawnAccumulatorMs: number
  private elapsedMs: number
  private lastPoolWarningAtMs: number
  private deferredSpawn: SpawnRequest | undefined
  private intervalSpawnCount: number
  private intervalDeferredCount: number
  private intervalPlannedCount: number
  private lastSpawnMetricsAtMs: number
  private nextSpawnId: number
  private spawningEnabled: boolean
  private levelPlan: LevelPlan

  public constructor(scene: Phaser.Scene, runStats: RunStats, bossUpgrades: BossUpgradeLevels) {
    this.scene = scene
    this.runStats = runStats
    this.bossUpgrades = bossUpgrades
    this.enemies = scene.physics.add.group()
    this.spawnAccumulatorMs = 0
    this.elapsedMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs
    this.deferredSpawn = undefined
    this.intervalSpawnCount = 0
    this.intervalDeferredCount = 0
    this.intervalPlannedCount = 0
    this.lastSpawnMetricsAtMs = 0
    this.nextSpawnId = 1
    this.spawningEnabled = true
    this.levelPlan = getLevelPlan(1)
    for (let index = 0; index < BALANCE.pools.enemies; index += 1) {
      const enemy = scene.physics.add.image(0, 0, BALANCE.enemy.types[0].texture).setDepth(BALANCE.layers.gameplay)
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

  public allocateSpawnId(): number {
    const spawnId = this.nextSpawnId
    this.nextSpawnId += 1
    return spawnId
  }

  public setSpawningEnabled(enabled: boolean): void {
    this.spawningEnabled = enabled
    if (!enabled) this.deferredSpawn = undefined
  }

  public resetForLevel(level: number): void {
    this.elapsedMs = 0
    this.spawnAccumulatorMs = 0
    this.deferredSpawn = undefined
    this.levelPlan = getLevelPlan(level)
    this.spawningEnabled = true
  }

  // Boss summons deliberately reuse this pool while the regular clock stays disabled.
  public requestBossCompanion(): boolean {
    const plan = getBossPlan(this.levelPlan.level, this.bossUpgrades)
    const activeCompanions = this.enemies.getChildren().filter((child) => child.active && child.getData('bossCompanion') === true).length
    if (!canSpawnBossCompanion(activeCompanions, plan)) return false
    const type = chooseEnemyType(this.levelPlan.enemyWeights, () => Phaser.Math.RND.frac())
    return this.spawnSingle(type, true) === 'spawned'
  }

  public recycleBossCompanions(): void {
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Phaser.Physics.Arcade.Image
      if (enemy.active && enemy.getData('bossCompanion') === true) this.recycle(enemy)
    }
  }

  public recycle(enemy: Phaser.Physics.Arcade.Image): void {
    enemy.disableBody(true, true)
    enemy.setActive(false).setVisible(false)
  }

  public damage(enemy: Phaser.Physics.Arcade.Image, damage: number): boolean {
    const remainingHp = (enemy.getData('hp') as number) - damage
    enemy.setData('hp', remainingHp)
    enemy.setTintFill(0xffffff)
    enemy.setData('flashRemainingMs', BALANCE.feedback.hitFlashMs)
    if (remainingHp <= 0) {
      this.recycle(enemy)
      return true
    }
    return false
  }

  public update(dt: number): void {
    this.elapsedMs += dt
    if (this.spawningEnabled) this.spawnAccumulatorMs += dt
    if (this.spawningEnabled && this.deferredSpawn !== undefined && this.spawn(this.deferredSpawn) === 'spawned') this.deferredSpawn = undefined
    const spawnIntervalMs = this.getSpawnIntervalMs()
    while (this.spawningEnabled && this.spawnAccumulatorMs >= spawnIntervalMs) {
      this.spawnAccumulatorMs -= spawnIntervalMs
      this.intervalPlannedCount += 1
      if (this.deferredSpawn !== undefined) continue
      const request = this.chooseSpawnRequest()
      if (this.spawn(request) !== 'spawned') {
        this.deferredSpawn = request
        this.intervalDeferredCount += 1
        break
      }
    }
    this.logSpawnMetrics()

    const enemySpeed = this.getEnemySpeed()
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Phaser.Physics.Arcade.Image
      if (!enemy.active) continue
      enemy.y += (enemySpeed * (enemy.getData('speedFactor') as number) * dt) / 1000
      enemy.x = this.scene.scale.width / 2 + (enemy.getData('lane') as number) * getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, enemy.y)
      const topY = enemy.y - enemy.displayHeight / 2
      enemy.setAlpha(Math.min(1, Math.max(0, (topY - BALANCE.road.horizonY) / BALANCE.road.entryFadePx)))
      ;(enemy.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      const flashRemainingMs = Math.max(0, (enemy.getData('flashRemainingMs') as number) - dt)
      enemy.setData('flashRemainingMs', flashRemainingMs)
      if (flashRemainingMs === 0) enemy.clearTint()
      if (enemy.y - enemy.displayHeight / 2 > this.scene.scale.height) this.recycle(enemy)
    }
  }

  private getSpawnIntervalMs(): number {
    // elapsedMs only ramps the interval within this level; enemy choice comes from levelPlan.
    return Math.max(
      this.levelPlan.spawnIntervalMinMs,
      this.levelPlan.spawnIntervalMs - (this.elapsedMs / 1000) * BALANCE.enemy.spawnRampPerSec,
    )
  }

  private chooseSpawnRequest(): SpawnRequest {
    if (this.levelPlan.squads.length > 0 && Phaser.Math.RND.frac() < this.levelPlan.squadChance) {
      const totalWeight = this.levelPlan.squads.reduce((sum, squad) => sum + squad.weight, 0)
      let roll = Phaser.Math.RND.frac() * totalWeight
      for (const squad of this.levelPlan.squads) {
        roll -= squad.weight
        if (roll < 0) return { kind: 'squad', squadKind: squad.kind, size: squad.size }
      }
      const squad = this.levelPlan.squads.at(-1)!
      return { kind: 'squad', squadKind: squad.kind, size: squad.size }
    }
    return { kind: 'single', type: chooseEnemyType(this.levelPlan.enemyWeights, () => Phaser.Math.RND.frac()) }
  }

  private spawn(request: SpawnRequest): SpawnResult {
    return request.kind === 'single' ? this.spawnSingle(request.type) : this.spawnSquad(request.squadKind, request.size)
  }

  private spawnSingle(type: EnemyType, bossCompanion = false): SpawnResult {
    const enemy = this.enemies.getChildren().find((child) => !child.active) as Phaser.Physics.Arcade.Image | undefined
    if (enemy === undefined) {
      this.warnPoolExhausted()
      return 'pool-exhausted'
    }
    enemy.setTexture(type.texture)
    const y = BALANCE.road.horizonY
    const lane = chooseSpawnLane(
      this.getActiveLaneEnemies(),
      { ...type, y },
      getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, 0),
      this.scene.scale.height,
      () => Phaser.Math.RND.frac(),
      BALANCE.enemy.spawnLaneSafetyGap,
    )
    if (lane === undefined) return 'no-lane'
    this.activateEnemy(enemy, type, lane, y, bossCompanion)
    this.intervalSpawnCount += 1
    return 'spawned'
  }

  private spawnSquad(squadKind: 'wedge' | 'row' | 'cluster', requestedSize: number): SpawnResult {
    const topRoadHalfWidth = getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, BALANCE.road.horizonY)
    let size = Math.min(requestedSize, BALANCE.level.squads.maxSize)
    let offsets = computeSquadOffsets(squadKind, size, BALANCE.level.squads.spacingPx, BALANCE.level.squads.rowSpacingPx)
    while (size >= BALANCE.level.squads.minSize && getSquadWidth(offsets, Math.max(...BALANCE.enemy.types.map((type) => type.bodyWidth))) > topRoadHalfWidth * 2) {
      size -= 1
      offsets = computeSquadOffsets(squadKind, size, BALANCE.level.squads.spacingPx, BALANCE.level.squads.rowSpacingPx)
    }
    if (size < BALANCE.level.squads.minSize) return 'no-lane'

    const types = this.getSquadTypes(squadKind, offsets.length)
    const available = this.enemies.getChildren().filter((child) => !child.active) as Phaser.Physics.Arcade.Image[]
    if (available.length < offsets.length) {
      this.warnPoolExhausted()
      return 'pool-exhausted'
    }

    const y = BALANCE.road.horizonY - Math.min(...offsets.map((offset) => offset.yOffset))
    const widestBodyWidth = Math.max(...types.map((type) => type.bodyWidth))
    // Exactly one lane reservation for the complete squad; members never call chooseSpawnLane.
    const lane = chooseSpawnLane(
      this.getActiveLaneEnemies(),
      { y, speedFactor: Math.max(...types.map((type) => type.speedFactor)), bodyWidth: getSquadWidth(offsets, widestBodyWidth), bodyHeight: Math.max(...types.map((type) => type.bodyHeight)) },
      topRoadHalfWidth,
      this.scene.scale.height,
      () => Phaser.Math.RND.frac(),
      BALANCE.enemy.spawnLaneSafetyGap,
    )
    if (lane === undefined) return 'no-lane'

    offsets.forEach((offset, index) => {
      const memberY = y + offset.yOffset
      const memberLane = lane + offset.laneOffset / getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, memberY)
      this.activateEnemy(available[index], types[index], memberLane, memberY, false)
    })
    this.intervalSpawnCount += offsets.length
    const pauseMs = BALANCE.level.squads.pauseBaseMs + offsets.length * BALANCE.level.squads.pausePerMemberMs
    this.spawnAccumulatorMs = Math.min(this.spawnAccumulatorMs, this.getSpawnIntervalMs() - pauseMs)
    return 'spawned'
  }

  private getSquadTypes(squadKind: 'wedge' | 'row' | 'cluster', size: number): EnemyType[] {
    const light = BALANCE.enemy.types.find((type) => type.key === 'light')!
    if (squadKind === 'wedge') return Array.from({ length: size }, () => light)
    const types = Array.from({ length: size }, () => chooseEnemyType(this.levelPlan.enemyWeights, () => Phaser.Math.RND.frac()))
    if (squadKind === 'cluster' && types.every((type) => type.key === types[0].key)) {
      const alternate = BALANCE.enemy.types.find((type, index) => this.levelPlan.enemyWeights[index] > 0 && type.key !== types[0].key)
      if (alternate !== undefined) types[types.length - 1] = alternate
    }
    return types
  }

  private activateEnemy(enemy: Phaser.Physics.Arcade.Image, type: EnemyType, lane: number, y: number, bossCompanion: boolean): void {
    const x = this.scene.scale.width / 2 + lane * getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, y)
    enemy.setTexture(type.texture)
    enemy.enableBody(true, x, y, true, true)
    const body = enemy.body as Phaser.Physics.Arcade.Body
    body.setSize(type.bodyWidth, type.bodyHeight, true)
    // The spawner moves enemies itself; otherwise Arcade writes offset.x back to the
    // sprite each frame, making the visible enemy jump sideways.
    body.moves = false
    body.updateFromGameObject()
    enemy.setActive(true).setVisible(true).setAlpha(0).clearTint()
    enemy.setData('hp', type.hp)
    enemy.setData('speedFactor', type.speedFactor)
    enemy.setData('contactDamage', type.contactDamage)
    enemy.setData('coinValue', type.coinValue)
    enemy.setData('bodyWidth', type.bodyWidth)
    enemy.setData('bodyHeight', type.bodyHeight)
    enemy.setData('flashRemainingMs', 0)
    enemy.setData('lane', lane)
    enemy.setData('bossCompanion', bossCompanion)
    enemy.setData('spawnId', this.allocateSpawnId())
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
