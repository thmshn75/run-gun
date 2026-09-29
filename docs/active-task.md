# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D1 — Bahn, Kamera, Wasser (Run Gun 3D, visueller Schlüsselschritt)

Verbindlicher Plan: `docs/plan-v7.md`, Abschnitte "Unverhandelbare Randbedingungen" und
"Schrittfolge → D1". Dieser Schritt baut die **feste Bühne** des 3D-Modus: Straße als
Damm durch Wasser, Kamera, Licht, Wasser in drei Stufen und Maßstabs-Platzhalter. Keine
Figuren, keine Steuerung, keine Spiellogik (die kommen in D2–D4). Vorbild-Standbilder
ansehen: `docs/vorbild/vorbild-111-8s.jpg` (Hauptvorbild), `vorbild-111-2s.jpg`,
`vorbild-111-20s.jpg`, `vorbild-112-3s.jpg`, `vorbild-112-9s.jpg`. Statt Schnee wie im
Vorbild: Wasser (Thomas' Wunsch, "viel realistischer").

## Erlaubte Änderungen (abschließend)

- `src/v3d/szene.ts` (neu aufbauen), `src/v3d/messung.ts` (Stufen und Speicherplan, s. A5),
  `src/v3d/einstieg.ts` (nur: Lade-Gate für die Bemalungen, Kamera-Anpassung bei
  Größenänderung, Wasser-Aktualisierung im Bildtakt, Freigabe beim Verlassen),
  `src/v3d/balance3d.ts` (neue Konstanten in einem eigenen Block `BUEHNE`, bestehende
  Werte unverändert), `src/v3d/rechnen.ts` (nur erweitern: neue reine Funktionen für
  PMREM- und Spiegelpuffer-Größe, bestehende Signaturen und `tests/v3dRechnen.test.ts`
  bleiben gültig), `tests/v3dBuild.test.ts` (erweitern, s. A6).
- Neu: `src/v3d/kamera.ts`, `src/v3d/wasser.ts`, `src/v3d/wasserSpiegel.ts` (s. A4), `src/v3d/bilder/` (Bemalungen, s. A3),
  `scripts/wasser-normalen.py` (oder `.mjs` + Python-Umwandlung), Test `tests/v3dBuehne.test.ts`.
- Bestehende Tests nur anpassen, wo sie Werte aus D0 fest prüfen, die sich hier gewollt
  ändern (z. B. Vollast 1500/150 → 1200/120, Messstufen); jede Anpassung im Bericht nennen.
- Nichts außerhalb von `src/v3d/`, `scripts/`, `tests/` und dieser Datei. Kein neues Paket.
  `rechnung.ts` bleibt unberührt.

## Koordinaten (verbindlich, gilt für alle späteren Schritte)

1 Einheit = 1 Meter der Spielrechnung. `x` quer (links negativ), `y` oben, **vorwärts =
negatives `z`**. Die Aussendelinie der Truppe liegt bei `z = 0`. Eine Position `pos`
bzw. Frontlage `y` aus `rechnung.ts` liegt bei `z = −pos` bzw. `z = −y`. Straße
`x ∈ [−6, +6]` (Konstante `BAHN_BREITE = 12`). Diese Festlegung als Kommentar in den
Block `BUEHNE` schreiben.

## Akzeptanzkriterien

### A1 Kamera (`src/v3d/kamera.ts`, Werte in `balance3d.ts` Block `BUEHNE`)

Von Claude aus dem Vorbild errechnet (Straße unten bildfüllend, oben breiter als im
Vorbild — Thomas' Wunsch):
- `PerspectiveCamera`, vertikales Sichtfeld **22°**, Position **(0, 28.5, 52.7)**, nach
  unten geneigt um **23.5°** (`rotation.x = −23.5°` in Bogenmaß, kein `lookAt`),
  `near = 5`, `far = 250`.
- Referenz-Seitenverhältnis `390/659`. Ist der Bildschirm **schmaler** (Breite/Höhe
  kleiner), wird das vertikale Sichtfeld so vergrößert, dass das **horizontale**
  Sichtfeld gleich bleibt (Straße bleibt bildfüllend); ist er breiter, bleibt es bei 22°.
  Reine Funktion `passeKameraAn(camera, breite, hoehe)`, aufgerufen bei jeder
  Größenänderung (ersetzt die bisherige Aspect-Anpassung im Einstieg).
- **Zielmaße als Test** (`tests/v3dBuehne.test.ts`, reine Projektionsrechnung mit
  `Vector3.project`, Bildschirm 390×659; Anteile der Bildbreite bzw. von oben gemessen):
  - Straßenbreite (`x = ±6`) am unteren Bildrand ≥ 1,00 (reicht über den Rand).
  - Straßenbreite auf Höhe 5 % von oben: **0,40 – 0,50** (Vorbild 0,35).
  - Linie `z = 0` liegt bei **70 – 74 %** von oben.
  - Punkt `(0, 0, −60)` (Hordenstart) liegt im Bild, mindestens 2 % unter dem oberen Rand.
  - Die Kamerawerte oben sind vorgegeben; kippt ein Zielmaß, **nicht** die Kamera
    ändern, sondern im Bericht melden.
  - Bei 375×812 und 390×844 (schmaler): unten ≥ 1,00, `z = 0` bei 66 – 78 %.
  - Für alle drei Formate: der Horizont liegt oberhalb des Bildes, und die Punkte
    `(±6, 0, −220)` (Straßenende) projizieren über den oberen Bildrand (Straßenende nie
    sichtbar).

### A2 Bühne (`src/v3d/szene.ts`)

- **Straße als Damm** von `z = +20` bis `z = −220`, 12 m breit, Oberkante `y = 0`,
  Seitenwände bis `y = −0,6`; Wasser bei `y = −0,35`, der Damm ragt also heraus.
  Belag: Bemalung `v3d-strasse` (A3), gekachelt etwa alle 4 m, `MeshStandardMaterial`,
  Rauheit ~0,9, ohne Reliefkarte. Seitenwände heller Beton ohne Bemalung.
- **Randmauern** links und rechts auf der Straßenkante, 0,35 m hoch, 0,3 m breit,
  heller Beton, über die ganze Länge.
- **Maßstabs-Platzhalter** (einfarbige Kästen/Flächen, halbtransparent erlaubt; werden in
  D3/D4/D5a ersetzt; alle in einer Gruppe `platzhalter`, mit `?platzhalter=0`
  abschaltbar):
  - Vervielfacher-Wand quer bei `z = −5`: 12 × 1,2 m, violett, Schrift "×2"
    (Canvas-Bemalung 256 px).
  - +1-Schilder: Spalte bei `x = −5,2`, ab `z = +6` alle 3,5 m bis `z = −60`, je
    1,2 × 0,8 m, aufrecht, blau mit weißer Schrift "+1" (eine gemeinsame Canvas-Bemalung).
  - Säule rechts bei `x = +4,6`, `z = −12`: 1,6 × 4 × 1,6 m, grau, Zahl "150" oben.
  - Horde: rote Fläche `x ∈ [−5, 5]`, `z ∈ [−65, −35]`, 0,5 m über der Straße.
  - Truppe: blauer Block 6 × 0,9 × 3 m, Mitte bei `z = +1,5`.
- **Licht:** Halbkugel-Licht + eine Sonne von links oben hinten (warmes Weiß), keine
  Echtzeit-Schatten. **Dunst:** `scene.fog` linear 90 → 220 m (Abstand zur Kamera) in
  der Farbe des fernen Wassers; Hintergrund = Dunst-Farbe.

### A3 Bemalungen (`src/v3d/bilder/`)

- `v3d-strasse.webp`, 512×512, nahtlos kachelbar, heller grauer Beton-/Asphaltbelag mit
  feiner Körnung, ohne Markierungen. **Codex erzeugt ihn mit seinem Bildwerkzeug**
  (Plan Randbedingung 9), verkleinert auf 512 px und prüft die Kachelbarkeit (2×2
  nebeneinander ohne sichtbare Naht; nötigenfalls Kanten per Skript überblenden).
- `v3d-wasser-normalen.webp`, 512×512, **kachelbare Normalkarte**, erzeugt von
  `scripts/wasser-normalen.mjs` aus kachelbarem Rauschen (mehrere Oktaven, feste
  Seed-Zahl, Ableitung → Normalen, RGB = n·0,5+0,5). Grund: Ein Bildmodell liefert keine
  gültige Normalkarte. **WebP-Umwandlung nur mit `python3` + PIL** (auf dieser Maschine
  vorhanden, WebP geprüft; `cwebp` fehlt, `ffmpeg` hat keinen WebP-Encoder): Normalkarte
  `save(..., lossless=True)`, Straße Qualität 85. Fehlt der Encoder: abbrechen und
  melden, nie still ein anderes Format einchecken. Beide `.webp` werden eingecheckt;
  2×2-Kachelbild beider Bemalungen als PNG ins Scratchpad legen und im Bericht nennen.
- Einbindung über `import url from './bilder/v3d-….webp?url'`, damit Vite sie als
  `assets/v3d-…-<hash>.webp` ausgibt (bestehender Build-Test: jede Nicht-Haupt-Datei
  enthält `v3d`, Summe ≤ 25 MB, im Precache).
- **Lade-Gate:** `baueSzene()` wird `async` und lädt beide Bemalungen mit `Promise.all`
  vor dem ersten Bild, **Zeitlimit 8 s**. `zeigeOberflaeche` (mit Zurück-Knopf) wird
  **vor** dem `await` aufgerufen, dazu der Text "Lädt …". Bei Fehler oder Zeitüberschreitung:
  bereits geladene Bemalungen freigeben, `verlasse('3D-Dateien nicht ladbar – App neu
  öffnen')` (Text als Konstante), kein `throw`. Nach dem `await` prüfen, ob der Nutzer
  inzwischen zurück ist (`beendet`) — dann alles sofort freigeben, nichts anzeigen.
  Kein Nachladen im Lauf. Straße `colorSpace` sRGB, Normalkarte linear (Standard).
- **Besitz:** `baueSzene()` liefert `{ scene, camera, bemalungen, wasser }`; `wasser` ist
  ein Halter mit `stufe`, `wechsle(stufe)` (alte Stufe freigeben, neue bauen),
  `aktualisiere(dtSekunden)`, `gibFrei()`. `einstieg.ts` und `messung.ts` greifen nur über
  diesen Halter aufs Wasser zu. Die beiden Datei-Bemalungen gehören der Szene und werden
  einmal in `gibSzeneFrei()` freigegeben, nie von einer Wasserstufe.

### A4 Wasser (`src/v3d/wasser.ts`), Stufe per `?wasser=0|1|2`, Standard **1**

Wasserfläche 800 × 800 m, Mitte bei `(0, −0,35, −150)`, beidseits und nach vorne bis
in den Dunst (Rand nie sichtbar).
Jede Stufe bekommt die Normalkarte als Parameter und gibt nur selbst Erzeugtes frei.
**Zeit:** `aktualisiere(dtSekunden)` in Sekunden; `einstieg.ts` rechnet `dt/1000` um und
begrenzt auf höchstens 0,1 s.
- **Stufe 0:** einfarbige Fläche (tiefes Blaugrün), `MeshStandardMaterial`.
- **Stufe 1 (billig):** `MeshStandardMaterial`, `normalMap` = `v3d-wasser-normalen`,
  `repeat` ≈ 60, Verschiebung im Bildtakt (etwa 0,02 bzw. 0,013 Kacheln/s in x/y der
  Karte), `normalScale` ~0,6, Rauheit ~0,12, Metall 0. Dazu eine **Himmels-Umgebung**
  für Glanz: Canvas-Verlauf 256×128 (oben hellblau, Horizont fast weiß) als
  äquirektangulares Bild → `PMREMGenerator.fromEquirectangular` → **nur als `envMap` des
  Wasser-Materials** (nicht `scene.environment`: Straße, Platzhalter und Vollast sehen in
  allen Stufen gleich aus). Direkt danach `pmrem.dispose()` und die Canvas-Textur
  freigeben; das PMREM-Ergebnis gibt `gibFrei()` frei. Kein Bild von außen.
- **Stufe 2 (Spiegelung):** `src/v3d/wasserSpiegel.ts` = **Kopie** von
  `three/addons/objects/Water.js` (three 0.186, MIT; Lizenzvermerk als Kommentar ohne
  URL behalten — der Isolationstest verbietet `http` in `src/v3d/` auch in Kommentaren),
  einzige Änderungen: der Spiegel-Zielpuffer wird als Feld gehalten und eine Methode
  `dispose()` gibt Zielpuffer, Material und Geometrie frei. `waterNormals` = dieselbe
  lokale Normalkarte (`wrapS/T = RepeatWrapping`), Spiegel-Auflösung **halbe**
  Zeichenpuffer-Größe, `sunDirection` = Richtung der Sonne aus A2, `distortionScale` ~2,
  `fog: true`, `uniforms.time` in Sekunden. **Die Spiegelung zeichnet keine Figuren:**
  Figuren und Figuren-Platzhalter (Horde, Truppe, Vollast) kommen auf **Layer 1**; die
  Hauptkamera sieht Layer 0 und 1; die Spiegel-Kamera bleibt auf Standard-Layer 0
  (Claude hat nachgesehen: sie wird als eigene `PerspectiveCamera` angelegt und kopiert
  keine Layer). Lichter bleiben auf Layer 0.
- **Freigabe und Zweitstart** (Randbedingung 5): `gibSzeneFrei()` setzt
  `scene.environment`/`background`-Texturen zurück, sammelt Texturen auch aus
  `ShaderMaterial.uniforms`, ruft vorher `wasser.gibFrei()`. `renderer.info.memory.
  geometries` und `.textures` sind nach dem zweiten Start exakt gleich wie nach dem
  ersten — geprüft für jede Stufe und nach der Folge Wasser 1 → 2 → 0 → 1.

### A5 Messmodus (`src/v3d/messung.ts`)

- Vollast-Platzhalter auf die Plan-Grenze: **1200 Zombie-Körper (~1000 Dreiecke) und 120
  Soldaten-Körper (~5000 Dreiecke)**, auf der Straße verteilt: Zombies 24 je Reihe
  (Abstand 0,45 m, `x` mittig) ab `z = −22` nach hinten; Soldaten 10 je Reihe (0,6 m)
  ab `z = −1` nach vorne. Beide auf Layer 1. Das Wippen bleibt.
- **Ablauf:** Vollast bauen, Wasser 0, 5 s Aufwärmen (zählt nicht); dann für Wasser
  0, 1, 2: 30 s messen, danach Wasser über den Halter umbauen und 2 s ohne Zählung. Die
  Stufe "Leere Szene" entfällt (in D0 gemessen). Nach der Messung gilt wieder die Stufe
  aus `?wasser=`. Soldaten-Platzhalter stehen bei `z = 0 … +7` (Truppe), Zombies ab
  `z = −22` nach hinten (Richtung −z).
- Schwarz-Anteil: Messpunkt `(0, 0.35, −30)` (Mitte der Zombie-Masse), je Stufe bei
  15 s.
- **Speicherplan** (Formeln als reine Funktionen in `rechnen.ts`, mit Zahlenbeispiel
  getestet) zählt zusätzlich alle Bemalungen der Szene (Straße, Normalkarte,
  Canvas-Bemalungen, auch aus `ShaderMaterial`-Uniforms von `Water`), das PMREM-Ergebnis
  (Größe des Zielpuffers ×4/3) und in Stufe 2 den Spiegel-Zielpuffer (`Water.js` nutzt
  `HalfFloatType`: Breite×Höhe×8 plus Tiefenpuffer ×4). Keine Doppelzählung derselben Bemalung.
- Ergebniszeile je Stufe im bestehenden Format, mit Wasserstufe im Zeilenkopf und
  Urteil gegen die Grenze (≥ 55 fps, ≤ 25 ms, Schwarz ≤ 10 %, ≤ 60 MB).

### A6 Tests und Nachweise

- `tests/v3dBuehne.test.ts`: alle A1-Zielmaße; Lesen von `?wasser=` (nur 0/1/2 gültig,
  sonst 1) als reine Funktion getestet.
- `npm test`, `npx tsc --noEmit`, `npm run build` grün; bestehende Tests für
  Hauptbündel-Größe, Isolation und Build weiter grün (neue `.webp` enthalten `v3d`, sind
  im Precache).
- `tests/v3dBuild.test.ts` erweitern: jede `.webp` in `dist/assets` trägt `v3d` im
  Namen, steht im Precache-Manifest von `sw.js` und zählt in die 25-MB-Summe; kein
  `data:image/webp` im gebauten JavaScript (kein Inlining).
- Isolationstest (kein `http` in `src/v3d/`) bleibt grün.
- Desktop-Vorprüfung (Randbedingung 7) durch Codex, soweit ohne Browser möglich; im
  Bericht sagen, was davon nicht ging.
- Desktop-Sichtprüfung macht Claude (Screenshot 390×659 neben dem Vorbild); iPhone-
  Messung macht Thomas.

## Nicht in diesem Schritt

Figuren, Bewegung, Steuerung, Aussenden, Rechenkern-Anbindung, Säulen-Logik, Klang.
`public/probe-3d/` nicht anfassen.

## Implementation Summary

- Implementiert: `kamera.ts` mit festem Blickwinkel und schmalformatiger Sichtfeld-Anpassung; `szene.ts` mit Damm, Randmauern, Licht, Dunst, Maßstabs-Platzhaltern und 8-s-Lade-Gate; `wasser.ts` mit Stufen 0/1/2 und Ressourcenbesitz; lokale MIT-Kopie von Three 0.186 `Water.js` in `wasserSpiegel.ts` mit `dispose()`; `einstieg.ts` mit Ladeanzeige, Größenwechsel, Zeitaktualisierung und Freigabe; `messung.ts` mit Vollast 1200/120, drei Wasserstufen und Speicherplan; `balance3d.ts` nur um `BUEHNE` erweitert, `rechnen.ts` nur um Pufferformeln.
- Bemalungen: Straße mit eingebautem Bildwerkzeug erzeugt (Prompt: nahtloser, hellgrauer, fein gekörnter Beton/Asphalt ohne Markierungen, Objekte, Schatten oder Perspektive), per Python/PIL auf 512×512 WebP Qualität 85 verkleinert und an Kanten überblendet. Normalkarte mit `node scripts/wasser-normalen.mjs /private/tmp/v3d-wasser-normalen.ppm` aus periodischem Mehr-Oktaven-Rauschen mit Seed 31729 erzeugt, per Python/PIL als lossless WebP gespeichert. Beide Kachelproben: `/private/tmp/run-gun-d1-kacheln/strasse-2x2.png` und `wasser-normalen-2x2.png`; visuell ohne auffällige Naht. PIL-WebP-Encoder vorhanden.
- Nachweise: `npx tsc --noEmit` Exit 0; `npm run build` Exit 0; `npm test` 56 Testdateien, 506 Tests bestanden. `tests/v3dBuehne.test.ts` neu (drei Formate, Projektion, Wasserparameter, Pufferformeln), `tests/v3dBuild.test.ts` um WebP/Precache/25-MB/Inlinesperre erweitert. Keine bestehenden Tests angepasst. Build: beide WebP in `dist/assets` und Vorab-Cache; 3D-Dateien zusammen 755946 Bytes. `git diff --check` ohne Befund.
- Noch ausstehende Fremd-/Gerätenachweise: Desktop-Sichtvergleich durch Claude und iPhone-Messung durch Thomas laut A6. Die echte Zweitstart-Speicherprüfung je Wasserstufe und 1→2→0→1 konnte hier nicht gemessen werden: Die Browsersteuerung für Google Chrome wurde von der Umgebung nicht freigegeben. Der Terminal-Start über `open -a Terminal` war ebenfalls nicht verfügbar; die Prüfungen liefen direkt in der Projekt-Shell. Keine Commits oder Pushes.
- Nacharbeit 1: Nur `src/v3d/wasser.ts` geändert: beide einfachen Wasserstufen mit Grundfarbe `#0b3440`, Stufe 1 mit Rauheit 0,2, Normalstärke 0,9, Wiederholung 40, Umgebung 0,7 und dem vorgegebenen vierstufigen Himmelsverlauf; Stufe 2 mit Wasserfarbe `0x0e3a46` und Verzerrung 2,5. Werte als Konstanten benannt. Gezielter Test: 4/4; `npx tsc --noEmit` und `npm run build` Exit 0; `npm test`: 56 Testdateien, 506/506 Tests. Browser-Sichtprüfung und iPhone-Messung bleiben bei Claude bzw. Thomas. `open -a Terminal` scheiterte in dieser Umgebung mit „Unable to find application named 'Terminal'“, daher liefen die Prüfungen in der Projekt-Shell.
- Nacharbeit 2: `Water.dispose()` gibt Spiegel-Zielpuffer, Geometrie und Material frei; `bricheAb()` gibt zusätzlich die beiden Vollast-`InstancedMesh` frei. `npx tsc --noEmit` und `npm run build` Exit 0; `npm test`: 56 Testdateien, 506/506 Tests; `git diff --check` ohne Befund. Die erneute WebGL-Zählerprüfung nach vollständigem Messlauf und Zurück führt Claude laut Nacharbeit im Browser durch. `open -a Terminal` war hier erneut nicht verfügbar; die Prüfungen liefen direkt in der Projekt-Shell. Keine Commits oder Pushes.
- Nacharbeit 3: `v3d-strasse.webp` als Asphaltbelag mit maßhaltigen Rand- und Strichlinien sowie dezenten Fahrspuren neu erzeugt (1024×512, WebP Qualität 88); `scripts/strasse-asphalt.py` verarbeitet den Bildwerkzeug-Grundbelag reproduzierbar und schreibt die 2×2-Kachelprobe nach `/private/tmp/run-gun-d1-kacheln/strasse-asphalt-2x2.png`. In `szene.ts` nur Längswiederholung `(1, 40)`, seitliche Kantenklemmung, Anisotropie bis 8 und Rauheit 0,95 geändert. Bildprüfung: Mittelwert RGB 92,6/95,9/99,2, Längsnaht 2,27 mittlere Pixelabweichung (benachbarte Zeilen 14,67), visuell keine auffällige Naht. Speicherformel erfasst 1024×512 automatisch mit 2,67 MB. `npm test`: 56 Dateien, 506/506 Tests; `npx tsc --noEmit`, `npm run build`, gezielter Build-Test und `git diff --check` Exit 0. Beide WebP-Dateien im Precache, alle 3D-Dateien zusammen 901391 Bytes. Desktop-Sichtvergleich der neuen Straße und neue iPhone-Messung stehen noch aus; die Terminal-App war nicht verfügbar, deshalb Prüfungen in der Projekt-Shell. Keine Commits oder Pushes.

## Nacharbeit 1 (Claude-Review 2026-09-29) — nur Wasserwerte

Kamera, Straße, Lade-Gate, Tests: abgenommen. Befund im Browser (390×659): Stufe 1 ist
fast weiß (helle Grundfarbe `#b1dce1` + Himmelsspiegel), Stufe 2 trüb grau. Claude hat
Werte an einer Testseite ausprobiert (`public/probe-3d/wasser.html`, Variante "c" wirkt
wie echtes Meer). Nur `src/v3d/wasser.ts` (und bei Bedarf `balance3d.ts` Block `BUEHNE`)
ändern, als benannte Konstanten:
- **Stufe 1:** Grundfarbe `#0b3440`, Rauheit 0,2, `normalScale` 0,9, Normalkarten-
  `repeat` 40, `envMapIntensity` 0,7. Himmelsverlauf (Canvas 256×128, von oben):
  0 → `#5d9fd6`, 0,48 → `#bcd9ea`, 0,52 → `#dfe9ec`, 1 → `#3a5560`.
- **Stufe 0:** Grundfarbe `#0b3440` (gleiche Farbe wie Stufe 1).
- **Stufe 2:** `waterColor` `0x0e3a46`, `distortionScale` 2,5.
- Sonne, Dunst, Kamera, alles andere unverändert. Tests, `tsc`, Build grün;
  Status am Ende wieder `IMPL_DONE`, kurzer Nachtrag im Implementation Summary.

## Nacharbeit 2 (Claude-Review 2026-09-29) — Speicherleck nach dem Messmodus

Wasserwerte: abgenommen. Befund im Browser mit WebGL-Zählern (Anlegen minus Löschen von
Texturen, Puffern, Framebuffern, Renderbuffern): Start → Zurück ist über drei Runden
exakt stabil. **Nach einem vollständigen Messlauf + Zurück bleiben liegen: 1 Textur,
1 Framebuffer, 1 Renderbuffer, 6 Puffer.** Im Messmodus zeigte der zweite Start
Geometrien 36 / Texturen 9 statt 35 / 8 (Randbedingung 5 verletzt).
Ursachen (von Claude im Code gefunden):
1. `src/v3d/wasserSpiegel.ts` hat **keine eigene `dispose()`-Methode** (A4 verlangt sie).
   `wasser.ts` ruft `mesh.dispose()` auf, das den Spiegel-Zielpuffer nicht freigibt.
   → In der Klasse `Water` eine `dispose()` ergänzen: `this.spiegelZiel.dispose()`,
   `this.geometry.dispose()`, `this.material.dispose()`.
2. `bricheAb()` in `messung.ts` gibt die Vollast-`InstancedMesh` nicht mit
   `InstancedMesh.dispose()` frei (Instanz-Matrix-Puffer bleiben). → je Kind
   `(child as THREE.InstancedMesh).dispose()` zusätzlich zur Geometrie.
Nach der Korrektur prüft Claude erneut mit den WebGL-Zählern. Tests, `tsc`, Build grün;
Status am Ende `IMPL_DONE`, kurzer Nachtrag im Implementation Summary.

## Nacharbeit 3 (Thomas 2026-09-29) — Straßenbelag Asphalt

D1 läuft am iPhone im Budget (Wasser 1: 55,7 fps / 24 ms). Thomas findet die Straße zu
glatt und hat aus vier Entwürfen **Asphalt** gewählt (dunkelgrau, weiße Randlinien,
gestrichelte Fahrstreifen). Nur `v3d-strasse.webp` und die Belags-Einstellungen in
`szene.ts` ändern; alles andere bleibt.
- **Neue Bemalung** `src/v3d/bilder/v3d-strasse.webp`, **1024 × 512 px = 12 m quer ×
  6 m längs** (die ganze Straßenbreite in einer Kachel, nur in Längsrichtung wiederholt:
  `repeat = (1, 40)` auf 240 m, `wrapT = RepeatWrapping`, `wrapS = ClampToEdge`).
- Grundbelag: **Codex erzeugt eine Asphaltfläche mit dem Bildwerkzeug** (dunkelgrauer
  Asphalt, feine Körnung, leichte Farbunterschiede, von oben, ohne Perspektive, ohne
  Markierungen). In Längsrichtung nahtlos machen (Kanten überblenden), Helligkeit so
  setzen, dass der Mittelwert etwa `#5a5d61` entspricht.
- Darauf per Skript (PIL) gezeichnet, maßstabsgenau (85,3 px/m quer, 85,3 px/m längs):
  - weiße Randlinien (`#e8e6de`), 0,15 m breit, Innenkante 0,35 m von jeder Straßenkante;
  - zwei gestrichelte Fahrstreifenlinien bei `x = −2` und `x = +2` m, 0,12 m breit,
    Strich 3 m, Lücke 3 m (genau eine Periode je Kachel);
  - zwei dezente dunklere Fahrspuren je Fahrstreifen (Reifenspuren, weich, Deckkraft
    ≤ 15 %), durchgehend, damit sich nichts sichtbar alle 6 m wiederholt;
  - **keine** einzelnen Flicken oder Flecken (sie würden sich alle 6 m wiederholen).
  - Linien leicht abgenutzt (feines Rauschen in der Deckkraft), nicht perfekt glatt.
  - Das Skript kommt nach `scripts/strasse-asphalt.py`, WebP Qualität 88.
- `szene.ts`: `anisotropy = min(8, renderer.capabilities.getMaxAnisotropy())` für die
  Straße (Linien bleiben in der Ferne scharf); Rauheit 0,95.
- Speicherplan zählt die neue Größe automatisch mit (prüfen).
- 2×2-Kachelprobe (längs) als PNG ins Scratchpad, im Bericht nennen. Tests, `tsc`,
  Build grün; Status am Ende `IMPL_DONE`, Nachtrag im Implementation Summary.
