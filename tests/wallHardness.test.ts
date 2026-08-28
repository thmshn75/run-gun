import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getWallPlan } from '../src/systems/wallPlan'

type WeaponKey = keyof typeof BALANCE.weapon
const WEAPONS = ['normal', 'shotgun', 'laser', 'rocket', 'minigun', 'flamethrower', 'chainlightning'] as const

// Nagelt Thomas' zwei Befunde vom 2026-08-22 fest: "immer noch schwer was zu holen"
// und "speziell in weiteren Level, die Zahlen steigen zu schnell an".
describe('Wandhaerte', () => {
  it('kostet nie mehr als den Fokus-Deckel — in keinem Level, mit keiner Waffe', () => {
    // Der Deckel ist das Versprechen an den Spieler. Rundung auf ganze HP darf ihn nur
    // minimal ueberschreiten, und nur dort, wo die HP-Zahl einstellig ist.
    //
    // TOLERANZ EINE GANZE HP statt einer halben (2026-08-26): maxHp hat eine Untergrenze
    // von 1, und seit der Deckel gegen die WANDWIRKUNG statt gegen die Truppenfeuerkraft
    // rechnet (wallHitShare), wiegt diese eine HP bei einer Figur mehr als der Deckel
    // selbst. Kleiner als eine HP kann eine Kachel nicht werden.
    for (const level of [1, 2, 4, 6, 8, 10, 12]) {
      for (const team of [1, 2, 4, 8, 16, BALANCE.crowd.max]) {
        for (const weapon of WEAPONS) {
          const plan = getWallPlan(level, team, weapon as WeaponKey, 1, 3)
          // Rundung auf ganze HP verschiebt die Fokuszeit um bis zu einer halben HP.
          const rundung = 1 / plan.referenceDps
          expect(plan.focusSec, `L${level} team${team} ${weapon}`)
            .toBeLessThanOrEqual(BALANCE.wallHardness.maxFocusSec + rundung + 1e-9)
        }
      }
    }
  })

  it('macht eine staerkere Waffe die Wand schneller weg, nie haerter', () => {
    // Das alte Modell koppelte die HP an die Waffe: Truppe 8 sprang von 17 (normal) auf
    // 71 (Schrot) — wer aufhob, machte sich das Leben schwerer. Jetzt darf die Zahl
    // zwischen Waffen nur noch leicht schwanken, und mehr Feuerkraft muss KUERZER dauern.
    const level = 3
    const team = 8
    const plaene = WEAPONS.map((weapon) => ({ weapon, ...getWallPlan(level, team, weapon as WeaponKey, 1, 3) }))
    const hps = plaene.map((p) => p.maxHp)
    expect(Math.max(...hps) / Math.min(...hps)).toBeLessThan(5)

    const schwach = plaene.find((p) => p.weapon === 'normal')!
    const stark = plaene.find((p) => p.weapon === 'shotgun')!
    expect(stark.referenceDps).toBeGreaterThan(schwach.referenceDps)
    expect(stark.focusSec).toBeLessThan(schwach.focusSec)
  })

  it('belohnt eine groessere Truppe mit kuerzerer Fokuszeit', () => {
    // Im alten Modell blieb die Fokusdauer bei 0,70 s, egal wie stark die Truppe war —
    // Aufruesten war gegen Waende folgenlos. Die Daempfung muss das umdrehen.
    const klein = getWallPlan(3, 2, 'normal', 1, 3)
    const gross = getWallPlan(3, 16, 'normal', 1, 3)
    expect(gross.referenceDps).toBeGreaterThan(klein.referenceDps)
    expect(gross.focusSec).toBeLessThan(klein.focusSec)
    expect(gross.maxHp).toBeGreaterThan(klein.maxHp) // die Zahl waechst trotzdem sichtbar
  })

  it('haelt die Zahl auch im Vollausbau dreistellig statt vierstellig', () => {
    // Altes Modell: 1482 HP auf der Kachel. Der Boden minFocusSec setzt die neue Groesse.
    const plan = getWallPlan(12, BALANCE.crowd.max, 'shotgun', BALANCE.stats.damage.capAtLevelTwelve, BALANCE.stats.shotsPerSec.capAtLevelTwelve)
    expect(plan.maxHp).toBeLessThan(1000)
    expect(plan.focusSec).toBeGreaterThanOrEqual(BALANCE.wallHardness.minFocusSec - 0.5 / plan.referenceDps - 1e-9)
  })

  it('waechst mit dem Level, solange der Deckel nicht greift', () => {
    const stark = { team: 20, weapon: 'normal' as WeaponKey, dmg: 2, rate: 4 }
    const l1 = getWallPlan(1, stark.team, stark.weapon, stark.dmg, stark.rate)
    const l8 = getWallPlan(8, stark.team, stark.weapon, stark.dmg, stark.rate)
    expect(l8.maxHp).toBeGreaterThan(l1.maxHp)
  })

  it('faengt einen schwachen Run in hohen Leveln ab', () => {
    // Startteam in Level 12 darf nicht in einer Sackgasse landen.
    const plan = getWallPlan(12, BALANCE.stats.hp.base, 'normal', 1, 3)
    expect(plan.focusSec).toBeLessThanOrEqual(BALANCE.wallHardness.maxFocusSec + 1 / plan.referenceDps + 1e-9)
  })

  it('haelt einen 3er-Wandabschnitt innerhalb der Bildschirmzeit', () => {
    // Ein Abschnitt ist wallRunLength Segmente tief; er muss abraeumbar sein, bevor er
    // vorbeigezogen ist (Horizont bis unten bei scrollSpeed).
    const bildschirmSec = (844 - BALANCE.road.horizonY) / BALANCE.scrollSpeed
    const schlimmster = BALANCE.wallHardness.maxFocusSec * BALANCE.walls.wallRunLength
    expect(schlimmster).toBeLessThan(bildschirmSec)
  })
})

/**
 * WAS AN EINER KACHEL ANKOMMT (2026-08-26).
 *
 * Thomas: "ab level 13, 14 usw. werden die waende rechts fast nicht mehr erwerbbar, weil
 * die zahlen so hoch sind, dass man sie nicht wegschiessen kann - es wird halt immer
 * schlimmer je hoeher die level, richtig schlimm ab level 22 und aufwaerts".
 */
describe('Wandhaerte gegen die WIRKLICHE Feuerkraft', () => {
  // Gemessen im Browser (Level 13, Truppe 40, Schaden 5, Rate 6, Truppe an der Wand
  // gehalten): An einer Kachel kommen rund 170 Schaden je Sekunde an - bei vier Waffen,
  // deren geplante Feuerkraft um Faktor 3,5 auseinanderliegt.
  const GEMESSENE_WANDWIRKUNG = 170

  it('haelt die Zusage "nie mehr als maxFocusSec" auch auf hohen Leveln', () => {
    // DAS WAR DER FEHLER: maxFocusSec wurde gegen die volle Truppenfeuerkraft gerechnet,
    // die an einer schmalen Kachel am Bildrand nie ankommt. Eine Kachel kostete real
    // 0,87 s auf Level 13 und 3,4 s ab Level 25 - bei einem Abschnitt aus DREI Kacheln
    // und 6,0 s, die er ueberhaupt im Bild ist.
    for (const level of [13, 16, 20, 22, 25, 30]) {
      const plan = getWallPlan(level, 40, 'normal', 5, 6)
      const echteSekunden = plan.maxHp / GEMESSENE_WANDWIRKUNG
      expect(echteSekunden, `Level ${level}: ${plan.maxHp} HP`)
        .toBeLessThanOrEqual(BALANCE.wallHardness.maxFocusSec * 1.15)
    }
  })

  it('laesst einen ganzen Abschnitt in der Zeit schaffen, in der er sichtbar ist', () => {
    // Ein Abschnitt ist wallRunLength Kacheln lang. Sichtbar ist er, solange er durchs
    // Bild laeuft: (Bildhoehe + Abschnittshoehe) / Scrolltempo. Beim Tempo-Deckel von
    // 175 px/s sind das rund 6,0 s - und die gelten ab Level 12 fuer JEDES Level.
    const sichtbarSek = (844 + BALANCE.walls.wallRunLength * BALANCE.walls.segmentHeightPx)
      / BALANCE.levelSpeed.maxPxPerSec
    for (const level of [13, 22, 30]) {
      const plan = getWallPlan(level, 40, 'normal', 5, 6)
      const abschnittSek = (BALANCE.walls.wallRunLength * plan.maxHp) / GEMESSENE_WANDWIRKUNG
      // Die Haelfte der Sichtbarkeit ist die Grenze: Man muss nebenher noch Gegner
      // abwehren, und wer die vollen 6 s nur auf die Wand haelt, verliert die Truppe.
      expect(abschnittSek, `Level ${level}`).toBeLessThan(sichtbarSek * 0.6)
    }
  })

  it('macht die Wand ab dem Levelmaximum nicht weiter haerter', () => {
    // "Es wird immer schlimmer je hoeher die Level" - genau das darf nicht mehr sein.
    // Ab dem Punkt, an dem der Deckel greift, ist die Kachel auf jedem Level gleich hart.
    const bei22 = getWallPlan(22, 40, 'normal', 5, 6).maxHp
    const bei30 = getWallPlan(30, 40, 'normal', 5, 6).maxHp
    expect(bei30).toBe(bei22)
  })
})
