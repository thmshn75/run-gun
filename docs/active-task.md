# Aktive Aufgabe

Status: APPROVED

## Aufgabe: R2 — Rechenkern: Vorrat-Mechanik, wachsende Wand, Spezialeinheiten

Verbindlicher Plan: `docs/plan-v7.md`, Zeile **"Mechanik neu"** in "Thomas' Entscheidungen",
"Spielrechnung" (Spezialeinheiten-Tabelle) und "Schrittfolge → R2". Dieser Schritt ändert den
**reinen Rechenkern** (`src/v3d/rechnung.ts`, `src/v3d/balance3d.ts`), die Bots und die
Tests. Die Grafik (D3) wird nur so weit angepasst, dass sie mit dem neuen Kern weiterläuft
(die sichtbare Welle und der Schuss auf die Säule kommen in der D3-Anpassung danach).
**Alle Zahlen hat Claude mit einem Prototyp vorab simuliert** (Ergebnisse unten) —
Codex übernimmt sie unverändert und ändert keine Formel.

## Erlaubte Änderungen (abschließend)

- `src/v3d/rechnung.ts`, `src/v3d/balance3d.ts` (Level-Tabelle und neue Felder),
  `scripts/bots3d.ts`, `tests/v3dRechnung.test.ts`.
- Nur zur Verträglichkeit: `src/v3d/lauf.ts` und `tests/v3dLauf.test.ts` (Tests, die das
  alte Aussenden/Säulen-Verhalten prüfen, an die neuen Regeln anpassen; Trupps zur Säule
  gibt es nicht mehr). Keine neue Grafik.

## Neue Regeln (ersetzen die entsprechenden R1-Regeln)

Eingabe `x ∈ [−1, 1]`; Zonen: **links** `x < schwelleLinks (−0,6)`, **rechts**
`x > schwelleRechts (+0,6)`, sonst **Mitte**.

1. **Einsammeln (links):** `T += einsammeln · dt` mit `einsammeln = 6`/s (Ereignis
   `eingesammelt`). Links wird **nicht** ausgesandt und **nicht** geschossen.
2. **Aussenden (nur Mitte):** Rate `senden = 8`/s (fest, nicht mehr von `T` abhängig). Der
   Kommarest `sendeRest` sammelt sich **nur in der Mitte und nur bei `T ≥ 1`**; außerhalb
   der Mitte oder bei `T < 1` wird `sendeRest = 0`. Ganze Soldaten
   `g = min(floor(sendeRest), floor(T))` bilden einen Trupp an `pos = 0` mit Ziel `front`;
   **`T −= g`** (Truppe ist jetzt ein Vorrat), `sendeRest −= g`, Ereignis `ausgesandt` (g).
   Trupps mit Ziel `saeule` entfallen vollständig.
3. **Säule (rechts):** Solange rechts und eine Säule steht (`P !== null`):
   `d = saeuleSchaden · T · dt` mit `saeuleSchaden = 0,3` je Soldat und Sekunde;
   `P −= d` (Ereignis `saeuleTreffer`, Menge `min(d, P vorher)`); `T` bleibt. Fällt
   `P ≤ 0`: Ereignis `einheitFrei` (Einheit der Reihenfolge), Einheit wird **aktiv**
   (Regel 5), `saeulenIndex += 1`, nächste Säule `P = 150`, nach der letzten `null`
   (Überschuss verfällt).
4. **Wand wächst (Variante B):** Zähler `durchWand` = Summe der Soldaten, die die Wand
   **vor** der Vervielfachung durchlaufen haben. Faktor beim Durchlaufen
   `k = min(kMax, kStart + floor(durchWand / wandStufe))` mit `kStart = 2` (Level-`k`),
   `wandStufe = 100`, `kMax = 4`. Dann `durchWand += anzahl`, `anzahl *= k`, Ereignis
   `vervielfacht` mit Menge `(k − 1) · anzahl vorher`. Steigt `k` gegenüber dem letzten
   Wert, Ereignis `wandStufe` (Menge = neues k). Der aktuelle Faktor steht im Zustand
   (`kAktuell`, Start 2) für die Anzeige.
5. **Spezialeinheiten** (aktiv ab `einheitFrei`, mehrere gleichzeitig möglich; Wirkung
   **vor** dem Frontkampf im selben Schritt; Zeit läuft mit `dt`):
   | Einheit | Dauer | Wirkung |
   |---|---|---|
   | `humvee` | 30 s | 4 Zombies/s |
   | `panzer` | 4 s | 40 Zombies/s |
   | `haubitze` | 3 s | 3 Einschläge je 60 Zombies: sofort beim Freiwerden, nach 1 s, nach 2 s |
   | `hubschrauber` | 12 s | 15 Zombies/s **und** 25 Boss-Punkte/s auf den ersten Boss im Feld (Mini vor Elite) |
   Zombies: `d = min(Wirkung, Z)`, `Z −= d`, Ereignis `spezialTreffer` (Menge d,
   `einheit`). Boss-Punkte über das bestehende Ereignis `bossTreffer` (mit `boss`); ein
   Boss mit `B ≤ 0` verlässt das Feld. Ereignisse `einheitAktiv` beim Start und
   `einheitEnde` beim Ablauf. Aktive Einheiten im Zustand (`aktiv[]`, Rest-Dauer).
6. **Unverändert aus R1:** Wellen, Laufen (6 m/s), Wand bei 5 m, Front-Ankunft (auch vor der
   Wand bei `y < 5`), Frontkampf, Bosse, Marsch, Ende, Zeit, Zufall.

## Level 1 (neu, von Claude kalibriert)

`T0 = 10`, Wellen **3 × 250** bei t = 0/20/40 s (±10 % Seed-Streuung wie bisher),
`kStart = 2`, `wandStufe = 100`, `kMax = 4`, `einsammeln = 6`, `senden = 8`,
`saeuleSchaden = 0,3`, `P = 150`, Reihenfolge Humvee → Panzer → Haubitze → Hubschrauber,
Spezialwerte wie Tabelle (als Felder in `balance3d.ts`, Block `SPEZIAL`), Rest wie R1.
Nicht mehr gebraucht: `sendenBasis`, `sendenProT` (entfernen), `saeule` (Lage 12 m, entfernen
oder als Darstellungswert nach `BUEHNE`).

## Akzeptanzkriterien

### A1 Kern
Regeln 1–6 exakt; `schritt` weiterhin `dt > 0` (RangeError sonst, wie R1).

### A2 Bilanz-Invariante (1000 Zufallsläufe wie R1, Test-Timeout 120 s)
Je Schritt aus den Ereignissen: `ΔT = eingesammelt − ausgesandt`;
Trupp-Summe: `ausgesandt + vervielfacht = angekommenFront + Δ(unterwegs)`;
`ΔF = angekommenFront − soldatGefallen`; `ΔZ = welle − zombieGefallen − spezialTreffer`;
`ΔB` je Boss `= −bossTreffer` (solange im Feld); `ΔP = −saeuleTreffer` außer bei
`einheitFrei`; keine NaN; `kAktuell ∈ [2, 4]`, nie fallend. Zufallsläufe mit zufälliger
Eingabe aus {−1, 0, 1} (Wechsel alle 0,5–5 s).

### A3 Randfälle (Test-Level)
Links wird nie ausgesandt; rechts wird nie ausgesandt und `T` bleibt; Mitte mit `T = 0`
sendet nichts; `sendeRest` verfällt beim Verlassen der Mitte; `k` steigt nach genau 100
durchgelaufenen Soldaten auf 3 und nach 200 auf 4, danach nicht mehr; Haubitze trifft
genau 3-mal; zwei Einheiten gleichzeitig wirken beide; Hubschrauber trifft zuerst den
Mini-Boss; Überschuss beim Säulenfall verfällt.

### A4 Bots (`npm run bots3d`, 20 Seeds, Level 1, dt 1/30, Ende spätestens 300 s)
Vier Bots, Ausgabe je Bot: Siege, Ø Dauer, Ø gefallene Säulen:
- `passiv`: x = 0 immer.
- `nurLinks`: x = −1 immer.
- `rhythmus(S)`: links bis `T ≥ S`, dann Mitte bis `T < 1`, wiederholen (S Parameter,
  Standard 40).
- `rhythmusSaeule(S)`: wie rhythmus, aber jeder zweite volle Vorrat geht nach rechts bis
  die aktuelle Säule fällt (dann Mitte), solange Säulen übrig sind.
**Erwartung aus Claudes Prototyp** (Codex prüft nur, ändert keine Zahl): passiv 0/20,
nurLinks 0/20, rhythmus(40) 20/20 (~122 s), rhythmusSaeule(60) 20/20 (~70 s, 4 Säulen),
rhythmusSaeule(15 und 25) 0/20 (zu kleine Truppe an der Säule verliert Zeit). Weichen die
Ergebnisse deutlich ab, im Bericht mit Tabelle melden — Claude kalibriert.

### A5 Verträglichkeit D3
`lauf.ts` läuft mit dem neuen Kern (keine Trupps zur Säule; Säulenzahl sinkt beim Schuss
von rechts; Wandanzeige zeigt `kAktuell`). `tests/v3dLauf.test.ts` entsprechend angepasst
(10 s Mitte: `ausgesandt ≈ min(8·10, T-Vorrat)`; links: `T` +60 ±1 in 10 s, kein
Aussenden; rechts: `P` sinkt, kein Aussenden).

### A6 Qualität
`npm test`, `tsc`, `build` grün; `rechnung.ts`/`balance3d.ts` ohne Three.js/DOM;
Hauptbündel unverändert.

## Nicht in diesem Schritt
Grafik der Welle, Schussbild auf die Säule, Fahrzeuge (D5), weitere Level (D7).

## Implementation Summary

- Vorrat-Mechanik, feste Mittelspur-Senderate, direkter Säulenschaden, wachsende Wand
  und alle vier zeitlich begrenzten Spezialeinheiten im reinen Rechenkern umgesetzt.
  Die D3-Laufdarstellung verwendet den tatsächlichen Wandfaktor und führt nur
  Trupps zur Front. Bots und Kern-/Lauf-Tests an die neuen Regeln angepasst.
- Prüfung: `npx vitest run tests/v3dRechnung.test.ts tests/v3dLauf.test.ts`:
  2 Dateien, 21 Tests grün; `npm test`: 62 Dateien, 539 Tests grün;
  `npm run check` und `npm run build`: Exit 0; `git diff --check`: Exit 0.
  Hauptbündel vor/nach Build je 1.468.039 Byte. Rechenkern ohne Three.js/DOM.
- Bots (`npm run bots3d`, je 20 Seeds, dt 1/30, maximal 300 s):

  | Bot | Siege | Ø Dauer | Ø Säulen |
  |---|---:|---:|---:|
  | passiv | 0/20 | 115,7 s | 0,00 |
  | nurLinks | 0/20 | 75,0 s | 0,00 |
  | rhythmus(40) | 20/20 | 122,2 s | 0,00 |
  | rhythmusSaeule(60) | 20/20 | 107,8 s | 2,00 |
  | rhythmusSaeule(15) | 0/20 | 119,2 s | 2,00 |
  | rhythmusSaeule(25) | 0/20 | 125,5 s | 3,00 |

- Abweichung zur Vorab-Simulation: `rhythmusSaeule(60)` erreicht 107,8 s und
  2 Säulen statt ungefähr 70 s und 4 Säulen. Vorgabewerte/Formeln unverändert;
  die Kalibrierung liegt laut Spec bei Claude. Kein Browser-/iPhone-Lauf in R2
  vorgesehen. Kein Commit/Push gemäß Projektregel.
