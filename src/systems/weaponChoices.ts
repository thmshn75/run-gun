import { BALANCE } from '../config/balance'
import type { WeaponKey } from './weapons'

export function getWeaponRewardChoices(currentWeapon: WeaponKey, level: number): WeaponKey[] {
  return (Object.keys(BALANCE.weapon) as WeaponKey[])
    .filter((weapon) => weapon !== currentWeapon && BALANCE.weapon[weapon].minLevel <= level)
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
