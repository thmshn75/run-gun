# Active Task

## Status
`IDLE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

`IDLE` — V3 ist vollständig gebaut. Alles wartet auf Thomas' iPhone-Test.

---

## Abgeschlossen

### Speicherpunkte nachgebessert + B7 Ton (2026-08-24)

**Thomas' Befund zum Speichern war richtig und der Fehler größer als gedacht:**
`sichereRun()` lief nur in `startLevel()` — und das wird beim **ersten** Level gar nicht
aufgerufen. Wer Level 1 spielte und aufhörte, hatte keinen Punkt zum Fortsetzen; wer im
Shop aufhörte, verlor das gerade geschaffte Level.

Jetzt wird an **drei** Stellen gesichert: beim Start eines frischen Runs, **beim Betreten
des Shops** (dort ist das Level bereits hochgezählt — das geschaffte Level ist in dem
Moment gesichert, in dem es geschafft ist) und beim Start des nächsten Levels. Dazu ein
Knopf **„SPEICHERN & BEENDEN"** im Shop, der ins Menü zurückführt: Der Stand liegt dort
ohnehin schon im Spielstand, aber ohne den Knopf müsste man die App wegwischen und wüsste
nie, ob gespeichert wurde.

**Belegt im laufenden Spiel:**

| Schritt | Gesicherter Stand |
|---|---|
| frischer Run gestartet | Level 1 — vorher **gar nichts** |
| Level geschafft, im Shop, **ohne WEITER** | Level 4 mit Truppe und Waffe |
| SPEICHERN & BEENDEN | Menü offen, Stand erhalten |

**B7 Ton:** Schuss und Sterbeton auf 0 (Erzeugungscode bleibt, Rückweg ist eine Zahl),
seltene Quittungen bleiben hörbar, dazu synthetische Hintergrundmusik — vier Akkorde à
sechs Sekunden, ineinander übergehend. Am Pegelmesser 0,0745 gegen eingestellte 0,075.


### B5 + B4 + B6 — Zombie-Varianten, Granatwerfer, Waffenstaffelung (2026-08-23)

**Bilder von Codex** (`docs/bildauftrag-v3.md`), selbst nachgeprüft statt dem Bericht
geglaubt: Alle 9 Zombie-Varianten haben **exakt** die Maße ihrer Vorlage und einen
**pixelgenau identischen Alpha-Kanal**; Granatwerfer-Tor und -HUD haben exakt die Maße der
Rakete. Optisch geprüft: Kleidung gefärbt, Haut, Gesicht und Knochen unverändert.

**B5 — Farbvarianten gestaffelt** (`enemy.variantUnlockLevels` 1/3/6/9). Im Spiel
gemessen, welche Texturen tatsächlich vorkommen:

| Level | Varianten im Bild |
|---|---|
| 1 | 1 |
| 3 | 2 |
| 6 | 3 |
| 9 | 4 |

**Der im Plan geforderte Atlas ist NICHT gebaut** — die Sorge hat sich in der Messung
nicht bestätigt: Volllast (Level 12, Truppe 100, Schrotflinte) mit **12 gleichzeitigen
Gegnertexturen statt 3** ergibt 60 fps, schlimmstes Bild 19 ms, kein Bild über 33 ms.
Identisch zum Stand davor.

**B4 — Granatwerfer** als achte Waffe. Startwerte ins Stärkeband gerechnet, dann gemessen
(Level 8, gleiche Bedingungen, Tötungen je Sekunde):

| Waffe | Tötungen/s | Verhältnis | mittlere Todeshöhe |
|---|---|---|---|
| Standard | 11,13 | 1,00× | 476 px |
| Rakete | 9,87 | 0,89× | 320 px |
| **Granatwerfer** | **13,47** | **1,21×** | **276 px** |

1,21× liegt im Band (1,15–1,27). **Die Todeshöhe ist die knappe Größe:** 276 px gegen das
Messkriterium von 250 px. Der Granatwerfer tötet damit am weitesten entfernt von allen
Waffen — gewollt („erreicht den ganzen Bildschirm"), aber ohne Reserve. Steigt die
Reichweite später, sterben die Gegner am Horizont und kommen nie an; `engageShare` (0,95)
ist dann die Stellschraube.

**B6 — Waffenstaffelung** über die Level 1–7. **Keine Stärke geändert** — „bessere Waffen"
gibt es nicht, alle acht liegen im selben Band. Gestaffelt ist die Freischaltung,
gesteigert die Auffälligkeit: schlicht → Durchschlag → Sprengwirkung → Dauerfeuer →
Fächer → Kette → großer Sprengradius.

**Offen für den iPhone-Test:** Auf Level 1 gibt es damit nur **eine** Toralternative zur
Startwaffe — das Tor zeigt dort immer dasselbe. Für das Lernlevel vertretbar, aber Thomas
sollte es sich ansehen; notfalls geht LASER auf `minLevel` 1 zurück.


### B3 — Weiterspielen + Fortsetzen (2026-08-23), iPhone-Urteil offen

**Beides nutzt denselben Wiedereinstieg** — deshalb war das Fortsetzen kaum Zusatzarbeit.

**Gespeichert wird an der Levelgrenze, sonst nirgends** (`save.RunSnapshot`): Level,
Truppe, Schaden, Rate, Waffe, gekaufte Stufen, Run-Münzen, gebuchte Münzen, verbrauchte
Weiterspielen. Mitten im Level zu sichern hieße, Gegner im Anflug, Wandkette und Bossphase
mitzuschreiben.

**Missbrauch verhindert:** Der Fortsetzen-Punkt wird beim Game Over durch den
Weiterspiel-Punkt **ersetzt**. Wer stirbt, kommt nicht mehr kostenlos aus dem Menü hinein,
sondern zahlt — sonst wäre Weiterspielen durch App-Schließen umsonst zu haben.

**Preis:** 250 × erreichtes Level, verdoppelt sich je weiterem Mal, höchstens zwei je Run.
Truppe startet bei der Hälfte des Deckels.

**Belegt im laufenden Spiel:**

| Schritt | Ergebnis |
|---|---|
| Levelgrenze | gesichert: Level 7, hp 49, Laser, Stufen 1/1, 1.200 Münzen |
| Fortsetzen | **alles wiederhergestellt** (Level 7, hp 49, Laser, Stufen 1/1, 1.200) |
| Game Over auf Level 7 | Preis **1.750** = 250 × 7 |
| Weiterspielen gekauft | Level 7, hp **31** (halber Deckel 62), Stufen bleiben, Konto 7.200 → 5.450 |

**Ein Fehler beim Bauen:** Der Aufruf, der den Spielstand anwendet, landete versehentlich
in `equipWeapon` statt am Ende von `create()` — das Fortsetzen startete stumm auf Level 1.
Erst die Browser-Prüfung hat es gezeigt; die Testsuite war grün. Jetzt steht er ganz am
Ende von `create()`, mit Kommentar warum.

**Rückwärtskompatibel und per Test gesichert:** Ein Spielstand aus der Zeit vor B3 lädt
weiter, ein unvollständiger Run wird stillschweigend verworfen statt den ganzen Spielstand
zu verwerfen (dieselbe Falle wie beim entfernten `upgrades`-Feld).

**Offen:** Thomas' iPhone-Test.


### B2 — Shop nach jedem Level (2026-08-23), iPhone-Urteil offen

**Vorarbeit: Münz-Einnahme gemessen** (Browser, Truppe 40 mittig, Deckelwerte, je 40 s):

| Level | gedroppt | eingesammelt | Quote | Münzen/s |
|---|---|---|---|---|
| 1 | 186 | 182 | 97,8 % | 4,55 |
| 4 | 276 | 270 | 97,8 % | 6,75 |
| 8 | 402 | 403 | 100,2 % | 10,07 |
| 12 | 542 | 532 | 98,2 % | 13,30 |

**Die Planannahme von 80 % Einsammelquote war zu pessimistisch** — der Magnet holt
praktisch alles. Einnahme je Level daraus: 423 (L1) bis 1.362 (L12), **10.454 je vollem
Run** statt geschätzter 9.650. Preise = 37,5 % der Levelseinnahme, also 160 bis 470.

**Zwei Fehler, die erst der Test bzw. die Rundung gefangen haben:**
1. **Der Bonus wirkt quadratisch.** Der Plan sah 3 % je Stufe auf Schaden *und* Feuerrate
   vor — Feuerkraft ist deren **Produkt**, also 1,03^11 × 1,03^11 = **+92 %** statt der
   gewollten +38 %. Ein Test hält die Obergrenze jetzt fest.
2. **Gleichmäßig verteilt bewegt sich die Anzeige nicht.** Mit 1,5 % auf beide Werte
   stimmt die Summe, aber der Schaden wird auf eine Nachkommastelle gerundet — der Knopf
   sah für ein Kind kaputt aus. Jetzt 2,5 % auf Schaden, 0,5 % auf Rate: zusammen +39 %,
   und die Zahl bewegt sich spätestens bei jedem zweiten Kauf.

**Gebaut:** `BALANCE.shop` (Preise, Bonushöhen, UI-Maße), `BALANCE.continueRun` (für B3),
`upgrades.ts` mit Stufen und Bonus obendrauf, `systems/shopOverlay.ts` (zwei große Knöpfe,
Kontostand, WEITER), Levelphase `'shop'` in `GameScene`, Münzbuchung aufs Konto beim
Levelende, `tests/shop.test.ts` (11 Fälle).

**Belegt im laufenden Spiel:** Kauf zieht 160 vom Konto (1234 → 1074), Stufe steigt auf
1/11, zweiter Klick auf denselben Knopf bleibt wirkungslos (Ein-Stufe-Regel), zweiter
Knopf zieht erneut 160 (→ 914). Layout zweimal am Screenshot korrigiert: Überschrift lag
auf dem HUD, Hintergrund war zu durchsichtig.

**Unverändert und per Test gesichert:** Wer nichts kauft, spielt exakt das bisherige Spiel.
Boss- und Wandhärte hängen weiter an der Levelnummer, nicht am Kaufverhalten.

**Offen:** Thomas' iPhone-Test — ist das Overlay mit dem Daumen bedienbar, sind die
Preise für Benni fair?


### B1 — Startruckeln (2026-08-23) — Ursache gefunden und behoben, iPhone-Urteil offen

**Bennis Meldung:** „Gleich am Anfang wenn man startet, ruckelt es ein paar Sekunden" —
und auf Nachfrage: „wenn das Spiel losläuft, aber nicht immer."

**Reproduziert.** Auf ungedrosselter CPU ist nichts messbar. Bei **zweifach gedrosselter
CPU** zeigte sich Bennis Muster exakt: 0–2 s nach dem Start 3 Bilder über 33 ms
(schlimmstes 67 ms), danach glatte 60 fps ohne einen einzigen Ausreißer. Über fünf
Spielstarts nacheinander: 2 / 1 / 0 / 0 / 0 Aussetzer — nur die ersten Starts, danach
nie. (Sechsfache Drosselung ist als Messmittel unbrauchbar: Dort läuft das Spiel
durchgehend mit 4 fps, das Muster verschwindet im Rauschen.)

**Zwei Fehlschläge vor dem Treffer — beide in `lessons.md`:**
1. Aus „nur die ersten Starts" wurde vorschnell **Textur-Upload** geschlossen und ein
   Aufwärm-Durchlauf gebaut. Gegenprobe **negativ**, erster Lauf sogar schlechter.
   Zurückgenommen. Dasselbe Muster passt genauso auf JIT-Kompilierung.
2. Die ganze Verdächtigenliste (Service Worker, Texturen, Pool-Erzeugung,
   Speicherbereinigung) war aus dem eigenen Code hergeleitet — die Ursache stand in
   keiner davon.

**Die Ursache, per Chrome-Profil gefunden:** Phasers Kollisions-Suchbaum. Er wird jedes
Bild über alle Körper neu aufgebaut; das lohnt sich, wenn die meisten stillstehen — hier
bewegt sich fast alles. Anteile an der aktiven Rechenzeit vor der Umstellung:
`contains` 31 %, alle Baumfunktionen zusammen (`contains`, `search`, `toBBox`,
`intersects`, `_all`) rund **48 %**.

**Gebaut, beides belegt:**
- `physics.arcade.useTree: false` in `main.ts`.
- `walls.ts`: Die sieben linearen Suchen über den Wandpool (`pairs.some/find`) laufen
  jetzt über zwei Nachschlagtabellen. Sie waren im Profil mit 85 ms von 1.185 ms (7 %)
  sichtbar, weil sie bei **jeder** Kollisionsmeldung 32 Vergleiche machten.

**Messwerte (2× gedrosselte CPU, aktive Rechenzeit):**

| Szenario | vorher | nachher |
|---|---|---|
| Spielstart, je 2 s | 1.185 ms | **541 ms** (−54 %) |
| Volllast, je 5 s (Level 12, Truppe 100, Schrotflinte) | 478 ms | **318 ms** (−33 %) |
| `walls.ts`-Anteil | 85 ms (7 %) | 10 ms (1 %) |

**Wirkung auf das gemeldete Ruckeln** (fünf Starts, Bilder über 33 ms in den ersten 3 s):

| | Lauf 1 | 2 | 3 | 4 | 5 | schlimmstes Bild |
|---|---|---|---|---|---|---|
| vorher | 2 | 1 | 0 | 0 | 0 | 65 ms |
| **nachher** | **0** | **0** | **0** | **0** | **0** | **19 ms** |

**Gegenprobe unter Volllast bestanden:** Ohne Suchbaum wächst der Aufwand quadratisch mit
der Körperzahl — deshalb gegengeprüft statt angenommen. Auch bei Level 12 mit Truppe 100
und Schrotflinte ist die Variante ohne Baum günstiger (318 gegen 478 ms). Steigt die
Gegnermenge später deutlich, ist hier neu zu messen; der Hinweis steht im Code.

**Offen:** Bestätigung durch Benni am iPhone. Die Kollisionsergebnisse ändern sich nicht —
es ist nur die Vorauswahl, welche Paare geprüft werden —, aber Gamefeel gilt erst nach
dem Gerätetest.


### B0 — Sammelbahn (2026-08-23, von Thomas am iPhone abgenommen: „Ok passt am Handy")

Commit `78b07b4`. Ursache waren zwei Fehler in derselben Zeile, beide im laufenden Spiel
gemessen:

1. **Die Prüfung las eine Position, die der Truppe nicht folgt.**
   `crowdStehtInSammelbahn` rechnete aus `crowd.getHullBounds().getBounds()`. Gemessen bei
   Anker 90 / 150 / 250: Der **Physics-Body** folgte korrekt (49 / 109 / 209), die
   **GameObject-Position derselben Zone** stand konstant bei **−15**. Das erklärt Bennis
   „ist aber nicht immer so".
2. **Die Y-Achse wurde nicht geprüft.** Eine Kachel bei `y 609..677` löste voll ein,
   während die Hülle bei `y 677..751` stand.

Beide Vermutungen von Thomas sind am Code widerlegt: Die Hülle ist fest (Teamzahl scheidet
aus), `getWallGeometry` kennt die Levelnummer nicht (Level scheidet aus). Auch die beiden
Vorab-Hypothesen (wandernde Quittung, zu breite Kollisionskörper) sind widerlegt.

Gebaut: Hülle wird aus Anker + Hüllenmaßen gerechnet, beide Achsen geprüft, neu
`walls.pickupOverlapHeightFigures` 0,5 und `walls.drainOverlapFigures` 1,6 (aus der
**Fahrgrenze** hergeleitet — ein erster Versuch mit 2,2 war im Test grün und machte rote
Kacheln im Spiel unerreichbar), `walls.isDrainSegment`, `tests/sammelbahn.test.ts`.

Beleg (Level 11, je 6 s je Ankerposition, +1 / −3): 61 → 4/1 · 70 → 10/0 · 78 → 12/0 ·
86, 95, 130, 160 → 0/0 · **229 (Screenshot-Position) → 0/0**.

**Offen und bewusst nicht behoben:** Warum die GameObject-Position der Hülle bei −15
klebt, ist nicht geklärt — der Fix umgeht es strukturell, und es war die einzige Stelle,
die sie las. **Rote Kacheln sind seltener geworden**, die linke Bahn ist netto großzügiger
als vor dem 2026-08-23; Stellschraube ist `drainOverlapFigures`.

---

## Archiv

**W6 — V2-Abnahme: abgeschlossen**
(2026-08-23, Claude direkt. Thomas: "Dann nimm als abgenommen hin und mach 1 und 3
fertig" — W7 und alle Korrekturen des Tages gelten damit ohne iPhone-Test als abgenommen.)

**(1) Toter Code raus.** Systematisch gesucht statt vermutet: alle Dateien ohne Import,
alle Exports ohne Referenz, alle `BALANCE`-Schluessel ohne Leser.
- **Gefunden und entfernt:** `menu.topPadding` / `titleY` / `balanceY` / `rowHeight` /
  `rowGap` (Reste des am selben Tag entfallenen Upgrade-Shops), `hud.statFontPx`,
  `gamefeel.popMs`, `boss.hordePressure.damagePerLevel` / `ratePerLevel`, `crowd.start`
  (nannte 3, waehrend der echte Startwert in `stats.hp.base` steht) und das nie
  abonnierte Abo-System in `storagePersistence.ts`.
- **Geprueft und BEHALTEN:** `scenerySimulation.ts` wird nur von einem Test importiert -
  das ist Absicht (Herleitung der Poolgroesse), kein toter Code. `bossBurst.ts` war
  bereits entfernt; ein Test wacht darueber, dass keine Spur zurueckkehrt.

**(2) `blockers` heisst jetzt `walls`.** Der Name stammte aus V1, als hier noch die quer
stehenden Sperren geregelt wurden; seit W2 sind es die Waende links und rechts.
`blockers.ts` → `walls.ts`, `blockerPlan.ts` → `wallPlan.ts`, `tests/blockers.test.ts` →
`tests/walls.test.ts`, alle Bezeichner mit. **Dabei aufgefallen:** Die Balance-Sektion
`blockers` konnte nicht einfach `walls` heissen - der Name war fuer Geometrie und Inhalt
der Waende schon vergeben. Sie heisst jetzt `wallHardness`, was praeziser ist als beide.

**(3) Netzwerk-Null-Check — bestanden, am gebauten Stand gemessen.**
Alle 46 Ladevorgaenge gehen an den eigenen Server oder sind lokal erzeugte
`blob:`-Texturen; **kein einziger externer Aufruf**. Waehrend 12 Sekunden Spiel:
**0 Requests**.

**(4) Offline-Start — bestanden.** Der Preview-Server wurde GESTOPPT und die Seite neu
geladen: Die App startet vollstaendig aus dem Service-Worker-Cache (28 Eintraege),
Canvas 390x844, 21 Bilder, 25 Ressourcen mit `transferSize` 0.

**(5) Update-Pfad geprueft.** `registerType: 'autoUpdate'` mit `skipWaiting` und
`clientsClaim`. Der Ablauf in `src/main.ts` ist bewusst gebaut: Ein Update laedt die
Seite **nicht mitten im Spiel** neu, sondern merkt sich den Wechsel (`pendingReload`) und
fuehrt ihn erst beim naechsten Sichtbarwerden aus. Beim ersten Start (noch kein
Controller) passiert gar nichts.

**(6) Volllast-Messung.** Szenario: Level 12, Truppe 100, Deckelwerte, **Schrotflinte**
(sieben Kugeln je Schuss, also die meisten Projektile), Boss aktiv mit Begleitern, Waende
beidseitig, durchgehende Haeuserzeilen. 12 s Einschwingen, dann 900 Bilder gemessen:

| Groesse | Wert |
|---|---|
| Rechenzeit je Bild, Median | **0,30 ms** |
| 95. Perzentil | 0,50 ms |
| schlechtester Fall | 0,70 ms |
| Budget fuer 60 Bilder/s | 16,67 ms |
| **Auslastung** | **3 %** |
| Gegner gleichzeitig | 68 |
| sichtbare Objekte | 311 (von 1.939 im Pool) |
| gemessene Bildrate | 60,3/s |

**Einschraenkung, die im README steht:** Gemessen ist die Rechenzeit der Spiellogik, nicht
das Zeichnen. Am iPhone kann die Grafik der Engpass sein - deshalb bleibt der
iPhone-Check im README als vierter Punkt stehen, obwohl Thomas V2 abgenommen hat.

**(7) README neu geschrieben.** Es stand noch auf V1-Stand (Abnahme-Checks "E6"). Jetzt:
was das Spiel ist und wie es sich spielt (die drei Zonen links/Mitte/rechts), die
Befehle inkl. `test:dist`, eine Tabelle "wo was steht", die Grundregel "nie eine Groesse
raten, die das Spiel messen kann", und die vier Abnahme-Checks mit den oben gemessenen
Werten.

**(8) Favicon.** Der Browser fragte `/favicon.ico` an der Wurzel an und bekam einen 404 -
das Spiel liegt unter `/run-gun/`. `index.html` verweist jetzt auf das vorhandene
PWA-Icon, statt eine zweite Datei zu pflegen.

**Nachweise:** 178 Tests gruen, `npm run check` sauber, `npm run test:dist` gruen
(Build + Tests), Messungen wie oben.

---

**Starttruppe 1, und Kaempfen am linken Rand kostet kein Team mehr**
(2026-08-23, Claude direkt. Thomas: "Starttruppe auf 1 reduzieren und wenn ich voll bin
mit 30 Mann dann streife ich links die Waende beim Abschuessen der mobs - da verliere ich
immer Team".)

**Teil 1 - Starttruppe `stats.hp.base` 2 -> 1.**
Belegt, dass beides funktioniert: Wer sofort zur Sammelbahn faehrt, waechst
1 -> 3 -> 12 -> 21 -> 30 in 20 s. Wer mittig stehen bleibt, ist nach 8 s vorbei - der
erste Gegnertreffer beendet den Run. Das ist ein harter, aber lehrreicher Einstieg
("fahr los und sammle"), und auf Level 1 gibt es weder rote Kacheln
(`walls.badMinLevel` 2) noch Durchbruchschaden (`enemy.breakthroughMinLevel` 2).

**Teil 2 - der eigentliche Befund, gemessen** (Level 6, Truppe 30, feste Position, 15 s):

| Anker links der Mitte | gute Plaettchen | rote | netto |
|---|---|---|---|
| 0 bis −60 px | 0 | 0 | 0 |
| −80 px | 16 | 7 | **−19** |
| −152 px (ganz aussen) | 17 | 6 | −13 |

Zwei Fehler auf einmal:
1. **Die Sammelzone schaltete schlagartig.** Bis 60 px links der Mitte passierte nichts,
   ab 80 px wurde alles eingeloest - es gab keinen Streifen, in dem man am Rand kaempfen
   kann. Seit die Feuerlinie schmaler ist und Gegner ueber die ganze Strasse anlaufen
   (beides am selben Tag gebaut), MUSS man dort kaempfen. Ausloeser war eine blosse
   Beruehrung der Truppenhuelle, und die ist 82 px breit bei 155 px freiem Korridor.
2. **Dauerfahrt an der Bahn war netto NEGATIV** - rund 1,3 Figuren je Sekunde MINUS,
   waehrend die Bahn die Quelle fuer Masse sein soll. Die Herleitung dahinter ("netto −2
   je vier Kacheln") stimmte rechnerisch, setzte aber voraus, dass man den roten Kacheln
   ausweichen kann. Bei durchgehender Bahn, gleichzeitigem Kampf und einer roten alle
   2,1 s ist das nicht spielbar.

**Gebaut:**
- **`walls.pickupOverlapFigures` 1,2** - die Truppe muss zur HAELFTE in der Bahn stehen
  (1,2 von 2,4 Figurenbreiten Huelle), statt sie nur zu beruehren. Bewusst als
  Ueberlappung formuliert und nicht als Ankerposition: So gilt die Regel unabhaengig von
  Bildschirmbreite und Perspektive.
- **`walls.drainTeam` 5 -> 3.** Damit ist blindes Durchfahren netto Null statt stark
  negativ. Die Regel dreht sich von "wer nicht aufpasst, verliert" zu **"wer nicht
  aufpasst, kommt nicht voran"** - der Anreiz liegt im Ausweichen (+1 je Kachel), nicht
  in der Strafe.

**Ergebnis, gemessen** (gleicher Aufbau):

| Anker links der Mitte | gute | rote | netto |
|---|---|---|---|
| 0 bis −100 px | 0 | 0 | 0 |
| −120 px | 15 | 8 | −9 |
| −152 px | 19 | 4 | +7 |

Der Kampfstreifen reicht jetzt bis −100 px statt bis −60 px. Zur Kontrolle nachgerechnet:
Bei Anker −60 deckt die Formation (±39 px) den Bereich −99 bis −21 ab, der aeusserste
anlaufende Gegner steht bei −77 px - man erreicht ihn also, ohne die Bahn zu beruehren.
Die beiden Sammelwerte streuen um netto Null (roter Anteil 4 bzw. 8 statt der erwarteten
6), was der Erwartung entspricht.

**Zwei bestehende Tests umgeschrieben**, weil sie die alte Absicht festhielten
("der Abzug muss STAERKER sein als der Zugewinn"). Sie pruefen jetzt die neue: Blindes
Durchfahren darf nicht belohnen. Dazu ein neuer Test fuer die Sammeltiefe.

178 Tests gruen, `npm run check` sauber.
**Offen: Thomas' iPhone-Urteil.**

**Truppengroesse waechst jetzt auch mit dem Level**
(2026-08-23, Claude direkt. Thomas: "Aber ich selbst werde ja nie staerker in den Leveln
oder schon? Bzw das Maximum an Team koennte man von Level zu Level anheben oder nicht?",
danach: "Wir koennen auf Level 1 auch mit weniger starten".)

**Thomas hatte recht, und es war ein Versehen.** Von den vier Groessen, die der Spieler
ausbaut, war die Truppengroesse als EINZIGE ueber alle zwoelf Level fest (60/60):

| Groesse | Level 1 | Level 12 | Faktor |
|---|---|---|---|
| Schaden | 1,5 | 7 | 4,7x |
| Feuerrate | 3,5 | 8 | 2,3x |
| Truppenbonus | 1,5 | 4 | 2,7x |
| **Truppengroesse** | **60** | **60** | **1,0x** |

Die Struktur (`capAtLevelOne` / `capAtLevelTwelve`) stand schon da, nur die Zahl war beim
Umbau am selben Tag nicht mitgezogen worden.

**Gesetzt: 30 auf Level 1, 100 auf Level 12** (exponentiell interpoliert wie die anderen
Deckel; Faktor 3,3 und damit in derselben Groessenordnung).
- **Level 1 = 30 = `crowd.max`, also KEINE Reserve.** Was im Bild steht, ist alles, was
  man hat - die klarste denkbare Regel fuer das erste Level. Dort gibt es ohnehin noch
  keinen Durchbruchschaden (`breakthroughMinLevel` 2). Das ist Thomas' Ergaenzung
  ("koennen auf Level 1 auch mit weniger starten") und macht die Kurve erst spuerbar:
  Ohne sie waere der Zuwachs nur 60 → 100 gewesen.
- **Level 12 = 100 = 30 sichtbar + 70 Reserve**, aus dem gemessenen Verlust hergeleitet:
  Am Level-12-Deckel kostet Dauerbeschuss 0,375 Figuren/s (Truppe 60 → 54 in 16 s), 70
  Reserve tragen davon 187 s. Im schlechtesten gemessenen Fall (Level 5, halb ausgebaut,
  ohne Sammeln: 1,0 Figuren/s) sind es 70 s, also knapp ein Level. Genau das soll eine
  Reserve leisten - einen schlechten Abschnitt ueberstehen, keinen ganzen Run.

**Wichtig geprueft: Es entsteht daraus KEINE Feuerkraft.** Der Schadensbonus ist separat
gedeckelt und mit den sichtbaren 30 Figuren bereits ausgereizt - nachgerechnet ueber alle
zwoelf Level ist er bei vollem Deckel exakt derselbe wie bei 30 Figuren (Level 12: 4,00
gegen 4,00). Auch die Gegner-Kopplung (`enemy.firepowerCoupling`) haengt an diesem
gedeckelten Bonus und wird durch eine groessere Reserve nicht staerker. Die Reserve ist
damit reine Ueberlebenszeit, wie im Entwurf vorgesehen. Ein neuer Test haelt das fest.

**Im Browser belegt:** Deckel greift mit 30 / 52 / 100 auf den Leveln 1 / 6 / 12, die
Salve liefert weiterhin 8 Schuetzen, keine Konsolenfehler.

**Ein bestehender Test musste umgeschrieben werden:** `wallLoss.test.ts` hielt
`capAtLevelTwelve === crowd.max * 2` als feste Zahl fest. Er prueft jetzt die Eigenschaft
(Level 1 ohne Reserve, Level 12 mit wachsender Reserve, Reserve traegt mehrere rote
Kacheln, aber keinen Run).

177 Tests gruen, `npm run check` sauber.
**Offen: Thomas' iPhone-Urteil.**

**Level 5 war unspielbar: Die Hordenform bestimmte die Gegnerstaerke**
(2026-08-23, Claude direkt. Thomas: "Bis Level 4 alles ok, bei Level 5 habe ich keine
Chance mehr Gegner abzuschiessen - zu schnell? Zu stark? Sieh dir das an und gleich das
aus ab Level 5".)

**Weder zu schnell noch zu stark - ein Konstruktionsfehler.** In `spawner.getSquadTypes`
stand:
```ts
if (squadKind === 'wedge') return Array.from({ length: size }, () => light)
```
**Ein Keil bestand IMMER nur aus leichten Gegnern**, unabhaengig von der Leveltabelle.
Die Level 1-4 kennen ausschliesslich Keile; ab Level 5 kommen `cluster` und `row` dazu,
und die werteten die Gewichte aus. Da rund zwei Drittel aller Spawn-Ereignisse Horden mit
je zehn bis zwoelf Mitgliedern sind, haengt fast die gesamte Gegnermasse daran: Die
Gewichte der unteren Level galten faktisch nur fuer Einzelgegner.

**Gemessen** (Truppe 40 am Level-Deckel, Standardwaffe, je 18 s):

| Level | Abschuesse/s | kommt durch | Lebenspunkte je Gegner |
|---|---|---|---|
| 3 | 5,3 | 5 % | 3,3 |
| 4 | 6,1 | 2 % | 4,1 |
| **5** | **0,7** | **89 %** | **18,0** |
| 6 | 4,3 | 10 % | 10,7 |

Faktor 4,4 in einem einzigen Level - und Level 5 war damit **haerter als Level 6**, weil
dort zwei Drittel der Horden wieder Keile sind. Ein Zickzack, den niemand beabsichtigt
hatte und den die Leveltabelle auch nicht hergab (sie sieht von 4 auf 5 nur Faktor 1,44
vor).

**Isoliert statt geraten:** Die Leveltabelle wurde zur Laufzeit umgebogen, um die drei
Unterschiede zwischen Level 4 und 5 einzeln zu pruefen (Gegnermischung, Hordenform,
Begleiter). Nur die Hordenform hat gewirkt: Mit den Keilen von Level 4 fielen die
mittleren Lebenspunkte von 16,4 auf 4,5.

**Gebaut:**
- **Sonderregel entfernt.** Alle Formationen wuerfeln jetzt nach `enemyWeights`. Die
  Formation beschreibt die FORM einer Horde (Keil, Reihe, Klumpen), nicht ihre Staerke -
  wer sie in der Leveltabelle wechselt, um das Bild zu variieren, darf damit nicht die
  Haerte vervierfachen.
- **Gewichte aller zwoelf Level neu gesetzt.** Sie mussten deutlich leicht-lastiger
  werden, weil sie jetzt fuer ALLES gelten: Sie schreiben auf, was in den unteren Leveln
  ohnehin schon gespielt wurde. Mittlere Grundlebenspunkte (Typen 2/8/23):
  L1 2,24 · L2 2,42 · L3 2,60 · L4 2,78 · L5 3,17 · L6 3,83 · L7 4,49 · L8 5,30 ·
  L9 6,11 · L10 6,92 · L11 7,73 · L12 8,54 - eine glatte Kurve, Faktor 3,8 ueber elf
  Level. Der Anteil schwerer Gegner steigt trotzdem von 0 auf 20 %, damit sich das Bild
  sichtbar aendert.

**Ergebnis, gemessen** (gleicher Aufbau):

| Level | Abschuesse/s | kommt durch | Lebenspunkte je Gegner |
|---|---|---|---|
| 3 | 5,3 | 1 % | 3,9 |
| 4 | 5,8 | 4 % | 5,5 |
| 5 | 5,0 | 10 % | 6,0 |
| 6 | 5,9 | 5 % | 7,2 |
| 8 | 7,3 | 20 % | 13,6 |

Die Haerte steigt jetzt monoton, der Zickzack ist weg. Am Level-Deckel gemessen
(Truppe schrumpft echt mit, 16 s): Level 5 40 → 37 Figuren, Level 10 50 → 49,
Level 12 60 → 54. Wer NICHT aufruestet, kommt weiter unter Druck (Level 5 mit Truppe 20
und halben Werten: 21 % kommen durch, 20 → 4 Figuren ohne Sammeln).

**Nebenwirkung, bewusst in Kauf genommen:** Level 4 ist rund 1,3x haerter geworden
(4 % statt 2 % kommen durch). Das liegt daran, dass dort jetzt auch Horden gemischte
Typen enthalten koennen. Beides ist so niedrig, dass es die von Thomas abgenommene
Spielbarkeit der unteren Level nicht beruehrt.

**Zwei bestehende Tests mussten umgeschrieben werden**, weil sie die alten Gewichte als
feste Zahlen festhielten (`[75, 25, 0]` und `[15, 35, 50]`). Sie pruefen jetzt die
Eigenschaft statt der Werte - sonst haetten sie den Umbau blockiert, ohne etwas zu
sichern.
**Drei neue Tests** in `tests/enemyResistance.test.ts`: keine Formations-Sonderregel mehr
im Quelltext, monoton steigende Haerte ohne Sprung ueber 1,5x, und der schwere Gegner
bleibt oben erreichbar.

176 Tests gruen, `npm run check` sauber.
**Offen: Thomas' iPhone-Urteil.**

**Durchbruch: Gegner, die an der Truppe vorbeilaufen, kosten jetzt Figuren**
(2026-08-23, Claude direkt. Thomas auf die vorgelegte Entscheidung: "Ja Bau das".)

**Das Problem, das die Regel loest.** Bis hierher war die einzige Verlustquelle die
BERUEHRUNG. Damit hing jeder Schaden an der Gesamtbilanz "Feuerkraft gegen Nachschub" -
und die ist bistabil: Sobald der Nachschub die Raeumleistung uebersteigt, staut es sich
auf, durchgelaufene Gegner machen Spuren frei, und es verstaerkt sich selbst. Gemessen
auf den Leveln 7-11 sprang der Anteil durchkommender Gegner zwischen 1 % und 78 %, ohne
dass ein Zwischenzustand existierte. Schlimmer war der Nebeneffekt: Wer an der Seite
fuhr, liess 84 % der Gegner durch und verlor dabei **null Figuren** - sie liefen an ihm
vorbei ins Leere. **Verfehlen war folgenlos.**
Jetzt haengt der Verlust an dem, was man verfehlt. Das ist ein stetiger Zusammenhang:
doppelt so viel durchgelassen heisst doppelter Verlust - keine Bilanz, die kippt.

**Gebaut:**
- `spawner.meldeDurchbruch` meldet einmalig, wenn ein Gegner die **Truppenhoehe**
  passiert (nicht den Bildrand - dort steht die Truppe, dort ist das Ereignis). Flag
  `durchgebrochen` verhindert Doppelzaehlung auf den restlichen 130 px.
- **Wer beruehrt, kommt hier nie an:** `handlePlayerHit` recycelt den Gegner und er hat
  dort bereits gekostet. Doppelt zahlt niemand.
- **Die Unverwundbarkeit nach einem Treffer gilt bewusst NICHT** (`player.iframesMs`).
  Sie schuetzt vor einer Trefferserie, nicht vor den Folgen des eigenen Verfehlens -
  sonst waere die Regel bei hohem Durchsatz genau dann wirkungslos, wenn sie greifen soll.
- **Eigene Verarbeitung** (`GameScene.handleBreakthrough`) statt `handlePlayerDamage`:
  kein Kamerawackeln (bei bis zu 6 Ereignissen je Sekunde waere das Bild unruhig statt
  wuchtig) und kein Setzen der Unverwundbarkeit. Quittung wie beim Verlust an einer roten
  Wandkachel: Ton `crowdDown` und rote Zahl ueber der Truppe.
- **Bruchteile werden gesammelt** und erst bei einer vollen Figur eingeloest.

**Hoehe hergeleitet, nicht gewaehlt** (`enemy.breakthroughDamageFactor` 0,12): Die
Sammelbahn links gewinnt 1,41 Figuren/s, wenn man den roten ausweicht. Wer dort faehrt,
laesst gemessen 84 % durch, auf Level 6 also 5,9 Gegner/s bei mittlerem contactDamage
1,3. Zielwert netto +0,5 Figuren/s statt +1,41:
`1,41 - 5,9 x 1,3 x f = 0,5` → **f = 0,118**, gerundet 0,12. Ein leichter Gegner kostet
damit 0,12 Figuren, ein schwerer 0,24 - es braucht rund acht Durchbrueche fuer eine Figur.

**Level 1 bleibt frei** (`enemy.breakthroughMinLevel` 2, dieselbe Begruendung wie
`walls.badMinLevel`). Gemessen, warum das noetig war: Die Regel hat eine Rueckkopplung -
weniger Figuren heisst weniger Feuerkraft heisst mehr Durchbrueche. Mit Truppe 10 und den
Grundwerten stieg der Durchkommensanteil dadurch von 10 % auf 44 %, und die Truppe war
nach 20 s aufgerieben. Im echten Spiel faengt die Sammelbahn das ab - aber darauf soll
sich niemand im ersten Level verlassen muessen, bevor er die Regel gesehen hat.

**Ergebnis, gemessen** (Truppe mittig, 20 s, Truppe schrumpft echt mit, kein Sammeln):

| Fall | kommt durch | Durchbrueche | Truppe | Verlust/s |
|---|---|---|---|---|
| L1 frisch (Regel aus) | 22 % | 0 | 10 → 0 | 0,50 (nur Beruehrung) |
| L2 frisch | 14 % | 21 | 15 → 12 | 0,15 |
| L3 ausgebaut | 3 % | 4 | 20 → 19 | 0,05 |
| L6 ausgebaut | 11 % | 14 | 40 → 39 | 0,05 |
| L12 ausgebaut | 25 % | 12 | 60 → 39 | 1,05 |

Und die Positionsabwaegung, die vorher gar nicht existierte (Level 6, Truppe 40, 20 s):

| Standort | kommt durch | Durchbrueche | Truppe |
|---|---|---|---|
| Mitte | 12 % | 15 | 40 → 32 |
| halbrechts | 45 % | 65 | 40 → 30 |
| links aussen | 84 % | 122 | 40 → 4 |

Links aussen ist der ungebremste Fall: stur an der Sammelbahn kleben, ohne den roten
Kacheln auszuweichen und ohne zu schiessen. Wer sauber sammelt, gleicht das aus (+1,41/s
gegen -0,95/s Durchbruchverlust) - genau der Zielwert der Herleitung.

**Vier neue Tests** in `tests/enemyResistance.test.ts`, darunter die Netto-Bilanz der
Sammelbahn gegen den Durchbruchverlust - die Zahl, an der der Wert haengt.

173 Tests gruen, `npm run check` sauber.
**Offen: Thomas' iPhone-Urteil.**

**Gegner-Widerstand neu aufgebaut: gedaempfte Kopplung, schmalere Feuerlinie, kein
Trefferblitzen**
(2026-08-23, Claude direkt. Thomas: "nehme deinen Vorschlag an" - zaehere Gegner plus
gedaempfte Kopplung; dazu "das trefferblitzen weg lassen komplett".)

**Zuerst das Messwerkzeug, dann die Zahlen.** Bisher wurde Feuerkraft gegen Bedarf
gerechnet. Gemessen wird jetzt, was zaehlt: **Wie viele Gegner erreichen die Truppe?**
Die Sonde verfolgt jeden Gegner ueber seine `spawnId`, merkt sich den Ort seines
Verschwindens und wertet Todeshoehe, Seitenabstand und Figurenverlust aus. Zwei Fallen
haben die ersten Messreihen verfaelscht und sind behoben: Gegner aus dem Vorlauf blieben
beim Zustandswechsel stehen (Level 1 zeigte dadurch 78 % Durchkommen statt 0 %), und ohne
Einschwingzeit wurde ein halb leeres Feld gemessen.

**DER AUSGANGSBEFUND - das Spiel hatte zwei Haelften und keinen Uebergang.**
Je 12 s, Standardwaffe, Truppe mittig, einmal frisch (Truppe 8, Grundwerte) und einmal
voll ausgebaut (Truppe 60, Level-Deckel):

| Level | 1 | 2 | 3 | 4 | 6 | 8 | 10 | 12 |
|---|---|---|---|---|---|---|---|---|
| voll ausgebaut | 0 % | 0 % | 0 % | 0 % | 0 % | 0 % | 25 % | 57 % |
| frisch | 0 % | 0 % | 0 % | 0 % | 0 % | 100 % | 100 % | 100 % |

Bis Level 6 war das Spiel **folgenlos**: kein Gegner kam an, kein Figurenverlust,
Todeshoehe konstant 398 px - das ist exakt die Reichweitenlinie der Waffe. Ab Level 8
kippte es innerhalb von zwei Leveln ins Gegenteil. Thomas' Beschwerde ("ab Level 3 kann
ich meine Leute einfach stehen lassen") beschreibt die untere Haelfte.
Ursache, gerechnet: Der Bedarf wuchs ueber elf Level um Faktor 60, die Feuerkraft am
Deckel nur um 28,5 - und Level 1 startete so weit im Ueberschuss, dass die Kurven sich
erst bei Level 7 trafen.

**DER EIGENTLICHE FUND kam aus einer Messung, die vorher niemand gemacht hatte:**
Wo sterben Gegner in SEITLICHER Richtung? (Level 6, Truppe 30, je 18 s)

| Truppe steht | kommt durch | mittlerer Seitenabstand der Todesorte |
|---|---|---|
| Mitte | 1 % | 4 px |
| links aussen | 72 % | 58 px |
| rechts aussen | 45 % | 83 px |

Die Mitte war der **sichere Ort**, und zwar aus zwei Gruenden zusammen: Die Zielsuche
(`seekSpeedPxPerSec` 11) zog praktisch jeden Gegner vor eine mittig stehende Truppe, und
die Truppe war bei 30 Figuren **130 px breit** und deckte damit fast den ganzen
Anflugbereich (155 px) ab. Es gab schlicht nichts, was vorbeilaufen konnte. Die
Zielsuche war 2026-08-22 eingebaut worden, um Stehenbleiben zu bestrafen - gemessen hat
sie es belohnt.

**GEBAUT, alles mit Herleitung im Kommentar:**
- **Levelkurve der Gegner-hp ersatzlos weg** (`hpPerLevelGrowth` 1,2 -> 1,0). Sie war der
  Grund fuer die doppelte Steilheit. Das Levelwachstum kommt jetzt aus Typmischung
  (4,3x) und Nachschub (1,9x), die ohnehin steigen.
- **Grundwerte 1/4/12 -> 2/8/23.** Aus dem Startzustand gerechnet, Typverhaeltnis bleibt.
  Ein Gegner stirbt nicht mehr am ersten Treffer.
- **Gedaempfte Kopplung an die Spielerstaerke** (`enemy.firepowerCoupling`), also Thomas'
  urspruenglicher Auftrag - aber in der Form, die die alte Wandhaerte-Falle vermeidet:
  ohne Waffe, mit Untergrenze (unterhalb der Referenz greift sie gar nicht) und gedaempft
  mit 0,30. Doppelte Feuerkraft macht Gegner 1,23x zaeher, netto bleiben 1,62x mehr
  Durchsatz - Aufruesten wirkt also klar.
  Der erste Wert 0,42 (aus der Bedingung "gleicher Anteil auf Level 1 wie auf Level 12")
  war zu hoch: Er setzt gleichmaessigen Nachschub voraus, der aber zwischen Level 6 und 8
  um 87 % springt. Die oberen Level kippten dadurch vollstaendig - schlechter als vorher.
- **Zielsuche 11 -> 4 px/s** und **Spawn-Baender 0,28 -> 0,45 / 0,62 -> 0,66**: Gegner
  laufen breiter an und werden nicht mehr vor die Truppe gezogen.
- **Feuerlinie schmaler** (`crowd.maxWidthRatio` 0,44 -> 0,20 = 78 px). 0,20 ist der
  kleinste zulaessige Wert, nicht ein gewaehlter: 8 Schuetzen brauchen bei
  `minColSpacing` 11 px mindestens 77 px nebeneinander. Wer weiter will, muss zuerst
  `shootersPerSalvo` oder `minColSpacing` anfassen.
- **Trefferblitzen komplett entfernt** (Thomas). Jeder getroffene Gegner wurde 80 ms voll
  weiss gefuellt; bei bis zu 73 gleichzeitigen Gegnern flackerte ein grosser Teil des
  Bildes dauerhaft. Der Boss hatte denselben Zweig, seine `flashRemainingMs` wurde aber
  NIE gesetzt - toter Code, mit entfernt. Die Phasenumschaltung des Bosses bleibt.

**ERGEBNIS, gemessen (je 14 s, Truppe mittig):**

| Level | voll ausgebaut | Figurenverlust | frisch | Figurenverlust |
|---|---|---|---|---|
| 1 | 4,5 % | 0 | 9,9 % | 6 |
| 4 | 4,2 % | 2 | 8,9 % | 7 |
| 6 | 6,3 % | 2 | 12,1 % | 7 |
| 12 | 9,0 % | 4 | 100 % | 20 |

Statt "0 % oder 100 %" liegt jetzt jedes Level im Korridor, und der Unterschied zwischen
aufgeruestet und nicht aufgeruestet ist durchgehend sichtbar. Die Todeshoehe streut
(427-508 statt konstant 398) - Gegner kommen naeher, statt an der Reichweitenlinie zu
verpuffen.

**Und die Position zaehlt jetzt** (Level 6, Truppe 30, je 14 s):

| Standort | kommt durch | Figurenverlust |
|---|---|---|
| Mitte | 13,3 % | 8 |
| halbrechts | 39,4 % | 0 |
| rechts aussen | 83,7 % | 0 |

Das ist eine echte Abwaegung statt einer besten Spielweise: In der Mitte raeumt man ab,
zahlt aber mit Figuren. An der Seite verliert man nichts, laesst aber fast alles durch -
und genau dort liegen die Sammelbahn (links) und die Feuerkraft (rechts).

**NICHT GELOEST, gemessen und benannt:** Zwischen Level 7 und 11 streuen die Werte bei
STEHENDER Truppe stark (gemessen 51 / 56 / 1 / 78 / 2 % auf den Leveln 7-11). Das System
ist dort bistabil: Sobald der Nachschub die Raeumleistung uebersteigt, staut es sich auf,
Spuren werden frei und es verstaerkt sich selbst. Ein Zwischenzustand existiert kaum.
Das ist keine Zahl, die sich einstellen laesst, sondern eine Eigenschaft des Aufbaus -
die Reissleine (max. zwei Balance-Zyklen, dann Entscheidung mit Thomas) ist gezogen.
**Was es aufloesen wuerde:** ein Gegner, der die Truppenhoehe passiert, ohne getoetet zu
werden, muesste etwas kosten. Dann haengt der Verlust an dem, was man verfehlt, statt an
der Gesamtbilanz. Das ist eine Produktentscheidung und wartet auf Thomas.

**Neue Regressionstests** in `tests/enemyResistance.test.ts` (17 Tests). Der wichtigste
rechnet nach, dass verdoppelte Feuerkraft ueber die ganze Spanne MEHR Durchsatz gibt -
genau die Eigenschaft, an der die alte Wandhaerte gescheitert ist und die vorher nirgends
als Zahl gebildet war. Zwei weitere halten die Grenzen der Feuerlinie fest (nicht breiter
als die halbe Anflugbreite, nicht schmaler als eine volle Salve) - beide haben beim ersten
Lauf sofort angeschlagen und den Wert 0,24 auf 0,20 korrigiert.

169 Tests gruen, `npm run check` sauber.
**Offen: Thomas' iPhone-Urteil.**

**Waffen auf ein gemeinsames Staerkeband gebracht (Minigun-Fix)**
(2026-08-23, Claude direkt. Thomas: "Minigun macht kaum Schaden - sieh zu dass die
Staerken der Gegner an die Waffen und die Menge meiner Leute angepasst werden zu jeder
Zeit", nach dem Hinweis auf die Kopplungsfalle dann: "Aber dann muessen wir das anders
loesen".)

**Der urspruengliche Auftrag wurde bewusst NICHT so gebaut.** Gegnerstaerke aus der
Spielerstaerke abzuleiten ist im Projekt schon einmal gebaut und wieder ausgebaut worden
(Wandhaerte, siehe `docs/lessons.md` 2026-08-22): Eine so gekoppelte Groesse macht jede
Verbesserung wirkungslos - der Spieler wird staerker, die Aufgabe genauso. Thomas hat
nach dem Hinweis selbst umentschieden. Die Anpassung an den Spielfortschritt laeuft
weiterhin ueber die LEVELNUMMER (`enemy.hpPerLevelGrowth` plus die Level-Deckel bei
`BALANCE.stats`, gebaut am selben Tag).

**Stattdessen die Wurzel behoben: Die Waffen waren voellig ungleich.** Gemessen wurde die
Feuerkraft jeder Waffe bei voller Truppe gegen eine Horde (Durchschlag, Splash und Kette
zaehlen mit, weil sie mehrere Gegner treffen):
- **VORHER:** Schrot 4,20x · Kette 1,46x · Flamme 1,15x · Laser 1,12x · Standard 1,00x ·
  Rakete 0,76x · **Minigun 0,23x** — Spanne zwischen der staerksten und der schwaechsten
  Waffe: **Faktor 18**. Thomas' Befund war also exakt richtig: Die Minigun war die
  schwaechste Waffe im Spiel, 4,3x unter der Standardwaffe. Sie hat als einzige gar
  nichts (kein Durchschlag, kein Splash, keine Kette) und feuerte trotzdem nur mit
  3 statt 8 Figuren. Der Faktor 18 stand seit Wochen im Code, ohne dass ihn eine Zahl
  irgendwo zusammengefasst haette.
- **Geaendert** (jeweils gerechnet, Kommentar steht daneben): Minigun
  `shootersPerSalvo` 3 -> 8 und `damageFactor` 0,28 -> 0,55 (beides noetig - einzeln
  haette keiner der Schritte gereicht); Schrot `damageFactor` 1,5 -> 0,45; Rakete
  `shootersPerSalvo` 3 -> 5; Kette `damageFactor` 1,05 -> 0,9. Laser, Flamme und
  Standardwaffe unveraendert.
- **Pools nachgezogen:** Minigun 56 -> 152 (17,6 Salven/s x 8 Schuetzen x 0,80 s = 112,6),
  Rakete 24 -> 40. Beide behalten ihre bisherige Reserve.

**Ergebnis, im Spiel gemessen** (Level 12, Truppe 8 - also unter Ueberlast, weil bei
normaler Last der Nachschub limitiert und alle Waffen gleich aussehen lassen wuerde):
Schrot 1,16x · Kette 1,08x · Flamme 1,07x · Rakete 1,06x · Laser 1,02x · Standard 1,00x ·
Minigun 0,88x. **Spanne 1,32 statt 18.**
Der Charakter der Waffen bleibt dabei erhalten und ist an der Todeshoehe ablesbar
(Level 6): Flamme 712 px (kurz) bis Rakete 369 px (weit).

**Nicht weiter justiert, mit Grund:** Die Minigun liegt mit 0,88x als einzige unter der
Standardwaffe. Zwischen zwei Messlaeufen streute sie aber um 20 % (1,06x auf Level 6,
0,88x auf Level 12) - die Streuung ist damit groesser als der verbliebene Abstand. Nach
`docs/lessons.md` (2026-08-22, "Balance an einer Groesse gedreht, die den Ausgang gar
nicht bestimmt") wird daran nicht nachgerechnet, solange das so ist.

**Neuer Regressionstest** in `tests/bossPlan.test.ts`: Er rechnet die Hordenstaerke jeder
Waffe als unabhaengige Modellrechnung nach und laesst nur ein Band von 0,9x bis 1,4x zu,
zusaetzlich hoechstens Faktor 1,5 zwischen der staerksten und der schwaechsten. Genau
diese Zahl hat vorher niemand gebildet - deshalb blieb Faktor 18 unbemerkt.

152 Tests gruen, `npm run check` sauber.

**Feuerkraft-Deckel wachsen mit dem Level, Upgrade-Shop entfernt, Laser-Reichweite gesenkt**
(2026-08-23, Claude direkt. Thomas: "mein Team kann ich einfach stehen lassen in der Mitte
und es läuft durch", dazu "Den Shop kannst du streichen ich denk es ist nicht notwendig".)

**Der Ausgangsbefund, gemessen statt vermutet.** Thomas' Screenshot zeigte auf LEVEL 2
bereits alle drei alten Deckel erreicht (Truppe 60, Schaden 20, Rate 8). Gemessen bei
diesem Stand: Feuerkraft 2.867 Schaden/s gegen einen Bedarf von 18 (Level 2) und 707
(Level 12) — Faktor 155 bzw. 4. **Kein einziger Gegner erreichte die Truppe** (0 von 388
auf Level 2, 0 von 718 auf Level 12), und Ausweichen war folgenlos: stehend 388
Toetungen, pendelnd 425, Todeshoehe in beiden Faellen 225 px von 714.
Ursache des Tempos: Die linke Sammelbahn liefert 1,875 Kacheln/s, davon drei Viertel gut
— wer den roten ausweicht, gewinnt 1,41 Figuren/s und steht nach 40 s am Deckel. Ein
Level dauert 75-88 s. Der Zufluss kannte die Levelnummer nicht.

**Gebaut:**
- **Deckel folgen dem Level.** `stats.damage` 1,5 -> 7 und `stats.shotsPerSec` 3,5 -> 8,
  exponentiell interpoliert (der Bedarf waechst selbst exponentiell, eine Gerade
  ueberversorgt die Mitte). Endpunkte gerechnet aus Bedarf = Nachschub x mittlere
  Gegner-hp, Zielkorridor 2,5-faches davon.
- **Nicht die Truppengroesse gedeckelt, sondern ihr Schadensbonus**
  (`crowd.damageMultiplierCap*` 1,5 -> 4). Figuren bleiben Ueberlebenszeit, nur ihre
  Feuerwirkung folgt dem Level — der schonendere Eingriff.
- **Upgrade-Shop komplett entfernt** (Thomas). `BALANCE.upgradesShop`, die Kauf-Funktionen,
  die Menue-Zeilen und das `upgrades`-Feld im Spielstand sind weg. Alte Spielstaende
  werden weiter gelesen und das Feld nur verworfen — sonst haette ein bespieltes Geraet
  seine Bestenliste verloren (eigener Test dafuer). Boss- und Wandhaerte beziehen ihre
  Referenz jetzt auf die Level-Deckel statt auf gekaufte Stufen; das ist sogar genauer,
  weil der Spieler beim Boss ohnehin am Deckel steht. Muenzen bleiben als Punktestand.
- **Laser `engageShare` 0,85 -> 0,60.** 0,85 war der Ausreisser (naechster Wert: Rakete
  0,72) und setzte die Feuerlinie auf y = 235 — die gemessene Todeshoehe von 225 lag
  praktisch darauf.

**Ergebnis, gemessen:** Feuerkraft am Deckel jetzt 2,2-5,5x Bedarf statt 4-260x. Auf
Level 2 stehen Schaden 1,7 und Rate 3,8 statt 20 und 8. Todeshoehe von 225 auf **369**
(Level 2) und **397** (Level 12).

**NICHT erreicht, und der Grund ist belegt:** Es erreicht weiterhin kein Gegner die
Truppe, und Stehenbleiben bleibt gleichwertig zum Ausweichen. Die Messung dahinter: Ein
Gegner ueberlebt unter Beschuss **0,007 bis 0,29 Sekunden** und legt dabei **1 bis 32 px**
zurueck — bei 564 px Anflugstrecke. Die Todeshoehe ist deshalb IMMER die Reichweitenlinie
der Waffe, unabhaengig von der Feuerkraft. Damit ein Gegner ankommt, braeuchte er das
20- bis 240-fache seiner Lebenspunkte; das waere ein anderes Genre.
**Der eigentliche Befund fuer Thomas:** Gegner sind derzeit ueberhaupt keine Gefahr — die
einzige Verlustquelle im Spiel sind die roten Wandkacheln. Weiter gedreht wurde daran
bewusst nicht (Reissleine: maximal zwei Balance-Zyklen, dann Entscheidung mit Thomas).

151 Tests gruen, `npm run check` sauber.

**W7 Teil 1 — Plastische Figuren: umgesetzt und abgenommen**
(2026-08-23. Codex hat die Bilder erzeugt, Claude Review + Code-Anpassung.)
- **Fuenf Sprites ersetzt**, jeweils in doppelter Aufloesung: `player.png` 68x92,
  `enemy-light` 56x76, `enemy-standard` 64x88, `enemy-heavy` 84x104, `enemy-boss` 240x240.
  Beleuchtung von oben/vorne links, Schattenseite, Kantenlicht. Kontrollbild auf
  Fahrbahn UND heller Umgebung: `assets/probe/w7-kontrolle.png`.
- **Review:** Silhouette, Farbwelt und Ansichtsrichtung sind erhalten (Vorher/Nachher
  verglichen) — es ist eine Ueberarbeitung, kein Neuentwurf, wie in der Spec verlangt.
  Die Reissleine wurde NICHT gezogen: echte Figuren, keine programmatisch gezeichneten
  Formen. Der PIL-Code in Codex' Log diente dem Freistellen und dem Kontrollbild.
- **Code-Anpassung (Claude, war bewusst nicht Codex' Aufgabe):** Neuer Faktor
  `BALANCE.render.figureTextureScale` 0,5 rechnet die doppelte Aufloesung auf
  Spielgroesse zurueck — angewendet in `spawner.applyPerspectiveScale`,
  `boss.applyPerspectiveScale` und beim Anlegen der Truppen-Sprites in `crowd.ts`.
  Ohne ihn waeren alle Figuren doppelt so gross.
- **Koerpermasse NACHGEMESSEN, nicht umgerechnet** (Alpha-Schwelle 8 an den neuen
  Bildern). In Kampfhoehen-Pixeln, alt -> neu: light 18,0 -> 18,5 · standard
  21,0 -> **25,0** · heavy 40,0 -> 41,0 · Boss 118 -> 118. `standard` ist spuerbar
  breiter, weil die neue Figur die Arme abspreizt — genau dafuer wird nachgemessen.
- **Belegt im Browser:** Ein leichter Gegner auf Kampfhoehe wird mit 34,9 x 47,3 px
  gezeichnet — identisch zum Stand vor dem Austausch. Durchsatz trotz breiterer
  `standard`-Figur unveraendert: Level 1 6,21 Gegner/s, Level 12 12,34 (vorher 6,49 /
  12,56, innerhalb der Streuung), keine Pool-Erschoepfung. Screenshot im Spiel geprueft.
- **Dabei gefunden und behoben:** `tests/squads.test.ts` verglich Roh-Texturmasse gegen
  Abstaende in Spielpixeln und meldete Ueberlappungen — derselbe Bezugssystem-Fehler wie
  in `spawnSquad`, nur im Test. Jetzt ueber `getFigureWidth/-Height`.
- `pixelArt: false` stand bereits seit 2026-08-22, Teil (b) der Etappe war damit erledigt.
- 154 Tests gruen, `npm run check` sauber.
- **Offen: Thomas' iPhone-Urteil** — Gamefeel und Optik gelten erst danach als erfuellt.

---

### Archiv: die Spec, nach der gebaut wurde
**W7 Teil 1 — Plastische Figuren (Codex-Auftrag)**

### Ziel
Die Figuren wirken flach wie Aufkleber. Sie sollen plastisch wirken — Volumen durch
Licht, wie im 3D-Referenz-Reel, das Thomas geschickt hat. Erreicht wird das mit den
Mitteln eines 2D-Motors: **gemalte Beleuchtung im Sprite selbst**. Echtes 3D ist
ausgeschlossen (Phaser ist ein 2D-Renderer).

### Was zu erzeugen ist
Fuenf Bilder, jeweils als Ersatz fuer die bestehende Datei, in **doppelter Aufloesung**:

| Datei | heute | neu (exakt) | Motiv |
|---|---|---|---|
| `src/assets/player.png` | 34x46 | **68x92** | Eigene Figur, **Rueckenansicht** |
| `src/assets/enemy-light.png` | 28x38 | **56x76** | Leichter Gegner, Frontansicht |
| `src/assets/enemy-standard.png` | 32x44 | **64x88** | Standard-Gegner, Frontansicht |
| `src/assets/enemy-heavy.png` | 42x52 | **84x104** | Schwerer Gegner, Frontansicht, breit |
| `src/assets/enemy-boss.png` | 120x120 | **240x240** | Boss, Frontansicht |

**Die Ansichtsrichtung ist Bestand und wird NICHT geaendert.** Die eigene Figur ist
bereits eine Rueckenansicht (der dunkle Bereich unter dem Helm ist der Nacken, kein
Gesicht — das wurde am 2026-08-20 schon einmal falsch beurteilt und kostete zwei
Laeufe). Vor dem Zeichnen die **grossen Vorlagen** in `assets/probe/` ansehen, nicht die
34-px-Sprites: bei 34 px ist eine Ansicht nicht sicher zu erkennen.

### Verfahren (im Projekt bewaehrt, nicht abweichen)
**Gross rendern, dann herunterrechnen.** Alle brauchbaren Figuren dieses Projekts sind so
entstanden: zuerst eine grosse Fassung (Vorlagen liegen als `*-136x184.png` und
`*-gross.png` in `assets/probe/`), daraus die Zielgroesse herunterskaliert. Direkt in
Zielgroesse erzeugte Figuren waren unbrauchbar. Die grossen Zwischenstaende gehoeren nach
`assets/probe/` (Ordner ist gitignored), die fertigen Bilder nach `src/assets/`.

### Wie „plastisch" konkret aussieht
- **Licht von oben**, leicht von vorne links. Eine klare Lichtseite, eine Schattenseite,
  dazwischen ein weicher Uebergang — keine harte Zweiteilung.
- **Kantenlicht** an der lichtabgewandten Silhouette, damit die Figur sich vom
  Hintergrund abhebt.
- **Rundung an den Volumen**: Helm, Schultern, Brustkorb, Oberschenkel bekommen jeweils
  eine eigene Lichtkante. Genau daran erkennt das Auge Volumen.
- **Bodenkontakt**: nichts zeichnen. Der Bodenschatten ist bereits als eigenes Objekt
  gebaut (`figure-shadow`) und bleibt unveraendert. Ein zweiter, ins Sprite gemalter
  Schatten wuerde doppelt liegen.
- Farbwelt und Silhouette der bestehenden Figuren bleiben erkennbar. Das ist eine
  **Ueberarbeitung, kein Neuentwurf** — Thomas soll dieselben Figuren wiedererkennen,
  nur plastisch.

### Pruefung, die Codex selbst macht
Ein **Kontrollbild** nach `assets/probe/w7-kontrolle.png`: alle fuenf Figuren
nebeneinander, **je einmal auf der Fahrbahn (dunkelgrau) und einmal auf der Umgebung
(gruen/hell)**. Beide Hintergruende muessen tragen — eine Figur, die nur auf der Strasse
funktioniert, ist nicht fertig (das ist die Lehre aus dem Betongrau-Versuch).
Zusaetzlich jede Figur einmal auf **Spielgroesse heruntergerechnet** ins Kontrollbild,
denn dort wird sie beurteilt, nicht in der Vergroesserung.

### Was Codex NICHT macht
Den Code nicht anfassen. Die doppelte Aufloesung braucht eine Anpassung der
Darstellungs-Skalierung und neu gemessene Koerpermasse in `balance.ts` — das ist eine
Architekturentscheidung und macht Claude nach der Abnahme der Bilder. **Insbesondere
`balance.ts` nicht editieren.**

### Reissleine
Wenn die gewuenschte Plastizitaet nicht erreichbar ist: **melden, nicht ersetzen.**
Ausdruecklich **kein** zulaessiger Ersatz sind:
- programmatisch gezeichnete Formen (Rechtecke, Kreise, Farbverlaeufe per Code),
- abstrakte oder symbolhafte Figuren statt erkennbarer Koerper,
- Figuren in einfacher statt doppelter Aufloesung,
- eine geaenderte Ansichtsrichtung (die Rueckenansicht der eigenen Figur bleibt).
Kommt eines davon heraus, ist der Auftrag nicht erfuellt — dann Abschlussbericht mit der
Begruendung, was nicht ging, statt eines Ersatzprodukts abzuliefern.

### Abschluss
Status auf `IMPL_DONE`, Abschlussbericht: was geaendert, welche Zwischenstaende in
`assets/probe/` liegen, was nicht ging und warum.

### Implementation Summary
- Alle fuenf Figuren wurden als beleuchtete, gross gerenderte Vorlagen ueberarbeitet,
  vor dem Herunterrechnen freigestellt und in den exakt doppelten Zielmassen nach
  `src/assets/` ersetzt. Die Spielerfigur bleibt eine Rueckenansicht, die vier Gegner
  bleiben Frontansichten; an keiner Figur ist ein Bodenschatten gemalt.
- Zwischenstaende: `assets/probe/w7-*-gross-chroma.png` (farbige Freistellvorlagen),
  `assets/probe/w7-*-gross.png` (freigestellte Grossfassungen) sowie
  `assets/probe/w7-kontrolle.png` (Fahrbahn und helle Umgebung, jeweils mit
  Spielgroessen-Kopie aller fuenf Figuren).
- Geprueft: alle Zielmasse, vorhandene Transparenz pro Sprite und beide Hintergruende
  im Kontrollbild. Kein Code und insbesondere keine `balance.ts` wurde geaendert.

---

**W7 Teil 2: Gegnermenge steigt mit dem Level, Boss pendelt nicht mehr**
(2026-08-23, Claude direkt. Thomas nach dem iPhone-Test: "W5 passt am iphone soweit, aber
Gegner menge darf mit levels noch steigen, Boss soll sich nicht mehr links und rechts
bewegen, sondern einfach langsam auf mich zu, geschwindigkeit wie jetzt".)

**(e) Boss pendelt nicht mehr.** `moveAcrossRoad` und beide `moveSpeed`-Werte (110/170)
sind entfernt; die X-Position steht ab `activate()` fest in der Strassenmitte. Das
Vorruecken (`advanceSpeed` 8,35 px/s) bleibt unveraendert — "Geschwindigkeit wie jetzt"
ist als das bestehende Vorrueck-Tempo gelesen, nicht als Uebertragung der
Pendelgeschwindigkeit (110 px/s haetten die 334 px bis zur Truppe in 3 s zurueckgelegt).
Belegt: In fuenf Messlaeufen betraegt die X-Spanne des Bosses ueber den ganzen Kampf
exakt 0 px (vorher 216 px).
**Befund zur Kampfdauer, NICHT nachbalanciert:** Die Vorhersage war, dass der stehende
Boss dauerhaft in der Feuerlinie bleibt und der Kampf dadurch kuerzer wird. Der direkte
Vorher/Nachher-Vergleich mit identischem Messverfahren widerlegt das: Level 1
104,1 -> 100,4 s, Level 6 115,1 -> 110,5 s (je -4 %), Level 12 89,5 s -> Zeitlimit 180 s
ohne Abschuss. Die Streuung innerhalb eines Falls ist groesser als der Unterschied
zwischen den Faellen — bestimmend ist weiterhin der Gegnerschild vor dem Boss, nicht
seine Bewegung (derselbe Befund wie am 2026-08-22). Nach der Reissleine in `plan-v2.md`
(maximal zwei Balance-Zyklen, dann Entscheidung mit Thomas) wurde daran nichts gedreht.

**(d) Gegnermenge — der eigentliche Fund: sie stieg nicht flach, sie fiel auf null.**
Statt zum fuenften Mal an der Leveltabelle zu drehen, wurde die Kette durchgemessen
(angefordert -> erzeugt). Ergebnis im Browser, je 60 s Fahrt, Truppe 30, Waffe normal:
- **VORHER:** Level 1 4,95 Gegner/s (63 von 1.247 Versuchen), Level 6 **0,03** (2 von
  3.495), Level 12 **0,00** (0 von 3.577). Bei hohen Leveln kam gar kein Gegner mehr an.
- **Ursache 1 — doppelter Perspektiv-Aufschlag** (`spawner.spawnSquad`):
  `computeHordeOffsets` entwirft die Horde auf bis zu 220 px, dieselbe Horde wurde danach
  mit 220 x 1,519 = 334 px gegen den 234 px breiten Korridor geprueft. `chooseSpawnLane`
  lieferte konstruktiv `maxLane = 0`. Korrigiert: Der Aufschlag gehoert nur auf die
  FIGURENBREITE — die Mitglieds-Abstaende werden in `activateEnemy` ohnehin in
  Spuranteile umgerechnet und wachsen damit genau wie der Korridor.
- **Ursache 2 — Warteschlange ohne Verfallszeit:** Eine abgelehnte Horde blieb als
  `deferredSpawn` liegen und blockierte den gesamten Takt, auch jeden Einzelgegner.
  Gemessen lag eine Horde ueber 55 s im Weg. Neu: `enemy.deferredMaxAgeMs` (2.700 ms =
  halbe Anflugzeit, hergeleitet), danach wird sie verworfen.
- **Ursache 3 — fester Hordendeckel:** `level.squads.maxSize` 14 schnitt die
  hardness-Skalierung ab Level 5 ab; ueber sieben Level stieg die Menge nur um 18 %. Neu
  levelabhaengig (`maxSizeAtLevelOne` 14, `maxSizePerLevel` 1, `maxSizeCap` 26 — die
  Kappe ist die Nachlaufpause: der Durchsatz laeuft gegen 1000/pausePerMemberMs = 25/s).
  Die Boss-Hordengroesse folgt bewusst NICHT mit (eigener `hordePressure.hordeSizeCap`
  14), sonst haette `maxActiveCalled` nur noch eine statt zwei Horden zugelassen und der
  Bossdruck aus W5 waere still gesunken.
- **NACHHER**, je drei Laeufe, Mittelwert, in Klammern der mittlere Bestand am Schirm:
  Level 1 **6,49** /s (22,5) · Level 4 **8,31** /s (29,4) · Level 8 **10,30** /s (60,1) ·
  Level 12 **12,56** /s (73,0). Der sichtbare Bestand steigt ueber den Run um Faktor 3,2.
  Keine einzige Pool-Erschoepfung, hoechster Bestand 99 gegen Pool 264.
- **Offen und bewusst nicht angefasst:** Level 1 liegt jetzt 31 % ueber dem von Thomas
  abgenommenen Stand — Folge der Fehlerbehebung, nicht einer Anhebung der Tabelle.
  Ausserdem werden weiterhin rund 93 % der Spawn-Versuche abgelehnt; das ist ab hier
  keine Fehlfunktion mehr, sondern die Sperre gegen ineinander erscheinende Gegner bei
  voller Auslastung. Wer mehr will, muss an der Verweildauer ansetzen, nicht am Zufluss.

Regressionstest gegen Ursache 1 in `tests/perspective.test.ts` (prueft gegen den
Korridor, nicht gegen die Formel). 154 Tests gruen, `npm run check` sauber.


**Gegner auf Spielgroesse gebracht, Kurve steiler, nochmal mehr Nachschub**
(2026-08-22, Claude direkt, Thomas zum DRITTEN Mal zur Groesse: "Die mobs wirken immer
noch zu klein - muessen schneller wachsen und koennen noch ein wenig mehr sein").
- **Der eigentliche Fehler lag nicht in der Ferne, sondern auf Kampfhoehe.** Die beiden
  Anlaeufe davor haben nur die Fernkurve angefasst. Auf Kampfhoehe war ein Gegner aber
  exakt so gross wie sein Sprite: 38 px beim leichten gegen 46 px bei einer eigenen
  Figur. Selbst direkt vor der Truppe war er der Kleinere - das kann keine Fernkurve
  ausgleichen. Neu ist `enemy.figureScale` 1,25: leichter Gegner 47 px, schwerer 61 px.
  Der Faktor gilt fuer ALLES im Kampfhoehen-System (Darstellung, Trefferflaeche,
  Spurabstaende, Formationsbreite, Schatten) - dafuer gibt es jetzt
  `enemyTypes.getFigureWidth/-Height`; die Rohmasse bleiben nur noch dem Arcade-Body,
  den Phaser selbst mitskaliert.
- **Kurve steiler:** `horizonScale` 0,80 -> 0,84, `growthExponent` 0,45 -> 0,35. Auf
  einem Viertel der Anflugstrecke jetzt 94 % der vollen Groesse (vorher 89 %,
  urspruenglich 68 %), auf der Haelfte 97 %.
- **Mitgewachsen, damit aus Horden keine Kloesse werden:** Formationsabstaende 44 -> 52
  und 54 -> 62 px (bewusst nur Faktor 1,18 statt 1,25 - dichter soll sie wirken). Vier
  Figuren passen weiter nebeneinander; `hordeMaxWidthPx` bleibt bei 220, weil der
  Korridor auf Kampfhoehe nur 234 px breit ist. Eine 14er-Horde steht jetzt in vier
  statt drei Reihen.
- **Menge:** Takt -12 %, Hordenanteil +0,03, Hordengroessen der ersten vier Level +1.
  Level 1 damit 3,77 -> 5,23 Gegner je Sekunde (vorher 2,95 -> 4,22; urspruenglich
  1,01 -> 1,62). **Der Takt allein haette nichts gebracht:** Zuletzt scheiterten 3-5
  Spawns je 10 s an der Spurvergabe, und groessere Figuren brauchen mehr Korridor.
  Deshalb sind die Spawn-Baender mitgewachsen (0,20 -> 0,28 und 0,50 -> 0,62) und der
  Sicherheitsabstand von 6 auf 5 px gesunken - erst das macht den kuerzeren Takt wirksam.
**Gemessen im Browser** (Level 1, 10-s-Fenster): 40 / 52 / 41 Spawns gegen 35 / 31 / 37
davor, `deferred` weiter bei 3-4 und keine Pool-Warnung. Im Bild stehen die Gegner jetzt
auf Augenhoehe mit der eigenen Truppe und haben schon im oberen Bilddrittel fast volle
Groesse.
**Grenze fuer einen vierten Anlauf:** Ueber `horizonScale` 0,85 wird die Horde am
Horizont zu Matsch (die Formation schrumpft weiter mit der Strasse, die Figuren nicht),
und mehr Menge braucht dann zuerst wieder Platz - Baender, Sicherheitsabstand oder einen
breiteren Korridor.
Nachweise: 153 Tests gruen, `npm run check` sauber, Browser-Messung wie oben.
**Offen: Thomas' iPhone-Urteil.**

**Wandkette laeuft perspektivisch - Kacheln schrumpfen mit der Entfernung**
(2026-08-22, Claude direkt, Thomas: "Ja mach die Wandkarten fertig").
Der Rest aus dem vorigen Task ist damit erledigt: Die Kachel war das einzige Objekt im
Bild ohne Tiefe - Breite perspektivisch, Hoehe konstant 72 px bis zum Horizont.
- **Kette laeuft jetzt in WELT-Pixeln statt in Bildschirm-Pixeln.** `scrollSpeed` misst
  Weltstrecke auf Kampfhoehe; `advanceAlongRoad` bildet sie auf den Bildschirm ab. Am
  Horizont deckt dieselbe Weltstrecke weniger Pixel ab, das Segment kriecht dort und
  beschleunigt beim Naeherkommen. Damit ist nebenbei ein alter, in `balance.scrollSpeed`
  dokumentierter Bruch behoben: Waende waren am Horizont 5,1x schneller als die Haeuser
  daneben.
- **Geschlossene Loesung statt Schrittintegration.** Aus dy/dw = r(y)/r_anker und einer
  in y linearen Strassenbreite folgt r(w) = r0 x e^(lambda w). Eine Euler-Naeherung je
  Bild waere bildratenabhaengig gewesen - ein Test prueft jetzt, dass ein 100-ms-Schritt
  exakt dasselbe ergibt wie zehn 10-ms-Schritte.
- **Hoehe exakt statt genaehert.** `getRoadSegment` liefert Mitte UND Hoehe aus derselben
  Abbildung. Die naheliegende Naeherung (Nennhoehe x Massstab) haette bei 72 px rund 4 px
  Fuge zwischen zwei Kacheln gelassen. Zweiter Fallstrick, vom Test gefunden: Die
  Bildschirmmitte liegt wegen der Kruemmung ~0,03 px unter dem Weltanker - wer die
  gezeichnete Mitte im naechsten Bild als Anker zurueckliest, sammelt den Versatz auf.
  Deshalb fuehrt jedes Paar seinen `anchorY` getrennt und zeichnet nur nach `centerY`.
- **Mitgezogen:** Beschriftung und Lebenspunkte-Zahl skalieren mit der Kachel (fester
  Pixelabstand haette bei 41 px Ferndarstellung unten herausgeragt), der Fahrbereichs-
  Test (`getWallPresence`) rechnet mit der tatsaechlichen statt der Nennhoehe, und der
  Pool waechst 20 -> 32, weil ein Segment jetzt 6,4 statt 5,1 s lebt (rund 12 gleichzeitig
  je Seite).
- **Unveraendert:** Der Spawn-Takt haengt an der Weltstrecke, die Sammelrate bleibt also
  bei 1,875 Plaettchen je Sekunde - keine stille Balanceverschiebung.
- **Bewusst nicht mitgezogen:** Muenzen (`coins.ts`) fahren weiter in Bildschirmpixeln.
  Sie fliegen nach wenigen Zehntelsekunden zur Truppe; dort faellt der Unterschied nicht
  auf, und jede Aenderung am Einsammel-Timing waere Risiko ohne sichtbaren Gewinn.
Nachweise: 153 Tests gruen (sechs neue zur Kette), `npm run check` sauber,
Browser-Sichtpruefung: Kacheln laufen nach oben sichtbar zusammen, keine Fugen, keine
Pool-Warnung im Dev-Log. **Offen: Thomas' iPhone-Urteil.**

**Schussreichweite je Waffe, Gegner nochmal groesser, Wandkacheln als Quader**
(2026-08-22, Claude direkt, Thomas nach dem zweiten iPhone-Test: "Ja Schuss Weite
begrenzen, die mobs wirken immer noch zu klein und die Waende- naja die muessen wir noch
anpassen wirken wie Platzhalter - gehoeren auch wie 3d Optik", Nachtrag:
"Schussreichweite an Waffen anpassen - Vergleich zur Realitaet").
- **Reichweite.** Der vervierfachte Nachschub hatte die Strasse nicht gefuellt, weil die
  Truppe bis zum Horizont traf. Jetzt endet jeder Schuss auf einer Linie, die JE WAFFE
  woanders liegt - `engageShare` als Anteil der Anflugstrecke (564 px), nicht als
  Pixelzahl, damit die Linie auf jedem Geraet gleich sitzt. Von kurz nach weit:
  Flamme 0,28 (158 px), Schrot 0,38 (214), Blitz 0,45 (254), Gewehr 0,55 (310),
  Minigun 0,62 (350), Rakete 0,72 (406), Laser 0,85 (479). Der Laser ist bewusst
  gedeckelt: bei 1,0 waere die Kampfzone mit dem ersten Waffenfund wieder aufgehoben.
  Das alte `rangePx` ist ersatzlos weg - zwei Regler fuer dieselbe Sache.
  **Bewusste Ausnahme: im Bossduell gilt keine Reichweite.** Der Boss steht auf
  battleY 300, also 414 px entfernt, und rueckt von dort in 40 s vor; mit der Flamme
  (158 px) waere er den halben Kampf unangreifbar. Die Alternative - battleY an die
  kuerzeste Waffe koppeln (545) und advanceSpeed nachrechnen - haette die ganze
  Bossdramaturgie umgebaut.
- **Groesse.** `horizonScale` 0,72 -> 0,80, `growthExponent` 0,55 -> 0,45. Auf halber
  Anflugstrecke jetzt 95 % der vollen Groesse (vorher 91 %, urspruenglich 79 %), am
  Horizont 0,80 statt 0,57. Preis bewusst bezahlt: Zwei schwere Gegner nebeneinander
  ueberlappen am Horizont um ~7 px - in einer Horde das Zielbild, kein Fehler. Der
  Wandzonen-Aufschlag zog automatisch mit (1,31 -> 1,44).
- **Wandkacheln.** Aus dem flachen Rechteck wird ein Quader: Deckflaeche oben,
  Helligkeitsverlauf nach unten, Schattensockel, helle linke und dunkle rechte Kante -
  eine Lichtquelle fuer alle Kacheln. Alles in der gebackenen Textur, also kein einziges
  zusaetzliches Zeichenobjekt zur Laufzeit. Regler stehen in `walls.block`.
**Gemessen im Browser** (Level 1, 10-s-Fenster): 35 / 31 / 37 Spawns. Etwas weniger als
vor der Reichweitengrenze (bis 54) - erwarteter Nebeneffekt: Gegner leben laenger,
belegen laenger eine Spur, `deferred` steigt. Im Bild ist das Gegenteil sichtbar: statt
2 Gegnern stehen jetzt 10-12 gleichzeitig auf der Strasse.
**Bekannter Rest, nicht gebaut:** Die Kacheln behalten ihre volle Hoehe bis zum Horizont,
nur ihre Breite folgt der Perspektive. Das ist der groesste verbliebene Bruch in der
Wandoptik. Der Fix ist kein Textur-, sondern ein Geometrie-Umbau: Die Kette laeuft mit
festem Pixeltakt (`chainAccumulatorPx` gegen `segmentHeightPx`); skaliert man nur die
Hoehe, reissen oben ~14 px Luecken. Richtig waere, jedem Segment einen Streckenwert zu
geben und y perspektivisch abzubilden - eigener Task, mittleres Risiko (Trefferlogik,
Sammelbahn-Takt, Wandmuster haengen daran).
Nachweise: 147 Tests gruen, `npm run check` sauber, Browser-Messung wie oben.
**Offen: Thomas' iPhone-Urteil.**

**Gegner wachsen frueher, deutlich mehr Gegner ab Level 1**
(2026-08-22, Claude direkt, Thomas nach dem iPhone-Test: "Die mobs sind jetzt voll klein
und wachsen bis zu mir zur vollen Groesse - sollte schon frueher passieren - und es
sollen noch immer auch schon ab Level 1 mehr sein").
- **Groesse.** Bis hierher hing die Figurengroesse strikt an der Strassenbreite: 0,57 am
  Horizont, 1,00 auf Kampfhoehe, linear dazwischen. Jetzt zwei Regler in
  `road.perspective`: `horizonScale` 0,72 hebt die Ferngroesse an, `growthExponent` 0,55
  zieht das Wachstum nach vorne. **Gemessen** (390x844): auf einem Drittel der
  Anflugstrecke 0,855 statt 0,685, auf der Haelfte 0,911 statt 0,786; Kampfhoehe bleibt
  exakt 1,000, damit die ganze Hordengeometrie weiter stimmt.
  **Nebenwirkung, vom Test gefunden statt vom Auge:** Die Figur schrumpft nach oben jetzt
  langsamer als der Korridor und stand am Horizont mit der Schulter im Wandsegment
  (gemessen 0,35 px beim leichten, 5 px beim schweren Gegner). Die Spurwahl rechnet den
  Randabstand deshalb mit `getFigureOverscanFactor` - 1,31, und zwar abgetastet, nicht am
  Horizont abgelesen: Weil die Groesse gekruemmt waechst und der Korridor linear, sitzt
  das groesste Missverhaeltnis bei y = 182 und nicht am Horizont (dort waeren es 1,26).
  Der Aufschlag gilt nur fuer den Rand, nicht fuer die Abstaende zwischen Gegnern - dort
  wuerde er Spawn-Durchsatz kosten.
- **Menge, vierter Anlauf.** Die drei vorherigen haben Gruppengroesse, Deckel und
  Nachlaufpause angefasst und damit nur die oberen Level bewegt. Level 1 stand weiter bei
  1,75 s Takt und 30 % Hordenanteil. Die ganze Tabelle rechnet jetzt in **Gegnern je
  Sekunde** statt in Einzelreglern; die Kurve steigt ohne Delle (die alte fiel bei Level 5
  von 2,33 auf 1,90 zurueck, weil dort die erste 'row' mit fester Groesse vier dazukam).
  **Gemessen im Browser, Level 1, 10-s-Fenster der Dev-Metrik:**
  vorher 11 / 9 / 7 = **0,9 Gegner je Sekunde**, jetzt 25 / 21 / 42 / 47 / 54 / 44 =
  **3,9 im Schnitt, 4,7 am Ende der Rampe** - Faktor 4,3.
- **Grenze fuer den naechsten Anlauf:** Im selben Lauf stieg `deferred` von 0 auf 3-5 je
  10 s (bei 12-14 geplanten Ereignissen). Ab hier bremst nicht mehr der Takt, sondern die
  Spurvergabe. Wer weiter aufdreht, muss zuerst `spawnBands` oder `spawnLaneSafetyGap`
  anfassen, sonst verpuffen kuerzere Intervalle.
- **Befund, der noch eine Entscheidung braucht:** Mehr Nachschub fuellt das Bild nur so
  lange, wie er ueber der Abschussrate liegt. Im Messlauf (Truppe 2, DMG 1, RATE 3) sind
  das 6 Toetungen je Sekunde gegen 4,4 Spawns - die Strasse blieb trotz vervierfachtem
  Nachschub leer. Mit Thomas' iPhone-Werten (DMG 18,5, RATE 8) ist der Abstand noch
  groesser. Der naechste wirksame Hebel ist deshalb NICHT noch mehr Spawns, sondern eine
  **Schussreichweite**: Kugeln nur bis zu einer Hoehe fliegen lassen, damit sich Gegner
  oben sammeln und erst nah bekaempft werden. Das ist eine Produktentscheidung und wartet
  auf Thomas.
Nachweise: 146 Tests gruen (drei neue zur Perspektive), `npm run check` sauber,
Browser-Messung wie oben. **Offen: Thomas' iPhone-Urteil.**

**Rechte Wand auf Feuerkraft, Tore raus, SPD als Levelgroesse, HUD neu geordnet**
(2026-08-22, Claude direkt, Thomas: "ok fuer deine empfehlung, Feuerrate, schaden und
waffen, das muss dann aber auch den Toren in der mitte raus" + "tempo einfach mit den
leveln beschleunigen, kein seltenes tor daraus machen und dann aus dem HUD raus nehmen
und den rest logisch anordnen").
Die Oekonomie hat jetzt genau zwei Seiten und keine Mitte mehr:
- **LINKS = Masse.** Durchfahren, muehelos, aber weit weg vom Kampfgeschehen.
- **RECHTS = Feuerkraft.** JEDES Segment traegt einen Gewinn: Waffe (selten, mit
  Garantie nach Nieten), sonst je zur Haelfte Schaden oder Feuerrate. Der Preis ist
  Feuerzeit - waehrend man die Wand beschiesst, trifft man keine Gegner. Muenzen fallen
  jetzt bei JEDEM zerschossenen Segment ab statt als eigener Inhalt.
  Zugewinne aus dem Gegenstueck links hergeleitet: Ein "+1"-Plaettchen ist 1 von 30
  sichtbaren Figuren = 3,3 % der Spanne; dieselben 3,3 % auf Schaden (Spanne 19) und
  Feuerrate (Spanne 5) ergeben 0,63 und 0,17, gerundet auf 0,5 und 0,2.
- **Mittel-Tore vollstaendig entfernt**: `gates.ts`, `gateLanes.ts`, Gate-Textur,
  `gates`-Balance-Sektion, `pools.gateGroups`, `reserved.gateLanes` aus allen zwoelf
  Leveldefinitionen, `colors.gateBase` und zwei Testdateien. Kein Rest im Bundle.
- **SPD ist keine Ausbaugroesse mehr**, sondern eine reine Levelgroesse in `speed.ts`:
  105 x hardness, also 105 bei Level 1 und 157 bei Level 12 (Deckel 168). Nutzt die
  vorhandene Haertekurve, damit Gegnertempo, Spawn-Takt und Hordengroesse derselben
  Steigerung folgen statt drei eigenen.
- **HUD neu geordnet, zwei Reihen mit je einem Gedanken:**
  Reihe 1 "wo stehe ich?" TEAM | LEVEL | Muenzen.
  Reihe 2 "womit kaempfe ich?" Waffe | DMG | RATE - die Waffe links, weil sie Schaden
  und Feuerrate bestimmt. SPD ist raus: Der Spieler kann es nicht beeinflussen, also
  gehoert es nicht in eine Anzeige, die zeigt, was er sich erarbeitet hat.
**Gemessen** (25 s rechts an der Wand): Schaden 1 -> 8,5 | Feuerrate 3 -> 5,2 |
90 Muenzen | Waffenwechsel auf Laser. HUD-Spalten sitzen exakt auf den Dritteln
(73/195/317), `hud.speed` existiert nicht mehr, Gegnertempo Level 1 = 105.
**Zahl im Blick behalten:** 25 s Dauerbeschuss rechts geben +7,5 Schaden. Hochgerechnet
waere der Cap 20 nach gut einer Minute erreicht - real teilt man die Zeit mit Gegnern
und der linken Bahn, aber wenn es zu schnell geht, sind `walls.damageGain` und
`rateGain` die Stellschrauben.
Nachweise: 130 Tests gruen, `npm run check` sauber, Browser-Messung wie oben.
**Offen: Thomas' iPhone-Urteil.**

**Bugfix "Spieler verschwinden an der rechten Wand" + Tempo je Level fertig**
(2026-08-22, Claude direkt).
- **BUG (von Claude selbst eingebaut, von Thomas gemeldet):** "wenn ich mit meinen
  Spielern nach rechts in eine blaue Wand fahre verschwinden sie ploetzlich". Ursache:
  Fuer die Sammelbahn prueft die Truppenhuelle seit dem letzten Commit gegen die GANZE
  Wandgruppe. Eine beruehrte rechte Wand ist weder Reward noch Pickup und fiel deshalb
  bis zur Gegnerbehandlung durch. Sie hat kein `contactDamage` - der Trupp wurde auf
  NaN gesetzt und verschwand komplett. **Reproduziert und gemessen** (Wandsegment auf
  Truppenhoehe gezwungen): Truppe 20 -> null, sichtbare Figuren 0, im Protokoll steht
  `wall-segment-right` als Gegner. Fix: Wandsegmente vor der Gegnerbehandlung
  ausschliessen, plus zweite Sicherung in `handlePlayerHit` (kein Schaden ohne endliche
  Zahl). **Gegenprobe mit Vorhersage:** Echte Gegner muessen weiter Schaden machen -
  gemessen 4 erzwungene Kontakte, Truppe 20 -> 14. Regressionstest prueft die
  Reihenfolge der Abfragen im Kollisionshandler.
- **Tempo je Level** (Thomas: "die plus 1 waende muessen jedes Level ein wenig
  schneller werden"). Umgesetzt als Tempo der GANZEN Welt in `speed.ts`, nicht nur der
  Waende - dieselbe Wahl wie bei der Verlangsamung am selben Tag ("einfach alles
  langsamer"). Nur die Waende zu beschleunigen haette sie mit jedem Level weiter aus
  dem Takt mit Strasse, Haeusern und Muenzen laufen lassen.
  Hergeleitet aus zwei bekannten Punkten: 135 px/s ist abgenommen (Level 1), 180 px/s
  war "zu schnell". Level 12 zielt auf 175 -> Faktor 1,0238 je Level, harter Deckel 175.
  Alle fuenf Systeme lesen jetzt EINE Zahl; ein Test prueft, dass keines mehr die feste
  Grundgeschwindigkeit liest.
- **Betriebsvorfall dabei:** Der Pruefbrowser hing und blockierte Thomas' Bildschirm,
  weil eine Sperrdatei geloescht statt der Prozess beendet wurde. Aufgeraeumt, in
  `docs/lessons.md` und im zentralen Logbuch vermerkt.
Nachweise: 142 Tests gruen (neu `tests/levelSpeed.test.ts`), `npm run check` sauber,
Bug und Gegenprobe im Browser gemessen.
**Noch offen aus Thomas' Nachricht:** Rechte Wand auf Feuerkraft umbauen (Schaden,
Feuerrate, Waffen) und dann die Frage, was den Mittel-Toren bleibt.

**Deckendes Blau, weisse Schrift, Sammelbahn ohne Pausen fertig** (2026-08-22,
Claude direkt, Thomas: "beide waende in decken blau und weisser schrift und die linken
waende durchgehend ohne pausen").
- **Deckend statt halbtransparent** (`walls.fillAlpha` 0.4 -> 1). **Randbedingung, die
  mitgeloest werden musste:** Der Wandinhalt (Waffe, Muenze, "+1") lag hinter der Wand
  und schien durch - deckend waere er unsichtbar geworden. Er liegt jetzt VOR der Wand
  (`layers.wallContent` 1.5 -> 2.5, ueber `gameplay` 2).
- **Weisse Schrift auf beiden Seiten**: Der "+1"-Text war gruen (`STAT_COLORS.hp`).
- **Sammelbahn links durchgehend**: `isWallSlot` gilt nur noch rechts. Links ist die
  Bahn kein Hindernis, also braucht sie keine Ausweichluecke; rechts bleiben die
  Abschnitte, dort muss die Truppe zwischen Wand und Strassenrand ausweichen koennen.
**Gemessen** (20 s durchgehend links gefahren): 36 Plaettchen = **1,80 je Sekunde**
(vorher 1,10), gerechnet 1,875 (135 px/s / 72 px Kachel). Kachelabstaende links exakt
72 px ueber die ganze Kette - lueckenlos. Schrift `#ffffff`, Inhalt auf Tiefe 2,5 vor
der Wand auf Tiefe 2.
**Damit gewinnt eine Minute Dauerfahrt links jetzt 112 Figuren statt 67.** Ist das zu
viel, gehoert die Bremse an die Kette (Pausen wieder einfuehren), nicht an den Wert des
einzelnen Plaettchens - viele kleine Quittungen sind der Reiz.
Nachweise: 135 Tests gruen, `npm run check` sauber, Browser-Messung wie oben.
**Offen:** Thomas' iPhone-Urteil. **Offene Frage von Thomas: "was machen wir mit der
Logik der rechten Waende?"** - Empfehlung im Chat abgegeben (rechts = Feuerkraft gegen
Feuerzeit, als Gegenstueck zur Masse links), noch nicht entschieden.

**Sammelbahn links, Wand rechts, zwei Blautoene fertig** (2026-08-22, Claude direkt,
Thomas: "Waende in einem schoenen Blau links +1 ... und rechts in einem anderen blau",
Funktionsweise per Rueckfrage entschieden).
**Thomas' zwei Entscheidungen:** (1) Die +1-Kette wird DURCHFAHREN, nicht beschossen.
(2) Der Truppenzaehler laeuft ueber die sichtbaren 30 Figuren hinaus weiter, die
Ueberzahl ist Reserve.
Die Seiten sind damit grundsaetzlich verschieden statt zwei Varianten derselben Wand:
- **LINKS = Sammelbahn.** Jede Kachel ist ein "+1"-Plaettchen ohne Lebenspunkte, das
  man durch Beruehrung einloest. Kugeln fliegen wirkungslos durch (sonst schoesse man
  sich die eigene Verstaerkung weg), und die Plaettchen bremsen die Truppe nicht
  (`getWallPresence` ignoriert sie - wer einsammeln soll, muss hineinfahren duerfen).
- **RECHTS = Wand.** Zerschiessbare Segmente mit Lebenspunkten wie bisher, Waffen
  unregelmaessig darin, Rest Muenz-Segmente.
- **Reserve statt Deckel.** `stats.hp.cap` 30 -> 999. Vorher war bei 30 alles am
  Anschlag: nur 8 Figuren schiessen, der Schadensbonus deckelt bei 29 Figuren, und die
  Truppengroesse ist die Lebensanzeige - ein weiteres +1 bewirkte exakt nichts. Jetzt
  bleiben 30 sichtbar, der Rest rueckt nach, wenn eine faellt. Die Reserve kauft
  Ueberlebenszeit, keine Feuerkraft (Schadensbonus bleibt gedeckelt).
- **Zwei Blautoene** (`wall-segment-left` / `-right` statt einer Textur): links
  Kornblumenblau, rechts Royalblau. Der erste helle Ton wirkte halbtransparent ueber
  der grauen Strasse tuerkis statt blau und wurde nachgezogen.
- **Entfallen:** Die Verstaerkungs-Angebote der linken Wand (Operator "+4", "x1.5",
  zustandsabhaengig gezogen) samt `getReinforcementOffer` und deren Tests. Viele kleine
  Quittungen schlagen wenige grosse - Entscheidung nach dem Referenzvorbild.
**Gemessen im Browser** (20 s durchgehend links gefahren): 22 Plaettchen eingesammelt =
1,10 je Sekunde, gerechnet waren 1,125 (135 px/s / 72 px Kachel x 3/5 Wandanteil).
Truppe 2 -> 24. Ueber 45 s weiter: Zaehler 74, sichtbare Figuren konstant 30,
Schadensbonus konstant am Deckel 4, HUD zeigt "TEAM 74".
Wer die ganze Zeit links faehrt, gewinnt also rund 67 Figuren je Minute - und holt in
derselben Zeit rechts keine Waffe und schiesst kaum Gegner. Genau diese Abwaegung ist
der Zweck.
Nachweise: 133 Tests gruen, `npm run check` sauber, Browser-Messung wie oben.
**Offen: Thomas' iPhone-Urteil** - besonders, ob 1,1 Figuren je Sekunde zu viel ist.

**Optik Schritt 1 fertig: Bodenschatten und glatte Kanten** (2026-08-22, Claude direkt,
Thomas: "die Optik und das realistische Gefuehl ist mir wichtiger", nach zwei
Referenz-Screenshots aus einem 3D-Vorbild).
Befund aus dem Vorher-Screenshot: Im ganzen Spiel warf **nichts** einen Schatten -
Truppe, Gegner und Boss schwebten ueber der Strasse. Das ist der groesste
Einzelunterschied zu den Vorbildern. Zweiter Befund: `pixelArt: true` liess die
34x46-Figuren als harte Kloetzchen erscheinen, obwohl die grossen Vorlagen in
`assets/probe/` (136x184) beleuchtet und plastisch sind.
- **Bodenschatten** fuer Truppe, Gegner und Boss (`shadow`-Sektion in `balance.ts`,
  Textur in `BootScene`). Ein Schatten je Poolplatz, beim Aufbau erzeugt, nie zur
  Laufzeit. Die Textur sind gestaffelte Ellipsen statt eines Verlaufs -
  `fillGradientStyle` wirkt nicht ueber `generateTexture` (Lesson 2026-08-20).
- **Der Schatten bleibt am Boden, waehrend die Figur wippt**, und schrumpft mit der
  Hebung. Erst dadurch liest man das Laufwippen als Schritt statt als Zittern.
- **Blinken uebertraegt sich**: Nach einem Treffer blinkt die Truppe; ohne Kopplung
  waere ein Fleck auf der Strasse stehengeblieben.
- **`pixelArt: false`** (mit `roundPixels: false`): Gegner am Horizont sind jetzt als
  Figuren erkennbar statt als Kloetzchen. Das ist eine Geschmacksentscheidung und mit
  einer Zeile zuruecknehmbar - Kommentar steht in `main.ts`.
Gemessen im Browser: 14 von 14 Truppenschatten sichtbar, Position an den Fuessen
(23 px unter der Figurenmitte bei 46 px Figur), Groesse 25x8 px, Deckkraft 0,42.
**Nebenbefund:** In der dichten Formation (13-14 px Reihenabstand bei 46 px hohen
Figuren) verdecken die Figuren die Schatten der hinteren Reihen - sichtbar bleibt vor
allem die vorderste Reihe. Das ist physikalisch richtig und im Vorbild genauso.
Nachweise: 134 Tests gruen (neu `tests/shadow.test.ts`), `npm run check` sauber,
Vorher-Nachher-Screenshots verglichen.
**Offen: Thomas' iPhone-Urteil, besonders zu den glatten Kanten.**
**Naechste Optik-Schritte (nicht gebaut):** plastischere Sprites in doppelter
Aufloesung (Codex-Auftrag), Wandsegmente sehen als halbtransparente Rechtecke wie
Platzhalter aus, Horden-Masse deutlich groesser.

**W5 Boss ohne Schuss fertig** (2026-08-22, Claude direkt, Thomas: "zuerst den Ton und
den Boss ohne Schuss"). Umgesetzt nach `plan-v2.md`, Abschnitt "Boss V2".
- **Der Boss feuert nicht mehr.** Salvensystem komplett entfernt: `bossBurst.ts`
  geloescht, Projektil-Pool, Projektil-Textur, Farben, Boss-Projektil-Kollision,
  eigenes Unverwundbarkeitsfenster und alle `burst*`-Balance-Werte raus. Ein Test
  greppt `boss.ts` und `GameScene.ts` gegen jede Projektilspur - der Negativbefund
  ist damit belegt, nicht behauptet.
- **Druck aus gerufenen Horden statt Einzelbegleitern.** Der Boss ruft ganze
  Formationen des Levels (`spawnSquad` mit Boss-Markierung). Der Ruf-Takt ist aus dem
  Gegnerdruck der Normalphase hergeleitet: erwartete Gegner je Spawn-Ereignis geteilt
  durch das Spawn-Intervall am Ende der Rampe (gerechnet: 1,23/s bei Level 1, 20,22/s
  bei Level 12). Phase 1 haelt den halben Normaldruck, Phase 2 den vollen - denn
  anders als in der Normalphase muss der Spieler zusaetzlich den Boss beschiessen.
- **Deckel gleichzeitig gerufener Gegner: 16**, hergeleitet aus der Geometrie
  (2 x groesste Hordengroesse). Der erste Entwurf hatte 64 aus dem Pool hergeleitet
  und war unspielbar: bis zu 42 Gegner standen als geschlossene Wand vor dem Boss und
  fingen praktisch allen Beschuss ab. Dieselbe Kombination brauchte dann je nach Zufall
  29 s oder 109 s.
- **Kampfdauer-Grenzen neu**, weil die alten (15 s / 18 s bei Level 1) UNTER dem
  Zielfenster 20-40 s lagen - Level 1 konnte es konstruktiv nie erreichen. Jetzt
  20 s Untergrenze, 26 s bei Level 1, +0,545 s je Level (32 s bei Level 12).

**Messung (drei Wiederholungen je Fall, frische Szene je Lauf, Truppe weicht perfekt
aus):** L1 schwach 17,1-23,2 s | L1 stark 29,2-49,1 s | L6 schwach 21,5-23,6 s |
L6 stark 24,9-37,3 s | L12 schwach 18,2-24,8 s | L12 stark 28,1-49,4 s. Der Boss faellt
in allen 18 Laeufen.
**OFFENER BEFUND, bewusst nicht weggedreht:** Die Mediane liegen alle im Fenster
(19,2-39 s), die Einzellaeufe streuen aber 17-49 s. Ursache ist nicht die HP-Formel,
sondern der Schild: Wie lange der Kampf dauert, haengt davon ab, wie viele und welche
Gegner gerade zwischen Truppe und Boss stehen - und deren Typen werden gezogen. Das
Akzeptanzkriterium "alle sechs Messungen im Fenster" ist mit EINER Messung je Fall
erfuellbar, mit drei nicht. Weiter an den Lebenspunkten zu drehen wuerde den Zufall
nicht beseitigen, nur eine Messung schoenrechnen. Entscheidend ist Thomas' Urteil
"fordernd, aber schaffbar" am iPhone.
**Fuer W6 vorgemerkt:** `companionLimit` in der Leveltabelle ist seit dieser Etappe
tot (12 Eintraege plus Typ), ebenso die Umbenennung `blockers.ts` -> `Walls`.
Nachweise: 128 Tests gruen, `npm run check` sauber, Browser-Messungen wie oben.
**Offen: Thomas' iPhone-Urteil.**

**Ton fertig** (2026-08-22, Claude direkt, Thomas: "zuerst den Ton und den Boss ohne
Schuss"). Vorher gab es im Projekt KEIN Audio - kein AudioContext, keine Datei.
Gebaut: synthetischer Ton per Web Audio (keine Audiodateien, nichts nachzuladen,
offline identisch, keine Kosten), sieben Klaenge in `src/systems/audio.ts`, die
Drosselregel phaserfrei und testbar in `src/systems/audioPlan.ts`.
- **Klaenge:** Schuss (Rauschstoss + tiefer Koerper), Gegner faellt (Gleitton 420->140 Hz),
  Wandbruch (Rauschen 3200->260 Hz + Wuchtanteil), Verstaerkung auf/ab (Terz A5->Cis6
  bzw. A5->F5 - die Wandbelohnung kann die Truppe auch verkleinern), Waffenwechsel
  (C-Dur-Dreiklang), eigener Schaden (Absturz 200->55 Hz). Muenzen bewusst stumm -
  gleiche Entscheidung wie bei den Popups.
- **Ratenbremse statt fester Mindestpause.** Der erste Entwurf hatte eine feste Pause
  von 125 ms (= 1000 / shotsPerSec.cap). Der Test fand den Fehler: Trifft der
  Waffentakt nicht auf das Drosselraster, fallen Toene aus - die Minigun (17,6
  Salven/s) klang mit 5,9 Toenen/s LANGSAMER als die Standardwaffe mit 8. Jetzt eine
  Rate mit zwei Nachhol-Marken; gemessen 8,0/s fuer beide Waffen.
- **Stimmen-Deckel 6** fuer die haeufigen Toene (Splash toetet bis zu acht Gegner im
  selben Bild). Wandbruch, Schaden, Verstaerkung, Waffenwechsel umgehen ihn - sie
  duerfen nie im Schussgeraeusch untergehen.
- **iOS:** Freischaltung uebernimmt Phasers Sound-Manager (Nutzergeste); wird ein Ton
  vor der Freigabe angefordert, holt `play()` ihn nach dem `resume()` nach statt ihn
  verfallen zu lassen. Ton-Schalter im Menue rechts neben dem Kontostand (nicht im HUD:
  die ganze Spielflaeche ist Drag-Steuerung), Zustand in eigenem localStorage-Schluessel.
  **ACHTUNG beim Test:** Steht der seitliche Stummschalter des iPhones auf lautlos,
  spielt iOS auch Web Audio nicht ab - das ist Systemverhalten, kein Fehler.
Nachweise: 128 Tests gruen (neu `tests/audioPlan.test.ts`), `npm run check` sauber,
Browser-Lauf gemessen - AudioContext running/entsperrt, alle sieben Klaenge erzeugen
die geplanten Knoten, **Schall am Analyser gemessen**: Ruhe 0,000 / Wandbruch 0,290 /
stummgeschaltet 0,000. Menue-Schalter sitzt bei x=333 ohne Kollision mit dem Kontotext.
**Offen: Thomas' iPhone-Urteil.**

**Lebendigkeit (ohne Ton) fertig** (2026-08-22, Claude direkt). Thomas: „immer noch
nicht so wie in den App Store spielen — ich kann dir aber auch nicht sagen, woran es
liegt." Beim Nachsehen gefunden: Im ganzen Spiel bewegte sich nichts außer Positionen.
Kein Ton (keine Audio-Datei, kein Sound-Aufruf), keine Laufbewegung (Figuren sind
`add.image` ohne `anims` — sie *glitten* über die Straße), keine Kamerareaktion, keine
Tweens, keine Quittung beim Einsammeln. Trefferblitz an Gegnern gab es bereits
(`setTintFill`) — die erste Meldung an Thomas war da falsch und wurde korrigiert.
Thomas' Wahl aus drei Optionen: „Lebendigkeit zuerst, ohne Ton".
Gebaut (neu `src/systems/gamefeel.ts` als phaserfreie, testbare Rechnung):
- **Laufbewegung** für Truppe und Gegner: Wippen im Schrittrhythmus, Frequenz aus
  `scrollSpeed` und Schrittlänge abgeleitet statt geraten (3,3 Hz bei 135 px/s).
  Betrag statt Sinus — ein Läufer fällt und stößt sich ab. Taktversatz je Figur über
  den goldenen Winkel, damit die Truppe kein hüpfender Block ist.
- **Neigung beim Lenken** bis 9°, geglättet mit 90 ms Halbwertszeit
  (frameratenunabhängig). Die Kollisionshülle bleibt bewusst ruhig, sonst hinge
  Schaden am Zufall des Laufzyklus.
- **Quittungen** beim Einsammeln: hochfliegende Zahl mit Aufploppen (`popups.ts`,
  fester Pool 16) für Verstärkung (+N) und Waffenwechsel. Münzen bewusst ohne Popup —
  bei 3 Münzen je Segment wäre das Lärm statt Rückmeldung.
- **Kamerawackeln** nur bei Splash-Explosion und eigenem Schaden.
Nachweise: 119 Tests grün (neu `tests/gamefeel.test.ts`), `npm run check` sauber,
Browser-Lauf mit manuell getaktetem Crowd-Update gemessen (der Hintergrund-Tab wird
gedrosselt, deshalb nicht über die Spiel-Loop): Wippweite 2,98 px bei Sollwert 3,
6 Figuren auf 6 verschiedenen Höhen, Neigung 0 in Ruhe / −0,115 rad beim Lenken,
Hülle unverändert bei y=714, Popups steigen 600 → 585 px und räumen sich auf.
**Offen: Thomas' iPhone-Urteil. Ton ist bewusst noch nicht gebaut.**

**Wandhärte neu hergeleitet fertig** (2026-08-22, Claude direkt). Thomas: „immer noch
schwer was zu holen, speziell in weiteren Level, die Zahlen steigen zu schnell an."
Das alte Modell koppelte die Wand-HP 1:1 an die Feuerkraft — die Fokusdauer blieb über
den ganzen Run bei 0,70 s (Aufrüsten war gegen Wände folgenlos), und die Zahl hing an
der Waffe: bei Truppe 8 zwischen 4 (Minigun) und 71 (Schrot), im Vollausbau 1482.
Neu in `blockerPlan.ts`: Zielhärte aus Levelnummer und gedämpfter Truppengröße, die
Waffe geht gar nicht mehr ein (sie lässt die Wand schneller fallen statt mitwachsen),
plus harter Fokus-Deckel `blockers.maxFocusSec` 0,6 s für jede Kombination aus Level,
Truppe und Waffe. Verlauf jetzt 3 HP / 0,50 s (L1 Start) bis 254 HP / 0,12 s (L12
Vollausbau); Waffenwechsel bei Level 3 bewegt die Zahl nur noch zwischen 3 und 12.
Nebenbefund, nicht behoben: Minigun und Rakete feuern nur mit 3 Figuren
(`shootersPerSalvo`) und lagen ohne Deckel bei 1,25 s je Segment — schlechter als die
Standardwaffe. Der Deckel fängt das ab, die Waffenbalance selbst bleibt offen.

**W4-Nachbesserung „Tempo" fertig** (2026-08-22, Claude direkt, Thomas: „die Wände sind
zu schnell — mach die langsamer", Wahl aus drei Optionen: „einfach alles langsamer").
`scrollSpeed` 180 → 135 (−25 %): Eine Wand braucht 5,14 s statt 3,86 s durchs Bild.
Drei Werte mitgezogen, damit nur das Tempo sich ändert und nicht still die Balance:
- `scenery.spawnIntervalMs` 400 → 533 (Takt ist zeitbasiert; sonst rücken die Häuser
  enger zusammen und das abgenommene Stadtbild verdichtet sich)
- Goodie-Werte ×1,333 (`reinforcementChance` 0.12 → 0.16, `weaponChance` 0.08 → 0.107,
  `goodieMaxDry` 16 → 12), damit die Kadenz **pro Sekunde** bleibt (5,6 s / 8,3 s)
- `pools.coins` 48 → 64 (Münzen brauchen 6,25 s statt 4,69 s durchs Bild)
**Nicht behoben und bewusst so:** Wände fahren linear, Straße und Häuser perspektivisch —
am Horizont bleibt die Wand 5,1× schneller als die Kulisse. Das Verhältnis hängt nicht an
`scrollSpeed`; Thomas hat die Perspektiv-Kopplung als Option gesehen und abgewählt.
Gegner hängen nicht an `scrollSpeed`, das Kampftempo ist unverändert.
Nachweise: 103 Tests grün, Browser-Lauf gemessen — Wandtempo 135 px/s, 11 von 11
Segmenten getroffen, Goodie-Kadenz im erwarteten Bereich.

**W4-Nachbesserung „Wände treffen" fertig** (2026-08-22, Claude direkt, nach Thomas'
iPhone-Rückmeldung „voll schwer überhaupt Wände wegzubekommen am Anfang"). Ursache war
nicht die Härte der Wand, sondern Unerreichbarkeit: Der Fahrbereich endete auf Spuranteil
0,519, die Wandzone beginnt bei 0,660, und der starre Senkrechtschuss lief perspektivisch
aus der Wandzone heraus — das Segment direkt neben der Truppe war nicht beschießbar.
Zwei Änderungen, beide nötig (die erste allein traf gemessen gar nichts mehr):
1. **Spurtreue Flugbahn** (`BALANCE.projectile.laneFollow`, `weapons.ts`,
   `roadGeometry.getLaneRatio/getLaneSlope`): Jede Kugel behält ihren Anteil an der halben
   Straßenbreite über den ganzen Flug, statt senkrecht aus der Spur zu laufen.
2. **Fahrbereich bis an die Wand** (`roadGeometry.getDriveLimitHalfWidth`, `crowd.ts`,
   `BALANCE.walls.driveIntoWallFigures`): Der Anker darf bis Wandinnenkante + halbe
   Formationsbreite + halbe Figurenbreite, Straßenkante bleibt harte Grenze.
Nachweise: 103 Tests grün (neu `tests/wallHits.test.ts`), `npm run check` sauber,
Browser-Lauf gemessen — Segmente fallen von 4 auf 0 HP, Anker 329,1 wie berechnet,
Kugel-laneRatio 0,756 in der Wandzone, Neigung 5,8°. **Offen: Thomas' iPhone-Urteil.**

**W1–W4 sind maschinenseitig fertig** (2026-08-22, Claude direkt). W4: Dauerwände
beidseitig (lückenlose Kette, `chainAccumulatorPx`), Goodies unregelmäßig mit Garantie
(`reinforcementPlan.ts`: links Truppe mit Operator-Anzeige und Sofortwirkung, rechts
Waffen, Rest Münzen), Mittel-Tore nur noch DMG/RATE/SPD, Pool 20 hergeleitet.
Nachweise: 94 Tests grün (Property-Test fand und fixte den Rundungs-Randfall bei
Truppe 1), Browser-Sichtprüfung. **Offen: Thomas' iPhone-Urteil W1–W4** — danach W5
(Boss ohne Schuss, Stärke aus Spielerstand).

**W1–W3 sind maschinenseitig fertig** (2026-08-22, von Claude selbst auf Thomas'
Anweisung). W3: Horden laufen mittig (Spawn-Bänder in `balance.ts`, Dichteregel
`computeHordeOffsets` — stauchen statt verkleinern, Deckel 200 px unten hergeleitet),
Typenwahl vor Layout (leichte Keile stauchen dichter als Schwere), Horden ab Level 1,
squadChance je Level angehoben. Wände: orange, rund, halbtransparent, Inhalt sichtbar,
Überhang nach außen; Tore dauerhaft zweispurig (W4-Zielbild). Nachweise: 88 Tests grün
(neu: Dichteregel, Mittelband-Zentrierung 500 Züge, Budget-Deckel), Browser-Sicht-
prüfung. **Offen: Thomas' iPhone-Urteil W1–W3** — danach W4 (Seiten-Ökonomie).
