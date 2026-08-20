# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E2 — Spielbarer Kern**

Auto-Run-Scrolling, Auto-Fire, einfache Gegner, Kollision, HP + iFrames,
Game Over/Restart, Objekt-Pools nach Spezifikation. Referenz: `docs/plan.md`
(Etappentabelle E2, Abschnitte „Architektur", „Steuerung & Gamefeel").

## Kontext

E1 (Gerüst + Deploy) ist abgenommen und live. E2 macht daraus das erste spielbare
Spiel: Gegner kommen von oben, der Spieler weicht per Drag aus und schießt automatisch.
E2 legt die technischen Fundamente, auf denen E3 (Gates/Coins) und E4 (Truppe/Waffen)
aufbauen — deshalb sind zwei Strukturvorgaben hier Pflicht, obwohl sie in E2 noch
überdimensioniert wirken: **Anker+Formation** statt Einzelsprite und **Objekt-Pools**
statt create/destroy.

**Harte Randbedingungen (Sandbox):**
- Kein Netzzugang: **kein `npm install`, keine neuen Dependencies, kein Asset-Download.**
  Alle Grafiken sind Runtime-generierte Texturen (Phaser Graphics → `generateTexture`),
  wie `player-placeholder` in `BootScene.ts` es vormacht.
- Prüfwerkzeuge: `npm run check` (tsc) und `npm run build` müssen fehlerfrei laufen.
  Es gibt keinen Test-Runner im Projekt — keinen hinzufügen.

## Anforderungen

### 1. `src/config/balance.ts` — alle Tuning-Werte zentral

Ein exportiertes, flaches `BALANCE`-Objekt (`as const`). **Keine Magic Numbers in
Szenen oder Systemen** — jede Zahl, die Spielgefühl oder Last beeinflusst, steht hier.
Mindestens:

```ts
export const BALANCE = {
  debug: false,                    // true = Safe-Area-Rahmen + Debug-Texte sichtbar
  scrollSpeed: 180,                // px/s, Welt-Scrolling nach unten
  player: {
    startHp: 3,
    iframesMs: 1200,               // Unverwundbarkeit nach Treffer
    blinkIntervalMs: 100,          // Alpha-Toggle während iFrames
    dragClampMargin: 8,            // Mindestabstand Ankerzentrum zum Spielfeldrand zusätzlich zur halben Figurbreite
  },
  weapon: {
    fireRateMs: 280,               // Intervall Auto-Fire
    projectileSpeed: 640,          // px/s nach oben
    projectileDamage: 1,
  },
  enemy: {
    hp: 3,
    speed: 120,                    // px/s zusätzlich zum Scrolling
    spawnIntervalMs: 900,
    spawnIntervalMinMs: 450,       // untere Grenze der Verdichtung
    spawnRampPerSec: 4,            // ms, die das Intervall pro Sekunde Laufzeit sinkt
    hitFlashMs: 80,
  },
  pools: {
    projectiles: 30,               // Herleitung als Kommentar daneben, siehe Anforderung 4
    enemies: 20,
    crowd: 30,                     // = CROWD_MAX aus dem Plan; E2 nutzt nur 1 Figur
  },
} as const
```

Die konkreten Zahlwerte sind Startwerte und dürfen von Codex plausibel angepasst
werden; die **Struktur** und die Regel „alles hier, nichts hartkodiert" nicht.

### 2. `src/systems/crowd.ts` — Anker + Formation (Plan-Pflicht für E2)

- Klasse `Crowd`: hält einen unsichtbaren **Anker** (x/y) und eine **Formationsliste**
  von Figuren-Sprites mit Offsets relativ zum Anker.
- Beim Erzeugen werden **alle `BALANCE.pools.crowd` Figuren-Sprites einmalig angelegt**
  (Textur `player-placeholder`) und deaktiviert; dann wird genau **1 Figur** mit
  Offset (0,0) aktiviert. Zur Laufzeit kein `create()`/`destroy()` — nur
  aktivieren/deaktivieren. (E4 erweitert später nur die Aktivierungslogik.)
- API mindestens: `setAnchorX(x)` (mit Clamp auf Spielfeldbreite),
  `getAnchorX()`, `getHullBounds()` (s. u.), `update()` (Figuren folgen dem Anker).
- **Kollisions-Hülle:** Treffer gegen den Spieler werden gegen **eine** Hülle geprüft,
  nicht gegen einzelne Figuren. In E2: ein Rechteck in Größe einer Figur um den Anker.
  Umsetzung festgelegt: `this.add.zone(x, y, w, h)` + `this.physics.add.existing(zone)`
  (eine Zone rendert nichts und braucht keine Textur); Body-Größe = Figurgröße,
  Position koppelt `update()` an den Anker.
- Der Drag aus E1 (relative Finger-Delta-Steuerung, `GameScene.enableRelativeDrag`)
  steuert künftig `Crowd.setAnchorX()` statt direkt ein Sprite.

### 3. `src/systems/weapons.ts` — Auto-Fire + Projektil-Pool

- Klasse `Weapons`: erzeugt in der Initialisierung einen Pool aus
  `BALANCE.pools.projectiles` Projektil-Sprites (Arcade Physics, eigene kleine
  Runtime-Textur, z. B. 6×14 px heller Balken), alle inaktiv.
- **Takt-Mechanik (gilt für Weapons UND Spawner): kein `this.time.addEvent`,
  kein `delayedCall`.** Feuer- und Spawn-Takt laufen über ein Akkumulator-
  Instanzfeld, das in `update(dt)` das (bereits geclampte, s. Abschnitt 6) dt
  aufsummiert; erreicht der Akkumulator `fireRateMs`/Spawn-Intervall, wird
  ausgelöst und der Akkumulator um das Intervall reduziert. Ein Mechanismus für
  Takt und Bewegung — damit gibt es nach App-Resume keinen Timer-Catch-up-Burst
  und beim Szenen-Neustart keine überlebenden Timer-Events.
- Auto-Fire: pro Auslösung wird ein inaktives Projektil an der Ankerposition
  aktiviert und fliegt mit `projectileSpeed` nach oben.
- Recycling: verlässt ein Projektil oben den Bildschirm oder trifft es einen Gegner
  → `setActive(false).setVisible(false)` + Body deaktivieren (`body.enable = false`
  oder `disableBody(true, true)`). **Niemals `destroy()`, nach der Initialisierung
  kein `create()`.**
- **Pool-Erschöpfung:** Ist kein inaktives Projektil frei, wird der Schuss
  übersprungen und einmal pro Sekunde gedrosselt per `console.warn` gemeldet —
  nur wenn `import.meta.env.DEV` (Vite) wahr ist, im Prod-Build stumm.
  Der Drossel-Zeitstempel ist ein **Instanzfeld** auf Weapons/Spawner, keine
  Modulvariable (Modul-Globals sind wegen Restart verboten, s. Abschnitt 7).

### 4. Poolgrößen-Herleitung (Kommentar in `balance.ts`)

Neben `pools.projectiles` als Kommentar die Rechnung dokumentieren:
maximale gleichzeitige Projektile = Screen-Transit-Zeit (Spielfeldhöhe ÷
`projectileSpeed`) ÷ `fireRateMs`, plus Marge (Faktor ≥ 2, weil E3/E4 FireRate-
und Projectiles-Upgrades stapeln). Analog kurz für `pools.enemies`
(Transit-Zeit bei `scrollSpeed + enemy.speed` ÷ minimales Spawn-Intervall, plus Marge).

### 5. `src/systems/spawner.ts` — Gegner-Pool + Spawning

- Klasse `Spawner`: Pool aus `BALANCE.pools.enemies` Gegner-Sprites (eigene
  Runtime-Textur, z. B. 30×30 px rotes Quadrat mit dunklem Rand), alle inaktiv.
- Spawnt über den Akkumulator-Mechanismus aus Abschnitt 3 (kein `time.addEvent`):
  Startintervall `spawnIntervalMs`, sinkt mit Laufzeit um `spawnRampPerSec` ms
  pro Sekunde bis `spawnIntervalMinMs` (einfache Verdichtung, damit ein Run nicht
  beliebig lange trivial bleibt). Laufzeit = aufsummiertes geclamptes dt, kein
  Wanduhr-Zeitstempel.
- Spawn: zufällige X-Position innerhalb Spielfeldbreite (Marge = halbe Gegnerbreite),
  Y knapp oberhalb des Sichtbereichs; Bewegung nach unten mit
  `BALANCE.scrollSpeed + BALANCE.enemy.speed`.
- Jeder aktive Gegner trägt seine Rest-HP (z. B. via `setData('hp', …)` oder
  eigene Sprite-Subklasse). Recycling wie bei Projektilen: unten aus dem Bildschirm
  → deaktivieren (kein Schaden für den Spieler); HP ≤ 0 → deaktivieren.
- **Reset bei Aktivierung:** Beim Aktivieren eines Pool-Objekts werden Tint,
  Alpha, HP und Flash-Zustand hart auf Startwerte gesetzt — nie darauf verlassen,
  dass das Recycling sie sauber hinterlassen hat (ein Gegner kann mitten im
  Hit-Flash sterben).
- Dieselbe Pool-Erschöpfungs-Warnung wie bei Projektilen (Spawn wird übersprungen).

### 6. `src/scenes/GameScene.ts` — Kern-Loop

- **dt-Clamp (Pflicht, erste Zeile in `update()`):** iOS-PWAs liefern nach
  Sperren/App-Wechsel keinen zuverlässigen Pause-Event; der erste Frame nach
  dem Aufwecken kann ein dt im Sekundenbereich haben. Deshalb
  `const dt = Math.min(rawDeltaMs, 100)` — nur dieses geclampte dt wird an
  Crowd, Weapons, Spawner und Scrolling weitergereicht. Ohne Clamp:
  Teleport-Sprünge, Projektil-Tunneling durch Gegner, Spawn-Bursts.
- **Bezugsgröße:** Alle Breiten-/Höhenbezüge („Spielfeldbreite" usw.) einheitlich
  über `this.scale.width` / `this.scale.height` (feste 390×844), nie
  `window.innerWidth` o. Ä.
- **Zustandsregel (Pflicht):** Alle Zustandsfelder der Szene — Primitive wie HP
  und Laufzeit **und** die System-Instanzen (Crowd/Weapons/Spawner) — werden mit
  `!:` deklariert und ausschließlich in `create()` zugewiesen, nie als
  Feld-Default. Grund: Phaser nutzt bei `scene.start()` dieselbe Instanz wieder;
  Feld-Defaults laufen nur beim allerersten Aufbau. Kein Zustand in Modul-Globals.
- **Scrolling:** Hintergrund als `TileSprite` über die volle Spielfläche mit
  Runtime-Textur (dezentes dunkles Muster, z. B. 64×64 px mit wenigen helleren
  Pixeln als „Boden-Streifen"); pro Frame `tilePositionY -= scrollSpeed * dt`.
  Spieler bleibt vertikal fix (Y wie bisher ~`height - 130`).
  Hinweis wegen `pixelArt: true`: Sub-Pixel-Scrolling kann am iPhone flimmern —
  falls Thomas das im Test meldet, `tilePositionY` beim Zuweisen runden
  (Akkumulator behält den Bruchteil); kein Vorab-Umbau nötig.
- **Kollisionen** (Arcade `overlap`):
  - Projektil × Gegner: Gegner-HP −`projectileDamage`, Projektil recyceln,
    Gegner-Hit-Flash: `setTintFill(0xffffff)` + eine `flashUntil`-Zeitmarke
    (kumulierte Spielzeit + `hitFlashMs`), die `update()` prüft und den Tint
    zurücksetzt — **kein `delayedCall`** (ein verzögerter Callback kann auf
    einem inzwischen recycelten Sprite feuern). HP ≤ 0 → Gegner recyceln.
  - Gegner × Spieler-Hülle: Gegner recyceln, Spieler −1 HP, iFrames starten.
    **Der iFrame-Check ist die erste Zeile im Overlap-Callback selbst** (return
    bei aktiver Unverwundbarkeit) — nicht ein Flag, das erst im nächsten
    `update()` wirkt; sonst ziehen zwei Gegner im selben Physics-Step −2 ab.
    Während iFrames blinken die Figuren (Alpha-Toggle im `blinkIntervalMs`-Takt),
    am Ende Alpha sauber auf 1.
- **HP + HUD:** HP als Zahl im Szenen-State; HUD-Text (z. B. `HP 3`) oben links,
  positioniert **innerhalb der Safe-Area** (Insets per JS wie in E1 —
  `readSafeAreaInsets` dazu aus `GameScene.ts` in eine eigene Datei
  `src/systems/safeArea.ts` extrahieren, da GameOver sie auch braucht).
- **Game Over:** HP ≤ 0 → `GameOverScene` starten (Laufzeit/Kills als Anzeige-Daten
  mitgeben ist erlaubt, aber optional).
- Der Safe-Area-Debug-Rahmen aus E1 wird nur noch bei `BALANCE.debug === true`
  gezeichnet.
- `update()` treibt Crowd, Weapons, Spawner und Scrolling über Delta-Zeit (`dt`),
  keine Frame-Zähler (iPhone kann 60 oder 120 Hz sein).

### 7. `src/scenes/GameOverScene.ts` + Restart

- Zeigt „Game Over" + Hinweis „Tippen für Neustart" (System-Font, kein Asset).
- **Restart-Eingabe:** Reagiert auf `pointerdown` (nicht `pointerup` — beim Tod
  ist der Drag-Finger meist noch unten; sein Loslassen darf nicht als Tap zählen,
  und ein gehaltener Finger erzeugt kein neues `pointerdown`). Zusätzlich eine
  Sperrfrist von ~400 ms nach Szenenstart, damit hektisches Tippen den
  Game-Over-Screen nicht überspringt. Danach `scene.start('GameScene')`.
- **Restart muss vollständig zurücksetzen:** HP, Takt-Akkumulatoren,
  Spawn-Verdichtung, alle Pool-Objekte inaktiv, Anker auf Mitte. Zweiter und
  dritter Run verhalten sich identisch zum ersten. Umsetzung über die
  Zustandsregel aus Abschnitt 6: Systeme und Pools entstehen in `create()`
  frisch als Kinder der Szene (Phaser zerstört Szenen-Objekte beim Shutdown
  selbst — das `destroy()`-Verbot gilt für den laufenden Loop, nicht für
  Phasers eigenes Aufräumen beim Szenenwechsel). Keine Referenzen auf
  Spielobjekte überleben den Restart.
- **Leak-Nachweis:** Bei `BALANCE.debug === true` loggt `GameScene.create()`
  `this.children.length` — die Zahl muss bei jedem Restart gleich sein
  (wächst sie, sammeln sich Orphan-Objekte an).
- **Input:** Kein `input.addPointer()` — Phaser-Default beibehalten, damit ein
  zweiter Finger schlicht ignoriert wird (Multi-Touch ist bewusst kein Feature).
- `main.ts`: `GameOverScene` in die Szenenliste aufnehmen.

### 8. `src/scenes/BootScene.ts` — Texturen

Alle neuen Runtime-Texturen (Projektil, Gegner, Hintergrund-Tile) entstehen wie
bisher in `BootScene.create()` per Graphics → `generateTexture` → `destroy()`.

## Betroffene Dateien

| Datei | Aktion |
|---|---|
| `src/config/balance.ts` | neu |
| `src/systems/crowd.ts` | neu |
| `src/systems/weapons.ts` | neu |
| `src/systems/spawner.ts` | neu |
| `src/systems/safeArea.ts` | neu (aus GameScene extrahiert) |
| `src/scenes/GameOverScene.ts` | neu |
| `src/scenes/GameScene.ts` | umbauen (Loop, Kollisionen, HUD, Drag → Crowd) |
| `src/scenes/BootScene.ts` | erweitern (Texturen) |
| `src/main.ts` | GameOverScene registrieren |

Keine Änderungen an `vite.config.ts`, `package.json`, `public/`, Workflow-Dateien.

## Akzeptanzkriterien

- [x] `npm run check` und `npm run build` laufen fehlerfrei.
- [x] **Pool-Checkpunkte (Review-grep-bar):** In `src/systems/` und `src/scenes/`
      gibt es im laufenden Spiel kein `destroy()` und kein Pool-`create()`/
      `Group.create()` außerhalb der Initialisierung; Recycling ausschließlich über
      Aktivieren/Deaktivieren. Poolgrößen kommen aus `BALANCE.pools` und sind mit
      Herleitungs-Kommentar dokumentiert.
- [x] Pool-Erschöpfung (Projektile und Gegner) loggt Dev-only eine gedrosselte
      Warnung und crasht nicht.
- [x] Hintergrund scrollt sichtbar nach unten; Bewegung ist Delta-Zeit-basiert.
- [x] `update()` clampt dt auf max. 100 ms, bevor es an die Systeme geht;
      nirgends `this.time.addEvent` oder `delayedCall` für Takt/Flash
      (grep-bar); Hit-Flash läuft über `flashUntil`-Zeitmarke.
- [x] iFrame-Check sitzt als erste Zeile im Overlap-Callback (zwei Gegner im
      selben Physics-Step kosten zusammen genau 1 HP).
- [x] Auto-Fire feuert im `fireRateMs`-Takt von der Ankerposition; Projektile
      verschwinden oben sauber (recycelt, nicht zerstört).
- [x] Gegner spawnen oben mit Verdichtung über Laufzeit, laufen nach unten,
      zeigen Hit-Flash bei Treffern und sterben nach `enemy.hp` Treffern.
- [x] Spieler-Kontakt: −1 HP, HUD aktualisiert, Figur blinkt für `iframesMs`,
      währenddessen kein weiterer Schaden; danach Alpha wieder 1.
- [x] Gegner, die unten durchlaufen, verursachen keinen Schaden und werden recycelt.
- [x] HP 0 → GameOverScene; Restart über `pointerdown` + ~400 ms Sperrfrist
      (ein beim Tod noch gehaltener Finger löst keinen Sofort-Restart aus);
      zweiter Run verhält sich identisch (HP voll, Spawn-Intervall
      zurückgesetzt, keine Geisterobjekte); Szenen-Zustandsfelder ohne
      Feld-Defaults (Zuweisung nur in `create()`); Debug-Log der
      `children.length` bleibt über Restarts konstant.
- [x] Drag steuert den Crowd-Anker (relativ, geclampt); die Formationsliste
      existiert und enthält in E2 genau eine aktive Figur; Kollision läuft gegen
      die Hülle, nicht gegen die Figur-Sprites.
- [x] Alle Tuning-Werte in `balance.ts`; HUD liegt innerhalb der Safe-Area;
      Debug-Rahmen nur bei `BALANCE.debug`.
- [x] Keine neuen Dependencies, keine externen Requests, keine Asset-Dateien.

**iPhone-Kriterien (nicht Codex-prüfbar, entscheidet Thomas nach Deploy):**
Loop läuft flüssig, Steuerung fühlt sich direkt an. Codex' Desktop-Einschätzung
zählt hier nicht als Nachweis.

**Reißleine (aus dem Plan):** Ruckelt oder schwimmt die Steuerung am iPhone nach
einem Nacharbeitszyklus mit Codex → Gegnerzahl/Effekte reduzieren (Scope runter),
nicht Engine oder Ansatz wechseln.

## Implementation Summary
E2 umgesetzt: zentrale Balance, Runtime-Texturen, Crowd-Anker mit Kollisionshülle,
Projektile- und Gegnerpools mit Akkumulator-Takt sowie Game-Over/Restart. `GameScene`
verwendet Delta-Clamp, Safe-Area-HUD, Auto-Fire, Gegner-Verdichtung, iFrames und
recycelt alle Laufzeitobjekte. `npm run check` und `npm run build` sind erfolgreich;
der iPhone-Gamefeel bleibt wie spezifiziert dem Test auf dem Gerät vorbehalten.
Review-Nacharbeit: Der Spielerhüllen-Overlap übergibt die Zone zuerst und den Gegner
als zweiten Callback-Parameter, damit ausschließlich Gegner recycelt werden.

## Review Notes
Review 2026-08-20 (Claude): Alle Pool-Checkpunkte bestanden — kein `destroy()`/
`create()` im Hot Path (grep-verifiziert; `destroy()` nur auf Graphics in der
BootScene-Initialisierung), Poolgrößen aus `BALANCE.pools` mit Herleitungs-
Kommentar, Recycling über `disableBody` + `setActive(false)/setVisible(false)`.
Kein `time.addEvent`/`delayedCall`; dt-Clamp erste Zeile in `update()`;
iFrame-Check erste Zeile im Overlap-Callback; Zustandsfelder ohne Feld-Defaults.
`npm run check` und `npm run build` grün.

Ein Nacharbeitszyklus: Overlap Gegner-Gruppe × Hüllen-Zone hatte die
Callback-Argumente in falscher Reihenfolge angenommen (Phaser übergibt bei
Group × Einzelobjekt immer `(einzelobjekt, groupChild)` — verifiziert in
`node_modules/phaser/src/physics/arcade/World.js`, `collideSpriteVsGroup`);
hätte beim ersten Spielertreffer einen TypeError ausgelöst. Fix: Zone als
erstes Argument deklariert, Gegner aus dem zweiten Callback-Parameter,
Kommentar an der Stelle. Erneut geprüft, grün.

Offen (per Definition): iPhone-Kriterien (flüssiger Loop, direkte Steuerung) —
entscheidet Thomas am Gerät nach dem Pages-Deploy.
