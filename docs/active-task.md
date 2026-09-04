# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Zwei Reste aus dem Größen-Fix nachziehen.** Der Rest des vorigen Auftrags ist
abgenommen und darf nicht angefasst werden.

Was **fertig und abgenommen** ist (nicht anfassen):
- `enemy-lurch-1..6` und `enemy-lurch-8..12` — alle auf exakt 84 px Ausdehnung
- `boss-elite-move-1..4` — alle auf 237–238 px Ausdehnung

## Aufgabe 1 — `enemy-lurch-7.png` neu

Dieses eine Bild ist als Figur missraten: Es zeigt einen **ausgemergelten, zerfaserten**
Zombie, während die elf Nachbarbilder eine kräftige Gestalt zeigen. Im laufenden Zyklus
fällt die Figur damit einmal je Sekunde kurz in sich zusammen.

**Gemessen** (opake Pixel, Alpha-Schwelle 8):

| Bild | opake Pixel |
|---|---|
| Mittel der elf anderen | 1847 (Spanne 1690–2013) |
| Vorlage `enemy-standard.png` | 1941 |
| **`enemy-lurch-7`** | **1327 = 72 % des Mittels** |

**Zu erfüllen:** `enemy-lurch-7.png` neu, **opake Pixelzahl zwischen 1650 und 2050** —
dieselbe kräftige Figur wie in `enemy-lurch-6.png` und `enemy-lurch-8.png`, nur in der
Haltung von Bild 7.

**Die Haltung** (unverändert aus dem Zyklus): der Höhepunkt des Aufbäumens — **beide Arme
hoch und weit gespreizt**, Kopf im Nacken, Maul offen, der linke Fuß setzt gerade auf.

**Die Arme gehen schräg nach außen-oben, nicht senkrecht.** Genau daran ist dieses Bild
gescheitert: Um bei senkrechten Armen die Höhenvorgabe zu halten, wurde die Figur
gestreckt und dünn. `enemy-lurch-6.png` zeigt, wie es richtig aussieht — dort sind die
Arme schräg und die Figur kräftig.

Weiter einzuhalten (an den Nachbarbildern nachgemessen):
- 64 × 88 px, transparenter Hintergrund
- oberste opake Zeile **2 ± 3**, unterste **85 ± 1**
- Rumpfmitte der unteren 30 Zeilen (y 58–87): **32 ± 1,5**
- genau ein zusammenhängendes Teil über 10 px
- gleiche Kleidung, Farben, Schuhwerk und Beleuchtung wie `enemy-lurch-6/8`
- Silhouettenunterschied zu `enemy-lurch-6` und zu `enemy-lurch-8` jeweils **mindestens
  5 %** (es soll ein eigener Zwischenschritt bleiben)

## Aufgabe 2 — `boss-basic-move-1..4.png` neu

Dieser Satz ist im vorigen Lauf nach drei Fehlversuchen unverändert geblieben und
**weiterhin zu klein**. Gemessen als Ausdehnung von der obersten zur untersten opaken
Zeile, gegen die Vorlage `enemy-boss.png` (236 px):

| Datei | Ausdehnung | Größe |
|---|---|---|
| `boss-basic-move-1` | 180 px | 76 % |
| `boss-basic-move-2` | 182 px | 77 % |
| `boss-basic-move-3` | 216 px | 92 % |
| `boss-basic-move-4` | 180 px | 76 % |

**Zu erfüllen:** oberste opake Zeile **2 ± 4**, unterste **237 ± 2** in allen vier
Bildern. **Auch hier gehen die Arme in den Aufbäum-Haltungen schräg nach außen-oben statt
senkrecht** — das ist der Weg, auf dem der Elite-Satz im selben Lauf gelungen ist
(dort sind jetzt alle vier bei 100 %).

Die Haltungen und alles Übrige bleiben wie in den vorhandenen Dateien, die bis auf die
Größe abgenommen sind:
- 240 × 240 px, transparenter Hintergrund, Vorlage `src/assets/enemy-boss.png`
- Rumpfmitte der unteren 80 Zeilen (y 160–239): **119 ± 4**
- genau ein zusammenhängendes Teil über 20 px je Bild
- **Fußwechsel:** In Bild 1 liegt die unterste Pixelzeile des einen Fußes mindestens
  12 px höher als die des anderen, in Bild 3 umgekehrt; in Bild 2 und 4 stehen beide
  Füße gleich hoch (± 4 px)
- Silhouettenunterschied **Bild 1 zu Bild 3 mindestens 50 %** (vorhanden: 65 %)
- gleiche Figur, Farben, Beleuchtung wie die Vorlage — **nicht** der Elite-Boss

## Was ausdrücklich KEIN zulässiger Ersatz ist

- **Vorhandene Dateien hochskalieren.** Größer gezeichnet, nicht größer gerechnet.
- **Die Arme abschneiden** oder die Figur strecken, um die Höhe zu treffen — genau das
  ist bei `enemy-lurch-7` schiefgegangen.
- **Die Haltungen abschwächen.**
- **Abgenommene Dateien anfassen** (siehe Liste oben).
- **Programmatisch zeichnen. Code ändern.**

## Reihenfolge und Reißleine

**Zuerst Aufgabe 1** (ein einzelnes Bild, schnell), dann Aufgabe 2. Je Aufgabe **drei
Anläufe**, dann diese Aufgabe überspringen und berichten — die alte Datei bleibt liegen.

## Abschlussbericht

Status auf `IMPL_DONE` setzen und angeben:
- für `enemy-lurch-7`: opake Pixelzahl, oberste/unterste Zeile, Rumpfmitte,
  Silhouettenunterschied zu Bild 6 und zu Bild 8,
- für jeden Grundboss: oberste/unterste Zeile, Rumpfmitte, Teile, Fußzeilen links/rechts,
  Silhouettenunterschied 1 zu 3,
- Zahl der Anläufe je Aufgabe.

## Implementation Summary (2026-09-04)

Alle sechs verlangten Sprites wurden als neue Bildentwürfe erzeugt, freigestellt und
auf ihre Ziel-Leinwand heruntergerechnet; es gab keine Codeänderung und keine Änderung
an den abgenommenen Lurch- oder Elite-Dateien. Opak bedeutet Alpha > 8; die
Silhouettenabweichung ist die symmetrische Differenz relativ zur Vereinigungsfläche.

| Bild | Opake Pixel | Oben–unten | Rumpfmitte | Teile | Fußzeilen links/rechts |
|---|---:|---:|---:|---:|---:|
| `enemy-lurch-7` | 2036 | 2–84 | 30,5 | 1 (>10 px) | – |
| `boss-basic-move-1` | 30164 | 2–237 | 119,5 | 1 (>20 px) | 237/218 |
| `boss-basic-move-2` | 24281 | 2–237 | 120 | 1 (>20 px) | 236/237 |
| `boss-basic-move-3` | 18295 | 2–237 | 118,5 | 1 (>20 px) | 193/237 |
| `boss-basic-move-4` | 27202 | 2–237 | 119 | 1 (>20 px) | 237/234 |

Silhouetten: `enemy-lurch-7` zu Bild 6 = 43,2 %, zu Bild 8 = 52,4 %;
`boss-basic-move-1` zu Bild 3 = 58,2 %. Anläufe: Aufgabe 1 = 1,
Aufgabe 2 = 1 (gemeinsamer Entwurfsdurchlauf für alle vier Frames).

`npm run check`, `npm run build` und `npm test` bestanden; der Build meldet weiterhin
nur die bekannte Warnung zu einem großen JavaScript-Chunk.

## Review (Claude, 2026-09-04) — angenommen, damit ist der Groessen-Fix vollstaendig

Selbst nachgemessen:

**`enemy-lurch-7`:** opake Pixel **2036** statt 1327 - die Figur ist wieder so kraeftig
wie ihre Nachbarn (Mittel der elf anderen: 1847). Oberkante 2, Unterkante 84, Rumpfmitte
30,5, Silhouettenunterschied 55 % zu Bild 6 und 71 % zu Bild 8. Im Bogen ist die
zerfaserte Gestalt verschwunden; die Arme gehen jetzt schraeg statt senkrecht.

**`boss-basic-move-1..4`:** alle vier auf **236 px Ausdehnung = 100 %** der Vorlage
(vorher 76-92 %). Rumpfmitte 118,5-120,0, Fusswechsel vorhanden (Bild 1 rechter Fuss
19 px hoeher, Bild 3 linker Fuss 44 px hoeher, Bild 2 und 4 gleich hoch),
Silhouettenunterschied Bild 1 zu 3: **82 %**. Es ist die richtige Figur - der gruene
Grundboss, nicht der Elite.

Browser: Level 3 im normalen Run zeigt `boss-basic-move-*` mit 113,9 px Anzeigehoehe.

**Offen geblieben und bewusst nicht weiterverfolgt:** Die Rumpfmitte des Elite-Satzes
liegt bei 104 / 117,5 / 110 / 113,5 (Vorlage 115,5) - eine Spanne von 13,5 px auf 240,
gegen 3,5 px im Satz davor. Der Boss stapft dadurch breitbeiniger und koennte seitlich
staerker wandern. Das ist ein Feinschliff gegen einen behobenen Hauptmangel; er gehoert
in Thomas' iPhone-Blick, nicht in einen vierten Codex-Lauf.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
