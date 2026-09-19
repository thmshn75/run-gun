# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**V5 / E3 — Die Horde: eine rote Masse mit Zahl, die den Strom verbraucht und die
Quelle frisst. Mit ihr kommt die Niederlage in den Torlauf zurueck.**

## Implementation Summary

- A1–A8 umgesetzt: eigene Horde der Torbahn samt Bewegung, Strom- und Huellenkontakt,
  Sieg/Niederlage sowie Phasen- und Collider-Schutz; A9 bleibt beim Reviewer, A10 beim iPhone-Test.

Plan: `docs/plan-v5.md`, Kernmechanik bestaetigt (Losschicken statt Schiessen). E2r
(Strom, Commit `93b64f5` + N5) ist die Grundlage: Figuren laufen in Wellen nach oben,
hacken Pfeiler, werden an Platten vervielfacht; die Quelle waechst ueber +1-Kacheln
(Team faehrt durch) und +N-Tore. **In E2r kann man nicht verlieren** — E3 aendert das.

### Was das Video zeigt (Bild fuer Bild, 4/s)

Die rote Flaeche ist eine dicht gepackte Masse roter Figuren mit einer Zahl daneben
(858). Die blaue Welle drueckt gegen ihre Unterkante; **beide Zahlen schmelzen im
Kontakt** (858 → 852 → 828 → 804 → 781 → 757 → 733 → 710, rund 24 je Viertelsekunde bei
voller Welle). Die Masse rueckt langsam vor. Ist sie bei 0, ist der Weg frei (dann der
Boss, E4). Ist die Quelle vorher leer, ist der Lauf vorbei.

### Was der Bestand vorgibt (gelesen)

- `updateLevelPhase` (GameScene ~Z.1411): im Torlauf springt `normal` nach Ablauf der
  Gegnerphase direkt auf `cleared` (E2r-Zwischenloesung, eigener Block mit
  `currentLevel += 1`). `warning`/`boss` werden im Torlauf uebersprungen.
- Niederlage im Probelauf: `triggerGameOver` → `beendeProbelauf` (E0), ausgeloest,
  wenn `runStats.hp <= 0` (update-Schleife).
- Torbahn-Objekte liegen in `getWalls()`; Strom-Figuren treffen sie ueber
  `handleStromTreffer` (Dispatch-Zweig `'strom'`), die Huelle ueber den Huellen-Zweig
  von `handleCombatOverlap`. `hitSpawnIds` verhindert Doppeltreffer je Figur.
- Thomas' Gestalten (E5): Horde = `standard`-Figur, 0,6 skaliert; bis die Figurenmasse
  gebaut ist, tut es eine Flaeche.
- Sterbeeffekt-Pool (`sterbeeffekte.ts`) fuer das Zerplatzen.

### Architekturentscheidung

**Die Horde ist ein Objekt der `Torbahn`** (`HordeZustand`), kein Gegner des Spawners
und kein Boss: ein Physik-Sprite ueber die **volle Strassenbreite** auf ihrer Hoehe,
Textur vorerst ein Rechteck (`wall-segment-bad`-artig, rot), spaeter die Figurenmasse
(E3b). Sie liegt in `getWalls()`, damit beide Collider (Strom, Huelle) sie ohne neuen
Collider erreichen; `istHorde(obj)` unterscheidet sie.

**Sie wird als eigenes Feld `horde: HordeZustand | undefined` gefuehrt, NICHT in den
Arrays `tore`/`kacheln`** — sonst muesste `deactivateAll()` (`torbahn.ts:87`) eine
Ausnahme kennen, die alle anderen Aufrufer (Levelwechsel, Phasenwechsel) nicht wollen.
`deactivateAll()` bleibt damit unveraendert und raeumt Tore und Kacheln; die Horde wird
getrennt ueber `spawneHorde`/`recycleHorde` gesteuert.

**Drei Stellen, an denen die Horde sonst stumm verschluckt wuerde — alle am Code
belegt, alle Pflicht:**

1. **`Torbahn.isWall()` (`torbahn.ts:97`) darf die Horde NICHT als Wand melden**, und
   der `istHorde`-Zweig in `handleCombatOverlap` steht **vor** Zeile 1120
   (`if (this.walls.isWall(target)) return`, Kommentar "Wandsegmente kosten bei
   Beruehrung NICHTS"). Sonst faellt jeder Huellenkontakt in diesen `return` — genau der
   Fehlertyp der Lesson vom 2026-08-22, die zwei Zeilen darueber dokumentiert ist.
2. **`Torbahn.hasActivePair()` (`torbahn.ts:78`) muss true liefern, solange eine Horde
   aktiv ist.** Sie prueft heute nur `tore`/`kacheln`; nach `deactivateAll()` in der
   Horde-Phase waere sie false, und `syncWallColliders` (`GameScene.ts:617`) reisst den
   **Strom-Wand-Collider jedes Bild wieder ein** — der Strom traefe die Horde nie.
3. **`updateLevelPhase` (`GameScene.ts:1421`) braucht `horde` im Kurzschluss**
   (`if (levelPhase === 'boss' || 'shop' || 'horde') return`). Ohne ihn laeuft die
   Funktion bei abgelaufenem `phaseRemainingMs` bis Zeile 1461 durch und ruft
   `startLevel()` — **Levelneustart im ersten Bild der Horde-Phase.** Die Horde-Phase
   endet ausschliesslich ueber die Punkte-Ereignisse aus B, nie ueber einen Zeitgeber.

---

## A — Auftritt und Phase

- Neue Levelphase **nur im Torlauf**: nach der Gegnerphase (`normal`, Dauer wie heute)
  folgt **`horde`** statt `warning`/`boss`. Der **bestehende Torlauf-Zweig** in
  `updateLevelPhase` (`GameScene.ts:1424-1435`, heute `normal → cleared` mit
  `currentLevel += 1`) wird ersetzt: `levelPhase = 'horde'`, `walls.deactivateAll()`
  (Tore und Kacheln weg — im Video steht am Ende nur die Masse; die Horde liegt
  ausserhalb dieser Arrays, siehe Architekturentscheidung), dann
  `torbahn.spawneHorde(level)`. Das Hochzaehlen des Levels wandert in den Sieg-Fall
  (Abschnitt B).
- **Die vollstaendige Liste der `levelPhase`-Stellen (gegrept, Stand 2026-09-19) und
  was in `horde` gilt** — nicht als Suchauftrag, sondern als Vorgabe:

  | Stelle | Verhalten in `horde` |
  |---|---|
  | `:597`, `:602` `syncBossColliders` (`=== 'boss'`) | nichts, kein Boss — korrekt |
  | `:765` `handleBreakthrough` (`!== 'normal'` → return) | greift, kein Durchbruch — korrekt, **Test** |
  | `:779` Spawn-Soll (`=== 'normal'`) | false, kein Nachschub — korrekt |
  | `:1421` `updateLevelPhase`-Kurzschluss | **muss `horde` enthalten** (siehe oben) |
  | `:1460` `cleared` → `oeffneShop` | unveraendert, wird aus B erreicht |
  | `:1468` `handleBossDefeated` (`!== 'boss'` → return) | greift, nie erreicht |
  | `:1569`, `:1610`, `:1650`, `:1667` Shop (`!== 'shop'`) | greifen, Shop zu |
  | `:1728` `startLevel` setzt `normal` | unveraendert |
  | `:1747` `updateBossBar` (`=== 'boss'`) | Balken unsichtbar — korrekt |

  Zusaetzlich, **ohne `levelPhase` abzufragen und deshalb von keinem Grep gefunden**:
  `Torbahn.hasActivePair()` und der Fallthrough zu `startLevel()` (siehe oben).
- **Zahl der Horde:** `hordePunkte = torlauf.horde.basis x getLevelPlan(level).hardness`
  (Vorschlag Basis 120 — Rechenweg: eine Quelle von 40 mit 16 Figuren/s Welle liefert
  in 8 s ~130 Punkte; Level 5 soll mit 40-60 Einheiten knapp zu schaffen sein). Wert
  mit Rechenweg nach `balance.ts`; **das ist die Balance-Stellschraube von E3**.
- Darstellung: Flaeche volle Breite x `torlauf.horde.hoehePx` (140), Zahl gross darauf
  (Stil der Torlauf-Zahl).
- **Bewegung in zwei Abschnitten, wie beim Boss** (sonst waere sie in drei Sekunden da
  oder brauchte zwoelf): Sie faehrt vom Horizont **mit dem Scroll** ein
  (`advanceAlongRoad` wie ein Tor) bis `torlauf.horde.haltY` (**300**, wie
  `BALANCE.boss.battleY`), **haelt dort an** und rueckt von da mit
  `vorrueckTempoPxPerSec` (**40**) auf die Quelle vor.
  **Nachgerechnet:** Anker 624, Halt 300 → 324 px / 40 px/s = **8,1 s** bis zum ersten
  Huellenkontakt. In dieser Zeit schlagen bei 1200 ms Wellentakt **6-7 Wellen** ein; bei
  12-24 Figuren je Welle (gemessen N5) sind das **72-168 Punkte**. Gegen `basis` 120
  heisst das: mit kleiner Quelle knapp verloren, mit grosser knapp gewonnen — genau der
  Korridor, den A9 verlangt. Diese Rechnung steht als Kommentar an den Werten.

## B — Kontakt

- **Strom-Figur trifft Horde** (`handleStromTreffer`, Zweig `istHorde`): Horde
  `-torlauf.horde.punkteJeFigur` (1), Figur wird **recycelt** (verbraucht) — anders
  als am Pfeiler. Kleiner Sterbeeffekt am Kontakt (Pool wie gehabt, Ringpuffer).
- **Huelle trifft Horde** (Huellen-Zweig, **vor** der `isWall`-Zeile): solange Kontakt
  besteht, verliert die Quelle `fressRateProSek` (8) Einheiten je Sekunde **und** die
  Horde ebenso viele Punkte — gegenseitig, wie im Video.
  **Wie das dt hineinkommt:** `handleCombatOverlap` hat kein `dt` (Signatur
  `GameScene.ts:1072`), und Phaser ruft den Callback je Physik-Tick. Deshalb **setzt der
  Handler nur ein Flag** (`this.hordeKontakt = true`), und die Szenen-`update(_, dt)`
  verrechnet einmal je Bild `fressRateProSek * dt / 1000` auf beide Seiten und setzt das
  Flag zurueck — dasselbe Muster wie `strom.update(dt)`. Ein Test belegt
  Bildratenunabhaengigkeit (8 ms gegen 16 ms Schritte, gleiche Gesamtzeit).
- **Horde bei 0:** zerplatzt (Sterbeeffekt gross), `recycleHorde()`,
  `levelPhase = 'cleared'`, **`currentLevel += 1` und `syncBossColliders()`** (der Block,
  der heute im `normal`-Zweig steht, wandert hierher), `phaseRemainingMs =
  BALANCE.level.clearedMs`, Overlay `HORDE GESCHAFFT`.
- **Quelle bei 0:** `triggerGameOver` greift wie heute → `beendeProbelauf` mit
  `TORLAUF VORBEI` — **die Niederlage ist zurueck.** Ein Test belegt den Pfad.

## C — Der Strom in der Horde-Phase

- Der Strom laeuft weiter (Wellen), Pfeiler/Kacheln gibt es keine mehr; jede Welle
  schlaegt in die Horde. Die Quelle kann jetzt nur noch sinken (Huellenkontakt) — wer
  die Horde nicht schnell genug abbaut, wird gefressen. Das ist der Kern: **Masse
  gegen Masse.**

## D — Balance, Messung

- `BALANCE.torlauf.horde` (`basis`, `hoehePx`, `vorrueckTempoPxPerSec`, `punkteJeFigur`,
  `fressRateProSek`) mit Rechenweg.
- **A-Messung (Reviewer, Bot):** Level 5, Bot lenkt auf das bessere Tor und sammelt
  Kacheln (Anker links, wenn kein besseres Tor rechts): Ziel **60-80 % Siege ueber 5
  Laeufe**, beim Sieg bleiben 10-40 % der Quelle. Level 15: 20-40 %. Dreifach, frische
  Szene je Lauf. **Und: zweiter Start in derselben Sitzung** (Lesson 2026-09-19).
- Bildzeit in der Horde-Phase ≤ 16,7 ms.

---

## Akzeptanzkriterien

- **A1** Torlauf: nach der Gegnerphase folgt `horde`, Tore und Kacheln sind weg, die
  Horde faehrt ein. Run/Probelauf: unveraendert `warning → boss` (Test).
- **A2** Hordenzahl aus Basis x Haerte des Levels (Rechentest fuer Level 1, 5, 12).
- **A3** Strom-Figur: Horde -1, Figur verbraucht (Handler-Test mit Stubs).
- **A4** Huellenkontakt: Quelle und Horde verlieren `fressRate` je Sekunde, ueber `dt`,
  bildratenunabhaengig (Rechentest).
- **A5** Horde 0 → `cleared`, Level +1; Quelle 0 → `beendeProbelauf` (Tests).
- **A6** Die Tabelle in A ist umgesetzt. Tests: Bossbalken in `horde` unsichtbar, Shop
  nicht offen, **kein Durchbruch-Schaden** (`handleBreakthrough`), und — die beiden
  Stellen ohne `levelPhase`-Bezug — **`hasActivePair()` ist in der Horde-Phase true**
  sowie **`updateLevelPhase` ruft in `horde` ueber mehrere Sekunden nie `startLevel()`**.
- **A6b** Der Huellenkontakt zieht der Horde wirklich Punkte ab (Test mit der echten
  Zweig-Reihenfolge, nicht nur dem Handler isoliert) — die `isWall`-Zeile darf ihn nicht
  abfangen.
- **A7** Keine Aenderung an Run, Probelauf, `VersuchBahnen`, `Weapons`.
- **A8** `npm run check`, `npm test`, `npm run build` gruen.
- **A9 (Reviewer)** Bot-Messung wie in D; Bildzeit.
- **A10 (Thomas)** iPhone: Die Horde liest sich als Masse gegen Masse, die Zahlen
  schmelzen sichtbar, verlieren ist moeglich und fair. Zweimal starten.

## Mitnehmen, weil die Bahn ohnehin angefasst wird

- Die +1-Kacheln liegen am Horizont knapp **neben** der Strassenkante statt darauf
  (perspektivischer Rand, Befund aus dem N6-Nachweis). Beim Bau der Horde mit
  korrigieren: Kachel-x an derselben Strassengeometrie ausrichten wie die Tore.
- `handleStromTreffer` castet `this.walls as Torbahn` ohne `instanceof`-Pruefung
  (funktional sicher, den Collider gibt es nur im Torlauf). Beim Anfassen haerten —
  die Horde bringt ohnehin einen neuen Zweig in denselben Handler.

## Reissleine

Traegt das gegenseitige Fressen nach **einer Balance-Session** nicht (Sieg immer oder
nie), drehbar sind `basis`, `fressRateProSek` **und `haltY`/`vorrueckTempoPxPerSec`** —
letztere, weil die Zeit bis zum Kontakt die eigentliche Stellschraube ist (siehe
Rechnung in A). **Nicht** den Strom staerken (Rate, Wellentakt, Pool).
Passt die Flaeche als Physik-Objekt nicht in `getWalls()` (Collider-Konflikte mit
`isWall`-Zweigen), dann eigene Gruppe und eigener Collider — sauber, kein Cast.

## Was kein zulaessiger Ersatz ist

- **Nicht** die Horde aus dem Gegnerpool bauen.
- **Nicht** Beschuss auf die Horde (es gibt keinen).
- **Nicht** die Niederlage weglassen — sie ist der Zweck dieser Etappe.
- **Nicht** Bilder erzeugen — Figurenmasse ist E3b, Pfeiler E2b.

---

## Wo die Historie steht

Projektstand: `docs/UEBERGABE.md`, Regeln: `docs/lessons.md`, Plan: `docs/plan-v5.md`.
**Zuletzt abgeschlossen:** E2r Der Strom (`93b64f5`) mit N5/N6 (Kacheln fuers Team ueber die Huelle, Strom in Wellen, schmale Randkacheln), Commit `7a5081a`.

---

## NACHARBEIT N7 (2026-09-19, Browser-Messung des Reviewers): Die Horde schiebt sich durch

**Die Mechanik steht** — Punkte schmelzen unter dem Strom (142 → 0 in rund 5 s), Phase,
Overlay und Sieg laufen. **Aber die Quelle verliert nie eine Einheit**, in vier
Messungen mit 12, 15, 40 und 60 Einheiten: `nStart === nEnde`, immer.

**Ursache, im Browser belegt:** Die Horde haelt bei `haltY` 300 korrekt an und rueckt
mit 40 px/s vor — **aber sie stoppt nicht an der Truppe.** Sie schiebt sich durch die
Huelle hindurch und laeuft endlos weiter; gemessen stand sie am Ende bei **y = 5032**
(Bildschirm ist 844 hoch). Der Kontakt dauert dadurch nur die Bruchteile einer Sekunde,
in denen sie die 37 px hohe Huelle passiert — bei 8 Einheiten je Sekunde ist das
gerundet **null**. Im Video treffen die beiden Massen aufeinander und **druecken
gegeneinander**, bis eine verschwunden ist.

**Umbau:**

1. **Die Horde bleibt an der Truppe stehen.** Sobald ihre **Unterkante** die
   **Oberkante der Truppenhuelle** erreicht (`crowd.getHullBounds().body.top`, im
   Torlauf gleich dem Anker), wird `horde.y` genau dort festgehalten — sie rueckt nicht
   weiter vor. Sie bleibt stehen, bis ihre Punkte 0 sind (Sieg) oder die Quelle 0 ist
   (Niederlage). Die Torbahn braucht dafuer die Ankerhoehe; sie bekommt sie als
   Callback injiziert (`getAnchorY`), wie der Spawner seine.
2. **Sicherheitsnetz:** Laeuft die Horde trotzdem unter den unteren Bildrand
   (`y - hoehe/2 > scale.height`), wird sie recycelt und die Phase auf `cleared`
   gesetzt — heute laeuft sie unbegrenzt weiter und bleibt fuer immer aktiv.
3. **Das Fressen ist im Betrieb zu belegen, nicht nur im Test.** Der A4-Test darf nicht
   nur die Rechnung pruefen: Ein Test ruft `handleCombatOverlap(huelle, hordeBild)`
   und danach den `update`-Schritt auf und belegt, dass `hp` um
   `fressRateProSek * dt / 1000` sinkt. **Der Reviewer misst zusaetzlich im Browser:
   Quelle sinkt bei stehendem Kontakt sichtbar.**

**Balance, gemessen — die Basis ist zu niedrig:** Der Strom baut rund **28 Punkte je
Sekunde** ab (24 Figuren/s erreichen die Horde nahezu vollstaendig), nicht die in der
Spec gerechneten 72-168 Punkte ueber acht Sekunden. Mit `basis` 120 ist die Horde nach
5 s weg, **bevor sie die Truppe ueberhaupt erreicht** (Level 15 mit 181 Punkten:
9,8 s, ebenfalls ohne Kontakt). Damit es ueberhaupt zum Schiebe-Kampf kommt:
**`basis` 120 → 320** (Rechenweg: 28 Punkte/s x 8,1 s bis zum Kontakt = 227 Punkte, die
der Strom auf dem Weg abbaut; was darueber liegt, muss im Nahkampf fallen —
320 laesst rund 90 Punkte fuer das gegenseitige Fressen, also gut 11 s bei 8/s).
Die Rechnung gehoert als Kommentar an den Wert. **Nach dem Umbau neu messen** —
diese Zahl ist eine Schaetzung auf Basis einer Messung, kein Ergebnis.

**Akzeptanz N7:** N7.1 Horde stoppt an der Huellen-Oberkante (Test + Browser).
N7.2 Sicherheitsnetz unten (Test). N7.3 Fressen im Betrieb belegt: Quelle sinkt bei
Kontakt (Test + Browser). N7.4 `basis` 320 mit Rechenweg. N7.5 check/test/build gruen.
