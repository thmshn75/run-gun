/**
 * Wie fein muss eine Schrift-Textur gerendert werden, damit sie scharf aussieht?
 *
 * Getrennt von textSharpness.ts, weil dort Phaser importiert wird und Phaser beim Laden
 * ein DOM braucht - so bleibt die Rechnung testbar.
 *
 * HINTERGRUND (Thomas 2026-08-24: "die weisse Schrift in den orangen Buttons ist etwas
 * unscharf"): Das Spiel rechnet in einem festen Feld von 390 x 844 Punkten, und der
 * Zeichenbereich ist genau so gross - 390 echte Bildpunkte breit. Ein iPhone zeigt diese
 * 390 Punkte auf 1.170 Geraetepunkten an; jeder gezeichnete Punkt wird auf drei gestreckt.
 * Bilder verkraften das (sie liegen in doppelter Aufloesung vor), Schrift nicht.
 */
export function computeTextResolution(
  canvasWidth: number,
  displayedCssWidth: number,
  devicePixelRatio: number,
  maxResolution: number,
): number {
  if (!Number.isFinite(canvasWidth) || canvasWidth <= 0) return 1
  if (!Number.isFinite(displayedCssWidth) || displayedCssWidth <= 0) return 1
  const verhaeltnis = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1
  const streckung = (displayedCssWidth * verhaeltnis) / canvasWidth
  return Math.min(maxResolution, Math.max(1, streckung))
}
