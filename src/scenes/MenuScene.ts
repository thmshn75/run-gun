import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS, MENU_COLORS } from '../config/colors'
import { readSafeAreaInsets, type SafeAreaInsets } from '../systems/safeArea'
import { loadSave, writeSave, type SaveData } from '../systems/save'
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
