# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D0 — Fundament "Run Gun 3D"

Verbindlicher Plan: `docs/plan-v7.md` (lesen: "Machbarkeit", "Folgerungen",
"Unverhandelbare Randbedingungen", "Schrittfolge → D0"). Dieser Schritt baut **nur das
Gerüst**: Menüknopf, Umschalten Phaser ↔ Three.js, leere 3D-Szene, Zurück, Messmodus mit
Platzhalter-Vollast, Info-Bildschirm, Level-Speicher, Service-Worker-Regeln, Tests.
**Kein Spielinhalt** (keine Bahn-Gestaltung, keine echten Figuren, keine Spielrechnung).

Vorlagen (lesen, **nicht** importieren): `public/probe-3d/diagnose7.html` (Messmodus,
`helligkeit()`, `grafikMB()`, `auswerten()`, Aufwärmphase, Anordnung der Masse),
`public/probe-3d/index.html` (Instanz-Zeichnung einfacher Körper).

## Erlaubte Änderungen (abschließend)

- Neu: alles unter `src/v3d/`, neue Tests unter `tests/`.
- `package.json` + Lockfile: `three` (aktuelle Version, derzeit 0.186.x) und `@types/three`
  (devDependency). Keine weiteren Pakete.
- `src/scenes/MenuScene.ts`: nur der bisherige V2-Knopf (um `'RUN GUN V2'`) und die dafür
  nötigen Hinweis-Texte.
- `vite.config.ts`: nur die Regeln aus A6.
- Bestehende Tests: zuerst `grep -rn "RunGunV2Scene\|RUN GUN V2" tests/` ausführen. **Nur
  die Prüfungen, die den Menüknopf bzw. `this.scene.start('RunGunV2Scene')` in
  `MenuScene.ts` erwarten**, auf den 3D-Knopf umstellen (bekannt: `tests/v2Geruest.test.ts`
  Menü-Teil, `tests/keinTorlauf.test.ts` Zeile ~20). Prüfungen der V2-Szene selbst
  (z. B. in `v2Optik`, `v2BossOptik`) bleiben unverändert.
- `tests/precache.test.ts`: nur der Filter `precacheFiles` schließt Pfade unter `probe-3d/`
  aus (sonst verlangt er deren Precache und widerspricht A6); der Test bleibt sonst gleich.
- **Nicht** ändern: `src/main.ts`, `index.html`, `src/style.css`, `src/systems/`,
  `src/config/`, `src/v2/` (die `RunGunV2Scene` bleibt registriert, nur nicht mehr im Menü
  erreichbar), alle anderen Szenen, `docs/lizenzen.md`.

## Dateien und Schnittstellen (verbindlich)

| Datei | Inhalt |
|---|---|
| `src/v3d/einstieg.ts` | `export async function starte3D(game: Phaser.Game, beimSchliessen: (hinweis?: string) => void): Promise<void>` — einziger Einstieg, von `MenuScene` per `import()` geladen |
| `src/v3d/renderer.ts` | der eine `THREE.WebGLRenderer` (Modul-Variable), Anlegen, Größe, Kontextverlust |
| `src/v3d/szene.ts` | leere Szene, Kamera, Freigabe |
| `src/v3d/oberflaeche.ts` | DOM-Container und Knöpfe (ZURÜCK, INFO, MESSEN, Level-Anzeige) |
| `src/v3d/info.ts` | Info-Tafel aus `docs/lizenzen.md` |
| `src/v3d/messung.ts` | Messablauf, Platzhalter, Bildpunkt-Auslesung (mit three/DOM) |
| `src/v3d/rechnen.ts` | **reine Rechnung ohne `three` und ohne DOM**: `auswerten(bildzeitenMs)`, `speicherMB(...)`, `urteil(...)` |
| `src/v3d/speicher.ts` | Level-Speicher, **ohne `three`, ohne `renderer.ts`** |

In `src/v3d/` ist Phaser nur als Typ erlaubt (`import type Phaser from 'phaser'`).

## Akzeptanzkriterien

### A1 Menüknopf
- Der Knopf an der Stelle von "RUN GUN V2" heißt **"RUN GUN 3D"** (gleiche Lage, Größe).
- Antippen: Sperr-Flag `startet` (weitere Taps werden ignoriert, bis `import()` fertig oder
  gescheitert ist), dann `import('../v3d/einstieg')` und `starte3D(this.game, hinweis => …)`.
  Der Rückruf zeigt einen übergebenen Hinweis 4 s als Phaser-Text mittig über dem Knopf.
- Schlägt `import()` fehl: **einmalig** `location.reload()`, geschützt durch das
  `sessionStorage`-Flag `rg3d_neuladen` (nach Erfolg gelöscht). Scheitert es danach
  erneut: Hinweis **"3D-Dateien nicht ladbar – App neu öffnen"**, Menü bleibt bedienbar.
  (Hintergrund: Nach einem Service-Worker-Update verweist das alte Menü auf einen gelöschten
  Baustein; ein Neuladen behebt das.)

### A2 Umschalten Phaser ↔ Three.js
- **Start:** `game.input.enabled = false`, `game.loop.sleep()`, Phaser-Zeichenfläche
  `style.visibility = 'hidden'`.
- **Verlassen ist ein einziger Pfad `verlasse(hinweis?)`**, idempotent (zweiter Aufruf tut
  nichts). Er gibt die Szene frei (alle Geometrien, Materialien, Texturen `dispose()`),
  bricht als **ersten Schritt** eine laufende Messung ab (`bricheAb()`, s. A3),
  stoppt die Zeichenschleife (`setAnimationLoop(null)`), blendet Three-Zeichenfläche und
  DOM-Container aus und führt **im `finally`** aus: Phaser-Zeichenfläche sichtbar,
  `game.loop.wake()`, `game.input.enabled = true`, alle Phaser-Pointer zurücksetzen
  (`game.input.pointers.forEach(p => p.reset())` und `game.input.mousePointer?.reset()`), dann `beimSchliessen(hinweis)`.
  ZURÜCK und Kontextverlust rufen beide `verlasse()`.
- **Genau ein** `THREE.WebGLRenderer` (`renderer.ts`), beim ersten Start angelegt und bei
  jedem weiteren Start wiederverwendet. Zeichenfläche an `document.body`, Inline-Style
  `position: fixed; inset: 0; z-index: 10; touch-action: none`; beim Verlassen ausgeblendet.
  `setPixelRatio(Math.min(devicePixelRatio, 2))`, `antialias: true`.
- **Größe:** bei jedem Start und bei `resize`/`orientationchange` (nur solange 3D aktiv):
  `renderer.setSize(innerWidth, innerHeight, false)` plus Zeichenfläche per CSS 100 %,
  `camera.aspect` anpassen, `updateProjectionMatrix()`.
- **Kontextverlust** (`webglcontextlost` auf der Three-Zeichenfläche): `preventDefault()`,
  `verlasse('Grafik wurde zurückgesetzt')`, dann Renderer `dispose()`, Zeichenfläche per
  `remove()` aus dem DOM, Modul-Variable `null` → beim nächsten Start neu angelegt. **Nie
  mehr als eine Three-Zeichenfläche im DOM.**
- **Unterbrechung:** `visibilitychange` → bei `hidden` Zeichenschleife anhalten, bei
  `visible` fortsetzen (nur solange 3D aktiv). Läuft gerade eine Messung: abbrechen (s. A3).
  Hinweis für Claude/Thomas, kein Codex-Auftrag: `src/main.ts` kann bei `visible` nach einem
  Service-Worker-Update neu laden — das ist erwartet; D0 hat dabei nichts zu verlieren.
- **DOM-Oberfläche** (`oberflaeche.ts`): ein Container (`z-index: 11`), einmal angelegt,
  beim Verlassen ausgeblendet und wiederverwendet. Abstände über
  `env(safe-area-inset-*)` im Inline-Style. Knöpfe **ZURÜCK** (oben links), **INFO**
  (oben rechts), **MESSEN** (unten mittig), Anzeige **"Level N"** (oben mittig). Alle Knöpfe
  mind. 44 × 44 px, `touch-action: manipulation; user-select: none;
  -webkit-touch-callout: none`.
- **Leere Szene:** Himmelfarbe `#87c6ee`, graue Bahn (Ebene 7 × 80, `#3b4450`,
  Mitte bei z = −30), blaue Fläche daneben (80 × 80, `#2f6f96`, 2 cm tiefer),
  `HemisphereLight(0xffffff, 0x556070, 2.2)` + `DirectionalLight(0xffffff, 2.2)` bei
  `(−6, 14, 4)`, Kamera `PerspectiveCamera(50)` bei `(0, 9, 10)`, Blick auf `(0, 0, −12)`.

### A3 Messmodus (`messung.ts` + `rechnen.ts`)
- Knopf **MESSEN** startet: Aufwärmen 5 s (nicht gewertet), dann zwei Stufen à 30 s.
  **Zeitfenster laufen über aufsummierte Bildzeit, nicht über die Wanduhr.** Bilder mit
  Dauer > 250 ms zählen nie in die Statistik.
  1. **"Leere Szene"**
  2. **"Platzhalter-Vollast"**: `InstancedMesh` mit 1500 Instanzen eines Körpers mit
     ~1000 Dreiecken (z. B. `SphereGeometry(0.25, 24, 21)`, gestreckt auf 0,7 m Höhe) und
     150 Instanzen eines Körpers mit ~5000 Dreiecken (z. B. `SphereGeometry(0.25, 52, 48)`).
     Anordnung wie diagnose7: Zombies ab z = −6 in Reihen mit Abstand 0,42 m über die Bahn
     (x von −3,1 bis +3,1), Soldaten ab z = +4,5 in 6er-Reihen (Abstand 0,6 m / 0,55 m);
     leichtes Wippen je Bild über `setMatrixAt`. Material `MeshStandardMaterial({ map })`
     mit einer **512 × 512-Testbemalung** (im Code erzeugte `CanvasTexture`, helles
     Schachbrett). Platzhalter existieren nur während der Messung und werden danach
     freigegeben.
- **Abbruch:** `messung.ts` exportiert `bricheAb(grund)` (idempotent): stoppt die
  Messung, gibt Platzhalter und Testbemalung frei, kein Ergebnis. Aufrufer:
  `visibilitychange` → `hidden` (Anzeige **"Abgebrochen – Unterbrechung, bitte neu
  starten"**) und `verlasse()`. Während einer Messung ist MESSEN deaktiviert (`disabled`).
- **Bildzeiten:** Bilder > 250 ms zählen zur Fensterzeit, aber nicht in die Statistik; ihre
  Anzahl wird je Stufe angezeigt.
- Anzeige (DOM-Tabelle oben) je Stufe: Schnitt-fps, langsamste 5 % in ms
  (`auswerten()`: sortieren, Wert an Index `floor(n · 0,95)`, fps = 1000 / Mittelwert),
  **Schwarz-Anteil** (Bildpunkt-Auslesung wie diagnose7 `helligkeit()`: 41 × 41 Bildpunkte
  um den projizierten Weltpunkt `(0, 0.35, −10)`, Anteil mit mittlerer Helligkeit < 30;
  **einmal 3 s nach Stufenbeginn, im selben Bildschritt direkt nach `render()`**;
  in Stufe 1: "entfällt"), **Speicherplan** (`speicherMB()`):
  - Bemalungen Three: Σ Breite × Höhe × 4 × 4/3 über alle von gezeichneten Materialien
    benutzten Texturen (`map`, `normalMap`), jede Textur nur einmal
  - Renderflächen: je Zeichenfläche `drawingBufferWidth × drawingBufferHeight × 4`
    (Three und Phaser, aus den echten Zeichenflächen gelesen)
  - Phaser-Rest: Σ Breite × Höhe × 4 über alle Quellbilder in `game.textures`
  - alle Werte in MB (1 MB = 1 048 576 Byte). **Budget-relevant ist nur die Bemalung
    Three (≤ 60 MB, Plan-Definition).** Renderflächen und Phaser-Rest werden als
    "Schätzung, ohne Tiefen- und Glättungspuffer" nur angezeigt.
  - `renderer.info.memory.geometries` / `.textures`
- Abschlusszeile (`urteil()`): **"✅ im Budget"**, wenn Stufe 2: Schnitt ≥ 55 fps,
  langsamste 5 % ≤ 25 ms, Schwarz ≤ 10 %, Bemalung ≤ 60 MB — sonst **"❌ außerhalb: <Wert>"**.
  Leere Bildliste oder > 10 % verworfene Bilder → **"❌ außerhalb: zu wenig gültige
  Bilder"** (nie ✅ bei fehlenden Werten).

### A4 Info-Bildschirm (`info.ts`)
- Knopf **INFO** zeigt eine DOM-Tafel mit dem Inhalt von `docs/lizenzen.md`
  (`import text from '../../docs/lizenzen.md?raw'`). Absätze als `<p>`, Tabellenzeilen:
  Zeilen mit `|` aufteilen, Kopf- und Trennzeile weglassen, je Zeile ein `<li>`.
  **Nur `textContent`, nie `innerHTML`, keine `<a>`** (Links bleiben reiner Text; ein
  Antippen darf die App nicht verlassen). Tafel: `overflow-y: auto; touch-action: pan-y;
  overscroll-behavior: contain`, Schließen-Knopf. Falls `tsc` den `?raw`-Import nicht kennt:
  `src/v3d/raw.d.ts` mit `declare module '*.md?raw'`.

### A5 Level-Speicher (`speicher.ts`)
- Schlüssel **`rg3d.v1`**, Inhalt JSON `{ "version": 1, "hoechstesLevel": <Zahl ≥ 1> }`.
- `ladeFortschritt()`: `try/catch`; fehlend, kaputt, falsche Version, Zahl < 1 oder
  `localStorage` wirft → `{ version: 1, hoechstesLevel: 1 }`, nie ein Fehler nach außen.
- `speichereFortschritt(level)`: `try/catch`, schreibt nur `rg3d.v1`.
- D0 ruft beim Start `ladeFortschritt()` auf und zeigt "Level N".
- Berührt **nie** `rungun_save_v1`, `rungun_save_v1_backup`, `rungun_save_v1_vorReset`.

### A6 Service Worker und Build (`vite.config.ts`)
- `workbox.globPatterns`: um `glb` und `webp` ergänzen.
- `workbox.globIgnores: ['probe-3d/**']`.
- `workbox.maximumFileSizeToCacheInBytes: 10 * 1024 * 1024`.
- Chunk-Benennung (Vite 8 / rolldown, `build.rolldownOptions.output.chunkFileNames` —
  falls in dieser Version nur `rollupOptions` wirkt, dieses):
  `(chunk) => chunk.moduleIds.some(id => /[\\/]src[\\/]v3d[\\/]|[\\/]node_modules[\\/]three[\\/]/.test(id)) ? 'assets/v3d-[name]-[hash].js' : 'assets/[name]-[hash].js'`
- Alles Übrige in `vite.config.ts` bleibt unverändert.

### A7 Tests (Vitest, Node-Umgebung; laufen mit `npm test`)
- **`tests/v3dIsolation.test.ts`**: Keine `.ts`-Datei unter `src/v3d/` importiert aus
  `src/systems`, `src/config`, `src/v2` oder `src/scenes` (erlaubt: `import type Phaser`).
  Kein `http://` / `https://` im Quelltext unter `src/v3d/**/*.ts` (die Links in
  `docs/lizenzen.md` sind davon nicht betroffen). `rechnen.ts` und `speicher.ts`
  importieren weder `three` noch `renderer.ts`.
- **`tests/v3dRechnen.test.ts`**: `speicherMB` — eine Textur 512 × 512 = 1,333 MB; dieselbe
  Textur zweimal übergeben = einmal gezählt; `auswerten` — feste Bildzeitenliste ergibt
  erwartete fps und langsamste 5 %; Bilder > 250 ms werden verworfen; `urteil` — genau an
  den Grenzen (55 fps, 25 ms, 10 %, 60 MB) ✅, knapp darüber/darunter ❌; leere Liste und
  > 10 % verworfene Bilder ❌ "zu wenig gültige Bilder"; `auswerten([])` liefert kein NaN
  nach außen.
- **`tests/v3dSpeicher.test.ts`** (nachgebauter `localStorage`): fehlend, kaputtes JSON,
  falsche Version, Level 0, werfender `localStorage` → Level 1; Speichern schreibt nur
  `rg3d.v1`; ein vorab gesetzter Wert unter `rungun_save_v1` ist nach Laden und Speichern
  **byte-gleich**.
- **`tests/v3dBuild.test.ts`** (überspringt wie `precache.test.ts`, wenn `dist/sw.js`
  fehlt; Precache-URLs wie dort per Regex `url:"…"` aus `dist/sw.js`):
  - Das Hauptbündel = die in `dist/index.html` per `<script type="module" src=…>`
    eingebundene Datei. Es ist **≤ 1 475 425 Byte** (Stand vor D0: 1 467 233 Byte +
    8 KB für Menü-Code) und enthält den Text **`__THREE__` nicht** (Three-eigener
    Kennzeichner; `WebGLRenderer` taugt nicht, Phaser hat eine gleichnamige Klasse).
  - Es gibt mindestens eine Datei `assets/v3d-*.js`, und eine davon enthält `__THREE__`.
  - Jede JS-Datei in `dist/assets/` außer dem Hauptbündel und `workbox-*` trägt `v3d` im
    Namen (Three rutscht nicht in einen unbenannten Baustein).
  - Alle `v3d`-Dateien stehen im Precache; zusammen ≤ 25 MB.
  - Keine Precache-URL enthält `probe-3d`.
- `tests/precache.test.ts` bleibt bis auf den `probe-3d`-Filter unverändert grün.
- Umgestellte bestehende Tests (siehe "Erlaubte Änderungen"): Menü enthält
  `'RUN GUN 3D'` und `import('../v3d/einstieg')`, nicht mehr `scene.start('RunGunV2Scene')`.
- `npm run build`, `npm test` und `npx tsc --noEmit` ohne Fehler.

## Nachweise, die Claude nach dem Codex-Lauf selbst prüft (nicht Codex)

- Desktop-Browser (Playwright, 390 × 844): Menü → 3D → ZURÜCK → 3D → ZURÜCK;
  `renderer.info.memory` nach Start 1 und Start 2 exakt gleich; im 3D-Modus genau zwei
  `<canvas>` im Dokument; Doppeltipp auf den Knopf startet nur einmal; alle Netzanfragen nur
  an die eigene Adresse; ZURÜCK mitten in einer Messung → `memory.geometries/textures`
  wie vor der Messung; MESSEN liefert Werte; Menü → 3D → Menü → Run spielbar → Menü → 3D.
- iPhone (Thomas, ein Foto): MESSEN im installierten Spiel, Offline-Start im Flugmodus.

## Nicht tun

- Keine Spielinhalte aus späteren Schritten (Bahn-Gestaltung, Wasser, Figuren, Rechenkern).
- Keine Dateien aus `public/probe-3d/` importieren oder verschieben.
- Keine Änderungen außerhalb der Liste "Erlaubte Änderungen".
- Keine Anfragen nach außen, keine neuen Pakete außer `three` / `@types/three`.
- Keine Commits (macht Claude nach dem Review).

## Implementation Summary

- Neu: `src/v3d/` mit Einstieg, wiederverwendetem Renderer, leerer Szene, DOM-Oberfläche,
  Lizenz-Info, Messung, reiner Messrechnung und getrenntem Level-Speicher.
- Geändert: `src/scenes/MenuScene.ts` (3D-Knopf und Ladefehler), `vite.config.ts`
  (3D-Chunk und Precache), `package.json`/`package-lock.json` (`three`, `@types/three`),
  erlaubte Menü-/Precache-Tests; neu vier `tests/v3d*.test.ts`.
- Nach finaler Codeänderung: `npm run build` Exit 0; Hauptbündel 1.467.937 Byte
  (Grenze 1.475.425), 3D-Chunk ca. 543 KB; `npm test` 54/54 Dateien und 495/495
  Tests grün; `npx tsc --noEmit` Exit 0; `git diff --check` Exit 0.
- Nicht hier geprüft: Desktop-Browserabläufe und iPhone-Messung/Flugmodus aus dem
  ausdrücklich Claude/Thomas zugewiesenen Nachweisblock. Kein Commit oder Push gemäß Spec.
