import { BALANCE } from '../config/balance'

// Gegner erscheinen wie die Haeuser (Thomas-Korrektur 2026-08-22): Sobald die Unterkante
// die Horizontlinie erreicht, steht die Figur vollstaendig da und ragt mit dem Koerper
// ueber die Linie in den Himmel — kein Abschneiden an der Linie, kein Einblenden.
// Reine Funktionen, damit die Regel ohne Phaser testbar ist.

// Spawn-Mittelpunkt eines Einzelgegners: Unterkante der Kollisionshuelle exakt am Horizont
// — damit ist er ab dem ersten Frame sichtbar, genau wie ein frisch gespawntes Haus.
export function getEnemySpawnCenterY(bodyHeightPx: number): number {
  return BALANCE.road.horizonY - bodyHeightPx / 2
}

// Spawn-Basis eines Trupps: Auch das unterste Mitglied (groesster yOffset) startet mit
// der Unterkante am Horizont; die hinteren liegen darueber und erscheinen nacheinander,
// sobald ihre Unterkante die Linie erreicht.
export function getSquadSpawnBaseY(maxBodyHeightPx: number, maxYOffset: number): number {
  return BALANCE.road.horizonY - maxBodyHeightPx / 2 - maxYOffset
}

// Sichtbarkeitsregel der Haeuser, uebernommen fuer Gegner: gezeichnet wird, wessen
// Unterkante die Horizontlinie erreicht hat.
export function isRevealedAtHorizon(bottomY: number): boolean {
  return bottomY >= BALANCE.road.horizonY
}
