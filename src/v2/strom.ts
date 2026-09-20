import { BALANCE_V2 } from './balanceV2'

export type StromFigur = Readonly<{ aktiv: boolean, x: number, y: number }>

/** Die Rate bleibt Phaser-frei, damit Balance und Obergrenze direkt prüfbar sind. */
export function figurenProSekunde(truppenGroesse: number): number {
  const groesse = Math.max(0, truppenGroesse)
  return Math.min(
    BALANCE_V2.strom.maximaleRateProSek,
    Math.max(BALANCE_V2.strom.mindestRateProSek, groesse * BALANCE_V2.strom.rateJeTruppenfigur),
  )
}

export function stromLaufdauerSek(): number {
  return BALANCE_V2.strom.laufstreckePx / BALANCE_V2.strom.tempoPxProSek
}

/**
 * Bewegt ausschliesslich den logischen Zustand. Ein Wippversatz der Darstellung
 * darf nie wieder zur Eingabe werden, sonst würde die Figur beschleunigt laufen.
 */
export function bewegeStromFigur(figur: StromFigur, dtMs: number): StromFigur {
  if (!figur.aktiv) return figur
  return { ...figur, y: figur.y - BALANCE_V2.strom.tempoPxProSek * (dtMs / 1000) }
}

/** Die Darstellung erhält ihren Versatz erst nach der logischen Bewegung. */
export function stromDarstellungsPosition(figur: StromFigur, versatzY = 0): Readonly<{ x: number, y: number }> {
  return { x: figur.x, y: figur.y + versatzY }
}
