/**
 * Reiner Sichtversatz: negative Y-Werte schieben zum Horizont. Der gespeicherte
 * Wert und die sofort am Sprite angewendete Differenz sind absichtlich dieselbe
 * Buchfuehrung; nur so kann update() den gesamten Versatz wieder herausrechnen.
 */
export function addRueckstoss(currentPx: number, startPx: number): { valuePx: number, deltaPx: number } {
  const nextPx = Math.max(-startPx * 2, currentPx - startPx)
  return { valuePx: nextPx, deltaPx: nextPx - currentPx }
}

/** Klingt den negativen Sichtversatz gleichmaessig bis null ab. */
export function decayRueckstoss(currentPx: number, startPx: number, durationMs: number, dt: number): number {
  return Math.min(0, currentPx + (startPx * dt) / durationMs)
}
