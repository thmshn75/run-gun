import Phaser from 'phaser'
import { BALANCE } from '../config/balance'

export class Coins {
  private readonly scene: Phaser.Scene
  private readonly coins!: Phaser.GameObjects.Image[]
  private readonly onCollected: () => void
  private collected!: number
  private elapsedMs!: number
  private lastPoolWarningAtMs!: number

  public constructor(scene: Phaser.Scene, onCollected: () => void) {
    this.scene = scene
    this.onCollected = onCollected
    this.coins = []
    this.collected = 0
    this.elapsedMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs

    for (let index = 0; index < BALANCE.pools.coins; index += 1) {
      const coin = scene.add.image(0, 0, 'coin').setActive(false).setVisible(false)
      this.coins.push(coin)
    }
  }

  public getCount(): number {
    return this.collected
  }

  public spawnAt(x: number, y: number): void {
    const coin = this.coins.find((candidate) => !candidate.active)
    if (coin === undefined) {
      this.warnPoolExhausted()
      return
    }
    coin.setPosition(x, y).setActive(true).setVisible(true).setAlpha(1).clearTint()
  }

  public update(dt: number, anchorX: number, anchorY: number): void {
    this.elapsedMs += dt
    for (const coin of this.coins) {
      if (!coin.active) continue
      coin.y += (BALANCE.scrollSpeed * dt) / 1000
      const distance = Phaser.Math.Distance.Between(coin.x, coin.y, anchorX, anchorY)
      if (distance <= BALANCE.coins.magnetRadius && distance > 0) {
        const step = Math.min((BALANCE.coins.magnetSpeed * dt) / 1000, distance)
        coin.x += ((anchorX - coin.x) / distance) * step
        coin.y += ((anchorY - coin.y) / distance) * step
      }
      if (Phaser.Math.Distance.Between(coin.x, coin.y, anchorX, anchorY) < BALANCE.coins.collectDistance) {
        this.collected += 1
        this.recycle(coin)
        this.onCollected()
      } else if (coin.y - coin.displayHeight / 2 > this.scene.scale.height) {
        this.recycle(coin)
      }
    }
  }

  private recycle(coin: Phaser.GameObjects.Image): void {
    coin.setActive(false).setVisible(false)
  }

  private warnPoolExhausted(): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastPoolWarningAtMs < BALANCE.feedback.poolWarningIntervalMs) return
    console.warn('Coin pool exhausted; drop skipped.')
    this.lastPoolWarningAtMs = this.elapsedMs
  }
}
