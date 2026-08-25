import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getWeaponUnlockPrice } from '../src/systems/save'
import { getWeaponRewardChoices } from '../src/systems/weaponChoices'
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
    // Erwartet ist der Istwert mal Faktor. Die Stufung, auf die clampStat rundet, gehoert
    // NICHT in diesen Test - er wuerde sonst bei jeder Aenderung daran anschlagen, ohne
    // dass die gepruefte Eigenschaft betroffen waere (2026-08-25 von einer Nachkommastelle
    // auf zwei geaendert, weil kleine Zugewinne sonst spurlos verschwanden).
    expect(stats.get('damage')).toBeCloseTo(2 * (1 + BALANCE.shop.damageBonusPerStep), 2)
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

describe('Dauerhaft gekaufte Waffen (Benni 2026-08-25)', () => {
  it('staffelt den Preis nach der gemessenen Staerke', () => {
    // "entsprechend teuer, damit er sie nicht sofort kaufen kann". Seit 2026-08-25 haengt
    // der Preis an den gemessenen Toetungen je Sekunde, nicht mehr an der Levelnummer -
    // die band ihn an die Reihenfolge statt an das, was die Waffe im Spiel leistet.
    // Jede Waffe ausser der Startwaffe braucht einen Preis; keine darf durchrutschen.
    const alle = (Object.keys(BALANCE.weapon) as (keyof typeof BALANCE.weapon)[])
      .filter((k) => typeof (BALANCE.weapon[k] as { minLevel?: number }).minLevel === 'number')
    for (const waffe of alle) {
      const preis = getWeaponUnlockPrice(waffe)
      if (waffe === 'pistol') { expect(preis, waffe).toBeUndefined(); continue }
      expect(preis, waffe).toBeGreaterThan(0)
    }
    // Die staerkste Waffe muss ein Vielfaches der schwaechsten kosten, sonst waere die
    // Reihenfolge der Anschaffung beliebig.
    const preise = alle.filter((k) => k !== 'pistol').map((k) => getWeaponUnlockPrice(k)!)
    expect(Math.max(...preise)).toBeGreaterThan(Math.min(...preise) * 5)
  })

  it('haelt Preis und gemessene Staerke in derselben Reihenfolge', () => {
    // Der Laden zeigt beides: den Preis auf der Kachel und die Staerke als Sterne in der
    // Detailansicht. Laufen sie auseinander, steht dort eine teure Waffe mit weniger
    // Sternen als eine billige - und der Spieler kann der Anzeige nicht mehr trauen.
    // killsPerSec ist der Messwert aus der Reihe, nach der auch die Staffelung sortiert
    // ist (Herleitung in balance.ts).
    const mitPreis = (Object.keys(BALANCE.weapon) as (keyof typeof BALANCE.weapon)[])
      .filter((k) => getWeaponUnlockPrice(k) !== undefined)
      .map((k) => ({
        waffe: k,
        preis: getWeaponUnlockPrice(k)!,
        staerke: (BALANCE.weapon[k] as { killsPerSec: number }).killsPerSec,
      }))
      .sort((a, b) => a.staerke - b.staerke)
    for (let i = 1; i < mitPreis.length; i += 1) {
      expect(mitPreis[i].preis, `${mitPreis[i].waffe} gegen ${mitPreis[i - 1].waffe}`)
        .toBeGreaterThanOrEqual(mitPreis[i - 1].preis)
    }
    // Und jede Waffe braucht einen Messwert - auch die Startwaffe, deren Sterne der
    // Laden ebenfalls anzeigt.
    for (const waffe of Object.keys(BALANCE.weapon) as (keyof typeof BALANCE.weapon)[]) {
      const eintrag = BALANCE.weapon[waffe] as { minLevel?: number; killsPerSec?: number }
      if (typeof eintrag.minLevel !== 'number') continue
      expect(eintrag.killsPerSec, String(waffe)).toBeGreaterThan(0)
    }
  })

  it('gibt der Startwaffe keinen Preis - es gibt nichts freizuschalten', () => {
    expect(getWeaponUnlockPrice('pistol')).toBeUndefined()
  })

  it('macht die teuerste Waffe erst nach mehreren guten Runs erreichbar', () => {
    // Gegengerechnet an dem, was ein Run aufs Konto bringt (nach E2): bis Level 20 rund
    // 12.600, bis Level 30 rund 32.600. Die teuerste Waffe darf nicht nach einem Run
    // dastehen - sonst waere Bennis "nicht sofort kaufen" verfehlt.
    //
    // NICHT AUF EINEN NAMEN FESTSCHREIBEN (2026-08-25): Der Test stand auf 'shockwave',
    // und als die Waffen nach gemessener Staerke neu gestaffelt wurden, war die teuerste
    // eine andere. Gepruerft gehoert die Eigenschaft, nicht die Waffe, die sie gerade hat.
    // Waffenliste aus BALANCE ableiten, nicht aus systems/weapons importieren: Das Modul
    // zieht Phaser mit, und in der Testumgebung gibt es kein window.
    // Auf Eintraege mit Freischaltlevel filtern: In BALANCE.weapon stehen neben den
    // Waffen auch Einstellwerte (rewardNewnessBias).
    const alle = (Object.keys(BALANCE.weapon) as (keyof typeof BALANCE.weapon)[])
      .filter((k) => typeof (BALANCE.weapon[k] as { minLevel?: number }).minLevel === 'number')
    const minLevelVon = (k: typeof alle[number]) => (BALANCE.weapon[k] as { minLevel: number }).minLevel
    const teuerste = alle.reduce((a, b) => (minLevelVon(a) >= minLevelVon(b) ? a : b))
    // Schwelle 2026-08-25 von 32.600 auf einen Run gesenkt: Seit eine gekaufte Waffe nur
    // EIN Level frueher erscheint statt ab Level 1, entscheidet der Kauf das Spiel nicht
    // mehr. Vorher musste der Preis das verhindern, was er ohnehin nur verzoegert haette.
    expect(getWeaponUnlockPrice(teuerste)!, teuerste).toBeGreaterThan(12600)
  })

  it('laesst eine gekaufte Waffe genau EIN Level frueher erscheinen', () => {
    // Thomas 2026-08-25: "immer schon ein Level vorher waehlbar als kleinen Bonus".
    //
    // Vorher galt eine gekaufte Waffe ab Level 1, und das macht den Aufbau kaputt:
    // Gemessen kommt mit der Streubombe auf Level 1, 5 und 12 KEIN Gegner mehr durch
    // (gegen 4,3 / 15,8 / 19,1 % mit der Pistole, Zielkorridor 4-12 %).
    const rakete = BALANCE.weapon.rocket.minLevel
    const bonus = BALANCE.weapon.ownedLevelBonus
    expect(getWeaponRewardChoices('pistol', 1, ['rocket'])).not.toContain('rocket')
    expect(getWeaponRewardChoices('pistol', rakete - bonus - 1, ['rocket'])).not.toContain('rocket')
    expect(getWeaponRewardChoices('pistol', rakete - bonus, ['rocket'])).toContain('rocket')
    // Ohne Kauf erst auf dem regulaeren Level.
    expect(getWeaponRewardChoices('pistol', rakete - 1)).not.toContain('rocket')
    expect(getWeaponRewardChoices('pistol', rakete)).toContain('rocket')
  })

  it('legt die gekaufte Waffe nicht in die Hand - das Tor bleibt', () => {
    // Gekauft wird die MOEGLICHKEIT. Die Waffe steht in der Auswahl, aus der das Wandtor
    // zieht; gefunden und zerschossen werden muss es weiterhin. Das ist der Grund,
    // warum eine gekaufte 1,45x-Waffe die fruehen Level nicht sofort entwertet.
    const abLevel = BALANCE.weapon.shockwave.minLevel - BALANCE.weapon.ownedLevelBonus
    const auswahl = getWeaponRewardChoices('pistol', abLevel, ['shockwave'])
    expect(auswahl).toContain('shockwave')
    // Die aktuell getragene Waffe ist nie in der Auswahl - sonst zeigte das Tor, was man hat.
    expect(auswahl).not.toContain('pistol')
  })
})
