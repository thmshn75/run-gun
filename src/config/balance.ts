export const BALANCE = {
  debug: false,
  maxDeltaMs: 100,
  scrollSpeed: 180,
  player: {
    iframesMs: 1200,
    blinkIntervalMs: 100,
    dragClampMargin: 8,
    anchorBottomOffset: 130,
  },
  stats: {
    hp: { base: 3, cap: 12 },
    damage: { base: 1, cap: 20 },
    shotsPerSec: { base: 3.5, cap: 8 },
    projectiles: { base: 1, cap: 5 },
  },
  weapon: {
    projectileSpeed: 640,
  },
  enemy: {
    hp: 3,
    speed: 50,
    spawnIntervalMs: 1200,
    spawnIntervalMinMs: 600,
    spawnRampPerSec: 3,
  },
  feedback: {
    hitFlashMs: 80,
    hudPadding: 12,
    gameOverRestartDelayMs: 400,
    poolWarningIntervalMs: 1000,
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
    magnetRadius: 140,
    magnetSpeed: 600,
    collectDistance: 24,
  },
  pools: {
    // 8 shots/s cap x 5 projectiles cap x ((anchor-Y 714 - despawn-Y 0) / 640px/s = 1.12s) = 45; 64 leaves margin.
    projectiles: 64,
    // 844px / (180 + 50)px/s / 0.6s = 6.1 visible enemies; 20 leaves ample headroom.
    enemies: 20,
    crowd: 30,
    // Max enemy kill rate is 1 / 0.6s; 844px / 180px/s = 4.7s coin visibility, so 1.67 x 4.7 = 7.8; 20 leaves margin.
    coins: 20,
    // Roughly 1.4s visible versus 9s spawn interval means at most one; two cover a delayed recycle.
    gatePairs: 2,
  },
} as const
