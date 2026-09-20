import { BALANCE_V2 } from './balanceV2'

/** Zustand, der ausschliesslich zur einzelnen Stromfigur gehoert. */
export type TorFigur = Readonly<{ torPassiert: boolean }>
/**
 * Der Torfaktor ist Spielstand, keine Konstante: Er beginnt bei x1 und steigt mit
 * jeder abgebauten Wand. `rest` sammelt den Bruchteil auf - ohne ihn ginge bei
 * einem Faktor wie 1,5 jede zweite Figur durch das Abrunden verloren.
 */
export type TorZustand = Readonly<{ faktor: number, rest: number }>
export type TorDurchgang = Readonly<{ figur: TorFigur, tor: TorZustand, anzahl: number }>

export function torStartZustand(): TorZustand {
  return { faktor: BALANCE_V2.tor.startFaktor, rest: 0 }
}

/** Eine gefallene Wand hebt den Torfaktor dauerhaft. */
export function mitWandBelohnung(tor: TorZustand): TorZustand {
  return { ...tor, faktor: tor.faktor + BALANCE_V2.tor.zuwachsJeWand }
}

/**
 * Verarbeitet genau einen Hoehen-Durchgang. Die Figur wird sofort markiert, damit
 * sie auf weiteren Bildern an derselben Torhoehe weder zaehlt noch erneut kopiert.
 */
export function durchquertTor(figur: TorFigur, tor: TorZustand): TorDurchgang {
  if (figur.torPassiert) return { figur, tor, anzahl: 1 }
  const passiert: TorFigur = { ...figur, torPassiert: true }
  const gesamt = tor.faktor + tor.rest
  const anzahl = Math.max(1, Math.floor(gesamt))
  return { figur: passiert, tor: { ...tor, rest: gesamt - anzahl }, anzahl }
}
