import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { computeWeaponRowLayout } from '../src/systems/shopWeaponRow'

/**
 * DIE KACHELREIHE IN DER LEVELPAUSE.
 *
 * Der Fehler, den diese Tests festhalten: Die Reihe stand auf einer festen Zahl, zu der
 * die OBERE Safe Area addiert wurde - "SPEICHERN & BEENDEN" haengt an der UNTEREN. Auf
 * dem iPhone liefen beide aufeinander zu und die zweite Kachelreihe lag unter dem Knopf.
 * Am Schreibtisch (Insets 0) ist davon nichts zu sehen, deshalb prueft der Test die
 * echten Geraetewerte mit.
 */
const HOEHE = 844
const GERAETE = [
  { name: 'Schreibtisch ohne Safe Area', insets: { top: 0, bottom: 0, left: 0, right: 0 } },
  { name: 'iPhone im Browser', insets: { top: 47, bottom: 34, left: 0, right: 0 } },
  { name: 'iPhone als PWA vom Homescreen', insets: { top: 59, bottom: 34, left: 0, right: 0 } },
  { name: 'Geraet mit sehr grossen Raendern', insets: { top: 70, bottom: 48, left: 0, right: 0 } },
]

describe('Startwaffenreihe in der Levelpause', () => {
  for (const geraet of GERAETE) {
    it(`liegt auf "${geraet.name}" zwischen den Knoepfen, nicht darunter`, () => {
      const ui = BALANCE.shop.ui
      const layout = computeWeaponRowLayout(geraet.insets, HOEHE)
      const kaufknopfUnterkante = geraet.insets.top + ui.firstButtonY + 2 * ui.buttonHeight + ui.buttonGap
      const weiterY = HOEHE - geraet.insets.bottom - ui.continueBottomOffset
      const beendenOberkante = weiterY - ui.continueHeight - ui.quitGap - ui.quitHeight / 2

      const titelOberkante = layout.titelY - ui.weaponTitleHeight / 2
      const letzteReiheY = layout.ersteReiheY + (layout.reihen - 1) * (layout.kachelHoehe + layout.luecke)
      const unterkante = letzteReiheY + layout.kachelHoehe / 2

      expect(titelOberkante).toBeGreaterThanOrEqual(kaufknopfUnterkante)
      expect(unterkante).toBeLessThanOrEqual(beendenOberkante)
    })
  }

  it('behaelt auf dem iPhone die volle Kachelhoehe', () => {
    const layout = computeWeaponRowLayout({ top: 59, bottom: 34, left: 0, right: 0 }, HOEHE)
    expect(layout.kachelHoehe).toBe(BALANCE.shop.ui.weaponTileHeight)
  })

  it('schrumpft die Kachel, statt sie verschwinden zu lassen', () => {
    // Kuenstlich enges Geraet: Der Platz reicht nicht fuer die volle Hoehe.
    const layout = computeWeaponRowLayout({ top: 130, bottom: 90, left: 0, right: 0 }, HOEHE)
    expect(layout.kachelHoehe).toBeGreaterThanOrEqual(BALANCE.shop.ui.weaponTileMinHeight)
    expect(layout.kachelHoehe).toBeLessThanOrEqual(BALANCE.shop.ui.weaponTileHeight)
  })

  it('hat Platz fuer jede Waffe des Spiels', () => {
    const layout = computeWeaponRowLayout({ top: 59, bottom: 34, left: 0, right: 0 }, HOEHE)
    const waffen = (Object.keys(BALANCE.weapon) as string[])
      .filter((k) => typeof (BALANCE.weapon as Record<string, { minLevel?: number }>)[k]?.minLevel === 'number')
    expect(layout.reihen * layout.proReihe).toBeGreaterThanOrEqual(waffen.length)
  })

  it('passt in die Breite des Spielfelds', () => {
    const layout = computeWeaponRowLayout({ top: 0, bottom: 0, left: 0, right: 0 }, HOEHE)
    const zeilenBreite = layout.proReihe * layout.kachelBreite + (layout.proReihe - 1) * layout.luecke
    expect(zeilenBreite).toBeLessThanOrEqual(390)
  })
})
