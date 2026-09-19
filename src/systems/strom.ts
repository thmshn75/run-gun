import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { getBobOffsetPx, getPhaseOffset, getStepCycleHz } from './gamefeel'
import { getLaneRatio, getLaneSlope, getRoadHalfWidth } from './roadGeometry'
import { getStromFigurenProSek, getStromLaneX } from './stromPlan'

/** Eigener Torlauf-Strom: Figuren ersetzen dort Projektile, ohne WeaponKey oder Shop zu beruehren. */
export class Strom {
  private readonly scene: Phaser.Scene
  private readonly getSalvoPositions: (count: number) => Array<{ x: number; y: number }>
  private readonly getTeamSize: () => number
  private readonly figures: Phaser.Physics.Arcade.Image[] = []
  private readonly group: Phaser.Physics.Arcade.Group
  private accumulatorFigures = 0
  private waveAccumulatorMs = 0
  private elapsedMs = 0
  private lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs
  private nextIndex = 0

  public constructor(scene: Phaser.Scene, getSalvoPositions: (count: number) => Array<{ x: number; y: number }>, getTeamSize: () => number) {
    this.scene = scene
    this.getSalvoPositions = getSalvoPositions
    this.getTeamSize = getTeamSize
    this.group = scene.physics.add.group()
    for (let index = 0; index < BALANCE.pools.strom; index += 1) {
      // Dieselbe Farbe wie die Truppe: Die losgeschickten Figuren SIND die Truppe.
      // Sie bleiben deshalb ungefaerbt, solange die Truppe ungefaerbt ist.
      const figure = scene.physics.add.image(0, 0, 'player').setDepth(BALANCE.layers.gameplay).setScale(BALANCE.render.figureTextureScale * BALANCE.torlauf.crowd.figureScale)
      figure.setData('strom', true)
      figure.setData('hitSpawnIds', new Set<number>())
      figure.setData('phaseOffset', getPhaseOffset(index))
      figure.setActive(false).setVisible(false)
      figure.disableBody(true, true)
      this.group.add(figure)
      this.figures.push(figure)
    }
  }

  public getGroup(): Phaser.Physics.Arcade.Group { return this.group }

  public update(dt: number): void {
    this.elapsedMs += dt
    const rate = getStromFigurenProSek(this.getTeamSize())
    this.accumulatorFigures += rate * dt / 1000
    this.waveAccumulatorMs += dt
    while (this.waveAccumulatorMs >= BALANCE.torlauf.strom.wellenIntervallMs) {
      this.waveAccumulatorMs -= BALANCE.torlauf.strom.wellenIntervallMs
      const count = Math.max(0, Math.round(this.accumulatorFigures))
      this.accumulatorFigures -= count
      const origins = this.getSalvoPositions(count)
      const freeFigures = this.figures.filter((figure) => !figure.active).length
      if (origins.length > freeFigures) this.warnPoolExhausted()
      const waveY = origins[0]?.y
      if (waveY !== undefined) {
        for (const origin of origins.slice(0, freeFigures)) this.spawn(origin.x, waveY, 0, new Set<number>())
      }
    }
    for (const figure of this.figures) {
      if (!figure.active) continue
      // Die Laufhoehe wird GETRENNT von der gezeichneten Hoehe gefuehrt. Frueher stand
      // hier `figure.y`, in dem der Huepf-Versatz des Vorbildes schon steckte - der
      // Versatz wurde damit Bild fuer Bild aufaddiert. Weil die Figuren beim Schritt
      // nach oben ausschlagen, rannten sie mit gemessenen 530 px/s statt der
      // eingestellten 150 (Thomas 2026-09-19: "die ausgeschickten Truppen sind viel zu
      // schnell" - Absenken des Wertes half deshalb kaum).
      const laufY = (figure.getData('laufY') as number) - BALANCE.torlauf.strom.tempoPxPerSec * dt / 1000
      figure.setData('laufY', laufY)
      const x = getStromLaneX(this.scene.scale.width, this.scene.scale.height, laufY, figure.getData('laneOriginX') as number, figure.getData('laneRatio') as number, figure.getData('lateralPx') as number)
      figure.setPosition(x, laufY + getBobOffsetPx(this.elapsedMs, getStepCycleHz(figure.displayHeight / (BALANCE.render.figureTextureScale * BALANCE.torlauf.crowd.figureScale)), figure.getData('phaseOffset') as number, BALANCE.gamefeel.bobAmplitudePx * BALANCE.torlauf.crowd.figureScale))
      ;(figure.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      if (laufY - figure.displayHeight / 2 <= BALANCE.road.horizonY || figure.x < -figure.displayWidth || figure.x > this.scene.scale.width + figure.displayWidth) this.recycle(figure)
    }
  }

  public vervielfache(figure: Phaser.Physics.Arcade.Image, count: number): void {
    const hitSpawnIds = figure.getData('hitSpawnIds') as Set<number>
    for (let copy = 0; copy < count; copy += 1) this.spawn(figure.x + (copy + 1) * BALANCE.torlauf.strom.kopieVersatzPx, figure.y, figure.getData('lateralPx') as number, new Set(hitSpawnIds))
  }

  public recycleFigure(figure: Phaser.Physics.Arcade.Image): void { this.recycle(figure) }

  private spawn(x: number, y: number, lateralPx: number, hitSpawnIds: Set<number>): void {
    const figure = this.nextFree()
    if (figure === undefined) {
      this.warnPoolExhausted()
      return
    }
    const laneRatio = getLaneRatio(this.scene.scale.width, this.scene.scale.height, x, y)
    const laneOriginX = x - laneRatio * getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, y)
    // KEIN clearTint hier: Es loeschte die Faerbung, die der Pool beim Anlegen setzt.
    figure.enableBody(true, x, y, true, true).setActive(true).setVisible(true).setAlpha(1)
    figure.setRotation(Math.atan(-laneRatio * getLaneSlope(this.scene.scale.width, this.scene.scale.height)))
    figure.setData('laufY', y)
    figure.setData('laneRatio', laneRatio)
    figure.setData('laneOriginX', laneOriginX)
    figure.setData('lateralPx', lateralPx)
    figure.setData('hitSpawnIds', hitSpawnIds)
    ;(figure.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
  }

  private nextFree(): Phaser.Physics.Arcade.Image | undefined {
    for (let attempts = 0; attempts < this.figures.length; attempts += 1) {
      const figure = this.figures[this.nextIndex]
      this.nextIndex = (this.nextIndex + 1) % this.figures.length
      if (!figure.active) return figure
    }
    return undefined
  }

  private recycle(figure: Phaser.Physics.Arcade.Image): void {
    figure.disableBody(true, true).setActive(false).setVisible(false)
  }

  private warnPoolExhausted(): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastPoolWarningAtMs < BALANCE.feedback.poolWarningIntervalMs) return
    console.warn('Strom pool exhausted')
    this.lastPoolWarningAtMs = this.elapsedMs
  }
}
