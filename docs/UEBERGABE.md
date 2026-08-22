# Uebergabe: Run & Gun

Stand: 2026-08-22 16:30

## Ziel
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat). **V1 abgenommen, Tag
`v1.0`** als Rueckschrittspunkt. Laufend: **V2-Spurenumbau**, Etappenplan `docs/plan-v2.md`
(W1–W6). Live: https://thmshn75.github.io/run-gun/

## Harte Randbedingungen
- Claude ist normalerweise Architekt/Reviewer; **fuer V2 hat Thomas Direktumsetzung durch
  Claude angeordnet** (kein Codex-Handoff) — gilt, bis er es zurueckdreht.
- Testsuite und laengere Laeufe ins Terminal (`.command` + `open -a Terminal`), nie in der
  Extension.
- **Nie eine Groesse raten, die das Spiel messen kann.** Balance-Zahlen aus `balance.ts`
  ableiten, Rechenweg als Kommentar dazu. Messsonden als temporaere `tests/_*.test.ts`
  schreiben, per Terminal laufen lassen, danach loeschen.
- Objekt-Pools: kein `create()`/`destroy()` im Hot Path, jede Poolgroesse mit Herleitung.
- Gamefeel/Optik gelten **erst nach Thomas' iPhone-Test** als erfuellt, nie nach Desktop.
- Browser-Pruefung per Playwright: Der Hintergrund-Tab wird gedrosselt, die Spiel-Loop
  steht dann faktisch still. Systeme deshalb **manuell takten** (`crowd.update(16.67)` in
  einer Schleife) statt auf die Loop zu warten. Zugriff ueber `window.__runGun` (nur DEV).
- Nach jeder Etappe: `npm run check`, Terminal-Testsuite, Browser-Pruefung, commit + push,
  Deploy per `gh run watch` verifizieren.

## Fertig
- **W1** Stadtbild (NY-Bloecke, Gegner erscheinen wie Haeuser am Horizont), **W2/W4**
  Dauerwaende mit versetzten Luecken und Goodies, **W3** Horden mittig mit Dichteregel.
- **W4-Nachbesserungen 2026-08-22** (vier Runden auf Thomas' iPhone-Urteile):
  - Waende treffbar: Kugeln spurtreu statt senkrecht (`projectile.laneFollow`), Fahrbereich
    bis an die Wand (`walls.driveIntoWallFigures`). Beides noetig — je allein wirkungslos.
  - Tempo −25 %: `scrollSpeed` 180 → 135, mit Haeuser-Takt, Goodie-Chancen und Muenz-Pool
    nachgezogen, damit sich nur das Tempo aendert.
  - Wandhaerte neu: Zielhaerte aus **Levelnummer** + gedaempfter Truppengroesse, Waffe geht
    nicht mehr ein, harter Deckel `blockers.maxFocusSec` 0,6 s. Vorher wuchs die Wand 1:1
    mit der Feuerkraft (Aufruesten folgenlos, 4→71 HP beim Waffenwechsel, 1482 im Vollausbau).
  - Lebendigkeit ohne Ton: Laufwippen, Neigung beim Lenken, Quittungen beim Einsammeln,
    Kamerawackeln (`gamefeel.ts`, `popups.ts`).
- Letzter Commit `439bfe0`, alles gepusht, Deploy gruen, Arbeitsverzeichnis sauber,
  119 Tests gruen, `docs/active-task.md` auf IDLE. Nichts laeuft im Hintergrund.

## Offen — naechster Schritt zuerst
1. **Thomas' iPhone-Urteil abwarten** zu Treffern, Tempo, Wandhaerte und Lebendigkeit.
   Korrekturen haben Vorrang. Tuning ohne Umbau ueber `balance.ts`:
   `projectile.laneFollow`, `walls.driveIntoWallFigures`, `blockers.maxFocusSec` /
   `minFocusSec` / `perLevelGrowth`, `gamefeel.*`, `scrollSpeed`.
2. **Ton** — groesster offener Gamefeel-Hebel und Claudes Empfehlung vor W5. Es gibt
   **keinerlei** Audio im Projekt. Plan: synthetisch per Web Audio (keine Dateien, keine
   Kosten), Freischaltung beim ersten Tippen (iOS verlangt Nutzergeste). Thomas hatte Ton
   bewusst zurueckgestellt — vor dem Bau kurz bestaetigen lassen.
3. **W5 — Boss** (`plan-v2.md`, „Boss V2"): Boss **schiesst nicht mehr** (`bossBurst.ts`
   entfaellt), Druck aus gerufenen Horden + Vorruecken; Lebenspunkte beim Kampfstart aus der
   tatsaechlichen Feuerkraft (Ziel 20–40 s je Level, mit schwachem und starkem Run messen).
   **Achtung:** Dieselbe Selbstkopplungs-Falle wie bei den Waenden — HP rein aus der
   Spielerstaerke abzuleiten macht jedes Aufruesten wirkungslos (siehe `lessons.md`).
4. **W6 — Abnahme**: toten Code raus (`blockers.ts` → `Walls` umbenennen, `bossBurst.ts`),
   Volllast-Messung, Netzwerk-Null-Check, README.

## Offene Nebenbefunde (nicht behoben, bewusst)
- **Waende fahren linear, Kulisse perspektivisch**: Am Horizont ist die Wand 5,1x schneller
  als die Haeuser. Thomas hat die Perspektiv-Kopplung als Option gesehen und abgewaehlt.
  Fix waere: Wandbewegung in `blockers.ts` an `getScrollY` koppeln **und** Segmenthoehe
  perspektivisch machen, sonst reisst die Dauerwand-Kette.
- **Minigun und Rakete feuern nur mit 3 Figuren** (`shootersPerSalvo`) und sind dadurch
  nominell ~4x schwaecher als die Standardwaffe. Der Fokus-Deckel faengt das bei Waenden ab,
  die Waffenbalance selbst ist offen.

## Wichtige Dateien und Befehle
- Plan `docs/plan-v2.md` · Task `docs/active-task.md` · **Lessons `docs/lessons.md`** (zu
  Sitzungsbeginn lesen, enthaelt die teuer bezahlten Regeln)
- Balance: `src/config/balance.ts` (alle Tuning-Werte mit Herleitung als Kommentar)
- Waende: `blockers.ts`, `blockerPlan.ts`, `wallPattern.ts`, `reinforcementPlan.ts`
- Geometrie: `roadGeometry.ts` (`getLaneRatio`, `getDriveLimitHalfWidth`)
- Gamefeel: `gamefeel.ts`, `popups.ts` · Gegner: `spawner.ts`, `squads.ts`
- Boss (W5): `boss.ts`, `bossPlan.ts`, `bossBurst.ts`
- `npm run check` · `npm run dev` · Tests via Terminal-Skript · `npm run test:dist`
- Deploy verifizieren:
  `gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`

## Einstiegssatz
"Lies `docs/UEBERGABE.md` und `docs/lessons.md` und arbeite dort weiter. Naechster Schritt:
auf Thomas' iPhone-Urteil reagieren; wenn er nichts beanstandet, Ton bauen (vorher kurz
bestaetigen lassen)."
