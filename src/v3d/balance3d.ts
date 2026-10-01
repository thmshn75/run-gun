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
  saeulenRundenFaktor: number
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

const BASIS: Level = {
  T0: 10, kStart: 2, wandStufe: 100, kMax: 4, wand: 5, laufgeschwindigkeit: 6,
  senden: 8, einsammeln: 6, saeuleSchaden: 0.3,
  schwelleLinks: -0.6, schwelleRechts: 0.6,
  wellen: [{ t: 0, groesse: 250 }, { t: 20, groesse: 250 }, { t: 40, groesse: 250 }],
  streuung: 0.1, miniBossWelle: 1, eliteBossZeit: 60,
  B_mini: 400, B_elite: 3000, P: 150, saeulenRundenFaktor: 1.5,
  saeulen: ['humvee', 'haubitze', 'panzer', 'hubschrauber', 'mecha'],
  C: 40, bossDruck: 25, zombieTreffer: 0.5, soldatenVerlust: 0.4,
  gegnerProSoldat: 2, frontVerschiebung: 0.5, bossSchaden: 25,
  marsch: 0.8, startY: 60,
}

// D7-Kalibrierung (Claude 2026-10-01, Bots: 30 Spielweisen [rhythmus/rhythmusSaeule, S 10–150]
// × 20 Seeds je Level). Ziel: gewinnende Spielweisen fallen 24 → 3, beste Spielweise gewinnt
// 20/20, passiv verliert 20/20; Zombies gesamt und Boss-Leben steigen monoton.
// Je Level: [Wellen, Zombies je Welle]. Gemessen: 24/22/19/17/15/13/10/8/6/3 Spielweisen.
const STUFEN: readonly (readonly [number, number])[] = [[3, 250], [3, 264], [3, 275], [3, 275], [4, 244], [4, 244], [4, 260], [4, 271], [5, 221], [5, 246]]
export const LEVELS: Level[] = STUFEN.map(([wellenZahl, groesse], i) => ({
  ...BASIS,
  wellen: Array.from({ length: wellenZahl }, (_, j) => ({ t: 20 * j, groesse })),
  eliteBossZeit: 20 * wellenZahl,
  B_elite: 3000 + 250 * i, B_mini: 400 + 40 * i,
  P: Math.round(150 * (1 + .1 * i)), kMax: i >= 4 ? 5 : 4,
}))

export const SPEZIAL = {
  humvee: { ablauf: [{ art: 'fahrt', dauer: 2 }, { art: 'schneise', dauer: 12, zombiesProSekunde: 10 }] },
  panzer: { ablauf: [{ art: 'fahrt', dauer: 1.2 }, { art: 'feuer', dauer: .75, zombiesProSekunde: 40 },
    { art: 'fahrt', dauer: 1.5 }, { art: 'feuer', dauer: .75, zombiesProSekunde: 40 },
    { art: 'schneise', dauer: 5, zombiesProSekunde: 20, bossAnteil: .05 }] },
  haubitze: { ablauf: [{ art: 'fahrt', dauer: 1.2 },
    { art: 'einschlaege', dauer: 4.05, einschlaege: 2, abstand: 4, zombiesProEinschlag: 90 },
    { art: 'fahrt', dauer: 1.5 }] },
  hubschrauber: { ablauf: [{ art: 'fahrt', dauer: 2 },
    { art: 'feuer', dauer: 12, zombiesProSekunde: 20, bossPunkteProSekunde: 25 }] },
  mecha: { ablauf: [{ art: 'fahrt', dauer: 3 },
    { art: 'feuer', dauer: 10, zombiesProSekunde: 12, bossPunkteProSekunde: 40 },
    { art: 'einschlaege', dauer: 4.05, einschlaege: 2, abstand: 4, zombiesProEinschlag: 70 },
    { art: 'fahrt', dauer: 2 }] },
} as const
export type SpezialName = keyof typeof SPEZIAL

export const FAHRZEUGE = {
  humvee: { LAENGE: 4.6, DREIECKE: 1528, DREHUNG: 180, FELD_DREHUNG: 0, SPIEL_SKALA: .8, MUENDUNG: [0, 1.76, -.87] as const, SCHNEISE_HALB: .7957 },
  panzer: { LAENGE: 9.8, DREIECKE: 1560, DREHUNG: 0, FELD_DREHUNG: 0, SPIEL_SKALA: .8, MUENDUNG: [0, 2.02, -4.9] as const, SCHNEISE_HALB: 1.3954 },
  haubitze: { LAENGE: 7.3, DREIECKE: 3714, DREHUNG: 0, FELD_DREHUNG: 0, MUENDUNG: [-.032, 2.54, -3.65] as const, SPIEL_SKALA: .5 },
  hubschrauber: { LAENGE: 17.7, DREIECKE: 2907, DREHUNG: 180, FELD_DREHUNG: 0, SPIEL_SKALA: .4, MUENDUNG: [0, 1.2, -8.05] as const, FLUGHOEHE: 4, KREIS_RADIUS: 3, KREIS_S: 6 },
  mecha: { LAENGE: 6, DREIECKE: 5154, DREHUNG: 206.565, FELD_DREHUNG: 0, SPIEL_SKALA: .75, MUENDUNG: [0, 3.1, -1] as const },
  DREH_S: 8,
  MINI_Y: 2.2,
  SPUR_X: 1.8,
} as const
export type FahrzeugName = Exclude<keyof typeof FAHRZEUGE, 'DREH_S' | 'MINI_Y' | 'SPUR_X'>

// 1 Einheit = 1 Meter. x quer, y oben, vorwärts = negatives z;
// Aussendelinie z = 0, Rechenposition pos bzw. Frontlage y wird z = -pos bzw. -y.
export const BUEHNE = {
  BAHN_BREITE: 12,
  // Links +1 [-6, -3.4], Mitte Kampffeld [-3.4, 3.4], rechts Eisfahrzeuge ab x = 3.6.
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
  SAEULE_X: 5.47,
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
export const STEUERUNG = { RANDRESERVE_PT: 24, VERSTAERKUNG: 1.6, MIN_X: -3, MAX_X: 3, MAX_M_PRO_S: 40 } as const
export const EIS = { HUELLE: .3, MASSSTAB: .8, INNEN_X: 3.6, LUECKE: 4, SPLITTER_POOL: 80 } as const
export const DARSTELLUNG = { FORMATION_MAX: 30, TRUPPS_MAX: 50, FRONT_MAX: 40, HORDE_MAX: 600, LOCH_HEILEN_S: .25, LOCH_STANDZEIT_S: 2, LOECHER_MAX: 150, GASSE_SCHLIESSEN_S: 3, HUMVEE_TAKT_S: .25, HUMVEE_BLITZ_DAUER_S: .15, HUBSCHRAUBER_TAKT_S: .2, HUBSCHRAUBER_FRONTABSTAND: 3.25, HUBSCHRAUBER_BOSS_VERSATZ: 1.5, FAHRZEUG_BLITZ: { haubitze: { durchmesser: 2.4, dauer: .15 }, panzer: { durchmesser: 1.6, dauer: .12 }, humvee: { durchmesser: .45, dauer: .15 }, hubschrauber: { durchmesser: .45, dauer: .08 }, mecha: { durchmesser: .45, dauer: .15 } }, SCHILDER_TEMPO_LANGSAM: 4, SCHILDER_TEMPO_SCHNELL: 21, SCHILDER_BESCHLEUNIGUNG: 64, SAEULEN_VORSCHAU: 3, BLITZE_MAX: 12, BLITZE_PRO_SEKUNDE: 10, BLITZ_DAUER: .06, FRONT_BLITZE_MAX: 8, FRONT_BLITZE_PRO_SEKUNDE: 12, FALL_SOLDATEN_MAX: 8, EXPLOSIONEN_MAX: 12 } as const
