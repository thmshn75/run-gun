# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Boss-Salvengröße = Levelnummer auf den ersten Leveln: L1 ein Schuss, L2 zwei, L3 drei,
ab L4 wie gehabt.**

Thomas, 2026-08-21: „Boss in Level 1 nur 1 Schuss, in Level 2 2 und in Level 3 3 und dann
wie gehabt weiter."

---

## Auftrag

Die Salvengröße beider Phasen wird zusätzlich durch die Levelnummer gedeckelt:

- **Phase 1:** `burstCount = min(BALANCE.boss.phaseOne.burstCount, level)` → L1: 1, L2: 2, ab L3: 3 (wie gehabt).
- **Phase 2:** `burstCount = min(bisherige Staffelformel, level)` → L1: 1, L2: 2, L3: 3,
  L4–6: 4, ab L7: 5 — ab L3 identisch mit dem heutigen Stand.
- `burstSpreadPx` beider Phasen bleibt **unverändert** (bei 1 Schuss ist die Breite ohnehin bedeutungslos).

Umsetzung in `src/systems/bossPlan.ts`:
1. Analog zu `getPhaseTwoProfile(level)` auch ein `getPhaseOneProfile(level)` einführen
   (liefert `BALANCE.boss.phaseOne` mit level-gedeckeltem `burstCount`); `getBossPlan` nutzt
   beide. `plan.phaseOne` ist damit nicht mehr die direkte `BALANCE`-Referenz — der bestehende
   Test `expect(plan.phaseOne).toBe(BALANCE.boss.phaseOne)` muss auf Wertgleichheit bei
   Level ≥ 3 umgestellt werden.
2. In `getPhaseTwoProfile` den Level-Deckel ergänzen.
3. Kein neuer Balance-Wert nötig: Der Deckel ist die Levelnummer selbst, keine Stellschraube.

## Bekannte Falle: Division durch Null bei Einzelschuss

`src/systems/boss.ts`, `fireBurst` (Zeile ~162):

```ts
const stepX = burstSpreadPx / (burstCount - 1)
```

Bei `burstCount === 1` ist das `Infinity`, und `startX + stepX * 0` ergibt in JavaScript
`NaN` (`Infinity * 0 === NaN`) — das Projektil hätte keine gültige Position. **`fireBurst`
muss den Fall `burstCount === 1` behandeln:** ein einzelner Schuss startet zentriert auf
`this.enemy.x`. Das ist die einzige zulässige Änderung in `boss.ts`.

## Akzeptanzkriterien
1. `getBossPlan(1, …).phaseOne.burstCount === 1` und `.phaseTwo.burstCount === 1`;
   Level 2 → 2/2; Level 3 → 3/3; Level 4 → 3/4; Level 7 → 3/5; Level 12 → 3/5.
2. Ein Test ruft die Einzelschuss-Logik ab (direkt oder über die Profile) und stellt sicher,
   dass bei `burstCount 1` keine `NaN`-/`Infinity`-Position entsteht — z. B. indem die
   Positionsrechnung aus `fireBurst` als reine Funktion testbar gemacht wird
   (`getBurstOffsets(burstCount, spreadPx): number[]`, von `fireBurst` benutzt).
3. `burstSpreadPx`, `fireIntervalMs`, Kampfdauer-Staffelung, Geometrie-Test: unverändert grün.
4. `npm run check`, `npm run build`, `npm test` sauber.

## Reißleine
Falls die Einzelschuss-Behandlung in `fireBurst` mehr als ~10 Zeilen Umbau erfordert, stoppen
und melden statt `boss.ts` umzustrukturieren. **Kein zulässiger Ersatz:** `burstCount 1` durch
`spread 0` mit 2 Schüssen simulieren oder den NaN-Fall unbehandelt lassen, „weil es optisch
funktioniert".

## Implementation Summary

- Phase 1 und Phase 2 deckeln ihre Salvengröße jetzt mit der Levelnummer; Ausbreitung,
  Feuerintervalle und Kampfdauer bleiben unverändert.
- Die reine Offset-Berechnung setzt Einzelschüsse auf `0`, sodass sie genau auf der Boss-Mitte
  starten und keine `NaN`-/`Infinity`-Position entsteht.
- Verifiziert mit `npm run check`, `npm run build` und `npm test` (13 Dateien, 70 Tests grün).
