import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { getBossPhase, getBossPlan, type BossPlan, type BossUpgradeLevels } from './bossPlan'
import { getRoadHalfWidth } from './road'
import type { WeaponKey } from './weapons'

export class Boss {
  private readonly scene: Phaser.Scene
  private readonly enemy: Phaser.Physics.Arcade.Image
  private readonly projectiles: Phaser.Physics.Arcade.Group
  private readonly projectileList: Phaser.Physics.Arcade.Image[]
  private readonly nextSpawnId: () => number
  private readonly requestBossCompanion: () => boolean
  private readonly getAnchorY: () => number
  private plan: BossPlan | undefined
  private fightElapsedMs: number
  private fireAccumulatorMs: number
  private companionAccumulatorMs: number
  private moveDirection: number
  private approaching: boolean
  private phaseTwoStarted: boolean
  private phaseFlashRemainingMs: number

  public constructor(
    scene: Phaser.Scene,
    nextSpawnId: () => number,
    requestBossCompanion: () => boolean,
    getAnchorY: () => number,
  ) {
    this.scene = scene
    this.nextSpawnId = nextSpawnId
    this.requestBossCompanion = requestBossCompanion
    this.getAnchorY = getAnchorY
    this.enemy = scene.physics.add.image(0, 0, 'enemy-boss').setDepth(BALANCE.layers.gameplay)
    this.enemy.setActive(false).setVisible(false)
    this.enemy.disableBody(true, true)
    this.projectiles = scene.physics.add.group()
    this.projectileList = []
    this.plan = undefined
    this.fightElapsedMs = 0
    this.fireAccumulatorMs = 0
    this.companionAccumulatorMs = 0
    this.moveDirection = 1
    this.approaching = false
    this.phaseTwoStarted = false
    this.phaseFlashRemainingMs = 0

    // Flight: (844 - 300)px / 260px/s = 2.1s. Three shots every 1.4s allow at most
    // five bursts (15 projectiles); 24 leaves reserve without runtime allocation.
    for (let index = 0; index < BALANCE.pools.bossProjectiles; index += 1) {
      const projectile = scene.physics.add.image(0, 0, 'projectile-boss').setDepth(BALANCE.layers.gameplay)
      projectile.setActive(false).setVisible(false)
      projectile.disableBody(true, true)
      this.projectiles.add(projectile)
      this.projectileList.push(projectile)
    }
  }

  public getEnemy(): Phaser.Physics.Arcade.Image {
    return this.enemy
  }

  public getProjectiles(): Phaser.Physics.Arcade.Group {
    return this.projectiles
  }

  public isEnemy(enemy: Phaser.Physics.Arcade.Image): boolean {
    return enemy === this.enemy
  }

  public activate(level: number, upgrades: BossUpgradeLevels, teamSize: number, weapon: WeaponKey, damage: number, rate: number): void {
    const y = BALANCE.road.horizonY
    this.plan = getBossPlan(level, upgrades, teamSize, weapon, damage, rate)
    this.fightElapsedMs = 0
    this.fireAccumulatorMs = 0
    this.companionAccumulatorMs = 0
    this.moveDirection = 1
    this.approaching = true
    this.phaseTwoStarted = false
    this.phaseFlashRemainingMs = 0
    this.enemy.enableBody(true, this.scene.scale.width / 2, y, true, true)
    this.enemy.setActive(true).setVisible(true).setAlpha(0).clearTint()
    const body = this.enemy.body as Phaser.Physics.Arcade.Body
    body.setSize(BALANCE.boss.bodyWidth, BALANCE.boss.bodyHeight, true)
    body.moves = false
    body.updateFromGameObject()
    this.enemy.setData('hp', this.plan.maxHp)
    this.enemy.setData('maxHp', this.plan.maxHp)
    this.enemy.setData('contactDamage', 0)
    this.enemy.setData('coinValue', BALANCE.boss.coinReward)
    this.enemy.setData('flashRemainingMs', 0)
    this.enemy.setData('spawnId', this.nextSpawnId())
  }

  public deactivate(): void {
    this.enemy.disableBody(true, true)
    this.enemy.setActive(false).setVisible(false)
    for (const projectile of this.projectileList) this.recycleProjectile(projectile)
  }

  public update(dt: number): void {
    this.updateProjectiles(dt)
    if (!this.enemy.active) return
    const plan = this.plan
    if (plan === undefined) return

    if (this.approaching) {
      this.enemy.y = Math.min(this.enemy.y + (BALANCE.boss.approachSpeed * dt) / 1000, BALANCE.boss.battleY)
      if (this.enemy.y === BALANCE.boss.battleY) this.approaching = false
    } else {
      this.fightElapsedMs += dt
      this.updatePhase(plan)
      const phase = this.phaseTwoStarted ? plan.phaseTwo : plan.phaseOne
      this.moveAcrossRoad(dt, phase.moveSpeed)
      this.fireAccumulatorMs += dt
      while (this.fireAccumulatorMs >= phase.fireIntervalMs) {
        this.fireAccumulatorMs -= phase.fireIntervalMs
        this.fireBurst(phase.burstCount, phase.burstSpreadPx)
      }
      this.companionAccumulatorMs += dt
      while (this.companionAccumulatorMs >= plan.companionIntervalMs) {
        this.companionAccumulatorMs -= plan.companionIntervalMs
        this.requestBossCompanion()
      }
      if (this.fightElapsedMs >= plan.pressureDelayMs) this.advanceTowardsCrowd(dt, plan)
    }

    const topY = this.enemy.y - this.enemy.displayHeight / 2
    this.enemy.setAlpha(Math.min(1, Math.max(0, (topY - BALANCE.road.horizonY) / BALANCE.road.entryFadePx)))
    this.updateVisuals(dt, plan)
    ;(this.enemy.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
  }

  private updatePhase(plan: BossPlan): void {
    const phase = getBossPhase(this.enemy.getData('hp') as number, this.phaseTwoStarted, plan)
    if (phase === 1 || this.phaseTwoStarted) return
    this.phaseTwoStarted = true
    this.phaseFlashRemainingMs = plan.phaseTwo.transitionFlashMs
  }

  private moveAcrossRoad(dt: number, speed: number): void {
    const halfRoad = getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, this.enemy.y)
    const edge = Math.max(0, halfRoad - BALANCE.boss.bodyWidth / 2)
    const minX = this.scene.scale.width / 2 - edge
    const maxX = this.scene.scale.width / 2 + edge
    this.enemy.x += (this.moveDirection * speed * dt) / 1000
    if (this.enemy.x >= maxX) {
      this.enemy.x = maxX
      this.moveDirection = -1
    } else if (this.enemy.x <= minX) {
      this.enemy.x = minX
      this.moveDirection = 1
    }
  }

  private advanceTowardsCrowd(dt: number, plan: BossPlan): void {
    this.enemy.setData('contactDamage', plan.advanceContactDamage)
    const stopY = Math.max(BALANCE.boss.battleY, this.getAnchorY() - plan.advanceStopBeforeAnchorPx)
    this.enemy.y = Math.min(this.enemy.y + (plan.advanceSpeed * dt) / 1000, stopY)
  }

  private fireBurst(burstCount: number, burstSpreadPx: number): void {
    const startX = this.enemy.x - burstSpreadPx / 2
    const stepX = burstSpreadPx / (burstCount - 1)
    for (let index = 0; index < burstCount; index += 1) {
      const projectile = this.projectileList.find((candidate) => !candidate.active)
      if (projectile === undefined) return
      projectile.enableBody(true, startX + stepX * index, this.enemy.y + this.enemy.displayHeight / 2, true, true)
      projectile.setActive(true).setVisible(true).setAlpha(1)
      projectile.setData('damage', BALANCE.boss.projectileDamage)
      const body = projectile.body as Phaser.Physics.Arcade.Body
      body.moves = false
      body.updateFromGameObject()
    }
  }

  private updateVisuals(dt: number, plan: BossPlan): void {
    this.phaseFlashRemainingMs = Math.max(0, this.phaseFlashRemainingMs - dt)
    const hitFlashRemainingMs = Math.max(0, (this.enemy.getData('flashRemainingMs') as number) - dt)
    this.enemy.setData('flashRemainingMs', hitFlashRemainingMs)
    if (this.phaseFlashRemainingMs > 0 || hitFlashRemainingMs > 0) {
      this.enemy.setTintFill(0xffffff)
      return
    }
    if (this.phaseTwoStarted) {
      this.enemy.setTint(plan.phaseTwo.tint)
      return
    }
    this.enemy.clearTint()
  }

  private updateProjectiles(dt: number): void {
    for (const projectile of this.projectileList) {
      if (!projectile.active) continue
      projectile.y += (BALANCE.boss.projectileSpeed * dt) / 1000
      ;(projectile.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      if (projectile.y - projectile.displayHeight / 2 > this.scene.scale.height) this.recycleProjectile(projectile)
    }
  }

  public recycleProjectile(projectile: Phaser.Physics.Arcade.Image): void {
    projectile.disableBody(true, true)
    projectile.setActive(false).setVisible(false)
  }
}
