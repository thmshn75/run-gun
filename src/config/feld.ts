import type Phaser from 'phaser'

/** Das logische Spielfeld bleibt unabhaengig von der Aufloesung des Zeichenpuffers. */
export const FELD = { breite: 390, hoehe: 844 } as const

/**
 * Der Puffer waechst quadratisch: Faktor 3 braeuchte neunmal so viel Flaeche wie
 * Faktor 1. Zwei liefert auf dem iPhone den sichtbaren Gewinn ohne diesen Aufwand.
 */
export function berechneGeraeteFaktor(devicePixelRatio: unknown): number {
  if (typeof devicePixelRatio !== 'number' || !Number.isFinite(devicePixelRatio)) return 1
  return Math.min(2, Math.max(1, devicePixelRatio))
}

export function aktuellerGeraeteFaktor(): number {
  return berechneGeraeteFaktor(typeof window === 'undefined' ? undefined : window.devicePixelRatio)
}

/** Richtet den groesseren Puffer wieder auf das feste logische Spielfeld aus. */
export function passeKameraAn(scene: Phaser.Scene): void {
  const faktor = aktuellerGeraeteFaktor()
  scene.cameras.main.setZoom(faktor).centerOn(FELD.breite / 2, FELD.hoehe / 2)
}
