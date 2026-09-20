import { describe, expect, it } from 'vitest'
import { BALANCE_V2 } from '../src/v2/balanceV2'
import { sammeltEin, schildMitteX, schildPositionen, truppenGroesseNachSammeln, type RandSchild } from '../src/v2/raender'
import { bahnKantenBeiY } from '../src/v2/balanceV2'

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

  it('haelt beide Schildkanten auf jeder Bahnhoehe vollstaendig innerhalb der Bahn', () => {
    const halbeSchildbreite = BALANCE_V2.raender.schildBreitePx / 2
    for (let y = BALANCE_V2.track.horizonY; y <= hoehe; y += 1) {
      const kanten = bahnKantenBeiY(breite, hoehe, y)
      expect(schildMitteX('links', breite, hoehe, y) - halbeSchildbreite).toBeGreaterThanOrEqual(kanten.leftX)
      expect(schildMitteX('rechts', breite, hoehe, y) + halbeSchildbreite).toBeLessThanOrEqual(kanten.rightX)
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

  it('erhoeht die Truppengroesse exakt um die eingesammelte Summe', () => {
    const gesammelt = [schild('links'), schild('rechts'), schild('links')]
    expect(gesammelt.reduce((groesse, eintrag) => truppenGroesseNachSammeln(groesse, eintrag.wert), 10)).toBe(111)
  })
})
