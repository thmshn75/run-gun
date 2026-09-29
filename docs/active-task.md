# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D2a — Zombie-Masse (Run Gun 3D)

Verbindlicher Plan: `docs/plan-v7.md`, Abschnitte "Machbarkeit → Folgerungen",
"Unverhandelbare Randbedingungen" (v. a. 3, 4, 5, 7, 8) und "Schrittfolge → D2a".
Dieser Schritt bringt die **echten Zombies** in den 3D-Modus: Modell aufbereiten, Laufbild
backen, als Instanzen zeichnen, drei Bemalungs-Varianten. Die Zombies stehen als Block
auf der Straße und laufen **auf der Stelle** (Vorwärtsbewegung, Wellen, Front: D4).
Vorlage für das Backen und Zeichnen: `public/probe-3d/diagnose7.html` (Funktionen
`aufDerStelle`, `backe`, `netze`, `fuelle`) — am iPhone bewiesen (1000 Zombies 57 fps).
Koordinaten wie in D1 (`balance3d.ts`, Block `BUEHNE`): 1 Einheit = 1 m, vorwärts = −z.

## Erlaubte Änderungen (abschließend)

- Neu: `scripts/modelle.mjs`, `src/v3d/figuren.ts`, `src/v3d/modelle/` (Ausgabe),
  Bemalungs-Varianten unter `src/v3d/bilder/`, `scripts/zombie-varianten.py`,
  Test `tests/v3dFiguren.test.ts`.
- Geändert: `src/v3d/szene.ts` (Horde-Platzhalter → echte Zombies, Lade-Gate),
  `src/v3d/messung.ts` (Vollast-Zombies → echte Zombies, Messstufen),
  `src/v3d/balance3d.ts` (neue Konstanten im Block `BUEHNE` oder neuer Block `FIGUREN`),
  `src/v3d/einstieg.ts` (nur Bildtakt-Aufruf der Zombie-Aktualisierung),
  `tests/v3dBuild.test.ts` (`.glb` wie `.webp` prüfen), bestehende v3d-Tests nur wo
  Werte gewollt geändert werden (im Bericht nennen).
- `modelle-quelle/zombie/` ist die eingecheckte Rohquelle (Sketchfab "Zombie Walk Test",
  CC-BY 4.0, Lizenz liegt bei) — nur lesen.
- `package.json`: Claude hat bereits installiert (**nicht erneut installieren**, kein
  Netz nötig) — **nur `devDependencies`**, exakt gepinnt:
  `@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions`,
  `meshoptimizer`, `sharp` (für Verkleinern/WebP) — nur für `scripts/modelle.mjs`, nie
  im Spiel-Code importiert (Hauptbündel-Test und Isolationstest bleiben grün). Kein
  `npx` im Skript. (Bewusste, von Claude entschiedene Erweiterung von Plan-
  Randbedingung 1: reine Werkzeug-Pakete, kein Einfluss aufs Spiel.)
- `docs/lizenzen.md`: Änderungsvermerk Zombie ergänzen: "Bemalung in zwei
  Farbvarianten umgefärbt, Laufbild in feste Formen gebacken, Bewegung auf der Stelle".

## Akzeptanzkriterien

### A1 Aufbereitung (`scripts/modelle.mjs`, Plan Randbedingung 8)

Aufruf `node scripts/modelle.mjs zombie`. Eingabe `modelle-quelle/zombie/scene.gltf`,
Ausgabe `src/v3d/modelle/v3d-zombie.glb`. Umsetzung mit der `@gltf-transform`-API im
Skript (nicht CLI), in dieser Reihenfolge:
1. Spec-Gloss → Metal-Rough (`metalRough()` aus functions), danach am Material
   `normalTexture`, `metallicRoughnessTexture`, `occlusionTexture`, `emissiveTexture`
   auf `null`, Faktoren: `baseColorFactor = [1,1,1,1]`, `metallicFactor = 0`,
   `roughnessFactor = 0.85`; Erweiterungen für Specular/Glossiness entfernen.
2. **UV-Fläche zuschneiden:** Die UVs belegen nur ca. `u 0,003–0,749`, `v 0,505–0,999`
   (37 % des Bildes). Genutzte UV-Hülle (mit 8 px Rand) aus dem Farbbild ausschneiden,
   UVs auf die neue Fläche umrechnen, dann auf **512 × 512** verkleinern (Seitenverhältnis
   darf verzerrt werden, UVs sind entsprechend umgerechnet). Ergebnis: UVs füllen ≥ 90 %
   von [0,1]².
3. `weld` nur mit Toleranz, die UV-Nähte erhält (Attribute mitvergleichen, Standard der
   API), danach **`simplify` mit `lockBorder: true`** und festem `error`; das Verhältnis
   wird per Bisektion gesucht (höchstens 8 Läufe), bis **900 – 1100 Dreiecke** erreicht
   sind.
4. Tangenten entfernen, `resample`, `prune`, `dedup`, Farbbild als WebP (Qualität 90).
5. **Prüfung am Ende** (Abbruch mit Fehlercode, wenn verletzt): Dreiecke 900 – 1100,
   genau ein Bild, 512 × 512, Material wie in 1., mindestens eine Animation,
   Dateigröße ≤ 1 MB, UV-Spanne ≥ 90 %.
6. **Qualitäts-Rückfall:** Sieht die Nahaufnahme (A5) schlechter aus als die am iPhone
   geprüfte Referenz `public/probe-3d/modelle/sf_zombie_m.glb` (1009 Dreiecke), entscheidet
   Claude; Codex nennt im Bericht nur die Werte beider Dateien.
Das Skript ist wiederholbar (gleiche Eingabe → gleiche Werte, Versionen gepinnt); die
Ausgabe-Datei wird eingecheckt, der Build braucht das Skript nicht.

### A2 Bemalungs-Varianten (`scripts/zombie-varianten.py`)

Drei Varianten derselben UV-Bemalung, damit die Masse nicht wie Klone aussieht:
`a` = Original (steckt in der `.glb`), `b` und `c` als `src/v3d/bilder/v3d-zombie-b.webp`,
`-c.webp` (512 × 512, WebP Qualität 90).
- **Nur Pixel-Umfärbung mit PIL**, kein Bildgenerator auf der UV-Bemalung (er würde die
  UV-Anordnung zerstören — bewusste Abweichung von Randbedingung 9, hier begründet):
  Farbbereiche erkennen (Kleidung vs. Haut über Farbton/Sättigung, nur innerhalb der
  von UV-Dreiecken belegten Fläche — Maske aus den UVs der fertigen `.glb`) und
  getrennt verschieben; Arbeit auf der fertigen 512er-Bemalung aus A1. `b`: Kleidung deutlich andere Farbe (z. B. verwaschenes Blau/Grau),
  Haut etwas grünlicher. `c`: Kleidung dunkel/erdig (Braun/Olive), Haut fahler,
  einige dunkelrote Flecken (Blut) in der Kleidung. **Mittlere Helligkeit jeder
  Variante ≥ 45 (0–255)** über die belegte Fläche — das Skript prüft das, sonst
  schlägt die Schwarz-Erkennung des Messmodus falsch an.
- Kontrollbild `tmp/zombie-varianten.png` (drei Bemalungen nebeneinander) im Bericht
  nennen (Ordner `tmp/` ist in `.gitignore`).

### A3 Laden und Backen (`src/v3d/figuren.ts`)

- `ladeZombie(renderer)`: lädt `v3d-zombie.glb` (Import `?url`) und beide Varianten-
  Bemalungen; gehört zum **Lade-Gate** aus D1 (gleiches `Promise.all`, gleiches 8-s-Limit,
  gleiche Fehlermeldung, Freigabe halb geladener Teile).
- Backen erst, wenn glb **und** beide Bemalungen geladen sind; vorher `abgebrochen()`
  prüfen. Teilergebnisse, die nach Zeitlimit oder Abbruch eintreffen, beim Eintreffen
  sofort freigeben (wie `vorbei` in D1).
- **Laufzyklus:** Der Clip `ANIMATION ZOMBIE` ist 4,03 s lang, die Hüfte legt dabei
  ca. 1,3 m zurück. Codex bestimmt aus der Fußhöhe (tiefster Punkt linker/rechter Fuß
  je Zeit), wie viele Schritte der Clip enthält, und **backt genau einen Gangzyklus
  (zwei Schritte)** in **`ZOMBIE_FORMEN = 12`** feste Formen. Abgespielt wird ein
  Zyklus in **`ZOMBIE_ZYKLUS_S = 1.1` s** (Konstanten in `balance3d.ts`). Im Bericht:
  Clip-Dauer, Schrittzahl, gewählter Zeitabschnitt.
- `backe(gltf, hoehe)` nach `diagnose7.html`: Wurzelbewegung entfernen (`aufDerStelle`),
  Formen per `getVertexPosition`, alle Teilnetze zu **einer** Geometrie je Form. Nur
  Form 0 per `mergeGeometries`; Formen 1–11 sind `clone()` davon mit neuem `position`
  und `normal`, **`uv` und `index` bleiben dasselbe Objekt** (Test). Höhe
  **`ZOMBIE_HOEHE = 1.3` m**, gemessen über **alle** Formen (größte Höhe), Füße: in
  jeder Form liegt der tiefste Punkt bei `y = 0 ± 0,03`.
- Rutschen/Ruckeln (Test): waagrechte Schwerpunkt-Verschiebung zwischen den Formen
  < 0,05 m; der Unterschied Form 11 → Form 0 ist nicht größer als der größte Unterschied
  zweier benachbarter Formen (Zyklus schließt).
- Material je Variante: `MeshStandardMaterial({ map, roughness: 0.85, metalness: 0,
  side: FrontSide })`, `map.colorSpace = SRGB`; Varianten-Bilder mit denselben
  Einstellungen wie das glTF-Bild (`flipY = false`, gleiche `wrapS/wrapT`, gleiche
  Filter).
- Blickrichtung: Die Zombies schauen **zur Kamera (+z)**. Stimmt die Modellrichtung nicht,
  beim Backen drehen (im Bericht sagen, um wie viel).

### A4 Zeichnen (`ZombieMasse` in `figuren.ts`)

- `new ZombieMasse(bau, materialien[3], max)` legt je Variante × Phasengruppe ein
  `InstancedMesh` an (3 Varianten × **8 Gruppen** = 24 Netze), **jedes mit Kapazität
  `max`**, Layer 1, `frustumCulled = false`, `DynamicDrawUsage`. `count` je Netz wird
  aus der Liste gezählt.
- `setze(liste)` mit Einträgen `{ x, z, dreh, variante, groesse }`; Figur `i` gehört zur
  Gruppe `i % 8` (Phasenversatz). `aktualisiere(zeitSekunden)`: je Gruppe
  `geometry = form[(g · 12/8 gerundet + bild) % 12]` mit
  `bild = floor(zeit / ZOMBIE_ZYKLUS_S · 12) % 12` — keine Matrix-Neuberechnung pro
  Bild, solange sich Positionen nicht ändern.
- Reine Hilfsfunktion `bildFuer(gruppe, zeit, dauer)` (getestet).
- `gibFrei()` gibt **alle 12 Formen**, die Varianten-Bemalungen, die Materialien und die
  `InstancedMesh`-Objekte (`.dispose()`) frei — auch Formen, die gerade an keinem Netz
  hängen. Die glb-Bemalung ebenfalls.

### A5 Bühne und Messmodus

- `szene.ts`: Der rote Horde-Platzhalter entfällt. Stattdessen **600 Zombies** im Block
  `x ∈ [−5, 5]`, ab `z = −35` nach hinten, 24 je Reihe, Reihenabstand 0,55 m, jede zweite
  Reihe um halben Abstand versetzt, Zufallsversatz ±0,08 m, Drehung ±15°, Größe
  0,92 – 1,08, Variante zufällig gleichverteilt — alles mit festem Seed (kein
  `Math.random`). Sie laufen auf der Stelle. Die übrigen Platzhalter bleiben.
- `messung.ts`: Die 1200 Kugel-Zombies der Vollast werden **1200 echte Zombies**
  (gleiche Aufstellung wie bisher, ab `z = −22`, Varianten mit festem Seed gleich
  verteilt) — als **zweite `ZombieMasse` mit denselben Formen und Materialien** (kein
  zweites Laden). `wippe()` gilt nur noch für die Soldaten-Platzhalter. `bricheAb()`
  gibt nur die Netze der Vollast-`ZombieMasse` frei (`InstancedMesh.dispose()`), **nie
  Formen oder Materialien**, die der Bühnen-Block nutzt. Die 120 Soldaten-Platzhalter
  bleiben bis D2b. Während der Messung wird der 600er-Block ausgeblendet.
  **Messstufen nur noch Wasser 0 und Wasser 1** (Wasser 2 ist am iPhone außerhalb des
  Budgets: 54,5 fps) — Liste als Konstante, Code bleibt allgemein. `schwarzAnteil()`
  und `urteil()` bleiben unverändert.
- **Reißleine Leistung:** Codex misst nicht selbst am Gerät und „optimiert“ nichts auf
  Verdacht (keine weniger Zombies, kein gröberes Modell). Rückfälle (weniger Formen,
  Referenzmodell, Schärfe 1,5×) entscheiden Claude und Thomas nach der iPhone-Messung.
- Speicherplan zählt die Zombie-Bemalungen (glb + 2 Varianten) mit.
- **Nahaufnahme** `?nahaufnahme=1`: statt der Bühne drei Zombies (Varianten a/b/c)
  nebeneinander groß vor neutralem Grund, Kamera nah (Figur füllt ~60 % der
  Bildhöhe), laufen auf der Stelle, drehen sich langsam (eine Umdrehung in 8 s). Dient
  Claude und Thomas zur Prüfung auf Löcher (Plan Folgerung 1).
- Zweitstart (Randbedingung 5): `renderer.info.memory` gleich nach dem zweiten Start,
  auch nach einem Messlauf (Claude prüft zusätzlich mit WebGL-Zählern).

### A6 Tests und Nachweise

- `tests/v3dFiguren.test.ts`: liest `src/v3d/modelle/v3d-zombie.glb` direkt (glb-Kopf +
  JSON-Block, ohne Loader): Dreiecke 900 – 1100, genau ein Bild, mindestens eine
  Animation, Dateigröße ≤ 1 MB, Material-Faktoren wie A1, keine weiteren Bild-Slots;
  Backen in Node mit der glb (GLTFLoader `parse` ohne Bilder, falls möglich — sonst
  die Geometrie-Prüfungen aus A3 als eigene reine Funktion auf den gebackenen
  Positionen testen): Füße, Rutschen, Zyklusschluss, gemeinsame `uv`/`index`;
  `docs/lizenzen.md` enthält "Zombie Walk Test" und "OSCAR CREATIVO"; `bildFuer` für mehrere Zeiten/Gruppen; Aufstellung des
  600er-Blocks mit festem Seed deterministisch und innerhalb der Straße.
- `tests/v3dBuild.test.ts`: jede `.glb` in `dist/assets` trägt `v3d`, steht im
  Precache, zählt in die 25-MB-Summe.
- `npm test`, `npx tsc --noEmit`, `npm run build` grün; Hauptbündel nicht gewachsen.
- Isolationstest grün (kein `http` in `src/v3d/`).
- Im Bericht: erreichte Dreieckszahl, Dateigrößen, Drehung (falls nötig), Kontrollbild.
- Sichtprüfung (Nahaufnahme, Masse) macht Claude im Browser, Freigabe der Figur und
  iPhone-Messung macht Thomas.

## Nicht in diesem Schritt

Soldaten (D2b), Bosse (D2c), Bewegung nach vorn, Wellen, Front, Treffer, Umfallen
(D4). `public/probe-3d/` nicht anfassen.

## Implementation Summary

- Nacharbeit 6: Kamera um 7 m nach vorn auf `(0, 28.5, 45.7)` gesetzt; Neigung, Sichtfeld und Formatanpassung unverändert. Der Bühnentest prüft die neuen Grenzen für 390 × 844, 375 × 812 und 390 × 659 einschließlich `z = −60`, Horizont, Straßenende und Breite am oberen Bildrand.
- Nacharbeit-6-Prüfung: gezielter Bühnentest 5/5, volle Suite 58 Dateien/513 Tests, `tsc --noEmit`, `npm run build`, `git diff --check` und statische Offline-Isolation grün. Terminal.app ließ sich nicht öffnen (`Unable to find application named 'Terminal'`); Tests liefen direkt. Browser-/iPhone-Sichtprüfung und Zweitstart-Zähler bleiben für Claude/Thomas offen; keine neue Gerätemessung.
- Nacharbeit 5: `src/v3d/schilder.ts` baut +1 und ×2 als 3D-Tafeln mit 0,2-m-Platte, hellem Frontrahmen, zwei Holzpfosten und Farbverlaufs-Bemalung. Die Canvas-Größe folgt dem Plattenformat; alle +1-Tafeln teilen dieselbe Textur. +1: 2,0 × 1,2 m, Unterkante 0,5 m, −10°; ×2: 6,8 × 1,2 m über die ganze Mitte. Textur-Cache und Szene-Ressourcen werden beim Verlassen und Ladefehler freigegeben.
- Nacharbeit-5-Prüfung: gezielt 2 Dateien/7 Tests, volle Suite 58 Dateien/513 Tests, `tsc --noEmit`, `npm run build`, `git diff --check` und Offline-Isolationstest grün. Hauptbündel unverändert 1.467.937 Byte; sechs 3D-Dateien (1.244.618 Byte) im Precache. Terminal.app ließ sich hier nicht starten (`Unable to find application named 'Terminal'`); die Tests liefen deshalb direkt im Projekt. Browser-Sichtprüfung der Schilder und WebGL-Zähler beim Zweitstart bleiben für Claude/Thomas offen; die bereits gemessenen iPhone-Werte aus Nacharbeit 5 wurden nicht erneut erhoben.
- Nacharbeit 4: Asphalt mit einer gestrichelten Leitlinie bei x = 0 und vier Reifenspuren nur im mittleren Kampffeld neu erzeugt; alter Grundbelag und Randlinien bleiben. Die alten Leitlinien bei x = ±2 wurden aus der eingecheckten Kachel entfernt. Kontrollbild: `tmp/strasse-asphalt-2x2.png`.
- Die rechte Säule hat hellblau-weißes Glas (30 % Deckkraft, Rauheit 0,1), zwölf helle Rahmenkanten und einen dunkelgrünen Innenplatzhalter 1,0 × 0,6 × 1,2 m. Die ×2-Wand ist blau (`#1f6fd6`), 1,2 m hoch; ihr Schild misst 4,4 × 1 m. `tests/v3dBuehne.test.ts` erwartet die neuen Wandwerte.
- Nacharbeit-4-Prüfung: gezielt 1 Datei/5 Tests, volle Suite 57 Dateien/511 Tests, `npx tsc --noEmit`, `npm run build`, `git diff --check` und Offline-Isolationstest grün. Sechs 3D-Dateien (1.242.906 Byte) sind im Precache; Hauptbündel 1.467.937 Byte (Grenze 1.475.425). Terminal.app konnte hier nicht gestartet werden (`Unable to find application named 'Terminal'`); die Tests liefen deshalb direkt im Projekt. Browser-Sichtprüfung, WebGL-Zähler beim Zweitstart und iPhone-Leistungsmessung bleiben Claude und Thomas vorbehalten; für diese Nacharbeit wurde kein Gerätewert gemessen.
- Nacharbeit 3: Straße in drei Streifen mit zwei 0,3 × 0,25 m Betonkanten von z = −5,5 bis −220 geteilt. Die 400 Bühnen-Zombies stehen nur in der Mitte (zehn Spalten, x = −3,05 bis 3,05); die Vollast zeigt 600 Zombies ab z = −15, mit berechnetem Schwarz-Messpunkt in der Tiefe der Masse. +1-Schilder, ×2-Wand und Säule liegen vollständig in ihrem jeweiligen Streifen; Truppe und Soldaten-Aufstellung bleiben vor der Wand.
- Nacharbeit-3-Prüfung: gezielte Tests 2 Dateien/9 Tests, volle Suite 57 Dateien/511 Tests, `npx tsc --noEmit`, `npm run build`, `git diff --check` und der Offline-Isolationstest grün. Hauptbündel 1.467.937 Byte (Grenze 1.475.425), GLB im Precache. Die Tests liefen direkt im Projekt, weil die vorgeschriebene Terminal-App in dieser Umgebung nicht startbar ist (`kLSNoExecutableErr`). Browser-Sichtprüfung, WebGL-Zähler beim Zweitstart und iPhone-Messung der 600er-Vollast bleiben Claude und Thomas vorbehalten; kein Gerätewert für diese Nacharbeit behauptet.
- Nacharbeit 2: Zombie-Höhe 1,95 m; Aufstellung mit 0,63 m Spaltenabstand, 0,83 m Reihenabstand, ±0,12 m Versatz und 16 Spalten aus der Straßenbreite. Bühnenblock 400, Mess-Vollast 800 Zombies; Schwarz-Messpunkt aus der tatsächlichen Tiefe der Vollast berechnet. +1-Schilder 2,4 × 1,6 m links an der Mauer in 7-m-Abständen, ×2-Wand 2,4 m hoch und Schrift-Schild 4,4 × 2 m. Nahaufnahme für die größeren Figuren neu ausgerichtet.
- Nacharbeit-2-Prüfung: gezielter Figurentest 4/4, `npm test` 57 Dateien/510 Tests, `npx tsc --noEmit`, `npm run build`, `git diff --check` grün; kein `http` in `src/v3d/`. Build enthält die GLB weiter im Precache. Browser-Sichtprüfung, WebGL-Zähler beim Zweitstart und iPhone-Messung der neuen 800er-Vollast bleiben wie in A5/A6 Claude und Thomas vorbehalten; hier kein Gerätewert behauptet.
- Zombie zunächst aus der Rohquelle aufbereitet (906 Dreiecke); der Browser-Review zeigte dabei Löcher und schwebende Hosenteile. Nacharbeit 1 nutzt deshalb die eingecheckte, am iPhone geprüfte Referenz `modelle-quelle/zombie-vereinfacht.glb` ohne `weld` oder `simplify`: 1009 Dreiecke, 189564 Byte, 512er-WebP, UV-Spannen 0,972/0,965. Die Referenz ist bytegleich mit `public/probe-3d/modelle/sf_zombie_m.glb` (339412 Byte); alle vier Teilnetze behalten ihre Dreieckszahlen.
- `scripts/zombie-varianten.py` färbt Hose und Haut anhand der UV-Dreiecke von `Bottoms` und `Body` vollflächig getrennt; `Eyelashes` und `default` bleiben unangetastet. Variante C hat kleine weiche Blutflecken auf Körper und Hose. B/C: 26378/26674 Byte, mittlere Helligkeit 141,8/141,0. Kontrollbild: `tmp/zombie-varianten.png`. Wiederholtes Erzeugen lieferte bytegleiche GLB und Varianten.
- `src/v3d/figuren.ts` lädt im gemeinsamen 8-s-Lade-Gate, backt zwölf Formen und zeichnet 600 Zombies auf der Bühne sowie 1200 in der Vollast als Instanzen mit je drei Bemalungen und acht Phasengruppen. Der 4,033-s-Clip enthält anhand der Fußhöhen einen linken und einen rechten Schritt; verwendet wird der ganze Abschnitt 0–4,033 s. Die Referenz zeichnet ohne Drehung; hier ebenfalls 0° Korrektur. Die 120 Soldaten-Platzhalter bleiben. Messstufen 0/1, Nahaufnahme und Freigabe bei Abbruch/Zweitstart sind eingebunden. Lizenz-Änderungsvermerk ergänzt.
- Nach finalem Build: `npm test` 57 Dateien/510 Tests grün, `npx tsc --noEmit` grün, `npm run build` grün; sechs 3D-Dateien (1242499 Byte) im Precache, GLB im Build, Hauptbündel-Grenze und Isolationstest grün, `git diff --check` grün. Der zusätzliche Test vergleicht die Teilnetz-Dreieckszahlen mit der Referenz.
- Offen für Claude/Thomas: Browser-Sichtprüfung von Nahaufnahme/Masse, Messlauf und Zweitstart mit WebGL-Zählern sowie iPhone-Leistungsfreigabe. Die Nahaufnahme zeigt drei vollständige Figuren; im schmalen iPhone-Hochformat müssen sie wegen des Modell-Seitenverhältnisses kleiner als etwa 60 % Bildhöhe sein. Automatischer Chromium-Start scheiterte in dieser Umgebung an verweigerter macOS-MachPort-Registrierung; Terminal.app ist hier nicht verfügbar. Daher keine behaupteten Browser- oder Gerätewerte.

## Nacharbeit 1 (Claude-Review 2026-09-29) — Modell und Varianten

Abgenommen: Laden/Backen/Zeichnen, Bühnen-Block, Messmodus-Umbau, Tests (509 grün).
Befund im Browser (Vergleich Original / Referenz `sf_zombie_m.glb` / neue glb, gleiche
Pose): **Die neue Vereinfachung ist kaputt** — die Hose (Teilnetz `Bottoms`) ist in
schwebende Fetzen zerfallen, zwischen Oberkörper und Beinen klafft ein Loch, Kopf und
Oberkörper sind kantig. Die Referenz (1009 Dreiecke) ist sauber. Außerdem sind die
Varianten nach Farbton umgefärbt: Haut hat blaue/grüne bzw. braune Flecken (wirkt wie
Tarnmuster).

Entscheidung Claude (A1.6 Rückfall):
1. **Neue Eingabe für `scripts/modelle.mjs zombie`:** `modelle-quelle/zombie-vereinfacht.glb`
   (= die am iPhone geprüfte Referenz, jetzt eingecheckt). **Kein `simplify`, kein
   `weld`** mehr. Das Skript macht nur noch: Material bereinigen (A1.1, falls noch
   nötig), UV-Zuschnitt + 512er-WebP (A1.2), Tangenten entfernen, `prune`, `dedup`,
   Prüfungen (A1.5; Dreiecke dann ~1009, Grenze 900–1100 passt). Die Rohquelle
   `modelle-quelle/zombie/` bleibt als Herkunftsnachweis liegen.
2. **Varianten nach Körperteil, nicht nach Farbton:** Die Masken kommen aus den
   UV-Dreiecken **je Teilnetz** der fertigen glb: `Bottoms` = Hose, `Body` = Haut,
   `Eyelashes`/`default` unverändert. Hose und Haut getrennt umfärben, ganzflächig
   innerhalb der jeweiligen Maske (keine Flecken durch Farbton-Schwellen):
   - `b`: Hose dunkles verwaschenes Jeansblau, Haut leicht grünlich-grau.
   - `c`: Hose dunkles Oliv/Braun, Haut fahl gelblich-grau, ein paar dunkelrote
     Blutflecken auf Oberkörper und Hose (weich, klein).
   Helligkeitsprüfung (≥ 45) bleibt. Kontrollbild wie gehabt plus
   `tmp/zombie-varianten-3d.png` ist nicht nötig (Claude prüft im Browser).
3. Tests anpassen, falls sie die alte Eingabe/Dreieckszahl festschreiben. Rest bleibt.
Status am Ende `IMPL_DONE`, Nachtrag im Implementation Summary.

## Nacharbeit 2 (Thomas 2026-09-29) — Größen und Sichtgrenze

iPhone-Messung mit 1200 echten Zombies: Wasser 0 = 53,4 fps / 26 ms, Wasser 1 = 52,4 fps
/ 27 ms → außerhalb des Budgets. Thomas: Figuren und +1-Schilder zu klein. Entscheidung
(Thomas + Claude, Plan aktualisiert):
- `FIGUREN.ZOMBIE_HOEHE` 1,3 → **1,95** (1,5×). In `zombieAufstellung` die festen Werte
  als Konstanten in `FIGUREN` führen und mitskalieren: Spaltenabstand 0,42 → **0,63**,
  Reihenabstand 0,55 → **0,83**, Versatz jeder zweiten Reihe = halber Spaltenabstand,
  Zufallsversatz ±0,12; Spaltenzahl aus der Breite ableiten (`x ∈ [−5, 5]` → 16 je
  Reihe), keine feste 24 mehr.
- **Sichtgrenze 800 Zombies:** Konstante `FIGUREN.ZOMBIES_SICHTBAR_MAX = 800`. Vollast
  im Messmodus = 800 echte Zombies (ab `z = −22`), Bühnen-Block = **400** Zombies ab
  `z = −35`. Messpunkt Schwarz-Anteil so legen, dass er in der Vollast-Masse liegt
  (Mitte der Vollast: `z = −22 − halbe Tiefe`), als berechneter Wert, nicht fest −30.
- **+1-Schilder 2×:** 2,4 × 1,6 m, Mittelhöhe 1,6 m, Spalte an die linke Randmauer gerückt
  (`x = −6 + 0,15 + 1,2`), Abstand längs 7 m (statt 3,5). **×2-Wand 2× hoch:** 2,4 m
  (Mitte `y = 1,2`), Schrift-Schild ebenfalls 2× (4,4 × 2 m). Säulen-Platzhalter bleibt.
- Nahaufnahme: Kamera so anpassen, dass die drei Zombies wieder gut ins Bild passen.
- Tests auf die neuen Konstanten anpassen (Aufstellung innerhalb der Straße, Anzahl je
  Reihe aus Breite). Status am Ende `IMPL_DONE`, Nachtrag im Implementation Summary.

## Nacharbeit 3 (Thomas 2026-09-29) — Straße in drei Streifen, Horde nur in der Mitte

Thomas: Die Horde darf nicht in Schilder, Säulen oder Wand ragen; die Straße bekommt
eine kleine Abgrenzung; die ×2-Wand ebenso nur im eigenen Bereich. Umsetzung (alle Werte
als Konstanten in `BUEHNE`, Kommentar zur Streifen-Aufteilung dazu):
- **Drei Streifen:** links **+1-Streifen** `x ∈ [−6, −3.4]`, **Mitte (Kampffeld)**
  `x ∈ [−3.4, 3.4]`, rechts **Säulen-Streifen** `x ∈ [3.4, 6]`
  (`MITTE_HALB = 3.4`).
- **Abgrenzung:** zwei niedrige Betonkanten bei `x = ±3.4`, 0,3 m breit, 0,25 m hoch,
  Farbe wie die Randmauern, von `z = −5.5` (direkt hinter der ×2-Wand) bis `z = −220`.
  Vor der Wand (Bereich der Truppe, `z > −5.5`) keine Kante — dort steuert die Truppe
  frei über die ganze Breite.
- **Horde nur in der Mitte:** `FIGUREN.ZOMBIE_X_MIN/MAX` = `−(MITTE_HALB − 0.35)` bzw.
  `+…` (Rand zur Kante, damit Arme nicht in die Kante ragen); Spaltenzahl weiter aus der
  Breite abgeleitet (ergibt ~10 je Reihe). `zombieAufstellung` klemmt auf diese Grenzen
  (inkl. Zufallsversatz und Reihen-Versatz).
- **Sichtgrenze neu: `ZOMBIES_SICHTBAR_MAX = 600`** (≈ 60 Reihen × 10 füllen die Mitte
  von der Front bis zum oberen Bildrand). Vollast im Messmodus = 600 echte Zombies ab
  `z = −15`; Bühnen-Block = 400 ab `z = −35`. Schwarz-Messpunkt wieder berechnet in der
  Mitte der Vollast.
- **+1-Schilder** nur im linken Streifen: Breite 2,2 m, Mitte `x = −4.7`, Höhe 1,6 m.
- **×2-Wand** nur über die Mitte: Breite `2 · MITTE_HALB` (6,8 m), Mitte `x = 0`, Höhe
  2,4 m wie bisher; Schrift-Schild passend (bis 4,4 m breit).
- **Säulen-Platzhalter** Mitte `x = 4.7` (Breite 1,6 m bleibt, liegt ganz im rechten
  Streifen).
- Truppen-Platzhalter (6 m breit, `z = +1.5`) und Soldaten-Vollast (10 je Reihe, 0,6 m)
  bleiben; beide liegen vor der Wand.
- Tests: Aufstellung liegt vollständig in `[ZOMBIE_X_MIN, ZOMBIE_X_MAX]`; Schilder,
  Säule und Wand liegen je vollständig in ihrem Streifen (reine Rechnung aus den
  Konstanten). Status am Ende `IMPL_DONE`, Nachtrag im Implementation Summary.

## Nacharbeit 4 (Thomas 2026-09-29) — Leitstreifen, Glas-Säule, blaue Wand

- **Leitstreifen:** nur noch **eine** gestrichelte Linie in der Mitte des Kampffelds
  (`x = 0`), die beiden Linien bei `x = ±2` entfallen. Randlinien bleiben.
  `scripts/strasse-asphalt.py` anpassen und `v3d-strasse.webp` neu erzeugen (gleicher
  Grundbelag, gleiche Maße, Reifenspuren an die neue Aufteilung anpassen: je zwei in den
  beiden Hälften der Mitte, keine in den Seitenstreifen).
- **Säule rechts durchsichtig:** Glas-Optik — `MeshStandardMaterial` hellblau-weiß,
  `transparent: true`, `opacity 0.3`, `depthWrite: false`, Rauheit 0,1, dazu ein heller
  Rahmen (die 12 Kanten als dünne Kästen 0,06 m oder `EdgesGeometry` + `LineSegments`).
  **Innen** ein Platzhalter für die Spezialeinheit: dunkelgrüner Kasten 1,0 × 0,6 × 1,2 m
  auf dem Säulenboden (wird in D5 durch das Fahrzeug ersetzt), sichtbar durch das Glas.
  Zahl "150" bleibt oben. Zeichenreihenfolge so, dass der Inhalt durchs Glas sichtbar ist
  (Inhalt undurchsichtig zuerst, Glas danach; `renderOrder`).
- **×2-Wand:** Farbe **blau** (`#1f6fd6`, Schrift-Schild passend blau mit weißer
  Schrift), **halb so hoch: 1,2 m** (Mitte `y = 0.6`), Schrift-Schild 4,4 × 1 m.
- Tests weiter grün, Status am Ende `IMPL_DONE`, Nachtrag im Implementation Summary.

## Nacharbeit 5 (Thomas 2026-09-29) — Schilder in 3D, ×2-Schrift

iPhone-Messung nach Nacharbeit 4: Wasser 0 = 56,3 fps / 23 ms, Wasser 1 = 56,2 fps /
23 ms → **im Budget, D2a-Leistung abgenommen.** Thomas: ×2-Schrift zu breit (verzerrt),
+1-Schilder sollen "cool 3D" sein. Vorbild: `docs/vorbild/vorbild-111-8s.jpg`
(blaue Tafeln mit Pfosten links/rechts, weiße fette Schrift).
- Neuer Baustein **`src/v3d/schilder.ts`** (D3 übernimmt ihn später):
  `baueSchild({ breite, hoehe, text, farbe })` → `THREE.Group` aus
  - **Platte** als Kasten mit Tiefe 0,2 m, leicht abgerundet wirkend durch einen
    hellen Rahmen (vier schmale Kästen 0,08 m, eine Stufe heller als `farbe`) vorn;
  - **Vorderseite** mit Canvas-Bemalung **im Seitenverhältnis der Platte** (z. B.
    512 × 256 für 2 : 1; nie quadratisch gestreckt): Farbverlauf von `farbe` (oben
    heller) nach dunkler, Text weiß, fett, mit dunkler Kontur (`strokeText`, ~8 % der
    Schrifthöhe) und leichtem Schlagschatten, Schrifthöhe ~60 % der Platte, zentriert;
    Rückseite und Seiten einfarbig `farbe` (dunkler);
  - **zwei Pfosten** links und rechts (0,14 m quadratisch, Holz-Orange `#c9793a`),
    vom Boden bis Oberkante Platte + 0,1 m.
  Eine Canvas-Bemalung **je Text** wird geteilt (alle +1-Schilder nutzen dieselbe);
  Freigabe über `gibSzeneFrei` bzw. eigene `gibFrei()` — Zweitstart-Zähler bleiben gleich.
- **+1-Schilder** (linker Streifen) mit `baueSchild`: Platte 2,0 × 1,2 m, Unterkante
  0,5 m über der Straße, Farbe `#168bd2`, leicht zur Kamera geneigt (Drehung um x
  −10°), Abstand längs 7 m wie bisher.
- **×2-Wand** mit `baueSchild`: Platte 6,8 × 1,2 m (volle Mittenbreite), Unterkante auf
  der Straße, Farbe `#1f6fd6`, Text "×2" — Schrift im richtigen Seitenverhältnis (Canvas
  z. B. 1024 × 180), also nicht verzerrt; Pfosten an beiden Enden.
- Tests weiter grün (inkl. Streifen-Prüfung: Schilder und Wand bleiben in ihren
  Streifen). Status am Ende `IMPL_DONE`, Nachtrag im Implementation Summary.

## Nacharbeit 6 (Thomas 2026-09-29) — Truppe tiefer ins Bild (Kamera)

Thomas: "mein Team kann noch weiter unten stehen". Befund Claude: Die App läuft am
iPhone im Vollbild **390 × 844** (Fotos 1170 × 2532), nicht 390 × 659 (Safari mit
Leisten) — dort lag die Linie `z = 0` bei 67 %. Änderung nur an der Kamera:
- `BUEHNE.KAMERA_POSITION` → **(0, 28.5, 45.7)** (7 m nach vorn), Neigung, Sichtfeld,
  Referenz-Seitenverhältnis und `passeKameraAn` unverändert.
- Zielmaße im Test (`tests/v3dBuehne.test.ts`) neu, von Claude nachgerechnet:
  - 390 × 844 und 375 × 812: `z = 0` bei **78 – 82 %** von oben, unten ≥ 1,00,
    `(0,0,−60)` im Bild (≥ 2 % unter dem Rand), Straßenende `(±6,0,−220)` über dem Rand,
    Horizont über dem Rand.
  - 390 × 659: `z = 0` bei **86 – 90 %**, Breite auf 5 % Höhe **0,40 – 0,47**, unten ≥ 1,00,
    Rest wie oben.
- Nahaufnahme und Messmodus unverändert. Tests grün, Status `IMPL_DONE`, Nachtrag.
