import { BALANCE } from '../config/balance'
import { getRoadHalfWidth } from './roadGeometry'

export function getStromFigurenProSek(teamSize: number): number {
  return Math.min(teamSize, BALANCE.torlauf.strom.deckelEinheiten) * BALANCE.torlauf.strom.figurenJeEinheitProSek
}

/** Identische Spurformel wie Weapons.update (weapons.ts:206-210), nur fuer Figuren. */
export function getStromLaneX(width: number, height: number, y: number, laneOriginX: number, laneRatio: number, lateralPx: number): number {
  return laneOriginX + laneRatio * getRoadHalfWidth(width, height, y) + lateralPx
}
