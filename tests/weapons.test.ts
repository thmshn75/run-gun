import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/config/balance'
import { selectChainLightningTargets } from '../src/systems/chainLightning'
import { getWeaponRewardChoices } from '../src/systems/weaponChoices'

type WeaponKey = keyof typeof BALANCE.weapon

const newWeapons: readonly WeaponKey[] = ['minigun', 'flamethrower', 'chainlightning']
const weaponKeys: readonly WeaponKey[] = ['normal', 'shotgun', 'laser', 'rocket', 'minigun', 'flamethrower', 'chainlightning']

function flightSeconds(weapon: WeaponKey): number {
  const config = BALANCE.weapon[weapon]
  return (config.rangePx > 0 ? config.rangePx : 720) / config.projectileSpeed
}

function peakProjectileLoad(weapon: WeaponKey): number {
  const config = BALANCE.weapon[weapon]
  return BALANCE.stats.shotsPerSec.cap * config.rateFactor * config.shootersPerSalvo * config.bulletsPerShot * flightSeconds(weapon)
}

describe('additional weapons', () => {
  it('keeps the wall goodie cadences in a playable range', () => {
    // Dauerwand (W4): 180 px/s / segmentHeight Segmente pro Sekunde je Seite; Goodies
    // kommen im Erwartungswert alle 1/(rate x chance) Sekunden, die maxDry-Garantie
    // deckelt die laengste Durststrecke.
    const wallShare = BALANCE.walls.wallRunLength / (BALANCE.walls.wallRunLength + BALANCE.walls.wallGapSlots)
    const segmentsPerSec = (BALANCE.scrollSpeed / BALANCE.walls.segmentHeightPx) * wallShare
    const weaponCadenceMs = 1000 / (segmentsPerSec * BALANCE.walls.weaponChance)
    const reinforcementCadenceMs = 1000 / (segmentsPerSec * BALANCE.walls.reinforcementChance)
    const guaranteeMs = (BALANCE.walls.goodieMaxDry / segmentsPerSec) * 1000
    expect(weaponCadenceMs).toBeGreaterThanOrEqual(5000)
    expect(weaponCadenceMs).toBeLessThanOrEqual(15000)
    expect(reinforcementCadenceMs).toBeGreaterThanOrEqual(3000)
    expect(reinforcementCadenceMs).toBeLessThanOrEqual(10000)
    expect(guaranteeMs).toBeLessThanOrEqual(15000)
  })

  it('keeps every weapon pool above its balance-derived peak projectile load', () => {
    for (const weapon of weaponKeys) {
      expect(BALANCE.pools.projectiles[weapon], weapon).toBeGreaterThan(peakProjectileLoad(weapon))
    }
  })

  it('lets shotgun and flamethrower reach the boss from the crowd anchor', () => {
    const anchorY = 844 - BALANCE.player.anchorBottomOffset
    const bossDistance = anchorY - BALANCE.boss.battleY
    expect(BALANCE.weapon.shotgun.rangePx).toBe(430)
    expect(BALANCE.weapon.flamethrower.rangePx).toBe(430)
    expect(BALANCE.weapon.shotgun.rangePx).toBeGreaterThan(bossDistance)
    expect(BALANCE.weapon.flamethrower.rangePx).toBeGreaterThan(bossDistance)
  })

  it('sets the expanded shotgun and flamethrower pools above their calculated peaks', () => {
    expect(BALANCE.pools.projectiles.shotgun).toBe(168)
    expect(BALANCE.pools.projectiles.flamethrower).toBe(200)
    expect(BALANCE.pools.projectiles.shotgun).toBeGreaterThan(peakProjectileLoad('shotgun'))
    expect(BALANCE.pools.projectiles.flamethrower).toBeGreaterThan(peakProjectileLoad('flamethrower'))
  })

  it('makes the three new weapons unavailable before level three and config-selected from level three onward', () => {
    for (const level of [1, 2]) {
      const choices = getWeaponRewardChoices('normal', level)
      expect(choices).not.toContain('normal')
      for (const weapon of newWeapons) expect(choices).not.toContain(weapon)
    }
    const levelThreeChoices = getWeaponRewardChoices('normal', 3)
    for (const weapon of newWeapons) expect(levelThreeChoices).toContain(weapon)
    const expected = (Object.keys(BALANCE.weapon) as WeaponKey[]).filter((weapon) => weapon !== 'normal' && BALANCE.weapon[weapon].minLevel <= 3)
    expect(levelThreeChoices).toEqual(expected)
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
