import { BALANCE } from '../config/balance'

/**
 * Tempo der Welt in Pixeln je Sekunde, abhaengig vom Level.
 *
 * Thomas 2026-08-22: "die plus 1 waende muessen jedes Level ein wenig schneller
 * werden". Umgesetzt als Tempo der GANZEN Welt, nicht nur der Waende - genau wie bei
 * der Verlangsamung am selben Tag, wo Thomas aus drei Optionen "einfach alles
 * langsamer" gewaehlt hat. Waeren nur die Waende schneller, liefen sie aus dem Takt
 * mit Strasse, Haeusern und Muenzen; der ohnehin bestehende Bruch zwischen linearer
 * Wandbewegung und perspektivischer Kulisse wuerde sich mit jedem Level vergroessern.
 */
export function getScrollSpeed(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level))
  const grown = BALANCE.scrollSpeed * BALANCE.levelSpeed.perLevelFactor ** (safeLevel - 1)
  return Math.min(BALANCE.levelSpeed.maxPxPerSec, grown)
}

// Die Systeme (Waende, Muenzen, Strasse, Tore, Laufanimation) lesen EINE Zahl, damit
// nichts aus dem Takt geraet. Die GameScene setzt sie bei jedem Levelwechsel.
let current: number = BALANCE.scrollSpeed

export function setCurrentScrollSpeed(pxPerSec: number): void {
  current = pxPerSec
}

export function getCurrentScrollSpeed(): number {
  return current
}
