import { describe, expect, it } from 'vitest'
import { BALANCE_V2 } from '../src/v2/balanceV2'
import { stromLaufdauerSek } from '../src/v2/strom'
import { durchquertTor, torStartZustand } from '../src/v2/tor'

describe('Run Gun V2 — S6 das feste Tor', () => {
  it('zaehlt vor der Freischaltung je Figur herunter, ohne zu multiplizieren oder unter null zu fallen', () => {
    let tor = torStartZustand()
    for (let treffer = 0; treffer < BALANCE_V2.tor.freischaltTreffer; treffer += 1) {
      const durchgang = durchquertTor({ torPassiert: false }, tor)
      expect(durchgang.anzahl).toBe(1)
      tor = durchgang.tor
    }
    expect(tor.restlicheTreffer).toBe(0)
    expect(durchquertTor({ torPassiert: false }, tor).tor.restlicheTreffer).toBe(0)
  })

  it('macht nach der Freischaltung aus einer Figur genau den Torfaktor', () => {
    const frei = { restlicheTreffer: 0 }
    expect(durchquertTor({ torPassiert: false }, frei).anzahl).toBe(BALANCE_V2.tor.faktor)
  })

  it('vervielfacht und zaehlt dieselbe Figur trotz mehrerer Bilder auf Torhoehe nur einmal', () => {
    const frei = { restlicheTreffer: 0 }
    const erst = durchquertTor({ torPassiert: false }, frei)
    const nochDa = durchquertTor(erst.figur, erst.tor)
    expect(erst.anzahl).toBe(BALANCE_V2.tor.faktor)
    expect(nochDa.anzahl).toBe(1)
    expect(nochDa.tor).toEqual(erst.tor)
  })

  it('haelt den vervielfachten Maximalstrom waehrend der ganzen Laufdauer im Vorrat', () => {
    const gebraucht = Math.ceil(
      BALANCE_V2.strom.maximaleRateProSek * BALANCE_V2.tor.faktor * stromLaufdauerSek(),
    )
    expect(BALANCE_V2.strom.vorratGroesse).toBeGreaterThanOrEqual(gebraucht)
  })
})
