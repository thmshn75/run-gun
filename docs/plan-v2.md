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

## Was V2 ändert (Thomas-Entscheidungen vom 2026-08-21/22)

1. **Spuren-Umbau nach Genre-Vorbild** (Count Masters, Mob Control, Z Escape):
   mitlaufende **zerschießbare Wände links und rechts** mit Belohnung beim Wegschießen,
   **Waffen auf der einen Seite, Upgrades auf der anderen**, **Gegner-Horden in der
   Mitte**. Ersetzt das E10-Spurensystem (mehrspurige Tore) und baut Tore, Sperren und
   Spawner um. Kern-Mehrwert: permanenter Zielkonflikt — zur Wand steuern heißt, nicht
   auf die Horde schießen.
2. **Bosse sind in V1 noch etwas zu schwer.** V2 balanciert sie neu — zusammen mit der
   offenen Grundsatzfrage unten (schießen ja/nein), nicht vorher als Einzelfix.
3. **Häuserschlucht wird eine Stadt:** Häuserzeilen laufen **durchgehend** links und
   rechts, unterbrochen **nur durch Querstraßen** — wie ein Straßenraster, nicht wie
   heute einzelne Türme mit zufälligen Lücken.
4. **Häuser erscheinen oben früher als die Gegner:** Die Kulisse steht bereits, wenn sie
   ins Bild scrollt — sie darf nie auf gleicher Höhe wie ein sichtbarer Gegner
   „aufpoppen". Praktisch: Kulissen-Spawn mit größerem Vorlauf oberhalb des Bildrands
   als der Gegner-Spawn.

## Offene Thomas-Entscheidung: Schießt der Boss in V2 noch?

Thomas' Frage vom 2026-08-22. **Empfehlung: Nein — der Boss schießt in V2 nicht mehr.**
Sein Druck kommt stattdessen aus zwei Mitteln, die V2 ohnehin baut: Er **ruft Horden**
(nutzt das neue Horden-System) und er **rückt vor**, wenn der Kampf zu lange dauert
(Zeitdruck aus V1.3 bleibt). Begründung: Im neuen Layout ist die Kernbewegung das
Ausweichen gegen die Horde in der Mitte plus der Zielkonflikt mit den Wänden — Geschosse
als dritte gleichzeitige Bedrohung machen die schmale Straße unlesbar. Dazu kommt: Die
V1-Schwierigkeit („zu schwer") steckt großteils in den Salven; fällt der Schuss weg, ist
die Bossbalance nur noch Kampfdauer gegen Hordendruck und damit sauber über die
Leveltabelle einstellbar. Ganze Systeme (`bossBurst.ts`, Ausweichfenster-Tests) entfallen.
**Bis Thomas entscheidet, wird Etappe W5 nicht spezifiziert.** Entscheidet er „schießt
weiter", bleibt die Salvenmechanik und wird nur entschärft — dann ist die Empfehlung
hinfällig und W5 wird als reine Balance-Etappe aufgesetzt.

## Etappen (je ein Codex-Task, Claude reviewt, Thomas testet am iPhone)

Reihenfolge-Logik: W1 (Stadtbild) ist unabhängig vom Spuren-Umbau, risikoarm und sofort
sichtbar — schneller erster Gewinn. W2–W4 bauen aufeinander auf (erst Wände, dann Horden,
dann die Seiten-Ökonomie, die beides braucht). W5 (Boss) kommt zuletzt, weil er das
Horden-System aus W3 nutzt und seine Balance vom fertigen Layout abhängt.

| Etappe | Inhalt | Akzeptanz (objektiv prüfbar) |
|---|---|---|
| **W1 — Stadtbild** | Häuserzeilen durchgehend statt Einzeltürme: zusammenhängende Fassaden links/rechts, Lücken **nur** als Querstraßen in geplanten Abständen (Werte in `balance.ts`); Kulissen-Spawn-Vorlauf oberhalb des Bildrands größer als der Gegner-Spawn-Vorlauf; Kulissen-Pool auf den neuen schlimmsten Fall neu hergeleitet | Über mehrere Minuten Fahrt existiert keine Lücke zwischen zwei Häusern, die keine Querstraße ist (per Instrumentierung gezählt, nicht per Augenschein — Lesson 2026-08-20); kein Kulissenobjekt wird jemals unterhalb der Gegner-Spawnhöhe erstmals sichtbar (gemessen); Stadtbild wirkt am iPhone wie eine Stadt (Thomas-Urteil) |
| **W2 — Wände links/rechts** | Mitlaufende zerschießbare Wandsegmente an beiden Straßenrändern mit eigenen Lebenspunkten; Wegschießen gibt eine Belohnung; Berührung einer stehenden Wand kostet Figuren (Regel wie V1-Sperren); Wand-Pool mit Herleitung; ersetzt die V1-Sperren (E9). **Breitenbudget als erstes:** In `balance.ts` wird ein gemeinsames Budget definiert (Wanddicke links + rechts + Mindestkorridor + maximale Hordenbreite ≤ Straßenbreite) und die bestehenden Systeme (`spawnLanes.ts`/`chooseSpawnLane`, `gateLanes.ts`/`getGateLanes`) werden **noch in W2** auf die wandbereinigte Breite umgestellt — nicht erst in W3/W4. Sonst laufen die alten Tore und Spawner zwei live getestete Etappen lang unkoordiniert in die Wandzone. Die „maximale Hordenbreite" ist dabei ein **vorläufiger Platzhalter** (als solcher im Kommentar markiert): Die echte Hordenbreite entsteht erst in W3 — W3 darf Wanddicke und Korridor nachjustieren, ohne dass W2 neu abgenommen werden muss, solange das Budget als Ganzes hält | Kein `create()`/`destroy()` im Hot Path (Review-Checkpunkt); Berührungs- und Abschuss-Logik per Unit-Test ohne Phaser prüfbar; per Test nachgewiesen: kein Gegner-Spawn und keine Torspur liegt im Wandbereich, und das alte Torsystem hält auf der Restbreite weiterhin die 90-px-Mindestbreite je Spur ein; Wände fühlen sich als lohnendes Ziel an, nicht als Deko (Thomas-Urteil am iPhone) |
| **W3 — Horden mittig** | Gegner-Spawner umgebaut: Horden laufen mittig die Straße herunter statt über Spuren verteilt; nutzt die Trupp-Formationen aus E7 (Keil/Reihe/Pulk) als Horden-Bausteine; Leveltabelle steuert Hordengröße und -takt; Gegner-Pool neu hergeleitet | Horden erscheinen als zusammenhängende Masse in der Mitte (Formations-Tests aus E7 angepasst und grün); **Zentrierung gemessen, nicht behauptet:** der Schwerpunkt-X jeder Horde liegt über ihre gesamte sichtbare Zeit in einem Mittelband der Straße (Bandbreite in `balance.ts`), per Instrumentierung über mehrere Minuten gezählt — „verteilte Trupps wie in V1" sind **kein** zulässiger Ersatz für mittige Horden; die Leveltabelle erzeugt nachweislich unterschiedliche Horden in Level 1, 6, 12; Ausweichen gegen die Horde fühlt sich als Kernbewegung an (Thomas-Urteil am iPhone) |
| **W4 — Seiten-Ökonomie** | Waffen auf der einen, Upgrades auf der anderen Straßenseite — als Belohnung hinter/in den Wandsegmenten aus W2; ersetzt die V1-Tore (E3/E10-Torsystem). Die Prinzipien der Tor-Mathematik bleiben: zustandsabhängig gezogene Werte (kein auswendig lernbarer Reflex), neutrale Farbe, nie eine Wahl, die zwingend auf 0 Figuren führt. **Der Wert steht sichtbar auf der Wand, bevor geschossen wird** — die Kernspannung ist das Abwägen *vor* der Entscheidung; eine Belohnung, die erst nach dem Zerschießen sichtbar wird (wie bei den V1-Sperren in `blockers.ts`), ist für die Upgrade-Seite **kein** zulässiger Ersatz. **Und der Wert bleibt aktuell:** Anders als die V1-Tore (Wert beim Spawn eingefroren, Laufzeit ~1,4 s) sind Wandsegmente länger und mehrfach gleichzeitig sichtbar — der angezeigte Wert wird deshalb fortlaufend (mindestens: unmittelbar vor der Kollision) aus dem aktuellen Stand neu berechnet, nicht einmalig beim Sichtbarwerden | Upgrade-Werte sind nachweislich relativ zum aktuellen Stand gezogen (dieselbe Stelle liefert bei anderem Stand einen anderen Wert); der Wert ist vor dem ersten Treffer auf die Wand lesbar (im Test nachgewiesen: Beschriftung existiert ab Sichtbarwerden des Segments); ein Test simuliert eine Standänderung *während* ein Segment sichtbar ist und weist nach, dass der angezeigte Wert danach noch stimmt; es existiert nie eine Situation ohne gefahrlosen Weg (Test); die Entscheidung „Wand oder Horde" ist spürbar (Thomas-Urteil am iPhone) |
| **W5 — Boss V2** | Je nach Thomas' Entscheidung oben: Boss ohne Schuss (Druck aus gerufenen Horden + Vorrücken) **oder** entschärfte Salven; in beiden Fällen Kampfdauer-Ziel 20–40 s je Level, Werte aus `balance.ts` gerechnet, nicht geschätzt (Lesson 2026-08-21) | Kampfdauer auf Level 1, 6, 12 im Spiel gemessen (nicht geschätzt) innerhalb des Zielfensters; Boss nutzt den bestehenden Gegner-Pool für Begleiter ohne `create()` zur Laufzeit; Boss ist fordernd, aber schaffbar (Thomas-Urteil am iPhone — der V1-Befund „zu schwer" ist das Gegenkriterium) |
| **W6 — V2-Abnahme** | Aufräumen: tote V1-Systeme entfernen (altes Torsystem, Sperren, ggf. `bossBurst.ts`), Tests nachziehen, README aktualisieren; Netzwerk-Null-Check und Update-Pfad erneut; **kombinierte Volllast-Messung:** alle Systeme gleichzeitig in voller Dichte (durchgehende Häuserzeilen, Wände beidseitig, maximale Horde, Projektile, Boss mit Begleitern) — die Einzeletappen prüfen jedes System nur isoliert, erst hier läuft alles zusammen | Kein toter Code der ersetzten Systeme mehr im Bundle; alle Tests grün inkl. `test:dist`; Volllast-Szenario ruckelt am iPhone nicht (Thomas-Urteil, ergänzt um eine Frame-Messung wie im Projekt etabliert — Playwright + CDP); Abnahme-Checks aus dem README am iPhone bestanden (Thomas) |

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
  in `balance.ts` gesenkt, nicht die Mechanik zurückgebaut (Regel wie E7).
- **Reißleine W5 (Boss):** Maximal zwei Balance-Zyklen für die Kampfdauer, danach
  Design-Entscheidung mit Thomas (Regel wie E8).
- **Feature-Deckel V2:** W1–W6 sind der Deckel. Die alten Vormerkungen aus
  `docs/naechste-tasks.md` („Torwahl sichtbar machen" — entfällt mit dem Torsystem;
  „Hintergrund gestalten" — geht in W1 auf; „3D-Schritt 2" — bleibt zurückgestellt)
  kommen nicht zusätzlich dazu.

## Maschinenzeit-Schätzung

W1 und W2 je ca. 30–60 Min Codex-Maschinenzeit plus Review; W3 und W4 eher 60–90 Min
(Spawner- und Ökonomie-Umbau). W5 bleibt offen, bis Thomas die Boss-Frage entschieden
hat — vorher gibt es keine Spec und keine belastbare Zahl. Dazwischen wartet die
Umsetzung auf Thomas' iPhone-Tests (je ca. 5–10 Min).
