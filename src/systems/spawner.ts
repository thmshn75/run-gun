import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { canSpawnBossHorde } from './bossPlan'
import { chooseEnemyType, getEnemyHp, getFigureHeight, getFigureWidth, getPlayerPower, type EnemyType, getEnemyTexture } from './enemyTypes'
import { getEnemySpawnCenterY, getSquadSpawnBaseY, isRevealedAtHorizon } from './horizonReveal'
import { getLevelPlan, getMaxSquadSize, type LevelPlan } from './levelPlan'
import { getBildVersatzPx } from './bildVersatz'
import { getBobOffsetPx, getPhaseOffset, getStepCycleHz, getStepSquash, getStepSwayRadians } from './gamefeel'
import { getFigureOverscanFactor, getPerspectiveScale, getPlayfieldHalfWidth } from './road'
import { chooseSpawnLane, type SpawnLaneEnemy } from './spawnLanes'
import { computeHordeOffsets, getSquadWidth } from './squads'
import type { RunStats } from './upgrades'
import { chooseWeightedWeapon, getWeaponRewardChoices } from './weaponChoices'
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
  private readonly onBreakthrough: ((contactDamage: number) => void) | undefined
  private readonly enemies: Phaser.Physics.Arcade.Group
  private readonly shadows: Phaser.GameObjects.Image[]
  private spawnAccumulatorMs: number
  private elapsedMs: number
  private lastPoolWarningAtMs: number
  /**
   * Bildsatz der Taumelbewegung, oder undefined fuer die gerechnete Bewegung. Gilt seit
   * dem 2026-09-04 in jedem Run.
   */
  private readonly gegnerBilder: Readonly<Record<string, readonly string[]>>
  private deferredSpawn: SpawnRequest | undefined
  private deferredAgeMs: number
  private intervalSpawnCount: number
  private intervalDeferredCount: number
  private intervalPlannedCount: number
  private lastSpawnMetricsAtMs: number
  private nextSpawnId: number
  private spawningEnabled: boolean
  private levelPlan: LevelPlan

  public constructor(
    scene: Phaser.Scene,
    runStats: RunStats,
    getCrowdAnchorX?: () => number,
    onBreakthrough?: (contactDamage: number) => void,
  ) {
    this.scene = scene
    this.runStats = runStats
    this.getCrowdAnchorX = getCrowdAnchorX
    this.onBreakthrough = onBreakthrough
    this.enemies = scene.physics.add.group()
    this.spawnAccumulatorMs = 0
    this.elapsedMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs
    this.deferredSpawn = undefined
    this.deferredAgeMs = 0
    this.intervalSpawnCount = 0
    this.intervalDeferredCount = 0
    this.intervalPlannedCount = 0
    this.lastSpawnMetricsAtMs = 0
    this.nextSpawnId = 1
    this.spawningEnabled = true
    this.levelPlan = getLevelPlan(1)
    this.gegnerBilder = this.waehleGegnerBilder()
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
    if (!enabled) {
      this.deferredSpawn = undefined
      this.deferredAgeMs = 0
    }
  }

  /**
   * Bestimmt den Bildsatz der Taumelbewegung. Fehlt eines der Bilder, bleibt er
   * undefined und alle Gegner behalten die gerechnete Bewegung - eine Figur mit
   * fehlender Textur waere schlimmer als die aeltere Bewegung.
   */
  private waehleGegnerBilder(): Readonly<Record<string, readonly string[]>> {
    const { aktiv, saetze } = BALANCE.enemy.bilder
    if (!aktiv) return {}
    const brauchbar: Record<string, readonly string[]> = {}
    for (const [gestalt, satz] of Object.entries(saetze)) {
      // Je Gestalt einzeln pruefen: Fehlt ein Satz, faellt nur diese Gestalt auf die
      // gerechnete Bewegung zurueck statt alle. So koennen die offenen Gestalten nach
      // und nach dazukommen.
      if (satz.every((name) => this.scene.textures.exists(name))) brauchbar[gestalt] = satz
    }
    return brauchbar
  }

  public resetForLevel(level: number): void {
    this.elapsedMs = 0
    this.spawnAccumulatorMs = 0
    this.deferredSpawn = undefined
    this.deferredAgeMs = 0
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

  public chooseWallWeapon(currentWeapon: WeaponKey, owned: readonly string[] = []): WeaponKey {
    const choices = getWeaponRewardChoices(currentWeapon, this.levelPlan.level, owned)
    // Gewichtet statt gleichverteilt: Sonst wird die gerade freigeschaltete Waffe mit
    // jeder weiteren seltener statt haeufiger (Herleitung bei weapon.rewardNewnessBias).
    return chooseWeightedWeapon(choices, Phaser.Math.RND.frac()) ?? currentWeapon
  }

  public recycleBossCompanions(): void {
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Phaser.Physics.Arcade.Image
      if (enemy.active && enemy.getData('bossCompanion') === true) this.recycle(enemy)
    }
  }

  /**
   * Meldet einmalig, wenn ein Gegner die Truppenhoehe passiert hat, ohne getoetet worden
   * zu sein. Wer die Truppe BERUEHRT, kommt hier nie an - handlePlayerHit recycelt ihn
   * und er hat dort bereits gekostet.
   *
   * Ausgeloest wird auf der Kampfhoehe, nicht am Bildrand: Dort steht die Truppe, dort
   * ist der Durchbruch das Ereignis. Die restlichen 130 px bis zum Bildrand laeuft der
   * Gegner weiter, ohne noch einmal zu zaehlen (Flag `durchgebrochen`).
   */
  private meldeDurchbruch(enemy: Phaser.Physics.Arcade.Image): void {
    if (this.onBreakthrough === undefined) return
    if (this.levelPlan.level < BALANCE.enemy.breakthroughMinLevel) return
    if (enemy.getData('durchgebrochen') === true) return
    const truppenhoehe = this.scene.scale.height - BALANCE.player.anchorBottomOffset
    if (enemy.y <= truppenhoehe) return
    enemy.setData('durchgebrochen', true)
    const contactDamage = enemy.getData('contactDamage') as number | undefined
    if (typeof contactDamage !== 'number' || !Number.isFinite(contactDamage)) return
    this.onBreakthrough(contactDamage)
  }

  /**
   * Aktuelle Feuerkraft der Truppe, Bezugsgroesse fuer die gedaempfte Gegner-Kopplung.
   * Wird bei JEDEM Spawn frisch gelesen, nicht beim Levelstart eingefroren: Der Spieler
   * ruestet mitten im Level auf, und genau diesen Sprung soll die Kopplung auffangen.
   * Bereits laufende Gegner behalten ihre Lebenspunkte - eine Horde, die man gerade
   * beschiesst, wird also nicht unter der Hand zaeher.
   */
  private getPlayerPower(): number {
    return getPlayerPower(
      this.runStats.get('hp'),
      this.runStats.get('damage'),
      this.runStats.get('shotsPerSec'),
      this.levelPlan.level,
    )
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
    if (remainingHp <= 0) {
      this.recycle(enemy)
      return true
    }
    return false
  }

  public update(dt: number): void {
    this.elapsedMs += dt
    if (this.spawningEnabled) this.spawnAccumulatorMs += dt
    if (this.spawningEnabled && this.deferredSpawn !== undefined) {
      if (this.spawn(this.deferredSpawn) === 'spawned') {
        this.deferredSpawn = undefined
        this.deferredAgeMs = 0
      } else {
        // AUFGEBEN STATT EWIG WARTEN (2026-08-23). Eine verschobene Horde blockierte
        // vorher den kompletten Takt (`if (deferredSpawn !== undefined) continue`) -
        // auch jeden EINZELGEGNER, der laengst gepasst haette. Gemessen lag bei Level 12
        // eine unplatzierbare Horde ueber 55 Sekunden im Weg, in denen kein einziger
        // Gegner mehr kam.
        //
        // deferredMaxAgeMs ist nicht geraten, sondern die Anflugzeit einer Figur ueber
        // die halbe Strecke: Wer nach dieser Zeit keine Spur gefunden hat, findet sie
        // auch nicht mehr durch Warten - die Lage am Horizont hat sich bis dahin
        // vollstaendig erneuert. Der Takt darf dann weiterlaufen.
        this.deferredAgeMs += dt
        if (this.deferredAgeMs >= BALANCE.enemy.deferredMaxAgeMs) {
          this.deferredSpawn = undefined
          this.deferredAgeMs = 0
        }
      }
    }
    const spawnIntervalMs = this.getSpawnIntervalMs()
    while (this.spawningEnabled && this.spawnAccumulatorMs >= spawnIntervalMs) {
      this.spawnAccumulatorMs -= spawnIntervalMs
      this.intervalPlannedCount += 1
      if (this.deferredSpawn !== undefined) continue
      const request = this.chooseSpawnRequest()
      if (this.spawn(request) !== 'spawned') {
        this.deferredSpawn = request
        this.deferredAgeMs = 0
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
    const bobCycleHz = getStepCycleHz(getFigureHeight(BALANCE.enemy.types[0]))
    let poolIndex = -1
    for (const child of this.enemies.getChildren()) {
      poolIndex += 1
      const enemy = child as Phaser.Physics.Arcade.Image
      if (!enemy.active) continue
      const previousBob = (enemy.getData('bobPx') as number | undefined) ?? 0
      // Zwei Faktoren, zwei Zustaendigkeiten: speedFactor kommt von der STAERKE
      // (light/standard/heavy) und traegt die Balance, gangartTempo von der GANGART und
      // traegt die Optik. Je Staerke ist das Mittel der Gangarten 1,0, die Balance
      // bleibt also unberuehrt - ein Test haelt das fest.
      const gangartTempo = enemy.getData('gangartTempo') as number
      const logicalY = enemy.y - previousBob
        + (enemySpeed * (enemy.getData('speedFactor') as number) * gangartTempo * dt) / 1000
      // Die Groesse gehoert zur Laufhoehe, nicht zur gewippten: Sonst pulsiert der
      // Gegner im Schritttakt.
      this.applyPerspectiveScale(enemy, logicalY)
      // Auch der Hub schrumpft mit der Entfernung - ein ferner Gegner, der so weit
      // huepft wie ein naher, zerstoert die Tiefenwirkung wieder.
      // Die Versuchsgestalt bekommt KEINE gerechnete Bewegung: Hub, Wiegen und Federn
      // stecken in den Bildern. Beides zugleich waere doppelte Bewegung und wuerde den
      // Vergleich wertlos machen, um den es geht.
      const istBildsatz = enemy.getData('bildsatz') === true
      const bob = istBildsatz
        ? 0
        : getBobOffsetPx(this.elapsedMs, bobCycleHz, getPhaseOffset(poolIndex), BALANCE.gamefeel.enemyBobAmplitudePx) * enemy.scaleY
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
      // Laufbewegung ZULETZT, nach dem Nachfuehren der Trefferflaeche und nach dem
      // Schatten: Wiegen und Federn sind reine Optik. Laegen sie davor, atmete die
      // Trefferflaeche im Schritttakt mit (+-2 %) und der Schatten pulsierte —
      // dieselbe Regel, aus der bei der Truppe die ruhige Kollisionshuelle stammt.
      // applyPerspectiveScale setzt die Skalierung im naechsten Bild wieder absolut,
      // die Faktoren summieren sich also nicht auf.
      const phase = getPhaseOffset(poolIndex)
      const bilder = istBildsatz ? this.gegnerBilder[enemy.getData('gestalt') as string] : undefined
      if (bilder !== undefined) {
        // Eigener Takt, nicht der Schrittakt: Ein Zombie wankt langsamer, als er
        // Schritte macht. Der Versatz je Poolplatz bleibt, damit nicht die ganze Horde
        // im Gleichschritt taumelt.
        //
        // Der Takt haengt an der GANGART, nicht an der Staerke: Ein Renner wechselt die
        // Bilder mehr als doppelt so schnell wie ein Schreiter. Ohne eigenen Eintrag
        // gilt der Grundwert.
        const gestalt = enemy.getData('gestalt') as string
        const takt = BALANCE.enemy.bilder.gangarten[gestalt]?.takt
          ?? BALANCE.enemy.bilder.zyklenProSekunde
        const zyklus = ((this.elapsedMs / 1000) * takt + phase) % 1
        const bild = bilder[Math.min(bilder.length - 1, Math.floor(zyklus * bilder.length))]
        enemy.setTexture(bild)
        enemy.setRotation(0)
        // Seitlichen Versatz des Einzelbildes ausgleichen - dieselbe Regel wie beim Boss.
        // Gemessen wird am UNGEFAERBTEN Bild: Die Farbe aendert die Form nicht, und so
        // bleibt der Zwischenspeicher klein.
        enemy.x -= getBildVersatzPx(this.scene, bild, BALANCE.enemy.bilder.standflaecheAbAnteil) * enemy.scaleX
      } else {
        const squash = getStepSquash(this.elapsedMs, bobCycleHz, phase, BALANCE.gamefeel.enemyStepSquashShare)
        enemy.setScale(enemy.scaleX * squash.scaleX, enemy.scaleY * squash.scaleY)
        enemy.setRotation(getStepSwayRadians(this.elapsedMs, bobCycleHz, phase, BALANCE.gamefeel.enemyStepSwayMaxDeg))
      }
      this.meldeDurchbruch(enemy)
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
    const getaktet = Math.max(
      this.levelPlan.spawnIntervalMinMs,
      this.levelPlan.spawnIntervalMs - (this.elapsedMs / 1000) * BALANCE.enemy.spawnRampPerSec,
    )
    return getaktet * this.getWarmupFactor()
  }

  /**
   * Laengerer Takt in den ersten Sekunden der unteren Level (Herleitung bei
   * BALANCE.enemy.warmup).
   *
   * Der Faktor wirkt NACH der Untergrenze spawnIntervalMinMs, nicht davor: Sonst wuerde
   * die Grenze ihn wegschneiden, sobald der Takt dort anliegt - und genau dann, bei
   * dichtem Nachschub, wird die Schonfrist gebraucht.
   */
  private getWarmupFactor(): number {
    return this.warmupMix(BALANCE.enemy.warmup.intervalFactorAtStart)
  }

  /**
   * Hordenanteil in der Schonfrist. Der eigentliche Hebel gegen "zu viele Gegner am
   * Anfang": Rund zwei Drittel aller Spawns sind Horden, und wer mit EINER Figur einer
   * Siebener-Horde gegenuebersteht, kann nur ausweichen.
   *
   * Der Taktfaktor allein reichte nicht - die Nachlaufpause nach jeder Horde
   * ueberschreibt das Intervall (docs/lessons.md, 2026-08-22).
   */
  private getWarmupSquadChance(basis: number): number {
    return basis * this.warmupMix(BALANCE.enemy.warmup.squadChanceFactorAtStart)
  }

  /** Blendet einen Startwert linear auf 1,0 aus - gemeinsam fuer beide Schonfrist-Groessen. */
  private warmupMix(startwert: number): number {
    const { untilLevel, seconds } = BALANCE.enemy.warmup
    if (this.levelPlan.level > untilLevel) return 1
    const anteil = Math.min(1, this.elapsedMs / (seconds * 1000))
    return startwert + (1 - startwert) * anteil
  }

  private chooseSpawnRequest(): SpawnRequest {
    if (this.levelPlan.squads.length > 0 && Phaser.Math.RND.frac() < this.getWarmupSquadChance(this.levelPlan.squadChance)) {
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
    enemy.setTexture(getEnemyTexture(type.texture, this.levelPlan.level, Phaser.Math.RND.frac()))
    const y = getEnemySpawnCenterY(getFigureHeight(type))
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
      getFigureWidth(type) * getFigureOverscanFactor(this.scene.scale.width, this.scene.scale.height),
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
    const drawnTypes = this.getSquadTypes(squadKind, Math.min(requestedSize, getMaxSquadSize(this.levelPlan.level)))
    const layout = computeHordeOffsets(
      squadKind,
      drawnTypes.length,
      BALANCE.level.squads.spacingPx,
      BALANCE.level.squads.rowSpacingPx,
      Math.max(...drawnTypes.map((type) => getFigureWidth(type))),
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
      Math.max(...types.map((type) => getFigureHeight(type))),
      Math.max(...offsets.map((offset) => offset.yOffset)),
    )
    const widestBodyWidth = Math.max(...types.map((type) => getFigureWidth(type)))
    // Exactly one lane reservation for the complete squad; members never call chooseSpawnLane.
    const lane = chooseSpawnLane(
      this.getActiveLaneEnemies(),
      // bodyWidth ist die Breite EINES Mitglieds - danach richten sich die Abstaende
      // zu bestehenden Gegnern. Die Formationsbreite kommt getrennt und begrenzt nur,
      // wie weit der Schwerpunkt nach aussen darf.
      { y, speedFactor: Math.max(...types.map((type) => type.speedFactor)), bodyWidth: widestBodyWidth, bodyHeight: Math.max(...types.map((type) => getFigureHeight(type))) },
      // Dieselbe Bezugsgroesse wie die Formation: Kampfhoehe. Stand hier die
      // Horizontbreite, wurde eine 172 px breite Horde gegen 101 px geprueft und
      // fand nie eine Spur.
      anchorHalfWidth,
      () => Phaser.Math.RND.frac(),
      BALANCE.enemy.spawnLaneSafetyGap,
      BALANCE.enemy.spawnBands.hordeLaneShare,
      // Perspektiv-Aufschlag NUR auf die Figurenbreite, nicht auf die ganze Formation
      // (Korrektur 2026-08-23, gemessen - vorher fand ab Level 6 praktisch keine Horde
      // mehr eine Spur, bei Level 12 gar keine):
      //
      // Die Mitglieds-ABSTAENDE werden in activateEnemy durch anchorHalfWidth geteilt
      // und damit in Spuranteile umgerechnet. Sie wachsen also GENAU wie der Korridor
      // und brauchen keinen Aufschlag. Nur die FIGUREN selbst wachsen nach der
      // Perspektivkurve, die weiter oben staerker zulegt als der Korridor - das misst
      // getFigureOverscanFactor, und nur darauf gehoert der Faktor.
      //
      // Vorher stand hier die GESAMTE Formationsbreite mal Overscan. Ergebnis war ein
      // struktureller Widerspruch: computeHordeOffsets entwirft die Horde auf bis zu
      // walls.hordeMaxWidthPx (220 px), und dieselbe Horde wurde danach mit 220 x 1,519
      // = 334 px gegen den 234 px breiten Korridor geprueft. chooseSpawnLane lieferte
      // deshalb maxLane = 0 und nie eine Spur. Gemessen ueber je 60 s Fahrt:
      //   Level 1:   63 von 1.247 Versuchen erfolgreich, 4,95 Gegner/s
      //   Level 6:    2 von 3.495 Versuchen erfolgreich, 0,03 Gegner/s
      //   Level 12:   0 von 3.577 Versuchen erfolgreich, 0,00 Gegner/s
      // Verschaerft wurde es dadurch, dass eine abgelehnte Horde als deferredSpawn
      // liegen bleibt und in update() auch jeden EINZELGEGNER blockiert - eine
      // unplatzierbare Horde legt den gesamten Nachschub still.
      getSquadWidth(offsets, widestBodyWidth) - widestBodyWidth
        + widestBodyWidth * getFigureOverscanFactor(this.scene.scale.width, this.scene.scale.height),
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

  /**
   * Gegnertypen einer Horde. Sie folgen der Leveltabelle (`enemyWeights`) - fuer JEDE
   * Formation gleich.
   *
   * BEHOBEN am 2026-08-23 (Thomas: "bei Level 5 habe ich keine Chance mehr Gegner
   * abzuschiessen"). Bis hierher stand hier eine Sonderregel: Ein 'wedge' bestand
   * IMMER nur aus leichten Gegnern, unabhaengig von der Leveltabelle. Die Level 1-4
   * kennen ausschliesslich Keile, ab Level 5 kommen 'cluster' und 'row' dazu - und die
   * wuerfelten nach der Tabelle. Da rund zwei Drittel aller Spawn-Ereignisse Horden mit
   * je zehn bis zwoelf Mitgliedern sind, haengt fast die gesamte Gegnermasse daran.
   * GEMESSEN, Truppe 40 am Level-Deckel: Die mittleren Lebenspunkte je Gegner sprangen
   * von 4,1 (Level 4) auf 18,0 (Level 5) - Faktor 4,4 in einem einzigen Level. Die
   * Abschussrate fiel dabei von 6,1 auf 0,7 je Sekunde, 89 % der Gegner liefen durch.
   * Level 6 war danach wieder leichter (10,7 Punkte), weil dort zwei Drittel der Horden
   * wieder Keile sind - ein Zickzack, das niemand beabsichtigt hatte.
   * Die Formation beschreibt die FORM einer Horde (Keil, Reihe, Klumpen), nicht ihre
   * Staerke. Wer sie in der Leveltabelle wechselt, um das Bild zu variieren, darf damit
   * nicht die Haerte vervierfachen. Die Gewichte in `level.plans` sind im selben Zug
   * neu gesetzt worden, damit die tatsaechliche Mischung wieder der Tabelle entspricht.
   */
  private getSquadTypes(squadKind: 'wedge' | 'row' | 'cluster', size: number): EnemyType[] {
    const types = Array.from({ length: size }, () => chooseEnemyType(this.levelPlan.enemyWeights, () => Phaser.Math.RND.frac()))
    if (squadKind === 'cluster' && types.every((type) => type.key === types[0].key)) {
      const alternate = BALANCE.enemy.types.find((type, index) => this.levelPlan.enemyWeights[index] > 0 && type.key !== types[0].key)
      if (alternate !== undefined) types[types.length - 1] = alternate
    }
    return types
  }

  private activateEnemy(enemy: Phaser.Physics.Arcade.Image, type: EnemyType, lane: number, y: number, bossCompanion: boolean): void {
    const x = this.scene.scale.width / 2 + lane * getPlayfieldHalfWidth(this.scene.scale.width, this.scene.scale.height, y)
    // Gestalt wie bisher levelabhaengig ziehen - sie bestimmt jetzt AUCH, welcher
    // Bewegungssatz gilt (Thomas 2026-09-04: "jede figur eine andere Bewegung").
    enemy.setTexture(getEnemyTexture(type.texture, this.levelPlan.level, Phaser.Math.RND.frac()))
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
    // Der Bewegungssatz haengt an der GEZOGENEN GESTALT, nicht an der Staerke: Jede
    // Figur hat ihre eigene Gangart. Gestalten ohne Satz behalten die gerechnete Bewegung.
    const gestalt = enemy.texture.key
    const satz = this.gegnerBilder[gestalt]
    enemy.setData('bildsatz', satz !== undefined)
    enemy.setData('gestalt', gestalt)
    if (satz !== undefined) enemy.setTexture(satz[0])
    enemy.setActive(true).setVisible(true).clearTint()
    this.applyPerspectiveScale(enemy, y)
    this.applyHorizonReveal(enemy)
    enemy.setData('hp', getEnemyHp(type, this.levelPlan.level, this.getPlayerPower()))
    enemy.setData('speedFactor', type.speedFactor)
    // Tempo aus der GEZOGENEN GESTALT - dieselbe Quelle wie der Bildtakt, damit die
    // Fuesse nicht ueber die Strasse rutschen. Grundgestalten ohne Eintrag: 1,0.
    enemy.setData('gangartTempo', BALANCE.enemy.bilder.gangarten[gestalt]?.tempo ?? 1)
    enemy.setData('contactDamage', type.contactDamage)
    enemy.setData('coinValue', type.coinValue)
    // Kampfhoehen-Masse, nicht Sprite-Masse: Spurwahl, Schatten und Formationsbreite
    // rechnen alle in diesem System (enemy.figureScale).
    enemy.setData('bodyWidth', getFigureWidth(type))
    enemy.setData('bodyHeight', getFigureHeight(type))
    enemy.setData('lane', lane)
    enemy.setData('bossCompanion', bossCompanion)
    enemy.setData('durchgebrochen', false)
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
    // Grundgroesse x Perspektive: figureScale hebt die Figur auf Spielgroesse, der
    // Perspektivfaktor schrumpft sie mit der Entfernung.
    // figureTextureScale halbiert die doppelt aufgeloeste Textur zurueck auf Spielgroesse.
    const faktor = BALANCE.enemy.figureScale * BALANCE.render.figureTextureScale
      * getPerspectiveScale(this.scene.scale.width, this.scene.scale.height, y)
    enemy.setScale(faktor)
    // Nachgefuehrte Groesse fuer alle, die mit der Figurenbreite rechnen (Schatten,
    // Spurreservierung). Die Rohbreite bleibt als bodyWidth erhalten.
    // bodyWidth ist bereits die Kampfhoehen-Breite - fuer die Bildschirmbreite fehlt
    // nur noch die Perspektive, nicht erneut figureScale.
    enemy.setData('scaledWidth', (enemy.getData('bodyWidth') as number) * getPerspectiveScale(this.scene.scale.width, this.scene.scale.height, y))
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
