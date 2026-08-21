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
