import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { selectChainLightningTargets } from '../src/systems/chainLightning'
import { getBlockerWeaponChoices } from '../src/systems/blockerWeaponChoices'

type WeaponKey = keyof typeof BALANCE.weapon

const newWeapons: readonly WeaponKey[] = ['minigun', 'flamethrower', 'chainlightning']

function flightSeconds(weapon: WeaponKey): number {
  const config = BALANCE.weapon[weapon]
  return (config.rangePx > 0 ? config.rangePx : 720) / config.projectileSpeed
}

function peakProjectileLoad(weapon: WeaponKey): number {
  const config = BALANCE.weapon[weapon]
  return BALANCE.stats.shotsPerSec.cap * config.rateFactor * config.shootersPerSalvo * config.bulletsPerShot * flightSeconds(weapon)
}

describe('additional weapons', () => {
  it('gives level one and two progressively more rare blocker cadences than level three', () => {
    const [levelOne, levelTwo, levelThree] = BALANCE.blockers.spawnIntervalMsByDesignLevel
    expect(levelOne).toBeGreaterThan(levelTwo)
    expect(levelTwo).toBeGreaterThan(levelThree)
    expect(levelThree).toBeGreaterThan(0)
  })

  it('keeps every new weapon below shotgun peak projectile load and its pool above that load', () => {
    const shotgunPeak = peakProjectileLoad('shotgun')
    for (const weapon of newWeapons) {
      expect(peakProjectileLoad(weapon), weapon).toBeLessThan(shotgunPeak)
      expect(BALANCE.pools.projectiles[weapon], weapon).toBeGreaterThan(peakProjectileLoad(weapon))
    }
  })

  it('makes the three new weapons unavailable before level three and config-selected from level three onward', () => {
    for (const level of [1, 2]) {
      const choices = getBlockerWeaponChoices('normal', level)
      expect(choices).not.toContain('normal')
      for (const weapon of newWeapons) expect(choices).not.toContain(weapon)
    }
    const levelThreeChoices = getBlockerWeaponChoices('normal', 3)
    for (const weapon of newWeapons) expect(levelThreeChoices).toContain(weapon)
    const expected = (Object.keys(BALANCE.weapon) as WeaponKey[]).filter((weapon) => weapon !== 'normal' && BALANCE.weapon[weapon].minLevel <= 3)
    expect(levelThreeChoices).toEqual(expected)
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

  it('only registers boss and blocker colliders while their targets are active', () => {
    const gameSceneSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8')

    expect(gameSceneSource).toContain("if (this.levelPhase === 'boss')")
    expect(gameSceneSource).toContain('this.projectileBossCollider?.destroy()')
    expect(gameSceneSource).toContain('this.bossProjectileCollider?.destroy()')
    expect(gameSceneSource).toContain('if (this.blockers.hasActivePair())')
    expect(gameSceneSource).toContain('this.projectileBlockerCollider?.destroy()')
    expect(gameSceneSource).toContain('this.crowdRewardCollider?.destroy()')
  })
})
