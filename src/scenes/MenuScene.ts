import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS, MENU_COLORS } from '../config/colors'
import { getGameAudio } from '../systems/audio'
import { computeMenuLayout } from '../systems/menuLayout'
import { readSafeAreaInsets, type SafeAreaInsets } from '../systems/safeArea'
import { loadSave, resetSave, writeSave, type SaveData, type ScoreEntry } from '../systems/save'
import {
  getShopUpgradeKeys,
  getUpgradePrice,
  getUpgradeStartValue,
  purchaseUpgrade,
  type ShopUpgradeKey,
} from '../systems/upgrades'

export class MenuScene extends Phaser.Scene {
  private save!: SaveData
  private insets!: SafeAreaInsets
  private balanceText!: Phaser.GameObjects.Text
  private readonly shopObjects: Phaser.GameObjects.GameObject[] = []
  private readonly confirmationObjects: Phaser.GameObjects.GameObject[] = []

  public constructor() {
    super('MenuScene')
  }

  public create(): void {
    this.save = loadSave()
    this.insets = readSafeAreaInsets(this.game.canvas)
    this.input.setTopOnly(true)
    const width = this.scale.width
    const height = this.scale.height
    const safeWidth = width - this.insets.left - this.insets.right
    const safeLeft = this.insets.left
    const layout = this.layout()

    this.add.image(width / 2, height / 2, 'title').setDisplaySize(width, height)
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, BALANCE.menu.overlayAlpha)
    this.add.text(width / 2, layout.title.top + layout.title.height / 2, 'RUN & GUN', {
      fontFamily: 'system-ui',
      fontSize: '38px',
      fontStyle: 'bold',
      color: this.colorFor(MENU_COLORS.title),
      stroke: '#0b0f18',
      strokeThickness: 6,
    }).setOrigin(0.5)
    this.balanceText = this.add.text(width / 2, layout.balance.top + layout.balance.height / 2, '', {
      fontFamily: 'system-ui',
      fontSize: '23px',
      fontStyle: 'bold',
      color: this.colorFor(HUD_COLORS.coins),
      stroke: '#0b0f18',
      strokeThickness: 4,
    }).setOrigin(0.5)

    this.addButton(safeLeft + safeWidth / 2, layout.playButton.top + layout.playButton.height / 2, safeWidth - 2 * BALANCE.menu.sidePadding, layout.playButton.height, 'SPIELEN', true, () => {
      this.scene.start('GameScene')
    })
    this.addButton(safeLeft + safeWidth / 2, layout.resetButton.top + layout.resetButton.height / 2, safeWidth - 2 * BALANCE.menu.sidePadding, layout.resetButton.height, 'ZURÜCKSETZEN', true, () => {
      this.openResetConfirmation()
    }, undefined, true)
    this.renderAudioToggle(layout)
    this.renderShop()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.closeResetConfirmation()
    })
  }

  /**
   * Ton-Schalter rechts neben dem Kontostand. Bewusst im Menue und nicht im HUD: Die
   * gesamte Spielflaeche ist Drag-Steuerung, ein Tippziel darin wuerde die Truppe
   * verreissen. Zusaetzlich ist der erste Tipp hier die Nutzergeste, mit der iOS
   * Web Audio ueberhaupt erst freigibt.
   */
  private renderAudioToggle(layout: ReturnType<MenuScene['layout']>): void {
    const audio = getGameAudio(this)
    const width = 78
    const height = 30
    const centerX = this.scale.width - this.insets.right - BALANCE.menu.sidePadding - width / 2
    const centerY = layout.balance.top + layout.balance.height / 2
    const box = this.add.rectangle(centerX, centerY, width, height, MENU_COLORS.button).setOrigin(0.5)
    const label = this.add.text(centerX, centerY, '', {
      fontFamily: 'system-ui', fontSize: '12px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.title),
    }).setOrigin(0.5)
    const paint = (): void => {
      const muted = audio.isMuted()
      label.setText(muted ? 'TON AUS' : 'TON AN')
      box.setFillStyle(muted ? MENU_COLORS.disabledButton : MENU_COLORS.button)
      box.setStrokeStyle(2, muted ? MENU_COLORS.disabledStroke : MENU_COLORS.buttonStroke)
      label.setColor(this.colorFor(muted ? MENU_COLORS.mutedText : MENU_COLORS.title))
    }
    paint()
    box.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      audio.toggleMuted()
      paint()
      // Wer einschaltet, soll sofort hoeren, dass es geht.
      audio.play('crowdUp')
    })
  }

  private renderShop(): void {
    this.shopObjects.splice(0).forEach((object) => object.destroy())
    this.balanceText.setText(`KONTO  ¢ ${this.save.coins}`)
    const safeLeft = this.insets.left
    const safeWidth = this.scale.width - this.insets.left - this.insets.right
    const rowX = safeLeft + BALANCE.menu.sidePadding
    const rowWidth = safeWidth - 2 * BALANCE.menu.sidePadding
    const layout = this.layout()

    getShopUpgradeKeys().forEach((key, index) => {
      this.renderUpgradeRow(key, rowX, layout.upgradeRows[index].top, rowWidth)
    })
    this.renderScores(rowX, rowWidth, layout)
  }

  private renderScores(x: number, width: number, layout: ReturnType<MenuScene['layout']>): void {
    const scores = this.save.scores.slice(0, BALANCE.menu.scoresShown)
    const lines = scores.length === 0
      ? ['Noch kein Lauf gewertet.']
      : scores.map((score, index) => this.scoreText(index + 1, score))

    this.track(this.add.rectangle(x, layout.scoresTitle.top, width, layout.scoresTitle.height, MENU_COLORS.row, 0.9).setOrigin(0, 0))
    this.track(this.add.text(x + 12, layout.scoresTitle.top + 4, 'BESTE LÄUFE', {
      fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.text),
    }))
    lines.forEach((line, index) => {
      const bounds = layout.scoreLines[index]
      this.track(this.add.rectangle(x, bounds.top, width, bounds.height, MENU_COLORS.row, 0.9).setOrigin(0, 0))
      this.track(this.add.text(x + 12, bounds.top + 2, line, {
        fontFamily: 'system-ui', fontSize: '15px', color: this.colorFor(scores.length === 0 ? MENU_COLORS.mutedText : MENU_COLORS.text),
      }))
    })
  }

  private renderUpgradeRow(key: ShopUpgradeKey, x: number, y: number, width: number): void {
    const config = BALANCE.upgradesShop[key]
    const level = this.save.upgrades[key]
    const price = getUpgradePrice(key, level)
    const row = this.track(this.add.rectangle(x, y, width, BALANCE.menu.rowHeight, MENU_COLORS.row, 0.9).setOrigin(0, 0))
    row.setStrokeStyle(1, MENU_COLORS.rowStroke, 0.9)
    this.track(this.add.text(x + 12, y + 9, config.label, {
      fontFamily: 'system-ui', fontSize: '16px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.text),
    }))
    this.track(this.add.text(x + width - 12, y + 9, `${getUpgradeStartValue(key, level)} / ${config.max}`, {
      fontFamily: 'system-ui', fontSize: '15px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.text),
    }).setOrigin(1, 0))

    for (let point = 0; point < BALANCE.upgradesShop.prices.length; point += 1) {
      this.track(this.add.circle(x + 18 + point * 17, y + 48, 6, point < level ? MENU_COLORS.levelFilled : MENU_COLORS.levelEmpty))
    }

    if (price === undefined) {
      this.track(this.add.text(x + width - 14, y + 45, 'MAX', {
        fontFamily: 'system-ui', fontSize: '18px', fontStyle: 'bold', color: this.colorFor(HUD_COLORS.coins),
      }).setOrigin(1, 0.5))
      return
    }

    const affordable = this.save.coins >= price
    this.track(this.add.text(x + 110, y + 48, `¢ ${price}`, {
      fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: this.colorFor(affordable ? HUD_COLORS.coins : MENU_COLORS.mutedText),
    }).setOrigin(0, 0.5))
    this.addButton(x + width - 89, y + 48, 76, 34, 'KAUFEN', affordable, () => this.buy(key), this.shopObjects)
  }

  private buy(key: ShopUpgradeKey): void {
    const updatedSave = purchaseUpgrade(this.save, key)
    if (updatedSave === undefined) return
    this.save = updatedSave
    writeSave(this.save)
    this.renderShop()
  }

  private openResetConfirmation(): void {
    if (this.confirmationObjects.length > 0) return
    const width = this.scale.width
    const height = this.scale.height
    const safeWidth = width - this.insets.left - this.insets.right
    const centerX = this.insets.left + safeWidth / 2
    const centerY = (height + this.insets.top - this.insets.bottom) / 2
    const panelWidth = safeWidth - 2 * BALANCE.menu.sidePadding
    const blocker = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65).setDepth(10).setInteractive()
    blocker.on('pointerdown', () => undefined)
    const panel = this.add.rectangle(centerX, centerY, panelWidth, 244, MENU_COLORS.row, 1).setDepth(11)
      .setStrokeStyle(2, MENU_COLORS.rowStroke, 1)
    const question = this.add.text(centerX, centerY - 70, 'Alles zurücksetzen?', {
      fontFamily: 'system-ui', fontSize: '23px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.title),
    }).setOrigin(0.5).setDepth(12)
    const explanation = this.add.text(centerX, centerY - 32, 'Münzen, Aufwertungen und Bestenliste\ngehen verloren.', {
      fontFamily: 'system-ui', fontSize: '16px', align: 'center', color: this.colorFor(MENU_COLORS.text),
    }).setOrigin(0.5).setDepth(12)
    this.confirmationObjects.push(blocker, panel, question, explanation)
    this.confirmationObjects.push(...this.addButton(centerX, centerY + 36, panelWidth - 32, 42, 'JA, LÖSCHEN', true, () => {
      this.save = resetSave()
      this.closeResetConfirmation()
      this.renderShop()
    }, undefined, false, 12))
    this.confirmationObjects.push(...this.addButton(centerX, centerY + 88, panelWidth - 32, 36, 'ABBRECHEN', true, () => {
      this.closeResetConfirmation()
    }, undefined, true, 12))
  }

  private closeResetConfirmation(): void {
    this.confirmationObjects.splice(0).forEach((object) => object.destroy())
  }

  private scoreText(place: number, score: ScoreEntry): string {
    return `${place}.  ¢ ${score.coins}   LEVEL ${score.level}   ${this.formatTime(score.timeMs)}`
  }

  private formatTime(timeMs: number): string {
    const totalSeconds = Math.floor(timeMs / 1000)
    return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`
  }

  private addButton(
    // centerX and centerY are the button's midpoint, not its upper-left corner.
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    label: string,
    enabled: boolean,
    onClick: () => void,
    trackedObjects?: Phaser.GameObjects.GameObject[],
    muted = false,
    depth = 0,
  ): Phaser.GameObjects.GameObject[] {
    const buttonColor = muted ? MENU_COLORS.disabledButton : MENU_COLORS.button
    const strokeColor = muted ? MENU_COLORS.disabledStroke : MENU_COLORS.buttonStroke
    const target = this.add.rectangle(centerX, centerY, width, height, enabled ? buttonColor : MENU_COLORS.disabledButton)
      .setStrokeStyle(2, enabled ? strokeColor : MENU_COLORS.disabledStroke)
      .setOrigin(0.5)
      .setDepth(depth)
    const text = this.add.text(centerX, centerY, label, {
      fontFamily: 'system-ui', fontSize: label === 'SPIELEN' ? '24px' : '12px', fontStyle: 'bold',
      color: this.colorFor(enabled ? MENU_COLORS.title : MENU_COLORS.mutedText),
    }).setOrigin(0.5).setDepth(depth + 1)
    if (trackedObjects !== undefined) {
      trackedObjects.push(target, text)
    }
    if (enabled) target.setInteractive({ useHandCursor: true }).on('pointerdown', onClick)
    return [target, text]
  }

  private layout(): ReturnType<typeof computeMenuLayout> {
    return computeMenuLayout(this.scale.height, this.insets, Math.min(BALANCE.menu.scoresShown, Math.max(1, this.save.scores.length)))
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.shopObjects.push(object)
    return object
  }

  private colorFor(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`
  }
}
