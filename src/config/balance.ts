export const BALANCE = {
  debug: false,
  maxDeltaMs: 100,
  scrollSpeed: 180,
  road: {
    horizonY: 150,
    entryFadePx: 40,
    topWidthRatio: 0.46,
    bottomWidthRatio: 1,
    edgeLineWidth: 2,
    centerLine: {
      segments: 12,
      textureSizePx: 1,
      widthOfHalfRoadRatio: 0.035,
      lengthOfHalfRoadRatio: 0.22,
    },
  },
  player: {
    iframesMs: 1200,
    blinkIntervalMs: 100,
    dragClampMargin: 8,
    // Bewegungsrand als Vielfaches der halben Figurenbreite — bewusst NICHT an die
    // Kollisionshuelle gekoppelt (siehe Befund B1).
    dragClampFigures: 0.5,
    anchorBottomOffset: 130,
  },
  layers: {
    background: -1,
    road: 0,
    gameplay: 2,
  },
  stats: {
    hp: { base: 2, cap: 30, floor: 0 },
    damage: { base: 1, cap: 20, floor: 1 },
    shotsPerSec: { base: 3, cap: 8, floor: 1 },
    speed: { base: 105, cap: 305, floor: 70 },
  },
  upgradesShop: {
    team: { label: 'TRUPPE', base: 2, max: 7, effectPerLevel: 1 },
    damage: { label: 'SCHADEN', base: 1, max: 3.5, effectPerLevel: 0.5 },
    rate: { label: 'FEUERRATE', base: 3, max: 4.5, effectPerLevel: 0.3 },
    prices: [50, 120, 250, 450, 750],
  },
  menu: {
    overlayAlpha: 0.20,
    sidePadding: 18,
    topPadding: 18,
    titleY: 48,
    balanceY: 100,
    rowHeight: 76,
    rowGap: 10,
    scoresShown: 5,
  },
  weapon: {
    normal: {
      rateFactor: 1,
      damageFactor: 1,
      shootersPerSalvo: 8,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 640,
      rangePx: 0,
      pierces: false,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
    },
    shotgun: {
      rateFactor: 0.4,
      damageFactor: 1.5,
      shootersPerSalvo: 8,
      bulletsPerShot: 7,
      fanAngleDeg: 34,
      projectileSpeed: 640,
      rangePx: 280,
      pierces: false,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
    },
    laser: {
      rateFactor: 1.4,
      damageFactor: 0.4,
      shootersPerSalvo: 8,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 900,
      rangePx: 0,
      pierces: true,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
    },
    rocket: {
      rateFactor: 0.25,
      damageFactor: 2.5,
      shootersPerSalvo: 3,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 300,
      rangePx: 0,
      pierces: false,
      splashRadiusPx: 70,
      splashDamageFactor: 1.5,
    },
    splashFlashMs: 180,
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
    // Measured visible-figure dimensions per sprite; coinValue is the number of dropped coins. Remeasure both dimensions whenever the images change.
    types: [
      { key: 'light', texture: 'enemy-light', hp: 1, speedFactor: 1.35, contactDamage: 1, coinValue: 1, bodyWidth: 18, bodyHeight: 38 },
      { key: 'standard', texture: 'enemy-standard', hp: 3, speedFactor: 1, contactDamage: 1, coinValue: 1, bodyWidth: 21, bodyHeight: 42 },
      { key: 'heavy', texture: 'enemy-heavy', hp: 9, speedFactor: 0.7, contactDamage: 2, coinValue: 3, bodyWidth: 40, bodyHeight: 49 },
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
    spawnLaneSafetyGap: 6,
  },
  level: {
    normalPhaseSec: 75,
    warningMs: 1500,
    clearedMs: 1800,
    spawnBonusPerLevel: 150,
  },
  boss: {
    // At 1 base damage, 3.5 shots/s and eight shooters the run deals about 28 DPS;
    // 400 HP makes the first boss fall in a little over 14s before gate upgrades.
    baseHp: 400,
    hpPerLevel: 1.6,
    approachSpeed: 90,
    battleY: 300,
    moveSpeed: 110,
    fireIntervalMs: 1400,
    burstCount: 3,
    burstSpreadPx: 60,
    projectileSpeed: 260,
    projectileDamage: 1,
    coinReward: 25,
    // Measured opaque bounds of src/assets/enemy-boss.png, not the 120px canvas.
    bodyWidth: 118,
    bodyHeight: 118,
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
    secondaryFontPx: 14,
    depthPanel: 90,
    depthText: 91,
  },
  gates: {
    // Must stay above 2x the roughly 1.4s visibility duration, or raise pools.gatePairs.
    spawnIntervalMs: 9000,
    firstSpawnDelayMs: 5000,
    // Gate path from the horizon to the player is about 564px; (180 + 227)px/s takes about 1.39s.
    extraSpeed: 227,
    choiceFlashMs: 250,
    highlightLighten: 0.45,
    gateHeight: 70,
    gapBetween: 8,
    maxRedraws: 8,
    weaponGateEvery: 4,
    ops: {
      kinds: ['multiply', 'divide', 'add', 'percent'],
      multipliers: [1.5, 2],
      divisors: [2],
      additiveRatios: [0.25, 0.5, 0.75],
      percentages: [0.25, 0.5, -0.2, -0.3],
    },
  },
  coins: {
    magnetRadius: 200,
    magnetSpeed: 900,
    collectDistance: 24,
    dropSpacing: 18,
    edgeInset: 7,
  },
  pools: {
    projectiles: {
      // Peak: ceil(1.12s flight / 0.125s interval) = 9 salvos x 8 shooters x 1 bullet = 72; 96 leaves 33% reserve.
      normal: 96,
      // Peak: ceil(0.44s flight / 0.3125s interval) = 2 salvos x 8 shooters x 7 bullets = 112; 128 leaves 14% reserve.
      shotgun: 128,
      // Peak: ceil(0.79s flight / 0.089s interval) = 9 salvos x 8 shooters x 1 bullet = 72; 96 leaves 33% reserve.
      laser: 96,
      // Peak: ceil(2.38s flight / 0.5s interval) = 5 salvos x 3 shooters x 1 bullet = 15; 24 leaves 60% reserve.
      rocket: 24,
    },
    // Peak: 2 salvos/s x 3 rockets x 0.18s = 1.1 flashes; 12 leaves generous reserve.
    splashFlashes: 12,
    // Heavy enemies at the 70 SPD floor move at 49px/s, so crossing 844px takes 17.2s; at 450ms spawns that permits up to 39 concurrent enemies. 48 leaves reserve.
    enemies: 48,
    // Must be >= crowd.max because all figures are created once and then only shown or hidden.
    crowd: 30,
    // Max kill rate is 1 / 0.45s x 3 coins per heavy enemy x 844px / 180px/s = 31.3; 48 leaves 54% reserve without relying on the magnet.
    coins: 48,
    // Roughly 1.4s visible versus 9s spawn interval means at most one; two cover a delayed recycle.
    gatePairs: 2,
    bossProjectiles: 24,
  },
} as const
