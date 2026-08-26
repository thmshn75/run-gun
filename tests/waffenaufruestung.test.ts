import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getWeaponStars } from '../src/systems/weaponStars'
import type { WeaponKey } from '../src/systems/weapons'
import {
  defaultSave, getWeaponFirepowerFactor, getWeaponStepPrice, getWeaponSteps,
  getWeaponUnlockPrice, kaufeWaffenStufe, parseSave, serializeSave, type SaveData,
} from '../src/systems/save'

/**
 * AUFRUESTUNG JE WAFFE (Thomas 2026-08-25: "im shop die Waffen billiger machen ca.
 * 20-25 %, aber dafuer dann die moeglichkeit die Waffen upzugraden - gegen Bezahlung
 * 5 Stufen jeweils die feuerkraft erhoehen").
 */
function mitWaffe(weapon: string, coins: number, stufen = 0): SaveData {
  return {
    ...defaultSave(),
    coins,
    ownedWeapons: [weapon],
    ...(stufen > 0 ? { weaponSteps: { [weapon]: stufen } } : {}),
  }
}

describe('Waffen-Aufruestung', () => {
  it('gibt es nur fuer gekaufte Waffen', () => {
    // Wer die Waffe nicht hat, kann sie auch nicht verbessern - sonst waere die
    // Aufruestung ein Weg, die teure Waffe zu umgehen.
    expect(kaufeWaffenStufe({ ...defaultSave(), coins: 99999 }, 'rocket')).toBeUndefined()
    expect(kaufeWaffenStufe(mitWaffe('rocket', 99999), 'rocket')).toBeDefined()
  })

  it('haelt bei fuenf Stufen an und nimmt dann kein Geld mehr', () => {
    const voll = mitWaffe('rocket', 99999, BALANCE.meta.weaponSteps)
    expect(getWeaponStepPrice('rocket', BALANCE.meta.weaponSteps)).toBeUndefined()
    expect(kaufeWaffenStufe(voll, 'rocket')).toBeUndefined()
  })

  it('laesst JEDE Stufe die Feuerkraft messbar heben', () => {
    // Die Lektion vom 2026-08-25: Ein Zugewinn, den eine Rundung im Datenmodell
    // verschluckt, kommt nie an. Hier greift kein clampStat - der Faktor sitzt am
    // Waffenschaden. Gesichert wird der Weg, nicht der Faktor.
    let stand = mitWaffe('rocket', 99999)
    let vorher = getWeaponFirepowerFactor(stand, 'rocket')
    expect(vorher).toBe(1)
    for (let stufe = 0; stufe < BALANCE.meta.weaponSteps; stufe += 1) {
      const gekauft = kaufeWaffenStufe(stand, 'rocket')
      expect(gekauft, `Stufe ${stufe + 1}`).toBeDefined()
      if (gekauft === undefined) return
      stand = gekauft
      const nachher = getWeaponFirepowerFactor(stand, 'rocket')
      expect(nachher, `Stufe ${stufe + 1}`).toBeGreaterThan(vorher)
      vorher = nachher
    }
    expect(getWeaponSteps(stand, 'rocket')).toBe(BALANCE.meta.weaponSteps)
    // Voll ausgebaut sind es rund +40 % auf DIESE Waffe.
    expect(vorher).toBeCloseTo(1.4, 1)
  })

  it('wirkt nur auf die aufgeruestete Waffe', () => {
    const stand = mitWaffe('rocket', 99999, 3)
    expect(getWeaponFirepowerFactor(stand, 'rocket')).toBeGreaterThan(1)
    expect(getWeaponFirepowerFactor(stand, 'laser')).toBe(1)
  })

  it('hebt eine voll ausgebaute Waffe um ein bis zwei Plaetze, nicht an die Spitze', () => {
    // Der Ausbau darf die Staffelung nicht ersetzen: Das Sturmgewehr voll ausgebaut
    // bleibt unter der staerksten Waffe des Spiels.
    const voll = (1 + BALANCE.meta.weaponStepFirepowerBonus) ** BALANCE.meta.weaponSteps
    const staerkste = Math.max(...(Object.values(BALANCE.weapon)
      .filter((e): e is { killsPerSec: number } => typeof e === 'object' && e !== null && 'killsPerSec' in e)
      .map((e) => e.killsPerSec)))
    expect(BALANCE.weapon.normal.killsPerSec * voll).toBeLessThan(staerkste)
  })

  it('kostet zusammen mehr als die Waffe selbst - der Kauf ist der Einstieg', () => {
    for (const weapon of Object.keys(BALANCE.weapon)) {
      const kaufpreis = getWeaponUnlockPrice(weapon)
      if (kaufpreis === undefined) continue
      let summe = 0
      for (let stufe = 0; stufe < BALANCE.meta.weaponSteps; stufe += 1) {
        summe += getWeaponStepPrice(weapon, stufe) ?? 0
      }
      expect(summe, weapon).toBeGreaterThan(kaufpreis * 3)
      // Und jede Stufe kostet mehr als die davor.
      for (let stufe = 1; stufe < BALANCE.meta.weaponSteps; stufe += 1) {
        expect(getWeaponStepPrice(weapon, stufe)!, `${weapon} Stufe ${stufe}`)
          .toBeGreaterThan(getWeaponStepPrice(weapon, stufe - 1)!)
      }
    }
  })

  it('zahlt den Preis wirklich vom Konto ab', () => {
    const stand = mitWaffe('rocket', 5000)
    const preis = getWeaponStepPrice('rocket', 0)!
    const gekauft = kaufeWaffenStufe(stand, 'rocket')!
    expect(gekauft.coins).toBe(5000 - preis)
    // Und wer zu wenig hat, bekommt nichts.
    expect(kaufeWaffenStufe(mitWaffe('rocket', preis - 1), 'rocket')).toBeUndefined()
  })

  it('ueberlebt Speichern und Laden, und ein alter Spielstand bleibt gueltig', () => {
    const gelesen = parseSave(serializeSave(mitWaffe('rocket', 100, 2)))
    expect(gelesen.ok).toBe(true)
    if (!gelesen.ok) return
    expect(getWeaponSteps(gelesen.data, 'rocket')).toBe(2)

    // Ein Spielstand ohne das Feld ist kein Fehler - dieselbe Regel wie bei 'run'.
    const alt = parseSave(JSON.stringify({ version: 1, coins: 10, highestLevel: 3, scores: [] }))
    expect(alt.ok).toBe(true)
    if (!alt.ok) return
    expect(getWeaponSteps(alt.data, 'rocket')).toBe(0)

    // Unsinn im Feld wird still verworfen, nicht uebernommen.
    const kaputt = parseSave(JSON.stringify({
      version: 1, coins: 10, highestLevel: 3, scores: [],
      weaponSteps: { rocket: 99, gibtsnicht: 3, laser: -1 },
    }))
    expect(kaputt.ok).toBe(true)
    if (!kaputt.ok) return
    expect(getWeaponSteps(kaputt.data, 'rocket')).toBe(BALANCE.meta.weaponSteps)
    expect(getWeaponSteps(kaputt.data, 'laser')).toBe(0)
    expect(kaputt.data.weaponSteps?.gibtsnicht).toBeUndefined()
  })
})

describe('Anzeige der Aufruestung', () => {
  it('BEGRUENDET, warum die Stufe neben den Sternen stehen muss', () => {
    // Thomas 2026-08-26: "wenn ich die waffe schon upgeradet habe, also z. B. auf stufe 4,
    // dann soll die doch auch nicht nur die standardstaerke anzeigen sondern auch die
    // upgradestufe".
    //
    // NACHGERECHNET: Die Sterne runden die gemessene Staerke auf fuenf Stufen. Ein Ausbau
    // auf Stufe 4 (+31 %) veraendert dabei bei SECHS der dreizehn Waffen keinen einzigen
    // Stern - Pistole, Schrot, Flamme, Blitz, Schockwelle und Streubombe; bei der Flamme
    // ueber alle fuenf Stufen keinen. Wer nur die Sterne zeigt, zeigt einen Kauf ueber
    // Zehntausende Muenzen bei fast der Haelfte der Waffen also gar nicht.
    //
    // Dieser Test faellt weg, sobald jemand die Sterne feiner macht - dann DARF die
    // Stufenmarke verschwinden. Solange er anschlaegt, muss sie bleiben.
    const waffen = (Object.keys(BALANCE.weapon) as WeaponKey[])
      .filter((k) => typeof (BALANCE.weapon[k] as { killsPerSec?: number }).killsPerSec === 'number')
    const ohneSichtbareWirkung = waffen.filter((weapon) => {
      const ohne = getWeaponStars(weapon)
      const mitVier = getWeaponStars(weapon, (1 + BALANCE.meta.weaponStepFirepowerBonus) ** 4)
      return ohne === mitVier
    })
    expect(ohneSichtbareWirkung.length / waffen.length).toBeGreaterThan(0.3)
    expect(ohneSichtbareWirkung).toContain('flamethrower')
  })

  it('zeigt die Stufe an JEDER Stelle, an der man eine Waffe waehlt', () => {
    // Drei Auswahlen: Laden im Menue, Startwaffenwahl vor dem FORTSETZEN, Waffenwahl in
    // der Levelpause. Fehlt sie an einer, sucht man dort vergeblich, was man gekauft hat.
    const menue = readFileSync(new URL('../src/scenes/MenuScene.ts', import.meta.url), 'utf8')
    const overlay = readFileSync(new URL('../src/systems/shopOverlay.ts', import.meta.url), 'utf8')
    const ansicht = readFileSync(new URL('../src/systems/weaponDetail.ts', import.meta.url), 'utf8')
    // Laden: Klartext unter der Kachel.
    expect(menue).toContain('✓ STUFE ${stufen}/${BALANCE.meta.weaponSteps}')
    // Startwaffenwahl im Menue: Marke in der Ecke.
    expect(menue).toContain('ausbau > 0 ? `+${ausbau}` : \'\'')
    // Levelpause: dieselbe Marke.
    expect(overlay).toContain('stufen > 0 ? `+${stufen}` : \'\'')
    // Grosse Ansicht im Testgelaende: Klartext.
    expect(ansicht).toContain('AUSGEBAUT: STUFE ${stufen} VON ${maxStufen}')
  })
})

describe('Preissenkung 2026-08-25', () => {
  it('haelt die Waffen zusammen unter 80.000', () => {
    // Thomas: "im shop die Waffen billiger machen ca. 20-25 %". Vorher 99.900.
    const summe = Object.keys(BALANCE.weapon)
      .map((w) => getWeaponUnlockPrice(w) ?? 0)
      .reduce((a, b) => a + b, 0)
    expect(summe).toBeGreaterThan(70000)
    expect(summe).toBeLessThan(80000)
  })
})
