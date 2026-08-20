# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E3-Zusatz — Gegner-Tempo-Anzeige im HUD**

Thomas möchte beim Spielen sehen, wie schnell die Gegner gerade sind (die
Tempo-Rampe aus Balance-Zyklus 2 soll sichtbar werden). Kleiner, klar
umrissener Task — keine Spec-Härtung nötig. Nur `src/systems/spawner.ts`
und `src/scenes/GameScene.ts` ändern.

## Anforderungen

### 1. `src/systems/spawner.ts` — Tempo nach außen geben

Das in `update()` bereits berechnete, gecappte `enemySpeed` in einem privaten
Feld ablegen (Zustandsregel des Projekts: `!`-Feld, im Konstruktor mit
`BALANCE.enemy.speed` initialisiert — der Konstruktor dieses Moduls übernimmt
die Rolle von `create()`). Neuer public Getter:

```ts
public getEnemySpeed(): number {
  return BALANCE.scrollSpeed + this.currentEnemySpeed
}
```

Er liefert das Gesamt-Falltempo der Gegner in px/s (Scroll + Eigenanteil).
Sonst kein Diff in der Datei.

### 2. `src/scenes/GameScene.ts` — HUD erweitern

- HUD-Zeile erweitert um das Tempo, Format: `HP 3   ¢ 5   SPD 210`
  (`SPD` + gerundetes Gesamt-Tempo aus `spawner.getEnemySpeed()`).
- **Wichtig (Performance):** `setText` ist teuer und darf NICHT pro Frame
  laufen. Neues Feld `lastShownSpeed!: number` (in `create()` auf `-1`), in
  `update()` nach `spawner.update(dt)`:

```ts
const speed = Math.round(this.spawner.getEnemySpeed())
if (speed !== this.lastShownSpeed) {
  this.lastShownSpeed = speed
  this.updateHud()
}
```

  Bei 0,5 px/s Rampe ändert sich der gerundete Wert nur alle ~2 s.
- `updateHud()` liest das Tempo über denselben gerundeten Weg
  (`Math.round(this.spawner.getEnemySpeed())`), damit HUD-Aufrufe aus anderen
  Pfaden (Coins, Gates, Treffer) denselben Wert zeigen.

## Akzeptanzkriterien

1. `npm run check` (tsc) und `npm run build` laufen fehlerfrei.
2. HUD zeigt `SPD <Zahl>` und die Zahl steigt im Spielverlauf (per Code-Review
   nachvollziehbar: Getter liefert scrollSpeed + gecapptes Eigentempo).
3. `setText` wird weiterhin nur bei Wertänderungen aufgerufen, nie pro Frame
   (Guard über `lastShownSpeed`).
4. Keine neuen Dateien, keine Änderungen außerhalb `spawner.ts` und
   `GameScene.ts`, keine Balance-Werte angefasst.

## Implementation Summary
`spawner.ts`: Das bereits gecappte Gegner-Eigentempo liegt jetzt in
`currentEnemySpeed`, wird im Konstruktor mit dem Starttempo initialisiert und
ist über `getEnemySpeed()` als Gesamt-Falltempo (Scroll + Eigenanteil) verfügbar.

`GameScene.ts`: Das HUD zeigt zusätzlich `SPD <Zahl>`. Nach jedem
`spawner.update(dt)` wird das gerundete Tempo mit `lastShownSpeed` verglichen;
`setText` läuft deshalb nur beim Wechsel der angezeigten Ganzzahl. Andere
HUD-Pfade lesen denselben gerundeten Tempowert.

Testergebnisse: `npm run check` erfolgreich (Exit 0, `tsc --noEmit`);
`npm run build` erfolgreich (Exit 0, 20 Module, PWA-Precache mit 6 Einträgen).
Der Build meldet nur die bestehende Vite-Warnung zum 1.218-kB-JavaScript-Chunk,
kein Fehler.

Nicht gegangen: kein iPhone-/Browser-Spieltest, weil er nicht Teil dieses
Auftrags ist; die steigende Anzeige ist per Getter, gecappter Berechnung und
Änderungs-Guard im Code nachvollziehbar.

## Review Notes
Review 2026-08-20 (Claude): bestanden. Diff exakt nach Spec — Feld `currentEnemySpeed`
im Konstruktor initialisiert, Getter liefert Scroll + gecapptes Eigentempo, HUD-setText
läuft nur bei Wechsel der angezeigten Ganzzahl (Guard `lastShownSpeed`), nur die zwei
erwarteten Dateien geändert. `npm run check`/`npm run build` selbst ausgeführt, grün.
