# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
E1 — Gerüst + Deploy-Pipeline (GitHub-lose Variante: alles lokal prüfbar, Deploy vorbereitet)

## Kontext
Erster Codex-Task des Projekts. Verbindlicher Plan: `docs/plan.md`, Etappe E1.
Das GitHub-Repo existiert noch nicht — deshalb müssen ALLE Codex-Akzeptanzkriterien im
Terminal prüfbar sein. Browser-/Laufzeitprüfungen macht Claude im Review (siehe
Akzeptanzkriterien, Teil B); Codex liefert dafür nur die Voraussetzungen. Der
Deploy-Workflow wird vollständig mitgeliefert und wird aktiv, sobald Thomas das Repo
anlegt (Schritte dafür in README dokumentieren).
Optik-Entscheidung: Pixel-Art Retro (Kenney CC0, Assets erst ab E2) — `pixelArt: true`
wird schon jetzt gesetzt. E1 nutzt nur ein Platzhalter-Rechteck.

## Anforderungen
1. **Scaffold — Weg ist vorgeschrieben:** In ein LEERES Temp-Verzeichnis scaffolden
   (`npm create vite@latest rungun-scaffold -- --template vanilla-ts`), dann die
   generierten Dateien gezielt ins Projektverzeichnis übernehmen. Grund: Im nicht-leeren
   Run-Gun-Ordner bricht der Befehl im Non-TTY-Kontext still ab (Exit 0, kein
   package.json); das Flag `--overwrite` ist VERBOTEN — es löscht alles außer `.git`,
   inklusive `docs/`, `CLAUDE.md`, `AGENTS.md`, `.claude/`. Bestehende Dateien/Ordner
   (`.git`, `.claude/`, `docs/`, `tests/`, `CLAUDE.md`, `AGENTS.md`) nicht anfassen.
   Danach `npm install phaser` (aktuelle stabile Versionen, exakt in `package.json`
   gepinnt). KEIN Klon eines Phaser-Starter-Templates (die bringen oft Sample-Assets
   mit externen URLs oder Zusatz-Dependencies mit). Einzige Runtime-Dependency: `phaser`.
   Dev-Dependencies: nur `vite`, `typescript`, `vite-plugin-pwa` (+ deren Peer-Deps).
   `npm install` braucht einmalig Internet; zur Laufzeit des Spiels keinerlei externe Requests.
2. **Phaser-Config** (`src/main.ts`): Design-Größe 390×844 (Hochformat),
   `Scale.FIT` + `autoCenter: CENTER_BOTH`, `pixelArt: true`, Arcade Physics (debug aus).
3. **PWA-Registrierung:** in `src/main.ts` `import { registerSW } from 'virtual:pwa-register'`
   UND Aufruf `registerSW({ immediate: true })` — nur der Import ohne Aufruf registriert
   nichts. Damit `npm run check` das virtuelle Modul kennt: in `tsconfig.json`
   `"types": ["vite/client", "vite-plugin-pwa/client"]` — ERGÄNZEN, nicht ersetzen:
   der Scaffold bringt `vite/client` bereits mit, dessen Verlust bricht `tsc --noEmit`.
4. **Szenen:** `BootScene` (erzeugt Platzhalter-Textur per Graphics) →
   `GameScene` (dunkler Hintergrund, Safe-Area-Debug-Rahmen, Spieler-Rechteck).
5. **Drag-Steuerung:** Finger-/Maus-Delta-X wird RELATIV auf die Spieler-X addiert
   (nicht absolute Fingerposition — der Finger darf die Figur nicht verdecken);
   Clamp auf Spielfeldbreite. `touch-action: none` auf dem Canvas, `contextmenu`
   unterdrückt, Viewport-Meta mit `viewport-fit=cover, user-scalable=no`.
   Gegen iOS-Gummiband reicht `touch-action` allein nicht: zusätzlich
   `html, body { position: fixed; overflow: hidden; height: 100%; width: 100%;
   overscroll-behavior: none; }`.
6. **Safe-Area:** Insets per JS auslesen: Hilfs-DOM-Element mit
   `env(safe-area-inset-*)`-Padding, verstecken mit `position: fixed; visibility: hidden`
   — NICHT `display: none` (dann wird nicht layoutet und iOS liefert 0 statt echter
   Werte). Werte per `getComputedStyle` lesen; NICHT als CSS auf Phaser-Objekte.
   In der GameScene: sichtbarer Debug-Rahmen entlang der Insets plus Textzeile mit
   den vier Werten (Desktop zeigt 0/0/0/0 — das ist dort korrekt).
7. **PWA-Manifest** (via `vite-plugin-pwa`, `registerType: 'autoUpdate'`, `skipWaiting`
   + `clientsClaim`): name/short_name „Run & Gun", `display: standalone`,
   `orientation: portrait`, `start_url` UND `scope` exakt `/run-gun/` — beide explizit
   setzen, auch wenn das Plugin `scope` aus `base` ableiten kann. Dunkle
   theme/background-color. Icons: 192 + 512 PNG plus Apple-Touch-Icon 180 als echte,
   committete PNG-Dateien mit DECKENDEM Hintergrund (kein transparenter Hintergrund —
   wirkt am iOS-Homescreen unschön); Erzeugung über ein dependency-freies Node-Skript
   (built-in `zlib`, PNG selbst encodiert) — KEINE Bildbibliothek wie sharp/canvas
   installieren.
   iOS-Meta-Tags: `apple-mobile-web-app-capable`, Statusbar `black-translucent`.
   Hinweis: im `npm run dev` existiert NIE ein Service Worker (`devOptions.enabled`
   ist standardmäßig false) — SW-Verhalten nur über `npm run preview` beurteilen,
   ein fehlender SW im dev-Modus ist kein Bug.
8. **Vite:** `base: '/run-gun/'`, `build.sourcemap: false` explizit.
   `public/.nojekyll` (leer), damit sie im Build-Output landet.
   Folge des base-Pfads: dev und preview laufen NUR unter
   `http://localhost:5173/run-gun/` bzw. `http://localhost:4173/run-gun/` —
   Root (`/`) zeigt 404/leer, das ist erwartet. In README dokumentieren.
9. **Fonts/Assets:** nur System-Font; keine CDN-/Google-Fonts-Referenzen —
   viele Phaser-Templates bringen die mit, nicht übernehmen.
10. **Deploy-Workflow:** `.github/workflows/deploy.yml` — Build + GitHub-Pages-Deploy
    bei Push auf `main`, `permissions: contents: read, pages: write, id-token: write`.
    README: Schritte „Repo `run-gun` public anlegen → Settings → Pages → Source auf
    ‚GitHub Actions'" + lokale Befehle (dev/build/preview inkl. Subpfad-URLs).
11. **Scripts:** `dev`, `build`, `preview`, `check` (= `tsc --noEmit`).

## Betroffene Dateien
`package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`,
`src/main.ts`, `src/scenes/BootScene.ts`, `src/scenes/GameScene.ts`,
`public/` (Icons, `.nojekyll`), `scripts/make-icons.mjs` (o. ä.),
`.github/workflows/deploy.yml`, `README.md`

## Akzeptanzkriterien

### Teil A — weist Codex nach (alles im Terminal prüfbar; Kommandos + Output in den Abschlussbericht)
- [ ] `npm install && npm run build` fehlerfrei; `npm run check` fehlerfrei
- [ ] `dist/` enthält `.nojekyll`; KEINE `.map`-Dateien
- [ ] `grep -RiE "https?://" dist/` zeigt keine fremden Hosts. Erlaubte Ausnahmen:
      XML-Namespaces (w3.org) und Lizenz-/Quellkommentare der Build-Tools im Output
      (Phaser-Bundle: phaser.io/GitHub/MIT; Workbox-Runtime `workbox-*.js`:
      Google/Workbox-Verweise) — solche Kommentare NICHT aus dem Bundle entfernen.
      Fail sind nur URLs, die zur Laufzeit abgerufen würden: CDN-Imports, Font-Links,
      Analytics, fetch/XHR-Ziele.
- [ ] `dist/manifest.webmanifest`: `start_url` und `scope` exakt `/run-gun/`,
      `display: standalone`; alle Icon-`src`-Pfade beginnen mit `/run-gun/`
      (führender `/` ohne Subpfad wäre lokal unauffällig und bräche erst am iPhone)
- [ ] `dist/index.html`: der `apple-touch-icon`-href beginnt mit `/run-gun/` —
      Vite schreibt absolute `/`-Pfade auf public/-Dateien NICHT um, dieselbe
      Subpfad-Falle wie beim Manifest
- [ ] Icon-Dateien gültig: `file public/*.png` meldet PNG und `sips -g pixelWidth -g
      pixelHeight` zeigt 192/512/180 wie spezifiziert
- [ ] `src/main.ts` ruft `registerSW({ immediate: true })` auf; `tsconfig.json` enthält
      den types-Eintrag; CSS enthält die html/body-Fixierung aus Anforderung 5
- [ ] Workflow-Datei vorhanden, Berechtigungen wie in Anforderung 10
Codex prüft KEINE Browser-Kriterien und liefert dafür auch keine Selbsteinschätzung —
kein Playwright/Puppeteer installieren.

### Teil B — prüft Claude im Review (Browser gegen `npm run preview` unter `http://localhost:4173/run-gun/`)
- [ ] Szene rendert im Hochformat; Debug-Rahmen + Inset-Text sichtbar (Desktop: 0/0/0/0)
- [ ] Drag bewegt das Rechteck relativ und geclampt; die Seite scrollt/zoomt nicht
- [ ] Service Worker registriert sich im Preview (localhost)
- [ ] Die drei Icon-PNGs einmal visuell gegengeprüft (Browser-`<img>`): erkennbares
      Motiv, deckender Hintergrund

`APPROVED` wird erst gesetzt, nachdem Teil B tatsächlich per Browser (Playwright)
gegen den laufenden Preview-Server ausgeführt wurde — Code-Lesen ersetzt den Lauf nicht.

### Teil C — aufgeschoben (erst nach Repo-Anlage, Test durch Thomas am iPhone; NICHT Teil dieses Tasks)
- [ ] Installation über Pages-URL; App öffnet Szene (keine weiße Seite); Flugmodus; Drag ohne Gummiband

## Reißleinen
- Funktioniert die SW-Registrierung im lokalen Preview nach 2 Nacharbeitszyklen nicht,
  den SW-Teil in einen Folgetask ausklammern und E1 ohne SW abschließen — nicht weiterbohren.
- Liefert das PNG-Skript nach 2 Zyklen keine gültigen PNGs (CRC/Chunk-Fehler),
  einfachste valide Variante nehmen (unkomprimierte PNG-Blöcke bzw. zlib ohne
  Kompression) statt weiterbohren.

## Implementation Summary
Gerüst, Phaser-Szenen, PWA-/Pages-Konfiguration, Icons und Deploy-Workflow sind angelegt.
Die abschließende Installation, der Build und der Typecheck sind blockiert, weil npm
`registry.npmjs.org` nicht auflösen kann (`ENOTFOUND` für `phaser`). Status bleibt bis
zum realen Nachweis `SPEC_READY`.

## Review Notes
Review 2026-08-19 (Claude): **bestanden.**
- Sonderfall Status: Codex konnte IMPL_DONE nicht setzen, weil seine Sandbox
  `registry.npmjs.org` nicht auflösen kann (2 Läufe, gleicher DNS-Fehler; Netz am Mac
  selbst war ok). Install/Build/Typecheck hat Claude deshalb als Review-Schritt selbst
  ausgeführt — kein Codex-Code fehlte, nur die Ausführungsnachweise.
- Teil A: alle Kriterien grün (Build, Check, .nojekyll, keine .map, Manifest/Icons
  mit /run-gun/-Präfix, registerSW+types, html/body-Fixierung, Workflow-Permissions).
  Grep-Befund `bit.ly` = Doku-Link in Workbox-Warntext, kein Laufzeit-Abruf → ok.
- Teil B per Playwright gegen laufenden Preview (localhost:4173/run-gun/): Szene
  rendert, Safe-Area-Rahmen + 0/0/0/0, Drag relativ + geclampt, kein Scroll/Zoom,
  SW aktiviert (Scope /run-gun/), Icons visuell ok. Hinweis: synthetische
  JS-PointerEvents erreichen Phaser nicht (Test-Artefakt) — echte CDP-Events nutzen.
- Nacharbeitszyklus verbraucht: 1 von 1 (Versionskonflikt vite 8 / vite-plugin-pwa
  1.2.0 → 1.3.0 durch Codex behoben).
- Offen (Teil C, kein Blocker): iPhone-Test nach Repo-Anlage durch Thomas.
- Kleinigkeiten für E5-Aufräumen notiert: deprecation-Warnung
  `apple-mobile-web-app-capable` (zusätzlich `mobile-web-app-capable` setzen),
  fehlendes Favicon (404 auf /favicon.ico außerhalb des base-Pfads).
