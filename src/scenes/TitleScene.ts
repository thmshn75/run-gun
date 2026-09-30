import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { FELD, passeKameraAn } from '../config/feld'
import { MENU_COLORS } from '../config/colors'
import { readSafeAreaInsets } from '../systems/safeArea'
import { computeTitleLayout } from '../systems/titleLayout'
import { enableSharpText } from '../systems/textSharpness'

export class TitleScene extends Phaser.Scene {
  private startet3D = false

  public constructor() {
    super('TitleScene')
  }

  public create(): void {
    passeKameraAn(this)
    enableSharpText(this)
    const width = FELD.breite
    const height = FELD.hoehe
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

    const addButton = (top: number, height: number, label: string, action: () => void): void => {
      const button = this.add.rectangle(
        centerX, top + height / 2, safeWidth - 2 * BALANCE.menu.sidePadding, height,
        MENU_COLORS.button,
      ).setStrokeStyle(2, MENU_COLORS.buttonStroke).setOrigin(0.5).setInteractive({ useHandCursor: true })
      this.add.text(centerX, button.y, label, {
        fontFamily: 'system-ui', fontSize: '24px', fontStyle: 'bold',
        color: this.colorFor(MENU_COLORS.title),
      }).setOrigin(0.5)
      button.on('pointerdown', action)
    }
    addButton(layout.standardButton.top, layout.standardButton.height, 'RUN & GUN', () => this.scene.start('MenuScene'))
    addButton(layout.threeDButton.top, layout.threeDButton.height, 'RUN GUN 3D', () => this.starte3D())
  }

  private starte3D(): void {
    if (this.startet3D) return
    this.startet3D = true
    const hinweisText = (hinweis?: string): void => {
      if (!hinweis) return
      const text = this.add.text(FELD.breite / 2, computeTitleLayout(FELD.hoehe, readSafeAreaInsets(this.game.canvas)).standardButton.top - 16, hinweis, {
        fontFamily: 'system-ui', fontSize: '14px', color: '#ffffff', backgroundColor: '#172231', align: 'center',
      }).setOrigin(0.5).setDepth(20)
      this.time.delayedCall(4000, () => text.destroy())
    }
    import('../v3d/einstieg').then(({ starte3D }) => {
      try { sessionStorage.removeItem('rg3d_neuladen') } catch { /* Speicher kann gesperrt sein. */ }
      void starte3D(this.game, hinweis => { this.startet3D = false; hinweisText(hinweis) }).catch(() => { this.startet3D = false })
    }).catch(() => {
      this.startet3D = false
      try {
        if (sessionStorage.getItem('rg3d_neuladen') !== '1') {
          sessionStorage.setItem('rg3d_neuladen', '1')
          location.reload()
          return
        }
      } catch { /* Ohne Session-Speicher kein sicherer Reload. */ }
      hinweisText('3D-Dateien nicht ladbar – App neu öffnen')
    })
  }

  private colorFor(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`
  }
}
