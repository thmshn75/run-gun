import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS, lighten, STAT_COLORS, WEAPON_GATE_COLOR } from '../config/colors'
import { getGateLanes, getGateSpawnLayout, getLabelScale, selectedLaneIndex, type GateLane, type GateLaneKind, type GateSpawnLayout } from './gateLanes'
import { getLevelPlan } from './levelPlan'
import { getPlayfieldHalfWidth } from './road'
import { clampStat, type RunStats, type StatKey } from './upgrades'
import { getWeaponRewardChoices } from './weaponChoices'
import { WEAPON_LABELS, type WeaponKey } from './weapons'

export interface GateOp {
  label: string
  apply: (current: number) => number
}

interface GateLaneView {
  readonly gate: Phaser.GameObjects.Image
  readonly text: Phaser.GameObjects.Text
  readonly icon: Phaser.GameObjects.Image
  kind: GateLaneKind
  op: GateOp
  weapon: WeaponKey | undefined
}

interface GateGroup {
  readonly lanes: readonly [GateLaneView, GateLaneView, GateLaneView]
  statLabel: Phaser.GameObjects.Text
  active: boolean
  laneCount: 2 | 3
  stat: StatKey
  prevBottomY: number
  triggered: boolean
  recycleAtMs: number
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
    return { label: `/${divisor}`, apply: (value) => value / divisor }
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
    return { label: `/${divisor}`, apply: (value) => value / divisor }
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
  private readonly getLevel: () => number
  private readonly getCurrentWeapon: () => WeaponKey
  private readonly equipWeapon: (weapon: WeaponKey) => void
  private readonly rng: () => number
  private readonly groups!: GateGroup[]
  private statBag: StatKey[]
  private lastStat: StatKey | null
  private weaponLaneCounter: number
  private spawnAccumulatorMs!: number
  private nextSpawnDelayMs!: number
  private elapsedMs!: number
  private lastPoolWarningAtMs!: number

  public constructor(
    scene: Phaser.Scene,
    runStats: RunStats,
    getAnchorPosition: () => Readonly<{ x: number; y: number }>,
    onStatsChanged: () => void,
    getLevel: () => number,
    getCurrentWeapon: () => WeaponKey,
    equipWeapon: (weapon: WeaponKey) => void,
    rng: () => number,
  ) {
    this.scene = scene
    this.runStats = runStats
    this.getAnchorPosition = getAnchorPosition
    this.onStatsChanged = onStatsChanged
    this.getLevel = getLevel
    this.getCurrentWeapon = getCurrentWeapon
    this.equipWeapon = equipWeapon
    this.rng = rng
    this.groups = []
    this.statBag = []
    this.lastStat = null
    this.weaponLaneCounter = 0
    this.spawnAccumulatorMs = 0
    this.nextSpawnDelayMs = BALANCE.gates.firstSpawnDelayMs
    this.elapsedMs = 0
    this.lastPoolWarningAtMs = -BALANCE.feedback.poolWarningIntervalMs

    for (let index = 0; index < BALANCE.pools.gateGroups; index += 1) this.groups.push(this.createGroup())
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
    for (const group of this.groups) {
      if (!group.active) continue
      this.moveGroup(group, movement)
      const bottomY = group.lanes[0].gate.y + group.lanes[0].gate.displayHeight / 2
      if (!group.triggered) this.updateHighlight(group, anchor.x)
      if (!group.triggered && group.prevBottomY < anchor.y && bottomY >= anchor.y) this.applyGroup(group, anchor.x)
      group.prevBottomY = bottomY
      if (group.triggered && this.elapsedMs >= group.recycleAtMs) this.recycle(group)
      else if (group.lanes[0].gate.y - group.lanes[0].gate.displayHeight / 2 > this.scene.scale.height) this.recycle(group)
    }
  }

  private createGroup(): GateGroup {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'system-ui', fontSize: '34px', color: '#ffffff', stroke: HUD_COLORS.textDark, strokeThickness: 4, fontStyle: 'bold',
    }
    const lanes = Array.from({ length: 3 }, () => ({
      gate: this.scene.add.image(0, 0, 'gate').setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false),
      text: this.scene.add.text(0, 0, '', textStyle).setOrigin(0.5).setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false),
      icon: this.scene.add.image(0, 0, 'weapon-normal-gate').setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false),
      kind: 'stat' as GateLaneKind,
      op: { label: '', apply: (value: number) => value },
      weapon: undefined,
    })) as [GateLaneView, GateLaneView, GateLaneView]
    const statLabel = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui', fontSize: '17px', color: '#ffffff', stroke: HUD_COLORS.textDark, strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(BALANCE.layers.gameplay).setActive(false).setVisible(false)
    return {
      lanes, statLabel, active: false, laneCount: 2, stat: 'hp',
      prevBottomY: 0, triggered: false, recycleAtMs: 0,
    }
  }

  private spawn(): void {
    const group = this.groups.find((candidate) => !candidate.active)
    if (group === undefined) {
      this.warnPoolExhausted()
      return
    }
    const spawnY = BALANCE.road.horizonY
    const levelPlan = getLevelPlan(this.getLevel())
    const layout = getGateSpawnLayout(
      levelPlan.reserved.gateLanes,
      this.weaponLaneCounter,
      getWeaponRewardChoices(this.getCurrentWeapon(), levelPlan.level),
      this.rng,
    )
    this.weaponLaneCounter = layout.weaponLaneCounter
    group.active = true
    group.triggered = false
    group.recycleAtMs = 0
    group.laneCount = layout.laneCount
    this.configureGroup(group, layout, spawnY)
    this.setGroupAlpha(group, 0)
    this.layoutGroup(group)
    group.prevBottomY = spawnY + BALANCE.gates.gateHeight / 2
  }

  private configureGroup(group: GateGroup, layout: GateSpawnLayout, spawnY: number): void {
    const stat = this.nextStat()
    const operations = drawGatePair(stat, this.runStats.get(stat), this.rng)
    const statColor = STAT_COLORS[stat]
    const statColorCss = `#${statColor.toString(16).padStart(6, '0')}`
    group.stat = stat
    let operationIndex = 0
    for (let index = 0; index < group.lanes.length; index += 1) {
      const lane = group.lanes[index]
      const kind = index < layout.laneKinds.length ? layout.laneKinds[index] : 'stat'
      lane.kind = kind
      lane.weapon = kind === 'weapon' ? layout.weapon : undefined
      lane.op = kind === 'stat' ? (operationIndex++ === 0 ? operations.left : operations.right) : { label: '', apply: (value) => value }
      const isVisible = index < group.laneCount
      lane.gate.setTexture('gate').setPosition(0, spawnY).setActive(isVisible).setVisible(isVisible).setAlpha(1)
      if (kind === 'weapon') {
        lane.gate.setTint(WEAPON_GATE_COLOR)
        lane.icon.setTexture(`weapon-${lane.weapon}-gate`).setActive(isVisible).setVisible(isVisible).setAlpha(1).clearTint()
        lane.text.setFontSize('20px').setText(WEAPON_LABELS[lane.weapon!]).setScale(1).setActive(isVisible).setVisible(isVisible).setAlpha(1).clearTint()
      } else {
        lane.gate.setTint(statColor)
        lane.icon.setActive(false).setVisible(false)
        lane.text.setFontSize('34px').setText(lane.op.label).setScale(1).setActive(isVisible).setVisible(isVisible).setAlpha(1).clearTint()
      }
    }
    group.statLabel.setText(this.statLabel(stat)).setColor(statColorCss).setActive(true).setVisible(true).setAlpha(1).clearTint()
  }

  private moveGroup(group: GateGroup, movement: number): void {
    group.lanes[0].gate.y += movement
    this.layoutGroup(group)
    const topY = group.statLabel.y - group.statLabel.displayHeight / 2
    const alpha = Math.min(1, Math.max(0, (topY - BALANCE.road.horizonY) / BALANCE.road.entryFadePx))
    this.setGroupAlpha(group, alpha)
  }

  private updateHighlight(group: GateGroup, anchorX: number): void {
    const lanes = this.getGroupLanes(group)
    const selectedIndex = selectedLaneIndex(anchorX, lanes)
    for (let index = 0; index < group.laneCount; index += 1) {
      const lane = group.lanes[index]
      const baseColor = lane.kind === 'weapon' ? WEAPON_GATE_COLOR : STAT_COLORS[group.stat]
      lane.gate.setTint(index === selectedIndex ? lighten(baseColor, BALANCE.gates.highlightLighten) : baseColor)
    }
  }

  private setGroupAlpha(group: GateGroup, alpha: number): void {
    for (let index = 0; index < group.laneCount; index += 1) {
      group.lanes[index].gate.setAlpha(alpha)
      group.lanes[index].text.setAlpha(alpha)
      group.lanes[index].icon.setAlpha(alpha)
    }
    group.statLabel.setAlpha(alpha)
  }

  private layoutGroup(group: GateGroup): void {
    const centerX = this.scene.scale.width / 2
    const y = group.lanes[0].gate.y
    const roadWidth = getPlayfieldHalfWidth(this.scene.scale.width, this.scene.scale.height, y) * 2
    const lanes = getGateLanes(group.laneCount, centerX, roadWidth, BALANCE.gates.gapBetween)
    const statLaneCenters: number[] = []
    for (let index = 0; index < lanes.length; index += 1) {
      const lane = group.lanes[index]
      const position = lanes[index]
      lane.gate.setPosition(position.centerX, y).setDisplaySize(position.width, BALANCE.gates.gateHeight)
      lane.text.setPosition(position.centerX, lane.kind === 'weapon' ? y + 18 : y)
      lane.text.setScale(1)
      lane.text.setScale(getLabelScale(lane.text.displayWidth, position.width, BALANCE.gates.labelInsetPx))
      if (lane.kind === 'weapon') {
        const source = lane.icon.texture.getSourceImage() as { width: number; height: number }
        const iconWidth = position.width - 2 * BALANCE.gates.weaponIconInsetPx
        lane.icon.setPosition(position.centerX, y - 16).setDisplaySize(iconWidth, iconWidth * source.height / source.width)
      }
      if (lane.kind === 'stat') statLaneCenters.push(position.centerX)
    }
    const statCenterX = statLaneCenters.reduce((sum, laneCenterX) => sum + laneCenterX, 0) / statLaneCenters.length
    group.statLabel.setPosition(statCenterX, y - BALANCE.gates.gateHeight / 2 - 14)
  }

  private applyGroup(group: GateGroup, anchorX: number): void {
    group.triggered = true
    group.recycleAtMs = this.elapsedMs + BALANCE.gates.choiceFlashMs
    const selected = group.lanes[selectedLaneIndex(anchorX, this.getGroupLanes(group))]
    selected.gate.setTintFill(0xffffff)
    selected.text.setTintFill(0xffffff)
    if (selected.kind === 'weapon') {
      this.equipWeapon(selected.weapon!)
      return
    }
    const statLanes = group.lanes.filter((lane) => lane.kind === 'stat')
    const current = this.runStats.get(group.stat)
    const leftResult = clampStat(group.stat, statLanes[0].op.apply(current))
    const rightResult = clampStat(group.stat, statLanes[1].op.apply(current))
    const protectedResult = group.stat === 'hp' && leftResult <= 0 && rightResult <= 0
      ? clampStat('hp', 1)
      : clampStat(group.stat, selected.op.apply(current))
    this.runStats.set(group.stat, protectedResult)
    this.onStatsChanged()
  }

  private getGroupLanes(group: GateGroup): GateLane[] {
    const y = group.lanes[0].gate.y
    return getGateLanes(
      group.laneCount,
      this.scene.scale.width / 2,
      getPlayfieldHalfWidth(this.scene.scale.width, this.scene.scale.height, y) * 2,
      BALANCE.gates.gapBetween,
    )
  }

  private recycle(group: GateGroup): void {
    group.active = false
    for (const lane of group.lanes) {
      lane.gate.setActive(false).setVisible(false)
      lane.text.setActive(false).setVisible(false)
      lane.icon.setActive(false).setVisible(false)
    }
    group.statLabel.setActive(false).setVisible(false)
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
    console.warn('Gate group pool exhausted; spawn skipped.')
    this.lastPoolWarningAtMs = this.elapsedMs
  }
}
