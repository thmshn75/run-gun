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

## Nachweise
`npm run check`, `npm test`, `npm run build` gruen. Status am Ende IMPL_DONE,
Abschlussbericht: was geaendert, Testergebnisse, was nicht ging und warum.

## Reißleine
Laesst sich eine Variante nicht erzeugen: melden, Rest fertig bauen. Keine Aenderung an
2D-Spiellogik oder 2D-Speicher, um etwas gruen zu bekommen.

## Implementation Summary
- Titelbildschirm: zwei gleichwertige 56-px-Knoepfe fuer Standardspiel und 3D; 3D-Startlogik mit Doppelstart-Sperre, Rueckgabe-Hinweis und Fehlerpfad einmal in `TitleScene`.
- 3D-Knopf aus dem 2D-Menue entfernt. 3D-Speicherzugriffe mit `localStorage`-Stub auf `rg3d`-Schluessel geprueft; 2D-Stand bleibt bytegleich.
- Drei 1024×1024-RGB-Icon-Entwuerfe und Kontaktbogen (180/60 px) unter `assets/probe/icon-varianten/` erstellt; kein Icon eingebaut.
- Nachweise: `npm run check` Exit 0; `npm test` 66 Dateien/608 Tests gruen; `npm run build` Exit 0; `git diff --check` ohne Befund. Kein iPhone-/WebGL-Livetest in dieser Umgebung.
- Die vier Icon-Dateien liegen in einem durch `.gitignore` ignorierten Ordner. Erzwungenes Git-Vormerken scheiterte an schreibgeschuetztem `.git/index.lock`; fuer einen spaeteren Commit muessen sie mit `git add -f assets/probe/icon-varianten/*.png` aufgenommen werden.
