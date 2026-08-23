import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS, STAT_COLORS, WORLD_COLORS } from '../config/colors'
import { Walls } from '../systems/walls'
import { Popups } from '../systems/popups'
import { Coins } from '../systems/coins'
import { ShopOverlay } from '../systems/shopOverlay'
import { selectChainLightningTargets } from '../systems/chainLightning'
import { getGameAudio, type GameAudio } from '../systems/audio'
import { Boss } from '../systems/boss'
import { Crowd } from '../systems/crowd'
import { getCrowdDamageMultiplier } from '../systems/crowdDamage'
import { getLevelPlan } from '../systems/levelPlan'
import { getRoadHalfWidth, Road } from '../systems/road'
import { getEnemySpeed, getScrollSpeed, setCurrentScrollSpeed } from '../systems/speed'
import { Scenery } from '../systems/scenery'
import { readSafeAreaInsets, type SafeAreaInsets } from '../systems/safeArea'
import { addScore, loadSave, qualifiesForScores, writeSave } from '../systems/save'
import { Spawner } from '../systems/spawner'
import { RunStats, type ShopLine, getStatCap, getShopPrice, getContinuePrice } from '../systems/upgrades'
import { WEAPON_LABELS, Weapons, type WeaponKey, WEAPON_KEYS } from '../systems/weapons'

interface HudSegments {
  hp: Phaser.GameObjects.Text
  coins: Phaser.GameObjects.Text
  level: Phaser.GameObjects.Text
  damage: Phaser.GameObjects.Text
  rate: Phaser.GameObjects.Text
  weapon: Phaser.GameObjects.Image
}

interface SplashFlash {
  image: Phaser.GameObjects.Image
  remainingMs: number
}

interface ChainFlash {
  image: Phaser.GameObjects.Image
  remainingMs: number
}

type LevelPhase = 'normal' | 'warning' | 'boss' | 'cleared' | 'shop'

class SplashFlashPool {
  private readonly flashes: SplashFlash[]
  private nextIndex: number

  public constructor(scene: Phaser.Scene) {
    this.flashes = []
    this.nextIndex = 0
    for (let index = 0; index < BALANCE.pools.splashFlashes; index += 1) {
      const image = scene.add.image(0, 0, 'splash-flash').setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
      this.flashes.push({ image, remainingMs: 0 })
    }
  }

  public spawn(x: number, y: number, radiusPx: number): void {
    for (let attempts = 0; attempts < this.flashes.length; attempts += 1) {
      const index = this.nextIndex
      this.nextIndex = index + 1 === this.flashes.length ? 0 : index + 1
      const flash = this.flashes[index]
      if (flash.remainingMs > 0) continue
      flash.remainingMs = BALANCE.weapon.splashFlashMs
      flash.image.setPosition(x, y).setScale((radiusPx * 2) / 32).setAlpha(1).setActive(true).setVisible(true)
      return
    }
  }

  public update(dt: number): void {
    for (const flash of this.flashes) {
      if (flash.remainingMs <= 0) continue
      flash.remainingMs = Math.max(0, flash.remainingMs - dt)
      flash.image.setAlpha(flash.remainingMs / BALANCE.weapon.splashFlashMs)
      if (flash.remainingMs === 0) flash.image.setActive(false).setVisible(false)
    }
  }
}

class ChainFlashPool {
  private readonly flashes: ChainFlash[]
  private nextIndex: number

  public constructor(scene: Phaser.Scene) {
    this.flashes = []
    this.nextIndex = 0
    for (let index = 0; index < BALANCE.pools.chainFlashes; index += 1) {
      const image = scene.add.image(0, 0, 'chain-flash').setDepth(BALANCE.layers.gameplay + 1).setActive(false).setVisible(false)
      this.flashes.push({ image, remainingMs: 0 })
    }
  }

  public spawn(x: number, y: number): void {
    for (let attempts = 0; attempts < this.flashes.length; attempts += 1) {
      const index = this.nextIndex
      this.nextIndex = index + 1 === this.flashes.length ? 0 : index + 1
      const flash = this.flashes[index]
      if (flash.remainingMs > 0) continue
      flash.remainingMs = BALANCE.weapon.chainFlashMs
      flash.image.setPosition(x, y).setAlpha(1).setActive(true).setVisible(true)
      return
    }
  }

  public update(dt: number): void {
    for (const flash of this.flashes) {
      if (flash.remainingMs <= 0) continue
      flash.remainingMs = Math.max(0, flash.remainingMs - dt)
      flash.image.setAlpha(flash.remainingMs / BALANCE.weapon.chainFlashMs)
      if (flash.remainingMs === 0) flash.image.setActive(false).setVisible(false)
    }
  }
}

export class GameScene extends Phaser.Scene {
  private road!: Road
  private scenery!: Scenery
  private crowd!: Crowd
  private weapons!: Weapons
  private spawner!: Spawner
  private coins!: Coins
  private runStats!: RunStats
  private statFloor!: { damage: number; shotsPerSec: number }
  private elapsedMs!: number
  private enemyContactIframeUntilMs!: number
  private blinkUntilMs!: number
  private nextBlinkAtMs!: number
  private lastPointerX!: number | null
  private hud!: HudSegments
  private insets!: SafeAreaInsets
  private gameOverStarted!: boolean
  private lastCrowdSize!: number
  private splashFlashes!: SplashFlashPool
  private chainFlashes!: ChainFlashPool
  private boss!: Boss
  private walls!: Walls
  private popups!: Popups
  // Durchbrueche kosten Bruchteile einer Figur (enemy.breakthroughDamageFactor). Sie
  // werden hier gesammelt und erst bei einer vollen Figur eingeloest - sonst gaebe es
  // bei bis zu 6 Durchbruechen je Sekunde sechsmal Ton und Anzeige.
  private breakthroughAccumulator = 0
  private audio!: GameAudio
  private currentLevel!: number
  private levelPhase!: LevelPhase
  private phaseRemainingMs!: number
  private bossBarBackground!: Phaser.GameObjects.Rectangle
  private bossBarFill!: Phaser.GameObjects.Rectangle
  private bossBarWidth!: number
  private levelOverlayBackground!: Phaser.GameObjects.Rectangle
  private levelOverlay!: Phaser.GameObjects.Text
  private shop!: ShopOverlay
  /** Muenzen, die bereits aufs Konto gebucht sind - der Rest folgt beim naechsten Levelende. */
  private gebuchteMuenzen!: number
  /** In dieser Levelpause gekaufte Stufen je Knopf (shop.maxStepsPerPause). */
  private kaeufeInPause!: { firepower: number; team: number }
  private lastUnknownCombatOverlapWarningAtMs!: number
  private projectileEnemyCollider!: Phaser.Physics.Arcade.Collider
  private projectileBossCollider: Phaser.Physics.Arcade.Collider | undefined
  private projectileWallCollider: Phaser.Physics.Arcade.Collider | undefined
  private crowdBossCollider: Phaser.Physics.Arcade.Collider | undefined
  private crowdRewardCollider: Phaser.Physics.Arcade.Collider | undefined
  private crowdPickupCollider: Phaser.Physics.Arcade.Collider | undefined

  /** Wie dieser Run begonnen hat - frisch, fortgesetzt oder freigekauft. */
  private einstieg: 'neu' | 'fortsetzen' | 'weiterspielen' = 'neu'
  private continuesUsed = 0

  public constructor() {
    super('GameScene')
  }

  public init(data: Readonly<{ einstieg?: 'neu' | 'fortsetzen' | 'weiterspielen' }>): void {
    this.einstieg = data.einstieg ?? 'neu'
  }

  public create(): void {
    this.runStats = new RunStats()
    // Ein Run startet auf Level 1 mit den Basiswerten. Bis zum 2026-08-23 kamen sie aus
    // gekauften Shop-Stufen; der Shop ist entfallen (Thomas: "Den Shop kannst du
    // streichen"), alles wird jetzt im Lauf selbst erspielt.
    this.runStats.setLevel(1)
    this.runStats.set('hp', BALANCE.stats.hp.base)
    this.runStats.set('damage', BALANCE.stats.damage.base)
    this.runStats.set('shotsPerSec', BALANCE.stats.shotsPerSec.base)
    // Boden fuer die roten Segmente: Was in dieser Runde gefunden wurde, kann man
    // wieder verlieren - was Thomas im Laden gekauft hat, nicht.
    this.statFloor = { damage: this.runStats.get('damage'), shotsPerSec: this.runStats.get('shotsPerSec') }
    this.elapsedMs = 0
    this.enemyContactIframeUntilMs = 0
    this.blinkUntilMs = 0
    this.nextBlinkAtMs = 0
    this.lastPointerX = null
    this.gameOverStarted = false
    this.gebuchteMuenzen = 0
    this.kaeufeInPause = { firepower: 0, team: 0 }
    this.lastCrowdSize = -1
    this.currentLevel = 1
    // Phaser konstruiert die Szene beim Neustart nicht neu - der Rest aus dem vorigen
    // Lauf muss hier weg, sonst startet die naechste Runde mit angebrochenem Verlust.
    this.breakthroughAccumulator = 0
    setCurrentScrollSpeed(getScrollSpeed(this.currentLevel))
    // Gegnertempo ist seit 2026-08-22 eine reine Levelgroesse, kein Ausbau mehr.
    this.runStats.set('speed', getEnemySpeed(this.currentLevel))
    this.levelPhase = 'normal'
    this.phaseRemainingMs = getLevelPlan(this.currentLevel).normalPhaseSec * 1000
    this.lastUnknownCombatOverlapWarningAtMs = -1000
    this.insets = readSafeAreaInsets(this.game.canvas)
    this.audio = getGameAudio(this)
    this.audio.resetRun()
    this.cameras.main.setBackgroundColor(WORLD_COLORS.background)
    this.road = new Road(this)
    this.scenery = new Scenery(this, () => Phaser.Math.RND.frac())
    this.crowd = new Crowd(this, this.scale.width / 2, this.scale.height - BALANCE.player.anchorBottomOffset)
    this.weapons = new Weapons(this, (maxPerSalvo) => this.crowd.getNextSalvoPositions(maxPerSalvo), this.runStats)
    this.spawner = new Spawner(this, this.runStats, () => this.crowd.getAnchorX(), (contactDamage) => this.handleBreakthrough(contactDamage))
    this.walls = new Walls(
      this,
      (currentWeapon) => this.spawner.chooseWallWeapon(currentWeapon),
      () => this.weapons.getWeapon(),
      () => this.runStats.get('hp'),
      () => this.runStats.get('damage'),
      () => this.runStats.get('shotsPerSec'),
      () => Phaser.Math.RND.frac(),
      (x, y) => this.dropCoins(x, y, BALANCE.walls.coinReward),
      (apply) => {
        const before = this.runStats.get('hp')
        const after = apply(before)
        this.runStats.set('hp', after)
        // Quittung auf die eigene Handlung: ohne sie wuchs die Truppe lautlos.
        const delta = Math.round(after - before)
        if (delta !== 0) {
          this.audio.play(delta > 0 ? 'crowdUp' : 'crowdDown')
          this.popups.spawn(
            this.crowd.getAnchorX(),
            this.crowd.getAnchorY() - this.crowd.getFigureHeight(),
            `${delta > 0 ? '+' : ''}${delta}`,
            delta > 0 ? '#3ddc84' : '#ff6b6b',
          )
        }
        this.updateHud()
      },
      (stat, gain) => {
        // Feuerkraft aus der rechten Wand: Sofortwirkung mit Quittung, wie links.
        // Seit den roten Segmenten kann gain auch negativ sein.
        const key = stat === 'damage' ? 'damage' : 'shotsPerSec'
        const before = this.runStats.get(key)
        // Nach unten bremst der Run-Startwert, nach oben der Balance-Deckel in RunStats.
        this.runStats.set(key, Math.max(this.statFloor[key], before + gain))
        const after = this.runStats.get(key)
        if (after !== before) {
          const delta = Math.round((after - before) * 10) / 10
          this.audio.play(delta > 0 ? 'crowdUp' : 'crowdDown')
          this.popups.spawn(
            this.crowd.getAnchorX(),
            this.crowd.getAnchorY() - this.crowd.getFigureHeight(),
            `${stat === 'damage' ? 'DMG' : 'RATE'} ${delta > 0 ? '+' : ''}${delta}`,
            delta > 0 ? '#ffd166' : '#ff6b6b',
          )
        }
        this.updateHud()
      },
    )
    this.popups = new Popups(this)
    this.shop = new ShopOverlay(
      this,
      this.insets,
      (line) => this.kaufeStufe(line),
      () => this.verlasseShop(),
    )
    this.crowd.setWallPresenceProvider((y, halfSpan) => this.walls.getWallPresence(y, halfSpan))
    this.boss = new Boss(
      this,
      () => this.spawner.allocateSpawnId(),
      (size) => this.spawner.requestBossHorde(size, BALANCE.boss.hordePressure.maxActiveCalled),
      () => this.crowd.getAnchorY(),
    )
    this.coins = new Coins(this, () => this.updateHud())
    this.splashFlashes = new SplashFlashPool(this)
    this.chainFlashes = new ChainFlashPool(this)
    const panelX = this.insets.left + BALANCE.hud.padding
    const panelY = this.insets.top + BALANCE.hud.padding
    const panelW = this.scale.width - this.insets.left - this.insets.right - 2 * BALANCE.hud.padding
    const panelH = BALANCE.hud.panelHeight
    const panel = this.add.graphics()
    panel.fillStyle(HUD_COLORS.panel, BALANCE.hud.panelAlpha)
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, BALANCE.hud.panelRadius)
    panel.lineStyle(1, HUD_COLORS.panelStroke, BALANCE.hud.panelStrokeAlpha)
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, BALANCE.hud.panelRadius)
    panel.setDepth(BALANCE.hud.depthPanel)
    const primaryHudStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'system-ui',
      fontSize: `${BALANCE.hud.primaryFontPx}px`,
      fontStyle: 'bold',
    }
    const statHudStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'system-ui',
      fontSize: `${BALANCE.hud.secondaryFontPx}px`,
      fontStyle: 'bold',
    }
    const rowOneY = panelY + BALANCE.hud.rowOneOffsetY
    const rowTwoY = panelY + BALANCE.hud.rowTwoOffsetY
    // Zwei Reihen mit je einem Gedanken (neu geordnet 2026-08-22):
    //   Reihe 1 = wo stehe ich?      TEAM | LEVEL | Muenzen
    //   Reihe 2 = womit kaempfe ich? Waffe | DMG | RATE
    // Die Waffe steht links, weil sie Schaden und Feuerrate bestimmt - erst das
    // Werkzeug, dann seine Werte. SPD ist entfallen: Das Gegnertempo haengt seit
    // 2026-08-22 nur noch am Level, der Spieler kann es nicht beeinflussen, also
    // gehoert es nicht in eine Anzeige, die zeigt, was er sich erarbeitet hat.
    const colW = panelW / 3
    this.hud = {
      hp: this.add.text(panelX + BALANCE.hud.sidePad, rowOneY, '', { ...primaryHudStyle, color: this.colorFor(STAT_COLORS.hp) }).setOrigin(0, 0),
      coins: this.add.text(panelX + panelW - BALANCE.hud.sidePad, rowOneY, '', { ...primaryHudStyle, color: this.colorFor(HUD_COLORS.coins) }).setOrigin(1, 0),
      level: this.add.text(panelX + panelW / 2, rowOneY, '', { ...primaryHudStyle, color: this.colorFor(HUD_COLORS.level) }).setOrigin(0.5, 0),
      weapon: this.add.image(panelX + colW * 0.5, rowTwoY + 10, 'weapon-normal-hud').setOrigin(0.5),
      damage: this.add.text(panelX + colW * 1.5, rowTwoY, '', { ...statHudStyle, color: this.colorFor(STAT_COLORS.damage) }).setOrigin(0.5, 0),
      rate: this.add.text(panelX + colW * 2.5, rowTwoY, '', { ...statHudStyle, color: this.colorFor(STAT_COLORS.shotsPerSec) }).setOrigin(0.5, 0),
    }
    Object.values(this.hud).forEach((segment) => segment.setDepth(BALANCE.hud.depthText))
    const bossBarY = this.insets.top + BALANCE.hud.padding + BALANCE.hud.panelHeight + 8
    this.bossBarWidth = getRoadHalfWidth(this.scale.width, this.scale.height, BALANCE.road.horizonY) * 2
    const bossBarX = (this.scale.width - this.bossBarWidth) / 2
    this.bossBarBackground = this.add.rectangle(bossBarX, bossBarY, this.bossBarWidth, 8, HUD_COLORS.bossBarBack).setOrigin(0, 0).setDepth(BALANCE.hud.depthText)
    this.bossBarFill = this.add.rectangle(bossBarX, bossBarY, 0, 8, HUD_COLORS.bossBarFill).setOrigin(0, 0).setDepth(BALANCE.hud.depthText + 1)
    this.bossBarBackground.setVisible(false)
    this.bossBarFill.setVisible(false)
    this.levelOverlayBackground = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, HUD_COLORS.panel, 0.65)
      .setDepth(BALANCE.hud.depthText + 2)
      .setVisible(false)
    this.levelOverlay = this.add.text(this.scale.width / 2, this.scale.height / 2, '', {
      fontFamily: 'system-ui', fontSize: '34px', fontStyle: 'bold', color: this.colorFor(HUD_COLORS.bossOverlayText), stroke: HUD_COLORS.textDark, strokeThickness: 5,
    }).setOrigin(0.5).setDepth(BALANCE.hud.depthText + 3).setVisible(false)
    this.crowd.setSize(this.runStats.get('hp'))
    this.lastCrowdSize = this.runStats.get('hp')
    this.updateHud()
    this.enableRelativeDrag()
    this.replaceProjectileColliders()
    this.physics.add.overlap(this.crowd.getHullBounds(), this.spawner.getEnemies(), (first, second) => {
      this.handleCombatOverlap(first as Phaser.GameObjects.GameObject, second as Phaser.GameObjects.GameObject)
    })
    this.syncBossColliders()
    this.syncWallColliders()
    // ZULETZT: Ein fortgesetzter oder freigekaufter Run ueberschreibt den frischen
    // Zustand. Das muss nach dem gesamten Aufbau stehen - equipWeapon, Kollisionen und
    // Truppengroesse muessen existieren, bevor der Spielstand darauf angewendet wird.
    this.stelleEinstiegHer()
    this.updateHud()
    if (BALANCE.debug) {
      this.drawSafeAreaDebug()
      console.debug(`GameScene children: ${this.children.length}`)
    }
  }

  public update(_time: number, rawDeltaMs: number): void {
    const dt = Math.min(rawDeltaMs, BALANCE.maxDeltaMs)
    this.elapsedMs += dt
    this.road.update(dt)
    this.scenery.update(dt)
    this.crowd.update(dt)
    this.updateLevelPhase(dt)
    if (this.weapons.update(dt) > 0) this.audio.play('shot')
    this.spawner.update(dt)
    this.walls.update(dt)
    this.popups.update(dt)
    this.boss.update(dt)
    this.syncBossColliders()
    this.syncWallColliders()
    this.coins.update(dt, this.crowd.getAnchorX(), this.crowd.getAnchorY())
    this.splashFlashes.update(dt)
    this.chainFlashes.update(dt)
    this.updateBossBar()
    if (this.runStats.get('hp') <= 0) {
      this.triggerGameOver()
      return
    }
    this.updateIframes()
  }

  private enableRelativeDrag(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.lastPointerX = pointer.x
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || this.lastPointerX === null) return
      this.crowd.setAnchorX(this.crowd.getAnchorX() + pointer.x - this.lastPointerX)
      this.lastPointerX = pointer.x
    })
    this.input.on('pointerup', () => {
      this.lastPointerX = null
    })
  }

  private addCombatOverlap(
    first: Phaser.Types.Physics.Arcade.ArcadeColliderType,
    second: Phaser.Types.Physics.Arcade.ArcadeColliderType,
  ): Phaser.Physics.Arcade.Collider {
    return this.physics.add.overlap(first, second, (overlapFirst, overlapSecond) => {
      this.handleCombatOverlap(overlapFirst as Phaser.GameObjects.GameObject, overlapSecond as Phaser.GameObjects.GameObject)
    })
  }

  private replaceProjectileColliders(): void {
    this.projectileEnemyCollider?.destroy()
    this.projectileBossCollider?.destroy()
    this.projectileWallCollider?.destroy()
    this.projectileBossCollider = undefined
    this.projectileWallCollider = undefined

    const projectiles = this.weapons.getProjectileGroup()
    this.projectileEnemyCollider = this.addCombatOverlap(projectiles, this.spawner.getEnemies())
    if (this.levelPhase === 'boss') this.projectileBossCollider = this.addCombatOverlap(projectiles, this.boss.getEnemy())
    if (this.walls.hasActivePair()) this.projectileWallCollider = this.addCombatOverlap(projectiles, this.walls.getWalls())
  }

  private syncBossColliders(): void {
    if (this.levelPhase === 'boss') {
      if (this.projectileBossCollider === undefined) {
        this.projectileBossCollider = this.addCombatOverlap(this.weapons.getProjectileGroup(), this.boss.getEnemy())
      }
      if (this.crowdBossCollider === undefined) {
        this.crowdBossCollider = this.addCombatOverlap(this.crowd.getHullBounds(), this.boss.getEnemy())
      }
      return
    }
    this.projectileBossCollider?.destroy()
    this.crowdBossCollider?.destroy()
    this.projectileBossCollider = undefined
    this.crowdBossCollider = undefined
  }

  private syncWallColliders(): void {
    if (this.walls.hasActivePair()) {
      if (this.projectileWallCollider === undefined) {
        this.projectileWallCollider = this.addCombatOverlap(this.weapons.getProjectileGroup(), this.walls.getWalls())
      }
      if (this.crowdRewardCollider === undefined) {
        this.crowdRewardCollider = this.addCombatOverlap(this.crowd.getHullBounds(), this.walls.getRewards())
      }
      if (this.crowdPickupCollider === undefined) {
        // Die Sammelplaettchen liegen in derselben Gruppe wie die Wandsegmente; der
        // Handler unterscheidet sie. Wandsegmente kosten bei Beruehrung nichts, das
        // war schon vorher so.
        this.crowdPickupCollider = this.addCombatOverlap(this.crowd.getHullBounds(), this.walls.getWalls())
      }
      return
    }
    this.projectileWallCollider?.destroy()
    this.crowdRewardCollider?.destroy()
    this.crowdPickupCollider?.destroy()
    this.projectileWallCollider = undefined
    this.crowdRewardCollider = undefined
    this.crowdPickupCollider = undefined
  }

  private equipWeapon(weapon: WeaponKey): void {
    if (!this.weapons.setWeapon(weapon)) return
    this.replaceProjectileColliders()
    // Quittung auf die eigene Handlung: der Waffenwechsel war bisher nur am HUD sichtbar.
    this.audio.play('weaponSwap')
    this.popups.spawn(
      this.crowd.getAnchorX(),
      this.crowd.getAnchorY() - this.crowd.getFigureHeight(),
      WEAPON_LABELS[weapon],
      '#ffd166',
    )
    this.updateHud()
  }

  /**
   * Fortsetzen und Weiterspielen bauen auf demselben Wiedereinstieg auf (B3): Level von
   * vorn, gekaufte Stufen und Muenzen bleiben. Der Unterschied ist die Truppe - beim
   * freigekauften Weiterspielen startet sie bei continueRun.teamShareOnContinue des
   * Deckels, beim Fortsetzen mit dem Stand, den man beim Aufhoeren hatte.
   */
  private stelleEinstiegHer(): void {
    if (this.einstieg === 'neu') {
      const saved = loadSave()
      if (saved.run !== undefined) writeSave({ ...saved, run: undefined })
      return
    }
    const snapshot = loadSave().run
    if (snapshot === undefined) {
      this.einstieg = 'neu'
      return
    }
    this.currentLevel = Math.max(1, Math.floor(snapshot.level))
    this.continuesUsed = snapshot.continuesUsed
    this.gebuchteMuenzen = snapshot.bookedCoins
    this.coins.setCount(snapshot.runCoins)
    for (let i = 0; i < snapshot.firepowerSteps; i += 1) this.runStats.addStep('firepower')
    for (let i = 0; i < snapshot.teamSteps; i += 1) this.runStats.addStep('team')
    this.runStats.setLevel(this.currentLevel)
    if (WEAPON_KEYS.includes(snapshot.weapon as WeaponKey)) this.equipWeapon(snapshot.weapon as WeaponKey)
    this.runStats.set('damage', snapshot.damage)
    this.runStats.set('shotsPerSec', snapshot.shotsPerSec)
    this.statFloor = { damage: this.runStats.get('damage'), shotsPerSec: this.runStats.get('shotsPerSec') }
    if (this.einstieg === 'weiterspielen') {
      this.continuesUsed += 1
      this.runStats.set('hp', Math.max(1, Math.round(
        getStatCap('hp', this.currentLevel, this.runStats.getSteps()) * BALANCE.continueRun.teamShareOnContinue,
      )))
    } else {
      this.runStats.set('hp', snapshot.hp)
    }
    this.startLevel()
    this.syncCrowdSize()
  }

  /**
   * Den offenen Run an der LEVELGRENZE sichern. Nur hier, nicht mitten im Level: Dort
   * muessten Gegner im Anflug, Wandkette und Bossphase mitgeschrieben werden.
   */
  private sichereRun(): void {
    const saved = loadSave()
    const stufen = this.runStats.getSteps()
    writeSave({
      ...saved,
      run: {
        level: this.currentLevel,
        hp: this.runStats.get('hp'),
        damage: this.runStats.get('damage'),
        shotsPerSec: this.runStats.get('shotsPerSec'),
        weapon: this.weapons.getWeapon(),
        firepowerSteps: stufen.firepower,
        teamSteps: stufen.team,
        runCoins: this.coins.getCount(),
        bookedCoins: this.gebuchteMuenzen,
        continuesUsed: this.continuesUsed,
      },
    })
  }

  private handleProjectileHit(projectile: Phaser.Physics.Arcade.Image, enemy: Phaser.Physics.Arcade.Image): void {
    if (!projectile.active || !enemy.active) return
    const weapon = projectile.getData('weapon') as WeaponKey
    const config = this.weapons.getWeaponConfig(weapon)
    const damage = this.runStats.get('damage') * this.getCrowdDamageMultiplier() * config.damageFactor
    if (config.pierces) {
      const hitSpawnIds = projectile.getData('hitSpawnIds') as Set<number>
      const spawnId = enemy.getData('spawnId') as number
      if (hitSpawnIds.has(spawnId)) return
      hitSpawnIds.add(spawnId)
      this.damageEnemy(enemy, damage)
      return
    }
    const impactX = enemy.x
    const impactY = enemy.y
    this.damageEnemy(enemy, damage)
    this.applyChainLightning(enemy, config, damage)
    if (config.splashRadiusPx > 0) {
      const radiusSquared = config.splashRadiusPx * config.splashRadiusPx
      const splashDamage = this.runStats.get('damage') * this.getCrowdDamageMultiplier() * config.splashDamageFactor
      for (const child of this.spawner.getEnemies().getChildren()) {
        const candidate = child as Phaser.Physics.Arcade.Image
        const dx = candidate.x - impactX
        const dy = candidate.y - impactY
        if (candidate.active && dx * dx + dy * dy <= radiusSquared) this.damageEnemy(candidate, splashDamage)
      }
      const bossEnemy = this.boss.getEnemy()
      const bossDx = bossEnemy.x - impactX
      const bossDy = bossEnemy.y - impactY
      if (bossEnemy.active && bossDx * bossDx + bossDy * bossDy <= radiusSquared) this.damageEnemy(bossEnemy, splashDamage)
      this.splashFlashes.spawn(impactX, impactY, config.splashRadiusPx)
      this.cameras.main.shake(BALANCE.gamefeel.shakeSplashMs, BALANCE.gamefeel.shakeSplashIntensity)
    }
    this.weapons.recycle(projectile)
  }

  private handleProjectileWallHit(projectile: Phaser.Physics.Arcade.Image, wall: Phaser.Physics.Arcade.Image): void {
    if (!projectile.active || !wall.active) return
    const weapon = projectile.getData('weapon') as WeaponKey
    const config = this.weapons.getWeaponConfig(weapon)
    const damage = this.runStats.get('damage') * this.getCrowdDamageMultiplier() * config.damageFactor
    if (config.pierces) {
      const hitSpawnIds = projectile.getData('hitSpawnIds') as Set<number>
      const spawnId = wall.getData('spawnId') as number
      if (hitSpawnIds.has(spawnId)) return
      hitSpawnIds.add(spawnId)
      if (this.walls.damage(wall, damage)) this.audio.play('wallBreak')
      return
    }
    const impactX = wall.x
    const impactY = wall.y
    if (this.walls.damage(wall, damage)) this.audio.play('wallBreak')
    if (config.splashRadiusPx > 0) {
      const radiusSquared = config.splashRadiusPx * config.splashRadiusPx
      const splashDamage = this.runStats.get('damage') * this.getCrowdDamageMultiplier() * config.splashDamageFactor
      for (const child of this.walls.getWalls().getChildren()) {
        const candidate = child as Phaser.Physics.Arcade.Image
        const dx = candidate.x - impactX
        const dy = candidate.y - impactY
        if (candidate.active && dx * dx + dy * dy <= radiusSquared && this.walls.damage(candidate, splashDamage)) this.audio.play('wallBreak')
      }
      this.splashFlashes.spawn(impactX, impactY, config.splashRadiusPx)
    }
    this.weapons.recycle(projectile)
  }

  private applyChainLightning(
    source: Phaser.Physics.Arcade.Image,
    config: (typeof BALANCE.weapon)[WeaponKey],
    directDamage: number,
  ): void {
    if (config.chainCount === 0) return
    const targets = this.spawner.getEnemies().getChildren()
      .filter((child) => child.active)
      .map((child) => child as Phaser.Physics.Arcade.Image)
    const bossEnemy = this.boss.getEnemy()
    if (bossEnemy.active) targets.push(bossEnemy)
    const byId = new Map(targets.map((target) => [target.getData('spawnId') as number, target]))
    const sourceId = source.getData('spawnId') as number
    const jumps = selectChainLightningTargets(
      sourceId,
      source.x,
      source.y,
      targets.map((target) => ({ id: target.getData('spawnId') as number, x: target.x, y: target.y })),
      config.chainRadiusPx,
      config.chainCount,
    )
    for (const jump of jumps) {
      const target = byId.get(jump.id)
      if (target === undefined || !target.active) continue
      this.damageEnemy(target, directDamage * config.chainDamageFactor)
      this.chainFlashes.spawn(target.x, target.y)
    }
  }

  private handleCombatOverlap(first: Phaser.GameObjects.GameObject, second: Phaser.GameObjects.GameObject): void {
    const playerProjectile = this.findObjectWithData(first, second, 'weapon')
    if (playerProjectile !== undefined) {
      const enemy = playerProjectile === first ? second : first
      if (this.walls.isWall(enemy)) {
        this.handleProjectileWallHit(playerProjectile as Phaser.Physics.Arcade.Image, enemy)
        return
      }
      this.handleProjectileHit(playerProjectile as Phaser.Physics.Arcade.Image, enemy as Phaser.Physics.Arcade.Image)
      return
    }

    const hull = this.crowd.getHullBounds()
    if (first === hull || second === hull) {
      const target = first === hull ? second : first
      if (this.walls.isReward(target)) {
        const weapon = this.walls.collect(target)
        if (weapon !== undefined) {
          this.equipWeapon(weapon)
        }
        return
      }
      // Sammelbahn links: durchfahren genuegt, kein Schuss. Der Zuwachs wird in
      // walls.collectPickup auf den DANN aktuellen Stand angewandt.
      if (this.walls.isPickupSegment(target)) {
        // Streifen sammelt nicht, Hineinfahren schon - siehe walls.pickupOverlapFigures.
        if (this.crowdStehtInSammelbahn(target as Phaser.Physics.Arcade.Image)) {
          this.walls.collectPickup(target as Phaser.Physics.Arcade.Image)
        }
        return
      }
      // Wandsegmente kosten bei Beruehrung NICHTS - das war seit W4 so und muss hier
      // ausdruecklich stehen: Seit die Truppenhuelle gegen die ganze Wandgruppe prueft
      // (fuer die Sammelbahn), fiel eine beruehrte rechte Wand sonst bis zur
      // Gegnerbehandlung durch. Sie hat kein contactDamage, der Trupp wurde damit auf
      // NaN gesetzt und verschwand komplett (Thomas 2026-08-22: "wenn ich mit meinen
      // Spielern nach rechts in eine blaue Wand fahre verschwinden sie ploetzlich").
      if (this.walls.isWall(target)) return
      const enemyImage = target as Phaser.Physics.Arcade.Image
      if (!this.crowd.overlapsFigure(enemyImage.getBounds())) return
      if (this.elapsedMs < this.enemyContactIframeUntilMs) return
      this.handlePlayerHit(enemyImage)
      return
    }

    if (import.meta.env.DEV && this.elapsedMs - this.lastUnknownCombatOverlapWarningAtMs >= 1000) {
      console.warn('Unhandled combat overlap: neither object identifies as a player projectile, boss projectile, or player hull.')
      this.lastUnknownCombatOverlapWarningAtMs = this.elapsedMs
    }
  }

  /**
   * Steht die Truppe tief genug in der Sammelbahn, um ein Plaettchen einzuloesen?
   *
   * Drei Dinge, die hier bewusst so stehen - alle drei aus Messungen, nicht aus Gefuehl:
   *
   * 1. DIE HUELLE WIRD AUS DEM ANKER GERECHNET, nicht aus der Zone. Die Zone wird erst
   *    in crowd.update() nachgezogen, die Kollisionspruefung von Arcade laeuft davor.
   *    Wer die Zone liest, prueft gegen die Truppenposition des VORIGEN Bildes -
   *    waehrend die Quittung an der aktuellen erscheint. Genau dieses Auseinanderfallen
   *    hat Thomas am 2026-08-23 als "ich bin rechts und sammle trotzdem ein" gemeldet.
   *
   * 2. DIE Y-ACHSE WIRD MITGEPRUEFT. Bis hierher stand hier nur die X-Rechnung, die
   *    Y-Achse blieb der Physik ueberlassen - und die meldet schon bei Kantenberuehrung.
   *    GEMESSEN (Level 11, Truppe 48, Anker fest x=120): Eine Kachel bei y 609..677 loeste
   *    voll ein, waehrend die Huelle bei y 677..751 stand. Weil Kacheln perspektivisch
   *    laufen, ragt eine weiter oben stehende weiter zur Strassenmitte (84,2 px gegen
   *    77,8 px auf Truppenhoehe) - die Ausloesezone wanderte dadurch nach rechts.
   *
   * 3. ROT VERLANGT MEHR TIEFE ALS BLAU (walls.drainOverlapFigures 2,0 gegen
   *    pickupOverlapFigures 1,2). Seit die Feuerlinie schmaler ist und Gegner ueber die
   *    ganze Strasse anlaufen, MUSS man am Rand kaempfen; mit einer gemeinsamen Schwelle
   *    loeste man dabei zwangslaeufig auch die roten Kacheln ein.
   */
  private crowdStehtInSammelbahn(segment: Phaser.Physics.Arcade.Image): boolean {
    const bahn = segment.getBounds()
    const figurBreite = this.crowd.getFigureWidth()
    const figurHoehe = this.crowd.getFigureHeight()
    const halbeBreite = (figurBreite * BALANCE.crowd.hullWidthFigures) / 2
    const halbeHoehe = (figurHoehe * BALANCE.crowd.hullHeightFigures) / 2
    const ankerX = this.crowd.getAnchorX()
    const ankerY = this.crowd.getAnchorY()

    const ueberlappungX = Math.min(ankerX + halbeBreite, bahn.right) - Math.max(ankerX - halbeBreite, bahn.left)
    const ueberlappungY = Math.min(ankerY + halbeHoehe, bahn.bottom) - Math.max(ankerY - halbeHoehe, bahn.top)

    const tiefe = this.walls.isDrainSegment(segment)
      ? BALANCE.walls.drainOverlapFigures
      : BALANCE.walls.pickupOverlapFigures
    return ueberlappungX >= figurBreite * tiefe
      && ueberlappungY >= figurHoehe * BALANCE.walls.pickupOverlapHeightFigures
  }

  private findObjectWithData(
    first: Phaser.GameObjects.GameObject,
    second: Phaser.GameObjects.GameObject,
    key: string,
  ): Phaser.GameObjects.GameObject | undefined {
    if (first.getData(key) !== undefined) return first
    if (second.getData(key) !== undefined) return second
    return undefined
  }

  private damageEnemy(enemy: Phaser.Physics.Arcade.Image, damage: number): void {
    const enemyX = enemy.x
    const enemyY = enemy.y
    const coinValue = enemy.getData('coinValue') as number
    if (!this.spawner.damage(enemy, damage)) return
    this.audio.play('enemyDown')
    this.dropCoins(enemyX, enemyY, coinValue)
    if (this.boss.isEnemy(enemy)) this.handleBossDefeated()
  }

  private dropCoins(x: number, y: number, value: number): void {
    const coinOffsets = Array.from({ length: value }, (_value, index) => (index - (value - 1) / 2) * BALANCE.coins.dropSpacing)
    const firstCoinX = x + coinOffsets[0]
    const lastCoinX = x + coinOffsets[coinOffsets.length - 1]
    const groupOffsetX = firstCoinX < BALANCE.coins.edgeInset
      ? BALANCE.coins.edgeInset - firstCoinX
      : lastCoinX > this.scale.width - BALANCE.coins.edgeInset
        ? this.scale.width - BALANCE.coins.edgeInset - lastCoinX
        : 0
    for (let index = 0; index < value; index += 1) {
      this.coins.spawnAt(x + coinOffsets[index] + groupOffsetX, y)
    }
  }

  private handlePlayerHit(enemy: Phaser.Physics.Arcade.Image): void {
    if (!enemy.active) return
    const contactDamage = enemy.getData('contactDamage') as number | undefined
    // Zweite Sicherung gegen denselben Fehler an anderer Stelle: Ein Objekt ohne
    // Schadenswert ist kein Gegner. Ohne diese Pruefung wird der Trupp zu NaN und
    // verschwindet - schlimmer als jeder Treffer.
    if (typeof contactDamage !== 'number' || !Number.isFinite(contactDamage)) {
      if (import.meta.env.DEV) console.warn('Beruehrung mit einem Objekt ohne contactDamage ignoriert.')
      return
    }
    if (!this.boss.isEnemy(enemy)) this.spawner.recycle(enemy)
    this.handlePlayerDamage(contactDamage)
  }

  /**
   * Ein Gegner hat die Truppenhoehe passiert, ohne getoetet worden zu sein.
   *
   * Bewusst NICHT ueber handlePlayerDamage: Das setzt die Unverwundbarkeit nach einem
   * Treffer und laesst die Kamera wackeln. Beides waere hier falsch - die Unverwundbar-
   * keit schuetzt vor einer Trefferserie, nicht vor den Folgen des eigenen Verfehlens
   * (sie wuerde die Regel genau bei hohem Durchsatz aushebeln), und Wackeln bei sechs
   * Ereignissen je Sekunde macht das Bild unruhig statt wuchtig. Die Quittung ist
   * dieselbe wie beim Verlust an einer roten Wandkachel: Ton `crowdDown` und eine
   * rote Zahl ueber der Truppe.
   */
  private handleBreakthrough(contactDamage: number): void {
    if (this.gameOverStarted) return
    this.breakthroughAccumulator += contactDamage * BALANCE.enemy.breakthroughDamageFactor
    const figuren = Math.floor(this.breakthroughAccumulator)
    if (figuren < 1) return
    this.breakthroughAccumulator -= figuren
    const before = this.runStats.get('hp')
    this.runStats.set('hp', before - figuren)
    this.syncCrowdSize()
    const delta = Math.round(this.runStats.get('hp') - before)
    if (delta !== 0) {
      this.audio.play('crowdDown')
      this.popups.spawn(
        this.crowd.getAnchorX(),
        this.crowd.getAnchorY() - this.crowd.getFigureHeight(),
        `${delta}`,
        '#ff6b6b',
      )
    }
    this.updateHud()
    if (this.runStats.get('hp') <= 0) this.triggerGameOver()
  }

  private handlePlayerDamage(damage: number): void {
    this.runStats.set('hp', this.runStats.get('hp') - damage)
    this.syncCrowdSize()
    // Seit V2 gibt es nur noch eine Schadensquelle: Beruehrung. Der Boss schiesst nicht mehr.
    const iframeMs = BALANCE.player.iframesMs
    this.enemyContactIframeUntilMs = this.elapsedMs + iframeMs
    this.blinkUntilMs = Math.max(this.blinkUntilMs, this.elapsedMs + iframeMs)
    this.nextBlinkAtMs = this.elapsedMs
    // Treffer am eigenen Trupp muss man spueren, nicht nur am HUD ablesen.
    this.audio.play('playerHit')
    this.cameras.main.shake(BALANCE.gamefeel.shakeDamageMs, BALANCE.gamefeel.shakeDamageIntensity)
    this.updateHud()
    if (this.runStats.get('hp') <= 0) this.triggerGameOver()
  }

  private triggerGameOver(): void {
    if (this.gameOverStarted) return
    this.gameOverStarted = true
    const runCoins = this.coins.getCount()
    const saved = loadSave()
    const scorePlace = qualifiesForScores(saved, runCoins)
      ? saved.scores.filter((score) => score.coins >= runCoins).length + 1
      : undefined
    const withScore = addScore(saved, { coins: runCoins, level: this.currentLevel, timeMs: this.elapsedMs })
    // NUR DEN REST buchen: Was in abgeschlossenen Leveln verdient wurde, liegt seit dem
    // jeweiligen Levelende schon auf dem Konto (bucheMuenzenAufsKonto). Wer hier den
    // vollen Run-Stand addierte, zahlte alles zweimal aus.
    const offen = Math.max(0, runCoins - this.gebuchteMuenzen)
    const konto = withScore.coins + offen
    // Der Weiterspiel-Punkt fuer die naechste Runde: Level, Stufen und Muenzen bleiben,
    // die Truppe startet halbiert. Er ersetzt den Fortsetzen-Punkt - wer stirbt, kann
    // NICHT mehr kostenlos aus dem Menue einsteigen, sonst waere das Weiterspielen
    // umsonst zu haben (App schliessen statt zahlen).
    const stufen = this.runStats.getSteps()
    const weiterMoeglich = this.continuesUsed < BALANCE.continueRun.maxPerRun
    const preis = getContinuePrice(this.currentLevel, this.continuesUsed)
    writeSave({
      ...withScore,
      coins: konto,
      highestLevel: Math.max(withScore.highestLevel, this.currentLevel),
      run: weiterMoeglich
        ? {
          level: this.currentLevel,
          hp: this.runStats.get('hp'),
          damage: this.runStats.get('damage'),
          shotsPerSec: this.runStats.get('shotsPerSec'),
          weapon: this.weapons.getWeapon(),
          firepowerSteps: stufen.firepower,
          teamSteps: stufen.team,
          runCoins,
          bookedCoins: runCoins,
          continuesUsed: this.continuesUsed,
        }
        : undefined,
    })
    this.scene.start('GameOverScene', {
      coins: runCoins,
      scorePlace,
      weiterspielenPreis: weiterMoeglich && konto >= preis ? preis : undefined,
      level: this.currentLevel,
    })
  }

  private updateLevelPhase(dt: number): void {
    // Der Shop wartet auf WEITER, nicht auf einen Zeitgeber (Benni ist 7 - er soll in
    // Ruhe lesen und tippen koennen).
    if (this.levelPhase === 'boss' || this.levelPhase === 'shop') return
    this.phaseRemainingMs -= dt
    if (this.phaseRemainingMs > 0) return
    if (this.levelPhase === 'normal') {
      this.levelPhase = 'warning'
      this.phaseRemainingMs = BALANCE.level.warningMs
      this.spawner.setSpawningEnabled(false)
      this.walls.deactivateAll()
      this.popups.deactivateAll()
      this.levelOverlayBackground.setVisible(false)
      this.levelOverlay.setText('BOSS').setVisible(true)
      return
    }
    if (this.levelPhase === 'warning') {
      this.levelPhase = 'boss'
      // Im Duell gilt keine Schussreichweite: Der Boss steht weiter oben als die
      // Reichweite der kurzen Waffen und rueckt erst langsam vor.
      this.weapons.setEngageLimitEnabled(false)
      this.levelOverlayBackground.setVisible(false)
      this.levelOverlay.setVisible(false)
      this.boss.activate(
        this.currentLevel,
        this.runStats.get('hp'),
        this.weapons.getWeapon(),
        this.runStats.get('damage'),
        this.runStats.get('shotsPerSec'),
      )
      return
    }
    if (this.levelPhase === 'cleared') {
      this.oeffneShop()
      return
    }
    this.startLevel()
  }

  private handleBossDefeated(): void {
    if (this.levelPhase !== 'boss') return
    this.spawner.recycleBossCompanions()
    this.walls.deactivateAll()
    this.popups.deactivateAll()
    this.boss.deactivate()
    this.currentLevel += 1
    const saved = loadSave()
    writeSave({ ...saved, highestLevel: Math.max(saved.highestLevel, this.currentLevel) })
    this.levelPhase = 'cleared'
    this.syncBossColliders()
    this.phaseRemainingMs = BALANCE.level.clearedMs
    this.levelOverlayBackground.setVisible(true)
    this.levelOverlay.setText(`LEVEL ${this.currentLevel - 1} GESCHAFFT`).setVisible(true)
  }

  /**
   * Was im Level gesammelt wurde, wandert aufs Konto - sonst koennte man im Shop nichts
   * ausgeben, was man gerade erst verdient hat. Gebucht wird die DIFFERENZ seit der
   * letzten Buchung; coins.getCount() bleibt der Run-Gesamtstand fuer die Bestenliste.
   */
  private bucheMuenzenAufsKonto(): number {
    const offen = this.coins.getCount() - this.gebuchteMuenzen
    if (offen <= 0) return 0
    this.gebuchteMuenzen = this.coins.getCount()
    const saved = loadSave()
    writeSave({ ...saved, coins: saved.coins + offen })
    return offen
  }

  private oeffneShop(): void {
    this.levelPhase = 'shop'
    this.kaeufeInPause = { firepower: 0, team: 0 }
    this.bucheMuenzenAufsKonto()
    this.levelOverlayBackground.setVisible(false)
    this.levelOverlay.setVisible(false)
    this.shop.zeigen(this.shopZustand())
  }

  private shopZustand() {
    return {
      level: this.currentLevel - 1,
      konto: loadSave().coins,
      stufen: this.runStats.getSteps(),
      inDieserPause: { firepower: this.kaeufeInPause.firepower, team: this.kaeufeInPause.team },
      werte: {
        damage: this.runStats.get('damage'),
        shotsPerSec: this.runStats.get('shotsPerSec'),
        hp: getStatCap('hp', this.currentLevel, this.runStats.getSteps()),
      },
    }
  }

  private kaufeStufe(line: ShopLine): void {
    if (this.levelPhase !== 'shop') return
    if (this.kaeufeInPause[line] >= BALANCE.shop.maxStepsPerPause) return
    const preis = getShopPrice(this.runStats.getStepCount(line))
    if (preis === undefined) return
    const saved = loadSave()
    if (saved.coins < preis) return
    if (!this.runStats.addStep(line)) return
    writeSave({ ...saved, coins: saved.coins - preis })
    this.kaeufeInPause[line] += 1
    this.audio.play('crowdUp')
    this.shop.aktualisieren(this.shopZustand())
    this.syncCrowdSize()
    this.updateHud()
  }

  private verlasseShop(): void {
    if (this.levelPhase !== 'shop') return
    this.shop.verstecken()
    this.startLevel()
  }

  private startLevel(): void {
    // Die Spielerwert-Deckel haengen seit 2026-08-23 am Level und muessen VOR allem
    // anderen stehen - sonst klemmt der erste set()-Aufruf noch gegen den alten Deckel.
    this.runStats.setLevel(this.currentLevel)
    // Jedes Level ein wenig schneller (Thomas 2026-08-22). Eine Zahl fuer die ganze
    // Welt, damit Waende, Muenzen, Strasse, Haeuser und Laufanimation im Takt bleiben.
    setCurrentScrollSpeed(getScrollSpeed(this.currentLevel))
    // Gegnertempo ist seit 2026-08-22 eine reine Levelgroesse, kein Ausbau mehr.
    this.runStats.set('speed', getEnemySpeed(this.currentLevel))
    this.levelPhase = 'normal'
    // Normalphase: Reichweite gilt wieder, sonst raeumt die Truppe bis zum Horizont ab.
    this.weapons.setEngageLimitEnabled(true)
    this.phaseRemainingMs = getLevelPlan(this.currentLevel).normalPhaseSec * 1000
    this.levelOverlayBackground.setVisible(false)
    this.levelOverlay.setVisible(false)
    this.spawner.resetForLevel(this.currentLevel)
    this.walls.resetForLevel(this.currentLevel)

    // Levelgrenze: Hier wird der offene Run gesichert (B3). Wer die App schliesst,
    // findet ihn im Menue wieder.
    this.sichereRun()
  }

  private updateBossBar(): void {
    const bossEnemy = this.boss.getEnemy()
    const visible = this.levelPhase === 'boss' && bossEnemy.active
    this.bossBarBackground.setVisible(visible)
    this.bossBarFill.setVisible(visible)
    if (!visible) return
    const hp = bossEnemy.getData('hp') as number
    const maxHp = bossEnemy.getData('maxHp') as number
    this.bossBarFill.setSize(this.bossBarWidth * Math.max(0, hp) / maxHp, 8)
  }

  private updateIframes(): void {
    if (this.elapsedMs >= this.blinkUntilMs) {
      this.crowd.setFiguresAlpha(1)
      return
    }
    if (this.elapsedMs >= this.nextBlinkAtMs) {
      this.crowd.setFiguresAlpha(Math.floor(this.elapsedMs / BALANCE.player.blinkIntervalMs) % 2 === 0 ? 0.35 : 1)
      this.nextBlinkAtMs += BALANCE.player.blinkIntervalMs
    }
  }

  private updateHud(): void {
    this.syncCrowdSize()
    const damage = Math.round(this.runStats.get('damage') * 10) / 10
    const shotsPerSec = Math.round(this.runStats.get('shotsPerSec') * 10) / 10
    this.hud.hp.setText(`TEAM ${this.runStats.get('hp')}`)
    this.hud.coins.setText(`¢ ${this.coins.getCount()}`)
    this.hud.level.setText(`LEVEL ${this.currentLevel}`)
    this.hud.damage.setText(`DMG ${damage}`)
    this.hud.rate.setText(`RATE ${shotsPerSec}`)
    this.hud.weapon.setTexture(`weapon-${this.weapons.getWeapon()}-hud`)
  }

  private syncCrowdSize(): void {
    const crowdSize = this.runStats.get('hp')
    if (crowdSize === this.lastCrowdSize) return
    this.crowd.setSize(crowdSize)
    this.lastCrowdSize = crowdSize
  }

  private getCrowdDamageMultiplier(): number {
    return getCrowdDamageMultiplier(this.runStats.get('hp'))
  }

  private drawSafeAreaDebug(): void {
    const frame = this.add.graphics()
    frame.lineStyle(2, HUD_COLORS.coins, 1)
    frame.strokeRect(
      this.insets.left,
      this.insets.top,
      this.scale.width - this.insets.left - this.insets.right,
      this.scale.height - this.insets.top - this.insets.bottom,
    )
    this.add.text(
      BALANCE.hud.padding,
      this.insets.top + BALANCE.hud.padding * 4,
      `Safe area  T:${this.insets.top} R:${this.insets.right} B:${this.insets.bottom} L:${this.insets.left}`,
      { fontFamily: 'system-ui', fontSize: '13px', color: this.colorFor(HUD_COLORS.coins) },
    )
  }

  private colorFor(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`
  }
}

export interface GameScene {
  debugSetState(options: { level?: number; teamSize?: number; weapon?: WeaponKey; anchorX?: number }): void
}

if (import.meta.env.DEV) {
  GameScene.prototype.debugSetState = function (options): void {
    const scene = this as unknown as {
      equipWeapon(weapon: WeaponKey): void
      runStats: { set(stat: 'hp' | 'damage' | 'shotsPerSec', value: number): void, setLevel(level: number): void }
      currentLevel: number
      boss: { deactivate(): void }
      spawner: { recycleBossCompanions(): void }
      crowd: { setAnchorX(x: number): void }
      startLevel(): void
      syncBossColliders(): void
      updateHud(): void
    }
    if (options.weapon !== undefined) scene.equipWeapon(options.weapon)
    if (options.anchorX !== undefined) scene.crowd.setAnchorX(options.anchorX)
    if (options.teamSize !== undefined) scene.runStats.set('hp', options.teamSize)
    if (options.level !== undefined) {
      scene.currentLevel = Math.max(1, Math.floor(options.level))
      scene.runStats.setLevel(scene.currentLevel)
      scene.boss.deactivate()
      scene.spawner.recycleBossCompanions()
      scene.startLevel()
      scene.syncBossColliders()
    }
    scene.updateHud()
  }
}
