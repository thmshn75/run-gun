import Phaser from 'phaser'
import enemyHeavyUrl from '../assets/enemy-heavy.png'
import enemyLightUrl from '../assets/enemy-light.png'
import enemyStandardUrl from '../assets/enemy-standard.png'
import playerUrl from '../assets/player.png'
import weaponLaserGateUrl from '../assets/weapon-laser-gate.png'
import weaponLaserHudUrl from '../assets/weapon-laser-hud.png'
import weaponNormalGateUrl from '../assets/weapon-normal-gate.png'
import weaponNormalHudUrl from '../assets/weapon-normal-hud.png'
import weaponRocketGateUrl from '../assets/weapon-rocket-gate.png'
import weaponRocketHudUrl from '../assets/weapon-rocket-hud.png'
import weaponShotgunGateUrl from '../assets/weapon-shotgun-gate.png'
import weaponShotgunHudUrl from '../assets/weapon-shotgun-hud.png'
import { BALANCE } from '../config/balance'
import { mix, WORLD_COLORS } from '../config/colors'
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
    this.load.image('weapon-normal-gate', weaponNormalGateUrl)
    this.load.image('weapon-shotgun-gate', weaponShotgunGateUrl)
    this.load.image('weapon-laser-gate', weaponLaserGateUrl)
    this.load.image('weapon-rocket-gate', weaponRocketGateUrl)
    this.load.image('weapon-normal-hud', weaponNormalHudUrl)
    this.load.image('weapon-shotgun-hud', weaponShotgunHudUrl)
    this.load.image('weapon-laser-hud', weaponLaserHudUrl)
    this.load.image('weapon-rocket-hud', weaponRocketHudUrl)
  }

  public create(): void {
    this.createProjectileTextures()
    this.createBackgroundTextures()
    this.createRoadTextures()
    this.createGateTexture()
    this.createCoinTexture()

    this.scene.start('GameScene')
  }

  private createBackgroundTextures(): void {
    const width = this.scale.width
    const horizonY = BALANCE.road.horizonY
    const graphics = this.add.graphics()
    for (let y = 0; y < horizonY; y += 1) {
      const progress = y / (horizonY - 1)
      graphics.fillStyle(mix(WORLD_COLORS.skyTop, WORLD_COLORS.skyHorizon, progress))
      graphics.fillRect(0, y, width, 1)
    }
    graphics.generateTexture('sky', width, horizonY)
    graphics.clear()
    graphics.fillStyle(WORLD_COLORS.ground)
    graphics.fillRect(0, 0, width, this.scale.height - horizonY)
    graphics.generateTexture('ground', width, this.scale.height - horizonY)
    graphics.destroy()
  }

  private createProjectileTextures(): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(WORLD_COLORS.projectileShell)
    graphics.fillRect(0, 0, 6, 14)
    graphics.fillStyle(WORLD_COLORS.projectileCore)
    graphics.fillRect(1, 1, 4, 9)
    graphics.generateTexture('projectile-normal', 6, 14)
    graphics.clear()
    graphics.fillStyle(WORLD_COLORS.shotgunShell)
    graphics.fillRect(0, 0, 4, 6)
    graphics.fillStyle(WORLD_COLORS.shotgunCore)
    graphics.fillRect(1, 1, 2, 3)
    graphics.generateTexture('projectile-shotgun', 4, 6)
    graphics.clear()
    graphics.fillStyle(WORLD_COLORS.laser)
    graphics.fillRect(0, 0, 3, 20)
    graphics.generateTexture('projectile-laser', 3, 20)
    graphics.clear()
    graphics.fillStyle(WORLD_COLORS.rocketBody)
    graphics.fillRect(0, 3, 8, 13)
    graphics.fillStyle(WORLD_COLORS.rocketNose)
    graphics.fillTriangle(0, 3, 8, 3, 4, 0)
    graphics.generateTexture('projectile-rocket', 8, 16)
    graphics.clear()
    graphics.fillStyle(WORLD_COLORS.splashFlash)
    graphics.fillCircle(16, 16, 16)
    graphics.generateTexture('splash-flash', 32, 32)
    graphics.destroy()
  }

  private createRoadTextures(): void {
    const width = this.scale.width
    const height = this.scale.height
    const centerX = width / 2
    const horizonY = BALANCE.road.horizonY
    const topHalfWidth = getRoadHalfWidth(width, height, horizonY)
    const bottomHalfWidth = getRoadHalfWidth(width, height, height)
    const graphics = this.add.graphics()
    graphics.fillStyle(WORLD_COLORS.road)
    graphics.beginPath()
    graphics.moveTo(centerX - topHalfWidth, horizonY)
    graphics.lineTo(centerX + topHalfWidth, horizonY)
    graphics.lineTo(centerX + bottomHalfWidth, height)
    graphics.lineTo(centerX - bottomHalfWidth, height)
    graphics.closePath()
    graphics.fillPath()
    graphics.lineStyle(BALANCE.road.edgeLineWidth, WORLD_COLORS.roadEdge)
    graphics.lineBetween(centerX - topHalfWidth, horizonY, centerX - bottomHalfWidth, height)
    graphics.lineBetween(centerX + topHalfWidth, horizonY, centerX + bottomHalfWidth, height)
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
