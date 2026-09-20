import { describe, expect, it } from 'vitest'
import { BALANCE_V2, bahnKanten, bahnKantenBeiY, bahnKantenPunkte, fahrbahnKantenBeiY, gehsteigMitteBeiY, horizontFarbe, tiefenSkala, wasserWellenOffset } from '../src/v2/balanceV2'
import { readFileSync } from 'node:fs'
import { aktualisiereFront, frontStartZustand, mitAnkunft } from '../src/v2/front'
import { figurenProSekunde } from '../src/v2/strom'

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
    // Mit dem absichtlich schmaleren Vorderende bleibt die Kurve klar sichtbar,
    // ohne die beidseitig nötigen Wasserstreifen wieder zu verschlucken.
    expect((oben.rightX - oben.leftX + unten.rightX - unten.leftX) / 2 - (mitte.rightX - mitte.leftX)).toBeGreaterThan(breite * 0.04)
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

  it('laesst an der Unterkante beidseits mindestens 25 px durchgehendes Wasser', () => {
    const kanten = bahnKanten(390, 844)
    expect(kanten.bottomLeftX).toBeGreaterThan(25)
    expect(390 - kanten.bottomRightX).toBeGreaterThan(25)
  })

  it('bewegt Wellen periodisch allein aus der Zeit', () => {
    const periode = Math.PI * 2 / BALANCE_V2.track.wasserWellenTempoRadProSek
    expect(wasserWellenOffset(1.25, 3)).toBe(wasserWellenOffset(1.25, 3))
    expect(wasserWellenOffset(1.25 + periode, 3)).toBeCloseTo(wasserWellenOffset(1.25, 3), 10)
  })

  it('verbindet den Horizont exakt mit Himmel und Wasser', () => {
    const anzahl = BALANCE_V2.track.horizonVerlaufBaender
    expect(horizontFarbe(0, anzahl)).toBe(BALANCE_V2.colors.sky)
    expect(horizontFarbe(anzahl - 1, anzahl)).toBe(BALANCE_V2.colors.water)
  })

  it('beschriftet die rechte Wand mit ihrem Restwert und nennt kein Wort dazu', () => {
    const source = readFileSync(new URL('../src/v2/RunGunV2Scene.ts', import.meta.url), 'utf8')
    expect(source).toContain("schild.seite === 'links' ? '+1' : String(Math.ceil(bild.rest))")
    // Die Staerke-Anzeige ist mit der Staerke-Mechanik entfallen.
    expect(source).not.toContain('STÄRKE ${')
  })

  it('legt Gehsteige zwischen Mauer und schmalerer Fahrbahn an und setzt Schilder mittig darauf', () => {
    const y = 700
    const aussen = bahnKantenBeiY(390, 844, y)
    const fahrbahn = fahrbahnKantenBeiY(390, 844, y)
    expect(fahrbahn.leftX).toBeGreaterThan(aussen.leftX)
    expect(fahrbahn.rightX).toBeLessThan(aussen.rightX)
    expect(gehsteigMitteBeiY('links', 390, 844, y)).toBeCloseTo((aussen.leftX + fahrbahn.leftX) / 2, 8)
  })

  it('bezieht jede V2-Zeichenebene aus der Ebenentabelle', () => {
    const source = readFileSync(new URL('../src/v2/RunGunV2Scene.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/setDepth\(\s*\d/)
    expect(source).toContain('BALANCE_V2.ebenen.massen')
  })

  // Die Balance-Prueffaelle stehen seit N17 vollstaendig in v2Balance.test.ts:
  // Sie rechnen mit der Sammelpause, die dieses vereinfachte Modell nicht kannte.

  it('legt Gehsteige zwischen Mauer und schmalerer Fahrbahn an und setzt Schilder mittig darauf', () => {
    const y = 700
    const aussen = bahnKantenBeiY(390, 844, y)
    const fahrbahn = fahrbahnKantenBeiY(390, 844, y)
    expect(fahrbahn.leftX).toBeGreaterThan(aussen.leftX)
    expect(fahrbahn.rightX).toBeLessThan(aussen.rightX)
    expect(gehsteigMitteBeiY('links', 390, 844, y)).toBeCloseTo((aussen.leftX + fahrbahn.leftX) / 2, 8)
  })

  it('bezieht jede V2-Zeichenebene aus der Ebenentabelle', () => {
    const source = readFileSync(new URL('../src/v2/RunGunV2Scene.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/setDepth\(\s*\d/)
    expect(source).toContain('BALANCE_V2.ebenen.massen')
  })

  // Die Balance-Prueffaelle stehen seit N17 vollstaendig in v2Balance.test.ts:
  // Sie rechnen mit der Sammelpause, die dieses vereinfachte Modell nicht kannte.

})

describe('Run Gun V2 — N16 Flaechen ohne Verdrehung', () => {
  it('kehrt eine flache Koordinatenliste paarweise um, nicht elementweise', () => {
    // Der Fehler, der dreimal als "blaue Keile in der Bruecke" und "rechts kein
    // Wasser" gemeldet wurde: [x0,y0,x1,y1].reverse() ergibt [y1,x1,y0,x0] und
    // vertauscht damit x und y jedes Punktes.
    const source = readFileSync(new URL('../src/v2/RunGunV2Scene.ts', import.meta.url), 'utf8')
    expect(source).toContain('function rueckwaerts(')
    // Keine Flaeche darf ihre Gegenkante noch mit einem nackten reverse() zurueckfuehren.
    expect(source).not.toMatch(/\.\.\.\[\.\.\.\w*Kante\]\.reverse\(\)/)
  })
})
