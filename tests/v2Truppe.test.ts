import { describe, expect, it } from 'vitest'
import { bahnKantenBeiY, BALANCE_V2 } from '../src/v2/balanceV2'
import { haufenHalbeBreite, haufenPlaetze, haufenPositionenX, truppeGrenzen, truppenAnzeige } from '../src/v2/truppe'

describe('Run Gun V2 — S2 eigene Truppe', () => {
  it.each([1, 5, 20, 60])('liefert fuer %i Figuren genau so viele Haufenplaetze', (anzahl) => {
    expect(haufenPlaetze(anzahl)).toHaveLength(anzahl)
  })

  it('haelt auch den Haufen aus 60 Figuren innerhalb seines Maximalradius', () => {
    for (const platz of haufenPlaetze(60)) {
      expect(Math.hypot(platz.dx, platz.dy)).toBeLessThanOrEqual(BALANCE_V2.truppe.haufenRadiusMaxPx)
    }
  })

  it('haelt jeden Haufenplatz an beiden erlaubten Endpunkten innerhalb der Bahnkanten', () => {
    const width = 390
    const height = 844
    const plaetze = haufenPlaetze(BALANCE_V2.truppe.maxSichtbar)
    const halbeBreite = haufenHalbeBreite(plaetze.length, 0)
    const grenzen = truppeGrenzen(width, height, halbeBreite)
    const truppeY = height - BALANCE_V2.truppe.abstandVonUntenPx

    for (const mittelpunkt of [grenzen.minX, grenzen.maxX]) {
      for (const platz of plaetze) {
        const kanten = bahnKantenBeiY(width, height, truppeY + platz.dy)
        expect(mittelpunkt + platz.dx).toBeGreaterThanOrEqual(kanten.leftX)
        expect(mittelpunkt + platz.dx).toBeLessThanOrEqual(kanten.rightX)
      }
    }
  })

  it('deckt nur die Darstellung, nie den echten Truppenzaehler', () => {
    const echteGroesse = BALANCE_V2.truppe.maxSichtbar + 17
    expect(truppenAnzeige(echteGroesse)).toEqual({
      sichtbareFiguren: BALANCE_V2.truppe.maxSichtbar,
      zaehler: String(echteGroesse),
    })
  })

  it('setzt Figuren nach zehn Bewegungen immer absolut auf ihren Haufenplatz', () => {
    const width = 390
    const height = 844
    const plaetze = haufenPlaetze(BALANCE_V2.truppe.startGroesse)
    const figurBreite = 18
    const grenzen = truppeGrenzen(width, height, haufenHalbeBreite(plaetze.length, figurBreite))
    let truppeX = width / 2
    let figurenX = haufenPositionenX(truppeX, plaetze)
    const ziele = [14, 322, 91, 388, 175, -50, 260, 35, 410, 195]

    for (const ziel of ziele) {
      truppeX = Math.min(grenzen.maxX, Math.max(grenzen.minX, ziel))
      figurenX = haufenPositionenX(truppeX, plaetze)
      figurenX.forEach((figurX, index) => {
        expect(figurX).toBe(truppeX + plaetze[index].dx)
      })
    }
  })
})
