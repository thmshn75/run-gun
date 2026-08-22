import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getLevelPlan } from '../src/systems/levelPlan'
import {
  canSpawnBossHorde,
  getBossHordeIntervalMs,
  getBossHordeSize,
  getBossPhase,
  getBossPlan,
  getCombatFirepower,
  getMaxFightSec,
  getNormalPhaseEnemiesPerSec,
  getPhaseOneProfile,
  getPhaseTwoProfile,
  getTeamFirepower,
  getWeaponFirepower,
  type BossUpgradeLevels,
} from '../src/systems/bossPlan'

const weaponKeys = ['normal', 'shotgun', 'laser', 'rocket', 'minigun', 'flamethrower', 'chainlightning'] as const
const teamSizes = [2, 3, 6, 12, 20, 30]
const damageValues = [1, 3, 10, 20]
const rateValues = [1, 1.5, 3, 8]
const levels = [1, 6, 12]
const maxUpgradeLevel = BALANCE.upgradesShop.prices.length
const purchaseStates: ReadonlyArray<Readonly<{ name: string; upgrades: BossUpgradeLevels }>> = [
  { name: 'nothing bought', upgrades: { team: 0, damage: 0, rate: 0 } },
  { name: 'damage built', upgrades: { team: 0, damage: maxUpgradeLevel, rate: 0 } },
  { name: 'rate built', upgrades: { team: 0, damage: 0, rate: maxUpgradeLevel } },
  { name: 'fully built', upgrades: { team: maxUpgradeLevel, damage: maxUpgradeLevel, rate: maxUpgradeLevel } },
]

describe('boss plans', () => {
  it('leitet den Hordendruck aus dem Gegnerdruck der Normalphase ab', () => {
    // Der Boss ersetzt den abgeschalteten Normalspawner. Die Bezugsgroesse wird
    // deshalb aus der Leveltabelle nachgerechnet - erwartete Gegner je Ereignis
    // geteilt durch das Intervall am Ende der Rampe.
    // KEINE Formelkopie mehr: Der fruehere Test schrieb die Implementierung ab und
    // haette den Fehler, den er absichern sollte, nie gefunden. Stattdessen die
    // unabhaengige Obergrenze - mehr Gegner je Sekunde als der Spawner mit seiner
    // Nachlaufpause ueberhaupt setzen kann, darf nie herauskommen.
    for (const level of [1, 6, 12]) {
      const plan = getLevelPlan(level)
      const largestSquad = plan.squads.reduce((size, squad) => Math.max(size, squad.size), 1)
      const pauseSec = (BALANCE.level.squads.pauseBaseMs + largestSquad * BALANCE.level.squads.pausePerMemberMs) / 1000
      const spawnerCeiling = Math.max(largestSquad / pauseSec, 1000 / plan.spawnIntervalMinMs)
      expect(getNormalPhaseEnemiesPerSec(level)).toBeLessThanOrEqual(spawnerCeiling)
    }
    // Gerechnet, nicht geraten: Level 1 = 1,46 Gegner/s, Level 12 = 14,55 Gegner/s.
    // Level 12 stieg von 6,11 auf 14,55, weil die Nachlaufpause nach einer Horde von
    // 2.050 auf 810 ms gekuerzt wurde (Thomas: "es sind noch immer zu wenig mobs").
    expect(getNormalPhaseEnemiesPerSec(1)).toBeCloseTo(1.46, 1)
    expect(getNormalPhaseEnemiesPerSec(12)).toBeCloseTo(14.55, 1)
    // Und der Druck steigt ueber die Level, sonst waere die Ableitung sinnlos.
    for (let level = 2; level <= 12; level += 1) {
      expect(getNormalPhaseEnemiesPerSec(level)).toBeGreaterThan(getNormalPhaseEnemiesPerSec(1))
    }
  })

  it('trifft mit dem Ruf-Takt den gewuenschten Anteil am Normaldruck', () => {
    for (const level of [1, 3, 6, 9, 12]) {
      const size = getBossHordeSize(level)
      for (const share of [BALANCE.boss.phaseOne.hordePressureShare, BALANCE.boss.phaseTwo.hordePressureShare]) {
        const intervalMs = getBossHordeIntervalMs(level, share)
        const actualFlow = size / (intervalMs / 1000)
        const wantedFlow = getNormalPhaseEnemiesPerSec(level) * share
        // Genau der Zielfluss - ausser wo die Untergrenze des Takts greift, dann darunter.
        if (intervalMs > BALANCE.boss.hordePressure.minIntervalMs) expect(actualFlow).toBeCloseTo(wantedFlow, 5)
        else expect(actualFlow).toBeLessThanOrEqual(wantedFlow)
      }
    }
    // Phase 2 zieht an: kuerzerer Takt als Phase 1 auf jedem Level.
    for (let level = 1; level <= 12; level += 1) {
      expect(getPhaseTwoProfile(level).hordeIntervalMs).toBeLessThanOrEqual(getPhaseOneProfile(level).hordeIntervalMs)
    }
    // Der Ruf-Takt unterschreitet die Untergrenze nie.
    for (let level = 1; level <= 12; level += 1) {
      expect(getPhaseTwoProfile(level).hordeIntervalMs).toBeGreaterThanOrEqual(BALANCE.boss.hordePressure.minIntervalMs)
    }
  })

  it('ruft nur Horden, die der Gegner-Pool ohne Laufzeit-Erzeugung traegt', () => {
    // Ganze Horde oder gar keine - eine halb gespawnte Horde waere keine Formation.
    const max = BALANCE.boss.hordePressure.maxActiveCalled
    expect(canSpawnBossHorde(max - 8, 8, max)).toBe(true)
    expect(canSpawnBossHorde(max - 7, 8, max)).toBe(false)
    expect(canSpawnBossHorde(max, 1, max)).toBe(false)
    // Der Deckel muss in den Pool passen; im Bosskampf ist der Normalspawner aus.
    expect(max).toBeLessThan(BALANCE.pools.enemies)
    // Und er ist aus der Geometrie hergeleitet: zwei volle Horden, nicht mehr.
    expect(max).toBe(2 * BALANCE.level.squads.maxSize)
    // Und er muss die groesste Horde jedes Levels aufnehmen koennen.
    for (let level = 1; level <= 12; level += 1) {
      expect(getBossHordeSize(level)).toBeLessThanOrEqual(max)
      expect(getBossHordeSize(level)).toBeGreaterThanOrEqual(BALANCE.level.squads.minSize)
    }
  })

  it('feuert nachweislich kein Projektil mehr', () => {
    const bossSource = readFileSync(new URL('../src/systems/boss.ts', import.meta.url), 'utf8')
    const gameSceneSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
    for (const spur of ['projectile', 'Projectile', 'fireBurst', 'burstCount', 'bossBurst']) {
      expect(bossSource, spur).not.toContain(spur)
    }
    expect(gameSceneSource).not.toContain('bossProjectile')
    expect(gameSceneSource).not.toContain('boss.getProjectiles')
  })

  it('keeps team firepower as the unchanged crowd-only measure', () => {
    expect(getTeamFirepower(BALANCE.crowd.max)).toBe(32)
    expect(getTeamFirepower(6)).toBe(6)
    expect(getTeamFirepower(12)).toBeCloseTo(12.48)
  })

  it('uses measured run stats across the complete 8,064-case fight-duration cross product', () => {
    let cases = 0
    for (const purchaseState of purchaseStates) {
      for (const level of levels) {
        for (const weapon of weaponKeys) {
          for (const teamSize of teamSizes) {
            for (const damage of damageValues) {
              for (const rate of rateValues) {
                const plan = getBossPlan(level, purchaseState.upgrades, teamSize, weapon, damage, rate)
                const expectedDps = getCombatFirepower(teamSize, weapon) * damage * rate
                const label = `${purchaseState.name}, L${level}, ${weapon}, team ${teamSize}, damage ${damage}, rate ${rate}`
                expect(plan.referenceDps, label).toBeCloseTo(expectedDps)
                const actualFightSec = plan.maxHp / plan.referenceDps
                // Rounding maxHp by at most 0.5 HP at the minimum 1.12 DPS (laser, team 2, damage/rate 1) deviates by 0.446 s, so allow 0.5 s.
                expect(actualFightSec, label).toBeGreaterThanOrEqual(BALANCE.boss.referenceFirepower.minFightSec - 0.5)
                expect(actualFightSec, label).toBeLessThanOrEqual(getMaxFightSec(level) + 0.5)
                expect(plan.referenceFightSec, label).toBeCloseTo(actualFightSec, 1)
                expect(plan.phaseThresholdHp, label).toBe(plan.maxHp / 2)
                cases += 1
              }
            }
          }
        }
      }
    }
    expect(cases).toBe(8064)
  })

  it('keeps Thomas’s level-one team-3 rocket run within its level-one cap and below the old guessed HP', () => {
    const upgrades = purchaseStates[0].upgrades
    const actual = getBossPlan(1, upgrades, 3, 'rocket', 1, 1)
    const oldGuessedDps = getCombatFirepower(3, 'rocket') * BALANCE.upgradesShop.damage.base * BALANCE.upgradesShop.rate.base
    const oldGuessedFightSec = Math.min(
      BALANCE.boss.referenceFirepower.maxFightSecCap,
      BALANCE.boss.referenceFirepower.fightSecAtMaxTeam
        * (getTeamFirepower(BALANCE.crowd.max) / getTeamFirepower(3)) ** BALANCE.boss.referenceFirepower.teamDampening
        * (1 / getWeaponFirepower('rocket')) ** (1 - BALANCE.boss.referenceFirepower.weaponDampening),
    )
    const oldGuessedHp = Math.round(oldGuessedDps * oldGuessedFightSec)
    expect(actual.referenceFightSec).toBeLessThanOrEqual(getMaxFightSec(1) + 0.5)
    expect(actual.maxHp).toBeLessThan(oldGuessedHp)
  })

  it('keeps the specified dampening values and lets the boss arrive at the end of the fight window', () => {
    const reference = BALANCE.boss.referenceFirepower
    const anchorY = 844 - BALANCE.player.anchorBottomOffset
    const stopY = anchorY - BALANCE.boss.advanceStopBeforeAnchorPx
    const pressureContactSec = BALANCE.boss.pressureDelayMs / 1000 + (stopY - BALANCE.boss.battleY) / BALANCE.boss.advanceSpeed
    expect(reference.fightSecAtMaxTeam).toBe(20)
    // Zielfenster laut plan-v2 ("Boss V2"): 20-40 s auf jedem Level. Die alten Werte
    // (15 / 18) lagen darunter - Level 1 konnte das Fenster konstruktiv nie erreichen.
    expect(reference.minFightSec).toBe(20)
    // Rechnerische Obergrenzen, auf die gemessene Mitte des Fensters gezielt - die
    // Horden fangen Beschuss ab, real weicht es um Faktor 0,78 bis 1,55 ab.
    expect(reference.maxFightSecAtLevelOne).toBe(26)
    expect(reference.maxFightSecPerLevel).toBe(0.545)
    expect(reference.maxFightSecCap).toBe(40)
    expect(reference.teamDampening).toBe(0.41)
    expect(reference.weaponDampening).toBe(0.8)
    expect(reference.statDampening).toBe(0.8)
    // Der Boss wartet nicht mehr, sondern rueckt ab dem ersten Kampfbild vor
    // (Thomas 2026-08-22: "der boss muss langsam auf mich zukommen").
    expect(BALANCE.boss.pressureDelayMs).toBe(0)
    expect(BALANCE.boss.advanceSpeed).toBe(8.35)
    expect(BALANCE.boss.battleY).toBe(300)
    expect(BALANCE.boss.advanceStopBeforeAnchorPx).toBe(80)
    // Konstruktionsregel: Sein Tempo IST aus dem Zeitfenster hergeleitet - er kommt
    // genau dann an, wenn das Fenster ausgereizt ist. Frueher war die Regel umgekehrt
    // ("kommt nie an, solange man im Fenster bleibt"), das war die Wartezeit-Version.
    expect(pressureContactSec).toBeCloseTo(reference.maxFightSecCap, 0)
    // Und er bleibt deutlich langsamer als der langsamste Gegner (schwerer Gegner am
    // Tempo-Boden), sonst waere es kein Vorruecken, sondern ein Angriff.
    const langsamsterGegner = BALANCE.stats.speed.floor * BALANCE.enemy.types[2].speedFactor
    expect(BALANCE.boss.advanceSpeed).toBeLessThan(langsamsterGegner / 3)
    expect(getMaxFightSec(1)).toBe(26)
    expect(getMaxFightSec(12)).toBeCloseTo(32, 1)
    for (let level = 1; level <= 12; level += 1) {
      // Jedes Level liegt im Zielfenster 20-40 s.
      expect(getMaxFightSec(level)).toBeGreaterThanOrEqual(reference.minFightSec)
      expect(getMaxFightSec(level)).toBeLessThanOrEqual(reference.maxFightSecCap)
    }
  })

  it('normalizes weapon firepower against the normal weapon', () => {
    expect(getWeaponFirepower('normal')).toBe(1)
    expect(getWeaponFirepower('shotgun')).toBe(4.2)
  })

  it('switches phase only below half HP and keeps phase two latched', () => {
    const plan = getBossPlan(6, purchaseStates[0].upgrades, 12, 'normal', 1, 3)
    expect(getBossPhase(plan.phaseThresholdHp, false, plan)).toBe(1)
    expect(getBossPhase(plan.phaseThresholdHp - 1, false, plan)).toBe(2)
    expect(getBossPhase(plan.maxHp, true, plan)).toBe(2)
  })

  it('macht Phase zwei schneller und dichter', () => {
    const plan = getBossPlan(12, purchaseStates[0].upgrades, 12, 'normal', 1, 3)
    expect(plan.phaseTwo).toEqual(getPhaseTwoProfile(plan.level))
    expect(plan.phaseOne).toEqual(getPhaseOneProfile(plan.level))
    expect(plan.phaseTwo.hordeIntervalMs).toBeLessThan(plan.phaseOne.hordeIntervalMs)
    expect(plan.phaseTwo.moveSpeed).toBeGreaterThan(plan.phaseOne.moveSpeed)
    expect(plan.hordeSize).toBe(getBossHordeSize(12))
    expect(plan.maxActiveCalled).toBe(BALANCE.boss.hordePressure.maxActiveCalled)
  })
})
