/**
 * Reiner Sichtversatz: negative Y-Werte schieben zum Horizont. Der gespeicherte
 * Wert und die sofort am Sprite angewendete Differenz sind absichtlich dieselbe
 * Buchfuehrung; nur so kann update() den gesamten Versatz wieder herausrechnen.
 */
export function addRueckstoss(currentPx: number, startPx: number): { valuePx: number, deltaPx: number } {
  const nextPx = Math.max(-startPx * 2, currentPx - startPx)
  return { valuePx: nextPx, deltaPx: nextPx - currentPx }
}

/** Klingt den negativen Sichtversatz mit einer bildratenunabhaengigen Halbwertszeit aus. */
export function decayRueckstoss(currentPx: number, halfLifeMs: number, dt: number): number {
  if (currentPx === 0) return 0
  const nextPx = currentPx * 2 ** (-dt / halfLifeMs)
  // Die asymptotische Kurve darf keinen Rest bis ans Lebensende eines Gegners tragen.
  return Math.abs(nextPx) < 0.5 ? 0 : nextPx
}
