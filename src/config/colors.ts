import type { StatKey } from '../systems/upgrades'

export const STAT_COLORS: Record<StatKey, number> = {
  hp: 0x3ddc84,
  damage: 0xff9f45,
  shotsPerSec: 0x34d1e0,
  speed: 0xff4fa3,
}

export const WEAPON_GATE_COLOR = 0xb18cff

export function lighten(color: number, amount: number): number {
  const clampedAmount = Math.min(1, Math.max(0, amount))
  const channel = (shift: number): number => {
    const value = (color >> shift) & 0xff
    return Math.round(value + (0xff - value) * clampedAmount)
  }
  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}

export function mix(colorA: number, colorB: number, amount: number): number {
  const clampedAmount = Math.min(1, Math.max(0, amount))
  const channel = (shift: number): number => {
    const start = (colorA >> shift) & 0xff
    const end = (colorB >> shift) & 0xff
    return Math.round(start + (end - start) * clampedAmount)
  }
  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}

export const WORLD_COLORS = {
  background: 0x2f7fd1,
  skyTop: 0x2f7fd1,
  skyHorizon: 0xdfeef8,
  ground: 0x3f5a3a,
  road: 0x4a4f57,
  roadEdge: 0xe8ecf2,
  roadCenterLine: 0xd8e0ef,
  projectileShell: 0xe8590c,
  projectileCore: 0xffc078,
  shotgunShell: 0xffb347,
  shotgunCore: 0xffe08a,
  laser: 0x7af4ff,
  rocketBody: 0x8c96a5,
  rocketNose: 0xf03e3e,
  splashFlash: 0xffcf8a,
  coinRim: 0x5e4400,
  coinBody: 0xffd84c,
  // Wandsegmente (W2): Orange als Barrieren-Farbe (Thomas-Wahl 2026-08-22 aus vier
  // Varianten; Tuerkis und Rotbraun davor gefielen nicht).
  // Zwei Blautoene, damit die Seiten auf einen Blick auseinandergehen (Thomas
  // 2026-08-22): links die Sammelbahn in hellem Himmelblau (Gewinn, durchfahren),
  // rechts die Wand in kraeftigem Royalblau (Widerstand, wegschiessen).
  // Halbtransparent ueber der grauen Strasse verschiebt sich jeder Ton ins Kuehle:
  // Ein Himmelblau wirkt dort tuerkis. Deshalb ein klares Kornblumenblau, das auch
  // durchscheinend als Blau gelesen wird.
  wallLeftFill: 0x5b9cff,
  wallLeftStroke: 0xdce9ff,
  wallRightFill: 0x2962ff,
  wallRightStroke: 0xc3d4ff,
  // Rote Kacheln (2026-08-22): auf beiden Seiten dieselbe Farbe. Rot heisst "weg da" -
  // welche Seite es ist, sieht man an der Position, nicht an der Schattierung.
  wallBadFill: 0xd93a3a,
  wallBadStroke: 0xffd6d6,
} as const

export const HUD_COLORS = {
  coins: 0xffd84c,
  level: 0xc4d4e8,
  panel: 0x080b12,
  panelStroke: 0x2a3550,
  bossBarBack: 0x281417,
  bossBarFill: 0xd94848,
  bossOverlayText: 0xffffff,
  textDark: '#0b0f18',
} as const

export const MENU_COLORS = {
  title: 0xffffff,
  text: 0xdaf6ff,
  mutedText: 0x8290a8,
  row: 0x101827,
  rowStroke: 0x536480,
  button: 0xdc563e,
  buttonStroke: 0xffc078,
  disabledButton: 0x3d4654,
  disabledStroke: 0x657185,
  levelFilled: 0xffd84c,
  levelEmpty: 0x4d596d,
} as const
