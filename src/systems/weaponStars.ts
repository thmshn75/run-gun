import { BALANCE } from '../config/balance'
import type { WeaponKey } from './weapons'

/**
 * Staerke einer Waffe als Sterne (1 bis 5), aus dem GEMESSENEN `killsPerSec`.
 *
 * Gemeinsam genutzt von der Ladenansicht im Menue und der Waffenansicht im Testgelaende.
 * Die beiden zeigen dieselbe Waffe; zwei Rechnungen dafuer waeren zwei Gelegenheiten,
 * verschiedene Sterne fuer dasselbe anzuzeigen.
 *
 * `aufwertung` ist der Faktor aus den dauerhaft gekauften Stufen (1 = nichts gekauft).
 * Er zaehlt mit, sonst bliebe die Anzeige stehen, waehrend die Waffe im Spiel staerker
 * wird - und der Kauf saehe folgenlos aus. Nach oben gedeckelt: Eine voll aufgeruestete
 * Waffe darf keine sechs Sterne zeichnen.
 *
 * OHNE PHASER-IMPORT, mit Absicht: Diese Datei wird aus Tests heraus aufgerufen, und
 * Phaser braucht beim Laden ein `window`.
 */
export function getWeaponStars(weapon: WeaponKey, aufwertung = 1): number {
  const alle = (Object.keys(BALANCE.weapon) as WeaponKey[])
    .filter((key) => typeof (BALANCE.weapon[key] as { killsPerSec?: number }).killsPerSec === 'number')
    .map((key) => (BALANCE.weapon[key] as { killsPerSec: number }).killsPerSec)
  const meine = (BALANCE.weapon[weapon] as { killsPerSec: number }).killsPerSec * aufwertung
  return Math.min(5, Math.max(1, Math.round((meine / Math.max(...alle)) * 5)))
}

/** Sterne als Text, gefuellt und leer zusammen immer fuenf. */
export function getWeaponStarText(weapon: WeaponKey, aufwertung = 1): string {
  const sterne = getWeaponStars(weapon, aufwertung)
  return `${'\u2605'.repeat(sterne)}${'\u2606'.repeat(5 - sterne)}`
}
