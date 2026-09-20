# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/S3 — Der Strom

Verbindlicher Plan: `docs/plan-v6.md`. **Zuerst lesen.** S1 (Gerüst, Bahn) und S2
(Truppe, Steuerung) sind fertig und committet — beides bleibt unverändert.

## Was gebaut wird

Aus der Truppe lösen sich **laufend Figuren**, die nach oben Richtung Horizont laufen.

1. **Rate**: `figurenProSekunde(truppengroesse)` — je größer die Truppe, desto mehr
   Figuren je Sekunde, mit einer Obergrenze aus `balanceV2.ts`. Die Formel steht als
   reine Funktion in `src/v2/strom.ts` und ist ohne Phaser prüfbar.
2. **Startort**: an der Truppe, mit leichter Streuung über deren Breite, damit kein
   Gänsemarsch entsteht.
3. **Bewegung**: geradlinig nach oben mit festem Tempo aus `balanceV2.ts`. Die Figur
   wird eingesammelt, sobald sie den Horizont erreicht.
4. **Darstellung**: Bildschlüssel `player`, kleiner skaliert als die Truppenfiguren,
   damit die Tiefe stimmt. Ein Objekt-Vorrat fester Größe, keine Erzeugung zur
   Laufzeit — der Vorrat wird aus Rate × Laufdauer hergeleitet und der Rechenweg als
   Kommentar hingeschrieben.

## Ausdrücklich NICHT in diesem Schritt

Kein Gegner, keine Front, kein Kampf, kein Tor. Die Figuren laufen einfach bis zum
Horizont und verschwinden. Alles Weitere kommt in S4.

## Grenzen (unverändert)

- Alles in `src/v2/`. Keine Importe aus `src/systems/`, `src/config/balance`,
  `src/scenes/`. Kein `localStorage`, kein `indexedDB`.
- **Kein Zurücklesen abgeleiteter Werte.** Position, Laufhöhe und Zustand jeder Figur
  werden getrennt geführt; eine dargestellte Position wird nie wieder als Eingabe für
  die nächste Rechnung benutzt. Das ist die Fehlerklasse aus `docs/lessons.md`
  (2026-09-20) und aus der Nacharbeit N2 von S2 — sie darf hier nicht wieder
  entstehen.
- Bestehende Dateien außerhalb `src/v2/` werden **gar nicht** angefasst.

## Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm run build`, `npm test` sauber; bestehende Tests grün
   (derzeit 455).
2. Tests in `tests/v2Strom.test.ts`:
   - `figurenProSekunde` ist monoton steigend und respektiert die Obergrenze; für drei
     Truppengrößen sind die Werte fest zugesichert.
   - **Vorrat reicht:** Die hergeleitete Vorratsgröße ist größer als
     `maximaleRate × Laufdauer` (Laufdauer = Strecke ÷ Tempo, beides aus
     `balanceV2.ts`). Der Test rechnet das nach, statt eine Zahl zu behaupten.
   - **Tempo-Treue:** Eine Figur legt bei `dt = 1000 ms` genau `tempoPxProSek` Pixel
     zurück — und zwar auch dann, wenn ihre dargestellte Position durch einen
     Darstellungs-Versatz (z. B. Wippen) verändert wurde. Dieser Test ist Pflicht: Im
     alten Torlauf liefen die Figuren dadurch 3,5-fach zu schnell.
3. **Browser-Nachweis** (führe ich, Claude, danach selbst):
   - Figuren erscheinen laufend und laufen nach oben; gemessene Rate stimmt mit der
     Formel überein (Zählung über mehrere Sekunden).
   - Gemessenes Tempo stimmt mit `tempoPxProSek` überein (Position einer Figur über
     Zeit).
   - Keine Vorratswarnung in der Konsole.
   - **Doppelstart** Menü → V2 → Menü → V2: Rate und Tempo im zweiten Lauf identisch.

## Abschlussbericht

Was geändert, Testergebnisse, was nicht ging und warum. Status am Ende auf
`IMPL_DONE`.

## Implementation Summary

- `src/v2/strom.ts` ergänzt die Phaser-freie Ratenformel, Laufdauer sowie strikt
  getrennte Logik- und Darstellungspositionen.
- `balanceV2.ts` enthält Tempo, Streuung und den festen 28er-Vorrat; dessen
  Rechnung (`floor(8 * (602 / 180)) + 2`) steht direkt bei der Konfiguration.
- `RunGunV2Scene` hält den Vorrat über Szenenstarts sauber zurückgesetzt, startet
  Figuren gestreut an der Truppe und sammelt sie am Horizont wieder ein.
- `tests/v2Strom.test.ts` prüft Rate, Vorrat und Tempo trotz Darstellungsversatz.
  `npx tsc --noEmit`, `npm run build` und `npm test` sind grün (45 Dateien,
  458 Tests). Der Browser- und Doppelstartnachweis ist ausdrücklich Claude
  vorbehalten und wurde hier nicht durchgeführt.
