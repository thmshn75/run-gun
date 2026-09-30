# Plan V7 — "Run Gun 3D": V2 in echtem 3D neu bauen

**Status: VERBINDLICH seit 2026-09-29 (Thomas: "Freigabe").** Gehärtet mit /loopcheck und
/haerten (zwei Runden, je drei Gegenleser). `docs/plan-v6.md` ist Archiv; das 2D-V2
verschwindet aus dem Menü, sein Code bleibt bis zu Thomas' Löschfreigabe liegen.

## Warum es diesen Plan gibt

V2 in Phaser (2D) konnte das Vorbild nicht treffen: Tiefe, Licht und Tausende Figuren
mussten von Hand vorgetäuscht werden, jede Korrektur öffnete die nächste Baustelle
(`docs/lessons.md`, Einträge 2026-09-20). Das Vorbild ist ein echtes 3D-Spiel. Thomas hat
am 2026-09-29 entschieden: **V2 wird in 3D neu gebaut** — mit Three.js (kostenlos, MIT).

## Machbarkeit — am iPhone gemessen (2026-09-29, Thomas' Gerät, 390×659, Schärfe 2×)

Alle Testseiten liegen seit D2c unter `archiv/probe-3d/` (nicht mehr online, D2 abgenommen
2026-09-29: Worst Case 600 Zombies + 120 Soldaten + 2 Bosse + Wasser 55,2–55,8 fps / 24–25 ms, Dauertest 3 min bestanden).

| Testseite | Ergebnis |
|---|---|
| `index.html` — einfache Figuren 500–4000 | 60 fps; mit Echtzeit-Schatten 43 fps → **keine Echtzeit-Schatten** |
| `zombies.html` — Comic-Zombies, 7822 Dreiecke | 28–40 fps → **Figuren müssen vereinfacht werden** |
| `diagnose.html` — Comic-Zombies vereinfacht (1085 Dreiecke) + Truppe + Boss | 56 fps, 21 ms |
| `diagnose2/3.html` — gewählte realistische Figuren, Oberfläche wie geliefert | 48 fps, 29 ms (1000 Zombies) |
| `farbe.html`, `farbe2.html` — Oberflächen-Varianten, einzeln und als Instanzen | alle bemalt → weder Oberfläche noch Instanzen noch Materialwechsel verursachen das Schwarz |
| `diagnose6.html` — 62 Bemalungen à 1024 px inkl. Relief-/Glanzkarten | am iPhone erst hell, dann dunkel, dann **Absturz** → Grafikspeicher voll |
| **`diagnose7.html` — Bemalung 512 px, Massenfiguren nur Farbbild, Bosse Farb- + Reliefbild (17 Bemalungen ≈ 19 MB)** | **1000 Zombies + 60 Soldaten + 2 Bosse: 57 fps, 22 ms, 0 % schwarz, kein Absturz**; 1500: 55 fps; 2000: 52 fps |
| `bewegung.html` — Bewegungsübertragung auf den Soldaten | funktioniert (Joggen, Gehen, Zielen, Schießen, Umfallen), 13 ms Umrechnung |

**D0 abgenommen (2026-09-29):** im echten Spiel am iPhone leere Szene 59,9 fps / 17 ms;
Platzhalter-Vollast (1500 × ~1000 + 150 × ~5000 Dreiecke) 53,8 fps / 25 ms; Renderflächen
9,77 MB, Phaser-Rest 18,65 MB (Schätzungen); Offline-Start im Flugmodus geht.

**Befund, der alles erklärt:** Die schwarzen Figuren in Diagnose 3–6 waren kein
Darstellungsfehler, sondern der **volle Grafikspeicher** des iPhones: Safari wirft zuerst
Bemalungen hinaus (Figuren werden dunkel) und beendet dann die Seite. Die Seite prüft seit
Diagnose 6 selbst per Bildpunkt-Auslesung, ob Figuren schwarz sind; die Erkennung ist mit
absichtlich geschwärzten Figuren gegengeprüft (82 % statt 0 %).

**Folgerungen, die als Regeln gelten:**
1. Massenfiguren (Zombies, Soldaten) nur **vereinfacht (Zombie ≈ 1000 Dreiecke, Soldat
   ≈ 5100)**, einseitig gezeichnet, Bewegung in 8 Einzelbilder gebacken, gezeichnet als
   Instanzen. Echte Skelett-Figuren nur für Bosse und Fahrzeuge (wenige). Zu stark
   vereinfachte Modelle bekommen Löcher (Soldat mit 3761 Dreiecken) — jede Vereinfachung
   wird aus der Nähe angesehen.
2. **Grafikspeicher-Budget: höchstens 60 MB Bemalung** (gemessen 19 MB für die Spielszene).
   Bemalungen 512 px; Massenfiguren nur Farbbild; Bosse und Fahrzeuge Farb- und
   Reliefbild; keine Glanz-, Spiegel- oder Verdeckungskarten. Der Messmodus zeigt den
   geschätzten Grafikspeicher an.
3. **Keine Echtzeit-Schatten.** Wo nötig: dunkler Fleck unter der Figur.
4. **Sichtbar höchstens 600 Zombies und 120 Soldaten** (Straße in drei Streifen, Horde nur in der
   Mitte 6,8 m; davor 800: (Stand D2a: Figuren 1,5× größer, echte
   Zombies 1200 = 52–53 fps am iPhone; davor: (gesenkt nach D0: Platzhalter-
   Vollast 1500 + 150 im echten Spiel mit schlafendem Phaser 53,8 fps / 25 ms, knapp
   unter der Grenze); alles darüber läuft nur als Zahl im Rechenkern. D2c prüft mit echten
   Figuren; Reserve: Schärfe 1,5× fest beim Start (gemessen +3 fps).
5. **Leistungsbudget** gilt für jeden Schritt (Randbedingung 7), inklusive Schwarz-Prüfung.

## Thomas' Entscheidungen (2026-09-29)

| Frage | Entscheidung |
|---|---|
| Technik | Echtes 3D mit Three.js |
| Soldat | "Soldier Full Tactical Gear" (Sketchfab, DanlyVostok, CC-BY 4.0), einheitlich **komplett in Coyote-Farbe** (Thomas nach D2b; Kleidung, Weste, Taschen, Helm, Stiefel) mit SOCOM-Helm |
| Bewaffnung | Alle Soldaten dasselbe Gewehr: **M4** (Sketchfab "Assault rifle M4A1", CC-BY), an der rechten Hand befestigt. Keine Waffenwechsel, keine Stärke-Upgrades. |
| Zombie | "Zombie Walk Test" (Sketchfab, OSCAR CREATIVO, CC-BY 4.0), realistisch. Abwechslung über von Codex gemalte Bemalungs-Varianten und leicht verschiedene Größen. |
| Mini-Boss | "Nightmare Creature 1#" (Sketchfab, Rodolfoisreal1423, CC-BY 4.0), 22 eigene Bewegungen |
| Elite-Endboss | "Mutant Golem" (Sketchfab, Vasian-Digital3D, CC-BY 4.0), eine lange Bewegungsaufnahme |
| Bewegungen Soldat | Quaternius "Universal Animation Library" (CC0), im Browser auf den Soldaten übertragen |
| Umgebung | Wasser, aber viel realistischer als bisher |
| Eigene Truppe | Geordnete Reihen |
| Horde | Marschiert heran, in Wellen, Mini-Bosse marschieren mit |
| Ablauf der Truppe | Die Truppe unten schickt laufend Soldaten los; sie laufen durch eine **Vervielfacher-Wand** (×2 o. ä., wie im 2D-V2) und marschieren zur Front |
| Kampf | **Kein Fernkampf.** Erst an der Front wird gekämpft; dort schießen die Soldaten auf kurze Distanz (Mündungsfeuer) |
| Linker Rand | +1-Schilder: Hinsteuern sammelt Figuren |
| Rechter Rand | **Säulen mit Zähler.** Hinsteuern → die ausgeschickten Soldaten bauen den Zähler ab (und fehlen solange an der Front). Fällt die Säule, wird eine Spezialeinheit frei |
| Spezialeinheiten | Panzer (walzt eine Schneise), Haubitze (Flächenschlag), Hubschrauber (kreist und feuert, v. a. gegen Bosse), Humvee mit MG (fährt mit, länger, schwächer). Modelle: Sketchfab CC-BY (Abrams, Panzerhaubitze 2000, Apache/Hind, Humvee) — Auswahl vor D5 mit Thomas |
| **Einsatz der Fahrzeuge (Thomas 2026-09-30)** | Modelle gewählt: Humvee "Low Poly Humvee vehicle" (Duane's Mind), Panzer "AMX-56 Low Poly" (Waroxed), Haubitze "M144 155mm Howitzer" (Cyan_dev10), Hubschrauber "Low Poly Apache Gunship" (Duane's Mind), alle CC-BY. **Humvee** fährt bis zur Hälfte der Strecke (Wand → Front) und schießt dann auf die Horde. **Haubitze** bleibt direkt hinter der ×2-Wand stehen und feuert. **Panzer** hält direkt nach der Wand und feuert, fährt zur Hälfte und feuert erneut, danach walzt er eine Schneise in die Horde. **Hubschrauber** kreist über der Horde und feuert. Alle feuern nur eine begrenzte Zeit. **Nachtrag 15:45:** Panzer und Haubitze tauchen in der Mitte der Fahrbahn auf und schießen je einmal in die linke und einmal in die rechte Hälfte der Horde, mit sichtbarem Einschlag (Treffer verschwinden an der Einschlagstelle); die Haubitze ist kleiner, feuert 2× und fährt danach wieder aus dem Bild; +1-Schilder beim Hinsteuern mindestens 25 % schneller. Folge für D5b/c: Die Zeitplanung in `SPEZIAL` (Rechenkern) wird an diese Abläufe angepasst (Anfahrt ohne Wirkung, Panzer in drei Phasen), die Gesamtwirkung je Einheit bleibt gleich (Bot-Nachweis ±5 %) |
| Ende | Mini-Bosse unterwegs, am Ende Elite-Endboss |
| Umfang | Mehrere Level mit steigender Schwierigkeit |
| **Mechanik neu (Thomas 2026-09-29, nach D3)** | Die Truppe `T` ist ein **Vorrat**: **Links** +1 sammeln — kein Aussenden, kein Schießen. **Mitte** — die Truppe strömt als **Welle** los (Aussenden zieht von `T` ab), durch die ×2-Wand zur Front; geschossen wird erst **hinter der Wand**. **Rechts** — die Truppe **schießt vom Platz auf die Säule** (Zähler sinkt, abhängig von `T`), kein Aussenden, keine Soldaten verbraucht, kostet nur Zeit. Die ×2-Wand bleibt (Claude: Welle 40 → 80 ist der Belohnungsmoment) und wächst im Lauf (B). Vorab-Simulation (Claude): nur-abziehen-ohne-Sperre wäre sinnlos (dauernd links bleiben gewinnt); mit Sperre gewinnt der Rhythmus sammeln→senden 17/20 bei ~8/s Sammeln und ~8/s Senden, passiv und nur-links verlieren |
| Straße (nach D2a) | Drei Streifen mit niedriger Betonkante ab der ×2-Wand: links +1, Mitte Kampffeld (Horde nur hier), rechts Säulen. ×2-Wand nur über die Mitte. **Vervielfacher wächst im Lauf (Thomas 2026-09-29, Variante B):** die Wand zählt die durchlaufenden Soldaten und steigt stufenweise (Richtwert alle 100 Soldaten +1) bis zu einer Obergrenze; Stufe und Obergrenze kalibriert Claude in R2 mit den Bots |
| Größen (nach D2a) | Zombies 1,5× (≈ 1,95 m), +1-Schilder und ×2-Wand 2×. **Eigene Soldaten mindestens so groß wie die Zombies** — auch wenn die Horde nach vorne kommt, wirken Zombies nie größer als die Truppe |

## Modellbeschaffung und Lizenzen

- **Quellen:** nur CC0 oder CC-BY, keine Figuren fremder Spiele oder Filme. Lizenzprüfung
  über `api.sketchfab.com/v3/models/<uid>`.
- **Download:** Claude lädt vor dem jeweiligen Schritt über Thomas' angemeldete
  Sketchfab-Sitzung (Codex kann das nicht). Rohdateien (Archive, große Quellen) liegen außerhalb des Repos unter
  `~/Downloads/rungun-roh/`. **Kleine vorbereitete Quellen** (vereinfachte Modelle, ≤ ca. 6 MB je
  Datei, samt Lizenztext) liegen seit D2a unter `modelle-quelle/` im Repo, damit
  `scripts/modelle.mjs` wiederholbar ist.
- **Lizenzbeleg:** `docs/lizenzen.md` führt je Modell Titel, Urheber, Sketchfab-Link,
  Lizenz mit Link, Datum der API-Prüfung und **"Änderungen: vereinfacht, verkleinert,
  neu bemalt, Bewegung übertragen"** (CC-BY verlangt den Änderungshinweis). Quaternius-
  Bewegungen (CC0) werden trotzdem mit Quelle genannt. Eintrag **bevor** ein Modell unter
  `src/` landet.
- **Info-Bildschirm** im 3D-Modus zeigt denselben Inhalt (eine Quelle, zwei Anzeigen).
- **Testseiten:** `public/probe-3d/` enthält schon Sketchfab-Modelle; sie bekommen sofort
  eine `LIZENZEN.md` mit Namensnennung und werden nach Abnahme von D2c aus dem Deploy
  genommen.

## Unverhandelbare Randbedingungen

1. **Bestehendes Spiel bleibt unverändert** — Run, Probelauf, Torlauf, Testgelände, Shop,
   Erworbenes, Spielstand. **Erlaubte Änderungen außerhalb von `src/v3d/`, abschließend:**
   Menüknopf "RUN GUN V2" → "RUN GUN 3D" (Thomas: "wir ersetzen V2"); Nachlade-Einstieg
   in `MenuScene`; `package.json`/Lockfile (`three`; ab D2a zusätzlich reine Werkzeug-`devDependencies` für
   `scripts/modelle.mjs`: `@gltf-transform/*`, `meshoptimizer`, `sharp` — nie im Spiel-Code); `vite.config.ts` (Service-Worker-
   Regeln, s. 4). **Ab D3:** `src/main.ts` — nur Aufschub des Service-Worker-Neuladens, solange der
   3D-Modus aktiv ist (globales Flag, kein Import aus `src/v3d/`). Jede dieser Änderungen braucht einen Regressionsnachweis: Offline-Start
   des bestehenden Spiels im Flugmodus, Größe des Hauptbündels vorher/nachher (darf nicht
   wachsen), bestehende Tests grün.
2. **Eigener Code-Bereich `src/v3d/`**, keine Imports aus `src/systems/`, `src/config/`,
   `src/v2/`. Ein Test sichert das ab.
3. **Zwei Grafik-Welten sauber trennen:** Beim Start des 3D-Modus wird Phaser schlafen
   gelegt (Spielschleife aus, Zeichenfläche ausgeblendet); **der Three.js-Renderer wird
   einmal angelegt und bei jedem weiteren Start wiederverwendet** (keine neue
   Zeichenfläche je Start). Phasers Grafikspeicher bleibt liegen und zählt ins Budget —
   D0 misst ihn. Beim Zurück: Szene freigeben, Renderer behalten, Phaser wecken.
   **Kontextverlust und Unterbrechung:** `webglcontextlost` → Lauf pausieren, nach
   `restored` Ressourcen neu aufbauen oder sauber ins Menü; `visibilitychange`
   (Sperrbildschirm, Anruf, App-Wechsel) → Lauf pausieren.
4. **Offline, kostenlos, keine Anfragen nach außen:**
   - **Alle 3D-Dateien kommen in den normalen Vorab-Cache des Service Workers** (Code-
     Baustein, `.glb`, `.webp`), genau wie das übrige Spiel. Damit übernimmt Workbox
     Versionierung, "alles oder nichts" und das Aufräumen alter Stände. Bewusst in Kauf
     genommen: Installation und Updates laden einmalig bis zu 25 MB mehr. (Runde 2 der
     Härtung: ein eigener Laufzeit-Cache hätte halbe Downloads, Mischstände nach Updates
     und Endlos-Fehlermeldungen offline erzeugt.)
   - `vite.config.ts`: `globPatterns` um `glb,webp` ergänzen, `globIgnores: ['probe-3d/**']`,
     `maximumFileSizeToCacheInBytes` auf 10 MB. **Build-Test:** liest das Precache-
     Manifest aus `dist/sw.js`, summiert alle 3D-Dateien (Muster `v3d`) — höchstens 25 MB,
     keine Datei aus `probe-3d`.
   - `navigator.storage.persist()` beim ersten 3D-Start anfragen (Ergebnis nur Hinweis).
   - **Lade-Gate:** Vor Laufbeginn sind alle Dateien des Levels geladen; im Lauf kein
     `fetch` und kein Nachladen. Der Knopf "RUN GUN 3D" prüft vorher, ob die Dateien im
     Cache liegen; fehlen sie und es gibt kein Netz, zeigt er "Netz nötig – 3D-Dateien
     fehlen" statt einer leeren Fläche. Schlägt das Nachladen des Bausteins fehl, dieselbe
     Meldung; das bestehende Spiel läuft weiter.
   - Ein Test schreibt alle Netzanfragen eines 3D-Laufs mit: nur `location.origin`,
     sonst Fehlschlag. Kein Beispielcode mit fremden Adressen (Three.js-Wasser lädt
     sonst `waternormals.jpg` von außen) — alle Bilder lokal.
   - Die Zeichenfläche wird aus `src/v3d/` heraus angelegt und gestylt; `index.html` und
     `style.css` bleiben unverändert.
5. **Zweiter Start:** Menü → 3D → Menü → 3D, danach `renderer.info.memory.geometries` und
   `.textures` **exakt gleich** wie nach dem ersten Start. Zusätzlich einmal
   Menü → 3D-Vollast → Menü → Run → 3D ohne Absturz.
6. **iPhone-Werte nicht neu erfinden:** Safe-Area-Ränder und Touch-Verhalten aus dem
   bestehenden Code ablesen und als Zahlen nach `src/v3d/balance3d.ts` kopieren.
7. **Messmodus und Leistungsbudget** (`src/v3d/messung.ts`, übernommen aus
   `diagnose7.html`, eine Quelle): Aufruf `?messung=1`, 5 s Aufwärmen, je Stufe 30 s,
   Anzeige Schnitt-fps, langsamste 5 %, Schwarz-Anteil (Funktion `helligkeit()` aus
   diagnose7: 41×41 Bildpunkte um die Mitte der Zombie-Masse, Schwelle Helligkeit < 30)
   und **Speicherplan** (Tabelle: Bemalungen als Σ Breite×Höhe×4×4/3 ohne Doppelzählung,
   Renderflächen je Fläche Breite×Höhe×Schärfe²×4, inkl. Wasser-Spiegelung; Phaser-Rest
   als in D0 gemessene Konstante in `balance3d.ts`). Ohne Zombie-Masse misst
   `helligkeit()` die Mitte der sichtbaren Figurengruppe (Truppe, Boss, Fahrzeug); ist
   keine Figur sichtbar, entfällt das Kriterium ausdrücklich. **Grenze auf Thomas' iPhone
   (390×659, Schärfe 2×): Schnitt ≥ 55 fps, langsamste 5 % ≤ 25 ms, Schwarz ≤ 10 %,
   Speicherplan ≤ 60 MB.** Bei D2c und D5c zusätzlich **Dauertest 3 Minuten** Vollausbau
   ohne Absturz (Wärme). Vor jedem iPhone-Test läuft eine Desktop-Vorprüfung durch Codex
   (Build, Tests, Bilanz, Zweitstart, Netzanfragen) — Thomas bekommt nur den einen Blick.
8. **Modelle werden vor dem Einbau aufbereitet** (`scripts/modelle.mjs`, gltf-transform):
   Bemalung 512 px, WebP, vereinfachen, Material-Umwandlung; jede Vereinfachung wird mit
   einem Nahaufnahme-Bild geprüft (Löcher?). Ergebnis unter `src/v3d/modelle/`.
9. Codex erzeugt Bemalungen und Bilder (Tarnmuster, Zombie-Varianten, Wasser-Normalen,
   Schilder) mit seinem Bildwerkzeug.
10. **Die Spielrechnung ist ein reiner Rechenkern** (`src/v3d/rechnung.ts`, ohne
    Three.js), die Figuren stellen ihn nur dar. Keine Einzelkampf-Logik je Figur.
11. **Level-Speicher:** eigener Schlüssel mit Vorsatz `rg3d.` und Versionsfeld, Lesen nur
    mit `try/catch`; kaputter oder fehlender Eintrag = Level 1, nie Absturz. Ein Test
    prüft, dass der bestehende Spielstand vor und nach 3D-Nutzung byte-gleich ist.

## Spielrechnung (Startwerte; Claude kalibriert in R und D7, Codex ändert keine Formel)

**Zustände:** Truppe `T` (Quelle unten, wird **nicht** verbraucht); `U` Soldaten
unterwegs zur Front; `S` Soldaten unterwegs zur Säule; `F` Soldaten an der Front;
`Z` Zombies im Feld (in Wellen); Frontlage `y` (Meter vor der Truppe); Säulenzähler `P`;
Boss-Lebenspunkte `B_mini`, `B_elite`. Bahnkoordinate `x` der Truppe von −1 (links) bis +1.

| Vorgang | Regel (Startwert) |
|---|---|
| Aussenden | `r = 2 + 0,1·T` Soldaten/s. Truppe bei `x > +0,6`: neue Soldaten gehen nach `S`, sonst nach `U`; bereits laufende bleiben, wo sie sind. Harte Schwelle, keine Verzögerung |
| Vervielfacher-Wand | 5 m vor der Truppe, Faktor `k` je Level (Level 1: ×2); jeder Soldat (auch zur Säule) wird beim Durchlaufen zu `k` Soldaten |
| Laufen | 6 m/s; Ankunft an der Front nach `(y − 5)/6` s → `U` wird zu `F`; Ankunft an der Säule (feste Lage 12 m) → `P −= 1`, Soldat verschwindet |
| +1 (links) | Truppe bei `x < −0,6`: `T` steigt um 2/s. Die Schilder sind Darstellung, gezählt wird im Rechenkern |
| Horde | Level 1: 600 Zombies in 3 Wellen à 200, Abstand 20 s, Start bei `y = 60 m`, Marsch 0,8 m/s. Mini-Boss mit Welle 2, Elite-Boss nach der letzten Welle |
| Front | **Korrigiert nach Nachrechnung (2026-09-29):** Soldaten im Kontakt `K = min(F, 40)`, Zombie-Druck `Zk = min(Z, 40) + 25·Bosse`. Zombies fallen `0,5·K`/s, Soldaten `0,4·min(Zk, 2·K)`/s (gefallene Soldaten sind weg, `T` unverändert). **Nach Kontakt ersetzt die Verschiebung den Marsch:** `dy/dt = 0,5·(K−Zk)/(K+Zk)` m/s; ohne Soldaten an der Front marschiert die Horde. Vorab-Simulation: passiv verliert 20/20, Strategie gewinnt 20/20, je ~140 s |
| Bosse | nehmen Schaden wie 25 Zombies (`B −= 25` je "gefallenem" Anteil); Mini 400, Elite 3000 |
| Niederlage | `y ≤ 0` (Horde erreicht die Truppe) |
| Sieg | `B_elite = 0`; sind vorher alle Zombies gefallen, marschiert der Elite-Boss allein |
| Säulen-Reihenfolge | Level 1: Humvee → Panzer → Haubitze → Hubschrauber, `P = 150` je Säule |
| Panzer | 4 s, 1,5 m breite Schneise: 40 Zombies/s |
| Haubitze | 3 Einschläge im Abstand 1 s, je 60 Zombies (Radius 2 m) |
| Hubschrauber | 12 s, 15 Zombies/s, gegen Bosse 25 Punkte/s |
| Humvee mit MG | 30 s, 4 Zombies/s |
| Level 1 Start | `T0 = 10` |

Die Bot-Ziele (passiv verliert, Strategie gewinnt) sind **Kalibrierziele für Claude**:
Angepasst werden nur `T0`, Hordengröße, `k` und `P` in der Level-Tabelle, nie die
Formeln. **Bilanz als Invariante über ein Ereignisprotokoll:** Jedes Aussenden,
Vervielfachen, Ankommen, Einsammeln, Fallen und jede Spezialwirkung ist ein Ereignis;
Test: Summe der Ereignisse = Änderung der Zähler, in jedem Schritt.

## Schrittfolge

Jeder Schritt ist **eine** Spec in `docs/active-task.md`, **ein** Codex-Lauf im Terminal,
Review durch Claude, ein Commit, Desktop-Vorprüfung, dann **ein** iPhone-Foto von Thomas.
Erst danach der nächste Schritt. **Reihenfolge (ab 2026-09-29):** D0 → R1 → D1 → D2a → D2b → D2c → D3 →
R2 → D3-Anpassung → D4 → D5a → D5b → D5c → D6 → D7 → D8. R1 ist harte Voraussetzung für D3. Gamefeel gilt erst nach Thomas' Test am iPhone.

**D0 — Fundament.** npm `three`; `src/v3d/` mit Einstieg; Menüknopf "RUN GUN 3D" statt
"RUN GUN V2"; Nachladen mit Fehlerbild; Phaser schlafen/wecken; einmaliger Renderer;
Kontextverlust/Unterbrechung; Service-Worker-Regeln (Randbedingung 4); Messmodus mit
Speicherplan; Level-Speicher; Info-Bildschirm aus `docs/lizenzen.md`; Tests für
Isolation, Netzanfragen, Spielstand, Zweitstart. **Vollast-Test mit Platzhaltern** (nur im Messmodus: 1500
Instanz-Körper à ~1000 Dreiecke, 150 à ~5000, 512-px-Testbemalung) im echten Spiel mit
Phaser im Hintergrund; misst den Phaser-Rest. Nachweise: Platzhalter-Vollast im Budget; Offline-Start im Flugmodus (bestehendes Spiel und 3D); Hauptbündel nicht
gewachsen.

**D1 — Bahn, Kamera, Wasser. VISUELLER SCHLÜSSELSCHRITT.** Vorher legt Claude 3–5
Standbilder aus dem Vorbildvideo (`~/Downloads/111.mov`, `112.mov`) mit Zeitmarke unter
`docs/vorbild/` ab und schreibt die Kamera als Zahlen in die Spec (Höhe, Neigung,
Sichtfeld, Abstand) sowie Zielmaße (Horizonthöhe, Straßenbreite unten/oben in Bildpunkten).
**Thomas 2026-09-29: Die Straße darf hinten deutlich breiter sein – Perspektive bleibt,
aber breiter** (Zielmaß Straßenbreite oben entsprechend setzen). Wasser als Schalter `?wasser=0|1`, Messung mit und ohne; **Stufe 1:** Normalkarte ohne
Spiegelung (billig), **Stufe 2:** mit Spiegelung in halber Auflösung — Stufe 2 nur, wenn
sie im Budget bleibt. Nachweise: Maße gegen Zielmaße; Bildvergleich neben den Standbildern
(Freigabe durch Thomas); Leistung mit Wasser im Budget.

**R1 — Rechenkern Grundspiel (kein 3D).** `src/v3d/rechnung.ts` nach der Spielrechnung
ohne Spezialeinheiten: Aussenden, Wand, +1, Säulenabbau, Horde/Wellen, Front, Bosse,
Sieg/Niederlage, Level-1-Tabelle, Ereignisprotokoll, Zufall über Startwert (Seed). Bots in
Vitest/Node: **passiv** (Truppe bleibt mittig) und **Strategie** (feste Regel: links
sammeln bis T ≥ 30, dann rechts bis die erste Säule fällt, dann Mitte). Nachweise:
Bilanz-Invariante in 1000 Zufallsläufen; Randfälle getestet (`F + Zk = 0`, alle Zombies
gefallen vor dem Elite-Boss); Kalibrierung durch Claude: passiv verliert Level 1 in 20/20
Seeds, Strategie gewinnt in ≥ 15/20.

**D2a — Zombie-Masse.** Aufbereitungs-Skript, Lade-/Backmodul, Instanz-Zeichnung,
Bemalungs-Varianten. Nachweise: Nahaufnahme-Bild der vereinfachten Figur (Thomas gibt
frei); 1200 sichtbare Zombies im Budget (Grenze nach D0).

**D2b — Soldat.** Bewegungsübertragung (Verfahren aus `bewegung.html`, plus Hüfthöhe),
M4 an der rechten Hand, Tarnmuster, Truppe in Reihen. Nachweise: M4-Griffpunkt höchstens
3 cm von der Handwurzel in drei Posen; beim Umfallen liegt der Körper auf dem Boden (tiefster Punkt 0 ± 3 cm), Hüfte im letzten
Bild höchstens 35 cm (mit Weste gemessen ~30 cm; ursprünglich 15 cm geschätzt); Sichtprüfung durch Thomas.
**Reißleine D2b:** Sieht die übertragene Bewegung nach **einem** Anlauf nicht überzeugend
aus, kein Weiterbohren — Rückfall auf einen Soldaten in fester Anschlag-Pose mit
Schrittwippen, und Thomas entscheidet.

**D2c — Bosse und Gesamtmessung.** Mini-Boss und Elite-Boss als Skelett-Figuren (Kosten
einzeln gemessen), dann **Worst Case:** 1200 Zombies + 120 Soldaten + 2 Bosse + Wasser.
Nachweise: Budget, Dauertest 3 Minuten. Danach `public/probe-3d/` aus dem Deploy nehmen.

**D3 — Steuerung, Aussenden, linker Rand.** **+1-Schilder (Thomas 2026-09-29):** Die Schilder laufen der Truppe im linken Streifen entgegen, langsam, solange die Truppe nicht dort ist, und **schneller, sobald die Truppe hinsteuert**; jedes Schild, das die Truppe erreicht, ist ein +1 (Tempo so, dass die Rate der Spielrechnung entspricht: 2/s bei 4 m Abstand → 8 m/s; Schilder schweben ohne Pfosten). **Säulen** sind aus Glas, die Spezialeinheit ist darin sichtbar (D5a). Steuerung absolut zum Finger (Truppe folgt
der Fingerposition, geglättet, höchstens 8 m/s — **ab 2026-09-30 24 m/s** (Thomas: Truppe reagierte zu träge), Grenzen = Bahnrand minus halbe
Truppenbreite), Zurück-Knopf mit eigener Tippfläche außerhalb der Steuerfläche,
Aussenden nach `r`, Vervielfacher-Wand, +1-Schilder — alles aus dem Rechenkern R.
Nachweise: 10 s Aussenden, gezählte Soldaten ±10 % zur Formel; am linken Rand steigt T,
in der Mitte nicht.

**D4 — Horde und Front. MECHANISCHER SCHLÜSSELSCHRITT.** Wellen, mitmarschierende
Mini-Bosse, Front nach dem Rechenkern, Mündungsfeuer und fallende Zombies an der Front.
Nachweise: Ereignisprotokoll-Invariante im laufenden Spiel; Bildvergleich; Thomas-Test.

**R2 — Rechenkern neue Mechanik + Spezialeinheiten (vorgezogen vor D4, Thomas 2026-09-29).** Vorrat-Mechanik (Zeile "Mechanik neu"), Säule per Beschuss von rechts, Vervielfacher wächst (B), dann die Spezialeinheiten; Bots neu (passiv, nur-links, Rhythmus, Rhythmus+Säule) und Kalibrierung durch Claude; danach D3-Darstellung anpassen (Welle statt Strom, Schuss auf Säule). Ursprünglicher Text:  Die vier Einheiten nach der Tabelle im Rechenkern,
Bot-Test mit und ohne Einheit (Differenz gleich der Tabelle ±5 %).

**D5a — Säulen.** Säulen mit Zähler, Abbau durch Hinsteuern. **Vorher:** Claude legt die
Fahrzeug-Tabelle vor (Kandidat, Dreiecke, Bemalungsgröße, Lizenz), Thomas wählt.
**D5b — Panzer und Haubitze. D5c — Hubschrauber und Humvee** (inkl. Dauertest 3 Minuten).
Nachweise je Einheit: Rechenkern-Test mit/ohne Einheit, Differenz gleich der Tabelle
(±5 %); Leistung im Budget, während zwei Einheiten gleichzeitig wirken.

**D6 — Elite-Endboss, Sieg und Niederlage.** Nachweis: beide Ausgänge je einmal im
Spiel und im Bot-Lauf.

**D7 — Level.** Level-Tabelle (Hordengröße, Wellen, Mini-Bosse, `k`, `P`,
Säulen-Reihenfolge) in `balance3d.ts`, Level-Speicher. Nachweis je Level: passiv verliert
20/20 Seeds, Strategie gewinnt ≥ 15/20, Schwierigkeit steigt (Strategie-Gewinnquote
fällt von Level zu Level).

**D8 — Politur.** **Vorgemerkt (Thomas 2026-09-29):** Soldat — Ärmel heller als Weste (Arme im Coyote sichtbar), echte Gewehr-Anschlagpose statt Pistolenhaltung; Gesichtsmaske ggf. Coyote. Nur mit vorab von Thomas bestätigter Liste (Treffer-Feedback, Zahlen,
Klang …); ohne Liste kein Codex-Auftrag.

## Reißleine

- **D1 und D4:** Überzeugt der Bildvergleich nach **einem** Anlauf nicht, nicht
  nachbessern, sondern zurück zu Thomas mit dem Vergleich als Beleg.
- **D2b:** siehe oben (Rückfall feste Pose).
- **Leistung:** Fällt ein Schritt unter das Budget und hilft keine Rückfallebene
  (Wasser Stufe 1, weniger sichtbare Zombies, Schärfe 1,5× beim Start fest gesetzt),
  zurück zu Thomas.
- Alle anderen Schritte: höchstens zwei Anläufe, dann zurück.

## Geklärt (2026-09-29)

1. **Level-Fortschritt wird gespeichert** — eigener Speicherplatz (Randbedingung 11).
2. **Der 3D-Modus ersetzt das 2D-V2 im Menü.** Der Code unter `src/v2/` bleibt liegen
   und wird nur auf Thomas' ausdrückliches Wort gelöscht.
3. **Modelle** lädt Claude vor dem jeweiligen Schritt über Thomas' Sketchfab-Anmeldung;
   die Fahrzeuge wählt Thomas vor D5a.
