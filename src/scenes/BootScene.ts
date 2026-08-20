import Phaser from 'phaser'
import enemyHeavyUrl from '../assets/enemy-heavy.png'
import enemyLightUrl from '../assets/enemy-light.png'
import enemyStandardUrl from '../assets/enemy-standard.png'
import playerUrl from '../assets/player.png'
import { BALANCE } from '../config/balance'
import { WORLD_COLORS } from '../config/colors'
import { getRoadHalfWidth } from '../systems/road'

export class BootScene extends Phaser.Scene {
  public constructor() {
    super('BootScene')
  }

  public preload(): void {
    this.load.image('player', playerUrl)
    this.load.image('enemy-light', enemyLightUrl)
    this.load.image('enemy-standard', enemyStandardUrl)
    this.load.image('enemy-heavy', enemyHeavyUrl)
  }

  public create(): void {
    this.createProjectileTexture()
    this.createRoadTextures()
    this.createGateTexture()
    this.createCoinTexture()

    this.scene.start('GameScene')
  }

  private createProjectileTexture(): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(WORLD_COLORS.projectileShell)
    graphics.fillRect(0, 0, 6, 14)
    graphics.fillStyle(WORLD_COLORS.projectileCore)
    graphics.fillRect(1, 1, 4, 9)
    graphics.generateTexture('projectile', 6, 14)
    graphics.destroy()
  }

  private createRoadTextures(): void {
    const width = this.scale.width
    const height = this.scale.height
    const centerX = width / 2
    const topHalfWidth = getRoadHalfWidth(width, height, 0)
    const bottomHalfWidth = getRoadHalfWidth(width, height, height)
    const graphics = this.add.graphics()
    graphics.fillStyle(WORLD_COLORS.road)
    graphics.beginPath()
    graphics.moveTo(centerX - topHalfWidth, 0)
    graphics.lineTo(centerX + topHalfWidth, 0)
    graphics.lineTo(centerX + bottomHalfWidth, height)
    graphics.lineTo(centerX - bottomHalfWidth, height)
    graphics.closePath()
    graphics.fillPath()
    graphics.lineStyle(BALANCE.road.edgeLineWidth, WORLD_COLORS.roadEdge)
    graphics.lineBetween(centerX - topHalfWidth, 0, centerX - bottomHalfWidth, height)
    graphics.lineBetween(centerX + topHalfWidth, 0, centerX + bottomHalfWidth, height)
    graphics.generateTexture('road', width, height)
    graphics.clear()
    graphics.fillStyle(WORLD_COLORS.roadCenterLine)
    graphics.fillRect(0, 0, BALANCE.road.centerLine.textureSizePx, BALANCE.road.centerLine.textureSizePx)
    graphics.generateTexture('road-center-line', BALANCE.road.centerLine.textureSizePx, BALANCE.road.centerLine.textureSizePx)
    graphics.destroy()
  }

  private createGateTexture(): void {
    const width = (this.scale.width - BALANCE.gates.gapBetween) / 2
    const graphics = this.add.graphics()
    graphics.fillStyle(WORLD_COLORS.gateBase, 0.2)
    graphics.fillRect(0, 0, width, BALANCE.gates.gateHeight)
    graphics.lineStyle(4, WORLD_COLORS.gateBase, 1)
    graphics.strokeRect(2, 2, width - 4, BALANCE.gates.gateHeight - 4)
    graphics.generateTexture('gate', width, BALANCE.gates.gateHeight)
    graphics.destroy()
  }

  private createCoinTexture(): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(WORLD_COLORS.coinRim)
    graphics.fillCircle(7, 7, 7)
    graphics.fillStyle(WORLD_COLORS.coinBody)
    graphics.fillCircle(7, 7, 5)
    graphics.generateTexture('coin', 14, 14)
    graphics.destroy()
  }
}
