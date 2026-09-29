# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D2c — Bosse und Gesamtmessung (Run Gun 3D)

Verbindlicher Plan: `docs/plan-v7.md`, "Thomas' Entscheidungen" (Mini-Boss, Elite-Endboss),
"Machbarkeit → Folgerungen" (Bosse = echte Skelett-Figuren, Farb- + Reliefbild),
Randbedingungen 3–5, 7, 8 und "Schrittfolge → D2c". Dieser Schritt bringt **Mini-Boss und
Elite-Boss** als animierte Skelett-Figuren in die Bühne, misst ihre Kosten einzeln und dann
den **Worst Case** mit Dauertest, und nimmt danach die Testseiten aus dem Deploy.
Stand: 600 Zombies + 120 Soldaten + Wasser 1 = 55,8 fps / 24 ms am iPhone (knapp im
Budget). Vorlage für Bosse: `public/probe-3d/diagnose7.html`, Funktion `bossFigur`.

## Erlaubte Änderungen (abschließend)

- Neu: `src/v3d/bosse.ts`, `src/v3d/modelle/v3d-miniboss.glb`,
  `src/v3d/modelle/v3d-eliteboss.glb`, Test `tests/v3dBosse.test.ts`.
- Geändert: `scripts/modelle.mjs` (Ziele `miniboss`, `eliteboss`), `src/v3d/szene.ts`
  (Bosse in die Bühne, Lade-Gate), `src/v3d/messung.ts` (Stufen, Dauertest),
  `src/v3d/balance3d.ts` (Block `FIGUREN`), `src/v3d/einstieg.ts` (nur Bildtakt),
  `tests/v3dBuild.test.ts`, `docs/lizenzen.md` (Änderungsvermerke Bosse).
- Quellen (nur lesen): `modelle-quelle/miniboss-vereinfacht.glb` (Sketchfab "Nightmare
  Creature 1#", Rodolfoisreal1423, CC-BY 4.0; 1672 Dreiecke, 3 Bilder, 22 Clips) und
  `modelle-quelle/eliteboss-vereinfacht.glb` ("Mutant Golem", Vasian-Digital3D, CC-BY 4.0;
  12 200 Dreiecke, 2 Materialien, 4 Bilder, ein Clip `Motion` 28,5 s), Lizenztexte
  daneben. Beide sind am iPhone in `diagnose7.html` geprüft. Kein neues Paket.

## Akzeptanzkriterien

### A1 Aufbereitung (`node scripts/modelle.mjs miniboss|eliteboss`)

- Nur **Farb- und Reliefbild** behalten (Plan Folgerung 2), Metall-Rauheit-/Glanzbilder
  entfernen; Faktoren Metall 0, Rauheit 0,8. Bilder **512 × 512 WebP**. Keine
  Vereinfachung der Geometrie (bereits vereinfacht und geprüft).
- **Mini-Boss:** nur die Clips `walk`, `Run`, `attack_1`, `attack_2`, `roar`, `hit_1`,
  `death_1` behalten (Namen enthalten den Präfix `Creature_armature|`), `resample`.
- **Elite-Boss:** Clip `Motion` behalten, `resample`; Tangenten entfernen, `prune`,
  `dedup`.
- Prüfungen am Ende (Abbruch bei Verletzung): Dreiecke wie Quelle ±1 %, je Material
  höchstens Farb- + Reliefbild, alle Bilder 512², erwartete Clips vorhanden, **Datei
  ≤ 2 MB** je Boss (sonst Schlüsselbilder weiter ausdünnen, nicht Geometrie).

### A2 Bosse zeichnen (`src/v3d/bosse.ts`)

- Echte `SkinnedMesh` mit `AnimationMixer` (keine Instanzen, keine gebackenen Formen).
  Material `MeshStandardMaterial({ map, normalMap, roughness: 0.8, metalness: 0 })`,
  `side: FrontSide`, Layer 1 (keine Spiegelung).
- Wurzelbewegung entfernen (wie `aufDerStelle` in `diagnose7.html`, x/z der Spur mit der
  größten waagrechten Strecke festhalten) — die Bosse laufen auf der Stelle; Vorwärts-
  bewegung kommt in D4.
- Größe: **`MINIBOSS_HOEHE = 3.2` m**, **`ELITEBOSS_HOEHE = 4.8` m** (gemessen über den
  Clip, nicht nur Bild 0; Füße auf `y = 0 ± 5 cm` über den ganzen Clip).
  Blick zur Truppe (**+z**) — mit Test absichern (Kopf/Gesicht vor dem Hinterkopf in +z,
  wie der Blick-Test des Soldaten).
- Schnittstelle: `baueBoss(art, gltf) → { objekt, spiele(clipKurzname), aktualisiere(dtS),
  gibFrei() }`; Mini: Standard `walk`; Elite: `Motion` in Schleife. Zeit aus der
  pausierbaren Einstiegszeit (wie Soldaten). `gibFrei()` gibt Geometrie, Material,
  Bilder, Skelett (`skeleton.dispose()`) und Mixer frei.
- Lade-Gate: beide glb im gemeinsamen Laden (8-s-Limit nur fürs Laden, Freigabe bei
  Abbruch wie D2b).

### A3 Bühne

- Mini-Boss mittig in der vordersten Hordenreihe: `x = 0`, `z = −36` (die Zombies im
  Umkreis von 1,4 m um ihn werden in der Aufstellung ausgelassen, damit sie nicht durch
  ihn hindurchragen).
- Elite-Boss hinter der Horde: `x = 0`, `z = −66` (liegt im Bild; falls nicht, so weit nach
  vorn, dass er ganz sichtbar ist, und im Bericht nennen).
- Beide bleiben innerhalb des mittleren Streifens (Breite prüfen; Elite darf die
  Betonkanten nicht überragen — sonst Größe um höchstens 15 % senken und melden).

### A4 Messmodus (`src/v3d/messung.ts`)

Ablauf (Wasser 1 fest, 600 Zombies + 120 laufende Soldaten wie bisher):
1. 5 s Aufwärmen,
2. **"Vollast ohne Bosse"** 30 s,
3. **"Vollast + Mini-Boss"** 30 s,
4. **"Vollast + beide Bosse"** 30 s,
5. **"Dauertest 3 min"** (Vollast + beide Bosse): Anzeige je Minute Schnitt-fps und
   langsamste 5 %, dazu Schwarz-Anteil am Ende; Urteil gegen dieselbe Grenze **für jede
   Minute** (Wärme: die dritte Minute zählt).
Zwischen den Stufen 2 s ohne Zählung. Jede Zeile nennt Geometrien/Texturen und den
Speicherplan inkl. Boss-Bemalungen. Die Anzeige bleibt scrollbar. Stufenliste als
Konstante.

### A5 Testseiten aus dem Deploy — **macht Claude nach Thomas' iPhone-Messung**

Nicht in diesem Codex-Lauf (die Testseiten bleiben online, bis Thomas die Boss-Messung
gesehen hat). Codex fasst `public/probe-3d/` nicht an.

### A6 Tests und Nachweise

- `tests/v3dBosse.test.ts`: glb-JSON-Prüfungen aus A1; Blickrichtung +z und Füße (soweit
  in Node machbar wie beim Soldaten, sonst Begründung im Bericht); Aufstellung lässt den
  Kreis um den Mini-Boss frei; `docs/lizenzen.md` nennt beide Bosse samt Änderungen.
- Build-Test: beide glb im Precache, Summe 3D-Dateien ≤ 25 MB, Hauptbündel unverändert.
- `npm test`, `tsc`, `build` grün. Browser-Sichtprüfung und Zweitstart macht Claude,
  iPhone-Messung Thomas.
- **Leistungs-Reißleine:** Codex senkt nichts selbst. Verfehlt die iPhone-Messung die
  Grenze, entscheiden Claude/Thomas (Reihenfolge: Elite-Relief weg → Schärfe 1,5× fest →
  weniger sichtbare Zombies).

## Härtung (Claude, 2026-09-29) — gilt vorrangig

1. **≤ 2 MB-Weg:** Reicht `resample` nicht, Abtastrate der Clips auf 15 Hz senken, dann
   Toleranz erhöhen. Nie Geometrie oder Bildgröße ändern. Bleibt eine Datei über 2 MB:
   Abbruch mit Meldung der Anteile (Geometrie, Bilder, Animation).
2. **Blickrichtung:** Korrekturdrehung als Konstante `MINIBOSS_DREHUNG` /
   `ELITEBOSS_DREHUNG` in `FIGUREN`. Test: Kopfknochen-z > Beckenknochen-z (Blick +z) in
   Clip-Bild 0 **und** Clip-Mitte.
3. **Boden:** Wurzel-y bleibt erhalten (Stampfen/Wippen). Skalierung aus der Höhe in Bild 0.
   Bodenbezug = tiefster Fußpunkt über den ganzen Clip, **einmal** verschoben (nicht je
   Bild); die ±5 cm gelten für diesen Wert.
4. **Material:** Aus dem glb nur die Bilder übernehmen, eigenes `MeshStandardMaterial`
   (A2) hat Vorrang. `map.colorSpace = SRGBColorSpace`, `normalMap` linear. Prüfung im
   Skript und Test: je Material genau ein `baseColorTexture` und ein `normalTexture`;
   Emissive/Occlusion ausdrücklich entfernt und im Bericht genannt.
5. **Aufstellung:** ausgelassene Zombies werden hinten angehängt, die Zahl bleibt 600
   (Vergleichbarkeit). Freiradius = halbe Boss-Breite im Clip `walk` + 0,4 m (Konstante).
6. **Grenze:** die bestehende `urteil()`-Grenze (≥ 55 fps, ≤ 25 ms, Schwarz ≤ 10 %,
   ≤ 60 MB) gilt je Stufe und je Dauertest-Minute, Anzeige ✅/❌ wie bisher.

## Nicht in diesem Schritt

Boss-Vorwärtsbewegung, Angriff, Treffer, Tod im Spiel (D4/D6), Steuerung (D3).

## Implementation Summary

Codex, 2026-09-29: Boss-Aufbereitung, Skelett-/Mixer-Darstellung, gemeinsames Lade-Gate,
Aufstellung mit 600 Zombies, Messstufen samt drei Dauertest-Minuten, Lizenz- und
Build-Nachweise umgesetzt. Mini-Boss: 1.672 Dreiecke, 487.528 Byte, sieben Clips;
Elite-Boss: 12.200 Dreiecke, 2.051.104 Byte, `Motion`. Je Material nur Farb- und
Reliefbild (512² WebP); Metall-/Rauheits-, Emissive- und Occlusion-Bilder entfernt.
`npm run check` und `npm run build` bestanden; 3D-Dateien im Build zusammen 4,35 MB,
beide Boss-Dateien im Precache, Hauptbündel 1.467.937 Byte (Grenze 1.475.425).
`npm test`: 522/523 Tests bestanden. Ein Akzeptanztest bleibt rot: Elite-Boss im Clip
8,95 m breit bei 6,8 m Mittelstreifen. Selbst −15 % ergäben 7,61 m. Entscheidung zu
Modell/Größe/Clip ausstehend, daher Status noch SPEC_READY. Browser-Sichtprüfung,
Zweitstart und iPhone-Dauermessung liegen gemäß A6 bei Claude bzw. Thomas; A5 folgt
erst nach Thomas' Messung. Keine Commits oder Pushes.

## Entscheidung Claude (2026-09-29 20:00) — Elite-Boss-Größe

Befund Codex: Bei 6,5 m Höhe wird der Elite-Boss im Clip `Motion` 8,95 m breit (Streifen
6,8 m). Entscheidung: **`ELITEBOSS_HOEHE = 4.8` m** (Breite über den Clip dann ≈ 6,6 m;
immer noch 2,4× Soldatengröße). Test: größte Breite über den Clip ≤ 6,8 m bleibt streng.
Nur die Konstante und davon abhängige Werte/Tests anpassen, dann Tests/`tsc`/Build,
Status `IMPL_DONE`, kurzer Nachtrag.

## Implementation Summary — Elite-Boss-Größe (Codex, 2026-09-29)

Die Elite-Höhe ist gemäß Claudes Entscheidung auf 4,8 m gesetzt; Spezifikation und
Wertetest sind angepasst. Der Test prüft die größte Clip-Breite weiterhin streng gegen
6,8 m und besteht. `npm test -- --run tests/v3dBosse.test.ts`: 3/3;
`npm test`: 523/523 in 60 Dateien; `npm run check` (TypeScript) und `npm run build`
erfolgreich. Der Build enthält beide Boss-Dateien im Precache; das Hauptbündel bleibt
bei 1.467.937 Byte. Terminal.app war in dieser Umgebung nicht verfügbar; die Prüfungen
liefen deshalb in der direkten Shell. Browser-Sichtprüfung und Zweitstart liegen bei
Claude, die iPhone-Dauermessung bei Thomas. Die Testseiten bleiben gemäß A5 bis zu
dieser Messung im Deploy. Keine Commits oder Pushes.
