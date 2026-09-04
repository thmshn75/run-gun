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
  // --- Bruecke ueber Wasser (2026-09-03, zweites Weltthema). Dieselbe Fahrbahn, aber
  // Wasser statt Gruenflaeche und Betongelaender statt Haeuserzeilen.
  // Wasser dunkel im Vordergrund, zum Horizont heller: So liest sich die Flaeche als
  // liegende Ebene und nicht als senkrechte Wand. Der Horizontton bleibt knapp unter
  // skyHorizon, damit die Wasserlinie sichtbar bleibt statt zu verschmelzen.
  // Blauer nachgezogen (Thomas 2026-09-04: "das wasser noch blauer"). Die ersten Toene
  // hatten viel Gruen und Grau darin und lasen sich als Hafenbecken. Bezug ist jetzt der
  // Himmel: waterFar liegt dicht an skyTop (0x2f7fd1), weil Wasser am Horizont den
  // Himmel spiegelt; waterNear ist derselbe Farbton, nur dunkel und satt - so bleibt die
  // Tiefe erhalten, ohne dass ein zweiter Farbton ins Bild kommt.
  waterNear: 0x0d3f7a,
  waterFar: 0x3d8fd6,
  // Wellenkaemme: heller als das Wasser darunter, aber nicht weiss - sonst wirken sie
  // wie Schaum statt wie Kraeuselung.
  waveCrest: 0xbfe2f5,
  // Wellentaeler: Echtes Wasser zeigt nicht nur helle Kaemme, sondern ebenso viele
  // dunkle Senken dazwischen. Ohne sie liest sich die Flaeche als glatte Ebene mit
  // Kratzern darauf (2026-09-04).
  waveTrough: 0x082c58,
  // Beton der Bruecke. Der Fahrbahnrand liegt im Licht, das Gelaender steht dagegen
  // etwas dunkler - sonst verschwindet es vor dem hellen Wasser am Horizont.
  bridgeDeck: 0x9aa3ab,
  bridgeRail: 0x6f7880,
  bridgePost: 0x565e66,
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
  // Ladenoptik (2026-08-25, Thomas: "wie ein laden in dem man aussuchen und einkaufen
  // kann"). Das Regalbrett traegt die Reihen, der gruene Rahmen zeigt Besitz.
  shelf: 0x1c2740,
  shelfEdge: 0x3a4c6e,
  owned: 0x3ddc84,
  ownedFill: 0x14301f,
  priceText: 0xffd84c,
} as const
