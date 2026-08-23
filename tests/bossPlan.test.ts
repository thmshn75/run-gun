import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { getLevelPlan } from '../src/systems/levelPlan'
import type { WeaponKey } from '../src/systems/weapons'
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
} from '../src/systems/bossPlan'

const weaponKeys = ['normal', 'shotgun', 'laser', 'rocket', 'minigun', 'flamethrower', 'chainlightning'] as const
const teamSizes = [2, 3, 6, 12, 20, 30]
const damageValues = [1, 3, 10, 20]
const rateValues = [1, 1.5, 3, 8]
const levels = [1, 6, 12]
// Die frueheren vier Shop-Kaufstaende sind mit dem Shop entfallen (2026-08-23). Die
// Spanne, die sie abdeckten, steckt jetzt direkt in damageValues/rateValues.

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
    // Gerechnet, nicht geraten: Level 1 = 8,15 Gegner/s, Level 12 = 15,74 Gegner/s.
    // Level 1 stieg von 1,46 ueber 6,05 auf 8,15 mit den beiden Mengenanhebungen vom
    // 2026-08-22 (Thomas: "es sollen noch immer auch schon ab Level 1 mehr sein", dann
    // "koennen noch ein wenig mehr sein"). Auf den Boss schlaegt das erst ab Level 5
    // durch - bis Level 4 ruft er ueberhaupt keine Horde.
    expect(getNormalPhaseEnemiesPerSec(1)).toBeCloseTo(8.15, 1)
    // Level 12 stieg am 2026-08-23 von 15,74 auf 17,84, weil der Hordendeckel jetzt mit
    // der Levelnummer waechst (getMaxSquadSize) - die groesste Horde ist dort 21 statt 14.
    //
    // ACHTUNG bei der Nutzung dieser Zahl: Sie ist der Takt, den der Spawner ANFORDERT.
    // Im Spiel gemessen (2026-08-23, je drei Laeufe ueber 60 s) kommen bei Level 12
    // 12,56 Gegner/s tatsaechlich an - rund 30 % weniger, weil die Spurvergabe ablehnt,
    // solange am Horizont schon Gegner stehen. Der Boss-Ruftakt wird aus dieser
    // Anforderung abgeleitet und liegt damit bewusst auf der schnellen Seite; begrenzt
    // wird er durch hordePressure.minIntervalMs und maxActiveCalled.
    expect(getNormalPhaseEnemiesPerSec(12)).toBeCloseTo(17.84, 1)
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
    expect(max).toBe(2 * BALANCE.boss.hordePressure.hordeSizeCap)
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

  it('macht die Truppen-Feuerkraft levelabhaengig statt sie fest zu deckeln', () => {
    // Der Schadensbonus aus der Truppengroesse folgt seit 2026-08-23 der Levelnummer
    // (BALANCE.crowd.damageMultiplierCap*). Auf Level 1 deckelt er bei 1,5, auf Level 12
    // bei 4 - eine volle Truppe ist damit am Anfang des Runs deutlich schwaecher als am
    // Ende, was vorher nicht der Fall war.
    expect(getTeamFirepower(BALANCE.crowd.max, 1)).toBeCloseTo(12)
    expect(getTeamFirepower(BALANCE.crowd.max, 12)).toBeCloseTo(32)
    expect(getTeamFirepower(BALANCE.crowd.max, 12)).toBeGreaterThan(getTeamFirepower(BALANCE.crowd.max, 1))
    // Unterhalb der Schuetzenzahl gibt es keinen Bonus - dort ist das Level egal.
    expect(getTeamFirepower(6, 1)).toBe(6)
    expect(getTeamFirepower(6, 12)).toBe(6)
  })

  it('uses measured run stats across the complete 2,016-case fight-duration cross product', () => {
    let cases = 0
    {
      for (const level of levels) {
        for (const weapon of weaponKeys) {
          for (const teamSize of teamSizes) {
            for (const damage of damageValues) {
              for (const rate of rateValues) {
                const plan = getBossPlan(level, teamSize, weapon, damage, rate)
                const expectedDps = getCombatFirepower(teamSize, weapon, level) * damage * rate
                const label = `L${level}, ${weapon}, team ${teamSize}, damage ${damage}, rate ${rate}`
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
    expect(cases).toBe(2016)
  })

  it('haelt Thomas\u2019 Level-1-Lauf mit Truppe 3 und Rakete im Zeitfenster', () => {
    // Der frueher hier gefuehrte Vergleich gegen eine "geratene" HP-Zahl stammte aus der
    // Shop-Zeit und ist mit dem Shop entfallen (2026-08-23). Geblieben ist, was der Test
    // eigentlich absichern soll: Der schwaechste realistische Run darf nicht in einen
    // Bosskampf laufen, der laenger dauert als das Zeitfenster des Levels erlaubt.
    const plan = getBossPlan(1, 3, 'rocket', 1, 1)
    const fightSec = plan.maxHp / plan.referenceDps
    expect(fightSec).toBeGreaterThanOrEqual(BALANCE.boss.referenceFirepower.minFightSec - 0.5)
    expect(fightSec).toBeLessThanOrEqual(getMaxFightSec(1) + 0.5)
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
  })

  /**
   * WAFFENBAND (Regressionstest, 2026-08-23). Thomas meldete "Minigun macht kaum
   * Schaden"; gemessen lag sie bei 0,23x der Standardwaffe, die Schrotflinte bei 4,20x -
   * Faktor 18 zwischen beiden. Dieser Abstand stand wochenlang im Code, ohne dass ihn
   * jemand bemerkt hat, weil ihn keine Zahl irgendwo zusammenfasste.
   *
   * Geprueft wird die Feuerkraft gegen eine HORDE, denn dort spielt das Spiel: Splash,
   * Durchschlag und Kettensprunge treffen mehrere Gegner und muessen deshalb mitzaehlen
   * (getWeaponFirepower laesst sie bewusst weg, weil ein Boss ein Einzelziel ist).
   * Die Rechnung steht absichtlich hier und nicht im Code - sie ist eine unabhaengige
   * Modellrechnung und keine Kopie einer Implementierung.
   */
  it('haelt alle Waffen in einem engen Staerkeband statt Faktor 18 auseinander', () => {
    const hordenFeuerkraft = (weapon: WeaponKey): number => {
      const c = BALANCE.weapon[weapon]
      const einzelziel = Math.min(BALANCE.crowd.shootersPerSalvo, c.shootersPerSalvo)
        * c.rateFactor * c.damageFactor * c.bulletsPerShot
      // Zusatzziele: Durchschlag trifft im Schnitt einen zweiten in der Reihe, Splash
      // rund anderthalb weitere im Radius, jeder Kettensprung sein Ziel anteilig.
      const zusatz = 1
        + (c.pierces ? 1 : 0)
        + (c.splashRadiusPx > 0 ? c.splashDamageFactor * 1.5 : 0)
        + c.chainCount * c.chainDamageFactor
      return einzelziel * zusatz
    }
    const basis = hordenFeuerkraft('normal')
    const werte = weaponKeys.map((weapon) => ({ weapon, faktor: hordenFeuerkraft(weapon) / basis }))
    for (const { weapon, faktor } of werte) {
      expect(faktor, `${weapon} zu schwach`).toBeGreaterThanOrEqual(0.9)
      expect(faktor, `${weapon} zu stark`).toBeLessThanOrEqual(1.4)
    }
    // Und der Abstand zwischen der staerksten und der schwaechsten Waffe bleibt klein.
    const faktoren = werte.map((eintrag) => eintrag.faktor)
    expect(Math.max(...faktoren) / Math.min(...faktoren)).toBeLessThanOrEqual(1.5)
  })

  it('switches phase only below half HP and keeps phase two latched', () => {
    const plan = getBossPlan(6, 12, 'normal', 1, 3)
    expect(getBossPhase(plan.phaseThresholdHp, false, plan)).toBe(1)
    expect(getBossPhase(plan.phaseThresholdHp - 1, false, plan)).toBe(2)
    expect(getBossPhase(plan.maxHp, true, plan)).toBe(2)
  })

  it('macht Phase zwei schneller und dichter', () => {
    const plan = getBossPlan(12, 12, 'normal', 1, 3)
    expect(plan.phaseTwo).toEqual(getPhaseTwoProfile(plan.level))
    expect(plan.phaseOne).toEqual(getPhaseOneProfile(plan.level))
    expect(plan.phaseTwo.hordeIntervalMs).toBeLessThan(plan.phaseOne.hordeIntervalMs)
    // Der Boss pendelt seit 2026-08-23 nicht mehr seitlich (Thomas nach dem iPhone-Test).
    // Phase 2 unterscheidet sich deshalb nur noch ueber den Hordendruck und die Faerbung -
    // eine Bewegungsgeschwindigkeit darf in keiner Phase mehr auftauchen.
    expect(plan.phaseOne).not.toHaveProperty('moveSpeed')
    expect(plan.phaseTwo).not.toHaveProperty('moveSpeed')
    expect(plan.hordeSize).toBe(getBossHordeSize(12))
    expect(plan.maxActiveCalled).toBe(BALANCE.boss.hordePressure.maxActiveCalled)
  })
})
