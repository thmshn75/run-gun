import { describe, expect, it } from 'vitest'
import { BALANCE_V2 } from '../src/v2/balanceV2'
import { frontStartZustand, mitAnkunft } from '../src/v2/front'
import { figurenProSekunde } from '../src/v2/strom'
import { aktualisiereEnde, ausgangFuer, endeStartZustand } from '../src/v2/ende'
import { haufenHalbeBreite, haufenPlaetze, sammeltLinks, truppeGrenzen } from '../src/v2/truppe'

/**
 * Spielt eine Spielweise ueber die echten Bilanzfunktionen durch, ohne Phaser.
 *
 * `sammeltSek` ist die Zeit, die der Spieler am Anfang links Truppen aufnimmt -
 * in dieser Zeit schickt er niemanden los. `waende` ist die Zahl der Waende, die
 * er danach rechts abtraegt, bevor er den Strom an die Front laufen laesst.
 */
function spiele(sammeltSek: number, waende: number) {
  const bildMs = 1000 / 60
  const schilderProSek = (BALANCE_V2.raender.grundTempoPxProSek + BALANCE_V2.raender.zuschlagGanzLinksPxProSek)
    / BALANCE_V2.raender.abstandPx
  let truppe = BALANCE_V2.truppe.startGroesse
  let front = frontStartZustand()
  let ende = endeStartZustand(front, truppe)
  let torFaktor = BALANCE_V2.tor.startFaktor
  let offeneWaende = waende
  let wandRest = BALANCE_V2.wand.startRest

  for (let bild = 0; bild < 60 * 300; bild += 1) {
    const sekunden = bild / 60
    const sammelt = sekunden < sammeltSek
    if (sammelt) truppe += schilderProSek / 60
    const rate = sammelt ? 0 : figurenProSekunde(truppe) / 60
    if (!sammelt && offeneWaende > 0) {
      // Die Figuren schlagen in die Wand ein und kommen nicht an der Front an.
      wandRest -= rate * BALANCE_V2.wand.abbauJeStromfigur
      if (wandRest <= 0) {
        offeneWaende -= 1
        wandRest = BALANCE_V2.wand.startRest
        torFaktor += BALANCE_V2.tor.zuwachsJeWand
      }
    } else if (!sammelt) {
      front = mitAnkunft(front, rate * torFaktor)
    }
    ende = aktualisiereEnde({ ...ende, front, truppenGroesse: truppe }, bildMs)
    front = ende.front
    // Zurueckgelesen werden muss auch die Truppe: Der Boss raeumt sie ab, sobald
    // er ganz vorn steht. Ohne diese Zeile endet im Modell nie ein Spiel.
    truppe = ende.truppenGroesse
    const ausgang = ausgangFuer(ende)
    if (ausgang) return { ausgang, sekunden, restGegner: front.vorrat }
  }
  return { ausgang: 'offen' as const, sekunden: 300, restGegner: front.vorrat }
}

describe('Run Gun V2 — die Balance geht nur knapp auf', () => {
  it('laesst den Boss die ganze Strecke bis zur Truppe laufen', () => {
    const weg = BALANCE_V2.ende.bossMaxAbstiegPx
    const bisZurTruppe = 844 - BALANCE_V2.truppe.abstandVonUntenPx - BALANCE_V2.track.horizonY
    expect(weg).toBeGreaterThanOrEqual(bisZurTruppe * 0.95)
  })

  it('laesst den passiven Spieler deutlich verlieren', () => {
    const e = spiele(0, 0)
    expect(e.ausgang).toBe('niederlage')
    // Deutlich heisst: mehr als die Haelfte der Gegner steht noch.
    expect(e.restGegner).toBeGreaterThan(BALANCE_V2.front.gegnerStartVorrat / 2)
  })

  it('laesst kurzes und mittleres Sammeln scheitern', () => {
    // Bis hierhin liefert die Truppe weniger Figuren je Sekunde, als der Boss
    // wegraeumt - er kommt durch und nimmt sich die Truppe.
    expect(spiele(5, 0).ausgang).toBe('niederlage')
    expect(spiele(10, 0).ausgang).toBe('niederlage')
  })

  it('laesst langes Sammeln gerade noch reichen', () => {
    // Die Grenze liegt zwischen 10 und 15 Sekunden Sammeln: Ab da reicht der
    // Zustrom, um die Horde aufzureiben, bevor sie die Truppe erreicht.
    expect(spiele(10, 0).ausgang).toBe('niederlage')
    expect(spiele(15, 0).ausgang).toBe('sieg')
    expect(spiele(20, 0).ausgang).toBe('sieg')
  })

  it('laesst die Horde allein marschieren und den Boss erst danach kommen', () => {
    // Abschnitt 1 gehoert der Horde: Sie braucht rund 63 s bis zur Truppe.
    const hordeDauer = BALANCE_V2.front.hordeMaxVorstossPx / BALANCE_V2.front.hordeTempoPxProSek
    expect(hordeDauer).toBeGreaterThan(50)
    expect(hordeDauer).toBeLessThan(80)
    // Wer nichts tut, verliert genau an dieser Uhr - nicht am Boss.
    const passiv = spiele(0, 0)
    expect(passiv.ausgang).toBe('niederlage')
    expect(passiv.sekunden).toBeCloseTo(hordeDauer, 0)
  })

  it('deckelt die eigene Flaeche, damit sie nicht ins Uferlose waechst', () => {
    // Ohne Deckel wuchs sie weiter, sobald die Horde aufgerieben war und
    // niemand sie mehr verbrauchte - gemessen bis ueber 2000 Einheiten.
    let front = frontStartZustand()
    for (let bild = 0; bild < 60 * 120; bild += 1) front = mitAnkunft(front, 2)
    expect(front.eigenerWert).toBeLessThanOrEqual(BALANCE_V2.front.eigenerWertMax)
  })

  it('macht eine einzige abgebaute Wand zum Unterschied zwischen Sieg und Niederlage', () => {
    // Bei gleichem Sammeleinsatz entscheidet allein der Torfaktor.
    expect(spiele(10, 0).ausgang).toBe('niederlage')
    expect(spiele(10, 1).ausgang).toBe('sieg')
  })

  it('haelt jedes Spiel in einer spielbaren Laenge', () => {
    for (const [sammeln, waende] of [[0, 0], [10, 0], [20, 0], [10, 1], [10, 2]] as const) {
      const e = spiele(sammeln, waende)
      expect(e.sekunden).toBeGreaterThan(20)
      // Gemessen dauern alle Spielweisen 41 bis 63 Sekunden.
      expect(e.sekunden).toBeLessThan(80)
    }
  })

  it('belohnt mehr Einsatz mit einem frueheren Sieg, ohne ihn zu verschenken', () => {
    const eineWand = spiele(10, 1)
    const zweiWaende = spiele(10, 2)
    expect(eineWand.ausgang).toBe('sieg')
    expect(zweiWaende.ausgang).toBe('sieg')
    expect(zweiWaende.sekunden).toBeLessThan(eineWand.sekunden)
  })
})

describe('Run Gun V2 — N18 Sammeln, Traube und Boss', () => {
  it('loest die Sammelpause aus, sobald der Haufen die linke Reihe erreicht', () => {
    // Der Fehler zuvor: Gemessen wurde am Mittelpunkt des Haufens. Der ist rund
    // 58 px von seinem Rand entfernt und kann die Fahrbahnkante nie erreichen -
    // die Pause loeste deshalb nie aus.
    const plaetze = haufenPlaetze(50)
    const halbeBreite = haufenHalbeBreite(plaetze.length, 19)
    const grenzen = truppeGrenzen(390, 844, halbeBreite)
    const truppeY = 844 - BALANCE_V2.truppe.abstandVonUntenPx
    expect(sammeltLinks(390, 844, grenzen.minX, truppeY, halbeBreite)).toBe(true)
    expect(sammeltLinks(390, 844, 195, truppeY, halbeBreite)).toBe(false)
  })

  it('packt die Truppe als dichte Traube', () => {
    const plaetze = haufenPlaetze(50)
    const halbeBreite = haufenHalbeBreite(plaetze.length, 19)
    expect(halbeBreite).toBeLessThan(46)
    // Die Haelfte der Figuren sitzt im inneren Drittel des Radius - das ist der
    // Unterschied zwischen einer Traube und einer gleichmaessigen Streuung.
    const radien = plaetze.map((p) => Math.hypot(p.dx, p.dy)).sort((a, b) => a - b)
    expect(radien[Math.floor(radien.length / 2)]).toBeLessThan(BALANCE_V2.truppe.haufenRadiusMaxPx * 0.75)
  })
})
