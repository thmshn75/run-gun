import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { chooseEnemyType } from '../src/systems/enemyTypes'
import { getLevelPlan } from '../src/systems/levelPlan'

describe('level plans', () => {
  it('provides the calm level-one plan and the dense level-twelve plan', () => {
    const levelOne = getLevelPlan(1)
    const levelTwelve = getLevelPlan(12)

    expect(levelOne).toMatchObject({ designLevel: 1, normalPhaseSec: 75 })
    expect(levelTwelve).toMatchObject({ designLevel: 12 })
    // Eigenschaft statt fester Zahlen: Die Gewichte sind am 2026-08-23 neu gesetzt
    // worden, als die wedge-Sonderregel in spawner.getSquadTypes entfiel (bis dahin
    // bestanden Keile immer nur aus leichten Gegnern, die Gewichte galten also gar
    // nicht fuer die Hordenmasse). Ein Test auf die exakten Zahlen haette diesen
    // Umbau nur blockiert, ohne etwas zu sichern.
    expect(levelOne.enemyWeights[0]).toBeGreaterThan(levelTwelve.enemyWeights[0])
    expect(levelOne.enemyWeights[2]).toBe(0)
    expect(levelTwelve.enemyWeights[2]).toBeGreaterThan(0)
    expect(levelTwelve.squadChance).toBeGreaterThan(levelOne.squadChance)
    // W3: Horden sind die Kernmechanik und existieren ab Level 1.
    expect(levelOne.squadChance).toBeGreaterThan(0)
    expect(levelOne.squads.length).toBeGreaterThan(0)
  })

  it('repeats the level-one design at levels 13 and 25 while increasing hardness', () => {
    const levelOne = getLevelPlan(1)
    const levelThirteen = getLevelPlan(13)
    const levelTwentyFive = getLevelPlan(25)

    expect(levelThirteen.designLevel).toBe(1)
    expect(levelTwentyFive.designLevel).toBe(1)
    expect(levelThirteen.enemyWeights).toEqual(levelOne.enemyWeights)
    expect(levelTwentyFive.normalPhaseSec).toBe(levelOne.normalPhaseSec)
    expect(levelThirteen.hardness).toBeGreaterThan(levelOne.hardness)
    expect(levelTwentyFive.hardness).toBeGreaterThan(levelThirteen.hardness)
    expect(levelThirteen.spawnIntervalMs).toBeLessThan(levelOne.spawnIntervalMs)
  })

  it('caps hardness and keeps the heavy level mixture reachable without clock waves', () => {
    for (const level of [1, 12, 13, 25, 40, 400]) expect(getLevelPlan(level).hardness).toBeLessThanOrEqual(BALANCE.level.hardness.max)

    // Der schwere Gegner muss in den oberen Leveln erreichbar bleiben - sonst gibt es
    // ihn im Spiel praktisch nicht. Die Schwelle ist bewusst niedrig (der hoechste
    // Anteil liegt seit 2026-08-23 bei 20 % statt 50 %): Die Gewichte gelten seither
    // fuer ALLE Horden, nicht mehr nur fuer Einzelgegner, ein gleich hoher Anteil
    // waere also viermal so viel Masse gewesen.
    const heavyPlan = Array.from({ length: 12 }, (_value, index) => getLevelPlan(index + 1)).find((plan) => plan.enemyWeights[2] >= 15)
    expect(heavyPlan).toBeDefined()
    expect(chooseEnemyType(heavyPlan!.enemyWeights, () => 0.99).key).toBe('heavy')
    expect('waves' in BALANCE.enemy).toBe(false)
  })

  it('keeps bosses alone through level four, then ramps companion limits to four', () => {
    expect([1, 2, 3, 4].map((level) => getLevelPlan(level).companionLimit)).toEqual([0, 0, 0, 0])
    expect([5, 6, 7, 8, 9, 10, 11, 12].map((level) => getLevelPlan(level).companionLimit)).toEqual([1, 1, 2, 2, 3, 3, 4, 4])
  })

})
