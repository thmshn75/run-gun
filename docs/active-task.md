# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/S6 — Das Tor

Verbindlicher Plan: `docs/plan-v6.md`, **zuerst lesen**. S1 bis S5 sind fertig und
committet; der Aufbau ist von Thomas freigegeben. Nichts davon wird umgebaut.

## Was gebaut wird

Ein **festes Tor quer über die Bahn**, unmittelbar vor der eigenen Truppe — im Video
(beide Aufnahmen) sitzt es dort und nicht in der Bahnmitte.

1. **Darstellung:** ein breites Feld über die volle Bahnbreite mit großer Aufschrift
   `×N`. Es steht **dauerhaft** und zieht nicht vorbei.
2. **Wirkung:** Jede Stromfigur, die es passiert, wird vervielfacht — aus einer Figur
   werden `N`. Die zusätzlichen Figuren laufen ab dort weiter nach oben.
3. **Freischaltung wie im Video:** Das Tor trägt einen kleinen Zähler, den die
   durchlaufenden Figuren herunterhacken. Erst bei null wirkt der Multiplikator; bis
   dahin läuft der Strom unverändert hindurch. Der Zähler ist sichtbar und sinkt.
4. Faktor und Freischaltzahl aus `balanceV2.ts`, mit Rechenweg.

## Grenzen

- Alles in `src/v2/`. Keine Fremdimporte, kein Speicherzugriff (wie S1 bis S5).
- **Keine Physik, keine Collider** — das Passieren wird durch Vergleich der Laufhöhe
  mit der Torhöhe entschieden.
- **Eine Figur passiert das Tor genau einmal.** Der Zustand gehört der Figur und wird
  beim Neustart aus dem Vorrat zurückgesetzt. Nicht über eine Bindung lösen, die bei
  jeder Berührung neu gesetzt wird.
- Der Vorrat aus S3 muss die Vervielfachung tragen: Der Rechenweg für die
  Vorratsgröße wird entsprechend angepasst, nicht geraten.

## Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm run build`, `npm test` sauber; bestehende Tests grün
   (derzeit 468).
2. Reine Rechenfunktionen in `src/v2/tor.ts`, ohne Phaser.
3. Tests in `tests/v2Tor.test.ts`:
   - Vor der Freischaltung vervielfacht das Tor **nicht**; der Zähler sinkt je
     passierender Figur um eins und nie unter null.
   - Nach der Freischaltung wird aus einer Figur genau `N`.
   - **Eine Figur wird nicht mehrfach vervielfacht**, auch wenn sie mehrere Bilder lang
     auf Torhöhe steht. Das ist der Test gegen die Mehrfachzählung.
   - Der Figurenvorrat reicht für den vervielfachten Strom: Der Test rechnet
     `maximale Rate × Faktor × Laufdauer` nach und vergleicht mit der Vorratsgröße.
4. **Browser-Nachweis** (führe ich, Claude, danach selbst): Zähler sinkt sichtbar,
   danach erscheint hinter dem Tor deutlich mehr Strom als davor (Zählung vorher/
   nachher); Doppelstart identisch.

## Abschlussbericht

Was geändert, Testergebnisse, was nicht ging und warum. Status am Ende auf
`IMPL_DONE`.

## Implementation Summary

- Festes ×99-Tor bei 700 px vor der Starttruppe, mit sichtbarem Freischaltzähler.
- `src/v2/tor.ts` verarbeitet den einzelnen Durchgang Phaser-frei; jede Stromfigur
  trägt ihr eigenes `torPassiert` und wird nach dem Durchgang nie erneut gezählt.
- Der Stromvorrat beträgt rechnerisch `ceil(8 × 99 × (602 / 180)) + 2 = 2651`.
- Prüfläufe: `npx tsc --noEmit`, `npm run build` und `npm test` grün (48 Dateien,
  472 Tests). Browser-Nachweis bleibt wie spezifiziert bei Claude.
