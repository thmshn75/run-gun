import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  public constructor() {
    super('BootScene')
  }

  public create(): void {
    this.createPlayerTexture()
    this.createProjectileTexture()
    this.createEnemyTexture()
    this.createBackgroundTexture()

    this.scene.start('GameScene')
  }

  private createPlayerTexture(): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(0x56d6ff)
    graphics.fillRect(0, 0, 34, 46)
    graphics.fillStyle(0xdaf6ff)
    graphics.fillRect(6, 6, 22, 12)
    graphics.generateTexture('player-placeholder', 34, 46)
    graphics.destroy()
  }

  private createProjectileTexture(): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(0xf9f1a5)
    graphics.fillRect(0, 0, 6, 14)
    graphics.generateTexture('projectile', 6, 14)
    graphics.destroy()
  }

  private createEnemyTexture(): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(0x501f2f)
    graphics.fillRect(0, 0, 30, 30)
    graphics.fillStyle(0xdf4d66)
    graphics.fillRect(3, 3, 24, 24)
    graphics.generateTexture('enemy', 30, 30)
    graphics.destroy()
  }

  private createBackgroundTexture(): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(0x10131d)
    graphics.fillRect(0, 0, 64, 64)
    graphics.fillStyle(0x172033)
    graphics.fillRect(0, 12, 64, 2)
    graphics.fillRect(0, 44, 64, 2)
    graphics.fillStyle(0x26344e)
    graphics.fillRect(8, 28, 4, 2)
    graphics.fillRect(42, 58, 4, 2)
    graphics.generateTexture('background-tile', 64, 64)
    graphics.destroy()
  }
}
