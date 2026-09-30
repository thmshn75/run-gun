# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D5d — Zwei Spiele in einer App (Startbildschirm) + App-Icon-Varianten

Verbindlicher Plan: `docs/plan-v7.md`, Schritt **D5d** (Thomas 2026-09-30 20:36). Entscheidungen
von Thomas: 3D bekommt einen **eigenen Spielstand** (getrennt vom 2D-Stand); dieser Schritt
kommt **vor D6**. Die Standardversion ist abgenommener Stand, den auch Benni spielt: an ihr
aendert sich nichts ausser dem entfallenden 3D-Knopf im Menue.

## Erlaubte Änderungen (abschließend)
- `src/scenes/TitleScene.ts`, `src/scenes/MenuScene.ts`, `src/systems/titleLayout.ts`
  (und das Menue-Layout, falls der 3D-Knopf dort einen eigenen Platz hat)
- `src/v3d/einstieg.ts` nur falls fuer den Rueckweg zum Titelbildschirm noetig
- `tests/` (neue/angepasste Tests), `assets/probe/icon-varianten/` (neu)
- Nicht: `public/*icon*`, `scripts/make-icons.py`, `index.html`, `vite.config.ts` (Icon-Einbau
  erst nach Thomas' Wahl), keine 2D-Spiellogik, kein 2D-Speicher.

## Akzeptanzkriterien

**A1 Startbildschirm mit zwei Spielen.** Der Titelbildschirm (`TitleScene`) zeigt statt "START"
zwei gleich grosse, untereinander liegende Knoepfe: oben **"RUN & GUN"** → `MenuScene` (wie
bisher START), darunter **"RUN GUN 3D"** → startet die 3D-Version direkt (gleiche Logik wie
heute der Menue-Knopf: dynamischer Import von `../v3d/einstieg`, Doppelstart-Sperre,
`sessionStorage`-Eintrag `rg3d_neuladen` entfernen, Hinweistext bei Rueckgabe mit `hinweis`,
Fehlerpfad gibt die Sperre frei). Die Logik wird **einmal** als Funktion ausgelagert und nicht
kopiert. Beide Knoepfe im sicheren Bereich, je mindestens 56 px hoch, ueberlappen weder Titel
noch einander, auch bei 390×844 und 375×667. Farben: "RUN & GUN" im bisherigen
START-Stil, "RUN GUN 3D" im gleichen Stil (gleichwertig, keiner wirkt wie Nebensache).

**A2 Rueckweg.** "ZURÜCK" bzw. Ende der 3D-Version fuehrt auf den Titelbildschirm mit beiden
Knoepfen, der wieder bedienbar ist (Sperre frei). Die Pruefparameter
`?pruefung=1&einsatz=…` wirken weiter, wenn 3D vom Titelbildschirm gestartet wird.

**A3 2D-Menue.** Der Knopf "RUN GUN 3D" im `MenuScene` entfaellt; alle anderen Knoepfe
(Spielen, Shop, Testgelaende, Probelauf, ggf. Zurueckholen) bleiben mit Funktion, das Layout
bleibt ohne Luecke/Ueberlappung. Bestehende Menue-Tests gruen bzw. auf das Fehlen des
3D-Knopfs angepasst.

**A4 Getrennte Spielstaende.** Test: Alle `localStorage`-Schluessel, die Module unter
`src/v3d/` lesen oder schreiben, beginnen mit `rg3d` (heute `rg3d.v1`,
`rg3d-letzte-messung`); kein 2D-Schluessel wird von 3D beruehrt. (Pruefung ueber einen
Speicher-Stub beim Ausfuehren von `ladeFortschritt`/Speichern/Messergebnis, nicht per
Quelltextsuche.)

**A5 Icon-Varianten (noch kein Einbau).** Mit dem Bildwerkzeug **drei** Varianten eines
App-Icons im Stil der 3D-Version erzeugen, je 1024×1024 PNG, quadratisch, randlos, ohne
Transparenz, ohne Text ausser optional "3D" klein: realistisch-3D wie das Spiel (Referenz:
`assets/probe/icon-referenz-3d.png` = echtes Spielbild), Motivkern: Soldat(en) in
Coyote-Uniform von hinten, gruene Zombie-Horde auf der Bruecke ueber dem Meer; Variante 2 mit
Hubschrauber darueber, Variante 3 mit Panzer. Muss bei 60 px Groesse noch lesbar sein (wenige
grosse Formen, kraeftiger Kontrast). Ablage `assets/probe/icon-varianten/variante-{1,2,3}.png`
plus Kontaktbogen `assets/probe/icon-varianten/bogen.png` (je Variante 180 px und 60 px).
Nicht verdrahten.

## Nacharbeit 1 (Thomas 2026-09-30 21:07) — nur dieser Punkt

"Die Schrift auf der Startseite RUN GUN 3D auch einen 3D-Effekt verpassen."
**N1 3D-Schrift auf dem Knopf "RUN GUN 3D"** (`TitleScene`, nur dieser Knopf; "RUN & GUN"
bleibt wie er ist): extrudierter Schriftzug — 5 bis 6 gestapelte Kopien des Textes, je 1 px
nach rechts unten versetzt, von hinten nach vorn dunkler → heller (hinterste nahe
`#0b0f18`), obenauf die Frontschrift in Weiss mit senkrechtem Farbverlauf (oben hell,
unten warmes Gelb/Orange, z. B. ueber `setFill`-Gradient des Canvas-Kontexts von Phaser-Text)
und duennem dunklem Rand; zusaetzlich ein weicher Schlagschatten. Schriftgroesse etwas
groesser als "RUN & GUN" (26–28 px statt 24), passt bei 375 px Breite in den Knopf. Alle
Ebenen bleiben innerhalb des Knopfes und liegen ueber ihm (Tiefe), der Knopf bleibt ueber die
ganze Flaeche antippbar (die Textebenen fangen keine Eingaben ab). Scharfe Schrift wie der
Rest (`enableSharpText`). Test: Knopf-Klickflaeche unveraendert, Anzahl der Textebenen ≥ 5.

## Nacharbeit 2 (Thomas 2026-09-30 21:08) — nur dieser Punkt

"Die Startseite muss auch ein neues Bild bekommen, dafuer das Panzer-Bild nehmen."
**N2 Neues Startbild (nur `TitleScene`).** Mit dem Bildwerkzeug das Motiv von
`assets/probe/icon-varianten/variante-3.png` (Soldaten in Coyote-Uniform von hinten, Zombie-
Horde auf der Bruecke ueber dem Meer, Panzer rechts, Muendungsfeuer) im **Hochformat**
neu erzeugen: 780×1688 px (390×844 @2x), gleicher realistischer 3D-Stil, ohne Text. Bildaufbau:
obere ~12 % ruhig (Himmel/Meer) fuer den Titel "RUN & GUN", untere ~20 % ruhig/dunkler
(Strasse) fuer die zwei Knoepfe; Motivkern (Soldaten, Horde, Panzer) dazwischen.
Ablage `src/assets/start.png` (als PNG oder JPEG ≤ 600 KB, JPEG bevorzugt, dann
`start.jpg`), in `BootScene` als eigener Schluessel `start` laden, `TitleScene` zeigt `start`
statt `title` (Fuellung "cover": Seitenverhaeltnis bleibt, mittig beschnitten, nie
verzerrt). **`MenuScene` (2D-Menue) behaelt `title`** unveraendert. Offline: Das Bild muss im
Service-Worker-Precache landen (Build pruefen: in `dist/sw.js` gelistet).
Test: `TitleScene` nutzt `start`, `MenuScene` weiter `title`; Bild wird nicht verzerrt
(Anzeige-Seitenverhaeltnis = Bild-Seitenverhaeltnis).

## Nachweise
`npm run check`, `npm test`, `npm run build` gruen. Status am Ende IMPL_DONE,
Abschlussbericht: was geaendert, Testergebnisse, was nicht ging und warum.

## Reißleine
Laesst sich eine Variante nicht erzeugen: melden, Rest fertig bauen. Keine Aenderung an
2D-Spiellogik oder 2D-Speicher, um etwas gruen zu bekommen.

## Implementation Summary
- Nacharbeit 2: Neues Panzer-Motiv mit dem eingebauten Bildwerkzeug aus `variante-3.png` als Referenz erzeugt und als `src/assets/start.jpg` gespeichert (780×1688, RGB, 346561 Byte). `BootScene` laedt es unter `start`; nur `TitleScene` zeigt es mittig mit unverzerrter Cover-Skalierung. `MenuScene` nutzt weiter `title`.
- `vite.config.ts` nimmt JPG in den Service-Worker-Precache auf; Build-Nachweis: `start-H7GYUnQz.jpg` steht in `dist/sw.js`. Tests: `npm run check` Exit 0; gezielter Titeltest 5/5; `npm run build` Exit 0; `npm test` 66 Dateien/610 Tests gruen. Kein iPhone-/Browser-Livetest in dieser Umgebung.
- Nacharbeit 1: Nur der 3D-Knopf auf dem Titelbildschirm hat jetzt sechs versetzte dunkle Schriftebenen sowie eine 27-px-Front mit hellem bis orangefarbenem Verlauf, dunklem Rand und weichem Schatten. Die Textebenen liegen ueber dem 56-px-Knopf und nehmen keine Eingaben an; die Standardbeschriftung blieb unveraendert.
- Neuer Titelbildschirm-Test prueft Ebenenzahl, Tiefe, vertikale Knopfgrenzen, unveraenderte Klickflaeche, fehlende Text-Interaktivitaet und Verlauf. Nachweise fuer Nacharbeit 1: `npm run check` Exit 0; `npm test` 66 Dateien/609 Tests gruen; `npm run build` Exit 0; `git diff --check` ohne Befund. Terminal.app war hier nicht verfuegbar, daher liefen die Tests direkt in der Shell. Kein iPhone-/Browser-Livetest in dieser Umgebung.
- Titelbildschirm: zwei gleichwertige 56-px-Knoepfe fuer Standardspiel und 3D; 3D-Startlogik mit Doppelstart-Sperre, Rueckgabe-Hinweis und Fehlerpfad einmal in `TitleScene`.
- 3D-Knopf aus dem 2D-Menue entfernt. 3D-Speicherzugriffe mit `localStorage`-Stub auf `rg3d`-Schluessel geprueft; 2D-Stand bleibt bytegleich.
- Drei 1024×1024-RGB-Icon-Entwuerfe und Kontaktbogen (180/60 px) unter `assets/probe/icon-varianten/` erstellt; kein Icon eingebaut.
- Nachweise: `npm run check` Exit 0; `npm test` 66 Dateien/608 Tests gruen; `npm run build` Exit 0; `git diff --check` ohne Befund. Kein iPhone-/WebGL-Livetest in dieser Umgebung.
- Die vier Icon-Dateien liegen in einem durch `.gitignore` ignorierten Ordner. Erzwungenes Git-Vormerken scheiterte an schreibgeschuetztem `.git/index.lock`; fuer einen spaeteren Commit muessen sie mit `git add -f assets/probe/icon-varianten/*.png` aufgenommen werden.
