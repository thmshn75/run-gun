import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getWallPlan } from '../src/systems/wallPlan'
import { getCombatFirepower } from '../src/systems/bossPlan'
import { getFigureOverscanFactor, getPerspectiveScale, getPlayfieldHalfWidth, getRoadHalfWidth, getWallGeometry } from '../src/systems/roadGeometry'
import { chooseSpawnLane } from '../src/systems/spawnLanes'
import type { WeaponKey } from '../src/systems/weapons'
import { RunStats, getGateGrowth } from '../src/systems/upgrades'

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
        // Wie im Spawner: Der Randabstand bekommt den Perspektiv-Aufschlag mit, weil
        // eine Figur weiter oben breiter ist als ihr Platz auf Kampfhoehe.
        const lane = chooseSpawnLane(
          [], { ...type, y: BALANCE.road.horizonY }, playfieldHalfAnchor, rng, BALANCE.enemy.spawnLaneSafetyGap,
          1, type.bodyWidth * getFigureOverscanFactor(width, height),
        )
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
    const weakest = getWallPlan(1, 1, 'normal', 1, 1)
    expect(weakest.maxHp).toBeGreaterThanOrEqual(1)
    const strongest = getWallPlan(12, BALANCE.crowd.max, 'shotgun', BALANCE.stats.damage.capAtLevelTwelve, BALANCE.stats.shotsPerSec.capAtLevelTwelve)
    expect(strongest.maxHp).toBeGreaterThanOrEqual(1)
  })

  it('macht links eine Sammelbahn und rechts eine Wand', () => {
    const source = readFileSync(new URL('../src/systems/walls.ts', import.meta.url), 'utf8')
    // Links ist JEDE Kachel ein Plaettchen - die Kette ist der Reiz, nicht der
    // seltene Treffer. Rechts bleibt die Goodie-Regel mit Garantie nach Nieten.
    expect(source).toContain("if (side === 'left') return bad ? 'drain' : 'pickup'")
    expect(source).toContain('BALANCE.walls.weaponChance')
    expect(BALANCE.walls.weaponChance).toBeGreaterThan(0.03)
    expect(BALANCE.walls.weaponChance).toBeLessThan(0.2)
  })

  it('laesst Sammelplaettchen durchfahren statt beschiessen', () => {
    const source = readFileSync(new URL('../src/systems/walls.ts', import.meta.url), 'utf8')
    const scene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
    // Kugeln gehen wirkungslos durch - sonst schoesse man sich die eigene
    // Verstaerkung weg, bevor man sie einsammeln kann.
    expect(source).toContain('if (isPickup(pair)) return false')
    // Und sie bremsen die Truppe nicht: Wer einsammeln soll, muss hineinfahren duerfen.
    expect(source).toContain('if (isPickup(pair)) continue')
    // Eingeloest wird durch Beruehrung der Truppenhuelle.
    expect(scene).toContain('this.walls.isPickupSegment(target)')
    expect(scene).toContain('this.walls.collectPickup(')
  })

  it('laesst den Truppenzaehler ueber die sichtbaren Figuren hinaus weiterlaufen', () => {
    // Ohne Reserve verpufft jedes Plaettchen ab crowd.max - und dort steht der
    // Spieler nach wenigen Sammelbahnen.
    expect(BALANCE.stats.hp.capAtLevelTwelve).toBeGreaterThan(BALANCE.crowd.max)
    // Der Zuwachs bleibt bei 1: viele kleine Quittungen statt weniger grosser.
    expect(BALANCE.walls.pickupTeamGain).toBe(1)
  })

  it('zeigt den Wandinhalt vor der deckenden Wand, einsammelbar erst nach dem Bruch', () => {
    const source = readFileSync(new URL('../src/systems/walls.ts', import.meta.url), 'utf8')
    const bootSource = readFileSync(new URL('../src/scenes/BootScene.ts', import.meta.url), 'utf8')
    // Deckend statt halbtransparent (Thomas 2026-08-22).
    expect(BALANCE.walls.fillAlpha).toBe(1)
    // Damit MUSS der Inhalt vor der Wand liegen - dahinter waere er unsichtbar.
    expect(BALANCE.layers.wallContent).toBeGreaterThan(BALANCE.layers.gameplay)
    // Deckkraft, runde Ecken und die 3D-Flaechen stecken in der gebackenen Textur; die
    // Wand selbst setzt keine Fuellfarbe mehr (das hatte die Transparenz einmal still
    // zerstoert). Der Koerperverlauf muss weiter an fillAlpha haengen.
    expect(bootSource).toContain('t * block.bodyDarkenAtBottom), BALANCE.walls.fillAlpha)')
    // Quader statt Aufkleber (Thomas 2026-08-22: "wirken wie Platzhalter - gehoeren auch
    // wie 3d Optik"): Deckflaeche, Sockel und die beiden Seitenkanten muessen alle drei
    // in der Textur liegen, sonst ist es wieder ein flaches Rechteck.
    expect(bootSource).toContain('block.topFaceLighten')
    expect(bootSource).toContain('block.baseDarken')
    expect(bootSource).toContain('block.edgeLighten')
    expect(bootSource).toContain('block.sideDarken')
    // Runde Ecken sitzen jetzt an der Deckflaeche, die den Kachelkopf bildet.
    expect(bootSource).toContain('fillRoundedRect(0, 0, 128, deckel + block.cornerRadius, block.cornerRadius)')
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
    const source = readFileSync(new URL('../src/systems/walls.ts', import.meta.url), 'utf8')
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
    const pickupPos = scene.indexOf('this.walls.isPickupSegment(target)')
    const wallPos = scene.indexOf('if (this.walls.isWall(target)) return')
    const gegnerPos = scene.indexOf('this.handlePlayerHit(enemyImage)')
    expect(wallPos).toBeGreaterThan(-1)
    // Die Wandpruefung muss VOR der Gegnerbehandlung stehen, sonst wirkt sie nicht.
    expect(wallPos).toBeGreaterThan(pickupPos)
    expect(wallPos).toBeLessThan(gegnerPos)
    // Zweite Sicherung: Ein Objekt ohne Schadenswert ist kein Gegner.
    expect(scene).toContain("typeof contactDamage !== 'number' || !Number.isFinite(contactDamage)")
  })

  it('gibt rechts auf jedem Segment Feuerkraft statt meistens nur Muenzen', () => {
    const source = readFileSync(new URL('../src/systems/walls.ts', import.meta.url), 'utf8')
    // Waffen bleiben selten (grosser Sprung), sonst Schaden oder Feuerrate.
    expect(source).toContain("return this.rng() < 0.5 ? 'damage' : 'rate'")
    // Muenzen fallen bei JEDEM Bruch ab, sie sind Nebeneffekt statt Inhalt.
    expect(source).toContain('this.onBroken(wall.x, wall.y)')
    expect(source).not.toContain("content === 'coin'")
    // DER ZUGEWINN HAENGT AM LEVELSPRUNG, nicht an einer festen Zahl (2026-08-25,
    // Thomas: "man erreicht zu schnell die hoechste Stufe im Level"). Ein Tor bringt den
    // gatesPerLevelStep-ten Teil des Sprungs, den der Deckel je Level macht - damit
    // kostet ein Level auf JEDEM Level gleich viele Tore. Vorher deckte ein einziges Tor
    // ab Level 2 den ganzen Sprung ab, weil der Sprung absolut winzig ist (0,23 Punkte).
    for (const stat of ['damage', 'shotsPerSec'] as const) {
      const { capAtLevelOne, capAtLevelTwelve } = BALANCE.stats[stat]
      const levelSprung = (capAtLevelTwelve / capAtLevelOne) ** (1 / (BALANCE.level.plans.length - 1))
      expect(getGateGrowth(stat) ** BALANCE.walls.gatesPerLevelStep, stat).toBeCloseTo(levelSprung, 6)
    }
    // Und er muss GROSS GENUG FUER DIE ANZEIGE bleiben: Das HUD zeigt zwei
    // Nachkommastellen, ein Tor darf also nicht unter 0,005 bewegen - sonst steht die
    // Zahl unveraendert da und das Sammeln wirkt folgenlos (der Fehler, an dem im Juli
    // der Ausbau des Run-Shops gescheitert ist).
    const kleinsterSchritt = BALANCE.stats.damage.capAtLevelOne * (getGateGrowth('damage') - 1)
    expect(kleinsterSchritt).toBeGreaterThan(0.005)
  })

  it('laesst den Zugewinn eines Tores tatsaechlich durch die Wertestufung', () => {
    // DER FEHLER, den dieser Test faengt (2026-08-25): clampStat rundet Schaden und Rate
    // auf eine feste Stufe. Solange die eine Nachkommastelle war, betrug die kleinste
    // moegliche Aenderung 0,05 - ein Tor hebt aber um 0,0088 bis 0,06, und bei kleinen
    // Werten verschwand der Zugewinn spurlos. Der Wert stand nach dem Einsammeln exakt
    // da wie vorher. Ein Test auf den FAKTOR allein haette das nie gesehen; gepruerft
    // gehoert der Weg durch die Stufung.
    for (const stat of ['damage', 'shotsPerSec'] as const) {
      const stats = new RunStats()
      stats.setLevel(2)
      // Auf dem Grundwert, dem kleinsten im Spiel - dort ist der Zugewinn am kleinsten.
      stats.set(stat, BALANCE.stats[stat].base)
      const vorher = stats.get(stat)
      stats.set(stat, vorher * getGateGrowth(stat))
      expect(stats.get(stat), stat).toBeGreaterThan(vorher)
    }
  })

  it('beschriftet beide Seiten weiss', () => {
    const source = readFileSync(new URL('../src/systems/walls.ts', import.meta.url), 'utf8')
    // Auf deckendem Blau traegt Weiss am besten; die Seite erkennt man an der Kachel.
    expect(source).not.toContain("color: '#3ddc84'")
    expect((source.match(/color: '#ffffff'/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('runs both walls as gapless chains sized by the derived pool', () => {
    const source = readFileSync(new URL('../src/systems/walls.ts', import.meta.url), 'utf8')
    // Kette statt Takt: Nach jeweils einer Segmenthoehe Scroll schliesst das naechste
    // Segment am Horizont an — unabhaengig vom Zustand aelterer Segmente.
    // JE SEITE ein eigener Akkumulator seit 2026-08-24: Die linke Bahn wird mit dem
    // Level dichter (walls.leftLane), und ein gemeinsamer Takt kann nur eine
    // Schrittweite haben.
    expect(source).toContain('this.chainAccumulatorPx[side] += movement')
    expect(source).toContain('while (this.chainAccumulatorPx[side] >= hoehe)')
    // Abschnitts-Muster: Wand-Slots nach isWallSlot, rechts versetzt gestartet.
    expect(source).toContain('isWallSlot(this.slotIndex[side], BALANCE.walls.wallRunLength, BALANCE.walls.wallGapSlots)')
    expect(source).toContain('right: BALANCE.walls.wallRightOffsetSlots')
    // Pool-Herleitung, NEU GERECHNET am 2026-08-24: Die beiden Seiten haben seither
    // unterschiedlich hohe Kacheln, eine gemeinsame Zahl je Seite reicht nicht mehr.
    //
    // LINKS ist die Bahn durchgehend und bei voller Dichte am kuerzesten - dort stehen
    // die meisten Segmente gleichzeitig im Bild. Genau dieser Fall bemisst den Pool;
    // die alte Rechnung ging von 72 px auf beiden Seiten aus und haette den Zuwachs
    // um die Haelfte unterschaetzt.
    const sichtbareStrecke = 844 - BALANCE.road.horizonY
    const kuerzesteLinks = BALANCE.walls.segmentHeightPx / BALANCE.walls.leftLane.densityCap
    const linksSichtbar = Math.ceil(sichtbareStrecke / kuerzesteLinks)
    const cycle = BALANCE.walls.wallRunLength + BALANCE.walls.wallGapSlots
    const rechtsSichtbar = Math.ceil(Math.ceil(sichtbareStrecke / BALANCE.walls.segmentHeightPx) * (BALANCE.walls.wallRunLength / cycle))
    // Je Seite eines mehr fuer das gerade am Horizont anschliessende, plus zwei fuer
    // den Waffen-Reward-Nachlauf.
    expect(BALANCE.pools.walls).toBeGreaterThanOrEqual(linksSichtbar + 1 + rechtsSichtbar + 1 + 2)
  })

  it('preallocates every wall pair once and never creates or destroys in the hot path', () => {
    const source = readFileSync(new URL('../src/systems/walls.ts', import.meta.url), 'utf8')
    expect(source.match(/this\.createPair\(\)/g)).toHaveLength(1)
    expect(source).not.toContain('.destroy(')
    expect(source.indexOf('this.pairs.push(this.createPair())')).toBeLessThan(source.indexOf('public update'))
  })

  it('uses measured run stats for 1.5–2.5 second kills across the full cross product', () => {
    let cases = 0
    for (const level of [1, 6, 12]) {
      // Die frueher hier durchgespielten Shop-Kaufstaende sind mit dem Shop entfallen
      // (2026-08-23); die Werte damage/rate unten decken dieselbe Spanne direkt ab.
      {
        for (const weapon of weaponKeys) {
          for (const teamSize of [2, 3, 6, 12, 20, 30]) {
            for (const damage of [1, 3, 10, 20]) {
              for (const rate of [1, 1.5, 3, 8]) {
                const plan = getWallPlan(level, teamSize, weapon, damage, rate)
                // BEZUG IST DIE WANDWIRKUNG, NICHT DIE TRUPPENFEUERKRAFT (2026-08-26):
                // Auf eine schmale Kachel am Bildrand trifft nur ein Bruchteil der
                // spurtreu nach oben fliegenden Geschosse - gemessen 12 bis 46 % je nach
                // Waffe. Ohne den Anteil galt der Fokus-Deckel gegen eine Wirkung, die es
                // an der Wand nie gab, und eine Kachel kostete ab Level 22 real ueber
                // drei Sekunden statt 0,6.
                const dps = getCombatFirepower(teamSize, weapon, level) * damage * rate
                  * BALANCE.wallHardness.wallHitShare
                const label = `L${level}, ${weapon}, Truppe ${teamSize}, Schaden ${damage}, Rate ${rate}`
                expect(plan.referenceDps, label).toBeCloseTo(dps)
                // Rundung auf GANZE HP: maxHp hat eine Untergrenze von 1, und seit die
                // Kacheln kleiner sind, wiegt diese eine HP bei schwachen Truppen mehr
                // als der halbe Deckel.
                const rundung = 1 / dps
                expect(plan.focusSec, label).toBeGreaterThanOrEqual(BALANCE.wallHardness.minFocusSec - rundung - 1e-9)
                expect(plan.focusSec, label).toBeLessThanOrEqual(BALANCE.wallHardness.maxFocusSec + rundung + 1e-9)
                cases += 1
              }
            }
          }
        }
      }
    }
    expect(cases).toBe(2016)
  })

})

describe('Linke Sammelbahn wird mit dem Level dichter (Thomas 2026-08-24)', () => {
  const dichte = (level: number): number => {
    const { densityAtLevelOne, densityPerLevel, densityCap } = BALANCE.walls.leftLane
    return Math.min(densityCap, densityAtLevelOne + (level - 1) * densityPerLevel)
  }
  const hoeheLinks = (level: number): number => BALANCE.walls.segmentHeightPx / dichte(level)

  it('liefert auf hohen Leveln mehr Plaettchen je Sekunde als auf Level 1', () => {
    // "damit man bei hoeheren Leveln schneller aufladen kann". Auf Level 1 unveraendert,
    // damit der Einstieg bleibt, wie Thomas ihn abgenommen hat.
    expect(hoeheLinks(1)).toBe(BALANCE.walls.segmentHeightPx)
    expect(hoeheLinks(20)).toBeLessThan(hoeheLinks(1))
    expect(hoeheLinks(30)).toBeLessThan(hoeheLinks(20))
  })

  it('steigt in spuerbaren Schritten, nicht schleichend', () => {
    // Thomas' Vorgabe war "alle 2 oder 3 Level ein wenig schneller". Zu klein waere
    // folgenlos, zu gross ein Sprung - beides waere hier zu sehen.
    const proZweiLevel = dichte(3) / dichte(1)
    expect(proZweiLevel).toBeGreaterThan(1.02)
    expect(proZweiLevel).toBeLessThan(1.12)
  })

  it('deckelt die Dichte, bevor die Kachel unlesbar wird', () => {
    // Unter rund 45 px passt die Beschriftung nicht mehr in die Kachel. Der Deckel ist
    // aus dieser Grenze hergeleitet, nicht gewaehlt.
    for (const level of [30, 60, 200]) {
      expect(hoeheLinks(level)).toBeGreaterThanOrEqual(45)
    }
    expect(dichte(200)).toBe(BALANCE.walls.leftLane.densityCap)
  })

  it('laesst die RECHTE Bahn unangetastet', () => {
    // "und nur diese" - rechts stehen die Waffen- und Wertkacheln, die zerschossen
    // werden. Eine dichtere rechte Bahn waere eine Balance-Aenderung, keine Bequemlichkeit.
    expect(BALANCE.walls.segmentHeightPx).toBe(72)
  })
})
