export interface BildAuswertung { fps: number | null; p95: number | null; gueltig: number; verworfen: number }

export function auswerten(bildzeitenMs: readonly number[]): BildAuswertung {
  const gueltige = bildzeitenMs.filter(ms => Number.isFinite(ms) && ms > 0 && ms <= 250).sort((a, b) => a - b)
  return {
    fps: gueltige.length ? 1000 * gueltige.length / gueltige.reduce((summe, ms) => summe + ms, 0) : null,
    p95: gueltige.length ? gueltige[Math.floor(gueltige.length * 0.95)] : null,
    gueltig: gueltige.length,
    verworfen: bildzeitenMs.length - gueltige.length,
  }
}

export interface Bildgroesse { width: number; height: number }
export function pmremPufferBytes(ziel: Bildgroesse): number {
  return Math.max(0, ziel.width) * Math.max(0, ziel.height) * 4 * 4 / 3
}
export function spiegelPufferBytes(ziel: Bildgroesse): number {
  return Math.max(0, ziel.width) * Math.max(0, ziel.height) * (8 + 4)
}
export function speicherMB(texturen: readonly Bildgroesse[], renderflaechen: readonly Bildgroesse[] = [], phaserBilder: readonly Bildgroesse[] = []) {
  const mb = (bytes: number) => bytes / 1048576
  const pixels = (bild: Bildgroesse) => Math.max(0, bild.width) * Math.max(0, bild.height)
  return {
    bemalungen: mb([...new Set(texturen)].reduce((summe, bild) => summe + pixels(bild) * 4 * 4 / 3, 0)),
    renderflaechen: mb(renderflaechen.reduce((summe, bild) => summe + pixels(bild) * 4, 0)),
    phaserRest: mb(phaserBilder.reduce((summe, bild) => summe + pixels(bild) * 4, 0)),
  }
}

export function urteil(bilder: BildAuswertung, schwarz: number | null, bemalungenMB: number): string {
  if (!bilder.gueltig || bilder.verworfen / (bilder.gueltig + bilder.verworfen) > 0.1)
    return '❌ außerhalb: zu wenig gültige Bilder'
  const fehler: string[] = []
  if (bilder.fps === null || bilder.fps < 55) fehler.push('Schnitt-fps')
  if (bilder.p95 === null || bilder.p95 > 25) fehler.push('langsamste 5 %')
  if (schwarz === null || !Number.isFinite(schwarz) || schwarz > 10) fehler.push('Schwarz-Anteil')
  if (!Number.isFinite(bemalungenMB) || bemalungenMB > 60) fehler.push('Bemalung')
  return fehler.length ? `❌ außerhalb: ${fehler.join(', ')}` : '✅ im Budget'
}
