# Run & Gun — Umsetzungsplan V2 (Spuren-Umbau + Stadtbild + Boss-Umbau)

Basis: **V1 ist am 2026-08-22 von Thomas am iPhone abgenommen** (Spiel, Update-Pfad,
Offline bestätigt) und als Git-Tag **`v1.0`** gesichert — das ist der Rückschrittspunkt.
Geht in V2 etwas strukturell schief, ist `v1.0` der Stand, auf den zurückgesetzt wird
(`git checkout v1.0` zum Ansehen, `git revert`/Reset nach Thomas-Entscheidung zum
Zurückgehen). V2 wird auf `main` weitergebaut, weil GitHub Pages von `main` deployt und
Thomas jede Etappe über die Live-URL am iPhone testet. Dafür gilt verschärft: **Jede
Etappe endet in einem vollständig spielbaren Stand** — kein „halb umgebaut" auf `main`.

Die Regeln aus `docs/plan.md` (V1) gelten unverändert weiter, soweit V2 sie nicht
ausdrücklich ersetzt: Objekt-Pools mit hergeleiteten Größen, alle Tuning-Werte in
`balance.ts`, keine externen Requests, keine Kosten, Reißleinen benennen was **kein**
zulässiger Ersatz ist, Gamefeel gilt erst nach Thomas' iPhone-Test als erfüllt.

## Stand 2026-08-22 (Abend)

| Etappe | Stand |
|---|---|
| W1 Stadtbild | **fertig**, iPhone-abgenommen |
| W2 Wände | **fertig**, iPhone-abgenommen |
| W3 Horden mittig | **fertig**, iPhone-abgenommen |
| W4 Seiten-Ökonomie | **fertig** inkl. drei Nachbesserungen (Tempo, Trefferbarkeit, Verlust statt Dauerwachstum) |
| W5 Boss ohne Schuss | **fertig**, iPhone-Urteil offen |
| **W7 Plastische Figuren** | **offen — nächste Bau-Etappe** (unten spezifiziert, Codex-Auftrag) |
| W6 V2-Abnahme | **offen — läuft zuletzt**, nach W7 |

**Nach W5 sind ohne eigene Etappe noch fünf Dinge dazugekommen** (jeweils aus einer
iPhone-Rückmeldung von Thomas, alle committet und in `docs/active-task.md` mit Messwerten
belegt). Sie gehören inhaltlich zu W3/W4 und werden dort mit abgenommen:

1. **Perspektivische Figurengröße** — Gegner schrumpfen mit der Entfernung
   (`road.perspective`), dreimal nachgeschärft, weil sie zu klein wirkten.
2. **Gegner auf Spielgröße** (`enemy.figureScale` 1,25) — vorher war ein Gegner selbst
   direkt vor der Truppe kleiner als eine eigene Figur.
3. **Schussreichweite je Waffe** (`weapon.<name>.engageShare`) — vorher traf die Truppe
   bis zum Horizont und räumte jede Horde ab, bevor sie sichtbar wurde. Im Bossduell
   ausgesetzt.
4. **Gegnermenge** — Level 1 von 1,0 auf 5,2 Gegner je Sekunde in zwei Schritten; dazu
   breitere Spawn-Bänder, weil sonst die Spurvergabe bremst statt des Takts.
5. **Wandkette perspektivisch** — Kacheln schrumpfen mit der Entfernung und laufen in
   Weltkoordinaten statt in Bildschirmpixeln; behebt nebenbei den alten Bruch, dass
   Wände am Horizont 5x schneller waren als die Häuser daneben. Kachel-Optik als Quader
   statt flachem Rechteck.

## Was V2 ändert (Thomas-Entscheidungen vom 2026-08-21/22)

1. **Spuren-Umbau nach Genre-Vorbild** (Count Masters, Mob Control, Z Escape):
   mitlaufende **zerschießbare Wände links und rechts** mit Belohnung beim Wegschießen,
   **Waffen auf der einen Seite, Upgrades auf der anderen**, **Gegner-Horden in der
   Mitte**. Ersetzt das E10-Spurensystem (mehrspurige Tore) und baut Tore, Sperren und
   Spawner um. Kern-Mehrwert: permanenter Zielkonflikt — zur Wand steuern heißt, nicht
   auf die Horde schießen.
2. **Bosse sind in V1 noch etwas zu schwer.** V2 balanciert sie neu — entschieden am
   2026-08-22: Der Boss **schießt nicht mehr** und seine Stärke passt sich dem
   momentanen Spielerstand an (Details unten und in W5).
3. **Häuserschlucht wird eine Stadt:** Häuserzeilen laufen **durchgehend** links und
   rechts, unterbrochen **nur durch Querstraßen** — wie ein Straßenraster, nicht wie
   heute einzelne Türme mit zufälligen Lücken.
4. **Gegner erscheinen am Horizont, nicht erst unter der weißen Linie** (Präzisierung
   Thomas 2026-08-22, geschärft nach dem ersten W1-Stand): Gegner übernehmen **die
   Sichtbarkeitsregel der Häuser** — sobald die Unterkante die Horizontlinie erreicht,
   steht die Figur vollständig da und ragt mit dem Körper über die Linie in den Himmel.
   Ein Abschneiden an der Linie (Crop) ist ausdrücklich **nicht** gemeint: Häuser und
   Gegner sollen sich am Horizont gleich verhalten.
5. **Minigun-Projektile besser sichtbar** (Sidenote Thomas 2026-08-22): Die Projektile
   der `minigun` sind farblich kaum zu sehen — sie bekommen eine andere Farbe. Läuft
   als kleiner Fix in W1 mit.
6. **Horden dürfen groß sein und werden dichter, nicht breiter:** Wächst eine Horde,
   rücken die Gegner enger zusammen — dieselbe Regel wie bei der eigenen Truppe
   („dichter, nicht breiter", V1-Plan Abschnitt Truppe). Große Horden sind ausdrücklich
   in Ordnung.

## Boss V2 (entschieden von Thomas am 2026-08-22)

**Der Boss schießt in V2 nicht mehr.** Sein Druck kommt aus zwei Mitteln, die V2 ohnehin
baut: Er **ruft Horden** (nutzt das neue Horden-System) und er **rückt vor**, wenn der
Kampf zu lange dauert (Zeitdruck aus V1.3 bleibt). Die Salvensysteme (`bossBurst.ts`,
Ausweichfenster-Tests) entfallen und werden in W6 entfernt.

**Zweite Entscheidung dazu: Die Boss-Stärke passt sich dem momentanen Spielerstand an.**
Die Lebenspunkte werden nicht mehr allein aus der Levelnummer abgeleitet, sondern beim
Start des Bosskampfs aus der **tatsächlichen Feuerkraft der Truppe** berechnet
(Truppengröße, Schaden, Feuerrate, Waffe — alles Werte, die das Spiel kennt), sodass die
Kampfdauer im Zielfenster 20–40 s landet, egal wie stark oder schwach der Run gerade
ist. Die Levelnummer skaliert stattdessen den Hordendruck (wie oft und wie groß der Boss
Horden ruft). Das behebt zugleich den V1-Befund „zu schwer": Ein schwacher Run bekommt
einen schaffbaren Boss, ein starker Run keinen Spaziergang. Die Herleitung der Formel
gehört als Kommentar in `balance.ts` — gerechnet, nicht geschätzt (Lesson 2026-08-21).

## Etappen (je ein Codex-Task, Claude reviewt, Thomas testet am iPhone)

Reihenfolge-Logik: W1 (Stadtbild + Gegner-Horizont + Minigun-Farbe) ist unabhängig vom
Spuren-Umbau, risikoarm und sofort sichtbar — schneller erster Gewinn. W2–W4 bauen
aufeinander auf (erst Wände, dann Horden, dann die Seiten-Ökonomie, die beides braucht).
W5 (Boss) kommt zuletzt, weil er das Horden-System aus W3 nutzt und seine Balance vom
fertigen Layout abhängt.

| Etappe | Inhalt | Akzeptanz (objektiv prüfbar) |
|---|---|---|
| **W1 — Stadtbild** | Häuserzeilen durchgehend statt Einzeltürme: zusammenhängende Fassaden links/rechts, Lücken **nur** als Querstraßen in geplanten Abständen; **lange Blöcke wie in New York** (Thomas-Korrektur 2026-08-22 nach dem ersten Stand: 4–8 Häuser pro Block war zu oft unterbrochen → 10–16, Werte in `balance.ts`); Kulissen-Pool auf den neuen schlimmsten Fall neu hergeleitet. **Gegner am Horizont wie die Häuser:** volle Figur ab dem Moment, in dem die Unterkante die Linie erreicht, Körper ragt über die Linie — kein Crop, kein Fade. **Kleiner Fix dazu:** Minigun-Projektile bekommen eine besser sichtbare Farbe (heute kaum erkennbar) | Über mehrere Minuten Fahrt existiert keine Lücke zwischen zwei Häusern, die keine Querstraße ist (per Instrumentierung gezählt, nicht per Augenschein — Lesson 2026-08-20); jeder Gegner ist ab Unterkante-auf-der-Linie voll sichtbar und nie vorher (per Regel-Test nachgewiesen); Minigun-Projektile sind vor Straße und Fassade klar erkennbar (Thomas-Urteil); Stadtbild wirkt am iPhone wie eine Stadt mit langen Blöcken (Thomas-Urteil) |
| **W2 — Wände links/rechts** | Mitlaufende zerschießbare Wandsegmente an beiden Straßenrändern mit eigenen Lebenspunkten; Wegschießen gibt eine Belohnung; Berührung einer stehenden Wand kostet Figuren (Regel wie V1-Sperren); Wand-Pool mit Herleitung; ersetzt die V1-Sperren (E9). **Breitenbudget als erstes:** In `balance.ts` wird ein gemeinsames Budget definiert (Wanddicke links + rechts + Mindestkorridor + maximale Hordenbreite ≤ Straßenbreite) und die bestehenden Systeme (`spawnLanes.ts`/`chooseSpawnLane`, `gateLanes.ts`/`getGateLanes`) werden **noch in W2** auf die wandbereinigte Breite umgestellt — nicht erst in W3/W4. Sonst laufen die alten Tore und Spawner zwei live getestete Etappen lang unkoordiniert in die Wandzone. Die „maximale Hordenbreite" ist dabei ein **vorläufiger Platzhalter** (als solcher im Kommentar markiert): Die echte Hordenbreite entsteht erst in W3 — W3 darf Wanddicke und Korridor nachjustieren, ohne dass W2 neu abgenommen werden muss, solange das Budget als Ganzes hält | Kein `create()`/`destroy()` im Hot Path (Review-Checkpunkt); Berührungs- und Abschuss-Logik per Unit-Test ohne Phaser prüfbar; per Test nachgewiesen: kein Gegner-Spawn und keine Torspur liegt im Wandbereich, und das alte Torsystem hält auf der Restbreite weiterhin die 90-px-Mindestbreite je Spur ein; Wände fühlen sich als lohnendes Ziel an, nicht als Deko (Thomas-Urteil am iPhone) |
| **W3 — Horden mittig** | Gegner-Spawner umgebaut: Horden laufen mittig die Straße herunter statt über Spuren verteilt; nutzt die Trupp-Formationen aus E7 (Keil/Reihe/Pulk) als Horden-Bausteine; Leveltabelle steuert Hordengröße und -takt; Gegner-Pool neu hergeleitet. **Dichteregel (Thomas 2026-08-22):** Wächst eine Horde, rücken die Gegner enger zusammen statt breiter zu werden (Regel wie bei der eigenen Truppe); große Horden sind ausdrücklich gewollt und dürfen nicht per Verkleinerung „gelöst" werden — das wäre ein stiller Zieltausch | Horden erscheinen als zusammenhängende Masse in der Mitte (Formations-Tests aus E7 angepasst und grün); **Zentrierung gemessen, nicht behauptet:** der Schwerpunkt-X jeder Horde liegt über ihre gesamte sichtbare Zeit in einem Mittelband der Straße (Bandbreite in `balance.ts`), per Instrumentierung über mehrere Minuten gezählt — „verteilte Trupps wie in V1" sind **kein** zulässiger Ersatz für mittige Horden; die Leveltabelle erzeugt nachweislich unterschiedliche Horden in Level 1, 6, 12; Ausweichen gegen die Horde fühlt sich als Kernbewegung an (Thomas-Urteil am iPhone) |
| **W4 — Seiten-Ökonomie mit Dauerwänden** *(geschärft 2026-08-22 nach Genre-Verifikation durch Thomas)* | **Dauerwände:** je Seite eine lückenlose Kette zerschießbarer Segmente statt Einzelsegmente im Takt. Goodies **unregelmäßig** darin (Chance + Garantie nach `goodieMaxDry` Nieten): **links Verstärkungen** (Truppe; Operator-Anzeige „+4"/„×1.5", zustandsabhängig gezogen, Sofortwirkung beim Freischießen auf den DANN aktuellen Stand — damit veraltet die Anzeige konstruktiv nie, Härtungsbefund erfüllt), **rechts Waffen** (Icon sichtbar, einsammeln nach Freischießen), Rest Münz-Segmente. **Mittel-Tore rechnen nur noch DMG/RATE/SPD** — TEAM kommt von der Wand; Floors > 0 machen „beide Seiten auf 0" konstruktiv unmöglich. **Gamefeel-Korrektur (Thomas 2026-08-22):** Wände als **Abschnitte mit regelmäßigen Lücken** (3 Kacheln Wand, 2 Slots Lücke, Seiten versetzt — nie beide gleichzeitig offen), Kacheln größer und breiter (72 hoch, 0.7 widthShare), Straße oben breiter (topWidthRatio 0.52); **dynamischer Fahrbereich:** neben einer Wand endet der Drag am Korridor, in einer Lücke am Straßenrand, ein ankommender Abschnitt schiebt die Truppe sanft zurück (kein Wandkontakt-Schaden) | Verstärkungs-Angebote sind nachweislich zustandsabhängig (Test: anderer Stand → anderes Angebot) und wachsen immer (Property-Test, inkl. Rundungs-Randfall Truppe 1); Kette nachweislich lückenlos (Ketten-Logik unabhängig vom Zustand älterer Segmente); Goodie-Garantie per Test; Tore bieten kein TEAM mehr an (Test); Pool neu hergeleitet; die Entscheidung „Wand oder Horde" ist spürbar (Thomas-Urteil am iPhone) |
| **W5 — Boss V2** | Boss ohne Schuss (entschieden 2026-08-22): Druck aus gerufenen Horden + Vorrücken bei Zeitüberschreitung. **Lebenspunkte aus dem momentanen Spielerstand:** beim Kampfstart aus der tatsächlichen Feuerkraft der Truppe berechnet (Truppengröße, Schaden, Feuerrate, Waffe), Ziel-Kampfdauer 20–40 s unabhängig vom Run-Stand; die Levelnummer skaliert nur noch den Hordendruck. Formel-Herleitung als Kommentar in `balance.ts`, gerechnet statt geschätzt (Lesson 2026-08-21) | Kampfdauer auf Level 1, 6, 12 **je einmal mit schwachem und mit starkem Run-Stand** im Spiel gemessen (nicht geschätzt), alle sechs Messungen im Zielfenster; Boss feuert nachweislich kein Projektil mehr; Boss nutzt den bestehenden Gegner-Pool für Begleiter ohne `create()` zur Laufzeit; Boss ist fordernd, aber schaffbar (Thomas-Urteil am iPhone — der V1-Befund „zu schwer" ist das Gegenkriterium) |
| **W7 — Plastische Figuren** *(neu 2026-08-22, läuft VOR W6)* | Den optischen Abstand zum 3D-Vorbild schließen, das Thomas als Referenz geschickt hat — mit den Mitteln eines 2D-Motors. Echtes 3D ist ausgeschlossen (Phaser ist ein 2D-Renderer, ein Wechsel wäre ein anderer Motor). Nach Wirkung sortiert und in dieser Reihenfolge: **(a)** beleuchtete statt flacher Sprites für Truppe, alle drei Gegnertypen und Boss — Volumen durch Licht von oben, Schattenseite, Kantenlicht; **(b)** glatte statt harter Pixelkanten: Sprites in doppelter Auflösung, `pixelArt: true` in `main.ts` fällt; **(c)** Bodenschatten sind bereits gebaut und bleiben unverändert. **Codex-Auftrag:** Alle vorhandenen Sprites stammen aus Codex-Läufen, das Verfahren „groß rendern, dann herunterrechnen" ist etabliert, Vorlagen liegen in `assets/probe/` (136x184). Claude schreibt die Spec und reviewt, Codex erzeugt die Bilder. | Jede ersetzte Figur liegt in doppelter Auflösung vor und wird auf die gemessene Spielgröße herunterskaliert (kein Hochskalieren); die gemessenen Körpermaße in `balance.ts` (`bodyWidth`/`bodyHeight`) sind gegen die neuen Bilder nachgemessen, nicht übernommen; `pixelArt: false` verändert nachweislich keine Trefferflächen (Tests grün); ein Kontrollbild zeigt alle Figuren auf Fahrbahn **und** Umgebung — beide Hintergründe müssen tragen (Lesson aus dem Betongrau-Versuch); am iPhone wirken die Figuren plastisch statt flach (Thomas-Urteil, das Referenz-Reel ist der Vergleichsmaßstab) |
| **W6 — V2-Abnahme** | Aufräumen: tote V1-Systeme entfernen (altes Torsystem, Sperren, `bossBurst.ts` samt Ausweichfenster-Tests), Tests nachziehen, README aktualisieren; Netzwerk-Null-Check und Update-Pfad erneut; **kombinierte Volllast-Messung:** alle Systeme gleichzeitig in voller Dichte (durchgehende Häuserzeilen, Wände beidseitig, maximale Horde, Projektile, Boss mit Begleitern) — die Einzeletappen prüfen jedes System nur isoliert, erst hier läuft alles zusammen | Kein toter Code der ersetzten Systeme mehr im Bundle; alle Tests grün inkl. `test:dist`; Volllast-Szenario ruckelt am iPhone nicht (Thomas-Urteil, ergänzt um eine Frame-Messung wie im Projekt etabliert — Playwright + CDP); Abnahme-Checks aus dem README am iPhone bestanden (Thomas) |

## Risiken & Reißleinen

- **Größtes Risiko: Der Umbau macht das Spiel zwischenzeitlich schlechter als V1.**
  Gegenmaßnahme: Etappen so geschnitten, dass `main` nach jeder Etappe spielbar ist;
  Rückschrittspunkt `v1.0`. Fühlt sich das Spiel nach W3 (Horden mittig) schlechter an
  als V1 und bringt ein Balance-Zyklus keine Besserung, wird mit Thomas entschieden, ob
  V2 weitergebaut oder auf `v1.0` zurückgegangen wird — **nicht** still weitergebohrt.
- **Reißleine W1 (Stadtbild-Performance):** Ruckelt die durchgehende Häuserzeile am
  iPhone, wird die Fassaden-Stückelung vergröbert (weniger, breitere Segmente), nicht
  das Stadtbild zurückgebaut. Ein Rückfall auf Einzeltürme ist **kein** zulässiger
  Ersatz — dann Meldung an Thomas statt Ersatzprodukt (Lesson 2026-08-20).
- **Reißleine W2/W4 (Zielkonflikt greift nicht):** Fühlen sich die Wände nach einem
  Balance-Zyklus wie Deko an, liegt es an der Gleichzeitigkeit mit den Horden (wie bei
  den V1-Sperren) — erst die verschärfen, dann über Belohnungshöhe nachdenken.
  **Maximal zwei Zyklen**, danach Meldung an Thomas statt weiterdrehen. **Kein zulässiger
  Ersatz:** Wände trivial schwach machen (ein Schuss reicht) oder die Belohnung ohne
  Wandabschuss ausgeben — beides tauscht still das Ziel (permanenter Zielkonflikt) gegen
  ein Ersatzprodukt (Lesson 2026-08-20).
- **Reißleine W6 (Volllast):** Ruckelt das Volllast-Szenario, wird zuerst die dichteste
  Einzelgröße gesenkt (Hordengröße vor Wandsegment-Zahl vor Fassaden-Stückelung, Werte
  in `balance.ts`), gemessen nach jedem Schritt. Ein stilles Weglassen eines Systems im
  Volllast-Test ist **kein** zulässiger Ersatz für die Messung.
- **Reißleine W3 (Horden-Performance):** Ruckelt eine volle Horde, wird die Hordengröße
  in `balance.ts` gesenkt, nicht die Mechanik zurückgebaut (Regel wie E7). Das ist ein
  **Performance-Notausgang mit Meldung an Thomas** — kleine Horden aus Bequemlichkeit
  oder wegen Balance-Problemen sind dagegen kein zulässiger Weg: Thomas will große,
  dichte Horden (Dichteregel in W3).
- **Reißleine W5 (Boss):** Maximal zwei Balance-Zyklen für die Kampfdauer, danach
  Design-Entscheidung mit Thomas (Regel wie E8).
- **Feature-Deckel V2:** W1–W6 sind der Deckel. Die alten Vormerkungen aus
  `docs/naechste-tasks.md` („Torwahl sichtbar machen" — entfällt mit dem Torsystem;
  „Hintergrund gestalten" — geht in W1 auf; „3D-Schritt 2" — bleibt zurückgestellt)
  kommen nicht zusätzlich dazu.

## Maschinenzeit-Schätzung

W1, W2 und W5 je ca. 30–60 Min Codex-Maschinenzeit plus Review; W3 und W4 eher 60–90 Min
(Spawner- und Ökonomie-Umbau). Dazwischen wartet die Umsetzung auf Thomas' iPhone-Tests
(je ca. 5–10 Min).
