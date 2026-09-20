import { describe, expect, it } from 'vitest'
import { aktualisiereEnde, ausgangEinmal, ausgangFuer, endeStartZustand, type EndeZustand } from '../src/v2/ende'
import { frontYAusVorrat, type FrontZustand } from '../src/v2/front'
import { BALANCE_V2 } from '../src/v2/balanceV2'

function zustand(vorrat: number, eigenerWert: number, bossVorrat = BALANCE_V2.ende.bossStartVorrat, truppenGroesse = 10): EndeZustand {
  const front: FrontZustand = { vorrat, eigenerWert, staerke: BALANCE_V2.staerke.start, frontY: frontYAusVorrat(vorrat) }
  return { ...endeStartZustand(front, truppenGroesse), bossVorrat }
}

describe('Run Gun V2 — S7 Boss und Spielende', () => {
  it('baut mit vorhandenem roten Vorrat nur die rote Flaeche ab und bewegt den Boss', () => {
    const start = zustand(100, 20, 321)
    const ende = aktualisiereEnde(start, 1000)
    expect(ende.front.vorrat).toBeLessThan(start.front.vorrat)
    expect(ende.bossVorrat).toBe(321)
    expect(ende.bossAbstiegPx).toBe(BALANCE_V2.ende.bossTempoPxProSek)
  })

  it('baut nach leerer Flaeche den Boss mit staerkegewichteter Austauschrate ab', () => {
    const start = zustand(0, 20, 100)
    const ende = aktualisiereEnde(start, 1000)
    expect(ende.front.vorrat).toBe(0)
    expect(ende.bossVorrat).toBeCloseTo(100 - 20 * BALANCE_V2.front.austauschProSek, 8)
  })

  it('meldet Sieg bei Boss null und Niederlage bei Truppe null', () => {
    expect(ausgangFuer(zustand(0, 5, 0))).toBe('sieg')
    expect(ausgangFuer(zustand(10, 0, 50, 0))).toBe('niederlage')
    expect(ausgangFuer(zustand(10, 1, 50))).toBeUndefined()
  })

  it('verliert ohne Eingabe, weil der Boss auch bei unveraendertem Vorrat ankommt', () => {
    const start = zustand(BALANCE_V2.front.gegnerStartVorrat, 10)
    const ende = aktualisiereEnde(start, BALANCE_V2.ende.bossMaxAbstiegPx / BALANCE_V2.ende.bossTempoPxProSek * 1000)
    expect(ende.front.vorrat).toBeLessThan(start.front.vorrat)
    expect(ausgangFuer(ende)).toBe('niederlage')
  })

  it('loest denselben Ausgang ueber viele Bilder genau einmal aus', () => {
    const fertig = zustand(0, 5, 0)
    expect(ausgangEinmal(false, fertig)).toBe('sieg')
    expect(ausgangEinmal(true, fertig)).toBeUndefined()
    expect(ausgangEinmal(true, aktualisiereEnde(fertig, 16))).toBeUndefined()
  })

  it('ist bei 20 mal 16 und 10 mal 32 ms bildratenunabhaengig', () => {
    // Geprueft wird der RELATIVE Unterschied: Der Restfehler einer Schrittrechnung
    // waechst zwangslaeufig mit der Schrittweite, in der Groessenordnung Rate mal
    // Schrittweite (hier rund 2,6 Prozent). Eine absolute Schranke von 5e-9 bei
    // Werten um 500 misst Rundung, nicht Bildratentreue.
    const start = zustand(0, 30, 500)
    const in16 = Array.from({ length: 20 }).reduce((wert) => aktualisiereEnde(wert, 16), start)
    const in32 = Array.from({ length: 10 }).reduce((wert) => aktualisiereEnde(wert, 32), start)
    const relativ = (a: number, b: number) => Math.abs(a - b) / Math.max(1, Math.abs(b))
    expect(relativ(in16.bossVorrat, in32.bossVorrat)).toBeLessThan(5e-3)
    expect(relativ(in16.front.eigenerWert, in32.front.eigenerWert)).toBeLessThan(5e-3)
  })
})
