import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS, STAT_COLORS, WORLD_COLORS } from '../config/colors'
import { Coins } from '../systems/coins'
import { Crowd } from '../systems/crowd'
import { Gates } from '../systems/gates'
import { readSafeAreaInsets, type SafeAreaInsets } from '../systems/safeArea'
import { Spawner } from '../systems/spawner'
import { RunStats } from '../systems/upgrades'
import { Weapons } from '../systems/weapons'

interface HudSegments {
  hp: Phaser.GameObjects.Text
  coins: Phaser.GameObjects.Text
  speed: Phaser.GameObjects.Text
  damage: Phaser.GameObjects.Text
  rate: Phaser.GameObjects.Text
}

export class GameScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.TileSprite
  private crowd!: Crowd
  private weapons!: Weapons
  private spawner!: Spawner
  private coins!: Coins
  private gates!: Gates
  private runStats!: RunStats
  private elapsedMs!: number
  private iframeUntilMs!: number
  private nextBlinkAtMs!: number
  private lastPointerX!: number | null
  private hud!: HudSegments
  private insets!: SafeAreaInsets
  private gameOverStarted!: boolean
  private lastCrowdSize!: number

  public constructor() {
    super('GameScene')
  }

  public create(): void {
    this.runStats = new RunStats()
    this.elapsedMs = 0
    this.iframeUntilMs = 0
    this.nextBlinkAtMs = 0
    this.lastPointerX = null
    this.gameOverStarted = false
    this.lastCrowdSize = -1
    this.insets = readSafeAreaInsets()
    this.cameras.main.setBackgroundColor(WORLD_COLORS.background)
    this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background-tile').setOrigin(0, 0)
    this.crowd = new Crowd(this, this.scale.width / 2, this.scale.height - BALANCE.player.anchorBottomOffset)
    const getAnchorPosition = (): Readonly<{ x: number; y: number }> => ({ x: this.crowd.getAnchorX(), y: this.crowd.getAnchorY() })
    this.weapons = new Weapons(this, (maxPerSalvo) => this.crowd.getNextSalvoPositions(maxPerSalvo), this.runStats)
    this.spawner = new Spawner(this, this.runStats, () => this.crowd.getAnchorRange())
    this.coins = new Coins(this, () => this.updateHud())
    this.gates = new Gates(this, this.runStats, getAnchorPosition, () => this.updateHud(), () => Phaser.Math.RND.frac())
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
      fontSize: `${BALANCE.hud.statFontPx}px`,
      fontStyle: 'bold',
    }
    const rowOneY = panelY + BALANCE.hud.rowOneOffsetY
    const rowTwoY = panelY + BALANCE.hud.rowTwoOffsetY
    const colW = panelW / 3
    this.hud = {
      hp: this.add.text(panelX + BALANCE.hud.sidePad, rowOneY, '', { ...primaryHudStyle, color: this.colorFor(STAT_COLORS.hp) }).setOrigin(0, 0),
      coins: this.add.text(panelX + panelW - BALANCE.hud.sidePad, rowOneY, '', { ...primaryHudStyle, color: this.colorFor(HUD_COLORS.coins) }).setOrigin(1, 0),
      damage: this.add.text(panelX + colW * 0.5, rowTwoY, '', { ...statHudStyle, color: this.colorFor(STAT_COLORS.damage) }).setOrigin(0.5, 0),
      rate: this.add.text(panelX + colW * 1.5, rowTwoY, '', { ...statHudStyle, color: this.colorFor(STAT_COLORS.shotsPerSec) }).setOrigin(0.5, 0),
      speed: this.add.text(panelX + colW * 2.5, rowTwoY, '', { ...statHudStyle, color: this.colorFor(STAT_COLORS.speed) }).setOrigin(0.5, 0),
    }
    Object.values(this.hud).forEach((text) => text.setDepth(BALANCE.hud.depthText))
    this.crowd.setSize(this.runStats.get('hp'))
    this.lastCrowdSize = this.runStats.get('hp')
    this.updateHud()
    this.enableRelativeDrag()
    this.physics.add.overlap(this.weapons.getProjectiles(), this.spawner.getEnemies(), (projectile, enemy) => {
      this.handleProjectileHit(projectile as Phaser.Physics.Arcade.Image, enemy as Phaser.Physics.Arcade.Image)
    })
    // Zone must be first: Phaser passes (single object, group child) to this callback.
    this.physics.add.overlap(this.crowd.getHullBounds(), this.spawner.getEnemies(), (_hull, enemy) => {
      if (this.elapsedMs < this.iframeUntilMs) return
      this.handlePlayerHit(enemy as Phaser.Physics.Arcade.Image)
    })
    if (BALANCE.debug) {
      this.drawSafeAreaDebug()
      console.debug(`GameScene children: ${this.children.length}`)
    }
  }

  public update(_time: number, rawDeltaMs: number): void {
    const dt = Math.min(rawDeltaMs, BALANCE.maxDeltaMs)
    this.elapsedMs += dt
    this.background.tilePositionY -= (BALANCE.scrollSpeed * dt) / 1000
    this.crowd.update()
    this.weapons.update(dt)
    this.spawner.update(dt)
    this.coins.update(dt, this.crowd.getAnchorX(), this.crowd.getAnchorY())
    this.gates.update(dt)
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

  private handleProjectileHit(projectile: Phaser.Physics.Arcade.Image, enemy: Phaser.Physics.Arcade.Image): void {
    if (!projectile.active || !enemy.active) return
    const enemyX = enemy.x
    const enemyY = enemy.y
    const coinValue = enemy.getData('coinValue') as number
    this.weapons.recycle(projectile)
    if (this.spawner.damage(enemy, this.runStats.get('damage') * this.getCrowdDamageMultiplier(), this.elapsedMs)) this.coins.spawnAt(enemyX, enemyY, coinValue)
  }

  private handlePlayerHit(enemy: Phaser.Physics.Arcade.Image): void {
    if (!enemy.active) return
    const contactDamage = enemy.getData('contactDamage') as number
    this.spawner.recycle(enemy)
    this.runStats.set('hp', this.runStats.get('hp') - contactDamage)
    this.syncCrowdSize()
    this.iframeUntilMs = this.elapsedMs + BALANCE.player.iframesMs
    this.nextBlinkAtMs = this.elapsedMs
    this.updateHud()
    if (this.runStats.get('hp') <= 0) this.triggerGameOver()
  }

  private triggerGameOver(): void {
    if (this.gameOverStarted) return
    this.gameOverStarted = true
    this.scene.start('GameOverScene', { coins: this.coins.getCount() })
  }

  private updateIframes(): void {
    if (this.elapsedMs >= this.iframeUntilMs) {
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
  }

  private syncCrowdSize(): void {
    const crowdSize = this.runStats.get('hp')
    if (crowdSize === this.lastCrowdSize) return
    this.crowd.setSize(crowdSize)
    this.lastCrowdSize = crowdSize
  }

  private getCrowdDamageMultiplier(): number {
    const crowdSize = this.runStats.get('hp')
    return Math.min(
      BALANCE.crowd.damageMultiplierCap,
      1 + Math.max(0, crowdSize - BALANCE.crowd.shootersPerSalvo) * BALANCE.crowd.damagePerExtraFigure,
    )
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
