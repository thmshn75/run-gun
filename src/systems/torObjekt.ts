import { BALANCE } from '../config/balance'
import { getRoadHalfWidth, getRoadScale } from './road'

/** Ein einzelnes Tor mittig auf der Bahn: links und rechts bleibt Platz zum Vorbeilaufen. */
export function torGeometrieMitte(breite: number, hoehe: number, y: number): { x: number; breite: number } {
  const halb = getRoadHalfWidth(breite, hoehe, y)
  return { x: breite / 2, breite: Math.max(8, halb * 2 * BALANCE.torlauf.tor.mitteBreiteAnteil) }
}

export function torGeometrie(breite: number, hoehe: number, y: number, seite: 'links' | 'rechts'): { x: number; breite: number } {
  const halb = getRoadHalfWidth(breite, hoehe, y)
  const massstab = getRoadScale(breite, hoehe, y)
  const innen = halb * BALANCE.torlauf.tor.innenkanteAnteil
  const aussen = halb - BALANCE.torlauf.tor.randSpaltPx * massstab
  const mitte = breite / 2
  return { x: seite === 'rechts' ? mitte + (innen + aussen) / 2 : mitte - (innen + aussen) / 2, breite: Math.max(8, aussen - innen) }
}
