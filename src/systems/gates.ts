import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS, STAT_COLORS } from '../config/colors'
import { clampStat, type RunStats, type StatKey } from './upgrades'

export interface GateOp {
  label: string
  apply: (current: number) => number
}

interface GatePair {
  left: Phaser.GameObjects.Image
  right: Phaser.GameObjects.Image
  leftText: Phaser.GameObjects.Text
  rightText: Phaser.GameObjects.Text
  statLabel: Phaser.GameObjects.Text
  active: boolean
  stat: StatKey
  leftOp: GateOp
  rightOp: GateOp
  prevBottomY: number
  triggered: boolean
  flashUntilMs: number
}

type GateOperatorKind = (typeof BALANCE.gates.ops.kinds)[number]

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

export function drawGatePair(stat: StatKey, current: number, rng: () => number): { left: GateOp; right: GateOp } {
  for (let attempt = 0; attempt < BALANCE.gates.maxRedraws; attempt += 1) {
    const left = drawGateOp(current, rng)
    const right = drawGateOp(current, rng)
    const leftResult = clampStat(stat, left.apply(current))
    const rightResult = clampStat(stat, right.apply(current))
    if (leftResult !== rightResult && (stat !== 'hp' || leftResult > 0 || rightResult > 0)) return { left, right }
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
  private readonly rng: () => number
  private readonly pairs!: GatePair[]
  private spawnAccumulatorMs!: number
  private nextSpawnDelayMs!: number
  private elapsedMs!: number
  private lastPoolWarningAtMs!: number

  public constructor(
    scene: Phaser.Scene,
    runStats: RunStats,
    getAnchorPosition: () => Readonly<{ x: number; y: number }>,
    onStatsChanged: () => void,
    rng: () => number,
  ) {
    this.scene = scene
    this.runStats = runStats
    this.getAnchorPosition = getAnchorPosition
    this.onStatsChanged = onStatsChanged
    this.rng = rng
    this.pairs = []
    this.spawnAccumulatorMs = 0
    this.nextSpawnDelayMs = BALANCE.gates.firstSpawnDelayMs
    this.elapsedMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs

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
    const left = this.scene.add.image(0, 0, 'gate').setActive(false).setVisible(false)
    const right = this.scene.add.image(0, 0, 'gate').setActive(false).setVisible(false)
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'system-ui', fontSize: '34px', color: '#ffffff', stroke: HUD_COLORS.textDark, strokeThickness: 4, fontStyle: 'bold',
    }
    const leftText = this.scene.add.text(0, 0, '', textStyle).setOrigin(0.5).setActive(false).setVisible(false)
    const rightText = this.scene.add.text(0, 0, '', textStyle).setOrigin(0.5).setActive(false).setVisible(false)
    const statLabel = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui', fontSize: '17px', color: '#ffffff', stroke: HUD_COLORS.textDark, strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5).setActive(false).setVisible(false)
    return {
      left, right, leftText, rightText, statLabel, active: false, stat: 'hp',
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
    const stat = pick<StatKey>(['hp', 'damage', 'shotsPerSec', 'projectiles', 'speed'], this.rng)
    const operations = drawGatePair(stat, this.runStats.get(stat), this.rng)
    const gateWidth = (this.scene.scale.width - BALANCE.gates.gapBetween) / 2
    const spawnY = -BALANCE.gates.gateHeight / 2
    const leftX = gateWidth / 2
    const rightX = gateWidth + BALANCE.gates.gapBetween + gateWidth / 2
    const statColor = STAT_COLORS[stat]
    const statColorCss = `#${statColor.toString(16).padStart(6, '0')}`
    pair.stat = stat
    pair.leftOp = operations.left
    pair.rightOp = operations.right
    pair.active = true
    pair.triggered = false
    pair.flashUntilMs = 0
    pair.left.setPosition(leftX, spawnY).setActive(true).setVisible(true).setAlpha(1).setTint(statColor)
    pair.right.setPosition(rightX, spawnY).setActive(true).setVisible(true).setAlpha(1).setTint(statColor)
    pair.leftText.setPosition(leftX, spawnY).setText(operations.left.label).setActive(true).setVisible(true).setAlpha(1).clearTint()
    pair.rightText.setPosition(rightX, spawnY).setText(operations.right.label).setActive(true).setVisible(true).setAlpha(1).clearTint()
    pair.statLabel.setPosition(this.scene.scale.width / 2, spawnY - BALANCE.gates.gateHeight / 2 - 14)
      .setText(this.statLabel(stat)).setColor(statColorCss).setActive(true).setVisible(true).setAlpha(1).clearTint()
    pair.prevBottomY = spawnY + BALANCE.gates.gateHeight / 2
  }

  private movePair(pair: GatePair, movement: number): void {
    pair.left.y += movement
    pair.right.y += movement
    pair.leftText.y += movement
    pair.rightText.y += movement
    pair.statLabel.y += movement
  }

  private applyPair(pair: GatePair, anchorX: number): void {
    pair.triggered = true
    pair.flashUntilMs = this.elapsedMs + BALANCE.feedback.hitFlashMs
    const selectedLeft = anchorX < this.scene.scale.width / 2
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

  private recycle(pair: GatePair): void {
    pair.active = false
    pair.left.setActive(false).setVisible(false)
    pair.right.setActive(false).setVisible(false)
    pair.leftText.setActive(false).setVisible(false)
    pair.rightText.setActive(false).setVisible(false)
    pair.statLabel.setActive(false).setVisible(false)
  }

  private statLabel(stat: StatKey): string {
    return { hp: 'TEAM', damage: 'DMG', shotsPerSec: 'RATE', projectiles: 'GUNS', speed: 'SPD' }[stat]
  }

  private warnPoolExhausted(): void {
    if (!import.meta.env.DEV || this.elapsedMs - this.lastPoolWarningAtMs < BALANCE.feedback.poolWarningIntervalMs) return
    console.warn('Gate pair pool exhausted; spawn skipped.')
    this.lastPoolWarningAtMs = this.elapsedMs
  }
}
