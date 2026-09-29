# Aktive Aufgabe

Status: APPROVED

## Aufgabe: R1 — Rechenkern Grundspiel "Run Gun 3D" (ohne Grafik)

Verbindlicher Plan: `docs/plan-v7.md`, Abschnitt **"Spielrechnung"** (lesen) und
"Schrittfolge → R1". Dieser Schritt baut die **reine Spiellogik** als TypeScript ohne
Three.js, ohne DOM, ohne Phaser. Die Grafik (D3/D4) stellt diesen Kern später nur dar.
**Keine Spezialeinheiten-Wirkung** (kommt in R2) — eine gefallene Säule meldet nur, welche
Einheit frei wird.

## Erlaubte Änderungen (abschließend)

- Neu: `src/v3d/rechnung.ts`, `src/v3d/balance3d.ts`, `scripts/bots3d.ts` (oder `.mjs`),
  neuer Test `tests/v3dRechnung.test.ts`.
- `package.json`: nur ein Skript `"bots3d"` (Bot-Auswertung, s. A4). Keine neuen Pakete.
- Nichts sonst. `tests/v3dIsolation.test.ts` muss weiter grün sein; `rechnung.ts` und
  `balance3d.ts` importieren weder `three` noch DOM noch `renderer.ts`.

## Modell (verbindlich; Zahlen in `balance3d.ts`, Formeln in `rechnung.ts`)

Alle Mengen sind **Kommazahlen** (keine Rundung im Kern; die Anzeige rundet später ab).
Zeit in Sekunden, Strecken in Metern. `schritt()` wird mit festem `dt` aufgerufen
(Tests: `dt = 1/30`).

**Zustand** (`Zustand`): Zeit `t`; Truppe `T`; Liste `trupps` unterwegs
(`{ ziel: 'front' | 'saeule', pos: number, anzahl: number, vervielfacht: boolean }`);
`F` Soldaten an der Front; `Z` gewöhnliche Zombies in der Horde; `y` Frontlage (Meter vor
der Truppe); `P` Zähler der aktuellen Säule und `saeulenIndex`; `miniBoss` und
`eliteBoss` (`{ imFeld: boolean, B: number }`); gestartete Wellen;
`ergebnis: 'laeuft' | 'sieg' | 'niederlage'`; Kommarest fürs Aussenden; Seed-Zustand.

**Level-Tabelle** (`balance3d.ts`, Level 1 = Startwerte aus dem Plan):
`T0 = 10`, `k = 2`, Wand bei 5 m, Säule bei 12 m, Laufgeschwindigkeit 6 m/s,
Aussenden `r = 2 + 0,1·T` pro s, Einsammeln 2/s, Schwelle links `x < −0,6`,
rechts `x > +0,6`, Horde 600 in 3 Wellen à 200 im Abstand 20 s (Welle 1 bei t = 0),
Start `y = 60`, Marsch 0,8 m/s, Mini-Boss mit Welle 2 (`B = 400`), Elite-Boss 20 s nach
der letzten Welle (`B = 3000`), Säulen `P = 150` je Säule, Reihenfolge
`['humvee', 'panzer', 'haubitze', 'hubschrauber']`, Frontbreite `C = 40`,
**Kontaktmodell (korrigiert nach Nachrechnung 2026-09-29):** Soldaten im Kontakt
`K = min(F, C)`, Zombie-Druck `Zk = min(Z, C) + 25·(Anzahl Bosse im Feld)`;
Zombies fallen `0,5·K` pro s; Soldaten fallen `0,4·min(Zk, 2·K)` pro s (jeder Soldat wird
von höchstens zwei Gegnern zugleich bedrängt); Verschiebung `0,5·(K−Zk)/(K+Zk)` m/s;
Boss-Treffer 25 Punkte je "Zombie-Treffer".
(Claudes Vorab-Simulation mit diesen Werten: passiv verliert 20/20 nach ~140 s,
Strategie gewinnt 20/20 nach ~140 s.)

**`Level` ist vollständig parametrisiert** (für Test-Level): Wellenliste
`[{ t, groesse }]`, Streuung, Welle mit Mini-Boss, Zeitpunkt Elite-Boss, `B_mini`,
`B_elite`, `T0`, `k`, Wand-/Säulenlage, `P`, Säulen-Reihenfolge, `C`, alle Raten und
Faktoren, Start-`y`. Level 1 enthält genau die Werte oben.

**Ablauf je `schritt(zustand, eingabe: { x: number }, dt)`** (in dieser Reihenfolge):
1. **Wellen:** Erreicht `t` den Startzeitpunkt einer Welle: `Z += Wellengröße`
   (Seed-Streuung ±10 %), Ereignis `welle` mit der Menge. Mit Welle 2: Mini-Boss ins Feld.
   20 s nach der letzten Welle: Elite-Boss ins Feld.
2. **Einsammeln:** `x < −0,6` → `T += 2·dt` (Ereignis `eingesammelt`).
3. **Aussenden:** Rate `r = 2 + 0,1·T`; der Kommarest sammelt sich, ganze Soldaten werden
   als ein Trupp an `pos = 0` angelegt; Ziel `saeule` wenn `x > +0,6`, sonst `front`
   (Ereignis `ausgesandt`). `T` bleibt unverändert (die Truppe ist die Quelle).
4. **Laufen:** jeder Trupp `pos += 6·dt`. Passiert er 5 m und ist noch nicht vervielfacht:
   `anzahl *= k` (Ereignis `vervielfacht`, Menge `(k−1)·anzahl vorher`).
   Ziel `front` und `pos ≥ y` → `F += anzahl`, Trupp weg (Ereignis `angekommenFront`).
   Ziel `saeule` und `pos ≥ 12` → Trupp weg (Ereignis `angekommenSaeule` mit der Menge);
   gibt es noch eine Säule: `P −= anzahl`; `P ≤ 0` → Ereignis `einheitFrei` mit der
   nächsten Einheit der Reihenfolge, `saeulenIndex += 1`, `P = 150` (Überschuss verfällt).
   Nach der letzten Säule wirken Soldaten zur Säule nicht mehr (Ereignis bleibt).
5. **Front:** "Feind im Feld" = `Z > 0` oder ein Boss im Feld mit `B > 0`. Zu Beginn
   von Schritt 5 werden `F`, `Z`, Bosse einmal gelesen; `K`, `Zk`, Treffer, Verluste und
   Verschiebung rechnen alle mit dieser Momentaufnahme.
   - **Kontakt** = `F > 0` und Feind im Feld: Treffer `h = 0,5·K·dt`, zuerst an
     gewöhnliche Zombies (`d = min(h, Z)`, `Z −= d`, Ereignis `zombieGefallen` mit `d`),
     der Rest `h −= d` an den Mini-Boss, dann an den Elite-Boss: je Boss
     `u = min(h, B/25)`, `B −= 25·u`, `h −= u`, Ereignis `bossTreffer` mit
     **Menge = 25·u (B-Punkte)** und `boss`; ein Boss mit `B ≤ 0` verlässt das Feld.
     Verluste `v = min(F, 0,4·min(Zk, 2·K)·dt)`, `F −= v` (Ereignis `soldatGefallen`).
     Frontlage `y += 0,5·(K−Zk)/(K+Zk)·dt`.
   - **Kein Kontakt**, aber Feind im Feld: `y −= 0,8·dt` (Marsch).
   - Kein Feind im Feld: `y` bleibt.
   - `y` höchstens 60.
6. **Ende:** `y ≤ 0` → `niederlage`; sonst: Elite-Boss war im Feld und hat `B ≤ 0` →
   `sieg` (Niederlage hat Vorrang). Danach ändert `schritt()` nichts mehr.
7. **Zeit:** `t += dt` am **Ende** von `schritt()`. Wellen- und Bosszeitpunkte gelten als
   erreicht bei `t ≥ Zeitpunkt − 1e-9`.

Hinweis: Fällt `y` unter 5 m, erreichen neue Trupps die Front vor der Wand und werden
nicht vervielfacht — gewollt.

**Ereignisse** (`{ art, menge, t, … }`), Rückgabewert von `schritt()`: `welle`,
`eingesammelt`, `ausgesandt`, `vervielfacht`, `angekommenFront`, `angekommenSaeule`,
`einheitFrei` (mit `einheit`), `zombieGefallen`, `bossTreffer` (mit `boss`),
`soldatGefallen`, `sieg`, `niederlage`.

**Zufall** nur über einen Seed (z. B. Mulberry32 in `rechnung.ts`), kein `Math.random`.
Gleicher Seed + gleiche Eingaben → exakt gleicher Verlauf.

## Akzeptanzkriterien

### A1 Schnittstelle
`export function neuerLauf(level: Level, seed: number): Zustand`,
`export function schritt(z: Zustand, eingabe: { x: number }, dt: number): Ereignis[]`
(verändert `z`), `export const LEVELS: Level[]` in `balance3d.ts` (mindestens Level 1).

### A2 Bilanz-Invariante (Test)
In **1000 Läufen** mit zufälligen Seeds und zufälligen Eingabefolgen (`x` springt
zufällig zwischen −1, 0, +1 alle 0,5–3 s), je bis Ende oder 300 s, gilt in **jedem
Schritt** (Toleranz 1e-6):
- `ΔT = Σ eingesammelt`
- `Σ ausgesandt + Σ vervielfacht = Σ angekommenFront + Σ angekommenSaeule +
  Δ(Summe anzahl aller Trupps unterwegs)`
- `ΔF = Σ angekommenFront − Σ soldatGefallen`
- `ΔZ = Σ welle − Σ zombieGefallen`
- je Boss, solange er im Feld ist: `ΔB = −Σ bossTreffer` dieses Bosses
- Säule: `ΔP = −Σ angekommenSaeule` in Schritten ohne `einheitFrei` (solange es eine
  Säule gibt; nach der letzten ist `P = null`)
- kein Feld ist `NaN`.
Test-Timeout ausdrücklich 120 s; Summen je Schritt aus den Ereignissen mitzählen, nicht
jedes Mal über alle Trupps neu summieren.

### A3 Randfälle (Tests, je fester Seed; eigene **Test-Level** über die Parameter)
- Test-Level mit kleiner Horde (z. B. eine Welle à 50, kein Mini-Boss) und Elite-Boss bei
  t = 60, Truppe links: alle Zombies fallen vor t = 60; `y` bleibt danach stehen, bis der
  Elite-Boss erscheint; danach marschiert er; Sieg erst bei `B_elite ≤ 0`.
- Test-Level mit `P = 20` und großem Start-`y`, Truppe dauerhaft rechts: alle vier Säulen
  fallen der Reihe nach (vier `einheitFrei` in Tabellen-Reihenfolge), danach keine weitere.
- `F = 0` mit Feind im Feld: `y` sinkt um genau `0,8·dt` je Schritt.
- Truppe dauerhaft links: `T` wächst um genau 2 je Sekunde.
- Nach `sieg`/`niederlage` verändert `schritt()` den Zustand nicht mehr.
- Determinismus: zwei Läufe mit gleichem Seed und gleicher Eingabe sind identisch.

### A4 Bots (`npm run bots3d`)
- **passiv:** `x = 0` immer.
- **Strategie:** `x = −1` bis `T ≥ botSchwelleT` (Parameter im Bot-Skript, Standard 30),
  dann `x = +1` bis zum ersten `einheitFrei`, dann `x = 0`.
- Je Bot **20 Seeds** (1…20) auf Level 1, Laufende spätestens bei 300 s; Ausgabe als
  Tabelle: Seed, Ergebnis, Dauer, `T`, `F`, `Z` am Ende, gefallene Säulen; dazu die
  Siegquote je Bot.
- **Kein Test verlangt Quoten.** Die Kalibrierung macht Claude danach anhand der Ausgabe.
  Codex ändert keine Zahl in `balance3d.ts`, um Bot-Ziele zu erreichen, und meldet die
  Quoten nur im Bericht.

### A5 Qualität
`npm test`, `npx tsc --noEmit`, `npm run build` ohne Fehler; `npm run bots3d` läuft durch.
Laufzeit eines 300-s-Laufs mit `dt = 1/30` im Test messen und ausgeben (keine harte Grenze).

## Nicht tun

- Keine Grafik, keine Änderung an anderen Dateien unter `src/v3d/`.
- Keine Spezialeinheiten-Wirkung (R2), keine weiteren Level nötig.
- Keine Formel ändern; bei Widersprüchen in der Spec: im Bericht benennen und die
  naheliegende Lesart umsetzen, nicht eigenmächtig Zahlen drehen.
- Keine Commits.

## Implementation Summary

- Dateien: `src/v3d/balance3d.ts` (vollständig parametrisierte Level-1-Werte),
  `src/v3d/rechnung.ts` (Zustand, feste Schrittfolge, Ereignisse und Seed-Zufall),
  `scripts/bots3d.ts` (beide Bots), `tests/v3dRechnung.test.ts` (Bilanz und Randfälle),
  `package.json` (nur `bots3d`-Skript).
- Nachweise: `npm test`: 55 Dateien, 502 Tests bestanden; `npx tsc --noEmit`:
  Exit 0; `npm run build`: Exit 0; `npm run bots3d`: Exit 0.
  Im Test: 1000 Seed-Läufe, 3.680.935 Schritte in 2,42 s; ein 300-s-Lauf
  mit `dt = 1/30` in 0,005 s (Messung eines Laufs ohne Feinde, kein Grenzwert).
  `tests/v3dIsolation.test.ts` ist im vollen Testlauf grün.
- Bot-Läufe: je Seed 1–20, `dt = 1/30`, Ende spätestens 300 s. T/F/Z sind
  Endwerte, Säulen = gefallene Säulen. Passiv: 0/20 Siege. Strategie: 20/20 Siege.
  Alle Passiv-Läufe endeten als Niederlage, alle Strategie-Läufe als Sieg.
  Quoten dienten nur der Auswertung; Balancewerte wurden nicht nachjustiert.

**Passiv**

| Seed | Ergebnis | Dauer (s) | T | F | Z | Säulen |
|---:|---|---:|---:|---:|---:|---:|
| 1 | niederlage | 138.7 | 10 | 4.34 | 91.5 | 0 |
| 2 | niederlage | 138.7 | 10 | 4.34 | 98.99 | 0 |
| 3 | niederlage | 138.7 | 10 | 4.34 | 93.82 | 0 |
| 4 | niederlage | 138.7 | 10 | 4.34 | 104.35 | 0 |
| 5 | niederlage | 138.7 | 10 | 4.34 | 112.5 | 0 |
| 6 | niederlage | 138.7 | 10 | 4.34 | 92.86 | 0 |
| 7 | niederlage | 138.7 | 10 | 4.34 | 87.24 | 0 |
| 8 | niederlage | 138.7 | 10 | 4.34 | 88.5 | 0 |
| 9 | niederlage | 138.7 | 10 | 4.34 | 92.88 | 0 |
| 10 | niederlage | 138.7 | 10 | 4.34 | 129.64 | 0 |
| 11 | niederlage | 138.7 | 10 | 4.34 | 111.2 | 0 |
| 12 | niederlage | 138.7 | 10 | 4.34 | 82.97 | 0 |
| 13 | niederlage | 138.7 | 10 | 4.34 | 85.09 | 0 |
| 14 | niederlage | 138.7 | 10 | 4.34 | 100.59 | 0 |
| 15 | niederlage | 138.7 | 10 | 4.34 | 87 | 0 |
| 16 | niederlage | 138.7 | 10 | 4.34 | 106.34 | 0 |
| 17 | niederlage | 138.7 | 10 | 4.34 | 101.26 | 0 |
| 18 | niederlage | 138.7 | 10 | 4.34 | 106.33 | 0 |
| 19 | niederlage | 138.7 | 10 | 4.34 | 78.73 | 0 |
| 20 | niederlage | 138.7 | 10 | 4.34 | 114.62 | 0 |

**Strategie**

| Seed | Ergebnis | Dauer (s) | T | F | Z | Säulen |
|---:|---|---:|---:|---:|---:|---:|
| 1 | sieg | 134.63 | 30.07 | 15.97 | 0 | 1 |
| 2 | sieg | 135.73 | 30.07 | 16.26 | 0 | 1 |
| 3 | sieg | 134.97 | 30.07 | 16.42 | 0 | 1 |
| 4 | sieg | 136.53 | 30.07 | 15.77 | 0 | 1 |
| 5 | sieg | 137.73 | 30.07 | 17 | 0 | 1 |
| 6 | sieg | 134.83 | 30.07 | 15.84 | 0 | 1 |
| 7 | sieg | 134 | 30.07 | 16.68 | 0 | 1 |
| 8 | sieg | 134.2 | 30.07 | 16.55 | 0 | 1 |
| 9 | sieg | 134.83 | 30.07 | 15.84 | 0 | 1 |
| 10 | sieg | 140.27 | 30.07 | 16.05 | 0 | 1 |
| 11 | sieg | 137.53 | 30.07 | 17.13 | 0 | 1 |
| 12 | sieg | 133.37 | 30.07 | 17.42 | 0 | 1 |
| 13 | sieg | 133.67 | 30.07 | 16.22 | 0 | 1 |
| 14 | sieg | 135.97 | 30.07 | 15.76 | 0 | 1 |
| 15 | sieg | 133.97 | 30.07 | 17.03 | 0 | 1 |
| 16 | sieg | 136.8 | 30.07 | 16.9 | 0 | 1 |
| 17 | sieg | 136.07 | 30.07 | 16.7 | 0 | 1 |
| 18 | sieg | 136.8 | 30.07 | 16.9 | 0 | 1 |
| 19 | sieg | 132.73 | 30.07 | 16.14 | 0 | 1 |
| 20 | sieg | 138.1 | 30.07 | 17.12 | 0 | 1 |

- Spezifikationskonflikt: R1 nennt `y` höchstens 60 und fordert Test-Level
  mit großem Start-`y`; die Obergrenze ist deshalb der parametrisierte Startwert
  (Level 1 genau 60). Beim Elite-Boss gilt der explizite Zeitpunkt 60 s aus R1.
- Nicht durchgeführt: grafische/iPhone-Abnahme und Claude-Review (außerhalb R1).
  Die Terminal-App war in dieser Umgebung nicht verfügbar; Tests liefen direkt
  über die Projekt-Shell. Keine Commits oder Pushes.
