export const BALANCE = {
  debug: false,
  maxDeltaMs: 100,
  scrollSpeed: 180,
  player: {
    iframesMs: 1200,
    blinkIntervalMs: 100,
    dragClampMargin: 8,
    // Bewegungsrand als Vielfaches der halben Figurenbreite — bewusst NICHT an die
    // Kollisionshuelle gekoppelt (siehe Befund B1).
    dragClampFigures: 0.5,
    anchorBottomOffset: 130,
  },
  stats: {
    hp: { base: 3, cap: 30, floor: 0 },
    damage: { base: 1, cap: 20, floor: 1 },
    shotsPerSec: { base: 3.5, cap: 8, floor: 1 },
    speed: { base: 105, cap: 305, floor: 70 },
  },
  weapon: {
    projectileSpeed: 640,
  },
  crowd: {
    start: 3,
    max: 30,
    // Maximum number of figures that fire together in one rotating salvo.
    shootersPerSalvo: 8,
    rowSpacingY: 14,
    colSpacing: 24,
    minColSpacing: 11,
    // Formation width is the share of the playfield available to the widest row.
    maxWidthRatio: 0.44,
    bottomMargin: 8,
    // The collision hull stays fixed instead of growing with the formation.
    hullWidthFigures: 2.4,
    hullHeightFigures: 1.6,
    damagePerExtraFigure: 0.14,
    damageMultiplierCap: 4,
  },
  enemy: {
    // Measured visible-figure widths per sprite; remeasure these whenever the images change.
    types: [
      { key: 'light', texture: 'enemy-light', hp: 1, speedFactor: 1.35, contactDamage: 1, coinValue: 1, bodyWidth: 14 },
      { key: 'standard', texture: 'enemy-standard', hp: 3, speedFactor: 1, contactDamage: 1, coinValue: 1, bodyWidth: 21 },
      { key: 'heavy', texture: 'enemy-heavy', hp: 9, speedFactor: 0.7, contactDamage: 2, coinValue: 3, bodyWidth: 40 },
    ],
    // The final wave (untilSec: 0) applies permanently once the earlier limits have passed.
    waves: [
      { untilSec: 30, weights: [70, 30, 0] },
      { untilSec: 90, weights: [40, 45, 15] },
      { untilSec: 0, weights: [20, 45, 35] },
    ],
    spawnIntervalMs: 1600,
    spawnIntervalMinMs: 450,
    spawnRampPerSec: 6,
  },
  feedback: {
    hitFlashMs: 80,
    gameOverRestartDelayMs: 400,
    poolWarningIntervalMs: 1000,
  },
  hud: {
    padding: 12,
    panelHeight: 62,
    panelRadius: 12,
    panelAlpha: 0.55,
    panelStrokeAlpha: 0.6,
    sidePad: 14,
    rowOneOffsetY: 9,
    rowTwoOffsetY: 38,
    primaryFontPx: 22,
    statFontPx: 15,
    depthPanel: 90,
    depthText: 91,
  },
  gates: {
    // Must stay above 2x the roughly 1.4s visibility duration, or raise pools.gatePairs.
    spawnIntervalMs: 9000,
    firstSpawnDelayMs: 5000,
    // Gate path is about player-Y + gate height = 754px; (180 + 360)px/s takes about 1.4s.
    extraSpeed: 360,
    gateHeight: 70,
    gapBetween: 8,
    maxRedraws: 8,
    ops: {
      kinds: ['multiply', 'divide', 'add', 'percent'],
      multipliers: [1.5, 2],
      divisors: [2],
      additiveRatios: [0.25, 0.5, 0.75],
      percentages: [0.25, 0.5, -0.2, -0.3],
    },
  },
  coins: {
    value: 1,
    magnetRadius: 200,
    magnetSpeed: 900,
    collectDistance: 24,
  },
  pools: {
    // 8 shots/s cap x 8 figures per salvo x ((anchor-Y 714 - despawn-Y 0) / 640px/s = 1.12s) = 72; 96 leaves margin.
    projectiles: 96,
    // Heavy enemies at the 70 SPD floor move at 49px/s, so crossing 844px takes 17.2s; at 450ms spawns that permits up to 39 concurrent enemies. 48 leaves reserve.
    enemies: 48,
    // Must be >= crowd.max because all figures are created once and then only shown or hidden.
    crowd: 30,
    // Max enemy kill rate is 1 / 0.45s; 844px / 180px/s = 4.7s coin visibility, so about 10.4; 20 remains enough (magnet collects faster).
    coins: 20,
    // Roughly 1.4s visible versus 9s spawn interval means at most one; two cover a delayed recycle.
    gatePairs: 2,
  },
} as const
