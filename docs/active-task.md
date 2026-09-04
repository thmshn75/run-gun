# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Vier Bewegungsbilder für den GEWÖHNLICHEN Boss erzeugen** — dasselbe wie für den
Elite-Boss, aber mit der anderen Figur.

Thomas am 2026-09-04 gibt die Boss-Bildbewegung für die normalen Runs frei und fragt
selbst: „müssen die normalen Bosse für level 1-4 usw. noch gemacht werden?" — Ja. Die
vorhandenen `boss-elite-move-1..4.png` sind aus `enemy-boss-elite.png` erzeugt. Der
gewöhnliche Boss (Level 1–4, 6–9, 11–14 …) hat mit `enemy-boss.png` ein **eigenes
Aussehen, das er behalten soll** — er darf nicht plötzlich wie der Elite aussehen.

Dies ist ein **reiner Bild-Auftrag**. **Kein Code ändern.**

## Was genau zu liefern ist

Vier PNG-Dateien nach `src/assets/`: `boss-basic-move-1.png` bis `boss-basic-move-4.png`.

**Vorlage ist `src/assets/enemy-boss.png`** (240 × 240 px) — der gewöhnliche Boss, NICHT
der Elite. Rüstung, Farben, Körperbau und Beleuchtung dieser Figur bleiben unverändert.

## Die Bewegung — exakt wie beim Elite-Boss

Ein schwerer Koloss, der auf den Betrachter zustapft und sich dabei aufbäumt. Gang und
Aufbäumen laufen im selben Takt.

| Datei | Beine | Arme und Oberkörper |
|---|---|---|
| `boss-basic-move-1` | **Linker Fuß trägt** und steht fest auf der Standlinie; **rechtes Knie deutlich angehoben**, rechter Fuß frei in der Luft, Fußsohle zum Betrachter | Arme unten, Oberkörper leicht vorgebeugt |
| `boss-basic-move-2` | **Beide Füße am Boden**, rechter gerade aufgesetzt | Arme auf Schulterhöhe, Oberkörper richtet sich auf |
| `boss-basic-move-3` | **Rechter Fuß trägt**; **linkes Knie deutlich angehoben**, linker Fuß frei in der Luft — Spiegelbild von 1 | Arme weit oben und gespreizt, Kopf im Nacken, Maul offen |
| `boss-basic-move-4` | **Beide Füße am Boden**, linker gerade aufgesetzt | Arme sinkend |

**Zum Vergleich anschauen:** `src/assets/boss-elite-move-1..4.png` zeigen genau diese
Bewegung, sie sind abgenommen. Die neuen Bilder sollen dieselbe Bewegung mit der anderen
Figur zeigen.

Bewährtes Verfahren beibehalten: **einen gemeinsamen Bogen mit allen vier Haltungen
erzeugen und ihn zerschneiden** — so bleibt die Figur über die vier Bilder konstant.

## Harte Anforderungen (Abnahmekriterien)

Alle Werte sind am abgenommenen Elite-Satz nachgemessen und dort erfüllt:

1. **Exakt 240 × 240 px**, transparenter Hintergrund.
2. **Genau ein zusammenhängendes Teil über 20 Pixel je Bild** (keine freischwebenden
   Krallen). Zusammenhangsanalyse der opaken Pixel, Alpha-Schwelle 8.
3. **Standlinie des tragenden Fußes bei 234 ± 2** in allen vier Bildern.
4. **Rumpfmitte in den unteren 80 Zeilen (y 160–239) bei 119 ± 3** in allen vier
   Bildern — der Boss geht auf der Stelle und wandert nicht seitlich.
5. **Fußkontakt wechselt** — das ist das eigentliche Ziel und der Punkt, an dem zwei
   frühere Anläufe gescheitert sind: In Bild 1 berührt **nur der linke Fuß** die
   Standlinie, die unterste Pixelzeile des rechten Fußes liegt **mindestens 12 px
   höher**. In Bild 3 genau umgekehrt. In Bild 2 und 4 stehen **beide Füße** auf
   gleicher Höhe (± 4 px).
6. **Silhouettenunterschied Bild 1 zu Bild 3: mindestens 50 % über die ganze Figur und
   mindestens 45 % im Beinbereich (y 170–239).** Der Elite-Satz erreicht 69 % und 73 %.
7. **Beleuchtung von oben** mit Schattenseite und Kantenlicht wie bei der Vorlage.
8. **Groß erzeugen, dann auf 240 × 240 herunterrechnen** (nie hochskalieren).

## Was ausdrücklich KEIN zulässiger Ersatz ist

- **Den Elite-Boss als Vorlage nehmen** oder die vorhandenen `boss-elite-move-*.png`
  umfärben. Der gewöhnliche Boss ist eine eigene Figur und muss als solche erkennbar
  bleiben.
- **Programmatisch zeichnen.**
- **Die Beine nur leicht öffnen und schließen** — daran sind der Zombie-Versuch und zwei
  Anläufe beim Elite gescheitert. Ein Fuß muss sichtbar in der Luft sein (Punkt 5).
- **Die Armbewegung abschwächen**, um die Beine unterzubringen. Beides zusammen, sonst
  fällt Punkt 6.
- **Code ändern.**

## Reißleine mit Zeitbudget

**Drei Anläufe**, dann abbrechen und berichten, welches Kriterium wie weit verfehlt
wurde.

## Abschlussbericht

Status auf `IMPL_DONE` setzen und **alle** Messwerte angeben:
- Standlinie und Rumpfmitte (untere 80 Zeilen) je Bild,
- Zahl der zusammenhängenden Teile je Bild,
- unterste Pixelzeile des linken und des rechten Fußes je Bild,
- Silhouettenunterschied 1 zu 3 gesamt **und** im Beinbereich y 170–239,
- Zahl der Anläufe.

## Review (Claude, 2026-09-04) — angenommen

Selbst nachgemessen: Standlinie 234 in allen vier Bildern, Rumpfmitte 119,5 / 118,0 /
121,5 / 119,0 (Vorgabe 119 +-3), genau ein zusammenhaengendes Teil je Bild.
**Fusskontakt wechselt:** Bild 1 rechter Fuss 13 px angehoben, Bild 3 linker Fuss 17 px,
Bild 2 und 4 Unterschied 2 bzw. 3 px. Silhouettenunterschied Bild 1 zu 3: **65,2 %
gesamt, 59,5 % im Beinbereich** (gefordert 50 % und 45 %). Drei Codex-Anlaeufe.

Es ist erkennbar die richtige Figur - der gewoehnliche gruene Boss, nicht der Elite.

**Ein Verdacht hat sich NICHT bestaetigt:** Im Kontaktbogen fiel ein blaeulicher Saum um
die Figuren auf. Nachgemessen am Randpixel-Mittelwert hat die abgenommene Vorlage
`enemy-boss.png` selbst einen Blaustich von +56, die neuen Bilder nur +20. Der Saum ist
also schwaecher als im Original; was auffiel, war der dunkle Hintergrund des Bogens.

Browser-Belege im NORMALEN Run:
- Level 3 (gewoehnlicher Boss): `boss-basic-move-1..4`, 2,19 Bildwechsel je Sekunde,
  Pendelweite 0 und Neigung 0 - er pendelt bewusst nicht (Entscheidung 2026-08-23).
- Level 5 (Elite-Boss): `boss-elite-move-1..4`, Pendelweite 57,5 px, Neigung 7,09 Grad
  bei hoechstem seitlichen Tempo und 0 Grad am Umkehrpunkt.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
