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
    projectiles: { base: 1, cap: 5, floor: 1 },
    speed: { base: 105, cap: 305, floor: 70 },
  },
  weapon: {
    projectileSpeed: 640,
  },
  crowd: {
    start: 3,
    max: 30,
    shooters: 5,
    rowSpacingY: 14,
    colSpacing: 24,
    minColSpacing: 11,
    // Formation width is the share of the playfield available to the widest row.
    maxWidthRatio: 0.44,
    bottomMargin: 8,
    // The collision hull stays fixed instead of growing with the formation.
    hullWidthFigures: 2.4,
    hullHeightFigures: 1.6,
    damagePerExtraFigure: 0.12,
    damageMultiplierCap: 4,
  },
  enemy: {
    hp: 3,
    speedRampPerSec: 0.5,
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
    // 8 shots/s cap x 5 GUNS (shooter count) cap x ((anchor-Y 714 - despawn-Y 0) / 640px/s = 1.12s) = 45; 64 leaves margin.
    projectiles: 64,
    // Start: 844px / 105px/s ≈ 8.0s at 1600ms intervals ≈ 5; late game: 844px / 200px/s ≈ 4.2s at 450ms intervals ≈ 9.4; 20 remains ample.
    enemies: 20,
    // Must be >= crowd.max because all figures are created once and then only shown or hidden.
    crowd: 30,
    // Max enemy kill rate is 1 / 0.45s; 844px / 180px/s = 4.7s coin visibility, so about 10.4; 20 remains enough (magnet collects faster).
    coins: 20,
    // Roughly 1.4s visible versus 9s spawn interval means at most one; two cover a delayed recycle.
    gatePairs: 2,
  },
} as const
