import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import type { RunStats } from './upgrades'

export type WeaponKey = 'normal' | 'shotgun' | 'laser' | 'rocket'

export const WEAPON_LABELS: Record<WeaponKey, string> = {
  normal: 'NORMAL',
  shotgun: 'SCHROT',
  laser: 'LASER',
  rocket: 'RAKETE',
}

const WEAPON_KEYS: readonly WeaponKey[] = ['normal', 'shotgun', 'laser', 'rocket']

interface ProjectileSegment {
  start: number
  end: number
  nextIndex: number
}

export class Weapons {
  private readonly scene: Phaser.Scene
  private readonly projectiles: Phaser.Physics.Arcade.Group
  private readonly projectileList: Phaser.Physics.Arcade.Image[]
  private readonly segments: Record<WeaponKey, ProjectileSegment>
  private readonly getSalvoPositions: (maxPerSalvo: number) => Array<{ x: number; y: number }>
  private readonly runStats: RunStats
  private fireAccumulatorMs: number
  private lastPoolWarningAtMs: number
  private elapsedMs: number
  private activeWeapon: WeaponKey

  public constructor(
    scene: Phaser.Scene,
    getSalvoPositions: (maxPerSalvo: number) => Array<{ x: number; y: number }>,
    runStats: RunStats,
  ) {
    this.scene = scene
    this.getSalvoPositions = getSalvoPositions
    this.runStats = runStats
    this.projectiles = scene.physics.add.group()
    this.projectileList = []
    this.segments = {
      normal: { start: 0, end: 0, nextIndex: 0 },
      shotgun: { start: 0, end: 0, nextIndex: 0 },
      laser: { start: 0, end: 0, nextIndex: 0 },
      rocket: { start: 0, end: 0, nextIndex: 0 },
    }
    this.fireAccumulatorMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs
    this.elapsedMs = 0
    this.activeWeapon = 'normal'

    for (const key of WEAPON_KEYS) {
      const segment = this.segments[key]
      segment.start = this.projectileList.length
      for (let index = 0; index < BALANCE.pools.projectiles[key]; index += 1) {
        const projectile = scene.physics.add.image(0, 0, `projectile-${key}`).setDepth(BALANCE.layers.gameplay)
        projectile.setData('weapon', key)
        if (key === 'laser') projectile.setData('hitSpawnIds', new Set<number>())
        projectile.setActive(false).setVisible(false)
        projectile.disableBody(true, true)
        this.projectiles.add(projectile)
        this.projectileList.push(projectile)
      }
      segment.end = this.projectileList.length
      segment.nextIndex = segment.start
    }
  }

  public getProjectiles(): Phaser.Physics.Arcade.Group {
    return this.projectiles
  }

  public getWeapon(): WeaponKey {
    return this.activeWeapon
  }

  public setWeapon(weapon: WeaponKey): void {
    this.activeWeapon = weapon
  }

  public getWeaponConfig(weapon: WeaponKey): (typeof BALANCE.weapon)[WeaponKey] {
    return BALANCE.weapon[weapon]
  }

  public recycle(projectile: Phaser.Physics.Arcade.Image): void {
    projectile.disableBody(true, true)
    projectile.setActive(false).setVisible(false)
  }

  public update(dt: number): void {
    this.elapsedMs += dt
    this.fireAccumulatorMs += dt
    const weapon = this.getWeaponConfig(this.activeWeapon)
    const salvoIntervalMs = 1000 / (this.runStats.get('shotsPerSec') * weapon.rateFactor)
    while (this.fireAccumulatorMs >= salvoIntervalMs) {
      this.fireAccumulatorMs -= salvoIntervalMs
      this.fire()
    }

    const seconds = dt / 1000
    for (const projectile of this.projectileList) {
      if (!projectile.active) continue
      const vx = projectile.getData('vx') as number
      const vy = projectile.getData('vy') as number
      projectile.x += vx * seconds
      projectile.y += vy * seconds
      projectile.setData('travelledPx', (projectile.getData('travelledPx') as number) + Math.sqrt(vx * vx + vy * vy) * seconds)
      ;(projectile.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      const config = this.getWeaponConfig(projectile.getData('weapon') as WeaponKey)
      const leftOrRight = projectile.x + projectile.displayWidth / 2 < 0 || projectile.x - projectile.displayWidth / 2 > this.scene.scale.width
      const aboveScreen = projectile.y + projectile.displayHeight / 2 < 0
      const outOfRange = config.rangePx > 0 && (projectile.getData('travelledPx') as number) >= config.rangePx
      if (leftOrRight || aboveScreen || outOfRange) this.recycle(projectile)
    }
  }

  private fire(): void {
    const weaponKey = this.activeWeapon
    const weapon = this.getWeaponConfig(weaponKey)
    const origins = this.getSalvoPositions(weapon.shootersPerSalvo)
    let exhausted = false
    for (let shooterIndex = 0; shooterIndex < origins.length; shooterIndex += 1) {
      const origin = origins[shooterIndex]
      for (let bulletIndex = 0; bulletIndex < weapon.bulletsPerShot; bulletIndex += 1) {
        const projectile = this.nextFreeProjectile(weaponKey)
        if (projectile === undefined) {
          exhausted = true
          continue
        }
        const fanProgress = weapon.bulletsPerShot === 1 ? 0.5 : bulletIndex / (weapon.bulletsPerShot - 1)
        const angle = Phaser.Math.DegToRad((fanProgress - 0.5) * weapon.fanAngleDeg)
        const vx = Math.sin(angle) * weapon.projectileSpeed
        const vy = -Math.cos(angle) * weapon.projectileSpeed
        projectile.enableBody(true, origin.x, origin.y, true, true)
        projectile.setActive(true).setVisible(true).setAlpha(1).clearTint()
        projectile.setRotation(angle)
        projectile.setData('vx', vx)
        projectile.setData('vy', vy)
        projectile.setData('travelledPx', 0)
        if (weaponKey === 'laser') (projectile.getData('hitSpawnIds') as Set<number>).clear()
        ;(projectile.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
      }
    }
    if (exhausted) this.warnPoolExhausted(weaponKey)
  }

  private nextFreeProjectile(weapon: WeaponKey): Phaser.Physics.Arcade.Image | undefined {
    const segment = this.segments[weapon]
    for (let attempts = 0; attempts < segment.end - segment.start; attempts += 1) {
      const index = segment.nextIndex
      segment.nextIndex = index + 1 === segment.end ? segment.start : index + 1
      const projectile = this.projectileList[index]
      if (!projectile.active) return projectile
    }
    return undefined
  }

  private warnPoolExhausted(weapon: WeaponKey): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastPoolWarningAtMs < BALANCE.feedback.poolWarningIntervalMs) return
    console.warn(`Projectile pool exhausted for ${WEAPON_LABELS[weapon]}; fan shrank.`)
    this.lastPoolWarningAtMs = this.elapsedMs
  }
}
