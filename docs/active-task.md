# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D5a — Fahrzeuge in den Säulen (Run Gun 3D)

Verbindlicher Plan: `docs/plan-v7.md`, Zeile "Spezialeinheiten", "Schrittfolge → D5a",
Modellquellen-Regel. Säulen, Zähler, Abbau durch Beschuss und Vorschau gibt es schon (R2, D3,
D4-Nacharbeit). Dieser Schritt bereitet die **vier von Thomas gewählten Fahrzeuge** auf und
setzt sie als **Miniatur in die Glassäulen** (statt des grünen Platzhalter-Kastens). Einsatz auf
dem Feld (fahren, feuern) folgt in D5b/c — die Modelle werden deshalb so aufbereitet, dass
D5b/c sie direkt nutzen kann.

## Quellen (nur lesen, nicht eingecheckt; Pfade als Konstanten im Skript)

Alle CC-BY 4.0 (Sketchfab), entpackt unter `tmp/fahrzeuge/<name>/scene.gltf` (Kopie aus
`~/Downloads/rungun-roh/`, `tmp/` ist ignoriert — wie `tmp/UAL1_Standard.glb`) mit
`license.txt` (Titel, Autor, Link):

| Name | Modell | Autor | Dreiecke | Aufbau |
|---|---|---|---|---|
| `humvee` | Low Poly Humvee vehicle | Duane's Mind | 1528 | 7 Netze, 1 Material, baseColor + metallicRoughness 1024² |
| `panzer` | AMX-56 Low Poly | Waroxed | 1560 | 3 Netze, 1 Material, baseColor + specular 1024² (KHR_materials_specular) |
| `haubitze` | M144 155mm Howitzer low poly | Cyan_dev10 | 3714 | 8 Netze, 8 Materialien, **keine Bilder** (nur Farben) |
| `hubschrauber` | Low Poly Apache Gunship | Duane's Mind | 2907 | 4 Netze (`Rotor`, `Back_Rotor` eigene Knoten), 2 Materialien, 1024² + 512² |

## Erlaubte Änderungen (abschließend)

- `scripts/modelle.mjs`: neue Ziele `humvee`, `panzer`, `haubitze`, `hubschrauber` (und
  `fahrzeuge` = alle vier). Ausgabe `src/v3d/modelle/v3d-<name>.glb`.
- Neu `src/v3d/fahrzeuge.ts` (Laden, `FahrzeugBau`, Miniatur-Erzeugung, Freigabe).
- `src/v3d/szene.ts` (Lade-Gate, Säulen-Innenleben, Nahaufnahme), `src/v3d/lauf.ts` (nur
  Drehen der Miniaturen/Rotor und Sichtbarkeit beim Vorrücken), `src/v3d/balance3d.ts`
  (neuer Block `FAHRZEUGE`), `docs/lizenzen.md` (vier Einträge), Tests
  `tests/v3dFahrzeuge.test.ts` (neu), `tests/v3dBuild.test.ts`, `tests/v3dLauf.test.ts`,
  `tests/v3dBuehne.test.ts` (nur wo Säulen-Innenleben geprüft wird).
- Keine neuen Pakete. **Nicht:** `rechnung.ts`, `LEVELS`, `SPEZIAL`, Figuren-/Boss-Modelle.

## Akzeptanzkriterien

### A1 Aufbereitung (`node scripts/modelle.mjs fahrzeuge`)
Je Fahrzeug, wiederholbar (gleiche Eingabe → gleiche Werte):
- **Nur Grundfarbe:** metallicRoughness-, specular- und sonstige Bilder sowie
  `KHR_materials_specular` entfernen; Material Metal-Rough mit Metall 0, Rauheit 0,8.
- **Ein Material, ein Bild:** Hat das Modell mehrere Bilder (Hubschrauber), in einen Atlas
  legen und UVs umrechnen (wie Soldat D2b); Bild **512 × 512 WebP**. **Haubitze** (nur
  Farben): Farben als kleine Palette in ein 64 × 64-Bild, UVs aller Punkte eines
  Teilnetzes auf sein Palettenfeld (Kachelmitte).
- **Netze zusammenführen:** alles zu **einem** Netz — außer beim Hubschrauber: `Rotor` und
  `Back_Rotor` bleiben **eigene Knoten** mit Namen `rotor` / `heckrotor`, ihr Drehpunkt =
  Rotornabe (Knotenursprung), Drehachse im Bericht nennen. Die Rotor-Animation der Quelle
  wird entfernt (Drehung macht der Code).
- **Lage normieren:** Fahrzeug steht auf `y = 0`, mittig in x/z, **Front zeigt nach −z**
  (zur Horde). Die dafür nötige Drehung je Modell bestimmt Codex (z. B. über die längste
  waagrechte Achse + Lage von Rohr/Kühler/Cockpit) und nennt sie im Bericht; Claude prüft
  im Bild.
- **Maßstab real** (Länge über alles, 1 Einheit = 1 m): Humvee 4,6 m, Panzer 9,8 m
  (inkl. Rohr), Haubitze 7,3 m, Hubschrauber 17,7 m (inkl. Rotor). Werte als
  `FAHRZEUGE.<name>.LAENGE`.
- Prüfungen am Skriptende (Abbruch bei Verletzung): Dreiecke je Modell ≤ 4000, genau ein
  Material und ein Bild, Datei ≤ 1 MB, Hubschrauber hat Knoten `rotor` und `heckrotor`.

### A2 Laden (`src/v3d/fahrzeuge.ts`)
- `ladeFahrzeuge(abgebrochen)` lädt alle vier `.glb` (Import `?url`) im **gemeinsamen
  Lade-Gate** der Szene (gleiches Zeitlimit, gleiche Fehlermeldung, Freigabe halb geladener
  Teile wie Bosse). Ergebnis `FahrzeugBau` je Name: Geometrie(n), ein Material
  (`MeshStandardMaterial`, `map` sRGB, `flipY = false`), Länge.
- `baueMiniatur(bau, name, zielGroesse)` → `THREE.Group` aus **geteilten** Geometrien und
  Materialien (keine Kopien), Hubschrauber mit benannten Rotor-Kindern.
- `gibFrei()` gibt Geometrien, Materialien, Bilder frei.

### A3 Miniatur in der Säule
- Der grüne Innenkasten entfällt. In jeder Säule (aktuelle + Vorschau) steht die Miniatur
  **ihres** Fahrzeugs (Reihenfolge `LEVELS[0].saeulen`): gleichmäßig skaliert, sodass sie in
  einen Kasten **1,3 × 1,6 × 1,3 m** (B × H × T) passt, auf dem Säulenboden, Front −z.
- Miniaturen drehen sich langsam (eine Umdrehung in `FAHRZEUGE.DREH_S = 8` s), der
  Rotor der Hubschrauber-Miniatur dreht sich schnell (4 U/s, Heckrotor 6 U/s) — über die
  Darstellungsuhr der `WeltDarstellung`, Pause friert ein.
- `einheitFrei`: die Miniatur verschwindet mit der Säule wie heute der Innenkasten; das
  Vorrücken nimmt die Miniaturen mit; "Nochmal" stellt alles wieder her.
- Layer wie die Säule (Spiegelung im Wasser egal, Layer 1 wie Figuren ist ok).

### A4 Nahaufnahme für die Prüfung
- `?nahaufnahme=fahrzeuge`: die vier Fahrzeuge in **realer Größe** nebeneinander (Abstand
  so, dass sie sich nicht berühren), drehen langsam, Kamera wie Boss-Nahaufnahme; darunter
  als Text je Fahrzeug: Name, Länge, Dreiecke, Drehung beim Normieren.

### A5 Lizenzen und Build
- `docs/lizenzen.md`: vier Einträge (Titel, Autor mit Link, Quelle, "CC-BY 4.0",
  Änderungen: vereinfacht, Bilder reduziert, Lage/Maßstab normiert, zu Miniatur
  skaliert) — die INFO-Tafel zeigt sie automatisch.
- Build: alle vier `.glb` im Precache, Summe 3D-Dateien ≤ 25 MB, Hauptbündel unverändert,
  kein `http` in `src/v3d/`.

### A6 Tests und Nachweise
- `tests/v3dFahrzeuge.test.ts`: glb-JSON-Prüfungen aller vier (A1-Grenzen, ein Material,
  ein Bild, Rotor-Knoten), Lizenzen enthalten alle vier Titel und Autoren; Miniatur passt in
  1,3 × 1,6 × 1,3; Säule i zeigt Fahrzeug `saeulen[i]`; Vorrücken nimmt Miniatur mit.
- `npm test`, `tsc`, `build` grün. Claude prüft: Nahaufnahme (Lage/Front/Farben),
  Säulen im Spielbild, Zweitstart-Zähler; Thomas: iPhone + Messung.
- **Reißleine:** Ist ein Modell nach dem Aufbereiten erkennbar kaputt (Löcher, falsche
  Farben), nicht nachbohren — im Bericht melden; Claude und Thomas wählen einen anderen
  Kandidaten.

## Nicht in diesem Schritt

Fahrzeuge auf dem Feld, Einsatz-Animationen, Treffer (D5b/c).

## Implementation Summary

- Vier Fahrzeuge als reproduzierbare GLB-Dateien mit je einem Material/Bild aufbereitet; Größen 4,6/9,8/7,3/17,7 m. Drehung um y beim Normieren: Humvee 180°, Panzer 180°, Haubitze 0°, Hubschrauber 180°. Hauptrotor dreht um die lokale y-Achse, Heckrotor um die lokale x-Achse.
- Gemeinsames Laden und Freigeben, passende Miniaturen in allen vier Säulen, Vorschau/Vorrücken/Neustart und Rotorbewegung umgesetzt. `?nahaufnahme=fahrzeuge` zeigt die vier Modelle auf neutralem Boden, blendet Spielobjekte aus, rahmt ihre volle Breite bei 20° Aufsicht ein und zeigt darunter Name, Länge, Dreiecke und Normierungsdrehung als lesbare Textliste.
- `node scripts/modelle.mjs fahrzeuge` erneut erfolgreich, SHA-256 aller vier Ausgaben identisch zum vorherigen Stand. `npm test`: 64 Dateien, 569 Tests grün; `npm run check` und `npm run build` grün; `git diff --check` grün. Vier Fahrzeug-GLBs im Precache; neun GLBs zusammen 4,18 MB, mit vier WebP-Bildern 4,57 MB (Grenze 25 MB); kein `http` in `src/v3d/`.
- Bildprüfung im Browser nicht möglich: kein angebundener Browser; der Chrome-Zugriff für diese Session wurde abgelehnt. Deshalb Lage/Front/Farben, Säulen-Spielbild und Zweitstart-Zähler noch von Claude zu prüfen; iPhone-Test und Messung bleiben bei Thomas. Kein Commit oder Push (Projektregel).
- Nacharbeit 1: Miniaturen auf Unterkante 2,2 m angehoben, Zielkasten auf 1,5³ m vergrößert, dunklen geteilten Sockel ergänzt und Schweben mit ±0,08 m in 2 s an die pausierbare Darstellungsuhr gebunden. Glas-Deckkraft 0,15, Trefferblitz weiterhin 0,65, Rücksetzung auf 0,15. Tests prüfen Maße, Höhe, Sockel, Deckkraft, Schweben, Pause und Treffer-Rücksetzung.

## Fortsetzung (Claude 2026-09-30 13:16) — Codex-Lauf brach am Nutzungslimit ab

Stand: Modelle, `fahrzeuge.ts`, Säulen-Miniaturen und Tests sind da (568 Tests grün, Build
grün). **Offen:**
1. **Nahaufnahme `?nahaufnahme=fahrzeuge` (A4):** Kamera ist viel zu weit weg (Fahrzeuge
   winzig am Horizont, stehen neben der Straße auf dem Wasser). Kamera so setzen, dass die
   vier Fahrzeuge die Bildbreite zu ~90 % füllen, Blick leicht von oben (~20°); Fahrzeuge
   auf die Straße/einen neutralen Boden, Wasser/Zombies/Boss dort ausblenden wie in den
   anderen Nahaufnahmen. **Textliste** je Fahrzeug (Name, Länge, Dreiecke, Drehung beim
   Normieren) fehlt noch.
2. Restliche Kriterien prüfen, Bericht mit Drehung je Modell und Rotorachse,
   Status `IMPL_DONE`.

## Nacharbeit 1 (Claude-Review 2026-09-30 13:45) — Miniaturen kaum sichtbar

Browserbefund (390×844): Die Miniaturen stehen am Säulenboden, sind klein und wirken durch
das milchige Glas ausgebleicht; bei den Vorschau-Säulen verdeckt die vordere Säule genau den
unteren Teil der hinteren — man sieht dort nur leere Glaskästen. Änderung:
1. Miniatur **schwebt im oberen Bereich**: Unterkante bei `y = FAHRZEUGE.MINI_Y = 2.2`,
   Zielkasten **1,5 × 1,5 × 1,5 m** (statt 1,3 × 1,6 × 1,3), leichtes Auf-und-ab
   (±0,08 m, 2 s Periode) zusätzlich zur Drehung. Ein flacher, dunkler Sockel
   (Scheibe ⌀ 1,3 m, 0,06 m hoch, geteilte Geometrie/Material) direkt unter der Miniatur.
2. **Glas klarer:** Deckkraft 0,3 → **0,15**, die Treffer-Aufhellung bleibt relativ dazu
   (heller Blitz wie bisher, danach zurück auf 0,15; Rücksetzen in `gibFrei` auf 0,15).
3. Test anpassen: Miniatur passt in 1,5³, Unterkante bei 2,2 ± 0,1, Sockel vorhanden,
   Glas-Deckkraft 0,15.
`npm test`, `tsc`, `build` grün; Status `IMPL_DONE`, Nachtrag.
