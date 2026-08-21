# Run & Gun — Umsetzungsplan V1

Privates, komplett kostenloses iPhone-PWA-Spiel. Auto-Runner-Shooter im Hochformat.
Kein App Store, keine Monetarisierung, keine Accounts, kein Backend, keine laufenden Kosten.

**Scope-Erweiterung V1.1 (Thomas-Entscheidung 2026-08-20):** Zwei Mechaniken kommen bewusst
zum ursprünglichen V1-Deckel dazu — **Truppe** (Figuren vermehren/vermindern sich durch Tore)
und **Waffentypen** (Schrot, Laser, Raketen zusätzlich zum Standard). Beide sind unten
spezifiziert und laufen als neue Etappe **E4** nach dem Balancing. Die frühere Nicht-Ziel-Zeile
„kein `+Soldiers`-Upgrade" ist damit aufgehoben. Der Rest des Deckels gilt unverändert:
keine weiteren Features, bevor die Definition „fertig" erreicht ist.

**Scope-Erweiterung V1.2 (Thomas-Entscheidung 2026-08-21):** Zwei weitere Punkte kommen
bewusst dazu und laufen in **E5** mit — ein **Startbildschirm mit einem von Codex erzeugten
Bild** und eine **lokale Bestenliste auf dem Gerät**. Beides ist unten im Abschnitt
„Startbildschirm und Bestenliste" spezifiziert. Der Rest des Deckels gilt unverändert.

**Klarstellung „privat":** Ab dem Deploy bedeutet privat „unbeworben", nicht „nicht-öffentlich" —
public Repo + Pages-URL sind technisch für jeden erreichbar. Quellcode, Tuning-Werte und
Code-Kommentare sind damit öffentlich sichtbar. Ist das nicht gewollt: Cloudflare Pages statt
GitHub Pages nutzen (funktioniert auch mit privatem Repo, ebenfalls kostenlos). Default-Annahme
dieses Plans: public Repo auf GitHub ist okay.

## Definition „fertig" (V1)

Thomas öffnet einen Link am iPhone, fügt das Spiel zum Homescreen hinzu und spielt
offline mehrere vollständige Runs (2–3-Minuten-Loop inkl. Boss), ohne irgendwo zu
zahlen oder einen externen Dienst zu konfigurieren.

## Nicht-Ziele V1

- Keine Sounds-Pflicht (nur wenn CC0-Assets + sauberer iOS-Audio-Unlock trivial machbar; V1 darf stumm sein)
- Keine Highscore-**Server**, keine Telemetrie, keine Cookies, keine externen APIs.
  Die lokale Bestenliste aus V1.2 widerspricht dem nicht: Sie liegt ausschliesslich im
  Speicher des Geraets, wird nie versendet und braucht kein Backend.
- Kein Android-/Desktop-Feinschliff (muss nur nicht kaputt sein; primär iPhone/Safari)

## Stack & Entscheidungen

| Entscheidung | Wahl | Begründung |
|---|---|---|
| Engine | Phaser 3, Arcade Physics | Vorgabe; Arcade reicht für AABB-Kollisionen, schnellste Option |
| Sprache/Build | TypeScript + Vite | Vorgabe; bewährter Stack aus den anderen Web-App-Projekten |
| PWA | vite-plugin-pwa mit `registerType: 'autoUpdate'` + `skipWaiting`; Registrierung über `virtual:pwa-register` in `main.ts` (ohne diesen Import gibt es keinen automatischen Update-Check) | Bewährtes Muster (Bike-Touren, FitnessBen), Update-Pfad explizit statt implizit |
| Speicherung | localStorage, ein JSON-Objekt `rungun_save_v1` mit Versionsfeld, dazu eine Zweitkopie unter `rungun_save_v1_backup` gegen Beschaedigung und eine Anfrage auf Dauerspeicher (`navigator.storage.persist()`). **Export/Import wurde am 2026-08-21 von Thomas ersatzlos gestrichen** — siehe unten (Save als JSON-Text über Share-Sheet/Copy-Paste) | Datenmenge winzig; aber iOS kann WebKit-Daten bei „Websitedaten löschen", System-Updates oder Icon-Neuanlage verwerfen — ob installierte Homescreen-Apps einen verschonten Datencontainer haben, ist nicht belastbar dokumentiert (Annahme: nein). Ohne Export wäre das ein stiller Totalverlust |
| Hosting | GitHub Pages via GitHub Actions (Deploy bei Push auf `main`) | Kostenlos, bestehender GitHub-Account. GitHub Free erlaubt Pages nur für **public** Repos (siehe Klarstellung „privat" oben); privates Repo → Cloudflare Pages |
| Vite `base` | `/run-gun/` (Repo-Name) — **und identischer Pfad in Manifest `start_url` und `scope`** | Pages liegt unter Subpfad; ohne konsistente Pfade: 404 auf Assets, falscher SW-Scope, oder die installierte App öffnet eine weiße Seite |
| Sourcemaps | `build.sourcemap: false` explizit setzen | Sonst können `.map`-Dateien mit lokalen Absolutpfaden im öffentlichen Deploy landen |
| Jekyll | Leere `.nojekyll` im Build-Output erzeugen | Pages ignoriert sonst Dateien/Ordner mit führendem Unterstrich |
| Assets V1 | **Harte Regel:** nur Runtime-generierte Shapes (Phaser Graphics → Texturen) oder CC0 von Kenney.nl. Jede andere Fremdasset-Übernahme (itch.io, OpenGameArt — dort oft CC-BY/CC-BY-SA) braucht vorherige Freigabe durch Thomas | Keine geschützten Grafiken/Sounds; inspiriert, keine Kopie; Lizenzentscheidung bleibt bei Thomas, nicht bei Codex |
| Optik | **Pixel-Art Retro** (Thomas-Entscheidung 2026-08-19): Kenney-CC0-Sprites, lokal gebundelt; Phaser mit `pixelArt: true` (kein Anti-Aliasing, knackige Pixel) | Arcade-Look. **Reihenfolge-Randbedingung:** Codex' Sandbox hat nachweislich keinen Netzzugang (in E1 zweimal `ENOTFOUND registry.npmjs.org`) und kann die Sprites nicht selbst laden. Deshalb bauen E2–E4 mit Runtime-generierten Platzhalter-Shapes; die Kenney-Sprites zieht Claude in einem eigenen Schritt ins Repo, sobald der Spielablauf steht. Zur Laufzeit weiterhin keine externen Requests |
| Fonts | System-Font oder lokal gebundelt, nie CDN | „Keine externen Requests" gilt auch für Fonts; viele Phaser-Templates binden Google Fonts ein — nicht übernehmen |

## Architektur

```
src/
  main.ts            Boot + Phaser-Config (Scale, Physics), PWA-Register (virtual:pwa-register)
  scenes/
    BootScene.ts     Texturen generieren, Save laden
    MenuScene.ts     Start, permanente Upgrades kaufen
    GameScene.ts     Kern-Loop
    GameOverScene.ts Ergebnis, Restart
  systems/
    spawner.ts       Gegner-/Gate-Spawning nach Level-Skript
    weapons.ts       Auto-Fire, Projektil-Pools je Waffentyp, Waffenwechsel im Run
    crowd.ts         Truppengröße, Formation, Schützen-Auswahl, Schadensskalierung
    upgrades.ts      Run-Upgrades (Gates) + permanente Upgrades
    save.ts          localStorage lesen/schreiben, Versionierung, Export/Import mit Validierung
  config/
    balance.ts       ALLE Tuning-Werte zentral (HP/Truppe, Damage, FireRate, Spawnraten, Gate-Werte,
                     Waffenparameter, Boss-HP, Coin-Werte, Poolgrößen)
tests/               Unit-Tests für save.ts und upgrades.ts (reine Logik, kein Canvas)
public/              Manifest-Assets, Icons (192/512), Apple-Touch-Icon, .nojekyll
```

- Szenenfluss: Boot → Menu → Game → GameOver → Menu. Level-Ende (Boss tot) → kurzes Overlay → nächstes Level in derselben GameScene.
- **Objekt-Pools für Projektile, Gegner, Coins, Gates und Truppen-Figuren, prüfbar spezifiziert:** feste Poolgröße aus `balance.ts`; Recycling über `setActive(false)/setVisible(false)`, niemals `destroy()` im laufenden Spiel; nach der Initialisierungsphase kein `Group.create()` mehr. Diese drei Punkte sind expliziter Code-Review-Checkpunkt vor jeder iPhone-Testfreigabe — „irgendeine Phaser Group" zählt nicht als Pooling. Coins sind das höchste Spawn-Volumen im Spiel (ein Drop pro Kill über Minuten) und fallen ausdrücklich unter dieselbe Regel.
- **Poolgrößen herleiten, nicht raten:** +FireRate- und +Projectiles-Gates stacken sich im Run; die Projektil-Poolgröße in `balance.ts` mit Marge über dem theoretischen Maximum dokumentieren (max. FireRate × max. Projectiles × Screen-Transit-Zeit). Der schlimmste Fall ist die **Schrotflinte bei maximalem FireRate und maximalem +Projectiles** — die Herleitung muss diesen Fall rechnen, nicht den Standardschuss. Dazu eine Dev-only-Konsolenwarnung bei Poolerschöpfung — ein zu kleiner Pool lässt Schüsse still verschwinden und sähe sonst wie ein Balance-Problem aus statt wie ein Technik-Bug.
- **Truppen-Pool:** `CROWD_MAX` Figuren werden einmalig in der Initialisierung erzeugt und danach nur noch aktiviert/deaktiviert. Die Truppe darf zur Laufzeit weder Figuren erzeugen noch zerstören — dieselbe Regel wie bei Projektilen, und aus demselben Grund (Ruckler beim Wachsen wären genau im Belohnungsmoment sichtbar).
- **Spieler von Anfang an als Anker + Formation bauen:** Schon in E2 ist der Spieler ein Anker-Objekt mit einer Formationsliste, auch wenn diese zunächst genau eine Figur enthält. Der Drag bewegt den Anker, die Formation folgt. Ohne das wird die Truppe in E4 ein Umbau statt einer Erweiterung.
- Auto-Run als scrollende Welt: Spieler bleibt vertikal fix, Hintergrund + Gegner bewegen sich nach unten.
- **Safe-Area im Canvas:** CSS-`env(safe-area-inset-*)` wirkt nicht auf Phaser-Objekte. Insets per JS auslesen (Hilfs-DOM-Element mit `env()`-Padding + `getComputedStyle`) und als Offset in die Positionierung von HUD-Objekten (HP, Coins, Boss-Balken) einrechnen.

## Steuerung & Gamefeel

- Drag: Finger-Delta-X steuert Spieler-X (relativ, nicht absolut — der Finger darf die Figur nicht verdecken); Clamp auf Spielfeldbreite.
- `touch-action: none` auf dem Canvas, `contextmenu` unterdrücken, keine Pinch-/Doppeltipp-Zoom-Gesten.
- Auto-Fire per Timer aus `fireRate`; Projektile nach oben.
- Treffer-Feedback: kurzes Blinken + iFrames nach Spielertreffer; Gegner-Hit-Flash. Kein Partikel-Feuerwerk in V1.
- Boss: HP-Balken oben, einfaches Bewegungsmuster (links/rechts + Schussphasen).

## Upgrade-System

- **Gates im Run:** Paarweise Tore; Wahl durch Position des Ankers beim Durchlaufen. Wirkungen in E3: HP, Damage, FireRate, Projectiles, Gegnertempo. In E4 wurde das HP-Tor zum Truppen-Tor (TEAM), weil die Truppengröße die Lebensanzeige ist; der eigene Projektil-Stat (GUNS) ist dabei ersatzlos entfallen (Thomas-Entscheidung 2026-08-20, siehe Abschnitt Truppe). Es bleiben vier Tor-Stats: TEAM, DMG, RATE, SPD. In E4b kommen die Waffen-Tore dazu.
- **Coins:** Gegner droppen Coins → automatisch eingesammelt (Magnetradius), Zählung im HUD.
- **Permanent zwischen Levels:** einfache Stufenkäufe im Menü (z. B. Start-Damage, Start-HP), Preise steigen pro Stufe. Alles in `balance.ts`.
- Save nach jedem Levelabschluss und bei Game Over.
- **Die Bestenliste liegt im selben Save-Objekt** `rungun_save_v1` und wird damit vom
  Export/Import mit erfasst. Eine getrennte Ablage waere der sichere Weg, sie beim
  naechsten Datenverlust von iOS zu verlieren, waehrend der Rest gerettet ist.
- **Export/Import: gestrichen (Thomas-Entscheidung 2026-08-21).** Die Bedienung wurde
  ersatzlos entfernt; im Menue steht stattdessen ein Knopf **ZURUECKSETZEN** mit Rueckfrage.
  Bewusst in Kauf genommene Folge: Verwirft iOS die Websitedaten oder wird die App vom
  Homescreen entfernt, ist der Fortschritt verloren. Dagegen wirken nur noch die automatische
  Zweitkopie (gegen Beschaedigung) und die Anfrage auf Dauerspeicher.

## Tor-Mathematik (Thomas-Entscheidung 2026-08-20)

Der Reiz der Tore soll aus dem Rechnen unter Zeitdruck kommen, nicht aus dem Ablesen einer Farbe.

- **Gemischte Operatoren, nicht nur ×2/÷2:** multiplikativ (`×2`, `×1.5`), Division (`÷2`), additiv
  (`+15`, `−8`) und prozentual (`+50 %`, `−30 %`). Welche Operatorklassen in einem Paar
  gegeneinander stehen, würfelt der Spawner aus einer Liste in `balance.ts`.
- **Kein dauerhaft richtiger Reflex:** Ein Paar ist genau dann gut, wenn die bessere Seite vom
  aktuellen Zustand abhängt — `×2` schlägt `+15` erst ab Truppengröße 15, darunter ist `+15`
  besser. Ein Paar darf auch aus zwei Verschlechterungen bestehen; dann ist die kleinere die
  richtige Wahl. Der Spawner muss die Paare deshalb **relativ zum aktuellen Wert** ziehen,
  nicht aus einer festen Liste — sonst wird die Wahl nach wenigen Runs auswendig gelernt.
- **Zeitfenster:** zwischen Sichtbarwerden und Durchfahren eines Tors liegen rund 1–1,5 Sekunden
  (Wert in `balance.ts`, aus Scrollgeschwindigkeit und Erscheinungshöhe hergeleitet). Lang genug
  zum Lesen, zu kurz zum gemütlichen Rechnen.
- **Beschriftung neutral:** große Zahl, kein Erklärtext, **einheitliche Torfarbe**. Grün/Rot nach
  gut/schlecht würde das Rechnen überflüssig machen und die Mechanik entwerten.
- **Rundung und Grenzen:** Ergebnis kaufmännisch auf ganze Figuren runden, harter Deckel
  `CROWD_MAX`. Ein Tor darf auf 0 führen — das ist Game Over und der Preis für eine falsche
  schnelle Entscheidung. Aber: der Spawner stellt sicher, dass **nie beide Seiten eines Paares**
  beim aktuellen Stand auf 0 führen. Eine Sackgasse ohne Ausweg ist kein Zeitdruck, sondern ein Bug.

## Truppe (Scope-Erweiterung V1.1, Etappe E4)

- **Truppengröße ist die Lebensanzeige.** Start `CROWD_START`, harter Deckel `CROWD_MAX`
  (Startwert 30, Reißleinen-Stellschraube). Gegnerkontakt kostet Figuren statt HP-Punkte,
  iFrames aus E2 verhindern den Kettenverlust, 0 Figuren = Game Over. Damit ersetzt die Truppe
  das HP-System aus E2 nahtlos — kein Umbau, nur eine andere Darstellung derselben Zahl.
- **Formation:** versetzte Reihen um den Anker; Breite gedeckelt auf Spielfeldbreite minus Marge.
  Wächst die Truppe, wird die Formation dichter, nicht breiter.
- **Alle Figuren feuern sichtbar, die Feuerkraft bleibt gedeckelt** (Thomas-Entscheidung
  2026-08-20, ersetzt die frühere Regel „nur die vordersten Figuren schießen"). Pro Salve
  feuern höchstens `CROWD_SHOOTERS_PER_SALVO` Figuren (Startwert 5) gleichzeitig; die Salve
  wandert reihum durch die Truppe, sodass jede Figur an die Reihe kommt — bei voller Truppe
  alle sechs Salven. Die Projektilzahl bleibt damit unabhängig von der Truppengröße; jede
  Figur über der Salvengröße erhöht stattdessen den Schaden pro Projektil. Grund: Würde jede
  Figur gleichzeitig feuern, wären es bei 30 Figuren rund 270 Projektile im Bild statt 45 —
  das iPhone bräche genau in dem Moment ein, in dem das Spiel am besten läuft.
- **Kollision gegen eine Box, nicht gegen N Boxen:** Treffer werden gegen die Formations-Hülle
  geprüft, nicht gegen jede Einzelfigur.

## Gegnertypen (Scope-Erweiterung V1.1)

Leichte Gegner haben 1 HP, sind mit Faktor 1,35 schnell und geben 1 Münze; Standardgegner haben 3 HP, Faktor 1 und 1 Münze; beide verursachen 1 Kontaktschaden. Schwere Gegner haben 9 HP, Faktor 0,7, verursachen 2 Kontaktschaden und geben eine Münze im Wert 3. Die Wellen nutzen bis 30 Sekunden die Gewichte 70/30/0, bis 90 Sekunden 40/45/15 und danach dauerhaft 20/45/35. Der Gegnerpool umfasst 48 Objekte: Schwere Gegner brauchen am SPD-Floor bei 49 px/s rund 17,2 Sekunden für 844 px Flugweg, sodass bei 450 ms Spawnabstand bis zu 39 gleichzeitig sichtbar sein können.

## Waffentypen (Scope-Erweiterung V1.1, Etappe E4)

| Typ | Verhalten | Technische Konsequenz |
|---|---|---|
| **Standard** | 1 Projektil geradeaus, mittlere Rate, mittlerer Schaden. Startwaffe | Basis-Pool |
| **Schrot** | Fächer aus mehreren Projektilen, kurze Lebensdauer (= kurze Reichweite), niedrige Rate, hoher Nahschaden | **Höchstes Pool-Volumen im Spiel** — maßgeblich für die Poolgröße-Herleitung |
| **Laser** | Durchschlägt Gegner, hohe Rate, niedriger Einzelschaden | Projektil despawnt beim Treffer *nicht*; führt eine Trefferliste, damit derselbe Gegner nicht mehrfach pro Durchflug Schaden nimmt |
| **Rakete** | Langsam, Flächenschaden im Radius beim Einschlag, niedrige Rate | Einschlag ist ein kurzer Kreis-Flash aus einem eigenen kleinen Pool — **kein Partikelsystem** (V1-Regel) |

- **Erwerb:** Waffen-Tore im Run; die Waffe gilt bis Run-Ende. Die Startwaffe ist im Menü
  permanent kaufbar.
- Alle Waffenwerte in `balance.ts`; **getrennter Projektil-Pool je Typ**, jeder mit eigener
  dokumentierter Herleitung.

## Startbildschirm und Bestenliste (Thomas-Entscheidung 2026-08-21)

Beides läuft in E5 mit, weil es dieselbe Speicherung und dieselbe Menü-Szene braucht wie die
permanenten Upgrades und die Startwaffe.

### Startbildschirm

- Eine eigene Szene **vor** der GameScene. Heute startet `BootScene` direkt ins Spiel; künftig
  startet sie in den Startbildschirm, von dort geht es per Tippen in den Run.
- Der Startbildschirm trägt ohnehin schon zwei im Plan vorgesehene Dinge: die **Stufenkäufe**
  für permanente Upgrades und die **Wahl der Startwaffe**. Er wird also nicht zusätzlich
  gebaut, sondern bekommt ein Gesicht.
- **Das Bild erzeugt Codex** nach dem im Projekt bewährten Verfahren: groß erzeugen, freistellen
  falls nötig, dann auf Zielgröße herunterrechnen; große Vorlage nach `assets/probe/`, das
  fertige Bild nach `src/assets/`. Direkt in Zielgröße erzeugen hat im Projekt schon einmal ein
  unbrauchbares Ergebnis geliefert (`docs/lessons.md`).
- **Motiv:** passend zum Spiel — die Truppe auf der Straße, Zombies im Hintergrund, Tageslicht
  wie im Spiel. Kein Text im Bild; Titel und Knöpfe zeichnet das Spiel darüber, sonst sind sie
  nicht änderbar und skalieren nicht mit.
- Das Bild wird **lokal gebündelt** wie alle anderen Assets. Keine Requests zur Laufzeit.
- Format: Hochformat, muss die volle Fläche 390 × 844 abdecken, ohne dass Titel oder Knöpfe
  auf unruhigem Untergrund stehen — beim Erzeugen eine ruhige Zone einplanen.

### Bestenliste

- **Rein lokal** im Gerät, im selben Save-Objekt wie der übrige Fortschritt. Kein Server, kein
  Versand, keine Namenseingabe von außen.
- **Vorschlag für die Wertung, beim Spezifizieren von E5 von Thomas zu bestätigen:** gewertet
  wird die in einem Run gesammelte **Münzzahl**, dazu als Zusatzangabe das erreichte Level und
  die Laufzeit. Münzen sind die Größe, die der Spieler ohnehin im HUD verfolgt.
- **Zehn Einträge**, absteigend. Ein neuer Run kommt nur hinein, wenn er besser ist als der
  zehnte; sonst ändert sich nichts.
- Angezeigt auf dem Startbildschirm und nach dem Game Over, dort mit hervorgehobenem eigenen
  Eintrag, wenn der Run es in die Liste geschafft hat.
- **Keine Namenseingabe in V1** — es ist Thomas' Gerät und Thomas' Liste. Eine Tastatur in einer
  iOS-Standalone-PWA ist zudem eine eigene Fehlerquelle.
- Die Liste ist Teil von Export und Import. Sonst überlebt der Fortschritt einen Datenverlust
  und die Bestenliste nicht.

## Etappen (je ein Codex-Task, Claude reviewt, Thomas testet am iPhone)

**Feedback-Loop, gilt für jede Etappe:** Codex kann iPhone-Kriterien (Gamefeel, Performance,
Installation) nicht selbst prüfen — Codex liefert Build/Deploy, Thomas testet am echten iPhone,
erst nach Thomas' Freigabe gilt die Etappe als fertig. Codex' Selbsteinschätzung oder
Desktop-Preview zählen nicht als Nachweis.

| Etappe | Inhalt | Akzeptanz (objektiv prüfbar) |
|---|---|---|
| **E1 — Gerüst + Deploy-Pipeline** | Vite+TS+Phaser-Gerüst mit leerer GameScene, Portrait-Scaling (`Scale.FIT` + `autoCenter`), Safe-Area-Offsets sichtbar (Debug-Rahmen), Drag bewegt ein Platzhalter-Rechteck; PWA-Grundgerüst (Manifest mit korrektem `start_url`/`scope` unter `/run-gun/`, autoUpdate-SW, Icons, `.nojekyll`); GitHub-Actions-Workflow; Repo-Setup-Schritte dokumentiert: Settings → Pages → Source auf „GitHub Actions" stellen, Workflow-`permissions: pages: write, id-token: write` | Am iPhone über die Pages-URL installiert; installierte Homescreen-App öffnet tatsächlich die Szene (keine weiße Seite); läuft im Flugmodus; Drag bewegt das Rechteck ohne Scrollen/Zoomen/Gummiband |
| **E2 — Spielbarer Kern** | Auto-Run-Scrolling, Auto-Fire, einfache Gegner, Kollision, HP + iFrames, Game Over/Restart; Objekt-Pools nach Spezifikation oben | Pool-Checkpunkte im Review bestanden (kein `destroy()`/`create()` im Hot Path); Loop läuft am iPhone flüssig und Steuerung fühlt sich direkt an (Thomas-Urteil) |
| **E3 — Gates, Coins, Balancing** | Upgrade-Gates **nach Abschnitt „Tor-Mathematik"** (gemischte Operatoren, zustandsabhängig gezogene Paare, neutrale Beschriftung), Coin-Drop + HUD, Balance-Iteration über `balance.ts` | Pool-Checkpunkte gelten auch für Coins und Gates (kein `destroy()`/`create()` im Hot Path); Torpaare sind aus dem aktuellen Wert hergeleitet (dieselbe Stelle im Level liefert bei anderem Stand ein anderes Paar) und es führen nie beide Seiten eines Paares auf 0; 2–3-Minuten-Run erzeugt spürbares „stärker werden" (Thomas-Urteil, max. 3 Balance-Zyklen — siehe Reißleinen) |
| **E4 — Truppe & Waffentypen** | Truppe nach Abschnitt „Truppe" (Formation, Truppengröße als Lebensanzeige, gedeckelte Schützenzahl), Truppen-Tore mit gemischten Operatoren, drei Zusatzwaffen nach Abschnitt „Waffentypen" + Waffen-Tore | Truppen-Pool-Checkpunkt bestanden (`CROWD_MAX` einmalig erzeugt, kein `create()`/`destroy()` zur Laufzeit); Projektilzahl bleibt bei maximaler Truppe im selben Rahmen wie bei einer Figur (im Code nachweisbar über `CROWD_SHOOTERS`); volle Truppe + Schrotflinte ruckelt am iPhone nicht (Thomas-Urteil); Torwahl fühlt sich als Entscheidung an, nicht als Reflex (Thomas-Urteil) |
| **E5 — Boss, Level, Persistenz, Startbildschirm, Bestenliste** | Boss, Levelabschluss → nächstes Level, permanente Upgrades, localStorage-Save **plus Save-Export/Import nach Spezifikation im Abschnitt Upgrade-System**; dazu **Startbildschirm mit erzeugtem Bild** und **lokale Bestenliste** nach dem Abschnitt „Startbildschirm und Bestenliste" | Mehrere Runs hintereinander; Fortschritt übersteht Force-Quit + Neustart; Zuruecksetzen fragt zurueck und setzt danach alles auf die Standardwerte; das Spiel startet auf dem Startbildschirm statt direkt im Run; ein besserer Run erscheint danach in der Bestenliste, ein schlechterer verdrängt keinen Eintrag; die Liste übersteht Force-Quit + Neustart und ist im Export enthalten |
| **E6 — V1-Abnahme** | Finale Icons, README (Start/Build/Deploy), Aufräumen | Update-Pfad: neue Version wird nach Force-Quit + Neuöffnen sichtbar; Netzwerk-Null-Check: Safari Web Inspector (USB) zeigt im Online-Normalbetrieb keine Requests an fremde Hosts; `.map`-Dateien nicht im Deploy; Definition „fertig" komplett erfüllt |

E1 zieht das Infrastruktur-Risiko (Subpfad, SW, Installation) bewusst an den Anfang: Scheitert
das Deploy-Setup, fällt es in der billigsten Etappe auf — nicht am Ende, wenn das Spiel fertig ist.

## iOS/PWA-Fallen (aus pwa-ios-quirks + Web_App_Projekte, projektspezifisch)

- **Service Worker nur über HTTPS:** lokal `localhost` ok; am iPhone nie über LAN-IP „offline testen" — Offline-Test nur über die deployte Pages-URL (oder `tailscale serve`).
- Statusbar/Notch: `black-translucent` + `viewport-fit=cover`; Safe-Area-Insets per JS in Canvas-Positionen einrechnen (siehe Architektur), nicht als CSS auf Phaser-Objekte.
- iOS kennt keine Fullscreen-API und kein Orientation-Lock: `display: standalone` im Manifest; im Querformat ein „Bitte drehen"-Overlay statt Lock.
- SW-Update-Verhalten: iOS reaktiviert beim Icon-Tap oft die suspendierte Instanz statt neu zu laden — alte Version kann kleben, bis die App im App-Switcher hart beendet wird. Deshalb E6-Kriterium „Update nach Force-Quit sichtbar" statt Annahme „Update kommt sofort an".
- Audio (falls V1 doch Sound bekommt): WebAudio erst nach erster Touch-Geste entsperren.
- Adressleisten-Dynamik in Safari (vor Installation): `Scale.FIT` + `autoCenter`, Resize-Handler auf `visualViewport`.

## Risiken & Reißleinen

- **Größtes Risiko: Gamefeel/Performance am echten iPhone.** Gegenmaßnahmen: Infrastruktur-Validierung in E1, Pools ab E2 mit prüfbaren Checkpunkten, kein Partikelsystem in V1, iPhone-Test nach jeder Etappe.
- **Reißleine E2 (Technik):** Ruckelt oder schwimmt die Steuerung am iPhone nach einem Nacharbeitszyklus mit Codex → Gegnerzahl/Effekte reduzieren (Scope runter), nicht Engine oder Ansatz wechseln.
- **Reißleine E3 (Spielspaß):** Maximal 3 Balance-Zyklen mit konkreten `balance.ts`-Änderungen. Macht der Run danach immer noch keinen Spaß, ist das Problem strukturell (Encounter-/Gate-Design) — dann Design-Entscheidung mit Thomas statt endlosem Zahlendrehen.
- **Reißleine E4 (Truppen-Performance):** Ruckelt die volle Truppe am iPhone, wird `CROWD_MAX` gesenkt (30 → 20 → 12) und `CROWD_SHOOTERS` bleibt unangetastet. Erst wenn auch 12 Figuren ruckeln, ist das Problem nicht die Zahl, sondern die Zeichenweise — dann Formation als eine gemeinsame Textur statt N Sprites prüfen. Die Mechanik selbst wird nicht zurückgebaut.
- **Reißleine E4 (Waffen):** Zwei Zusatzwaffen mit spürbar unterschiedlichem Gefühl sind mehr wert als drei, die sich gleich anfühlen. Fühlt sich eine nach einem Balance-Zyklus immer noch wie eine Variante des Standards an, fliegt sie raus statt weiter getunt zu werden.
- **Feature-Deckel:** MVP-Punkte 1–14 aus der Spec plus die Erweiterungen V1.1 (Truppe, Waffentypen) und V1.2 (Startbildschirm mit Bild, lokale Bestenliste) sind der Deckel. Kein Feature außerhalb, bevor Definition „fertig" erfüllt ist.

## Kosten- und Privacy-Check (Abo-/Kostenlos-Regel)

- Phaser 3: MIT-Lizenz, kostenlos. Vite, TypeScript, vite-plugin-pwa: kostenlos (npm).
- GitHub Pages + Actions: kostenlos für public Repos. Cloudflare Pages: kostenloser Fallback (auch für privates Repo).
- Keine API-Keys, keine externen Dienste. „Keine externen Requests" ist Akzeptanzkriterium in E6 (Web-Inspector-Netzwerk-Check), keine Annahme.
- Claude (Architekt/Review) + Codex (Implementierung): durch bestehende Abos gedeckt.

## Maschinenzeit-Schätzung

E1–E6 je ca. 30–60 Min Codex-Maschinenzeit plus Review; E4 (Truppe & Waffentypen) eher am
oberen Rand. Dazwischen wartet die Umsetzung auf Thomas' iPhone-Tests (je ca. 5–10 Min
Thomas-Zeit pro Etappe). Das einmalige Repo-Setup aus E1 ist am 2026-08-20 erledigt.
