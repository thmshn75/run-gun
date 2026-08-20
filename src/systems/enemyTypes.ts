import { BALANCE } from '../config/balance'

export type EnemyType = (typeof BALANCE.enemy.types)[number]

export function chooseEnemyType(elapsedMs: number, random: () => number = Math.random): EnemyType {
  const elapsedSec = elapsedMs / 1000
  const wave = BALANCE.enemy.waves.find((candidate) => candidate.untilSec > elapsedSec) ?? BALANCE.enemy.waves.at(-1)!
  const totalWeight = wave.weights.reduce<number>((sum, weight) => sum + weight, 0)
  const roll = random() * totalWeight
  let cumulativeWeight = 0
  for (let index = 0; index < wave.weights.length; index += 1) {
    cumulativeWeight += wave.weights[index]
    if (roll < cumulativeWeight) return BALANCE.enemy.types[index]
  }
  return BALANCE.enemy.types.at(-1)!
}
