import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getBlockerPlan } from '../src/systems/blockerPlan'
import { getCombatFirepower } from '../src/systems/bossPlan'
import { getPerspectiveScale, getPlayfieldHalfWidth, getRoadHalfWidth, getWallGeometry } from '../src/systems/roadGeometry'
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

  it('never spawns an enemy inside a wall zone over 300 random spawns per type', () => {
    const rng = seededRng(0xE9)
    // Spuren werden seit der perspektivischen Skalierung im Kampfhoehen-System
    // gerechnet - dort haben die Figuren volle Groesse.
    const playfieldHalfAnchor = getPlayfieldHalfWidth(width, height, height - BALANCE.player.anchorBottomOffset)
    for (const type of BALANCE.enemy.types) {
      for (let index = 0; index < 300; index += 1) {
        const lane = chooseSpawnLane([], { ...type, y: BALANCE.road.horizonY }, playfieldHalfAnchor, rng, BALANCE.enemy.spawnLaneSafetyGap)
        expect(lane).not.toBeUndefined()
        for (const y of [BALANCE.road.horizonY, 430, height]) {
          // Mit der SKALIERTEN Breite rechnen: Ein Gegner am Horizont ist dort
          // schmaler dargestellt, seine volle Breite waere die falsche Groesse.
          const halbeBreite = (type.bodyWidth * getPerspectiveScale(width, height, y)) / 2
          const edge = Math.abs(lane!) * getPlayfieldHalfWidth(width, height, y) + halbeBreite
          expect(edge).toBeLessThanOrEqual(getPlayfieldHalfWidth(width, height, y) + 1e-9)
        }
      }
    }
  })

  it('derives wall hp from level and team, never rounding it to zero', () => {
    const weakest = getBlockerPlan(1, 1, 'normal', 1, 1)
    expect(weakest.maxHp).toBeGreaterThanOrEqual(1)
    const strongest = getBlockerPlan(12, BALANCE.crowd.max, 'shotgun', BALANCE.stats.damage.cap, BALANCE.stats.shotsPerSec.cap)
    expect(strongest.maxHp).toBeGreaterThanOrEqual(1)
  })

  it('macht links eine Sammelbahn und rechts eine Wand', () => {
    const source = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    // Links ist JEDE Kachel ein Plaettchen - die Kette ist der Reiz, nicht der
    // seltene Treffer. Rechts bleibt die Goodie-Regel mit Garantie nach Nieten.
    expect(source).toContain("if (side === 'left') return bad ? 'drain' : 'pickup'")
    expect(source).toContain('BALANCE.walls.weaponChance')
    expect(BALANCE.walls.weaponChance).toBeGreaterThan(0.03)
    expect(BALANCE.walls.weaponChance).toBeLessThan(0.2)
  })

  it('laesst Sammelplaettchen durchfahren statt beschiessen', () => {
    const source = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    const scene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
    // Kugeln gehen wirkungslos durch - sonst schoesse man sich die eigene
    // Verstaerkung weg, bevor man sie einsammeln kann.
    expect(source).toContain('if (isPickup(pair)) return false')
    // Und sie bremsen die Truppe nicht: Wer einsammeln soll, muss hineinfahren duerfen.
    expect(source).toContain('if (isPickup(pair)) continue')
    // Eingeloest wird durch Beruehrung der Truppenhuelle.
    expect(scene).toContain('this.blockers.isPickupSegment(target)')
    expect(scene).toContain('this.blockers.collectPickup(')
  })

  it('laesst den Truppenzaehler ueber die sichtbaren Figuren hinaus weiterlaufen', () => {
    // Ohne Reserve verpufft jedes Plaettchen ab crowd.max - und dort steht der
    // Spieler nach wenigen Sammelbahnen.
    expect(BALANCE.stats.hp.cap).toBeGreaterThan(BALANCE.crowd.max)
    // Der Zuwachs bleibt bei 1: viele kleine Quittungen statt weniger grosser.
    expect(BALANCE.walls.pickupTeamGain).toBe(1)
  })

  it('zeigt den Wandinhalt vor der deckenden Wand, einsammelbar erst nach dem Bruch', () => {
    const source = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    const bootSource = readFileSync(new URL('../src/scenes/BootScene.ts', import.meta.url), 'utf8')
    // Deckend statt halbtransparent (Thomas 2026-08-22).
    expect(BALANCE.walls.fillAlpha).toBe(1)
    // Damit MUSS der Inhalt vor der Wand liegen - dahinter waere er unsichtbar.
    expect(BALANCE.layers.wallContent).toBeGreaterThan(BALANCE.layers.gameplay)
    // Deckkraft und runde Ecken stecken in der gebackenen Textur; die Wand selbst
    // setzt keine Fuellfarbe mehr (das hatte die Transparenz einmal still zerstoert).
    expect(bootSource).toContain('fillStyle(seite.fill, BALANCE.walls.fillAlpha)')
    expect(bootSource).toContain('fillRoundedRect(0, 0, 128, BALANCE.walls.segmentHeightPx, 10)')
    // Zwei Texturen, damit die Seiten auf einen Blick auseinandergehen.
    expect(bootSource).toContain("key: 'wall-segment-left'")
    expect(bootSource).toContain("key: 'wall-segment-right'")
    expect(bootSource).toContain("key: 'wall-segment-bad'")
    expect(source).toContain("isBad(content) ? 'wall-segment-bad' : side === 'left' ? 'wall-segment-left' : 'wall-segment-right'")
    expect(source).not.toContain('setFillStyle')
    // Die Waffe ist ab Spawn sichtbar, aber ohne Body …
    expect(source).toContain('setTexture(`weapon-${pair.weapon}-gate`)')
    expect(source).toContain('.setActive(false).setVisible(true)')
    // … und wird erst nach dem Zerschiessen einsammelbar.
    expect(source).toContain('pair.reward.enableBody(true')
  })

  it('laesst die Sammelbahn links durchgehen und behaelt rechts die Abschnitte', () => {
    const source = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    // Links kein isWallSlot mehr: kein Hindernis, also keine Ausweichluecke noetig.
    expect(source).toContain("side === 'left'\n          || isWallSlot(")
    // Rechts bleiben die Abschnitte, dort muss die Truppe ausweichen koennen.
    expect(BALANCE.walls.wallGapSlots).toBeGreaterThan(0)
    expect(BALANCE.walls.wallRunLength).toBeGreaterThan(0)
  })

  it('verrechnet eine beruehrte Wand nie als Gegner', () => {
    // Regression (Thomas 2026-08-22): Seit die Truppenhuelle gegen die ganze
    // Wandgruppe prueft (fuer die Sammelbahn), fiel eine beruehrte rechte Wand bis
    // zur Gegnerbehandlung durch. Sie hat kein contactDamage - der Trupp wurde auf
    // NaN gesetzt und verschwand komplett. Gemessen: 20 Figuren -> null.
    const scene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
    const pickupPos = scene.indexOf('this.blockers.isPickupSegment(target)')
    const blockerPos = scene.indexOf('if (this.blockers.isBlocker(target)) return')
    const gegnerPos = scene.indexOf('this.handlePlayerHit(enemyImage)')
    expect(blockerPos).toBeGreaterThan(-1)
    // Die Wandpruefung muss VOR der Gegnerbehandlung stehen, sonst wirkt sie nicht.
    expect(blockerPos).toBeGreaterThan(pickupPos)
    expect(blockerPos).toBeLessThan(gegnerPos)
    // Zweite Sicherung: Ein Objekt ohne Schadenswert ist kein Gegner.
    expect(scene).toContain("typeof contactDamage !== 'number' || !Number.isFinite(contactDamage)")
  })

  it('gibt rechts auf jedem Segment Feuerkraft statt meistens nur Muenzen', () => {
    const source = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    // Waffen bleiben selten (grosser Sprung), sonst Schaden oder Feuerrate.
    expect(source).toContain("return this.rng() < 0.5 ? 'damage' : 'rate'")
    // Muenzen fallen bei JEDEM Bruch ab, sie sind Nebeneffekt statt Inhalt.
    expect(source).toContain('this.onBroken(blocker.x, blocker.y)')
    expect(source).not.toContain("content === 'coin'")
    // Die Zugewinne sind aus dem Gegenstueck links hergeleitet: 3,3 % der Spanne.
    const anteilLinks = BALANCE.walls.pickupTeamGain / BALANCE.crowd.max
    const spanneSchaden = BALANCE.stats.damage.cap - BALANCE.stats.damage.base
    const spanneRate = BALANCE.stats.shotsPerSec.cap - BALANCE.stats.shotsPerSec.base
    expect(BALANCE.walls.damageGain).toBeCloseTo(anteilLinks * spanneSchaden, 0)
    expect(BALANCE.walls.rateGain).toBeCloseTo(anteilLinks * spanneRate, 1)
  })

  it('beschriftet beide Seiten weiss', () => {
    const source = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    // Auf deckendem Blau traegt Weiss am besten; die Seite erkennt man an der Kachel.
    expect(source).not.toContain("color: '#3ddc84'")
    expect((source.match(/color: '#ffffff'/g) ?? []).length).toBeGreaterThanOrEqual(2)
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
                const plan = getBlockerPlan(level, teamSize, weapon, damage, rate)
                const dps = getCombatFirepower(teamSize, weapon) * damage * rate
                const label = `L${level}, damage upgrade ${purchaseState.damage}, rate upgrade ${purchaseState.rate}`
                expect(plan.referenceDps, label).toBeCloseTo(dps)
                // Rundung auf ganze HP verschiebt die Fokuszeit um bis zu einer halben HP.
                const rundung = 0.5 / dps
                expect(plan.focusSec, label).toBeGreaterThanOrEqual(BALANCE.blockers.minFocusSec - rundung - 1e-9)
                expect(plan.focusSec, label).toBeLessThanOrEqual(BALANCE.blockers.maxFocusSec + rundung + 1e-9)
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
