export type SquadKind = 'wedge' | 'row' | 'cluster'

export type LevelSquadAllowance = {
  readonly kind: SquadKind
  readonly weight: number
  readonly size: number
}

export type LevelDefinition = {
  readonly normalPhaseSec: number
  readonly enemyWeights: readonly [number, number, number]
  readonly spawnIntervalMs: number
  readonly spawnIntervalMinMs: number
  readonly squadChance: number
  readonly squads: readonly LevelSquadAllowance[]
  readonly companionLimit: number
  readonly reserved: { readonly blockers: boolean; readonly gateLanes: 2 | 3 }
}

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
    // Boss projectiles need their own, shorter window: a salvo may now cost more
    // than one figure, while enemy-contact protection remains deliberately intact.
    bossProjectileIframesMs: 360,
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
    // Conservative level-table income per run: level 3 ~260, level 5 ~505, level 8 ~1,070,
    // level 12 ~2,180 coins. A full three-row build costs 24,150 coins, or about 23 good
    // level-8 runs. These values follow the level table; adjust them whenever that table changes.
    prices: [200, 450, 1000, 2100, 4300],
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
      minLevel: 1,
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
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    shotgun: {
      minLevel: 1,
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
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    laser: {
      minLevel: 1,
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
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    rocket: {
      minLevel: 1,
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
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    minigun: {
      minLevel: 3,
      // 17.6 salvos/s x 3 shooters x 1 projectile x 0.80s flight = 42.3; 56 leaves 32% reserve.
      rateFactor: 2.2,
      damageFactor: 0.28,
      shootersPerSalvo: 3,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 900,
      rangePx: 0,
      pierces: false,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    flamethrower: {
      minLevel: 3,
      // 14.4 salvos/s x 3 shooters x 5 projectiles x 0.31s flight = 66.2; 72 leaves 9% reserve.
      rateFactor: 1.8,
      damageFactor: 0.34,
      shootersPerSalvo: 3,
      bulletsPerShot: 5,
      fanAngleDeg: 52,
      projectileSpeed: 620,
      rangePx: 190,
      pierces: false,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 0,
      chainRadiusPx: 0,
      chainDamageFactor: 0,
    },
    chainlightning: {
      minLevel: 3,
      // 5.6 salvos/s x 6 shooters x 1 projectile x 0.92s flight = 30.9; 48 leaves 55% reserve.
      rateFactor: 0.7,
      damageFactor: 1.05,
      shootersPerSalvo: 6,
      bulletsPerShot: 1,
      fanAngleDeg: 0,
      projectileSpeed: 780,
      rangePx: 0,
      pierces: false,
      splashRadiusPx: 0,
      splashDamageFactor: 0,
      chainCount: 3,
      chainRadiusPx: 118,
      chainDamageFactor: 0.55,
    },
    splashFlashMs: 180,
    chainFlashMs: 120,
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
  blockers: {
    // Player sprite: 34px wide. 2.4 figure widths are the fixed collision hull;
    // this extra margin keeps the visually available bypass usable while dragging.
    passageMarginPx: 12,
    figureWidthPx: 34,
    minWidthPx: 46,
    heightPx: 54,
    rewardBehindOffsetPx: 82,
    contactDamage: 2,
    // Each design level owns its cadence. Levels 1 and 2 get a rare early choice;
    // Level 3 remains the clear step up where alternate weapons enter the pool.
    spawnIntervalMsByDesignLevel: [60000, 36000, 21000, 19000, 17500, 16000, 15500, 14000, 12500, 11250, 10000, 9000],
    referenceDestroySec: 2,
    minDestroySec: 1.5,
    maxDestroySec: 2.5,
  },
  enemy: {
    // Measured visible-figure dimensions per sprite; coinValue is the number of dropped coins. Remeasure both dimensions whenever the images change.
    types: [
      { key: 'light', texture: 'enemy-light', hp: 1, speedFactor: 1.35, contactDamage: 1, coinValue: 1, bodyWidth: 18, bodyHeight: 38 },
      { key: 'standard', texture: 'enemy-standard', hp: 3, speedFactor: 1, contactDamage: 1, coinValue: 1, bodyWidth: 21, bodyHeight: 42 },
      { key: 'heavy', texture: 'enemy-heavy', hp: 9, speedFactor: 0.7, contactDamage: 2, coinValue: 3, bodyWidth: 40, bodyHeight: 49 },
    ],
    // Enemy composition belongs to the level plan, never to elapsed spawn time.
    spawnRampPerSec: 6,
    spawnLaneSafetyGap: 6,
  },
  level: {
    warningMs: 1500,
    clearedMs: 1800,
    hardness: {
      perLevel: 0.045,
      max: 1.6,
    },
    squads: {
      minSize: 2,
      maxSize: 8,
      spacingPx: 44,
      rowSpacingPx: 54,
      // A squad replaces one spawn event. Pause = 650 ms + 130 ms per member,
      // so an eight-member squad receives 1,690 ms before the next event.
      pauseBaseMs: 650,
      pausePerMemberMs: 130,
    },
    plans: [
      { normalPhaseSec: 75, enemyWeights: [75, 25, 0], spawnIntervalMs: 1750, spawnIntervalMinMs: 1050, squadChance: 0, squads: [], companionLimit: 0, reserved: { blockers: true, gateLanes: 2 } },
      { normalPhaseSec: 78, enemyWeights: [60, 40, 0], spawnIntervalMs: 1650, spawnIntervalMinMs: 950, squadChance: 0, squads: [], companionLimit: 0, reserved: { blockers: true, gateLanes: 2 } },
      { normalPhaseSec: 78, enemyWeights: [65, 30, 5], spawnIntervalMs: 1550, spawnIntervalMinMs: 850, squadChance: 0.20, squads: [{ kind: 'wedge', weight: 1, size: 3 }], companionLimit: 0, reserved: { blockers: true, gateLanes: 3 } },
      { normalPhaseSec: 80, enemyWeights: [55, 35, 10], spawnIntervalMs: 1450, spawnIntervalMinMs: 780, squadChance: 0.28, squads: [{ kind: 'wedge', weight: 1, size: 4 }], companionLimit: 0, reserved: { blockers: true, gateLanes: 3 } },
      { normalPhaseSec: 80, enemyWeights: [35, 45, 20], spawnIntervalMs: 1350, spawnIntervalMinMs: 700, squadChance: 0.28, squads: [{ kind: 'row', weight: 1, size: 3 }], companionLimit: 1, reserved: { blockers: true, gateLanes: 3 } },
      { normalPhaseSec: 82, enemyWeights: [25, 45, 30], spawnIntervalMs: 1250, spawnIntervalMinMs: 640, squadChance: 0.35, squads: [{ kind: 'row', weight: 2, size: 4 }, { kind: 'wedge', weight: 1, size: 4 }], companionLimit: 1, reserved: { blockers: true, gateLanes: 3 } },
      { normalPhaseSec: 82, enemyWeights: [25, 40, 35], spawnIntervalMs: 1150, spawnIntervalMinMs: 580, squadChance: 0.42, squads: [{ kind: 'row', weight: 1, size: 4 }, { kind: 'cluster', weight: 1, size: 5 }], companionLimit: 2, reserved: { blockers: true, gateLanes: 3 } },
      { normalPhaseSec: 84, enemyWeights: [20, 40, 40], spawnIntervalMs: 1080, spawnIntervalMinMs: 540, squadChance: 0.48, squads: [{ kind: 'cluster', weight: 2, size: 5 }, { kind: 'row', weight: 1, size: 4 }], companionLimit: 2, reserved: { blockers: true, gateLanes: 3 } },
      { normalPhaseSec: 84, enemyWeights: [25, 35, 40], spawnIntervalMs: 980, spawnIntervalMinMs: 500, squadChance: 0.55, squads: [{ kind: 'wedge', weight: 1, size: 5 }, { kind: 'row', weight: 2, size: 4 }, { kind: 'cluster', weight: 2, size: 6 }], companionLimit: 3, reserved: { blockers: true, gateLanes: 3 } },
      { normalPhaseSec: 86, enemyWeights: [20, 35, 45], spawnIntervalMs: 900, spawnIntervalMinMs: 460, squadChance: 0.60, squads: [{ kind: 'row', weight: 2, size: 4 }, { kind: 'cluster', weight: 3, size: 6 }], companionLimit: 3, reserved: { blockers: true, gateLanes: 3 } },
      { normalPhaseSec: 86, enemyWeights: [20, 35, 45], spawnIntervalMs: 820, spawnIntervalMinMs: 420, squadChance: 0.65, squads: [{ kind: 'wedge', weight: 1, size: 6 }, { kind: 'row', weight: 2, size: 4 }, { kind: 'cluster', weight: 3, size: 8 }], companionLimit: 4, reserved: { blockers: true, gateLanes: 3 } },
      { normalPhaseSec: 88, enemyWeights: [15, 35, 50], spawnIntervalMs: 760, spawnIntervalMinMs: 400, squadChance: 0.70, squads: [{ kind: 'row', weight: 2, size: 4 }, { kind: 'cluster', weight: 4, size: 8 }], companionLimit: 4, reserved: { blockers: true, gateLanes: 3 } },
    ] satisfies readonly LevelDefinition[],
  },
  boss: {
    referenceFirepower: {
      // Fight duration at the maximum crowd size. Smaller crowds take longer,
      // limited by maxFightSec so a two-figure emergency team cannot stall a run.
      fightSecAtMaxTeam: 20,
      maxFightSec: 40,
      // 0 ignores crowd strength; 1 scales boss HP fully with it. This value halves
      // the fight from the smallest crowd to crowd.max without erasing the reward.
      teamDampening: 0.41,
      damagePerLevel: 0.15,
      damageCap: 8,
      ratePerLevel: 0.1,
      rateCap: 8,
    },
    // The fully bought Level-30 reference fight reaches about 27,500 HP; this remains a
    // safety ceiling without flattening any tested purchase-state/level combination.
    hpCap: 30000,
    approachSpeed: 90,
    battleY: 300,
    phaseOne: {
      fireIntervalMs: 1400,
      burstCount: 3,
      burstSpreadPx: 60,
      moveSpeed: 110,
    },
    phaseTwo: {
      fireIntervalMs: 820,
      burstCount: 5,
      burstSpreadPx: 150,
      moveSpeed: 170,
      tint: 0xff6a6a,
      transitionFlashMs: 180,
    },
    projectileSpeed: 260,
    projectileDamage: 1,
    companionIntervalMs: 5200,
    pressureDelayMs: 36000,
    advanceSpeed: 34,
    // The boss centre stops before the crowd anchor; its lower collision edge can
    // still touch a stationary formation, but lateral escape remains available.
    advanceStopBeforeAnchorPx: 80,
    advanceContactDamage: 2,
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
    // Must stay above 2x the roughly 1.4s visibility duration, or raise pools.gateGroups.
    spawnIntervalMs: 9000,
    firstSpawnDelayMs: 5000,
    // Gate path from the horizon to the player is about 564px; (180 + 227)px/s takes about 1.39s.
    extraSpeed: 227,
    choiceFlashMs: 250,
    highlightLighten: 0.45,
    gateHeight: 70,
    gapBetween: 8,
    weaponIconInsetPx: 10,
    // Side margin so labels do not touch the gate frame.
    labelInsetPx: 8,
    // Every nth gate in a three-lane level offers a weapon; two-lane levels do not advance this counter.
    weaponLaneEvery: 3,
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
      // Peak: ceil(0.44s flight / 0.3125s interval) = 2 salvos x 8 shooters x 7 bullets = 112; 144 leaves 29% reserve.
      shotgun: 144,
      // Peak: ceil(0.79s flight / 0.089s interval) = 9 salvos x 8 shooters x 1 bullet = 72; 96 leaves 33% reserve.
      laser: 96,
      // Peak: ceil(2.38s flight / 0.5s interval) = 5 salvos x 3 shooters x 1 bullet = 15; 24 leaves 60% reserve.
      rocket: 24,
      // 17.6 salvos/s x 3 shooters x 1 projectile x 0.80s flight = 42.3; 56 leaves 32% reserve.
      minigun: 56,
      // 14.4 salvos/s x 3 shooters x 5 projectiles x 0.31s flight = 66.2; 88 leaves 33% reserve.
      flamethrower: 88,
      // 5.6 salvos/s x 6 shooters x 1 projectile x 0.92s flight = 30.9; 48 leaves 55% reserve.
      chainlightning: 48,
    },
    // Peak: 2 salvos/s x 3 rockets x 0.18s = 1.1 flashes; 12 leaves generous reserve.
    splashFlashes: 12,
    // At most 5.6 salvos/s x 3 shooters x 3 chain jumps x 0.12s = 6.1; 16 leaves reserve.
    chainFlashes: 16,
    // Worst case: a heavy at the 49px/s speed floor stays about 14.2 s on the 694px road.
    // An eight-member squad pauses 1.69 s, so ceil(14.2 / 1.69) x 8 = 72 active enemies;
    // 88 leaves 22% reserve for mixed single spawns and delayed recycling.
    enemies: 88,
    // Must be >= crowd.max because all figures are created once and then only shown or hidden.
    crowd: 30,
    // Max kill rate is 1 / 0.45s x 3 coins per heavy enemy x 844px / 180px/s = 31.3; 48 leaves 54% reserve without relying on the magnet.
    coins: 48,
    // Roughly 1.4s visible versus 9s spawn interval means at most one; two cover a delayed recycle.
    gateGroups: 2,
    // Slowest blocker travel is (844 - 150) / 180 = 3.9s. The shortest L12 cadence
    // is 9s, so one is normally enough; two cover a delayed recycle without allocations.
    blockers: 2,
    // Phase two: ceil(2.1s flight / 0.82s interval) x 5 = 15; 24 leaves reserve.
    bossProjectiles: 24,
  },
} as const
