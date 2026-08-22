import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { CityPlanner, type CitySpawnCommand } from './cityPlan'
import { getSceneryPlacement, isSceneryOutsideViewport, type SceneryKind, type ScenerySide } from './sceneryLayout'
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
  private readonly objects: SceneryObject[]
  private readonly planner: CityPlanner
  // Referenz auf das zuletzt gespawnte Gebaeude je Seite: Der Planner misst Querstrassen
  // an dessen Oberkante — Gruenzeug in der Luecke zaehlt bewusst nicht als Fassade.
  private readonly lastBuilding: Record<ScenerySide, SceneryObject | null> = { left: null, right: null }

  public constructor(scene: Phaser.Scene, rng: () => number) {
    this.scene = scene
    this.objects = []
    this.planner = new CityPlanner(sceneryKinds, rng)
    for (let index = 0; index < BALANCE.pools.scenery; index += 1) this.objects.push(this.createObject())
  }

  public update(dt: number): void {
    const commands = this.planner.step(dt, {
      left: this.lastBuildingTopY('left'),
      right: this.lastBuildingTopY('right'),
    })
    for (const command of commands) this.spawn(command)
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

  private spawn(command: CitySpawnCommand): void {
    const object = this.objects.find((candidate) => !candidate.active)
    if (object === undefined) return
    object.active = true
    object.side = command.side
    object.kind = command.kind
    object.randomDistance = command.randomDistance
    object.progress = 0
    object.image.setTexture(object.kind.texture).setPosition(0, BALANCE.road.horizonY).setActive(true).setVisible(true)
    this.applyPlacement(object)
    if (command.kind.category === 'building') this.lastBuilding[command.side] = object
  }

  private lastBuildingTopY(side: ScenerySide): number | null {
    const object = this.lastBuilding[side]
    if (object === null || !object.active) return null
    return object.image.y - object.image.displayHeight
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
}
