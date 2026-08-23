import { BALANCE, type LevelSquadAllowance } from '../config/balance'

export type LevelPlan = {
  readonly level: number
  readonly designLevel: number
  readonly hardness: number
  readonly normalPhaseSec: number
  readonly enemyWeights: readonly [number, number, number]
  readonly spawnIntervalMs: number
  readonly spawnIntervalMinMs: number
  readonly squadChance: number
  readonly squads: readonly LevelSquadAllowance[]
  readonly companionLimit: number
}

/**
 * Deckel fuer die Hordengroesse des Levels. Waechst mit der Levelnummer, damit die
 * Mengenkurve ueber den ganzen Run steigt (Thomas 2026-08-23) - vorher war der Deckel
 * fest und schnitt die hardness-Skalierung ab Level 5 ab. Herleitung der Zahlen steht
 * bei BALANCE.level.squads.
 */
export function getMaxSquadSize(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level))
  const squads = BALANCE.level.squads
  return Math.min(squads.maxSizeCap, squads.maxSizeAtLevelOne + (safeLevel - 1) * squads.maxSizePerLevel)
}

export function getLevelPlan(level: number): LevelPlan {
  const safeLevel = Math.max(1, Math.floor(level))
  const designLevel = ((safeLevel - 1) % BALANCE.level.plans.length) + 1
  const definition = BALANCE.level.plans[designLevel - 1]
  const hardness = Math.min(BALANCE.level.hardness.max, 1 + (safeLevel - 1) * BALANCE.level.hardness.perLevel)
  const spawnIntervalMinMs = Math.round(definition.spawnIntervalMinMs / hardness)

  return {
    level: safeLevel,
    designLevel,
    hardness,
    normalPhaseSec: definition.normalPhaseSec,
    enemyWeights: definition.enemyWeights,
    spawnIntervalMs: Math.max(spawnIntervalMinMs, Math.round(definition.spawnIntervalMs / hardness)),
    spawnIntervalMinMs,
    squadChance: definition.squadChance,
    squads: definition.squads.map((squad) => ({
      ...squad,
      // Rows already fill the narrow horizon at four members; other formations gain
      // members with hardness until the shared safety cap is reached.
      size: squad.kind === 'row'
        ? squad.size
        : Math.min(getMaxSquadSize(safeLevel), Math.max(BALANCE.level.squads.minSize, Math.ceil(squad.size * hardness))),
    })),
    companionLimit: definition.companionLimit,
  }
}
