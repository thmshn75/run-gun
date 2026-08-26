import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { selectChainLightningTargets } from '../src/systems/chainLightning'
import { getWeaponRewardChoices } from '../src/systems/weaponChoices'

type WeaponKey = keyof typeof BALANCE.weapon

const newWeapons: readonly WeaponKey[] = ['minigun', 'flamethrower', 'chainlightning']
const weaponKeys: readonly WeaponKey[] = ['normal', 'shotgun', 'laser', 'rocket', 'minigun', 'flamethrower', 'chainlightning']

// Anflugstrecke des Referenzgeraets (390 x 844): Kampfhoehe bis Horizont.
const APPROACH_PX = 844 - BALANCE.player.anchorBottomOffset - BALANCE.road.horizonY

function flightSeconds(weapon: WeaponKey): number {
  const config = BALANCE.weapon[weapon]
  // Seit der Reichweitenbegrenzung endet jede Kugel auf der Linie ihrer Waffe; die
  // Flugzeit ist damit die Strecke bis dorthin, nicht mehr der ganze Bildschirm.
  return (config.engageShare * APPROACH_PX) / config.projectileSpeed
}

function peakProjectileLoad(weapon: WeaponKey): number {
  const config = BALANCE.weapon[weapon]
  return BALANCE.stats.shotsPerSec.capAtLevelTwelve * config.rateFactor * config.shootersPerSalvo * config.bulletsPerShot * flightSeconds(weapon)
}

describe('additional weapons', () => {
  it('keeps the wall goodie cadences in a playable range', () => {
    // Dauerwand (W4): 180 px/s / segmentHeight Segmente pro Sekunde je Seite; Goodies
    // kommen im Erwartungswert alle 1/(rate x chance) Sekunden, die maxDry-Garantie
    // deckelt die laengste Durststrecke.
    const wallShare = BALANCE.walls.wallRunLength / (BALANCE.walls.wallRunLength + BALANCE.walls.wallGapSlots)
    const segmentsPerSec = (BALANCE.scrollSpeed / BALANCE.walls.segmentHeightPx) * wallShare
    const weaponCadenceMs = 1000 / (segmentsPerSec * BALANCE.walls.weaponChance)
    const guaranteeMs = (BALANCE.walls.goodieMaxDry / segmentsPerSec) * 1000
    expect(weaponCadenceMs).toBeGreaterThanOrEqual(5000)
    expect(weaponCadenceMs).toBeLessThanOrEqual(15000)
    expect(guaranteeMs).toBeLessThanOrEqual(15000)
    // Links gibt es keine Chance mehr, sondern eine durchgehende Kette: jede Kachel
    // ein Plaettchen. Gerechnet ergibt das den Truppenzuwachs pro Sekunde.
    const pickupsPerSec = segmentsPerSec * BALANCE.walls.pickupTeamGain
    expect(pickupsPerSec).toBeGreaterThan(0.8)
    expect(pickupsPerSec).toBeLessThan(2)
  })

  it('keeps every weapon pool above its balance-derived peak projectile load', () => {
    for (const weapon of weaponKeys) {
      expect(BALANCE.pools.projectiles[weapon], weapon).toBeGreaterThan(peakProjectileLoad(weapon))
    }
  })

  it('staffelt die Reichweiten nach der Realitaet, ohne die Kampfzone aufzuheben', () => {
    // Thomas 2026-08-22: "Schussreichweite an Waffen anpassen - Vergleich zur Realitaet".
    // Reihenfolge kurz -> weit: Schrot, Gewehr, Blitz, Flamme, Laser, Minigun, Rakete.
    //
    // NEU GEORDNET AM 2026-08-25, aus einer Messung statt aus der Realitaetsvorlage:
    // Flamme (0,28) und Blitz (0,45) waren die kuerzesten der regulaeren Waffen und
    // liessen deshalb MEHR Gegner durch als das Sturmgewehr, das drei bis vier Plaetze
    // unter ihnen steht (18,7 % und 9,5 % gegen 9,9 %; Level 12, je 25 s). Beide sitzen
    // jetzt oberhalb des Sturmgewehrs und unterhalb von Laser, Minigun und Rakete.
    //
    // DIE REICHWEITE IST DER STAERKSTE EINZELHEBEL im Waffenvergleich - staerker als
    // killsPerSec, nach dem Staffelung und Preis gemacht sind. Wer hier etwas aendert,
    // aendert die Rangfolge des Spiels, nicht nur eine Optik.
    //
    // Der Laser ist am 2026-08-23 von 0,85 auf 0,60 gefallen und liegt damit nicht mehr
    // an der Spitze (Thomas: "noch eines Laser ... es laeuft durch"). Gemessen starben
    // die Gegner mit 0,85 im Mittel auf y = 225, also praktisch in dem Moment, in dem
    // sie beschiessbar wurden - die Kampfzone war fuer diese Waffe aufgehoben.
    const reihenfolge: readonly WeaponKey[] = ['shotgun', 'normal', 'chainlightning', 'flamethrower', 'laser', 'minigun', 'rocket']
    for (let index = 1; index < reihenfolge.length; index += 1) {
      expect(BALANCE.weapon[reihenfolge[index]].engageShare, reihenfolge[index])
        .toBeGreaterThan(BALANCE.weapon[reihenfolge[index - 1]].engageShare)
    }
    // Auch die weiteste Waffe laesst einen Rest Anflugstrecke frei - sonst faellt der
    // Zweck der Begrenzung (Gegner sollen ankommen) mit dem ersten Waffenfund um.
    for (const weapon of weaponKeys) {
      expect(BALANCE.weapon[weapon].engageShare, weapon).toBeLessThanOrEqual(0.75)
      expect(BALANCE.weapon[weapon].engageShare, weapon).toBeGreaterThan(0.2)
    }
  })

  it('laesst die Schockwelle vom Einschlag bis zur Truppe reichen', () => {
    // Thomas 2026-08-26: "schockwelle muss fuer diesen preis noch staerker werden, weiter
    // nach vorne schiessen und den gesamten bildschirm, alle gegner wegraeumen".
    //
    // Das ist die Bedingung dafuer, dass "der gesamte Bildschirm" stimmt: Der Wirkradius
    // muss mindestens so gross sein wie die Strecke von der Einschlagstelle bis zur
    // Truppe. Sonst bleibt ein Streifen davor uebrig, durch den Gegner laufen.
    const einschlagAbstand = BALANCE.weapon.shockwave.engageShare * APPROACH_PX
    expect(BALANCE.weapon.shockwave.splashRadiusPx).toBeGreaterThanOrEqual(einschlagAbstand)
    // Und sie muss die staerkste Waffe des Spiels sein - sie ist die zweitteuerste.
    // GEMESSEN am 2026-08-26 (Level 12, Truppe 12, Schaden 2, Rate 4, je 20 s):
    // Schockwelle 12,6 Kills/s bei 0 % durchgekommen, gegen Streubombe 8,1 und
    // Sturmgewehr 7,35 bei 8,1 % durch.
    const alle = (Object.keys(BALANCE.weapon) as WeaponKey[])
      .filter((k) => typeof (BALANCE.weapon[k] as { unlockPrice?: number }).unlockPrice === 'number')
    const teurer = alle.filter((k) => (BALANCE.weapon[k] as { unlockPrice: number }).unlockPrice
      > BALANCE.weapon.shockwave.unlockPrice)
    expect(teurer.length, `teurer als die Schockwelle: ${teurer.join(', ')}`).toBeLessThanOrEqual(1)
  })

  it('laesst den Aufschlagblitz nicht ueber den Bildschirm hinauswachsen', () => {
    // GEMESSEN, nicht geschaetzt: Mit dem Schockwellen-Radius von 480 px wurde das
    // 32-px-Blitzbild auf 960 px gezogen - zweieinhalbmal die Bildschirmbreite (390 px),
    // mehrmals je Sekunde fuer je 180 ms. Der Deckel trennt Darstellung von Wirkung.
    const referenzBreite = 390
    expect(BALANCE.weapon.splashFlashMaxRadiusPx * 2).toBeLessThanOrEqual(referenzBreite * 0.7)
    // Er darf aber auch nicht kleiner sein als die kleinste Explosion des Spiels.
    const radien = (Object.keys(BALANCE.weapon) as WeaponKey[])
      .filter((k) => typeof (BALANCE.weapon[k] as { splashRadiusPx?: number }).splashRadiusPx === 'number')
      .map((k) => (BALANCE.weapon[k] as { splashRadiusPx: number }).splashRadiusPx)
      .filter((r) => r > 0)
    expect(BALANCE.weapon.splashFlashMaxRadiusPx).toBeGreaterThanOrEqual(Math.min(...radien))
  })

  it('nimmt die Reichweite im Bossduell heraus, statt den Boss unangreifbar zu machen', () => {
    // Der Boss steht auf battleY, also weiter oben als jede Waffenlinie. Ohne die
    // Ausnahme waere er fuer kurze Waffen den halben Kampf lang nicht zu treffen.
    const anchorY = 844 - BALANCE.player.anchorBottomOffset
    const bossDistance = anchorY - BALANCE.boss.battleY
    const kuerzeste = Math.min(...weaponKeys.map((weapon) => BALANCE.weapon[weapon].engageShare)) * APPROACH_PX
    expect(kuerzeste).toBeLessThan(bossDistance)
    const scene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')
    expect(scene).toContain('this.weapons.setEngageLimitEnabled(false)')
    expect(scene).toContain('this.weapons.setEngageLimitEnabled(true)')
    const weapons = readFileSync(new URL('../src/systems/weapons.ts', import.meta.url), 'utf8')
    expect(weapons).toContain('this.engageLimitEnabled ? getEngageLineY(height, config.engageShare) : BALANCE.road.horizonY')
  })

  it('sets the expanded shotgun and flamethrower pools above their calculated peaks', () => {
    expect(BALANCE.pools.projectiles.shotgun).toBe(168)
    expect(BALANCE.pools.projectiles.flamethrower).toBe(200)
    expect(BALANCE.pools.projectiles.shotgun).toBeGreaterThan(peakProjectileLoad('shotgun'))
    expect(BALANCE.pools.projectiles.flamethrower).toBeGreaterThan(peakProjectileLoad('flamethrower'))
  })

  // Die frueheren drei "neuen" Waffen waren alle ab Level 3 verfuegbar. Seit B6
  // (2026-08-23) ist die Freischaltung ueber die Level 1-7 gestaffelt, damit in jedem
  // Level etwas Neues dazukommt - die Staerken sind unveraendert. Der Test prueft
  // deshalb nicht mehr eine gemeinsame Stufe, sondern dass die Auswahl auf jedem Level
  // genau die freigeschalteten Waffen enthaelt.
  it('bietet auf jedem Level genau die dort freigeschalteten Waffen an', () => {
    for (let level = 1; level <= 12; level += 1) {
      const choices = getWeaponRewardChoices('normal', level)
      expect(choices).not.toContain('normal')
      const expected = (Object.keys(BALANCE.weapon) as WeaponKey[])
        .filter((weapon) => weapon !== 'normal' && BALANCE.weapon[weapon].minLevel <= level)
      expect(choices).toEqual(expected)
    }
  })

  it('never rewards the equipped or level-locked weapon', () => {
    for (const level of [1, 2, 3, 12]) {
      for (const currentWeapon of Object.keys(BALANCE.weapon) as WeaponKey[]) {
        const choices = getWeaponRewardChoices(currentWeapon, level)
        expect(choices).not.toContain(currentWeapon)
        for (const weapon of choices) expect(BALANCE.weapon[weapon].minLevel).toBeLessThanOrEqual(level)
      }
    }
  })

  it('chains to nearby unique enemies only and returns damage targets rather than projectiles', () => {
    const jumps = selectChainLightningTargets(1, 0, 0, [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 18, y: 0 },
      { id: 2, x: 19, y: 0 },
      { id: 3, x: 40, y: 0 },
      { id: 4, x: 70, y: 0 },
      { id: 5, x: 160, y: 0 },
    ], 100, 3)
    expect(jumps.map((target) => target.id)).toEqual([2, 3, 4])
    expect(new Set(jumps.map((target) => target.id)).size).toBe(jumps.length)
    expect(jumps).toEqual(expect.arrayContaining([{ id: 2, x: 18, y: 0 }]))
    // A jump is only a selected damage target; the one physical shot stays the configured projectile.
    expect(BALANCE.weapon.chainlightning.bulletsPerShot).toBe(1)
  })

  it('keeps collision checks on the active weapon group and replaces them after a weapon pickup', () => {
    const weaponsSource = readFileSync(new URL('../src/systems/weapons.ts', import.meta.url), 'utf8')
    const gameSceneSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')

    for (const weapon of ['normal', 'shotgun', 'laser', 'rocket', 'minigun', 'flamethrower', 'chainlightning']) {
      expect(weaponsSource).toContain(`${weapon}: scene.physics.add.group()`)
    }
    expect(weaponsSource).toContain('this.recycleWeaponProjectiles(this.activeWeapon)')
    expect(gameSceneSource).not.toContain('this.weapons.getProjectiles()')
    expect(gameSceneSource).toContain('const projectiles = this.weapons.getProjectileGroup()')
    expect(gameSceneSource).toContain('this.weapons.setWeapon(weapon)')
    expect(gameSceneSource).toContain('this.replaceProjectileColliders()')
  })

  it('only registers boss and wall colliders while their targets are active', () => {
    const gameSceneSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')

    expect(gameSceneSource).toContain("if (this.levelPhase === 'boss')")
    expect(gameSceneSource).toContain('this.projectileBossCollider?.destroy()')
    expect(gameSceneSource).toContain('if (this.walls.hasActivePair())')
    expect(gameSceneSource).toContain('this.projectileWallCollider?.destroy()')
    expect(gameSceneSource).toContain('this.crowdRewardCollider?.destroy()')
  })
})
