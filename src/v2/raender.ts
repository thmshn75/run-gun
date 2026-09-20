import { bahnKantenBeiY, BALANCE_V2 } from './balanceV2'

export type SchildSeite = 'links' | 'rechts'
export type RandSchild = Readonly<{
  id: string
  seite: SchildSeite
  wert: number
  x: number
  y: number
  umlauf: number
}>

export type SammelReichweite = number | Readonly<{ seitlich: number, hoehe: number }>

/** Mittelpunkt eines Schilds: die gesamte Schildkante bleibt in der Bahn. */
export function schildMitteX(seite: SchildSeite, width: number, height: number, y: number): number {
  const kanten = bahnKantenBeiY(width, height, y)
  const rand = seite === 'links' ? kanten.leftX : kanten.rightX
  return rand + (seite === 'links' ? BALANCE_V2.raender.randEinzugPx : -BALANCE_V2.raender.randEinzugPx)
}

/**
 * Liefert beide endlosen Schilderreihen fuer einen Zeitpunkt. Die Umlaufnummer macht
 * aus einem wiederkehrenden Platz wieder dasselbe Schild mit frisch gesetztem Zustand.
 */
export function schildPositionen(width: number, height: number, zeitMs: number): readonly RandSchild[] {
  const abstand = BALANCE_V2.raender.abstandPx
  const strecke = height - BALANCE_V2.track.horizonY + BALANCE_V2.raender.schildHoehePx
  const anzahl = Math.ceil(strecke / abstand) + 1
  const verschiebung = Math.max(0, zeitMs) / 1000 * BALANCE_V2.raender.tempoPxProSek
  return (['links', 'rechts'] as const).flatMap((seite) => Array.from({ length: anzahl }, (_, index) => {
    const rohY = BALANCE_V2.track.horizonY - BALANCE_V2.raender.schildHoehePx + index * abstand + verschiebung
    const umlauf = Math.floor(rohY / strecke)
    const y = ((rohY % strecke) + strecke) % strecke
    return {
      id: `${seite}-${index}`,
      seite,
      wert: seite === 'links' ? 1 : 99,
      x: schildMitteX(seite, width, height, y),
      y,
      umlauf,
    }
  }))
}

/** Entscheidet ausschliesslich aus Hoehe und seitlichem Abstand, ob ein Schild gilt. */
export function sammeltEin(schild: RandSchild, truppeX: number, truppeY: number, reichweite: SammelReichweite): boolean {
  const bereich = typeof reichweite === 'number'
    ? { seitlich: reichweite, hoehe: reichweite }
    : reichweite
  return Math.abs(schild.x - truppeX) <= bereich.seitlich
    && Math.abs(schild.y - truppeY) <= bereich.hoehe
}

/** Der Spielstand waechst nur um den Wert eines bereits als einmalig markierten Schilds. */
export function truppenGroesseNachSammeln(truppenGroesse: number, schildWert: number): number {
  return Math.max(0, Math.floor(truppenGroesse)) + Math.max(0, Math.floor(schildWert))
}
