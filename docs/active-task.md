# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E3-Zusatz — HP-Cap 20 + vollständige Stat-Anzeige im HUD**

Thomas' Wunsch: HP-Deckel von 12 auf 20, und das HUD soll ALLE Werte zeigen,
die sich durch Tore verändern (HP, Schaden, Schussrate, Projektile) — zusätzlich
zu Coins und Gegner-Tempo. Kleiner, klar umrissener Task — keine Spec-Härtung
nötig. Nur `src/config/balance.ts` und `src/scenes/GameScene.ts` ändern.

## Anforderungen

### 1. `src/config/balance.ts`

`stats.hp` von `{ base: 3, cap: 12 }` auf `{ base: 3, cap: 20 }`. Sonst nichts.

### 2. `src/scenes/GameScene.ts` — HUD zweizeilig

`updateHud()` baut zwei Zeilen (Phaser-Text mit `\n`):

```
HP 3   ¢ 12   SPD 210
DMG 1   RATE 3.5
```

**Änderung nach Thomas' Feedback (Nacharbeit):** `SHOTS` NICHT anzeigen — die
Projektilzahl ist am Fächer ohnehin sichtbar. Zweite Zeile enthält nur DMG und
RATE.

- Labels exakt wie die Tor-Überschriften aus `gates.ts` (`HP`, `DMG`, `RATE`),
  damit Thomas sofort sieht, welches Tor welchen HUD-Wert ändert.
- `DMG` und `RATE` können durch Tore krumm werden (clampStat rundet sie nicht):
  für die Anzeige auf 1 Dezimale runden — `Math.round(value * 10) / 10` — so
  erscheint `1`, `1.5`, `5.3`, nie `5.25000004`. `HP`, `SHOTS`, `¢`, `SPD`
  bleiben Ganzzahlen wie bisher.
- Alle Werte aus `this.runStats.get(...)`, Coins/SPD wie bisher.
- Die bestehende Update-Disziplin bleibt: `setText` läuft NUR über die schon
  vorhandenen ereignisgesteuerten `updateHud()`-Aufrufe (Tore, Treffer, Coins)
  und den `lastShownSpeed`-Guard — kein neuer Aufruf pro Frame.

## Akzeptanzkriterien

1. `npm run check` (tsc) und `npm run build` laufen fehlerfrei.
2. `balance.ts`: hp-cap ist 20; keine weitere Änderung in der Datei.
3. HUD zeigt beide Zeilen mit den Labels HP/¢/SPD und DMG/RATE (KEIN SHOTS);
   DMG und RATE auf 1 Dezimale gerundet.
4. Kein `setText` pro Frame (nur bestehende Pfade + SPD-Guard).
5. Keine neuen Dateien, keine Änderungen außerhalb `balance.ts` und
   `GameScene.ts`.

## Implementation Summary
`balance.ts`: ausschließlich den HP-Deckel von 12 auf 20 erhöht.

`GameScene.ts`: Das HUD hat jetzt zwei Zeilen: HP, Coins und Gegner-Tempo
sowie DMG und RATE. DMG und RATE werden für die Anzeige jeweils mit
`Math.round(value * 10) / 10` auf eine Dezimalstelle gerundet; der vorhandene
ereignisgesteuerte Update-Weg und der `lastShownSpeed`-Guard bleiben unverändert.

Testergebnisse: `npm run check` erfolgreich (Exit 0, `tsc --noEmit`);
`npm run build` erfolgreich (Exit 0, 20 Module, PWA-Precache mit 6 Einträgen).
Der Build meldet nur die bestehende Vite-Warnung zum 1,218-kB-JavaScript-Chunk,
keinen Fehler.

Nicht gegangen: Der vorgeschriebene externe Terminal-Start war nicht möglich,
weil in dieser Ausführungsumgebung keine Anwendung namens `Terminal` vorhanden
ist. Die beiden erfolgreichen Prüfungen liefen deshalb direkt in der
Projekt-Shell. Kein iPhone-/Browser-Spieltest, weil er nicht Teil dieses
Auftrags ist.

## Review Notes
Review 2026-08-20 (Claude): bestanden inkl. Nacharbeit. HP-Cap 20 in balance.ts
(einzige Änderung dort); HUD zweizeilig mit HP/¢/SPD und DMG/RATE, SHOTS nach
Thomas' Feedback entfernt; DMG/RATE auf 1 Dezimale gerundet; kein setText pro
Frame (bestehende Pfade + SPD-Guard). `npm run check`/`npm run build` selbst
ausgeführt, grün.
