import { describe, expect, it } from 'vitest'
import { BALANCE_V2, bahnKantenBeiY } from '../src/v2/balanceV2'
import { aktualisiereFront, frontStartZustand, mitAnkunft } from '../src/v2/front'

function kanaele(farbe: number) {
  return { rot: farbe >> 16 & 0xff, gruen: farbe >> 8 & 0xff, blau: farbe & 0xff }
}

describe('Run Gun V2 — S8 Optik', () => {
  it('trennt die eigene blaue und die gegnerische rote Seite klar ueber ihre RGB-Werte', () => {
    const eigene = kanaele(BALANCE_V2.colors.eigeneSeite)
    const gegner = kanaele(BALANCE_V2.colors.gegnerSeite)
    expect(eigene.blau).toBeGreaterThan(eigene.rot + 80)
    expect(eigene.blau).toBeGreaterThan(eigene.gruen + 40)
    expect(gegner.rot).toBeGreaterThan(gegner.blau + 80)
    expect(gegner.rot).toBeGreaterThan(gegner.gruen + 40)
  })

  it('formt die Bruecke nach vorne zum Trichter: hinten ist sie auf mehreren Hoehen breiter', () => {
    const breite = 390
    const hoehe = 844
    const hinten = bahnKantenBeiY(breite, hoehe, BALANCE_V2.track.horizonY + 1)
    const mitte = bahnKantenBeiY(breite, hoehe, 500)
    const vorne = bahnKantenBeiY(breite, hoehe, hoehe)
    expect(hinten.rightX - hinten.leftX).toBeGreaterThan(mitte.rightX - mitte.leftX)
    expect(mitte.rightX - mitte.leftX).toBeGreaterThan(vorne.rightX - vorne.leftX)
  })

  it('laesst den reinen linken und reinen rechten Weg rechnerisch die Gegnerflaeche leeren', () => {
    const simuliere = (links: boolean) => Array.from({ length: 10_800 }).reduce((front, _leer, bild) => {
      const mitZustrom = mitAnkunft(front, links ? 2.5 / 60 : 1.6 / 60)
      const mitSchild = links ? mitZustrom : { ...mitZustrom, staerke: 100 + Math.floor(bild / 150) * 99 }
      return aktualisiereFront(mitSchild, 1000 / 60)
    }, frontStartZustand())
    expect(simuliere(true).vorrat).toBe(0)
    expect(simuliere(false).vorrat).toBe(0)
  })
})
