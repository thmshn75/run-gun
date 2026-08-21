import Phaser from 'phaser'
import enemyHeavyUrl from '../assets/enemy-heavy.png'
import enemyBossUrl from '../assets/enemy-boss.png'
import enemyLightUrl from '../assets/enemy-light.png'
import enemyStandardUrl from '../assets/enemy-standard.png'
import playerUrl from '../assets/player.png'
import sceneryBushUrl from '../assets/scenery-bush.png'
import sceneryCottageUrl from '../assets/scenery-cottage.png'
import sceneryConiferUrl from '../assets/scenery-conifer.png'
import sceneryOakUrl from '../assets/scenery-oak.png'
import sceneryStoneUrl from '../assets/scenery-stone.png'
import titleUrl from '../assets/title.png'
import weaponLaserGateUrl from '../assets/weapon-laser-gate.png'
import weaponLaserHudUrl from '../assets/weapon-laser-hud.png'
import weaponMinigunGateUrl from '../assets/weapon-minigun-gate.png'
import weaponMinigunHudUrl from '../assets/weapon-minigun-hud.png'
import weaponNormalGateUrl from '../assets/weapon-normal-gate.png'
import weaponNormalHudUrl from '../assets/weapon-normal-hud.png'
import weaponRocketGateUrl from '../assets/weapon-rocket-gate.png'
import weaponRocketHudUrl from '../assets/weapon-rocket-hud.png'
import weaponFlamethrowerGateUrl from '../assets/weapon-flamethrower-gate.png'
import weaponFlamethrowerHudUrl from '../assets/weapon-flamethrower-hud.png'
import weaponChainlightningGateUrl from '../assets/weapon-chainlightning-gate.png'
import weaponChainlightningHudUrl from '../assets/weapon-chainlightning-hud.png'
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
    this.load.image('title', titleUrl)
    this.load.image('enemy-light', enemyLightUrl)
    this.load.image('enemy-standard', enemyStandardUrl)
    this.load.image('enemy-heavy', enemyHeavyUrl)
    this.load.image('enemy-boss', enemyBossUrl)
    this.load.image('scenery-oak', sceneryOakUrl)
    this.load.image('scenery-conifer', sceneryConiferUrl)
    this.load.image('scenery-bush', sceneryBushUrl)
    this.load.image('scenery-stone', sceneryStoneUrl)
    this.load.image('scenery-cottage', sceneryCottageUrl)
    this.load.image('weapon-normal-gate', weaponNormalGateUrl)
    this.load.image('weapon-shotgun-gate', weaponShotgunGateUrl)
    this.load.image('weapon-laser-gate', weaponLaserGateUrl)
    this.load.image('weapon-rocket-gate', weaponRocketGateUrl)
    this.load.image('weapon-minigun-gate', weaponMinigunGateUrl)
    this.load.image('weapon-flamethrower-gate', weaponFlamethrowerGateUrl)
    this.load.image('weapon-chainlightning-gate', weaponChainlightningGateUrl)
    this.load.image('weapon-normal-hud', weaponNormalHudUrl)
    this.load.image('weapon-shotgun-hud', weaponShotgunHudUrl)
    this.load.image('weapon-laser-hud', weaponLaserHudUrl)
    this.load.image('weapon-rocket-hud', weaponRocketHudUrl)
    this.load.image('weapon-minigun-hud', weaponMinigunHudUrl)
    this.load.image('weapon-flamethrower-hud', weaponFlamethrowerHudUrl)
    this.load.image('weapon-chainlightning-hud', weaponChainlightningHudUrl)
  }

  public create(): void {
    this.createProjectileTextures()
    this.createBackgroundTextures()
    this.createRoadTextures()
    this.createGateTexture()
    this.createCoinTexture()

    this.scene.start('TitleScene')
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
    graphics.fillStyle(0x5d6068)
    graphics.fillRect(0, 0, 3, 12)
    graphics.fillStyle(0xffa33a)
    graphics.fillRect(1, 0, 1, 8)
    graphics.generateTexture('projectile-minigun', 3, 12)
    graphics.clear()
    graphics.fillStyle(0xff6400)
    graphics.fillCircle(5, 5, 5)
    graphics.fillStyle(0xffe06a)
    graphics.fillCircle(5, 5, 3)
    graphics.generateTexture('projectile-flamethrower', 10, 10)
    graphics.clear()
    graphics.fillStyle(0x9cf7ff)
    graphics.fillRect(0, 0, 4, 15)
    graphics.fillStyle(0xffffff)
    graphics.fillRect(1, 1, 2, 10)
    graphics.generateTexture('projectile-chainlightning', 4, 15)
    graphics.clear()
    graphics.fillStyle(WORLD_COLORS.splashFlash)
    graphics.fillCircle(16, 16, 16)
    graphics.generateTexture('splash-flash', 32, 32)
    graphics.clear()
    graphics.fillStyle(0x8cf5ff)
    graphics.fillCircle(12, 12, 12)
    graphics.fillStyle(0xffffff)
    graphics.fillCircle(12, 12, 5)
    graphics.generateTexture('chain-flash', 24, 24)
    graphics.clear()
    graphics.fillStyle(WORLD_COLORS.bossProjectileShell)
    graphics.fillRect(0, 0, 8, 16)
    graphics.fillStyle(WORLD_COLORS.bossProjectileCore)
    graphics.fillRect(2, 1, 4, 10)
    graphics.generateTexture('projectile-boss', 8, 16)
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
