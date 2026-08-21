import { BALANCE } from '../config/balance'
import type { WeaponKey } from './weapons'

export function getBlockerWeaponChoices(currentWeapon: WeaponKey, level: number): WeaponKey[] {
  return (Object.keys(BALANCE.weapon) as WeaponKey[])
    .filter((weapon) => weapon !== currentWeapon && BALANCE.weapon[weapon].minLevel <= level)
}
