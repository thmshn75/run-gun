# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E6 — V1-Abnahme, maschinenseitiger Teil: Offline-Cache repariert (Sprites fehlen im
Precache) plus Abnahme-Nachweise.**

Befund vom 2026-08-21: `dist/sw.js` precached nur 6 Einträge (index.html, JS, CSS,
apple-touch-icon.png, manifest). Die ~20 Spiel-PNGs unter `dist/assets/` (Gegner, Kulisse,
Waffen, Titelbild) und die beiden Manifest-Icons fehlen. Beim ersten Offline-Start nach
Installation schlagen die Bild-Loads in `BootScene` fehl — die Definition „fertig" (offline
mehrere Runs) ist damit aktuell nicht erfüllt. Ursache: `vite-plugin-pwa`-Default-Glob
(`**/*.{js,css,html}`) plus `includeAssets` nur mit `apple-touch-icon.png`.

---

## Auftrag

1. In `vite.config.ts` den Workbox-Precache vervollständigen:
   - `workbox.globPatterns: ['**/*.{js,css,html,png,webmanifest}']`
   - `includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']`
   - Sonst nichts an der PWA-Konfiguration ändern (`skipWaiting`/`clientsClaim` bleiben).
2. Workbox warnt ab 2 MiB pro Datei (`maximumFileSizeToCacheInBytes`): prüfen, ob eine
   Einzeldatei im `dist/` das reißt (der Phaser-Chunk liegt bei ~1,3 MiB — vermutlich nein).
   Nur falls ja: Limit explizit setzen und im Config-Kommentar begründen.
3. **Nachweis im Build statt Annahme:** Ein Skript-Test (`tests/precache.test.ts`), der NACH
   einem Build `dist/sw.js` liest und prüft:
   - Jede Datei aus `dist/` und `dist/assets/` mit Endung js/css/html/png/webmanifest ist im
     Precache-Manifest enthalten (Dateiliste zur Testzeit aus dem Dateisystem gelesen, nicht
     hart kodiert; `workbox-*.js` und `sw.js` selbst sind ausgenommen — sie sind der Cache-Code).
   - Keine `.map`-Datei existiert in `dist/` (E6-Kriterium, heute erfüllt via `sourcemap: false`
     — der Test hält es fest).
   Damit `npm test` ohne vorherigen Build nicht fehlschlägt: Test überspringt sich mit
   `describe.skipIf(!existsSync('dist/sw.js'))` und einem Log-Hinweis. In den
   package.json-Scripts einen Eintrag `test:dist` ergänzen (`npm run build && vitest run`),
   der im Abschlussbericht nachweislich gelaufen ist.
4. README um einen kurzen Abschnitt „Abnahme-Checks (E6)" ergänzen: die zwei iPhone-Checks
   (Netzwerk-Null im Safari Web Inspector über USB; Update sichtbar nach Force-Quit) mit je
   2–3 Sätzen Durchführung. Hinweis aufnehmen: Die Strings `phaser.io`/`bit.ly` im Bundle sind
   Phasers Konsolen-Banner, keine Requests — im Netzwerk-Check zählt die Request-Liste, nicht
   der Quelltext.

## Akzeptanzkriterien
1. `npm run build` erzeugt einen Precache, der alle PNGs aus `dist/` und `dist/assets/`
   enthält; der neue Test weist es dateisystembasiert nach und ist über `npm run test:dist`
   gelaufen (Ergebnis im Abschlussbericht).
2. Keine `.map`-Dateien im `dist/`, per Test festgehalten.
3. README enthält die zwei iPhone-Abnahme-Checks.
4. `npm run check`, `npm run build`, `npm test` und `npm run test:dist` sauber.
5. Keine neuen Abhängigkeiten, keine Laufzeit-Requests, keine weiteren Config-Änderungen.

## Reißleine
Falls `vite-plugin-pwa` die Glob-Erweiterung in dieser Projektversion anders benennt oder das
Precache-Manifest nicht als lesbarer String in `sw.js` liegt: nicht raten und nicht das Plugin
wechseln — stoppen und melden, welche Struktur `sw.js` tatsächlich hat.
**Kein zulässiger Ersatz:** Runtime-Caching (`runtimeCaching`) statt Precache — beim ersten
Offline-Start nach Installation wäre der Cache leer, genau der Fall, der hier repariert wird.

## Implementation Summary

- Workbox precacht nun JavaScript, CSS, HTML, PNGs und das Webmanifest; beide Manifest-Icons
  sind zusätzlich als Assets aufgenommen. Die bestehende Service-Worker-Aktivierung blieb
  unverändert.
- `tests/precache.test.ts` vergleicht nach einem Build die tatsächlichen `dist/`-Dateien mit
  dem Precache und hält zugleich das Fehlen von Source-Maps fest. `npm run test:dist` baut
  vorher und lief erfolgreich durch.
- Einzeldatei-Check: größte Datei `assets/index-C9AWj2aB.js` mit 1.325.180 Bytes, daher kein
  Workbox-Limit nötig. README enthält die beiden manuellen iPhone-Abnahme-Checks.
