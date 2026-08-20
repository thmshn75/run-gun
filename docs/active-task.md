# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E3-Zusatz — Gegner-Tempo als fünfter Stat (SPD-Tore, Anzeige 1–200)**

Thomas' Auftrag: Gegner-Falltempo startet bei 150 px/s, Anstieg um maximal
+200 (Deckel 350). Im HUD als GANZE Zahl 1–200 angezeigt (Tempo-Zuwachs seit
Start, kein Komma). Die vorhandenen Tor-Paare betreffen manchmal die
Geschwindigkeit — SPD wird fünfter Stat im bestehenden System. Untergrenze
100 px/s, damit Gegner nie stehenbleiben.

Zu ändern: `src/config/balance.ts`, `src/systems/upgrades.ts`,
`src/systems/spawner.ts`, `src/systems/gates.ts`, `src/scenes/GameScene.ts`.

## Anforderungen

### 1. `src/config/balance.ts`

Jeder Stat-Eintrag bekommt ein `floor`-Feld; neuer Stat `speed`:

```ts
stats: {
  hp: { base: 3, cap: 20, floor: 0 },
  damage: { base: 1, cap: 20, floor: 1 },
  shotsPerSec: { base: 3.5, cap: 8, floor: 1 },
  projectiles: { base: 1, cap: 5, floor: 1 },
  speed: { base: 150, cap: 350, floor: 100 }, // Gegner-Falltempo px/s; cap = base + 200
},
```

Im `enemy`-Block: `speed: 30` und `speedMax: 150` ERSATZLOS entfernen
(`speedRampPerSec: 0.5` bleibt, hp/spawn-Werte bleiben). Pool-Kommentar
`enemies` neu herleiten — Worst Case ist NICHT das Höchsttempo, sondern
langsames Tempo spät im Run: bei t ≈ 192 s (Spawn-Minimum 0,45 s erreicht)
ist das niedrigste erreichbare Tempo ≈ 196 px/s (Floor 100 + Rampe
0,5 × 192), Sichtbarkeit 844 / 196 ≈ 4,3 s → ≈ 9,6 Gegner gleichzeitig;
Pool 20 bleibt sicher.

### 2. `src/systems/upgrades.ts`

- `StatKey` um `'speed'` erweitern.
- `STAT_COLORS.speed = 0xced4da` (identisch zur bisherigen SPD-HUD-Farbe).
- `clampStat` generisch machen: Floor aus `BALANCE.stats[stat].floor` lesen
  (keine hp-Sonderlogik mehr); ganzzahlig runden für `hp`, `projectiles` UND
  `speed`.
- `RunStats`-Konstruktor: `speed: BALANCE.stats.speed.base` ergänzen.

### 3. `src/systems/spawner.ts`

- `RunStats` per Konstruktor injizieren (gleiches Muster wie `Weapons`/`Gates`);
  `GameScene` reicht die Instanz durch.
- Falltempo ist jetzt der ABSOLUTWERT aus dem Stat (kein `scrollSpeed`-Anteil
  mehr — die 150 sind das komplette Tempo):

```ts
public getEnemySpeed(): number {
  return Math.min(
    BALANCE.stats.speed.cap,
    this.runStats.get('speed') + (this.elapsedMs / 1000) * BALANCE.enemy.speedRampPerSec,
  )
}
```

- In `update()` einmal pro Aufruf berechnen und für alle Gegner verwenden:
  `enemy.y += (enemySpeed * dt) / 1000`. Feld `currentEnemySpeed` entfällt
  (der Getter rechnet direkt; er wird nur ereignisgesteuert plus einmal pro
  Frame gelesen).
- Der `Math.min`-Cap MUSS im Getter liegen, damit Rampe + Tor-Erhöhungen
  zusammen nie über 350 gehen (`runStats.speed` selbst capt clampStat bei 350,
  die Rampe kommt obendrauf — deshalb der zweite Deckel hier).

### 4. `src/systems/gates.ts`

- Stat-Auswahl in `spawn()`: `pick<StatKey>(['hp', 'damage', 'shotsPerSec',
  'projectiles', 'speed'], this.rng)` — SPD-Tore kommen damit im Schnitt bei
  jedem fünften Tor. ACHTUNG: Diese Liste ist die EINZIGE Stelle des Tasks,
  die der Compiler nicht absichert (`pick<T>` erzwingt keine Vollständigkeit
  gegenüber `StatKey`) — wird `'speed'` hier vergessen, kompiliert alles,
  aber SPD-Tore spawnen nie. Deshalb eigenes Akzeptanzkriterium unten.
- `statLabel`-Map um `speed: 'SPD'` ergänzen.
- Der hp-Sackgassen-Schutz in `applyPair` bleibt unverändert hp-spezifisch
  (der speed-Floor 100 verhindert Stillstand von selbst).
- `drawGatePair` bleibt generisch — keine Änderung nötig; der
  Gleichheits-Redraw über `clampStat` deckt Floor/Cap-Kollisionen ab.
- Bewusst akzeptiert (KEIN Umbau in diesem Task): Tor-Labels zeigen die
  Operation/den Rohwert, nicht das durch Floor/Cap geklemmte Ergebnis. Bei
  speed ist das früh spürbar (÷2 bei 150 → Label suggeriert −75, real wirken
  −50 wegen Floor 100). Existiert bei den Bestandsstats genauso; falls es am
  iPhone stört, wird es ein eigener späterer Balance-Zyklus.

### 5. `src/scenes/GameScene.ts`

- `new Spawner(this, this.runStats)` — `runStats` wird in `create()` VOR dem
  Spawner erzeugt (ist schon so).
- SPD-Anzeige als ganze Zahl 1–200 (Tempo-Zuwachs seit Start). WICHTIG: Die
  Formel als EINE private Methode anlegen und an BEIDEN Stellen verwenden —
  es gibt zwei unabhängige Nutzer (der Guard-Vergleich in `update()` UND das
  `setText` in `updateHud()`); wird nur eine Stelle umgestellt, zeigt das HUD
  weiter den Rohwert 150–350:

```ts
private getSpdShown(): number {
  return Math.max(1, Math.round(this.spawner.getEnemySpeed() - BALANCE.stats.speed.base))
}
```

  Start (150) → `SPD 1`, Deckel (350) → `SPD 200`; sinkt das Tempo durch ein
  SPD-Tor unter den Startwert, bleibt die Anzeige bei `1` (bewusste
  Entscheidung, in der Spec fixiert). KEIN Komma, keine Dezimalstelle.
- Der `lastShownSpeed`-Guard vergleicht ab jetzt `getSpdShown()` (die
  angezeigte ganze Zahl), Startwert `-1` bleibt — `updateHud()` feuert weiter
  nur bei echten Anzeigewechseln.
- SPD-Tore wirken über `runStats` → der bestehende `onStatsChanged`-Pfad der
  Gates ruft `updateHud()` bereits; kein neuer Aufrufpfad nötig.

## Akzeptanzkriterien

1. `npm run check` (tsc) und `npm run build` laufen fehlerfrei.
2. `clampStat` liest Floors aus `BALANCE.stats[stat].floor`; `speed` wird
   ganzzahlig gerundet; kein hp-Sonderfall mehr im Floor-Code.
3. `enemy.speed`/`enemy.speedMax` existieren nicht mehr; grep auf
   `scrollSpeed` in `spawner.ts` ist leer (Falltempo = Stat-Absolutwert).
4. `getEnemySpeed()` deckelt Rampe + Tor-Boni gemeinsam bei
   `BALANCE.stats.speed.cap`.
5. Die `pick`-Liste in `gates.ts` enthält `'speed'` (grep bestätigt — tsc
   fängt diesen Fehler NICHT); SPD-Tore tragen Label `SPD` und die Farbe
   `0xced4da`.
6. HUD zeigt `SPD` als ganze Zahl 1–200 über die private Methode
   `getSpdShown()`, die an BEIDEN Stellen (Guard-Vergleich und `setText` in
   `updateHud()`) verwendet wird — kein zweiter Inline-Rohwert mehr.
7. Kein `setText` pro Frame (Guard auf `getSpdShown()`); kein
   `destroy()`/`create()` im Hot Path, kein `time.addEvent`/`delayedCall`.
8. Keine neuen Dateien; keine Änderungen außerhalb der fünf genannten Dateien.

## Reißleine
Läuft die Umsetzung inkl. eines Nacharbeitszyklus nicht grün durch, stoppen
und Thomas informieren statt weiterbohren (Kern-Risiko: clampStat-Umbau
berührt alle Tore).

## Implementation Summary
E3-Zusatz umgesetzt: Alle Stats haben nun einen Floor; `speed` ist der fünfte
Stat (150–350 px/s, Floor 100), inklusive ganzzahligem Clamping, Gate-Farbe
und SPD-Label. Der Spawner erhält `RunStats`, verwendet Tempo als Absolutwert
und deckelt Stat plus Rampe gemeinsam bei 350 px/s. Die Gate-Auswahlliste
enthält `speed`; das HUD zeigt den Zuwachs als 1–200 über die einzige Methode
`getSpdShown()` im Guard und beim Setzen des Texts.

Testergebnisse: `npm run check` — erfolgreich (Exit 0); `npm run build` —
erfolgreich (Exit 0). Die statischen Checks bestätigen den Speed-Eintrag, die
`speed`-Pick-Liste, `getSpdShown()` an beiden HUD-Stellen sowie das Fehlen von
`enemy.speed`, `enemy.speedMax`, `currentEnemySpeed` und `scrollSpeed` im
Spawner. Keine Akzeptanzprüfung blockiert. Vite meldet lediglich die
nicht-blockierende Chunk-Größenwarnung für das erzeugte JavaScript-Bundle.

## Review Notes
Diff exakt nach Spec: clampStat generisch über `{cap, floor}` aus BALANCE,
speed als fünfter Stat inkl. Rundung; Spawner mit RunStats-Injektion,
Falltempo als Absolutwert, Cap im Getter (Rampe + Tor-Boni gemeinsam);
pick-Liste und statLabel um speed erweitert; `getSpdShown()` an beiden
HUD-Stellen. Selbst verifiziert: grep `scrollSpeed` in spawner.ts leer,
`'speed'` in gates.ts vorhanden, `npm run check` und `npm run build` grün.
Alle 8 Akzeptanzkriterien erfüllt → APPROVED.
