import Phaser from 'phaser'
import { BALANCE } from '../config/balance'

interface Sterbeeffekt {
  readonly image: Phaser.GameObjects.Image
  remainingMs: number
  startScaleX: number
  startScaleY: number
}

/** Eingefrorene Gegnerbilder: Ringpuffer statt eines blockierten Gegnerpoolplatzes. */
export class Sterbeeffekte {
  private readonly effekte: Sterbeeffekt[]
  private nextIndex = 0

  public constructor(scene: Phaser.Scene) {
    this.effekte = []
    for (let index = 0; index < BALANCE.pools.sterbeeffekte; index += 1) {
      const image = scene.add.image(0, 0, 'enemy-light').setDepth(BALANCE.layers.gameplay + 1)
        .setActive(false).setVisible(false)
      this.effekte.push({ image, remainingMs: 0, startScaleX: 1, startScaleY: 1 })
    }
  }

  public spawn(x: number, y: number, texture: string, scaleX: number, scaleY: number): void {
    // Der naechste Platz wird immer benutzt: bei Ueberlauf verschwindet nur der
    // aelteste optische Effekt, ohne create() und ohne Einfluss auf Gegner.
    const effect = this.effekte[this.nextIndex]
    this.nextIndex = (this.nextIndex + 1) % this.effekte.length
    effect.remainingMs = BALANCE.feedback.sterbeeffektMs
    effect.startScaleX = scaleX
    effect.startScaleY = scaleY
    effect.image.setTexture(texture).setPosition(x, y).setScale(scaleX, scaleY)
      .setTintFill(0xffffff).setAlpha(1).setActive(true).setVisible(true)
  }

  public update(dt: number): void {
    for (const effect of this.effekte) {
      if (effect.remainingMs <= 0) continue
      effect.remainingMs = Math.max(0, effect.remainingMs - dt)
      if (effect.remainingMs === 0) {
        effect.image.setActive(false).setVisible(false)
        continue
      }
      const progress = 1 - effect.remainingMs / BALANCE.feedback.sterbeeffektMs
      const scale = 1 + (BALANCE.feedback.sterbeeffektScale - 1) * progress
      effect.image.setScale(effect.startScaleX * scale, effect.startScaleY * scale).setAlpha(1 - progress)
    }
  }

  public deactivateAll(): void {
    for (const effect of this.effekte) {
      effect.remainingMs = 0
      effect.image.setActive(false).setVisible(false)
    }
  }
}
