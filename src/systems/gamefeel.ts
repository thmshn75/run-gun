import { BALANCE } from '../config/balance'
import { getCurrentScrollSpeed } from './speed'

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
  const stepsPerSec = getCurrentScrollSpeed() / strideLengthPx
  return stepsPerSec / 2
}

// Stelle im Laufzyklus als Winkel. Ein voller Zyklus ist ein Doppelschritt; alle drei
// Bewegungen unten sitzen auf derselben Phase, damit Wippen, Wiegen und Federn
// zusammengehoeren statt gegeneinander zu laufen.
function getStepPhase(elapsedMs: number, cycleHz: number, phaseOffset: number): number {
  return (elapsedMs / 1000) * cycleHz * Math.PI * 2 + phaseOffset * Math.PI * 2
}

// Versatz einer Figur gegenueber ihrer Ruheposition. phaseOffset streut den Takt ueber
// die Formation, damit die Truppe nicht als Block huepft.
export function getBobOffsetPx(elapsedMs: number, cycleHz: number, phaseOffset: number, amplitudePx: number): number {
  // Betrag statt Sinus: Ein Laeufer faellt nach unten und stoesst sich ab, er schwingt
  // nicht symmetrisch. Der Scheitel liegt oben, der Kontakt unten — deshalb negativ.
  return -Math.abs(Math.sin(getStepPhase(elapsedMs, cycleHz, phaseOffset))) * amplitudePx
}

// Seitliches Wiegen des Oberkoerpers im Laufrhythmus (2026-09-03). Zusammen mit dem
// Federn unten ersetzt es die gezeichnete Bein- und Armarbeit, die 130 neue Bilder
// gekostet haette (Herleitung bei BALANCE.gamefeel.stepSwayMaxDeg).
//
// Voller Sinus, nicht Betrag: Die Figur wiegt je Doppelschritt EINMAL nach links und
// einmal nach rechts, waehrend sie in derselben Zeit ZWEIMAL federt — genau dieser
// Frequenzunterschied zwischen Hub und Wiegen liest sich als Gang.
export function getStepSwayRadians(elapsedMs: number, cycleHz: number, phaseOffset: number, maxDeg: number): number {
  return (Math.sin(getStepPhase(elapsedMs, cycleHz, phaseOffset)) * maxDeg * Math.PI) / 180
}

// Federn beim Aufsetzen: Am tiefsten Punkt des Schritts wird die Figur flacher und
// breiter, am Scheitel gestreckt und schmaler. Rueckgabe sind FAKTOREN auf die
// vorhandene Skalierung, damit Perspektive und Texturaufloesung unberuehrt bleiben.
//
// Wichtig fuer den Aufrufer: Diese Faktoren duerfen erst NACH dem Nachfuehren der
// Kollisionshuelle aufs Sprite, sonst atmet die Trefferflaeche im Schritttakt mit und
// Schaden haengt am Zufall des Laufzyklus (dieselbe Regel wie bei der Truppenhuelle).
export function getStepSquash(elapsedMs: number, cycleHz: number, phaseOffset: number, share: number): { scaleX: number, scaleY: number } {
  // 0 = Fuss am Boden, 1 = Scheitel des Schritts. Derselbe Betrag wie beim Hub, damit
  // die Figur genau dann federt, wenn sie unten ankommt.
  const hoehe = Math.abs(Math.sin(getStepPhase(elapsedMs, cycleHz, phaseOffset)))
  const dehnung = (hoehe - 0.5) * 2 * share
  return { scaleX: 1 - dehnung, scaleY: 1 + dehnung }
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
