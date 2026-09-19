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
