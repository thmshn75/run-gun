import { BALANCE } from '../config/balance'
import type { WeaponKey } from './weapons'

/**
 * Welche Waffen koennen auf diesem Level im Wandtor erscheinen?
 *
 * Zwei Wege hinein: das regulaere Freischaltlevel ODER ein dauerhafter Kauf im
 * Menue-Shop (2026-08-25). Eine gekaufte Waffe steht damit ab Level 1 zur Verfuegung -
 * das ist Bennis ausdruecklicher Wunsch ("die er dann IMMER hat").
 *
 * Sie liegt ihm deshalb nicht in der Hand: Das Tor muss weiterhin gefunden und
 * zerschossen werden. Gekauft wird die Moeglichkeit, nicht die Waffe.
 */
export function getWeaponRewardChoices(
  currentWeapon: WeaponKey,
  level: number,
  owned: readonly string[] = [],
): WeaponKey[] {
  return (Object.keys(BALANCE.weapon) as WeaponKey[])
    .filter((weapon) => {
      const eintrag = BALANCE.weapon[weapon] as { minLevel?: number } | undefined
      if (typeof eintrag?.minLevel !== 'number') return false
      if (weapon === currentWeapon) return false
      // GEKAUFTE WAFFEN KOMMEN EIN LEVEL FRUEHER, nicht ab Level 1 (Thomas 2026-08-25:
      // "immer schon ein Level vorher waehlbar als kleinen Bonus").
      //
      // Bis dahin galt eine gekaufte Waffe ab Level 1. Gemessen macht das den Aufbau des
      // Spiels kaputt: Mit der Streubombe kommt auf Level 1, 5 UND 12 KEIN EINZIGER
      // Gegner mehr durch (gegen 4,3 / 15,8 / 19,1 % mit der Pistole, Zielkorridor 4-12 %).
      // Der Kauf ist damit die Sicherheit, sie zu HABEN, statt auf ein Wandtor zu hoffen -
      // plus ein Level Vorsprung. Nicht mehr.
      const frueher = owned.includes(weapon) ? BALANCE.weapon.ownedLevelBonus : 0
      return eintrag.minLevel - frueher <= level
    })
}

/**
 * Gewicht einer Waffe in der Torziehung (Thomas 2026-08-24: "neue waffen bevorzugen,
 * aber alte trotzdem bringen").
 *
 * DAS PROBLEM, das dahintersteckt: Ein Wandtor zeigt immer nur EINE Waffe, gezogen aus
 * allen freigeschalteten. Bis 2026-08-24 war die Ziehung gleichverteilt - je mehr
 * Waffen freigeschaltet sind, desto seltener kommt eine bestimmte. Mit der geplanten
 * Staffelung auf dreizehn Waffen faellt die Chance auf die gerade erst freigeschaltete
 * von 1/7 auf 1/12; die neue, starke Waffe waere also am seltensten zu sehen - genau
 * verkehrt herum.
 *
 * Das Gewicht waechst deshalb mit dem Freischaltlevel. Alte Waffen behalten ein
 * kleines, aber echtes Gewicht: Sie sollen vorkommen, nur nicht mehr gleich haeufig.
 */
export function getWeaponRewardWeight(weapon: WeaponKey): number {
  return BALANCE.weapon.rewardNewnessBias ** (BALANCE.weapon[weapon].minLevel - 1)
}

/**
 * Zieht eine Waffe gewichtet. Der Zufallswert kommt von aussen, damit der Aufrufer
 * seine eigene Quelle behaelt und der Test ohne Phaser auskommt.
 */
export function chooseWeightedWeapon(choices: readonly WeaponKey[], zufall: number): WeaponKey | undefined {
  if (choices.length === 0) return undefined
  const gewichte = choices.map(getWeaponRewardWeight)
  const summe = gewichte.reduce((a, g) => a + g, 0)
  let rest = Math.min(Math.max(zufall, 0), 0.9999999999999999) * summe
  for (let i = 0; i < choices.length; i += 1) {
    rest -= gewichte[i]
    if (rest < 0) return choices[i]
  }
  return choices[choices.length - 1]
}

/**
 * Welche Waffen darf der Spieler als STARTWAFFE waehlen - in der Levelpause und vor dem
 * Fortsetzen aus dem Menue?
 *
 * Drei Quellen, und die dritte ist der Grund, warum es diese Funktion gibt:
 * 1. die Pistole, die es immer gibt,
 * 2. gekaufte Waffen, sobald sie fuer dieses Level freigeschaltet sind (ein Level
 *    frueher als regulaer, `BALANCE.weapon.ownedLevelBonus`),
 * 3. `behalten` - was beim OEFFNEN der Auswahl getragen wurde.
 *
 * OHNE (3) IST DIE WAHL EINE EINBAHNSTRASSE (Thomas 2026-08-25: "wenn ich z. B. eine
 * auswaehle, kann ich nicht direkt zurueck auf die anderen"). Die Liste wurde bei jeder
 * Wahl neu aus der GERADE getragenen Waffe gebaut. Eine im Lauf gefundene, nicht
 * gekaufte Waffe fiel damit genau in dem Moment aus der Liste, in dem man sie abwaehlte -
 * und war nicht mehr zurueckzuholen.
 */
export function getStartWeaponChoices(
  getragen: string,
  level: number,
  owned: readonly string[],
  behalten: readonly string[] = [],
): WeaponKey[] {
  return (Object.keys(BALANCE.weapon) as WeaponKey[])
    .filter((weapon) => {
      const eintrag = BALANCE.weapon[weapon] as { minLevel?: number } | undefined
      if (typeof eintrag?.minLevel !== 'number') return false
      if (weapon === 'pistol' || weapon === getragen || behalten.includes(weapon)) return true
      return owned.includes(weapon) && eintrag.minLevel - BALANCE.weapon.ownedLevelBonus <= level
    })
    // Nach Freischaltlevel sortiert: Die Reihe liest von schwach nach stark, und eine
    // Kachel wechselt ihren Platz nicht, wenn eine Waffe dazukommt oder wegfaellt.
    .sort((a, b) => (BALANCE.weapon[a] as { minLevel: number }).minLevel
      - (BALANCE.weapon[b] as { minLevel: number }).minLevel)
}
