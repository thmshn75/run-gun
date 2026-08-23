import { BALANCE } from '../config/balance'
import { getCrowdDamageMultiplier } from './crowdDamage'

export type EnemyType = (typeof BALANCE.enemy.types)[number]

/**
 * Feuerkraft der Truppe in Schaden je Sekunde, OHNE die Waffe.
 *
 * Bezugsgroesse fuer die gedaempfte Gegner-Kopplung. Dass die Waffe bewusst fehlt, ist
 * die Lehre aus der alten Wandhaerte: Dort ging sie ein, und wer eine Schrotflinte
 * aufhob, machte die Waende schlagartig 4x haerter. Hier zaehlen nur die drei Groessen,
 * die der Spieler bewusst sammelt - Truppengroesse, Schaden und Feuerrate.
 */
export function getPlayerPower(teamSize: number, damage: number, shotsPerSec: number, level: number): number {
  return Math.min(teamSize, BALANCE.crowd.shootersPerSalvo)
    * getCrowdDamageMultiplier(teamSize, level)
    * damage
    * shotsPerSec
}

/**
 * Zaehigkeitsfaktor aus der Spielerstaerke. Unterhalb der Referenz exakt 1 - wer schwach
 * dasteht, trifft auf den reinen Levelwert und wird nicht zusaetzlich bestraft. Darueber
 * gedaempft (Herleitung des Exponenten bei BALANCE.enemy.firepowerCoupling).
 */
export function getFirepowerCoupling(playerPower: number): number {
  const { dampening, referencePower, maxFactor } = BALANCE.enemy.firepowerCoupling
  if (!Number.isFinite(playerPower) || playerPower <= referencePower) return 1
  return Math.min(maxFactor, (playerPower / referencePower) ** dampening)
}

/**
 * Lebenspunkte eines Gegnertyps. Reine Funktion, ohne Phaser testbar.
 *
 * Drei Anteile: der Grundwert des Typs, die Levelkurve (steht seit 2026-08-23 auf 1,0,
 * das Levelwachstum kommt aus Typmischung und Nachschub) und die gedaempfte Kopplung an
 * die Spielerstaerke. Ohne playerPower ergibt sich exakt der ungekoppelte Wert.
 */
export function getEnemyHp(type: EnemyType, level: number, playerPower = 0): number {
  const safeLevel = Math.max(1, Math.floor(level))
  const base = type.hp * BALANCE.enemy.hpPerLevelGrowth ** (safeLevel - 1)
  return Math.max(1, Math.round(base * getFirepowerCoupling(playerPower)))
}

/**
 * Breite und Hoehe einer Gegnerfigur auf KAMPFHOEHE, also in dem Bezugssystem, in dem
 * Spurwahl, Formationsbreite, Schatten und Trefferflaeche rechnen. Die Werte in der
 * Typtabelle sind die gemessenen SPRITE-Masse in TEXTURPIXELN (seit W7 in doppelter
 * Aufloesung); render.figureTextureScale rechnet sie auf Spielpixel zurueck und
 * BALANCE.enemy.figureScale hebt sie auf die Spielgroesse. Wer die Rohmasse braucht (nur der Arcade-Body, den Phaser selbst
 * mitskaliert), nimmt weiter type.bodyWidth/bodyHeight.
 */
export function getFigureWidth(type: EnemyType): number {
  return type.bodyWidth * BALANCE.enemy.figureScale * BALANCE.render.figureTextureScale
}

export function getFigureHeight(type: EnemyType): number {
  return type.bodyHeight * BALANCE.enemy.figureScale * BALANCE.render.figureTextureScale
}

export function chooseEnemyType(weights: readonly number[], random: () => number = Math.random): EnemyType {
  const totalWeight = weights.reduce<number>((sum, weight) => sum + weight, 0)
  const roll = Math.min(Math.max(random(), 0), 0.9999999999999999) * totalWeight
  let cumulativeWeight = 0
  for (let index = 0; index < weights.length; index += 1) {
    cumulativeWeight += weights[index]
    if (roll < cumulativeWeight) return BALANCE.enemy.types[index]
  }
  return BALANCE.enemy.types.at(-1)!
}

/**
 * Wie viele Kleidungsfassungen stehen auf diesem Level zur Verfuegung?
 * Rein optisch - keine Balance-Groesse haengt daran.
 */
export function getUnlockedVariantCount(level: number): number {
  const stufen = BALANCE.enemy.variantUnlockLevels
  const safeLevel = Math.max(1, Math.floor(level))
  return Math.max(1, stufen.filter((stufe) => safeLevel >= stufe).length)
}

/**
 * Texturname fuer einen Gegner. Index 0 ist die Vorlage, danach -b, -c, -d.
 * Der Zufallswert kommt von aussen, damit der Aufrufer seine eigene Quelle behaelt.
 */
export function getEnemyTexture(basisTextur: string, level: number, zufall: number): string {
  const anzahl = getUnlockedVariantCount(level)
  const index = Math.min(anzahl - 1, Math.max(0, Math.floor(zufall * anzahl)))
  return index === 0 ? basisTextur : `${basisTextur}-${'bcd'[index - 1]}`
}
