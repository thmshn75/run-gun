// Wandmuster der Dauerwaende (W4-Korrektur, Thomas 2026-08-22): Abschnitte aus
// runLength Kacheln, getrennt durch gapLength leere Slots — in die Luecken kann die
// Truppe bis an den Strassenrand ausweichen. Reine Funktion, ohne Phaser testbar.
export function isWallSlot(slotIndex: number, runLength: number, gapLength: number): boolean {
  const cycle = runLength + gapLength
  return ((slotIndex % cycle) + cycle) % cycle < runLength
}
