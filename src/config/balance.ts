export const BALANCE = {
  debug: false,
  maxDeltaMs: 100,
  scrollSpeed: 180,
  player: {
    startHp: 3,
    iframesMs: 1200,
    blinkIntervalMs: 100,
    dragClampMargin: 8,
    anchorBottomOffset: 130,
  },
  weapon: {
    fireRateMs: 280,
    projectileSpeed: 640,
    projectileDamage: 1,
  },
  enemy: {
    hp: 3,
    speed: 120,
    spawnIntervalMs: 900,
    spawnIntervalMinMs: 450,
    spawnRampPerSec: 4,
  },
  feedback: {
    hitFlashMs: 80,
    hudPadding: 12,
    gameOverRestartDelayMs: 400,
    poolWarningIntervalMs: 1000,
  },
  pools: {
    // 844px / 640px/s / 0.28s = 4.8 simultaneous shots; 30 leaves >= 2x margin for E3/E4 upgrades.
    projectiles: 30,
    // 844px / (180 + 120)px/s / 0.45s = 6.3 enemies; 20 leaves over 2x safety margin.
    enemies: 20,
    crowd: 30,
  },
} as const
