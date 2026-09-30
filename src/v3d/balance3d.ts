export interface Level {
  T0: number
  kStart: number
  wandStufe: number
  kMax: number
  wand: number
  laufgeschwindigkeit: number
  senden: number
  einsammeln: number
  saeuleSchaden: number
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
  T0: 10, kStart: 2, wandStufe: 100, kMax: 4, wand: 5, laufgeschwindigkeit: 6,
  senden: 8, einsammeln: 6, saeuleSchaden: 0.3,
  schwelleLinks: -0.6, schwelleRechts: 0.6,
  wellen: [{ t: 0, groesse: 250 }, { t: 20, groesse: 250 }, { t: 40, groesse: 250 }],
  streuung: 0.1, miniBossWelle: 1, eliteBossZeit: 60,
  B_mini: 400, B_elite: 3000, P: 150,
  saeulen: ['humvee', 'panzer', 'haubitze', 'hubschrauber'],
  C: 40, bossDruck: 25, zombieTreffer: 0.5, soldatenVerlust: 0.4,
  gegnerProSoldat: 2, frontVerschiebung: 0.5, bossSchaden: 25,
  marsch: 0.8, startY: 60,
}]

export const SPEZIAL = {
  humvee: { dauer: 30, zombiesProSekunde: 4 },
  panzer: { dauer: 4, zombiesProSekunde: 40 },
  haubitze: { dauer: 3, einschlaege: 3, abstand: 1, zombiesProEinschlag: 60 },
  hubschrauber: { dauer: 12, zombiesProSekunde: 15, bossPunkteProSekunde: 25 },
} as const
export type SpezialName = keyof typeof SPEZIAL

export const FAHRZEUGE = {
  humvee: { LAENGE: 4.6, DREIECKE: 1528, DREHUNG: 180 },
  panzer: { LAENGE: 9.8, DREIECKE: 1560, DREHUNG: 180 },
  haubitze: { LAENGE: 7.3, DREIECKE: 3714, DREHUNG: 0 },
  hubschrauber: { LAENGE: 17.7, DREIECKE: 2907, DREHUNG: 180 },
  DREH_S: 8,
  MINI_Y: 2.2,
} as const
export type FahrzeugName = Exclude<keyof typeof FAHRZEUGE, 'DREH_S' | 'MINI_Y'>

// 1 Einheit = 1 Meter. x quer, y oben, vorwärts = negatives z;
// Aussendelinie z = 0, Rechenposition pos bzw. Frontlage y wird z = -pos bzw. -y.
export const BUEHNE = {
  BAHN_BREITE: 12,
  // Links +1 [-6, -3.4], Mitte Kampffeld [-3.4, 3.4], rechts Säulen [3.4, 6].
  MITTE_HALB: 3.4,
  KANTE_BREITE: 0.3,
  KANTE_HOEHE: 0.25,
  KANTE_Z_VORNE: -5.5,
  KANTE_Z_HINTEN: -220,
  RANDMAUER_FARBE: '#c9cbca',
  PLUS_BREITE: 2,
  PLUS_HOEHE: 1.2,
  PLUS_X: -4.7,
  PLUS_ABSTAND: 4,
  WAND_HOEHE: 1.2,
  WAND_FARBE: '#1f6fd6',
  SAEULE_X: 4.7,
  SAEULEN_ABSTAND: 8,
  KAMERA_SICHTFELD: 22,
  KAMERA_POSITION: [0, 28.5, 45.7] as const,
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
  ZOMBIES_SICHTBAR_MAX: 600,
  ZOMBIES_BUEHNE: 400,
  SOLDAT_HOEHE: 2.0, SOLDAT_LAUF_ZYKLUS_S: 0.7,
  SOLDATEN_SICHTBAR_MAX: 120, SOLDAT_PHASENGRUPPEN: 8,
  MINIBOSS_HOEHE: 3.2, ELITEBOSS_HOEHE: 4.8,
  MINIBOSS_DREHUNG: 0, ELITEBOSS_DREHUNG: 0,
  // Gemessene halbe Breite des walk-Clips (1,403 m / 2) + 0,4 m Abstand.
  MINIBOSS_FREIRADIUS: 1.102,
  ZOMBIE_X_MIN: -(BUEHNE.MITTE_HALB - 0.35), ZOMBIE_X_MAX: BUEHNE.MITTE_HALB - 0.35,
  ZOMBIE_SPALTENABSTAND: 0.63, ZOMBIE_REIHENABSTAND: 0.83, ZOMBIE_ZUFALLSVERSATZ: 0.12,
} as const

// Aus src/style.css (env(safe-area-inset-*), touch-action: none) und
// src/systems/safeArea.ts (CSS-Pixel); die Randgeste braucht 24 pt Reserve.
export const STEUERUNG = { RANDRESERVE_PT: 24, MIN_X: -3, MAX_X: 3, MAX_M_PRO_S: 8 } as const
export const DARSTELLUNG = { FORMATION_MAX: 30, TRUPPS_MAX: 50, FRONT_MAX: 40, HORDE_MAX: 600, SCHILDER_TEMPO_LANGSAM: 4, SCHILDER_TEMPO_SCHNELL: 16, SAEULEN_VORSCHAU: 3, BLITZE_MAX: 12, BLITZE_PRO_SEKUNDE: 10, BLITZ_DAUER: .06, FRONT_BLITZE_MAX: 8, FRONT_BLITZE_PRO_SEKUNDE: 12, FALL_SOLDATEN_MAX: 8 } as const
