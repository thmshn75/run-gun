// Rechte Wand: unregelmaessige Goodies mit Garantie.
//
// Die frueheren Verstaerkungs-Angebote der linken Wand (Operator "+4", "x1.5",
// zustandsabhaengig gezogen) sind am 2026-08-22 entfallen: Links ist seither eine
// Sammelbahn aus gleichen "+1"-Plaettchen, die man durchfaehrt statt freischiesst.
// Viele kleine Quittungen schlagen wenige grosse - das war die Entscheidung nach dem
// Referenzvorbild.

// chance pro Segment, aber nie mehr als maxDry Nieten in Folge - sonst reisst der
// Waffen-Nachschub ab.
export function decideGoodie(drySpawns: number, chance: number, maxDry: number, rng: () => number): boolean {
  return drySpawns >= maxDry || rng() < chance
}
