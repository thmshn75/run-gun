export interface FormationSlot {
  readonly offsetX: number
  readonly offsetY: number
  readonly row: number
}

export interface FormationOptions {
  readonly rowSpacingY: number
  readonly colSpacing: number
  readonly minColSpacing: number
  readonly maxWidth: number
  readonly maxDepth: number
}

export function computeFormation(count: number, options: FormationOptions): FormationSlot[] {
  const slots: FormationSlot[] = []
  const total = Math.max(0, Math.floor(count))
  let remaining = total
  let rowCount = 0
  let capacity = 0
  while (capacity < total) {
    rowCount += 1
    capacity += rowCount
  }
  const effectiveRowSpacing = rowCount <= 1
    ? 0
    : Math.min(options.rowSpacingY, options.maxDepth / Math.max(1, rowCount - 1))
  let row = 0

  while (remaining > 0) {
    const slotsInRow = Math.min(remaining, row + 1)
    const spacing = slotsInRow === 1
      ? 0
      : Math.max(options.minColSpacing, Math.min(options.colSpacing, options.maxWidth / Math.max(1, slotsInRow - 1)))

    for (let column = 0; column < slotsInRow; column += 1) {
      slots.push({
        offsetX: (column - (slotsInRow - 1) / 2) * spacing,
        // The compressed spacing guarantees max(offsetY) <= maxDepth.
        offsetY: row * effectiveRowSpacing,
        row,
      })
    }

    remaining -= slotsInRow
    row += 1
  }

  return slots
}

/** Torlauf: rechteckige Masse, ohne den bestaetigten Dreieckszweig anzutasten. */
export function computeBlockFormation(count: number, options: FormationOptions & { readonly plaetzeJeReihe: number }): FormationSlot[] {
  const slots: FormationSlot[] = []
  const total = Math.max(0, Math.floor(count))
  const places = Math.max(1, Math.floor(options.plaetzeJeReihe))
  const rowCount = Math.ceil(total / places)
  const effectiveRowSpacing = rowCount <= 1
    ? 0
    : Math.min(options.rowSpacingY, options.maxDepth / Math.max(1, rowCount - 1))

  for (let row = 0; row < rowCount; row += 1) {
    const remaining = total - row * places
    const slotsInRow = Math.min(places, remaining)
    const spacing = slotsInRow === 1
      ? 0
      : Math.max(options.minColSpacing, Math.min(options.colSpacing, options.maxWidth / Math.max(1, slotsInRow - 1)))
    for (let column = 0; column < slotsInRow; column += 1) {
      slots.push({ offsetX: (column - (slotsInRow - 1) / 2) * spacing, offsetY: row * effectiveRowSpacing, row })
    }
  }
  return slots
}

/**
 * Gedraengter Haufen statt militaerischer Reihen: Die mittleren Reihen sind am
 * breitesten, vordere und hintere schmaler - von aussen liest sich das als Traube
 * (Thomas 2026-09-19: "meine Truppe eher als Traube aufbauen").
 *
 * Die Reihenzahl waechst mit der Wurzel der Menge, damit die Traube in beide
 * Richtungen gleichmaessig dicker wird statt nur breiter oder nur tiefer.
 */
export function computeTraubeFormation(count: number, options: FormationOptions & { readonly plaetzeJeReihe: number }): FormationSlot[] {
  const total = Math.max(0, Math.floor(count))
  if (total === 0) return []
  const maxReihen = Math.max(1, Math.ceil(total / Math.max(1, options.plaetzeJeReihe)) + 1)
  const reihen = Math.max(1, Math.min(maxReihen, Math.round(Math.sqrt(total * 0.9))))
  // Gewicht je Reihe nach der Breite einer Ellipse: aussen schmal, in der Mitte breit.
  const gewichte = Array.from({ length: reihen }, (_wert, reihe) => Math.sin(Math.PI * (reihe + 0.5) / reihen))
  const summe = gewichte.reduce((a, b) => a + b, 0)
  const proReihe = gewichte.map((gewicht) => Math.max(1, Math.round(total * gewicht / summe)))
  // Rundungsrest auf die breiteste Reihe geben, damit die Summe exakt stimmt.
  let rest = total - proReihe.reduce((a, b) => a + b, 0)
  while (rest !== 0) {
    const ziel = rest > 0
      ? proReihe.indexOf(Math.max(...proReihe))
      : proReihe.indexOf(Math.max(...proReihe.filter((wert) => wert > 1)))
    if (ziel < 0) break
    proReihe[ziel] += rest > 0 ? 1 : -1
    rest += rest > 0 ? -1 : 1
  }
  const reihenAbstand = reihen <= 1 ? 0 : Math.min(options.rowSpacingY, options.maxDepth / Math.max(1, reihen - 1))
  const slots: FormationSlot[] = []
  for (let reihe = 0; reihe < reihen; reihe += 1) {
    const inReihe = proReihe[reihe]
    const spacing = inReihe === 1
      ? 0
      : Math.max(options.minColSpacing, Math.min(options.colSpacing, options.maxWidth / Math.max(1, inReihe - 1)))
    // Jede zweite Reihe um eine halbe Luecke versetzt: dichter gepackt, weniger Gitter.
    const versatz = reihe % 2 === 0 ? 0 : spacing / 2
    for (let platz = 0; platz < inReihe; platz += 1) {
      slots.push({ offsetX: (platz - (inReihe - 1) / 2) * spacing + versatz, offsetY: reihe * reihenAbstand, row: reihe })
    }
  }
  return slots
}
