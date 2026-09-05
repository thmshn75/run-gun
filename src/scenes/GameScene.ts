import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS, STAT_COLORS, WORLD_COLORS } from '../config/colors'
import { Walls } from '../systems/walls'
import { VersuchBahnen, type BahnSystem } from '../systems/versuchBahnen'
import { getFassGateSchritte } from '../systems/versuchPlan'
import { Popups } from '../systems/popups'
import { Coins } from '../systems/coins'
import { ShopOverlay } from '../systems/shopOverlay'
import { selectChainLightningTargets } from '../systems/chainLightning'
import { Boss } from '../systems/boss'
import { Crowd } from '../systems/crowd'
import { getCrowdDamageMultiplier } from '../systems/crowdDamage'
import { getLevelPlan } from '../systems/levelPlan'
import { getRoadHalfWidth, Road } from '../systems/road'
import { getEnemySpeed, getScrollSpeed, setCurrentScrollSpeed } from '../systems/speed'
import { Scenery } from '../systems/scenery'
import { Bruecke } from '../systems/bruecke'
import { getWeltThema } from '../systems/weltThema'
import { readSafeAreaInsets, type SafeAreaInsets } from '../systems/safeArea'
import { addScore, createRunId, getMetaSteps, getOwnedWeapons, getWeaponFirepowerFactor, getWeaponSteps, loadSave, qualifiesForScores, writeSave, type SaveData } from '../systems/save'
import { Spawner } from '../systems/spawner'
import { getStartWeaponChoices, getWeaponRewardChoices } from '../systems/weaponChoices'
import { WeaponDetailPanel } from '../systems/weaponDetail'
import { getWeaponStars } from '../systems/weaponStars'
import { RunStats, type ShopLine, applyGoodGate, getStatCap, getShopPrice, getContinuePrice, isFirepowerMaxed } from '../systems/upgrades'
import { WEAPON_LABELS, Weapons, type WeaponKey, WEAPON_KEYS } from '../systems/weapons'
import { enableSharpText } from '../systems/textSharpness'

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
      // Gedeckelt, damit ein grosser Wirkradius nicht den ganzen Bildschirm weissblitzt
      // (Herleitung bei BALANCE.weapon.splashFlashMaxRadiusPx).
      const sichtbarerRadius = Math.min(radiusPx, BALANCE.weapon.splashFlashMaxRadiusPx)
      flash.image.setPosition(x, y).setScale((sichtbarerRadius * 2) / 32).setAlpha(1).setActive(true).setVisible(true)
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
  private bruecke!: Bruecke
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
  // Typ ist das INTERFACE, nicht die Klasse: Im Testgelaende kann hier der Bahnversuch
  // stehen (VersuchBahnen), im echten Run immer Walls. Siehe baueBahnen().
  private walls!: BahnSystem
  private popups!: Popups
  // Durchbrueche kosten Bruchteile einer Figur (enemy.breakthroughDamageFactor). Sie
  // werden hier gesammelt und erst bei einer vollen Figur eingeloest - sonst gaebe es
  // bei bis zu 6 Durchbruechen je Sekunde sechsmal eine Anzeige.
  private breakthroughAccumulator = 0
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
  /**
   * Kontostand aus dem Spielstand, im Speicher gehalten (2026-08-25, Thomas: "im Shop und
   * im Spiel werden aber 2 verschiedene Werte angezeigt wieso?").
   *
   * Das HUD zeigte bis dahin den RUN-Zaehler, das Menue den Kontostand - beides richtig,
   * nebeneinander aber wie ein Fehler: Nach einem Kauf im Laden standen 4.565 im Spiel
   * und 1.254 im Menue. Jetzt zeigt das HUD ueberall dasselbe, naemlich das gesamte
   * Vermoegen. Gecacht statt bei jeder Muenze aus dem Speicher gelesen: updateHud laeuft
   * bei jedem eingesammelten Stueck.
   */
  private kontoStand!: number
  /** In dieser Levelpause gekaufte Stufen je Knopf (shop.maxStepsPerPause). */
  private kaeufeInPause!: { firepower: number; team: number }
  /**
   * Womit ist der Spieler in DIESE Levelpause gekommen? Bleibt waehrend der ganzen Pause
   * waehlbar, auch nachdem er einmal gewechselt hat - sonst ist die Wahl eine
   * Einbahnstrasse (Thomas 2026-08-25).
   */
  private waffenwahlAusgang: WeaponKey | undefined
  private lastUnknownCombatOverlapWarningAtMs!: number
  private projectileEnemyCollider!: Phaser.Physics.Arcade.Collider
  private projectileBossCollider: Phaser.Physics.Arcade.Collider | undefined
  private projectileWallCollider: Phaser.Physics.Arcade.Collider | undefined
  private crowdBossCollider: Phaser.Physics.Arcade.Collider | undefined
  private crowdRewardCollider: Phaser.Physics.Arcade.Collider | undefined
  private crowdPickupCollider: Phaser.Physics.Arcade.Collider | undefined

  /** Wie dieser Run begonnen hat - frisch, fortgesetzt oder freigekauft. */
  private einstieg: 'neu' | 'fortsetzen' | 'weiterspielen' | 'test' = 'neu'
  private continuesUsed = 0

  /** Kennung des laufenden Runs - haelt seine Bestenlisten-Eintraege zusammen. */
  private runId = 0

  /**
   * Dauerhaft freigeschaltete Waffen aus dem Spielstand. Einmal beim Szenenstart
   * gelesen: Gekauft wird nur im Hauptmenue, waehrend eines Runs aendert sich das nicht.
   */
  private gekaufteWaffen: readonly string[] = []

  /**
   * Feuerkraft-Faktor der dauerhaften Aufruestung, je Waffe (2026-08-25). Einmal beim
   * Szenenstart gerechnet - aufgeruestet wird nur im Hauptmenue.
   *
   * ER GREIFT AM WAFFENSCHADEN AN, nicht an runStats: Der Deckel meta.totalBoostCap
   * sitzt auf damage und shotsPerSec und wuerde den Zugewinn beim Vielspieler
   * verschlucken. Herleitung bei BALANCE.meta.weaponSteps.
   */
  private waffenAufwertung: ReadonlyMap<string, number> = new Map()

  /** Knopf und Beschriftung des Testgelaendes. Leer in jedem normalen Lauf. */
  private testKnopf: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = []

  /** Die grosse Waffenansicht. Wird nur im Testgelaende geoeffnet. */
  private waffenAnsicht!: WeaponDetailPanel

  /** Im Menue gewaehlte Startwaffe eines neuen Laufs. Undefiniert heisst: Pistole. */
  private startwaffe: WeaponKey | undefined

  public constructor() {
    super('GameScene')
  }

  public init(data: Readonly<{
    einstieg?: 'neu' | 'fortsetzen' | 'weiterspielen' | 'test'
    /** Gewaehlte Startwaffe fuer einen NEUEN Lauf; ohne sie beginnt er mit der Pistole. */
    startwaffe?: WeaponKey
  }>): void {
    this.einstieg = data.einstieg ?? 'neu'
    this.startwaffe = data.startwaffe
  }

  public create(): void {
    enableSharpText(this)
    this.runStats = new RunStats()
    // MUSS VOR setLevel STEHEN: Die dauerhaften Aufwertungen heben die Deckel, und der
    // erste set()-Aufruf klemmt sonst noch gegen den Deckel ohne sie (E4, 2026-08-24).
    const gespeichert = loadSave()
    this.gekaufteWaffen = getOwnedWeapons(gespeichert)
    this.waffenAufwertung = new Map(WEAPON_KEYS.map((key) => [key, getWeaponFirepowerFactor(gespeichert, key)]))
    this.runStats.setMeta({
      firepower: getMetaSteps(gespeichert, 'firepower'),
      team: getMetaSteps(gespeichert, 'team'),
    })
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
    this.testKnopf = []
    this.elapsedMs = 0
    this.enemyContactIframeUntilMs = 0
    this.blinkUntilMs = 0
    this.nextBlinkAtMs = 0
    this.lastPointerX = null
    this.gameOverStarted = false
    this.gebuchteMuenzen = 0
    this.kontoStand = gespeichert.coins
    this.runId = createRunId()
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
    this.phaseRemainingMs = this.gegnerphaseMs()
    this.lastUnknownCombatOverlapWarningAtMs = -1000
    this.insets = readSafeAreaInsets(this.game.canvas)
    this.cameras.main.setBackgroundColor(WORLD_COLORS.background)
    this.road = new Road(this)
    this.scenery = new Scenery(this, () => Phaser.Math.RND.frac())
    this.bruecke = new Bruecke(this, () => Phaser.Math.RND.frac())
    this.crowd = new Crowd(this, this.scale.width / 2, this.scale.height - BALANCE.player.anchorBottomOffset)
    this.weapons = new Weapons(this, (maxPerSalvo) => this.crowd.getNextSalvoPositions(maxPerSalvo), this.runStats)
    this.spawner = new Spawner(this, this.runStats, () => this.crowd.getAnchorX(), (contactDamage) => this.handleBreakthrough(contactDamage))
    // Im Versuch kommen die Gegner von rechts - siehe Spawner.setVersuchsBahnen.
    this.spawner.setVersuchsBahnen(this.istTestgelaende())
    // DIE EINZIGE WEICHE DES VERSUCHS "ZWEI BAHNEN" (Thomas 2026-09-05: "wenn wir etwas
    // versuchen, dann NUR im Testgelaende, dort testen wir bis ich mein Go gebe").
    // Ausserhalb des Testgelaendes wird VersuchBahnen nie gebaut, und der echte Run
    // laeuft Zeile fuer Zeile wie zuvor.
    if (this.istTestgelaende()) {
      this.walls = this.baueVersuchsBahnen()
    } else {
      this.walls = new Walls(
        this,
        (currentWeapon) => this.spawner.chooseWallWeapon(currentWeapon, this.gekaufteWaffen),
        () => this.weapons.getWeapon(),
        () => getWeaponRewardChoices(this.weapons.getWeapon(), this.currentLevel, this.gekaufteWaffen).length > 0,
        () => this.runStats.get('hp'),
        () => this.runStats.get('damage'),
        () => this.runStats.get('shotsPerSec'),
        () => Phaser.Math.RND.frac(),
        (x, y) => this.dropCoins(x, y, BALANCE.walls.coinReward),
        (apply) => {
          const before = this.runStats.get('hp')
          const after = apply(before)
          this.runStats.set('hp', after)
          // Quittung auf die eigene Handlung: ohne sie wuchs die Truppe unbemerkt.
          const delta = Math.round(after - before)
          if (delta !== 0) {
            this.popups.spawn(
              this.crowd.getAnchorX(),
              this.crowd.getAnchorY() - this.crowd.getFigureHeight(),
              `${delta > 0 ? '+' : ''}${delta}`,
              delta > 0 ? '#3ddc84' : '#ff6b6b',
            )
          }
          this.updateHud()
        },
        // BLAUES Tor: eigener Wert, sonst der andere, sonst Muenzen (2026-08-28).
        // Der Deckel ist absichtlich nicht angehoben - er ist gemessen und liegt dicht am
        // Kipppunkt (Herleitung bei BALANCE.enemy.endlessHpGrowthPerLevel). Geaendert ist
        // nur, was mit einem Tor passiert, das nichts mehr zu heben findet: Ab Level 13
        // waren das praktisch alle, und sie verpufften wortlos.
        (stat, x, y) => {
          const ergebnis = applyGoodGate(this.runStats, stat === 'damage' ? 'damage' : 'shotsPerSec')
          if (ergebnis.stat === undefined) {
            // UEBERLAUF. Muenzen fallen an der Kachel, nicht an der Truppe - sie sollen
            // wie jeder andere Wandfund eingesammelt werden.
            this.dropCoins(x, y, BALANCE.walls.maxedCoinBonus)
            this.popups.spawn(
              this.crowd.getAnchorX(),
              this.crowd.getAnchorY() - this.crowd.getFigureHeight(),
              `MAX +${BALANCE.walls.maxedCoinBonus} ¢`,
              '#ffd166',
            )
          } else {
            // Zwei Nachkommastellen: Ein Tor bewegt den Schaden um 0,015 bis 0,06, mit
            // einer Stelle waere jeder zweite Fund als "+0" quittiert worden.
            const delta = Math.round((ergebnis.after - ergebnis.before) * 100) / 100
            this.popups.spawn(
              this.crowd.getAnchorX(),
              this.crowd.getAnchorY() - this.crowd.getFigureHeight(),
              // Der Pfeil sagt, dass das Tor umgeleitet wurde: Wer ein RATE-Tor
              // zerschiesst und "DMG" gutgeschrieben bekommt, soll das nicht fuer einen
              // Anzeigefehler halten.
              `${ergebnis.redirected ? '\u2192 ' : ''}${ergebnis.stat === 'damage' ? 'DMG' : 'RATE'} +${delta}`,
              '#ffd166',
            )
          }
          this.updateHud()
        },
        // ROTE Kachel: Abzug am eigenen Wert, nach unten bremst der Run-Startwert.
        (stat, faktor) => {
          const key = stat === 'damage' ? 'damage' : 'shotsPerSec'
          const before = this.runStats.get(key)
          this.runStats.set(key, Math.max(this.statFloor[key], before * faktor))
          const after = this.runStats.get(key)
          if (after !== before) {
            const delta = Math.round((after - before) * 100) / 100
            this.popups.spawn(
              this.crowd.getAnchorX(),
              this.crowd.getAnchorY() - this.crowd.getFigureHeight(),
              `${stat === 'damage' ? 'DMG' : 'RATE'} ${delta}`,
              '#ff6b6b',
            )
          }
          this.updateHud()
        },
        () => isFirepowerMaxed(this.runStats),
      )
    }
    this.popups = new Popups(this)
    this.waffenAnsicht = new WeaponDetailPanel(this)
    this.shop = new ShopOverlay(
      this,
      this.insets,
      (line) => this.kaufeStufe(line),
      () => this.verlasseShop(),
      () => this.speichernUndBeenden(),
      (weapon) => this.waehleWaffe(weapon),
    )
    this.crowd.setWallPresenceProvider((y, halfSpan) => this.walls.getWallPresence(y, halfSpan))
    this.boss = new Boss(
      this,
      () => this.spawner.allocateSpawnId(),
      // Aus dem PLAN, nicht aus BALANCE: Der Elite-Boss hebt diesen Wert (E7). Wer hier
      // den festen Wert liest, bekommt still den gewoehnlichen Begleiterdruck.
      (size) => this.spawner.requestBossHorde(size, this.boss.getMaxActiveCalled()),
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
    if (this.istTestgelaende()) this.baueTestgelaendeKnopf()
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
    // Kulisse zum Schluss, wenn die Levelnummer endgueltig feststeht. Sie MUSS auch hier
    // stehen und nicht nur in startLevel: Beim Einstieg 'neu' wird startLevel bewusst
    // nicht aufgerufen (siehe stelleEinstiegHer), Level 1 bekaeme sonst gar kein Thema
    // gesetzt und saehe nur deshalb richtig aus, weil die Stadt der Ausgangszustand ist.
    this.setzeWeltThema()
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
    this.bruecke.update(dt)
    this.crowd.update(dt)
    this.updateLevelPhase(dt)
    this.aktualisiereTestgelaendeKnopf()
    this.weapons.update(dt)
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
    if (this.istTestgelaende()) {
      // Feste Buehne statt Level 1: Dort ist der Gegnernachschub der Engpass, nicht die
      // Feuerkraft - zwei Waffen sehen dann gleich aus (gemessen 2026-08-25).
      this.currentLevel = BALANCE.testground.level
      this.runStats.setLevel(this.currentLevel)
      this.runStats.set('hp', BALANCE.testground.truppe)
      this.startLevel()
      this.syncCrowdSize()
      return
    }
    if (this.einstieg === 'neu') {
      // Mit der im Menue gewaehlten Waffe starten (2026-08-26). Sie ist dort auf die
      // gekauften begrenzt worden - hier wird nur uebernommen, was ankam.
      if (this.startwaffe !== undefined && this.gekaufteWaffen.includes(this.startwaffe)) {
        this.equipWeapon(this.startwaffe)
      }
      // Auch der frische Run wird sofort gesichert. Vorher lief sichereRun() nur in
      // startLevel(), und das wird beim ERSTEN Level gar nicht aufgerufen - wer Level 1
      // spielte und aufhoerte, hatte keinen Punkt zum Fortsetzen.
      this.sichereRun()
      return
    }
    const snapshot = loadSave().run
    if (snapshot === undefined) {
      this.einstieg = 'neu'
      return
    }
    this.currentLevel = Math.max(1, Math.floor(snapshot.level))
    // Ein fortgesetzter Run behaelt seine Kennung, damit sein Bestenlisten-Eintrag beim
    // naechsten Beenden ersetzt statt verdoppelt wird. Ein V3-Spielstand hat keine -
    // dann bleibt die frisch erzeugte stehen.
    if (snapshot.runId !== undefined) this.runId = snapshot.runId
    this.continuesUsed = snapshot.continuesUsed
    this.gebuchteMuenzen = snapshot.bookedCoins
    // Kontostand beim Fortsetzen neu einlesen: Zwischen Beenden und Weiterspielen kann im
    // Menue gekauft worden sein.
    this.kontoStand = loadSave().coins
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
        getStatCap('hp', this.currentLevel, this.runStats.getSteps(), this.runStats.getMeta()) * BALANCE.continueRun.teamShareOnContinue,
      )))
    } else {
      this.runStats.set('hp', snapshot.hp)
    }
    this.startLevel()
    this.syncCrowdSize()
  }

  /**
   * Der einzige zusaetzliche Knopf des Testgelaendes: Er oeffnet die vorhandene
   * Levelpause, in der alle dreizehn Waffen als Kacheln stehen.
   *
   * WARUM KEINE EIGENE WAFFENLEISTE: Die Pause kann das bereits, samt gerechneter Lage
   * an beiden Safe-Area-Raendern (shopWeaponRow.ts). Eine zweite Leiste waere eine
   * zweite Stelle, an der dieselbe iPhone-Falle aufschlaegt (Lektion 2026-08-25).
   *
   * ER VERREISST DIE TRUPPE NICHT: Die Steuerung ist relativ - sie zieht die Truppe um
   * die BEWEGUNG des Fingers, ein Tipp allein bewegt nichts.
   */
  private baueTestgelaendeKnopf(): void {
    const y = this.insets.top + BALANCE.hud.padding + BALANCE.hud.panelHeight + 24
    const mitte = this.scale.width / 2
    const knopf = this.add.rectangle(mitte, y, 210, 38, HUD_COLORS.panel, 0.92)
      .setStrokeStyle(2, HUD_COLORS.panelStroke)
      .setDepth(BALANCE.hud.depthText + 1)
      .setInteractive({ useHandCursor: true })
    const text = this.add.text(mitte, y, 'WAFFE WECHSELN', {
      fontFamily: 'system-ui', fontSize: '15px', fontStyle: 'bold', color: this.colorFor(HUD_COLORS.level),
    }).setOrigin(0.5).setDepth(BALANCE.hud.depthText + 2)
    knopf.on('pointerdown', () => {
      if (this.levelPhase !== 'normal') return
      this.oeffneShop()
    })
    this.testKnopf = [knopf, text]
  }

  /**
   * Der Knopf gehoert nur in die Gegnerphase: In der Pause stehen die Kacheln selbst da,
   * und waehrend der Bosswarnung oder des Bosskampfs waere er ein sichtbares Tippziel,
   * das nichts tut. An die PHASE gehaengt statt an einzelne Aufrufstellen - sonst fehlt
   * beim naechsten neuen Phasenuebergang wieder einer.
   */
  private aktualisiereTestgelaendeKnopf(): void {
    if (this.testKnopf.length === 0) return
    const soll = this.levelPhase === 'normal'
    if (this.testKnopf[0].visible === soll) return
    this.testKnopf.forEach((teil) => teil.setVisible(soll))
  }

  /**
   * Wie lange die Gegnerphase dauert, bevor die Bosswarnung kommt.
   *
   * Im Testgelaende ist sie fest und kurz (Thomas 2026-08-26: "es darf nicht so lange
   * dauern wie ein normales Level, maximal die Haelfte"). Gerechnet wird der Wert in
   * BALANCE.testground.normalPhaseSec - gekuerzt wird die GEGNERPHASE, nie der
   * Bosskampf: Ein gekuerzter Bosskampf waere kein Bosstest mehr.
   */
  private gegnerphaseMs(): number {
    // Waehrend der Versuch "Zwei Bahnen" laeuft, gilt seine eigene, laengere Dauer:
    // 20 s sind auf den Waffenvergleich gerechnet und tragen kein Bahnurteil (rund
    // fuenf Tore und vier Faesser). BALANCE.testground.normalPhaseSec bleibt dabei
    // unangetastet - endet der Versuch, gilt die abgenommene halbe Laenge sofort wieder.
    return this.istTestgelaende()
      ? BALANCE.versuch.gegnerphaseSec * 1000
      : getLevelPlan(this.currentLevel).normalPhaseSec * 1000
  }

  /** Laeuft diese Szene als Testgelaende? Dann gilt nichts davon fuer den echten Stand. */
  private istTestgelaende(): boolean {
    return this.einstieg === 'test'
  }

  /**
   * Der Bahnversuch. Wird NUR aus der einen Weiche in create() heraus gebaut - im echten
   * Run existiert diese Klasse zur Laufzeit nicht.
   *
   * Die beiden Rueckmeldungen an den Spieler sind bewusst dieselben wie bei den Waenden:
   * Truppenaenderung und Aufruestung erscheinen als Quittung ueber der Truppe, sonst
   * waere im Versuch nicht zu sehen, was ein Tor oder ein Fass gebracht hat.
   */
  private baueVersuchsBahnen(): BahnSystem {
    return new VersuchBahnen(
      this,
      () => this.runStats.get('hp'),
      () => this.runStats.get('shotsPerSec'),
      // Der Truppendeckel dieses Levels. Die Tore bemessen ihren Ertrag am Restweg
      // dorthin, statt an einem Anteil der Truppe - sonst waeren sie nach zwei Toren am
      // Anschlag und danach nur noch Strafe (Oekonomie-Befund 2026-09-05).
      () => getStatCap('hp', this.currentLevel, this.runStats.getSteps(), this.runStats.getMeta()),
      () => Phaser.Math.RND.frac(),
      (apply) => {
        const before = this.runStats.get('hp')
        const after = apply(before)
        this.runStats.set('hp', after)
        const delta = Math.round(after - before)
        if (delta !== 0) {
          this.popups.spawn(
            this.crowd.getAnchorX(),
            this.crowd.getAnchorY() - this.crowd.getFigureHeight(),
            `${delta > 0 ? '+' : ''}${delta}`,
            delta > 0 ? '#3ddc84' : '#ff6b6b',
          )
        }
        this.syncCrowdSize()
        this.updateHud()
      },
      // WIE VIEL EIN FASS AUFRUESTET, gerechnet am Restweg bis zum Wertdeckel: Ein Fass
      // schliesst immer denselben Anteil der verbleibenden Luecke und bleibt deshalb bis
      // zum Levelende wertvoll. Mit fester Schrittzahl war die Feuerkraft nach 12 bis 56
      // Faessern ausgereizt und die linke Bahn danach wertlos (Befund 2026-09-05).
      //
      // Umgesetzt bleibt es als wiederholter TORSCHRITT: So gilt im Versuch dieselbe
      // Deckel- und Umleitungslogik wie im echten Run, und ein ausgereiztes Fass wirft
      // wie ein ausgereiztes Tor Muenzen ab.
      (stat, x, y) => {
        const key = stat === 'damage' ? 'damage' : 'shotsPerSec'
        const schritte = getFassGateSchritte(
          key,
          this.runStats.get(key),
          getStatCap(key, this.currentLevel, this.runStats.getSteps(), this.runStats.getMeta()),
        )
        let summe = 0
        let umgeleitet = false
        let ziel: 'damage' | 'shotsPerSec' | undefined
        for (let i = 0; i < schritte; i += 1) {
          const ergebnis = applyGoodGate(this.runStats, key)
          if (ergebnis.stat === undefined) {
            this.dropCoins(x, y, BALANCE.walls.maxedCoinBonus)
            continue
          }
          summe += ergebnis.after - ergebnis.before
          umgeleitet = umgeleitet || ergebnis.redirected
          ziel = ergebnis.stat
        }
        if (ziel === undefined) return this.updateHud()
        const delta = Math.round(summe * 100) / 100
        this.popups.spawn(
          this.crowd.getAnchorX(),
          this.crowd.getAnchorY() - this.crowd.getFigureHeight(),
          `${umgeleitet ? '\u2192 ' : ''}${ziel === 'damage' ? 'DMG' : 'RATE'} +${delta}`,
          '#ffd166',
        )
        this.updateHud()
      },
    )
  }

  /**
   * DER EINZIGE SCHREIBWEG DIESER SZENE IN DEN SPIELSTAND.
   *
   * Im Testgelaende schreibt sie NICHTS - kein Run, keine Muenzen, kein Hoechstlevel,
   * kein Bestenlisten-Eintrag. Deshalb steht der Waechter an EINER Stelle statt an
   * sechs: Wer spaeter ein writeSave dazuschreibt, muss an dieser Methode vorbei, und
   * ein vergessener Pfad wuerde Bennis echten Lauf ueberschreiben, weil er ein bisschen
   * ausprobiert hat.
   */
  private speichere(data: SaveData): void {
    if (this.istTestgelaende()) return
    writeSave(data)
  }

  /**
   * Den offenen Run an der LEVELGRENZE sichern. Nur hier, nicht mitten im Level: Dort
   * muessten Gegner im Anflug, Wandkette und Bossphase mitgeschrieben werden.
   */
  private sichereRun(): void {
    const saved = loadSave()
    const stufen = this.runStats.getSteps()
    this.speichere({
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
        runId: this.runId,
      },
    })
  }

  /** Aufruestungsfaktor dieser Waffe. 1, solange nichts gekauft ist. */
  private aufwertung(weapon: WeaponKey): number {
    return this.waffenAufwertung.get(weapon) ?? 1
  }

  private handleProjectileHit(projectile: Phaser.Physics.Arcade.Image, enemy: Phaser.Physics.Arcade.Image): void {
    if (!projectile.active || !enemy.active) return
    const weapon = projectile.getData('weapon') as WeaponKey
    const config = this.weapons.getWeaponConfig(weapon)
    const damage = this.runStats.get('damage') * this.getCrowdDamageMultiplier() * config.damageFactor * this.aufwertung(weapon)
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
      const splashDamage = this.runStats.get('damage') * this.getCrowdDamageMultiplier() * config.splashDamageFactor * this.aufwertung(weapon)
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
    const damage = this.runStats.get('damage') * this.getCrowdDamageMultiplier() * config.damageFactor * this.aufwertung(weapon)
    if (config.pierces) {
      const hitSpawnIds = projectile.getData('hitSpawnIds') as Set<number>
      const spawnId = wall.getData('spawnId') as number
      if (hitSpawnIds.has(spawnId)) return
      hitSpawnIds.add(spawnId)
      this.walls.damage(wall, damage)
      return
    }
    const impactX = wall.x
    const impactY = wall.y
    this.walls.damage(wall, damage)
    if (config.splashRadiusPx > 0) {
      const radiusSquared = config.splashRadiusPx * config.splashRadiusPx
      const splashDamage = this.runStats.get('damage') * this.getCrowdDamageMultiplier() * config.splashDamageFactor * this.aufwertung(weapon)
      for (const child of this.walls.getWalls().getChildren()) {
        const candidate = child as Phaser.Physics.Arcade.Image
        const dx = candidate.x - impactX
        const dy = candidate.y - impactY
        if (candidate.active && dx * dx + dy * dy <= radiusSquared) this.walls.damage(candidate, splashDamage)
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
    this.dropCoins(enemyX, enemyY, coinValue)
    if (this.boss.isEnemy(enemy)) this.handleBossDefeated()
  }

  private dropCoins(x: number, y: number, value: number): void {
    // Im Testgelaende faellt nichts (Thomas 2026-08-26: "im testgelaende verdient man
    // keine Muenzen"). Aufs Konto kamen sie ohnehin nie - der Zaehler lief aber hoch und
    // versprach damit einen Verdienst, den es nicht gab.
    if (this.istTestgelaende()) return
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
   * dieselbe wie beim Verlust an einer roten Wandkachel: eine rote Zahl ueber der
   * Truppe.
   */
  private handleBreakthrough(contactDamage: number): void {
    if (this.gameOverStarted || this.istTestgelaende()) return
    this.breakthroughAccumulator += contactDamage * BALANCE.enemy.breakthroughDamageFactor
    const figuren = Math.floor(this.breakthroughAccumulator)
    if (figuren < 1) return
    this.breakthroughAccumulator -= figuren
    const before = this.runStats.get('hp')
    this.runStats.set('hp', before - figuren)
    this.syncCrowdSize()
    const delta = Math.round(this.runStats.get('hp') - before)
    if (delta !== 0) {
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
    // Im Testgelaende kostet nichts etwas: Wer eine Waffe ausprobiert, soll dabei nicht
    // sterben - sonst probiert er die naechste gar nicht mehr aus.
    if (this.istTestgelaende()) return
    this.runStats.set('hp', this.runStats.get('hp') - damage)
    this.syncCrowdSize()
    // Seit V2 gibt es nur noch eine Schadensquelle: Beruehrung. Der Boss schiesst nicht mehr.
    const iframeMs = BALANCE.player.iframesMs
    this.enemyContactIframeUntilMs = this.elapsedMs + iframeMs
    this.blinkUntilMs = Math.max(this.blinkUntilMs, this.elapsedMs + iframeMs)
    this.nextBlinkAtMs = this.elapsedMs
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
    const withScore = addScore(saved, { coins: runCoins, level: this.currentLevel, timeMs: this.elapsedMs, runId: this.runId })
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
    this.speichere({
      ...withScore,
      coins: konto,
      highestLevel: Math.max(withScore.highestLevel, this.currentLevel),
      run: weiterMoeglich
        ? {
          // DER TODES-MARKER (2026-08-25): Ohne ihn sah dieser Run im Menue aus wie ein
          // an der Levelgrenze gesicherter, wurde dort kostenlos als FORTSETZEN
          // angeboten und startete mit hp = 0 sofort wieder im Game Over.
          gestorben: true as const,
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
      // Der Preis geht auch dann mit, wenn das Konto nicht reicht: Der Knopf zeigt dann
      // "NOCH ¢ X", statt spurlos zu verschwinden (2026-08-25).
      weiterspielenPreis: weiterMoeglich ? preis : undefined,
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
    // IM TESTGELAENDE BLEIBT DAS LEVEL STEHEN (2026-08-26): Es ist eine Buehne, kein
    // Fortschritt. Sonst waere jede weitere Runde schwerer als die davor, und der
    // Vergleich zweier Waffen liefe gegen unterschiedliche Gegner.
    if (!this.istTestgelaende()) this.currentLevel += 1
    const saved = loadSave()
    this.speichere({ ...saved, highestLevel: Math.max(saved.highestLevel, this.currentLevel) })
    this.levelPhase = 'cleared'
    this.syncBossColliders()
    this.phaseRemainingMs = BALANCE.level.clearedMs
    this.levelOverlayBackground.setVisible(true)
    this.levelOverlay.setText(this.istTestgelaende() ? 'BOSS GESCHAFFT' : `LEVEL ${this.currentLevel - 1} GESCHAFFT`).setVisible(true)
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
    this.kontoStand = saved.coins + offen
    this.speichere({ ...saved, coins: this.kontoStand })
    return offen
  }

  private oeffneShop(): void {
    this.levelPhase = 'shop'
    this.kaeufeInPause = { firepower: 0, team: 0 }
    this.waffenwahlAusgang = this.weapons.getWeapon()
    this.bucheMuenzenAufsKonto()
    // SOFORT sichern, nicht erst beim Weitergehen (Thomas 2026-08-23: "wenn ich ein
    // Level fertig habe muss ich erst ein neues anfangen, damit der Stand gespeichert
    // wird"). Beim Betreten des Shops ist currentLevel bereits hochgezaehlt - das
    // geschaffte Level ist damit in dem Moment gesichert, in dem es geschafft ist.
    this.sichereRun()
    this.levelOverlayBackground.setVisible(false)
    this.levelOverlay.setVisible(false)
    this.shop.zeigen(this.shopZustand())
  }

  private shopZustand() {
    return {
      testgelaende: this.istTestgelaende(),
      level: this.currentLevel - 1,
      konto: this.kontoStand,
      waffen: this.waehlbareWaffen(),
      stufen: this.runStats.getSteps(),
      inDieserPause: { firepower: this.kaeufeInPause.firepower, team: this.kaeufeInPause.team },
      werte: {
        damage: this.runStats.get('damage'),
        shotsPerSec: this.runStats.get('shotsPerSec'),
        hp: getStatCap('hp', this.currentLevel, this.runStats.getSteps(), this.runStats.getMeta()),
      },
    }
  }

  /**
   * Womit darf der Spieler ins naechste Level starten? (Thomas 2026-08-25: "wenn einmal
   * gekauft soll er vor jedem level auswaehlen koennen, mit welcher er startet")
   *
   * Die Regel steht in getStartWeaponChoices, weil das Menue vor dem FORTSETZEN dieselbe
   * braucht. Hier kommt nur dazu, WOMIT die Pause begonnen hat: Diese Waffe bleibt bis
   * zum WEITER waehlbar, damit man beliebig hin und her wechseln kann. Ohne sie fiele
   * eine im Lauf gefundene Waffe beim ersten Wechsel aus der Liste und waere verloren.
   */
  private waehlbareWaffen(): { key: string; aktiv: boolean }[] {
    const getragen = this.weapons.getWeapon()
    // Im Testgelaende sind ALLE Waffen waehlbar, gekauft oder nicht - genau dafuer ist
    // es da (Benni: "wo man alle waffen einzeln ausprobieren kann").
    const stand = loadSave()
    if (this.istTestgelaende()) {
      return WEAPON_KEYS.map((key) => ({
        key, aktiv: key === getragen, sterne: this.sterneFuer(key, stand), stufen: getWeaponSteps(stand, key),
      }))
    }
    const behalten = this.waffenwahlAusgang === undefined ? [] : [this.waffenwahlAusgang]
    return getStartWeaponChoices(getragen, this.currentLevel, getOwnedWeapons(stand), behalten)
      .map((key) => ({
        key, aktiv: key === getragen, sterne: this.sterneFuer(key, stand), stufen: getWeaponSteps(stand, key),
      }))
  }

  /** Staerke in Sternen (1-5), mit der dauerhaften Aufruestung dieser Waffe. */
  private sterneFuer(weapon: WeaponKey, stand: SaveData): number {
    return getWeaponStars(weapon, getWeaponFirepowerFactor(stand, weapon))
  }

  private waehleWaffe(weapon: string): void {
    if (this.levelPhase !== 'shop') return
    if (!WEAPON_KEYS.includes(weapon as WeaponKey)) return
    if (!this.waehlbareWaffen().some((eintrag) => eintrag.key === weapon)) return
    // IM TESTGELAENDE ERST ANSEHEN, DANN WAEHLEN (Thomas 2026-08-26: "man weiss nicht
    // wirklich welche waffe es ist ... damit man sich die waffen auch ansehen kann").
    // Im echten Lauf bleibt der Sofortwechsel: Dort kennt man seine Waffen laengst, und
    // ein Zwischenschritt vor jedem Level waere nur ein Tipp mehr.
    if (this.istTestgelaende()) {
      this.zeigeWaffenAnsicht(weapon as WeaponKey)
      return
    }
    this.uebernehmeWaffe(weapon as WeaponKey)
  }

  /** Die grosse Ansicht einer Waffe - nur im Testgelaende. */
  private zeigeWaffenAnsicht(weapon: WeaponKey): void {
    this.waffenAnsicht.zeigen(
      weapon,
      this.insets,
      this.aufwertung(weapon),
      getWeaponSteps(loadSave(), weapon),
      BALANCE.meta.weaponSteps,
      () => {
        this.waffenAnsicht.verstecken()
        this.uebernehmeWaffe(weapon)
      },
      () => { this.waffenAnsicht.verstecken() },
    )
  }

  private uebernehmeWaffe(weapon: WeaponKey): void {
    this.equipWeapon(weapon)
    // Sofort sichern: Der Spielstand wurde beim OEFFNEN der Pause geschrieben, also vor
    // der Wahl. Ohne das ginge sie verloren, wenn die App zwischen Wahl und WEITER
    // weggewischt wird.
    this.sichereRun()
    this.shop.aktualisieren(this.shopZustand())
    this.updateHud()
  }

  private kaufeStufe(line: ShopLine): void {
    if (this.levelPhase !== 'shop') return
    // IM TESTGELAENDE KOSTENLOS UND OHNE DECKEL: Man soll eine Waffe auch mit mehr
    // Feuerkraft ausprobieren koennen. Wuerde hier echtes Geld abgezogen, saehe Benni
    // sein Konto sinken - zurueckgeschrieben wird es zwar nie (der Waechter in
    // speichere() laesst nichts durch), aber die Anzeige waere trotzdem eine Luege.
    if (this.istTestgelaende()) {
      if (!this.runStats.addStep(line)) return
      this.shop.aktualisieren(this.shopZustand())
      this.syncCrowdSize()
      this.updateHud()
      return
    }
    if (this.kaeufeInPause[line] >= BALANCE.shop.maxStepsPerPause) return
    const preis = getShopPrice(this.runStats.getStepCount(line))
    if (preis === undefined) return
    const saved = loadSave()
    if (saved.coins < preis) return
    if (!this.runStats.addStep(line)) return
    this.kontoStand = saved.coins - preis
    this.speichere({ ...saved, coins: this.kontoStand })
    this.kaeufeInPause[line] += 1
    this.shop.aktualisieren(this.shopZustand())
    this.syncCrowdSize()
    this.updateHud()
  }

  private verlasseShop(): void {
    if (this.levelPhase !== 'shop') return
    this.waffenwahlAusgang = undefined
    // Sonst laege die Waffenansicht ueber dem laufenden Spiel: WEITER ist auch dann
    // erreichbar, wenn sie offen ist - ihre Wand deckt nicht den ganzen Bildschirm ab.
    this.waffenAnsicht.verstecken()
    this.shop.verstecken()
    this.startLevel()
  }

  /**
   * Bewusst aufhoeren (Thomas 2026-08-23: "es gibt nicht die Moeglichkeit selbst zu
   * speichern?"). Der Stand liegt beim Betreten des Shops bereits vollstaendig im
   * Spielstand - dieser Knopf geht deshalb nur zurueck ins Menue. Er ist trotzdem
   * wichtig: Ohne ihn muesste man die App wegwischen und wuesste nie, ob gespeichert
   * wurde.
   */
  private speichernUndBeenden(): void {
    if (this.levelPhase !== 'shop') return
    // Im Testgelaende ist derselbe Knopf mit ZURUECK INS MENUE beschriftet und laesst
    // den Spielstand unberuehrt - beide Aufrufe wuerden zwar am Waechter abprallen, aber
    // ein Bestenlisten-Eintrag fuer ein Ausprobieren waere auch als Absicht falsch.
    if (this.istTestgelaende()) {
      this.waffenAnsicht.verstecken()
      this.shop.verstecken()
      this.scene.start('MenuScene')
      return
    }
    this.sichereRun()
    this.trageZwischenstandEin()
    this.shop.verstecken()
    this.scene.start('MenuScene')
  }

  /**
   * Der Zwischenstand zaehlt fuer die Bestenliste (E1, 2026-08-24).
   *
   * Ohne das bliebe der Endlosmodus unbelohnt: Ein Eintrag entstand bisher NUR beim Game
   * Over. Bei rund 80 Sekunden je Level sind dreissig Level etwa vierzig Minuten reine
   * Spielzeit - fuer einen Siebenjaehrigen mehrere Abende, die er dank Fortsetzen auch
   * so spielt. Wer ueber Wochen immer weiterkommt und nie stirbt, tauchte in der Liste
   * nie auf.
   *
   * Der Eintrag traegt die Run-Kennung und ERSETZT deshalb den vorigen Zwischenstand
   * desselben Runs, statt die Zehnerliste mit lauter schlechteren Fassungen zu fuellen
   * (addScore in save.ts).
   */
  private trageZwischenstandEin(): void {
    const runCoins = this.coins.getCount()
    const saved = loadSave()
    this.speichere(addScore(saved, {
      coins: runCoins,
      level: this.currentLevel,
      timeMs: this.elapsedMs,
      runId: this.runId,
    }))
  }

  /**
   * Kulisse des laufenden Levels (2026-09-03). Steht in startLevel, nicht in create:
   * Bei 'wechsel' aendert sich das Thema mit der Levelnummer, und create laeuft nur
   * einmal je Run. Der Spielablauf bleibt unberuehrt - es wechselt nur, was man sieht.
   */
  private setzeWeltThema(): void {
    const thema = getWeltThema(this.currentLevel, this.istTestgelaende())
    this.road.setThema(thema)
    this.scenery.setAktiv(thema === 'stadt')
    this.bruecke.setAktiv(thema === 'bruecke')
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
    this.phaseRemainingMs = this.gegnerphaseMs()
    this.levelOverlayBackground.setVisible(false)
    this.levelOverlay.setVisible(false)
    this.spawner.resetForLevel(this.currentLevel)
    this.walls.resetForLevel(this.currentLevel)
    this.setzeWeltThema()

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
    // ZWEI NACHKOMMASTELLEN seit 2026-08-25: Die Tore der rechten Wand heben um 0,88 %
    // bzw. 0,47 % je Stueck (BALANCE.walls.gatesPerLevelStep) - bei einer Stelle stand
    // die Zahl nach jedem zweiten Fund unveraendert da und das Sammeln wirkte folgenlos.
    const damage = this.runStats.get('damage').toFixed(2)
    const shotsPerSec = this.runStats.get('shotsPerSec').toFixed(2)
    this.hud.hp.setText(`TEAM ${this.runStats.get('hp')}`)
    // GESAMTVERMOEGEN, nicht der Run-Zaehler: Konto plus das, was seit der letzten
    // Buchung dazugekommen ist (Herleitung bei kontoStand).
    this.hud.coins.setText(`¢ ${this.kontoStand + Math.max(0, this.coins.getCount() - this.gebuchteMuenzen)}`)
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
