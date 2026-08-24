import { BALANCE } from '../config/balance'

/**
 * Schadensbonus aus der Truppengroesse. Der Deckel waechst seit 2026-08-23 mit der
 * Levelnummer (Herleitung bei BALANCE.crowd.damageMultiplierCap*): Figuren sammeln
 * bleibt als Ueberlebenszeit sinnvoll, ihre Schadenswirkung folgt aber dem Level,
 * statt ab Level 2 dauerhaft am Maximum zu stehen.
 */
export function getCrowdDamageMultiplier(crowdSize: number, level = 1): number {
  // KEIN Endloswachstum ueber die Leveltabelle hinaus - bewusst. Feuerkraft ist das
  // Produkt aus Schuetzenzahl, diesem Bonus, Schaden und Rate; im Endlosbereich waechst
  // nur der Schaden (BALANCE.stats.endless). Waechst dieser Deckel mit, wirkt der
  // Zuwachs multiplikativ, und das Spiel wird ab Level 25 wieder leichter - im ersten
  // E1-Modelllauf genau so passiert.
  const letztesTabellenLevel = BALANCE.level.plans.length
  const safeLevel = Math.min(letztesTabellenLevel, Math.max(1, Math.floor(level)))
  const von = BALANCE.crowd.damageMultiplierCapAtLevelOne
  const bis = BALANCE.crowd.damageMultiplierCapAtLevelTwelve
  const cap = von * (bis / von) ** ((safeLevel - 1) / (letztesTabellenLevel - 1))
  return Math.min(
    cap,
    1 + Math.max(0, crowdSize - BALANCE.crowd.shootersPerSalvo) * BALANCE.crowd.damagePerExtraFigure,
  )
}
