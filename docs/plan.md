# Run & Gun — Umsetzungsplan V1

Privates, komplett kostenloses iPhone-PWA-Spiel. Auto-Runner-Shooter im Hochformat.
Kein App Store, keine Monetarisierung, keine Accounts, kein Backend, keine laufenden Kosten.

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

- Kein `+Soldiers`-Upgrade (explizit „später optional")
- Keine Sounds-Pflicht (nur wenn CC0-Assets + sauberer iOS-Audio-Unlock trivial machbar; V1 darf stumm sein)
- Keine Highscore-Server, keine Telemetrie, keine Cookies, keine externen APIs
- Kein Android-/Desktop-Feinschliff (muss nur nicht kaputt sein; primär iPhone/Safari)

## Stack & Entscheidungen

| Entscheidung | Wahl | Begründung |
|---|---|---|
| Engine | Phaser 3, Arcade Physics | Vorgabe; Arcade reicht für AABB-Kollisionen, schnellste Option |
| Sprache/Build | TypeScript + Vite | Vorgabe; bewährter Stack aus den anderen Web-App-Projekten |
| PWA | vite-plugin-pwa mit `registerType: 'autoUpdate'` + `skipWaiting`; Registrierung über `virtual:pwa-register` in `main.ts` (ohne diesen Import gibt es keinen automatischen Update-Check) | Bewährtes Muster (Bike-Touren, FitnessBen), Update-Pfad explizit statt implizit |
| Speicherung | localStorage, ein JSON-Objekt `rungun_save_v1` mit Versionsfeld; **plus Export/Import als Pflichtteil von E4** (Save als JSON-Text über Share-Sheet/Copy-Paste) | Datenmenge winzig; aber iOS kann WebKit-Daten bei „Websitedaten löschen", System-Updates oder Icon-Neuanlage verwerfen — ob installierte Homescreen-Apps einen verschonten Datencontainer haben, ist nicht belastbar dokumentiert (Annahme: nein). Ohne Export wäre das ein stiller Totalverlust |
| Hosting | GitHub Pages via GitHub Actions (Deploy bei Push auf `main`) | Kostenlos, bestehender GitHub-Account. GitHub Free erlaubt Pages nur für **public** Repos (siehe Klarstellung „privat" oben); privates Repo → Cloudflare Pages |
| Vite `base` | `/run-gun/` (Repo-Name) — **und identischer Pfad in Manifest `start_url` und `scope`** | Pages liegt unter Subpfad; ohne konsistente Pfade: 404 auf Assets, falscher SW-Scope, oder die installierte App öffnet eine weiße Seite |
| Sourcemaps | `build.sourcemap: false` explizit setzen | Sonst können `.map`-Dateien mit lokalen Absolutpfaden im öffentlichen Deploy landen |
| Jekyll | Leere `.nojekyll` im Build-Output erzeugen | Pages ignoriert sonst Dateien/Ordner mit führendem Unterstrich |
| Assets V1 | **Harte Regel:** nur Runtime-generierte Shapes (Phaser Graphics → Texturen) oder CC0 von Kenney.nl. Jede andere Fremdasset-Übernahme (itch.io, OpenGameArt — dort oft CC-BY/CC-BY-SA) braucht vorherige Freigabe durch Thomas | Keine geschützten Grafiken/Sounds; inspiriert, keine Kopie; Lizenzentscheidung bleibt bei Thomas, nicht bei Codex |
| Optik | **Pixel-Art Retro** (Thomas-Entscheidung 2026-08-19): Kenney-CC0-Sprites, lokal gebundelt; Phaser mit `pixelArt: true` (kein Anti-Aliasing, knackige Pixel) | Arcade-Look; konkrete Pack-Auswahl in der E1/E2-Spec, Assets werden beim Bauen ins Repo geladen — zur Laufzeit weiterhin keine externen Requests |
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
    weapons.ts       Auto-Fire, Projektil-Pools, Waffentypen
    upgrades.ts      Run-Upgrades (Gates) + permanente Upgrades
    save.ts          localStorage lesen/schreiben, Versionierung, Export/Import mit Validierung
  config/
    balance.ts       ALLE Tuning-Werte zentral (HP, Damage, FireRate, Spawnraten, Gate-Werte, Boss-HP, Coin-Werte, Poolgrößen)
tests/               Unit-Tests für save.ts und upgrades.ts (reine Logik, kein Canvas)
public/              Manifest-Assets, Icons (192/512), Apple-Touch-Icon, .nojekyll
```

- Szenenfluss: Boot → Menu → Game → GameOver → Menu. Level-Ende (Boss tot) → kurzes Overlay → nächstes Level in derselben GameScene.
- **Objekt-Pools für Projektile, Gegner, Coins und Gates, prüfbar spezifiziert:** feste Poolgröße aus `balance.ts`; Recycling über `setActive(false)/setVisible(false)`, niemals `destroy()` im laufenden Spiel; nach der Initialisierungsphase kein `Group.create()` mehr. Diese drei Punkte sind expliziter Code-Review-Checkpunkt vor jeder iPhone-Testfreigabe — „irgendeine Phaser Group" zählt nicht als Pooling. Coins sind das höchste Spawn-Volumen im Spiel (ein Drop pro Kill über Minuten) und fallen ausdrücklich unter dieselbe Regel.
- **Poolgrößen herleiten, nicht raten:** +FireRate- und +Projectiles-Gates stacken sich im Run; die Projektil-Poolgröße in `balance.ts` mit Marge über dem theoretischen Maximum dokumentieren (max. FireRate × max. Projectiles × Screen-Transit-Zeit). Dazu eine Dev-only-Konsolenwarnung bei Poolerschöpfung — ein zu kleiner Pool lässt Schüsse still verschwinden und sähe sonst wie ein Balance-Problem aus statt wie ein Technik-Bug.
- Auto-Run als scrollende Welt: Spieler bleibt vertikal fix, Hintergrund + Gegner bewegen sich nach unten.
- **Safe-Area im Canvas:** CSS-`env(safe-area-inset-*)` wirkt nicht auf Phaser-Objekte. Insets per JS auslesen (Hilfs-DOM-Element mit `env()`-Padding + `getComputedStyle`) und als Offset in die Positionierung von HUD-Objekten (HP, Coins, Boss-Balken) einrechnen.

## Steuerung & Gamefeel

- Drag: Finger-Delta-X steuert Spieler-X (relativ, nicht absolut — der Finger darf die Figur nicht verdecken); Clamp auf Spielfeldbreite.
- `touch-action: none` auf dem Canvas, `contextmenu` unterdrücken, keine Pinch-/Doppeltipp-Zoom-Gesten.
- Auto-Fire per Timer aus `fireRate`; Projektile nach oben.
- Treffer-Feedback: kurzes Blinken + iFrames nach Spielertreffer; Gegner-Hit-Flash. Kein Partikel-Feuerwerk in V1.
- Boss: HP-Balken oben, einfaches Bewegungsmuster (links/rechts + Schussphasen).

## Upgrade-System

- **Gates im Run:** Paarweise Tore (+Damage / +FireRate / +Health / +Projectiles); Wahl durch Position der Figur beim Durchlaufen.
- **Coins:** Gegner droppen Coins → automatisch eingesammelt (Magnetradius), Zählung im HUD.
- **Permanent zwischen Levels:** einfache Stufenkäufe im Menü (z. B. Start-Damage, Start-HP), Preise steigen pro Stufe. Alles in `balance.ts`.
- Save nach jedem Levelabschluss und bei Game Over.
- **Export/Import (Pflichtteil von E4):** Export als JSON-Text über Share-Sheet/Kopieren. Import über ein sichtbares `<textarea>` mit manuellem Einfügen (Long-Press-Paste) — **kein** `navigator.clipboard.readText()`, dessen Verhalten in einer iOS-Standalone-PWA nicht verlässlich ist (kann still leer zurückkommen). Vor jedem Überschreiben validiert `save.ts` JSON-Struktur und Versionsfeld; bei Fehler klare Meldung, der bestehende Save bleibt unangetastet.

## Etappen (je ein Codex-Task, Claude reviewt, Thomas testet am iPhone)

**Feedback-Loop, gilt für jede Etappe:** Codex kann iPhone-Kriterien (Gamefeel, Performance,
Installation) nicht selbst prüfen — Codex liefert Build/Deploy, Thomas testet am echten iPhone,
erst nach Thomas' Freigabe gilt die Etappe als fertig. Codex' Selbsteinschätzung oder
Desktop-Preview zählen nicht als Nachweis.

| Etappe | Inhalt | Akzeptanz (objektiv prüfbar) |
|---|---|---|
| **E1 — Gerüst + Deploy-Pipeline** | Vite+TS+Phaser-Gerüst mit leerer GameScene, Portrait-Scaling (`Scale.FIT` + `autoCenter`), Safe-Area-Offsets sichtbar (Debug-Rahmen), Drag bewegt ein Platzhalter-Rechteck; PWA-Grundgerüst (Manifest mit korrektem `start_url`/`scope` unter `/run-gun/`, autoUpdate-SW, Icons, `.nojekyll`); GitHub-Actions-Workflow; Repo-Setup-Schritte dokumentiert: Settings → Pages → Source auf „GitHub Actions" stellen, Workflow-`permissions: pages: write, id-token: write` | Am iPhone über die Pages-URL installiert; installierte Homescreen-App öffnet tatsächlich die Szene (keine weiße Seite); läuft im Flugmodus; Drag bewegt das Rechteck ohne Scrollen/Zoomen/Gummiband |
| **E2 — Spielbarer Kern** | Auto-Run-Scrolling, Auto-Fire, einfache Gegner, Kollision, HP + iFrames, Game Over/Restart; Objekt-Pools nach Spezifikation oben | Pool-Checkpunkte im Review bestanden (kein `destroy()`/`create()` im Hot Path); Loop läuft am iPhone flüssig und Steuerung fühlt sich direkt an (Thomas-Urteil) |
| **E3 — Gates, Coins, Balancing** | Upgrade-Gates, Coin-Drop + HUD, Balance-Iteration über `balance.ts` | Pool-Checkpunkte gelten auch für Coins und Gates (kein `destroy()`/`create()` im Hot Path); 2–3-Minuten-Run erzeugt spürbares „stärker werden" (Thomas-Urteil, max. 3 Balance-Zyklen — siehe Reißleinen) |
| **E4 — Boss, Level, Persistenz** | Boss, Levelabschluss → nächstes Level, permanente Upgrades, localStorage-Save **plus Save-Export/Import nach Spezifikation im Abschnitt Upgrade-System** | Mehrere Runs hintereinander; Fortschritt übersteht Force-Quit + Neustart; Export → Löschen → Import stellt den Stand wieder her; korrupter/unvollständiger Import-Text erzeugt eine Fehlermeldung und lässt den bestehenden Save unangetastet |
| **E5 — V1-Abnahme** | Finale Icons, README (Start/Build/Deploy), Aufräumen | Update-Pfad: neue Version wird nach Force-Quit + Neuöffnen sichtbar; Netzwerk-Null-Check: Safari Web Inspector (USB) zeigt im Online-Normalbetrieb keine Requests an fremde Hosts; `.map`-Dateien nicht im Deploy; Definition „fertig" komplett erfüllt |

E1 zieht das Infrastruktur-Risiko (Subpfad, SW, Installation) bewusst an den Anfang: Scheitert
das Deploy-Setup, fällt es in der billigsten Etappe auf — nicht am Ende, wenn das Spiel fertig ist.

## iOS/PWA-Fallen (aus pwa-ios-quirks + Web_App_Projekte, projektspezifisch)

- **Service Worker nur über HTTPS:** lokal `localhost` ok; am iPhone nie über LAN-IP „offline testen" — Offline-Test nur über die deployte Pages-URL (oder `tailscale serve`).
- Statusbar/Notch: `black-translucent` + `viewport-fit=cover`; Safe-Area-Insets per JS in Canvas-Positionen einrechnen (siehe Architektur), nicht als CSS auf Phaser-Objekte.
- iOS kennt keine Fullscreen-API und kein Orientation-Lock: `display: standalone` im Manifest; im Querformat ein „Bitte drehen"-Overlay statt Lock.
- SW-Update-Verhalten: iOS reaktiviert beim Icon-Tap oft die suspendierte Instanz statt neu zu laden — alte Version kann kleben, bis die App im App-Switcher hart beendet wird. Deshalb E5-Kriterium „Update nach Force-Quit sichtbar" statt Annahme „Update kommt sofort an".
- Audio (falls V1 doch Sound bekommt): WebAudio erst nach erster Touch-Geste entsperren.
- Adressleisten-Dynamik in Safari (vor Installation): `Scale.FIT` + `autoCenter`, Resize-Handler auf `visualViewport`.

## Risiken & Reißleinen

- **Größtes Risiko: Gamefeel/Performance am echten iPhone.** Gegenmaßnahmen: Infrastruktur-Validierung in E1, Pools ab E2 mit prüfbaren Checkpunkten, kein Partikelsystem in V1, iPhone-Test nach jeder Etappe.
- **Reißleine E2 (Technik):** Ruckelt oder schwimmt die Steuerung am iPhone nach einem Nacharbeitszyklus mit Codex → Gegnerzahl/Effekte reduzieren (Scope runter), nicht Engine oder Ansatz wechseln.
- **Reißleine E3 (Spielspaß):** Maximal 3 Balance-Zyklen mit konkreten `balance.ts`-Änderungen. Macht der Run danach immer noch keinen Spaß, ist das Problem strukturell (Encounter-/Gate-Design) — dann Design-Entscheidung mit Thomas statt endlosem Zahlendrehen.
- **Feature-Deckel:** MVP-Punkte 1–14 aus der Spec sind der Deckel. Kein Feature außerhalb, bevor Definition „fertig" erfüllt ist.

## Kosten- und Privacy-Check (Abo-/Kostenlos-Regel)

- Phaser 3: MIT-Lizenz, kostenlos. Vite, TypeScript, vite-plugin-pwa: kostenlos (npm).
- GitHub Pages + Actions: kostenlos für public Repos. Cloudflare Pages: kostenloser Fallback (auch für privates Repo).
- Keine API-Keys, keine externen Dienste. „Keine externen Requests" ist Akzeptanzkriterium in E5 (Web-Inspector-Netzwerk-Check), keine Annahme.
- Claude (Architekt/Review) + Codex (Implementierung): durch bestehende Abos gedeckt.

## Maschinenzeit-Schätzung

E1–E5 je ca. 30–60 Min Codex-Maschinenzeit plus Review; dazwischen wartet die Umsetzung
auf Thomas' iPhone-Tests (je ca. 5–10 Min Thomas-Zeit pro Etappe) und auf das einmalige
Repo-Setup in E1 (Repo anlegen, Pages-Source umstellen — ca. 5 Min).
