import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS } from '../config/colors'
import { getBlockerPlan } from './blockerPlan'
import { decideGoodie } from './reinforcementPlan'
import { getPlayfieldHalfWidth, getWallGeometry } from './road'
import { isWallSlot } from './wallPattern'
import type { WeaponKey } from './weapons'

// Seit W2 traegt diese Klasse die Wandsegmente, seit W4 als DAUERWAND. Seit dem
// Referenzvorbild-Abgleich (Thomas 2026-08-22) sind die beiden Seiten GRUNDSAETZLICH
// VERSCHIEDEN:
//
//   LINKS  = Sammelbahn. Eine Kette von "+1"-Plaettchen ohne Lebenspunkte. Man faehrt
//            hinein und sammelt sie durch Beruehrung ein - kein Schuss noetig. Die
//            Plaettchen bremsen die Truppe auch nicht (getWallPresence ignoriert sie).
//   RECHTS = Wand. Zerschiessbare Segmente mit Lebenspunkten wie bisher; unregelmaessig
//            stecken Waffen darin, der Rest sind Muenz-Segmente.
//
// Damit wird jede Fahrt eine Entscheidung: links Masse sammeln oder rechts Feuerkraft
// holen. Umbenennung auf "Walls" folgt im W6-Aufraeumen.

type WallSide = 'left' | 'right'
type WallContent = 'coin' | 'weapon' | 'pickup'

interface BlockerPair {
  blocker: Phaser.Physics.Arcade.Image
  label: Phaser.GameObjects.Text
  goodieText: Phaser.GameObjects.Text
  reward: Phaser.Physics.Arcade.Image
  active: boolean
  broken: boolean
  content: WallContent
  side: WallSide
  weapon: WeaponKey
}

/** Linke Plaettchen werden eingesammelt statt zerschossen - sie sind keine Wand. */
function isPickup(pair: BlockerPair): boolean {
  return pair.content === 'pickup'
}

export class Blockers {
  private readonly scene: Phaser.Scene
  private readonly chooseWeapon: (currentWeapon: WeaponKey) => WeaponKey
  private readonly getCurrentWeapon: () => WeaponKey
  private readonly getTeamSize: () => number
  private readonly getDamage: () => number
  private readonly getShotsPerSec: () => number
  private readonly rng: () => number
  private readonly onBroken: (x: number, y: number) => void
  private readonly applyReinforcement: (apply: (current: number) => number) => void
  private readonly pairs: BlockerPair[]
  private readonly blockerGroup: Phaser.Physics.Arcade.Group
  private readonly rewardGroup: Phaser.Physics.Arcade.Group
  private readonly drySpawns: Record<WallSide, number> = { left: 0, right: 0 }
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
    this.pairs = []
    this.blockerGroup = scene.physics.add.group()
    this.rewardGroup = scene.physics.add.group()
    // Kette startet sofort: der erste update() spawnt das erste Segmentpaar.
    this.chainAccumulatorPx = BALANCE.walls.segmentHeightPx
    this.currentLevel = 1
    this.elapsedMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs
    this.nextSpawnId = -1
    for (let index = 0; index < BALANCE.pools.blockers; index += 1) this.pairs.push(this.createPair())
  }

  public getBlockers(): Phaser.Physics.Arcade.Group { return this.blockerGroup }

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

  public isBlocker(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    return this.pairs.some((pair) => pair.blocker === candidate)
  }

  // Liegt auf Hoehe y (plus Puffer) ein stehendes Wandsegment? Steuert den dynamischen
  // Drag-Bereich: neben einer Wand endet er am Korridor, in einer Luecke am Strassenrand.
  public getWallPresence(y: number, halfSpanPx: number): Readonly<{ left: boolean; right: boolean }> {
    const reach = BALANCE.walls.segmentHeightPx / 2 + halfSpanPx
    let left = false
    let right = false
    for (const pair of this.pairs) {
      if (!pair.active || pair.broken || !pair.blocker.active) continue
      // Sammelplaettchen sind kein Hindernis: Wer sie einsammeln soll, muss auch
      // hineinfahren duerfen. Nur echte Wandsegmente begrenzen den Fahrbereich.
      if (isPickup(pair)) continue
      if (Math.abs(pair.blocker.y - y) >= reach) continue
      if (pair.side === 'left') left = true
      else right = true
      if (left && right) break
    }
    return { left, right }
  }

  public isPickupSegment(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    return this.pairs.some((pair) => pair.blocker === candidate && pair.active && !pair.broken && isPickup(pair))
  }

  /**
   * Sammelplaettchen durch Beruehrung einloesen. Rueckgabe ist der Zuwachs (0, wenn
   * das Plaettchen schon weg ist), damit die Szene die Quittung nur einmal zeigt.
   */
  public collectPickup(blocker: Phaser.Physics.Arcade.Image): number {
    const pair = this.pairs.find((candidate) => candidate.blocker === blocker)
    if (pair === undefined || !pair.active || pair.broken || !isPickup(pair)) return 0
    const gain = BALANCE.walls.pickupTeamGain
    this.applyReinforcement((current) => current + gain)
    this.recycle(pair)
    return gain
  }

  public isReward(candidate: Phaser.GameObjects.GameObject): candidate is Phaser.Physics.Arcade.Image {
    return this.pairs.some((pair) => pair.reward === candidate)
  }

  public damage(blocker: Phaser.Physics.Arcade.Image, damage: number): boolean {
    const pair = this.pairs.find((candidate) => candidate.blocker === blocker)
    if (pair === undefined || !pair.active || pair.broken) return false
    // Sammelplaettchen haben keine Lebenspunkte: Sie werden durchfahren, nicht
    // beschossen. Kugeln fliegen wirkungslos durch - sonst schoesse man sich die
    // eigene Verstaerkung weg.
    if (isPickup(pair)) return false
    const remainingHp = (blocker.getData('hp') as number) - damage
    blocker.setData('hp', remainingHp)
    pair.label.setText(remainingHp <= 0 ? '' : `${Math.max(0, Math.ceil(remainingHp))}`)
    if (remainingHp > 0) return false

    if (pair.content === 'coin') {
      this.onBroken(blocker.x, blocker.y)
      this.recycle(pair)
      return true
    }
    pair.broken = true
    blocker.disableBody(true, true)
    blocker.setActive(false).setVisible(false)
    pair.label.setActive(false).setVisible(false)
    // Die freigeschossene Waffe faellt an die Korridorkante: Der Drag endet seit W4 am
    // Korridor, in der Wandspur waere sie unerreichbar.
    pair.reward.enableBody(true, this.rewardCollectX(pair, pair.reward.y), pair.reward.y, true, true)
    pair.reward.setActive(true).setVisible(true).setAlpha(Math.max(pair.reward.alpha, 0.01))
    return true
  }

  private rewardCollectX(pair: BlockerPair, y: number): number {
    const playfieldHalf = getPlayfieldHalfWidth(this.scene.scale.width, this.scene.scale.height, y)
    const sign = pair.side === 'left' ? -1 : 1
    return this.scene.scale.width / 2 + sign * (playfieldHalf - pair.reward.displayWidth / 2 - 4)
  }

  public collect(reward: Phaser.Physics.Arcade.Image): WeaponKey | undefined {
    const pair = this.pairs.find((candidate) => candidate.reward === reward)
    if (pair === undefined || !pair.active || !pair.broken || !reward.active) return undefined
    const weapon = pair.weapon
    this.recycle(pair)
    return weapon
  }

  public update(dt: number): void {
    this.elapsedMs += dt
    const movement = (BALANCE.scrollSpeed * dt) / 1000
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
      if (pair.blocker.active && pair.blocker.y - pair.blocker.displayHeight / 2 > this.scene.scale.height) this.recycle(pair)
      else if (pair.broken && pair.reward.y - pair.reward.displayHeight / 2 > this.scene.scale.height) this.recycle(pair)
    }
  }

  private createPair(): BlockerPair {
    const blocker = this.scene.physics.add.image(0, 0, 'wall-segment-right')
      .setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    ;(blocker.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
    // Body einmal in Texturpixeln setzen: Arcade skaliert ihn mit der DisplaySize mit.
    ;(blocker.body as Phaser.Physics.Arcade.Body).setSize(128, BALANCE.walls.segmentHeightPx, true)
    blocker.disableBody(true, true)
    this.blockerGroup.add(blocker)
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
    return { blocker, label, goodieText, reward, active: false, broken: false, content: 'coin', side: 'right', weapon: 'normal' }
  }

  private wallGeometry(side: WallSide, y: number): { x: number; width: number } {
    return getWallGeometry(this.scene.scale.width, this.scene.scale.height, y, side)
  }

  private chooseContent(side: WallSide): WallContent {
    // Links ist jede Kachel ein Sammelplaettchen - die Kette ist der Reiz, nicht der
    // seltene Treffer. Rechts bleibt die Goodie-Regel mit Garantie nach Nieten.
    if (side === 'left') return 'pickup'
    if (decideGoodie(this.drySpawns[side], BALANCE.walls.weaponChance, BALANCE.walls.goodieMaxDry, this.rng)) {
      this.drySpawns[side] = 0
      return 'weapon'
    }
    this.drySpawns[side] += 1
    return 'coin'
  }

  private spawn(side: WallSide): void {
    const pair = this.pairs.find((candidate) => !candidate.active)
    if (pair === undefined) return this.warnPoolExhausted()
    const y = BALANCE.road.horizonY
    const geometry = this.wallGeometry(side, y)
    const plan = getBlockerPlan(this.currentLevel, this.getTeamSize(), this.getCurrentWeapon(), this.getDamage(), this.getShotsPerSec())
    const maxHp = plan.maxHp
    const content = this.chooseContent(side)
    pair.active = true
    pair.broken = false
    pair.content = content
    pair.side = side
    pair.weapon = content === 'weapon' ? this.chooseWeapon(this.getCurrentWeapon()) : 'normal'
    pair.blocker.setTexture(side === 'left' ? 'wall-segment-left' : 'wall-segment-right')
    pair.blocker.enableBody(true, geometry.x, y, true, true)
    pair.blocker.setDisplaySize(geometry.width, BALANCE.walls.segmentHeightPx).setActive(true).setVisible(true).setAlpha(0)
    const body = pair.blocker.body as Phaser.Physics.Arcade.Body
    body.moves = false
    body.updateFromGameObject()
    pair.blocker.setData('hp', maxHp)
    pair.blocker.setData('maxHp', maxHp)
    pair.blocker.setData('spawnId', this.nextSpawnId)
    this.nextSpawnId -= 1
    if (content === 'pickup') {
      // Kein Lebenspunkte-Label: Das Plaettchen zeigt, was es bringt, nicht was es aushaelt.
      pair.label.setActive(false).setVisible(false)
      pair.goodieText.setText(`+${BALANCE.walls.pickupTeamGain}`).setPosition(geometry.x, y).setActive(true).setVisible(true).setAlpha(0)
      pair.reward.setActive(false).setVisible(false)
      return
    }
    pair.label.setText(`${maxHp}`).setPosition(geometry.x, y + BALANCE.walls.labelOffsetPx).setActive(true).setVisible(true).setAlpha(0)
    {
      // Der Inhalt sitzt ab Spawn sichtbar in der Wandmitte und scheint durch die
      // halbtransparente Wand; einsammelbar (Body) wird er erst nach dem Zerschiessen.
      pair.goodieText.setActive(false).setVisible(false)
      pair.reward.setTexture(content === 'weapon' ? `weapon-${pair.weapon}-gate` : 'coin').setPosition(geometry.x, y).setActive(false).setVisible(true).setAlpha(0)
      this.fitRewardToWall(pair, geometry.width)
    }
  }

  private movePair(pair: BlockerPair, movement: number): void {
    if (pair.blocker.active) {
      const y = pair.blocker.y + movement
      const geometry = this.wallGeometry(pair.side, y)
      pair.blocker.setPosition(geometry.x, y)
      pair.blocker.setDisplaySize(geometry.width, BALANCE.walls.segmentHeightPx)
      ;(pair.blocker.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
      const alpha = Math.min(1, Math.max(0, (y - pair.blocker.displayHeight / 2 - BALANCE.road.horizonY) / BALANCE.road.entryFadePx))
      pair.blocker.setAlpha(alpha)
      pair.label.setPosition(geometry.x, y + BALANCE.walls.labelOffsetPx).setAlpha(alpha)
      if (pair.content === 'pickup') {
        pair.goodieText.setPosition(geometry.x, y).setAlpha(alpha)
        const naturalWidth = pair.goodieText.width
        pair.goodieText.setScale(naturalWidth > geometry.width - 8 ? (geometry.width - 8) / naturalWidth : 1)
      }
    }
    if (pair.content === 'pickup') return
    const rewardY = pair.reward.y + movement
    const rewardGeometry = this.wallGeometry(pair.side, rewardY)
    pair.reward.setPosition(pair.broken ? this.rewardCollectX(pair, rewardY) : rewardGeometry.x, rewardY)
    this.fitRewardToWall(pair, rewardGeometry.width)
    pair.reward.setAlpha(Math.min(1, Math.max(0, (rewardY - pair.reward.displayHeight / 2 - BALANCE.road.horizonY) / BALANCE.road.entryFadePx)))
    if (!pair.broken || !pair.reward.active) return
    ;(pair.reward.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
  }

  // Der Inhalt scheint durch die Wand und darf sie nie ueberragen: auf die aktuelle
  // Wandbreite einpassen, aber nie ueber die natuerliche Texturgroesse vergroessern.
  private fitRewardToWall(pair: BlockerPair, wallWidth: number): void {
    const source = pair.reward.texture.getSourceImage() as { width: number; height: number }
    const targetWidth = Math.min(source.width, Math.max(8, wallWidth - 8))
    pair.reward.setDisplaySize(targetWidth, targetWidth * source.height / source.width)
  }

  private recycle(pair: BlockerPair): void {
    pair.active = false
    pair.broken = false
    pair.blocker.disableBody(true, true)
    pair.blocker.setActive(false).setVisible(false)
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
