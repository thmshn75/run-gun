import { describe, expect, it } from 'vitest'
import { BALANCE_V2 } from '../src/v2/balanceV2'
import { stromLaufdauerSek } from '../src/v2/strom'
import { durchquertTor, mitWandBelohnung, torStartZustand } from '../src/v2/tor'

describe('Run Gun V2 — S6 das mitwachsende Tor', () => {
  it('beginnt bei x1 und vervielfacht damit noch nichts', () => {
    const tor = torStartZustand()
    expect(tor.faktor).toBe(1)
    expect(durchquertTor({ torPassiert: false }, tor).anzahl).toBe(1)
  })

  it('hebt den Faktor mit jeder abgebauten Wand um den festgelegten Zuwachs', () => {
    let tor = torStartZustand()
    tor = mitWandBelohnung(tor)
    expect(tor.faktor).toBe(1 + BALANCE_V2.tor.zuwachsJeWand)
    tor = mitWandBelohnung(tor)
    expect(tor.faktor).toBe(1 + 2 * BALANCE_V2.tor.zuwachsJeWand)
  })

  it('verliert bei einem halben Faktor keine Figur durch Abrunden', () => {
    // Der Prueffall zum teuersten Fehler des Projekts: Bei Faktor 1,5 muessen aus
    // zehn Figuren fuenfzehn werden - nicht zehn, weil jede einzeln abgerundet wird.
    let tor = mitWandBelohnung(torStartZustand())
    expect(tor.faktor).toBe(1.5)
    let summe = 0
    for (let figur = 0; figur < 10; figur += 1) {
      const durchgang = durchquertTor({ torPassiert: false }, tor)
      summe += durchgang.anzahl
      tor = durchgang.tor
    }
    expect(summe).toBe(15)
  })

  it('vervielfacht und zaehlt dieselbe Figur trotz mehrerer Bilder auf Torhoehe nur einmal', () => {
    const tor = mitWandBelohnung(mitWandBelohnung(torStartZustand()))
    const erst = durchquertTor({ torPassiert: false }, tor)
    const nochDa = durchquertTor(erst.figur, erst.tor)
    expect(erst.anzahl).toBe(2)
    expect(nochDa.anzahl).toBe(1)
    expect(nochDa.tor).toEqual(erst.tor)
  })

  it('haelt den vervielfachten Maximalstrom waehrend der ganzen Laufdauer im Vorrat', () => {
    // Gerechnet wird mit dem Faktor, den vier abgebaute Waende ergeben - mehr ist
    // im Zeitfenster bis zum Boss nicht zu schaffen.
    const hoechsterFaktor = 1 + 4 * BALANCE_V2.tor.zuwachsJeWand
    const gebraucht = Math.ceil(
      BALANCE_V2.strom.maximaleRateProSek * hoechsterFaktor * stromLaufdauerSek(),
    )
    expect(BALANCE_V2.strom.vorratGroesse).toBeGreaterThanOrEqual(gebraucht)
  })
})
