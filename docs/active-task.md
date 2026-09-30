# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D5b — Einsatzabläufe im Rechenkern + Panzer und Haubitze auf dem Feld

Verbindlicher Plan: `docs/plan-v7.md`, Zeile **"Einsatz der Fahrzeuge (Thomas 2026-09-30)"**,
Tabelle Spezialeinheiten (Rechenkern), "Schrittfolge → D5b". Modelle liegen seit D5a vor
(`welt.fahrzeuge`, `baueMiniatur`). Dieser Schritt:
(1) stellt die **Zeitplanung aller vier Einheiten im Rechenkern** auf Abläufe um (Anfahrt
ohne Wirkung, Panzer in Phasen) — **Gesamtwirkung je Einheit bei freiem `Z` unverändert**
(bei knappem `Z` wirkt die Deckelung `min(…, Z)` wie bisher);
(2) zeigt **Panzer und Haubitze** auf dem Feld (fahren, halten, feuern, Einschläge, Schneise).
Humvee und Hubschrauber auf dem Feld folgen in D5c (sie wirken ab hier nach neuem Ablauf im
Kern, nur ohne Fahrzeugbild).

## Erlaubte Änderungen (abschließend)

- `src/v3d/rechnung.ts` (Spezialeinheiten-Abschnitt, `AktiveEinheit`, neue Exporte unten),
  `src/v3d/balance3d.ts` (`SPEZIAL`, `FAHRZEUGE`, `DARSTELLUNG`), `scripts/bots3d.ts` und
  `src/v3d/messung.ts` (nur Anpassung an die neue `AktiveEinheit`, falls nötig),
  `src/v3d/oberflaeche.ts` (nur Banner: neue Signatur `bannerEintraege(aktiv: readonly
  AktiveEinheit[])` mit `Math.ceil(restZeit(a))` — **Anfahrt zählt mit**, Humvee zeigt direkt
  nach Freischalten 33 s), `tests/v3dRechnung.test.ts`.
- `src/v3d/lauf.ts`, `src/v3d/anzeigen.ts` (neue Klasse `Explosionen`),
  `src/v3d/fahrzeuge.ts` (Feld-Fahrzeug aus geteilten Ressourcen),
  `src/v3d/einstieg.ts` (nur Prüfparameter `?einsatz=`), Tests `tests/v3dLauf.test.ts`,
  `tests/v3dFahrzeuge.test.ts`.
- **Nicht:** `LEVELS`, Modelle, Bilder, Messstufen-Logik.

## Reihenfolge (verbindlich)

**Zuerst** auf dem unveränderten Stand `npm run bots3d` ausführen und die Tabelle als
"Vorher" in den Bericht schreiben; erst danach ändern.

## Akzeptanzkriterien

### R — Abläufe im Rechenkern (alle vier Einheiten)
- `SPEZIAL.<einheit>.ablauf`: Liste von Phasen `{ art: 'fahrt' | 'feuer' | 'schneise' |
  'einschlaege', dauer, zombiesProSekunde?, einschlaege?, abstand?, zombiesProEinschlag?,
  bossPunkteProSekunde? }`. Gesamtdauer = Summe (Funktion `gesamtDauer(einheit)`, nicht
  doppelt gepflegt):
  | Einheit | Ablauf | Wirkung bei freiem Z |
  |---|---|---|
  | Humvee | fahrt 3 s → feuer 30 s @ 4/s | 120 |
  | Haubitze | fahrt 1,2 s → einschlaege 3 × 60, Abstand 1 s, Phasendauer **2,05 s** (letzter Einschlag bei 2,0 s der Phase + kurze Nachlaufpause, kein Rundungspuffer) | 180 |
  | Panzer | fahrt 1,2 s → feuer 1,5 s @ 40/s → fahrt 1,5 s → feuer 1,5 s @ 40/s → schneise 1,0 s @ 40/s | 160 |
  | Hubschrauber | fahrt 2 s → feuer 12 s @ 15/s + Boss 25/s | 180 + Boss |
- **`AktiveEinheit = { einheit, verstrichen, einschlaege }`** — `rest` wird **nie
  gespeichert**, sondern abgeleitet: exportiert `restZeit(a) = gesamtDauer(a.einheit) −
  a.verstrichen` (Banner, Messung, Bots nutzen das). Exportierte Fabrik
  **`starteEinheit(z, name): AktiveEinheit`** (legt an, hängt an `z.aktiv`, meldet nichts);
  `schritt` nutzt sie beim Freischalten und meldet dort wie bisher `einheitFrei`/`einheitAktiv`.
- Wirkung nur in `feuer`/`schneise`/`einschlaege`, anteilig korrekt, wenn ein `dt` eine
  Phasengrenze überschreitet (Rest des `dt` wirkt in der nächsten Phase). Einschlag k
  (k = 0,1,2) feuert im ersten Schritt, in dem `phasenlokal + wirk ≥ k · abstand − 1e-9`.
  Exportierte reine Hilfe `phaseBei(einheit, verstrichen) → { index, art, anteil, lokal }`.
  Keine neuen Ereignisarten.
- **Bestehende Tests** in `tests/v3dRechnung.test.ts`, die `AktiveEinheit` von Hand bauen
  oder Wirkung direkt nach Freischalten erwarten (ca. Zeilen 190–230: Humvee-/Haubitze-/
  Hubschrauber-Zählung, "summe = 4 nach Freischalten", Boss 375): auf `starteEinheit`
  umstellen und **neu schreiben** mit Sollwerten aus der Tabelle (z. B. Humvee nach 4 s bei
  dt = 1: 1 s Feuer = 4; Hubschrauber nach 3 s: 1 s Feuer = 15 Zombies / 25 Boss). Keine
  Erwartung "passend biegen": jeder Sollwert aus der Tabelle herleitbar.
- Ebenso **`tests/v3dLauf.test.ts`** (Banner-Tests, von Hand gebaute `{rest: …}`, `rest = .01`,
  Erwartung "HUMVEE · 30 s") und `tests/v3dRechnung.test.ts` Zeile ~54 (`a.rest`): auf
  `starteEinheit`/`verstrichen` umstellen; Sollwerte: Banner "HUMVEE · 33 s" nach Freischalten,
  Ende bei `verstrichen = gesamtDauer − 0,01`.
- Neue Tests: Summe je Einheit exakt wie Tabelle (dt = 1/30, 0,1, 1); keine Wirkung in
  `fahrt`; Phasengrenze innerhalb eines `dt`; Haubitze genau 3 Einschläge, Ereignis-`t`
  jeweils in `[Soll − dt, Soll)` mit Soll = `z.t` beim Aufruf von `starteEinheit` (zwischen
  zwei Schritten) + 1,2 / 2,2 / 3,2 s; Invariante T/Z/F/B grün.
- **Bots**: Tabelle vorher/nachher. Grenze: Siegquote je Bot ±1/20, Ø-Dauer ±5 %. Verletzt →
  **nicht** an Zahlen drehen, melden (Claude entscheidet).

### A1 Feld-Fahrzeuge (Panzer, Haubitze) — Klasse `Einsatzbilder` in `lauf.ts`
- **Eine Klasse** `Einsatzbilder` bündelt Feld-Fahrzeuge, Explosionen, Fahrzeug-Blitze und
  Schneisen-Maske: `abgleichen(z, ereignisse, dt)`, `nachlauf(dt)`, `zuruecksetzen()`,
  `gibFrei()`. `WeltDarstellung` besitzt sie; `zuruecksetzen()` wird auch im
  **Vorgänger-Zweig** von `gibFrei` aufgerufen (Bot-Messung legt eine zweite Darstellung an).
- **Zustandsabgleich statt Ereignis:** Jedes `abgleichen` läuft über `z.aktiv`; Schlüssel ist
  die Objektidentität der `AktiveEinheit`. Fehlt für einen Panzer/eine Haubitze das Fahrzeug
  → anlegen; ist eine Einheit aus `z.aktiv` verschwunden → Abgang. Position/Phase nur aus
  `verstrichen` (via `phaseBei`), Abgang über eigene Abgangsuhr (Summe der `dt`).
- **Fahrzeug:** aus `welt.fahrzeuge` (geteilte Geometrie/Material), äußere Gruppe mit
  `rotation.y = DREHUNG · π/180`, gleichmäßig skaliert so, dass die z-Ausdehnung **nach**
  Drehung `LAENGE × FAHRZEUGE.SPIEL_SKALA (0,8)` ist, Front −z, Layer 1. z-Angaben beziehen
  sich auf die **Mitte der Bounding-Box**; in Szene **und** `welt.laufGruppen` eingetragen.
- **Wege** (Welt-z; Wand z = −5, Front z = −y; `L` = Fahrzeuglänge im Spiel): Start
  z = +10, Fahrspur x = `FAHRZEUGE.SPUR_X = 1.8` (Durchdringung mit Läufern bewusst
  akzeptiert). In jeder `fahrt`-Phase ist das Fahrzeug **genau am Phasenende** am Ziel
  (linear über `anteil`).
  - Halt 1 (beide) = `−5 − L/2 − 1` (Heck 1 m hinter der Wand). Haubitze bleibt dort.
  - Panzer Halt 2 = `−(5 + max(0, y − 5)/2)`, `y` beim **Start** der zweiten Fahrt
    eingefroren; ist Halt 2 nicht mindestens 2 m vor Halt 1 (`Halt2 > Halt1 − 2`), bewegt
    sich der Panzer in Fahrt 2 nicht (Halt 2 := Halt 1).
  - Schneise: von Halt 2 nach `min(Halt2, −y_s − 6)` (`y_s` beim Schneisenstart
    eingefroren) — nie rückwärts.
- **Abgang:** nach Ablaufende (oder sofort bei Sieg/Niederlage) schrumpft das Fahrzeug in
  0,8 s auf 0 und wird entfernt; `nachlauf(dt)` treibt das weiter, spätestens nach 3 s
  Nachlauf ist alles entfernt und die Maske aufgehoben.

### A2 Feuer, Einschläge, Schneise
- **`Explosionen`** (`anzeigen.ts`): ein `InstancedMesh`, Quads mit 64-px-Canvas-Textur
  (orange-gelb, additiv), höchstens `DARSTELLUNG.EXPLOSIONEN_MAX = 8`, davon höchstens 2
  gleichzeitig mit Ø > 4 m; Ablauf 0,45 s (wächst 0,4 → Zielgröße, blendet aus). Eigene
  `Muendungsblitze`-Instanz für Fahrzeuge (max 4). Eigener Zufallsstrom
  `zufallEinsatz` (Mulberry32, Seed aus `SpielLauf`), nicht der geteilte.
- **Mündung** je Fahrzeug als Konstante `FAHRZEUGE.<name>.MUENDUNG = [x,y,z]` in normierten
  Modellkoordinaten (vor Spiel-Skalierung, Front −z), von Codex an der Geometrie bestimmt
  (vorderstes Rohrende) und im Bericht genannt; Claude prüft im Bild.
- **Panzer `feuer`:** alle 0,5 s ein Schuss (nur wenn im selben Bild ein `spezialTreffer`
  des Panzers gemeldet wurde, also `Z > 0`): Mündungsblitz + Explosion Ø 2,5 m an zufälliger
  Stelle der vordersten 4 m der Horde.
- **Haubitze:** je `spezialTreffer`-Ereignis der Haubitze ein Mündungsblitz + Explosion
  Ø 5 m zufällig in der Horde (z zwischen −y − 2 und −y − 12).
- **Schneisen-Maske:** Es gibt **genau einen** Aufbaupfad der sichtbaren Horde — neuer
  privater Helfer `baueHorde(zahl, maske)` in `lauf.ts`, der den heutigen Aufruf
  `bossFreieAufstellung(zombies, 0, FIGUREN.MINIBOSS_FREIRADIUS, 73291, -1, true)` ersetzt
  (dort heute nur bei geänderter Zahl und alle ≥ 0,25 s): Aufstellung nach Zahl, danach Filter
  "Welt-x im Band `|x − panzerX| < breite` und Welt-z zwischen Panzer-z und −y"
  (Welt-z = Gruppen-z + Eintrags-z). Neu gesetzt, wenn Zahl ≠ `letzteHorde` **oder**
  Maskenschlüssel ≠ `letzterMaskenSchluessel`; Drossel 0,1 s nur bei aktiver Maske, sonst
  weiter 0,25 s (Messbasis unverändert). `breite` = 1,4 während Schneise und Abgang, danach schließt sich die
  Schneise über 2 s (`breite` → 0, die Horde "läuft zusammen"), dann Maske aus. Die Zahl `Z`
  bleibt die des Kerns. Wiederverwendete Arrays, keine neuen Objekte je Aufruf.

### A3 Prüfparameter und Budget
- `?einsatz=panzer|haubitze|humvee|hubschrauber` wirkt **nur zusammen mit `?pruefung=1`**
  (Gate: `new URLSearchParams(location.search).get('pruefung') === '1'`, unabhängig vom
  bestehenden `'soldat'`-Zweig; neues Flag, vorher nicht vorhanden): `einstieg.ts` ruft direkt
  nach dem Erzeugen des **ersten** `SpielLauf` einmalig `starteEinheit(lauf.zustand, name)` und
  `lauf.protokollNeuBasieren()` auf; nicht bei "Nochmal"; unbekannte Namen ignorieren; kein
  Fortschritt speichern.
- Budget: Summe der `Mesh` aller Feld-Fahrzeuge je Fahrzeug 1 (Panzer, Haubitze laut GLB je
  1 Netz); Explosionen 1 Draw Call, Fahrzeug-Blitze 1. Claude misst im Browser: Zuwachs
  `renderer.info.render.calls` im Panzer-/Haubitzenbild ≤ +6 gegenüber ohne Einheit.
  "Hauptbündel unverändert" = Einstiegs-Bündel ohne den nachgeladenen 3D-Teil.

### A4 Tests und Nachweise
- Tests: R wie oben; Weg-Kopplung (Panzer am Phasenende genau am Halt ±0,05 m; Halt 2 bei
  kleinem y entfällt); Abgleich über `z.aktiv` (Anlegen ohne Ereignis, Abgang bei Verschwinden,
  Abgang bei Sieg); Explosionen ≤ 8 und ≤ 2 große; Maske: `setze`-Argumentliste enthält im
  Band keine Zombies während Schneise, nach Schließen wieder alle; `zuruecksetzen()` nach
  Bot-Darstellung; `gibFrei` hinterlässt nichts in Szene/`laufGruppen`, geteilte Ressourcen
  nicht freigegeben; `?einsatz` ohne `?pruefung=1` wirkungslos.
- `npm test`, `tsc`, `build`, `npm run bots3d` grün; kein `http` in `src/v3d/`.
- Claude prüft Bild (`?pruefung=1&einsatz=panzer`, `…=haubitze`), Draw Calls,
  Zweitstart-Zähler; Thomas: iPhone + Messung.
- **Reißleine:** Bot-Grenzen verletzt oder Messung < 55 fps → melden, nicht selbst an Werten
  drehen.

## Nicht in diesem Schritt

Humvee und Hubschrauber auf dem Feld (D5c), Klang, Trümmer (D8).

## Implementation Summary

- D5b umgesetzt: vier phasenbasierte Abläufe im Rechenkern mit abgeleiteter Restzeit, phasengetreuer Wirkung und drei zeitlich festgelegten Haubitzeneinschlägen. Humvee und Hubschrauber bleiben wie spezifiziert ohne Feldbild.
- Panzer und Haubitze werden aus den geteilten GLB-Ressourcen auf dem Feld gefahren, feuern mit eigenen Mündungsblitzen und Explosionen; der Panzer öffnet und schließt eine sichtbare Schneise. Zustandsabgleich, Abgang, Nachlauf und Ressourcenfreigabe sind eingebunden. Modellpunkte `MUENDUNG`: Panzer `[0, 2.02, -4.9]` bei `DREHUNG=0°`, Haubitze `[-0.032, 2.54, -3.65]` bei `DREHUNG=0°` (jeweils normierte Modellkoordinaten, vorderstes Rohrende).
- `?einsatz=...` greift nur zusammen mit `?pruefung=1` beim ersten Lauf; kein erneuter Einsatz über „Nochmal“.
- Bots Vorher/Nachher, jeweils Siege/20 und Ø-Dauer: passiv `0, 115.6 s` → `0, 115.6 s`; nurLinks `0, 75.0 s` → `0, 75.0 s`; rhythmus(40) `20, 123.1 s` → `20, 123.1 s`; rhythmusSaeule(60) `20, 108.0 s` → `20, 108.0 s`; rhythmusSaeule(15) `0, 118.9 s` → `0, 118.9 s`; rhythmusSaeule(25) `0, 124.8 s` → `0, 124.8 s`. Grenzen eingehalten, Zahlen unverändert.
- Nachweis: `npm test` 64 Dateien/576 Tests grün; `npm run check` und `npm run build` grün; `npm run bots3d` grün; `git diff --check` grün; kein `http` in `src/v3d/`. Browserbild, Draw Calls, Zweitstart-Zähler, iPhone und FPS-Messung sind externe Abnahmen durch Claude/Thomas und wurden hier nicht behauptet. Terminal.app war in dieser Umgebung nicht verfügbar; die Testsuite lief erfolgreich direkt im Shell-Prozess.
