import Phaser from 'phaser'

type SafeAreaInsets = Readonly<{ top: number; right: number; bottom: number; left: number }>

function readSafeAreaInsets(): SafeAreaInsets {
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = [
    'position:fixed',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top)',
    'padding-right:env(safe-area-inset-right)',
    'padding-bottom:env(safe-area-inset-bottom)',
    'padding-left:env(safe-area-inset-left)',
  ].join(';')
  document.body.append(probe)
  const styles = getComputedStyle(probe)
  const insets = {
    top: Number.parseFloat(styles.paddingTop) || 0,
    right: Number.parseFloat(styles.paddingRight) || 0,
    bottom: Number.parseFloat(styles.paddingBottom) || 0,
    left: Number.parseFloat(styles.paddingLeft) || 0,
  }
  probe.remove()
  return insets
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image
  private lastPointerX: number | null = null

  public constructor() {
    super('GameScene')
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#10131d')
    this.player = this.add.image(this.scale.width / 2, this.scale.height - 130, 'player-placeholder')

    const insets = readSafeAreaInsets()
    this.drawSafeAreaDebug(insets)
    this.enableRelativeDrag()
  }

  private drawSafeAreaDebug(insets: SafeAreaInsets): void {
    const frame = this.add.graphics()
    frame.lineStyle(2, 0xffc857, 1)
    frame.strokeRect(
      insets.left,
      insets.top,
      this.scale.width - insets.left - insets.right,
      this.scale.height - insets.top - insets.bottom,
    )
    this.add.text(
      12,
      12,
      `Safe area  T:${insets.top} R:${insets.right} B:${insets.bottom} L:${insets.left}`,
      { fontFamily: 'system-ui', fontSize: '13px', color: '#ffc857' },
    )
  }

  private enableRelativeDrag(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.lastPointerX = pointer.x
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || this.lastPointerX === null) return
      const deltaX = pointer.x - this.lastPointerX
      const halfWidth = this.player.displayWidth / 2
      this.player.x = Phaser.Math.Clamp(this.player.x + deltaX, halfWidth, this.scale.width - halfWidth)
      this.lastPointerX = pointer.x
    })
    this.input.on('pointerup', () => {
      this.lastPointerX = null
    })
  }
}
