import { BALANCE_V2 } from './balanceV2'

/** Zustand, der ausschliesslich zur einzelnen Stromfigur gehoert. */
export type TorFigur = Readonly<{ torPassiert: boolean }>
export type TorZustand = Readonly<{ restlicheTreffer: number }>
export type TorDurchgang = Readonly<{ figur: TorFigur, tor: TorZustand, anzahl: number }>

export function torStartZustand(): TorZustand {
  return { restlicheTreffer: BALANCE_V2.tor.freischaltTreffer }
}

/**
 * Verarbeitet genau einen Hoehen-Durchgang. Die Figur wird sofort markiert, damit
 * sie auf weiteren Bildern an derselben Torhoehe weder zaehlt noch erneut kopiert.
 */
export function durchquertTor(figur: TorFigur, tor: TorZustand): TorDurchgang {
  if (figur.torPassiert) return { figur, tor, anzahl: 1 }
  const passiert: TorFigur = { ...figur, torPassiert: true }
  if (tor.restlicheTreffer > 0) {
    return { figur: passiert, tor: { restlicheTreffer: tor.restlicheTreffer - 1 }, anzahl: 1 }
  }
  return { figur: passiert, tor, anzahl: BALANCE_V2.tor.faktor }
}
