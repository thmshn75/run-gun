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
