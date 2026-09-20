# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/S4 — Die beiden Flächen und ihre Grenze (DER KRITISCHE SCHRITT)

Verbindlicher Plan: `docs/plan-v6.md`. **Zuerst lesen**, besonders den Abschnitt "Was
das für die Umsetzung heißt — der Satz, auf dem alles steht" und die Tabelle
"Warum das nicht dasselbe ist wie der gescheiterte Torlauf". S1 bis S3 sind fertig und
committet.

## Der Satz, aus dem dieser Schritt folgt

**Im Video kämpfen keine Figuren gegeneinander. Zwei Flächen treffen sich, und ihre
Grenzlinie verschiebt sich.** Die Figuren stellen den Flächeninhalt dar; sie handeln
nicht. Es gibt **kein Ziel, keine Bindung, keinen Einzelkampf, keinen Collider**.

## Was gebaut wird

1. **Gegnerfläche**: ein Vorrat (Zahl) und eine Grenzlinie `frontY`. Oberhalb der
   Grenze wird die Fläche mit Zombie-Figuren (`enemy-standard`) dicht gefüllt, vom
   Horizont bis `frontY`. Ein Zähler zeigt den Vorrat.
2. **Eigene Fläche**: wächst durch ankommende Stromfiguren. Erreicht eine Figur die
   Grenzlinie, wird sie eingesammelt und **erhöht den eigenen Flächenwert um eins**.
3. **Die Bilanz je Bild** — das ganze Spiel in einer Rechnung, als reine Funktion in
   `src/v2/front.ts`:
   - Eigener Wert nimmt dem Vorrat pro Sekunde `abbauProEigenerEinheitProSek` ab.
   - Der Vorrat nimmt dem eigenen Wert pro Sekunde `verlustProVorratProSek` ab.
   - Aus dem verbliebenen Vorrat folgt die neue Grenzlinie: voller Vorrat = Grenze
     unten bei `frontStartY`, Vorrat null = Grenze oben am Horizont. Linear dazwischen.
4. **Darstellung**: Die Zombie-Figuren werden aus einem festen Vorrat gefüllt; wie
   viele sichtbar sind, folgt allein aus Vorrat und Grenzlinie. Die eigene Fläche wird
   als dichte Reihe eigener Figuren direkt unterhalb der Grenze dargestellt.

## Ausdrücklich NICHT in diesem Schritt

Kein Boss, kein Tor, keine +1-Ränder, kein Sieg und keine Niederlage. Nur: Der Vorrat
sinkt, die Grenze wandert nach oben, beides sichtbar.

## Grenzen

- Alles in `src/v2/`. Keine Importe aus `src/systems/`, `src/config/balance`,
  `src/scenes/`. Kein `localStorage`, kein `indexedDB`.
- **Keine Arcade-Physik, keine Collider, keine Overlap-Callbacks.** Ob eine Stromfigur
  angekommen ist, wird durch Vergleich ihrer Laufhöhe mit `frontY` entschieden — eine
  Zahl gegen eine Zahl. Overlap-Callbacks feuern jedes Bild für jedes Paar und haben
  im Torlauf zweimal zu stillen Fehlern geführt (`docs/lessons.md` 2026-09-20).
- **Bruchteile sammeln.** Vorrat und eigener Wert sind Fließkommazahlen; nur die
  Anzeige rundet. Im Torlauf verschwand ein Verlust von 0,13 je Bild vollständig in
  der Rundung (`docs/lessons.md` 2026-09-19).

## Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm run build`, `npm test` sauber; bestehende Tests grün
   (derzeit 458).
2. Tests in `tests/v2Front.test.ts`:
   - **Bilanz:** Bei gleich starken Seiten bleibt die Grenze stehen; bei stärkerer
     eigener Seite wandert sie nach oben; bei stärkerer Gegnerseite nach unten.
   - **Bildratenunabhängigkeit:** Zwanzig Schritte à 16 ms ergeben denselben Zustand
     wie zehn Schritte à 32 ms (auf zwei Nachkommastellen).
   - **Keine Rundungsverluste:** Hundert Schritte mit je 0,13 Abbau senken den Vorrat
     um 13, nicht um 0.
   - **Grenzlinie:** Vorrat voll → `frontStartY`; Vorrat null → Horizont; halber
     Vorrat → Mitte dazwischen.
3. **Browser-Nachweis** (führe ich, Claude, danach selbst):
   - Gegnerfläche sichtbar gefüllt, Zähler sinkt, Grenze wandert messbar nach oben.
   - **Bildvergleich mit dem Video** — dieser Nachweis entscheidet über den ganzen
     Plan und wird Thomas vorgelegt, bevor S5 beginnt.
   - Doppelstart: Werte im zweiten Lauf identisch.

## Reißleine (aus plan-v6.md)

Überzeugt der Bildvergleich **nicht**, wird **nicht nachgebessert**, sondern zurück zu
Thomas — dann ist die Deutung falsch und nicht nur ein Schritt davon.

## Abschlussbericht

Was geändert, Testergebnisse, was nicht ging und warum. Status am Ende auf
`IMPL_DONE`.

## Implementation Summary

- `src/v2/front.ts` bündelt die vollständige, Phaser-freie Flächenbilanz: zwei
  Fließkommawerte und `frontY`; gleiche Stärke hält die Linie, Mehrgewicht verschiebt
  sie. Ankommende Stromfiguren erhöhen ausschließlich den eigenen Flächenwert.
- `balanceV2.ts` enthält den roten Startvorrat, Frontposition, beide Bilanzraten und
  feste Bildvorräte. `RunGunV2Scene` füllt daraus den stehenden Zombie-Teppich und
  die blaue Reihe; Stromfiguren werden nur über `y <= frontY` eingesammelt.
- `tests/v2Front.test.ts` sichert Bilanzrichtung, Bildratenunabhängigkeit,
  Bruchteile ohne Rundungsverlust, die lineare Grenzlinie und in N3 die aus der
  Trapezfläche abgeleitete Bildanzahl für beide geschlossenen Flächen.
- Ausgeführt und grün: `npx tsc --noEmit`, `npm run build`, `npm test` (46 Dateien,
  463 Tests) sowie `git diff --check`. Der Build meldet nur die bekannte
  Vite-Chunkgrößenwarnung. Browser-Doppelstart und Bildvergleich mit `111.mov` sind
  gemäß Akzeptanzkriterium Claude vorbehalten und deshalb hier nicht ausgeführt.
- N4 stellt beide Flächen auf die kleine Skalierung `0.105` zurück und schließt sie
  ausschließlich über feste Vorräte (2.560 Gegner, 512 eigene Figuren). Die
  Flächenrechnungen mit 10 % Überlappung stehen direkt bei den Werten; die eigene
  Darstellung endet an `eigeneFlaecheMaxUntenY: 680` oberhalb der Starttruppe.
- Ergänzt ist der Test für die blaue maximale Trapezfläche und ihre Untergrenze.
  Ausgeführt und grün: `npx tsc --noEmit`, `npm run build`, `npm test` (46 Dateien,
  464 Tests) sowie `git diff --check`. Der Build meldet nur die bekannte
  Vite-Chunkgrößenwarnung. Eine reale 60-FPS-Messung und der Bildvergleich bleiben
  dem Browser-Nachweis vorbehalten und wurden hier nicht durchgeführt.

---

## NACHARBEIT N3 (Review 2026-09-20) — Dichte der Flächen

Die Mechanik ist belegt (Vorrat sinkt, Grenze wandert, Tests grün). Der Bildvergleich
mit dem Video zeigt aber einen klaren Unterschied, der beurteilt werden muss, bevor
Thomas über die Mechanik urteilen kann: **Im Video sind beide Flächen geschlossen —
man sieht keinen Boden zwischen den Figuren. Bei uns stehen sie so weit auseinander,
dass die Straße durchscheint.** Ein Urteil über die Mechanik wäre bei diesem Bild
verfälscht, weil die Optik ablenkt.

**Zu tun — nur Dichte und Farbe, keine Mechanik:**
1. `front.gegnerFigurenVorrat` und `front.eigeneFigurenVorrat` so erhöhen, dass die
   Flächen **geschlossen** wirken (Richtwert: Figuren überlappen sich leicht, kein
   Straßenhintergrund zwischen ihnen sichtbar). Die Figurenzahl folgt aus der zu
   füllenden Fläche geteilt durch die Figurenfläche — **Rechenweg als Kommentar**,
   keine geratene Zahl.
2. Die Bildrate muss dabei bei 60 bleiben. Falls die nötige Figurenzahl das gefährdet,
   stattdessen die Figuren größer skalieren, sodass weniger Figuren dieselbe Fläche
   schließen — auch das mit Rechenweg.
3. **Farbtrennung:** Im Video ist die eigene Seite blau, die gegnerische rot. Bei uns
   sind beide warm und schwer zu unterscheiden. Die Gegnerfiguren bekommen einen
   deutlich kälteren oder dunkleren Ton als die eigenen (Tint in `balanceV2.ts`, mit
   Begründung). Ein Tint wird mit der Bildfarbe multipliziert — Blau auf eine rötliche
   Figur ergibt Schwarz; das ist beim Wert zu berücksichtigen (`docs/lessons.md`).
4. Test in `tests/v2Front.test.ts`: Die Figurenzahl je Fläche ist **aus der
   Flächenrechnung hergeleitet** und deckt die Fläche rechnerisch vollständig ab.

Die Mechanik aus S4 bleibt unverändert.

---

## NACHARBEIT N4 (Review 2026-09-20) — Figuren zu groß

N3 hat die Flächen geschlossen, aber über den falschen Hebel: Die Figuren wurden
vergrößert. Im Bildvergleich steht jetzt ein grobes Gitter aus großen Zombies, wo im
Video eine **Masse aus vielen winzigen Punkten** ist. Außerdem reicht die eigene
Fläche bis unter die Starttruppe und überdeckt sie.

**Zu tun:**
1. Figurenskalierung **zurück auf klein** (Größenordnung der Werte vor N3, also rund
   `0.105`), und die Fläche stattdessen über die **Anzahl** schließen. Im Video sind
   je Fläche mehrere hundert Punkte sichtbar. Der Vorrat folgt weiterhin aus
   Flächenrechnung: `zu füllende Fläche ÷ Figurenfläche`, mit leichtem Überlappen —
   Rechenweg als Kommentar.
2. Bildrate muss bei 60 bleiben. Falls mehrere hundert Bilder je Fläche das gefährden:
   messen und den Wert so hoch wählen, wie es bei stabilen 60 geht, und den gemessenen
   Grenzwert als Kommentar hinterlegen.
3. **Die eigene Fläche endet oberhalb der Starttruppe.** Sie wächst von der Grenzlinie
   nach unten, aber höchstens bis `front.eigeneFlaecheMaxUntenY`, damit die Truppe am
   unteren Rand frei bleibt und sichtbar ist.

Mechanik unverändert.
