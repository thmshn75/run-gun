import { BALANCE } from '../config/balance'

export type EnemyType = (typeof BALANCE.enemy.types)[number]

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
