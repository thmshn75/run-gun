import { BALANCE } from '../config/balance'

// Gegner kommen hinter der Horizontlinie hervor: Sie spawnen vollstaendig oberhalb der
// Linie und nur der Teil unterhalb wird gezeichnet (Crop). Diese Geometrie ist bewusst
// eine reine Funktion, damit sie ohne Phaser testbar ist.

// Spawn-Mittelpunkt eines Einzelgegners: Unterkante der Kollisionshuelle exakt am Horizont.
export function getEnemySpawnCenterY(bodyHeightPx: number): number {
  return BALANCE.road.horizonY - bodyHeightPx / 2
}

// Spawn-Basis eines Trupps: Auch das unterste Mitglied (groesster yOffset) startet mit
// der Unterkante am Horizont; alle anderen liegen darueber und kommen gestaffelt hervor.
export function getSquadSpawnBaseY(maxBodyHeightPx: number, maxYOffset: number): number {
  return BALANCE.road.horizonY - maxBodyHeightPx / 2 - maxYOffset
}

// Wie viele Textur-Pixel oberhalb der Horizontlinie liegen und deshalb nicht gezeichnet werden.
export function getHiddenTopPx(topY: number): number {
  return Math.max(0, BALANCE.road.horizonY - topY)
}
