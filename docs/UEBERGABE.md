# Uebergabe: Run & Gun

Stand: 2026-08-21 12:20

## Ziel
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat) bis V1 fertigstellen.
Verbindlicher Plan: `docs/plan.md`. E1–E9 sind durch, **E10 ist der letzte Plan-Punkt**;
danach E6 (Abnahme: Icons, README, Netzwerk-Null-Check). Dazu laufend Thomas' Wuensche
aus seinen iPhone-Tests.

## Harte Randbedingungen
- Claude ist Architekt und Reviewer, schreibt **keinen** produktiven Code. Umsetzung immer
  ueber Codex per Terminal-Handoff (Ablauf in `CLAUDE.md`).
- Gamefeel, Optik und Performance gelten erst nach Thomas' iPhone-Test als erfuellt.
- Objekt-Pools: kein `create()`/`destroy()` im Hot Path, jede Poolgroesse mit Herleitung.
- **Nie alle Pools in eine Physik-Gruppe legen** — genau das hat am 2026-08-21 das Ruckeln
  verursacht (60 % der Rechenzeit in Phasers Kollisionspruefung).
- Reissleinen muessen benennen, was **kein** zulaessiger Ersatz ist (`docs/lessons.md`).
- Balance-Modellrechnungen muessen die **echten** Werte aus `balance.ts` ableiten. Zweimal
  ist eine Spec an geschoenten Annahmen gescheitert (Feuerrate 6 bei Menue-Maximum 4,5;
  Truppengroesse 22 fuer alle Kaufstaende).

## Fertig (alles gepusht, Arbeitsbaum sauber)
- E7 Leveltabelle + Gegner-Trupps (`5bfd788`) — 12 gestaltete Level, Schleife ab 13.
- Eigener Startbildschirm vor dem Menue (`346665a`).
- E8 Boss mit Phasen, Begleitern, Zeitdruck (`5b62161`), HP wachsen mit Kaeufen (`240cc87`).
- Aufwertungen deutlich teurer: 200/450/1000/2100/4300 (`e53f7f1`).
- E9 Sperren mit Waffe dahinter (`dca360d`).
- Nach Thomas-Test: Boss-Truppenannahme aus Starttruppe, Begleiter erst ab Level 5,
  Waffentore aus den normalen Toren entfernt (`f548e32`).
- Sperren ab Level 1, drei neue Waffen ab Level 3 — Minigun, Flammenwerfer, Kettenblitz
  (`4f4b288`).
- **Ruckeln behoben** (`64fc795`): Kollisionspruefung nur noch gegen die aktive Waffe.
  Gemessen bei 8x CPU-Drosselung: 267 ms → 16,7 ms pro Bild, Kollisionsanteil 58 % → 3,3 %.

## Offen — naechster Schritt zuerst
1. **Thomas' iPhone-Test** des aktuellen Stands: Ist das Ruckeln weg? Passt Boss Level 1
   jetzt (frischer Stand: 360 HP statt 1421)? Fuehlen sich die drei neuen Waffen
   unterschiedlich an? Fehlen beim Flammenwerfer Flammen (siehe Punkt 3)?
2. **E10 — zwei- bis dreispurige Tore.** Letzter Plan-Punkt, Spezifikation in `docs/plan.md`
   im Abschnitt „Mehrspurige Tore". Kern: Mitte rechnet, Seiten bewaffnen; nie mehr als drei
   Spuren; Zeitfenster bleibt unveraendert. Das Feld `reserved.gateLanes` in der Leveltabelle
   ist vorbereitet und wartet auf Wirkung.
3. **Flammenwerfer-Pool** hat nur 9 % Reserve (72 Plaetze bei 66,2 benoetigten), alle anderen
   Waffen 32–60 %. `docs/plan.md` verlangt Marge. Klein, in E10 mitnehmen.
4. **E6 — V1-Abnahme:** finale Icons, README, Netzwerk-Null-Check im Web Inspector,
   `.map`-Dateien nicht im Deploy.
5. Moegliche Verbesserung: Die zwei Regressionstests aus `64fc795` pruefen den Quelltext per
   `readFileSync` statt Verhalten. Traegt wenig, bricht bei Umformulierung.

## Wichtige Dateien und Befehle
- `docs/plan.md` · `docs/active-task.md` (APPROVED) · `docs/lessons.md`
- Balance zentral in `src/config/balance.ts`; Leveltabelle unter `level.plans`.
- `npm run check` · `npm run build` · `npm run dev` (→ http://localhost:5173/run-gun/)
- Live: https://thmshn75.github.io/run-gun/ · Deploy per GitHub Actions auf Push.
- Testlaeufe und Codex-Handoffs gehoeren ins Terminal, nicht in die Extension.
- **Leistung messen** (hat das Ruckeln gefunden): Playwright + CDP,
  `Emulation.setCPUThrottlingRate {rate: 8}`, dann Frame-Zeiten per `requestAnimationFrame`
  sammeln; Hotspots per `Profiler.start`/`Profiler.stop`. Immer mit Screenshot gegenpruefen,
  dass wirklich das Spiel lief und nicht das Menue.
- Spiel per Playwright pruefen: Screenshots nur nach `<projekt>/.playwright-mcp/`.
  Ins Spiel: START bei (195, 800), dann SPIELEN bei (195, 797).

## Einstiegssatz
"Lies `docs/UEBERGABE.md` und arbeite dort weiter."
