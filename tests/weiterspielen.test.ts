import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { computeMenuLayout } from '../src/systems/menuLayout'
import { defaultSave, kaufeWeiterspielen, parseSave, serializeSave, type SaveData } from '../src/systems/save'
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

/**
 * DER GESCHEITERTE RUN (Thomas 2026-08-25: "wenn man stirbt, steht dann dort z. B.
 * weiter in Level 7, aber wenn man dann drueckt, steht dort der Game-Over-Bildschirm").
 *
 * Beim Tod bleibt der Run gespeichert, damit man ihn freikaufen kann - er war im Menue
 * aber nicht vom gesicherten Levelstand zu unterscheiden. Der FORTSETZEN-Knopf bot ihn
 * kostenlos an und startete das Spiel mit hp aus dem Todeszeitpunkt, also null Figuren.
 */
function gestorben(coins = 5000, continuesUsed = 0): SaveData {
  return {
    ...mitRun(),
    coins,
    run: { ...mitRun().run!, continuesUsed, gestorben: true },
  }
}

describe('Gescheiterter Run', () => {
  it('ist nicht kostenlos zu haben - freikaufen zieht den Preis ab', () => {
    const stand = gestorben(5000)
    const preis = getContinuePrice(7, 0)
    const bezahlt = kaufeWeiterspielen(stand)
    expect(bezahlt).toBeDefined()
    expect(bezahlt!.coins).toBe(5000 - preis)
  })

  it('verliert beim Freikaufen den Todes-Marker', () => {
    // SONST BOETE DAS MENUE DENSELBEN RUN NOCH EINMAL ZUM KAUF AN, und der Preis waere
    // ein zweites Mal faellig.
    const bezahlt = kaufeWeiterspielen(gestorben(5000))!
    expect(bezahlt.run?.gestorben).toBeUndefined()
    expect(bezahlt.run?.level).toBe(7)
    expect(kaufeWeiterspielen(bezahlt)).toBeUndefined()
  })

  it('bleibt gesperrt, wenn das Konto nicht reicht oder der Deckel erreicht ist', () => {
    expect(kaufeWeiterspielen(gestorben(getContinuePrice(7, 0) - 1))).toBeUndefined()
    expect(kaufeWeiterspielen(gestorben(999999, BALANCE.continueRun.maxPerRun))).toBeUndefined()
  })

  it('laesst einen lebenden Run in Ruhe - der wird kostenlos fortgesetzt', () => {
    expect(kaufeWeiterspielen(mitRun())).toBeUndefined()
    expect(kaufeWeiterspielen(defaultSave())).toBeUndefined()
  })

  it('ueberlebt Speichern und Laden, und nur exakt true zaehlt als tot', () => {
    const gelesen = parseSave(serializeSave(gestorben()))
    expect(gelesen.ok).toBe(true)
    if (!gelesen.ok) return
    expect(gelesen.data.run?.gestorben).toBe(true)

    // Alles andere heisst "lebt" - ein Spielstand darf daran nie scheitern.
    const roh = JSON.parse(serializeSave(gestorben())) as Record<string, unknown>
    ;(roh.run as Record<string, unknown>).gestorben = 'ja'
    const seltsam = parseSave(JSON.stringify(roh))
    expect(seltsam.ok).toBe(true)
    if (!seltsam.ok) return
    expect(seltsam.data.run?.gestorben).toBeUndefined()
    expect(seltsam.data.run?.level).toBe(7)
  })
})

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
