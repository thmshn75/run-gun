import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { getBossPhase, getBossPlan, type BossPlan } from './bossPlan'
import { getPerspectiveScale } from './road'
import { getRoadHalfWidth } from './roadGeometry'
import type { WeaponKey } from './weapons'

export class Boss {
  private readonly scene: Phaser.Scene
  private readonly enemy: Phaser.Physics.Arcade.Image
  private readonly shadow: Phaser.GameObjects.Image
  private readonly nextSpawnId: () => number
  private readonly requestBossHorde: (size: number) => number
  private readonly getAnchorY: () => number
  private plan: BossPlan | undefined
  private fightElapsedMs: number

  /** Laufzeit fuer das seitliche Pendeln des Elite-Bosses. */
  private swingElapsedMs = 0
  private hordeAccumulatorMs: number
  private approaching: boolean
  private phaseTwoStarted: boolean
  private phaseFlashRemainingMs: number

  public constructor(
    scene: Phaser.Scene,
    nextSpawnId: () => number,
    requestBossHorde: (size: number) => number,
    getAnchorY: () => number,
  ) {
    this.scene = scene
    this.nextSpawnId = nextSpawnId
    this.requestBossHorde = requestBossHorde
    this.getAnchorY = getAnchorY
    this.enemy = scene.physics.add.image(0, 0, 'enemy-boss').setDepth(BALANCE.layers.gameplay)
    this.enemy.setActive(false).setVisible(false)
    this.enemy.disableBody(true, true)
    this.shadow = scene.add.image(0, 0, 'figure-shadow')
      .setDepth(BALANCE.layers.shadow)
      .setAlpha(BALANCE.shadow.alpha)
      .setVisible(false)
    this.plan = undefined
    this.fightElapsedMs = 0
    this.hordeAccumulatorMs = 0
    this.approaching = false
    this.phaseTwoStarted = false
    this.phaseFlashRemainingMs = 0
  }

  public getEnemy(): Phaser.Physics.Arcade.Image {
    return this.enemy
  }

  public isEnemy(enemy: Phaser.Physics.Arcade.Image): boolean {
    return enemy === this.enemy
  }

  /**
   * Wie viele gerufene Begleiter gleichzeitig aktiv sein duerfen. Kommt aus dem Plan,
   * weil der Elite-Boss ihn anhebt - ein fester Wert an der Aufrufstelle wuerde den
   * Elite-Aufschlag still verschlucken.
   */
  public getMaxActiveCalled(): number {
    return this.plan?.maxActiveCalled ?? BALANCE.boss.hordePressure.maxActiveCalled
  }

  public activate(level: number, teamSize: number, weapon: WeaponKey, damage: number, rate: number): void {
    const y = BALANCE.road.horizonY
    this.plan = getBossPlan(level, teamSize, weapon, damage, rate)
    this.fightElapsedMs = 0
    this.swingElapsedMs = 0
    // Die erste Horde soll nicht sofort im Anmarsch stehen: Der Kampf beginnt mit dem
    // Boss allein, der Zaehler startet bei null und laeuft erst ab dem Kampfbeginn.
    this.hordeAccumulatorMs = 0
    this.approaching = true
    this.phaseTwoStarted = false
    this.phaseFlashRemainingMs = 0
    // Eigenes Bild fuer den Elite-Boss - er soll auf den ersten Blick als anderer
    // Gegner lesbar sein, nicht als groesserer derselbe.
    this.enemy.setTexture(this.plan.elite ? 'enemy-boss-elite' : 'enemy-boss')
    this.swingElapsedMs = 0
    this.enemy.enableBody(true, this.scene.scale.width / 2, y, true, true)
    this.enemy.setActive(true).setVisible(true).setAlpha(0).clearTint()
    const body = this.enemy.body as Phaser.Physics.Arcade.Body
    // Texturpixel: Arcade zieht den Koerper mit der perspektivischen Skalierung mit.
    body.setSize(BALANCE.boss.bodyWidth, BALANCE.boss.bodyHeight, true)
    body.moves = false
    this.applyPerspectiveScale()
    body.updateFromGameObject()
    this.enemy.setData('hp', this.plan.maxHp)
    this.enemy.setData('maxHp', this.plan.maxHp)
    this.enemy.setData('contactDamage', 0)
    this.enemy.setData('coinValue', BALANCE.boss.coinReward)
    this.enemy.setData('spawnId', this.nextSpawnId())
  }

  public deactivate(): void {
    this.enemy.disableBody(true, true)
    this.enemy.setActive(false).setVisible(false)
    this.shadow.setVisible(false)
  }

  public update(dt: number): void {
    if (!this.enemy.active) return
    const plan = this.plan
    if (plan === undefined) return

    if (this.approaching) {
      this.enemy.y = Math.min(this.enemy.y + (BALANCE.boss.approachSpeed * dt) / 1000, BALANCE.boss.battleY)
      if (this.enemy.y === BALANCE.boss.battleY) this.approaching = false
    } else {
      this.fightElapsedMs += dt
      this.updatePhase(plan)
      const phase = this.phaseTwoStarted ? plan.phaseTwo : plan.phaseOne
      // DER BOSS PENDELT NICHT MEHR SEITLICH (Thomas 2026-08-23 nach dem iPhone-Test:
      // "Boss soll sich nicht mehr links und rechts bewegen, sondern einfach langsam auf
      // mich zu"). Seine X-Position steht ab activate() fest in der Strassenmitte; die
      // einzige Bewegung im Kampf ist das Vorruecken in advanceTowardsCrowd.
      // Der Boss schiesst seit V2 nicht mehr (Entscheidung Thomas 2026-08-22). Sein
      // Druck kommt aus gerufenen Horden und aus dem stetigen Vorruecken: Seit
      // pressureDelayMs auf 0 steht, setzt er sich ab dem ersten Kampfbild in Bewegung
      // und wird nicht erst nach einer Wartezeit gefaehrlich.
      this.hordeAccumulatorMs += dt
      while (this.hordeAccumulatorMs >= phase.hordeIntervalMs) {
        this.hordeAccumulatorMs -= phase.hordeIntervalMs
        this.requestBossHorde(plan.hordeSize)
      }
      if (this.fightElapsedMs >= plan.pressureDelayMs) this.advanceTowardsCrowd(dt, plan)
    }

    // Der Boss waechst, waehrend er vorrueckt (Thomas 2026-08-22: "Mobs wachsen
    // lassen"). Erst dadurch ist sein Vorruecken ueberhaupt zu sehen: 25 px Naeherkommen
    // sind als Positionsaenderung kaum wahrnehmbar, als Groessenzuwachs sofort.
    this.applyPerspectiveScale()
    const topY = this.enemy.y - this.enemy.displayHeight / 2
    this.enemy.setAlpha(Math.min(1, Math.max(0, (topY - BALANCE.road.horizonY) / BALANCE.road.entryFadePx)))
    // Der Boss wippt nicht, sein Schatten steht also fest unter ihm - er traegt aber
    // dieselbe Einblendung, sonst laege am Horizont ein Fleck ohne Figur.
    const shadowWidth = BALANCE.boss.bodyWidth * this.enemy.scaleX * BALANCE.shadow.widthOfFigure
    this.shadow.setVisible(this.enemy.alpha > 0)
    this.shadow.setPosition(this.enemy.x, this.enemy.y + this.enemy.displayHeight * BALANCE.shadow.footOffsetOfHeight)
    this.shadow.setDisplaySize(shadowWidth, shadowWidth * BALANCE.shadow.heightOfWidth)
    this.shadow.setAlpha(BALANCE.shadow.alpha * this.enemy.alpha)
    this.updateVisuals(dt, plan)
    ;(this.enemy.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
  }

  private updatePhase(plan: BossPlan): void {
    const phase = getBossPhase(this.enemy.getData('hp') as number, this.phaseTwoStarted, plan)
    if (phase === 1 || this.phaseTwoStarted) return
    this.phaseTwoStarted = true
    this.phaseFlashRemainingMs = plan.phaseTwo.transitionFlashMs
  }

  private applyPerspectiveScale(): void {
    // figureTextureScale halbiert die doppelt aufgeloeste Textur zurueck auf Spielgroesse.
    this.enemy.setScale(
      BALANCE.render.figureTextureScale
      * getPerspectiveScale(this.scene.scale.width, this.scene.scale.height, this.enemy.y),
    )
  }

  private advanceTowardsCrowd(dt: number, plan: BossPlan): void {
    this.enemy.setData('contactDamage', plan.advanceContactDamage)
    const stopY = Math.max(BALANCE.boss.battleY, this.getAnchorY() - plan.advanceStopBeforeAnchorPx)
    this.enemy.y = Math.min(this.enemy.y + (plan.advanceSpeed * dt) / 1000, stopY)
    this.swingSideways(dt, plan)
  }

  /**
   * Seitliches Pendeln - nur beim Elite-Boss (E7, Thomas: "er darf sich hin und her
   * bewegen").
   *
   * Beim gewoehnlichen Boss wurde das Pendeln am 2026-08-23 bewusst entfernt und bleibt
   * es auch; hier ist es die Eigenschaft, die den Elite-Kampf anders spielen laesst: Man
   * muss nachfuehren, statt draufzuhalten.
   *
   * Die Amplitude haengt an der STRASSENBREITE AUF SEINER HOEHE, nicht an einer festen
   * Pixelzahl. Der Korridor verjuengt sich perspektivisch nach oben; eine feste Zahl
   * truege ihn beim Vorruecken aus der Strasse heraus.
   */
  private swingSideways(dt: number, plan: BossPlan): void {
    if (!plan.elite) return
    this.swingElapsedMs += dt
    const { swingAmplitudeShare, swingSeconds } = BALANCE.boss.elite
    const halbeStrasse = getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, this.enemy.y)
    const amplitude = halbeStrasse * swingAmplitudeShare
    const phase = (this.swingElapsedMs / 1000 / swingSeconds) * Math.PI * 2
    this.enemy.x = this.scene.scale.width / 2 + Math.sin(phase) * amplitude
  }

  private updateVisuals(dt: number, plan: BossPlan): void {
    this.phaseFlashRemainingMs = Math.max(0, this.phaseFlashRemainingMs - dt)
    if (this.phaseFlashRemainingMs > 0) {
      this.enemy.setTintFill(0xffffff)
      return
    }
    if (this.phaseTwoStarted) {
      this.enemy.setTint(plan.phaseTwo.tint)
      return
    }
    this.enemy.clearTint()
  }

}
