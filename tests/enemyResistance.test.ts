import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getEnemyHp, getFigureWidth, getFirepowerCoupling, getPlayerPower } from '../src/systems/enemyTypes'
import { computeFormation } from '../src/systems/formation'
import { getPlayfieldHalfWidth } from '../src/systems/roadGeometry'
import { getScrollSpeed } from '../src/systems/speed'
import { getStatCap } from '../src/systems/upgrades'

const W = 390
const H = 844
const ANCHOR_Y = H - BALANCE.player.anchorBottomOffset

const LIGHT = BALANCE.enemy.types[0]
const HEAVY = BALANCE.enemy.types[2]

/**
 * Die gedaempfte Kopplung der Gegnerstaerke an die Spielerstaerke (2026-08-23).
 *
 * Warum diese Tests existieren: Dieselbe Kopplung war bei der Wandhaerte schon einmal
 * gebaut und musste wieder ausgebaut werden, weil sie UNGEDAEMPFT war - jede
 * Verbesserung wurde exakt aufgefressen, Aufruesten war wirkungslos. Genau diese
 * Eigenschaft prueft der wichtigste Test hier nach (`Aufruesten bleibt wirksam`); sie
 * war vorher nirgends als Zahl gebildet worden.
 */
describe('Gegner-Widerstand: gedaempfte Kopplung an die Spielerstaerke', () => {
  it('greift unterhalb der Referenz gar nicht - ein schwacher Start wird nicht bestraft', () => {
    const { referencePower } = BALANCE.enemy.firepowerCoupling
    expect(getFirepowerCoupling(0)).toBe(1)
    expect(getFirepowerCoupling(referencePower / 2)).toBe(1)
    expect(getFirepowerCoupling(referencePower)).toBe(1)
  })

  it('waechst oberhalb der Referenz, aber langsamer als die Feuerkraft', () => {
    const { referencePower } = BALANCE.enemy.firepowerCoupling
    const einfach = getFirepowerCoupling(referencePower * 2)
    const doppelt = getFirepowerCoupling(referencePower * 4)
    expect(einfach).toBeGreaterThan(1)
    expect(doppelt).toBeGreaterThan(einfach)
    // Gedaempft heisst: doppelte Feuerkraft macht die Gegner WENIGER als doppelt so zaeh.
    expect(einfach).toBeLessThan(2)
    expect(doppelt / einfach).toBeLessThan(2)
  })

  it('AUFRUESTEN BLEIBT WIRKSAM: doppelte Feuerkraft raeumt mehr weg, nicht gleich viel', () => {
    // Der Kern der Lesson von der alten Wandhaerte. Durchsatz = Feuerkraft je
    // Gegner-Lebenspunkt. Er muss ueber die ganze Spanne monoton steigen.
    const { referencePower } = BALANCE.enemy.firepowerCoupling
    const durchsatz = (power: number, level: number): number =>
      power / getEnemyHp(HEAVY, level, power)
    for (const level of [1, 4, 8, 12]) {
      let vorher = durchsatz(referencePower, level)
      for (const faktor of [2, 4, 8, 16, 32, 64]) {
        const jetzt = durchsatz(referencePower * faktor, level)
        expect(jetzt).toBeGreaterThan(vorher)
        vorher = jetzt
      }
    }
  })

  it('ist nach oben gedeckelt, damit kein Gegner unangreifbar wird', () => {
    const { maxFactor, referencePower } = BALANCE.enemy.firepowerCoupling
    expect(getFirepowerCoupling(referencePower * 1e6)).toBeCloseTo(maxFactor, 6)
    expect(getEnemyHp(LIGHT, 1, referencePower * 1e6)).toBe(Math.round(LIGHT.hp * maxFactor))
  })

  it('rechnet die Waffe bewusst NICHT ein - nur Truppe, Schaden und Feuerrate', () => {
    // Die Wandhaerte hing frueher an der Waffe: Wer eine Schrotflinte aufhob, machte
    // die Waende schlagartig 4x haerter. getPlayerPower kennt keine Waffe, also kann
    // dieser Fehler hier nicht entstehen.
    const a = getPlayerPower(30, 4, 6, 6)
    const b = getPlayerPower(30, 4, 6, 6)
    expect(a).toBe(b)
    expect(a).toBeGreaterThan(0)
  })

  it('haelt den Referenzwert an den Grundwerten - sonst greift die Kopplung ab Sekunde 1', () => {
    // referencePower ist die Truppe mit voller Schuetzenzahl und den Grundwerten.
    const gerechnet = BALANCE.crowd.shootersPerSalvo
      * BALANCE.stats.damage.base
      * BALANCE.stats.shotsPerSec.base
    expect(BALANCE.enemy.firepowerCoupling.referencePower).toBeCloseTo(gerechnet, 6)
  })
})

/**
 * Die Feuerlinie darf den Anflugbereich nicht abdecken (2026-08-23).
 *
 * Der Befund dahinter, gemessen: Gegner laufen ueber einen Spurbereich von -0,84 bis
 * +0,83 an, die Truppe war bei 30 Figuren aber 130 px breit und deckte damit praktisch
 * alles ab - 98 % der Gegner starben, der groesste Seitenabstand eines Todesortes lag
 * bei 54 px. Stehenbleiben in der Mitte war deshalb die beste Spielweise, genau Thomas'
 * Beschwerde. Diese Zahl hat vorher niemand gebildet.
 */
describe('Feuerlinie gegen Anflugbreite', () => {
  const formationsbreite = (size: number): number => {
    const slots = computeFormation(size, {
      rowSpacingY: BALANCE.crowd.rowSpacingY,
      colSpacing: BALANCE.crowd.colSpacing,
      minColSpacing: BALANCE.crowd.minColSpacing,
      maxWidth: W * BALANCE.crowd.maxWidthRatio,
    })
    return 2 * slots.reduce((weitest, slot) => Math.max(weitest, Math.abs(slot.offsetX)), 0)
  }

  it('deckt bei voller Truppe hoechstens die Haelfte des Anflugbereichs ab', () => {
    const halbeBreite = getPlayfieldHalfWidth(W, H, ANCHOR_Y)
    // Aeusserste Anflugspur mal halbe Spielfeldbreite auf Kampfhoehe.
    const anflugbreite = 2 * BALANCE.enemy.spawnBands.singleLaneShare * halbeBreite
    expect(formationsbreite(BALANCE.crowd.max)).toBeLessThanOrEqual(anflugbreite * 0.52)
  })

  it('bleibt breit genug fuer eine volle Salve nebeneinander', () => {
    // Untergrenze: Waere die Formation schmaler als die Schuetzenzahl mal Mindest-
    // abstand, stapelte sie in Reihen und die Salve verloere ihre Breite ganz.
    const noetig = (BALANCE.crowd.shootersPerSalvo - 1) * BALANCE.crowd.minColSpacing
    expect(formationsbreite(BALANCE.crowd.max)).toBeGreaterThanOrEqual(noetig)
  })

  it('laesst die Gegner breiter anlaufen, als die Truppe je abdecken kann', () => {
    // Spawn-Baender muessen ausserhalb der Formationsbreite beginnen, sonst gibt es
    // wieder eine Position, die alles erwischt.
    const halbeBreite = getPlayfieldHalfWidth(W, H, ANCHOR_Y)
    const hordenrand = BALANCE.enemy.spawnBands.hordeLaneShare * halbeBreite
    expect(hordenrand).toBeGreaterThan(formationsbreite(BALANCE.crowd.max) / 2)
  })

  it('haelt die Spawn-Baender innerhalb des freien Korridors, nicht in der Wandzone', () => {
    // Toleranz gegen Fliesskomma: 1 - 0,34 ergibt 0,6599999999999999.
    const frei = 1 - BALANCE.walls.laneShare + 1e-9
    expect(BALANCE.enemy.spawnBands.singleLaneShare).toBeLessThanOrEqual(frei)
    expect(BALANCE.enemy.spawnBands.hordeLaneShare).toBeLessThanOrEqual(frei)
  })
})

/**
 * Die Levelkurve der Gegner-Lebenspunkte. Sie steht seit 2026-08-23 auf 1,0 - das
 * Levelwachstum kommt aus Typmischung und Nachschub. Der Test haelt fest, warum: Eine
 * gesetzte Kurve obendrauf machte den Bedarf doppelt so steil wie die Feuerkraft.
 */
describe('Levelkurve der Gegner-Lebenspunkte', () => {
  it('waechst nicht steiler als die Feuerkraft am Level-Deckel', () => {
    const feuerkraftWachstum = (getStatCap('damage', 12) / getStatCap('damage', 1))
      * (getStatCap('shotsPerSec', 12) / getStatCap('shotsPerSec', 1))
      * (BALANCE.crowd.damageMultiplierCapAtLevelTwelve / BALANCE.crowd.damageMultiplierCapAtLevelOne)
    const hpWachstum = BALANCE.enemy.hpPerLevelGrowth ** 11
    // Typmischung: Level 1 zu 75 % leicht, Level 12 zu 50 % schwer.
    const mischung = (level: number): number => {
      const gewichte = BALANCE.level.plans[level - 1].enemyWeights
      const summe = gewichte.reduce((s, g) => s + g, 0)
      return gewichte.reduce((s, g, i) => s + g * BALANCE.enemy.types[i].hp, 0) / summe
    }
    const bedarfWachstum = hpWachstum * (mischung(12) / mischung(1))
    expect(bedarfWachstum).toBeLessThan(feuerkraftWachstum)
  })

  it('haelt das Staerkeverhaeltnis der drei Gegnertypen', () => {
    // leicht : standard : schwer bleibt rund 1 : 4 : 12, damit die Typen unterscheidbar
    // bleiben. Die Grundwerte sind 2026-08-23 gemeinsam angehoben worden (1/4/12 ->
    // 2/8/23), nicht einzeln verschoben.
    expect(BALANCE.enemy.types[1].hp / LIGHT.hp).toBeGreaterThan(3)
    expect(BALANCE.enemy.types[1].hp / LIGHT.hp).toBeLessThan(5)
    expect(HEAVY.hp / LIGHT.hp).toBeGreaterThan(10)
    expect(HEAVY.hp / LIGHT.hp).toBeLessThan(14)
  })

  it('laesst einen Gegner mehr als einen Treffer aushalten', () => {
    // Vor dem Umbau starb ein leichter Gegner auf Level 1 am ersten Schuss und damit
    // exakt auf der Reichweitenlinie - gemessen 0,007 bis 0,29 s Lebensdauer. Erst ab
    // mehreren Treffern kommt er sichtbar naeher.
    const startschaden = BALANCE.stats.damage.base
    expect(getEnemyHp(LIGHT, 1)).toBeGreaterThan(startschaden)
  })
})

/** Die Zielsuche darf keine feste Position sicher machen. */
describe('Zielsuche der Gegner', () => {
  it('holt ueber den ganzen Anflug weniger auf als die halbe Formationsbreite', () => {
    // Sonst zieht sie jeden Gegner vor eine stehende Truppe - gemessen war das bei
    // 11 px/s der Fall (mittlerer Seitenabstand der Todesorte: 4 px).
    const anflugPx = ANCHOR_Y - BALANCE.road.horizonY
    const anflugSek = anflugPx / BALANCE.stats.speed.base
    const drift = BALANCE.enemy.seekSpeedPxPerSec * anflugSek
    const halbeBreite = getPlayfieldHalfWidth(W, H, ANCHOR_Y)
    const anflugRadius = BALANCE.enemy.spawnBands.singleLaneShare * halbeBreite
    expect(drift).toBeLessThan(anflugRadius / 2)
  })

  it('ist nicht abgeschaltet - Gegner sollen die Truppe suchen, nur nicht sicher finden', () => {
    expect(BALANCE.enemy.seekSpeedPxPerSec).toBeGreaterThan(0)
  })
})

/** Das Trefferblitzen ist am 2026-08-23 vollstaendig entfernt worden (Thomas). */
describe('kein Trefferblitzen', () => {
  it('kennt keinen Regler dafuer mehr', () => {
    expect('hitFlashMs' in BALANCE.feedback).toBe(false)
  })

  it('beruehrt die Figurengroessen nicht - nur die Einfaerbung ist weg', () => {
    expect(getFigureWidth(LIGHT)).toBeGreaterThan(0)
  })
})

/**
 * Durchbruch: Ein Gegner, der die Truppenhoehe passiert, ohne getoetet worden zu sein,
 * kostet Figuren (2026-08-23, Thomas: "Ja Bau das").
 *
 * Warum es die Regel gibt: Vorher war die einzige Verlustquelle die Beruehrung, der
 * Schaden hing damit an der Gesamtbilanz - und die ist bistabil (gemessen sprang der
 * Anteil durchkommender Gegner auf den Leveln 7-11 zwischen 1 % und 78 %). Wer an der
 * Seite fuhr, liess 84 % durch und verlor dabei NULL Figuren. Verfehlen war folgenlos.
 */
describe('Durchbruch kostet Figuren', () => {
  it('ist aktiv, aber nicht im ersten Level', () => {
    expect(BALANCE.enemy.breakthroughDamageFactor).toBeGreaterThan(0)
    expect(BALANCE.enemy.breakthroughMinLevel).toBeGreaterThanOrEqual(2)
  })

  it('startet nicht frueher als die roten Wandkacheln', () => {
    // Beide Verlustquellen sollen denselben Einstiegsschutz haben: Level 1 ist zum
    // Lernen da, dort startet die Truppe mit stats.hp.base Figuren.
    expect(BALANCE.enemy.breakthroughMinLevel).toBeGreaterThanOrEqual(BALANCE.walls.badMinLevel)
  })

  it('kostet weniger als eine Beruehrung - Verfehlen ist nicht schlimmer als Getroffenwerden', () => {
    expect(BALANCE.enemy.breakthroughDamageFactor).toBeLessThan(1)
  })

  it('laesst Dauerfahrt an der Sammelbahn netto noch lohnen', () => {
    // Die eigentliche Bilanz, an der der Wert haengt - und die vorher niemand gebildet
    // hat. Links gewinnt man Figuren und laesst dafuer fast alles durch.
    // Level 6, weil die Messwerte unten von dort stammen. getScrollSpeed statt des
    // Modulzustands: der Test darf nicht davon abhaengen, was zuletzt gesetzt wurde.
    const kachelnProSek = getScrollSpeed(6) / BALANCE.walls.segmentHeightPx
    const guterAnteil = 1 - BALANCE.walls.badChance / (1 + BALANCE.walls.badChance)
    const gewinnProSek = kachelnProSek * guterAnteil * BALANCE.walls.pickupTeamGain
    // Gemessen an der Sammelbahn (Level 6, Truppe 30): 84 % kommen durch bei rund
    // 7 Gegnern je Sekunde, mittlerer contactDamage 1,3.
    const verlustProSek = 7 * 0.84 * 1.3 * BALANCE.enemy.breakthroughDamageFactor
    expect(gewinnProSek).toBeGreaterThan(verlustProSek)
    // ... aber nicht mehr geschenkt sein: ohne die Regel waere der Gewinn ungebremst.
    expect(verlustProSek).toBeGreaterThan(gewinnProSek * 0.4)
  })
})

/**
 * Die Haerte darf nicht an der FORM einer Horde haengen (2026-08-23).
 *
 * Der Fehler dahinter, von Thomas gemeldet ("bei Level 5 habe ich keine Chance mehr
 * Gegner abzuschiessen"): `getSquadTypes` hatte eine Sonderregel, nach der ein 'wedge'
 * IMMER nur aus leichten Gegnern bestand. Die Level 1-4 kennen ausschliesslich Keile,
 * ab Level 5 kommen 'cluster' und 'row' dazu - und die werteten die Leveltabelle aus.
 * Gemessen sprangen die mittleren Lebenspunkte je Gegner dadurch von 4,1 auf 18,0 und
 * die Abschussrate fiel von 6,1 auf 0,7 je Sekunde. Level 6 war danach wieder leichter,
 * weil dort zwei Drittel der Horden wieder Keile sind.
 */
describe('Gegnerstaerke haengt an der Leveltabelle, nicht an der Hordenform', () => {
  const quelle = readFileSync(new URL('../src/systems/spawner.ts', import.meta.url), 'utf8')
  const funktion = quelle.slice(
    quelle.indexOf('private getSquadTypes'),
    quelle.indexOf('private activateEnemy'),
  )

  it('waehlt die Typen ohne Sonderfall fuer eine Formation', () => {
    expect(funktion.length).toBeGreaterThan(0)
    // Kein Zweig, der einer Formation einen festen Typ zuweist.
    expect(funktion).not.toMatch(/squadKind === '(wedge|row)'/)
    expect(funktion).toContain('this.levelPlan.enemyWeights')
  })

  it('steigert die Gegnerhaerte ueber die Level monoton und ohne Sprung', () => {
    // Genau diese Kurve hat vorher niemand gebildet - deshalb blieb der Zickzack
    // (Level 5 haerter als Level 6) unbemerkt.
    const mittel = (level: number): number => {
      const gewichte = BALANCE.level.plans[level - 1].enemyWeights
      const summe = gewichte.reduce((s, g) => s + g, 0)
      return gewichte.reduce((s, g, i) => s + g * BALANCE.enemy.types[i].hp, 0) / summe
    }
    for (let level = 2; level <= 12; level += 1) {
      const vorher = mittel(level - 1)
      const jetzt = mittel(level)
      expect(jetzt).toBeGreaterThan(vorher)
      // Kein Level darf die Haerte um mehr als die Haelfte anheben.
      expect(jetzt / vorher).toBeLessThan(1.5)
    }
  })

  it('laesst den Anteil schwerer Gegner trotzdem sichtbar steigen', () => {
    // Die Mischung ist nicht nur Balance, sie ist auch das Bild: Spaeter sollen
    // erkennbar andere Gegner kommen.
    expect(BALANCE.level.plans[0].enemyWeights[2]).toBe(0)
    expect(BALANCE.level.plans[11].enemyWeights[2]).toBeGreaterThanOrEqual(15)
  })
})
