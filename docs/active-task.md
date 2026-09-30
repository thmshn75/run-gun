# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D4 — Horde und Front, Kampfbild (Run Gun 3D)

Verbindlicher Plan: `docs/plan-v7.md`, "Schrittfolge → D4" (mechanischer Schlüsselschritt),
Zeile "Mechanik neu" (geschossen wird erst hinter der Wand) und Frontregel (Tabelle Rechenkern).
Der Rechenkern (`rechnung.ts`) ist fertig und bleibt **unverändert**; Front, Horde und Bosse
bewegen sich schon nach seinen Werten (`y`, `Z`, `F`, `B`). Dieser Schritt macht den **Kampf
sichtbar**: Front schießt, Zombies und Soldaten fallen, der Mini-Boss greift an und stirbt, und
das Ereignisprotokoll wird im laufenden Spiel geprüft. Das Budget ist ausgereizt (Worst Case
55,2 fps am iPhone): jede neue Darstellung ist klein, gedeckelt und ohne Zuteilungen je Bild.

## Erlaubte Änderungen (abschließend)

- `src/v3d/lauf.ts` (Hauptarbeit), `src/v3d/anzeigen.ts`, `src/v3d/balance3d.ts` (nur Block
  `DARSTELLUNG`).
- `src/v3d/figuren.ts`: neue Klasse `FallendeZombies`.
- `src/v3d/soldaten.ts`: nur `SoldatenMasse` (Fall-Startzeit je Phasengruppe, s. A3; `setze`
  wirft nie, sondern kappt still an der Kapazität).
- `src/v3d/bosse.ts`: nur `spiele(name, einmal?)` und `bossFreieAufstellung` Zweig
  `vonVorn=true` (Präfixstabilität, A2). Der Zweig ohne `vonVorn` (Messung/Vollast) bleibt.
- `src/v3d/messung.ts`: nur (a) in `messBild` die Boss-Mixer mit ticken
  (`miniboss/eliteboss.aktualisiere(sek)`), (b) Anzeige "Protokoll" und "Draw Calls" in
  "Lauf (Bot)".
- Tests: `tests/v3dLauf.test.ts`, `tests/v3dFiguren.test.ts`, `tests/v3dSoldaten.test.ts`,
  `tests/v3dBosse.test.ts` (bestehende Tests nur, wo die Spec Werte gewollt ändert —
  im Bericht nennen).
- **Nicht:** `rechnung.ts`, `LEVELS`, `SPEZIAL`, `einstieg.ts`, `szene.ts`, Modelle, Bilder.

## Grundsätze (gelten für A1–A4)

- **Besitz:** Alle neuen Objekte (Fall-Pools, Front-Blitze, Fall-Soldaten-Masse) gehören
  `WeltDarstellung` — angelegt im Konstruktor aus `welt.zombieBau`/`welt.soldatBau`, in die
  Szene und in `welt.laufGruppen` eingetragen, in `gibFrei()` entfernt und freigegeben
  (eigene Netze, Canvas-Texturen, Materialien). **Fall-Massen und `FallendeZombies` geben
  nur eigene Netze/Instanzpuffer frei (`gibNetzeFrei`-Muster); sie rufen nie
  `SoldatenMasse.gibFrei`/`ZombieMasse.gibFrei` auf und disposen nie Material, Atlas oder
  Formen aus `welt.zombieBau`/`welt.soldatBau`** (Test: Materialien nach `gibFrei()` nicht
  freigegeben).
- **Takt:** `zeige` und `nachlauf` ticken die neuen Objekte selbst, **nach** dem `setze`,
  mit der Darstellungsuhr (`fallSoldaten.aktualisiere(uhr)`, `FallendeZombies`-Ablauf,
  Blitze). Der Boss-Mixer läuft weiter über `einstieg.ts`/`messBild`.
- **Uhr:** Alle D4-Abläufe (Fall 1,1 s/Soldaten-Fenster, Boss 2 s, Aufhellen 0,1 s, Blitze)
  laufen auf einer eigenen **Darstellungsuhr** in `WeltDarstellung`, die nur über
  `zeige(…, dt)` vorrückt (`dt` ist in `SpielLauf` auf 0,1 gedeckelt). Pause → steht.
  **Nach Sieg/Niederlage** ruft `SpielLauf.schritt` statt des Kerns
  `darstellung.nachlauf?(dt)` auf (höchstens 3 s): Uhr läuft weiter, laufende Abläufe enden,
  es entstehen keine neuen. `einstieg.ts` bleibt unverändert.
- **Kontakt** ist eine gemeinsame Funktion wie im Kern: `kontakt(z) = z.F > 0 &&
  (z.Z > 0 || miniImFeld || eliteImFeld)` — gilt in A1 und A4 gleich.
- **Zufall** der Darstellung aus einem kleinen Mulberry32 mit Seed aus `SpielLauf` (in Tests
  setzbar), kein `Math.random` in neuem Code. Vektoren/Arrays vorhalten und
  wiederverwenden; die Front-Figurenliste nur bei Zahländerung neu bauen.

## Akzeptanzkriterien

### A1 Front schießt
- Bei `kontakt(z)` zeigt die Front-Formation (`w.front`, `min(floor(F), 40)` Figuren,
  Aufstellung wie bisher) **`schiessen`**, Blick −z; sonst `stehen`. Der Neu-Setz-Cache
  berücksichtigt Anzahl **und** Bewegung.
- **Front-Blitze:** eigene `Muendungsblitze`-Instanz, höchstens
  `DARSTELLUNG.FRONT_BLITZE_MAX = 8`, `FRONT_BLITZE_PRO_SEKUNDE = 12`, je 0,06 s, an der
  M4-Mündung zufälliger Front-Figuren (Mündungslage wie am Säulenbeschuss, Drehung 0). Ohne
  Kontakt oder ohne Front-Figur: keine. Säulenbeschuss rechts unverändert.

### A2 Zombies fallen
- **Horde präfixstabil** (`bosse.ts`, Zweig `vonVorn`): `zombieAufstellung(n + 100, 0,
  seed)`, Loch filtern, `slice(0, n)` — **ohne** von `n` abhängige Verschiebung. Für
  `n < m` sind die ersten `n` Einträge (x, z, dreh, variante, groesse) gleich (`toEqual`).
  Sinkt die Zahl, verschwinden Zombies hinten. Der bestehende Test "Vorderkante = 0" wird
  auf `max z ≤ FIGUREN.ZOMBIE_ZUFALLSVERSATZ + 1e-9` umgestellt; `toHaveLength(n)` für
  n ∈ {1, 300, 590, 600}.
- **`FallendeZombies`** (`figuren.ts`): je Variante ein `InstancedMesh` mit **Form 0**,
  zusammen höchstens `DARSTELLUNG.FALL_ZOMBIES_MAX = 24`, Layer 1, Kind der **Szene**
  (Weltlage beim Entstehen eingefroren, fährt nicht mit der Horde). Ablauf 1,1 s: Drehpunkt
  Fuß, 0–0,35 s kippen `rotation.x = −θ`, θ 0 → 85° mit `t²` (Kopf nach −z), 0,35–0,7 s
  liegen, 0,7–1,1 s um 0,5 m sinken, dann weg; `dreh` ±15° und `groesse` 0,92–1,08 zufällig.
  Test: Kopfpunkt `(0, h, 0)` hat bei 0,35 s `z < 0` und `y < 0,2`; nach 1,1 s ist der Pool
  leer.
- **Auslösung über Ereignisse, nicht über die sichtbare Zahl:** `fallRest +=
  Σ zombieGefallen.menge`, `n = floor(fallRest)`, `fallRest −= n`; es entstehen
  `min(n, freie Plätze, 4)` je Bild (Rest verfällt, keine Warteschlange). Lage: x zufällig
  im Hordenstreifen, **z zwischen Front und Horde** (Weltlage `−y + 0,3 … −y + 0,8`), damit
  kein stehender Zombie "doppelt" wirkt. Gleiches Muster für `spezialTreffer` (eigener
  Rest), Lage zufällig in der ganzen sichtbaren Horde. Keine Auslösung bei `y ≤ 0` oder
  nach Lauf-Ende. Unabhängig vom 600-Deckel und vom 0,25-s-Takt der Hordenaufstellung.

### A3 Soldaten fallen
- Eigene `SoldatenMasse` **`fallSoldaten`** (Kapazität `DARSTELLUNG.FALL_SOLDATEN_MAX = 8`),
  getrennt von `w.front`. Auslösung wie A2 über `soldatGefallen` (eigener Rest,
  `min(n, freie Plätze, 2)` je Bild). Lage: zufälliger Platz der vordersten Front-Reihe
  (Weltlage eingefroren). Bewegung `fallen`; Fenster je Soldat
  `max(1,2 s, Dauer fallen + 0,4 s)` ab Start, danach weg (Liste neu setzen).
- `SoldatenMasse`: `starts` wird **`Map<Phasengruppe, Startzeit>`**; `SoldatEintrag`
  erhält optional `start` (Darstellungsuhr), das `lauf.ts` für Fallende setzt. Jeder
  Fallende belegt eine freie Phasengruppe 0–7 und läuft ab seiner eigenen Startzeit.
  Test: zwei Fallende in verschiedenen Gruppen, 0,5 s Abstand → verschiedene `geometry`;
  das Ende des einen ändert die Startzeit des anderen nicht.

### A4 Mini-Boss kämpft
- Reine Funktion `bossBewegung(vorher, eingabe) → { clip, einmal, sichtbar, balken, z }`
  in `lauf.ts` (Zustände `laeuft → kaempft → stirbt → weg`), getestet mit Attrappe:
  `walk` ohne Kontakt; `attack_1` (Schleife) bei `kontakt(z)` und Mini im Feld;
  bei `B ≤ 0` einmal `death_1` (letzte Pose halten), **z-Lage beim Tod eingefroren**,
  Balken sofort weg, nach 2 s unsichtbar. Sichtbarkeit hängt an diesem Zustand, nicht an
  `imFeld && B > 0`. `spiele` wird **nur bei Zustandswechsel** aufgerufen.
- `bosse.ts`: `spiele(name, einmal?)` setzt bei jedem Aufruf `setLoop(LoopOnce|LoopRepeat)`
  und `clampWhenFinished` passend.
- Aufhellen: bei `bossTreffer` mit `boss === 'miniBoss'`, Farbe ×1,7 für 0,1 s, höchstens
  3×/s; Originalfarben **einmal je Boss-Objekt** merken (WeakMap auf Modulebene), nicht je
  Konstruktor — sonst merkt sich eine zweite Darstellung die aufgehellte Farbe.
- `eingabe` von `bossBewegung` = `{ t (Darstellungsuhr), y, kontakt, imFeld, B,
  todesDauer }`. Startzustand `weg`; → `laeuft` bei `imFeld && B > 0 && y > 0`; `z` in
  `laeuft/kaempft` = `−y − 1` (wie heute), in `stirbt` eingefroren. Unsichtbar nach
  `max(2 s, Clip-Länge death_1)` ab Tod.
- `WeltDarstellung`-Konstruktor und `gibFrei()` setzen den Mini-Boss auf `walk`, Farbe und
  Sichtbarkeit zurück (sonst steht er nach "Nochmal" in der Todespose). Der
  **Vorgänger-Zweig** in `gibFrei()` (Bot-Lauf legt eine zweite `WeltDarstellung` über
  dieselbe Welt) setzt zusätzlich alle neuen Caches, Reste, Uhrmarken und den Boss-Zustand
  des Vorgängers auf Anfang (Zustand `weg`, Clip `walk`, Farbe original). Test: nach
  Bot-Darstellung + `gibFrei()` spielt der Vorgänger wieder richtig. Elite: unverändert
  (`Motion`, D6).

### A5 Ereignisprotokoll-Invariante im laufenden Spiel
- `SpielLauf` merkt im Konstruktor `T0`, `B_start` je Boss und summiert die **zurückgegebenen**
  Ereignisse; je Schritt Prüfung (Toleranz `1e-6 · max(1, Wert)`):
  `T = T0 + Σeingesammelt − Σausgesandt`, `Z = Σwelle − ΣzombieGefallen − ΣspezialTreffer`,
  `F = ΣangekommenFront − ΣsoldatGefallen`, `B = B_start − ΣbossTreffer(boss)` je Boss.
  Dazu Darstellung: `Σ entstandene Fall-Zombies ≤ ΣzombieGefallen + ΣspezialTreffer`,
  `Σ Fall-Soldaten ≤ ΣsoldatGefallen`.
- **Beobachtung für Tests/Prüfung:** `WeltDarstellung.diag` (schreibgeschützt):
  `frontBewegung`, `frontBlitze`, `fallZombiesAktiv`, `fallZombiesEntstanden`,
  `fallSoldatenAktiv`, `fallSoldatenEntstanden`, `bossZustand`. `LaufDarstellung` bekommt
  optional `diag?()`; `SpielLauf` prüft die beiden Darstellungs-Ungleichungen darüber.
- `protokollFehler: string | null` hält den **ersten** Fehler (Zeit, Größe, Soll, Ist).
  `protokollNeuBasieren()` für Tests, die den Zustand von außen setzen. Stimmt eine
  Gleichung nicht, **nicht den Kern ändern**, sondern im Bericht melden.
- "Lauf (Bot)" zeigt am Ende "Protokoll: ok (nach X s)" bzw. den Fehler, dazu die
  höchsten `renderer.info.render.calls` im Kampf.
- Test: `MessBotSteuerung`, `dt = 1/30`, Seeds `[1,2,3,4,5]`, bis Sieg/Niederlage,
  Obergrenze 900 s Simulationszeit (Überschreitung = Fehlschlag) → `protokollFehler === null`.

### A6 Tests und Nachweise
- Test-Helfer `baueWeltAttrappe()` in den Tests (echte `THREE.Scene`, Attrappen-
  `ZombieBau`/`SoldatenBau` mit kleinen Geometrien, Boss-Attrappe mit `spiele`-Protokoll,
  `document`-/Canvas-Stub wie bestehend) — damit `WeltDarstellung` selbst getestet wird,
  nicht nur Hilfsfunktionen.
- Tests zu A1–A5 wie oben; zusätzlich Front `schiessen` nur bei Kontakt, Front-Blitze ≤ 8
  und 0 ohne Kontakt, Fall-Pools nie über Deckel bei 1000 Ereignissen in einem Bild,
  keine Auslösung nach Lauf-Ende, `gibFrei()` hinterlässt keine Objekte in Szene/
  `laufGruppen`.
- `npm test`, `tsc`, `build` grün; Hauptbündel unverändert; kein `http` in `src/v3d/`.
- Claude prüft: Zweitstart-Zähler (WebGL-Zähler gleich nach 2. Start), Bildvergleich gegen
  `docs/vorbild/`, "Lauf (Bot)" im Browser inkl. Draw Calls; Thomas misst am iPhone.

## Reißleine

- **Bild:** Überzeugt der Bildvergleich nach einem Anlauf nicht → zurück zu Thomas mit den
  Bildern (Plan).
- **Leistung:** Unter 55 fps am iPhone in "Lauf (Bot)" → in dieser Reihenfolge
  `FALL_ZOMBIES_MAX` 24 → 12, Front-Blitze aus, Boss-Aufhellen aus; reicht das nicht →
  zurück zu Thomas.

## Nicht in diesem Schritt

Treffer-Zahlen/Blut/Klang (D8), Fahrzeuge (D5), Elite-Boss-Kampf und Sieg/Niederlage-Bild
(D6), Level (D7).

## Implementation Summary

- D4-Kampfbild ergänzt: Front schießt bei Kontakt mit gedeckelten eigenen Mündungsblitzen;
  Zombies und Soldaten fallen ereignisgesteuert in eigenen, begrenzten Pools. Die Horde
  bleibt bei sinkender Zahl präfixstabil. Der Mini-Boss wechselt zwischen Lauf, Angriff,
  Tod und Ausblenden; Treffer hellen ihn kurz auf. Alle neuen Darstellungsobjekte werden
  beim Freigeben entfernt, ohne Bau-Materialien oder Formen freizugeben.
- Eigene Darstellungsuhr samt maximal 3 s Nachlauf, gesetzter Zufallsseed und Diagnosewerte.
  `SpielLauf` prüft nach jedem Kernschritt die Ereignisbilanz und merkt den ersten Fehler.
  Die Bot-Messung zeigt Protokollstand und maximale Draw Calls während Kontakt; Boss-Mixer
  laufen auch dort weiter.
- Tests: `npm test` 62 Dateien / 559 Tests grün; `npm run check`, `npm run build` und
  `git diff --check` Exit 0. Fünf Bot-Seeds mit 1/30 s enden innerhalb 900 s ohne
  Protokollfehler. Der bestehende Test zur Hordenvorderkante wurde gemäß A2 von `= 0`
  auf `≤ ZOMBIE_ZUFALLSVERSATZ` geändert. Hauptbündel 1.468.039 Byte unverändert;
  kein `http` in `src/v3d/`.
- Browser-Bildvergleich, Zweitstart-WebGL-Zähler, Lauf-(Bot)-Anzeige im Browser und
  iPhone-FPS wurden hier nicht gemessen; sie bleiben beim vorgesehenen Claude-/Thomas-Review.
