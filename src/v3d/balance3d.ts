export interface Level {
  T0: number
  k: number
  wand: number
  saeule: number
  laufgeschwindigkeit: number
  sendenBasis: number
  sendenProT: number
  einsammeln: number
  schwelleLinks: number
  schwelleRechts: number
  wellen: { t: number; groesse: number }[]
  streuung: number
  miniBossWelle: number | null
  eliteBossZeit: number
  B_mini: number
  B_elite: number
  P: number
  saeulen: string[]
  C: number
  bossDruck: number
  zombieTreffer: number
  soldatenVerlust: number
  gegnerProSoldat: number
  frontVerschiebung: number
  bossSchaden: number
  marsch: number
  startY: number
}

export const LEVELS: Level[] = [{
  T0: 10, k: 2, wand: 5, saeule: 12, laufgeschwindigkeit: 6,
  sendenBasis: 2, sendenProT: 0.1, einsammeln: 2,
  schwelleLinks: -0.6, schwelleRechts: 0.6,
  wellen: [{ t: 0, groesse: 200 }, { t: 20, groesse: 200 }, { t: 40, groesse: 200 }],
  streuung: 0.1, miniBossWelle: 1, eliteBossZeit: 60,
  B_mini: 400, B_elite: 3000, P: 150,
  saeulen: ['humvee', 'panzer', 'haubitze', 'hubschrauber'],
  C: 40, bossDruck: 25, zombieTreffer: 0.5, soldatenVerlust: 0.4,
  gegnerProSoldat: 2, frontVerschiebung: 0.5, bossSchaden: 25,
  marsch: 0.8, startY: 60,
}]

// 1 Einheit = 1 Meter. x quer, y oben, vorwärts = negatives z;
// Aussendelinie z = 0, Rechenposition pos bzw. Frontlage y wird z = -pos bzw. -y.
export const BUEHNE = {
  BAHN_BREITE: 12,
  KAMERA_SICHTFELD: 22,
  KAMERA_POSITION: [0, 28.5, 52.7] as const,
  KAMERA_NEIGUNG: 23.5,
  KAMERA_NAH: 5,
  KAMERA_FERN: 250,
  REFERENZ_ASPEKT: 390 / 659,
  WASSER_HOEHE: -0.35,
  DUNST_NAH: 90,
  DUNST_FERN: 220,
  DUNST_FARBE: '#9fc6d0',
  SONNE: [-6, 14, 4] as const,
} as const

export const FIGUREN = {
  ZOMBIE_FORMEN: 12, ZOMBIE_ZYKLUS_S: 1.1, ZOMBIE_HOEHE: 1.95, PHASENGRUPPEN: 8,
  ZOMBIES_SICHTBAR_MAX: 800,
  ZOMBIE_X_MIN: -5, ZOMBIE_X_MAX: 5,
  ZOMBIE_SPALTENABSTAND: 0.63, ZOMBIE_REIHENABSTAND: 0.83, ZOMBIE_ZUFALLSVERSATZ: 0.12,
} as const
