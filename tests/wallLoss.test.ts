import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getLevelPlan } from '../src/systems/levelPlan'

// Rote Kacheln (Thomas 2026-08-22: "man erreicht schnell das maximum ueberall und
// verliert nie etwas"). Die Tests sichern die BEGRUENDUNG der Werte ab, nicht die
// Werte selbst - wer sie aendert, muss die Herleitung mitaendern.
describe('rote Kacheln: der Verlust in beiden Bahnen', () => {
  it('haelt die Netto-Null-Regel ein: blindes Draufhalten bringt rechts nichts', () => {
    // Auf vier Kacheln kommen im Erwartungswert drei gute und eine rote. ACHTUNG: Nicht
    // (1 - p) / p rechnen - badMaxRun erzwingt nach jeder roten eine blaue, der echte
    // Anteil ist p / (1 + p) und das Verhaeltnis damit 1 / p. Die erste Fassung dieses
    // Tests rechnete ohne die Verduennung und haette 20 % statt 25 % durchgewinkt.
    const roterAnteil = BALANCE.walls.badChance / (1 + BALANCE.walls.badChance)
    expect(roterAnteil).toBeCloseTo(0.25, 2)
    const guteJeRote = (1 - roterAnteil) / roterAnteil
    expect(guteJeRote).toBeCloseTo(3, 2)
    // Rechts muss der Abzug den Zugewinn dieser drei genau aufwiegen: Wer nicht
    // auswaehlt, kommt nicht voran - genau das war der Befund vor dieser Aenderung.
    expect(BALANCE.walls.weakenDamage).toBeCloseTo(guteJeRote * BALANCE.walls.damageGain, 2)
    expect(BALANCE.walls.weakenRate).toBeCloseTo(guteJeRote * BALANCE.walls.rateGain, 2)
  })

  it('macht blindes Durchfahren links zum Minusgeschaeft', () => {
    // Links muss der Abzug STAERKER sein als der Zugewinn der drei blauen, sonst waere
    // Durchfahren weiterhin kostenlos und die Bahn spielte sich von selbst.
    const gewinnJeVierKacheln = 3 * BALANCE.walls.pickupTeamGain
    expect(BALANCE.walls.drainTeam).toBeGreaterThan(gewinnJeVierKacheln)
    // Aber nicht so stark, dass eine einzige Kachel eine ausgewachsene Truppe halbiert.
    expect(BALANCE.walls.drainTeam).toBeLessThan(BALANCE.crowd.max / 4)
  })

  it('schont das erste Level und verbietet zwei rote Kacheln in Folge', () => {
    // Level 1 startet mit crowd.start Figuren - eine rote Kachel waere dort das Ende,
    // bevor die Regel gelesen ist.
    expect(BALANCE.walls.badMinLevel).toBeGreaterThan(1)
    expect(BALANCE.walls.drainTeam).toBeGreaterThanOrEqual(BALANCE.crowd.start)
    // Zwei rote hintereinander waeren links eine Sperre und rechts ein toter Abschnitt.
    expect(BALANCE.walls.badMaxRun).toBe(1)
  })

  it('laesst rote Kacheln weder abschiessen noch Muenzen abwerfen', () => {
    const source = readFileSync(new URL('../src/systems/blockers.ts', import.meta.url), 'utf8')
    // Links unbeschiessbar: sonst raeumte man sie weg statt auszuweichen.
    expect(source).toContain("pair.content === 'pickup' || pair.content === 'drain'")
    // Rechts ohne Muenzen: sonst waere Draufhalten trotz Abzug noch belohnt.
    expect(source).toContain('if (!isBad(pair.content)) this.onBroken(blocker.x, blocker.y)')
  })

  it('deckelt den Verlust am Run-Startwert, damit gekaufte Ausbauten sicher sind', () => {
    const scene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
    expect(scene).toContain('this.statFloor = {')
    expect(scene).toContain('Math.max(this.statFloor[key], before + gain)')
  })

  it('deckelt die Truppen-Reserve auf das Doppelte der sichtbaren Figuren', () => {
    // Ohne Deckel war ein Gegnertreffer folgenlos (Befund 2026-08-22).
    expect(BALANCE.stats.hp.cap).toBe(BALANCE.crowd.max * 2)
    // Die Reserve muss mehrere rote Kacheln tragen, aber keinen ganzen Level.
    expect(BALANCE.stats.hp.cap - BALANCE.crowd.max).toBeGreaterThan(BALANCE.walls.drainTeam * 4)
    expect(BALANCE.stats.hp.cap - BALANCE.crowd.max).toBeLessThan(BALANCE.walls.drainTeam * 12)
  })
})

describe('groessere Horden', () => {
  it('haelt jede Hordengroesse der Leveltabelle innerhalb der Breitenregel', () => {
    // 'row' kann nicht in die Tiefe wachsen und ist deshalb bei vier gedeckelt;
    // Masse kommt aus 'cluster' und 'wedge'.
    for (let level = 1; level <= 12; level += 1) {
      for (const squad of getLevelPlan(level).squads) {
        expect(squad.size, `Level ${level} ${squad.kind}`).toBeLessThanOrEqual(BALANCE.level.squads.maxSize)
        if (squad.kind === 'row') expect(squad.size, `Level ${level} row`).toBeLessThanOrEqual(4)
      }
    }
  })

  it('traegt die groesste Horde im Gegner-Pool, mit Reserve', () => {
    // Verweildauer aus BALANCE hergeleitet statt als Zahl hingeschrieben: Strecke vom
    // Spawn ueber dem Horizont bis unter den Bildrand, geteilt durch das langsamste
    // Tempo. Seit alle Typen gleich schnell sind, gibt es dafuer nur noch EIN Tempo.
    const streckePx = 881
    const verweilSec = streckePx / BALANCE.stats.speed.floor
    const maxSize = BALANCE.level.squads.maxSize
    const pauseSec = (BALANCE.level.squads.pauseBaseMs + maxSize * BALANCE.level.squads.pausePerMemberMs) / 1000
    const spitze = Math.ceil(verweilSec / pauseSec) * maxSize
    expect(BALANCE.pools.enemies).toBeGreaterThan(spitze)
    expect(BALANCE.pools.enemies).toBeLessThan(spitze * 1.5)
    // Und alle Typen laufen wirklich gleich schnell - sonst waere die Rechnung falsch.
    for (const type of BALANCE.enemy.types) expect(type.speedFactor, type.key).toBe(1)
  })

  it('laesst den Boss hoechstens zwei Horden gleichzeitig halten', () => {
    // Mehr waere eine geschlossene Wand, die den Boss vor Beschuss abschirmt - genau
    // der Befund, an dem der erste Entwurf (64) gescheitert ist.
    expect(BALANCE.boss.hordePressure.maxActiveCalled).toBe(BALANCE.level.squads.maxSize * 2)
  })
})
