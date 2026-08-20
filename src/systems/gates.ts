import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS, STAT_COLORS, WEAPON_GATE_COLOR } from '../config/colors'
import { getRoadHalfWidth } from './road'
import { clampStat, type RunStats, type StatKey } from './upgrades'
import { type WeaponKey } from './weapons'

export interface GateOp {
  label: string
  apply: (current: number) => number
}

interface GatePair {
  left: Phaser.GameObjects.Image
  right: Phaser.GameObjects.Image
  leftText: Phaser.GameObjects.Text
  rightText: Phaser.GameObjects.Text
  leftIcon: Phaser.GameObjects.Image
  rightIcon: Phaser.GameObjects.Image
  statLabel: Phaser.GameObjects.Text
  active: boolean
  kind: 'stat' | 'weapon'
  stat: StatKey
  leftWeapon: WeaponKey
  rightWeapon: WeaponKey
  leftOp: GateOp
  rightOp: GateOp
  prevBottomY: number
  triggered: boolean
  flashUntilMs: number
}

type GateOperatorKind = (typeof BALANCE.gates.ops.kinds)[number]
type GateDirection = 'up' | 'down'

function pick<T>(values: readonly T[], rng: () => number): T {
  return values[Math.min(values.length - 1, Math.floor(rng() * values.length))]
}

function drawGateOp(current: number, rng: () => number): GateOp {
  const kind = pick(BALANCE.gates.ops.kinds, rng) as GateOperatorKind
  if (kind === 'multiply') {
    const multiplier = pick(BALANCE.gates.ops.multipliers, rng)
    return { label: `×${multiplier}`, apply: (value) => value * multiplier }
  }
  if (kind === 'divide') {
    const divisor = pick(BALANCE.gates.ops.divisors, rng)
    return { label: `÷${divisor}`, apply: (value) => value / divisor }
  }
  if (kind === 'add') {
    const magnitude = Math.max(1, Math.round(current * pick(BALANCE.gates.ops.additiveRatios, rng)))
    const sign = rng() < 0.5 ? 1 : -1
    return { label: `${sign > 0 ? '+' : '−'}${magnitude}`, apply: (value) => value + sign * magnitude }
  }
  const percentage = pick(BALANCE.gates.ops.percentages, rng)
  const label = `${percentage >= 0 ? '+' : '−'}${Math.abs(percentage * 100)} %`
  return { label, apply: (value) => value * (1 + percentage) }
}

function drawDirectionalOp(current: number, rng: () => number, direction: GateDirection): GateOp {
  const kind = pick(direction === 'up'
    ? ['multiply', 'add', 'percent'] as const
    : ['divide', 'add', 'percent'] as const, rng)
  if (kind === 'multiply') {
    const multiplier = pick(BALANCE.gates.ops.multipliers, rng)
    return { label: `×${multiplier}`, apply: (value) => value * multiplier }
  }
  if (kind === 'divide') {
    const divisor = pick(BALANCE.gates.ops.divisors, rng)
    return { label: `÷${divisor}`, apply: (value) => value / divisor }
  }
  if (kind === 'add') {
    const magnitude = Math.max(1, Math.round(current * pick(BALANCE.gates.ops.additiveRatios, rng)))
    const sign = direction === 'up' ? 1 : -1
    return { label: `${sign > 0 ? '+' : '−'}${magnitude}`, apply: (value) => value + sign * magnitude }
  }
  const percentages = BALANCE.gates.ops.percentages.filter((percentage) => direction === 'up' ? percentage > 0 : percentage < 0)
  const percentage = pick(percentages, rng)
  return { label: `${percentage >= 0 ? '+' : '−'}${Math.abs(percentage * 100)} %`, apply: (value) => value * (1 + percentage) }
}

export function drawGatePair(stat: StatKey, current: number, rng: () => number): { left: GateOp; right: GateOp } {
  const isValidPair = (left: GateOp, right: GateOp): boolean => {
    const leftResult = clampStat(stat, left.apply(current))
    const rightResult = clampStat(stat, right.apply(current))
    return leftResult !== current
      && rightResult !== current
      && leftResult !== rightResult
      && (stat !== 'hp' || leftResult > 0 || rightResult > 0)
  }

  for (let attempt = 0; attempt < BALANCE.gates.maxRedraws; attempt += 1) {
    const left = drawGateOp(current, rng)
    const right = drawGateOp(current, rng)
    if (isValidPair(left, right)) return { left, right }
  }

  const upWorks = clampStat(stat, current * 2) !== current
  const downWorks = clampStat(stat, current / 2) !== current
  if (upWorks !== downWorks) {
    const direction: GateDirection = upWorks ? 'up' : 'down'
    for (let attempt = 0; attempt < BALANCE.gates.maxRedraws; attempt += 1) {
      const left = drawDirectionalOp(current, rng, direction)
      const right = drawDirectionalOp(current, rng, direction)
      if (isValidPair(left, right)) return { left, right }
    }
    // At integer bounds, several different percentage and multiplier
    // labels can round to the same value. Keep the choice real in that discrete case.
    const sign = direction === 'up' ? 1 : -1
    const left = { label: `${sign > 0 ? '+' : '−'}1`, apply: (value: number) => value + sign }
    const right = { label: `${sign > 0 ? '+' : '−'}2`, apply: (value: number) => value + sign * 2 }
    if (isValidPair(left, right)) return { left, right }
  }

  return {
    left: { label: '+1', apply: (value) => value + 1 },
    right: { label: '−1', apply: (value) => value - 1 },
  }
}

export class Gates {
  private readonly scene: Phaser.Scene
  private readonly runStats: RunStats
  private readonly getAnchorPosition: () => Readonly<{ x: number; y: number }>
  private readonly onStatsChanged: () => void
  private readonly getWeapon: () => WeaponKey
  private readonly onWeaponSelected: (weapon: WeaponKey) => void
  private readonly rng: () => number
  private readonly pairs!: GatePair[]
  private readonly baseGateWidth: number
  private statBag: StatKey[]
  private lastStat: StatKey | null
  private spawnAccumulatorMs!: number
  private nextSpawnDelayMs!: number
  private elapsedMs!: number
  private lastPoolWarningAtMs!: number
  private spawnCount: number

  public constructor(
    scene: Phaser.Scene,
    runStats: RunStats,
    getAnchorPosition: () => Readonly<{ x: number; y: number }>,
    onStatsChanged: () => void,
    rng: () => number,
    getWeapon: () => WeaponKey,
    onWeaponSelected: (weapon: WeaponKey) => void,
  ) {
    this.scene = scene
    this.runStats = runStats
    this.getAnchorPosition = getAnchorPosition
    this.onStatsChanged = onStatsChanged
    this.rng = rng
    this.getWeapon = getWeapon
    this.onWeaponSelected = onWeaponSelected
    this.pairs = []
    this.baseGateWidth = (this.scene.scale.width - BALANCE.gates.gapBetween) / 2
    this.statBag = []
    this.lastStat = null
    this.spawnAccumulatorMs = 0
    this.nextSpawnDelayMs = BALANCE.gates.firstSpawnDelayMs
    this.elapsedMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs
    this.spawnCount = 0

    for (let index = 0; index < BALANCE.pools.gatePairs; index += 1) this.pairs.push(this.createPair())
  }

  public update(dt: number): void {
    this.elapsedMs += dt
    this.spawnAccumulatorMs += dt
    while (this.spawnAccumulatorMs >= this.nextSpawnDelayMs) {
      this.spawnAccumulatorMs -= this.nextSpawnDelayMs
      this.nextSpawnDelayMs = BALANCE.gates.spawnIntervalMs
      this.spawn()
    }

    const anchor = this.getAnchorPosition()
    const movement = ((BALANCE.scrollSpeed + BALANCE.gates.extraSpeed) * dt) / 1000
    for (const pair of this.pairs) {
      if (!pair.active) continue
      this.movePair(pair, movement)
      const bottomY = pair.left.y + pair.left.displayHeight / 2
      if (!pair.triggered && pair.prevBottomY < anchor.y && bottomY >= anchor.y) this.applyPair(pair, anchor.x)
      pair.prevBottomY = bottomY
      if (pair.triggered && this.elapsedMs >= pair.flashUntilMs) this.recycle(pair)
      else if (pair.left.y - pair.left.displayHeight / 2 > this.scene.scale.height) this.recycle(pair)
    }
  }

  private createPair(): GatePair {
    const left = this.scene.add.image(0, 0, 'gate').setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    const right = this.scene.add.image(0, 0, 'gate').setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'system-ui', fontSize: '34px', color: '#ffffff', stroke: HUD_COLORS.textDark, strokeThickness: 4, fontStyle: 'bold',
    }
    const leftText = this.scene.add.text(0, 0, '', textStyle).setOrigin(0.5).setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    const rightText = this.scene.add.text(0, 0, '', textStyle).setOrigin(0.5).setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    const leftIcon = this.scene.add.image(0, 0, 'weapon-normal-gate').setOrigin(0.5).setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    const rightIcon = this.scene.add.image(0, 0, 'weapon-normal-gate').setOrigin(0.5).setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    const statLabel = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui', fontSize: '17px', color: '#ffffff', stroke: HUD_COLORS.textDark, strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    return {
      left, right, leftText, rightText, leftIcon, rightIcon, statLabel, active: false, kind: 'stat', stat: 'hp', leftWeapon: 'normal', rightWeapon: 'normal',
      leftOp: { label: '', apply: (value) => value }, rightOp: { label: '', apply: (value) => value },
      prevBottomY: 0, triggered: false, flashUntilMs: 0,
    }
  }

  private spawn(): void {
    const pair = this.pairs.find((candidate) => !candidate.active)
    if (pair === undefined) {
      this.warnPoolExhausted()
      return
    }
    this.spawnCount += 1
    const isWeaponGate = this.spawnCount % BALANCE.gates.weaponGateEvery === 0
    const spawnY = BALANCE.road.horizonY
    pair.active = true
    pair.triggered = false
    pair.flashUntilMs = 0
    if (isWeaponGate) this.configureWeaponGate(pair, spawnY)
    else this.configureStatGate(pair, spawnY)
    this.setPairAlpha(pair, 0)
    this.layoutPair(pair)
    pair.prevBottomY = spawnY + BALANCE.gates.gateHeight / 2
  }

  private configureStatGate(pair: GatePair, spawnY: number): void {
    const stat = this.nextStat()
    const operations = drawGatePair(stat, this.runStats.get(stat), this.rng)
    const statColor = STAT_COLORS[stat]
    const statColorCss = `#${statColor.toString(16).padStart(6, '0')}`
    pair.kind = 'stat'
    pair.stat = stat
    pair.leftOp = operations.left
    pair.rightOp = operations.right
    pair.left.setPosition(0, spawnY).setActive(true).setVisible(true).setAlpha(1).setTint(statColor)
    pair.right.setPosition(0, spawnY).setActive(true).setVisible(true).setAlpha(1).setTint(statColor)
    pair.leftText.setFontSize('34px').setText(operations.left.label).setActive(true).setVisible(true).setAlpha(1).clearTint()
    pair.rightText.setFontSize('34px').setText(operations.right.label).setActive(true).setVisible(true).setAlpha(1).clearTint()
    pair.leftIcon.setActive(false).setVisible(false)
    pair.rightIcon.setActive(false).setVisible(false)
    pair.statLabel.setText(this.statLabel(stat)).setColor(statColorCss).setActive(true).setVisible(true).setAlpha(1).clearTint()
  }

  private configureWeaponGate(pair: GatePair, spawnY: number): void {
    const currentWeapon = this.getWeapon()
    const choices = this.drawWeaponPair(currentWeapon)
    const colorCss = `#${WEAPON_GATE_COLOR.toString(16).padStart(6, '0')}`
    pair.kind = 'weapon'
    pair.leftWeapon = choices.left
    pair.rightWeapon = choices.right
    pair.left.setPosition(0, spawnY).setActive(true).setVisible(true).setAlpha(1).setTint(WEAPON_GATE_COLOR)
    pair.right.setPosition(0, spawnY).setActive(true).setVisible(true).setAlpha(1).setTint(WEAPON_GATE_COLOR)
    pair.leftText.setActive(false).setVisible(false)
    pair.rightText.setActive(false).setVisible(false)
    pair.leftIcon.setTexture(`weapon-${choices.left}-gate`).setActive(true).setVisible(true).setAlpha(1).clearTint()
    pair.rightIcon.setTexture(`weapon-${choices.right}-gate`).setActive(true).setVisible(true).setAlpha(1).clearTint()
    pair.statLabel.setText('WAFFE').setColor(colorCss).setActive(true).setVisible(true).setAlpha(1).clearTint()
  }

  private movePair(pair: GatePair, movement: number): void {
    pair.left.y += movement
    this.layoutPair(pair)
    const alpha = Math.min(1, Math.max(0, (pair.left.y - BALANCE.road.horizonY) / BALANCE.road.entryFadePx))
    this.setPairAlpha(pair, alpha)
  }

  private setPairAlpha(pair: GatePair, alpha: number): void {
    pair.left.setAlpha(alpha)
    pair.right.setAlpha(alpha)
    pair.leftText.setAlpha(alpha)
    pair.rightText.setAlpha(alpha)
    pair.leftIcon.setAlpha(alpha)
    pair.rightIcon.setAlpha(alpha)
    pair.statLabel.setAlpha(alpha)
  }

  private layoutPair(pair: GatePair): void {
    const centerX = this.scene.scale.width / 2
    const y = pair.left.y
    const gateWidth = getRoadHalfWidth(this.scene.scale.width, this.scene.scale.height, y) - BALANCE.gates.gapBetween / 2
    const leftX = centerX - BALANCE.gates.gapBetween / 2 - gateWidth / 2
    const rightX = centerX + BALANCE.gates.gapBetween / 2 + gateWidth / 2
    const scaleX = gateWidth / this.baseGateWidth
    pair.left.setPosition(leftX, y).setScale(scaleX, 1)
    pair.right.setPosition(rightX, y).setScale(scaleX, 1)
    pair.leftText.setPosition(leftX, y)
    pair.rightText.setPosition(rightX, y)
    pair.leftIcon.setPosition(leftX, y).setScale(scaleX)
    pair.rightIcon.setPosition(rightX, y).setScale(scaleX)
    pair.statLabel.setPosition(centerX, y - BALANCE.gates.gateHeight / 2 - 14)
  }

  private applyPair(pair: GatePair, anchorX: number): void {
    pair.triggered = true
    pair.flashUntilMs = this.elapsedMs + BALANCE.gates.choiceFlashMs
    const selectedLeft = anchorX < this.scene.scale.width / 2
    if (pair.kind === 'weapon') {
      this.onWeaponSelected(selectedLeft ? pair.leftWeapon : pair.rightWeapon)
      ;(selectedLeft ? pair.left : pair.right).setTintFill(0xffffff)
      ;(selectedLeft ? pair.leftIcon : pair.rightIcon).setTintFill(0xffffff)
      return
    }
    const selected = selectedLeft ? pair.leftOp : pair.rightOp
    const current = this.runStats.get(pair.stat)
    const leftResult = clampStat(pair.stat, pair.leftOp.apply(current))
    const rightResult = clampStat(pair.stat, pair.rightOp.apply(current))
    const protectedResult = pair.stat === 'hp' && leftResult <= 0 && rightResult <= 0
      ? clampStat('hp', 1)
      : clampStat(pair.stat, selected.apply(current))
    this.runStats.set(pair.stat, protectedResult)
    ;(selectedLeft ? pair.left : pair.right).setTintFill(0xffffff)
    ;(selectedLeft ? pair.leftText : pair.rightText).setTintFill(0xffffff)
    this.onStatsChanged()
  }

  private drawWeaponPair(currentWeapon: WeaponKey): { left: WeaponKey; right: WeaponKey } {
    const available = (['normal', 'shotgun', 'laser', 'rocket'] as WeaponKey[]).filter((weapon) => weapon !== currentWeapon)
    const leftIndex = Math.min(available.length - 1, Math.floor(this.rng() * available.length))
    const left = available[leftIndex]
    const rightIndex = Math.min(available.length - 2, Math.floor(this.rng() * (available.length - 1)))
    const right = available[rightIndex >= leftIndex ? rightIndex + 1 : rightIndex]
    return { left, right }
  }

  private recycle(pair: GatePair): void {
    pair.active = false
    pair.left.setActive(false).setVisible(false)
    pair.right.setActive(false).setVisible(false)
    pair.leftText.setActive(false).setVisible(false)
    pair.rightText.setActive(false).setVisible(false)
    pair.leftIcon.setActive(false).setVisible(false)
    pair.rightIcon.setActive(false).setVisible(false)
    pair.statLabel.setActive(false).setVisible(false)
  }

  private statLabel(stat: StatKey): string {
    return { hp: 'TEAM', damage: 'DMG', shotsPerSec: 'RATE', speed: 'SPD' }[stat]
  }

  private nextStat(): StatKey {
    if (this.statBag.length === 0) this.refillBag()
    const stat = this.statBag.shift()
    if (stat === undefined) throw new Error('Stat bag must not be empty after refill.')
    this.lastStat = stat
    return stat
  }

  private refillBag(): void {
    const stats: StatKey[] = ['hp', 'damage', 'shotsPerSec', 'speed']
    for (let index = stats.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.rng() * (index + 1))
      ;[stats[index], stats[swapIndex]] = [stats[swapIndex], stats[index]]
    }
    if (stats[0] === this.lastStat) [stats[0], stats[1]] = [stats[1], stats[0]]
    this.statBag = stats
  }

  private warnPoolExhausted(): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastPoolWarningAtMs < BALANCE.feedback.poolWarningIntervalMs) return
    console.warn('Gate pair pool exhausted; spawn skipped.')
    this.lastPoolWarningAtMs = this.elapsedMs
  }
}
