import type { SquadKind } from '../config/balance'

export type SquadOffset = {
  readonly laneOffset: number
  readonly yOffset: number
}

function centeredRow(count: number, spacing: number): number[] {
  return Array.from({ length: count }, (_value, index) => (index - (count - 1) / 2) * spacing)
}

function rowCounts(kind: SquadKind, size: number): number[] {
  if (kind === 'row') return [size]
  if (kind === 'wedge') {
    const rows: number[] = []
    let remaining = size
    for (let nextRow = 1; remaining > 0; nextRow += 1) {
      const count = Math.min(nextRow, remaining)
      rows.push(count)
      remaining -= count
    }
    return rows
  }
  const rows: number[] = []
  let remaining = size
  while (remaining > 0) {
    const count = Math.min(4, remaining)
    rows.push(count)
    remaining -= count
  }
  return rows
}

export function computeSquadOffsets(kind: SquadKind, size: number, spacing: number, rowSpacing: number = spacing): readonly SquadOffset[] {
  const safeSize = Math.max(1, Math.floor(size))
  const rows = rowCounts(kind, safeSize)
  const offsets: SquadOffset[] = []
  const rowCenter = (rows.length - 1) / 2
  rows.forEach((count, rowIndex) => {
    const yOffset = kind === 'wedge'
      ? (rowCenter - rowIndex) * rowSpacing
      : (rowIndex - rowCenter) * rowSpacing
    for (const laneOffset of centeredRow(count, spacing)) offsets.push({ laneOffset, yOffset })
  })
  return offsets
}

export function getSquadWidth(offsets: readonly SquadOffset[], widestBodyWidth: number): number {
  const maximumOffset = offsets.reduce((maximum, offset) => Math.max(maximum, Math.abs(offset.laneOffset)), 0)
  return maximumOffset * 2 + widestBodyWidth
}

export type HordeLayout = Readonly<{ offsets: readonly SquadOffset[]; size: number; spacing: number }>

// Dichteregel (W3, Thomas 2026-08-22): Waechst eine Horde, ruecken die Mitglieder
// enger zusammen statt breiter zu werden — dieselbe Regel wie bei der eigenen Truppe.
// Erst wird das Spacing bis zur Ueberlappungsgrenze gestaucht; nur wenn selbst die
// dichteste Aufstellung zu breit ist, wird verkleinert (Notausgang, kein Default).
export function computeHordeOffsets(
  kind: SquadKind,
  size: number,
  spacing: number,
  rowSpacing: number,
  widestBodyWidth: number,
  maxWidthPx: number,
): HordeLayout {
  const minSpacing = widestBodyWidth + 4
  for (let currentSize = Math.max(1, Math.floor(size)); currentSize >= 1; currentSize -= 1) {
    const offsets = computeSquadOffsets(kind, currentSize, spacing, rowSpacing)
    const rawWidth = getSquadWidth(offsets, widestBodyWidth)
    if (rawWidth <= maxWidthPx) return { offsets, size: currentSize, spacing }
    const squeezedSpacing = spacing * ((maxWidthPx - widestBodyWidth) / (rawWidth - widestBodyWidth))
    if (squeezedSpacing >= minSpacing) {
      return { offsets: computeSquadOffsets(kind, currentSize, squeezedSpacing, rowSpacing), size: currentSize, spacing: squeezedSpacing }
    }
  }
  return { offsets: computeSquadOffsets(kind, 1, spacing, rowSpacing), size: 1, spacing }
}
