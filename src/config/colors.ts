import type { StatKey } from '../systems/upgrades'

export const STAT_COLORS: Record<StatKey, number> = {
  hp: 0x3ddc84,
  damage: 0xff9f45,
  shotsPerSec: 0x34d1e0,
  speed: 0xff4fa3,
}

export const WORLD_COLORS = {
  background: 0x10131d,
  backgroundLine: 0x172033,
  backgroundDot: 0x26344e,
  road: 0x9b9b94,
  roadEdge: 0x6e6e68,
  roadCenterLine: 0xffffff,
  projectileShell: 0xe8590c,
  projectileCore: 0xffc078,
  coinRim: 0x5e4400,
  coinBody: 0xffd84c,
  gateBase: 0xffffff,
} as const

export const HUD_COLORS = {
  coins: 0xffd84c,
  panel: 0x080b12,
  panelStroke: 0x2a3550,
  textDark: '#0b0f18',
} as const
