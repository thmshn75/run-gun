import Phaser from 'phaser'
import { bahnKanten, BALANCE_V2 } from './balanceV2'

/** Das bewusst zustandslose Geruest fuer den isolierten Run-Gun-V2-Probelauf. */
export class RunGunV2Scene extends Phaser.Scene {
  public constructor() {
    super('RunGunV2Scene')
  }

  public create(): void {
    const width = this.scale.width
    const height = this.scale.height
    const centerX = width / 2
    const { horizonY, bottomY, topLeftX, topRightX, bottomLeftX, bottomRightX } = bahnKanten(width, height)

    this.add.rectangle(centerX, height / 2, width, height, BALANCE_V2.colors.sky)
    this.add.polygon(0, 0, [
      topLeftX, horizonY,
      topRightX, horizonY,
      bottomRightX, bottomY,
      bottomLeftX, bottomY,
    ], BALANCE_V2.colors.road).setOrigin(0, 0)

    this.add.polygon(0, 0, [0, horizonY, topLeftX, horizonY, bottomLeftX, bottomY, 0, bottomY], BALANCE_V2.colors.wall).setOrigin(0, 0)
    this.add.polygon(0, 0, [topRightX, horizonY, width, horizonY, width, bottomY, bottomRightX, bottomY], BALANCE_V2.colors.wall).setOrigin(0, 0)
    this.add.line(0, 0, topLeftX, horizonY, bottomLeftX, bottomY, BALANCE_V2.colors.wallEdge, 1)
      .setOrigin(0, 0)
      .setLineWidth(BALANCE_V2.track.wallWidthPx)
    this.add.line(0, 0, topRightX, horizonY, bottomRightX, bottomY, BALANCE_V2.colors.wallEdge, 1)
      .setOrigin(0, 0)
      .setLineWidth(BALANCE_V2.track.wallWidthPx)

    const menuButton = this.add.rectangle(52, 34, 84, 36, BALANCE_V2.colors.menuButton)
      .setStrokeStyle(2, BALANCE_V2.colors.menuButtonEdge)
      .setInteractive({ useHandCursor: true })
    this.add.text(52, 34, 'MENÜ', {
      fontFamily: 'system-ui', fontSize: '16px', fontStyle: 'bold', color: BALANCE_V2.colors.menuText,
    }).setOrigin(0.5)
    menuButton.on('pointerdown', () => this.scene.start('MenuScene'))
  }
}
