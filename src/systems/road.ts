import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { getRoadHalfWidth } from './roadGeometry'

export { getRoadHalfWidth } from './roadGeometry'

type CenterLineSegment = {
  readonly image: Phaser.GameObjects.Image
  progress: number
}

export class Road {
  private readonly scene: Phaser.Scene
  private readonly centerLines: CenterLineSegment[]

  public constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.centerLines = []
    scene.add.image(0, 0, 'sky').setOrigin(0).setDepth(BALANCE.layers.background)
    scene.add.image(0, BALANCE.road.horizonY, 'ground').setOrigin(0).setDepth(BALANCE.layers.background)
    scene.add.image(0, 0, 'road').setOrigin(0).setDepth(BALANCE.layers.road)
    for (let index = 0; index < BALANCE.road.centerLine.segments; index += 1) {
      this.centerLines.push({
        image: scene.add.image(0, 0, 'road-center-line').setOrigin(0.5).setDepth(BALANCE.layers.road),
        progress: index / BALANCE.road.centerLine.segments,
      })
    }
    this.updateCenterLines()
  }

  public update(dt: number): void {
    const progressDelta = (BALANCE.scrollSpeed * dt) / (this.scene.scale.height * 1000)
    for (const centerLine of this.centerLines) {
      centerLine.progress += progressDelta
      if (centerLine.progress >= 1) centerLine.progress -= 1
    }
    this.updateCenterLines()
  }

  private updateCenterLines(): void {
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    for (const centerLine of this.centerLines) {
      const y = BALANCE.road.horizonY + (height - BALANCE.road.horizonY) * centerLine.progress * centerLine.progress
      const halfWidth = getRoadHalfWidth(width, height, y)
      centerLine.image
        .setPosition(width / 2, y)
        .setDisplaySize(
          halfWidth * BALANCE.road.centerLine.widthOfHalfRoadRatio,
          halfWidth * BALANCE.road.centerLine.lengthOfHalfRoadRatio * centerLine.progress,
        )
    }
  }
}
