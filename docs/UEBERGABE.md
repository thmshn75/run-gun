# Uebergabe: Run & Gun

Stand: 2026-08-23, Nacht (autonome Sitzung)

## Ziel
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat). **V1 abgenommen (Tag
`v1.0`), V2 abgenommen (Tag `v2.0`)**. Laufend: **V3**, Etappenplan `docs/plan-v3.md`.
Live: https://thmshn75.github.io/run-gun/

## Harte Randbedingungen
- Claude setzt direkt um (kein Codex-Handoff), **ausser bei Bildern** — die erzeugt Codex.
- Testsuite, Builds und Codex-Laeufe ins Terminal (`.command` + `open -a Terminal`), nie
  in der Extension.
- **Nie eine Groesse raten, die das Spiel messen kann.** Balance-Zahlen aus `balance.ts`
  ableiten, Rechenweg als Kommentar dazu. Messsonden als temporaere `tests/_*.test.ts`
  oder Browser-Messung, danach loeschen.
- **Bei Leistungsfragen zuerst profilieren, dann Hypothesen bilden** (neue Lesson vom
  2026-08-23: Die Verdaechtigenliste war vollstaendig aus dem eigenen Code hergeleitet und
  die Ursache stand in keiner davon).
- Gamefeel/Optik gelten **erst nach Thomas' iPhone-Test** als erfuellt.
- Browser-Pruefung per Playwright: Hintergrund-Tab wird gedrosselt. **Kuenstliches Takten
  per `game.step()` verfaelscht die Physik** — lieber die echte Schleife laufen lassen und
  ueber `setInterval` eingreifen. Zugriff ueber `window.__runGun` (nur DEV).
- Nach jeder Etappe: `npm run check`, Terminal-Testsuite, Browser-Pruefung, commit + push,
  Deploy per `gh run watch` verifizieren.

## V3-Stand

| Etappe | Stand |
|---|---|
| **B0 Sammelbahn** | **fertig, von Thomas am iPhone abgenommen** ("Ok passt am Handy") |
| **B1 Startruckeln** | **fertig**, iPhone-Urteil offen |
| **B2 Shop nach jedem Level** | **fertig**, iPhone-Urteil offen |
| **B3 Weiterspielen + Fortsetzen** | **fertig**, iPhone-Urteil offen |
| B5 Zombie-Farbvarianten | **wartet auf Codex-Bilder** |
| B4 Granatwerfer | Code fertig, **wartet auf Codex-Bilder** |
| B6 Waffenstaffelung | offen, muss nach B4 |
| B7 Ton | **nicht startbereit** — Thomas muss sagen, was stoert |

## Was Thomas am iPhone testen sollte (Reihenfolge)

1. **Startruckeln (B1):** Ruckelt es beim Spielstart noch? Mehrfach starten, auch direkt
   nach dem Oeffnen der App.
2. **Shop (B2):** Nach jedem Level erscheint ein Overlay mit zwei Knoepfen. Mit dem Daumen
   bedienbar? Preise fair? Springt die DMG-Zahl beim Kauf sichtbar?
3. **Weiterspielen (B3):** Nach dem Game Over erscheint "WEITERSPIELEN" mit Preis. Und:
   App mitten im Run schliessen, neu oeffnen — im Menue steht "FORTSETZEN — LEVEL X".
4. **Sammelbahn (B0, schon abgenommen):** Faellt auf, dass rote Kacheln jetzt seltener
   greifen? Falls zu leicht: `walls.drainOverlapFigures` ist die Stellschraube.

## V3: was gebaut wurde

- **B0 Sammelbahn** (`78b07b4`): Die Pruefung las eine Truppenposition, die es nicht gab —
  der Physics-Body folgte, die GameObject-Position der Huelle klebte bei −15. Dazu wurde
  die Y-Achse gar nicht geprueft. Jetzt beide Achsen aus dem Anker gerechnet; rote Kacheln
  verlangen mehr Eindringtiefe (`drainOverlapFigures` 1,6 gegen 1,2), hergeleitet aus der
  **Fahrgrenze**, nicht aus der Huellenbreite.
- **B1 Startruckeln** (`4cab337`): Ursache war Phasers Kollisions-Suchbaum (48 % der
  aktiven Rechenzeit). `useTree: false` plus Nachschlagtabellen in `walls.ts`:
  Rechenzeit beim Start 1.185 → 541 ms, unter Volllast 478 → 318 ms, Aussetzer 2 → 0.
- **B2 Shop** (`9174c59`): Zwei Knoepfe in der Levelpause, Bonus **obendrauf** auf die
  unveraenderte Levelkurve. Preise aus gemessener Muenz-Einnahme (98 % Einsammelquote,
  10.454 Muenzen je vollem Run).
- **B3 Weiterspielen + Fortsetzen** (`d2d17da`): Speicherpunkt an der Levelgrenze,
  Weiterspielen 250 × Level, hoechstens zwei je Run.

## Befunde, die Thomas kennen sollte

- **Rote Kacheln greifen seltener als vor dem 2026-08-23.** Folge von B0; die linke Bahn
  ist netto grosszuegiger. Stellschraube `walls.drainOverlapFigures`.
- **Warum die GameObject-Position der Truppenhuelle bei −15 klebt, ist ungeklaert.** Der
  B0-Fix umgeht es strukturell, und es war die einzige Stelle, die sie las (Gegnertreffer
  laufen ueber `crowd.overlapsFigure`). Bleibt als offener Befund.
- **Ohne Kollisions-Suchbaum waechst der Aufwand quadratisch mit der Koerperzahl.** Unter
  heutiger Volllast ist die Variante ohne Baum klar guenstiger (gemessen). Steigt die
  Gegnermenge deutlich, hier neu messen — Hinweis steht in `main.ts`.
- **Der Shop-Bonus wirkt quadratisch**, weil Feuerkraft das Produkt aus Schaden und Rate
  ist. Wer die Bonuswerte aendert, rechnet den Gesamtfaktor als Produkt beider Reihen; ein
  Test haelt die Obergrenze (+40 %) fest.
- Aeltere Befunde (Bistabilitaet im oberen Levelbereich, Feuerlinie am Anschlag,
  Boss-Kampfdauer am Gegnerschild, 93 % abgelehnte Spawn-Versuche) gelten unveraendert —
  siehe `docs/plan-v2.md` und die Git-Historie.

## Offene Nebenbefunde (nicht behoben, bewusst)
- **Minigun und Rakete feuern nur mit 3 bzw. 5 Figuren**; Waffenbalance insgesamt offen.
- **Muenzen fahren in Bildschirmpixeln**, waehrend Waende und Kulisse perspektivisch
  laufen.
- **Wandkacheln behalten ihre Nennbreite**, waehrend die Hoehe perspektivisch schrumpft.

## Wichtige Dateien und Befehle
- Plan `docs/plan-v3.md` · Task `docs/active-task.md` · **Lessons `docs/lessons.md`**
- Bildauftrag an Codex: `docs/bildauftrag-v3.md`
- Balance: `src/config/balance.ts` (alle Tuning-Werte mit Herleitung als Kommentar)
- Shop: `shopOverlay.ts`, `upgrades.ts` · Spielstand: `save.ts` (`RunSnapshot`)
- Waende: `walls.ts` · Geometrie: `roadGeometry.ts` · Gegner: `spawner.ts`, `squads.ts`
- `npm run check` · `npm run dev` · Tests via Terminal-Skript · `npm run test:dist`
- Deploy verifizieren:
  `gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`

## Einstiegssatz
"Lies `docs/UEBERGABE.md`, `docs/lessons.md` und `docs/plan-v3.md` und arbeite dort weiter.
**Nichts neu aufsetzen** — V1 (`v1.0`) und V2 (`v2.0`) sind abgenommen, von V3 sind B0–B3
gebaut. Naechster Schritt: B5 und B4 brauchen Bilder aus `docs/bildauftrag-v3.md`, danach
B6. B7 (Ton) ist nicht startbereit, bis Thomas sagt, was stoert."
