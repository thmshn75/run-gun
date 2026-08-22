import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { canSpawnBossHorde } from './bossPlan'
import { chooseEnemyType, getEnemyHp, type EnemyType } from './enemyTypes'
import { getEnemySpawnCenterY, getSquadSpawnBaseY, isRevealedAtHorizon } from './horizonReveal'
import { getLevelPlan, type LevelPlan } from './levelPlan'
import { getBobOffsetPx, getPhaseOffset, getStepCycleHz } from './gamefeel'
import { getFigureOverscanFactor, getPerspectiveScale, getPlayfieldHalfWidth } from './road'
import { chooseSpawnLane, type SpawnLaneEnemy } from './spawnLanes'
import { computeHordeOffsets, getSquadWidth } from './squads'
import type { RunStats } from './upgrades'
import { getWeaponRewardChoices } from './weaponChoices'
import type { WeaponKey } from './weapons'

type SpawnResult = 'spawned' | 'no-lane' | 'pool-exhausted'

type SpawnRequest =
  | { readonly kind: 'single'; readonly type: EnemyType }
  | { readonly kind: 'squad'; readonly squadKind: 'wedge' | 'row' | 'cluster'; readonly size: number }

export class Spawner {
  private readonly scene: Phaser.Scene
  private readonly runStats: RunStats
  // Lazy, nicht als Wert: Die Truppe wird nach dem Spawner erzeugt, und ihre Position
  // aendert sich ohnehin jedes Bild.
  private readonly getCrowdAnchorX: (() => number) | undefined
  private readonly enemies: Phaser.Physics.Arcade.Group
  private readonly shadows: Phaser.GameObjects.Image[]
  private spawnAccumulatorMs: number
  private elapsedMs: number
  private lastPoolWarningAtMs: number
  private deferredSpawn: SpawnRequest | undefined
  private intervalSpawnCount: number
  private intervalDeferredCount: number
  private intervalPlannedCount: number
  private lastSpawnMetricsAtMs: number
  private nextSpawnId: number
  private spawningEnabled: boolean
  private levelPlan: LevelPlan

  public constructor(scene: Phaser.Scene, runStats: RunStats, getCrowdAnchorX?: () => number) {
    this.scene = scene
    this.runStats = runStats
    this.getCrowdAnchorX = getCrowdAnchorX
    this.enemies = scene.physics.add.group()
    this.spawnAccumulatorMs = 0
    this.elapsedMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs
    this.deferredSpawn = undefined
    this.intervalSpawnCount = 0
    this.intervalDeferredCount = 0
    this.intervalPlannedCount = 0
    this.lastSpawnMetricsAtMs = 0
    this.nextSpawnId = 1
    this.spawningEnabled = true
    this.levelPlan = getLevelPlan(1)
    this.shadows = []
    for (let index = 0; index < BALANCE.pools.enemies; index += 1) {
      const enemy = scene.physics.add.image(0, 0, BALANCE.enemy.types[0].texture).setDepth(BALANCE.layers.gameplay)
      enemy.setActive(false).setVisible(false)
      enemy.disableBody(true, true)
      this.enemies.add(enemy)
      // Ein Bodenschatten je Poolplatz, fest zugeordnet - nie zur Laufzeit erzeugt.
      const shadow = scene.add.image(0, 0, 'figure-shadow')
        .setDepth(BALANCE.layers.shadow)
        .setAlpha(BALANCE.shadow.alpha)
        .setActive(false)
        .setVisible(false)
      this.shadows.push(shadow)
    }
  }

  public getEnemies(): Phaser.Physics.Arcade.Group {
    return this.enemies
  }

  public getEnemySpeed(): number {
    return this.runStats.get('speed')
  }

  public allocateSpawnId(): number {
    const spawnId = this.nextSpawnId
    this.nextSpawnId += 1
    return spawnId
  }

  public setSpawningEnabled(enabled: boolean): void {
    this.spawningEnabled = enabled
    if (!enabled) this.deferredSpawn = undefined
  }

  public resetForLevel(level: number): void {
    this.elapsedMs = 0
    this.spawnAccumulatorMs = 0
    this.deferredSpawn = undefined
    this.levelPlan = getLevelPlan(level)
    this.spawningEnabled = true
  }

  // Boss summons deliberately reuse this pool while the regular clock stays disabled.
  /**
   * Der Boss ruft eine ganze Horde. Rueckgabe ist die Zahl tatsaechlich gespawnter
   * Gegner - 0, wenn der Deckel erreicht ist oder kein Platz auf der Strasse war.
   */
  public requestBossHorde(size: number, maxActiveCalled: number): number {
    const activeCalled = this.countBossCompanions()
    if (!canSpawnBossHorde(activeCalled, size, maxActiveCalled)) return 0
    const before = activeCalled
    const kind = this.chooseBossHordeKind()
    if (this.spawnSquad(kind, size, true) !== 'spawned') return 0
    return this.countBossCompanions() - before
  }

  private countBossCompanions(): number {
    let count = 0
    for (const child of this.enemies.getChildren()) {
      if (child.active && child.getData('bossCompanion') === true) count += 1
    }
    return count
  }

  /** Formen wie in der Normalphase des Levels, gewichtet - der Boss ruft nichts Fremdes. */
  private chooseBossHordeKind(): 'wedge' | 'row' | 'cluster' {
    const squads = this.levelPlan.squads
    if (squads.length === 0) return 'wedge'
    const totalWeight = squads.reduce((sum, squad) => sum + squad.weight, 0)
    let roll = Phaser.Math.RND.frac() * totalWeight
    for (const squad of squads) {
      roll -= squad.weight
      if (roll < 0) return squad.kind
    }
    return squads[squads.length - 1].kind
  }

  public chooseBlockerWeapon(currentWeapon: WeaponKey): WeaponKey {
    const choices = getWeaponRewardChoices(currentWeapon, this.levelPlan.level)
    return choices[Math.min(choices.length - 1, Math.floor(Phaser.Math.RND.frac() * choices.length))]
  }

  public recycleBossCompanions(): void {
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Phaser.Physics.Arcade.Image
      if (enemy.active && enemy.getData('bossCompanion') === true) this.recycle(enemy)
    }
  }

  public recycle(enemy: Phaser.Physics.Arcade.Image): void {
    enemy.disableBody(true, true)
    enemy.setActive(false).setVisible(false)
    const index = this.enemies.getChildren().indexOf(enemy)
    if (index >= 0) this.shadows[index].setActive(false).setVisible(false)
  }

  /**
   * Der Schatten bleibt auf der Laufhoehe (logicalY), waehrend die Figur wippt, und
   * schrumpft mit der Hebung. Er uebernimmt die Sichtbarkeit der Figur mit, damit am
   * Horizont kein Fleck vor dem Gegner auftaucht.
   */
  private updateShadow(poolIndex: number, enemy: Phaser.Physics.Arcade.Image, logicalY: number, bob: number): void {
    const shadow = this.shadows[poolIndex]
    if (shadow === undefined) return
    if (enemy.alpha <= 0) {
      shadow.setVisible(false)
      return
    }
    const shrink = Math.max(0, 1 - Math.abs(bob) * BALANCE.shadow.liftShrinkPerPx)
    // Skalierte Breite: Der Schatten gehoert zur Figur und muss mit ihr schrumpfen,
    // sonst schwebt ein naher Fleck unter einem fernen Gegner.
    const width = (enemy.getData('scaledWidth') as number) * BALANCE.shadow.widthOfFigure * shrink
    shadow.setActive(true).setVisible(true)
    shadow.setPosition(enemy.x, logicalY + enemy.displayHeight * BALANCE.shadow.footOffsetOfHeight)
    shadow.setDisplaySize(width, width * BALANCE.shadow.heightOfWidth)
    shadow.setAlpha(BALANCE.shadow.alpha * shrink * enemy.alpha)
  }

  public damage(enemy: Phaser.Physics.Arcade.Image, damage: number): boolean {
    const remainingHp = (enemy.getData('hp') as number) - damage
    enemy.setData('hp', remainingHp)
    enemy.setTintFill(0xffffff)
    enemy.setData('flashRemainingMs', BALANCE.feedback.hitFlashMs)
    if (remainingHp <= 0) {
      this.recycle(enemy)
      return true
    }
    return false
  }

  public update(dt: number): void {
    this.elapsedMs += dt
    if (this.spawningEnabled) this.spawnAccumulatorMs += dt
    if (this.spawningEnabled && this.deferredSpawn !== undefined && this.spawn(this.deferredSpawn) === 'spawned') this.deferredSpawn = undefined
    const spawnIntervalMs = this.getSpawnIntervalMs()
    while (this.spawningEnabled && this.spawnAccumulatorMs >= spawnIntervalMs) {
      this.spawnAccumulatorMs -= spawnIntervalMs
      this.intervalPlannedCount += 1
      if (this.deferredSpawn !== undefined) continue
      const request = this.chooseSpawnRequest()
      if (this.spawn(request) !== 'spawned') {
        this.deferredSpawn = request
        this.intervalDeferredCount += 1
        break
      }
    }
    this.logSpawnMetrics()

    const enemySpeed = this.getEnemySpeed()
    // Laufrhythmus (Lebendigkeit): Der Wippanteil wird vor dem Fortschritt wieder
    // abgezogen, damit er sich nicht aufaddiert und die Laufstrecke verfaelscht. Die
    // Pool-Position dient als Taktversatz — stabil ueber die Lebensdauer eines Gegners
    // und ohne Zufall, der Testlaeufe unvergleichbar machen wuerde.
    const bobCycleHz = getStepCycleHz(BALANCE.enemy.types[0].bodyHeight)
    let poolIndex = -1
    for (const child of this.enemies.getChildren()) {
      poolIndex += 1
      const enemy = child as Phaser.Physics.Arcade.Image
      if (!enemy.active) continue
      const previousBob = (enemy.getData('bobPx') as number | undefined) ?? 0
      const logicalY = enemy.y - previousBob + (enemySpeed * (enemy.getData('speedFactor') as number) * dt) / 1000
      // Die Groesse gehoert zur Laufhoehe, nicht zur gewippten: Sonst pulsiert der
      // Gegner im Schritttakt.
      this.applyPerspectiveScale(enemy, logicalY)
      // Auch der Hub schrumpft mit der Entfernung - ein ferner Gegner, der so weit
      // huepft wie ein naher, zerstoert die Tiefenwirkung wieder.
      const bob = getBobOffsetPx(this.elapsedMs, bobCycleHz, getPhaseOffset(poolIndex), BALANCE.gamefeel.enemyBobAmplitudePx) * enemy.scaleY
      enemy.setData('bobPx', bob)
      enemy.y = logicalY + bob
      // Zielsuche: Die Spur wandert langsam zur Truppe, statt starr zu bleiben. Die
      // Bewegung sitzt auf der LANE, nicht auf x - sonst wuerde sie beim Naeherkommen
      // von der Perspektive wieder auseinandergezogen.
      const halbeBreite = getPlayfieldHalfWidth(this.scene.scale.width, this.scene.scale.height, enemy.y)
      const zielLane = this.getTargetLane()
      const lane = enemy.getData('lane') as number
      const schritt = (BALANCE.enemy.seekSpeedPxPerSec * dt) / 1000 / Math.max(1, halbeBreite)
      const neueLane = Math.abs(zielLane - lane) <= schritt
        ? zielLane
        : lane + Math.sign(zielLane - lane) * schritt
      enemy.setData('lane', neueLane)
      enemy.x = this.scene.scale.width / 2 + neueLane * halbeBreite
      this.applyHorizonReveal(enemy)
      this.updateShadow(poolIndex, enemy, logicalY, bob)
      ;(enemy.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      const flashRemainingMs = Math.max(0, (enemy.getData('flashRemainingMs') as number) - dt)
      enemy.setData('flashRemainingMs', flashRemainingMs)
      if (flashRemainingMs === 0) enemy.clearTint()
      if (enemy.y - enemy.displayHeight / 2 > this.scene.scale.height) this.recycle(enemy)
    }
  }

  /**
   * Spur, auf die Gegner zulaufen: die der Truppe. Ohne bekannte Truppenposition bleibt
   * es bei der Mittelspur - dann verhaelt sich alles wie vor der Zielsuche.
   */
  private getTargetLane(): number {
    if (this.getCrowdAnchorX === undefined) return 0
    const anchorY = this.scene.scale.height - BALANCE.player.anchorBottomOffset
    const halbeBreite = getPlayfieldHalfWidth(this.scene.scale.width, this.scene.scale.height, anchorY)
    if (halbeBreite <= 0) return 0
    return (this.getCrowdAnchorX() - this.scene.scale.width / 2) / halbeBreite
  }

  private getSpawnIntervalMs(): number {
    // elapsedMs only ramps the interval within this level; enemy choice comes from levelPlan.
    return Math.max(
      this.levelPlan.spawnIntervalMinMs,
      this.levelPlan.spawnIntervalMs - (this.elapsedMs / 1000) * BALANCE.enemy.spawnRampPerSec,
    )
  }

  private chooseSpawnRequest(): SpawnRequest {
    if (this.levelPlan.squads.length > 0 && Phaser.Math.RND.frac() < this.levelPlan.squadChance) {
      const totalWeight = this.levelPlan.squads.reduce((sum, squad) => sum + squad.weight, 0)
      let roll = Phaser.Math.RND.frac() * totalWeight
      for (const squad of this.levelPlan.squads) {
        roll -= squad.weight
        if (roll < 0) return { kind: 'squad', squadKind: squad.kind, size: squad.size }
      }
      const squad = this.levelPlan.squads.at(-1)!
      return { kind: 'squad', squadKind: squad.kind, size: squad.size }
    }
    return { kind: 'single', type: chooseEnemyType(this.levelPlan.enemyWeights, () => Phaser.Math.RND.frac()) }
  }

  private spawn(request: SpawnRequest): SpawnResult {
    return request.kind === 'single' ? this.spawnSingle(request.type) : this.spawnSquad(request.squadKind, request.size)
  }

  private spawnSingle(type: EnemyType, bossCompanion = false): SpawnResult {
    const enemy = this.enemies.getChildren().find((child) => !child.active) as Phaser.Physics.Arcade.Image | undefined
    if (enemy === undefined) {
      this.warnPoolExhausted()
      return 'pool-exhausted'
    }
    enemy.setTexture(type.texture)
    const y = getEnemySpawnCenterY(type.bodyHeight)
    const lane = chooseSpawnLane(
      this.getActiveLaneEnemies(),
      { ...type, y },
      // Kampfhoehe als gemeinsames Bezugssystem aller Spurrechnungen (2026-08-22).
      getPlayfieldHalfWidth(
        this.scene.scale.width,
        this.scene.scale.height,
        this.scene.scale.height - BALANCE.player.anchorBottomOffset,
      ),
      () => Phaser.Math.RND.frac(),
      BALANCE.enemy.spawnLaneSafetyGap,
      BALANCE.enemy.spawnBands.singleLaneShare,
      // Randabstand mit Perspektiv-Aufschlag: Weiter oben ist die Figur breiter, als
      // ihr Platz im Kampfhoehen-System hergibt (getFigureOverscanFactor). Ohne den
      // Aufschlag steht sie am Horizont mit der Schulter im Wandsegment.
      type.bodyWidth * getFigureOverscanFactor(this.scene.scale.width, this.scene.scale.height),
    )
    if (lane === undefined) return 'no-lane'
    this.activateEnemy(enemy, type, lane, y, bossCompanion)
    this.intervalSpawnCount += 1
    return 'spawned'
  }

  private spawnSquad(squadKind: 'wedge' | 'row' | 'cluster', requestedSize: number, bossCompanion = false): SpawnResult {
    // Die Formation wird auf KAMPFHOEHE entworfen, wo Figuren volle Groesse haben und
    // auf die Truppe treffen (Umstellung 2026-08-22 mit der perspektivischen
    // Skalierung). Vorher wurde sie am Horizont eingepasst und dort gegen die volle,
    // ungeschrumpfte Figurenbreite gerechnet - deshalb passten nur zwei nebeneinander.
    const anchorHalfWidth = getPlayfieldHalfWidth(
      this.scene.scale.width,
      this.scene.scale.height,
      this.scene.scale.height - BALANCE.player.anchorBottomOffset,
    )
    const maxWidthAnchor = Math.min(anchorHalfWidth * 2, BALANCE.walls.hordeMaxWidthPx)
    // Typen VOR dem Layout ziehen: Die Dichteregel staucht mit der echten breitesten
    // Figur der Horde — ein Keil aus Leichten wird dichter als ein Schwerer-Block.
    const drawnTypes = this.getSquadTypes(squadKind, Math.min(requestedSize, BALANCE.level.squads.maxSize))
    const layout = computeHordeOffsets(
      squadKind,
      drawnTypes.length,
      BALANCE.level.squads.spacingPx,
      BALANCE.level.squads.rowSpacingPx,
      Math.max(...drawnTypes.map((type) => type.bodyWidth)),
      maxWidthAnchor,
    )
    if (layout.size < BALANCE.level.squads.minSize) return 'no-lane'
    const offsets = layout.offsets

    const types = drawnTypes.slice(0, offsets.length)
    const available = this.enemies.getChildren().filter((child) => !child.active) as Phaser.Physics.Arcade.Image[]
    if (available.length < offsets.length) {
      this.warnPoolExhausted()
      return 'pool-exhausted'
    }

    const y = getSquadSpawnBaseY(
      Math.max(...types.map((type) => type.bodyHeight)),
      Math.max(...offsets.map((offset) => offset.yOffset)),
    )
    const widestBodyWidth = Math.max(...types.map((type) => type.bodyWidth))
    // Exactly one lane reservation for the complete squad; members never call chooseSpawnLane.
    const lane = chooseSpawnLane(
      this.getActiveLaneEnemies(),
      // bodyWidth ist die Breite EINES Mitglieds - danach richten sich die Abstaende
      // zu bestehenden Gegnern. Die Formationsbreite kommt getrennt und begrenzt nur,
      // wie weit der Schwerpunkt nach aussen darf.
      { y, speedFactor: Math.max(...types.map((type) => type.speedFactor)), bodyWidth: widestBodyWidth, bodyHeight: Math.max(...types.map((type) => type.bodyHeight)) },
      // Dieselbe Bezugsgroesse wie die Formation: Kampfhoehe. Stand hier die
      // Horizontbreite, wurde eine 172 px breite Horde gegen 101 px geprueft und
      // fand nie eine Spur.
      anchorHalfWidth,
      () => Phaser.Math.RND.frac(),
      BALANCE.enemy.spawnLaneSafetyGap,
      BALANCE.enemy.spawnBands.hordeLaneShare,
      // Wie beim Einzelgegner: Die Formationsbreite bestimmt nur den Randabstand und
      // bekommt deshalb den Perspektiv-Aufschlag mit.
      getSquadWidth(offsets, widestBodyWidth) * getFigureOverscanFactor(this.scene.scale.width, this.scene.scale.height),
    )
    if (lane === undefined) return 'no-lane'

    offsets.forEach((offset, index) => {
      const memberY = y + offset.yOffset
      // Offsets sind Kampfhoehen-Pixel: durch die dortige Halbbreite teilen, nicht durch
      // die auf Mitgliedshoehe. Sonst waere die Horde am Horizont so breit angelegt wie
      // unten und liefe beim Naeherkommen auseinander.
      const memberLane = lane + offset.laneOffset / anchorHalfWidth
      this.activateEnemy(available[index], types[index], memberLane, memberY, bossCompanion)
    })
    if (!bossCompanion) {
      // Die Nachlaufpause gehoert zum Takt der Normalphase. Beim Boss ist der
      // Normalspawner ohnehin aus, und sein eigener Ruf-Takt haengt am Boss.
      this.intervalSpawnCount += offsets.length
      const pauseMs = BALANCE.level.squads.pauseBaseMs + offsets.length * BALANCE.level.squads.pausePerMemberMs
      this.spawnAccumulatorMs = Math.min(this.spawnAccumulatorMs, this.getSpawnIntervalMs() - pauseMs)
    }
    return 'spawned'
  }

  private getSquadTypes(squadKind: 'wedge' | 'row' | 'cluster', size: number): EnemyType[] {
    const light = BALANCE.enemy.types.find((type) => type.key === 'light')!
    if (squadKind === 'wedge') return Array.from({ length: size }, () => light)
    const types = Array.from({ length: size }, () => chooseEnemyType(this.levelPlan.enemyWeights, () => Phaser.Math.RND.frac()))
    if (squadKind === 'cluster' && types.every((type) => type.key === types[0].key)) {
      const alternate = BALANCE.enemy.types.find((type, index) => this.levelPlan.enemyWeights[index] > 0 && type.key !== types[0].key)
      if (alternate !== undefined) types[types.length - 1] = alternate
    }
    return types
  }

  private activateEnemy(enemy: Phaser.Physics.Arcade.Image, type: EnemyType, lane: number, y: number, bossCompanion: boolean): void {
    const x = this.scene.scale.width / 2 + lane * getPlayfieldHalfWidth(this.scene.scale.width, this.scene.scale.height, y)
    enemy.setTexture(type.texture)
    enemy.enableBody(true, x, y, true, true)
    const body = enemy.body as Phaser.Physics.Arcade.Body
    // Body in TEXTURPIXELN setzen: Arcade skaliert ihn mit der Sprite-Skalierung mit,
    // die Trefferflaeche folgt der Perspektive also von selbst. Wuerde hier die bereits
    // skalierte Groesse stehen, ginge der Faktor doppelt ein.
    body.setSize(type.bodyWidth, type.bodyHeight, true)
    // The spawner moves enemies itself; otherwise Arcade writes offset.x back to the
    // sprite each frame, making the visible enemy jump sideways.
    body.moves = false
    body.updateFromGameObject()
    enemy.setActive(true).setVisible(true).clearTint()
    this.applyPerspectiveScale(enemy, y)
    this.applyHorizonReveal(enemy)
    enemy.setData('hp', getEnemyHp(type, this.levelPlan.level))
    enemy.setData('speedFactor', type.speedFactor)
    enemy.setData('contactDamage', type.contactDamage)
    enemy.setData('coinValue', type.coinValue)
    enemy.setData('bodyWidth', type.bodyWidth)
    enemy.setData('bodyHeight', type.bodyHeight)
    enemy.setData('flashRemainingMs', 0)
    enemy.setData('lane', lane)
    enemy.setData('bossCompanion', bossCompanion)
    enemy.setData('spawnId', this.allocateSpawnId())
  }

  /**
   * Gegner wachsen, waehrend sie naeher kommen (Thomas 2026-08-22). Der Faktor kommt
   * aus der Strassenperspektive, nicht aus einer eigenen Kurve - Figur und Untergrund
   * laufen damit zwingend synchron zusammen.
   *
   * setScale statt setDisplaySize: Der Kollisionskoerper wurde in Texturpixeln gesetzt
   * und wird von Arcade mit der Skalierung mitgezogen. Die Trefferflaeche eines fernen
   * Gegners schrumpft also mit - was richtig ist, denn er ist auch schwerer zu treffen.
   */
  private applyPerspectiveScale(enemy: Phaser.Physics.Arcade.Image, y: number): void {
    const faktor = getPerspectiveScale(this.scene.scale.width, this.scene.scale.height, y)
    enemy.setScale(faktor)
    // Nachgefuehrte Groesse fuer alle, die mit der Figurenbreite rechnen (Schatten,
    // Spurreservierung). Die Rohbreite bleibt als bodyWidth erhalten.
    enemy.setData('scaledWidth', (enemy.getData('bodyWidth') as number) * faktor)
  }

  // Gegner erscheinen wie die Haeuser: voll sichtbar, sobald die Unterkante die
  // Horizontlinie erreicht — der Koerper ragt dann ueber die Linie in den Himmel.
  private applyHorizonReveal(enemy: Phaser.Physics.Arcade.Image): void {
    enemy.setAlpha(isRevealedAtHorizon(enemy.y + enemy.displayHeight / 2) ? 1 : 0)
  }

  private getActiveLaneEnemies(): SpawnLaneEnemy[] {
    return this.enemies.getChildren().flatMap((child) => {
      const enemy = child as Phaser.Physics.Arcade.Image
      if (!enemy.active) return []
      return [{
        lane: enemy.getData('lane') as number,
        y: enemy.y,
        speedFactor: enemy.getData('speedFactor') as number,
        // ROHBREITE, nicht die skalierte: Spuren sind Anteile der Strassenbreite und
        // werden im Kampfhoehen-System gerechnet, wo die Skalierung genau 1 ist. Die
        // Rohbreite IST damit die Breite in diesem System. (Kurz mit scaledWidth
        // versucht - dann fand keine Horde mehr eine Spur, weil Breiten in
        // Bildschirmpixeln gegen ein Kampfhoehen-Budget geprueft wurden.)
        bodyWidth: enemy.getData('bodyWidth') as number,
        bodyHeight: enemy.getData('bodyHeight') as number,
      }]
    })
  }

  private logSpawnMetrics(): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastSpawnMetricsAtMs < 10000) return
    console.info(
      `Enemy spawns (10 s): ${this.intervalSpawnCount}, deferred: ${this.intervalDeferredCount}, planned: ${this.intervalPlannedCount}`,
    )
    this.intervalSpawnCount = 0
    this.intervalDeferredCount = 0
    this.intervalPlannedCount = 0
    this.lastSpawnMetricsAtMs = this.elapsedMs
  }

  private warnPoolExhausted(): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastPoolWarningAtMs < BALANCE.feedback.poolWarningIntervalMs) return
    console.warn('Enemy pool exhausted; spawn skipped.')
    this.lastPoolWarningAtMs = this.elapsedMs
  }
}
