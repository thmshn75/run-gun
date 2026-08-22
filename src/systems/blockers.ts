import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS } from '../config/colors'
import { getBlockerPlan } from './blockerPlan'
import { getLevelPlan, type LevelPlan } from './levelPlan'
import { getWallGeometry } from './road'
import type { WeaponKey } from './weapons'

// Seit W2 (V2) traegt diese Klasse die WANDSEGMENTE links/rechts am Strassenrand —
// sie ersetzt die V1-Quersperren und behaelt deren bewaehrte Bausteine (Pool,
// Feuerkraft-HP aus getBlockerPlan, Kollisionspfade, Waffen-Reward). Umbenennung
// auf "Walls" folgt im W6-Aufraeumen.

type WallSide = 'left' | 'right'

interface BlockerPair {
  blocker: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
  reward: Phaser.Physics.Arcade.Image
  active: boolean
  broken: boolean
  hasWeapon: boolean
  side: WallSide
  weapon: WeaponKey
}

export class Blockers {
  private readonly scene: Phaser.Scene
  private readonly requestEnemy: () => boolean
  private readonly chooseWeapon: (currentWeapon: WeaponKey) => WeaponKey
  private readonly getCurrentWeapon: () => WeaponKey
  private readonly getTeamSize: () => number
  private readonly getDamage: () => number
  private readonly getShotsPerSec: () => number
  private readonly onBroken: (x: number, y: number) => void
  private readonly pairs: BlockerPair[]
  private readonly blockerGroup: Phaser.Physics.Arcade.Group
  private readonly rewardGroup: Phaser.Physics.Arcade.Group
  private levelPlan: LevelPlan
  private spawnAccumulatorMs: number
  private elapsedMs: number
  private lastPoolWarningAtMs: number
  private nextSpawnId: number
  private nextSide: WallSide
  private weaponCounter: number

  public constructor(
    scene: Phaser.Scene,
    requestEnemy: () => boolean,
    chooseWeapon: (currentWeapon: WeaponKey) => WeaponKey,
    getCurrentWeapon: () => WeaponKey,
    getTeamSize: () => number,
    getDamage: () => number,
    getShotsPerSec: () => number,
    rng: () => number,
    onBroken: (x: number, y: number) => void,
  ) {
    this.scene = scene
    this.requestEnemy = requestEnemy
    this.chooseWeapon = chooseWeapon
    this.getCurrentWeapon = getCurrentWeapon
    this.getTeamSize = getTeamSize
    this.getDamage = getDamage
    this.getShotsPerSec = getShotsPerSec
    this.onBroken = onBroken
    this.nextSide = rng() < 0.5 ? 'left' : 'right'
    this.weaponCounter = 0
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

    this.onBroken(blocker.x, blocker.y)
    if (!pair.hasWeapon) {
      this.recycle(pair)
      return true
    }
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
    return BALANCE.walls.contactDamage
  }

  public update(dt: number): void {
    this.elapsedMs += dt
    // Wandsegmente laufen in jedem Level mit festem Takt; nur die Waffen-Segmente
    // haengen am Sperren-Budget der Leveltabelle (siehe spawn()).
    this.spawnAccumulatorMs += dt
    while (this.spawnAccumulatorMs >= BALANCE.walls.spawnIntervalMs) {
      this.spawnAccumulatorMs -= BALANCE.walls.spawnIntervalMs
      this.spawn()
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
    const blocker = this.scene.add.rectangle(0, 0, 30, BALANCE.walls.segmentHeightPx, 0xb84432)
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
    return { blocker, label, reward, active: false, broken: false, hasWeapon: false, side: 'left', weapon: 'normal' }
  }

  private wallGeometry(side: WallSide, y: number): { x: number; width: number } {
    return getWallGeometry(this.scene.scale.width, this.scene.scale.height, y, side)
  }

  private spawn(): void {
    const pair = this.pairs.find((candidate) => !candidate.active)
    if (pair === undefined) return this.warnPoolExhausted()
    // A failed enemy spawn deliberately cancels this attempt: a lone wall has no choice tension.
    if (!this.requestEnemy()) return
    const side = this.nextSide
    this.nextSide = side === 'left' ? 'right' : 'left'
    const y = BALANCE.road.horizonY
    const geometry = this.wallGeometry(side, y)
    const plan = getBlockerPlan(this.getTeamSize(), this.getCurrentWeapon(), this.getDamage(), this.getShotsPerSec())
    const maxHp = Math.max(1, Math.round(plan.maxHp * BALANCE.walls.hpFactor))
    const hasWeapon = this.levelPlan.reserved.blockers && (this.weaponCounter += 1) % BALANCE.walls.weaponEvery === 0
    pair.active = true
    pair.broken = false
    pair.hasWeapon = hasWeapon
    pair.side = side
    pair.weapon = hasWeapon ? this.chooseWeapon(this.getCurrentWeapon()) : 'normal'
    pair.blocker.setSize(geometry.width, BALANCE.walls.segmentHeightPx).setPosition(geometry.x, y).setFillStyle(0xb84432).setStrokeStyle(3, 0xf3cf8a).setActive(true).setVisible(true).setAlpha(0)
    const body = pair.blocker.body as Phaser.Physics.Arcade.Body
    body.enable = true
    body.setSize(geometry.width, BALANCE.walls.segmentHeightPx, true)
    body.moves = false
    body.updateFromGameObject()
    pair.blocker.setData('hp', maxHp)
    pair.blocker.setData('maxHp', maxHp)
    pair.blocker.setData('spawnId', this.nextSpawnId)
    this.nextSpawnId -= 1
    pair.label.setText(`${maxHp}`).setPosition(geometry.x, y).setActive(true).setVisible(true).setAlpha(0)
    pair.reward.setTexture(`weapon-${pair.weapon}-gate`).setPosition(geometry.x, y - BALANCE.blockers.rewardBehindOffsetPx).setActive(false).setVisible(false).setAlpha(0)
  }

  private movePair(pair: BlockerPair, movement: number): void {
    if (pair.blocker.active) {
      const y = pair.blocker.y + movement
      const geometry = this.wallGeometry(pair.side, y)
      pair.blocker.setPosition(geometry.x, y)
      pair.blocker.setSize(geometry.width, BALANCE.walls.segmentHeightPx)
      const body = pair.blocker.body as Phaser.Physics.Arcade.Body
      body.setSize(geometry.width, BALANCE.walls.segmentHeightPx, true)
      body.updateFromGameObject()
      const alpha = Math.min(1, Math.max(0, (y - pair.blocker.displayHeight / 2 - BALANCE.road.horizonY) / BALANCE.road.entryFadePx))
      pair.blocker.setAlpha(alpha)
      pair.label.setPosition(geometry.x, y).setAlpha(alpha)
    }
    const rewardY = pair.reward.y + movement
    pair.reward.setPosition(this.wallGeometry(pair.side, rewardY).x, rewardY)
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
