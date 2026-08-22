# Uebergabe: Run & Gun

Stand: 2026-08-22 23:20

## Ziel
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat). **V1 abgenommen, Tag
`v1.0`** als Rueckschrittspunkt. Laufend: **V2-Spurenumbau**, Etappenplan `docs/plan-v2.md`
(W1–W5 fertig, W7 und W6 offen). Live: https://thmshn75.github.io/run-gun/

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
- **V1 abgenommen** (2026-08-22 vormittags, Tag `v1.0` = Rueckschrittspunkt).
  `docs/plan.md` ist damit Archiv; **maszgeblich ist `docs/plan-v2.md`**.
- **W1–W5 gebaut**: Stadtbild, Waende links/rechts, Horden mittig, Seiten-Oekonomie,
  Boss ohne Schuss. Ton ist gebaut (Web Audio, Schalter im Menue) - steht nicht mehr aus.
- **Nach W5 ohne eigene Etappe dazugekommen** (alles aus iPhone-Rueckmeldungen, jeweils
  mit Messwerten in `docs/active-task.md` belegt):
  1. Perspektivische Figurengroesse (`road.perspective`), dreimal nachgeschaerft.
  2. Gegner auf Spielgroesse (`enemy.figureScale` 1,25) - vorher war ein Gegner selbst
     direkt vor der Truppe kleiner als eine eigene Figur.
  3. Schussreichweite je Waffe (`weapon.<name>.engageShare`, Flamme 158 px bis Laser
     479 px); im Bossduell ausgesetzt, sonst waere der Boss unangreifbar.
  4. Gegnermenge: Level 1 von 1,0 auf 5,2 Gegner je Sekunde, dazu breitere Spawn-Baender -
     ohne die bremst die Spurvergabe statt des Takts.
  5. Wandkette laeuft perspektivisch (Weltkoordinaten statt Bildschirmpixel), Kacheln
     schrumpfen mit der Entfernung und sehen als Quader statt als Aufkleber aus.
- Stand: 153 Tests gruen, `npm run check` sauber, alles gepusht, Arbeitsverzeichnis
  sauber, `docs/active-task.md` auf IDLE, nichts laeuft im Hintergrund.

## Offen — naechster Schritt zuerst
1. **W7 — Plastische Figuren** (`plan-v2.md`, neue Etappe, Akzeptanzkriterien stehen dort).
   Beleuchtete statt flacher Sprites fuer Truppe, drei Gegnertypen und Boss; danach
   doppelte Aufloesung und `pixelArt: false` fuer glatte Kanten. **Codex-Auftrag** - alle
   vorhandenen Sprites stammen aus Codex-Laeufen, Vorlagen in `assets/probe/` (136x184).
   Claude schreibt die Spec und reviewt, Codex rendert. Achtung: Koerpermasse in
   `balance.ts` gegen die neuen Bilder NACHMESSEN, nicht uebernehmen.
2. **W6 — V2-Abnahme** (laeuft zuletzt): toten Code raus (`blockers.ts` heisst noch so,
   meint aber Waende), Volllast-Messung, Netzwerk-Null-Check, Update-Pfad, README.
3. **Thomas' iPhone-Urteil** zu allem seit W5 steht noch aus. Korrekturen haben Vorrang.
   Tuning ohne Umbau: `road.perspective`, `enemy.figureScale`, `weapon.*.engageShare`,
   `level.plans`, `enemy.spawnBands`, `walls.block`.

## Offene Nebenbefunde (nicht behoben, bewusst)
- **Minigun und Rakete feuern nur mit 3 Figuren** (`shootersPerSalvo`) und sind dadurch
  nominell ~4x schwaecher als die Standardwaffe. Waffenbalance insgesamt offen.
- **Muenzen fahren weiterhin in Bildschirmpixeln**, waehrend Waende und Kulisse
  perspektivisch laufen. Sie fliegen nach Sekundenbruchteilen zur Truppe; eine Umstellung
  waere Risiko am Einsammel-Timing ohne sichtbaren Gewinn.
- **Wandkacheln behalten ihre Nennbreite**, waehrend die Hoehe perspektivisch schrumpft -
  gewollt, weil `widthShare` die Wand bewusst ueber die Strassenkante hinausragen laesst.

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
"Lies `docs/UEBERGABE.md`, `docs/lessons.md` und `docs/plan-v2.md` und arbeite dort weiter.
**Nichts neu aufsetzen - V1 ist abgenommen (Tag `v1.0`), V2 ist bei W1-W5 fertig.**
Naechster Schritt: Spec fuer W7 (plastische Figuren, Codex rendert) schreiben; vorher
Thomas' iPhone-Urteil zu allem seit W5 abwarten, Korrekturen haben Vorrang."
