import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getStartWeaponChoices } from '../src/systems/weaponChoices'

/**
 * DIE STARTWAFFENWAHL (Thomas 2026-08-25: "wenn ich z. B. eine auswaehle, kann ich nicht
 * direkt zurueck auf die anderen" und "wenn ich speicher und bevor ich weiterspiele will
 * ich auch waehlen koennen").
 *
 * Der Fehler war nicht die Regel, sondern ihr Zeitpunkt: Die Liste wurde bei JEDER Wahl
 * neu aus der GERADE getragenen Waffe gebaut. Diese Tests halten fest, dass die Wahl in
 * beide Richtungen geht.
 */
describe('Startwaffenwahl', () => {
  it('die gerade getragene Waffe steht immer zur Wahl - auch ungekauft', () => {
    // 'chainlightning' ist im Lauf aus einem Wandtor gekommen, nicht gekauft.
    const wahl = getStartWeaponChoices('chainlightning', 12, [])
    expect(wahl).toContain('chainlightning')
    expect(wahl).toContain('pistol')
  })

  it('nach dem Wechsel bleibt die Ausgangswaffe waehlbar - Hin und Her ist moeglich', () => {
    const gekauft = ['rocket']
    // Pause beginnt mit der gefundenen 'chainlightning', gewechselt wird auf die gekaufte.
    const vorher = getStartWeaponChoices('chainlightning', 13, gekauft)
    expect(vorher).toEqual(expect.arrayContaining(['chainlightning', 'rocket']))
    const nachher = getStartWeaponChoices('rocket', 13, gekauft, ['chainlightning'])
    // OHNE das dritte Argument faellt 'chainlightning' hier heraus - genau der gemeldete Fehler.
    expect(getStartWeaponChoices('rocket', 13, gekauft)).not.toContain('chainlightning')
    expect(nachher).toContain('chainlightning')
    expect(nachher).toContain('rocket')
  })

  it('gekaufte Waffen kommen ein Level frueher, aber nicht ab Level 1', () => {
    const minLevel = (BALANCE.weapon.rocket as { minLevel: number }).minLevel
    const bonus = BALANCE.weapon.ownedLevelBonus
    expect(getStartWeaponChoices('pistol', minLevel - bonus, ['rocket'])).toContain('rocket')
    expect(getStartWeaponChoices('pistol', minLevel - bonus - 1, ['rocket'])).not.toContain('rocket')
    expect(getStartWeaponChoices('pistol', 1, ['rocket'])).not.toContain('rocket')
  })

  it('wer nichts gekauft hat und die Pistole traegt, hat nichts zu waehlen', () => {
    // Das Wahlfenster vor dem FORTSETZEN bleibt in diesem Fall zu.
    expect(getStartWeaponChoices('pistol', 1, [])).toEqual(['pistol'])
  })

  it('die Reihe ist nach Freischaltlevel sortiert und passt in den Kachelvorrat', () => {
    const alle = (Object.keys(BALANCE.weapon) as string[])
      .filter((k) => typeof (BALANCE.weapon as Record<string, { minLevel?: number }>)[k]?.minLevel === 'number')
    const wahl = getStartWeaponChoices('pistol', 99, alle)
    expect(wahl.length).toBe(alle.length)
    const level = wahl.map((w) => (BALANCE.weapon[w] as { minLevel: number }).minLevel)
    expect([...level].sort((a, b) => a - b)).toEqual(level)
    // Sonst waere eine Waffe in der Levelpause unsichtbar.
    expect(wahl.length).toBeLessThanOrEqual(BALANCE.shop.ui.weaponRows * BALANCE.shop.ui.weaponsPerRow)
  })
})
