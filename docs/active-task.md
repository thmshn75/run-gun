# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Vier Bewegungsbilder für den Elite-Boss erzeugen.**

Thomas am 2026-09-04, nach dem ersten Versuch: „die bewegten figuren flackern, also bei
den normalen figuren sollte die gerechnete bewegung besser funktionieren, aber bei den
Bossen die Bildvariante einbauen — alles nur für den testlauf".

Der erste Versuch mit einem Zombie ist ausgewertet (Commit `1c113a7`): Die Figur blieb
über vier Bilder konstant, **aber die Haltungen unterschieden sich zu wenig** — Bild 1
und 3 lagen nur 285 von 1.900 Bildpunkten auseinander, im Spiel wirkte das als Flackern
statt als Gang. **Genau das ist diesmal zu vermeiden.**

Dies ist ein **reiner Bild-Auftrag**. Die Anzeigelogik baut Claude selbst. **Kein Code
ändern.**

## Warum es beim Boss besser gehen kann

Der Boss ist eine einzelne, große Figur, die langsam vorrückt — er läuft nicht wie ein
Zombie. Deshalb wird hier **keine Laufbewegung** bestellt, sondern eine **schwere
Drohbewegung**, deren Haltungen sich viel stärker unterscheiden als vier Schritte eines
Gangzyklus. Große Unterschiede sind das, was beim ersten Versuch fehlte.

## Was genau zu liefern ist

Vier PNG-Dateien nach `src/assets/`:

| Datei | Haltung |
|---|---|
| `boss-move-1.png` | **Ruhelage** — Arme hängen seitlich, Schultern normal, Kopf gerade |
| `boss-move-2.png` | **Ausholen** — Oberkörper leicht zurück, **beide Arme deutlich angehoben** (Hände etwa auf Schulterhöhe), Schultern hochgezogen, Brust heraus |
| `boss-move-3.png` | **Höhepunkt** — **Arme weit oben und nach außen gespreizt** (Hände über Schulterhöhe), Kopf leicht in den Nacken, Maul offen — die drohendste Haltung der vier |
| `boss-move-4.png` | **Zurücksinken** — wie 2, aber Arme auf dem Weg nach unten, Schultern fallend |

Als Folge abgespielt ergibt das ein schweres Aufbäumen und Zurücksinken.

## Vorlage

`src/assets/enemy-boss-elite.png` (240 × 240 px). **Dieselbe Figur in vier Haltungen** —
nicht vier verschiedene Bosse. Aussehen, Körperbau, Kleidung, Farben und Beleuchtung
müssen identisch bleiben; verändert werden Arme, Schultern und Kopfhaltung.

Beim ersten Versuch hat sich bewährt, **einen gemeinsamen Bogen mit allen Haltungen zu
erzeugen und ihn dann zu zerschneiden** — so bleibt die Figur konstant. Bitte wieder so.

## Harte Anforderungen (Abnahmekriterien)

1. **Exakt 240 × 240 px** je Datei, transparenter Hintergrund.
2. **Gleiche Standlinie:** Die Fußsohlen liegen in allen vier Bildern auf derselben
   Pixelzeile (± 2 px). Der Boss steht, er springt nicht.
3. **Gleiche waagerechte Mitte** (± 2 px) — sonst zuckt er seitlich.
4. **Die Haltungen müssen sich deutlich unterscheiden.** Prüfkriterium, nachzumessen und
   im Bericht anzugeben: Die Silhouetten (opake Pixel, Alpha-Schwelle 8) von **Bild 1 und
   Bild 3** müssen sich in **mindestens 15 % aller opaken Pixel** unterscheiden. Beim
   gescheiterten Zombie-Versuch waren es 15 % — die aber fast nur aus Kleidungsfalten
   kamen; hier soll der Unterschied aus der **Armhaltung** stammen und beim Ansehen
   sofort auffallen.
5. **Beleuchtung von oben** mit Schattenseite und Kantenlicht wie bei der Vorlage.
6. Wie immer: **groß erzeugen, dann auf 240 × 240 herunterrechnen** (nie hochskalieren).

## Was ausdrücklich KEIN zulässiger Ersatz ist

- **Programmatisch zeichnen** (Rechtecke, Kreise, Pfade im Code).
- **Vier verschiedene Bosse** statt einer Figur in vier Haltungen. Kommt die Konsistenz
  nicht zustande, ist das ein **Befund und Abbruchgrund**, kein Ersatzprodukt.
- **Vier fast gleiche Haltungen.** Das ist der Fehler aus dem ersten Versuch; werden die
  15 % aus Punkt 4 nicht erreicht, bitte melden statt liefern.
- **Code ändern.**

## Reißleine mit Zeitbudget

**Drei Anläufe**, dann abbrechen und berichten. Ein belegtes „geht nicht" ist ein
brauchbares Ergebnis — der Versuch soll klären, ob der Weg trägt.

## Abschlussbericht

Status auf `IMPL_DONE` setzen und berichten:
- gemessene Standlinie und Mitte aller vier Bilder,
- **der gemessene Silhouetten-Unterschied zwischen Bild 1 und Bild 3 in Prozent**,
- wie viele Anläufe nötig waren,
- was nicht ging und warum.

## Implementation Summary

- Nachbesserung, Anlauf 1 von maximal 3: neuen gemeinsamen Vierer-Bogen derselben
  Elite-Boss-Figur auf großem Raster erzeugt, den chromatischen Hintergrund entfernt und
  erst danach auf 240 × 240 px heruntergerechnet; keine Hochskalierung und keine Codeänderung.
- Finale Pixel-Abnahme (Alpha-Schwelle 8, 4er-Nachbarschaft): zusammenhängende Teile
  Bild 1–4 = 1, 1, 3, 1; Teile über 20 Pixel = jeweils genau 1 (der Boss selbst), also
  keine freistehenden Bildteile.
- Rumpfmitte der unteren 80 Zeilen Bild 1–4 = 120,5; 118,5; 121,0; 119,5 px
  (Sollbereich 118 ± 3). Standlinien = 234, 232, 233, 233 px; Bounding-Box-Mittten =
  120,0; 119,5; 120,5; 119,5 px.
- Silhouettenunterschied Bild 1 zu 3 = 43,90 % (symmetrische Differenz, bezogen auf
  die Vereinigungsmenge der opaken Pixel); damit über der geforderten Nachbesserungsgrenze
  von 40 %. Kein weiterer Anlauf nötig; keine offenen Bildbefunde.

- Anlauf 1 von maximal 3: gemeinsamer Vierer-Bogen aus derselben Elite-Boss-Figur erzeugt,
  auf 240 × 240 px zugeschnitten und mit transparentem Hintergrund exportiert.
- Pixel-Abnahme (Alpha-Schwelle 8): Standlinien Bild 1–4 = 233, 234, 234, 234 px;
  horizontale Mitten = 120,0, 120,5, 119,5, 119,5 px.
- Silhouettenunterschied Bild 1 zu 3 = 44,49 % (symmetrische Differenz aller opaken Pixel,
  bezogen auf deren Vereinigung); deutlich über dem Mindestwert von 15 %.
- Keine Codeänderung. Der vorhandene Projekt-Testlauf wurde nicht gestartet, weil der Auftrag
  ausschließlich neue Bilddateien betrifft; eine vollständige Pixel-Abnahme lief erfolgreich.

---

## NACHBESSERUNG (Runde 2, 2026-09-04) — Claude nach dem Review

**Das Wichtigste ist gelungen:** Die vier Haltungen unterscheiden sich deutlich — der
Silhouettenunterschied zwischen Bild 1 und 3 liegt bei **57 %** (nachgemessen; beim
gescheiterten Zombie-Versuch waren es 15 %). Die Bewegung ist als Aufbäumen und
Zurücksinken klar zu lesen, und es ist erkennbar dieselbe Figur. Standlinie (233–234) und
Bounding-Box-Mitte (119,5–120,5) sind eingehalten.

Zwei Fehler bleiben. Beide sind nachgemessen, nicht geschätzt.

### Befund 1 — freistehende Bildteile

In `boss-move-2.png` und `boss-move-4.png` schweben abgetrennte Stücke (Krallen) frei in
der Luft, ohne Verbindung zum Körper. Gemessen über eine Zusammenhangsanalyse der opaken
Pixel (Alpha-Schwelle 8, 4er-Nachbarschaft):

| Datei | zusammenhängende Teile | freistehende Teile > 20 px |
|---|---|---|
| `boss-move-1` | 2 | keine |
| `boss-move-2` | 4 | **129, 83, 26 Pixel** |
| `boss-move-3` | 3 | keine |
| `boss-move-4` | 4 | **261, 131 Pixel** |

**Zu erfüllen:** In jedem Bild höchstens **ein** zusammenhängendes Teil über 20 Pixel.
Alles andere ist ein Bildfehler und fällt im Spiel als schwebender Fleck auf.

### Befund 2 — der Rumpf steht in Bild 2 seitlich versetzt

Die Bounding-Box-Mitte stimmt, aber sie wird von den ausgestreckten Armen bestimmt. Für
das Auge zählt, wo **Beine und Rumpf** stehen. Gemessen als waagerechte Mitte der opaken
Pixel in den **unteren 80 Bildzeilen** (y 160–239), also unterhalb der Arme:

| Datei | Rumpfmitte unten |
|---|---|
| `boss-move-1` | 118,5 |
| `boss-move-2` | **98,5** ← 20 px daneben |
| `boss-move-3` | 118,0 |
| `boss-move-4` | 117,5 |

Im Spiel springt der Boss dadurch bei jedem Durchlauf einmal seitlich weg.

**Zu erfüllen:** Rumpfmitte in den unteren 80 Zeilen bei **118 ± 3** in allen vier
Bildern. Der Boss steht mit den Beinen fest an derselben Stelle und bewegt darüber Arme,
Schultern und Kopf — genau das ist die bestellte Bewegung.

**Nicht durch Verschieben der fertigen Datei lösen:** In `boss-move-2` reicht die Figur
bereits bis Spalte 232, ein Verschieben nach rechts würde den Arm abschneiden. Neu aus
der Hochauflösung herunterrechnen.

### Was gut ist und so bleiben soll

- Die Haltungen und ihr Unterschied (57 %) — **nicht abschwächen**.
- Die Standlinie 233–234.
- Die Figur selbst: gleiche Rüstung, gleiche Farben, gleicher Körperbau.

### Reißleine

**Drei Anläufe**, dann abbrechen und berichten.

### Wieder auf `IMPL_DONE` setzen und berichten

- Zahl der zusammenhängenden Teile je Bild,
- Rumpfmitte der unteren 80 Zeilen je Bild,
- Silhouettenunterschied 1 zu 3 (muss über 40 % bleiben),
- wie viele Anläufe nötig waren.

## Review (Claude, 2026-09-04) — angenommen

Selbst nachgemessen: keine freistehenden Teile mehr in irgendeinem Bild (Befund 1
behoben), Rumpfmitte der unteren 80 Zeilen 118,5 / 120,5 / 121,0 / 119,5 statt vorher
98,5 bei Bild 2 (Befund 2 behoben), Standlinie 232-234, Silhouettenunterschied Bild 1 zu
3 bei 56,3 %.

**Damit ist die Frage aus dem Zombie-Versuch anders beantwortet:** Kontrollierte Posen
sind erreichbar - wenn die Haltungen weit genug auseinanderliegen (Arme heben statt vier
Schritte) und wenn das Pruefkriterium in Pixeln in der Spec steht.

Browser-Beleg Testgelaende: alle vier Bilder in Gebrauch, 2,21 Bildwechsel je Sekunde
(= 0,55 Zyklen, wie eingestellt), Rotation ueber 1.412 Proben konstant 0 und genau ein
Seitenverhaeltnis - keine doppelte Bewegung. Gegenprobe normaler Run: ueber 1.100 Proben
ausschliesslich `enemy-boss` mit gerechneter Bewegung (-3,1 bis +3,1 Grad), null
Bildvariante.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
