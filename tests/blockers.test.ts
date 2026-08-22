import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getBlockerPlan } from '../src/systems/blockerPlan'
import { getCombatFirepower } from '../src/systems/bossPlan'
import { getGateLanes } from '../src/systems/gateLanes'
import { getPlayfieldHalfWidth, getRoadHalfWidth, getWallGeometry } from '../src/systems/roadGeometry'
import { chooseSpawnLane } from '../src/systems/spawnLanes'
import type { WeaponKey } from '../src/systems/weapons'

const width = 390
const height = 844

const weaponKeys: readonly WeaponKey[] = ['normal', 'shotgun', 'laser', 'rocket', 'minigun', 'flamethrower', 'chainlightning']

function seededRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

describe('walls (W2: Wandsegmente links/rechts)', () => {
  it('keeps the width budget at every depth: inner wall edge on the corridor, overhang only outward', () => {
    // Die sichtbare Wand darf ueber die Strassenkante hinausragen (Thomas 2026-08-22),
    // aber nie in den Korridor: Die Innenkante sitzt exakt an der Spielfeldkante.
    expect(BALANCE.walls.widthShare).toBeGreaterThanOrEqual(BALANCE.walls.laneShare)
    for (const y of [BALANCE.road.horizonY, 260, 430, 620, height]) {
      const roadHalf = getRoadHalfWidth(width, height, y)
      const playfieldHalf = getPlayfieldHalfWidth(width, height, y)
      const left = getWallGeometry(width, height, y, 'left')
      const right = getWallGeometry(width, height, y, 'right')
      expect(left.x + left.width / 2).toBeCloseTo(width / 2 - playfieldHalf)
      expect(right.x - right.width / 2).toBeCloseTo(width / 2 + playfieldHalf)
      // Breite skaliert mit der Strasse und deckt mindestens die reservierte Zone ab.
      expect(left.width).toBeCloseTo(roadHalf * BALANCE.walls.widthShare)
      expect(left.width).toBeGreaterThanOrEqual(roadHalf * BALANCE.walls.laneShare)
      expect(right.width).toBeCloseTo(left.width)
    }
    // Korridor unten traegt Mindestbreite und den W3-Horden-Platzhalter.
    const corridorBottom = getPlayfieldHalfWidth(width, height, height) * 2
    expect(corridorBottom).toBeGreaterThanOrEqual(BALANCE.walls.minCorridorPx)
    expect(corridorBottom).toBeGreaterThanOrEqual(BALANCE.walls.hordeMaxWidthPx)
  })

  it('keeps every gate lane at least 90px wide on the wall-reduced playfield width', () => {
    // Seit dem breiteren Wand-Korridor sind Tore dauerhaft zweispurig (Waffen kommen
    // aus den Waenden, W4-Zielbild "Mitte rechnet, Seiten bewaffnen") — der Spawn-Pfad
    // in gates.ts erzwingt das hart.
    const gatesSource = readFileSync(new URL('../src/systems/gates.ts', import.meta.url), 'utf8')
    expect(gatesSource).toContain('getGateSpawnLayout(\n      2,')
    const lanes = getGateLanes(2, width / 2, getPlayfieldHalfWidth(width, height, height) * 2, BALANCE.gates.gapBetween)
    for (const lane of lanes) expect(lane.width).toBeGreaterThanOrEqual(90)
  })

  it('never spawns an enemy inside a wall zone over 300 random spawns per type', () => {
    const rng = seededRng(0xE9)
    const playfieldHalfTop = getPlayfieldHalfWidth(width, height, BALANCE.road.horizonY)
    for (const type of BALANCE.enemy.types) {
      for (let index = 0; index < 300; index += 1) {
        const lane = chooseSpawnLane([], { ...type, y: BALANCE.road.horizonY }, playfieldHalfTop, height, rng, BALANCE.enemy.spawnLaneSafetyGap)
        expect(lane).not.toBeUndefined()
        for (const y of [BALANCE.road.horizonY, 430, height]) {
          const edge = Math.abs(lane!) * getPlayfieldHalfWidth(width, height, y) + type.bodyWidth / 2
          expect(edge).toBeLessThanOrEqual(getPlayfieldHalfWidth(width, height, y) + 1e-9)
        }
      }
    }
  })

  it('derives wall hp from the blocker firepower plan and never rounds it to zero', () => {
    expect(BALANCE.walls.hpFactor).toBeGreaterThan(0)
    expect(BALANCE.walls.hpFactor).toBeLessThanOrEqual(1)
    const weakest = getBlockerPlan(2, 'normal', 1, 1)
    expect(Math.max(1, Math.round(weakest.maxHp * BALANCE.walls.hpFactor))).toBeGreaterThanOrEqual(1)
    expect(Math.round(weakest.maxHp * BALANCE.walls.hpFactor)).toBeGreaterThanOrEqual(1)
  })

  it('assigns reinforcements to the left wall and weapons to the right, at playable chances', () => {
    const source = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    expect(source).toContain("side === 'left' ? 'reinforce' : 'weapon'")
    expect(source).toContain("side === 'left' ? BALANCE.walls.reinforcementChance : BALANCE.walls.weaponChance")
    // Chancen bleiben in einem Rahmen, der Goodies selten genug fuer "unregelmaessig"
    // und haeufig genug fuer den Truppen-Nachschub macht (Kadenz-Test in weapons.test).
    expect(BALANCE.walls.reinforcementChance).toBeGreaterThan(0.05)
    expect(BALANCE.walls.reinforcementChance).toBeLessThan(0.3)
    expect(BALANCE.walls.weaponChance).toBeGreaterThan(0.03)
    expect(BALANCE.walls.weaponChance).toBeLessThan(0.2)
  })

  it('shows the reward behind a translucent rounded wall from spawn on, collectable only after the break', () => {
    const source = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    const bootSource = readFileSync(new URL('../src/scenes/BootScene.ts', import.meta.url), 'utf8')
    // Halbtransparent: sichtbar genug zum Zielen, durchsichtig genug fuer den Inhalt.
    expect(BALANCE.walls.fillAlpha).toBeGreaterThan(0.15)
    expect(BALANCE.walls.fillAlpha).toBeLessThan(0.8)
    // Transparenz und runde Ecken stecken in der gebackenen Textur; die Wand selbst
    // setzt keine Fuellfarbe mehr (das hatte die Transparenz einmal still zerstoert).
    expect(bootSource).toContain('fillStyle(WORLD_COLORS.wallFill, BALANCE.walls.fillAlpha)')
    expect(bootSource).toContain('fillRoundedRect(0, 0, 128, BALANCE.walls.segmentHeightPx, 10)')
    expect(bootSource).toContain("generateTexture('wall-segment'")
    expect(source).toContain("physics.add.image(0, 0, 'wall-segment')")
    expect(source).not.toContain('setFillStyle')
    // Inhalt (Waffe oder Muenze) ist ab Spawn sichtbar, aber ohne Body …
    expect(source).toContain("setTexture(content === 'weapon' ? `weapon-${pair.weapon}-gate` : 'coin')")
    expect(source).toContain('.setActive(false).setVisible(true)')
    // … und wird erst nach dem Zerschiessen einsammelbar.
    expect(source).toContain('pair.reward.enableBody(true')
  })

  it('runs both walls as gapless chains sized by the derived pool', () => {
    const source = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    // Kette statt Takt: Nach jeweils einer Segmenthoehe Scroll schliesst beidseitig das
    // naechste Segment am Horizont an — unabhaengig vom Zustand aelterer Segmente.
    expect(source).toContain('this.chainAccumulatorPx += movement')
    expect(source).toContain('while (this.chainAccumulatorPx >= BALANCE.walls.segmentHeightPx)')
    // Abschnitts-Muster: Wand-Slots nach isWallSlot, rechts versetzt gestartet.
    expect(source).toContain('isWallSlot(this.slotIndex[side], BALANCE.walls.wallRunLength, BALANCE.walls.wallGapSlots)')
    expect(source).toContain('right: BALANCE.walls.wallRightOffsetSlots')
    // Pool-Herleitung: sichtbare Slots je Seite x Wandanteil plus das anschliessende,
    // beidseitig, plus Waffen-Reward-Nachlauf und Reserve.
    const cycle = BALANCE.walls.wallRunLength + BALANCE.walls.wallGapSlots
    const visiblePerSide = Math.ceil(Math.ceil((844 - BALANCE.road.horizonY) / BALANCE.walls.segmentHeightPx) * (BALANCE.walls.wallRunLength / cycle))
    expect(BALANCE.pools.blockers).toBeGreaterThanOrEqual((visiblePerSide + 1) * 2 + 2)
  })

  it('preallocates every wall pair once and never creates or destroys in the hot path', () => {
    const source = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    expect(source.match(/this\.createPair\(\)/g)).toHaveLength(1)
    expect(source).not.toContain('.destroy(')
    expect(source.indexOf('this.pairs.push(this.createPair())')).toBeLessThan(source.indexOf('public update'))
  })

  it('uses measured run stats for 1.5–2.5 second kills across the full cross product', () => {
    let cases = 0
    for (const level of [1, 6, 12]) {
      for (const purchaseState of [
        { damage: 0, rate: 0 },
        { damage: BALANCE.upgradesShop.prices.length, rate: 0 },
        { damage: 0, rate: BALANCE.upgradesShop.prices.length },
        { damage: BALANCE.upgradesShop.prices.length, rate: BALANCE.upgradesShop.prices.length },
      ]) {
        for (const weapon of weaponKeys) {
          for (const teamSize of [2, 3, 6, 12, 20, 30]) {
            for (const damage of [1, 3, 10, 20]) {
              for (const rate of [1, 1.5, 3, 8]) {
                const plan = getBlockerPlan(teamSize, weapon, damage, rate)
                const dps = getCombatFirepower(teamSize, weapon) * damage * rate
                expect(plan.referenceDps, `L${level}, damage upgrade ${purchaseState.damage}, rate upgrade ${purchaseState.rate}`).toBeCloseTo(dps)
                expect(plan.referenceDestroySec).toBeGreaterThanOrEqual(BALANCE.blockers.minDestroySec)
                expect(plan.referenceDestroySec).toBeLessThanOrEqual(BALANCE.blockers.maxDestroySec)
                cases += 1
              }
            }
          }
        }
      }
    }
    expect(cases).toBe(8064)
  })

})
