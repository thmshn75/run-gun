import { gehsteigMitteBeiY, BALANCE_V2 } from './balanceV2'

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

/** Die linke Reihe belohnt nur wirkliches Linksfahren; Mitte bleibt Grundtempo. */
export function linkesReihenTempo(truppeX: number, width: number): number {
  const linksAnteil = Math.min(1, Math.max(0, (width / 2 - truppeX) / (width / 2)))
  return BALANCE_V2.raender.grundTempoPxProSek + linksAnteil * BALANCE_V2.raender.zuschlagGanzLinksPxProSek
}

/** Mittelpunkt eines Schilds: die gesamte Schildkante bleibt in der Bahn. */
export function schildMitteX(seite: SchildSeite, width: number, height: number, y: number): number {
  return gehsteigMitteBeiY(seite, width, height, y)
}

/**
 * Liefert beide endlosen Schilderreihen fuer einen Zeitpunkt. Die Umlaufnummer macht
 * aus einem wiederkehrenden Platz wieder dasselbe Schild mit frisch gesetztem Zustand.
 */
export function schildPositionen(width: number, height: number, zeitMs: number, truppeX = width / 2): readonly RandSchild[] {
  const horizont = BALANCE_V2.track.horizonY
  // Gelaufen wird ausschliesslich zwischen Horizont und Unterkante. Frueher lief
  // der Umlauf ab null, wodurch Schilder oberhalb des Horizonts im Himmel standen.
  const strecke = height - horizont
  const sekunden = Math.max(0, zeitMs) / 1000
  return (['links', 'rechts'] as const).flatMap((seite) => {
    // Links eine dichte Kette, rechts einzelne Waende mit grossem Abstand.
    const wunschAbstand = seite === 'links' ? BALANCE_V2.raender.abstandPx : BALANCE_V2.raender.rechterAbstandPx
    const tempo = seite === 'links' ? linkesReihenTempo(truppeX, width) : BALANCE_V2.raender.rechtesGrundTempoPxProSek
    // Der Abstand muss die Strecke glatt teilen, sonst stehen beim Umlauf zwei
    // Schilder dicht beieinander: Das letzte kommt oben wieder herein, waehrend
    // das erste noch nicht weit genug gelaufen ist.
    const anzahl = Math.max(1, Math.round(strecke / wunschAbstand))
    const abstand = strecke / anzahl
    return Array.from({ length: anzahl }, (_, index) => {
      const rohY = index * abstand + sekunden * tempo
      const umlauf = Math.floor(rohY / strecke)
      const y = horizont + ((rohY % strecke) + strecke) % strecke
      return {
        id: `${seite}-${index}`,
        seite,
        wert: seite === 'links' ? 1 : 99,
        x: schildMitteX(seite, width, height, y),
        y,
        umlauf,
      }
    })
  })
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

/**
 * Wie schnell die Truppe eine +99-Wand herunterzaehlt. Die Truppengroesse ist der
 * Hebel: Eine grosse Truppe bricht die Wand in Sekunden, eine kleine schafft es
 * im knappen Zeitfenster bis zum Boss gar nicht. Genau darin liegt die
 * Entscheidung - links viele kleine Schritte, rechts einer grosser mit Zeitrisiko.
 */
export function wandAbbauProSek(truppenGroesse: number): number {
  return Math.max(
    BALANCE_V2.wand.mindestAbbauProSek,
    Math.max(0, truppenGroesse) * BALANCE_V2.wand.abbauJeTruppenfigurProSek,
  )
}

/**
 * Ein Abbauschritt an einer Wand. Das Abtragen kostet eigene Einheiten: Wer die
 * Wand bricht, bezahlt sie mit Truppe. Dadurch wird der Abbau von selbst
 * langsamer, je mehr man schon verloren hat - und eine zu kleine Truppe bleibt
 * an der Wand haengen, statt sie umsonst zu knacken.
 *
 * Liefert den neuen Rest, den Truppenverbrauch und, wenn die Wand in diesem
 * Schritt faellt, die Gutschrift. Rein rechnerisch, ohne Phaser.
 */
export function wandSchritt(rest: number, truppenGroesse: number, dtMs: number) {
  const gewuenschterAbbau = wandAbbauProSek(truppenGroesse) * Math.max(0, dtMs) / 1000
  // Mehr als der Rest ist nie abzutragen, und mehr als die Truppe hergibt auch nicht.
  const bezahlbar = Math.max(0, truppenGroesse) / BALANCE_V2.wand.verbrauchJeAbbaupunkt
  const abbau = Math.min(rest, gewuenschterAbbau, bezahlbar)
  const neuerRest = Math.max(0, rest - abbau)
  return {
    rest: neuerRest,
    verbrauch: abbau * BALANCE_V2.wand.verbrauchJeAbbaupunkt,
    gutschrift: neuerRest <= 0 && rest > 0 ? BALANCE_V2.wand.gutschrift : 0,
  }
}

/** Nur die linke Reihe wird eingesammelt; rechts steht eine Wand, die abgebaut wird. */
export function sammelAuswirkung(seite: SchildSeite, truppenGroesse: number, staerke: number) {
  return seite === 'links'
    ? { truppenGroesse: truppenGroesseNachSammeln(truppenGroesse, 1), staerke }
    : { truppenGroesse, staerke }
}
