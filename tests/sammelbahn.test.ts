import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getDriveLimitHalfWidth, getRoadSegment, getWallGeometry } from '../src/systems/roadGeometry'

/**
 * Sammelbahn links: Kaempfen am Rand darf nichts einloesen (Thomas 2026-08-23, dritte
 * Meldung). Die Rechnung bildet GameScene.crowdStehtInSammelbahn nach - beide Achsen,
 * beide Schwellen - und BEZIEHT DIE FAHRGRENZE EIN.
 *
 * Letzteres ist der Kern: Die erste Fassung dieses Tests prueft nur, dass rechts nichts
 * ausloest. Sie liess dadurch einen Wert durch (drainOverlapFigures 2,2), bei dem rote
 * Kacheln UEBERHAUPT NICHT mehr ausloesten - im laufenden Spiel gemessen. Ein Test, der
 * nur die eine Richtung sichert, uebersieht die Regression in der anderen.
 */
const W = 390
const H = 844
const FIGUR_BREITE = 68 * BALANCE.render.figureTextureScale
const FIGUR_HOEHE = 92 * BALANCE.render.figureTextureScale
const HALBE_HUELLE_BREITE = (FIGUR_BREITE * BALANCE.crowd.hullWidthFigures) / 2
const HALBE_HUELLE_HOEHE = (FIGUR_HOEHE * BALANCE.crowd.hullHeightFigures) / 2
const ANKER_Y = H - BALANCE.player.anchorBottomOffset
const MITTE = W / 2

/** Wie weit links darf der Anker ueberhaupt stehen? Die Strassenkante ist harte Grenze. */
function linkesteAnkerposition(): number {
  const inset = FIGUR_BREITE * BALANCE.player.dragClampFigures + BALANCE.player.dragClampMargin
  const halbeFormation = (W * BALANCE.crowd.maxWidthRatio) / 2
  const grenze = getDriveLimitHalfWidth(
    W, H, ANKER_Y, true, halbeFormation, inset, FIGUR_BREITE * BALANCE.walls.driveIntoWallFigures,
  )
  return MITTE - grenze
}

/** Loest an dieser Ankerposition irgendeine linke Kachel aus? */
function loestAus(ankerX: number, rot: boolean): boolean {
  const tiefe = rot ? BALANCE.walls.drainOverlapFigures : BALANCE.walls.pickupOverlapFigures
  const schwelleX = FIGUR_BREITE * tiefe
  const schwelleY = FIGUR_HOEHE * BALANCE.walls.pickupOverlapHeightFigures
  for (let weltAnker = BALANCE.road.horizonY; weltAnker <= H + 120; weltAnker += 1) {
    const segment = getRoadSegment(W, H, weltAnker, BALANCE.walls.segmentHeightPx)
    const geometrie = getWallGeometry(W, H, segment.centerY, 'left')
    const ueberX = Math.min(ankerX + HALBE_HUELLE_BREITE, geometrie.x + geometrie.width / 2)
      - Math.max(ankerX - HALBE_HUELLE_BREITE, geometrie.x - geometrie.width / 2)
    const ueberY = Math.min(ANKER_Y + HALBE_HUELLE_HOEHE, segment.centerY + segment.height / 2)
      - Math.max(ANKER_Y - HALBE_HUELLE_HOEHE, segment.centerY - segment.height / 2)
    if (ueberX >= schwelleX && ueberY >= schwelleY) return true
  }
  return false
}

/** Alle erreichbaren Ankerpositionen, an denen die Bedingung gilt. */
function bereich(pruefung: (x: number) => boolean): number[] {
  const treffer: number[] = []
  for (let x = Math.ceil(linkesteAnkerposition()); x <= 340; x += 1) if (pruefung(x)) treffer.push(x)
  return treffer
}

describe('Sammelbahn links', () => {
  it('rote Kacheln verlangen mehr Eindringtiefe als blaue', () => {
    expect(BALANCE.walls.drainOverlapFigures).toBeGreaterThan(BALANCE.walls.pickupOverlapFigures)
  })

  it('rote Kacheln bleiben erreichbar - sonst ist die Entscheidung abgeschafft', () => {
    const rot = bereich((x) => loestAus(x, true))
    expect(rot.length, 'kein erreichbarer Punkt loest eine rote Kachel aus').toBeGreaterThanOrEqual(8)
    // Sie muessen am linken Anschlag liegen: dort faehrt man bewusst hinein.
    expect(rot[0]).toBeCloseTo(Math.ceil(linkesteAnkerposition()), 0)
  })

  it('es gibt einen Bereich, der +1 gibt und -3 nicht', () => {
    const nurBlau = bereich((x) => loestAus(x, false) && !loestAus(x, true))
    expect(nurBlau.length).toBeGreaterThanOrEqual(10)
    // Zusammenhaengend, sonst nicht bespielbar.
    expect(nurBlau[nurBlau.length - 1] - nurBlau[0] + 1).toBe(nurBlau.length)
  })

  it('im Kampfbereich links der Mitte loest nichts mehr aus', () => {
    // Um die aeusseren linken Gegner zu treffen, steht der Anker bei rund 90 bis 160
    // (Feuerlinie 78 px, Anflugbereich 155 px). Genau dort darf nichts passieren.
    for (let x = 90; x <= MITTE; x += 5) {
      expect(loestAus(x, false), `Anker ${x} darf nichts einloesen`).toBe(false)
      expect(loestAus(x, true), `Anker ${x} darf nichts abziehen`).toBe(false)
    }
  })

  it('rechts der Strassenmitte loest nichts aus', () => {
    for (let x = MITTE; x <= 340; x += 5) {
      expect(loestAus(x, false)).toBe(false)
      expect(loestAus(x, true)).toBe(false)
    }
  })

  it('die vertikale Schwelle sperrt Kacheln aus, die die Huelle nur mit der Kante beruehren', () => {
    // Gemessener Fall vom 2026-08-23: Kachel y 609..677 gegen Huelle y 677..751.
    const ueberY = Math.min(ANKER_Y + HALBE_HUELLE_HOEHE, 677) - Math.max(ANKER_Y - HALBE_HUELLE_HOEHE, 609)
    expect(ueberY).toBeLessThan(FIGUR_HOEHE * BALANCE.walls.pickupOverlapHeightFigures)
  })
})
