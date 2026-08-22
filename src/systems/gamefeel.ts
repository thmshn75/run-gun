import { BALANCE } from '../config/balance'

// Lebendigkeit (Thomas 2026-08-22: "nicht so wie in den App Store spielen, ich kann dir
// aber auch nicht sagen woran es liegt"). Befund: Im ganzen Spiel bewegte sich nichts
// ausser Positionen — Figuren GLITTEN ueber die Strasse, statt zu laufen. Diese Datei
// haelt die reine Rechnung dafuer, damit sie ohne Phaser testbar bleibt.

// Schrittfrequenz aus der Fortbewegung statt geraten: Eine Figur ist figureHeightPx
// hoch, ihre Schrittlaenge betraegt erfahrungsgemaess rund strideOfHeight davon. Bei
// scrollSpeed px/s ergibt das Schritte/s; ein voller Auf-und-Ab-Zyklus dauert zwei
// Schritte. Damit haengt das Wippen am Tempo: wird die Welt langsamer, laufen die
// Figuren sichtbar gemaechlicher.
export function getStepCycleHz(figureHeightPx: number): number {
  const strideLengthPx = Math.max(1, figureHeightPx * BALANCE.gamefeel.strideOfHeight)
  const stepsPerSec = BALANCE.scrollSpeed / strideLengthPx
  return stepsPerSec / 2
}

// Versatz einer Figur gegenueber ihrer Ruheposition. phaseOffset streut den Takt ueber
// die Formation, damit die Truppe nicht als Block huepft.
export function getBobOffsetPx(elapsedMs: number, cycleHz: number, phaseOffset: number, amplitudePx: number): number {
  const phase = (elapsedMs / 1000) * cycleHz * Math.PI * 2 + phaseOffset * Math.PI * 2
  // Betrag statt Sinus: Ein Laeufer faellt nach unten und stoesst sich ab, er schwingt
  // nicht symmetrisch. Der Scheitel liegt oben, der Kontakt unten — deshalb negativ.
  return -Math.abs(Math.sin(phase)) * amplitudePx
}

// Jede Figur bekommt einen festen Platz im Takt, abgeleitet aus ihrem Formationsindex.
// Der goldene Winkel streut gleichmaessig, ohne dass Nachbarn synchron laufen.
export function getPhaseOffset(index: number): number {
  return (index * 0.618033988749895) % 1
}

// Neigung beim Lenken: proportional zur seitlichen Geschwindigkeit, gedeckelt. Die
// Figuren lehnen sich in die Kurve — das macht die Steuerung koerperlich lesbar.
export function getLeanRadians(anchorSpeedPxPerSec: number): number {
  const config = BALANCE.gamefeel
  const normalized = anchorSpeedPxPerSec / config.leanFullSpeedPxPerSec
  const clamped = Math.max(-1, Math.min(1, normalized))
  return (clamped * config.leanMaxDeg * Math.PI) / 180
}

// Traegheit fuer die Neigung: Ohne Glaettung zuckt sie mit jedem Frame. Der Faktor ist
// frameratenunabhaengig (Halbwertszeit statt fixem Anteil pro Bild).
export function approachAngle(current: number, target: number, dtMs: number, halfLifeMs: number): number {
  if (halfLifeMs <= 0) return target
  const factor = 1 - 2 ** (-dtMs / halfLifeMs)
  return current + (target - current) * factor
}

// Aufploppen beim Einsammeln: kurz ueber die Zielgroesse hinaus, dann zurueck.
// progress 0..1 -> Skalierung. Ein einzelner Sinus-Bogen genuegt und ist billiger als
// eine Tween-Kurve im Hot Path.
export function getPopScale(progress: number, overshoot: number): number {
  const clamped = Math.max(0, Math.min(1, progress))
  return 1 + Math.sin(clamped * Math.PI) * overshoot
}
