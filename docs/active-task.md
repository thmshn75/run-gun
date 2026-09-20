# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/S7 — Boss und Spielende

Verbindlicher Plan: `docs/plan-v6.md`, **zuerst lesen**, besonders den Abschnitt zum
zweiten Video. S1 bis S6 sind fertig und committet.

## Was gebaut wird

Der Abschluss: ein Boss am oberen Ende der Gegnermasse und beide Ausgänge.

1. **Boss:** sitzt am oberen Rand der Gegnerfläche, deutlich größer als die
   Massefiguren (Bildschlüssel `enemy-boss`), mit eigenem Zähler über dem Kopf. Er
   rückt mit der schrumpfenden Masse langsam nach unten — im Video wird er dadurch
   sichtbar größer.
2. **Reihenfolge:** Solange die Gegnerfläche Vorrat hat, nimmt die eigene Seite ihr
   Vorrat ab. Ist die Fläche leer, richtet sich der eigene Zustrom gegen den Boss und
   senkt dessen Zähler.
3. **Sieg:** Boss-Zähler auf null → Anzeige "GESCHAFFT", danach zurück ins Menü.
4. **Niederlage:** Eigene Fläche und Truppe auf null → Anzeige "VERLOREN", danach
   zurück ins Menü. Im zweiten Video endet der Lauf genau so: Die blaue Fläche wird
   aufgerieben, übrig bleiben Truppe und rote Masse.
5. **Kein Speicherzugriff**, kein Konto, keine Bestenliste — V2 bleibt ein reiner
   Probelauf.

## Grenzen

- Alles in `src/v2/`. Keine Fremdimporte, kein `localStorage`, kein `indexedDB`.
- Keine Physik, keine Collider — Zahlenvergleiche wie in S4 bis S6.
- **Bruchteile sammeln**, nur die Anzeige rundet (wie S4).
- **Der Ausgang wird genau einmal ausgelöst.** Ein Zustandsfeld, das in `create()`
  zurückgesetzt wird; kein mehrfaches Starten der Menü-Rückkehr.

## Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm run build`, `npm test` sauber; bestehende Tests grün
   (derzeit 472).
2. Reine Rechenfunktionen in `src/v2/ende.ts`, ohne Phaser.
3. Tests in `tests/v2Ende.test.ts`:
   - Solange Vorrat da ist, sinkt **nur** der Vorrat, nicht der Boss.
   - Ist der Vorrat null, sinkt der Boss-Zähler mit derselben Bilanzrechnung.
   - Sieg genau bei Boss ≤ 0, Niederlage genau bei eigener Seite ≤ 0.
   - **Der Ausgang löst genau einmal aus**, auch wenn die Bedingung viele Bilder lang
     erfüllt bleibt.
   - Bildratenunabhängigkeit wie in S4 (20×16 ms gleich 10×32 ms).
4. **Browser-Nachweis** (führe ich, Claude, danach selbst): **beide** Ausgänge je
   einmal erreicht und die Rückkehr ins Menü belegt; Doppelstart identisch.

## Abschlussbericht

Was geändert, Testergebnisse, was nicht ging und warum. Status am Ende auf
`IMPL_DONE`.

## Implementation Summary

- `src/v2/ende.ts` bildet den Vorrat der roten Fläche und danach den Boss-Vorrat als
  reine, Phaser-freie Bruchteilrechnung ab; der Ausgang wird über ein Einmal-Gate
  bestimmt.
- Die V2-Szene zeigt den großen `enemy-boss` mit eigenem Zähler, lässt ihn beim
  Schrumpfen der roten Fläche nach unten wachsen und zeigt einmalig `GESCHAFFT` oder
  `VERLOREN`, bevor sie ins Menü zurückkehrt.
- Prüfläufe: `npx tsc --noEmit`, `npm run build` und `npm test` grün (49 Dateien,
  477 Tests). Der spezifizierte Browser-/Doppelstartnachweis bleibt bei Claude.
- N5: Ist die blaue Fläche leer, wird die Truppe als Bruchteilwert vom roten Druck
  aufgebraucht; ihr sichtbarer Zähler rundet nur. Die neue Balance liefert ohne
  Eingabe rechnerisch die Niederlage im verlangten Zeitfenster, links knapp den Sieg
  und rechts mit freigeschaltetem Tor deutlich den Sieg; beides ist in `v2Ende` ohne
  Phaser geprüft.

---

## NACHARBEIT N5 (Review 2026-09-20) — Niederlage unerreichbar, Sieg geschenkt

Der Browser-Nachweis zeigt zwei Lücken, die beide die Mechanik betreffen:

**1. Die Niederlage kann nicht eintreten.** Gemessen: Ohne jede Eingabe (Truppe bleibt
bei 10) sinkt die Gegnermasse von 857 auf 0 und der Boss fällt — nach 54 Sekunden
endet der Lauf mit einem Sieg. Die eigene Truppe wurde dabei **kein einziges Mal
kleiner**. Es gibt schlicht keinen Weg, auf dem die Gegnerseite die eigene Truppe
verringert; `verlustProVorratProSek` zehrt nur an der vorgeschobenen Fläche, und die
wächst durch den Strom sofort nach.

Im zweiten Video (112.mov) endet der Lauf genau andersherum: Die blaue Fläche wird
aufgerieben, übrig bleiben Truppe und rote Masse.

**Zu tun:** Ist die eigene Fläche aufgebraucht und die Gegnermasse noch vorhanden,
zehrt der gegnerische Druck **an der Truppe selbst** — sie schrumpft mit derselben
Bilanzrechnung, Bruchteile gesammelt. Truppe auf null → Niederlage. Ein Test prüft
diese Kette: volle Gegnermasse, keine Zufuhr, Fläche fällt auf null, danach sinkt die
Truppe, danach Niederlage.

**2. Der Sieg ist geschenkt.** Eine Startruppe von 10 darf eine Masse von 857 nicht
besiegen, ohne dass der Spieler etwas tut — sonst haben die +1- und +99-Ränder und das
Tor keinen Sinn. Die Werte in `balanceV2.ts` sind so zu wählen, dass gilt:
- **ohne jede Eingabe:** Niederlage, und zwar in 20 bis 40 Sekunden;
- **wer nur links (+1) sammelt:** knapp, Ausgang offen;
- **wer rechts (+99) sammelt und das Tor freischaltet:** deutlicher Sieg.

Der Rechenweg gehört als Kommentar an die Werte: Zustrom je Sekunde gegen Abbau je
Sekunde, für jeden der drei Fälle einmal durchgerechnet. Ein Test hält die drei Fälle
fest, indem er die Bilanzfunktion über die entsprechende Zeit laufen lässt — ohne
Phaser, rein rechnerisch.

Alles andere aus S7 bleibt.
