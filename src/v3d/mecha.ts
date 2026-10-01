// N10: Entscheidend ist die Zunahme des Spalts beim Schritt gegenüber dem Stand.
export const MECHA_SCHRITT_S = 1.8
export interface MechaBein { huefte: number; knie: number; fuss: number }
export interface MechaPose { links: MechaBein; rechts: MechaBein; rumpfY: number; rumpfPendel: number }

// Einheitsachsen im Modellraum: Hüft- und Knöchelpaar, Knie-Zylinderachsen.
// Die Glieder werden per Quaternion um diese Achsen gedreht.
export const MECHA_ACHSEN = {
  huefte: [0.99987, 0, -0.01609],
  knieL: [0.98468, -0.17365, -0.01585],
  knieR: [0.98468, 0.17365, -0.01585],
  knoechel: [0.99987, -0.00033, -0.01609],
} as const

export function mechaSchrittProbe(sekunden: number, huefteGrad = 18, knieGrad = 35): MechaPose {
  const phase = 2 * Math.PI * sekunden / MECHA_SCHRITT_S
  const bein = (winkel: number): MechaBein => {
    const huefte = huefteGrad * Math.sin(winkel)
    const knie = -knieGrad * (1 - Math.cos(winkel)) / 2
    return { huefte, knie, fuss: -huefte - knie }
  }
  return {
    links: bein(phase), rechts: bein(phase + Math.PI),
    rumpfY: .03 * (1 - Math.cos(2 * phase)),
    rumpfPendel: 0,
  }
}

export function mechaPose(sekunden: number, laufend = true): MechaPose {
  if (!laufend) return { links: { huefte: 0, knie: 0, fuss: 0 }, rechts: { huefte: 0, knie: 0, fuss: 0 }, rumpfY: 0, rumpfPendel: 0 }
  return mechaSchrittProbe(sekunden)
}
