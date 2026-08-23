import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getUnlockedVariantCount } from '../src/systems/enemyTypes'
import { getWeaponRewardChoices } from '../src/systems/weaponChoices'
import type { WeaponKey } from '../src/systems/weapons'

// WEAPON_KEYS wird bewusst NICHT aus weapons.ts importiert: Die Datei zieht Phaser mit,
// und Phaser braucht beim Laden ein DOM. Die Liste steht ohnehin in BALANCE.
const WEAPON_KEYS = (Object.keys(BALANCE.weapon) as string[])
  .filter((k) => typeof (BALANCE.weapon as Record<string, unknown>)[k] === 'object'
    && 'minLevel' in ((BALANCE.weapon as Record<string, Record<string, unknown>>)[k])) as WeaponKey[]

describe('Waffen-Staffelung (B6)', () => {
  it('es sind acht Waffen', () => {
    expect(WEAPON_KEYS).toHaveLength(8)
    expect(WEAPON_KEYS).toContain('grenade')
  })

  it('bis Level 7 kommt in jedem Level etwas Neues dazu', () => {
    const stufen = WEAPON_KEYS.map((key) => BALANCE.weapon[key].minLevel)
    for (let level = 2; level <= 7; level += 1) {
      expect(stufen, `auf Level ${level} kommt keine neue Waffe`).toContain(level)
    }
    expect(Math.max(...stufen)).toBe(7)
  })

  it('die Staffelung aendert KEINE Staerke - das Waffenband bleibt', () => {
    // Nominalstaerke = Rate x Schaden x Schuetzen x Kugeln, Standardwaffe = 8.
    // Splash, Durchschlag und Kette sind hier nicht eingerechnet; geprueft wird nur,
    // dass keine Waffe voellig aus dem Rahmen faellt.
    for (const key of WEAPON_KEYS) {
      const w = BALANCE.weapon[key]
      const nominal = w.rateFactor * w.damageFactor * w.shootersPerSalvo * w.bulletsPerShot
      expect(nominal, `${key} liegt ausserhalb jedes Bandes`).toBeGreaterThan(1)
      expect(nominal).toBeLessThan(12)
    }
  })

  it('auf jedem Level gibt es mindestens eine Toralternative', () => {
    for (let level = 1; level <= 12; level += 1) {
      for (const aktuell of WEAPON_KEYS) {
        if (BALANCE.weapon[aktuell].minLevel > level) continue
        const auswahl = getWeaponRewardChoices(aktuell as WeaponKey, level)
        expect(auswahl.length, `Level ${level} mit ${aktuell}: keine Alternative`).toBeGreaterThanOrEqual(1)
        expect(auswahl).not.toContain(aktuell)
      }
    }
  })

  it('ab Level 3 gibt es mindestens zwei Alternativen', () => {
    for (let level = 3; level <= 12; level += 1) {
      expect(getWeaponRewardChoices('normal', level).length).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('Zombie-Farbvarianten (B5)', () => {
  it('die Freischaltung steigt mit dem Level und endet bei vier', () => {
    expect(getUnlockedVariantCount(1)).toBe(1)
    expect(getUnlockedVariantCount(2)).toBe(1)
    expect(getUnlockedVariantCount(3)).toBe(2)
    expect(getUnlockedVariantCount(6)).toBe(3)
    expect(getUnlockedVariantCount(9)).toBe(4)
    expect(getUnlockedVariantCount(12)).toBe(4)
  })

  it('die Kette reisst nach der letzten Waffe nicht ab', () => {
    // Waffen kommen bis Level 7, Farben ab 3/6/9 - nach Level 7 traegt die Optik weiter.
    const letzteWaffe = Math.max(...WEAPON_KEYS.map((k) => BALANCE.weapon[k].minLevel))
    const letzteFarbe = Math.max(...BALANCE.enemy.variantUnlockLevels)
    expect(letzteFarbe).toBeGreaterThan(letzteWaffe)
  })
})
