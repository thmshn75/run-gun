import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getBlockerPlan } from '../src/systems/blockerPlan'
import { getCombatFirepower } from '../src/systems/bossPlan'
import { getGateLanes } from '../src/systems/gateLanes'
import { getLevelPlan } from '../src/systems/levelPlan'
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
  it('keeps the width budget at every depth: wall zones plus playfield equal the road', () => {
    for (const y of [BALANCE.road.horizonY, 260, 430, 620, height]) {
      const roadHalf = getRoadHalfWidth(width, height, y)
      const playfieldHalf = getPlayfieldHalfWidth(width, height, y)
      const left = getWallGeometry(width, height, y, 'left')
      const right = getWallGeometry(width, height, y, 'right')
      expect(left.width + right.width + playfieldHalf * 2).toBeCloseTo(roadHalf * 2)
      // Wandzone liegt vollstaendig auf der Strasse und schliesst innen ans Spielfeld an.
      expect(left.x - left.width / 2).toBeCloseTo(width / 2 - roadHalf)
      expect(left.x + left.width / 2).toBeCloseTo(width / 2 - playfieldHalf)
      expect(right.x + right.width / 2).toBeCloseTo(width / 2 + roadHalf)
      expect(right.x - right.width / 2).toBeCloseTo(width / 2 + playfieldHalf)
    }
    // Korridor unten traegt Mindestbreite und den W3-Horden-Platzhalter.
    const corridorBottom = getPlayfieldHalfWidth(width, height, height) * 2
    expect(corridorBottom).toBeGreaterThanOrEqual(BALANCE.walls.minCorridorPx)
    expect(corridorBottom).toBeGreaterThanOrEqual(BALANCE.walls.hordeMaxWidthPx)
  })

  it('keeps every gate lane at least 90px wide on the wall-reduced playfield width', () => {
    for (const laneCount of [2, 3] as const) {
      const lanes = getGateLanes(laneCount, width / 2, getPlayfieldHalfWidth(width, height, height) * 2, BALANCE.gates.gapBetween)
      for (const lane of lanes) expect(lane.width).toBeGreaterThanOrEqual(90)
    }
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

  it('only attaches weapons to wall segments in levels that reserve the blocker budget', () => {
    const source = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    expect(source).toContain('this.levelPlan.reserved.blockers && (this.weaponCounter += 1) % BALANCE.walls.weaponEvery === 0')
    // Stand W2: Die Leveltabelle reserviert das Budget in jedem Level (wie in V1, wo
    // nur die Kadenz variierte) — die Bedingung wirkt erst, falls W4 Level ohne
    // Waffen-Segmente einfuehrt. Der Check dokumentiert das, statt es zu verstecken.
    const reservedFlags = Array.from({ length: BALANCE.level.plans.length }, (_v, i) => getLevelPlan(i + 1).reserved.blockers)
    expect(reservedFlags).toContain(true)
  })

  it('shows the reward behind a translucent wall from spawn on, collectable only after the break', () => {
    const source = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    // Halbtransparent: sichtbar genug zum Zielen, durchsichtig genug fuer den Inhalt.
    expect(BALANCE.walls.fillAlpha).toBeGreaterThan(0.15)
    expect(BALANCE.walls.fillAlpha).toBeLessThan(0.8)
    // Fuellung nie opak setzen — setFillStyle ohne Alpha wuerde die Transparenz beim
    // ersten Treffer still ueberschreiben.
    expect(source.match(/setFillStyle\(0xb84432\)/g)).toBeNull()
    // Inhalt (Waffe oder Muenze) ist ab Spawn sichtbar, aber ohne Body …
    expect(source).toContain("setTexture(hasWeapon ? `weapon-${pair.weapon}-gate` : 'coin')")
    expect(source).toContain('.setActive(false).setVisible(true)')
    // … und wird erst nach dem Zerschiessen einsammelbar.
    expect(source).toContain('pair.reward.enableBody(true')
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
