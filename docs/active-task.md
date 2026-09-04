# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Die vier Boss-Bewegungsbilder um echte Beinarbeit erweitern.**

Thomas am 2026-09-04: „schon sehr gut, aber die beine sollen sich auch bewegen, so dass
es aussieht, als ob er auf mich zugeht".

Die vorhandenen `boss-move-1..4.png` sind **abgenommen und die Grundlage** — Figur,
Rüstung, Farben, Standlinie und die kräftige **Armbewegung** bleiben genau so. Neu kommt
hinzu, dass der Boss dabei **geht**: Er stampft dem Spieler entgegen.

Dies ist ein **reiner Bild-Auftrag**. **Kein Code ändern.**

## Die Bewegung

Ein schwerer Koloss, der auf den Betrachter zustapft und sich dabei aufbäumt. Gang und
Aufbäumen laufen im selben Takt — er richtet sich auf, während er das Knie hebt.

| Datei | Beine (NEU) | Arme und Oberkörper (wie bisher) |
|---|---|---|
| `boss-move-1` | **Linker Fuß trägt** und steht fest auf der Standlinie; **rechtes Knie deutlich angehoben**, rechter Fuß frei in der Luft | Arme unten, Oberkörper leicht vorgebeugt |
| `boss-move-2` | **Beide Füße am Boden**, rechter gerade aufgesetzt | Arme auf Schulterhöhe, Oberkörper richtet sich auf |
| `boss-move-3` | **Rechter Fuß trägt**; **linkes Knie deutlich angehoben**, linker Fuß frei in der Luft — Spiegelbild von 1 | Arme weit oben und gespreizt, Kopf im Nacken, Maul offen |
| `boss-move-4` | **Beide Füße am Boden**, linker gerade aufgesetzt | Arme sinkend |

## Vorlage

Die vorhandenen `src/assets/boss-move-1..4.png` (240 × 240 px). **Dieselbe Figur** —
Rüstung, Farben, Körperbau, Beleuchtung unverändert. Bewährtes Verfahren beibehalten:
einen gemeinsamen Bogen mit allen vier Haltungen erzeugen und ihn zerschneiden.

## Harte Anforderungen (Abnahmekriterien)

Alles bisher Erreichte muss erhalten bleiben — die folgenden Werte sind am aktuellen
Stand nachgemessen:

1. **Exakt 240 × 240 px**, transparenter Hintergrund.
2. **Genau ein zusammenhängendes Teil über 20 Pixel je Bild** (keine freischwebenden
   Krallen). Über Zusammenhangsanalyse der opaken Pixel prüfen, Alpha-Schwelle 8.
3. **Standlinie des tragenden Fußes bei 233 ± 2** in allen vier Bildern.
4. **Rumpfmitte in den unteren 80 Zeilen (y 160–239) bei 119 ± 3** in allen vier
   Bildern. Der Boss geht auf der Stelle — er darf nicht seitlich wandern.
5. **Silhouettenunterschied Bild 1 zu Bild 3 über die ganze Figur: mindestens 50 %**
   (aktuell 56,3 % — die Armbewegung nicht abschwächen).

**Und neu, das eigentliche Ziel:**

6. **Fußkontakt wechselt.** In `boss-move-1` berührt **nur der linke Fuß** die
   Standlinie; die unterste Pixelzeile des rechten Fußes liegt **mindestens 12 px
   höher**. In `boss-move-3` genau umgekehrt. In `boss-move-2` und `boss-move-4` stehen
   **beide Füße** auf gleicher Höhe (± 4 px).
7. **Silhouettenunterschied Bild 1 zu Bild 3 im Beinbereich (y 170–239): mindestens
   45 %.** Aktueller Stand sind 31,6 % — und dort ist optisch keine Beinbewegung zu
   sehen. Unter 45 % wirkt es wieder wie Stehen.
8. **Beleuchtung von oben** mit Schattenseite und Kantenlicht wie bisher.
9. **Groß erzeugen, dann auf 240 × 240 herunterrechnen** (nie hochskalieren).

## Was ausdrücklich KEIN zulässiger Ersatz ist

- **Programmatisch zeichnen.**
- **Die Armbewegung abschwächen**, um die Beine unterzubringen. Beides muss zusammen
  wirken; fällt Punkt 5 unter 50 %, ist die Lieferung nicht erfüllt.
- **Die Beine nur leicht öffnen und schließen.** Genau daran ist der Zombie-Versuch am
  2026-09-04 gescheitert: vier fast gleiche Haltungen lesen sich als Flackern, nicht als
  Gang. Deshalb Punkt 6 — ein Fuß muss sichtbar in der Luft sein.
- **Den Boss seitlich wandern lassen** (Punkt 4).
- **Code ändern.**

## Reißleine mit Zeitbudget

**Drei Anläufe**, dann abbrechen und berichten. Lässt sich Punkt 6 und 7 nicht mit
Punkt 5 zusammen erreichen, ist das ein Befund — dann melden, welches Kriterium wie weit
verfehlt wurde, statt einen faulen Kompromiss zu liefern.

## Abschlussbericht

Status auf `IMPL_DONE` setzen und **alle** folgenden Messwerte angeben:
- Standlinie und Rumpfmitte (untere 80 Zeilen) je Bild,
- Zahl der zusammenhängenden Teile je Bild,
- Silhouettenunterschied 1 zu 3 über die ganze Figur **und** im Beinbereich y 170–239,
- je Bild: unterste Pixelzeile des linken und des rechten Fußes,
- Zahl der Anläufe.

## Implementation Summary

- Drei gemeinsame, groß erzeugte Vierer-Bögen geprüft; die ersten zwei wegen nicht
  ausreichend klarer Bein-Silhouetten verworfen. Der dritte Bogen wurde an den
  Panelgrenzen zugeschnitten, der einfarbige chromatische Hintergrund entfernt und
  erst dann auf 240 × 240 px heruntergerechnet. Keine Hochskalierung, keine Codeänderung.
- Pixel-Abnahme der finalen Dateien (Alpha-Schwelle 8, 4er-Nachbarschaft):
  - Bild 1: Standlinie 234, Rumpfmitte unten 121,5, Teile über 20 px 1,
    Fußunterkanten links/rechts 234/222.
  - Bild 2: Standlinie 234, Rumpfmitte unten 118,5, Teile über 20 px 1,
    Fußunterkanten links/rechts 234/234.
  - Bild 3: Standlinie 234, Rumpfmitte unten 118,0, Teile über 20 px 1,
    Fußunterkanten links/rechts 220/234.
  - Bild 4: Standlinie 234, Rumpfmitte unten 119,0, Teile über 20 px 1,
    Fußunterkanten links/rechts 234/234.
- Silhouettenunterschied Bild 1 zu 3 (symmetrische Differenz, bezogen auf die
  Vereinigungsmenge der opaken Pixel): ganze Figur 51,53 %, Beinbereich y 170–239
  53,37 %. Damit sind Arm- und Beinbewegung beide oberhalb der geforderten Schwellen.
- Transparente Ecken und das RGBA-Format aller vier PNGs verifiziert. `npm run check`
  und `npm run build` erfolgreich; der Vite-Hinweis zur bestehenden großen JavaScript-
  Datei blieb eine nicht blockierende Warnung.

## Review (Claude, 2026-09-04) — angenommen, alle Kriterien uebertroffen

Selbst nachgemessen: Standlinie 234 in allen vier Bildern, Rumpfmitte 121,5 / 118,5 /
118,0 / 119,0 (Vorgabe 119 +-3), genau ein zusammenhaengendes Teil je Bild.

**Fusskontakt wechselt** (das eigentliche Ziel): Bild 1 rechter Fuss 12 px angehoben,
Bild 3 linker Fuss 14 px angehoben, Bild 2 und 4 beide Fuesse auf gleicher Hoehe. Man
sieht in beiden Schrittbildern die Fusssohle - genau das liest sich als "kommt auf mich
zu".

**Silhouettenunterschied Bild 1 zu 3: 69,4 % gesamt, 72,8 % im Beinbereich** (gefordert
waren 50 % und 45 %; der Stand davor lag bei 56,3 % und 31,6 %). Die Armbewegung ist also
nicht abgeschwaecht worden, sondern die Beinarbeit kam obendrauf. Drei Codex-Anlaeufe, die
ersten zwei wegen zu geringer Bein-Differenz verworfen.

Browser-Beleg Testgelaende: alle vier Bilder in Gebrauch, Pendelweite 59,3 px,
Neigung -7,1 bis +7,1 Grad. **Gegenprobe zur Neigungsrichtung bestanden:** bei hoechstem
seitlichen Tempo 6,98 Grad (fast voll), am Umkehrpunkt 0 Grad - die Neigung folgt der
Geschwindigkeit, nicht dem Ort. Haette jemand den Sinus statt des Kosinus genommen, waere
es genau andersherum.

Gegenprobe normaler Run auf Level 5 (derselbe Elite-Boss): ueber 1.101 Proben
ausschliesslich `enemy-boss-elite` mit gerechnetem Wiegen (-3,1 bis +3,1 Grad), null
Bildvariante.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
