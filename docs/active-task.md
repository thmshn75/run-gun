# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/S8 — Politur nach dem Videobild

Verbindlicher Plan: `docs/plan-v6.md`, **zuerst lesen**, besonders den Abschnitt zum
zweiten Video (112.mov). S1 bis S7 sind fertig und committet; die Mechanik steht und
ist von Thomas freigegeben. **An der Mechanik wird nichts geändert** — dieser Schritt
betrifft nur, wie es aussieht.

## Was geändert wird

Der Bildvergleich mit dem Video zeigt vier Abweichungen:

1. **Farben.** Im Video ist die eigene Seite kräftig **blau**, die gegnerische kräftig
   **rot**. Bei uns ist die Gegnerfläche so dunkel getönt, dass sie fast schwarz wirkt,
   und die eigene Seite ist rötlich — beide Seiten sind kaum zu unterscheiden.
   - Eigene Figuren (Truppe, Strom, eigene Fläche): deutlich blau.
   - Gegnerfläche und Boss: deutlich rot, **nicht dunkel**.
   - **Achtung:** Ein Tint wird mit der Bildfarbe multipliziert, er ersetzt sie nicht.
     Auf einer rötlichen Vorlage ergibt ein blauer Tint Schwarz. Wo ein Tint nicht zum
     Ziel führt, sind die Werte entsprechend heller zu wählen und das Ergebnis im
     Browser zu prüfen — nicht nur rechnerisch.

2. **Kampfeffekte an der Front.** Im Video sitzen an der Grenzlinie dauerhaft weiße
   Partikelwolken, solange gekämpft wird. Ohne sie wirkt die Grenze wie eine
   Trennlinie statt wie ein Kampf. Ein kleiner Partikeleffekt entlang der Grenze,
   der nur läuft, wenn beide Seiten dort etwas verlieren.

3. **Zahlen.** Der Gegnerzähler sitzt im Video groß über der Masse, der Bosszähler
   über dem Boss, die Truppengröße über der Truppe. Prüfen, dass sich nichts
   überlagert und alle Zahlen auf dem iPhone-Hochformat lesbar sind.

4. **Boss-Animation.** Im Video wechselt der Boss sichtbar die Pose. Falls im
   Bildbestand mehrere Boss-Bilder vorliegen (`enemy-boss`, `enemy-boss-elite`),
   zwischen ihnen in ruhigem Takt wechseln. Nur wenn vorhanden — keine neuen Bilder
   erfinden.

## Grenzen

- Alles in `src/v2/`. Keine Fremdimporte, kein Speicherzugriff.
- **Keine Änderung an der Bilanzrechnung, den Zahlen der Balance oder den Abläufen.**
  Wenn ein Wert für die Optik angepasst werden muss (z. B. Figurengröße), gehört der
  Rechenweg als Kommentar dazu.
- Bildrate bleibt bei 60, auch mit Partikeln. Wird sie unterschritten, wird der Effekt
  sparsamer gebaut — nicht die Menge der Figuren reduziert.

## Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm run build`, `npm test` sauber; bestehende Tests grün
   (derzeit 479).
2. Test in `tests/v2Optik.test.ts`: Die Farbwerte für eigene und gegnerische Seite
   liegen in klar getrennten Bereichen (eigener Ton blaulastig, gegnerischer rotlastig)
   — prüfbar über die Farbkanäle der Werte aus `balanceV2.ts`.
3. **Browser-Nachweis** (führe ich, Claude, danach selbst): Bildvergleich mit dem
   Video; blaue und rote Seite klar unterscheidbar; Partikel an der Front sichtbar;
   60 Bilder je Sekunde; Doppelstart identisch.

## Abschlussbericht

Was geändert, Testergebnisse, was nicht ging und warum. Status am Ende auf
`IMPL_DONE`.

## Implementation Summary

- Eigene Truppe, Strom und Front werden klar blau, Gegnerfläche und Boss klar rot
  dargestellt; die Volltönung vermeidet die dunkle Mischfarbe der rötlichen Vorlage.
- 24 wiederverwendete weisse Partikel bilden während eines laufenden Flächenkampfs
  eine bewegte Wolke direkt an der Grenzlinie; Bilanz und Abläufe bleiben unverändert.
- Der Boss wechselt alle 700 ms zwischen den vorhandenen Bossbildern; die drei Zähler
  sind getrennt über Truppe, Gegnerfläche und Boss positioniert.
- `tests/v2Optik.test.ts` prüft die klar getrennten Blau-/Rot-RGB-Bereiche.
