# Uebergabe: Run & Gun

Stand: 2026-08-24 (V3 abgeschlossen, V4 beginnt)

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

## Offen — naechster Schritt zuerst
1. **E1 Endlos-Skalierung** (`docs/plan-v4.md`). Kern: `designLevel` springt ab Level 13
   auf Level 1 zurueck — das ist die Ursache fuer „zu leicht". Dazu Spielstand-Rueckstufung
   fuer offene Runs ueber Level 12, Bestenliste einmalig leeren (mit Marker!), Pools neu
   herleiten. **Ohne E1 ist keine andere Etappe sinnvoll.**
2. E2 Preise + Shop-Rhythmus · 3. E3 Granatwerfer · 4. E4 Meta-Ausbau ·
   5. E5/E6/E7 Gegner-Gestalten, vier neue Waffen, Elite-Boss (gemeinsamer Codex-
   Bildauftrag frueh rausschicken, am besten schon waehrend E1).
3. Thomas will nach E1 und nach E3 sein Urteil abgeben, bevor es weitergeht.

## Wissen, das sonst Zyklen kostet
- **`companionLimit` ist toter Code** — sieht aus wie ein Hebel, wird im Spiel nirgends
  gelesen. Begleiterdruck laeuft ueber `boss.hordePressure`.
- **Durchkommensanteil ist bistabil.** Frische Szene, 8 s einschwingen, 30 s zaehlen,
  drei Wiederholungen, Median. Wurde schon zweimal falsch gemessen.
- **Boss-Kampfdauer streut um Faktor 3,7** bei identischem Aufbau — nie einzeln messen.
- **Feuerkraft ist ein Produkt** aus Schaden und Rate; ein Bonus auf beide wirkt
  quadratisch (im V3-Plan schon einmal falsch gerechnet: geplant +38 %, real +92 %).
- **Neue Spielstand-Felder: fehlend = 0, nie Fehler.** Sonst verliert ein bespieltes
  Geraet seine Bestenliste (die Falle ist in `save.ts` zweimal kommentiert).
- **GameObject-Position der Truppenhuelle klebt bei −15** — ungeklaert, wird umgangen.

## Wichtige Dateien und Befehle
- Plan `docs/plan-v4.md` (enthaelt die Befunde beider Gegenpruefungen) ·
  Task `docs/active-task.md` · **Lessons `docs/lessons.md`** (zu Sitzungsbeginn lesen)
- Balance `src/config/balance.ts` · Levelkurve `src/systems/levelPlan.ts` ·
  Deckel `src/systems/upgrades.ts` · Boss `src/systems/bossPlan.ts`
- `npm run check` · `npm run dev` · Tests via Terminal-Skript · `npm run test:dist`
- Deploy: `gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`

## Einstiegssatz
"Lies `docs/UEBERGABE.md`, `docs/lessons.md` und `docs/plan-v4.md` und arbeite dort weiter.
**Nichts neu aufsetzen** — V1/V2/V3 sind abgenommen und getaggt. Naechster Schritt: E1
(Endlos-Skalierung), die Ursache fuer Bennis „zu leicht"."
