import Phaser from 'phaser'
import enemyHeavyUrl from '../assets/enemy-heavy.png'
import enemyBossUrl from '../assets/enemy-boss.png'
import enemyLightUrl from '../assets/enemy-light.png'
import enemyStandardUrl from '../assets/enemy-standard.png'
// Taumel-Zyklus der Gegner (2026-09-04), nur im Testgelaende benutzt.
import enemyLurch1Url from '../assets/enemy-lurch-1.png'
import enemyLurch2Url from '../assets/enemy-lurch-2.png'
import enemyLurch3Url from '../assets/enemy-lurch-3.png'
import enemyLurch4Url from '../assets/enemy-lurch-4.png'
import enemyLurch5Url from '../assets/enemy-lurch-5.png'
import enemyLurch6Url from '../assets/enemy-lurch-6.png'
import enemyLurch7Url from '../assets/enemy-lurch-7.png'
import enemyLurch8Url from '../assets/enemy-lurch-8.png'
import enemyLurch9Url from '../assets/enemy-lurch-9.png'
import enemyLurch10Url from '../assets/enemy-lurch-10.png'
import enemyLurch11Url from '../assets/enemy-lurch-11.png'
import enemyLurch12Url from '../assets/enemy-lurch-12.png'
// Bewegungsbilder der Bosse (2026-09-04). Zwei Saetze, weil Elite und gewoehnlicher Boss
// bewusst verschieden aussehen.
import bossEliteMove1Url from '../assets/boss-elite-move-1.png'
import bossEliteMove2Url from '../assets/boss-elite-move-2.png'
import bossEliteMove3Url from '../assets/boss-elite-move-3.png'
import bossEliteMove4Url from '../assets/boss-elite-move-4.png'
import bossBasicMove1Url from '../assets/boss-basic-move-1.png'
import bossBasicMove2Url from '../assets/boss-basic-move-2.png'
import bossBasicMove3Url from '../assets/boss-basic-move-3.png'
import bossBasicMove4Url from '../assets/boss-basic-move-4.png'
import enemyLightEUrl from '../assets/enemy-light-e.png'
import enemyLightFUrl from '../assets/enemy-light-f.png'
import enemyLightGUrl from '../assets/enemy-light-g.png'
import enemyLightHUrl from '../assets/enemy-light-h.png'
import enemyLightIUrl from '../assets/enemy-light-i.png'
import enemyLightJUrl from '../assets/enemy-light-j.png'
import enemyStandardEUrl from '../assets/enemy-standard-e.png'
import enemyStandardFUrl from '../assets/enemy-standard-f.png'
import enemyStandardGUrl from '../assets/enemy-standard-g.png'
import enemyStandardHUrl from '../assets/enemy-standard-h.png'
import enemyStandardIUrl from '../assets/enemy-standard-i.png'
import enemyStandardJUrl from '../assets/enemy-standard-j.png'
import enemyHeavyEUrl from '../assets/enemy-heavy-e.png'
import enemyHeavyFUrl from '../assets/enemy-heavy-f.png'
import enemyHeavyGUrl from '../assets/enemy-heavy-g.png'
import enemyHeavyHUrl from '../assets/enemy-heavy-h.png'
import enemyHeavyIUrl from '../assets/enemy-heavy-i.png'
import enemyHeavyJUrl from '../assets/enemy-heavy-j.png'
import enemyBossEliteUrl from '../assets/enemy-boss-elite.png'
import enemyLightBUrl from '../assets/enemy-light-b.png'
import enemyLightCUrl from '../assets/enemy-light-c.png'
import enemyLightDUrl from '../assets/enemy-light-d.png'
import enemyStandardBUrl from '../assets/enemy-standard-b.png'
import enemyStandardCUrl from '../assets/enemy-standard-c.png'
import enemyStandardDUrl from '../assets/enemy-standard-d.png'
import enemyHeavyBUrl from '../assets/enemy-heavy-b.png'
import enemyHeavyCUrl from '../assets/enemy-heavy-c.png'
import enemyHeavyDUrl from '../assets/enemy-heavy-d.png'
import playerUrl from '../assets/player.png'
import sceneryBushUrl from '../assets/scenery-bush.png'
import sceneryConiferUrl from '../assets/scenery-conifer.png'
import sceneryOakUrl from '../assets/scenery-oak.png'
import sceneryStoneUrl from '../assets/scenery-stone.png'
import sceneryTowerAUrl from '../assets/scenery-tower-a.png'
import sceneryTowerBUrl from '../assets/scenery-tower-b.png'
import sceneryTowerCUrl from '../assets/scenery-tower-c.png'
import titleUrl from '../assets/title.png'
import weaponLaserGateUrl from '../assets/weapon-laser-gate.png'
import weaponLaserHudUrl from '../assets/weapon-laser-hud.png'
import weaponMinigunGateUrl from '../assets/weapon-minigun-gate.png'
import weaponMinigunHudUrl from '../assets/weapon-minigun-hud.png'
import weaponPistolGateUrl from '../assets/weapon-pistol-gate.png'
import weaponPistolHudUrl from '../assets/weapon-pistol-hud.png'
import weaponRicochetGateUrl from '../assets/weapon-ricochet-gate.png'
import weaponRicochetHudUrl from '../assets/weapon-ricochet-hud.png'
import weaponClusterGateUrl from '../assets/weapon-cluster-gate.png'
import weaponClusterHudUrl from '../assets/weapon-cluster-hud.png'
import weaponSawbladeGateUrl from '../assets/weapon-sawblade-gate.png'
import weaponSawbladeHudUrl from '../assets/weapon-sawblade-hud.png'
import weaponShockwaveGateUrl from '../assets/weapon-shockwave-gate.png'
import weaponShockwaveHudUrl from '../assets/weapon-shockwave-hud.png'
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
import weaponGrenadeGateUrl from '../assets/weapon-grenade-gate.png'
import weaponGrenadeHudUrl from '../assets/weapon-grenade-hud.png'
import { BALANCE } from '../config/balance'
import { mix, WORLD_COLORS } from '../config/colors'
import { getRoadHalfWidth } from '../systems/road'
import { enableSharpText } from '../systems/textSharpness'

export class BootScene extends Phaser.Scene {
  public constructor() {
    super('BootScene')
  }

  public preload(): void {
    this.load.image('player', playerUrl)
    this.load.image('title', titleUrl)
    this.load.image('enemy-light', enemyLightUrl)
    this.load.image('enemy-standard', enemyStandardUrl)
    this.load.image('enemy-lurch-1', enemyLurch1Url)
    this.load.image('enemy-lurch-2', enemyLurch2Url)
    this.load.image('enemy-lurch-3', enemyLurch3Url)
    this.load.image('enemy-lurch-4', enemyLurch4Url)
    this.load.image('enemy-lurch-5', enemyLurch5Url)
    this.load.image('enemy-lurch-6', enemyLurch6Url)
    this.load.image('enemy-lurch-7', enemyLurch7Url)
    this.load.image('enemy-lurch-8', enemyLurch8Url)
    this.load.image('enemy-lurch-9', enemyLurch9Url)
    this.load.image('enemy-lurch-10', enemyLurch10Url)
    this.load.image('enemy-lurch-11', enemyLurch11Url)
    this.load.image('enemy-lurch-12', enemyLurch12Url)
    this.load.image('boss-elite-move-1', bossEliteMove1Url)
    this.load.image('boss-elite-move-2', bossEliteMove2Url)
    this.load.image('boss-elite-move-3', bossEliteMove3Url)
    this.load.image('boss-elite-move-4', bossEliteMove4Url)
    this.load.image('boss-basic-move-1', bossBasicMove1Url)
    this.load.image('boss-basic-move-2', bossBasicMove2Url)
    this.load.image('boss-basic-move-3', bossBasicMove3Url)
    this.load.image('boss-basic-move-4', bossBasicMove4Url)
    this.load.image('enemy-heavy', enemyHeavyUrl)
    this.load.image('enemy-light-e', enemyLightEUrl)
    this.load.image('enemy-light-f', enemyLightFUrl)
    this.load.image('enemy-light-g', enemyLightGUrl)
    this.load.image('enemy-light-h', enemyLightHUrl)
    this.load.image('enemy-light-i', enemyLightIUrl)
    this.load.image('enemy-light-j', enemyLightJUrl)
    this.load.image('enemy-standard-e', enemyStandardEUrl)
    this.load.image('enemy-standard-f', enemyStandardFUrl)
    this.load.image('enemy-standard-g', enemyStandardGUrl)
    this.load.image('enemy-standard-h', enemyStandardHUrl)
    this.load.image('enemy-standard-i', enemyStandardIUrl)
    this.load.image('enemy-standard-j', enemyStandardJUrl)
    this.load.image('enemy-heavy-e', enemyHeavyEUrl)
    this.load.image('enemy-heavy-f', enemyHeavyFUrl)
    this.load.image('enemy-heavy-g', enemyHeavyGUrl)
    this.load.image('enemy-heavy-h', enemyHeavyHUrl)
    this.load.image('enemy-heavy-i', enemyHeavyIUrl)
    this.load.image('enemy-heavy-j', enemyHeavyJUrl)
    this.load.image('enemy-boss-elite', enemyBossEliteUrl)
    this.load.image('enemy-light-b', enemyLightBUrl)
    this.load.image('enemy-light-c', enemyLightCUrl)
    this.load.image('enemy-light-d', enemyLightDUrl)
    this.load.image('enemy-standard-b', enemyStandardBUrl)
    this.load.image('enemy-standard-c', enemyStandardCUrl)
    this.load.image('enemy-standard-d', enemyStandardDUrl)
    this.load.image('enemy-heavy-b', enemyHeavyBUrl)
    this.load.image('enemy-heavy-c', enemyHeavyCUrl)
    this.load.image('enemy-heavy-d', enemyHeavyDUrl)
    this.load.image('enemy-boss', enemyBossUrl)
    this.load.image('scenery-oak', sceneryOakUrl)
    this.load.image('scenery-conifer', sceneryConiferUrl)
    this.load.image('scenery-bush', sceneryBushUrl)
    this.load.image('scenery-stone', sceneryStoneUrl)
    this.load.image('scenery-tower-a', sceneryTowerAUrl)
    this.load.image('scenery-tower-b', sceneryTowerBUrl)
    this.load.image('scenery-tower-c', sceneryTowerCUrl)
    this.load.image('weapon-pistol-gate', weaponPistolGateUrl)
    this.load.image('weapon-pistol-hud', weaponPistolHudUrl)
    this.load.image('weapon-ricochet-gate', weaponRicochetGateUrl)
    this.load.image('weapon-ricochet-hud', weaponRicochetHudUrl)
    this.load.image('weapon-cluster-gate', weaponClusterGateUrl)
    this.load.image('weapon-cluster-hud', weaponClusterHudUrl)
    this.load.image('weapon-sawblade-gate', weaponSawbladeGateUrl)
    this.load.image('weapon-sawblade-hud', weaponSawbladeHudUrl)
    this.load.image('weapon-shockwave-gate', weaponShockwaveGateUrl)
    this.load.image('weapon-shockwave-hud', weaponShockwaveHudUrl)
    this.load.image('weapon-normal-gate', weaponNormalGateUrl)
    this.load.image('weapon-shotgun-gate', weaponShotgunGateUrl)
    this.load.image('weapon-laser-gate', weaponLaserGateUrl)
    this.load.image('weapon-rocket-gate', weaponRocketGateUrl)
    this.load.image('weapon-minigun-gate', weaponMinigunGateUrl)
    this.load.image('weapon-flamethrower-gate', weaponFlamethrowerGateUrl)
    this.load.image('weapon-chainlightning-gate', weaponChainlightningGateUrl)
    this.load.image('weapon-grenade-gate', weaponGrenadeGateUrl)
    this.load.image('weapon-normal-hud', weaponNormalHudUrl)
    this.load.image('weapon-shotgun-hud', weaponShotgunHudUrl)
    this.load.image('weapon-laser-hud', weaponLaserHudUrl)
    this.load.image('weapon-rocket-hud', weaponRocketHudUrl)
    this.load.image('weapon-minigun-hud', weaponMinigunHudUrl)
    this.load.image('weapon-flamethrower-hud', weaponFlamethrowerHudUrl)
    this.load.image('weapon-chainlightning-hud', weaponChainlightningHudUrl)
    this.load.image('weapon-grenade-hud', weaponGrenadeHudUrl)
  }

  public create(): void {
    enableSharpText(this)
    this.createProjectileTextures()
    this.createBackgroundTextures()
    this.createRoadTextures()
    this.createCoinTexture()
    this.createWallTexture()
    this.createShadowTexture()

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

    // Wasser fuer das Weltthema "bruecke": dunkel im Vordergrund, zum Horizont heller.
    // Gestapelte Streifen statt Verlauf - fillGradientStyle wirkt nur im WebGL-Pfad und
    // wird von generateTexture stillschweigend auf die erste Farbe reduziert
    // (Lesson 2026-08-20).
    graphics.clear()
    const wasserHoehe = this.scale.height - horizonY
    for (let y = 0; y < wasserHoehe; y += 1) {
      const progress = y / Math.max(1, wasserHoehe - 1)
      graphics.fillStyle(mix(WORLD_COLORS.waterFar, WORLD_COLORS.waterNear, progress))
      graphics.fillRect(0, y, width, 1)
    }
    graphics.generateTexture('ground-water', width, wasserHoehe)

    // Wellenkamm und Wellental. Beide laufen zu den Enden hin WEICH aus - das ist der
    // groesste Unterschied zwischen "Wasser" und "Striche auf blauem Grund": Ein hartes
    // Rechteck liest sich als Kratzer, eine an den Enden verschwindende Linie als
    // Kraeuselung (2026-09-04, Thomas: "sieh zu ob du das wasser noch realistischer
    // hinbekommst").
    //
    // Der Verlauf entsteht aus gestapelten Rechtecken mit fallender Deckkraft, nicht aus
    // fillGradientStyle - das wirkt nur im WebGL-Pfad und wird von generateTexture
    // stillschweigend auf die erste Farbe reduziert (Lesson 2026-08-20). Dieselbe
    // Bauweise wie bei der Schattentextur.
    const welle = (key: string, farbe: number, maxAlpha: number): void => {
      graphics.clear()
      const breite = 32
      const hoehe = 4
      const stufen = 8
      for (let stufe = 0; stufe < stufen; stufe += 1) {
        // Von aussen nach innen: jede Stufe ist schmaler und deckender.
        const anteil = (stufe + 1) / stufen
        const x = (breite / 2) * (1 - anteil)
        graphics.fillStyle(farbe, (maxAlpha * anteil) / stufen * 2)
        graphics.fillRect(x, 0, breite * anteil, hoehe)
      }
      graphics.generateTexture(key, breite, hoehe)
    }
    welle('water-wave', WORLD_COLORS.waveCrest, 1)
    welle('water-trough', WORLD_COLORS.waveTrough, 1)
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
    // Heller Tracer statt Dunkelgrau: Die schnellen Minigun-Kugeln waren vor der dunklen
    // Strasse kaum zu sehen (Thomas-Befund 2026-08-22, V2-Plan W1).
    graphics.fillStyle(0xffd43b)
    graphics.fillRect(0, 0, 3, 12)
    graphics.fillStyle(0xfffbe6)
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
    // Granate: gedrungener Koerper mit Zuender - deutlich anders als die schlanke Rakete,
    // damit man im Flug sieht, was unterwegs ist.
    graphics.fillStyle(0x6b7d3a)
    graphics.fillRect(0, 3, 10, 11)
    graphics.fillStyle(0x8fa64d)
    graphics.fillRect(1, 4, 8, 5)
    graphics.fillStyle(0x3a3a2a)
    graphics.fillRect(3, 0, 4, 3)
    graphics.generateTexture('projectile-grenade', 10, 14)
    graphics.clear()
    // ---- Die fuenf Geschosse von 2026-08-24 ----
    // Jedes muss sich im Flug von den anderen unterscheiden lassen, nicht nur im Tor.
    // Nur fillRect/fillCircle/fillTriangle - Verlaeufe wirken unter generateTexture
    // nicht (Canvas-Pfad, siehe docs/lessons.md 2026-08-20).

    // Pistole: wie die Gewehrkugel, aber kleiner und blasser - die schwaechste Waffe
    // soll auch im Flug bescheiden aussehen.
    graphics.fillStyle(0xc9a227)
    graphics.fillRect(0, 0, 4, 10)
    graphics.fillStyle(0xffe9a8)
    graphics.fillRect(1, 1, 2, 6)
    graphics.generateTexture('projectile-pistol', 4, 10)
    graphics.clear()
    // Prellschuss: kraeftiges Blau wie sein Torbild, laenglich und hell - sie fliegt am
    // schnellsten und muss trotzdem sichtbar bleiben.
    graphics.fillStyle(0x1f6feb)
    graphics.fillRect(0, 0, 4, 16)
    graphics.fillStyle(0xa5d8ff)
    graphics.fillRect(1, 1, 2, 11)
    graphics.generateTexture('projectile-ricochet', 4, 16)
    graphics.clear()
    // Streubombe: gedrungener goldener Koerper - im Flug als das erkennbar, was sich
    // gleich teilt.
    graphics.fillStyle(0xb8860b)
    graphics.fillCircle(6, 6, 6)
    graphics.fillStyle(0xffd97d)
    graphics.fillCircle(6, 6, 3)
    graphics.generateTexture('projectile-cluster', 12, 12)
    graphics.clear()
    // Saegeblatt: runde Scheibe mit Zaehnen. Das groesste Geschoss im Spiel und das
    // einzige, das nicht laenglich ist - es muss auf den ersten Blick anders aussehen,
    // weil es sich auch voellig anders verhaelt.
    graphics.fillStyle(0x9a6b3f)
    graphics.fillCircle(9, 9, 9)
    graphics.fillStyle(0xd9d9d9)
    graphics.fillCircle(9, 9, 7)
    graphics.fillStyle(0x9a6b3f)
    graphics.fillCircle(9, 9, 3)
    graphics.generateTexture('projectile-sawblade', 18, 18)
    graphics.clear()
    // Schockwelle: heller Ring statt Koerper - sie wirkt rundum, und das soll man dem
    // Geschoss ansehen.
    graphics.fillStyle(0xff5fd2)
    graphics.fillCircle(8, 8, 8)
    graphics.fillStyle(0xffe3f7)
    graphics.fillCircle(8, 8, 4)
    graphics.generateTexture('projectile-shockwave', 16, 16)
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
    graphics.destroy()
  }

  /**
   * Weicher Bodenschatten als gestaffelte Ellipsen. Ein echter Verlauf geht hier
   * NICHT: fillGradientStyle wirkt nur im WebGL-Pfad und wird von generateTexture
   * stillschweigend auf die erste Farbe reduziert (Lesson 2026-08-20). Sechs Ringe
   * mit fallender Deckkraft ergeben denselben weichen Rand auf beiden Pfaden.
   */
  private createShadowTexture(): void {
    const size = BALANCE.shadow.textureWidthPx
    const rings = BALANCE.shadow.textureRings
    const graphics = this.add.graphics()
    for (let ring = rings; ring >= 1; ring -= 1) {
      const radius = (size / 2) * (ring / rings)
      // Aussen fast durchsichtig, innen voll: quadratisch, damit der Kern kompakt
      // bleibt und nur der Saum ausfranst.
      const alpha = (1 - (ring - 1) / rings) ** 2
      graphics.fillStyle(0x000000, alpha)
      graphics.fillEllipse(size / 2, size / 2, radius * 2, radius * 2)
    }
    graphics.generateTexture('figure-shadow', size, size)
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


  private createCoinTexture(): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(WORLD_COLORS.coinRim)
    graphics.fillCircle(7, 7, 7)
    graphics.fillStyle(WORLD_COLORS.coinBody)
    graphics.fillCircle(7, 7, 5)
    graphics.generateTexture('coin', 14, 14)
    graphics.destroy()
  }

  // Wandsegment (W2): abgerundete Ecken und halbtransparente Fuellung stecken in der
  // Textur; die Wand skaliert sie nur noch auf die perspektivische Breite.
  /**
   * Zwei Wandtexturen statt einer: Die linke Sammelbahn und die rechte Wand sollen
   * auf einen Blick auseinandergehen (Thomas 2026-08-22, zwei Blautoene).
   */
  private createWallTexture(): void {
    const seiten = [
      { key: 'wall-segment-left', fill: WORLD_COLORS.wallLeftFill, stroke: WORLD_COLORS.wallLeftStroke },
      { key: 'wall-segment-right', fill: WORLD_COLORS.wallRightFill, stroke: WORLD_COLORS.wallRightStroke },
      // Dritte Textur fuer die roten Kacheln, die auf beiden Seiten abziehen statt zu geben.
      { key: 'wall-segment-bad', fill: WORLD_COLORS.wallBadFill, stroke: WORLD_COLORS.wallBadStroke },
    ] as const
    const hoehe = BALANCE.walls.segmentHeightPx
    const block = BALANCE.walls.block
    const deckel = Math.round(hoehe * block.topFaceShare)
    const sockel = Math.round(hoehe * block.baseShare)
    for (const seite of seiten) {
      const graphics = this.add.graphics()
      // 1. Koerper mit vertikalem Verlauf. fillGradientStyle scheidet aus (wirkt nur im
      //    WebGL-Pfad, nicht in generateTexture) - deshalb gestapelte Streifen.
      for (let y = deckel; y < hoehe; y += 1) {
        const t = (y - deckel) / Math.max(1, hoehe - deckel - 1)
        graphics.fillStyle(mix(seite.fill, 0x000000, t * block.bodyDarkenAtBottom), BALANCE.walls.fillAlpha)
        graphics.fillRect(0, y, 128, 1)
      }
      // 2. Deckflaeche: die Oberseite des Quaders, von oben beleuchtet. Sie macht aus
      //    dem Aufkleber einen Koerper - ohne sie bleibt jede Kachel ein Rechteck.
      graphics.fillStyle(mix(seite.fill, 0xffffff, block.topFaceLighten), 1)
      graphics.fillRoundedRect(0, 0, 128, deckel + block.cornerRadius, block.cornerRadius)
      graphics.fillRect(0, deckel, 128, 2)
      // 3. Vordere Oberkante als heller Grat, damit Deckflaeche und Front sich trennen.
      graphics.fillStyle(mix(seite.fill, 0xffffff, block.edgeLighten), 1)
      graphics.fillRect(0, deckel, 128, 1)
      // 4. Sockel: Schattenfuss, auf dem der Block steht.
      graphics.fillStyle(mix(seite.fill, 0x000000, block.baseDarken), 1)
      graphics.fillRect(0, hoehe - sockel, 128, sockel)
      // 5. Seitenkanten: links Licht, rechts Schatten - eine Lichtquelle fuer alle
      //    Kacheln, sonst kippt die Tiefenwirkung von Segment zu Segment.
      graphics.fillStyle(mix(seite.fill, 0xffffff, block.edgeLighten), 1)
      graphics.fillRect(0, deckel, block.sideEdgePx, hoehe - deckel - sockel)
      graphics.fillStyle(mix(seite.fill, 0x000000, block.sideDarken), 1)
      graphics.fillRect(128 - block.sideEdgePx, deckel, block.sideEdgePx, hoehe - deckel - sockel)
      // 6. Rahmen zuletzt, damit er ueber allen Flaechen liegt.
      graphics.lineStyle(3, seite.stroke, 1)
      graphics.strokeRoundedRect(1.5, 1.5, 125, hoehe - 3, block.cornerRadius)
      graphics.generateTexture(seite.key, 128, hoehe)
      graphics.destroy()
    }
  }
}
