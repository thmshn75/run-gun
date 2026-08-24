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
  it('die Pistole steht am Anfang, die Staffelung reicht weit in den Endlosbereich', () => {
    // Thomas 2026-08-24: "im ersten Level eine Pistole noch vor dem Sturmgewehr, und das
    // in Level zwei und in Level drei die Shotgun dazu ... nicht jedes Level was dazu, so
    // dass man auch in spaeteren Leveln was bekommt".
    expect(BALANCE.weapon.pistol.minLevel).toBe(1)
    expect(BALANCE.weapon.normal.minLevel).toBe(2)
    expect(BALANCE.weapon.shotgun.minLevel).toBe(3)
    // Genau EINE Waffe auf Level 1 - der Einstieg hat noch keine Wahl.
    const stufen = WEAPON_KEYS.map((key) => BALANCE.weapon[key].minLevel)
    expect(stufen.filter((stufe) => stufe === 1)).toHaveLength(1)
    // Die Staffelung reicht bis weit in den Endlosbereich, statt bei Level 7 zu enden.
    expect(Math.max(...stufen)).toBeGreaterThanOrEqual(25)
  })

  it('macht die Pistole schwaecher als die Startwaffe', () => {
    // Nur DIESER Vergleich ist mit der Nominalformel zulaessig: Pistole und Sturmgewehr
    // haben beide keinen Flaecheneffekt, ihre Werte sind also direkt vergleichbar.
    //
    // FUER ALLE ANDEREN TAUGT DIE FORMEL NICHT, und das ist hier teuer gelernt worden:
    // Die Rakete hat den NIEDRIGSTEN Nominalwert im Spiel (3,1) und ist gemessen die
    // STAERKSTE Waffe (1,45x) - Sprengwirkung kommt in der Formel nicht vor. Ein erster
    // Anlauf dieses Tests hat daraus prompt "Kettenblitz zu schwach" gefolgert, obwohl
    // er gemessen 1,24x liegt. Die belastbare Vergleichszahl steht unten und stammt aus
    // einer Messung im laufenden Spiel unter Ueberlast.
    const nominal = (k: WeaponKey) => {
      const w = BALANCE.weapon[k]
      return w.rateFactor * w.damageFactor * w.shootersPerSalvo * w.bulletsPerShot
    }
    expect(nominal('pistol')).toBeLessThan(nominal('normal'))
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

  it('auf jedem Level ab zwei gibt es mindestens eine Toralternative', () => {
    // AB Level 2, nicht ab 1: Seit die Pistole die Startwaffe ist, kennt Level 1 genau
    // eine Waffe. Das Wandtor zeigt dort deshalb gar kein Waffensegment mehr, sonst
    // haenge dort die Waffe, die der Spieler schon traegt (walls.chooseContent).
    for (let level = 2; level <= 12; level += 1) {
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

  it('gibt auf Level 1 keine Waffenauswahl - und der Rest des Spiels merkt das', () => {
    // Wenn diese Zusicherung faellt, muss walls.chooseContent angepasst werden: Dort
    // haengt daran, ob ueberhaupt ein Waffensegment erzeugt wird.
    expect(getWeaponRewardChoices('pistol', 1)).toHaveLength(0)
    expect(getWeaponRewardChoices('pistol', 2)).toContain('normal')
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
    // Bis 2026-08-24 endeten die Waffen bei Level 7 und die Farben trugen danach weiter.
    // Seit der Endlos-Staffelung ist es umgekehrt: Die Farben sind bei Level 9 fertig,
    // die Waffen laufen bis 30. Gesichert gehoert, dass ueberhaupt EINE der beiden
    // Ketten weiterlaeuft - nach dem letzten Farbwechsel darf nicht Stillstand sein.
    const letzteWaffe = Math.max(...WEAPON_KEYS.map((k) => BALANCE.weapon[k].minLevel))
    const letzteFarbe = Math.max(...BALANCE.enemy.variantUnlockLevels)
    expect(Math.max(letzteWaffe, letzteFarbe)).toBeGreaterThan(Math.min(letzteWaffe, letzteFarbe))
    expect(letzteWaffe).toBeGreaterThan(letzteFarbe)
  })
})
