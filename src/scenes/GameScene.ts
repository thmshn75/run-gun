import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS, STAT_COLORS, WORLD_COLORS } from '../config/colors'
import { Blockers } from '../systems/blockers'
import { Coins } from '../systems/coins'
import { selectChainLightningTargets } from '../systems/chainLightning'
import { Boss } from '../systems/boss'
import type { BossUpgradeLevels } from '../systems/bossPlan'
import { Crowd } from '../systems/crowd'
import { getCrowdDamageMultiplier } from '../systems/crowdDamage'
import { Gates } from '../systems/gates'
import { getLevelPlan } from '../systems/levelPlan'
import { getRoadHalfWidth, Road } from '../systems/road'
import { readSafeAreaInsets, type SafeAreaInsets } from '../systems/safeArea'
import { addScore, loadSave, qualifiesForScores, writeSave } from '../systems/save'
import { Spawner } from '../systems/spawner'
import { getUpgradeStartValue, RunStats } from '../systems/upgrades'
import { Weapons, type WeaponKey } from '../systems/weapons'

interface HudSegments {
  hp: Phaser.GameObjects.Text
  coins: Phaser.GameObjects.Text
  speed: Phaser.GameObjects.Text
  damage: Phaser.GameObjects.Text
  rate: Phaser.GameObjects.Text
  weapon: Phaser.GameObjects.Image
}

interface SplashFlash {
  image: Phaser.GameObjects.Image
  remainingMs: number
}

interface ChainFlash {
  image: Phaser.GameObjects.Image
  remainingMs: number
}

type LevelPhase = 'normal' | 'warning' | 'boss' | 'cleared'

class SplashFlashPool {
  private readonly flashes: SplashFlash[]
  private nextIndex: number

  public constructor(scene: Phaser.Scene) {
    this.flashes = []
    this.nextIndex = 0
    for (let index = 0; index < BALANCE.pools.splashFlashes; index += 1) {
      const image = scene.add.image(0, 0, 'splash-flash').setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
      this.flashes.push({ image, remainingMs: 0 })
    }
  }

  public spawn(x: number, y: number, radiusPx: number): void {
    for (let attempts = 0; attempts < this.flashes.length; attempts += 1) {
      const index = this.nextIndex
      this.nextIndex = index + 1 === this.flashes.length ? 0 : index + 1
      const flash = this.flashes[index]
      if (flash.remainingMs > 0) continue
      flash.remainingMs = BALANCE.weapon.splashFlashMs
      flash.image.setPosition(x, y).setScale((radiusPx * 2) / 32).setAlpha(1).setActive(true).setVisible(true)
      return
    }
  }

  public update(dt: number): void {
    for (const flash of this.flashes) {
      if (flash.remainingMs <= 0) continue
      flash.remainingMs = Math.max(0, flash.remainingMs - dt)
      flash.image.setAlpha(flash.remainingMs / BALANCE.weapon.splashFlashMs)
      if (flash.remainingMs === 0) flash.image.setActive(false).setVisible(false)
    }
  }
}

class ChainFlashPool {
  private readonly flashes: ChainFlash[]
  private nextIndex: number

  public constructor(scene: Phaser.Scene) {
    this.flashes = []
    this.nextIndex = 0
    for (let index = 0; index < BALANCE.pools.chainFlashes; index += 1) {
      const image = scene.add.image(0, 0, 'chain-flash').setDepth(BALANCE.layers.gameplay + 1).setActive(false).setVisible(false)
      this.flashes.push({ image, remainingMs: 0 })
    }
  }

  public spawn(x: number, y: number): void {
    for (let attempts = 0; attempts < this.flashes.length; attempts += 1) {
      const index = this.nextIndex
      this.nextIndex = index + 1 === this.flashes.length ? 0 : index + 1
      const flash = this.flashes[index]
      if (flash.remainingMs > 0) continue
      flash.remainingMs = BALANCE.weapon.chainFlashMs
      flash.image.setPosition(x, y).setAlpha(1).setActive(true).setVisible(true)
      return
    }
  }

  public update(dt: number): void {
    for (const flash of this.flashes) {
      if (flash.remainingMs <= 0) continue
      flash.remainingMs = Math.max(0, flash.remainingMs - dt)
      flash.image.setAlpha(flash.remainingMs / BALANCE.weapon.chainFlashMs)
      if (flash.remainingMs === 0) flash.image.setActive(false).setVisible(false)
    }
  }
}

export class GameScene extends Phaser.Scene {
  private road!: Road
  private crowd!: Crowd
  private weapons!: Weapons
  private spawner!: Spawner
  private coins!: Coins
  private gates!: Gates
  private runStats!: RunStats
  private bossUpgrades!: BossUpgradeLevels
  private elapsedMs!: number
  private enemyContactIframeUntilMs!: number
  private bossProjectileIframeUntilMs!: number
  private blinkUntilMs!: number
  private nextBlinkAtMs!: number
  private lastPointerX!: number | null
  private hud!: HudSegments
  private insets!: SafeAreaInsets
  private gameOverStarted!: boolean
  private lastCrowdSize!: number
  private splashFlashes!: SplashFlashPool
  private chainFlashes!: ChainFlashPool
  private boss!: Boss
  private blockers!: Blockers
  private currentLevel!: number
  private levelPhase!: LevelPhase
  private phaseRemainingMs!: number
  private bossBarBackground!: Phaser.GameObjects.Rectangle
  private bossBarFill!: Phaser.GameObjects.Rectangle
  private bossBarWidth!: number
  private levelOverlayBackground!: Phaser.GameObjects.Rectangle
  private levelOverlay!: Phaser.GameObjects.Text
  private lastUnknownCombatOverlapWarningAtMs!: number
  private projectileEnemyCollider!: Phaser.Physics.Arcade.Collider
  private projectileBossCollider: Phaser.Physics.Arcade.Collider | undefined
  private projectileBlockerCollider: Phaser.Physics.Arcade.Collider | undefined
  private crowdBossCollider: Phaser.Physics.Arcade.Collider | undefined
  private crowdBlockerCollider: Phaser.Physics.Arcade.Collider | undefined
  private crowdRewardCollider: Phaser.Physics.Arcade.Collider | undefined
  private bossProjectileCollider: Phaser.Physics.Arcade.Collider | undefined

  public constructor() {
    super('GameScene')
  }

  public create(): void {
    this.runStats = new RunStats()
    const save = loadSave()
    this.bossUpgrades = { ...save.upgrades }
    this.runStats.set('hp', getUpgradeStartValue('team', save.upgrades.team))
    this.runStats.set('damage', getUpgradeStartValue('damage', save.upgrades.damage))
    this.runStats.set('shotsPerSec', getUpgradeStartValue('rate', save.upgrades.rate))
    this.elapsedMs = 0
    this.enemyContactIframeUntilMs = 0
    this.bossProjectileIframeUntilMs = 0
    this.blinkUntilMs = 0
    this.nextBlinkAtMs = 0
    this.lastPointerX = null
    this.gameOverStarted = false
    this.lastCrowdSize = -1
    this.currentLevel = 1
    this.levelPhase = 'normal'
    this.phaseRemainingMs = getLevelPlan(this.currentLevel).normalPhaseSec * 1000
    this.lastUnknownCombatOverlapWarningAtMs = -1000
    this.insets = readSafeAreaInsets(this.game.canvas)
    this.cameras.main.setBackgroundColor(WORLD_COLORS.background)
    this.road = new Road(this)
    this.crowd = new Crowd(this, this.scale.width / 2, this.scale.height - BALANCE.player.anchorBottomOffset)
    const getAnchorPosition = (): Readonly<{ x: number; y: number }> => ({ x: this.crowd.getAnchorX(), y: this.crowd.getAnchorY() })
    this.weapons = new Weapons(this, (maxPerSalvo) => this.crowd.getNextSalvoPositions(maxPerSalvo), this.runStats)
    this.spawner = new Spawner(this, this.runStats, this.bossUpgrades)
    this.blockers = new Blockers(
      this,
      this.bossUpgrades,
      () => this.spawner.requestBlockerEnemy(),
      (currentWeapon) => this.spawner.chooseBlockerWeapon(currentWeapon),
      () => this.weapons.getWeapon(),
      () => Phaser.Math.RND.frac(),
    )
    this.boss = new Boss(
      this,
      () => this.spawner.allocateSpawnId(),
      () => this.spawner.requestBossCompanion(),
      () => this.crowd.getAnchorY(),
    )
    this.coins = new Coins(this, () => this.updateHud())
    this.gates = new Gates(
      this,
      this.runStats,
      getAnchorPosition,
      () => this.updateHud(),
      () => Phaser.Math.RND.frac(),
    )
    this.splashFlashes = new SplashFlashPool(this)
    this.chainFlashes = new ChainFlashPool(this)
    const panelX = this.insets.left + BALANCE.hud.padding
    const panelY = this.insets.top + BALANCE.hud.padding
    const panelW = this.scale.width - this.insets.left - this.insets.right - 2 * BALANCE.hud.padding
    const panelH = BALANCE.hud.panelHeight
    const panel = this.add.graphics()
    panel.fillStyle(HUD_COLORS.panel, BALANCE.hud.panelAlpha)
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, BALANCE.hud.panelRadius)
    panel.lineStyle(1, HUD_COLORS.panelStroke, BALANCE.hud.panelStrokeAlpha)
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, BALANCE.hud.panelRadius)
    panel.setDepth(BALANCE.hud.depthPanel)
    const primaryHudStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'system-ui',
      fontSize: `${BALANCE.hud.primaryFontPx}px`,
      fontStyle: 'bold',
    }
    const statHudStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'system-ui',
      fontSize: `${BALANCE.hud.secondaryFontPx}px`,
      fontStyle: 'bold',
    }
    const rowOneY = panelY + BALANCE.hud.rowOneOffsetY
    const rowTwoY = panelY + BALANCE.hud.rowTwoOffsetY
    const colW = panelW / 4
    this.hud = {
      hp: this.add.text(panelX + BALANCE.hud.sidePad, rowOneY, '', { ...primaryHudStyle, color: this.colorFor(STAT_COLORS.hp) }).setOrigin(0, 0),
      coins: this.add.text(panelX + panelW - BALANCE.hud.sidePad, rowOneY, '', { ...primaryHudStyle, color: this.colorFor(HUD_COLORS.coins) }).setOrigin(1, 0),
      damage: this.add.text(panelX + colW * 0.5, rowTwoY, '', { ...statHudStyle, color: this.colorFor(STAT_COLORS.damage) }).setOrigin(0.5, 0),
      rate: this.add.text(panelX + colW * 1.5, rowTwoY, '', { ...statHudStyle, color: this.colorFor(STAT_COLORS.shotsPerSec) }).setOrigin(0.5, 0),
      speed: this.add.text(panelX + colW * 2.5, rowTwoY, '', { ...statHudStyle, color: this.colorFor(STAT_COLORS.speed) }).setOrigin(0.5, 0),
      weapon: this.add.image(panelX + colW * 3.5, rowTwoY + 10, 'weapon-normal-hud').setOrigin(0.5),
    }
    Object.values(this.hud).forEach((segment) => segment.setDepth(BALANCE.hud.depthText))
    const bossBarY = this.insets.top + BALANCE.hud.padding + BALANCE.hud.panelHeight + 8
    this.bossBarWidth = getRoadHalfWidth(this.scale.width, this.scale.height, BALANCE.road.horizonY) * 2
    const bossBarX = (this.scale.width - this.bossBarWidth) / 2
    this.bossBarBackground = this.add.rectangle(bossBarX, bossBarY, this.bossBarWidth, 8, HUD_COLORS.bossBarBack).setOrigin(0, 0).setDepth(BALANCE.hud.depthText)
    this.bossBarFill = this.add.rectangle(bossBarX, bossBarY, 0, 8, HUD_COLORS.bossBarFill).setOrigin(0, 0).setDepth(BALANCE.hud.depthText + 1)
    this.bossBarBackground.setVisible(false)
    this.bossBarFill.setVisible(false)
    this.levelOverlayBackground = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, HUD_COLORS.panel, 0.65)
      .setDepth(BALANCE.hud.depthText + 2)
      .setVisible(false)
    this.levelOverlay = this.add.text(this.scale.width / 2, this.scale.height / 2, '', {
      fontFamily: 'system-ui', fontSize: '34px', fontStyle: 'bold', color: this.colorFor(HUD_COLORS.bossOverlayText), stroke: HUD_COLORS.textDark, strokeThickness: 5,
    }).setOrigin(0.5).setDepth(BALANCE.hud.depthText + 3).setVisible(false)
    this.crowd.setSize(this.runStats.get('hp'))
    this.lastCrowdSize = this.runStats.get('hp')
    this.updateHud()
    this.enableRelativeDrag()
    this.replaceProjectileColliders()
    this.physics.add.overlap(this.crowd.getHullBounds(), this.spawner.getEnemies(), (first, second) => {
      this.handleCombatOverlap(first as Phaser.GameObjects.GameObject, second as Phaser.GameObjects.GameObject)
    })
    this.syncBossColliders()
    this.syncBlockerColliders()
    if (BALANCE.debug) {
      this.drawSafeAreaDebug()
      console.debug(`GameScene children: ${this.children.length}`)
    }
  }

  public update(_time: number, rawDeltaMs: number): void {
    const dt = Math.min(rawDeltaMs, BALANCE.maxDeltaMs)
    this.elapsedMs += dt
    this.road.update(dt)
    this.crowd.update()
    this.gates.update(dt)
    this.updateLevelPhase(dt)
    this.weapons.update(dt)
    this.spawner.update(dt)
    this.blockers.update(dt)
    this.boss.update(dt)
    this.syncBossColliders()
    this.syncBlockerColliders()
    this.coins.update(dt, this.crowd.getAnchorX(), this.crowd.getAnchorY())
    this.splashFlashes.update(dt)
    this.chainFlashes.update(dt)
    this.updateBossBar()
    if (this.runStats.get('hp') <= 0) {
      this.triggerGameOver()
      return
    }
    this.updateIframes()
  }

  private enableRelativeDrag(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.lastPointerX = pointer.x
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || this.lastPointerX === null) return
      this.crowd.setAnchorX(this.crowd.getAnchorX() + pointer.x - this.lastPointerX)
      this.lastPointerX = pointer.x
    })
    this.input.on('pointerup', () => {
      this.lastPointerX = null
    })
  }

  private addCombatOverlap(
    first: Phaser.Types.Physics.Arcade.ArcadeColliderType,
    second: Phaser.Types.Physics.Arcade.ArcadeColliderType,
  ): Phaser.Physics.Arcade.Collider {
    return this.physics.add.overlap(first, second, (overlapFirst, overlapSecond) => {
      this.handleCombatOverlap(overlapFirst as Phaser.GameObjects.GameObject, overlapSecond as Phaser.GameObjects.GameObject)
    })
  }

  private replaceProjectileColliders(): void {
    this.projectileEnemyCollider?.destroy()
    this.projectileBossCollider?.destroy()
    this.projectileBlockerCollider?.destroy()
    this.projectileBossCollider = undefined
    this.projectileBlockerCollider = undefined

    const projectiles = this.weapons.getProjectileGroup()
    this.projectileEnemyCollider = this.addCombatOverlap(projectiles, this.spawner.getEnemies())
    if (this.levelPhase === 'boss') this.projectileBossCollider = this.addCombatOverlap(projectiles, this.boss.getEnemy())
    if (this.blockers.hasActivePair()) this.projectileBlockerCollider = this.addCombatOverlap(projectiles, this.blockers.getBlockers())
  }

  private syncBossColliders(): void {
    if (this.levelPhase === 'boss') {
      if (this.projectileBossCollider === undefined) {
        this.projectileBossCollider = this.addCombatOverlap(this.weapons.getProjectileGroup(), this.boss.getEnemy())
      }
      if (this.crowdBossCollider === undefined) {
        this.crowdBossCollider = this.addCombatOverlap(this.crowd.getHullBounds(), this.boss.getEnemy())
      }
      if (this.bossProjectileCollider === undefined) {
        this.bossProjectileCollider = this.addCombatOverlap(this.crowd.getHullBounds(), this.boss.getProjectiles())
      }
      return
    }
    this.projectileBossCollider?.destroy()
    this.crowdBossCollider?.destroy()
    this.bossProjectileCollider?.destroy()
    this.projectileBossCollider = undefined
    this.crowdBossCollider = undefined
    this.bossProjectileCollider = undefined
  }

  private syncBlockerColliders(): void {
    if (this.blockers.hasActivePair()) {
      if (this.projectileBlockerCollider === undefined) {
        this.projectileBlockerCollider = this.addCombatOverlap(this.weapons.getProjectileGroup(), this.blockers.getBlockers())
      }
      if (this.crowdBlockerCollider === undefined) {
        this.crowdBlockerCollider = this.addCombatOverlap(this.crowd.getHullBounds(), this.blockers.getBlockers())
      }
      if (this.crowdRewardCollider === undefined) {
        this.crowdRewardCollider = this.addCombatOverlap(this.crowd.getHullBounds(), this.blockers.getRewards())
      }
      return
    }
    this.projectileBlockerCollider?.destroy()
    this.crowdBlockerCollider?.destroy()
    this.crowdRewardCollider?.destroy()
    this.projectileBlockerCollider = undefined
    this.crowdBlockerCollider = undefined
    this.crowdRewardCollider = undefined
  }

  private equipWeapon(weapon: WeaponKey): void {
    if (!this.weapons.setWeapon(weapon)) return
    this.replaceProjectileColliders()
    this.updateHud()
  }

  private handleProjectileHit(projectile: Phaser.Physics.Arcade.Image, enemy: Phaser.Physics.Arcade.Image): void {
    if (!projectile.active || !enemy.active) return
    const weapon = projectile.getData('weapon') as WeaponKey
    const config = this.weapons.getWeaponConfig(weapon)
    const damage = this.runStats.get('damage') * this.getCrowdDamageMultiplier() * config.damageFactor
    if (config.pierces) {
      const hitSpawnIds = projectile.getData('hitSpawnIds') as Set<number>
      const spawnId = enemy.getData('spawnId') as number
      if (hitSpawnIds.has(spawnId)) return
      hitSpawnIds.add(spawnId)
      this.damageEnemy(enemy, damage)
      return
    }
    const impactX = enemy.x
    const impactY = enemy.y
    this.damageEnemy(enemy, damage)
    this.applyChainLightning(enemy, config, damage)
    if (config.splashRadiusPx > 0) {
      const radiusSquared = config.splashRadiusPx * config.splashRadiusPx
      const splashDamage = this.runStats.get('damage') * this.getCrowdDamageMultiplier() * config.splashDamageFactor
      for (const child of this.spawner.getEnemies().getChildren()) {
        const candidate = child as Phaser.Physics.Arcade.Image
        const dx = candidate.x - impactX
        const dy = candidate.y - impactY
        if (candidate.active && dx * dx + dy * dy <= radiusSquared) this.damageEnemy(candidate, splashDamage)
      }
      const bossEnemy = this.boss.getEnemy()
      const bossDx = bossEnemy.x - impactX
      const bossDy = bossEnemy.y - impactY
      if (bossEnemy.active && bossDx * bossDx + bossDy * bossDy <= radiusSquared) this.damageEnemy(bossEnemy, splashDamage)
      this.splashFlashes.spawn(impactX, impactY, config.splashRadiusPx)
    }
    this.weapons.recycle(projectile)
  }

  private handleProjectileBlockerHit(projectile: Phaser.Physics.Arcade.Image, blocker: Phaser.GameObjects.Rectangle): void {
    if (!projectile.active || !blocker.active) return
    const weapon = projectile.getData('weapon') as WeaponKey
    const config = this.weapons.getWeaponConfig(weapon)
    const damage = this.runStats.get('damage') * this.getCrowdDamageMultiplier() * config.damageFactor
    if (config.pierces) {
      const hitSpawnIds = projectile.getData('hitSpawnIds') as Set<number>
      const spawnId = blocker.getData('spawnId') as number
      if (hitSpawnIds.has(spawnId)) return
      hitSpawnIds.add(spawnId)
      this.blockers.damage(blocker, damage)
      return
    }
    const impactX = blocker.x
    const impactY = blocker.y
    this.blockers.damage(blocker, damage)
    if (config.splashRadiusPx > 0) {
      const radiusSquared = config.splashRadiusPx * config.splashRadiusPx
      const splashDamage = this.runStats.get('damage') * this.getCrowdDamageMultiplier() * config.splashDamageFactor
      for (const child of this.blockers.getBlockers().getChildren()) {
        const candidate = child as Phaser.GameObjects.Rectangle
        const dx = candidate.x - impactX
        const dy = candidate.y - impactY
        if (candidate.active && dx * dx + dy * dy <= radiusSquared) this.blockers.damage(candidate, splashDamage)
      }
      this.splashFlashes.spawn(impactX, impactY, config.splashRadiusPx)
    }
    this.weapons.recycle(projectile)
  }

  private applyChainLightning(
    source: Phaser.Physics.Arcade.Image,
    config: (typeof BALANCE.weapon)[WeaponKey],
    directDamage: number,
  ): void {
    if (config.chainCount === 0) return
    const targets = this.spawner.getEnemies().getChildren()
      .filter((child) => child.active)
      .map((child) => child as Phaser.Physics.Arcade.Image)
    const bossEnemy = this.boss.getEnemy()
    if (bossEnemy.active) targets.push(bossEnemy)
    const byId = new Map(targets.map((target) => [target.getData('spawnId') as number, target]))
    const sourceId = source.getData('spawnId') as number
    const jumps = selectChainLightningTargets(
      sourceId,
      source.x,
      source.y,
      targets.map((target) => ({ id: target.getData('spawnId') as number, x: target.x, y: target.y })),
      config.chainRadiusPx,
      config.chainCount,
    )
    for (const jump of jumps) {
      const target = byId.get(jump.id)
      if (target === undefined || !target.active) continue
      this.damageEnemy(target, directDamage * config.chainDamageFactor)
      this.chainFlashes.spawn(target.x, target.y)
    }
  }

  private handleCombatOverlap(first: Phaser.GameObjects.GameObject, second: Phaser.GameObjects.GameObject): void {
    const playerProjectile = this.findObjectWithData(first, second, 'weapon')
    if (playerProjectile !== undefined) {
      const enemy = playerProjectile === first ? second : first
      if (this.blockers.isBlocker(enemy)) {
        this.handleProjectileBlockerHit(playerProjectile as Phaser.Physics.Arcade.Image, enemy)
        return
      }
      this.handleProjectileHit(playerProjectile as Phaser.Physics.Arcade.Image, enemy as Phaser.Physics.Arcade.Image)
      return
    }

    const bossProjectile = this.findObjectWithData(first, second, 'damage')
    if (bossProjectile !== undefined) {
      if (!this.crowd.overlapsFigure((bossProjectile as Phaser.Physics.Arcade.Image).getBounds())) return
      if (this.elapsedMs < this.bossProjectileIframeUntilMs) return
      this.handleBossProjectileHit(bossProjectile as Phaser.Physics.Arcade.Image)
      return
    }

    const hull = this.crowd.getHullBounds()
    if (first === hull || second === hull) {
      const target = first === hull ? second : first
      if (this.blockers.isReward(target)) {
        const weapon = this.blockers.collect(target)
        if (weapon !== undefined) {
          this.equipWeapon(weapon)
        }
        return
      }
      if (this.blockers.isBlocker(target)) {
        if (!this.crowd.overlapsFigure(target.getBounds())) return
        if (this.elapsedMs < this.enemyContactIframeUntilMs) return
        const damage = this.blockers.hitCrowd(target)
        if (damage !== undefined) this.handlePlayerDamage(damage, 'contact')
        return
      }
      const enemyImage = target as Phaser.Physics.Arcade.Image
      if (!this.crowd.overlapsFigure(enemyImage.getBounds())) return
      if (this.elapsedMs < this.enemyContactIframeUntilMs) return
      this.handlePlayerHit(enemyImage)
      return
    }

    if (import.meta.env.DEV && this.elapsedMs - this.lastUnknownCombatOverlapWarningAtMs >= 1000) {
      console.warn('Unhandled combat overlap: neither object identifies as a player projectile, boss projectile, or player hull.')
      this.lastUnknownCombatOverlapWarningAtMs = this.elapsedMs
    }
  }

  private findObjectWithData(
    first: Phaser.GameObjects.GameObject,
    second: Phaser.GameObjects.GameObject,
    key: string,
  ): Phaser.GameObjects.GameObject | undefined {
    if (first.getData(key) !== undefined) return first
    if (second.getData(key) !== undefined) return second
    return undefined
  }

  private damageEnemy(enemy: Phaser.Physics.Arcade.Image, damage: number): void {
    const enemyX = enemy.x
    const enemyY = enemy.y
    const coinValue = enemy.getData('coinValue') as number
    if (!this.spawner.damage(enemy, damage)) return
    const coinOffsets = Array.from({ length: coinValue }, (_value, index) => (index - (coinValue - 1) / 2) * BALANCE.coins.dropSpacing)
    const firstCoinX = enemyX + coinOffsets[0]
    const lastCoinX = enemyX + coinOffsets[coinOffsets.length - 1]
    const groupOffsetX = firstCoinX < BALANCE.coins.edgeInset
      ? BALANCE.coins.edgeInset - firstCoinX
      : lastCoinX > this.scale.width - BALANCE.coins.edgeInset
        ? this.scale.width - BALANCE.coins.edgeInset - lastCoinX
        : 0
    for (let index = 0; index < coinValue; index += 1) {
      this.coins.spawnAt(enemyX + coinOffsets[index] + groupOffsetX, enemyY)
    }
    if (this.boss.isEnemy(enemy)) this.handleBossDefeated()
  }

  private handlePlayerHit(enemy: Phaser.Physics.Arcade.Image): void {
    if (!enemy.active) return
    const contactDamage = enemy.getData('contactDamage') as number
    if (!this.boss.isEnemy(enemy)) this.spawner.recycle(enemy)
    this.handlePlayerDamage(contactDamage, 'contact')
  }

  private handleBossProjectileHit(projectile: Phaser.Physics.Arcade.Image): void {
    if (!projectile.active) return
    this.boss.recycleProjectile(projectile)
    this.handlePlayerDamage(projectile.getData('damage') as number, 'boss-projectile')
  }

  private handlePlayerDamage(damage: number, source: 'contact' | 'boss-projectile'): void {
    this.runStats.set('hp', this.runStats.get('hp') - damage)
    this.syncCrowdSize()
    const iframeMs = source === 'boss-projectile' ? BALANCE.player.bossProjectileIframesMs : BALANCE.player.iframesMs
    if (source === 'boss-projectile') this.bossProjectileIframeUntilMs = this.elapsedMs + iframeMs
    else this.enemyContactIframeUntilMs = this.elapsedMs + iframeMs
    this.blinkUntilMs = Math.max(this.blinkUntilMs, this.elapsedMs + iframeMs)
    this.nextBlinkAtMs = this.elapsedMs
    this.updateHud()
    if (this.runStats.get('hp') <= 0) this.triggerGameOver()
  }

  private triggerGameOver(): void {
    if (this.gameOverStarted) return
    this.gameOverStarted = true
    const runCoins = this.coins.getCount()
    const saved = loadSave()
    const scorePlace = qualifiesForScores(saved, runCoins)
      ? saved.scores.filter((score) => score.coins >= runCoins).length + 1
      : undefined
    const withScore = addScore(saved, { coins: runCoins, level: this.currentLevel, timeMs: this.elapsedMs })
    writeSave({
      ...withScore,
      coins: withScore.coins + runCoins,
      highestLevel: Math.max(withScore.highestLevel, this.currentLevel),
    })
    this.scene.start('GameOverScene', { coins: runCoins, scorePlace })
  }

  private updateLevelPhase(dt: number): void {
    if (this.levelPhase === 'boss') return
    this.phaseRemainingMs -= dt
    if (this.phaseRemainingMs > 0) return
    if (this.levelPhase === 'normal') {
      this.levelPhase = 'warning'
      this.phaseRemainingMs = BALANCE.level.warningMs
      this.spawner.setSpawningEnabled(false)
      this.blockers.deactivateAll()
      this.levelOverlayBackground.setVisible(false)
      this.levelOverlay.setText('BOSS').setVisible(true)
      return
    }
    if (this.levelPhase === 'warning') {
      this.levelPhase = 'boss'
      this.levelOverlayBackground.setVisible(false)
      this.levelOverlay.setVisible(false)
      this.boss.activate(this.currentLevel, this.bossUpgrades)
      return
    }
    this.levelPhase = 'normal'
    this.phaseRemainingMs = getLevelPlan(this.currentLevel).normalPhaseSec * 1000
    this.levelOverlayBackground.setVisible(false)
    this.levelOverlay.setVisible(false)
    this.spawner.resetForLevel(this.currentLevel)
    this.blockers.resetForLevel(this.currentLevel)
  }

  private handleBossDefeated(): void {
    if (this.levelPhase !== 'boss') return
    this.spawner.recycleBossCompanions()
    this.blockers.deactivateAll()
    this.boss.deactivate()
    this.currentLevel += 1
    const saved = loadSave()
    writeSave({ ...saved, highestLevel: Math.max(saved.highestLevel, this.currentLevel) })
    this.levelPhase = 'cleared'
    this.syncBossColliders()
    this.phaseRemainingMs = BALANCE.level.clearedMs
    this.levelOverlayBackground.setVisible(true)
    this.levelOverlay.setText(`LEVEL ${this.currentLevel - 1} GESCHAFFT`).setVisible(true)
  }

  private updateBossBar(): void {
    const bossEnemy = this.boss.getEnemy()
    const visible = this.levelPhase === 'boss' && bossEnemy.active
    this.bossBarBackground.setVisible(visible)
    this.bossBarFill.setVisible(visible)
    if (!visible) return
    const hp = bossEnemy.getData('hp') as number
    const maxHp = bossEnemy.getData('maxHp') as number
    this.bossBarFill.setSize(this.bossBarWidth * Math.max(0, hp) / maxHp, 8)
  }

  private updateIframes(): void {
    if (this.elapsedMs >= this.blinkUntilMs) {
      this.crowd.setFiguresAlpha(1)
      return
    }
    if (this.elapsedMs >= this.nextBlinkAtMs) {
      this.crowd.setFiguresAlpha(Math.floor(this.elapsedMs / BALANCE.player.blinkIntervalMs) % 2 === 0 ? 0.35 : 1)
      this.nextBlinkAtMs += BALANCE.player.blinkIntervalMs
    }
  }

  private updateHud(): void {
    this.syncCrowdSize()
    const damage = Math.round(this.runStats.get('damage') * 10) / 10
    const shotsPerSec = Math.round(this.runStats.get('shotsPerSec') * 10) / 10
    this.hud.hp.setText(`TEAM ${this.runStats.get('hp')}`)
    this.hud.coins.setText(`¢ ${this.coins.getCount()}`)
    this.hud.speed.setText(`SPD ${Math.round(this.runStats.get('speed'))}`)
    this.hud.damage.setText(`DMG ${damage}`)
    this.hud.rate.setText(`RATE ${shotsPerSec}`)
    this.hud.weapon.setTexture(`weapon-${this.weapons.getWeapon()}-hud`)
  }

  private syncCrowdSize(): void {
    const crowdSize = this.runStats.get('hp')
    if (crowdSize === this.lastCrowdSize) return
    this.crowd.setSize(crowdSize)
    this.lastCrowdSize = crowdSize
  }

  private getCrowdDamageMultiplier(): number {
    return getCrowdDamageMultiplier(this.runStats.get('hp'))
  }

  private drawSafeAreaDebug(): void {
    const frame = this.add.graphics()
    frame.lineStyle(2, HUD_COLORS.coins, 1)
    frame.strokeRect(
      this.insets.left,
      this.insets.top,
      this.scale.width - this.insets.left - this.insets.right,
      this.scale.height - this.insets.top - this.insets.bottom,
    )
    this.add.text(
      BALANCE.hud.padding,
      this.insets.top + BALANCE.hud.padding * 4,
      `Safe area  T:${this.insets.top} R:${this.insets.right} B:${this.insets.bottom} L:${this.insets.left}`,
      { fontFamily: 'system-ui', fontSize: '13px', color: this.colorFor(HUD_COLORS.coins) },
    )
  }

  private colorFor(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`
  }
}
