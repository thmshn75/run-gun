# Uebergabe: Run & Gun

Stand: 2026-08-21 13:35

## Ziel
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat) bis V1 fertigstellen.
Verbindlicher Plan: `docs/plan.md`. **E1–E10 sind durch — alle Feature-Etappen des Plans sind
erledigt.** Es fehlt nur noch E6 (V1-Abnahme) plus laufend Thomas' Wuensche aus seinen
iPhone-Tests.

## Harte Randbedingungen
- Claude ist Architekt und Reviewer, schreibt **keinen** produktiven Code. Umsetzung immer
  ueber Codex per Terminal-Handoff (Ablauf in `CLAUDE.md`).
- Gamefeel, Optik und Performance gelten erst nach Thomas' iPhone-Test als erfuellt.
- Objekt-Pools: kein `create()`/`destroy()` im Hot Path, jede Poolgroesse mit Herleitung.
- **Nie alle Pools in eine Physik-Gruppe legen** — das hat am 2026-08-21 das Ruckeln verursacht.
- Reissleinen muessen benennen, was **kein** zulaessiger Ersatz ist (`docs/lessons.md`).
- Balance-Modellrechnungen muessen die **echten** Werte aus `balance.ts` ableiten — **auch die
  Zahlen in Entscheidungsvorlagen fuer Thomas.** Das ist am 2026-08-21 schiefgegangen (siehe
  `docs/lessons.md`), zusaetzlich zu den zwei frueheren Spec-Faellen.

## Fertig (alles gepusht, Arbeitsbaum sauber)
- E7 Leveltabelle + Gegner-Trupps, eigener Startbildschirm, E8 Boss mit Phasen, E9 Sperren.
- Sperren ab Level 1, drei neue Waffen ab Level 3 (Minigun, Flammenwerfer, Kettenblitz).
- Ruckeln behoben (`64fc795`): Kollisionspruefung nur gegen die aktive Waffe.
  267 ms → 16,7 ms pro Bild bei 8x CPU-Drosselung. **Von Thomas am iPhone bestaetigt.**
- **E10 mehrspurige Tore** (`c8e5607`): Ab Level 3 traegt jedes dritte Tor eine dritte Spur mit
  einem Waffenangebot; die zwei Rechen-Spuren bleiben unveraendert nebeneinander stehen. Level 1
  und 2 bleiben zweispurig. Drei Spuren sind 108 px breit an der Entscheidungsstelle (Grenze
  laut Plan: 90 px); vier Spuren waeren 79 px und sind deshalb per Typ ausgeschlossen.
  Nebenbei: Pools fuer Flammenwerfer (72→88) und Schrotflinte (128→144) auf Plan-Marge gebracht.
- **Boss-HP an der tatsaechlichen Truppe** (`b36fdb0`): Bisher wurde die Truppenstaerke aus dem
  **Kaufstand** geraten — bei frischem Spielstand 6 Figuren angenommen, tatsaechlich kommen 12
  bis 30 an. Folge: Der Boss platzte in 3,8 bis 9,6 s. Jetzt zaehlt die echte Truppe beim
  Bossstart, gedaempft mit `teamDampening 0.41`. Ergebnis fuer **jeden** Kaufstand und jedes
  Level: 40,0 s bei Truppe 2 bis 20,0 s bei Truppe 30, durchgehend im Zielfenster 20–40 s.
  Sperren ziehen mit, aber ungedaempft — konstant 2,0 s.

## Offen — naechster Schritt zuerst
1. **Thomas' iPhone-Test des aktuellen Stands.** Deploy ist durch (GitHub Actions, `b36fdb0`,
   erfolgreich). Zwei Fragen:
   - **Tore:** Ab Level 3 taucht gelegentlich ein drittes Tor mit einer Waffe auf. Sind drei
     Spuren in der Zeit zuverlaessig treffbar? Kommen die Waffenangebote zu oft oder zu selten?
   - **Boss:** Fordernd, aber nicht unfair? Auf Level 1, 6 und 12 pruefen.
2. **E6 — V1-Abnahme.** Der letzte offene Punkt vor „fertig": finale Icons, README
   (Start/Build/Deploy), Netzwerk-Null-Check im Safari Web Inspector ueber USB, `.map`-Dateien
   nicht im Deploy, Update-Pfad nach Force-Quit sichtbar.
3. Moegliche Verbesserung: Die zwei Regressionstests aus `64fc795` pruefen den Quelltext per
   `readFileSync` statt Verhalten. Traegt wenig, bricht bei Umformulierung. (Die
   E10-Darstellungstests wurden aus demselben Grund bereits auf Verhalten umgestellt.)

## Stellschrauben, falls der iPhone-Test etwas beanstandet
Alle in `src/config/balance.ts`, alle mit Herleitung im Kommentar:
- **Waffenangebote zu haeufig:** `gates.weaponLaneEvery` 3 → 4 → 5. **Nicht** an der
  Sperren-Kadenz drehen.
- **Drei Spuren nicht treffbar:** alle Level auf `reserved.gateLanes: 2` zurueck. Das
  Zeitfenster wird dafuer **nicht** verlaengert — das entwertet die Tor-Mathematik.
- **Boss immer noch falsch:** **Nicht** an `teamDampening` weiterdrehen. Das war der dritte und
  letzte Balance-Anlauf; danach liegt es am Kampfverhalten (Phasen, Vorruecken, Begleiter), nicht
  an den Zahlen. Reissleine steht in `docs/plan.md` und in der Spec.

## Wichtige Dateien und Befehle
- `docs/plan.md` · `docs/active-task.md` (APPROVED) · `docs/lessons.md`
- Balance zentral in `src/config/balance.ts`; Leveltabelle unter `level.plans`.
- Torspuren: `src/systems/gateLanes.ts` (reine Funktionen, ohne Phaser testbar),
  Darstellung in `src/systems/gates.ts`.
- Boss- und Sperren-Rechnung: `src/systems/bossPlan.ts` (`getTeamFirepower` ist die eine
  gemeinsame Feuerkraft-Formel) und `src/systems/blockerPlan.ts`.
- `npm run check` · `npm run build` · `npm test` (57 Tests) · `npm run dev`
- Live: https://thmshn75.github.io/run-gun/ · Deploy per GitHub Actions auf Push.
- Testlaeufe und Codex-Handoffs gehoeren ins Terminal, nicht in die Extension.
- **Leistung messen:** Playwright + CDP, `Emulation.setCPUThrottlingRate {rate: 8}`, dann
  Frame-Zeiten per `requestAnimationFrame`; Hotspots per `Profiler.start`/`Profiler.stop`.
  Immer mit Screenshot gegenpruefen, dass wirklich das Spiel lief und nicht das Menue.
  Im Dev-Server nach dem Start des Spiels in der Browser-Konsole setzen:
  `window.__runGun.scene.getScene('GameScene').debugSetState({ level: 8, teamSize: 88, weapon: 'flamethrower' })`.
  `level`, `teamSize` und `weapon` sind einzeln optional; der Zugang existiert nicht im Produktions-Build.
  **Fuer den schlimmsten Fall reicht `debugSetState` nicht** — es setzt keine Stats. Zusaetzlich
  `s.runStats.set('shotsPerSec', 8)` (Feuerrate ans Cap) und `s.runStats.set('damage', 1)`
  (Gegner ueberleben und stauen sich). Ohne das misst man nur den Alltagsfall: am 2026-08-21
  ergab die Messung ohne diesen Schritt 67 statt 107 gleichzeitiger Flammen-Geschosse.
  **Browser-Falle:** `playwright-core` aus `/opt/homebrew/lib/node_modules/@playwright/mcp/`
  verlangt Chromium 1224, lokal liegt 1217. Deshalb beim Start `executablePath` auf
  `~/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell`
  setzen, statt `npx playwright install` laufen zu lassen. Das Modul ist CommonJS —
  `import pw from '...'` plus `const { chromium } = pw`, nicht `import { chromium }`.
- Spiel per Playwright pruefen: Screenshots nur nach `<projekt>/.playwright-mcp/`.
  Ins Spiel: START bei (195, 800), dann SPIELEN bei (195, 797).

## Einstiegssatz
"Lies `docs/UEBERGABE.md` und arbeite dort weiter."
