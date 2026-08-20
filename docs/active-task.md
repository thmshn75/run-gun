# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E3 — Gates, Coins, Balancing**

Upgrade-Gates nach Plan-Abschnitt „Tor-Mathematik", Coin-Drop mit Magnet + HUD,
erste Balance-Anpassung (Gegner-Dichte entschärfen). Referenz: `docs/plan.md`
(Etappentabelle E3, Abschnitte „Tor-Mathematik", „Upgrade-System", „Architektur").

## Kontext

E2 (spielbarer Kern) ist am iPhone abgenommen. E3 macht aus dem Überlebens-Loop ein
Progressions-Spiel: Paarweise Tore verändern die Run-Werte (HP, Schaden, Feuerrate,
Projektilzahl), Gegner droppen Coins, und die Gegner-Dichte wird nach Thomas'
iPhone-Feedback entschärft. E4 (Truppe, Waffentypen) baut direkt auf der Gate- und
Stat-Struktur aus E3 auf — deshalb sind die Stats ein eigenes Modul (`upgrades.ts`),
nicht verstreute Szenen-Felder.

**Harte Randbedingungen (Sandbox, unverändert aus E2):**
- Kein Netzzugang: **kein `npm install`, keine neuen Dependencies, kein Asset-Download.**
  Alle Grafiken sind Runtime-generierte Texturen (BootScene, Graphics → `generateTexture`).
- Prüfwerkzeuge: `npm run check` (tsc) und `npm run build` müssen fehlerfrei laufen.
  Kein Test-Runner im Projekt — keinen hinzufügen.

**E2-Regeln, die unverändert weitergelten (Review-Checkpunkte):**
1. Pools: feste Größen aus `BALANCE.pools`, Recycling über `disableBody`/`setActive(false)`/
   `setVisible(false)`; **nie `destroy()` oder `create()` im laufenden Spiel** — gilt
   ausdrücklich auch für Coins, Tore und deren Text-Objekte.
2. Takt ausschließlich über Akkumulator-Instanzfelder mit geclamptem dt — **kein
   `time.addEvent`, kein `delayedCall`** (auch nicht für Tor-Spawns oder Coin-Effekte).
3. dt-Clamp (`Math.min(rawDeltaMs, BALANCE.maxDeltaMs)`) bleibt erste Zeile in
   `GameScene.update()`; alle neuen Systeme bekommen nur das geclampte dt.
4. Zustandsregel: alle Szenen- und System-Zustände mit `!:` deklariert, Zuweisung nur in
   `create()`/Konstruktor beim Szenenaufbau; keine Modul-Globals. Restart (zweiter Run)
   verhält sich identisch zum ersten — auch für Stats, Coins und Tore.
5. Bezugsgrößen über `this.scale.width/height`, HUD innerhalb der Safe-Area
   (`readSafeAreaInsets`).

**Architektur-Vorentscheidung (bewusst, nicht verhandelbar):** Tore und Coins bekommen
**keine Arcade-Bodies und keine Overlaps.** Tor-Durchlauf wird deterministisch über die
Y-Passage der Anker-Linie erkannt, Coin-Einsammeln über einen Distanz-Check. Grund:
weniger Physik-Objekte und keine Callback-Argument-Fallen (Lesson aus dem E2-Review).

## Anforderungen

### 1. `src/config/balance.ts` — erweitern + Feuerrate umstellen

**Umstellung:** `weapon.fireRateMs` entfällt. Neu ist `shotsPerSec` als Basiswert —
Tore müssen die Feuerrate erhöhen können, und „×2 = doppelt so oft schießen" ist nur
mit Rate (Schüsse/s) intuitiv, nicht mit einem Intervall in ms. `Weapons` rechnet
intern `1000 / shotsPerSec` als Akkumulator-Intervall (bei jeder Auslösung frisch aus
den RunStats gelesen, damit Tor-Wirkungen sofort greifen).

Neue/geänderte Struktur (Startwerte, Codex darf Zahlen plausibel anpassen, Struktur nicht):

```ts
stats: {
  // Basiswerte eines frischen Runs + harte Caps (Tore clampen dagegen)
  hp:          { base: 3,   cap: 12 },
  damage:      { base: 1,   cap: 20 },
  shotsPerSec: { base: 3.5, cap: 8 },
  projectiles: { base: 1,   cap: 5 },   // Projektile pro Schuss (Fächer), Cap ist Pool-relevant
},
enemy: {
  // Entschärfung nach Thomas' iPhone-Feedback zu E2 („Gegner kommen zu schnell"):
  hp: 3,
  speed: 100,               // war 120
  spawnIntervalMs: 1200,    // war 900
  spawnIntervalMinMs: 600,  // war 450
  spawnRampPerSec: 3,       // war 4
},
// feedback.hitFlashMs bleibt unverändert, wo es ist (spawner.ts referenziert es) und
// dient AUCH als Dauer des Tor-Flashs — kein Umzug, kein eigenes gates.flashMs.
gates: {
  spawnIntervalMs: 9000,    // Abstand zwischen Torpaaren.
                            // INVARIANTE (gilt für jeden Balance-Zyklus): muss > 2× Sicht-
                            // dauer (~1,4 s) bleiben, sonst pools.gatePairs mit erhöhen —
                            // als Kommentar direkt an dieser Zeile in balance.ts verankern.
  firstSpawnDelayMs: 5000,
  extraSpeed: 360,          // px/s zusätzlich zu scrollSpeed → Herleitung Zeitfenster als Kommentar:
                            // Weg ≈ Spieler-Y + Torhöhe ≈ 754 px; (180+360) px/s → ≈ 1,4 s
                            // (Plan-Vorgabe: 1–1,5 s zwischen Erscheinen und Durchfahren)
  gateHeight: 70,
  gapBetween: 8,            // horizontale Lücke zwischen den beiden Toren eines Paares
  maxRedraws: 8,            // Ziehversuche, bis das Fallback-Paar greift
},
coins: {
  value: 1,
  magnetRadius: 140,
  magnetSpeed: 600,         // px/s Zug Richtung Anker
  collectDistance: 24,
},
pools: {
  projectiles: 64,          // Herleitung neu rechnen, siehe Anforderung 2
  enemies: 20,
  crowd: 30,
  coins: 20,                // Herleitung: max. Kill-Rate × Sichtdauer, Kommentar daneben
  gatePairs: 2,             // gleichzeitig existierende Paare (Sichtdauer ~1,4 s « Spawn-Intervall)
},
```

`player.startHp` und `weapon.projectileDamage`/`fireRateMs` entfallen zugunsten von
`stats.*` (Verwendungen umziehen). `player.iframesMs` usw. bleiben.

### 2. Poolgrößen-Herleitung aktualisieren (Kommentar in `balance.ts`)

`pools.projectiles` muss den **gecappten Maximalfall** rechnen, nicht den Basisfall:
`stats.shotsPerSec.cap × stats.projectiles.cap × Transit-Zeit`. Die Transit-Zeit ist
die **tatsächliche Flugstrecke ab Abschusspunkt**, nicht die Spielfeldhöhe:
`(Anker-Y − Despawn-Y) ÷ projectileSpeed` ≈ 714 ÷ 640 ≈ 1,12 s — mit den Startwerten
≈ 8 × 5 × 1,12 ≈ 45, plus Marge → 64. Da die Caps bereits das theoretische Maximum
sind, ersetzt diese Rechnung die pauschale ×2-Marge aus E2. Diese Formel-Basis
(Strecke ab Spawnpunkt) ist die Vorlage für die E4-Herleitungen der Zusatzwaffen
(Schrot hat z. B. kurze Reichweite). Analog kurz für `pools.coins` und
`pools.gatePairs` dokumentieren.

### 3. `src/systems/upgrades.ts` — RunStats (neu)

- Klasse `RunStats`: hält die vier Run-Werte `hp`, `damage`, `shotsPerSec`,
  `projectiles`; Initialisierung aus `BALANCE.stats.*.base`. Wird in
  `GameScene.create()` frisch erzeugt (Restart-Regel).
- Der Stat-Typ ist ein exportierter Union-Typ `StatKey = 'hp' | 'damage' |
  'shotsPerSec' | 'projectiles'`.
- **Eine einzige Clamp-/Rundungsfunktion für das ganze Spiel:** `upgrades.ts`
  exportiert eine reine Funktion `clampStat(stat, value): number` — sie rundet
  kaufmännisch für `hp` **und** `projectiles` (beide sind naturgemäß ganzzahlig;
  Rate und Damage dürfen Brüche tragen) und clampt gegen `cap` und die
  Untergrenze: **0 für `hp`, 1 für alle anderen** (Damage/Rate/Projectiles auf 0
  wäre ein Softlock; HP 0 ist regulär Game Over). `RunStats.set`, die
  Gültigkeits-Checks in `drawGatePair` (Anforderung 4) und der Sackgassen-Schutz
  (Anforderung 5) rufen ausschließlich diese eine Funktion — es darf keine
  zweite, unabhängige Clamp- oder Rundungslogik geben, sonst weichen Anzeige
  und Wirkung in Grenzfällen voneinander ab.
- `get(stat)`, `set(stat, value)` (`set` wendet `clampStat` an).
- `GameScene` nutzt `RunStats` als einzige Quelle: HP-Anzeige, Spielertreffer
  (−1 HP über `set`), Weapons liest `damage`, `shotsPerSec`, `projectiles` hieraus.
  Das bisherige `hp`-Szenenfeld entfällt.
- Rundung ist damit vollständig in `clampStat` geregelt: `hp` und `projectiles`
  sind nach jedem `set` ganze Zahlen; `shotsPerSec`/`damage` dürfen Brüche tragen
  (z. B. shotsPerSec 5.25), nur die HUD-Anzeige rundet.

### 4. Tor-Mathematik — reine Ziehfunktion (neu, in `src/systems/gates.ts`)

Exportierte, von Phaser unabhängige Funktion (nur Datenlogik — sie ist der
Review-Schwerpunkt dieser Etappe):

```ts
export interface GateOp {
  label: string      // Anzeige, z. B. "×2", "+3", "−30%"
  apply: (current: number) => number   // roh, ohne Clamp/Rundung
}
export function drawGatePair(
  stat: StatKey,
  current: number,
  rng: () => number,          // [0,1), injizierbar; im Spiel Math.random-artig via Phaser.Math.RND.frac
): { left: GateOp; right: GateOp }
```

Regeln (aus dem Plan, verbindlich):

- **Operatorklassen** (Auswahl-Liste mit Wertebereichen in `BALANCE.gates.ops` o. ä.,
  Struktur darf Codex gestalten, Inhalte müssen diese Klassen abdecken):
  multiplikativ (`×1.5`, `×2`), Division (`÷2`), additiv (`+k`, `−k` mit k relativ
  zum aktuellen Wert gezogen, z. B. 25–75 % von `current`, mindestens 1) und
  prozentual (`+25 %`, `+50 %`, `−20 %`, `−30 %`).
- **Label = Wirkung, ohne Ausnahme:** Beim additiven Operator wird `k` kaufmännisch
  gerundet, **bevor** daraus `label` und `apply` gebaut werden — beide nutzen exakt
  denselben ganzzahligen `k`-Wert. Ein Tor, das „+3" anzeigt und effektiv +2,6
  wirkt, würde die Rechen-Mechanik aus dem Plan entwerten. (Für ×/÷/% ist das Label
  der Operator selbst, da gibt es nichts zu runden.)
- **Zustandsabhängig:** Beide Seiten werden mit `current` als Eingabe gezogen;
  additive k-Werte leiten sich aus `current` ab. Dieselbe Zugstelle liefert bei
  anderem `current` andere Paare — es gibt keine feste Paar-Liste.
- **Ein Paar wirkt immer auf genau ein Stat** (beide Seiten dasselbe `stat`).
  Das Ziel-Stat würfelt der Aufrufer (Gates-System) gleichverteilt über die vier Stats.
- **Gültigkeits-Checks nach der Ziehung** — alle Vergleiche laufen über
  `clampStat(stat, op.apply(current))` aus Anforderung 3, nie über Rohwerte
  (dazu muss `drawGatePair` das `stat` kennen, das hat es als Parameter). Bei
  Verstoß neu ziehen, max. `BALANCE.gates.maxRedraws` Versuche, danach
  deterministisches Fallback-Paar `+1`/`−1`:
  - Die per `clampStat` aufgelösten Ergebnisse beider Seiten dürfen nicht identisch
    sein (sonst gibt es nichts zu entscheiden — auch zwei verschieden beschriftete
    Tore, die beide am Cap sättigen, sind so ein Verstoß).
  - Für `hp`: nie **beide** Seiten ≤ 0 (eine darf — falsche Wahl ist Game Over).
  - Das Fallback `+1`/`−1` ist unter `clampStat` immer gültig: Die Ergebnisse
    differieren nach Clamp stets um mindestens 1 (bei Wert am Cap: cap vs. cap−1;
    an der Untergrenze: +1 vs. Floor), und bei `hp` führt höchstens die
    `−1`-Seite auf 0.
- **Anwendung erst beim Durchlauf** auf den **dann** aktuellen Wert (der Operator
  steht auf dem Tor, nicht das Ergebnis; HP kann sich zwischen Spawn und Durchlauf
  durch Treffer ändern). **Sackgassen-Schutz zur Anwendungszeit:** Führen beim
  Durchlauf-HP-Stand (per `clampStat` aufgelöst) *beide* Seiten auf 0, wird das
  Ergebnis der gewählten Seite auf 1 angehoben — eine unausweichbare Todes-Wahl
  ist laut Plan ein Bug.
- Rundung und Clamp des Endergebnisses macht `RunStats.set` (via `clampStat`) —
  in `gates.ts` gibt es dafür keinen eigenen Code.

### 5. `src/systems/gates.ts` — Klasse `Gates` (Pool, Spawn, Durchlauf)

- **Optik:** Ein Torpaar füllt die volle Spielfeldbreite: zwei Rechtecke je
  `(width − gapBetween) / 2` breit, `gateHeight` hoch, **einheitliche Farbe**
  (halbtransparente Runtime-Textur aus BootScene, z. B. Blauviolett mit hellem
  Rand — bewusst *keine* Gut/Schlecht-Farben). Auf jedem Tor die Operator-Zahl
  als großer Text (z. B. 34 px); mittig über dem Paar ein kleines neutrales
  Stat-Label: `HP`, `DMG`, `RATE`, `SHOTS`.
- **Pool:** `pools.gatePairs` Paare werden einmalig angelegt (je 2 Rechteck-Images +
  2 Text-Objekte + 1 Label-Text), inaktiv. Aktivieren setzt Texte per `setText` und
  Positionen neu — kein `destroy()`, keine neuen Text-Objekte zur Laufzeit.
- **Spawn:** Akkumulator-Takt (`firstSpawnDelayMs`, dann alle `spawnIntervalMs`).
  Beim Spawn: Ziel-Stat würfeln, `drawGatePair(stat, runStats.get(stat), rng)`
  ziehen, Paar knapp oberhalb des Sichtbereichs aktivieren.
- **Bewegung:** y += `(scrollSpeed + gates.extraSpeed) × dt/1000` (manuell, kein Body).
- **Durchlauf:** Überschreitet die Tor-Unterkante die Anker-Y-Linie
  (Flanken-Erkennung über ein pro Paar gespeichertes `prevBottomY`: vorher darüber,
  jetzt darunter — so geht die Passage auch bei einem 100-ms-Frame nie verloren),
  wird die Seite über `anchorX < width/2 ? left : right` bestimmt und der Operator
  über RunStats angewandt (inkl. Sackgassen-Schutz aus Anforderung 4), HUD
  aktualisiert. **Gates löst selbst keinen Szenenwechsel aus** — den HP-≤-0-Check
  nach Toranwendung macht die GameScene (Anforderung 7).
- **Feedback vor Recycling:** Die gewählte Seite blitzt weiß (`flashUntil`-Zeitmarke
  mit `feedback.hitFlashMs`, kein `delayedCall`). Das Paar wird **nicht** im
  Durchlauf-Frame recycelt, sondern erst wenn `flashUntil` abgelaufen ist (geprüft
  in `Gates.update()`) — ein synchron deaktiviertes Objekt würde den Blitz nie
  rendern. Bis dahin scrollt es normal weiter; ein „bereits ausgelöst"-Flag pro
  Paar verhindert eine zweite Auslösung.
- **Reset bei Aktivierung** (analog Spawner-Regel aus E2): Beim Aktivieren eines
  Paares aus dem Pool werden `prevBottomY` auf die neue Spawn-Y, das
  Ausgelöst-Flag, Tint/Alpha und die Texte hart zurückgesetzt — kein Leftover
  aus dem vorherigen Zyklus.
- Läuft ein Paar (ausgelöst oder defensiv auch ohne Auslösung) unten aus dem Bild,
  wird es recycelt.
- Dev-only gedrosselte Pool-Warnung wie in E2, falls kein Paar frei ist
  (Spawn wird übersprungen).

### 6. `src/systems/coins.ts` — Klasse `Coins` (neu)

- Pool aus `pools.coins` Coin-Images (Runtime-Textur, z. B. 14×14 px gelber Kreis
  mit dunklem Rand), **ohne Arcade-Body**.
- `spawnAt(x, y)`: wird vom Kill-Pfad aufgerufen (jeder Gegner-Tod droppt genau
  1 Coin); kein freier Coin → Drop entfällt still (Dev-Warnung gedrosselt).
- `update(dt, anchorX, anchorY)`: Coins scrollen mit `scrollSpeed` nach unten;
  innerhalb `magnetRadius` bewegen sie sich zusätzlich auf den Anker zu
  (normalisierter Richtungsvektor). **Der Magnet-Schritt ist auf die Restdistanz
  geclampt:** `step = Math.min(magnetSpeed × dt/1000, distance)` — ohne den Clamp
  überschießt ein Coin bei einem 100-ms-Frame (Schritt 60 px, Sammelradius 24 px)
  den Anker und kann auf einem Fixpunkt endlos hin- und herspringen, ohne je
  eingesammelt zu werden. Distanz < `collectDistance` → eingesammelt: Zähler
  +`coins.value`, recyceln. Unterkante Bildschirm → recyceln ohne Zählung.
- Der Run-Zähler lebt in der GameScene (bzw. wird von `Coins` geführt und per
  Getter gelesen — Codex' Wahl), zählt nur diesen Run. **Persistenz kommt erst
  in E5** — bei Game Over wird der Stand nur angezeigt, nicht gespeichert.

### 7. `src/scenes/GameScene.ts` + `Weapons` + HUD — Integration

- `Weapons`: liest `shotsPerSec`, `damage`, `projectiles` bei jeder Auslösung aus
  `RunStats` (Akkumulator-Intervall = `1000 / shotsPerSec`, im `while`-Abzug den
  jeweils aktuellen Wert verwenden). Bei `projectiles` n > 1: n Projektile pro
  Auslösung, horizontal zentriert um den Anker mit festem Abstand (z. B. 12 px),
  alle gerade nach oben. Reicht der freie Pool nicht für alle n, werden die
  **zum Zentrum nächstgelegenen Offsets zuerst** gefeuert, damit der Fächer bei
  Mangel symmetrisch schrumpft statt einseitig auszudünnen (+ Dev-Warnung).
- Kill-Pfad (`handleProjectileHit`): Schaden = `runStats.get('damage')`.
  **Kill-Erkennung explizit:** `Spawner.damage(...)` gibt zurück, ob der Gegner
  gestorben ist (boolean); nur dann `coins.spawnAt(enemyX, enemyY)` — ein Coin
  pro **Kill**, nie pro Treffer. Das bestehende Verhalten, dass ein tödlich
  getroffener Gegner sofort ohne Flash recycelt wird, bleibt unverändert
  (der Coin-Drop ist das Todes-Feedback).
- **Ein einziger Game-Over-Pfad:** private Methode `triggerGameOver()` mit
  Guard-Flag (`gameOverStarted`, verhindert doppeltes `scene.start`), die
  `this.scene.start('GameOverScene', { coins: <Run-Zähler> })` aufruft. Der
  Treffer-Pfad (Overlap-Callback) und der Tor-Pfad nutzen dieselbe Methode.
- **Update-Reihenfolge in `GameScene.update()` (verbindlich):** dt-Clamp →
  Scrolling → `crowd` → `weapons` → `spawner` → `coins.update(...)` →
  `gates.update(dt)` → **direkt danach** `if (runStats.get('hp') <= 0) {
  this.triggerGameOver(); return }` → iFrames/Blinken. Grund: `scene.start`
  läuft in Phaser synchron — nach einem Tor-Game-Over darf im selben
  `update()` nichts mehr laufen; und Coins werden **vor** den Gates
  eingesammelt, damit ein im selben Frame gesammelter Coin noch im
  `{coins}`-Snapshot der GameOverScene landet.
- **HUD:** eine Zeile innerhalb der Safe-Area, z. B. `HP 3   ¢ 12`
  (HP aus RunStats gerundet, Coin-Zähler). HUD wird bei jeder Änderung
  aktualisiert (Treffer, Tor, Coin) — nicht zwingend pro Frame.
- `GameOverScene.init(data)`/`create` zeigt zusätzlich `Coins: N` an
  (defensiv: fehlt `data.coins`, 0 anzeigen — die Szene kann auch ohne Daten
  gestartet werden).

### 8. `src/scenes/BootScene.ts` — neue Texturen

Runtime-Texturen für Tor-Rechteck und Coin, wie bisher Graphics →
`generateTexture` → `destroy()` in der Initialisierung. **Die Tor-Textur wird
direkt in Zielgröße gezeichnet** (`(width − gapBetween) / 2 × gateHeight`,
inkl. Rand) — nicht eine kleine Textur per `setDisplaySize` strecken, sonst
wird der gezeichnete Rand achsweise unterschiedlich dick verzerrt.

### 9. RNG

`Phaser.Math.RND.frac` (bzw. eine kleine Wrapper-Funktion) als `rng`-Parameter in
`drawGatePair` injizieren. Kein eigener Seed nötig; wichtig ist nur, dass die
Ziehfunktion den Zufall als Parameter nimmt (reine Funktion, reviewbar).

## Betroffene Dateien

| Datei | Aktion |
|---|---|
| `src/config/balance.ts` | erweitern/umbauen (stats, gates, coins, Pools, Entschärfung) |
| `src/systems/upgrades.ts` | neu (RunStats) |
| `src/systems/gates.ts` | neu (drawGatePair + Klasse Gates) |
| `src/systems/coins.ts` | neu |
| `src/systems/weapons.ts` | umbauen (RunStats, Mehrfach-Projektile, Rate) |
| `src/systems/spawner.ts` | Werte-Anbindung prüfen (Entschärfung kommt aus balance.ts) |
| `src/scenes/GameScene.ts` | Integration (RunStats, Gates, Coins, HUD, GameOver-Daten) |
| `src/scenes/GameOverScene.ts` | Coin-Anzeige aus Szenen-Daten |
| `src/scenes/BootScene.ts` | Texturen Tor + Coin |

Keine Änderungen an `vite.config.ts`, `package.json`, `public/`, Workflow-Dateien,
`main.ts`, `crowd.ts`, `safeArea.ts`.

## Akzeptanzkriterien

- [ ] `npm run check` und `npm run build` laufen fehlerfrei.
- [ ] **Pool-Checkpunkte (Review-grep-bar):** kein `destroy()`/`create()` im laufenden
      Spiel — auch nicht für Coins, Tore oder Text-Objekte; Tor-Texte werden per
      `setText` recycelt. Poolgrößen aus `BALANCE.pools` mit aktualisierter
      Herleitung (Projektile rechnen den gecappten Maximalfall).
- [ ] Kein `time.addEvent`/`delayedCall` (grep-bar); Tor-Spawn und Flash laufen über
      Akkumulator bzw. `flashUntil`-Zeitmarken; dt-Clamp bleibt erste Zeile.
- [ ] Tore und Coins haben **keine** Arcade-Bodies; Durchlauf = Y-Flanken-Check,
      Einsammeln = Distanz-Check.
- [ ] `clampStat` in `upgrades.ts` ist die **einzige** Clamp-/Rundungsstelle
      (rundet hp und projectiles, Untergrenze 0 nur für hp, sonst 1, Caps oben);
      `RunStats.set`, die `drawGatePair`-Checks und der Sackgassen-Schutz nutzen
      sie alle — nirgendwo eine zweite Rundungs-/Clamp-Logik (grep-bar).
- [ ] `drawGatePair` ist eine reine, exportierte Funktion mit injiziertem RNG;
      Paare werden aus dem aktuellen Stat-Wert gezogen (kein fester Paar-Katalog);
      per `clampStat` aufgelöste Ergebnisse beider Seiten nie identisch; bei `hp`
      nie beide Seiten ≤ 0; Fallback `+1`/`−1` nach `maxRedraws` Fehlversuchen;
      Sackgassen-Schutz zur Anwendungszeit vorhanden. Additive Tore: Label und
      Wirkung nutzen denselben vorab gerundeten `k`-Wert.
- [ ] Operator wird beim **Durchlauf** auf den dann aktuellen Wert angewandt;
      Gates löst keinen Szenenwechsel aus — der HP-Check sitzt in
      `GameScene.update()` direkt nach `gates.update(dt)` mit sofortigem `return`;
      Treffer- und Tor-Pfad teilen sich `triggerGameOver()` mit Guard-Flag;
      Update-Reihenfolge: Coins vor Gates.
- [ ] Torpaar: volle Breite, einheitliche Farbe, große Operator-Zahl, neutrales
      Stat-Label; Seitenwahl über Anker-X; gewählte Seite blitzt und das Paar wird
      erst nach Ablauf des Flashs recycelt; Flanken-Zustand (`prevBottomY`,
      Ausgelöst-Flag) wird bei Pool-Aktivierung hart zurückgesetzt; Zeitfenster
      Erscheinen→Durchfahren liegt rechnerisch bei 1–1,5 s (Kommentar in balance.ts).
- [ ] Feuerrate-Tor wirkt hörbar/sichtbar sofort (Weapons liest Stats pro Auslösung);
      Projektil-Tor feuert n Projektile im zentrierten Fächer; Damage-Tor tötet
      Gegner in entsprechend weniger Treffern.
- [ ] Genau 1 Coin pro Gegner-**Tod** (Kill-Erkennung über Rückgabewert von
      `Spawner.damage`, nie pro Treffer); Coins werden im Magnetradius angezogen
      (Schritt auf Restdistanz geclampt) und erhöhen den HUD-Zähler; unten
      ausgelaufene Coins zählen nicht.
- [ ] HUD zeigt HP und Coins in der Safe-Area; GameOver zeigt die Run-Coins
      (ohne Persistenz); Restart setzt Stats, Coins, Tore vollständig zurück
      (zweiter Run identisch zum ersten, `children.length`-Debuglog konstant).
- [ ] Gegner-Entschärfung ist wirksam (neue Werte in balance.ts; spawner.ts liest
      sie unverändert von dort).
- [ ] Keine neuen Dependencies, keine externen Requests, keine Asset-Dateien.

**iPhone-Kriterien (nicht Codex-prüfbar, entscheidet Thomas nach Deploy):**
2–3-Minuten-Run erzeugt spürbares „stärker werden"; Torwahl ist eine echte
Rechen-Entscheidung, kein Reflex; Gegner-Dichte fühlt sich fair an.
Max. 3 Balance-Zyklen über `balance.ts` (Reißleine unten).

**Reißleine (aus dem Plan):** Maximal 3 Balance-Zyklen mit konkreten
`balance.ts`-Änderungen. Macht der Run danach immer noch keinen Spaß, ist das
Problem strukturell (Encounter-/Gate-Design) — dann Design-Entscheidung mit
Thomas statt endlosem Zahlendrehen.

## Implementation Summary
E3 umgesetzt: `RunStats` mit zentralem `clampStat`, zustandsabhängige gepoolte Tore
mit injizierbarem RNG, Flash und Sackgassen-Schutz, gepoolte Magnet-Coins sowie
Run-Stat-gebundene Feuerrate, Schaden und zentrierter Projektil-Fächer. GameScene
integriert den gemeinsamen Game-Over-Pfad, HUD (`HP`/Coins), Coin-Drops nur bei
Kills und den vorgegebenen Update-Ablauf; Boot/GameOver und `balance.ts` sind für
die neuen Runtime-Texturen, Anzeige und entschärften Gegnerwerte ergänzt.

Testergebnisse: `npm run check` erfolgreich (Exit 0, `tsc --noEmit`); `npm run build`
erfolgreich (Exit 0, 20 Module, PWA-Precache mit 6 Einträgen). Der Build meldet nur
die bestehende Vite-Hinweiswarnung zum 1.218-kB-JavaScript-Chunk, kein Fehler.

Nicht prüfbar: die iPhone-Gamefeel-Kriterien (2–3-Minuten-Run, Tor-Entscheidungen,
Gegnerdichte) benötigen den Deploy und Thomas' Gerätetest; es wurde kein Browser,
kein Netz-Zugriff und kein neuer Test-Runner verwendet.

## Review Notes
Review 2026-08-20 (Claude): bestanden.
- Alle drei neuen Module vollständig gelesen (`upgrades.ts`, `gates.ts`, `coins.ts`),
  Diffs aller geänderten Dateien gegen die Akzeptanzkriterien geprüft.
- Kernpunkte verifiziert: `clampStat` einzige Clamp-/Rundungsstelle; Tore/Coins ohne
  Arcade-Bodies (Flanken- bzw. Distanz-Check); Update-Reihenfolge Coins → Gates →
  HP-Check mit sofortigem return; `triggerGameOver` mit Guard-Flag; Coin nur bei Kill
  via `damage()`-Rückgabewert; Flash vor Recycling; prevBottomY-Reset beim Spawn;
  Sackgassen-Schutz; Magnet-Schritt auf Restdistanz geclampt; Tor-Textur in
  Zielgröße gezeichnet; Fächer schrumpft symmetrisch.
- Float-Verdacht Prozent-Labels geprüft (node): 0.2·100 = 20 exakt — Labels sauber.
- Eigene Checks: greps auf destroy/create/addEvent/delayedCall und Alt-Referenzen
  (fireRateMs/startHp/projectileDamage) leer; `npm run check` und `npm run build` grün.
- Offen (per Definition): iPhone-Gamefeel-Test durch Thomas nach Deploy.
