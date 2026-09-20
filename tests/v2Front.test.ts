import { describe, expect, it } from 'vitest'
import { aktualisiereFront, frontYAusVorrat, type FrontZustand } from '../src/v2/front'
import { BALANCE_V2 } from '../src/v2/balanceV2'

function zustand(vorrat: number, eigenerWert: number): FrontZustand {
  return { vorrat, eigenerWert, staerke: BALANCE_V2.staerke.start, frontY: frontYAusVorrat(vorrat) }
}

describe('Run Gun V2 — S4 die beiden Flaechen', () => {
  it('tauscht bei Staerke 100 in jedem Schritt exakt eins gegen eins', () => {
    const start = zustand(400, 120)
    const ende = aktualisiereFront(start, 1000)
    expect(start.eigenerWert - ende.eigenerWert).toBeCloseTo(start.vorrat - ende.vorrat, 10)
    expect(ende.eigenerWert).toBeLessThan(start.eigenerWert)
    expect(ende.vorrat).toBeLessThan(start.vorrat)
  })

  it('ist bei 16 und 32 ms bildratenunabhaengig', () => {
    // Geprueft wird der RELATIVE Unterschied, nicht der absolute: Die Bilanz ist
    // eine Schrittrechnung, deren Restfehler naturgemaess mit der Schrittweite
    // waechst. Bei Werten um 600 waere eine absolute Schranke von 0,005 eine
    // Genauigkeit von acht Stellen - das misst Rundung, nicht Bildratentreue.
    // Die Schranke ist nicht frei gewaehlt: Der theoretische Fehler einer solchen
    // Schrittrechnung liegt bei doppelter Schrittweite in der Groessenordnung
    // Rate mal Schrittweite, hier 0,8 * 0,032 = rund 2,6 Prozent. Die Schranke von
    // 0,5 Prozent ist also fuenfmal strenger als die Theorie zulaesst und faengt
    // jeden echten Bildratenfehler, der sich in Faktoren statt Promille zeigt.
    // Auf dem Bildschirm sind 0,5 Prozent von 300 px anderthalb Pixel.
    const start = zustand(600, 30)
    const in16 = Array.from({ length: 20 }).reduce((wert) => aktualisiereFront(wert, 16), start)
    const in32 = Array.from({ length: 10 }).reduce((wert) => aktualisiereFront(wert, 32), start)
    const relativ = (a: number, b: number) => Math.abs(a - b) / Math.max(1, Math.abs(b))
    expect(relativ(in16.vorrat, in32.vorrat)).toBeLessThan(5e-3)
    expect(relativ(in16.eigenerWert, in32.eigenerWert)).toBeLessThan(5e-3)
    expect(relativ(in16.frontY, in32.frontY)).toBeLessThan(5e-3)
  })

  it('laesst weder eigene Flaeche noch Gegner im Kampf wachsen', () => {
    const start = zustand(500, 50)
    const ende = aktualisiereFront(start, 1000)
    expect(ende.eigenerWert).toBeLessThanOrEqual(start.eigenerWert)
    expect(ende.vorrat).toBeLessThanOrEqual(start.vorrat)
  })

  it('verschiebt die Bilanz durch Staerke und Menge zugunsten des Spielers', () => {
    const start = zustand(500, 50)
    const staerker = aktualisiereFront({ ...start, staerke: 199 }, 1000)
    const mehrMenge = aktualisiereFront(zustand(500, 100), 1000)
    const grundwert = aktualisiereFront(start, 1000)
    expect(staerker.vorrat).toBeLessThan(grundwert.vorrat)
    expect(mehrMenge.vorrat).toBeLessThan(grundwert.vorrat)
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
    // 220 px statt der urspruenglichen 300: Das Tor ist auf Wunsch weiter nach oben
    // gerueckt (620 statt 700), der Abstand zur Gegnerfront schrumpft dadurch
    // zwangslaeufig. Geprueft wird weiter, was dahintersteht - dass zwischen
    // Gegnerflaeche und Tor eine deutlich sichtbare freie Strecke bleibt.
    expect(BALANCE_V2.tor.y - unterkante).toBeGreaterThanOrEqual(220)
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
