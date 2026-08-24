import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { chooseEnemyType, getEnemyHp } from '../src/systems/enemyTypes'
import { getLevelPlan, getMaxSquadSize } from '../src/systems/levelPlan'
import { getStatCap } from '../src/systems/upgrades'
import { getCrowdDamageMultiplier } from '../src/systems/crowdDamage'

/**
 * Mittlere Grundlebenspunkte je Gegner aus der Typmischung, ohne Spielerkopplung.
 *
 * Das ist die Zahl, die den Modulo-Ruecksprung sofort gezeigt haette: Sie fiel von 8,54
 * auf Level 12 auf 2,24 auf Level 13. Gebildet wurde sie nirgends, deshalb blieb der
 * Sagezahn unbemerkt.
 */
function meanBaseHp(level: number): number {
  const gewichte = getLevelPlan(level).enemyWeights
  const summe = gewichte[0] + gewichte[1] + gewichte[2]
  return BALANCE.enemy.types.reduce(
    (wert, type, index) => wert + (gewichte[index] / summe) * getEnemyHp(type, level),
    0,
  )
}

describe('level plans', () => {
  it('provides the calm level-one plan and the dense level-twelve plan', () => {
    const levelOne = getLevelPlan(1)
    const levelTwelve = getLevelPlan(12)

    expect(levelOne).toMatchObject({ designLevel: 1, normalPhaseSec: 75 })
    expect(levelTwelve).toMatchObject({ designLevel: 12 })
    // Eigenschaft statt fester Zahlen: Die Gewichte sind am 2026-08-23 neu gesetzt
    // worden, als die wedge-Sonderregel in spawner.getSquadTypes entfiel (bis dahin
    // bestanden Keile immer nur aus leichten Gegnern, die Gewichte galten also gar
    // nicht fuer die Hordenmasse). Ein Test auf die exakten Zahlen haette diesen
    // Umbau nur blockiert, ohne etwas zu sichern.
    expect(levelOne.enemyWeights[0]).toBeGreaterThan(levelTwelve.enemyWeights[0])
    expect(levelOne.enemyWeights[2]).toBe(0)
    expect(levelTwelve.enemyWeights[2]).toBeGreaterThan(0)
    expect(levelTwelve.squadChance).toBeGreaterThan(levelOne.squadChance)
    // W3: Horden sind die Kernmechanik und existieren ab Level 1.
    expect(levelOne.squadChance).toBeGreaterThan(0)
    expect(levelOne.squads.length).toBeGreaterThan(0)
  })

  /**
   * DIESER TEST STAND BIS 2026-08-24 AUF DEM KOPF. Er hielt fest, dass Level 13 und 25
   * das Design von Level 1 wiederholen - also genau den Modulo-Ruecksprung, der die
   * Ursache fuer Bennis "zu leicht" war (Level 13 gerechnet siebenmal leichter als
   * Level 12). Ein Test, der einen Zustand abnickt, sichert nichts; er zementiert.
   * Gesichert gehoert die EIGENSCHAFT: Die Haerte faellt nie zurueck.
   */
  it('never falls back to an easier design above level twelve', () => {
    const letzterEntwurf = BALANCE.level.plans.length

    for (const level of [13, 16, 20, 25, 30, 50]) {
      expect(getLevelPlan(level).designLevel).toBe(letzterEntwurf)
    }

    // Der Sprung, der den ganzen Umbau ausgeloest hat: Level 13 muss HAERTER sein als 12.
    expect(meanBaseHp(13)).toBeGreaterThan(meanBaseHp(12))
    expect(getLevelPlan(13).hardness).toBeGreaterThan(getLevelPlan(12).hardness)
  })

  it('keeps every level at least as hard as the one before it', () => {
    // Die unabhaengige Schranke gegen den Sagezahn: Kein Level darf leichter sein als
    // sein Vorgaenger. Der alte Modulo haette hier bei Level 13 einen Absturz von 8,54
    // auf 2,24 mittlere Grundlebenspunkte gezeigt - genau der Fehlertyp, den zuvor
    // niemand bemerkt hat, weil die Zahl nirgends gebildet wurde.
    for (let level = 2; level <= 60; level += 1) {
      expect(meanBaseHp(level)).toBeGreaterThanOrEqual(meanBaseHp(level - 1))
      expect(getLevelPlan(level).hardness).toBeGreaterThanOrEqual(getLevelPlan(level - 1).hardness)
    }
  })

  it('leaves levels one to twelve untouched', () => {
    // Akzeptanzkriterium 5: Benni soll den Anfang wiedererkennen. Bis zum letzten
    // Tabelleneintrag ist designLevel die Levelnummer selbst, die Gewichte kommen
    // unveraendert aus der Tabelle, und keine Endlosgroesse greift.
    for (let level = 1; level <= BALANCE.level.plans.length; level += 1) {
      const plan = getLevelPlan(level)
      expect(plan.designLevel).toBe(level)
      expect(plan.enemyWeights).toEqual(BALANCE.level.plans[level - 1].enemyWeights)
      expect(getStatCap('damage', level)).toBeCloseTo(getStatCap('damage', Math.min(12, level)), 10)
    }
    // Der Endlosbereich beginnt AB Level 12, greift dort selbst aber noch nicht.
    expect(getEnemyHp(BALANCE.enemy.types[0], 12)).toBe(getEnemyHp(BALANCE.enemy.types[0], 1))
  })

  it('grows hardness, horde size and enemy toughness beyond level twelve', () => {
    // Akzeptanzkriterium 3: Kein Deckel wird stillschweigend erreicht.
    const zwoelf = getLevelPlan(12)
    const dreissig = getLevelPlan(30)

    expect(dreissig.hardness).toBeGreaterThan(zwoelf.hardness)
    expect(getMaxSquadSize(30)).toBeGreaterThan(
      Math.max(...zwoelf.squads.map((squad) => squad.size)),
    )
    // Die MITTLERE Zaehigkeit eines Gegners ist die Erlebnisgroesse - sie entsteht aus
    // Mischung UND Zaehigkeitszuwachs zusammen. Ein einzelner Typ taugt dafuer nicht:
    // Der Zuwachs betraegt 0,3 % je Level, und getEnemyHp RUNDET auf ganze Punkte. Der
    // leichte Gegner (2 Punkte) kommt bis Level 30 auf 2,11 und bleibt damit bei 2; er
    // springt erst um Level 87 auf 3, der Standardgegner um Level 62 auf 9. Im
    // Endlosbereich traegt deshalb die Mischung die Haerte, und der Zaehigkeitszuwachs
    // ist der Kanal fuer die sehr hohen Level.
    expect(meanBaseHp(30)).toBeGreaterThan(meanBaseHp(12))
    expect(getEnemyHp(BALANCE.enemy.types[2], 30)).toBeGreaterThan(getEnemyHp(BALANCE.enemy.types[2], 12))
    // Der Zuwachs selbst greift ueberall - nur die Rundung verdeckt ihn bei kleinen
    // Grundwerten. Ohne Rundung gemessen liegt er bei jedem Typ ueber 1.
    expect(BALANCE.enemy.endlessHpGrowthPerLevel).toBeGreaterThan(1)
    // Die Truppenreserve waechst mit, sonst zehrt der steigende Anteil schwerer Gegner
    // (contactDamage 2 statt 1) sie in wenigen Leveln auf.
    expect(getStatCap('hp', 30)).toBeGreaterThan(getStatCap('hp', 12))
  })

  it('grows firepower through exactly one factor', () => {
    // DIE ANTI-PRODUKT-REGEL. Feuerkraft ist das Produkt aus Schuetzenzahl,
    // Truppenbonus, Schaden und Rate. Der erste E1-Modelllauf legte den Endloszuwachs
    // auf drei dieser Faktoren gleichzeitig - er wirkte kubisch, und das Spiel wurde ab
    // Level 25 wieder LEICHTER als auf Level 20. Waechst hier je wieder eine zweite
    // Groesse mit, faellt es sofort auf.
    expect(getStatCap('shotsPerSec', 30)).toBe(getStatCap('shotsPerSec', 12))
    expect(getStatCap('shotsPerSec', 50)).toBe(getStatCap('shotsPerSec', 12))
    expect(getCrowdDamageMultiplier(1000, 30)).toBe(getCrowdDamageMultiplier(1000, 12))
    expect(getStatCap('damage', 30)).toBeGreaterThan(getStatCap('damage', 12))
  })

  it('shifts the mixture toward heavy enemies but stops at the cap', () => {
    const { maxHeavyWeight } = BALANCE.level.endless

    for (const level of [13, 20, 30, 60, 200]) {
      const [leicht, standard, schwer] = getLevelPlan(level).enemyWeights
      expect(schwer).toBeLessThanOrEqual(maxHeavyWeight)
      expect(leicht + standard + schwer).toBe(100)
      expect(leicht).toBeGreaterThanOrEqual(0)
      expect(standard).toBeGreaterThanOrEqual(0)
    }
    // Ohne diesen Deckel bestuende die Horde irgendwann nur aus schweren Gegnern - und
    // weil die drei Muenzen wert sind statt einer, wuerde die Muenzrate mitexplodieren.
    expect(getLevelPlan(200).enemyWeights[2]).toBe(maxHeavyWeight)
    expect(getLevelPlan(30).enemyWeights[2]).toBeGreaterThan(getLevelPlan(13).enemyWeights[2])
  })

  it('starts the endless range exactly where the level table ends', () => {
    // Zwei Groessen beschreiben dieselbe Grenze: die Laenge der Leveltabelle (bis dorthin
    // interpolieren getStatCap und getCrowdDamageMultiplier) und endless.fromLevel (ab
    // dort rechnet die Endloskurve). Laufen sie auseinander, entsteht eine stille Luecke
    // oder eine Doppelzaehlung - genau der Fehlertyp "zwei Systeme je fuer sich korrekt,
    // gemeinsam kaputt" aus docs/lessons.md.
    expect(BALANCE.level.endless.fromLevel).toBe(BALANCE.level.plans.length)
  })

  it('keeps bosses alone through level four, then ramps companion limits to four', () => {
    expect([1, 2, 3, 4].map((level) => getLevelPlan(level).companionLimit)).toEqual([0, 0, 0, 0])
    expect([5, 6, 7, 8, 9, 10, 11, 12].map((level) => getLevelPlan(level).companionLimit)).toEqual([1, 1, 2, 2, 3, 3, 4, 4])
  })

})
