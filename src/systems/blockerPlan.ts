import { BALANCE } from '../config/balance'
import { getCombatFirepower, getTeamFirepower } from './bossPlan'
import type { WeaponKey } from './weapons'

export type BlockerPlan = Readonly<{
  maxHp: number
  referenceDps: number
  focusSec: number
}>

export function getBlockerPlan(level: number, teamSize: number, weapon: WeaponKey, damage: number, rate: number): BlockerPlan {
  const config = BALANCE.blockers
  const safeLevel = Math.max(1, Math.floor(level))
  const dps = Math.max(0.0001, getCombatFirepower(teamSize, weapon, level) * damage * rate)

  // Zielhaerte: Levelnummer treibt, die Truppengroesse zieht gedaempft mit. Die WAFFE
  // geht bewusst nicht ein — sie soll die Wand schneller fallen lassen, nicht haerter
  // machen (Herleitung und verworfenes Vormodell stehen in balance.ts, blockers).
  // Bezug ist die Truppe am Rundenstart (BALANCE.stats.hp.base); der frueher hier
  // stehende Shop-Startwert war dieselbe Zahl und ist mit dem Shop entfallen.
  const teamTerm = (getTeamFirepower(teamSize, level) / getTeamFirepower(BALANCE.stats.hp.base, level)) ** config.teamDampening
  const target = config.baseHp * config.perLevelGrowth ** (safeLevel - 1) * teamTerm

  // Schutzgrenzen an der tatsaechlichen Feuerkraft, damit die Zielhaerte nie in eine
  // Sackgasse (zu langsam) oder in Nebel (zu schnell) kippt.
  const maxHp = Math.max(1, Math.round(Math.min(dps * config.maxFocusSec, Math.max(dps * config.minFocusSec, target))))

  return { maxHp, referenceDps: dps, focusSec: maxHp / dps }
}
