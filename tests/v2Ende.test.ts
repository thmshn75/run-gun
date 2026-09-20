import { describe, expect, it } from 'vitest'
import { aktualisiereEnde, ausgangEinmal, ausgangFuer, endeStartZustand, type EndeZustand } from '../src/v2/ende'
import { frontYAusVorrat, type FrontZustand } from '../src/v2/front'
import { BALANCE_V2 } from '../src/v2/balanceV2'
import { figurenProSekunde } from '../src/v2/strom'

function zustand(vorrat: number, eigenerWert: number, bossVorrat = BALANCE_V2.ende.bossStartVorrat, truppenGroesse = 10): EndeZustand {
  const front: FrontZustand = { vorrat, eigenerWert, frontY: frontYAusVorrat(vorrat) }
  return { ...endeStartZustand(front, truppenGroesse), bossVorrat }
}

/** Reiner Bilanzlauf: Randzuwachs und Strom, aber keine Szene oder Phaser-Objekte. */
function bilanziere(randProSek: number, torFaktor = 1, maxSekunden = 180): Readonly<{ ausgang: ReturnType<typeof ausgangFuer>, sekunden: number }> {
  let wert = endeStartZustand({ vorrat: BALANCE_V2.front.gegnerStartVorrat, eigenerWert: 10, frontY: frontYAusVorrat(BALANCE_V2.front.gegnerStartVorrat) })
  const schrittMs = 16
  for (let zeitMs = 0; zeitMs < maxSekunden * 1000; zeitMs += schrittMs) {
    const dtSek = schrittMs / 1000
    const truppe = wert.truppenGroesse + randProSek * dtSek
    const front = { ...wert.front, eigenerWert: wert.front.eigenerWert + figurenProSekunde(truppe) * torFaktor * dtSek }
    wert = aktualisiereEnde({ ...wert, truppenGroesse: truppe, front }, schrittMs)
    const ausgang = ausgangFuer(wert)
    if (ausgang) return { ausgang, sekunden: (zeitMs + schrittMs) / 1000 }
  }
  return { ausgang: ausgangFuer(wert), sekunden: maxSekunden }
}

describe('Run Gun V2 — S7 Boss und Spielende', () => {
  it('baut mit vorhandenem roten Vorrat nur die rote Flaeche ab', () => {
    const start = zustand(100, 20, 321)
    const ende = aktualisiereEnde(start, 1000)
    expect(ende.front.vorrat).toBeLessThan(start.front.vorrat)
    expect(ende.bossVorrat).toBe(321)
  })

  it('baut nach leerer Flaeche den Boss mit derselben eigenen Bilanzrate ab', () => {
    const start = zustand(0, 20, 100)
    const ende = aktualisiereEnde(start, 1000)
    expect(ende.front.vorrat).toBe(0)
    expect(ende.bossVorrat).toBeCloseTo(100 - 20 * BALANCE_V2.front.abbauProEigenerEinheitProSek, 8)
  })

  it('meldet Sieg bei Boss null und Niederlage bei Truppe null', () => {
    expect(ausgangFuer(zustand(0, 5, 0))).toBe('sieg')
    expect(ausgangFuer(zustand(10, 0, 50, 0))).toBe('niederlage')
    expect(ausgangFuer(zustand(10, 1, 50))).toBeUndefined()
  })

  it('gibt nach leerer Flaeche den roten Druck an die Truppe weiter und verliert dann', () => {
    const start = zustand(BALANCE_V2.front.gegnerStartVorrat, 0, 4000, 10)
    const getroffen = aktualisiereEnde(start, 1000)
    expect(getroffen.front.eigenerWert).toBe(0)
    expect(getroffen.truppenGroesse).toBeLessThan(start.truppenGroesse)
    expect(ausgangFuer({ ...getroffen, truppenGroesse: 0 })).toBe('niederlage')
  })

  it('haelt die drei N5-Bilanzfaelle ohne Phaser fest', () => {
    const ohneEingabe = bilanziere(0, 1, 50)
    const nurLinks = bilanziere(2.5)
    const rechtsMitTor = bilanziere(247.5, BALANCE_V2.tor.faktor)
    expect(ohneEingabe.ausgang).toBe('niederlage')
    expect(ohneEingabe.sekunden).toBeGreaterThanOrEqual(20)
    expect(ohneEingabe.sekunden).toBeLessThanOrEqual(40)
    expect(nurLinks.ausgang).toBe('sieg')
    expect(rechtsMitTor.ausgang).toBe('sieg')
    expect(rechtsMitTor.sekunden).toBeLessThan(nurLinks.sekunden)
  })

  it('loest denselben Ausgang ueber viele Bilder genau einmal aus', () => {
    const fertig = zustand(0, 5, 0)
    expect(ausgangEinmal(false, fertig)).toBe('sieg')
    expect(ausgangEinmal(true, fertig)).toBeUndefined()
    expect(ausgangEinmal(true, aktualisiereEnde(fertig, 16))).toBeUndefined()
  })

  it('ist bei 20 mal 16 und 10 mal 32 ms bildratenunabhaengig', () => {
    const start = zustand(0, 30, 500)
    const in16 = Array.from({ length: 20 }).reduce((wert) => aktualisiereEnde(wert, 16), start)
    const in32 = Array.from({ length: 10 }).reduce((wert) => aktualisiereEnde(wert, 32), start)
    expect(in16.bossVorrat).toBeCloseTo(in32.bossVorrat, 8)
    expect(in16.front.eigenerWert).toBeCloseTo(in32.front.eigenerWert, 8)
  })
})
