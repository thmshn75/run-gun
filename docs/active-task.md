# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D2b — Soldat (Run Gun 3D)

Verbindlicher Plan: `docs/plan-v7.md`, Abschnitte "Thomas' Entscheidungen" (Soldat,
Bewaffnung, Größen), "Machbarkeit → Folgerungen", Randbedingungen 3–5, 7–9 und
"Schrittfolge → D2b" inkl. **Reißleine D2b**. Dieser Schritt bringt den **echten
Soldaten** in den 3D-Modus: Modell aufbereiten (eine Bemalung, Tarnmuster, Helm),
Bewegungen aus der Quaternius-Bibliothek übertragen, M4 an die rechte Hand, gebackene
Formen als Instanzen, Truppe in Reihen. Keine Spiellogik (Aussenden, Front: D3/D4).
Vorlagen: `public/probe-3d/bewegung.html` (Übertragung, am iPhone bewiesen, 13 ms),
`src/v3d/figuren.ts` (Backen/Zeichnen der Zombies aus D2a — gleiche Technik).

## Erlaubte Änderungen (abschließend)

- Neu: `src/v3d/soldaten.ts` (Laden, Übertragen, Backen, `SoldatenMasse`),
  `src/v3d/modelle/v3d-soldat.glb`, `src/v3d/modelle/v3d-bewegung.glb`,
  `scripts/soldat-tarnung.py` (falls Pixelarbeit in Python einfacher), Test
  `tests/v3dSoldaten.test.ts`.
- Geändert: `scripts/modelle.mjs` (neue Ziele `soldat` und `bewegung`),
  `src/v3d/szene.ts` (Truppen-Platzhalter → echte Truppe, Lade-Gate),
  `src/v3d/messung.ts` (Soldaten-Kugeln → echte Soldaten), `src/v3d/balance3d.ts`
  (Block `FIGUREN`), `src/v3d/einstieg.ts` (nur Bildtakt), `docs/lizenzen.md`
  (Soldat: Änderungen ergänzen; **M4 neu**; Quaternius-Bewegungen), bestehende Tests nur
  wo Werte gewollt geändert werden.
- Quellen (nur lesen): `modelle-quelle/soldat-vereinfacht.glb` (= am iPhone geprüfter
  Soldat, 5130 Dreiecke, 10 Materialien, 24 Bilder), `modelle-quelle/m4/` (Sketchfab
  "Low-Poly M4a1", TastyTony, CC-BY 4.0, 10 680 Dreiecke, ohne Bilder, nur
  Materialfarben), Bewegungen aus
  `~/Downloads/rungun-roh/ual/ual1/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb`
  (Quaternius, CC0; liegt bewusst außerhalb des Repos). **Claude hat eine Kopie nach
  `tmp/UAL1_Standard.glb` gelegt (ignoriert von Git) — das Skript liest diesen Pfad**
  (Konstante), mit verständlicher Fehlermeldung, falls die Datei fehlt.
- Keine neuen Pakete (die Werkzeug-Pakete aus D2a sind da).

## Akzeptanzkriterien

### A0 Vorab-Korrektur +1-Schilder (Thomas 2026-09-29)

- `baueSchild` bekommt die Option `pfosten: boolean` (Standard `true`). **+1-Schilder
  ohne Pfosten** — sie schweben (Unterkante 0,5 m über der Straße bleibt). Die ×2-Wand
  behält ihre Pfosten.
- Abstand der +1-Schilder längs **4 m** statt 7 m (Konstante in `BUEHNE`).

### A1 Aufbereitung Soldat (`node scripts/modelle.mjs soldat`)

Ausgabe `src/v3d/modelle/v3d-soldat.glb`, Skelett und Skin bleiben erhalten:
- **Eine einzige Bemalung (Atlas) 1024 × 1024:** die 10 Farbbilder (nur Basisfarbe;
  Relief-/Glanz-/Rauheitsbilder entfernen) je auf 256 × 256 verkleinern und in ein
  4 × 4-Raster legen (Rand 4 px je Kachel, Kanten ausgeblutet gegen Säume), UVs jedes
  Teilnetzes auf seine Kachel umrechnen, **alle Teilnetze auf ein Material** mit dem
  Atlas (Faktoren wie Zombie: Basisfarbe [1,1,1,1], Metall 0, Rauheit 0,85). Eine freie
  Kachel wird **Waffenfarbe** (s. A3).
- **Tarnmuster** (Plan: Codex malt es): **Codex erzeugt mit dem Bildwerkzeug** ein
  nahtloses Woodland-/Multicam-artiges Tarnmuster (Grün-, Braun-, Sandtöne, 512 px,
  kachelbar). Es wird auf die Kacheln **Jacke (`Mark_Kitel_1`) und Hose
  (`Mark_Pants_1`)** gelegt: `neu = tarn × (Helligkeit_original / mittlere
  Helligkeit_original)` innerhalb der UV-belegten Fläche (Maske aus den UV-Dreiecken
  dieses Teilnetzes, wie Zombie-Varianten), damit Falten und Schattierung bleiben.
  Kacheln werden **nur innerhalb der Maske** verändert.
- **Helm (`Mark_Helmet1`) = SOCOM-Stil:** einfarbig Coyote-Tan (`#a58a64`) mit der
  Originalschattierung (gleiche Formel), keine Tarnung.
- Handschuhe, Weste, Taschen, Stiefel: unverändert (dunkel, taktisch).
- Prüfungen am Skriptende (Abbruch bei Verletzung): genau ein Bild, 1024², ein Material,
  Dreiecke 4900–5400, Skelett vorhanden, Datei ≤ 2 MB. Kontrollbild des Atlas nach
  `tmp/soldat-atlas.png`.

### A2 Bewegungen (`node scripts/modelle.mjs bewegung`)

Ausgabe `src/v3d/modelle/v3d-bewegung.glb`: **nur Skelett + diese Clips** aus UAL1
(Netze, Bilder, Materialien entfernen): `Jog_Fwd_Loop`, `Pistol_Aim_Neutral`,
`Pistol_Idle_Loop`, `Pistol_Shoot`, `Death01`. Prüfung: Clips vorhanden, Datei ≤ 1 MB.

### A3 M4 (im Skript `soldat`, als Teil derselben glb)

- M4 aus `modelle-quelle/m4/` auf **350 – 600 Dreiecke** vereinfachen (Bisektion wie
  D2a, `lockBorder`), Länge real ~0,84 m relativ zur Soldatengröße skalieren.
- UVs aller M4-Punkte auf die **Waffenfarbe-Kachel** im Atlas (dunkles Grau
  `#2b2d2f` mit leichtem Verlauf; alle Punkte auf die Kachelmitte ist erlaubt).
- M4 wird als eigenes Teilnetz **starr an den Knochen `CC_Base_R_Hand_081` gebunden**
  (Skin-Gewicht 1,0 auf diesen Knochen), Griff in der Hand, Lauf nach vorn entlang der
  Zielrichtung der Pose `Pistol_Aim_Neutral`. Lage/Drehung als Konstanten im Skript,
  von Codex an der Pose ermittelt.

### A4 Übertragen und Backen (`src/v3d/soldaten.ts`)

- Übertragung wie `bewegung.html` (`PAARE`, `richtungen`, `uebertrage`), zusätzlich
  **Hüfthöhe**: die Höhe des Beckens der Vorlage je Bild relativ zu ihrer Ruhehöhe,
  skaliert mit Soldatengröße / Vorlagengröße, als Positionsspur auf `CC_Base_Hip_01`
  (nur y; x/z fest — auf der Stelle).
- Vier Bewegungen, je als feste Formen gebacken (alle Teilnetze inkl. M4 zu einer
  Geometrie je Form, `uv`/`index` gemeinsam wie D2a):
  - `laufen` = Beine `Jog_Fwd_Loop` + Oberkörper `Pistol_Aim_Neutral`, **12 Formen**,
    Zyklus `SOLDAT_LAUF_ZYKLUS_S = 0.7`;
  - `stehen` = `Pistol_Idle_Loop` (ganzer Körper), **8 Formen**, Zyklus aus dem Clip;
  - `schiessen` = Beine `Pistol_Idle_Loop` + Oberkörper `Pistol_Shoot`, **8 Formen**,
    Zyklus aus dem Clip;
  - `fallen` = `Death01`, **10 Formen**, nicht wiederholend (letzte Form bleibt).
- Größe **`SOLDAT_HOEHE = 2.0` m** (Thomas: Soldaten mindestens so groß wie die
  Zombies, 1,95 m), gemessen in der Ruhe-/Stehpose; Füße auf `y = 0`. Blick nach
  **−z** (zur Horde).
- Material: `MeshStandardMaterial({ map: atlas, roughness: 0.85, metalness: 0,
  side: FrontSide })`.
- Laden im gemeinsamen **Lade-Gate** (glb Soldat + glb Bewegung, Zeitlimit, Abbruch-
  Freigabe wie D2a). Übertragung + Backen gemessen und im Messmodus angezeigt ("Backen
  Soldat: x ms").

### A5 Zeichnen und Bühne

- `SoldatenMasse` analog `ZombieMasse`: je Bewegung × 8 Phasengruppen ein
  `InstancedMesh` (Kapazität `SOLDATEN_SICHTBAR_MAX = 120`), Layer 1; `setze(liste)`
  mit `{ x, z, dreh, bewegung }`; `fallen` spielt je Eintrag ab einer Startzeit einmal
  ab (für D4 vorbereitet, hier nur in der Nahaufnahme gezeigt). `gibFrei()` wie D2a
  (alle Formen, Material, Atlas, Netze).
- **Bühne:** Der blaue Truppen-Platzhalter entfällt. Stattdessen **30 Soldaten in
  Reihen** (3 Reihen × 10, Abstand quer 0,6 m, längs 0,9 m) mittig vor der Wand ab
  `z = +0.5` Richtung Kamera, Bewegung `stehen`, Blick −z. Dazu **ein laufender Trupp**
  von 10 Soldaten (2 × 5) zwischen Wand und Horde bei `z ≈ −15` mit `laufen` (auf der
  Stelle), damit man die Laufbewegung sieht.
- **Messmodus:** Die 120 Soldaten-Kugeln werden **120 echte Soldaten** (gleiche
  Aufstellung wie bisher, `z = 0 … +7`), Bewegung `laufen` (teuerste Dauerbewegung);
  die Bühnen-Truppe und der Trupp werden während der Messung ausgeblendet. Zombie-Vollast
  bleibt 600.
- **Nahaufnahme** `?nahaufnahme=soldat`: vier Soldaten nebeneinander (laufen, stehen,
  schiessen, fallen — fallen wiederholt alle 3 s), drehen langsam, Kamera wie
  Zombie-Nahaufnahme; Zombie-Nahaufnahme bleibt `?nahaufnahme=1`.
- **Prüfanzeige** `?pruefung=soldat` (für Claude): zeigt als Text
  (a) Abstand M4-Griffpunkt ↔ Handwurzel (Ursprung `CC_Base_R_Hand_081`) in cm in den
  Formen 0 von `laufen`, `stehen`, `schiessen` (Plan: **höchstens 3 cm**),
  (b) Höhe der Hüfte über dem Boden in der letzten `fallen`-Form in cm (Plan:
  **höchstens 15 cm**), (c) tiefster Punkt je Form (Füße auf 0 ± 3 cm) für `laufen`,
  `stehen`, `schiessen`, (d) Backzeit in ms. Den Griffpunkt legt das Skript als
  Konstante fest (Punkt am Pistolengriff des M4 in Modellkoordinaten).

### A6 Tests und Nachweise

- `tests/v3dSoldaten.test.ts`: glb-JSON-Prüfungen für beide Dateien (A1/A2-Grenzen,
  ein Material, ein Bild, Clips), M4-Teilnetz vorhanden und nur an `CC_Base_R_Hand_081`
  gebunden, Aufstellung der Bühnen-Truppe mittig und vor der Wand,
  `docs/lizenzen.md` enthält Soldat, "Low-Poly M4a1"/"TastyTony" und Quaternius.
- Build-Test: beide glb im Precache, Summe 3D-Dateien ≤ 25 MB, Hauptbündel unverändert.
- `npm test`, `tsc`, `build` grün. Zweitstart-Zähler prüft Claude im Browser.
- **Reißleine (Plan D2b):** Sieht die übertragene Bewegung nach diesem einen Anlauf
  nicht überzeugend aus, wird **nicht nachgebohrt** — Claude und Thomas entscheiden über
  den Rückfall (feste Anschlag-Pose mit Schrittwippen). Codex meldet nur, was auffiel.

## Härtung (Claude, 2026-09-29) — gilt vorrangig vor A1–A6

1. **Ein Netz, ein Attributsatz:** Im Skript je Primitive alle Attribute außer
   `POSITION`, `NORMAL`, `TEXCOORD_0`, `JOINTS_0`, `WEIGHTS_0` löschen (die Quelle hat
   drei verschiedene Sätze, u. a. `TEXCOORD_1/2`, `TANGENT`), dann **alle 23 Teilnetze
   plus M4 zu einem Primitive mit einem Skin** verschmelzen. Prüfung: genau ein
   Primitive. So liefert `backe()` eine Geometrie je Form.
2. **Kacheln:** 9 Materialien haben ein Bild, `Mark_SunGlusses_Glus` nur eine Farbe →
   eigene Kachel `#111111`. Kachel-Reihenfolge als feste Konstante. **Ausbluten 8 px**
   je Kachel. Atlas als **WebP** (Qualität als Konstante) in der glb; begründete
   Abweichung von Randbedingung 8 (512 px) im Skriptkopf: 1024² ersetzt 10 Einzelbilder
   à 512 und ist kleiner. Speicherplan zählt den Atlas mit.
3. **Tarnmuster:** Codex legt das erzeugte Muster als **`modelle-quelle/tarnmuster.png`**
   (512², eingecheckt) ab; es ist Eingabe von `soldat`. Nahtlos-Prüfung im Skript
   (mittlere Farbdifferenz linke↔rechte Randspalte und obere↔untere Randzeile unter einer
   Schwelle, sonst Kanten per Überblendung angleichen). Abbildung: Muster auf 256
   verkleinern und **in UV-Raum 1:1 kachelnd** über die Kachel legen; Helligkeitsformel
   im 256er-Raum. Pixel außerhalb der Maske bleiben unverändert (Test).
4. **M4:** alle 11 Primitives zu einem Netz verschmelzen, **eigenes Skin/Gelenke
   verwerfen**, Knotentransformationen einbacken, verschweißen, dann vereinfachen
   (Fehlerschranke statt harter Randsperre). Bindung über Gewicht 1,0 auf
   `CC_Base_R_Hand_081` im Soldaten-Skin, Lage im Bindraum des Knochens.
5. **Backen ohne Neu-Ausrichtung je Form:** Bodenhöhe und x/z-Bezug werden **einmal**
   aus Form 0 von `stehen` (ohne M4) bestimmt und für alle Formen aller Bewegungen gleich
   verwendet — **kein `minY`/Schwerpunkt je Form** (sonst verschwinden Hüftwippen und
   Fallen). Prüfung (c): tiefster Punkt über alle Formen einer Bewegung = 0 ± 3 cm, keine
   Form unter −3 cm.
6. **Prüfanzeige zusätzlich:** (i) Winkel Lauf-Achse des M4 ↔ −z in `schiessen` Form 0
   **≤ 15°**, (ii) Abstand Mündung ↔ Brustmitte **≥ 0,4 m** (Waffe ragt nicht durch den
   Körper). Griffpunkt und Laufachse aus der Pose berechnet, nicht geschätzt. Soweit
   in Node ohne Renderer machbar, rechnet `tests/v3dSoldaten.test.ts` dieselben Zahlen mit
   denselben Funktionen und prüft die Grenzen; sonst im Bericht sagen, warum nicht.
7. **Tests zusätzlich:** alle Formen einer Bewegung haben gleiche Punktzahl und dasselbe
   `index`/`uv`-Objekt.
8. **Lade-Gate:** Das 8-s-Zeitlimit gilt **nur für das Laden der Dateien**; Übertragen
   und Backen laufen danach ohne Limit. Bei Abbruch/Zeitüberschreitung werden alle
   Zwischenstände (Formen, Material, Atlas) freigegeben (`vorbei`-Flag wie D2a).
9. **Zeit:** Die Animationszeit von `SoldatenMasse` (auch `fallen`-Startzeiten) kommt
   aus der pausierbaren Zeit des Einstiegs (Parameter), nicht aus `performance.now()`.
10. **Bewegungsquelle:** nur `tmp/UAL1_Standard.glb`, **nie** die `_RM`-Variante.
11. **Leistungs-Reißleine:** Codex senkt nichts selbst. Verfehlt Thomas' iPhone-Messung
    die Grenze, entscheiden Claude/Thomas in dieser Reihenfolge: Phasengruppen Soldat
    8 → 4, Formen `laufen` 12 → 8, `SOLDATEN_SICHTBAR_MAX` 120 → 80.
12. `modelle-quelle/tarnmuster.png` ist erlaubte neue Datei.

## Nicht in diesem Schritt

Aussenden, Steuerung, Front, Treffer, Mündungsfeuer (D3/D4), Bosse (D2c).

## Implementation Summary

Die D2b-Dateien und die A0-Schilder-Korrektur wurden im begonnenen Lauf erstellt. In
der Fortsetzung wurde die M4-Bindung auf den tatsächlichen Bindraum des Handknochens
umgestellt und ein Griff- sowie Mündungs-Prüfpunkt eingebaut: Griffabstand in den drei
Posen etwa 0,002 cm, Laufwinkel in Schießen-Form 0 etwa 5,4°, Abstand Mündung–Brust
etwa 0,56 m. Das bestehende Ziel `zombie` in `scripts/modelle.mjs` ist wieder verfügbar.

**Abnahme offen:** Die Übertragung des Joggens senkt die Formen 1, 2, 7 und 8 bis
7,8 cm unter den Boden; `Death01` sinkt ab Form 6, in der letzten Form liegen
Soldatenpunkte 32,8 cm unter dem Boden (v. a. Taschen am Rumpf; Rumpfpunkte 22 cm).
Die Grenze von −3 cm blieb unverändert; ein Versuch, die Hüftspur des Joggens zu
begrenzen, reichte nicht und wurde zurückgenommen. Der iPhone-Sichttest und
Zweitstart-Zähler sind durch Claude/Thomas im Browser zu prüfen. `IMPL_DONE` benennt
hier den abgeschlossenen Codex-Lauf, nicht eine bestandene Abnahme.

Abschlussprüfung: `npm test` 519/520 grün (genau der Boden-Test schlägt mit zwei
Grenzverletzungen fehl), `npm run check` und `npm run build` erfolgreich. Beide GLB
stehen im Precache; alle acht 3D-Dateien zusammen 2 007 718 Byte (< 25 MB),
`probe-3d` nicht im Precache. Hauptbündel 1 467,93 kB wie im ersten Build dieses
Laufs. Browser-Zweitstart, Netzprotokoll und iPhone-Messung wurden nicht ausgeführt;
das eigentliche Bewegungskriterium ist bereits im Node-Test verletzt.

## Fortsetzung (Claude 2026-09-29 18:25) — Lauf hing, gezielt abschließen

Der erste Lauf hing ab 17:54 nach `node scripts/modelle.mjs soldat && npm test -- --run
tests/v3dSoldaten.test.ts` (Exit 1) und wurde abgebrochen. Stand: Aufbereitung läuft
(5388 Dreiecke, M4 584, Atlas 1024², 414 656 Byte), 6/7 Soldaten-Tests grün.
**Fehlschlag:** `backt alle Formen … prüft die Pose`: tiefster Punkt −0,078 m (Grenze
−0,03). Aufgabe:
1. Herausfinden, **welche Bewegung/Form** unter den Boden geht (im Bericht nennen) und
   die **Ursache** beheben (z. B. Hüfthöhe falsch skaliert/bezogen, Ruhehöhe der Vorlage
   falsch, Boden-Bezug), **nicht die Grenze lockern**. Bei `fallen` darf der Körper
   liegen, aber nicht einsinken (gleiche Grenze).
2. Danach die übrigen Punkte der Spec prüfen und fertigstellen (Härtung 1–12, A0–A6),
   volle Suite, `tsc`, Build.
3. Keine langen Denkpausen ohne Befehl: ist ein Punkt nach zwei Versuchen nicht lösbar,
   im Bericht beschreiben und weitermachen.
Status am Ende `IMPL_DONE`, Implementation Summary ausfüllen.

## Nacharbeit 2 (Claude 2026-09-29 18:55) — Einsinken beheben (letzter Anlauf)

Befund Claude im Code (`src/v3d/soldaten.ts` Z. 67–99): Die Hüftverschiebung wird als
Welt-y-Differenz gerechnet und direkt in `hip.position.y` geschrieben, nur durch
`parentScale.y` geteilt. Das Elternobjekt des Knochens `CC_Base_Hip_01` ist in solchen
Exporten **gedreht** (und skaliert) — lokales y ist dann nicht Welt-oben. Außerdem wird
`basisHip` in der Bindpose der Vorlage gemessen.
1. **Hüfte im Elternraum setzen:** gewünschte Welt-Position der Hüfte = Ruhe-Weltposition
   + (0, Δy, 0); per `hip.parent.worldToLocal(...)` in lokale Koordinaten umrechnen und
   `hip.position` komplett setzen (nicht nur `.y`). `Δy` = (Beckenhöhe Vorlage im Bild −
   Beckenhöhe Vorlage in **`Pistol_Idle_Loop` Bild 0**) × (Beinlänge Soldat / Beinlänge
   Vorlage), Beinlänge = Hüfte→Fußknöchel in der jeweiligen Ruhe-/Stehpose.
2. **Bodenklemme je Form (Absicherung):** Nach dem Posieren liegt der tiefste Punkt des
   **Körpers** (ohne M4) unter dem Boden-Bezug → ganze Form um genau diesen Betrag
   **anheben**. Nie absenken (Wippen und Flugphase beim Laufen bleiben). Die M4 darf beim
   Fallen den Boden berühren, aber nicht tiefer als −3 cm; sonst ebenfalls anheben.
3. Test unverändert streng (`expect`, nicht `expect.soft`): tiefster Punkt je Bewegung
   ≥ −3 cm, `fallenHuefteCm ≤ 15`, übrige Grenzen wie Härtung 6. Im Bericht je Bewegung:
   tiefster Punkt vor und nach der Klemme (zeigt, ob 1. die Ursache war).
4. Gelingt es nicht: nichts lockern, Bericht mit Zahlen — Claude entscheidet über die
   Reißleine (feste Pose).
Status am Ende `IMPL_DONE`, Nachtrag im Implementation Summary.

## Implementation Summary — Nacharbeit 2 (Codex, 2026-09-29)

Die Hüftspur verwendet jetzt die Beckenhöhe von `Pistol_Idle_Loop` Bild 0 und das
Verhältnis der Beinlängen; die gewünschte Weltposition wird vollständig in den
Elternraum von `CC_Base_Hip_01` umgerechnet. Jede Form wird nur angehoben, wenn
Körper oder M4 die Bodengrenze unterschreiten. Griff-, Brust- und Hüft-Prüfpunkte
werden um denselben Betrag versetzt. Das Lade-Gate gibt bei Abbruch auch dann alle
bereits geladenen Soldaten- oder Zombie-Dateien frei, wenn nur eine Quelle fehlt.

Tiefster Punkt vor → nach Bodenklemme, je Bewegung: `laufen` −5,51 → 0 cm
(Formen 1, 2 und 7 unter −3 cm; Form 8 bei −2,61 cm), `stehen` 0 → 0 cm,
`schiessen` 0 → 0 cm, `fallen` −18,28 → 0 cm (Formen 3–9 unter −3 cm;
Formzählung ab 0). Griffabstand in drei Posen rund 0,002 cm, Laufwinkel 5,38°,
Mündung–Brust 0,56 m. **Offen bleibt die Fall-Hüfte: 30,01 cm statt höchstens
15 cm.** Die Bodenklemme hebt den Körper in der letzten Fallform um 18,09 cm;
ohne sie sinken Körperpunkte ein. Ein Versuch mit dem tatsächlichen Clip-Endpunkt
verschlechterte die Hüfthöhe auf 106,55 cm und wurde zurückgenommen. Grenze und
strenge `expect`-Prüfung blieben unverändert; die Reißleine erfordert nun eine
Entscheidung von Claude/Thomas über die feste Pose.

Abschlussprüfung: `npm test` 519/520 grün (einziger Fehlschlag Fall-Hüfte),
`npm run check` und `npm run build` erfolgreich. Acht 3D-Dateien: 2 008 537 Byte;
beide neuen GLB im Precache, `probe-3d` nicht darin. Hauptbündel 1 467,93 kB.
Browser-Zweitstart, Netzprotokoll, Sichtprüfung und iPhone-Messung bleiben
ungetestet; die lokale Umgebung hat keine Terminal.app, daher liefen die
Prüfungen in einer direkten Terminal-Sitzung.

## Nacharbeit 3 (Thomas 2026-09-29) — komplett Coyote statt Tarnmuster

iPhone-Messung D2b: Wasser 0 = 55,6 fps / 24 ms, Wasser 1 = 55,8 fps / 24 ms →
**im Budget, Leistung abgenommen.** Thomas gibt Soldat und Bewegungen frei, möchte die
Ausrüstung aber **komplett in Coyote-Farbe** statt Tarnmuster.
- `scripts/modelle.mjs` (Ziel `soldat`): Kacheln `Mark_Kitel_1`, `Mark_Pants_1`,
  `Mark_Plate_1`, `Mark_Pouches_1`, `Mark_Helmet1`, `Mark_Boots_2` einfarbig umfärben mit
  der vorhandenen Formel (Farbe × Originalhelligkeit / mittlere Helligkeit, nur in der
  Maske). Farben als Konstanten: Kleidung (Jacke/Hose) Coyote `#8a7456`, Weste/Taschen
  eine Spur dunkler `#7a6549`, Helm `#a58a64` (wie bisher), Stiefel `#6e5a42`.
  `Mark_HeadMasked`, `Mark_SunGlusses_Glus`, `Mark_Gloves_1`, `Mark_Eye`, M4 unverändert.
- Das Tarnmuster wird nicht mehr verwendet; `modelle-quelle/tarnmuster.png` und die
  Nahtlos-Prüfung bleiben liegen, aber das Skript liest das Muster nicht mehr (Funktion
  entfernen oder unbenutzt lassen — `tsc`/Lint dürfen nicht meckern).
- `v3d-soldat.glb` neu erzeugen, Kontrollbild `tmp/soldat-atlas.png`. `docs/lizenzen.md`:
  Änderungsvermerk Soldat "neu bemalt (Coyote)" statt Tarnmuster.
- Tests grün, Status `IMPL_DONE`, Nachtrag im Implementation Summary.

## Implementation Summary — Nacharbeit 3 (Codex, 2026-09-29)

Die sechs festgelegten Kacheln für Kleidung, Weste, Taschen, Helm und Stiefel werden
mit ihren Coyote-Farben und der vorhandenen Helligkeitsformel nur innerhalb ihrer
UV-Masken neu bemalt. Das Skript liest das Tarnmuster nicht mehr; die Quelldatei
und ihre Nahtlos-Prüfung bleiben erhalten. Soldaten-GLB und Kontrollbild wurden neu
erzeugt; der Lizenzvermerk und sein Test nennen jetzt Coyote.

Ergebnis des Modell-Skripts: 5.388 Dreiecke (M4: 584), ein 1024²-Atlas,
421.652 Byte GLB. `npm test -- --run tests/v3dSoldaten.test.ts`: 7/7;
`npm test`: 520/520 in 59 Testdateien; `npm run check`, `npm run build` und
`git diff --check`: erfolgreich. Beide Soldaten-Dateien stehen im Build-Precache;
das Hauptbündel bleibt bei 1.467,93 kB. Die iPhone-Leistung und die Bewegungen
hat Thomas in Nacharbeit 3 bereits abgenommen. Einen Browser-Zweitstart oder
erneuten iPhone-Sichttest für die neue Farbgebung habe ich nicht durchgeführt.
