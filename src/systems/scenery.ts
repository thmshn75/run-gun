import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { getSceneryPlacement, type ScenerySide } from './sceneryLayout'

type SceneryKind = Readonly<{
  texture: string
  baseHeightPx: number
}>

type SceneryObject = {
  readonly image: Phaser.GameObjects.Image
  active: boolean
  side: ScenerySide
  kind: SceneryKind
  randomDistance: number
}

const sceneryKinds: readonly SceneryKind[] = [
  { texture: 'scenery-oak', baseHeightPx: 54 },
  { texture: 'scenery-conifer', baseHeightPx: 58 },
  { texture: 'scenery-bush', baseHeightPx: 28 },
  { texture: 'scenery-stone', baseHeightPx: 22 },
  { texture: 'scenery-cottage', baseHeightPx: 36 },
]

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
    for (const object of this.objects) {
      if (!object.active) continue
      object.image.y += (BALANCE.scrollSpeed * dt) / 1000
      this.applyPlacement(object)
      const halfWidth = object.image.displayWidth / 2
      if (object.image.y - object.image.displayHeight > this.scene.scale.height
        || object.image.x + halfWidth < 0 || object.image.x - halfWidth > this.scene.scale.width) this.recycle(object)
    }
  }

  private createObject(): SceneryObject {
    const image = this.scene.add.image(0, 0, 'scenery-oak')
      .setOrigin(0.5, 1)
      .setDepth(BALANCE.layers.scenery)
      .setActive(false)
      .setVisible(false)
    return { image, active: false, side: 'left', kind: sceneryKinds[0], randomDistance: 0 }
  }

  private spawn(side: ScenerySide): void {
    const object = this.objects.find((candidate) => !candidate.active)
    if (object === undefined) return
    object.active = true
    object.side = side
    object.kind = sceneryKinds[Math.floor(this.rng() * sceneryKinds.length)]
    object.randomDistance = this.rng()
    object.image.setTexture(object.kind.texture).setPosition(0, BALANCE.road.horizonY).setActive(true).setVisible(true)
    this.applyPlacement(object)
  }

  private applyPlacement(object: SceneryObject): void {
    const baseWidthPx = object.image.width * object.kind.baseHeightPx / object.image.height
    const placement = getSceneryPlacement(
      this.scene.scale.width,
      this.scene.scale.height,
      object.image.y,
      object.side,
      baseWidthPx,
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
    return BALANCE.scenery.spawnIntervalMs * (0.75 + this.rng() * 0.5)
  }
}
