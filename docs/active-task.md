# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Bewegungssätze für die vier leichten Sondergestalten — jede mit EIGENER Bewegung.**

Thomas am 2026-09-04: „die restlichen bewegen, wie bei den anderen, aber jede figur eine
andere Bewegung".

Das ist **Block 2 von drei**. Block 1 (drei mittlere Gestalten: Marschieren, Schlurfen,
Schleichen) ist abgenommen und **darf nicht angefasst werden**. Hier kommen die vier
leichten Gestalten, danach folgen die drei schweren.

Dies ist ein **reiner Bild-Auftrag**. **Kein Code ändern.**

## Was zu liefern ist

Vier Sätze zu je zwölf Bildern, alle **56 × 76 px**:

| Dateien | Vorlage | Die Figur | Ihre Bewegung |
|---|---|---|---|
| `enemy-light-e-move-1..12.png` | `src/assets/enemy-light-e.png` | hagere Gestalt, zerlumpt | **RENNEN** |
| `enemy-light-f-move-1..12.png` | `src/assets/enemy-light-f.png` | Gestalt mit Kapuze | **KRIECHEND VORGEBEUGT** |
| `enemy-light-g-move-1..12.png` | `src/assets/enemy-light-g.png` | Gestalt in Arbeitskleidung | **ZUCKEN** |
| `enemy-light-i-move-1..12.png` | `src/assets/enemy-light-i.png` | bandagierte Gestalt | **HUMPELN** |

Jeder Satz aus **einem gemeinsamen Bogen** (3 Reihen à 4 Haltungen).

## Die vier Bewegungen — sie müssen deutlich verschieden aussehen

**RENNEN (`light-e`):** Schnell und ausgreifend. Weite Schritte, Knie hoch, Oberkörper
leicht nach vorn geneigt, Arme kräftig gegengleich schwingend. Die einzige Gestalt, die
wirklich läuft — sie wirkt hetzend.

**KRIECHEND VORGEBEUGT (`light-f`):** Extrem tief gebeugt, fast auf allen vieren. Der
Oberkörper ist weit nach vorn gekippt, die Arme hängen bis fast zum Boden und greifen
abwechselnd nach vorn, die Beine schieben nach. Wirkt tierisch, nicht menschlich.

**ZUCKEN (`light-g`):** Ruckartig und krampfhaft. Der Körper bewegt sich kaum von der
Stelle, dafür zucken Kopf, Schultern und Arme in harten, unregelmäßigen Stößen — mal
kippt der Kopf zur Seite, mal fährt eine Schulter hoch, mal verkrampft ein Arm. Die Beine
machen nur kleine, unsichere Schritte.

**HUMPELN (`light-i`):** Ein Bein ist steif und wird nachgezogen, das andere trägt. Bei
jedem Schritt auf das steife Bein sackt die Figur seitlich weg und richtet sich wieder
auf. Deutlich asymmetrisch — anders als alle anderen Bewegungen kippt sie nur zu **einer**
Seite.

## Harte Anforderungen (Abnahmekriterien)

An den vier Vorlagen nachgemessen.

| Kriterium | `light-e` | `light-f` | `light-g` | `light-i` |
|---|---|---|---|---|
| oberste opake Zeile | **1 ± 4** | **0 ± 4** | **0 ± 4** | **0 ± 4** |
| unterste opake Zeile | **74 ± 2** | **75 ± 1** | **75 ± 1** | **75 ± 1** |
| opake Pixel je Bild | **1260–1810** | **1460–2110** | **1430–2060** | **1170–1680** |

Für **alle vier** Sätze zusätzlich:

1. **Exakt 56 × 76 px**, transparenter Hintergrund.
2. **Deckkraft: mindestens 60 % der opaken Pixel volldeckend** (Alpha ≥ 250). Die
   Vorlagen liegen bei 66–78 %.
3. **Genau ein zusammenhängendes Teil** über 10 px je Bild.
4. **Kein Freisteller-Saum am Rand.** Prüfbar an den Randpixeln (opak mit transparentem
   Nachbarn): Anteil sehr dunkler (R+G+B < 90) höchstens **75 %**, Anteil magentafarbener
   (R und B über 90, G mindestens 30 darunter) höchstens **2 %**. Beim Soldaten in
   Block 1 lag der Magenta-Anteil bei 12,6–18,8 % und musste nachträglich abgetragen
   werden.
5. **Silhouettenunterschied Bild 1 zu Bild 7: mindestens 35 %.** Beim Zucken darf es an
   der Untergrenze liegen, beim Rennen deutlich darüber.
6. **Zwischen je zwei benachbarten Bildern, auch 12 zu 1: mindestens 4 %.**
7. **Die vier Bewegungen müssen sich untereinander unterscheiden.** Legt man Bild 1 der
   vier Sätze nebeneinander und ebenso Bild 7, muss auf den ersten Blick erkennbar sein,
   dass hier vier verschiedene Gangarten laufen. **Und sie müssen sich auch von Block 1
   unterscheiden** (Marschieren, Schlurfen, Schleichen) — insgesamt sollen zehn
   verschiedene Gangarten entstehen.
8. Dieselbe Figur über alle zwölf Bilder eines Satzes: gleiche Kleidung, Farben,
   Bandagen bzw. Kapuze, Schuhwerk, Beleuchtung von oben.
9. **Groß erzeugen, dann auf 56 × 76 herunterrechnen** (nie hochskalieren).

## Was ausdrücklich KEIN zulässiger Ersatz ist

- **Viermal dieselbe Bewegung** mit anderer Figur — das ist der Kern des Auftrags.
- **Eine Bewegung aus Block 1 wiederholen.**
- **Vorhandene Sätze anfassen** (`enemy-lurch-*`, `enemy-light-lurch-*`,
  `enemy-heavy-lurch-*`, `enemy-standard-*-move-*`).
- **Programmatisch zeichnen. Code ändern.**

## Reihenfolge und Reißleine

Der Reihe nach: `light-e`, `light-f`, `light-g`, `light-i`. Je Satz **drei Anläufe**, dann
diesen Satz überspringen und mit dem nächsten weitermachen.

## Abschlussbericht

Status auf `IMPL_DONE` setzen und je Satz angeben: gelieferte Bilder; je Bild Anteil
volldeckender Pixel, opake Pixelzahl, oberste/unterste Zeile, zusammenhängende Teile,
Anteil dunkler und magentafarbener Randpixel; Silhouettenunterschied 1 zu 7; kleinster
Nachbarabstand; in einem Satz, wie sich die vier Bewegungen unterscheiden; Zahl der
Anläufe.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
