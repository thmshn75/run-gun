// Reißleine D7r/Nacharbeit 1: Die sieben Glieder bleiben starr. Der zweite
// Gehversuch überschritt an den Knien den erlaubten Abstand von 0,05 m.
export const MECHA_SCHRITT_S = 1.2
export interface MechaBein { huefte: number; knie: number; fuss: number }
export interface MechaPose { links: MechaBein; rechts: MechaBein; rumpfY: number; rumpfPendel: number }

export function mechaPose(sekunden: number, laufend = true): MechaPose {
  if (!laufend) return { links: { huefte: 0, knie: 0, fuss: 0 }, rechts: { huefte: 0, knie: 0, fuss: 0 }, rumpfY: 0, rumpfPendel: 0 }
  const phase = 2 * Math.PI * sekunden / MECHA_SCHRITT_S
  return {
    links: { huefte: 0, knie: 0, fuss: 0 },
    rechts: { huefte: 0, knie: 0, fuss: 0 },
    rumpfY: .06 * (1 - Math.cos(2 * phase)),
    rumpfPendel: 4 * Math.sin(phase),
  }
}
