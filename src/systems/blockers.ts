import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS } from '../config/colors'
import { computeBlockerPlacement } from './blockerPlacement'
import { getBlockerIntervalMs, getBlockerPlan } from './blockerPlan'
import type { BossUpgradeLevels } from './bossPlan'
import { getLevelPlan, type LevelPlan } from './levelPlan'
import { getRoadHalfWidth } from './road'
import type { WeaponKey } from './weapons'

interface BlockerPair {
  blocker: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
  reward: Phaser.Physics.Arcade.Image
  active: boolean
  broken: boolean
  weapon: WeaponKey
}

export class Blockers {
  private readonly scene: Phaser.Scene
  private readonly bossUpgrades: BossUpgradeLevels
  private readonly requestEnemy: () => boolean
  private readonly chooseWeapon: (currentWeapon: WeaponKey) => WeaponKey
  private readonly getCurrentWeapon: () => WeaponKey
  private readonly getTeamSize: () => number
  private readonly rng: () => number
  private readonly pairs: BlockerPair[]
  private readonly blockerGroup: Phaser.Physics.Arcade.Group
  private readonly rewardGroup: Phaser.Physics.Arcade.Group
  private levelPlan: LevelPlan
  private spawnAccumulatorMs: number
  private elapsedMs: number
  private lastPoolWarningAtMs: number
  private nextSpawnId: number

  public constructor(
    scene: Phaser.Scene,
    bossUpgrades: BossUpgradeLevels,
    requestEnemy: () => boolean,
    chooseWeapon: (currentWeapon: WeaponKey) => WeaponKey,
    getCurrentWeapon: () => WeaponKey,
    getTeamSize: () => number,
    rng: () => number,
  ) {
    this.scene = scene
    this.bossUpgrades = bossUpgrades
    this.requestEnemy = requestEnemy
    this.chooseWeapon = chooseWeapon
    this.getCurrentWeapon = getCurrentWeapon
    this.getTeamSize = getTeamSize
    this.rng = rng
    this.pairs = []
    this.blockerGroup = scene.physics.add.group()
    this.rewardGroup = scene.physics.add.group()
    this.levelPlan = getLevelPlan(1)
    this.spawnAccumulatorMs = 0
    this.elapsedMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs
    this.nextSpawnId = -1
    for (let index = 0; index < BALANCE.pools.blockers; index += 1) this.pairs.push(this.createPair())
  }

  public getBlockers(): Phaser.Physics.Arcade.Group { return this.blockerGroup }

  public getRewards(): Phaser.Physics.Arcade.Group { return this.rewardGroup }

  public hasActivePair(): boolean { return this.pairs.some((pair) => pair.active) }

  public resetForLevel(level: number): void {
    this.deactivateAll()
    this.levelPlan = getLevelPlan(level)
    this.spawnAccumulatorMs = 0
  }

  public deactivateAll(): void {
    for (const pair of this.pairs) this.recycle(pair)
  }

  public isBlocker(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.GameObjects.Rectangle {
    return this.pairs.some((pair) => pair.blocker === candidate)
  }

  public isReward(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    return this.pairs.some((pair) => pair.reward === candidate)
  }

  public damage(blocker: Phaser.GameObjects.Rectangle, damage: number): boolean {
    const pair = this.pairs.find((candidate) => candidate.blocker === blocker)
    if (pair === undefined || !pair.active || pair.broken) return false
    const remainingHp = (blocker.getData('hp') as number) - damage
    blocker.setData('hp', remainingHp)
    blocker.setFillStyle(remainingHp <= 0 ? 0x52616f : 0xb84432)
    pair.label.setText(remainingHp <= 0 ? '' : `${Math.max(0, Math.ceil(remainingHp))}`)
    if (remainingHp > 0) return false

    pair.broken = true
    blocker.setActive(false).setVisible(false)
    ;(blocker.body as Phaser.Physics.Arcade.Body).enable = false
    pair.label.setActive(false).setVisible(false)
    pair.reward.enableBody(true, pair.reward.x, pair.reward.y, true, true)
    pair.reward.setActive(true).setVisible(true).setAlpha(Math.max(pair.reward.alpha, 0.01))
    return true
  }

  public collect(reward: Phaser.Physics.Arcade.Image): WeaponKey | undefined {
    const pair = this.pairs.find((candidate) => candidate.reward === reward)
    if (pair === undefined || !pair.active || !pair.broken || !reward.active) return undefined
    const weapon = pair.weapon
    this.recycle(pair)
    return weapon
  }

  public hitCrowd(blocker: Phaser.GameObjects.Rectangle): number | undefined {
    const pair = this.pairs.find((candidate) => candidate.blocker === blocker)
    if (pair === undefined || !pair.active || pair.broken) return undefined
    this.recycle(pair)
    return BALANCE.blockers.contactDamage
  }

  public update(dt: number): void {
    this.elapsedMs += dt
    const intervalMs = this.levelPlan.reserved.blockers ? getBlockerIntervalMs(this.levelPlan.designLevel) : 0
    if (intervalMs > 0) {
      this.spawnAccumulatorMs += dt
      while (this.spawnAccumulatorMs >= intervalMs) {
        this.spawnAccumulatorMs -= intervalMs
        this.spawn()
      }
    }
    const movement = (BALANCE.scrollSpeed * dt) / 1000
    for (const pair of this.pairs) {
      if (!pair.active) continue
      this.movePair(pair, movement)
      if (pair.blocker.active && pair.blocker.y - pair.blocker.displayHeight / 2 > this.scene.scale.height) this.recycle(pair)
      else if (pair.broken && pair.reward.y - pair.reward.displayHeight / 2 > this.scene.scale.height) this.recycle(pair)
    }
  }

  private createPair(): BlockerPair {
    const blocker = this.scene.add.rectangle(0, 0, BALANCE.blockers.minWidthPx, BALANCE.blockers.heightPx, 0xb84432)
      .setStrokeStyle(3, 0xf3cf8a).setDepth(BALANCE.layers.gameplay).setOrigin(0.5).setActive(false).setVisible(false)
    this.scene.physics.add.existing(blocker)
    ;(blocker.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
    ;(blocker.body as Phaser.Physics.Arcade.Body).enable = false
    this.blockerGroup.add(blocker)
    const label = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui', fontSize: '17px', color: '#ffffff', stroke: HUD_COLORS.textDark, strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(BALANCE.layers.gameplay + 1).setActive(false).setVisible(false)
    const reward = this.scene.physics.add.image(0, 0, 'weapon-normal-gate').setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    reward.disableBody(true, true)
    this.rewardGroup.add(reward)
    return { blocker, label, reward, active: false, broken: false, weapon: 'normal' }
  }

  private spawn(): void {
    const pair = this.pairs.find((candidate) => !candidate.active)
    if (pair === undefined) return this.warnPoolExhausted()
    // A failed enemy spawn deliberately cancels this attempt: a lone blocker has no choice tension.
    if (!this.requestEnemy()) return
    const roadHalfWidth = getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, BALANCE.road.horizonY)
    const minPassagePx = BALANCE.crowd.hullWidthFigures * BALANCE.blockers.figureWidthPx + BALANCE.blockers.passageMarginPx
    const placement = computeBlockerPlacement(roadHalfWidth, minPassagePx, this.rng)
    if (placement.width < BALANCE.blockers.minWidthPx) return
    const y = BALANCE.road.horizonY
    const x = this.scene.scale.width / 2 + placement.centerOffset
    const plan = getBlockerPlan(this.levelPlan.level, this.bossUpgrades, this.getTeamSize(), this.getCurrentWeapon())
    pair.active = true
    pair.broken = false
    pair.weapon = this.chooseWeapon(this.getCurrentWeapon())
    pair.blocker.setSize(placement.width, BALANCE.blockers.heightPx).setPosition(x, y).setFillStyle(0xb84432).setStrokeStyle(3, 0xf3cf8a).setActive(true).setVisible(true).setAlpha(0)
    const body = pair.blocker.body as Phaser.Physics.Arcade.Body
    body.enable = true
    body.setSize(placement.width, BALANCE.blockers.heightPx, true)
    body.moves = false
    body.updateFromGameObject()
    pair.blocker.setData('hp', plan.maxHp)
    pair.blocker.setData('maxHp', plan.maxHp)
    pair.blocker.setData('spawnId', this.nextSpawnId)
    this.nextSpawnId -= 1
    pair.label.setText(`${plan.maxHp}`).setPosition(x, y).setActive(true).setVisible(true).setAlpha(0)
    pair.reward.setTexture(`weapon-${pair.weapon}-gate`).setPosition(x, y - BALANCE.blockers.rewardBehindOffsetPx).setActive(false).setVisible(false).setAlpha(0)
  }

  private movePair(pair: BlockerPair, movement: number): void {
    if (pair.blocker.active) {
      pair.blocker.y += movement
      const alpha = Math.min(1, Math.max(0, (pair.blocker.y - pair.blocker.displayHeight / 2 - BALANCE.road.horizonY) / BALANCE.road.entryFadePx))
      pair.blocker.setAlpha(alpha)
      pair.label.setPosition(pair.blocker.x, pair.blocker.y).setAlpha(alpha)
      ;(pair.blocker.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
    }
    pair.reward.y += movement
    if (!pair.broken || !pair.reward.active) return
    const alpha = Math.min(1, Math.max(0, (pair.reward.y - pair.reward.displayHeight / 2 - BALANCE.road.horizonY) / BALANCE.road.entryFadePx))
    pair.reward.setAlpha(alpha)
    ;(pair.reward.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
  }

  private recycle(pair: BlockerPair): void {
    pair.active = false
    pair.broken = false
    pair.blocker.setActive(false).setVisible(false)
    ;(pair.blocker.body as Phaser.Physics.Arcade.Body).enable = false
    pair.label.setActive(false).setVisible(false)
    pair.reward.disableBody(true, true)
    pair.reward.setActive(false).setVisible(false)
  }

  private warnPoolExhausted(): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastPoolWarningAtMs < BALANCE.feedback.poolWarningIntervalMs) return
    console.warn('Blocker pool exhausted; spawn skipped.')
    this.lastPoolWarningAtMs = this.elapsedMs
  }
}
