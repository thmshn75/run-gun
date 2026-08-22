import { BALANCE } from '../config/balance'

export type EnemyType = (typeof BALANCE.enemy.types)[number]

/**
 * Lebenspunkte eines Gegnertyps auf einem Level. Reine Funktion, ohne Phaser testbar.
 *
 * Die Werte in der Typtabelle sind die Level-1-Werte; ab da waechst der Widerstand mit
 * der Levelnummer. Vorher waren sie ueber alle Level fest - siehe die Herleitung bei
 * BALANCE.enemy.hpPerLevelGrowth.
 */
export function getEnemyHp(type: EnemyType, level: number): number {
  const safeLevel = Math.max(1, Math.floor(level))
  return Math.max(1, Math.round(type.hp * BALANCE.enemy.hpPerLevelGrowth ** (safeLevel - 1)))
}

export function chooseEnemyType(weights: readonly number[], random: () => number = Math.random): EnemyType {
  const totalWeight = weights.reduce<number>((sum, weight) => sum + weight, 0)
  const roll = Math.min(Math.max(random(), 0), 0.9999999999999999) * totalWeight
  let cumulativeWeight = 0
  for (let index = 0; index < weights.length; index += 1) {
    cumulativeWeight += weights[index]
    if (roll < cumulativeWeight) return BALANCE.enemy.types[index]
  }
  return BALANCE.enemy.types.at(-1)!
}
