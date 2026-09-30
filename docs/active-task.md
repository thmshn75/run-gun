# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D5b-Nacharbeit — sichtbare Treffer, Mitte der Fahrbahn, Haubitze 2 Schuss (Thomas 2026-09-30 15:45)

Thomas (iPhone): "Der Panzer fährt durch die Menge, tötet aber (sichtbar) keine Zombies.
Die Haubitze ist zu groß; sie soll 2× feuern, einmal links, einmal rechts, und dann wieder aus
dem Bild fahren. Beide sollen in der **Mitte der Fahrbahn** auftauchen und einmal in die
**linke** und einmal in die **rechte** Hälfte der Zombies schießen, mit sichtbarem Einschlag
(Explosion). Die +1-Schilder müssen noch mindestens 25 % schneller kommen, wenn ich dort
stehe."

**Ursache "keine sichtbaren Treffer" (Claude):** Der Kern zieht `spezialTreffer` von `Z` ab
(160 beim Panzer, geprüft), die sichtbare Horde ist aber präfixstabil und schrumpft **hinten**
— an der Einschlagstelle ändert sich nichts. Die Schneisen-Maske allein reicht nicht.

## Erlaubte Änderungen (abschließend)

`src/v3d/lauf.ts`, `src/v3d/anzeigen.ts`, `src/v3d/balance3d.ts` (`SPEZIAL.haubitze`,
`FAHRZEUGE`, `DARSTELLUNG`), `src/v3d/rechnung.ts` (nur falls der Haubitzen-Ablauf mit
Abfahrt Codeänderung braucht), Tests `tests/v3dLauf.test.ts`, `tests/v3dRechnung.test.ts`,
`tests/v3dFahrzeuge.test.ts`. **Zuerst** `npm run bots3d` als "Vorher" festhalten.

## Akzeptanzkriterien

### N1 Treffer-Löcher (sichtbare Treffer an der Einschlagstelle)
- `baueHorde` bekommt eine **Lochliste** (Indizes der Aufstellung): sichtbar ist
  `aufstellung(N + L)` ohne die `L` Loch-Indizes, `N = min(ceil(Z), 600)` — die sichtbare
  Zahl bleibt exakt `N`.
- Jede Spezial-Wirkung hat im Bild einen **Einschlagpunkt** `P` (Welt-x/z); die zugehörige
  Menge (ganzzahlig über einen Rest-Akkumulator je Einheit) wird als Löcher bei den
  **nächstgelegenen sichtbaren** Zombies um `P` angelegt (höchstens im Radius r, s. unten);
  reicht der Radius nicht, schrumpft der Rest wie bisher hinten.
- **Heilen:** Löcher schließen sich langsam — alle `DARSTELLUNG.LOCH_HEILEN_S = 0.25` s wird
  ein Loch aufgegeben (Horde schrumpft dafür hinten um eins), sodass ein 90er-Krater in
  ~20 s zuwächst. Löcher liegen in Horde-Koordinaten (wandern mit der Horde).
- Die Schneisen-Maske der Vorversion entfällt (ersetzt durch Löcher entlang des Panzerwegs).
- Test: nach einem Haubitzen-Einschlag mit 90 Treffern sind im Radius um `P` mindestens
  80 % von `min(90, vorher sichtbar im Radius)` weniger Zombies sichtbar; sichtbare Zahl
  bleibt `N`; Löcher heilen in der vorgegebenen Zeit.

### N2 Panzer
- Taucht in der **Mitte der Fahrbahn** auf (`x = 0`), gleiche Halte wie bisher.
- `feuer` 1 schießt in die **linke** Hälfte (Ziel-x −1,7 ± 0,5), `feuer` 2 in die **rechte**
  (+1,7 ± 0,5), Ziel-z in den vordersten 4 m der Horde; je Schuss (alle 0,5 s) eine
  **Explosion Ø 4 m** am Ziel, Löcher-Radius 2 m.
- `schneise`: Löcher entlang des Wegs vor dem Bug (Radius 1,4 m um die Panzerspitze).
- Abgang wie bisher.

### N3 Haubitze
- **Kleiner:** eigener Maßstab `FAHRZEUGE.haubitze.SPIEL_SKALA = 0.5` (Panzer bleibt 0,8).
  Taucht in der **Mitte** auf (`x = 0`), hält direkt hinter der Wand (Heck 1 m hinter der Wand).
- **Kern-Ablauf** (Gesamtwirkung unverändert 180): `fahrt 1,2 s → einschlaege 2 × 90,
  Abstand 1 s, Phasendauer 1,05 s → fahrt 1,5 s (Abfahrt, ohne Wirkung)`.
- Einschlag 1 in die **linke**, Einschlag 2 in die **rechte** Hälfte (x ∓ 1,7 ± 0,5,
  z zwischen −y − 3 und −y − 10): Mündungsblitz + **Explosion Ø 7 m**, Löcher-Radius 3 m.
- **Abfahrt:** In der letzten `fahrt`-Phase fährt sie rückwärts zurück nach z = +10 und ist
  am Phasenende weg (kein Schrumpfen).

### N4 Explosionen deutlicher
- Ablauf 0,6 s, heller Kern (fast weiß) + orange Rand, beginnt bei 50 % der Zielgröße.
  Höchstens 2 gleichzeitig > 4 m bleibt.

### N5 +1-Schilder schneller
- `SCHILDER_TEMPO_SCHNELL` 16 → **21** m/s (+31 %), Beschleunigung 48 → **64** m/s².

### N6 Tests und Nachweise
- Tests: N1 wie oben; Panzer/Haubitze-x = 0; Ziel-x links/rechts je Schuss; Haubitze
  2 Einschläge (Ereignis-`t` in `[Soll − dt, Soll)`, Soll = Start + 1,2 / 2,2) und Abfahrt
  auf z = +10 am Phasenende; Summen je Einheit unverändert; Schildertempo.
- Bots vorher/nachher (Grenzen wie D5b), `npm test`, `tsc`, `build` grün.
- Claude prüft Bild (`?pruefung=1&einsatz=panzer|haubitze`) und Zweitstart; Thomas iPhone.

## Implementation Summary

- N1: Präfixstabile Horde mit Loch-Indizes statt Schneisen-Maske; Treffer entfernen die nächsten sichtbaren Zombies am Einschlagort, halten die sichtbare Sollzahl und heilen je 0,25 s ein Loch.
- N2/N3: Panzer und Haubitze erscheinen mittig, schießen links/rechts mit den festgelegten Radien und Explosionen. Die Haubitze ist auf 0,5 skaliert, trifft 2 × 90 (gesamt 180) und fährt ohne weitere Wirkung rückwärts auf z = +10 ab.
- N4/N5: Explosionen 0,6 s mit hellem Kern und orangefarbenem Rand, Start bei 50 % Durchmesser; +1-Schilder 21 m/s und 64 m/s².
- Nachweise: `npm run bots3d` vorher/nachher identisch (passiv 0/20, nurLinks 0/20, rhythmus(40) 20/20, rhythmusSaeule(60) 20/20, Varianten 15/25 je 0/20); `npm test` 64 Dateien/578 Tests grün, `npx tsc --noEmit`, `npm run build` und `git diff --check` grün.
- Offen für Claude/Thomas gemäß N6: Bildprüfung beider Einsätze, Zweitstart und iPhone-Test. Terminal.app war hier nicht verfügbar; die Prüfungen liefen direkt in der Shell. Kein Commit/Push (Projektregel).
