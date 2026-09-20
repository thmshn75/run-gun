# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/S5 — Die beiden Ränder

Verbindlicher Plan: `docs/plan-v6.md`, **zuerst lesen**, besonders den neuen Abschnitt
"Zweites Video (112.mov)". S1 bis S4 sind fertig und committet; Thomas hat den Aufbau
am 2026-09-20 ausdrücklich freigegeben ("ja passt"). Nichts davon wird umgebaut.

## Was gebaut wird

Zwei durchgehende Schilderreihen an den Bahnrändern, die die Truppe vergrößern.

1. **Links: +1-Reihe.** Blaue Schilder, dicht gestaffelt, ohne Lücke über die ganze
   Strecke. Fährt die Truppe hinein, wächst sie um den Wert des Schildes.
2. **Rechts: +99-Reihe.** Gelbe Schilder, ebenso durchgehend, mit einem deutlich
   höheren Wert. Das ist die lohnende, aber weiter entfernte Seite.
3. **Bewegung:** Die Reihen laufen von oben nach unten an der Truppe vorbei
   (Bahngefühl). Tempo aus `balanceV2.ts`, konstant.
4. **Einsammeln:** Ein Schild wird eingesammelt, wenn die Truppe es auf ihrer Höhe
   seitlich erreicht. Danach ist es verbraucht und verschwindet, bis es neu von oben
   kommt. **Ein Schild zählt genau einmal.**

## Grenzen

- Alles in `src/v2/`. Keine Importe aus `src/systems/`, `src/config/balance`,
  `src/scenes/`. Kein `localStorage`, kein `indexedDB`.
- **Keine Arcade-Physik, keine Collider, keine Overlap-Callbacks** — wie in S4 wird
  das Einsammeln durch Zahlenvergleich entschieden (Höhe und seitlicher Abstand).
- **Ein Schild darf nicht mehrfach zählen.** Der Verbraucht-Zustand gehört dem Schild
  und wird beim Neuerscheinen zurückgesetzt. Nicht über eine Bindung lösen, die bei
  jeder Berührung neu gesetzt wird (`docs/lessons.md` 2026-09-20).

## Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm run build`, `npm test` sauber; bestehende Tests grün
   (derzeit 464).
2. Reine Rechenfunktionen in `src/v2/raender.ts`, ohne Phaser:
   - `schildPositionen(...)` → Höhen der Schilder je Seite zu einem Zeitpunkt.
   - `sammeltEin(schild, truppeX, truppeY, reichweite)` → Wahrheitswert.
3. Tests in `tests/v2Raender.test.ts`:
   - Die Reihe ist **lückenlos**: Der Abstand zweier benachbarter Schilder ist nie
     größer als die Schildhöhe.
   - **Ein Schild zählt genau einmal**, auch wenn `sammeltEin` über viele Bilder hinweg
     wahr bleibt. Das ist der Test gegen die Mehrfachzählung.
   - Mittig fahrend sammelt die Truppe **nichts** ein; ganz links nur +1, ganz rechts
     nur +99.
   - Die Truppengröße wächst genau um die Summe der eingesammelten Werte.
4. **Browser-Nachweis** (führe ich, Claude, danach selbst): Fahren nach links lässt die
   Zahl in +1-Schritten steigen, nach rechts in +99-Schritten, mittig bleibt sie
   stehen; Doppelstart identisch.

## Abschlussbericht

Was geändert, Testergebnisse, was nicht ging und warum. Status am Ende auf
`IMPL_DONE`.

## Implementation Summary

- `src/v2/raender.ts`: phaserfreie, endlose +1/+99-Reihen mit geometrischem Einsammeln und einmaligem Verbrauch je Umlauf.
- `RunGunV2Scene`: sichtbare Rand-Schilder, Truppenwachstum und dynamische Stromrate ohne Collider oder Imports aus dem bestehenden Spiel.
- `tests/v2Raender.test.ts`: Lücken, Einmalzählung, beide Bahnränder und exakte Summen abgedeckt.
- `npx tsc --noEmit`, `npm run build` und `npm test` erfolgreich; letzter Lauf: 47 Dateien, 468 Tests grün. Browser-Nachweis ist ausdrücklich bei Claude offen.
