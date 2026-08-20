import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { Coins } from '../systems/coins'
import { Crowd } from '../systems/crowd'
import { Gates } from '../systems/gates'
import { readSafeAreaInsets, type SafeAreaInsets } from '../systems/safeArea'
import { Spawner } from '../systems/spawner'
import { STAT_COLORS, RunStats } from '../systems/upgrades'
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
  private lastShownSpeed!: number

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
    this.lastShownSpeed = -1
    this.insets = readSafeAreaInsets()
    this.cameras.main.setBackgroundColor('#10131d')
    this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background-tile').setOrigin(0, 0)
    this.crowd = new Crowd(this, this.scale.width / 2, this.scale.height - BALANCE.player.anchorBottomOffset)
    const getAnchorPosition = (): Readonly<{ x: number; y: number }> => ({ x: this.crowd.getAnchorX(), y: this.crowd.getAnchorY() })
    this.weapons = new Weapons(this, getAnchorPosition, this.runStats)
    this.spawner = new Spawner(this, this.runStats)
    this.coins = new Coins(this, () => this.updateHud())
    this.gates = new Gates(this, this.runStats, getAnchorPosition, () => this.updateHud(), () => Phaser.Math.RND.frac())
    const hudX = this.insets.left + BALANCE.feedback.hudPadding
    const hudY = this.insets.top + BALANCE.feedback.hudPadding
    const hudStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'system-ui',
      fontSize: '20px',
    }
    const colorFor = (stat: keyof typeof STAT_COLORS): string => `#${STAT_COLORS[stat].toString(16).padStart(6, '0')}`
    this.hud = {
      hp: this.add.text(hudX, hudY, '', { ...hudStyle, color: colorFor('hp') }),
      coins: this.add.text(hudX + 112, hudY, '', { ...hudStyle, color: '#f9dc65' }),
      speed: this.add.text(hudX + 228, hudY, '', { ...hudStyle, color: '#ced4da' }),
      damage: this.add.text(hudX, hudY + 28, '', { ...hudStyle, color: colorFor('damage') }),
      rate: this.add.text(hudX + 112, hudY + 28, '', { ...hudStyle, color: colorFor('shotsPerSec') }),
    }
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
    const speed = this.getSpdShown()
    if (speed !== this.lastShownSpeed) {
      this.lastShownSpeed = speed
      this.updateHud()
    }
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
    this.weapons.recycle(projectile)
    if (this.spawner.damage(enemy, this.runStats.get('damage'), this.elapsedMs)) this.coins.spawnAt(enemyX, enemyY)
  }

  private handlePlayerHit(enemy: Phaser.Physics.Arcade.Image): void {
    if (!enemy.active) return
    this.spawner.recycle(enemy)
    this.runStats.set('hp', this.runStats.get('hp') - 1)
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
    const damage = Math.round(this.runStats.get('damage') * 10) / 10
    const shotsPerSec = Math.round(this.runStats.get('shotsPerSec') * 10) / 10
    this.hud.hp.setText(`HP ${this.runStats.get('hp')}`)
    this.hud.coins.setText(`¢ ${this.coins.getCount()}`)
    this.hud.speed.setText(`SPD ${this.getSpdShown()}`)
    this.hud.damage.setText(`DMG ${damage}`)
    this.hud.rate.setText(`RATE ${shotsPerSec}`)
  }

  private getSpdShown(): number {
    return Math.max(1, Math.round(this.spawner.getEnemySpeed() - BALANCE.stats.speed.base))
  }

  private drawSafeAreaDebug(): void {
    const frame = this.add.graphics()
    frame.lineStyle(2, 0xffc857, 1)
    frame.strokeRect(
      this.insets.left,
      this.insets.top,
      this.scale.width - this.insets.left - this.insets.right,
      this.scale.height - this.insets.top - this.insets.bottom,
    )
    this.add.text(
      BALANCE.feedback.hudPadding,
      this.insets.top + BALANCE.feedback.hudPadding * 4,
      `Safe area  T:${this.insets.top} R:${this.insets.right} B:${this.insets.bottom} L:${this.insets.left}`,
      { fontFamily: 'system-ui', fontSize: '13px', color: '#ffc857' },
    )
  }
}
