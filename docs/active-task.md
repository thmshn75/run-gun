# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E3-Balance-Zyklus 2 — Schwierigkeits-Progression + stärkerer Coin-Magnet**

Thomas' iPhone-Feedback: Start soll leichter sein, Schwierigkeit soll mit der
Spielzeit steigen (Gegner schneller UND dichter), und der Coin-Magnet ist zu
schwach (Münzen in der Nähe gehen verloren). Kleiner, klar umrissener Task —
keine Spec-Härtung nötig.

## Anforderungen

### 1. `src/config/balance.ts` — Zahlenänderungen

Im `enemy`-Block:

```ts
enemy: {
  hp: 3,
  speed: 30,                 // vorher 50 — leichterer Start
  speedRampPerSec: 0.5,      // NEU: px/s Zuwachs pro Spielsekunde
  speedMax: 150,             // NEU: Cap für den Eigenanteil (Gesamt-Deckel 180+150=330 px/s)
  spawnIntervalMs: 1600,     // vorher 1200 — leichterer Start
  spawnIntervalMinMs: 450,   // vorher 600 — dichteres Endgame
  spawnRampPerSec: 6,        // vorher 3 — steilere Dichte-Rampe (Minimum nach ~192 s)
},
```

Im `coins`-Block: `magnetRadius: 200` (vorher 140), `magnetSpeed: 900` (vorher 600).
`value` und `collectDistance` unverändert.

### 2. `src/systems/spawner.ts` — Tempo-Rampe

In `update()` vor der Bewegungs-Schleife EINMAL das aktuelle Tempo berechnen
(nicht pro Gegner neu):

```ts
const enemySpeed = Math.min(
  BALANCE.enemy.speedMax,
  BALANCE.enemy.speed + (this.elapsedMs / 1000) * BALANCE.enemy.speedRampPerSec,
)
```

und in der Schleife `BALANCE.enemy.speed` durch `enemySpeed` ersetzen.
Keine weiteren Strukturänderungen; Akkumulator-Muster und Recycling bleiben exakt
wie sie sind. Kein `time.addEvent`, kein `delayedCall`, kein `destroy()`.

### 3. Pool-Kommentare in `balance.ts` aktualisieren

Die Herleitungs-Kommentare müssen zu den neuen Zahlen passen (Worst Case = Endgame):

- `enemies`: 844px / (180 + 150)px/s = 2.56 s sichtbar; Spawn alle 0.45 s → ≈ 5.7
  gleichzeitig; 20 bleibt reichlich.
- `coins`: max. Kill-Rate 1 / 0.45 s; 844px / 180px/s = 4.7 s Sichtbarkeit →
  ≈ 10.4; 20 bleibt ausreichend (Magnet sammelt real schneller ein).

## Akzeptanzkriterien

1. `npm run check` (tsc) und `npm run build` laufen fehlerfrei.
2. `balance.ts` enthält exakt die Werte aus Anforderung 1; `speedRampPerSec` und
   `speedMax` liegen im `enemy`-Block.
3. `spawner.ts`: Tempo-Berechnung einmal pro `update()`-Aufruf vor der Schleife,
   mit `Math.min`-Cap; sonst kein Diff in der Datei.
4. Pool-Kommentare entsprechen den neuen Zahlen.
5. Keine neuen Dateien, keine Änderungen außerhalb `balance.ts` und `spawner.ts`.

## Implementation Summary
`balance.ts`: Gegner-Starttempo auf 30 gesenkt, Tempo-Rampe mit 0,5 px/s je
Spielsekunde und 150-px/s-Cap ergänzt; Spawn-Frequenz von 1.600 ms auf mindestens
450 ms mit 6 ms/s-Rampe gesetzt. Coin-Magnet auf Radius 200 und Tempo 900 erhöht;
die Pool-Herleitungen rechnen den Endgame-Fall.

`spawner.ts`: Das gecappte Gegner-Eigentempo wird je `update()` einmal berechnet
und für alle aktiven Gegner verwendet; Akkumulator und Recycling sind unverändert.

Testergebnisse: `npm run check` erfolgreich (Exit 0, `tsc --noEmit`); `npm run build`
erfolgreich (Exit 0, 20 Module, PWA-Precache mit 6 Einträgen). Der Build meldet
nur die bestehende Vite-Hinweiswarnung zum 1.218-kB-JavaScript-Chunk, kein Fehler.

Nicht prüfbar: iPhone-Gamefeel benötigt Thomas' Gerätetest nach Deploy; sonst
gab es keine blockierten Prüfungen.

## Review Notes
Review 2026-08-20 (Claude): bestanden. Diff exakt nach Spec — balance.ts trägt alle
acht neuen Werte, spawner.ts berechnet das gecappte Tempo einmal pro update() vor
der Schleife (sonst kein Diff), Pool-Kommentare rechnen den Endgame-Fall, nur die
erwarteten Dateien geändert. `npm run check` und `npm run build` selbst ausgeführt,
beide grün. Offen: iPhone-Gamefeel-Test durch Thomas nach Deploy.
