# Uebergabe: Run & Gun

Stand: 2026-08-22

## Ziel und Stand
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat). **V1 ist am 2026-08-22
von Thomas am iPhone abgenommen** (Spiel, Update-Pfad, Offline bestaetigt) und als
Git-Tag **`v1.0`** gesichert — das ist der Rueckschrittspunkt. V1-Plan: `docs/plan.md`.
**V2 ist geplant und gehaertet:** `docs/plan-v2.md` (Etappen W1–W6, zwei
Gegenpruefungs-Runden gelaufen, Befunde eingearbeitet).

## Naechster Schritt: V2 starten
Live-Stand: https://thmshn75.github.io/run-gun/
1. **W1 (Stadtbild) als Spec aufsetzen** (`docs/active-task.md`, dann Codex im Terminal):
   Haeuserzeilen durchgehend, Luecken nur als Querstrassen, Kulissen-Spawn-Vorlauf
   groesser als der Gegner-Spawn-Vorlauf.
2. **Vor W5 braucht es Thomas' Entscheidung:** Schiesst der Boss in V2 noch?
   Empfehlung im Plan: nein (Druck stattdessen aus gerufenen Horden + Vorruecken).
   Bis dahin wird W5 nicht spezifiziert.

## V2-Kern (Thomas-Entscheidungen 2026-08-21/22, Details in plan-v2.md)
Spuren-Umbau nach Genre-Vorbild (Count Masters, Mob Control, Z Escape): zerschiessbare
Waende links/rechts, Waffen eine Seite, Upgrades andere Seite, Horden mittig; Bosse
waren in V1 noch etwas zu schwer; Haeuserschlucht wird durchgehende Stadt mit
Querstrassen; Haeuser erscheinen oben frueher als Gegner. Kern-Mehrwert: permanenter
Zielkonflikt (zur Wand steuern = nicht auf die Horde schiessen). Wichtigste
Haertungs-Befunde stehen **in** den Etappen-Zeilen von plan-v2.md (Breitenbudget ab W2,
Horden-Zentrierung gemessen, Wert-vor-Schuss aktuell gehalten, Volllast-Messung in W6).

## Harte Randbedingungen (unveraendert)
- Claude ist Architekt/Reviewer, schreibt keinen produktiven Code; Umsetzung via Codex im
  Terminal (Ablauf in `CLAUDE.md`). Testlaeufe ebenfalls ins Terminal.
- Nie eine Groesse raten, die das Spiel messen kann; Balance-Zahlen aus `balance.ts` ableiten.
- Objekt-Pools: kein create()/destroy() im Hot Path, jede Poolgroesse mit Herleitung.
- Reissleinen benennen, was KEIN zulaessiger Ersatz ist.
- Gamefeel/Optik/Performance gelten erst nach Thomas' iPhone-Test als erfuellt.

## Heute gelernt (2026-08-21, Nachmittag)
- **Boss-Balance ist dreistufig geloest:** Kampfdauer nach Level gestaffelt
  (`getMaxFightSec`: 18 s + 2 s/Level, Deckel 40 s), Phase-2-Salve nach Level gestaffelt
  (`getPhaseTwoProfile`: Breite 60 + 9 px/Level, Deckel 150; Anzahl 3→5) und Salvengroesse
  = Levelnummer auf L1–L3 (beide Phasen). Ausweich-Geometrie ist per Test gesichert
  (Fenster >= 20 px fuer L1–3, echte Figurbreite aus player.png gelesen).
- **Ein Einzelschuss war eine NaN-Falle:** `spread / (count - 1)` bei count 1 →
  `getBurstOffsets` in `src/systems/bossBurst.ts` behandelt das, mit Test.
- **Kulisse:** bewegt sich jetzt auf derselben Kurve wie die Strasse (`getScrollY` in
  `roadGeometry.ts`); Haeuserschlucht (3 Tuerme, Gewicht 6:1, marginPx 4, spreadPx 6,
  Takt 400 ms, Pool 30 gemessen). Cottage geloescht.
- **Codex stoppt bei widerspruechlicher Spec korrekt** statt zu raten (L3-Fenster 19 px vs.
  geforderte 20) — Spec-Zahlen fuer JEDEN betroffenen Level durchrechnen, nicht nur L1.
- **Offline-Regression der Klasse „Test veraltet still":** Der E1-Offline-Beleg galt vor den
  PNG-Sprites; seitdem fehlten alle Sprites im Precache. Fix: `globPatterns` in
  `vite.config.ts`, Nachweis-Test `tests/precache.test.ts` (`npm run test:dist`).

## Wichtige Dateien und Befehle
- `docs/plan.md` · `docs/active-task.md` (IDLE) · `docs/lessons.md`
- Balance: `src/config/balance.ts` · Boss: `src/systems/bossPlan.ts`, `bossBurst.ts`
- Kulisse: `scenery.ts`, `sceneryKinds.ts`, `sceneryLayout.ts`, `scenerySimulation.ts`
- `npm run check` · `npm run build` · `npm test` (72 Tests) · `npm run test:dist` · `npm run dev`
- Deploy: GitHub Actions auf Push. Leistungsmessung: Verfahren siehe Git-Historie dieser
  Datei (Playwright + CDP, Stand cb7bc02).

## Einstiegssatz
"Lies `docs/UEBERGABE.md` und arbeite dort weiter." — Fuer V2-Start: "Lies
`docs/UEBERGABE.md` und `docs/plan-v2.md`, setze W1 als Spec auf."
