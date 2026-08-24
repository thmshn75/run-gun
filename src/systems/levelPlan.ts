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

/**
 * Haerte des Levels. Bis level.endless.fromLevel unveraendert; darueber laeuft sie
 * FLACHER weiter und OHNE den Deckel hardness.max, der frueher bei Level 14 griff.
 */
export function getHardness(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level))
  const { fromLevel, hardnessPerLevel, hardnessMax } = BALANCE.level.endless
  const bisDeckel = Math.min(BALANCE.level.hardness.max, 1 + (safeLevel - 1) * BALANCE.level.hardness.perLevel)
  if (safeLevel <= fromLevel) return bisDeckel
  const anFromLevel = Math.min(BALANCE.level.hardness.max, 1 + (fromLevel - 1) * BALANCE.level.hardness.perLevel)
  return Math.min(hardnessMax, anFromLevel + (safeLevel - fromLevel) * hardnessPerLevel)
}

/**
 * Gegnermischung des Levels.
 *
 * Bis level.endless.fromLevel kommt sie unveraendert aus der Leveltabelle. Darueber
 * verschiebt sie sich weiter Richtung schwer: Der Zuwachs geht ZUERST von 'leicht' ab
 * und erst danach von 'standard' - so verschwindet der leichte Gegner allmaehlich aus
 * dem Bild, statt dass alle drei Typen gleichzeitig ausduennen.
 *
 * Der Enddeckel (endless.maxHeavyWeight) ist keine Formsache: Ohne ihn bestuende die
 * Horde irgendwann nur aus schweren Gegnern, und weil die drei Muenzen wert sind statt
 * einer, wuerde die Muenzrate mitexplodieren.
 */
export function getEnemyWeights(level: number): readonly [number, number, number] {
  const safeLevel = Math.max(1, Math.floor(level))
  const { fromLevel, weightShiftPerLevel, maxHeavyWeight } = BALANCE.level.endless
  const basis = BALANCE.level.plans[Math.min(BALANCE.level.plans.length, safeLevel) - 1].enemyWeights
  if (safeLevel <= fromLevel) return basis
  const heavy = Math.min(maxHeavyWeight, basis[2] + (safeLevel - fromLevel) * weightShiftPerLevel)
  const zuHeavy = heavy - basis[2]
  const light = Math.max(0, basis[0] - zuHeavy)
  const ausLight = basis[0] - light
  const standard = Math.max(0, basis[1] - (zuHeavy - ausLight))
  return [light, standard, heavy]
}

export function getLevelPlan(level: number): LevelPlan {
  const safeLevel = Math.max(1, Math.floor(level))
  // KEIN MODULO MEHR (E1, 2026-08-24). Bis 2026-08-24 stand hier
  // ((safeLevel - 1) % plans.length) + 1 - Level 13 bekam damit die Gegnermischung von
  // Level 1 und war gerechnet siebenmal leichter als Level 12. Das war die Ursache fuer
  // Bennis "zu leicht", nicht der Shop-Bonus. Ab dem hoechsten Eintrag bleibt die
  // haerteste Mischung stehen, und level.endless rechnet darueber weiter.
  const designLevel = Math.min(BALANCE.level.plans.length, safeLevel)
  const definition = BALANCE.level.plans[designLevel - 1]
  const hardness = getHardness(safeLevel)
  const spawnIntervalMinMs = Math.round(definition.spawnIntervalMinMs / hardness)

  return {
    level: safeLevel,
    designLevel,
    hardness,
    normalPhaseSec: definition.normalPhaseSec,
    enemyWeights: getEnemyWeights(safeLevel),
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
