import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS, MENU_COLORS } from '../config/colors'
import { readSafeAreaInsets, type SafeAreaInsets } from '../systems/safeArea'
import { loadSave, parseSave, serializeSave, writeSave, type SaveData, type ScoreEntry } from '../systems/save'
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
  private saveView?: HTMLDivElement

  public constructor() {
    super('MenuScene')
  }

  public create(): void {
    this.save = loadSave()
    this.insets = readSafeAreaInsets()
    const width = this.scale.width
    const height = this.scale.height
    const safeWidth = width - this.insets.left - this.insets.right
    const safeLeft = this.insets.left

    this.add.image(width / 2, height / 2, 'title').setDisplaySize(width, height)
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, BALANCE.menu.overlayAlpha)
    this.add.text(width / 2, this.insets.top + BALANCE.menu.titleY, 'RUN & GUN', {
      fontFamily: 'system-ui',
      fontSize: '38px',
      fontStyle: 'bold',
      color: this.colorFor(MENU_COLORS.title),
      stroke: '#0b0f18',
      strokeThickness: 6,
    }).setOrigin(0.5)
    this.balanceText = this.add.text(width / 2, this.insets.top + BALANCE.menu.balanceY, '', {
      fontFamily: 'system-ui',
      fontSize: '23px',
      fontStyle: 'bold',
      color: this.colorFor(HUD_COLORS.coins),
      stroke: '#0b0f18',
      strokeThickness: 4,
    }).setOrigin(0.5)

    const playY = height - this.insets.bottom - BALANCE.menu.playButtonBottom - BALANCE.menu.playButtonHeight / 2
    this.addButton(safeLeft + safeWidth / 2, playY, safeWidth - 2 * BALANCE.menu.sidePadding, BALANCE.menu.playButtonHeight, 'SPIELEN', true, () => {
      this.scene.start('GameScene')
    })
    this.renderShop()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.closeSaveView())
  }

  private renderShop(): void {
    this.shopObjects.splice(0).forEach((object) => object.destroy())
    this.balanceText.setText(`KONTO  ¢ ${this.save.coins}`)
    const safeLeft = this.insets.left
    const safeWidth = this.scale.width - this.insets.left - this.insets.right
    const rowX = safeLeft + BALANCE.menu.sidePadding
    const rowWidth = safeWidth - 2 * BALANCE.menu.sidePadding
    const startY = this.insets.top + BALANCE.menu.rowStartY

    getShopUpgradeKeys().forEach((key, index) => {
      const y = startY + index * (BALANCE.menu.rowHeight + BALANCE.menu.rowGap)
      this.renderUpgradeRow(key, rowX, y, rowWidth)
    })
    this.renderScores(rowX)
    this.renderSaveLoadButtons(safeLeft, safeWidth)
  }

  private renderScores(x: number): void {
    this.track(this.add.text(x, this.insets.top + BALANCE.menu.scoresTitleY, 'BESTE LÄUFE', {
      fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: this.colorFor(MENU_COLORS.text),
    }))
    if (this.save.scores.length === 0) {
      this.track(this.add.text(x, this.insets.top + BALANCE.menu.scoresFirstLineY, 'Noch kein Lauf gewertet.', {
        fontFamily: 'system-ui', fontSize: '15px', color: this.colorFor(MENU_COLORS.mutedText),
      }))
      return
    }

    this.save.scores.slice(0, BALANCE.menu.scoresShown).forEach((score, index) => {
      this.track(this.add.text(x, this.insets.top + BALANCE.menu.scoresFirstLineY + index * BALANCE.menu.scoresLineHeight, this.scoreText(index + 1, score), {
        fontFamily: 'system-ui', fontSize: '15px', color: this.colorFor(MENU_COLORS.text),
      }))
    })
  }

  private renderSaveLoadButtons(safeLeft: number, safeWidth: number): void {
    const width = (safeWidth - 2 * BALANCE.menu.sidePadding - BALANCE.menu.saveLoadButtonGap) / 2
    const left = safeLeft + BALANCE.menu.sidePadding + width / 2
    const right = left + width + BALANCE.menu.saveLoadButtonGap
    const y = this.insets.top + BALANCE.menu.saveLoadButtonsY
    this.addButton(left, y, width, BALANCE.menu.saveLoadButtonHeight, 'SICHERN', true, () => this.openExportView(), this.shopObjects)
    this.addButton(right, y, width, BALANCE.menu.saveLoadButtonHeight, 'LADEN', true, () => this.openImportView(), this.shopObjects)
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

  private openExportView(): void {
    const text = serializeSave(loadSave())
    const { view, textarea } = this.createSaveView('SPIELSTAND SICHERN', 'Der Text ist zum Kopieren markierbar. Kopieren wurde zusätzlich versucht.')
    textarea.value = text
    textarea.readOnly = true
    textarea.setAttribute('aria-label', 'Spielstand zum Kopieren')
    const clipboard = navigator.clipboard
    if (clipboard !== undefined) void clipboard.writeText(text).catch(() => undefined)
    this.addDomButton(view, 'FERTIG', () => this.closeSaveView())
  }

  private openImportView(): void {
    const { view, textarea } = this.createSaveView('SPIELSTAND LADEN', 'Spielstand hier per Langdruck einfügen.')
    textarea.setAttribute('aria-label', 'Spielstand zum Einfügen')
    const error = document.createElement('div')
    error.style.cssText = 'min-height: 24px; color: #ff9b9b; font-size: 16px; line-height: 1.35;'
    view.append(error)
    this.addDomButton(view, 'ÜBERNEHMEN', () => {
      const parsed = parseSave(textarea.value)
      if (!parsed.ok) {
        error.textContent = parsed.reason
        return
      }
      this.save = parsed.data
      writeSave(this.save)
      this.closeSaveView()
      this.renderShop()
    })
    this.addDomButton(view, 'ABBRECHEN', () => this.closeSaveView(), true)
  }

  private createSaveView(title: string, description: string): { view: HTMLDivElement; textarea: HTMLTextAreaElement } {
    this.closeSaveView()
    const view = document.createElement('div')
    view.style.cssText = [
      'position: fixed', 'inset: 0', 'z-index: 10', 'box-sizing: border-box',
      'display: flex', 'flex-direction: column', 'justify-content: center', 'gap: 14px',
      'padding: max(24px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left))',
      'background: rgba(16, 19, 29, 0.96)', 'color: #f4f6ff', 'font-family: system-ui, -apple-system, sans-serif',
    ].join(';')
    const heading = document.createElement('div')
    heading.textContent = title
    heading.style.cssText = 'font-size: 24px; font-weight: 700; text-align: center;'
    const help = document.createElement('div')
    help.textContent = description
    help.style.cssText = 'font-size: 16px; line-height: 1.4; text-align: center; color: #daf6ff;'
    const textarea = document.createElement('textarea')
    textarea.rows = 9
    textarea.spellcheck = false
    textarea.style.cssText = [
      'width: 100%', 'box-sizing: border-box', 'min-height: 190px', 'padding: 12px', 'border: 2px solid #62d0ff', 'border-radius: 8px',
      'background: #ffffff', 'color: #10131d', 'font-family: ui-monospace, SFMono-Regular, Menlo, monospace', 'font-size: 16px', 'line-height: 1.35',
    ].join(';')
    view.append(heading, help, textarea)
    document.body.append(view)
    this.saveView = view
    return { view, textarea }
  }

  private addDomButton(view: HTMLDivElement, label: string, onClick: () => void, secondary = false): void {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.style.cssText = [
      'min-height: 44px', 'border-radius: 8px', `border: 2px solid ${secondary ? '#8b96a8' : '#62d0ff'}`,
      `background: ${secondary ? '#30394a' : '#174b67'}`, 'color: #f4f6ff', 'font-size: 16px', 'font-weight: 700',
    ].join(';')
    button.addEventListener('click', onClick)
    view.append(button)
  }

  private closeSaveView(): void {
    this.saveView?.remove()
    this.saveView = undefined
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
  ): void {
    const target = this.add.rectangle(centerX, centerY, width, height, enabled ? MENU_COLORS.button : MENU_COLORS.disabledButton)
      .setStrokeStyle(2, enabled ? MENU_COLORS.buttonStroke : MENU_COLORS.disabledStroke)
      .setOrigin(0.5)
    const text = this.add.text(centerX, centerY, label, {
      fontFamily: 'system-ui', fontSize: label === 'SPIELEN' ? '24px' : '12px', fontStyle: 'bold',
      color: this.colorFor(enabled ? MENU_COLORS.title : MENU_COLORS.mutedText),
    }).setOrigin(0.5)
    if (trackedObjects !== undefined) {
      trackedObjects.push(target, text)
    }
    if (enabled) target.setInteractive({ useHandCursor: true }).on('pointerdown', onClick)
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.shopObjects.push(object)
    return object
  }

  private colorFor(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`
  }
}
