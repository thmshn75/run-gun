# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E4a-Nacharbeit — Trefferzone am Bildrand, ehrliche SPD-Anzeige, Tore ohne Leerwahl**

Fix-Task aus Thomas' iPhone-Test von E4a. Drei bestätigte Befunde, alle im bestehenden
Code, kein neues Feature. **Nicht Teil dieses Tasks:** E4b (Zusatzwaffen + Waffen-Tore),
E4c (Gegner-Truppen), Hintergrundgestaltung. Die Truppen-Mechanik aus E4a bleibt
unverändert — Formation, Kollisionshülle, Schützenzahl und Truppen-Schaden werden
**nicht** angefasst außer an den unten genannten Stellen.

## Befunde (Messung, nicht Vermutung)

**B1 — Gegner am Rand sind unerreichbar.** Der Bewegungsrand des Ankers wird in
`Crowd.setAnchorX()` aus der halben Kollisionshüllen-Breite gerechnet
(`34 px × 2,4 = 81,6`, halb = 40,8). Damit gilt `anchorX ∈ [48,8; 341,2]` bei 390 px
Spielfeldbreite. Gegner spawnen dagegen in `[15; 375]`. Bei GUNS 1 sitzt der einzige
Schütze exakt auf dem Anker; ein Treffer verlangt `|Projektil-x − Gegner-x| < 18`
(3 + 15 Halbbreiten). Erreichbar sind damit nur Gegner-Mitten bis 359,2 — die äußersten
~16 px auf **beiden** Seiten sind tote Zone. Rechnerisch symmetrisch; Thomas fällt es
rechts auf.

**B2 — SPD-Tore stimmen nicht mit dem HUD überein.** Das HUD zeigt nicht den Stat,
sondern `round(Gegnertempo − 105)`, wobei das Gegnertempo zusätzlich mit 0,5/s über die
Zeit hochläuft. Die Tore rechnen auf dem Stat. Gemessen bei t = 60 s: Ein Tor „×2" auf
`speed = 105` lässt die HUD-Zahl von 30 auf 135 springen (Faktor 4,5 statt 2), ein „÷2"
drückt sie von 75 auf 1 (Faktor 0,01). Ursache ist die verschobene Skala: Eine
Multiplikation auf dem Rohwert wirkt auf einer um 105 verschobenen Anzeige völlig anders.

**B3 — Tore mit Leerseite und Klumpung.** Die Stat-Auswahl selbst ist sauber
(100.000 Ziehungen: 20,0 / 20,2 / 19,9 / 19,8 / 20,1 %). Zwei andere Effekte erzeugen den
Eindruck von Willkür:
- Leerseiten: Bei GUNS 1 hat in **100 %** der Torpaare eine Seite keine Wirkung
  (alle Abwärts-Ops laufen in den Floor). An jeder Obergrenze (TEAM 30, GUNS 5, DMG 20,
  RATE 8) und am SPD-Floor 70 sind es ~76 %. Das Tor beschriftet dann „×2" und der
  HUD-Wert rührt sich nicht.
- Klumpung: Ein 2-Minuten-Run zeigt nur ~13 Tore. Bei Gleichverteilung fehlt in 26,2 %
  der Runs eine Stat komplett und in 47,4 % kommt eine fünfmal oder öfter.

**B4 (Kleinkram, mitgenommen)** — DMG und RATE werden im HUD auf eine Nachkommastelle
gerundet, intern aber ungerundet geführt. Ein „+25 %"-Tor auf DMG 1,0 zeigt 1,3.

## Anforderungen

### 1. `src/config/balance.ts`

- In `player` neuen Wert ergänzen:
  ```ts
  // Bewegungsrand als Vielfaches der halben Figurenbreite — bewusst NICHT an die
  // Kollisionshuelle gekoppelt (siehe Befund B1).
  dragClampFigures: 0.5,
  ```
- Sonst **keine** Balance-Änderung. `crowd`, `enemy`, `gates`, `pools`, `stats` bleiben wie sie sind.

### 2. `src/systems/crowd.ts` — Bewegungsrand von der Trefferbox entkoppeln

- Figurenbreite im Konstruktor merken (`private readonly figureWidth: number`), analog zu
  `figureHeight`, aus demselben `firstSprite`.
- Neue öffentliche Methode:
  ```ts
  public getAnchorRange(): Readonly<{ min: number; max: number }>
  ```
  liefert
  `min = figureWidth * BALANCE.player.dragClampFigures + BALANCE.player.dragClampMargin`
  und `max = scene.scale.width - min`. Grund für die eigene Methode: Der Spawner braucht
  denselben Korridor (Anforderung 3), und zwei getrennte Rechnungen würden auseinanderlaufen.
- `setAnchorX()` klemmt **über `getAnchorRange()`**, nicht mehr über `this.hull.width / 2`.
- Die Kollisionshülle bleibt in Größe und Verhalten **unverändert**. Sie darf jetzt an den
  Rändern über den Bildschirm hinausragen — das ist gewollt und ändert nichts an der
  Trefferlogik. Ebenso bleibt es dabei, dass äußere Figuren einer großen Formation seitlich
  aus dem Bild ragen können; das ist bekannte Kosmetik und **nicht** Teil dieses Tasks.

### 3. `src/systems/spawner.ts` — Gegner nur im erreichbaren Korridor

- Konstruktor bekommt ein drittes Argument
  `getSpawnRange: () => Readonly<{ min: number; max: number }>`.
- In `spawn()` die x-Ziehung ersetzen durch:
  ```ts
  const range = this.getSpawnRange()
  const lo = Math.max(halfWidth, Math.round(range.min))
  const hi = Math.max(lo, Math.min(this.scene.scale.width - halfWidth, Math.round(range.max)))
  const x = Phaser.Math.Between(lo, hi)
  ```
  `Math.max(lo, ...)` ist Pflicht: Ohne diese Klammer könnte `Phaser.Math.Between` bei einem
  degenerierten Bereich mit `min > max` aufgerufen werden.
- Sonst nichts ändern — Spawn-Takt, Ramp, Recycling und Pool bleiben identisch.

### 4. `src/scenes/GameScene.ts` — Verdrahtung und ehrliche SPD-Anzeige

- `Spawner` wird konstruiert als
  `new Spawner(this, this.runStats, () => this.crowd.getAnchorRange())`.
  Die Reihenfolge stimmt bereits: `crowd` entsteht vor `spawner`.
- **SPD-Anzeige:** `this.hud.speed.setText(\`SPD ${Math.round(this.runStats.get('speed'))}\`)`.
  Die Methode `getSpdShown()`, das Feld `lastShownSpeed` und der Block in `update()`, der
  bei Änderung der gerampten Zahl `updateHud()` ruft, entfallen ersatzlos.
  **Bewusste Entscheidung:** Das HUD zeigt ab jetzt den Stat (Startwert 105, Cap 305) und
  nicht mehr das über die Zeit hochlaufende Gegnertempo. Der Zeit-Ramp im Spawner bleibt
  wirksam, wird nur nicht mehr als Stat ausgegeben. Nur so kann ein „×2"-Tor die angezeigte
  Zahl auch verdoppeln. Das entlastet nebenbei `update()` um einen HUD-Aufruf pro Frame-Sprung.
- `getCrowdDamageMultiplier`, `syncCrowdSize`, `handlePlayerHit`, `handleProjectileHit`,
  Coins- und Gate-Verdrahtung bleiben unverändert.

### 5. `src/systems/upgrades.ts` — Anzeige und interner Wert identisch (B4)

In `clampStat` die Rundung erweitern:
```ts
const roundedValue = stat === 'hp' || stat === 'projectiles' || stat === 'speed'
  ? Math.round(value)
  : Math.round(value * 10) / 10
```
Damit führen `damage` und `shotsPerSec` intern exakt den Wert, den das HUD zeigt.

### 6. `src/systems/gates.ts` — keine Leerseiten mehr (B3, Teil 1)

Die zentrale Regel lautet ab jetzt: **Beide Seiten eines Torpaares müssen den Wert
tatsächlich verändern, und sie müssen zu unterschiedlichen Ergebnissen führen.**

- Neue Hilfsfunktion neben `drawGateOp`:
  ```ts
  type GateDirection = 'up' | 'down'
  function drawDirectionalOp(current: number, rng: () => number, direction: GateDirection): GateOp
  ```
  - `'up'` zieht gleichverteilt aus: `multiply` (`multipliers`), `add` mit Vorzeichen `+`,
    `percent` aus den **positiven** Einträgen von `ops.percentages`.
  - `'down'` zieht gleichverteilt aus: `divide` (`divisors`), `add` mit Vorzeichen `−`,
    `percent` aus den **negativen** Einträgen von `ops.percentages`.
  - Label-Format identisch zu `drawGateOp`.
- `drawGatePair(stat, current, rng)` bekommt drei Stufen:
  1. **Normalzug:** bis zu `BALANCE.gates.maxRedraws` Versuche mit `drawGateOp`.
     Akzeptiert wird ein Paar nur, wenn
     `leftResult !== current && rightResult !== current && leftResult !== rightResult`
     und der bestehende hp-Schutz `(stat !== 'hp' || leftResult > 0 || rightResult > 0)` hält.
  2. **Gerichteter Fallback:** `const upWorks = clampStat(stat, current * 2) !== current`,
     `const downWorks = clampStat(stat, current / 2) !== current`. Ist genau eine Richtung
     offen (Wert klebt am Cap oder Floor), bis zu `maxRedraws` Versuche mit
     `drawDirectionalOp` in der offenen Richtung, gleiche Akzeptanzbedingung wie Stufe 1.
     Das Tor lautet dann z. B. „+25 % / +50 %" statt „×2 / ÷2 (wirkungslos)" — die Wahl
     bleibt eine echte Wahl (mehr oder weniger Gewinn), und die Beschriftung lügt nicht.
  3. **Reißleine:** unverändert `{ left: '+1', right: '−1' }`.

  **Warum kein Ausschluss der Stat am Anschlag:** Das wäre die einfachere Lösung, erzeugt
  aber einen Deadlock. DMG startet bei 1 mit Floor 1, die Abwärtsrichtung ist also von
  Anfang an blockiert. Würde man Stats am Anschlag überspringen, käme nie ein DMG-Tor und
  DMG bliebe für immer 1. Deshalb der gerichtete Fallback statt einer Stat-Neuziehung.

### 7. `src/systems/gates.ts` — Stat-Auswahl als Shuffle-Bag (B3, Teil 2)

- Zwei neue private Felder: `statBag: StatKey[]` (leer initialisiert) und
  `lastStat: StatKey | null` (`null` initialisiert).
- Neue private Methode `nextStat(): StatKey`: Ist der Bag leer, neu füllen; dann das
  **erste** Element mit `shift()` entnehmen, in `lastStat` merken und zurückgeben.
- Neue private Methode `refillBag(): void`: Array
  `['hp', 'damage', 'shotsPerSec', 'projectiles', 'speed']` per Fisher-Yates mit `this.rng`
  mischen. Ist danach `stats[0] === this.lastStat`, `stats[0]` und `stats[1]` tauschen —
  sonst kann an der Bag-Grenze dieselbe Stat doch zweimal hintereinander kommen.
- In `spawn()` ersetzt `this.nextStat()` den bisherigen
  `pick<StatKey>([...], this.rng)`-Aufruf.
- Wirkung: In je fünf aufeinanderfolgenden Toren kommt jede Stat genau einmal, und nie
  zweimal direkt hintereinander. Damit verschwinden die gemessenen 26,2 % „Stat fehlt
  komplett" und 47,4 % „Stat kommt fünfmal" vollständig.
- `statLabel()`, `applyPair()`, `movePair()`, `recycle()`, die Torgeometrie und der
  hp-0-Schutz bleiben unverändert.

## Akzeptanzkriterien

1. `npm run check` und `npm run build` laufen fehlerfrei.
2. `grep -n "hull.width" src/systems/crowd.ts` zeigt keinen Treffer mehr in `setAnchorX`;
   der Clamp läuft über `getAnchorRange()`.
3. Rechnerisch nachprüfbar (im Abschlussbericht ausrechnen und angeben): Mit
   `figureWidth = 34`, `dragClampFigures = 0.5`, `dragClampMargin = 8` und Breite 390 gilt
   `getAnchorRange() = { min: 25, max: 365 }`, und der Gegner-Spawn liegt vollständig
   innerhalb dieses Korridors. Kein Gegner kann außerhalb der Reichweite des vordersten
   Schützen erscheinen.
4. `grep -n "getSpdShown\|lastShownSpeed" src/` liefert keinen Treffer mehr.
   Das HUD zeigt `SPD` als gerundeten `runStats.get('speed')`.
5. Ein SPD-Tor „×2" verdoppelt die im HUD gezeigte Zahl exakt (bis auf Cap-Begrenzung) —
   im Abschlussbericht an einem Zahlenbeispiel vorrechnen.
6. In `gates.ts` existiert `drawDirectionalOp`, und `drawGatePair` akzeptiert kein Paar,
   bei dem eine Seite `clampStat(stat, op.apply(current)) === current` ergibt (außer in der
   Reißleine Stufe 3).
7. Simulationsnachweis im Abschlussbericht: Für die Werte `projectiles@1`,
   `projectiles@5`, `damage@1`, `damage@20`, `hp@30`, `shotsPerSec@8`, `speed@70`,
   `speed@305` jeweils 20.000 Ziehungen aus `drawGatePair` — der Anteil der Paare mit einer
   wirkungslosen Seite muss unter 1 % liegen (heute 76–100 %). Der Nachweis läuft über ein
   Wegwerf-Skript außerhalb von `src/`; es wird **nicht** eingecheckt.
8. Shuffle-Bag: In 5 aufeinanderfolgenden `nextStat()`-Aufrufen kommt jede der fünf Stats
   genau einmal vor, und über 1000 Aufrufe hinweg gibt es keine direkte Wiederholung.
   Ebenfalls per Wegwerf-Skript nachweisen und im Bericht angeben.
9. `clampStat('damage', 1.25) === 1.3` und `clampStat('shotsPerSec', 3.55) === 3.6`;
   HUD-Wert und interner Wert sind für DMG und RATE identisch.
10. Der Truppen-Teil aus E4a ist unangetastet: `git diff` zeigt in `formation.ts` keine
    Änderung, und in `crowd.ts` nur die Figurenbreite, `getAnchorRange()` und den
    geänderten Clamp — keine Änderung an `setSize`, `getShooterPositions`, `update` oder
    der Hüllengeometrie.
11. Ein Kurztest im Dev-Server ist erlaubt, aber **kein** Nachweis: Ob sich die Randzone,
    das SPD-Gefühl und die Torwahl richtig anfühlen, beurteilt Thomas am iPhone.

## Reißleine
Sollte der gerichtete Fallback in Anforderung 6 nach einem Umsetzungsversuch nicht sauber
laufen (Endlosschleifen, unlesbare Labels, Tore die trotzdem nichts tun), **nicht
weiterbohren**: Stufe 2 auf eine feste Tabelle reduzieren — am Cap „−20 % / −30 %",
am Floor „+25 % / +50 %" — und den Rest der Anforderungen unverändert liefern. Die
Anforderungen 1–5 und 7 sind unabhängig davon und müssen in jedem Fall stehen.

## Nicht ändern
- `src/systems/formation.ts`, `src/systems/weapons.ts`, `src/systems/coins.ts`,
  `src/scenes/GameOverScene.ts`, `src/scenes/BootScene.ts`.
- Kollisionshüllen-Geometrie, Formationslayout, Schützenzahl, Truppen-Schadensmultiplikator.
- Farbpalette (`src/config/colors.ts`), HUD-Layout und -Positionen, Torgeometrie,
  `vite.config.ts`, `index.html`, `docs/plan.md`.
- Alle Balance-Werte außer dem neuen `player.dragClampFigures`.

## Implementation Summary
Bewegungs- und Spawn-Korridor verwenden nun dieselbe Figurenbreiten-Rechnung
(`25…365 px` bei 390 px Breite); die Kollisionshülle und der Truppen-Teil bleiben
unverändert. Das HUD zeigt SPD direkt als gerundeten Speed-Stat, während der Gegner-Ramp
im Spawner weiterläuft. DMG und RATE werden beim Speichern auf eine Nachkommastelle
gerundet.

Tore akzeptieren nur noch zwei wirksame, unterschiedliche Ergebnisse. Am einseitig
blockierten Rand ziehen sie gerichtete Operationen; wenn diskrete Rundung (GUNS 1) alle
Zufallsergebnisse auf denselben Wert legt, sichert `+1 / +2` die echte Wahl. Die
Stat-Auswahl nutzt einen Fisher-Yates-Shuffle-Bag ohne direkte Wiederholung.

Validierung: `npm run check` und `npm run build` erfolgreich. Wegwerf-Simulation mit je
20.000 `drawGatePair`-Ziehungen: projectiles@1/@5, damage@1/@20, hp@30,
shotsPerSec@8 und speed@70/@305 jeweils 0,00 % Leerseiten. Shuffle-Bag: alle
200 Fünferblöcke vollständig, 0/999 direkte Wiederholungen. `clampStat('damage', 1.25)`
ergibt 1,3 und `clampStat('shotsPerSec', 3.55)` 3,6. Die Vite-Chunk-Größenwarnung ist
nicht fehlschlagend; iPhone-Gamefeel bleibt der manuelle Test.
