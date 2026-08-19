import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  public constructor() {
    super('BootScene')
  }

  public create(): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(0x56d6ff)
    graphics.fillRect(0, 0, 34, 46)
    graphics.fillStyle(0xdaf6ff)
    graphics.fillRect(6, 6, 22, 12)
    graphics.generateTexture('player-placeholder', 34, 46)
    graphics.destroy()

    this.scene.start('GameScene')
  }
}
