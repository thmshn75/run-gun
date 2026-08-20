import Phaser from 'phaser'
import { BALANCE } from '../config/balance'

export function getRoadHalfWidth(width: number, height: number, y: number): number {
  const topWidth = width * BALANCE.road.topWidthRatio
  const bottomWidth = width * BALANCE.road.bottomWidthRatio
  return (topWidth + (bottomWidth - topWidth) * y / height) / 2
}

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
    scene.add.image(0, 0, 'road').setOrigin(0)
    for (let index = 0; index < BALANCE.road.centerLine.segments; index += 1) {
      this.centerLines.push({
        image: scene.add.image(0, 0, 'road-center-line').setOrigin(0.5),
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
      const y = height * centerLine.progress * centerLine.progress
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
