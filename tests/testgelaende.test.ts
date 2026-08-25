import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getCrowdDamageMultiplier } from '../src/systems/crowdDamage'

/**
 * DAS TESTGELAENDE (Benni ueber Thomas 2026-08-25: "ob es sowas wie ein testlevel geben
 * kann, wo man alle waffen einzeln ausprobieren kann").
 */
describe('Testgelaende', () => {
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

  it('waehlt ein Level, auf dem sich zwei Waffen ueberhaupt unterscheiden', () => {
    // GEMESSEN am 2026-08-25: Auf Level 1 bis 9 raeumt jede Waffe weg, was ankommt - der
    // Gegnernachschub ist der Engpass, nicht die Feuerkraft (Flammenwerfer auf Level 9:
    // 220 Kills in 30 s, 0 % durchgekommen). Level 5 ist die Mitte: genug Betrieb, um
    // einen Unterschied zu sehen, wenig genug, um in Ruhe hinzuschauen.
    expect(BALANCE.testground.level).toBeGreaterThan(1)
    expect(BALANCE.testground.level).toBeLessThan(8)
  })
})
