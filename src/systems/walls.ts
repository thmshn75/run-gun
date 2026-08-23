import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS } from '../config/colors'
import { getWallPlan } from './wallPlan'
import { decideGoodie } from './reinforcementPlan'
import { advanceAlongRoad, getPlayfieldHalfWidth, getRoadScale, getRoadSegment, getWallGeometry } from './road'
import { isWallSlot } from './wallPattern'
import type { WeaponKey } from './weapons'
import { getCurrentScrollSpeed } from './speed'

// Seit W2 traegt diese Klasse die Wandsegmente, seit W4 als DAUERWAND. Seit dem
// Referenzvorbild-Abgleich (Thomas 2026-08-22) sind die beiden Seiten GRUNDSAETZLICH
// VERSCHIEDEN:
//
//   LINKS  = Sammelbahn. Eine Kette von "+1"-Plaettchen ohne Lebenspunkte. Man faehrt
//            hinein und sammelt sie durch Beruehrung ein - kein Schuss noetig. Die
//            Plaettchen bremsen die Truppe auch nicht (getWallPresence ignoriert sie).
//   RECHTS = Wand. Zerschiessbare Segmente mit Lebenspunkten. JEDES traegt einen
//            Feuerkraft-Gewinn: Waffe (selten), Schaden oder Feuerrate. Muenzen fallen
//            bei jedem Bruch ab - Nebeneffekt statt Inhalt.
//
// In beide Bahnen mischen sich seit 2026-08-22 ROTE Kacheln, die abziehen statt zu
// geben (Thomas: "man erreicht schnell das maximum ueberall und verliert nie etwas").
// Sie folgen der Logik ihrer Seite und drehen sie um:
//   LINKS  rote Plaettchen ziehen Figuren ab und sind wie die blauen unbeschiessbar -
//          man muss ihnen AUSWEICHEN statt durchzufahren.
//   RECHTS rote Segmente ziehen Schaden oder Feuerrate ab, wenn man sie zerschiesst -
//          man muss das FEUER EINSTELLEN und sie vorbeiziehen lassen.
//
// Damit wird jede Fahrt eine Entscheidung: links Masse sammeln oder rechts Feuerkraft
// holen. Umbenennung auf "Walls" folgt im W6-Aufraeumen.

type WallSide = 'left' | 'right'
type WallContent = 'weapon' | 'damage' | 'rate' | 'pickup' | 'drain' | 'weakenDamage' | 'weakenRate'

interface WallPair {
  wall: Phaser.Physics.Arcade.Image
  label: Phaser.GameObjects.Text
  goodieText: Phaser.GameObjects.Text
  // WELTANKER der Kachel. Getrennt von der gezeichneten Position gefuehrt, weil die
  // Bildschirmmitte durch die gekruemmte Abbildung minimal darunter liegt - wer sie
  // zurueckliest, sammelt den Versatz Bild fuer Bild auf (siehe getRoadSegment).
  anchorY: number
  reward: Phaser.Physics.Arcade.Image
  active: boolean
  broken: boolean
  content: WallContent
  side: WallSide
  weapon: WeaponKey
}

/**
 * Linke Plaettchen werden eingesammelt statt zerschossen - sie sind keine Wand. Das
 * gilt fuer die roten genauso: Waeren sie beschiessbar, koennte man sie wegraeumen
 * statt auszuweichen, und die Entscheidung waere wieder weg.
 */
function isPickup(pair: WallPair): boolean {
  return pair.content === 'pickup' || pair.content === 'drain'
}

/** Rote Kacheln - auf beiden Seiten dieselbe Textur und dieselbe Aussage: nicht anfassen. */
function isBad(content: WallContent): boolean {
  return content === 'drain' || content === 'weakenDamage' || content === 'weakenRate'
}

export class Walls {
  private readonly scene: Phaser.Scene
  private readonly chooseWeapon: (currentWeapon: WeaponKey) => WeaponKey
  private readonly getCurrentWeapon: () => WeaponKey
  private readonly getTeamSize: () => number
  private readonly getDamage: () => number
  private readonly getShotsPerSec: () => number
  private readonly rng: () => number
  private readonly onBroken: (x: number, y: number) => void
  private readonly applyReinforcement: (apply: (current: number) => number) => void
  private readonly applyStat: (stat: 'damage' | 'rate', gain: number) => void
  private readonly pairs: WallPair[]
  private readonly paarZuWand: Map<Phaser.GameObjects.GameObject, WallPair>
  private readonly paarZuBelohnung: Map<Phaser.GameObjects.GameObject, WallPair>
  private readonly wallGroup: Phaser.Physics.Arcade.Group
  private readonly rewardGroup: Phaser.Physics.Arcade.Group
  private readonly drySpawns: Record<WallSide, number> = { left: 0, right: 0 }
  // Wie viele rote Kacheln zuletzt in Folge kamen - Grundlage der badMaxRun-Regel.
  private readonly badRun: Record<WallSide, number> = { left: 0, right: 0 }
  // Rechts versetzt gestartet, damit die Luecken der beiden Seiten nie synchron liegen.
  private readonly slotIndex: Record<WallSide, number> = { left: 0, right: BALANCE.walls.wallRightOffsetSlots }
  private chainAccumulatorPx: number
  private currentLevel: number
  private elapsedMs: number
  private lastPoolWarningAtMs: number
  private nextSpawnId: number

  public constructor(
    scene: Phaser.Scene,
    chooseWeapon: (currentWeapon: WeaponKey) => WeaponKey,
    getCurrentWeapon: () => WeaponKey,
    getTeamSize: () => number,
    getDamage: () => number,
    getShotsPerSec: () => number,
    rng: () => number,
    onBroken: (x: number, y: number) => void,
    applyReinforcement: (apply: (current: number) => number) => void,
    applyStat: (stat: 'damage' | 'rate', gain: number) => void,
  ) {
    this.scene = scene
    this.chooseWeapon = chooseWeapon
    this.getCurrentWeapon = getCurrentWeapon
    this.getTeamSize = getTeamSize
    this.getDamage = getDamage
    this.getShotsPerSec = getShotsPerSec
    this.rng = rng
    this.onBroken = onBroken
    this.applyReinforcement = applyReinforcement
    this.applyStat = applyStat
    this.pairs = []
    this.paarZuWand = new Map()
    this.paarZuBelohnung = new Map()
    this.wallGroup = scene.physics.add.group()
    this.rewardGroup = scene.physics.add.group()
    // Kette startet sofort: der erste update() spawnt das erste Segmentpaar.
    this.chainAccumulatorPx = BALANCE.walls.segmentHeightPx
    this.currentLevel = 1
    this.elapsedMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs
    this.nextSpawnId = -1
    for (let index = 0; index < BALANCE.pools.walls; index += 1) {
      const pair = this.createPair()
      this.pairs.push(pair)
      // Nachschlagtabellen statt linearer Suche. Die Zuordnung Objekt -> Paar steht
      // beim Erzeugen fest und aendert sich nie - die Paare sind ein fester Pool.
      // GEMESSEN (Profil ueber 2 s Spielstart, 2026-08-23): isWall und die anonyme
      // Funktion daneben kosteten zusammen 85 ms von 1.185 ms aktiver Rechenzeit, also
      // 7 %. Jede Kollisionsmeldung lief vorher ueber pairs.some/find - 32 Vergleiche,
      // und Kollisionen sind die groesste Rechenposten des Spiels ueberhaupt (contains,
      // collideGroupVsGroup und Verwandte zusammen ueber 30 %).
      this.paarZuWand.set(pair.wall, pair)
      this.paarZuBelohnung.set(pair.reward, pair)
    }
  }

  public getWalls(): Phaser.Physics.Arcade.Group { return this.wallGroup }

  public getRewards(): Phaser.Physics.Arcade.Group { return this.rewardGroup }

  public hasActivePair(): boolean { return this.pairs.some((pair) => pair.active) }

  public resetForLevel(level: number): void {
    this.currentLevel = Math.max(1, Math.floor(level))
    this.deactivateAll()
    this.chainAccumulatorPx = BALANCE.walls.segmentHeightPx
  }

  public deactivateAll(): void {
    for (const pair of this.pairs) this.recycle(pair)
  }

  public isWall(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    return this.paarZuWand.has(candidate)
  }

  // Liegt auf Hoehe y (plus Puffer) ein stehendes Wandsegment? Steuert den dynamischen
  // Drag-Bereich: neben einer Wand endet er am Korridor, in einer Luecke am Strassenrand.
  public getWallPresence(y: number, halfSpanPx: number): Readonly<{ left: boolean; right: boolean }> {
    let left = false
    let right = false
    for (const pair of this.pairs) {
      if (!pair.active || pair.broken || !pair.wall.active) continue
      // Sammelplaettchen sind kein Hindernis: Wer sie einsammeln soll, muss auch
      // hineinfahren duerfen. Nur echte Wandsegmente begrenzen den Fahrbereich.
      if (isPickup(pair)) continue
      // Reichweite aus der TATSAECHLICHEN Hoehe des Segments: Seit die Kachel mit der
      // Entfernung schrumpft, waere die Nennhoehe von 72 px weiter oben zu grosszuegig.
      if (Math.abs(pair.wall.y - y) >= pair.wall.displayHeight / 2 + halfSpanPx) continue
      if (pair.side === 'left') left = true
      else right = true
      if (left && right) break
    }
    return { left, right }
  }

  public isPickupSegment(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    const pair = this.paarZuWand.get(candidate)
    return pair !== undefined && pair.active && !pair.broken && isPickup(pair)
  }

  /**
   * Zieht dieses Sammelplaettchen ab? Die Szene braucht das, weil rote Kacheln seit
   * 2026-08-23 eine groessere Eindringtiefe verlangen als blaue (walls.drainOverlapFigures).
   */
  public isDrainSegment(candidate: Phaser.GameObjects.GameObject): boolean {
    const pair = this.paarZuWand.get(candidate)
    return pair !== undefined && pair.active && !pair.broken && pair.content === 'drain'
  }

  /**
   * Sammelplaettchen durch Beruehrung einloesen. Rueckgabe ist der Zuwachs (0, wenn
   * das Plaettchen schon weg ist), damit die Szene die Quittung nur einmal zeigt.
   */
  public collectPickup(wall: Phaser.Physics.Arcade.Image): number {
    const pair = this.paarZuWand.get(wall)
    if (pair === undefined || !pair.active || pair.broken || !isPickup(pair)) return 0
    // Rot zieht ab, Blau gibt: dieselbe Beruehrung, entgegengesetztes Vorzeichen.
    const gain = pair.content === 'drain' ? -BALANCE.walls.drainTeam : BALANCE.walls.pickupTeamGain
    this.applyReinforcement((current) => current + gain)
    this.recycle(pair)
    return gain
  }

  public isReward(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    return this.paarZuBelohnung.has(candidate)
  }

  public damage(wall: Phaser.Physics.Arcade.Image, damage: number): boolean {
    const pair = this.paarZuWand.get(wall)
    if (pair === undefined || !pair.active || pair.broken) return false
    // Sammelplaettchen haben keine Lebenspunkte: Sie werden durchfahren, nicht
    // beschossen. Kugeln fliegen wirkungslos durch - sonst schoesse man sich die
    // eigene Verstaerkung weg.
    if (isPickup(pair)) return false
    const remainingHp = (wall.getData('hp') as number) - damage
    wall.setData('hp', remainingHp)
    pair.label.setText(remainingHp <= 0 ? '' : `${Math.max(0, Math.ceil(remainingHp))}`)
    if (remainingHp > 0) return false

    // Muenzen fallen bei jedem zerschossenen BLAUEN Segment ab. Ein rotes gibt keine:
    // sonst waere Draufhalten trotz Abzug noch belohnt, und die Entscheidung, das Feuer
    // einzustellen, waere keine mehr.
    if (!isBad(pair.content)) this.onBroken(wall.x, wall.y)
    if (pair.content === 'damage' || pair.content === 'rate') {
      // Sofortwirkung auf den JETZT aktuellen Stand - wie bei der Sammelbahn.
      this.applyStat(pair.content, pair.content === 'damage' ? BALANCE.walls.damageGain : BALANCE.walls.rateGain)
      this.recycle(pair)
      return true
    }
    if (pair.content === 'weakenDamage' || pair.content === 'weakenRate') {
      // Dasselbe Vorgehen mit umgekehrtem Vorzeichen: Wer ein rotes Segment
      // zerschiesst, hat sich die Schwaechung selbst geholt.
      this.applyStat(
        pair.content === 'weakenDamage' ? 'damage' : 'rate',
        pair.content === 'weakenDamage' ? -BALANCE.walls.weakenDamage : -BALANCE.walls.weakenRate,
      )
      this.recycle(pair)
      return true
    }
    pair.broken = true
    wall.disableBody(true, true)
    wall.setActive(false).setVisible(false)
    pair.label.setActive(false).setVisible(false)
    // Die freigeschossene Waffe faellt an die Korridorkante: Der Drag endet seit W4 am
    // Korridor, in der Wandspur waere sie unerreichbar.
    pair.reward.enableBody(true, this.rewardCollectX(pair, pair.reward.y), pair.reward.y, true, true)
    pair.reward.setActive(true).setVisible(true).setAlpha(Math.max(pair.reward.alpha, 0.01))
    return true
  }

  private rewardCollectX(pair: WallPair, y: number): number {
    const playfieldHalf = getPlayfieldHalfWidth(this.scene.scale.width, this.scene.scale.height, y)
    const sign = pair.side === 'left' ? -1 : 1
    return this.scene.scale.width / 2 + sign * (playfieldHalf - pair.reward.displayWidth / 2 - 4)
  }

  public collect(reward: Phaser.Physics.Arcade.Image): WeaponKey | undefined {
    const pair = this.paarZuBelohnung.get(reward)
    if (pair === undefined || !pair.active || !pair.broken || !reward.active) return undefined
    const weapon = pair.weapon
    this.recycle(pair)
    return weapon
  }

  public update(dt: number): void {
    this.elapsedMs += dt
    const movement = (getCurrentScrollSpeed() * dt) / 1000
    // Dauerwand-Kette: sobald das zuletzt gespawnte Paar eine Segmenthoehe gescrollt
    // ist, schliesst am Horizont das naechste an — unabhaengig vom Objektzustand,
    // damit ein frueh zerschossenes Segment die Kette nicht stocken laesst.
    this.chainAccumulatorPx += movement
    while (this.chainAccumulatorPx >= BALANCE.walls.segmentHeightPx) {
      this.chainAccumulatorPx -= BALANCE.walls.segmentHeightPx
      for (const side of ['left', 'right'] as const) {
        // Links durchgehend ohne Pausen: Die Sammelbahn ist kein Hindernis, also
        // braucht sie keine Ausweichluecke. Rechts bleiben die Abschnitte, dort muss
        // die Truppe zwischen Wand und Strassenrand ausweichen koennen.
        const belegt = side === 'left'
          || isWallSlot(this.slotIndex[side], BALANCE.walls.wallRunLength, BALANCE.walls.wallGapSlots)
        if (belegt) this.spawn(side)
        this.slotIndex[side] += 1
      }
    }
    for (const pair of this.pairs) {
      if (!pair.active) continue
      this.movePair(pair, movement)
      if (pair.wall.active && pair.wall.y - pair.wall.displayHeight / 2 > this.scene.scale.height) this.recycle(pair)
      else if (pair.broken && pair.reward.y - pair.reward.displayHeight / 2 > this.scene.scale.height) this.recycle(pair)
    }
  }

  private createPair(): WallPair {
    const wall = this.scene.physics.add.image(0, 0, 'wall-segment-right')
      .setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    ;(wall.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
    // Body einmal in Texturpixeln setzen: Arcade skaliert ihn mit der DisplaySize mit.
    ;(wall.body as Phaser.Physics.Arcade.Body).setSize(128, BALANCE.walls.segmentHeightPx, true)
    wall.disableBody(true, true)
    this.wallGroup.add(wall)
    const label = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui', fontSize: '17px', color: '#ffffff', stroke: HUD_COLORS.textDark, strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(BALANCE.layers.gameplay + 1).setActive(false).setVisible(false)
    // Weisse Schrift auf beiden Seiten (Thomas 2026-08-22): Auf deckendem Blau traegt
    // sie am besten, und die Seite erkennt man ohnehin an der Farbe der Kachel.
    const goodieText = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui', fontSize: '19px', color: '#ffffff', stroke: HUD_COLORS.textDark, strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(BALANCE.layers.wallContent).setActive(false).setVisible(false)
    const reward = this.scene.physics.add.image(0, 0, 'weapon-normal-gate').setDepth(BALANCE.layers.wallContent).setActive(false).setVisible(false)
    reward.disableBody(true, true)
    this.rewardGroup.add(reward)
    return { wall, label, goodieText, reward, anchorY: BALANCE.road.horizonY, active: false, broken: false, content: 'damage', side: 'right', weapon: 'normal' }
  }

  private wallGeometry(side: WallSide, y: number): { x: number; width: number } {
    return getWallGeometry(this.scene.scale.width, this.scene.scale.height, y, side)
  }

  /**
   * Rote Kachel? Gilt fuer beide Seiten gleich: erst ab badMinLevel, nie mehr als
   * badMaxRun in Folge. Die Laufzaehlung sitzt hier und nicht beim Ziehen, damit die
   * Regel unabhaengig davon greift, was die Seite sonst anbietet.
   */
  private rollBad(side: WallSide): boolean {
    if (this.currentLevel < BALANCE.walls.badMinLevel) return false
    if (this.badRun[side] >= BALANCE.walls.badMaxRun) {
      this.badRun[side] = 0
      return false
    }
    if (this.rng() >= BALANCE.walls.badChance) {
      this.badRun[side] = 0
      return false
    }
    this.badRun[side] += 1
    return true
  }

  private chooseContent(side: WallSide): WallContent {
    const bad = this.rollBad(side)
    // Links ist jede Kachel ein Sammelplaettchen - die Kette ist der Reiz, nicht der
    // seltene Treffer. Eine rote unterbricht sie und verlangt Ausweichen.
    if (side === 'left') return bad ? 'drain' : 'pickup'
    // Rechts geht Rot VOR der Waffengarantie: Sonst koennte ein garantiertes
    // Waffensegment die rote Kachel verdraengen und die Bahn waere wieder harmlos.
    // Die Nietenzaehlung laeuft dabei weiter, damit die Waffe nicht verloren geht,
    // sondern nur um eine Kachel spaeter kommt.
    if (bad) {
      this.drySpawns[side] += 1
      return this.rng() < 0.5 ? 'weakenDamage' : 'weakenRate'
    }
    if (decideGoodie(this.drySpawns[side], BALANCE.walls.weaponChance, BALANCE.walls.goodieMaxDry, this.rng)) {
      this.drySpawns[side] = 0
      return 'weapon'
    }
    this.drySpawns[side] += 1
    // Sonst zu gleichen Teilen Schaden oder Feuerrate - beides wirkt sofort beim
    // Zerschiessen, es gibt nichts einzusammeln.
    return this.rng() < 0.5 ? 'damage' : 'rate'
  }

  private spawn(side: WallSide): void {
    const pair = this.pairs.find((candidate) => !candidate.active)
    if (pair === undefined) return this.warnPoolExhausted()
    const anchorY = BALANCE.road.horizonY
    const segment = this.segmentAt(anchorY)
    const y = segment.centerY
    const geometry = this.wallGeometry(side, y)
    const plan = getWallPlan(this.currentLevel, this.getTeamSize(), this.getCurrentWeapon(), this.getDamage(), this.getShotsPerSec())
    const maxHp = plan.maxHp
    const content = this.chooseContent(side)
    pair.active = true
    pair.anchorY = anchorY
    pair.broken = false
    pair.content = content
    pair.side = side
    pair.weapon = content === 'weapon' ? this.chooseWeapon(this.getCurrentWeapon()) : 'normal'
    // Rot schlaegt die Seitenfarbe: Was abzieht, muss auf einen Blick als solches
    // erkennbar sein, noch bevor man die Beschriftung liest.
    pair.wall.setTexture(isBad(content) ? 'wall-segment-bad' : side === 'left' ? 'wall-segment-left' : 'wall-segment-right')
    pair.wall.enableBody(true, geometry.x, y, true, true)
    pair.wall.setDisplaySize(geometry.width, segment.height).setActive(true).setVisible(true).setAlpha(0)
    const body = pair.wall.body as Phaser.Physics.Arcade.Body
    body.moves = false
    body.updateFromGameObject()
    pair.wall.setData('hp', maxHp)
    pair.wall.setData('maxHp', maxHp)
    pair.wall.setData('spawnId', this.nextSpawnId)
    this.nextSpawnId -= 1
    if (content === 'pickup' || content === 'drain') {
      // Kein Lebenspunkte-Label: Das Plaettchen zeigt, was es bringt oder nimmt, nicht
      // was es aushaelt - beschiessen kann man es ohnehin nicht.
      pair.label.setActive(false).setVisible(false)
      const text = content === 'drain' ? `-${BALANCE.walls.drainTeam}` : `+${BALANCE.walls.pickupTeamGain}`
      pair.goodieText.setText(text).setPosition(geometry.x, y).setActive(true).setVisible(true).setAlpha(0)
      pair.reward.setActive(false).setVisible(false)
      return
    }
    pair.label.setText(`${maxHp}`)
      .setPosition(geometry.x, y + BALANCE.walls.labelOffsetPx * this.roadScaleAt(y))
      .setScale(this.roadScaleAt(y))
      .setActive(true).setVisible(true).setAlpha(0)
    if (content === 'weapon') {
      // Die Waffe sitzt ab Spawn sichtbar vor der Wand; einsammelbar (Body) wird sie
      // erst nach dem Zerschiessen.
      pair.goodieText.setActive(false).setVisible(false)
      pair.reward.setTexture(`weapon-${pair.weapon}-gate`).setPosition(geometry.x, y).setActive(false).setVisible(true).setAlpha(0)
      this.fitRewardToWall(pair, geometry.width)
      return
    }
    // Schaden und Feuerrate wirken sofort beim Zerschiessen - sie brauchen kein
    // Objekt zum Einsammeln, nur eine Beschriftung, die sagt was drin steckt. Das
    // Vorzeichen steht vorne, weil es die Handlung bestimmt: Plus draufhalten, Minus
    // vorbeiziehen lassen.
    const statText = content === 'damage' ? '+DMG'
      : content === 'rate' ? '+RATE'
        : content === 'weakenDamage' ? '-DMG' : '-RATE'
    pair.goodieText.setText(statText).setPosition(geometry.x, y).setActive(true).setVisible(true).setAlpha(0)
    pair.reward.setActive(false).setVisible(false)
  }

  private movePair(pair: WallPair, movement: number): void {
    // Welt-Bewegung statt Bildschirm-Bewegung, EINMAL je Paar: Kachel, Beschriftung und
    // Waffen-Reward haengen am selben Anker und duerfen nie auseinanderlaufen.
    pair.anchorY = this.advance(pair.anchorY, movement)
    if (pair.wall.active) {
      // Welt-Bewegung statt Bildschirm-Bewegung: Am Horizont deckt dieselbe Weltstrecke
      // weniger Pixel ab, das Segment kriecht dort und beschleunigt beim Naeherkommen -
      // wie die Haeuser daneben.
      const segment = this.segmentAt(pair.anchorY)
      const geometry = this.wallGeometry(pair.side, segment.centerY)
      pair.wall.setPosition(geometry.x, segment.centerY)
      pair.wall.setDisplaySize(geometry.width, segment.height)
      ;(pair.wall.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      const alpha = Math.min(1, Math.max(0, (segment.centerY - segment.height / 2 - BALANCE.road.horizonY) / BALANCE.road.entryFadePx))
      pair.wall.setAlpha(alpha)
      // Auch die Beschriftung gehoert zur Kachel: fester Pixelabstand wuerde bei einer
      // 41 px hohen Ferndarstellung unten herausragen.
      const massstab = this.roadScaleAt(segment.centerY)
      pair.label.setPosition(geometry.x, segment.centerY + BALANCE.walls.labelOffsetPx * massstab).setAlpha(alpha).setScale(massstab)
      if (pair.content !== 'weapon') {
        pair.goodieText.setPosition(geometry.x, segment.centerY).setAlpha(alpha)
        const naturalWidth = pair.goodieText.width
        const nachBreite = naturalWidth > geometry.width - 8 ? (geometry.width - 8) / naturalWidth : 1
        pair.goodieText.setScale(Math.min(nachBreite, massstab))
      }
    }
    if (pair.content !== 'weapon') return
    const rewardY = this.segmentAt(pair.anchorY).centerY
    const rewardGeometry = this.wallGeometry(pair.side, rewardY)
    pair.reward.setPosition(pair.broken ? this.rewardCollectX(pair, rewardY) : rewardGeometry.x, rewardY)
    this.fitRewardToWall(pair, rewardGeometry.width)
    pair.reward.setAlpha(Math.min(1, Math.max(0, (rewardY - pair.reward.displayHeight / 2 - BALANCE.road.horizonY) / BALANCE.road.entryFadePx)))
    if (!pair.broken || !pair.reward.active) return
    ;(pair.reward.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
  }

  private advance(y: number, worldPx: number): number {
    return advanceAlongRoad(this.scene.scale.width, this.scene.scale.height, y, worldPx)
  }

  /** Wo die Kachel mit Weltanker y zu zeichnen ist und wie hoch - siehe getRoadSegment. */
  private segmentAt(anchorY: number): { centerY: number; height: number } {
    return getRoadSegment(this.scene.scale.width, this.scene.scale.height, anchorY, BALANCE.walls.segmentHeightPx)
  }

  private roadScaleAt(y: number): number {
    return getRoadScale(this.scene.scale.width, this.scene.scale.height, y)
  }

  // Der Inhalt scheint durch die Wand und darf sie nie ueberragen: auf die aktuelle
  // Wandbreite einpassen, aber nie ueber die natuerliche Texturgroesse vergroessern.
  private fitRewardToWall(pair: WallPair, wallWidth: number): void {
    const source = pair.reward.texture.getSourceImage() as { width: number; height: number }
    const targetWidth = Math.min(source.width, Math.max(8, wallWidth - 8))
    pair.reward.setDisplaySize(targetWidth, targetWidth * source.height / source.width)
  }

  private recycle(pair: WallPair): void {
    pair.active = false
    pair.broken = false
    pair.wall.disableBody(true, true)
    pair.wall.setActive(false).setVisible(false)
    pair.label.setActive(false).setVisible(false)
    pair.goodieText.setActive(false).setVisible(false)
    pair.reward.disableBody(true, true)
    pair.reward.setActive(false).setVisible(false)
  }

  private warnPoolExhausted(): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastPoolWarningAtMs < BALANCE.feedback.poolWarningIntervalMs) return
    console.warn('Wall pool exhausted; spawn skipped.')
    this.lastPoolWarningAtMs = this.elapsedMs
  }
}
