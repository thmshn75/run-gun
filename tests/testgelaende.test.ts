import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getCrowdDamageMultiplier } from '../src/systems/crowdDamage'
import { getLevelPlan } from '../src/systems/levelPlan'
import { getMaxFightSec } from '../src/systems/bossPlan'

/**
 * DAS TESTGELAENDE (Benni ueber Thomas 2026-08-25: "ob es sowas wie ein testlevel geben
 * kann, wo man alle waffen einzeln ausprobieren kann").
 */
describe('Testgelaende', () => {
  it('laesst im Testgelaende keine Muenzen fallen', () => {
    // Thomas 2026-08-26: "im testgelaende verdient man keine Muenzen". Aufs Konto kamen
    // sie nie (der Waechter), aber der Zaehler lief hoch und versprach einen Verdienst.
    const quelle = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
    expect(quelle).toMatch(/private dropCoins\([^)]*\): void \{\s*\n(?:\s*\/\/[^\n]*\n)*\s*if \(this\.istTestgelaende\(\)\) return/)
  })

  it('schreibt NICHTS in den Spielstand - der Waechter steht an genau einer Stelle', () => {
    // DER TEUERSTE DENKBARE FEHLER waere, dass ein Ausprobieren Bennis echten Lauf
    // ueberschreibt. Die GameScene hat sechs Schreibwege in den Spielstand; sie laufen
    // alle ueber this.speichere(), und nur dort steht die Testgelaende-Sperre.
    //
    // Der Test liest den Quelltext, weil die Szene ohne Phaser nicht laufen kann - und
    // weil genau diese Art Regel sonst beim naechsten writeSave still gebrochen wird.
    const quelle = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
    const direkteAufrufe = quelle.split('\n')
      .map((zeile, index) => ({ zeile: zeile.trim(), nummer: index + 1 }))
      .filter(({ zeile }) => /(^|[^.\w])writeSave\(/.test(zeile))
    // Genau EINER ist erlaubt: der im Waechter selbst.
    expect(direkteAufrufe.map((e) => e.zeile)).toEqual(['writeSave(data)'])

    // Und der Waechter selbst muss die Sperre tragen.
    expect(quelle).toMatch(/private speichere\(data: SaveData\): void \{\s*\n\s*if \(this\.istTestgelaende\(\)\) return/)
  })

  it('stellt die Truppe auf einen Wert, ab dem nur noch die Waffe zaehlt', () => {
    // Der Schadensbonus aus der Truppengroesse ist gedeckelt. Steht die Testtruppe am
    // Deckel, aendert eine groessere Truppe nichts mehr - der Unterschied zwischen zwei
    // Waffen haengt dann NUR an der Waffe. Genau darum geht es im Testgelaende.
    const beiTest = getCrowdDamageMultiplier(BALANCE.testground.truppe, BALANCE.testground.level)
    const beiDoppelt = getCrowdDamageMultiplier(BALANCE.testground.truppe * 2, BALANCE.testground.level)
    expect(beiTest).toBe(beiDoppelt)
  })

  it('dauert hoechstens halb so lang wie ein normales Level - auch beim laengsten Bosskampf', () => {
    // Thomas 2026-08-26: "es darf nicht so lange dauern wie ein normales Level (maximal
    // die Haelfte) und es muss einen Boss geben".
    //
    // GEKUERZT WIRD NUR DIE GEGNERPHASE. Der Bosskampf bleibt unangetastet - ein
    // gekuerzter Bosskampf waere kein Bosstest mehr. Er ist damit die feste Groesse, und
    // die Rechnung muss fuer seine KUERZESTE und seine LAENGSTE Dauer aufgehen: Bei einem
    // langen Bosskampf faellt der Anteil des gekuerzten Teils, der Testlauf naehert sich
    // also dem normalen Level an. Wer nur mit der Mindestdauer rechnet, reisst die Grenze
    // genau dann, wenn der Kampf lange dauert.
    const level = BALANCE.testground.level
    const plan = getLevelPlan(level)
    const uebergaenge = (BALANCE.level.warningMs + BALANCE.level.clearedMs) / 1000
    const bossKurz = BALANCE.boss.referenceFirepower.minFightSec
    const bossLang = getMaxFightSec(level)
    for (const boss of [bossKurz, bossLang]) {
      const normal = plan.normalPhaseSec + uebergaenge + boss
      const test = BALANCE.testground.normalPhaseSec + uebergaenge + boss
      expect(test / normal, `Bosskampf ${boss} s`).toBeLessThanOrEqual(0.5)
    }
    // Und lang genug, um eine Waffe ueberhaupt zu beurteilen.
    expect(BALANCE.testground.normalPhaseSec).toBeGreaterThanOrEqual(15)
  })

  it('waehlt ein Level, auf dem sich zwei Waffen ueberhaupt unterscheiden', () => {
    // GEMESSEN am 2026-08-25: Auf Level 1 bis 9 raeumt jede Waffe weg, was ankommt - der
    // Gegnernachschub ist der Engpass, nicht die Feuerkraft (Flammenwerfer auf Level 9:
    // 220 Kills in 30 s, 0 % durchgekommen). Level 5 ist die Mitte: genug Betrieb, um
    // einen Unterschied zu sehen, wenig genug, um in Ruhe hinzuschauen.
    expect(BALANCE.testground.level).toBeGreaterThan(1)
    expect(BALANCE.testground.level).toBeLessThan(8)
  })
})
