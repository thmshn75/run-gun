import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getEnemyHp, getStufenHaerte } from '../src/systems/enemyTypes'
import { getBossPlan, getMaxFightSec } from '../src/systems/bossPlan'

const LEICHT = BALANCE.enemy.types[0]
const SCHWER = BALANCE.enemy.types[2]

/**
 * STUFENHAERTE ALLE FUENF LEVEL (Thomas 2026-08-30: "die normalen gegener alle 5 level
 * um 20% schwerer machen (auch endgegener)").
 *
 * Warum diese Tests existieren: Der Aufschlag greift an drei Stellen, die leicht
 * auseinanderlaufen - Gegner-Lebenspunkte, Boss-Lebenspunkte und das Zeitfenster des
 * Bosskampfs. Beim Boss ist der Fehler, der hier abgefangen wird, im Projekt schon
 * einmal passiert: Ein Aufschlag INNERHALB eines Deckels ist wirkungslos (die
 * Feuerkraft-Tore am 2026-08-28 hoben Werte, die laengst am Maximum standen).
 */
describe('Stufenhaerte: alle fuenf Level 20 Prozent zaeher', () => {
  it('ist eine Treppe, keine Kurve - der Sprung liegt genau am Levelwechsel', () => {
    for (const level of [1, 2, 3, 4, 5]) expect(getStufenHaerte(level)).toBe(1)
    for (const level of [6, 7, 8, 9, 10]) expect(getStufenHaerte(level)).toBeCloseTo(1.2, 10)
    // Die weiteren Stufen aus den Reglern gerechnet, nicht als abgeschriebene Zahl: Wer
    // stepDecay aendert, soll den Test nicht erst reparieren muessen, um zu sehen, dass
    // die Treppe noch eine ist.
    const { firstStep, stepDecay } = BALANCE.enemy.stufenHaerte
    expect(getStufenHaerte(11)).toBeCloseTo((1 + firstStep) * (1 + firstStep * stepDecay), 10)
    expect(getStufenHaerte(16)).toBeCloseTo(
      (1 + firstStep) * (1 + firstStep * stepDecay) * (1 + firstStep * stepDecay ** 2), 10)
  })

  it('flacht nach oben ab und laeuft in einen Grenzwert unter dem gemessenen Kipppunkt', () => {
    // DER GRUND, warum die Treppe nicht gleichmaessig steigt: Mit 20 % je Stufe kippte
    // Level 20 gemessen von 0,2 auf 43,9 % Durchkommensanteil (Faktor 1,73). Gehalten hat
    // noch Faktor 1,44. Der Grenzwert muss also unter 1,73 bleiben, und zwar fuer JEDES
    // Level - auch Level 200. Genau das prueft dieser Test.
    for (let level = 2; level <= 400; level += 1) {
      expect(getStufenHaerte(level)).toBeGreaterThanOrEqual(getStufenHaerte(level - 1))
      expect(getStufenHaerte(level), `L${level}`).toBeLessThan(1.5)
    }
    // Die Stufen werden kleiner, nicht groesser.
    const stufe1 = getStufenHaerte(6) / getStufenHaerte(5)
    const stufe2 = getStufenHaerte(11) / getStufenHaerte(10)
    const stufe4 = getStufenHaerte(21) / getStufenHaerte(20)
    expect(stufe1).toBeGreaterThan(stufe2)
    expect(stufe2).toBeGreaterThan(stufe4)
    expect(stufe1 - 1).toBeCloseTo(BALANCE.enemy.stufenHaerte.firstStep, 10)
  })

  it('macht normale Gegner an jeder Stufengrenze um den vollen Faktor zaeher', () => {
    // Der schwere Gegner (23 Grundpunkte) zeigt es ohne Rundungsverlust; beim leichten
    // (2 Punkte) frisst die Rundung auf ganze Punkte einen Teil des Sprungs.
    const { everyLevels } = BALANCE.enemy.stufenHaerte
    for (const grenze of [6, 11, 16, 21]) {
      const davor = getEnemyHp(SCHWER, grenze - 1)
      const danach = getEnemyHp(SCHWER, grenze)
      const erwartet = getStufenHaerte(grenze) / getStufenHaerte(grenze - 1)
      // getEnemyHp rundet auf ganze Punkte; bei 23 Grundpunkten kostet das bis zu einen
      // halben Punkt nach jeder Seite. Die Schranke laesst genau diese Rundung zu.
      expect(danach / davor, `L${grenze}`).toBeGreaterThan(erwartet - 1 / davor)
      expect(grenze % everyLevels).toBe(1)
    }
    // DER LEICHTE GEGNER MACHT DIE ERSTE STUFE NICHT MIT, und das ist Rundung, kein
    // Fehler: 2 Grundpunkte x 1,2 = 2,4 rundet zurueck auf 2. Er springt erst auf der
    // zweiten Stufe (2 x 1,44 = 2,88 -> 3). Auf den Leveln 6 bis 10 traegt den Aufschlag
    // deshalb nur der Standard- (8 -> 10) und der schwere Gegner (23 -> 28).
    expect(getEnemyHp(LEICHT, 6)).toBe(getEnemyHp(LEICHT, 5))
    expect(getEnemyHp(LEICHT, 11)).toBeGreaterThan(getEnemyHp(LEICHT, 5))
  })

  it('laesst die Zaehigkeit innerhalb einer Stufe unveraendert - unterhalb des Endlosbereichs', () => {
    for (const level of [2, 3, 4, 5]) expect(getEnemyHp(SCHWER, level)).toBe(getEnemyHp(SCHWER, 1))
    for (const level of [7, 8, 9, 10]) expect(getEnemyHp(SCHWER, level)).toBe(getEnemyHp(SCHWER, 6))
  })

  it('macht den Boss gefaehrlicher statt laenger - Druck steigt, Kampfdauer nicht', () => {
    // THOMAS' ENTSCHEIDUNG 2026-08-30: "Gefaehrlicher statt laenger". Der erste Bau hob
    // Lebenspunkte und Zeitfenster je Stufe um 20 % - auf Level 26 waeren daraus ueber
    // 100 Sekunden Bosskampf geworden. Der Druck kommt jetzt aus Begleitern und
    // Vorruecken, die Dauer bleibt, wo sie ausgemessen ist.
    // OHNE ELITE-LEVEL VERGLEICHEN: Jedes fuenfte Level ist ein Elite-Boss (5, 10, 15 ...)
    // mit eigenen Aufschlaegen auf Horde und Tempo. Ein Vergleich ueber eine Stufengrenze
    // hinweg wuerde sonst den Elite-Faktor messen statt die Stufe.
    const plan = (level: number) => getBossPlan(level, BALANCE.crowd.max, 'normal', 1, 1)
    for (const grenze of [6, 11, 16, 21]) {
      const davor = plan(grenze - 2)
      const danach = plan(grenze)
      expect(davor.elite, `L${grenze - 2}`).toBe(false)
      expect(danach.elite, `L${grenze}`).toBe(false)
      // Die Hordengroesse ist eine ganze Zahl: Auf den oberen Stufen ist der Aufschlag so
      // klein, dass die Rundung ihn schluckt (Level 19 und 21 liegen beide bei 19). Der
      // Test darf deshalb nur verlangen, dass sie nicht FAELLT; dass sie ueber die ganze
      // Treppe steigt, prueft der Vergleich unten.
      expect(danach.hordeSize, `L${grenze} Horde`).toBeGreaterThanOrEqual(davor.hordeSize)
      expect(danach.advanceSpeed, `L${grenze} Tempo`).toBeGreaterThan(davor.advanceSpeed)
    }
    // Ueber die ganze Treppe: Der Druck steigt genau um den Stufenfaktor.
    const unten = plan(4)
    const oben = plan(26)
    expect(oben.advanceSpeed / unten.advanceSpeed).toBeCloseTo(getStufenHaerte(26), 6)
    expect(oben.maxActiveCalled).toBeGreaterThan(unten.maxActiveCalled)
    expect(oben.hordeSize).toBeGreaterThan(unten.hordeSize)
  })

  it('laesst den Boss FRUEHER ankommen, aber nie vor der Haelfte des Kampfes', () => {
    // Die Gegenprobe zum Vorruecken: Schneller heisst hier "er steht frueher in der
    // Truppe", und das ist der Haertegewinn. Zu frueh waere es aber kein Kampf mehr,
    // sondern ein Verlustgeschaeft ab der ersten Sekunde - deshalb die untere Schranke.
    const strecke = 334
    for (const level of [1, 6, 11, 16, 21, 26, 30, 60]) {
      const plan = getBossPlan(level, BALANCE.crowd.max, 'normal', 1, 1)
      const ankunftSec = strecke / plan.advanceSpeed
      expect(ankunftSec, `L${level}`).toBeGreaterThan(getMaxFightSec(level) / 2)
    }
  })
})
