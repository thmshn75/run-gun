import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getBossPlan } from '../src/systems/bossPlan'
import { getMaxShopSteps, getShopPrice, getStatCap, KEINE_STUFEN, RunStats } from '../src/systems/upgrades'

/**
 * Der Shop zwischen den Leveln (B2). Thomas hat sich bewusst dafuer entschieden, dass
 * die automatische Erhoehung je Level BLEIBT und der Kauf ein Bonus obendrauf ist. Die
 * Aufgabe dieser Tests ist deshalb nicht zu verhindern, dass es leichter wird, sondern
 * die Grenze festzuhalten, ab der das Endspiel seinen Druck verliert.
 */
describe('Shop', () => {
  it('wer nichts kauft, spielt exakt das bisherige Spiel', () => {
    for (let level = 1; level <= 12; level += 1) {
      expect(getStatCap('damage', level, KEINE_STUFEN)).toBeCloseTo(getStatCap('damage', level), 10)
      expect(getStatCap('hp', level, KEINE_STUFEN)).toBeCloseTo(getStatCap('hp', level), 10)
    }
    // Die Endpunkte der Levelkurve selbst sind unangetastet.
    expect(getStatCap('damage', 1)).toBeCloseTo(BALANCE.stats.damage.capAtLevelOne, 6)
    expect(getStatCap('damage', 12)).toBeCloseTo(BALANCE.stats.damage.capAtLevelTwelve, 6)
    expect(getStatCap('hp', 12)).toBeCloseTo(BALANCE.stats.hp.capAtLevelTwelve, 6)
  })

  it('voller Ausbau hebt die Feuerkraft um hoechstens 38 Prozent', () => {
    const stufen = getMaxShopSteps()
    const voll = { firepower: stufen, team: 0 }
    // Feuerkraft ist das PRODUKT aus Schaden und Rate - der Bonus auf beide wirkt also
    // multiplikativ. Genau hier hatte der Planentwurf sich verrechnet.
    const faktor = (getStatCap('damage', 12, voll) / getStatCap('damage', 12))
      * (getStatCap('shotsPerSec', 12, voll) / getStatCap('shotsPerSec', 12))
    expect(faktor).toBeGreaterThan(1.30)
    expect(faktor, 'Ueber 1,40 verliert Level 12 seinen Druck - siehe Herleitung in balance.ts')
      .toBeLessThanOrEqual(1.40)
  })

  it('voller Truppenausbau bleibt reine Reserve und darf deutlich groesser sein', () => {
    const voll = { firepower: 0, team: getMaxShopSteps() }
    const faktor = getStatCap('hp', 12, voll) / getStatCap('hp', 12)
    expect(faktor).toBeGreaterThan(2.0)
    // Er darf gross sein, WEIL daraus keine Feuerkraft entsteht: Der Schadensbonus der
    // Truppe ist bei crowd.max Figuren ausgereizt.
    expect(BALANCE.shop.teamBonusPerStep).toBeGreaterThan(BALANCE.shop.damageBonusPerStep)
  })

  it('Gegnertempo bekommt keinen Bonus - es ist kein Spielerwert', () => {
    const voll = { firepower: getMaxShopSteps(), team: getMaxShopSteps() }
    expect(getStatCap('speed', 8, voll)).toBeCloseTo(getStatCap('speed', 8), 10)
  })

  it('Boss-Haerte haengt an der Levelnummer, nicht am Kaufverhalten', () => {
    // bossPlan liest die Deckel ueber getStatCap(stat, level) - OHNE Stufen. Genau darin
    // besteht der Vorteil, den man kauft: Der Boss zieht nicht mit.
    //
    // Belegt wird das hier zweifach: Der Bonus veraendert den Deckel wirklich (sonst
    // liefe der Test leer), und der Boss bleibt davon unberuehrt.
    const voll = { firepower: getMaxShopSteps(), team: getMaxShopSteps() }
    expect(getStatCap('damage', 8, voll)).toBeGreaterThan(getStatCap('damage', 8))

    // Gleiche Spielerwerte, gleicher Boss - unabhaengig davon, wie sie zustande kamen.
    const plan = getBossPlan(8, 60, 'normal', 4, 6)
    const quelle = readFileSync(new URL('../src/systems/bossPlan.ts', import.meta.url), 'utf8')
    // Die Regel steht in der Aufrufform: kein dritter Parameter an getStatCap.
    const aufrufe = quelle.match(/getStatCap\([^)]*\)/g) ?? []
    expect(aufrufe.length).toBeGreaterThan(0)
    for (const aufruf of aufrufe) {
      expect(aufruf.split(',').length, `bossPlan darf getStatCap ohne Stufen aufrufen: ${aufruf}`).toBe(2)
    }
    expect(plan.maxHp).toBeGreaterThan(0)
  })

  it('ein Kauf hebt Deckel und aktuellen Wert zugleich', () => {
    const stats = new RunStats()
    stats.setLevel(6)
    stats.set('damage', 999)   // auf den Deckel klemmen
    const vorher = stats.get('damage')
    stats.addStep('firepower')
    expect(stats.get('damage')).toBeGreaterThan(vorher)
    expect(stats.getStepCount('firepower')).toBe(1)
  })

  it('spaetestens jeder zweite Kauf bewegt die angezeigte Zahl', () => {
    // Schaden wird auf eine Nachkommastelle gerundet. Ob ein einzelner Kauf die Anzeige
    // bewegt, haengt davon ab, wo der Wert gerade zur Rundungsgrenze steht - das ist
    // Eigenschaft der Anzeige, nicht des Bonus. Zwei Kaeufe muessen aber IMMER sichtbar
    // sein, sonst wirkt der Knopf fuer ein Kind kaputt. (Der Fortschritt selbst ist im
    // Shop ohnehin als "Stufe x/11" abzulesen.)
    for (const level of [1, 4, 6, 8, 10, 12]) {
      const stats = new RunStats()
      stats.setLevel(level)
      stats.set('damage', Number.MAX_SAFE_INTEGER)
      const vorher = stats.get('damage')
      stats.addStep('firepower')
      stats.addStep('firepower')
      expect(stats.get('damage'), `Level ${level}: zwei Kaeufe bewegen die Anzeige nicht`)
        .toBeGreaterThan(vorher)
    }
  })

  it('wer noch nicht am Deckel steht, bekommt nichts geschenkt', () => {
    const stats = new RunStats()
    stats.setLevel(8)
    stats.set('damage', 2)
    stats.addStep('firepower')
    // Faktor auf den Istwert, nicht Sprung auf den Deckel.
    expect(stats.get('damage')).toBeLessThan(getStatCap('damage', 8, { firepower: 1, team: 0 }))
    // Erwartet ist der Istwert mal Faktor, gerundet auf eine Nachkommastelle.
    const erwartet = Math.round(2 * (1 + BALANCE.shop.damageBonusPerStep) * 10) / 10
    expect(stats.get('damage')).toBe(erwartet)
  })

  it('mehr Stufen als die Preisliste lang ist gibt es nicht', () => {
    const stats = new RunStats()
    for (let i = 0; i < getMaxShopSteps(); i += 1) expect(stats.addStep('team')).toBe(true)
    expect(stats.addStep('team')).toBe(false)
    expect(getShopPrice(getMaxShopSteps())).toBeUndefined()
  })

  it('laesst einen Run bis Level 12 acht bis zehn Stufen kaufen, nicht alle', () => {
    // E2, Thomas 2026-08-24: "durchaus so, dass man zwei Level spielen muss, um sich ein
    // Upgrade zu kaufen". Vorher deckten die Preise drei Viertel der Einnahmen und man
    // kaufte fast alles - DIESER Test hielt genau das fest und musste mitgezogen werden.
    //
    // Gesichert gehoert jetzt die Eigenschaft "wenige, wichtige Entscheidungen": Ein
    // normal gespielter Run bis Level 12 erlaubt einen Teil der 22 Stufen, nicht alle
    // und nicht bloss zwei. Simuliert wird mit der Regel, die ein Spieler naheliegend
    // anwendet - immer die guenstigste leistbare Stufe.
    const einnahmeBisLevelZwoelf = 10454
    let firepower = 0
    let team = 0
    let ausgegeben = 0
    for (;;) {
      const kandidaten = [getShopPrice(firepower), getShopPrice(team)]
        .filter((preis): preis is number => preis !== undefined)
      const guenstigste = Math.min(...kandidaten)
      if (kandidaten.length === 0 || ausgegeben + guenstigste > einnahmeBisLevelZwoelf) break
      if (getShopPrice(firepower) === guenstigste) firepower += 1
      else team += 1
      ausgegeben += guenstigste
    }
    const stufen = firepower + team
    expect(stufen).toBeGreaterThanOrEqual(8)
    expect(stufen).toBeLessThanOrEqual(10)
    // Nicht alles: Sonst waere die Entscheidung wieder weg.
    expect(stufen).toBeLessThan(2 * getMaxShopSteps())

    // Die Preise muessen mit der Stufe steigen, sonst ist die spaete Stufe geschenkt.
    for (let i = 1; i < BALANCE.shop.prices.length; i += 1) {
      expect(BALANCE.shop.prices[i]).toBeGreaterThan(BALANCE.shop.prices[i - 1])
    }
  })

  it('macht eine Stufe rund zwei Level teuer', () => {
    // Die woertliche Vorgabe. Level 1 bringt 423 Muenzen, die erste Stufe kostet mehr -
    // man kann sie also fruehestens nach dem zweiten Level kaufen.
    const einnahmeLevelEins = 423
    expect(BALANCE.shop.prices[0]).toBeGreaterThan(einnahmeLevelEins)
    expect(BALANCE.shop.prices[0]).toBeLessThan(einnahmeLevelEins * 3)
  })

  it('haelt das Weiterspielen erreichbar, wenn man nicht alles verkauft bekommt', () => {
    // Bis 2026-08-24 rechnete dieser Test mit dem VOLLEN Ausbau beider Linien und
    // pruefte, dass danach noch ein Weiterspielen drin ist. Seit E2 ist der volle Ausbau
    // in einem Run gar nicht mehr bezahlbar - das ist der Zweck der Preiserhoehung, und
    // der Test hielt die alte Welt fest.
    //
    // Die Eigenschaft, die bleibt: Der Weiterspiel-Knopf darf nicht unerreichbar werden.
    // Wer sich beim Kaufen zurueckhaelt, kommt an ihn heran.
    const einnahmenGanzerRun = 10454
    const preisAufLevelZwoelf = BALANCE.continueRun.pricePerLevel * 12
    const dreiStufenJeLinie = 2 * BALANCE.shop.prices.slice(0, 3).reduce((a, b) => a + b, 0)
    expect(einnahmenGanzerRun - dreiStufenJeLinie).toBeGreaterThan(preisAufLevelZwoelf)
  })
})

describe('Dauerhafte Aufwertungen (E4, 2026-08-24)', () => {
  const meta = (firepower: number, team: number) => ({ firepower, team })

  it('wirkt je Linie auf genau EINE Groesse', () => {
    // Feuerkraft ist das Produkt aus Schuetzenzahl, Truppenbonus, Schaden und Rate. Ein
    // Meta-Bonus auf mehrere dieser Faktoren wirkt multiplikativ - derselbe Fehler wie
    // beim Endloswachstum, der dort erst im Modell auffiel.
    const voll = meta(BALANCE.meta.prices.length, 0)
    expect(getStatCap('damage', 12, KEINE_STUFEN, voll)).toBeGreaterThan(getStatCap('damage', 12))
    expect(getStatCap('shotsPerSec', 12, KEINE_STUFEN, voll)).toBe(getStatCap('shotsPerSec', 12))
    // Und umgekehrt: MANNSCHAFT laesst die Feuerkraft in Ruhe.
    const vollTeam = meta(0, BALANCE.meta.prices.length)
    expect(getStatCap('hp', 12, KEINE_STUFEN, vollTeam)).toBeGreaterThan(getStatCap('hp', 12))
    expect(getStatCap('damage', 12, KEINE_STUFEN, vollTeam)).toBe(getStatCap('damage', 12))
  })

  it('deckelt Run-Shop und Meta GEMEINSAM auf der Feuerkraft', () => {
    // Der Zielkonflikt aus dem V4-Plan: Zwei multiplikative Quellen auf derselben
    // Groesse. Der Test haelt den Deckel gegen die Einzelwerte, damit eine spaetere
    // Aenderung an einer der beiden ihn nicht still ueberschreitet.
    const beideVoll = { firepower: getMaxShopSteps(), team: getMaxShopSteps() }
    const metaVoll = meta(BALANCE.meta.prices.length, BALANCE.meta.prices.length)
    const faktor = getStatCap('damage', 12, beideVoll, metaVoll) / getStatCap('damage', 12)
    expect(faktor).toBeLessThanOrEqual(BALANCE.meta.totalBoostCap + 0.001)
  })

  it('deckelt die TRUPPE nicht - sie ist Ueberlebenszeit, keine Feuerkraft', () => {
    // Ein erster Anlauf legte den Deckel auf alle Werte. Ein bestehender Test hat das
    // gefangen: Der volle Truppenausbau bringt Faktor 2,33 und darf das, weil ihr
    // Schadensbonus bei crowd.max Figuren ausgereizt ist.
    const beideVoll = { firepower: 0, team: getMaxShopSteps() }
    const metaVoll = meta(0, BALANCE.meta.prices.length)
    const faktor = getStatCap('hp', 12, beideVoll, metaVoll) / getStatCap('hp', 12)
    expect(faktor).toBeGreaterThan(BALANCE.meta.totalBoostCap)
  })

  it('laesst das Spiel ohne gekaufte Stufen exakt wie vorher', () => {
    // Akzeptanzkriterium aus dem Plan: Ohne Meta-Kaeufe ist nichts anders.
    for (const level of [1, 6, 12, 20, 30]) {
      for (const stat of ['hp', 'damage', 'shotsPerSec'] as const) {
        expect(getStatCap(stat, level, KEINE_STUFEN, meta(0, 0))).toBe(getStatCap(stat, level))
      }
    }
  })

  it('staffelt die Preise steigend und macht die erste Stufe teuer', () => {
    const preise = BALANCE.meta.prices
    for (let i = 1; i < preise.length; i += 1) expect(preise[i]).toBeGreaterThan(preise[i - 1])
    // "muss halt sehr teuer sein" (Benni): Die erste Stufe kostet mehr als ein ganzer
    // Run bis Level 12 einbringt - sie wird aus dem Endlosbereich bezahlt.
    expect(preise[0]).toBeGreaterThan(5000)
  })
})
