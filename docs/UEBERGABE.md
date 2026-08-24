# Uebergabe: Run & Gun

Stand: 2026-08-24 (V4-E1 gebaut und gemessen, wartet auf iPhone-Test)

## Ziel
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat), gespielt von Benni (7).
Live: https://thmshn75.github.io/run-gun/ · **V4 = Endlos-Modus**, Plan `docs/plan-v4.md`.

## Harte Randbedingungen
- Claude setzt direkt um (kein Codex-Handoff) — **ausser Bildern**, die erzeugt Codex.
- Testsuite, Builds und Codex-Laeufe ins Terminal (`.command` + `open -a Terminal`).
- **Nie eine Groesse raten, die das Spiel messen kann.** Rechenweg als Kommentar in
  `balance.ts`. Messsonden danach loeschen.
- **Bei Leistungsfragen zuerst profilieren, dann Hypothesen bilden.**
- Browser-Pruefung: echte Spielschleife laufen lassen und per `setInterval` eingreifen —
  kuenstliches Takten mit `game.step()` verfaelscht die Physik. Zugriff `window.__runGun`.
- Gamefeel gilt erst nach Thomas'/Bennis iPhone-Test als erfuellt.
- Nach jeder Etappe: `npm run check`, Terminal-Testsuite, Browser-Pruefung, commit + push,
  Deploy per `gh run watch` verifizieren.

## Fertig
- **V1 (`v1.0`), V2 (`v2.0`), V3 (`v3.0`)** — alle abgenommen, alle drei Tags sind
  Rueckschrittspunkte. Letzter Commit `6bd5994`, Arbeitsverzeichnis sauber, alles gepusht.
- V3 brachte: Sammelbahn-Fix, Startruckeln behoben (Kollisions-Suchbaum fraß 48 % der
  Rechenzeit), Shop nach jedem Level, Weiterspielen + Fortsetzen, Zombie-Farbvarianten,
  Granatwerfer, Waffenstaffelung, Musik statt Geballer, scharfe Schrift.
- **V4-E1 Endlos-Skalierung** — gebaut, gemessen, committet; iPhone-Test steht aus.
  Der Modulo-Ruecksprung ist weg (Level 13 war siebenmal leichter als Level 12),
  Spielstand-Migration mit Marker, Bestenliste bei „SPEICHERN & BEENDEN".

## Offen — naechster Schritt zuerst
1. **Bennis iPhone-Test von E1.** Die Endlos-Skalierung ist gebaut und im Browser
   gemessen (Korridor haelt auf Level 12/16/20/25/30), aber Gamefeel gilt erst nach
   seinem Test. **Konkrete Frage an ihn: Wird es ab Level 13 spuerbar schwerer?**
2. **Thomas' Urteil zur Steigung** (er wollte nach E1 entscheiden). Der Korridor 4–12 %
   laesst nur eine flache Steigerung zu — Details in `docs/active-task.md`, Abschnitt
   „Offen fuer Thomas' Urteil". Will Benni mehr Widerstand, muss der Korridor angehoben
   werden.
3. Danach E2 Preise + Shop-Rhythmus · E3 Granatwerfer · E4 Meta-Ausbau ·
   E5/E6/E7 Gegner-Gestalten, vier neue Waffen, Elite-Boss (gemeinsamer Codex-
   Bildauftrag frueh rausschicken).

## Wissen, das sonst Zyklen kostet
- **Der Durchkommensanteil ist bistabil UND seine Empfindlichkeit waechst mit.**
  Faktor 2,4 zwischen Level 12 und 16, Faktor 8,7 zwischen 16 und 20. Der Kipppunkt
  liegt bei rund 10–12 %; darueber misst man die Spawn-Sperre statt der Schwierigkeit
  (Level 25 mass dort *weniger* als Level 20). Nie aus einem Modell extrapolieren.
- **Die Messstreuung derselben Groesse betraegt rund 2 Prozentpunkte.** Level 12 mass in
  zwei Zyklen 5,7 % und 7,5 %, obwohl es unveraendert ist. Feinabstimmung unterhalb
  dieser Schwelle ist nicht belegbar.
- **Feuerkraft ist ein Produkt** aus Schuetzenzahl x Truppenbonus x Schaden x Rate. Im
  Endlosbereich traegt nur `stats.endless.damageGrowthPerLevel` den Zuwachs; `shotsPerSec`
  und `crowd.damageMultiplierCap*` stehen bewusst still, und ein Test haelt das fest.
- **`getEnemyHp` rundet auf ganze Punkte.** Der leichte Gegner (2 Punkte) waechst mit
  0,3 %/Level bis Level 87 nicht. Kleine Wachstumsfaktoren wirken bei kleinen
  Grundwerten gar nicht.
- **`companionLimit` ist toter Code** — sieht aus wie ein Hebel, wird im Spiel nirgends
  gelesen. Begleiterdruck laeuft ueber `boss.hordePressure`.
- **Messvorschrift dafuer:** frische Szene, 8 s einschwingen, 30 s zaehlen, drei
  Wiederholungen, Median. Sonde: `scratchpad/messung.mjs` (Playwright, zaehlt in
  `activateEnemy` und `meldeDurchbruch`). Wurde schon zweimal falsch gemessen.
- **Boss-Kampfdauer streut um Faktor 3,7** bei identischem Aufbau — nie einzeln messen.
- **Neue Spielstand-Felder: fehlend = 0, nie Fehler.** Sonst verliert ein bespieltes
  Geraet seine Bestenliste (die Falle ist in `save.ts` zweimal kommentiert).
- **GameObject-Position der Truppenhuelle klebt bei −15** — ungeklaert, wird umgangen.

## Wichtige Dateien und Befehle
- Plan `docs/plan-v4.md` (enthaelt die Befunde beider Gegenpruefungen) ·
  Endlos-Regler: `BALANCE.level.endless`, `enemy.endlessHpGrowthPerLevel`,
  `stats.endless` — jeder mit Rechenweg und Messbeleg im Kommentar ·
  Task `docs/active-task.md` · **Lessons `docs/lessons.md`** (zu Sitzungsbeginn lesen)
- Balance `src/config/balance.ts` · Levelkurve `src/systems/levelPlan.ts` ·
  Deckel `src/systems/upgrades.ts` · Boss `src/systems/bossPlan.ts`
- `npm run check` · `npm run dev` · Tests via Terminal-Skript · `npm run test:dist`
- Deploy: `gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`

## Einstiegssatz
"Lies `docs/UEBERGABE.md`, `docs/lessons.md` und `docs/plan-v4.md` und arbeite dort weiter.
**Nichts neu aufsetzen** — V1/V2/V3 sind abgenommen und getaggt, E1 ist gebaut und
gemessen. Naechster Schritt: Bennis iPhone-Test von E1, danach E2 (Preise)."
