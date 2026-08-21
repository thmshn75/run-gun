# Uebergabe: Run & Gun

Stand: 2026-08-21 15:30

## Ziel
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat) bis V1. Plan: `docs/plan.md`.
**Alle Feature-Etappen E1–E10 sind durch.** Offen ist nur E6 (V1-Abnahme) plus Thomas' Wuensche
aus seinen iPhone-Tests.

## Harte Randbedingungen
- Claude ist Architekt und Reviewer, schreibt **keinen** produktiven Code. Umsetzung ueber Codex
  per Terminal-Handoff (Ablauf in `CLAUDE.md`).
- Gamefeel, Optik und Performance gelten erst nach Thomas' iPhone-Test als erfuellt.
- Objekt-Pools: kein `create()`/`destroy()` im Hot Path, jede Poolgroesse mit Herleitung.
- **Nie eine Groesse raten, die das Spiel messen kann.** Diese Fehlerklasse hat am 2026-08-21
  vier Runden gekostet: Truppe, Waffe, Schaden und Feuerrate waren nacheinander aus dem
  Kaufstand hergeleitet statt aus `runStats`. Bei jeder neuen Balance-Rechnung zuerst pruefen,
  ob der echte Wert zur Laufzeit verfuegbar ist.
- Balance-Zahlen immer aus `balance.ts` ableiten — **auch die in Entscheidungsvorlagen fuer
  Thomas** (siehe `docs/lessons.md`).
- Reissleinen muessen benennen, was **kein** zulaessiger Ersatz ist.

## Fertig (alles gepusht, Arbeitsbaum sauber, Deploy gruen)
- E1–E9, Ruckeln behoben (`64fc795`, von Thomas am iPhone bestaetigt).
- **E10 mehrspurige Tore** (`c8e5607`): ab Level 3 traegt jedes dritte Tor eine dritte Spur mit
  Waffenangebot; Level 1–2 zweispurig. Vier Spuren sind per Typ ausgeschlossen (waeren 79 px,
  Plan-Grenze 90 px).
- **Boss-Balance strukturell geschlossen** (`b36fdb0`, `8472f94`, `5fca620`): Truppe, Waffe,
  Schaden und Feuerrate werden gemessen; Kampfdauer per Clamp garantiert **15–40 s** fuer jede
  Kombination (Test ueber 8.064 Faelle). Der alte `hpCap` ist entfernt — er haette starke Runs
  wieder in 1,4 s platzen lassen.
- Reichweiten Schrot/Flamme auf 430 (erreichen den Boss bei 414 px Abstand), Pools nachgezogen.
- Levelanzeige mittig in Zeile 1 des HUD.
- **Kulisse am Strassenrand** (`5fca620`): fuenf Pixel-Art-Sprites, Perspektive ueber
  `getRoadHalfWidth`, gemessen ohne Mehrkosten.

## Offen — naechster Schritt zuerst
1. **Thomas' iPhone-Test** des Live-Stands. Drei Fragen: Ist der Level-1-Boss jetzt auch mit
   Rakete und heruntergedrehter Feuerrate zu besiegen? Sind drei Torspuren treffbar und die
   Waffenangebote nicht zu haeufig? Ist die Kulisse gross genug — auf `title.png` wirken die
   Baeume markanter als im Spiel.
2. **E6 — V1-Abnahme:** finale Icons, README (Start/Build/Deploy), Netzwerk-Null-Check im Safari
   Web Inspector ueber USB, `.map`-Dateien nicht im Deploy, Update nach Force-Quit sichtbar.
3. Optional: Zwei alte Regressionstests aus `64fc795` pruefen Quelltext statt Verhalten.

## Stellschrauben, falls der Test etwas beanstandet
- Waffenangebote zu haeufig: `gates.weaponLaneEvery` 3 → 4 → 5.
- Drei Spuren nicht treffbar: alle Level auf `gateLanes: 2`. Zeitfenster **nicht** verlaengern.
- Kulisse zu klein: `baseHeightPx` je Art in `src/systems/scenery.ts`.
- **Boss:** nicht mehr an Zahlen drehen. Die Dauer ist per Konstruktion ≤ 40 s, toedlich wird er
  ab 45,8 s. Klemmt es trotzdem, liegt es am Kampfverhalten, nicht an den Lebenspunkten.

## Wichtige Dateien und Befehle
- `docs/plan.md` · `docs/active-task.md` (APPROVED) · `docs/lessons.md`
- Balance zentral in `src/config/balance.ts`; Boss-/Sperren-Formel in `src/systems/bossPlan.ts`.
- `npm run check` · `npm run build` · `npm test` (62 Tests) · `npm run dev`
- Live: https://thmshn75.github.io/run-gun/ · Deploy per GitHub Actions auf Push.
- Testlaeufe und Codex-Handoffs ins Terminal, nicht in die Extension.
- **Leistung messen** (Skript-Vorlage im Session-Scratchpad, Verfahren bewaehrt):
  Playwright + CDP `Emulation.setCPUThrottlingRate {rate: 8}`, Frame-Zeiten per
  `requestAnimationFrame`. Ins Spiel: START (195, 800), dann SPIELEN (195, 797). Dann
  `window.__runGun.scene.getScene('GameScene').debugSetState({ level, teamSize, weapon })`
  (nur im Dev-Build). **Schlimmster Fall nur mit** `s.runStats.set('shotsPerSec', 8)` und
  `s.runStats.set('damage', 1)` — sonst misst man den Alltagsfall (67 statt 107 Geschosse).
  **Browser-Falle:** `playwright-core` unter `/opt/homebrew/lib/node_modules/@playwright/mcp/`
  will Chromium 1224, lokal liegt 1217 → `executablePath` auf die 1217er-Binary setzen. Modul
  ist CommonJS: `import pw from '...'` plus `const { chromium } = pw`.
  Immer Screenshot-Gegenprobe, dass wirklich das Spiel lief und nicht das Menue.

## Einstiegssatz
"Lies `docs/UEBERGABE.md` und arbeite dort weiter."
