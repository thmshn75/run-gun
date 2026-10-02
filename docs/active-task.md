# Aktive Aufgabe

Status: APPROVED

## Aufgabe: Werkstatt (Plan V7, D7-Lobby Punkt 2)

Plan V7: "Werkstatt (3D-Konto aus Zombies + Sieg-Bonus) — Kaufbar: mehr Startsoldaten,
stärkeres Truppenfeuer, dünneres Eis; je Fahrzeug eine Stufe: Panzer und Haubitze je einen
Schuss mehr vor der Fahrt, Humvee fährt länger, Hubschrauber bleibt länger." Mecha (D7r) ist
seither dazugekommen. Vorgänger D7r abgenommen (Thomas 2026-10-02 06:18 "passt so"), Spec und
Nacharbeiten in der Git-Historie (Commit 3b1311e). Gehärtet (Runde 1, drei Gegenleser).

## Zahlen (Claude, Startwerte — Thomas kann sie ändern)
- **Münzen je Lauf:** `floor(besiegt / 10)`, bei Sieg zusätzlich `50 + 25 × Level`.
  `besiegt` = Summe `zombieGefallen` + `spezialTreffer` (wie die Ergebnistafel; keine
  Boss-Punkte). Auch Niederlagen geben `floor(besiegt / 10)` (Entscheidung Claude, für Thomas
  markiert). Schätzung Sieg Level 1 ≈ 150 — wird per Bot gemessen (W7).
- **Grundstufen** je 5 Stufen, Preise 100 / 200 / 350 / 550 / 800 (zusammen 2 000):
  Startsoldaten `T0 + 5 × s`; Truppenfeuer `zombieTreffer × (1 + 0,1 × s)`;
  Dünneres Eis `P' = max(1, round(P × (1 − 0,1 × s)))` (wirkt über `saeulenStartP` auf alle
  Säulen aller Runden).
- **Fahrzeuge** je 1 Stufe, 400. Abläufe mit Stufe **wörtlich**:
  - Panzer: `fahrt 1,2 · feuer 0,75 (40/s) · fahrt 1,5 · feuer 0,75 · fahrt 1,5 · feuer 0,75 ·
    schneise 5 (20/s, bossAnteil .05)` → 3 Feuerphasen = **6 Schüsse statt 4**; Feuerphasen
    90 statt 60 Zombies, Gesamtwirkung inkl. Schneise 190 statt 160.
  - Haubitze: `fahrt 1,2 · einschlaege 8,05 (3 Einschläge, Abstand 4, je 90) · fahrt 1,5` →
    Einschläge bei 1,2 / 5,2 / 9,2 s, Σ 270 statt 180.
  - Humvee: `schneise` 12 → 16 s. Hubschrauber: `feuer` 12 → 16 s.
  - Mecha: `einschlaege` 4,05 → 8,05 s, 3 Salven statt 2 (Σ 210 statt 140).

## Erlaubte Änderungen (abschließend)
- `src/v3d/balance3d.ts`: Typen `Phase` (diskriminiert nach `art`) und `Ablauf = readonly
  Phase[]`; `SPEZIAL` per `satisfies Record<string, { ablauf: Ablauf }>` (nicht `SpezialName` — zirkulär;
  Werte unverändert); `Level.spezial?: Partial<Record<SpezialName, { ablauf: Ablauf }>>`;
  `WERKSTATT`-Tabelle (Preise, Stufenmaxima, Fahrzeug-Abläufe).
- `src/v3d/rechnung.ts`: `AktiveEinheit.ablauf`; Signaturen **`gesamtDauer(x: AktiveEinheit |
  Ablauf)`**, **`phaseBei(x: AktiveEinheit | Ablauf, verstrichen)`**, `restZeit(a)`; Casts in
  der Wirkungsschleife durch die Union ersetzen. Keine neue Formel.
- Neue Datei `src/v3d/werkstatt.ts` (rein: `wendeStufenAn`, `muenzenFuerLauf`, `preis`,
  `zaehleBesiegt(ereignisse)` — dieselbe Zählung für Ergebnistafel, Gutschrift und Bots).
- `src/v3d/speicher.ts` (Konto), `src/v3d/oberflaeche.ts` (Werkstatt-Ansicht),
  `src/v3d/einstieg.ts` (Stufen beim Start, Gutschrift), `src/v3d/lauf.ts` (alle festen
  Indizes/Zeiten → aus dem Ablauf, siehe W2b).
- `src/v3d/messung.ts` **bleibt stufenlos** (liest `SPEZIAL` direkt, Level 0 ohne `spezial`) —
  nur Aufrufe an neue Signaturen anpassen, sonst nichts.
- `tests/`: bestehende Tests nur in den **Aufrufen** anpassen (v3dRechnung ~Z. 18/40, v3dLauf
  ~Z. 570), Erwartungen nicht. `scripts/bots3d.ts` (W7).
- Nicht: Level-Tabelle `STUFEN`, Front-/Horde-Regeln, Fahrzeugbilder, 2D-Code.

## Akzeptanzkriterien

**W0 Ausgangsmessung.** Vor der ersten Änderung `npm run bots3d > tmp/bots_vorher.txt`
(ignoriert). Neue Bot-Zeilen (W7) beginnen mit `Profil `. Am Ende muss
`diff <(npm run -s bots3d | grep -v '^Profil ') tmp/bots_vorher.txt` **leer** sein (Vorhersage).

**W1 Konto (`speicher.ts`).** Schlüssel `rg3d.werkstatt.v1`: `{ version: 1, muenzen, stufen:
{ truppe, feuer, eis, panzer, haubitze, humvee, hubschrauber, mecha } }`. Laden prüft **je Feld**:
`Number.isInteger`, Münzen 0…999 999, Stufen 0…Maximum aus `WERKSTATT` (Grund 5, Fahrzeug 1);
ungültige Felder → 0, gültige bleiben; kaputt/fehlend = alles 0, nie Absturz.
`bucheMuenzen(n)` liest frisch, addiert, begrenzt, schreibt. `kaufe(art)` prüft Preis,
Maximum und Kontostand gegen die Tabelle, schreibt Münzen + Stufe in **einem** `setItem`, liest
zurück und vergleicht; scheitert das, gilt der Kauf als nicht erfolgt (Rückgabe `false`).
Test: 2D-Spielstand byte-gleich, Kauf ohne Geld/über Maximum abgelehnt, kaputte Felder.

**W2 Ablauf je Einheit (Kern).** `starteEinheit(z, einheit)` legt eine **tiefe Kopie** von
`z.level.spezial?.[einheit]?.ablauf ?? SPEZIAL[einheit].ablauf` in `AktiveEinheit.ablauf`;
Wirkungsschleife, `gesamtDauer`, `phaseBei`, `restZeit` lesen nur diesen Ablauf. `SPEZIAL` und
`LEVELS` werden nie verändert (Test mit `Object.freeze`/`structuredClone`-Vergleich nach 5
Läufen mit allen Stufen). Bilanz-Invariante gilt weiter.
**W2b Darstellung aus dem Ablauf.** In `lauf.ts` werden **alle** festen
Phasenindizes und Zeiten ersetzt: Panzer-Schusszeiten = je `feuer`-Phase Start + 0,25 und
+ 0,65 (heute `[1.45, 1.85, 3.7, 4.1]`, ~Z. 280/404); Schneise/`halt2` über "letzte Phase der
Art `schneise`" statt `ablauf[4]` (~Z. 257); Fahrphasen über `art` statt Index (~Z. 328–342);
Haubitze-Ende über `gesamtDauer(a)` statt `SPEZIAL.haubitze` (~Z. 432); Haubitze-Seite
wechselt je Einschlag (gerade = links); Mecha-Salvenzahl aus `phase.einschlaege` statt `< 2`
(~Z. 371). **Panzer mit 3 Feuerphasen:** Fahrt 1 geht halt1 → halt2, alle weiteren Feuerphasen stehen
auf halt2; Feuerphase k (0-basiert) hat die Schüsse 2k und 2k+1 auf **ein** Ziel, Seite: k gerade
→ links, ungerade → rechts; Schneisen-Start über "erste Phase der Art `schneise`" — alles über
Phasenzähler und `art`, nie über 1/3/4. Liste aller umgestellten Stellen in den Bericht (`grep -n
"phaseBei\|gesamtDauer\|restZeit\|SPEZIAL\.\|ablauf\["` in `src/`, `scripts/`); Treffer in
`messung.ts` (Dauertest, Level 0 ohne `spezial`) stehen dort als "bewusst stufenlos", ohne
Umbau, und zählen nicht für die Reißleine.
**Test je Fahrzeug mit Stufe:** Einsatzbilder erzeugen so viele Schuss-/Einschlagbilder, wie der
Ablauf vorsieht (Panzer 6, Haubitze 3, Mecha 3 Salven); ohne Stufe wie heute (4/2/2).

**W3 Rechnung (`werkstatt.ts`, rein).** `wendeStufenAn(level, stufen, nurFahrzeuge = false)`
baut ein **neues** Level (neue Arrays/Objekte) mit T0/zombieTreffer/P nach Tabelle (bei
`nurFahrzeuge` bleiben diese drei) und `spezial` nur für gekaufte Fahrzeuge. Tests: Stufe 0 =
gleiche Werte; Wirkung je Grundstufe in die richtige Richtung; `saeulenStartP` aller Säulen
sinkt je Eis-Stufe um 10 % (± 1); Humvee/Hubschrauber 4 s länger aktiv. **Kern-Wirkung:** Panzer gesamt 190 statt 160
(Feuerphasen 90 statt 60), Haubitze 270 statt 180 — der n-te Einschlag wird im ersten Schritt
gemeldet, in dem `verstrichen ≥ 1,2 + 4n` (Einheitszeit, fester dt 0,05), Mecha-Salven 210
statt 140. **Münzen:** Signatur `muenzenFuerLauf(levelNr, ausgang, besiegt)` (Levelnummer
reicht `starteLauf` durch, Testgelände hat keine), Test `muenzenFuerLauf(1, 'sieg', 760) = 151`.

**W4 Werkstatt-Ansicht.** Eigenes Element **neben** `ui.lobby` (nicht darin), nur aus der Lobby
erreichbar (Knopf **WERKSTATT** unter SPIELEN), nie aus Lauf oder Ergebnistafel. Liest Konto
und Stufen bei jedem Öffnen frisch. Oben "¢ N"; je Zeile Name, Wirkung in Klartext (z. B.
"+5 Startsoldaten je Stufe", "Panzer: ein Schuss mehr vor der Fahrt"), Stufe "2/5" bzw. "0/1"
/ "✓", Knopf "KAUFEN · ¢ 350" (ausgegraut, wenn zu teuer oder voll); gescheiterter Kauf zeigt
"Speichern nicht möglich". 8 Zeilen scrollbar, Zeilenhöhe ≥ 56 px, Tippflächen ≥ 44 px,
Schrift ≥ 16 px bei 390 × 844. ZURÜCK (oben und unten) → `zeigeLobby()`, nie ins Menü. Die
Lobby zeigt den Kontostand "¢ N" neben dem Titel. Test: Kauf → ZURÜCK → SPIELEN startet mit
der gekauften Stufe.

**W5 Lauf mit Stufen (eine Stelle: `starteLauf`).** Reihenfolge: Basis (`LEVELS[n−1]` bzw.
`testLevel()`) → bei **Normallauf** `wendeStufenAn(basis, stufen)`, im **Testgelände**
`wendeStufenAn(basis, stufen, true)` (nur Fahrzeuge, P bleibt 10) → bei `direkt`
(`?pruefung`/`?nahaufnahme`) **keine** Stufen, dann `eisPruefLevel` wie heute. Eine Funktion
`zaehltFuerKonto(testFahrzeug, direkt)`; Test über Normallauf, Testgelände, `?pruefung=1`,
`?nahaufnahme`.

**W6 Münzen gutschreiben.** Genau **einmal**, sofort im Bild mit `sieg`/`niederlage` (nicht in
der verzögerten Tafel), über `bucheMuenzen`, nur wenn `zaehltFuerKonto`; Flag `gutgeschrieben`
je Lauf. Abbruch vor dem Ende (ZURÜCK, Kontextverlust) = 0. Die Tafel zeigt "+N Münzen" aus dem
gebuchten Betrag. Test: doppelt ausgelöstes Ende bucht einmal.

**W7 Bots.** `scripts/bots3d.ts` druckt zusätzlich je Level zwei Profile: "Stufen 3/3/3, keine
Fahrzeuge" und "alle Stufen voll" (Zeilen beginnen mit `Profil `: passiv n/20, gewinnende Spielweisen, beste Quote, Ø Münzen je
Lauf der besten Spielweise über `zaehleBesiegt` + `muenzenFuerLauf`). Dazu einmal: Siege auf Level 1–10 hintereinander bis alle Stufen voll
(gerechnet aus den Ø Münzen). **Hinweise an Claude (melden, nicht drehen):** "alle Stufen voll"
hat irgendwo weniger gewinnende Spielweisen als ohne Stufen, oder passiv gewinnt dort ≥ 1/20. Zahlen legen danach Claude und Thomas fest.

## Nachweise
`npm run check`, `npm test`, `npm run build`, `npm run bots3d`, W0-Diff. Status `IMPL_DONE`,
Bericht: umgestellte Stellen (W2b), Bot-Ausgabe (W0/W7), Münzen-Messung, Testergebnisse, was
nicht ging.

## Reißleine
Ist der W0-Diff nicht leer: nicht an Werten drehen, melden mit der ersten abweichenden Zeile.
Lässt sich W2b nicht vollständig umstellen: melden mit der Liste, Fahrzeug-Stufen dann **nicht**
freischalten (Zeilen ausgegraut "bald"), Grundstufen trotzdem fertig bauen. Keine Änderung an
Front-/Horde-Formeln.

## Implementation Summary (Codex, 2026-10-02)

- W0 vor der ersten Quelländerung ausgeführt und in `tmp/bots_vorher.txt` gesichert. Die vier Kopfzeilen von `npm run` wurden für den vorgeschriebenen Vergleich mit `npm run -s` entfernt; die 16 Bot-Zeilen blieben unverändert. Abschließender W0-Diff: leer (Exit 0).
- W1: eigenes Konto `rg3d.werkstatt.v1`, feldweise Prüfung, begrenzte Münzen, atomarer Kauf mit Rücklesen. Alter 2D-Spielstand bleibt bytegleich.
- W2/W3: diskriminierter Ablauf je aktiver Einheit als tiefe Kopie, reine Stufenrechnung und gemeinsame Zählung besiegter Zombies. Testwirkung: Panzer 190 statt 160, Haubitze 270 statt 180, Mecha insgesamt 330 statt 260 (Salven 210 statt 140); Humvee und Hubschrauber je 4 s länger. Haubitzentreffer bei 1,2/5,2/9,2 s (dt 0,05); Panzer sechs Schüsse.
- W4/W5/W6: separate scrollbare Werkstatt aus der Lobby mit acht Kaufzeilen, zwei Zurück-Knöpfen und aktuellem Kontostand. Stufen werden nur beim Laufstart gelesen; Testgelände nutzt nur Fahrzeugstufen, Direktstart keine Stufen. Münzen werden beim Endereignis genau einmal gebucht und später auf der Tafel als tatsächlich gebuchter Betrag gezeigt; Abbruch bucht nichts.
- W2b umgestellte Stellen (`rg -n 'phaseBei|gesamtDauer|restZeit|SPEZIAL\.|ablauf\[' src scripts`): `rechnung.ts:8-17,169,212` (Dauer, Phase, Restzeit, Wirkung), `lauf.ts:17-27,267,289-303,306-350,366-449` (Schusszeiten, Schneise, Fahrten, Haubitzenende, Mecha-Salven, Panzerziele). `messung.ts:68,76-80` bleibt bewusst stufenlos: Dauertest mit `SPEZIAL`, Level 0 ohne `spezial`; kein Umbau. Keine festen Ablauf-Indizes oder Schusszeiten mehr in `lauf.ts`.
- Nachweise nach letzter Codeänderung: `npm run check` grün; `npm test` 74 Dateien/671 Tests grün; `npm run build` grün (bestehende Chunkgrößen-Warnung); `npm run bots3d` grün; W0-Diff leer; `git diff --check` grün. Keine Werte wegen der Reißleine gedreht. Kein Commit/Push. Browser-/iPhone-Sichtprüfung nicht durchgeführt. Die Projektregel für Tests in der Terminal-App war in dieser Umgebung nicht ausführbar (`open -a Terminal`: „Unable to find application named 'Terminal'“); die Tests liefen direkt und wurden am Ergebnis geprüft.

Bot-Ausgabe W0 (ohne npm-Kopfzeilen):
```text
passiv: Siege 0/20, Ø Dauer 115.6 s, Ø gefallene Säulen 0.00
nurLinks: Siege 0/20, Ø Dauer 75.0 s, Ø gefallene Säulen 0.00
rhythmus(40): Siege 20/20, Ø Dauer 123.1 s, Ø gefallene Säulen 0.00
rhythmusSaeule(60): Siege 20/20, Ø Dauer 106.3 s, Ø gefallene Säulen 2.00
rhythmusSaeule(15): Siege 0/20, Ø Dauer 118.9 s, Ø gefallene Säulen 2.00
rhythmusSaeule(25): Siege 0/20, Ø Dauer 125.3 s, Ø gefallene Säulen 3.00
Level 1: passiv 0/20 · gewinnende Spielweisen 24/30 · beste 20/20
Level 2: passiv 0/20 · gewinnende Spielweisen 22/30 · beste 20/20
Level 3: passiv 0/20 · gewinnende Spielweisen 19/30 · beste 20/20
Level 4: passiv 0/20 · gewinnende Spielweisen 17/30 · beste 20/20
Level 5: passiv 0/20 · gewinnende Spielweisen 15/30 · beste 20/20
Level 6: passiv 0/20 · gewinnende Spielweisen 13/30 · beste 20/20
Level 7: passiv 0/20 · gewinnende Spielweisen 10/30 · beste 20/20
Level 8: passiv 0/20 · gewinnende Spielweisen 8/30 · beste 20/20
Level 9: passiv 0/20 · gewinnende Spielweisen 6/30 · beste 20/20
Level 10: passiv 0/20 · gewinnende Spielweisen 3/30 · beste 20/20
```

Bot-Ausgabe W7 (`Ø Münzen` der besten Spielweise über 20 Läufe):
```text
Profil Stufen 3/3/3, keine Fahrzeuge · Level 1: passiv 0/20 · gewinnende Spielweisen 29/30 · beste 20/20 · Ø Münzen 148.7/Lauf
Profil Stufen 3/3/3, keine Fahrzeuge · Level 2: passiv 0/20 · gewinnende Spielweisen 28/30 · beste 20/20 · Ø Münzen 177.8/Lauf
Profil Stufen 3/3/3, keine Fahrzeuge · Level 3: passiv 0/20 · gewinnende Spielweisen 28/30 · beste 20/20 · Ø Münzen 205.9/Lauf
Profil Stufen 3/3/3, keine Fahrzeuge · Level 4: passiv 0/20 · gewinnende Spielweisen 27/30 · beste 20/20 · Ø Münzen 230.9/Lauf
Profil Stufen 3/3/3, keine Fahrzeuge · Level 5: passiv 0/20 · gewinnende Spielweisen 27/30 · beste 20/20 · Ø Münzen 271.3/Lauf
Profil Stufen 3/3/3, keine Fahrzeuge · Level 6: passiv 0/20 · gewinnende Spielweisen 27/30 · beste 20/20 · Ø Münzen 296.3/Lauf
Profil Stufen 3/3/3, keine Fahrzeuge · Level 7: passiv 0/20 · gewinnende Spielweisen 26/30 · beste 20/20 · Ø Münzen 327.5/Lauf
Profil Stufen 3/3/3, keine Fahrzeuge · Level 8: passiv 0/20 · gewinnende Spielweisen 24/30 · beste 20/20 · Ø Münzen 356.9/Lauf
Profil Stufen 3/3/3, keine Fahrzeuge · Level 9: passiv 0/20 · gewinnende Spielweisen 24/30 · beste 20/20 · Ø Münzen 384.2/Lauf
Profil Stufen 3/3/3, keine Fahrzeuge · Level 10: passiv 0/20 · gewinnende Spielweisen 20/30 · beste 20/20 · Ø Münzen 421.6/Lauf
Profil alle Stufen voll · Level 1: passiv 0/20 · gewinnende Spielweisen 29/30 · beste 20/20 · Ø Münzen 148.7/Lauf
Profil alle Stufen voll · Level 2: passiv 0/20 · gewinnende Spielweisen 29/30 · beste 20/20 · Ø Münzen 177.8/Lauf
Profil alle Stufen voll · Level 3: passiv 0/20 · gewinnende Spielweisen 29/30 · beste 20/20 · Ø Münzen 205.9/Lauf
Profil alle Stufen voll · Level 4: passiv 0/20 · gewinnende Spielweisen 29/30 · beste 20/20 · Ø Münzen 230.9/Lauf
Profil alle Stufen voll · Level 5: passiv 0/20 · gewinnende Spielweisen 29/30 · beste 20/20 · Ø Münzen 271.3/Lauf
Profil alle Stufen voll · Level 6: passiv 0/20 · gewinnende Spielweisen 28/30 · beste 20/20 · Ø Münzen 296.3/Lauf
Profil alle Stufen voll · Level 7: passiv 0/20 · gewinnende Spielweisen 28/30 · beste 20/20 · Ø Münzen 327.5/Lauf
Profil alle Stufen voll · Level 8: passiv 0/20 · gewinnende Spielweisen 28/30 · beste 20/20 · Ø Münzen 356.9/Lauf
Profil alle Stufen voll · Level 9: passiv 0/20 · gewinnende Spielweisen 28/30 · beste 20/20 · Ø Münzen 384.2/Lauf
Profil alle Stufen voll · Level 10: passiv 0/20 · gewinnende Spielweisen 27/30 · beste 20/20 · Ø Münzen 421.6/Lauf
Profil Siege Level 1–10 der Reihe nach bis voll: 29 Siege · Bedarf ¢ 8000 · Ø Siegmünzen je Level 148.7/177.8/205.9/230.9/271.3/296.3/327.5/356.9/384.2/421.6
```
Münzen-Messung: Level-1-Sieg der besten Spielweise im Profil `3/3/3` und bei vollen Stufen Ø 148,7 Münzen pro Lauf; die reine Siegfolge aus den gemessenen Durchschnittswerten erreicht 8 000 Münzen nach 29 Siegen. Kein W7-Hinweisfall: Vollausbau hat nirgends weniger gewinnende Spielweisen als W0, passiv gewinnt 0/20 auf allen Levels.
