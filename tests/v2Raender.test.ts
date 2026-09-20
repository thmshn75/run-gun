import { describe, expect, it } from 'vitest'
import { BALANCE_V2 } from '../src/v2/balanceV2'
import { linkesReihenTempo, sammelAuswirkung, sammeltEin, schildMitteX, schildPositionen, truppenGroesseNachSammeln, wandAbbauProSek, wandSchritt, type RandSchild } from '../src/v2/raender'
import { bahnKantenBeiY, fahrbahnKantenBeiY } from '../src/v2/balanceV2'

const breite = 390
const hoehe = 844

function schild(seite: 'links' | 'rechts'): RandSchild {
  return schildPositionen(breite, hoehe, 0).find((eintrag) => eintrag.seite === seite && eintrag.y > 650)!
}

describe('Run Gun V2 — S5 die beiden Raender', () => {
  it('staffelt jede Reihe lueckenlos ueber die ganze Bahn', () => {
    for (const zeitMs of [0, 317, 9_999]) {
      for (const seite of ['links', 'rechts'] as const) {
        const reihe = schildPositionen(breite, hoehe, zeitMs).filter((eintrag) => eintrag.seite === seite).sort((a, b) => a.y - b.y)
        for (let index = 1; index < reihe.length; index += 1) {
          expect(reihe[index].y - reihe[index - 1].y).toBeLessThanOrEqual(BALANCE_V2.raender.schildHoehePx)
        }
      }
    }
  })

  it('haelt beide Schildreihen auf ihrem Gehsteig neben der Fahrbahn', () => {
    // Seit N14 laufen die Schilder nicht mehr auf der Fahrbahn, sondern auf den
    // beiden Gehsteigen: aussen begrenzt sie die Mauer, innen die Fahrbahnkante.
    for (let y = BALANCE_V2.track.horizonY; y <= hoehe; y += 1) {
      const aussen = bahnKantenBeiY(breite, hoehe, y)
      const fahrbahn = fahrbahnKantenBeiY(breite, hoehe, y)
      expect(schildMitteX('links', breite, hoehe, y)).toBeGreaterThanOrEqual(aussen.leftX)
      expect(schildMitteX('links', breite, hoehe, y)).toBeLessThanOrEqual(fahrbahn.leftX)
      expect(schildMitteX('rechts', breite, hoehe, y)).toBeLessThanOrEqual(aussen.rightX)
      expect(schildMitteX('rechts', breite, hoehe, y)).toBeGreaterThanOrEqual(fahrbahn.rightX)
    }
  })

  it('zaehlt ein Schild trotz dauerhafter Beruehrung nur einmal', () => {
    const links = schild('links')
    let verbraucht = false
    let groesse = 10
    for (let bild = 0; bild < 30; bild += 1) {
      if (!verbraucht && sammeltEin(links, links.x, links.y, 1)) {
        verbraucht = true
        groesse += links.wert
      }
    }
    expect(groesse).toBe(11)
  })

  it('sammelt mittig nichts, links nur +1 und rechts nur +99', () => {
    const links = schild('links')
    const rechts = schild('rechts')
    const reichweite = { seitlich: BALANCE_V2.raender.sammelSeitlichPx, hoehe: BALANCE_V2.raender.sammelHoehePx }
    expect(sammeltEin(links, breite / 2, links.y, reichweite)).toBe(false)
    expect(sammeltEin(rechts, breite / 2, rechts.y, reichweite)).toBe(false)
    expect(sammeltEin(links, links.x, links.y, reichweite)).toBe(true)
    expect(sammeltEin(rechts, links.x, rechts.y, reichweite)).toBe(false)
    expect(sammeltEin(rechts, rechts.x, rechts.y, reichweite)).toBe(true)
    expect(sammeltEin(links, rechts.x, links.y, reichweite)).toBe(false)
  })

  it('macht die linke Reihe zum linken Rand hin strikt schneller, mit Grundtempo in der Mitte', () => {
    const positionen = [breite / 2, breite * 0.35, breite * 0.15, 0].map((x) => linkesReihenTempo(x, breite))
    expect(positionen[0]).toBe(BALANCE_V2.raender.grundTempoPxProSek)
    expect(positionen[1]).toBeGreaterThan(positionen[0])
    expect(positionen[2]).toBeGreaterThan(positionen[1])
    expect(positionen[3]).toBeGreaterThan(positionen[2])
  })

  it('laesst nur die linke Reihe die Truppe wachsen; rechts aendert das Einsammeln nichts', () => {
    // Rechts steht seit N15 eine Wand, die abgebaut wird - sie wird nicht mehr
    // eingesammelt und gibt weder Truppen noch Staerke.
    expect(sammelAuswirkung('rechts', 10, 100)).toEqual({ truppenGroesse: 10, staerke: 100 })
    expect(sammelAuswirkung('links', 10, 100)).toEqual({ truppenGroesse: 11, staerke: 100 })
    expect(truppenGroesseNachSammeln(10, 1)).toBe(11)
  })

  it('zaehlt eine Wand umso schneller herunter, je groesser die Truppe ist', () => {
    expect(wandAbbauProSek(60)).toBeGreaterThan(wandAbbauProSek(10))
    const mitGrosserTruppe = wandSchritt(BALANCE_V2.wand.startRest, 60, 1000)
    const mitKleinerTruppe = wandSchritt(BALANCE_V2.wand.startRest, 10, 1000)
    expect(mitGrosserTruppe.rest).toBeLessThan(mitKleinerTruppe.rest)
  })

  it('schreibt die Gutschrift genau einmal gut, wenn die Wand faellt', () => {
    const faelltJetzt = wandSchritt(1, 60, 1000)
    expect(faelltJetzt.rest).toBe(0)
    expect(faelltJetzt.gutschrift).toBe(BALANCE_V2.wand.gutschrift)
    // Ein weiterer Schritt auf der bereits gefallenen Wand gibt nichts mehr.
    expect(wandSchritt(0, 60, 1000).gutschrift).toBe(0)
  })

  it('laesst die rechte Reihe deutlich langsamer laufen als die linke', () => {
    // Eine Wand braucht Zeit zum Abbauen; bei gleichem Tempo waere sie vorbei.
    expect(BALANCE_V2.raender.rechtesGrundTempoPxProSek)
      .toBeLessThan(BALANCE_V2.raender.grundTempoPxProSek)
  })
})
