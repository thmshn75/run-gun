# Active Task

## Status
`IMPL_DONE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Stand des Reviews (2026-09-19)

**Code-Review bestanden nach Nacharbeit N4.** Eigenes System `Strom` mit Pool 200 und
Spurformel aus dem Projektilpfad, dritter Dispatch-Zweig in `handleCombatOverlap` vor
Projektil und Huelle, Kopien erben die Platten-Markierung, +1-Kacheln links, kein
×-Paar innerhalb 1100 px, Guard in `collectPickup`, Nachschub nach jedem Levelstart aus,
`cleared`-Sprung mit eigener Levelzaehlung, Feuer-Schalter in `Weapons`, Waffen-HUD
aus. `npm run check`, `npm test` (41 Dateien, 436 Tests), `npm run build` gruen, im
Terminal nachgelaufen.

**A10 — Bot-Messung, selbst durchgefuehrt (Playwright, Vite-Dev, 390x844):**

| Messung | Ergebnis |
|---|---|
| Torlauf L5, Quelle 10, Bot lenkt auf das bessere Tor, 9 Paare | ×2-Pfeiler mit -13 faellt in **2,5 s**; Quelle **10 → 61 in 47 s** (vor allem +1/s ueber die Kacheln, dazu +N-Tore); keine Projektile aktiv; hoechstens 22 Strom-Figuren gleichzeitig |
| Bildzeit, Quelle 60, Torlauf-Level in der Gegnerphase, 20 s | **Median 16,7 ms, p95 18,1 ms**, 1201 Bilder, 0 Pool-Warnungen |
| **Zweiter Start in derselben Sitzung (vor N4)** | **0 Treffer** bei 136 geometrischen Ueberlappungen — Collider zeigte auf die Gruppen des vorigen Laufs |
| Zwei Starts in derselben Sitzung (**nach N4**) | Lauf 1: **77** Treffer, Lauf 2: **76** Treffer, Quelle je 40 → 49 in 8 s |

**Gemessene Flugzeit ~0,8 s** (nicht 1,9 s wie in der Spec geschaetzt) — Pool 200 hat
sehr viel Reserve, Kommentar am Pool nachgezogen. Die ×3-Vervielfachung konnte im
Lastfall nicht sichtbar gemacht werden, weil die erzwungene Platte nahe am Horizont
lag und die Kopien sofort recycelt wurden; die Logik ist ueber `hitSpawnIds` und Tests
abgesichert, der Lastfall bleibt eine Sichtpruefung fuer E3.

**Bekannte Eigenheit, keine Aenderung:** Die +1-Kacheln am linken Rand werden fast immer
eingesammelt, weil die 214-px-Formation Figuren bis an den linken Rand losschickt —
+1/s Grundwachstum unabhaengig von der Lenkung. Balance-Thema fuer E3, wenn die Horde
Verlust bringt.

**Offen: A11 — Thomas' iPhone-Test** (Strom liest sich als losgeschickte Einheiten,
Pfeiler fallen unter dem Strom, ×2 verdoppelt die Dichte, +1 zaehlt; und N1.4
Wipptakt). Bis dahin `IMPL_DONE`, nicht `APPROVED`. **E2b (Pfeiler-Bilder) offen.**

---

## NACHARBEIT N5 (2026-09-19, Thomas nach dem E2r-Bericht): Kacheln fuers Team, Strom als Welle

Thomas: "die plus 1 waende soll man mit dem team erreichen damit sie zaehlen, nicht
'abschiessen', und die abgeschossenen teams nicht einzeln sondern als welle".

**N5.1 — +1-Kacheln zaehlen nur, wenn die Truppe sie erreicht.**
- `handleStromTreffer`: Kacheln werden **ignoriert** (Figur laeuft durch, kein +1, keine
  Recycling).
- `handleCombatOverlap`, Huellen-Zweig: statt `if (istKachel) return` wird die Kachel
  eingeloest — Quelle +1 ueber `applyTorlaufReinforcement(1, …)`, Kachel recycelt. Wie
  die Sammelbahn des Runs: Durchfahren genuegt. Die Kacheln liegen am linken Rand;
  wer die Quelle dorthin lenkt, sammelt, wer rechts bleibt, nicht — **das ist die
  Entscheidung links (+1-Kette) gegen rechts (Pfeiler)**, genau wie im Video.
- Tests: Strom-Treffer auf Kachel aendert N nicht; Huellen-Kontakt mit Kachel gibt +1
  und recycelt sie (Handler-Tests mit Stubs, kein Quelltextmuster).

**N5.2 — Der Strom laeuft in Wellen.**
- `Strom.update` sammelt die Figuren des Akkumulators und gibt sie **alle
  `torlauf.strom.wellenIntervallMs`** (Vorschlag **1200 ms**, Rechenweg: bei 24/s sind
  das ~29 Figuren je Welle, bei 4/s ~5; das Video zeigt Reihen von 10-30) als **eine
  Reihe** ab: nebeneinander ueber die aktive Formationsbreite verteilt (Startpunkte
  aus `getNextSalvoPositions(anzahl)` — die rotierenden Figurenpositionen der
  vordersten Reihen), gleiche Startzeit, gleiches Tempo. Zwischen den Wellen laeuft
  nichts los.
- Die Rate selbst (`figurenProSek`) bleibt; nur die Abgabe buendelt sich. Pool-Deckel
  wie gehabt; eine Welle, die nicht in den Pool passt, wird gekuerzt (DEV-Warnung).
- Test: bei N=60 und 1200 ms Intervall entstehen je Welle ~29 Figuren, dazwischen 0;
  Positionen der Welle liegen auf einer Hoehe und ueber die Breite verteilt.

**N5.3** `npm run check`, `npm test`, `npm run build` gruen. Kein Verhalten der
Pfeiler/Platten aendern.

## Stand des Reviews N5/N6 (2026-09-19)

**Beide bestanden, im Browser belegt (je zwei Starts in derselben Sitzung, Lesson
2026-09-19).**

- **N5 Wellen:** Spawns exakt alle 1200 ms in Buendeln von 12-18 Figuren, dazwischen
  keine — in beiden Laeufen identisch.
- **N5 Kacheln:** Der Strom loest keine Kachel mehr ein; die Truppenhuelle sammelte
  je Lauf 7 Kacheln (Quelle 40 → 47). Pfeilertreffer laufen unveraendert.
- **N6 Kachelgroesse:** vorher quadratisch mit der Segmenthoehe (bis fast zur
  Bahnmitte, von Thomas als "Waende in der Mitte" gemeldet), jetzt 14-27 px breit und
  7-14 px hoch am linken Aussenrand. Rechtskante auf Kampfhoehe bei x=31 gegen
  Bahnmitte 195 — die 214 px breite Formation passt frei daneben. **Strom-Kontakte mit
  Kacheln: 390/s → 0/s**, eine eigene Physik-Gruppe ist damit nicht noetig.
- Bildzeit unveraendert: **Median 16,7 ms**, p95 17,6 ms, Quelle 60.
- `npm run check`, `npm test` (41 Dateien, 439 Tests), `npm run build` gruen.

**Angemerkt, nicht behoben:** Die Kacheln liegen am Horizont knapp neben der
Strassenkante statt darauf (perspektivischer Rand); faellt am iPhone nicht auf, gehoert
aber in E3 mitgenommen, wenn die Bahn ohnehin angefasst wird. Ausserdem castet
`handleStromTreffer` `this.walls as Torbahn` ohne `instanceof` — funktional sicher
(den Collider gibt es nur im Torlauf), aber beim naechsten Anfassen zu haerten.

**Offen: A11 — Thomas' iPhone-Test** (Strom als Wellen, Kacheln nur ueber das Team,
Mitte frei; plus N1.4 Wipptakt). **E3 (Horde) ist der naechste Bau.**
