import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { getPopScale } from './gamefeel'

// Hochfliegende Zahlen beim Einsammeln (Lebendigkeit, Thomas 2026-08-22). Vorher
// verschwanden Muenzen, Waffen und Verstaerkungen lautlos und ohne Quittung — der
// Spieler bekam auf seine eigene Handlung keine Antwort. Fester Pool, kein create()
// oder destroy() im Hot Path.

interface Popup {
  readonly text: Phaser.GameObjects.Text
  remainingMs: number
  startX: number
  startY: number
}

export class Popups {
  private readonly popups: Popup[]
  private nextIndex: number

  public constructor(scene: Phaser.Scene) {
    this.popups = []
    this.nextIndex = 0
    for (let index = 0; index < BALANCE.gamefeel.popupPool; index += 1) {
      const text = scene.add.text(0, 0, '', {
        fontFamily: 'system-ui', fontSize: '20px', color: '#ffffff', stroke: '#101320', strokeThickness: 4, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(BALANCE.layers.gameplay + 2).setActive(false).setVisible(false)
      this.popups.push({ text, remainingMs: 0, startX: 0, startY: 0 })
    }
  }

  public spawn(x: number, y: number, label: string, color: string): void {
    for (let attempts = 0; attempts < this.popups.length; attempts += 1) {
      const index = this.nextIndex
      this.nextIndex = index + 1 === this.popups.length ? 0 : index + 1
      const popup = this.popups[index]
      if (popup.remainingMs > 0) continue
      popup.remainingMs = BALANCE.gamefeel.popupMs
      popup.startX = x
      popup.startY = y
      popup.text.setText(label).setColor(color).setPosition(x, y).setScale(1).setAlpha(1).setActive(true).setVisible(true)
      return
    }
    // Pool erschoepft: Die aelteste Zahl darf ausfallen, das ist reine Zutat.
  }

  public update(dt: number): void {
    for (const popup of this.popups) {
      if (popup.remainingMs <= 0) continue
      popup.remainingMs -= dt
      if (popup.remainingMs <= 0) {
        popup.text.setActive(false).setVisible(false)
        continue
      }
      const elapsedMs = BALANCE.gamefeel.popupMs - popup.remainingMs
      const progress = elapsedMs / BALANCE.gamefeel.popupMs
      popup.text.setPosition(popup.startX, popup.startY - (BALANCE.gamefeel.popupRiseSpeedPxPerSec * elapsedMs) / 1000)
      // Erst aufploppen, dann ausblenden: Die Skalierung nutzt die erste Haelfte,
      // die Deckkraft faellt ueber das letzte Drittel.
      popup.text.setScale(getPopScale(progress * 2, BALANCE.gamefeel.popOvershoot))
      popup.text.setAlpha(progress < 0.66 ? 1 : 1 - (progress - 0.66) / 0.34)
    }
  }

  public deactivateAll(): void {
    for (const popup of this.popups) {
      popup.remainingMs = 0
      popup.text.setActive(false).setVisible(false)
    }
  }
}
