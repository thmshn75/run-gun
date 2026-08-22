import type { SquadKind } from '../config/balance'

export type SquadOffset = {
  readonly laneOffset: number
  readonly yOffset: number
}

function centeredRow(count: number, spacing: number): number[] {
  return Array.from({ length: count }, (_value, index) => (index - (count - 1) / 2) * spacing)
}

// Spalten je Reihe. maxPerRow ist die Breitengrenze: Passt eine Reihe nicht, wird sie
// SCHMALER, nicht die Horde kleiner (Korrektur 2026-08-22). Vorher warf die Dichteregel
// Mitglieder weg, sobald die breiteste Reihe nicht passte - eine 14er-Horde kam bei
// Level 12 als Zweiergrueppchen an. Das war die eigentliche Ursache hinter Thomas'
// zweimal gemeldetem "die Horden sind viel zu klein in der Menge": Nicht die
// Gruppengroesse in der Leveltabelle war zu niedrig, sie kam nie auf den Schirm.
function rowCounts(kind: SquadKind, size: number, maxPerRow: number): number[] {
  const spalten = Math.max(1, Math.floor(maxPerRow))
  // Eine Reihe ist per Definition eine Reihe: Sie kann nicht in die Tiefe ausweichen
  // und wird deshalb als einzige weiterhin in der Groesse beschnitten.
  if (kind === 'row') return [Math.min(size, spalten)]
  if (kind === 'wedge') {
    const rows: number[] = []
    let remaining = size
    for (let nextRow = 1; remaining > 0; nextRow += 1) {
      const count = Math.min(nextRow, spalten, remaining)
      rows.push(count)
      remaining -= count
    }
    return rows
  }
  // Cluster: so breit wie der Platz hergibt, dann in die naechste Reihe. Die frueher
  // feste Obergrenze von vier Spalten ist entfallen - sie war eine zweite, aeltere
  // Breitengrenze neben maxPerRow und haette die perspektivische Verbreiterung wieder
  // aufgehoben.
  const rows: number[] = []
  let remaining = size
  while (remaining > 0) {
    const count = Math.min(spalten, remaining)
    rows.push(count)
    remaining -= count
  }
  return rows
}

export function computeSquadOffsets(
  kind: SquadKind,
  size: number,
  spacing: number,
  rowSpacing: number = spacing,
  maxPerRow: number = Number.POSITIVE_INFINITY,
): readonly SquadOffset[] {
  const safeSize = Math.max(1, Math.floor(size))
  const rows = rowCounts(kind, safeSize, maxPerRow)
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

// size ist immer offsets.length - die tatsaechlich aufgestellte Mitgliederzahl. Seit
// Reihen schmaler werden statt Horden kleiner, ist das nicht mehr dasselbe wie die
// angefragte Groesse: Eine 'row' kann nicht in die Tiefe ausweichen und wird gekuerzt.
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
  // Wie viele passen ueberhaupt nebeneinander? Erst diese Grenze, dann die Dichteregel.
  // Reihenfolge ist entscheidend: Waechst die Horde in die Tiefe, muss sie gar nicht
  // erst gestaucht oder verkleinert werden.
  const maxPerRow = Math.max(1, Math.floor((maxWidthPx - widestBodyWidth) / spacing) + 1)
  for (let currentSize = Math.max(1, Math.floor(size)); currentSize >= 1; currentSize -= 1) {
    const offsets = computeSquadOffsets(kind, currentSize, spacing, rowSpacing, maxPerRow)
    const rawWidth = getSquadWidth(offsets, widestBodyWidth)
    if (rawWidth <= maxWidthPx) return { offsets, size: offsets.length, spacing }
    const squeezedSpacing = spacing * ((maxWidthPx - widestBodyWidth) / (rawWidth - widestBodyWidth))
    if (squeezedSpacing >= minSpacing) {
      const gestaucht = computeSquadOffsets(kind, currentSize, squeezedSpacing, rowSpacing, maxPerRow)
      return { offsets: gestaucht, size: gestaucht.length, spacing: squeezedSpacing }
    }
  }
  return { offsets: computeSquadOffsets(kind, 1, spacing, rowSpacing, maxPerRow), size: 1, spacing }
}
