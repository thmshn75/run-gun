import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { getEngageLineY, getLaneRatio, getLaneSlope, getRoadHalfWidth } from './roadGeometry'
import type { RunStats } from './upgrades'

export type WeaponKey = 'pistol' | 'normal' | 'shotgun' | 'laser' | 'rocket' | 'minigun' | 'flamethrower' | 'chainlightning' | 'grenade'
  | 'ricochet' | 'cluster' | 'sawblade' | 'shockwave'

export const WEAPON_LABELS: Record<WeaponKey, string> = {
  pistol: 'PISTOLE',
  normal: 'GEWEHR',
  shotgun: 'SCHROT',
  laser: 'LASER',
  rocket: 'RAKETE',
  minigun: 'MINIGUN',
  flamethrower: 'FLAMME',
  chainlightning: 'BLITZ',
  grenade: 'GRANATE',
  ricochet: 'PRELLSCHUSS',
  cluster: 'STREUBOMBE',
  sawblade: 'SAEGEBLATT',
  shockwave: 'SCHOCKWELLE',
}

/**
 * Was die Waffe TUT, in einem Satz - fuer die Detailansicht im Laden (Thomas 2026-08-25:
 * "in einem groesseren bild ... ansehen koennen"). Beschrieben wird die EIGENSCHAFT, nicht
 * die Zahl: Ein Siebenjaehriger entscheidet danach, ob ihm etwas gefaellt, nicht nach
 * Schaden je Sekunde. Die Staerke steht daneben als Sterne.
 *
 * ECHTE UMLAUTE, anders als in den Kommentaren dieses Projekts: Das hier liest ein Kind
 * auf dem Bildschirm, nicht ein Entwickler im Editor.
 */
export const WEAPON_DESCRIPTIONS: Record<WeaponKey, string> = {
  pistol: 'Die Startwaffe. Klein, schnell und die schwächste im Spiel.',
  normal: 'Der Allrounder: mittlere Reichweite, gleichmäßiges Feuer.',
  shotgun: 'Streut breit und erwischt mehrere Gegner nebeneinander.',
  minigun: 'Dauerfeuer mit der höchsten Schussrate.',
  flamethrower: 'Ein Fächer aus Flammen, der eine ganze Reihe auf einmal einhüllt.',
  chainlightning: 'Der Blitz springt vom Getroffenen auf seine Nachbarn über.',
  rocket: 'Sprengt beim Treffer und erwischt alles im Umkreis.',
  ricochet: 'Schlägt durch mehrere Gegner hintereinander durch.',
  sawblade: 'Ein langsames Sägeblatt, das sich durch die ganze Reihe frisst.',
  laser: 'Ein Strahl, der durch alle Gegner hintereinander hindurchgeht.',
  grenade: 'Der größte Sprengradius im Spiel.',
  shockwave: 'Eine Druckwelle rundherum — hilft auch gegen Gegner, die schon nah sind.',
  cluster: 'Teilt sich in mehrere Sprengsätze auf, die einzeln explodieren.',
}

// Reihenfolge = Staffelung (BALANCE.weapon[].minLevel). Die Pistole steht seit
// 2026-08-24 vorne, die vier spaeten hinten.
export const WEAPON_KEYS: readonly WeaponKey[] = [
  'pistol', 'normal', 'shotgun', 'minigun', 'laser', 'flamethrower', 'chainlightning',
  'rocket', 'grenade', 'ricochet', 'cluster', 'sawblade', 'shockwave',
]

interface ProjectileSegment {
  start: number
  end: number
  nextIndex: number
}

export class Weapons {
  private readonly scene: Phaser.Scene
  private readonly projectileGroups: Record<WeaponKey, Phaser.Physics.Arcade.Group>
  private readonly projectileList: Phaser.Physics.Arcade.Image[]
  private readonly segments: Record<WeaponKey, ProjectileSegment>
  private readonly getSalvoPositions: (maxPerSalvo: number) => Array<{ x: number; y: number }>
  private readonly runStats: RunStats
  private fireAccumulatorMs: number
  private lastPoolWarningAtMs: number
  private elapsedMs: number
  private activeWeapon: WeaponKey
  private engageLimitEnabled: boolean

  public constructor(
    scene: Phaser.Scene,
    getSalvoPositions: (maxPerSalvo: number) => Array<{ x: number; y: number }>,
    runStats: RunStats,
  ) {
    this.scene = scene
    this.getSalvoPositions = getSalvoPositions
    this.runStats = runStats
    this.projectileGroups = {
      pistol: scene.physics.add.group(),
      normal: scene.physics.add.group(),
      shotgun: scene.physics.add.group(),
      laser: scene.physics.add.group(),
      rocket: scene.physics.add.group(),
      minigun: scene.physics.add.group(),
      flamethrower: scene.physics.add.group(),
      chainlightning: scene.physics.add.group(),
      grenade: scene.physics.add.group(),
      ricochet: scene.physics.add.group(),
      cluster: scene.physics.add.group(),
      sawblade: scene.physics.add.group(),
      shockwave: scene.physics.add.group(),
    }
    this.projectileList = []
    this.segments = {
      pistol: { start: 0, end: 0, nextIndex: 0 },
      normal: { start: 0, end: 0, nextIndex: 0 },
      shotgun: { start: 0, end: 0, nextIndex: 0 },
      laser: { start: 0, end: 0, nextIndex: 0 },
      rocket: { start: 0, end: 0, nextIndex: 0 },
      minigun: { start: 0, end: 0, nextIndex: 0 },
      flamethrower: { start: 0, end: 0, nextIndex: 0 },
      chainlightning: { start: 0, end: 0, nextIndex: 0 },
      grenade: { start: 0, end: 0, nextIndex: 0 },
      ricochet: { start: 0, end: 0, nextIndex: 0 },
      cluster: { start: 0, end: 0, nextIndex: 0 },
      sawblade: { start: 0, end: 0, nextIndex: 0 },
      shockwave: { start: 0, end: 0, nextIndex: 0 },
    }
    this.fireAccumulatorMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs
    this.elapsedMs = 0
    // Startwaffe seit 2026-08-24: die Pistole, nicht mehr das Sturmgewehr.
    this.activeWeapon = 'pistol'
    this.engageLimitEnabled = true

    for (const key of WEAPON_KEYS) {
      const segment = this.segments[key]
      segment.start = this.projectileList.length
      for (let index = 0; index < BALANCE.pools.projectiles[key]; index += 1) {
        const projectile = scene.physics.add.image(0, 0, `projectile-${key}`).setDepth(BALANCE.layers.gameplay)
        projectile.setData('weapon', key)
        // Trefferliste fuer JEDES Geschoss, nicht nur fuer den Laser (Fehler vom
        // 2026-08-25): Sie wird bei durchschlagenden Waffen gebraucht, damit ein Geschoss
        // denselben Gegner nicht mehrfach schaedigt. Die Bedingung stand hier auf dem
        // Waffennamen, als der Laser die einzige durchschlagende Waffe war. Mit V4 kamen
        // PRELLSCHUSS und SAEGEBLATT dazu - beide bekamen die Liste nie, jeder ihrer
        // Treffer lief in einen Fehler, und sie richteten im ganzen Spiel KEINEN Schaden
        // an. Aufgefallen erst beim Bosskampf: Er war mit ihnen nicht zu gewinnen.
        // Deshalb an die EIGENSCHAFT statt an den Namen gebunden, und gleich fuer alle
        // angelegt - ein leeres Set je Geschoss kostet nichts und kann nicht fehlen.
        projectile.setData('hitSpawnIds', new Set<number>())
        projectile.setActive(false).setVisible(false)
        projectile.disableBody(true, true)
        this.projectileGroups[key].add(projectile)
        this.projectileList.push(projectile)
      }
      segment.end = this.projectileList.length
      segment.nextIndex = segment.start
    }
  }

  public getProjectiles(): readonly Phaser.Physics.Arcade.Image[] {
    return this.projectileList
  }

  public getProjectileGroup(weapon = this.activeWeapon): Phaser.Physics.Arcade.Group {
    return this.projectileGroups[weapon]
  }

  public getWeapon(): WeaponKey {
    return this.activeWeapon
  }

  public setWeapon(weapon: WeaponKey): boolean {
    if (weapon === this.activeWeapon) return false
    this.recycleWeaponProjectiles(this.activeWeapon)
    this.activeWeapon = weapon
    return true
  }

  public getWeaponConfig(weapon: WeaponKey): (typeof BALANCE.weapon)[WeaponKey] {
    return BALANCE.weapon[weapon]
  }

  public recycle(projectile: Phaser.Physics.Arcade.Image): void {
    projectile.disableBody(true, true)
    projectile.setActive(false).setVisible(false)
    projectile.setAlpha(1)
  }

  /** Bossphase: Die Eingriffslinie wird abgeschaltet, sonst waere der Boss unangreifbar. */
  public setEngageLimitEnabled(enabled: boolean): void {
    this.engageLimitEnabled = enabled
  }

  /** Rueckgabe: Zahl der in diesem Bild abgefeuerten Salven - die GameScene haengt den Schusston daran. */
  public update(dt: number): number {
    this.elapsedMs += dt
    this.fireAccumulatorMs += dt
    const weapon = this.getWeaponConfig(this.activeWeapon)
    const salvoIntervalMs = 1000 / (this.runStats.get('shotsPerSec') * weapon.rateFactor)
    let salvos = 0
    while (this.fireAccumulatorMs >= salvoIntervalMs) {
      this.fireAccumulatorMs -= salvoIntervalMs
      this.fire()
      salvos += 1
    }

    const seconds = dt / 1000
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    for (const projectile of this.projectileList) {
      if (!projectile.active) continue
      const vx = projectile.getData('vx') as number
      const vy = projectile.getData('vy') as number
      // Spurtreue Bahn: laneRatio traegt die Perspektive, lateralPx den Faecherwinkel.
      // Beide getrennt zu fuehren haelt den Faecher unveraendert, waehrend die Kugel
      // mit der Strasse nach innen zieht. laneRatio ist bereits mit laneFollow
      // skaliert, laneOriginX faengt den Rest auf — bei laneFollow 0 bleibt x konstant.
      const laneRatio = projectile.getData('laneRatio') as number
      const laneOriginX = projectile.getData('laneOriginX') as number
      const lateralPx = (projectile.getData('lateralPx') as number) + vx * seconds
      projectile.y += vy * seconds
      projectile.x = laneOriginX + laneRatio * getRoadHalfWidth(width, height, projectile.y) + lateralPx
      projectile.setData('lateralPx', lateralPx)
      ;(projectile.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      const config = this.getWeaponConfig(projectile.getData('weapon') as WeaponKey)
      const leftOrRight = projectile.x + projectile.displayWidth / 2 < 0 || projectile.x - projectile.displayWidth / 2 > this.scene.scale.width
      // Kampfzone statt Horizont: Der Schuss endet auf der Linie DIESER Waffe, damit
      // Gegner weiter oben ueberhaupt ankommen (BALANCE.weapon.<name>.engageShare).
      // In der Bossphase gilt keine Reichweite - der Boss steht auf battleY 300 und
      // waere fuer die kurzen Waffen den halben Kampf lang unangreifbar.
      const grenzeY = this.engageLimitEnabled ? getEngageLineY(height, config.engageShare) : BALANCE.road.horizonY
      const kopfY = projectile.y - projectile.displayHeight / 2
      if (leftOrRight || kopfY <= grenzeY) {
        this.recycle(projectile)
        continue
      }
      // Ausblenden kurz vor der Linie: ohne das verschwinden Kugeln mitten im Bild.
      projectile.setAlpha(Math.min(1, (kopfY - grenzeY) / BALANCE.projectile.engageFadePx))
    }
    return salvos
  }

  private fire(): void {
    const weaponKey = this.activeWeapon
    const weapon = this.getWeaponConfig(weaponKey)
    const origins = this.getSalvoPositions(weapon.shootersPerSalvo)
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    const laneFollow = BALANCE.projectile.laneFollow
    // Sprite-Neigung der spurtreuen Bahn: dx/dy ist konstant, weil die Strassenbreite
    // linear in y waechst. Einmal je Salve statt je Frame — die Bahn kruemmt sich nicht.
    const laneSlope = getLaneSlope(width, height)
    let exhausted = false
    for (let shooterIndex = 0; shooterIndex < origins.length; shooterIndex += 1) {
      const origin = origins[shooterIndex]
      const laneRatio = getLaneRatio(width, height, origin.x, origin.y) * laneFollow
      const laneOriginX = origin.x - laneRatio * getRoadHalfWidth(width, height, origin.y)
      const laneAngle = Math.atan(-laneRatio * laneSlope)
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
        projectile.setRotation(angle + laneAngle)
        projectile.setData('vx', vx)
        projectile.setData('vy', vy)
        projectile.setData('laneRatio', laneRatio)
        projectile.setData('laneOriginX', laneOriginX)
        projectile.setData('lateralPx', 0)
        ;(projectile.getData('hitSpawnIds') as Set<number>).clear()
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

  private recycleWeaponProjectiles(weapon: WeaponKey): void {
    const segment = this.segments[weapon]
    for (let index = segment.start; index < segment.end; index += 1) this.recycle(this.projectileList[index])
  }

  private warnPoolExhausted(weapon: WeaponKey): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastPoolWarningAtMs < BALANCE.feedback.poolWarningIntervalMs) return
    console.warn(`Projectile pool exhausted for ${WEAPON_LABELS[weapon]}; fan shrank.`)
    this.lastPoolWarningAtMs = this.elapsedMs
  }
}
