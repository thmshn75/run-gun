# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Block 3: Die drei schweren Gestalten bekommen ihre eigene Gangart.**

Letzter der drei Blöcke. Block 1 (drei mittlere: Marschieren, Schlurfen, Schleichen) und
Block 2 (vier leichte: Rennen, Kriechen, Zucken, Humpeln) sind abgenommen, eingehängt und
im Spiel. **Beide dürfen nicht angefasst werden.**

Bei den schweren Gestalten gibt es genau **drei** eigene Formen: `heavy-f`, `heavy-h`
und `heavy-j` sind pixelgleiche Umfärbungen von `heavy-e`, `heavy-g` und `heavy-i`
(Silhouettenunterschied exakt 0,0 %). Sie brauchen keine eigenen Bilder — sie benutzen die
Sätze ihrer Form.

Dies ist ein **reiner Bild-Auftrag**. **Kein Code ändern.**

## Was zu liefern ist

Drei Sätze zu je zwölf Bildern, alle **84 × 104 px** (größer als in Block 1 und 2):

| Dateien | Vorlage | Die Figur | Ihre Bewegung |
|---|---|---|---|
| `enemy-heavy-e-move-1..12.png` | `src/assets/enemy-heavy-e.png` | fetter Koloss, Metalleimer über dem Kopf, Hosenträger, Lederschürze, barfuß | **WATSCHELN** |
| `enemy-heavy-g-move-1..12.png` | `src/assets/enemy-heavy-g.png` | massiger Kerl mit gelbem Bauhelm, nackter Oberkörper, Jeans, barfuß | **STAMPFEN** |
| `enemy-heavy-i-move-1..12.png` | `src/assets/enemy-heavy-i.png` | gehörnte Gestalt mit langem Mantel, Schulterpanzer, Rüstungsteile | **SCHREITEN** |

Jeder Satz aus **einem gemeinsamen Bogen** (3 Reihen à 4 Haltungen).

## Die drei Bewegungen — sie müssen deutlich verschieden aussehen

**WATSCHELN (`heavy-e`):** Breitbeinig und schwerfällig. Das ganze Gewicht kippt bei
jedem Schritt von einer Seite auf die andere, der dicke Bauch schwingt seitlich mit, die
Arme hängen abgespreizt und pendeln gegenläufig. Kleine Schritte, viel Seitwärtsbewegung
— die Figur kommt kaum vom Fleck, wirkt aber unaufhaltsam.

**STAMPFEN (`heavy-g`):** Wuchtig und vorwärtsdrängend. Jeder Schritt setzt mit vollem
Gewicht auf; beim Aufsetzen sackt der Körper kurz in die Knie und richtet sich dann wieder
auf. Der Oberkörper bleibt aufrecht, die Schultern arbeiten mit, die Fäuste sind geballt.
Anders als beim Watscheln geht die Bewegung nach **vorn**, nicht zur Seite.

**SCHREITEN (`heavy-i`):** Langsam, aufrecht, beherrscht. Lange, gleichmäßige Schritte
ohne Hast, der Oberkörper ruhig und hoch aufgerichtet, der Mantel schwingt bei jedem
Schritt nach und bleibt einen Moment zurück. Bedrohlich durch Ruhe, nicht durch Wucht —
die einzige der zehn Gangarten, die gelassen wirkt.

**Sie müssen sich auch von den bisherigen sieben unterscheiden:** Marschieren, Schlurfen,
Schleichen, Rennen, Kriechen, Zucken, Humpeln. Insgesamt sollen zehn verschiedene
Gangarten entstehen.

## Die Vorlage ist verbindlich, nicht ihre Beschreibung

Zuerst `enemy-heavy-e.png`, `enemy-heavy-g.png` und `enemy-heavy-i.png` ansehen und
die Figur von dort übernehmen: Statur, Kleidung, Hautton, Farben, Kopfbedeckung,
Barfüßigkeit. **Die Vorlage als Referenzbild in die Bilderzeugung geben, nicht nur in
Worten beschreiben.** In Block 2 hat die Textbeschreibung allein zuverlässig eine andere
Gestalt erzeugt und drei Anläufe gekostet.

## Der Weg, der in Block 2 funktioniert hat

1. **Vorlage als Referenzbild** in die Bilderzeugung geben. Groß erzeugen, nie
   hochskalieren, **auf transparentem Grund**.
2. Auf 84 × 104 herunterrechnen.
3. **Alpha hart schwellen:** ≥ 128 wird 255, alles darunter 0. Keine halbtransparenten
   Pixel übrig lassen.
4. **Randpixel-Farbe aus dem nächstinneren Pixel nachziehen**, statt die vom Skalierer
   mit dem Hintergrund gemischte Farbe stehen zu lassen. Das behebt den hellen Saum.
5. **Die Farben auf die Palette der Vorlage abbilden.** Das hält die Figur farblich an
   der Vorlage und entfernt pinke oder magentafarbene Ausreißer.
6. Erst danach messen.

**Keine Einladung zum Umfärben:** Die Figur muss erkennbar dieselbe sein. Die Bilder
werden zusätzlich vergrößert neben die Vorlage gelegt und angesehen. Ein Satz, der das
Skript besteht und daneben sichtbar eine andere Gestalt zeigt, wird abgelehnt.

## Abnahme: das Prüfskript entscheidet

```
python3 /private/tmp/claude-501/-Users-mcbooktehn-1-Projekte-Run-Gun/a01e2688-06ab-436b-af35-c43521826646/scratchpad/abnahme-check-heavy.py e g i
```

Es muss **`ALLES BESTANDEN`** ausgeben (Exit 0).

Geprüft wird je Bild: Größe 84 × 104, opake Pixelzahl, oberste und unterste Zeile, ein
zusammenhängendes Teil, Volldeckung, ausgefranste Einzelpunkte, heller Saum,
Pink/Magenta im Körper, Magenta am Rand, Farbabstand zur Vorlage und Farbverteilung
gegen die Vorlage. Je Satz zusätzlich: Größenspanne zwischen den zwölf Bildern,
Einheitlichkeit der zwölf Bilder untereinander, Silhouettenunterschied Bild 1 zu 7
(mindestens 35 %) und kleinster Nachbarabstand (mindestens 4 %).

Woher die Grenzen kommen: Saum-, Ausfransungs- und Farbgrenzen sind aus Block 2
übernommen, wo sie an den abgenommenen Sätzen kalibriert wurden. Die drei schweren
Vorlagen liegen mit 0,10–0,43 % Einzelpunkten und 0,00–1,55 % hellem Saum **deutlich
innerhalb** dieser Grenzen — sie sind also erreichbar. Der alte `enemy-heavy-lurch`-Satz
fällt an allen zwölf Bildern am hellen Saum durch (7–11 %); er ist **kein** Vorbild.

Die geometrischen Grenzen je Gestalt sind an der jeweiligen Vorlage gemessen:

| | opake Pixel | oberste Zeile | unterste Zeile |
|---|---|---|---|
| `heavy-e` | 4700–7100 | 6 ± 4 | 103 ± 2 |
| `heavy-g` | 3800–5750 | 7 ± 4 | 102 ± 2 |
| `heavy-i` | 3680–5520 | 6 ± 4 | 102 ± 2 |

**Kein Code ändern. Das Prüfskript nicht ändern.**

## Was ausdrücklich KEIN zulässiger Ersatz ist

- **Dreimal dieselbe Bewegung** mit anderer Figur — das ist der Kern des Auftrags.
- **Eine Bewegung aus Block 1 oder 2 wiederholen.**
- **Eine andere Gestalt liefern als die der Vorlage.**
- **Bilder nachträglich Pixel abtragen**, statt sie sauber zu erzeugen.
- **An einem Zahlenwert arbeiten statt an der Sache.**
- **Vorhandene Sätze anfassen** (`enemy-lurch-*`, `enemy-light-lurch-*`,
  `enemy-heavy-lurch-*`, `enemy-standard-*-move-*`, `enemy-light-*-move-*`).
- **Bilder für `heavy-f`, `heavy-h` oder `heavy-j` erzeugen** — reine Umfärbungen,
  sie brauchen keine.
- **Programmatisch zeichnen. Code ändern. Das Prüfskript ändern.**

## Reihenfolge und Reißleine

Der Reihe nach: `heavy-e`, `heavy-g`, `heavy-i`. Je Satz **drei Anläufe**, dann
diesen Satz überspringen, die alten Dateien in Ruhe lassen und mit dem nächsten
weitermachen. Im Abschlussbericht sagen, welches Kriterium gescheitert ist.

## Abschlussbericht

Status auf `IMPL_DONE` setzen. Anzugeben: die **vollständige Ausgabe des Prüfskripts**,
je Satz die Zahl der Anläufe, ob die Vorlage als Referenzbild verwendet wurde, in einem
Satz wie sich die drei Bewegungen unterscheiden, und die Bestätigung per SHA-256, dass
die Sätze aus Block 1 und 2 unverändert sind.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
