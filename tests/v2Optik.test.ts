import { describe, expect, it } from 'vitest'
import { BALANCE_V2, bahnKantenBeiY, bahnKantenPunkte, tiefenSkala } from '../src/v2/balanceV2'
import { readFileSync } from 'node:fs'
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

  it('formt die Bruecke nach vorne zum Trichter: hinten ist sie auf mehreren Hoehen schmaler', () => {
    const breite = 390
    const hoehe = 844
    const hinten = bahnKantenBeiY(breite, hoehe, BALANCE_V2.track.horizonY + 1)
    const mitte = bahnKantenBeiY(breite, hoehe, 500)
    const vorne = bahnKantenBeiY(breite, hoehe, hoehe)
    expect(hinten.rightX - hinten.leftX).toBeLessThan(mitte.rightX - mitte.leftX)
    expect(mitte.rightX - mitte.leftX).toBeLessThan(vorne.rightX - vorne.leftX)
  })

  it('haelt die gekruemmte Bahn symmetrisch und von oben nach unten streng breiter', () => {
    const punkte = bahnKantenPunkte(390, 844, 24)
    for (let index = 0; index < punkte.length; index += 1) {
      expect((punkte[index].leftX + punkte[index].rightX) / 2).toBeCloseTo(195, 8)
      if (index > 0) expect(punkte[index].rightX - punkte[index].leftX).toBeGreaterThan(punkte[index - 1].rightX - punkte[index - 1].leftX)
    }
  })

  it('ist sichtbar gebogen und ergibt mit Exponent eins wieder die Gerade', () => {
    const breite = 390
    const hoehe = 844
    const oben = bahnKantenBeiY(breite, hoehe, BALANCE_V2.track.horizonY)
    const mitte = bahnKantenBeiY(breite, hoehe, (BALANCE_V2.track.horizonY + hoehe) / 2)
    const unten = bahnKantenBeiY(breite, hoehe, hoehe)
    expect((oben.rightX - oben.leftX + unten.rightX - unten.leftX) / 2 - (mitte.rightX - mitte.leftX)).toBeGreaterThan(breite * 0.05)
    const gerade = bahnKantenBeiY(breite, hoehe, 500, 1)
    expect(gerade.leftX).toBeCloseTo(oben.leftX + (unten.leftX - oben.leftX) * ((500 - BALANCE_V2.track.horizonY) / (hoehe - BALANCE_V2.track.horizonY)), 8)
  })

  it('skaliert alle Bahndinge vom Horizont streng bis zur Unterkante', () => {
    const oben = tiefenSkala(844, BALANCE_V2.track.horizonY)
    const mitte = tiefenSkala(844, 500)
    const unten = tiefenSkala(844, 844)
    expect(oben).toBe(BALANCE_V2.track.skalaHorizont)
    expect(mitte).toBeGreaterThan(oben)
    expect(unten).toBe(1)
    expect(BALANCE_V2.raender.schildBreitePx * oben).toBeLessThan(BALANCE_V2.raender.schildBreitePx * unten)
    expect(BALANCE_V2.raender.schildHoehePx * oben).toBeLessThan(BALANCE_V2.raender.schildHoehePx * unten)
  })

  it('haelt die Kruemmung am Horizont: die Mitte bleibt schmaler als der Endbreitenmittelwert', () => {
    const oben = bahnKantenBeiY(390, 844, BALANCE_V2.track.horizonY)
    const mitte = bahnKantenBeiY(390, 844, (BALANCE_V2.track.horizonY + 844) / 2)
    const unten = bahnKantenBeiY(390, 844, 844)
    expect(mitte.rightX - mitte.leftX).toBeLessThan(((oben.rightX - oben.leftX) + (unten.rightX - unten.leftX)) / 2)
  })

  it('zeichnet V2-Figuren nie als einfarbige Silhouette', () => {
    const source = readFileSync(new URL('../src/v2/RunGunV2Scene.ts', import.meta.url), 'utf8')
    expect(source).not.toContain('setTintFill')
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
