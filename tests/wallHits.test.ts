import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getWallPlan } from '../src/systems/wallPlan'
import { computeFormation } from '../src/systems/formation'
import { getDriveLimitHalfWidth, getLaneRatio, getRoadHalfWidth } from '../src/systems/roadGeometry'

// Referenzgeraet iPhone-Hochformat (main.ts) und gemessene Sprite-Groesse (player.png).
const W = 390
const H = 844
const FIGURE_W = 34
const FIGURE_H = 46

const anchorY = H - BALANCE.player.anchorBottomOffset
const inset = FIGURE_W * BALANCE.player.dragClampFigures + BALANCE.player.dragClampMargin
const overlapPx = FIGURE_W * BALANCE.walls.driveIntoWallFigures

// Wandzone als Spuranteil: Innenkante sitzt an der Spielfeldkante, Breite ist widthShare.
const WALL_INNER = 1 - BALANCE.walls.laneShare
const WALL_OUTER = WALL_INNER + BALANCE.walls.widthShare

// Genau die Formation, die Crowd.setSize baut.
function offsetsFor(team: number): number[] {
  return computeFormation(team, {
    rowSpacingY: BALANCE.crowd.rowSpacingY,
    colSpacing: BALANCE.crowd.colSpacing,
    minColSpacing: BALANCE.crowd.minColSpacing,
    maxWidth: W * BALANCE.crowd.maxWidthRatio,
    maxDepth: H - anchorY - FIGURE_H / 2 - BALANCE.crowd.bottomMargin,
  }).map((slot) => slot.offsetX)
}

function anchorAtWall(team: number, overlap = overlapPx): number {
  const halfFormation = offsetsFor(team).reduce((widest, off) => Math.max(widest, Math.abs(off)), 0)
  return W / 2 + getDriveLimitHalfWidth(W, H, anchorY, true, halfFormation, inset, overlap)
}

function shooterLaneRatios(team: number, anchorX: number): number[] {
  return offsetsFor(team).map((off) => getLaneRatio(W, H, anchorX + off, anchorY))
}

const TEAM_SIZES = [2, 3, 5, 8] as const

describe('Waende treffen (W4-Korrektur)', () => {
  it('am Korridor gestoppt verfehlt der Senkrechtschuss das Segment neben der Truppe', () => {
    // Der urspruengliche Defekt (gemessen 390 x 844, y=714): Der Fahrbereich endete eine
    // Figurenbreite VOR der Wandinnenkante, also auf Spuranteil 0,519 statt 0,660. Weil
    // die Strasse sich nach oben verjuengt, kam die senkrechte Kugel erst weit oberhalb
    // der Truppe in die Wandzone — das Segment direkt daneben blieb unerreichbar.
    const oldLimitX = W / 2 + WALL_INNER * getRoadHalfWidth(W, H, anchorY) - inset
    expect(getLaneRatio(W, H, oldLimitX, anchorY)).toBeLessThan(WALL_INNER)

    let firstHitY: number | null = null
    for (let y = anchorY; y >= BALANCE.road.horizonY; y -= 1) {
      if (getLaneRatio(W, H, oldLimitX, y) >= WALL_INNER) {
        firstHitY = y
        break
      }
    }
    expect(firstHitY).not.toBeNull()
    expect(firstHitY as number).toBeLessThan(anchorY - 150)
  })

  it('spurtreue Kugeln halten ihren Spuranteil ueber die ganze Flugbahn', () => {
    // Der Kern des Fixes: laneRatio ist die Erhaltungsgroesse. Wer in der Wandzone
    // abfeuert, bleibt bis zum Horizont darin — unabhaengig von der Perspektive.
    expect(BALANCE.projectile.laneFollow).toBe(1)
    const startX = anchorAtWall(2)
    const startRatio = getLaneRatio(W, H, startX, anchorY)
    for (let y = anchorY; y >= BALANCE.road.horizonY; y -= 10) {
      // Spurtreue Bahn: x(y) = Mitte + laneRatio x roadHalf(y) — genau wie in weapons.ts.
      const x = W / 2 + startRatio * getRoadHalfWidth(W, H, y)
      const ratio = getLaneRatio(W, H, x, y)
      expect(ratio, `y ${y}`).toBeGreaterThanOrEqual(WALL_INNER)
      expect(ratio, `y ${y}`).toBeLessThanOrEqual(WALL_OUTER)
    }
  })

  it('an die Wand gedrueckt feuert die GANZE Formation in die Wandzone', () => {
    for (const team of TEAM_SIZES) {
      const ratios = shooterLaneRatios(team, anchorAtWall(team))
      for (const ratio of ratios) {
        expect(ratio, `team ${team}`).toBeGreaterThanOrEqual(WALL_INNER)
        expect(ratio, `team ${team}`).toBeLessThanOrEqual(WALL_OUTER)
      }
    }
  })

  it('ohne den Ueberstand verfehlt die Startformation die Wand komplett', () => {
    // Begruendet driveIntoWallFigures: Team 2 steht komplett in der Mittelspur (halbe
    // Formationsbreite 0), der Anker endet ohne Ueberstand exakt auf der Innenkante.
    const ratios = shooterLaneRatios(2, anchorAtWall(2, 0))
    expect(ratios.every((ratio) => ratio >= WALL_INNER)).toBe(false)
  })

  it('der Fahrbereich schiebt den Anker nie ueber die Strassenkante', () => {
    for (const team of [...TEAM_SIZES, 12, 20, BALANCE.crowd.max]) {
      expect(getLaneRatio(W, H, anchorAtWall(team), anchorY), `team ${team}`).toBeLessThanOrEqual(1)
    }
  })

  it('ein Wandsegment faellt an der Wand innerhalb des Fokus-Deckels', () => {
    // Nach dem Treffer-Fix feuert die ganze Formation in die Wandzone, also gilt die
    // volle Feuerkraft. Die Zeit je Segment muss dann im Korridor minFocusSec..
    // maxFocusSec liegen (Rundung auf ganze HP erlaubt einen kleinen Aufschlag).
    for (const team of TEAM_SIZES) {
      const plan = getWallPlan(1, team, 'normal', 1, 3)
      const ratios = shooterLaneRatios(team, anchorAtWall(team))
      const hitting = ratios.filter((ratio) => ratio >= WALL_INNER && ratio <= WALL_OUTER).length
      expect(hitting, `team ${team}`).toBe(ratios.length)
      const focusSec = plan.maxHp / plan.referenceDps
      expect(focusSec, `team ${team}`).toBeGreaterThanOrEqual(BALANCE.wallHardness.minFocusSec)
      expect(focusSec, `team ${team}`).toBeLessThanOrEqual(BALANCE.wallHardness.maxFocusSec * 1.2)
    }
  })

  it('die Strasse verjuengt sich nach oben — sonst gaebe es das Problem nicht', () => {
    // Absicherung der Ursache: waere die Strasse ein Rechteck, traefe auch der
    // Senkrechtschuss. Faellt topWidthRatio je auf bottomWidthRatio, ist laneFollow tot.
    expect(getRoadHalfWidth(W, H, BALANCE.road.horizonY)).toBeLessThan(getRoadHalfWidth(W, H, H))
  })
})
