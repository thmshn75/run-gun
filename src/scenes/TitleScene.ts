import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { MENU_COLORS } from '../config/colors'
import { readSafeAreaInsets } from '../systems/safeArea'
import { computeTitleLayout } from '../systems/titleLayout'

export class TitleScene extends Phaser.Scene {
  public constructor() {
    super('TitleScene')
  }

  public create(): void {
    const width = this.scale.width
    const height = this.scale.height
    const insets = readSafeAreaInsets(this.game.canvas)
    const safeWidth = width - insets.left - insets.right
    const centerX = insets.left + safeWidth / 2
    const layout = computeTitleLayout(height, insets)

    this.input.setTopOnly(true)
    this.add.image(width / 2, height / 2, 'title').setDisplaySize(width, height)
    this.add.text(centerX, layout.title.top + layout.title.height / 2, 'RUN & GUN', {
      fontFamily: 'system-ui',
      fontSize: '38px',
      fontStyle: 'bold',
      color: this.colorFor(MENU_COLORS.title),
      stroke: '#0b0f18',
      strokeThickness: 6,
    }).setOrigin(0.5)

    const button = this.add.rectangle(
      centerX,
      layout.startButton.top + layout.startButton.height / 2,
      safeWidth - 2 * BALANCE.menu.sidePadding,
      layout.startButton.height,
      MENU_COLORS.button,
    ).setStrokeStyle(2, MENU_COLORS.buttonStroke).setOrigin(0.5).setInteractive({ useHandCursor: true })
    this.add.text(centerX, button.y, 'START', {
      fontFamily: 'system-ui',
      fontSize: '24px',
      fontStyle: 'bold',
      color: this.colorFor(MENU_COLORS.title),
    }).setOrigin(0.5)
    button.on('pointerdown', () => this.scene.start('MenuScene'))
  }

  private colorFor(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`
  }
}
