import { describe, expect, it } from 'vitest'
import { aktualisiereFront, frontYAusVorrat, type FrontZustand } from '../src/v2/front'
import { BALANCE_V2 } from '../src/v2/balanceV2'

function zustand(vorrat: number, eigenerWert: number): FrontZustand {
  return { vorrat, eigenerWert, staerke: BALANCE_V2.staerke.start, frontY: frontYAusVorrat(vorrat) }
}

describe('Run Gun V2 — S4 die beiden Flaechen', () => {
  it('haelt die Grenze bei gleicher Staerke und verschiebt sie fuer die staerkere Seite', () => {
    const gleich = zustand(400, 400 * BALANCE_V2.front.verlustProVorratProSek / BALANCE_V2.front.abbauProEigenerEinheitProSek)
    expect(aktualisiereFront(gleich, 1000).frontY).toBeCloseTo(gleich.frontY, 8)
    expect(aktualisiereFront(zustand(400, gleich.eigenerWert * 2), 1000).frontY).toBeLessThan(gleich.frontY)
    expect(aktualisiereFront(zustand(400, gleich.eigenerWert / 2), 1000).frontY).toBeGreaterThan(gleich.frontY)
  })

  it('ist bei 16 und 32 ms bildratenunabhaengig', () => {
    const start = zustand(600, 30)
    const in16 = Array.from({ length: 20 }).reduce((wert) => aktualisiereFront(wert, 16), start)
    const in32 = Array.from({ length: 10 }).reduce((wert) => aktualisiereFront(wert, 32), start)
    expect(in16.vorrat).toBeCloseTo(in32.vorrat, 2)
    expect(in16.eigenerWert).toBeCloseTo(in32.eigenerWert, 2)
    expect(in16.frontY).toBeCloseTo(in32.frontY, 2)
  })

  it('verliert Bruchteile statt sie fuer die Anzeige zu runden', () => {
    const ende = Array.from({ length: 100 }).reduce(
      (vorrat) => aktualisiereFront(
        zustand(vorrat, 1), 1000, { abbauProEigenerEinheitProSek: 0.13, verlustProVorratProSek: 0 },
      ).vorrat,
      500,
    )
    expect(ende).toBeCloseTo(487, 8)
  })

  it('ordnet vollen, leeren und halben Vorrat genau der Grenzlinie zu', () => {
    expect(frontYAusVorrat(BALANCE_V2.front.gegnerStartVorrat)).toBe(BALANCE_V2.front.frontStartY)
    expect(frontYAusVorrat(0)).toBe(BALANCE_V2.track.horizonY)
    expect(frontYAusVorrat(BALANCE_V2.front.gegnerStartVorrat / 2)).toBe(
      (BALANCE_V2.front.frontStartY + BALANCE_V2.track.horizonY) / 2,
    )
  })

  it('haelt die volle Gegnerflaeche im oberen Bahndrittel mit freier Bahn vor dem Tor', () => {
    const bahnHoehe = 844 - BALANCE_V2.track.horizonY
    const unterkante = frontYAusVorrat(BALANCE_V2.front.gegnerStartVorrat)
    expect(unterkante).toBeLessThanOrEqual(BALANCE_V2.track.horizonY + bahnHoehe / 3)
    expect(unterkante).toBeLessThan(844 / 2)
    expect(BALANCE_V2.tor.y - unterkante).toBeGreaterThanOrEqual(300)
  })

  it('hat rechnerisch genug leicht ueberlappende Bilder fuer beide geschlossenen Flaechen', () => {
    const breite = 390
    const rotHoehe = BALANCE_V2.front.frontStartY - BALANCE_V2.track.horizonY
    const oben = breite * BALANCE_V2.track.topWidthRatio
    const unten = oben + (breite * BALANCE_V2.track.bottomWidthRatio - oben) * rotHoehe / (844 - BALANCE_V2.track.horizonY)
    const roteFlaeche = (oben + unten) * rotHoehe / 2
    const zombieFlaecheMitUeberlappung = (256 * BALANCE_V2.front.helmTextureScale * 0.9) ** 2
    expect(BALANCE_V2.front.gegnerFigurenVorrat).toBeGreaterThanOrEqual(Math.ceil(roteFlaeche / zombieFlaecheMitUeberlappung))

    const blauHoehe = BALANCE_V2.front.eigeneFlaecheMaxUntenY - BALANCE_V2.front.frontStartY
    const blauUnten = unten + (breite * BALANCE_V2.track.bottomWidthRatio - unten) * blauHoehe / (844 - BALANCE_V2.track.horizonY)
    const blaueFlaeche = (unten + blauUnten) * blauHoehe / 2
    const playerFlaecheMitUeberlappung = (256 * BALANCE_V2.front.helmTextureScale * 0.9) ** 2
    expect(BALANCE_V2.front.eigeneFigurenVorrat).toBeGreaterThanOrEqual(Math.ceil(blaueFlaeche / playerFlaecheMitUeberlappung))
  })

  it('haelt die eigene Flaeche oberhalb der Starttruppe', () => {
    expect(BALANCE_V2.front.eigeneFlaecheMaxUntenY).toBeLessThan(
      844 - BALANCE_V2.truppe.abstandVonUntenPx,
    )
  })

  it('zeigt bereits zum Start ein breites blaues Band unter der Grenzlinie', () => {
    const schrittX = 256 * BALANCE_V2.front.helmTextureScale * 0.9
    const kanten = 390 * (BALANCE_V2.track.topWidthRatio
      + (BALANCE_V2.track.bottomWidthRatio - BALANCE_V2.track.topWidthRatio)
        * (BALANCE_V2.front.frontStartY - BALANCE_V2.track.horizonY) / (844 - BALANCE_V2.track.horizonY))
    const spalten = Math.ceil(kanten / schrittX)
    const startBandBilder = Math.ceil(BALANCE_V2.truppe.startGroesse / 3) * spalten
    expect(startBandBilder).toBeGreaterThan(spalten)
    expect(startBandBilder).toBeLessThanOrEqual(BALANCE_V2.front.eigeneFigurenVorrat)
    expect(BALANCE_V2.front.eigeneFlaecheMaxUntenY).toBeLessThan(BALANCE_V2.tor.y)
  })
})
