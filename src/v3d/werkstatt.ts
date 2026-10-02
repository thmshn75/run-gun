import { WERKSTATT, type Ablauf, type Level, type SpezialName, type WerkstattArt } from './balance3d.ts'

export type Stufen = Record<WerkstattArt, number>
export const leereStufen = (): Stufen => ({ truppe: 0, feuer: 0, eis: 0, panzer: 0, haubitze: 0, humvee: 0, hubschrauber: 0, mecha: 0 })

export function preis(art: WerkstattArt, stufe: number): number | null {
  return Number.isInteger(stufe) && stufe >= 0 ? WERKSTATT[art].preise[stufe] ?? null : null
}

export function wendeStufenAn(level: Level, stufen: Stufen, nurFahrzeuge = false): Level {
  const spezial: Level['spezial'] = {}
  for (const [name, wert] of Object.entries(level.spezial ?? {}) as [SpezialName, { ablauf: Ablauf }][]) {
    spezial[name] = { ablauf: wert.ablauf.map(phase => ({ ...phase })) }
  }
  for (const name of ['panzer', 'haubitze', 'humvee', 'hubschrauber', 'mecha'] as const) {
    if (stufen[name] > 0) spezial[name] = { ablauf: WERKSTATT[name].ablauf.map(phase => ({ ...phase })) }
  }
  return {
    ...level,
    wellen: level.wellen.map(welle => ({ ...welle })),
    saeulen: [...level.saeulen],
    T0: level.T0 + (nurFahrzeuge ? 0 : 5 * stufen.truppe),
    zombieTreffer: level.zombieTreffer * (nurFahrzeuge ? 1 : 1 + .1 * stufen.feuer),
    P: nurFahrzeuge ? level.P : Math.max(1, Math.round(level.P * (1 - .1 * stufen.eis))),
    spezial,
  }
}

export function zaehleBesiegt(ereignisse: readonly { art: string; menge: number }[]): number {
  return ereignisse.reduce((summe, e) => summe + (e.art === 'zombieGefallen' || e.art === 'spezialTreffer' ? e.menge : 0), 0)
}

export function muenzenFuerLauf(levelNr: number, ausgang: 'sieg' | 'niederlage', besiegt: number): number {
  return Math.floor(besiegt / 10) + (ausgang === 'sieg' ? 50 + 25 * levelNr : 0)
}
