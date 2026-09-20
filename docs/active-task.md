# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/S2 — Die eigene Truppe

Verbindlicher Plan: `docs/plan-v6.md`. **Zuerst lesen**, besonders die
unverhandelbaren Randbedingungen. Schritt 1 (Gerüst, Menüknopf, Bahn) ist fertig und
committet — darauf wird aufgebaut, nichts davon wird umgebaut.

## Was gebaut wird

Eine **Truppe am unteren Bahnende**, die der Spieler seitlich steuert.

1. **Darstellung**: Eine Gruppe einzelner Figuren, Bildschlüssel `player` (das einzige,
   was V2 erbt). Sie stehen als gedrängter Haufen beieinander, nicht in Reih und
   Glied. Die Zahl der sichtbaren Figuren entspricht der Truppengröße, gedeckelt auf
   `BALANCE_V2.truppe.maxSichtbar`.
2. **Zähler**: Die aktuelle Truppengröße als Zahl unmittelbar über der Gruppe.
3. **Steuerung**: Der Spieler zieht mit dem Finger (bzw. der Maus) waagerecht; die
   Gruppe folgt. Sie bleibt vollständig innerhalb der Bahnränder — auch die äußersten
   Figuren des Haufens, nicht nur der Mittelpunkt.
4. **Startgröße** aus `balanceV2.ts`, zunächst fest. Wachstum kommt in S5.

## Grenzen (unverändert aus S1)

- Alles Neue liegt in `src/v2/`. Keine Importe aus `src/systems/`, aus
  `src/config/balance` oder aus `src/scenes/`. Kein `localStorage`, kein `indexedDB`.
- **Die Formationsrechnung wird NICHT aus dem bestehenden Spiel übernommen**, auch
  nicht abgeschrieben. V2 braucht einen Haufen, keine Formation mit Reihen — das ist
  bewusst etwas anderes und einfacher.
- Bestehende Dateien werden in diesem Schritt **gar nicht** angefasst.

## Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm run build`, `npm test` laufen sauber; bestehende Tests
   bleiben grün (derzeit 447).
2. **Reine Rechenfunktionen in eigenen Dateien**, ohne Phaser-Abhängigkeit, damit sie
   prüfbar sind:
   - `haufenPlaetze(anzahl)` → Liste von Versätzen `{ dx, dy }` um den Mittelpunkt.
   - `truppeGrenzen(width, height, halbeBreiteDesHaufens)` → erlaubter Bereich für den
     Mittelpunkt, damit der Haufen die Bahn nicht verlässt.
3. Neue Tests in `tests/v2Truppe.test.ts`:
   - `haufenPlaetze` liefert für 1, 5, 20, 60 Figuren genau so viele Plätze.
   - Die Plätze liegen dicht beieinander: Der weiteste Platz ist bei 60 Figuren nicht
     weiter als `BALANCE_V2.truppe.haufenRadiusMaxPx` vom Mittelpunkt entfernt.
   - **Randtreue:** Für den ganz linken und ganz rechten erlaubten Mittelpunkt liegt
     **jeder** Platz des Haufens noch innerhalb der Bahnkanten aus S1 (dieselbe
     `bahnKanten`-Rechnung verwenden, nicht neu erfinden). Das ist der Test, der einen
     halb außerhalb stehenden Haufen verhindert.
   - Die Zahl der sichtbaren Figuren ist auf `maxSichtbar` gedeckelt, der Zähler zeigt
     aber die echte Größe.
4. **Browser-Nachweis** (führe ich, Claude, danach selbst):
   - Gruppe sichtbar, Zahl stimmt mit der Figurenzahl überein.
   - Ziehen nach ganz links und ganz rechts: Haufen bleibt vollständig auf der Bahn.
   - **Doppelstart** Menü → V2 → Menü → V2: Truppe steht beim zweiten Start wieder
     korrekt, Steuerung funktioniert weiterhin (Phaser-Szenen sind Singletons; alle
     Felder in `create()` zurücksetzen).

## Abschlussbericht

Was geändert, Testergebnisse, was nicht ging und warum. Status am Ende auf
`IMPL_DONE`.

## Implementation Summary

- `src/v2/truppe.ts` enthält die Phaser-freien Haufenplätze, die perspektivisch
  bahntreuen Mittelpunktgrenzen und die getrennte Anzeige von sichtbaren Figuren und
  echtem Truppenzähler.
- `src/v2/balanceV2.ts` ergänzt ausschliesslich die feste S2-Startgröße sowie die
  Haufen- und Darstellungswerte; die Bahnkanten werden aus der S1-Rechnung bis zur
  jeweiligen Haufenhöhe interpoliert.
- `src/v2/RunGunV2Scene.ts` zeichnet und steuert die Truppe per Finger oder Maus,
  klemmt sie vollständig innerhalb der Bahn und setzt ihre Felder in `create()` für
  den zweiten Szenenstart zurück.
- `tests/v2Truppe.test.ts` prüft Anzahl, Radius, beide Bahnrand-Endpunkte sowie das
  Sichtlimit bei unverändertem Zähler. N2 prüft zusätzlich zehn absolute
  Truppenbewegungen ohne Positionsdrift; die halbe Haufenbreite wird nur aus festen
  Haufenplätzen und Figurenbreite abgeleitet. `npx tsc --noEmit`, `npm run build` und
  `npm test` sind grün (44 Dateien, 455 Tests). Browser- und Doppelstartnachweis
  wurde im Review belegt.

---

## NACHARBEIT N2 (Review 2026-09-20, 12:20)

Die Umsetzung ist im Browser belegt: Truppe mittig mit Zähler, Steuerung hält beide
Bahnränder ein (links 27–121, rechts 267–361 bei Bahn 0–390), Doppelstart zweimal
sauber. **Ein Punkt muss vor dem Commit noch weg**, weil er ein bekanntes Fehlermuster
dieses Projekts ist:

In `RunGunV2Scene.aktiviereTruppenSteuerung()` wird die halbe Haufenbreite so
gerechnet:

```ts
const halbeBreite = Math.max(...this.truppenFiguren.map(
  (figur) => Math.abs(figur.x - this.truppeX) + figur.displayWidth / 2), 0)
```

Das liest einen **abgeleiteten Wert aus dem Zustand zurück**, den es selbst erzeugt
hat: Die Figurenpositionen entstehen aus `truppeX`, und aus ihnen wird wieder eine
Grenze für `truppeX` berechnet. Läuft das Paar einmal auseinander — durch einen
Fehler, ein späteres Wachstum der Truppe (S5) oder einen Neustart mitten im Zug —,
wächst `halbeBreite` unbegrenzt, die Grenzen fallen zusammen und **die Steuerung
blockiert vollständig**. Genau das ist beim Messen passiert, als der Zustand einmal
verschoben war: Die Truppe ließ sich danach nicht mehr bewegen.

Dieselbe Fehlerklasse steht in `docs/lessons.md` unter 2026-09-20 ("Abgeleiteten Wert
nie als Zustand zurücklesen") — dort hatte sie 3,5-fach zu schnelle Figuren zur Folge.

**Zu tun:**
1. Die halbe Haufenbreite **aus `haufenPlaetze(anzahl)` und der Figurenbreite rechnen**,
   nicht aus den aktuellen Positionen. Am besten als eigene, testbare Funktion in
   `src/v2/truppe.ts`, z. B. `haufenHalbeBreite(anzahl, figurBreite)`.
2. Die Figuren beim Bewegen **absolut setzen** (`truppeX + platz.dx`), statt sie um
   eine Differenz zu verschieben. Dann kann nichts driften.
3. Test in `tests/v2Truppe.test.ts`: Nach zehn aufeinanderfolgenden Bewegungen zu
   zufälligen Zielen entspricht jede Figurenposition exakt `truppeX + platz.dx` —
   kein Auseinanderlaufen.

Alles andere aus S2 bleibt unverändert.
