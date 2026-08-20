# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E4a — Truppe: Figurenzahl ersetzt die HP-Punkte, Formation, Schützen und Truppen-Schaden**

Erster von drei Teilen der Etappe E4 aus `docs/plan.md`. Dieser Task baut **nur** die
eigene Truppe. Nicht Teil dieses Tasks:
- **E4b** — die drei Zusatzwaffen (Schrot, Laser, Rakete) und die Waffen-Tore.
- **E4c** — Gegner als Truppen. Wird erst nach Thomas' iPhone-Test von E4a entschieden.
  Deshalb gilt für diesen Task die harte Auflage aus Anforderung 1: die Formationsrechnung
  muss ohne jede Änderung auch von einem späteren Gegner-Modul nutzbar sein.

## Anforderungen

### 1. Neue Datei `src/systems/formation.ts` — reine Rechnung, keine Phaser-Abhängigkeit

Diese Datei darf **nichts** importieren außer `BALANCE` — kein Phaser, kein `crowd.ts`,
keine Spieler-spezifische Annahme. Grund: E4c (Gegner-Truppen) soll dieselbe Funktion
unverändert benutzen; jede Kopplung an den Spieler macht diesen Schritt später teuer.

```ts
export interface FormationSlot {
  readonly offsetX: number
  readonly offsetY: number
  readonly row: number
}

export interface FormationOptions {
  readonly rowSpacingY: number
  readonly colSpacing: number
  readonly minColSpacing: number
  readonly maxWidth: number
}

export function computeFormation(count: number, options: FormationOptions): FormationSlot[]
```

Layout-Regeln:
- Reihe `r` (0-basiert) fasst `r + 1` Plätze; gefüllt wird von vorne nach hinten, die
  letzte Reihe darf unvollständig bleiben.
- `offsetY = row * rowSpacingY`, positiv = **nach hinten** (im Bild nach unten, weg von den
  anfliegenden Gegnern).
- Plätze einer Reihe sind um `offsetX = 0` zentriert. Der Spaltenabstand einer Reihe ist
  `Math.max(minColSpacing, Math.min(colSpacing, maxWidth / Math.max(1, plaetzeInReihe - 1)))`
  — die Formation wird also **dichter, nicht breiter**, wenn die Truppe wächst.
  Bei einer einzelnen Figur pro Reihe entfällt die Rechnung (offsetX = 0).
- `count <= 0` liefert ein leeres Array. Gleiches `count` liefert immer dieselben Slots
  (deterministisch, kein Zufall) — sonst zappelt die Formation bei jedem Neuaufbau.

### 2. `src/config/balance.ts` — neue `crowd`-Sektion

```ts
crowd: {
  start: 3,
  max: 30,
  shooters: 5,
  rowSpacingY: 18,
  colSpacing: 24,
  minColSpacing: 11,
  // Formationsbreite: Anteil der Spielfeldbreite, den die breiteste Reihe belegen darf.
  maxWidthRatio: 0.44,
  // Kollisionshülle ist bewusst FIX und wächst nicht mit der Truppe (siehe Anforderung 3).
  hullWidthFigures: 2.4,
  hullHeightFigures: 1.6,
  damagePerExtraFigure: 0.12,
  damageMultiplierCap: 4,
},
```

Weiter ändern:
- `stats.hp`: `{ base: 3, cap: 20, floor: 0 }` → `{ base: 3, cap: 30, floor: 0 }`.
  Der HP-Wert **ist** ab jetzt die Truppengröße; `cap` muss exakt `crowd.max` entsprechen.
- `pools.crowd`: bleibt `30`, Kommentar ergänzen: muss `>= crowd.max` sein, weil alle
  Figuren einmalig im Konstruktor erzeugt und danach nur noch ein-/ausgeblendet werden.

### 3. `src/systems/crowd.ts` — Formation statt Einzelfigur

- Konstruktor erzeugt weiterhin **einmalig** `BALANCE.pools.crowd` Sprites (Pool-Regel:
  kein `create()`/`destroy()` zur Laufzeit, nur `setActive`/`setVisible`).
- Neue Methode `setSize(count: number): void`:
  - `count` auf `[0, BALANCE.crowd.max]` klemmen.
  - Slots über `computeFormation(count, { ... maxWidth: scene.scale.width * BALANCE.crowd.maxWidthRatio })`
    holen und den ersten `count` Sprites zuweisen; die restlichen auf
    `setActive(false).setVisible(false)`.
  - Jeder aktive Sprite bekommt `setDepth(slot.row)` — hintere Reihen stehen weiter unten
    und müssen die vorderen überlappen, sonst sieht die Formation flach aus.
  - `setSize` wird **nicht** in `update()` gerufen, sondern nur wenn sich die Truppengröße
    tatsächlich geändert hat (siehe Anforderung 5). Wird `setSize` mit unverändertem `count`
    gerufen, darf es trotzdem korrekt durchlaufen (idempotent).
- Die Kollisionshülle bleibt **fix**: Breite `figureWidth * BALANCE.crowd.hullWidthFigures`,
  Höhe `figureHeight * BALANCE.crowd.hullHeightFigures`, zentriert auf dem Anker; sie wächst
  **nicht** mit der Truppe. Grund: Eine mitwachsende Hülle würde jeden Zugewinn sofort
  bestrafen — je besser der Run läuft, desto größer die Trefferfläche. Figuren am Rand der
  Formation stehen damit sichtbar außerhalb der Trefferzone; das ist gewollt (Plan:
  „Kollision gegen eine Box, nicht gegen N Boxen").
- Neue Methode `getShooterPositions(maxShooters: number): Array<{ x: number; y: number }>`:
  liefert die Weltkoordinaten der **vordersten** aktiven Figuren, höchstens `maxShooters`,
  sortiert nach Reihe und dann nach Abstand zur Mitte. Bei Truppengröße 0 ein leeres Array.
- `setFiguresAlpha` und `update()` bleiben in ihrer Logik unverändert (iFrames-Blinken gilt
  weiterhin für alle aktiven Figuren).
- `getAnchorX`/`getAnchorY`/`getHullBounds`/`setAnchorX` bleiben unverändert, damit Drag-Clamp
  und Coin-Magnet nicht angefasst werden müssen.

### 4. `src/systems/weapons.ts` — Schützen feuern, nicht der Anker

- Der Konstruktor bekommt statt `getAnchorPosition` eine Funktion
  `getShooterPositions: (maxShooters: number) => Array<{ x: number; y: number }>`.
- In `fire()`: `const shooterCount = Math.min(this.runStats.get('projectiles'), BALANCE.crowd.shooters)`,
  danach `const origins = this.getShooterPositions(shooterCount)`. Pro Origin **genau ein**
  Projektil, gespawnt an der Position des Schützen. Der bisherige künstliche Fächer-Offset
  (`(index - (count - 1) / 2) * 12`) entfällt ersatzlos — die Streuung entsteht jetzt aus den
  Positionen der Figuren.
- Damit ist die `SHOTS`-Stat ab sofort die **Schützenzahl**. Das ist die zentrale
  Architekturentscheidung dieses Tasks: Die Projektilzahl pro Salve bleibt bei
  `min(SHOTS, crowd.shooters)` und damit bei höchstens 5 — genau wie bei einer einzelnen
  Figur. Würde stattdessen jede Figur einzeln feuern, wüchse die Projektilzahl linear mit der
  Truppe und das iPhone bräche ein, sobald der Run gut läuft (Plan, Abschnitt „Truppe").
- `BALANCE.pools.projectiles` bleibt deshalb bei 64; der Herleitungskommentar bleibt gültig
  und muss nur um den Halbsatz ergänzt werden, dass `SHOTS` jetzt die Schützenzahl ist.
- Ist die Truppe kleiner als `shooterCount`, feuern entsprechend weniger Figuren — kein
  Sonderfall, das Array ist einfach kürzer. `warnPoolExhausted()` bleibt unverändert.

### 5. `src/scenes/GameScene.ts` — Truppengröße und Truppen-Schaden

- Die `Weapons`-Instanz wird mit `(maxShooters) => this.crowd.getShooterPositions(maxShooters)`
  konstruiert. Coins und Gates nutzen weiterhin die Ankerposition — nicht anfassen.
- Nach `create()` einmal `this.crowd.setSize(this.runStats.get('hp'))` aufrufen.
- Neue private Methode `syncCrowdSize()`: liest `runStats.get('hp')`, vergleicht mit einem
  gemerkten `lastCrowdSize` und ruft `crowd.setSize()` **nur bei Änderung**. Aufgerufen wird
  sie an genau den Stellen, an denen sich `hp` ändern kann: in `updateHud()` (das ist der
  Callback, den Coins und Gates ohnehin auslösen) und in `handlePlayerHit()`.
  Kein Aufruf im `update()`-Hot-Path.
- Neue private Methode `getCrowdDamageMultiplier(): number`:
  `Math.min(BALANCE.crowd.damageMultiplierCap, 1 + Math.max(0, crowdSize - BALANCE.crowd.shooters) * BALANCE.crowd.damagePerExtraFigure)`.
  In `handleProjectileHit()` wird `this.runStats.get('damage') * this.getCrowdDamageMultiplier()`
  an `spawner.damage()` übergeben. Damit zahlt jede Figur über der Schützenzahl auf den
  Schaden ein statt auf die Projektilzahl — bei voller Truppe das Vierfache.
- HUD: Das Label `HP` heißt jetzt `CREW` (`CREW ${runStats.get('hp')}`). Farbe, Position und
  Layout bleiben unverändert.

### 6. `src/systems/gates.ts` — Torbeschriftung

In `statLabel()` das Mapping `hp: 'HP'` auf `hp: 'CREW'` ändern. Sonst nichts: die
Tor-Mathematik, die Operatoren und der 0-Schutz (`leftResult <= 0 && rightResult <= 0`)
bleiben unangetastet — der Schutz greift jetzt sinngemäß als „nie beide Tore auf 0 Figuren".

### 7. `src/scenes/GameOverScene.ts`
Unverändert. Game Over bei 0 Figuren funktioniert weiter über `runStats.get('hp') <= 0`.

## Akzeptanzkriterien

1. `npm run check` und `npm run build` laufen fehlerfrei.
2. `src/systems/formation.ts` existiert und importiert **nur** `BALANCE` — nachprüfbar:
   `grep -n "^import" src/systems/formation.ts` zeigt genau eine Zeile, und die enthält
   weder `phaser` noch `crowd`.
3. Pool-Checkpunkt Truppe: In `crowd.ts` gibt es `scene.add.image` ausschließlich im
   Konstruktor, und `grep -n "destroy()" src/systems/crowd.ts` liefert keinen Treffer.
4. Projektil-Checkpunkt: In `weapons.ts` ist die Zahl der pro `fire()` aktivierten Projektile
   nachweisbar auf `min(runStats.get('projectiles'), BALANCE.crowd.shooters)` begrenzt —
   also höchstens 5, unabhängig von der Truppengröße.
5. `BALANCE.stats.hp.cap === BALANCE.crowd.max` (beide 30); `pools.crowd >= crowd.max`.
6. `grep -rn "'HP'" src/` liefert keinen Treffer mehr; HUD und Tor zeigen `CREW`.
7. `setSize()` wird nicht aus `update()` heraus gerufen — weder direkt noch indirekt:
   `grep -n "setSize" src/scenes/GameScene.ts` zeigt nur Aufrufe aus `create()`,
   `updateHud()` und `handlePlayerHit()`.
8. Ein Kurztest im Dev-Server ist erlaubt, aber **kein** Nachweis: Formationsbild, Gamefeel
   und Performance beurteilt Thomas am iPhone.

## Reißleine
Läuft die Formation nach einem Umsetzungsversuch nicht sauber (zappelnde Figuren, Truppe
verschiebt den Trefferpunkt, Drag fühlt sich anders an), **nicht weiterbohren**: Formation auf
eine einzige Reihe hinter dem Anker reduzieren und den Rest der Anforderungen unverändert
liefern. Das Dreieckslayout ist Kosmetik, die Mechanik dahinter ist es nicht.

## Nicht ändern
- Gate-Mathematik, Coin-System, Spawner, Balance-Werte außer `stats.hp.cap` und der neuen
  `crowd`-Sektion.
- Farbpalette (`src/config/colors.ts`), HUD-Layout, Icons, `vite.config.ts`, `index.html`.
- Die drei Zusatzwaffen und die Waffen-Tore — das ist E4b.

## Implementation Summary

Die importfreie Formationsrechnung versorgt einen festen Figurenpool mit einer kompakten,
dreieckigen TEAM-Formation. Sie verdichtet sich bei voller Größe auch in der Tiefe; die
Kollisionshülle bleibt fix. Die vordersten maximal fünf Figuren geben die
Projektilursprünge vor; GUNS begrenzt deren Zahl und zusätzliche TEAM-Figuren erhöhen den
Schaden bis zum vierfachen Multiplikator.

Validierung: `npm run check` und `npm run build` erfolgreich. Import-, Pool-, TEAM/GUNS-,
Balance- und `setSize`-Checks sind erfüllt; der isolierte Rechentest bestätigt für 30
Slots `max offsetY=98 <= maxDepth=100`. Die Vite-Chunk-Größenwarnung bleibt bestehen,
ist aber nicht fehlerschlagend. Bild, Spielgefühl und Performance sind bewusst für den
iPhone-Test vorbehalten.

---

## Nacharbeit Runde 2 (Review-Befunde + Umbenennung)

### N1 — Formation ragt bei voller Truppe aus dem Bild

Rechnung: Spielfeld ist 844 hoch, der Anker sitzt bei `844 - 130 = 714`. 30 Figuren ergeben
8 Reihen, die hinterste bei `offsetY = 7 * 18 = 126`, also `y = 840` — die Figur reicht bis
863 und steht damit 19px unter dem Bildschirmrand. Die letzten drei Reihen sind bei voller
Truppe nicht mehr sichtbar.

Fix, symmetrisch zur bestehenden Breitenregel („dichter, nicht breiter") — die Formation wird
jetzt auch **dichter, nicht tiefer**:

- `FormationOptions` bekommt ein Feld `maxDepth: number`.
- `computeFormation` ermittelt die Reihenzahl für `count` **vor** dem Verteilen und rechnet
  `effectiveRowSpacing = Math.min(rowSpacingY, maxDepth / Math.max(1, rowCount - 1))`.
  `offsetY = row * effectiveRowSpacing`. Bei einer einzigen Reihe bleibt `offsetY = 0`.
- `crowd.ts` übergibt
  `maxDepth: this.scene.scale.height - this.anchorY - figureHeight / 2 - BALANCE.crowd.bottomMargin`,
  wobei `figureHeight` die bereits im Konstruktor bekannte Sprite-Höhe ist. Neuer
  Balance-Wert `crowd.bottomMargin: 8`.
- Zusätzlich `crowd.rowSpacingY` von `18` auf `14` senken, damit die Formation auch dann
  kompakt aussieht, wenn der Deckel gar nicht greift.

Nachprüfbar: Bei `count = BALANCE.crowd.max` muss
`max(offsetY) <= maxDepth` gelten. Diese Bedingung als Kommentar an `computeFormation` notieren.

### N2 — Toter Import in `formation.ts`

Die Datei importiert `BALANCE` und neutralisiert den unbenutzten Import mit `void BALANCE`.
Das war eine zu wörtlich genommene Vorgabe von mir: Die Datei soll **gar nichts** importieren.
Import und `void BALANCE` ersatzlos löschen; alle Layout-Werte kommen wie bisher über
`FormationOptions` herein. Der Kommentar darüber wird entsprechend umformuliert.

### N3 — Umbenennung: `CREW` → `TEAM`, `SHOTS` → `GUNS`

Thomas' Entscheidung. Zwei Gruppenbegriffe nebeneinander wären verwechselbar, deshalb:
- Die **Truppengröße** (Stat-Key `hp`) heißt überall `TEAM` — im HUD und im Tor-Label.
- Die **Schützenzahl** (Stat-Key `projectiles`) heißt überall `GUNS` — im HUD und im Tor-Label.
- Die internen Stat-Keys `hp` und `projectiles` bleiben **unverändert**. Es geht ausschließlich
  um die angezeigten Beschriftungen; kein Umbenennen von Feldern, keine Migration.

Danach darf weder `'CREW'` noch `'SHOTS'` in `src/` vorkommen.

## Zusätzliche Akzeptanzkriterien Runde 2

9.  `grep -n "^import" src/systems/formation.ts` liefert keine Zeile.
10. `grep -rn "CREW\|SHOTS" src/` liefert keinen Treffer; HUD und Tore zeigen `TEAM` und `GUNS`.
11. `BALANCE.crowd.rowSpacingY === 14`, `BALANCE.crowd.bottomMargin === 8`, und
    `computeFormation` respektiert `maxDepth`.
12. `npm run check` und `npm run build` laufen weiterhin fehlerfrei.
