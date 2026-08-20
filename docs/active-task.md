# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E4a-Nacharbeit 2 — GUNS geht in TEAM auf, alle Figuren feuern reihum, SPD ohne Zeitzuschlag**

Zwei Entscheidungen von Thomas nach dem zweiten iPhone-Test, beide bewusst getroffen:
1. Die Stats TEAM und GUNS werden **eine** Größe. Jede Figur der Truppe feuert sichtbar.
   Der GUNS-Stat, seine HUD-Anzeige und sein Tor entfallen ersatzlos.
2. Das Gegnertempo kommt ausschließlich aus dem SPD-Stat. Der Zeitzuschlag entfällt.

**Nicht Teil dieses Tasks:** E4b (Zusatzwaffen + Waffen-Tore), E4c (Gegner als Truppen),
Hintergrundgestaltung. Formation, Kollisionshülle und Drag-Verhalten werden nicht angefasst.

## Befund zu Entscheidung 2 (Messung)

Das tatsächliche Gegnertempo ist heute `min(305, SPD + 0,5 × Laufzeit in Sekunden)`. Sobald
diese Summe die Decke von 305 erreicht, senkt ein Verlangsamungs-Tor zwar den Stat und die
HUD-Zahl, aber nicht das Tempo. Gerechnet bei SPD 305:

| Laufzeit | Tor „−20 %" | Tor „−30 %" | Tor „÷2" |
|---|---|---|---|
| 60 s  | 305 → 274 | 305 → 244 | 305 → 183 |
| 120 s | 305 → 304 | 305 → 274 | 305 → 213 |
| 180 s | **305 → 305 (wirkungslos)** | 305 → 304 | 305 → 243 |
| 240 s | **305 → 305 (wirkungslos)** | **305 → 305 (wirkungslos)** | 305 → 273 |

Zusätzlich holt der Zuschlag jede Senkung wieder ein: 60 Punkte weniger sind nach genau
120 Sekunden vollständig kompensiert. Deshalb entfällt der Zuschlag ganz — die
Schwierigkeit steigt weiterhin von selbst über die Spawnrate (1600 ms → 450 ms).

## Anforderungen

### 1. `src/systems/upgrades.ts` — Stat `projectiles` entfällt

- `StatKey` wird `'hp' | 'damage' | 'shotsPerSec' | 'speed'`.
- `RunStats` initialisiert entsprechend nur noch vier Werte.
- `clampStat` behält seine Rundungsregel unverändert (ganzzahlig für `hp` und `speed`,
  eine Nachkommastelle für `damage` und `shotsPerSec`).

### 2. `src/config/balance.ts`

- `stats.projectiles` ersatzlos entfernen.
- `crowd.shooters: 5` in **`crowd.shootersPerSalvo: 5`** umbenennen. Bedeutung ändert sich:
  Es ist nicht mehr die Zahl der dauerhaft feuernden Figuren, sondern die Zahl der Figuren,
  die **pro Salve gleichzeitig** feuern. Kommentar entsprechend setzen.
- `crowd.damagePerExtraFigure` und `crowd.damageMultiplierCap` bleiben unverändert und
  rechnen weiter gegen `shootersPerSalvo` (bei TEAM 30 also weiterhin der Vierfach-Cap).
- `enemy.speedRampPerSec` ersatzlos entfernen. `enemy.spawnRampPerSec`,
  `enemy.spawnIntervalMs` und `enemy.spawnIntervalMinMs` bleiben **unverändert** — der
  Schwierigkeitsanstieg läuft ab jetzt allein über die Spawndichte.
- Kommentar an `pools.projectiles` neu herleiten: 8 Schuss/s × 5 Figuren pro Salve ×
  1,12 s Flugzeit = 45; 64 behält Reserve. Der Wert 64 selbst bleibt.

### 3. `src/systems/crowd.ts` — Rundlauf durch die Truppe

- `getShooterPositions(maxShooters)` wird ersetzt durch
  ```ts
  public getNextSalvoPositions(maxPerSalvo: number): Array<{ x: number; y: number }>
  ```
- Neues privates Feld `salvoCursor: number`, mit `0` initialisiert.
- Verhalten: Die aktiven Figuren werden in **Slot-Reihenfolge** betrachtet (Index im
  `members`-Array, das die Formation von der vordersten Reihe nach hinten füllt). Ab
  `salvoCursor` werden bis zu `maxPerSalvo` aktive Figuren entnommen, mit Wrap-around auf
  den Anfang, wenn das Ende erreicht ist. Danach zeigt `salvoCursor` auf die Figur nach der
  zuletzt entnommenen. Wirkung: Über mehrere Salven kommt jede Figur der Truppe sichtbar
  an die Reihe, vorne beginnend — bei TEAM 30 feuert jede Figur alle sechs Salven.
- Ist die Truppe kleiner oder gleich `maxPerSalvo`, feuern schlicht alle; das Array ist dann
  kürzer und der Cursor läuft weiter korrekt.
- Bei Truppengröße 0 ein leeres Array liefern.
- In `setSize()` am Ende `this.salvoCursor = 0` setzen. Grund: Nach einem Treffer oder einem
  TEAM-Tor ändert sich die Zahl aktiver Figuren; ein stehengebliebener Cursor würde sonst
  auf eine inaktive Figur oder über das Ende zeigen und einzelne Reihen dauerhaft
  überspringen.
- `setSize`, `setAnchorX`, `getAnchorRange`, `getHullBounds`, `setFiguresAlpha` und
  `update()` bleiben davon abgesehen **unverändert**.

### 4. `src/systems/weapons.ts` — feste Salvengröße statt GUNS

- Konstruktor-Argument heißt `getSalvoPositions: (maxPerSalvo: number) => Array<{ x: number; y: number }>`.
- In `fire()`: `const origins = this.getSalvoPositions(BALANCE.crowd.shootersPerSalvo)`.
  Der Zugriff `this.runStats.get('projectiles')` entfällt ersatzlos.
- **Das ist der Kern der Performance-Zusage:** Pro Salve entstehen weiterhin höchstens
  5 Projektile, unabhängig von der Truppengröße. Sichtbar feuern trotzdem alle Figuren,
  weil die Salve reihum wandert. Bei voller Truppe und maximaler RATE bleiben so rund
  45 Projektile gleichzeitig aktiv statt der rund 270, die ein echtes Dauerfeuer aller
  30 Figuren erzeugen würde.
- `runStats` wird in `weapons.ts` weiterhin für `shotsPerSec` gebraucht — nicht entfernen.
- `warnPoolExhausted()` bleibt unverändert.

### 5. `src/scenes/GameScene.ts` — HUD auf drei Stat-Spalten

- `HudSegments`: Feld `shots` ersatzlos entfernen.
- Die Stat-Zeile hat jetzt drei statt vier Spalten: `const colW = panelW / 3`, Positionen
  `colW * 0.5` (DMG), `colW * 1.5` (RATE), `colW * 2.5` (SPD). Panelgröße, Farben,
  Schriftgrößen und die obere Zeile (TEAM links, Münzen rechts) bleiben unverändert.
- `updateHud()`: Die Zeile für `GUNS` entfällt. Die übrigen Zeilen bleiben wie sie sind,
  inklusive `SPD ${Math.round(this.runStats.get('speed'))}`.
- Die `Weapons`-Instanz wird mit
  `(maxPerSalvo) => this.crowd.getNextSalvoPositions(maxPerSalvo)` konstruiert.
- `getCrowdDamageMultiplier()` rechnet gegen `BALANCE.crowd.shootersPerSalvo` statt
  `BALANCE.crowd.shooters`; die Formel selbst bleibt identisch.
- `syncCrowdSize`, `handlePlayerHit`, `handleProjectileHit`, Coins- und Gate-Verdrahtung
  bleiben unverändert.

### 6. `src/systems/spawner.ts` — Tempo ohne Zeitzuschlag

- `getEnemySpeed()` liefert nur noch `this.runStats.get('speed')`. Kein `Math.min`, kein
  Zuschlag. Der Wert ist durch `clampStat` bereits auf `[70, 305]` begrenzt.
- `this.elapsedMs` wird weiterhin gebraucht (Spawn-Ramp, Trefferblitz-Timing) und bleibt.
- Spawn-Korridor, Pool und Recycling bleiben unverändert.

### 7. `src/systems/gates.ts` — vier Stats statt fünf

- In `refillBag()` das Array auf `['hp', 'damage', 'shotsPerSec', 'speed']` kürzen. Wirkung:
  In je vier aufeinanderfolgenden Toren kommt jede Stat genau einmal, nie zweimal
  hintereinander.
- In `statLabel()` den Eintrag `projectiles: 'GUNS'` entfernen.
- Die Torlogik (`drawGateOp`, `drawDirectionalOp`, `drawGatePair`, gerichteter Fallback,
  hp-0-Schutz) bleibt **unverändert**.

### 8. `src/config/colors.ts` — einen Eintrag entfernen

`STAT_COLORS` ist über `StatKey` getypt; der Eintrag `projectiles` muss deshalb mit
entfernt werden, sonst schlägt `npm run check` fehl. **Nur dieser eine Eintrag** — alle
übrigen Farben bleiben unangetastet.

## Akzeptanzkriterien

1. `npm run check` und `npm run build` laufen fehlerfrei.
2. `grep -rn "GUNS\|projectiles" src/` liefert nur noch Treffer für `pools.projectiles`
   und die Projektil-Objekte selbst in `weapons.ts` — keinen einzigen mehr für den Stat.
3. `grep -rn "speedRampPerSec\|getShooterPositions\|crowd.shooters\b" src/` liefert
   keinen Treffer.
4. **Projektil-Deckel nachweisbar:** In `weapons.ts` hängt die Zahl der pro `fire()`
   aktivierten Projektile ausschließlich an `BALANCE.crowd.shootersPerSalvo` und an der
   Truppengröße, nicht an einem Stat. Im Abschlussbericht die Obergrenze ausrechnen
   (8 Schuss/s × 5 = 40 Projektile/s, bei 1,12 s Flugzeit rund 45 gleichzeitig — Pool 64).
5. **Rundlauf nachweisbar:** Wegwerf-Skript außerhalb von `src/` (nicht einchecken), das
   `getNextSalvoPositions` isoliert prüft: Bei Truppengröße 30 und `maxPerSalvo` 5 kommt
   nach sechs aufeinanderfolgenden Salven jede der 30 Figuren genau einmal vor; nach
   zwölf Salven genau zweimal. Bei Truppengröße 3 liefert jede Salve alle drei Figuren.
   Ergebnis im Bericht angeben.
6. **Cursor-Reset:** Nach `setSize()` mit geänderter Größe beginnt die nächste Salve wieder
   bei der vordersten Figur. Ebenfalls im Wegwerf-Skript prüfen.
7. SPD: `getEnemySpeed()` gibt exakt den Stat zurück. Im Bericht vorrechnen, dass ein
   „−30 %"-Tor bei SPD 305 das Tempo unabhängig von der Laufzeit auf 214 senkt — der in
   der Befundtabelle dokumentierte Wirkungsverlust existiert nicht mehr.
8. HUD: Obere Zeile unverändert (TEAM links, Münzen rechts), untere Zeile zeigt genau drei
   Werte — DMG, RATE, SPD — gleichmäßig über die Panelbreite verteilt.
9. Tore: Es erscheinen nur noch TEAM-, DMG-, RATE- und SPD-Tore. Die Prüfung aus der
   letzten Runde bleibt gültig — kein Torpaar mit einer wirkungslosen Seite; per
   Wegwerf-Skript für `hp@30`, `damage@1`, `damage@20`, `shotsPerSec@8`, `speed@70`,
   `speed@305` mit je 20.000 Ziehungen erneut bestätigen (Grenze: unter 1 %).
10. Formation und Kollision unangetastet: `git diff` zeigt keine Änderung in
    `formation.ts`, und in `crowd.ts` nur den Rundlauf (`salvoCursor`,
    `getNextSalvoPositions`, Reset in `setSize`) — keine Änderung an Hüllengeometrie,
    Slot-Zuweisung, Tiefensortierung oder `getAnchorRange`.
11. Ein Kurztest im Dev-Server ist erlaubt, aber **kein** Nachweis: Ob das Feuerbild bei
    voller Truppe gut aussieht und ob das Tempo ohne Zeitzuschlag stimmig ist, beurteilt
    Thomas am iPhone.

## Reißleine
Sieht der Rundlauf im Spiel unruhig aus (Figuren feuern erkennbar stotternd, das Feuerbild
flackert), **nicht weiterbohren**: `getNextSalvoPositions` auf das alte Verhalten
zurücknehmen — immer die vordersten `shootersPerSalvo` Figuren — und alle übrigen
Anforderungen unverändert liefern. Anforderungen 1, 2, 5, 6, 7 und 8 sind davon unabhängig
und müssen in jedem Fall stehen.

## Nicht ändern
- `src/systems/formation.ts`, `src/systems/coins.ts`, `src/scenes/GameOverScene.ts`,
  `src/scenes/BootScene.ts`.
- Kollisionshüllen-Geometrie, Formationslayout, Drag-Clamp, Spawn-Korridor.
- Torlogik aus der letzten Runde, Torgeometrie, HUD-Panelgröße und -Farben,
  `vite.config.ts`, `index.html`, `docs/plan.md`.
- Alle Balance-Werte außer den unter Anforderung 2 genannten.

## Implementation Summary
GUNS wurde vollständig in TEAM integriert: Der Stat, sein HUD-Feld, seine Farbe und seine
Tore entfallen. Die drei HUD-Spalten sind jetzt DMG, RATE und SPD; oberhalb bleiben TEAM
und Münzen unverändert. Waffen feuern pro Salve fest höchstens fünf Projektile, rotieren
aber per `salvoCursor` in Slot-Reihenfolge durch alle aktiven Team-Figuren; `setSize()`
setzt den Cursor nach jeder Größenänderung zurück.

SPD steuert das Gegnertempo ohne Zeitrampe direkt; der Schwierigkeitsanstieg bleibt allein
an der unveränderten Spawnrate. Die Gate-Auswahl enthält nur noch TEAM, DMG, RATE und SPD.

Validierung: `npm run check` und `npm run build` erfolgreich. Ein nicht gespeichertes
Wegwerf-Skript außerhalb von `src/` bestätigte den Rundlauf (TEAM 30: jede Figur einmal
nach 6, zweimal nach 12 Salven; TEAM 3: alle drei pro Salve) und den Cursor-Reset. Die
je 20.000 Gate-Ziehungen für hp@30, damage@1/@20, shotsPerSec@8 und speed@70/@305 hatten
je 0/20.000 wirkungslose Seiten. `getEnemySpeed()` gab nach 9.999.999 ms exakt den
Speed-Stat zurück. Die vorgeschriebenen Legacy-Scans waren leer; die `projectiles`-Scans
enthielten nur den Pool und die Projektilobjekte in `weapons.ts`.
