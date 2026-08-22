# Uebergabe: Run & Gun

Stand: 2026-08-22 16:10

## Ziel
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat). **V1 abgenommen und als
Tag `v1.0` gesichert** (Rueckschrittspunkt). Laufend: **V2-Spurenumbau**, Etappenplan in
`docs/plan-v2.md` (W1–W6). Live: https://thmshn75.github.io/run-gun/

## Harte Randbedingungen
- Claude ist normalerweise Architekt/Reviewer; **fuer V2 hat Thomas Direktumsetzung durch
  Claude angeordnet** (statt Codex-Handoff) — gilt weiter, bis er es zurueckdreht.
- Testsuite und laengere Laeufe ins Terminal (`.command`-Skript + `open -a Terminal`),
  nicht in der Extension. Fertiges Skript: `<scratchpad>/run-tests.command`.
- Nie eine Groesse raten, die das Spiel messen kann; Balance-Zahlen aus `balance.ts`
  ableiten und den Rechenweg als Kommentar hinterlegen.
- Objekt-Pools: kein `create()`/`destroy()` im Hot Path, jede Poolgroesse mit Herleitung.
- Gamefeel/Optik gelten erst nach Thomas' iPhone-Test als erfuellt, nie nach Desktop.
- Nach jeder Etappe: `npm run check`, Terminal-Testsuite, Browser-Sichtpruefung,
  commit + push, Pages-Deploy per `gh run watch` verifizieren.

## Fertig
- **W1** Stadtbild: New-York-Bloecke 10–16 Haeuser (`cityPlan.ts`), Gegner erscheinen wie
  die Haeuser voll ueber dem Horizont (`horizonReveal.ts`), Minigun-Tracer gelb.
- **W2/W4** Waende: Abschnitte mit versetzten Luecken (`wallPattern.ts`, run 3 / gap 2),
  Kacheln quer (72 hoch, widthShare 0.7, orange, runde Ecken, halbtransparent),
  Ueberhang nach aussen, Inhalt ab Spawn sichtbar; Goodies unregelmaessig mit
  maxDry-Garantie (`reinforcementPlan.ts`) — links Verstaerkung (Operator-Anzeige,
  Sofortwirkung), rechts Waffen, Rest Muenzen; dynamischer Fahrbereich
  (`crowd.getAnchorRange` + `blockers.getWallPresence`), kein Wandkontakt-Schaden;
  Mittel-Tore nur noch DMG/RATE/SPD, dauerhaft zweispurig.
- **W3** Horden mittig: Spawn-Baender (`enemy.spawnBands`), Dichteregel
  (`computeHordeOffsets` — stauchen statt verkleinern), Horden ab Level 1.
- **W4-Nachbesserung „Waende treffen"** (2026-08-22, nach Thomas' Urteil „voll schwer
  ueberhaupt Waende wegzubekommen"): Ursache war Unerreichbarkeit, nicht Haerte. Kugeln
  fliegen jetzt spurtreu statt senkrecht (`BALANCE.projectile.laneFollow`, `weapons.ts`,
  `roadGeometry.getLaneRatio`), und der Fahrbereich reicht bis an die Wand
  (`getDriveLimitHalfWidth`, `BALANCE.walls.driveIntoWallFigures`). Beide Aenderungen
  sind noetig — die erste allein traf gemessen gar nichts mehr. 103 Tests gruen,
  Browser-Lauf belegt fallende Segmente.
- **W4-Nachbesserung „Tempo"** (2026-08-22, Thomas: „die Waende sind zu schnell"):
  `scrollSpeed` 180 -> 135. Mitgezogen, damit sich nur das Tempo aendert:
  `scenery.spawnIntervalMs` 400 -> 533, Goodie-Werte x1,333, `pools.coins` 48 -> 64.
  **Offen gelassen (Thomas' Wahl):** Waende fahren linear, Kulisse perspektivisch — am
  Horizont ist die Wand 5,1x schneller als die Haeuser. Wer das beheben will, koppelt
  die Wandbewegung in `blockers.ts` an `getScrollY` und macht die Segmenthoehe
  perspektivisch (sonst reisst die Kette).
- **Wandhaerte neu hergeleitet** (2026-08-22, Thomas: "immer noch schwer was zu holen,
  speziell in weiteren Level, die Zahlen steigen zu schnell an"): Das alte Modell
  koppelte die Wand-HP 1:1 an die Feuerkraft — Fokusdauer konstant 0,70 s, Aufruesten
  folgenlos, Zahl an der Waffe haengend (4 bis 71 bei Truppe 8, 1482 im Vollausbau).
  Neu in `blockerPlan.ts`: Zielhaerte aus Levelnummer + gedaempfter Truppengroesse,
  Waffe geht nicht mehr ein, harter Fokus-Deckel `blockers.maxFocusSec` 0,6 s.
  Verlauf jetzt 3 HP / 0,50 s bis 254 HP / 0,12 s.
- **Lebendigkeit ohne Ton** (2026-08-22, Thomas: "nicht so wie in den App Store"):
  Laufwippen fuer Truppe und Gegner, Neigung beim Lenken, Quittungen beim Einsammeln,
  Kamerawackeln. Rechnung phaserfrei in `src/systems/gamefeel.ts`, Zahlen-Popups in
  `src/systems/popups.ts`. **Ton fehlt weiterhin komplett** — bewusst, Thomas' Wahl war
  "Lebendigkeit zuerst". Ton waere der naechste grosse Hebel: synthetisch per Web Audio,
  ohne Dateien und ohne Kosten, mit Freischaltung beim ersten Tippen (iOS).
- Arbeitsverzeichnis sauber, `docs/active-task.md` auf IDLE.

## Offen — naechster Schritt zuerst
1. **Thomas' iPhone-Urteil** zu Treffern, Tempo, Wandhaerte und Lebendigkeit.
   Korrekturen haben Vorrang vor W5. Tuning-Regler ohne Umbau:
   `BALANCE.projectile.laneFollow` (1 = spurtreu, 0 = alt),
   `BALANCE.walls.driveIntoWallFigures` (wie nah an die Wand),
   `BALANCE.blockers.maxFocusSec` / `minFocusSec` / `perLevelGrowth` (Wandhaerte),
   `BALANCE.gamefeel.*` (Wippen, Neigung, Popups, Kamerawackeln), `scrollSpeed` (Tempo).
2. **Ton** — der groesste noch offene Gamefeel-Hebel, von Thomas zurueckgestellt.
3. **W5 — Boss** (`plan-v2.md`, Abschnitt „Boss V2"): Boss **schiesst nicht mehr**
   (Salvensystem `bossBurst.ts` entfaellt), Druck aus gerufenen Horden + Vorruecken;
   Lebenspunkte beim Kampfstart aus der **tatsaechlichen Feuerkraft der Truppe**
   berechnen (Ziel 20–40 s auf jedem Level, je einmal mit schwachem und starkem Run
   messen), Levelnummer skaliert nur noch den Hordendruck.
4. **W6 — Abnahme**: toten Code entfernen (`blockers.ts` → `Walls` umbenennen,
   `bossBurst.ts`, alte Tor-Reste), Volllast-Messung aller Systeme gleichzeitig,
   Netzwerk-Null-Check, README.

## Wichtige Dateien und Befehle
- Plan: `docs/plan-v2.md` · Task: `docs/active-task.md` · Lessons: `docs/lessons.md`
- Balance: `src/config/balance.ts` (alle Tuning-Werte + Herleitungen als Kommentar)
- Waende: `blockers.ts`, `wallPattern.ts`, `reinforcementPlan.ts`, `roadGeometry.ts`
- Gegner: `spawner.ts`, `squads.ts`, `spawnLanes.ts`, `horizonReveal.ts`
- Boss (W5): `boss.ts`, `bossPlan.ts`, `bossBurst.ts`
- `npm run check` · `npm run dev` · Tests via Terminal-Skript · `npm run test:dist`
- Deploy: GitHub Actions bei Push; verifizieren mit
  `gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`

## Einstiegssatz
"Lies `docs/UEBERGABE.md` und arbeite dort weiter. Naechster Schritt: auf Thomas'
iPhone-Urteil zu W1–W4 reagieren, danach W5 (Boss) direkt umsetzen."
