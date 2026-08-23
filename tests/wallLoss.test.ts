import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getCrowdDamageMultiplier } from '../src/systems/crowdDamage'
import { getLevelPlan, getMaxSquadSize } from '../src/systems/levelPlan'

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

  it('laesst blindes Durchfahren links nicht vorankommen', () => {
    // Auf vier Kacheln kommen im Erwartungswert drei blaue und eine rote. Wer nicht
    // ausweicht, darf daraus keinen Fortschritt ziehen - sonst spielt sich die Bahn von
    // selbst. 2026-08-23 von "muss bestrafen" auf "darf nicht belohnen" geaendert:
    // Gemessen kostete Dauerfahrt an der Bahn 19 Figuren in 15 s, waehrend sie
    // eigentlich die Quelle fuer Masse sein soll. Der Anreiz liegt jetzt im Ausweichen
    // (+1 je Kachel), nicht in der Strafe.
    const gewinnJeVierKacheln = 3 * BALANCE.walls.pickupTeamGain
    expect(BALANCE.walls.drainTeam).toBeGreaterThanOrEqual(gewinnJeVierKacheln)
    // Aber nicht so stark, dass eine einzige Kachel eine ausgewachsene Truppe halbiert.
    expect(BALANCE.walls.drainTeam).toBeLessThan(BALANCE.crowd.max / 4)
  })

  it('verlangt zum Sammeln echtes Hineinfahren, nicht blosses Streifen', () => {
    // Sonst loest man beim Kaempfen am linken Rand zwangslaeufig auch die roten Kacheln
    // ein (Thomas 2026-08-23: "da verliere ich immer Team"). Gemessen war es ein harter
    // Schalter: bis 60 px links der Mitte gar nichts, ab 80 px alles.
    expect(BALANCE.walls.pickupOverlapFigures).toBeGreaterThan(0)
    // Die Truppe muss mindestens zur Haelfte in der Bahn stehen ...
    expect(BALANCE.walls.pickupOverlapFigures).toBeGreaterThanOrEqual(BALANCE.crowd.hullWidthFigures / 2)
    // ... aber nie mehr als ganz, sonst waere Sammeln unmoeglich.
    expect(BALANCE.walls.pickupOverlapFigures).toBeLessThanOrEqual(BALANCE.crowd.hullWidthFigures)
  })

  it('schont das erste Level und verbietet zwei rote Kacheln in Folge', () => {
    // Level 1 startet mit stats.hp.base Figuren - eine rote Kachel waere dort das Ende,
    // bevor die Regel gelesen ist. (Bis 2026-08-23 stand hier crowd.start; das Feld war
    // toter Code und nannte einen anderen Wert als den tatsaechlichen Startwert.)
    expect(BALANCE.walls.badMinLevel).toBeGreaterThan(1)
    expect(BALANCE.walls.drainTeam).toBeGreaterThanOrEqual(BALANCE.stats.hp.base)
    // Zwei rote hintereinander waeren links eine Sperre und rechts ein toter Abschnitt.
    expect(BALANCE.walls.badMaxRun).toBe(1)
  })

  it('laesst rote Kacheln weder abschiessen noch Muenzen abwerfen', () => {
    const source = readFileSync(new URL('../src/systems/walls.ts', import.meta.url), 'utf8')
    // Links unbeschiessbar: sonst raeumte man sie weg statt auszuweichen.
    expect(source).toContain("pair.content === 'pickup' || pair.content === 'drain'")
    // Rechts ohne Muenzen: sonst waere Draufhalten trotz Abzug noch belohnt.
    expect(source).toContain('if (!isBad(pair.content)) this.onBroken(wall.x, wall.y)')
  })

  it('deckelt den Verlust am Run-Startwert, damit gekaufte Ausbauten sicher sind', () => {
    const scene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
    expect(scene).toContain('this.statFloor = {')
    expect(scene).toContain('Math.max(this.statFloor[key], before + gain)')
  })

  it('laesst die Truppen-Reserve mit dem Level wachsen, statt sie fest zu deckeln', () => {
    // Ohne Deckel war ein Gegnertreffer folgenlos (Befund 2026-08-22) - deshalb gibt es
    // ueberhaupt eine Obergrenze. Sie ist seit 2026-08-23 aber nicht mehr fest (Thomas:
    // "das Maximum an Team koennte man von Level zu Level anheben"): Sie war als einzige
    // der vier Ausbaugroessen ueber alle Level konstant.
    expect(BALANCE.stats.hp.capAtLevelOne).toBeLessThan(BALANCE.stats.hp.capAtLevelTwelve)
    // Level 1 ohne Reserve: Was im Bild steht, ist alles, was man hat.
    expect(BALANCE.stats.hp.capAtLevelOne).toBe(BALANCE.crowd.max)
    // Oben muss die Reserve mehrere rote Kacheln tragen, aber keinen ganzen Run.
    const reserve = BALANCE.stats.hp.capAtLevelTwelve - BALANCE.crowd.max
    expect(reserve).toBeGreaterThan(BALANCE.walls.drainTeam * 4)
    // Obergrenze: nicht mehr rote Kacheln, als in einem Level ueberhaupt vorkommen.
    // 1,875 Kacheln/s x 80 s Levellaenge x 25 % rot = rund 37.
    expect(reserve / BALANCE.walls.drainTeam).toBeLessThan(37)
  })

  it('haelt die Truppengroesse als Ueberlebenszeit, nicht als Feuerkraft', () => {
    // Der Grund, warum die Obergrenze ueberhaupt wachsen DARF: Der Schadensbonus ist
    // separat gedeckelt und mit den sichtbaren Figuren bereits ausgereizt. Waere das
    // nicht so, wuerde jede Reserve die Feuerkraft mit hochziehen.
    const beiSichtbaren = getCrowdDamageMultiplier(BALANCE.crowd.max, 12)
    const beiVollerReserve = getCrowdDamageMultiplier(BALANCE.stats.hp.capAtLevelTwelve, 12)
    expect(beiVollerReserve).toBeCloseTo(beiSichtbaren, 6)
  })
})

describe('groessere Horden', () => {
  it('haelt jede Hordengroesse der Leveltabelle innerhalb der Breitenregel', () => {
    // 'row' kann nicht in die Tiefe wachsen und ist deshalb bei vier gedeckelt;
    // Masse kommt aus 'cluster' und 'wedge'.
    for (let level = 1; level <= 12; level += 1) {
      for (const squad of getLevelPlan(level).squads) {
        expect(squad.size, `Level ${level} ${squad.kind}`).toBeLessThanOrEqual(getMaxSquadSize(level))
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
    const maxSize = BALANCE.level.squads.maxSizeCap
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
    expect(BALANCE.boss.hordePressure.maxActiveCalled).toBe(BALANCE.boss.hordePressure.hordeSizeCap * 2)
  })
})
