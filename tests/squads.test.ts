import { describe, expect, it } from 'vitest'
import { BALANCE, type SquadKind } from '../src/config/balance'
import { getFigureHeight, getFigureWidth } from '../src/systems/enemyTypes'
import { getLevelPlan } from '../src/systems/levelPlan'
import { getPlayfieldHalfWidth } from '../src/systems/roadGeometry'
import { chooseSpawnLane } from '../src/systems/spawnLanes'
import { computeHordeOffsets, computeSquadOffsets, getSquadWidth } from '../src/systems/squads'

const PHONE_WIDTH = 390
// KAMPFHOEHEN-Masse, nicht Rohmasse der Textur. Seit W7 (2026-08-23) liegen die Sprites
// in doppelter Aufloesung vor, type.bodyWidth ist also ein TEXTURMASS - wer damit gegen
// Abstaende in Spielpixeln prueft, vergleicht zwei Bezugssysteme (genau der Fehler, der
// in spawnSquad den Nachschub lahmgelegt hat). getFigureWidth/-Height rechnen um.
const WIDEST_ENEMY = Math.max(...BALANCE.enemy.types.map((type) => getFigureWidth(type)))
const TALLEST_ENEMY = Math.max(...BALANCE.enemy.types.map((type) => getFigureHeight(type)))

// Bezugssystem seit der perspektivischen Skalierung (2026-08-22): KAMPFHOEHE. Dort
// haben die Figuren volle Groesse und treffen auf die Truppe. Der fruehere Vergleich
// gegen die Strassenbreite am Horizont passt nicht mehr - dort sind die Gegner jetzt
// geschrumpft, und die Offsets werden ohnehin auf Kampfhoehe entworfen.
const ANCHOR_Y = 844 - BALANCE.player.anchorBottomOffset
const ANCHOR_CORRIDOR = getPlayfieldHalfWidth(PHONE_WIDTH, 844, ANCHOR_Y) * 2

function expectNonOverlappingAndInsideRoad(kind: SquadKind, size: number): void {
  // Mit der Breitengrenze aufrufen, wie es der Spawner tut: Eine Formation ohne
  // Platzgrenze zu pruefen sagt nichts ueber die, die im Spiel entsteht.
  const layout = computeHordeOffsets(
    kind, size, BALANCE.level.squads.spacingPx, BALANCE.level.squads.rowSpacingPx,
    WIDEST_ENEMY, Math.min(ANCHOR_CORRIDOR, BALANCE.walls.hordeMaxWidthPx),
  )
  const offsets = layout.offsets
  // 'row' ist die einzige Formation, die bei Enge Mitglieder verliert - alle anderen
  // muessen vollzaehlig ankommen.
  if (kind !== 'row') expect(offsets, `${kind}:${size}`).toHaveLength(size)

  for (const offset of offsets) {
    expect(Math.abs(offset.laneOffset) + WIDEST_ENEMY / 2, `${kind}:${size}`).toBeLessThanOrEqual(ANCHOR_CORRIDOR / 2)
  }
  for (let index = 0; index < offsets.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < offsets.length; otherIndex += 1) {
      const horizontalOverlap = Math.abs(offsets[index].laneOffset - offsets[otherIndex].laneOffset) < WIDEST_ENEMY
      const verticalOverlap = Math.abs(offsets[index].yOffset - offsets[otherIndex].yOffset) < TALLEST_ENEMY
      expect(horizontalOverlap && verticalOverlap).toBe(false)
    }
  }
}

describe('squad geometry', () => {
  it('keeps every squad size reachable through level 500 separate and on the horizon road', () => {
    const reachableSquads = new Map<string, { kind: SquadKind, size: number }>()

    for (let level = 1; level <= 500; level += 1) {
      for (const squad of getLevelPlan(level).squads) {
        reachableSquads.set(`${squad.kind}:${squad.size}`, squad)
      }
    }

    expect(reachableSquads.size).toBeGreaterThan(0)
    for (const { kind, size } of reachableSquads.values()) {
      expectNonOverlappingAndInsideRoad(kind, size)
    }
  })

  it('puts a wedge point in front and makes its rear row wider', () => {
    const wedge = computeSquadOffsets('wedge', 6, BALANCE.level.squads.spacingPx, BALANCE.level.squads.rowSpacingPx)
    expect(wedge[0].yOffset).toBeGreaterThan(wedge[1].yOffset)
    expect(wedge.filter((offset) => offset.yOffset === wedge[wedge.length - 1].yOffset)).toHaveLength(3)
  })
})

describe('horde density rule and centering (W3)', () => {
  const spacing = BALANCE.level.squads.spacingPx
  const rowSpacing = BALANCE.level.squads.rowSpacingPx

  it('waechst in die Tiefe statt zu stauchen, wenn ein Keil zu breit wird', () => {
    // Korrektur 2026-08-22: Vorher wurde erst das Spacing gestaucht und dann die Horde
    // verkleinert. Beides ist unnoetig - eine zu breite Formation kann schlicht mehr
    // Reihen bilden. Alle acht kommen an, mit vollem Abstand.
    const light = BALANCE.enemy.types.find((type) => type.key === 'light')!
    const layout = computeHordeOffsets('wedge', 8, spacing, rowSpacing, getFigureWidth(light), 92)
    expect(layout.size).toBe(8)
    expect(layout.spacing).toBe(spacing)
    expect(getSquadWidth(layout.offsets, getFigureWidth(light))).toBeLessThanOrEqual(92 + 1e-9)
    // Und zwar in mehr Reihen, als der ungebremste Keil gebraucht haette (1+2+3+2).
    const reihen = new Set(layout.offsets.map((offset) => offset.yOffset))
    expect(reihen.size).toBeGreaterThan(4)
  })

  it('keeps squeezed formations overlap-free within a row', () => {
    const light = BALANCE.enemy.types.find((type) => type.key === 'light')!
    const layout = computeHordeOffsets('row', 4, spacing, rowSpacing, getFigureWidth(light), 92)
    const sameRow = layout.offsets.filter((offset) => offset.yOffset === layout.offsets[0].yOffset)
    for (let index = 1; index < sameRow.length; index += 1) {
      expect(Math.abs(sameRow[index].laneOffset - sameRow[index - 1].laneOffset)).toBeGreaterThanOrEqual(getFigureWidth(light))
    }
  })

  it('kuerzt nur die Reihe, die nicht in die Tiefe ausweichen kann', () => {
    // 'row' ist per Definition einreihig - sie ist die einzige Formation, die bei
    // Platzmangel Mitglieder verliert. size meldet dabei die TATSAECHLICHE Zahl.
    const heavy = BALANCE.enemy.types.find((type) => type.key === 'heavy')!
    const layout = computeHordeOffsets('row', 4, spacing, rowSpacing, heavy.bodyWidth, 92)
    expect(layout.size).toBeLessThan(4)
    expect(layout.size).toBe(layout.offsets.length)
    expect(getSquadWidth(layout.offsets, heavy.bodyWidth)).toBeLessThanOrEqual(92 + 1e-9)
    // Ein Cluster derselben Groesse verliert dagegen niemanden.
    const cluster = computeHordeOffsets('cluster', 4, spacing, rowSpacing, heavy.bodyWidth, 92)
    expect(cluster.size).toBe(4)
  })

  it('haelt jede erreichbare Horde auf Kampfhoehe im Budget', () => {
    // Seit der perspektivischen Skalierung wird die Formation direkt in
    // Kampfhoehen-Pixeln entworfen - kein Umrechnen ueber das Horizont-Verhaeltnis mehr.
    const maxWidthAnchor = Math.min(ANCHOR_CORRIDOR, BALANCE.walls.hordeMaxWidthPx)
    for (let level = 1; level <= 24; level += 1) {
      for (const squad of getLevelPlan(level).squads) {
        const layout = computeHordeOffsets(squad.kind, squad.size, spacing, rowSpacing, WIDEST_ENEMY, maxWidthAnchor)
        expect(getSquadWidth(layout.offsets, WIDEST_ENEMY)).toBeLessThanOrEqual(maxWidthAnchor + 1e-9)
      }
    }
    // Das Budget muss auf KAMPFHOEHE passen, nicht erst am unteren Bildrand: Dort
    // trifft die Horde auf die Truppe, und dort ist der Korridor am schmalsten.
    expect(BALANCE.walls.hordeMaxWidthPx).toBeLessThanOrEqual(ANCHOR_CORRIDOR)
    expect(BALANCE.walls.hordeMaxWidthPx).toBeLessThanOrEqual(BALANCE.walls.minCorridorPx)
  })

  it('keeps every spawn centroid inside its middle band over 500 random draws', () => {
    const rng = (() => { let s = 0x77a3 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 } })()
    const playfieldAnchor = getPlayfieldHalfWidth(390, 844, ANCHOR_Y)
    // Erster Fall: eine Horde (Formationsbreite getrennt von der Mitgliedsbreite),
    // zweiter Fall: ein Einzelgegner.
    for (const [band, bodyWidth, formationWidth] of [
      [BALANCE.enemy.spawnBands.hordeLaneShare, WIDEST_ENEMY, 172],
      [BALANCE.enemy.spawnBands.singleLaneShare, 40, 40],
    ] as const) {
      for (let index = 0; index < 500; index += 1) {
        const lane = chooseSpawnLane([], { bodyWidth, bodyHeight: 49, speedFactor: 1, y: BALANCE.road.horizonY }, playfieldAnchor, rng, BALANCE.enemy.spawnLaneSafetyGap, band, formationWidth)
        expect(lane).not.toBeUndefined()
        // Schwerpunkt bleibt im Band — und weil x = lane x playfieldHalf(y) gilt,
        // bleibt er es in JEDER Tiefe (der Anteil ist y-unabhaengig).
        expect(Math.abs(lane!)).toBeLessThanOrEqual(band)
      }
    }
  })
})
