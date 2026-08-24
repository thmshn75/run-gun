import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { computeMenuLayout } from '../src/systems/menuLayout'
import { defaultSave, parseSave, serializeSave, type SaveData } from '../src/systems/save'
import { getContinuePrice } from '../src/systems/upgrades'

const INSETS = { top: 47, bottom: 34, left: 0, right: 0 }

function mitRun(): SaveData {
  return {
    ...defaultSave(),
    coins: 5000,
    run: {
      level: 7, hp: 40, damage: 3.5, shotsPerSec: 5, weapon: 'laser',
      firepowerSteps: 3, teamSteps: 2, runCoins: 2500, bookedCoins: 2500, continuesUsed: 0,
    },
  }
}

describe('Weiterspielen und Fortsetzen', () => {
  it('der Preis steigt mit dem Level und verdoppelt sich je Nutzung', () => {
    expect(getContinuePrice(3, 0)).toBe(750)
    expect(getContinuePrice(8, 0)).toBe(2000)
    expect(getContinuePrice(12, 0)).toBe(3000)
    expect(getContinuePrice(8, 1)).toBe(4000)
    expect(getContinuePrice(8, 2)).toBe(8000)
  })

  it('laesst die Wahl zwischen Aufwertungen und einem Weiterspielen', () => {
    // Bis 2026-08-24 finanzierte ein voller Run beides: alle Stufen UND ein
    // Weiterspielen. Seit E2 eine Stufe rund zwei Level Einkommen kostet, ist das eine
    // ENTSCHEIDUNG - und genau die ist der Zweck der Preiserhoehung.
    //
    // Gesichert gehoert deshalb nicht mehr "beides geht", sondern: Wer sich beim Kaufen
    // zurueckhaelt, kann sich das Weiterspielen leisten. Sonst waere der Knopf tot.
    const einnahmeBisLevelZwoelf = 10454
    const sechsGuenstigsteStufen = 2 * (BALANCE.shop.prices[0] + BALANCE.shop.prices[1] + BALANCE.shop.prices[2])
    const restBeiZurueckhaltung = einnahmeBisLevelZwoelf - sechsGuenstigsteStufen
    expect(restBeiZurueckhaltung).toBeGreaterThan(getContinuePrice(12, 0))

    // Und wer alles ausgibt, was er hat, kann es sich NICHT leisten - sonst gaebe es
    // nichts zu entscheiden.
    const vieleStufen = 2 * BALANCE.shop.prices.slice(0, 5).reduce((a, b) => a + b, 0)
    expect(einnahmeBisLevelZwoelf - vieleStufen).toBeLessThan(getContinuePrice(12, 0))
  })

  it('ein offener Run ueberlebt Speichern und Laden', () => {
    const gelesen = parseSave(serializeSave(mitRun()))
    expect(gelesen.ok).toBe(true)
    if (!gelesen.ok) return
    expect(gelesen.data.run?.level).toBe(7)
    expect(gelesen.data.run?.firepowerSteps).toBe(3)
    expect(gelesen.data.run?.weapon).toBe('laser')
  })

  it('ein Spielstand aus der Zeit vor B3 laedt weiter - die Bestenliste darf nicht daran scheitern', () => {
    const alt = { version: 1, coins: 900, highestLevel: 5, scores: [{ coins: 700, level: 4, timeMs: 60000 }] }
    const gelesen = parseSave(JSON.stringify(alt))
    expect(gelesen.ok).toBe(true)
    if (!gelesen.ok) return
    expect(gelesen.data.run).toBeUndefined()
    expect(gelesen.data.scores).toHaveLength(1)
  })

  it('ein unvollstaendiger Run wird verworfen, nicht als Fehler behandelt', () => {
    const kaputt = { ...defaultSave(), run: { level: 3 } }
    const gelesen = parseSave(JSON.stringify(kaputt))
    expect(gelesen.ok, 'der ganze Spielstand darf daran nicht scheitern').toBe(true)
    if (!gelesen.ok) return
    expect(gelesen.data.run).toBeUndefined()
  })

  it('das Menue haelt Platz fuer FORTSETZEN frei, ohne die anderen Knoepfe zu verschieben', () => {
    const ohne = computeMenuLayout(844, INSETS, 5, false)
    const mit = computeMenuLayout(844, INSETS, 5, true)
    // SPIELEN bleibt, wo es ist - eine Schaltflaeche, die wandert, ist schwerer zu treffen.
    expect(mit.playButton.top).toBe(ohne.playButton.top)
    // Ohne offenen Run hat der Knopf keine Hoehe und ZURUECKSETZEN rueckt nach unten.
    expect(ohne.continueButton.height).toBe(0)
    expect(mit.continueButton.height).toBeGreaterThan(0)
    expect(mit.resetButton.top).toBeLessThan(ohne.resetButton.top)
  })

  it('kein Knopf ueberlappt einen anderen, mit und ohne offenen Run', () => {
    for (const hasRun of [false, true]) {
      const layout = computeMenuLayout(844, INSETS, 5, hasRun)
      const stapel = [layout.resetButton, layout.continueButton, layout.playButton].filter((b) => b.height > 0)
      for (let i = 1; i < stapel.length; i += 1) {
        expect(stapel[i].top, `Ueberlappung bei hasRun=${hasRun}`).toBeGreaterThanOrEqual(stapel[i - 1].top + stapel[i - 1].height)
      }
      expect(stapel[stapel.length - 1].top + stapel[stapel.length - 1].height).toBeLessThanOrEqual(844 - INSETS.bottom)
    }
  })

  it('hoechstens zwei Weiterspielen je Run', () => {
    expect(BALANCE.continueRun.maxPerRun).toBe(2)
    expect(BALANCE.continueRun.teamShareOnContinue).toBeGreaterThan(0)
    expect(BALANCE.continueRun.teamShareOnContinue).toBeLessThan(1)
  })
})
