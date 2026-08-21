# Uebergabe: Run & Gun

Stand: 2026-08-21 17:45

## Ziel und Stand
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat). **Alle Etappen E1–E10 plus
maschinenseitiges E6 sind fertig, committet, gepusht, Deploy gruen.** Offen ist nur Thomas'
iPhone-Abnahme; danach ist V1 fertig. Plan: `docs/plan.md`.

## Naechster Schritt: Thomas' iPhone-Abnahme (E6)
Live-Stand: https://thmshn75.github.io/run-gun/
1. Boss Level 1: Einzelschuss statt Salve, Kampf ~18 s — jetzt schaffbar?
2. Haeuserschlucht: Tuerme dicht an der Strasse, 82 % Stadtanteil — richtig so?
3. Offline: nach Installation Flugmodus an, mehrere Runs — laeuft alles? (Der Offline-Cache
   war bis heute still kaputt: Sprites fehlten im Precache; gefixt, per Test abgesichert.)
4. Netzwerk-Null-Check + Update nach Force-Quit: Anleitung im README, Abschnitt
   „Abnahme-Checks (E6)".
Wenn alles passt: V1 ist abgenommen, keine weiteren Aenderungen.

## V2 (vorgemerkt, von Thomas gewuenscht, Start auf Zuruf)
**Spuren-Umbau nach Genre-Vorbild** (Count Masters, Mob Control, Z Escape):
mitlaufende zerschiessbare Waende links und rechts (Belohnung beim Wegschiessen),
Waffen auf einer Seite, Upgrades auf der anderen, Gegner-Horden in der Mitte.
Ersetzt das E10-Spurensystem und baut Tore, Blocker und Spawner um — als Etappenplan
aufsetzen, nicht als ein Task. Kern-Mehrwert: permanenter Zielkonflikt (zur Wand steuern
= nicht auf die Horde schiessen).

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
"Lies `docs/UEBERGABE.md` und arbeite dort weiter." — Fuer V2: "Lies `docs/UEBERGABE.md`
und plane den V2-Spuren-Umbau als Etappen."
