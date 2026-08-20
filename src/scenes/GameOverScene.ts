import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { readSafeAreaInsets } from '../systems/safeArea'

export class GameOverScene extends Phaser.Scene {
  private elapsedMs!: number
  private coins!: number

  public constructor() {
    super('GameOverScene')
  }

  public init(data: Readonly<{ coins?: number }>): void {
    this.coins = data.coins ?? 0
  }

  public create(): void {
    this.elapsedMs = 0
    const insets = readSafeAreaInsets()
    const centerX = this.scale.width / 2
    const centerY = (this.scale.height + insets.top - insets.bottom) / 2
    this.cameras.main.setBackgroundColor('#10131d')
    this.add.text(centerX, centerY, 'Game Over', {
      fontFamily: 'system-ui',
      fontSize: '42px',
      color: '#ff7b7b',
    }).setOrigin(0.5)
    this.add.text(centerX, centerY + 52, `Coins: ${this.coins}`, {
      fontFamily: 'system-ui',
      fontSize: '22px',
      color: '#f9dc65',
    }).setOrigin(0.5)
    this.add.text(centerX, centerY + 92, 'Tippen für Neustart', {
      fontFamily: 'system-ui',
      fontSize: '20px',
      color: '#daf6ff',
    }).setOrigin(0.5)
    this.input.on('pointerdown', () => {
      if (this.elapsedMs < BALANCE.feedback.gameOverRestartDelayMs) return
      this.scene.start('GameScene')
    })
  }

  public update(_time: number, rawDeltaMs: number): void {
    this.elapsedMs += Math.min(rawDeltaMs, BALANCE.maxDeltaMs)
  }
}
