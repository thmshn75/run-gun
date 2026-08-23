import { BALANCE } from '../config/balance'

/**
 * Schadensbonus aus der Truppengroesse. Der Deckel waechst seit 2026-08-23 mit der
 * Levelnummer (Herleitung bei BALANCE.crowd.damageMultiplierCap*): Figuren sammeln
 * bleibt als Ueberlebenszeit sinnvoll, ihre Schadenswirkung folgt aber dem Level,
 * statt ab Level 2 dauerhaft am Maximum zu stehen.
 */
export function getCrowdDamageMultiplier(crowdSize: number, level = 1): number {
  const safeLevel = Math.min(12, Math.max(1, Math.floor(level)))
  const von = BALANCE.crowd.damageMultiplierCapAtLevelOne
  const bis = BALANCE.crowd.damageMultiplierCapAtLevelTwelve
  const cap = von * (bis / von) ** ((safeLevel - 1) / 11)
  return Math.min(
    cap,
    1 + Math.max(0, crowdSize - BALANCE.crowd.shootersPerSalvo) * BALANCE.crowd.damagePerExtraFigure,
  )
}
