import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { getSceneryPlacement, getScenerySpawnIntervalMs, isSceneryOutsideViewport, pickSceneryKind, type SceneryKind, type ScenerySide } from './sceneryLayout'
import { sceneryKinds } from './sceneryKinds'
import { getScrollProgressDelta, getScrollY } from './roadGeometry'

export { sceneryKinds } from './sceneryKinds'

type SceneryObject = {
  readonly image: Phaser.GameObjects.Image
  active: boolean
  side: ScenerySide
  kind: SceneryKind
  randomDistance: number
  progress: number
}

export class Scenery {
  private readonly scene: Phaser.Scene
  private readonly rng: () => number
  private readonly objects: SceneryObject[]
  private leftSpawnRemainingMs: number
  private rightSpawnRemainingMs: number

  public constructor(scene: Phaser.Scene, rng: () => number) {
    this.scene = scene
    this.rng = rng
    this.objects = []
    this.leftSpawnRemainingMs = this.nextSpawnIntervalMs()
    this.rightSpawnRemainingMs = this.nextSpawnIntervalMs()
    for (let index = 0; index < BALANCE.pools.scenery; index += 1) this.objects.push(this.createObject())
  }

  public update(dt: number): void {
    this.leftSpawnRemainingMs -= dt
    this.rightSpawnRemainingMs -= dt
    while (this.leftSpawnRemainingMs <= 0) {
      this.leftSpawnRemainingMs += this.nextSpawnIntervalMs()
      this.spawn('left')
    }
    while (this.rightSpawnRemainingMs <= 0) {
      this.rightSpawnRemainingMs += this.nextSpawnIntervalMs()
      this.spawn('right')
    }
    const height = this.scene.scale.height
    const progressDelta = getScrollProgressDelta(height, dt)
    for (const object of this.objects) {
      if (!object.active) continue
      object.progress += progressDelta
      object.image.y = getScrollY(height, object.progress)
      this.applyPlacement(object)
      if (isSceneryOutsideViewport(
        this.scene.scale.width,
        height,
        object.image.x,
        object.image.y,
        object.image.displayWidth,
        object.image.displayHeight,
      )) this.recycle(object)
    }
  }

  private createObject(): SceneryObject {
    const image = this.scene.add.image(0, 0, 'scenery-oak')
      .setOrigin(0.5, 1)
      .setDepth(BALANCE.layers.scenery)
      .setActive(false)
      .setVisible(false)
    return { image, active: false, side: 'left', kind: sceneryKinds[0], randomDistance: 0, progress: 0 }
  }

  private spawn(side: ScenerySide): void {
    const object = this.objects.find((candidate) => !candidate.active)
    if (object === undefined) return
    object.active = true
    object.side = side
    object.kind = pickSceneryKind(sceneryKinds, this.rng)
    object.randomDistance = this.rng()
    object.progress = 0
    object.image.setTexture(object.kind.texture).setPosition(0, BALANCE.road.horizonY).setActive(true).setVisible(true)
    this.applyPlacement(object)
  }

  private applyPlacement(object: SceneryObject): void {
    const placement = getSceneryPlacement(
      this.scene.scale.width,
      this.scene.scale.height,
      object.image.y,
      object.side,
      object.kind.baseWidthPx,
      BALANCE.scenery.marginPx,
      BALANCE.scenery.spreadPx,
      object.randomDistance,
    )
    object.image.setDisplaySize(placement.displayWidth, object.kind.baseHeightPx * placement.scale).setX(placement.x)
  }

  private recycle(object: SceneryObject): void {
    object.active = false
    object.image.setActive(false).setVisible(false)
  }

  private nextSpawnIntervalMs(): number {
    return getScenerySpawnIntervalMs(this.rng)
  }
}
