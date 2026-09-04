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
  return Math.max(1, Math.round(
    base * getEndlessHpGrowth(safeLevel) * getStufenHaerte(safeLevel) * getFirepowerCoupling(playerPower),
  ))
}

/**
 * Stufenweiser Zaehigkeitsaufschlag alle fuenf Level (Thomas 2026-08-30). Gilt fuer
 * normale Gegner UND fuer den Boss - bossPlan.ts ruft dieselbe Funktion, damit beide
 * dieselbe Treppe steigen und nicht zwei Regler auseinanderlaufen.
 *
 * Treppe statt Kurve, weil der Auftrag eine Stufe war ("alle 5 Level"): Der Sprung soll
 * beim Levelwechsel spuerbar sein, nicht in einer glatten Kurve verschwinden.
 *
 * Die Stufen werden nach oben kleiner (jede halb so gross wie die vorige), damit das
 * Spiel oberhalb von Level 30 spielbar bleibt - die Herleitung samt Messwerten steht bei
 * BALANCE.enemy.stufenHaerte. Der Gesamtaufschlag konvergiert gegen 1,456.
 */
export function getStufenHaerte(level: number): number {
  const { everyLevels, firstStep, stepDecay } = BALANCE.enemy.stufenHaerte
  const stufen = Math.floor((Math.max(1, Math.floor(level)) - 1) / everyLevels)
  let faktor = 1
  for (let stufe = 0; stufe < stufen; stufe += 1) faktor *= 1 + firstStep * stepDecay ** stufe
  return faktor
}

/**
 * Zaehigkeitszuwachs oberhalb von level.endless.fromLevel (E1, 2026-08-24).
 *
 * Das ist der DAUERHAFTE Haertekanal des Endlosmodus. Die beiden anderen laufen aus:
 * Die Gegnermischung erreicht bei Level 32 ihren Enddeckel, und der Nachschub ist schon
 * ab Level 13 gesaettigt, weil der Hordendeckel dort steht (Herleitung bei
 * BALANCE.level.endless).
 */
function getEndlessHpGrowth(level: number): number {
  const ueber = Math.max(0, level - BALANCE.level.endless.fromLevel)
  return BALANCE.enemy.endlessHpGrowthPerLevel ** ueber
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
/**
 * Suffixe der Gestalten ab Index 1. Index 0 ist die Grundgestalt ohne Suffix.
 *
 * NUR ECHTE FORMEN (Thomas 2026-09-04: "keine einfaerbungen mehr, nur mehr wirklich
 * verschiedene figuren"). Von den urspruenglich neun Varianten je Staerke sind sechs
 * reine Umfaerbungen - gemessen am Silhouettenunterschied zu ihrer Vorlage:
 *   b, c, d  formgleich mit der Grundgestalt (0 bis 9 %)
 *   f, h, j  pixelgleich mit e, g bzw. i (exakt 0,0 %)
 * Uebrig bleiben e, g und i: drei eigene Formen je Staerke. Mit den drei Grundgestalten
 * sind das zwoelf Figuren; dazu kommt light-f, das als einziges Paar wirklich
 * verschieden ist (47,2 % gegen light-e) - macht dreizehn.
 *
 * Die ausgemusterten Bilddateien bleiben im Ordner: Sie sind die Vorlagen fuer die
 * Bewegungssaetze, die noch entstehen.
 */
const VARIANT_SUFFIXES = 'egi'

/** Zusaetzliche Gestalt je Staerke, wo ein Paar doch verschiedene Formen hat. */
const EXTRA_SUFFIXES: Readonly<Record<string, readonly string[]>> = {
  'enemy-light': ['f'],
}

export function getEnemyTexture(basisTextur: string, level: number, zufall: number): string {
  const suffixe = [...VARIANT_SUFFIXES, ...(EXTRA_SUFFIXES[basisTextur] ?? [])]
  const anzahl = Math.min(getUnlockedVariantCount(level), suffixe.length + 1)
  const index = Math.min(anzahl - 1, Math.max(0, Math.floor(zufall * anzahl)))
  return index === 0 ? basisTextur : `${basisTextur}-${suffixe[index - 1]}`
}
