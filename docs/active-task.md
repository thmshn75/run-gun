# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Den Taumel-Zyklus des Zombies von vier auf ZWÖLF Bilder erweitern.**

Thomas am 2026-09-04: „wirkt schon ganz ok, kann man machen dass es nicht so abgehakt
wirkt sondern eine flüssigere bewegung ist".

**Die Ursache ist gerechnet, nicht geraten:** Vier Bilder bei 1,1 Zyklen je Sekunde
ergeben 4,4 Bilder/s — jedes Bild steht **227 ms**. Als flüssig gelten Sprite-Animationen
ab etwa 10–12 Bildern/s, also unter 100 ms je Bild. Mit zwölf Bildern bei unverändertem
Tempo sind es **76 ms**. Überblenden wäre der billigere Weg, scheidet hier aber aus: Die
Haltungen unterscheiden sich um 61 %, zwei davon halbtransparent übereinander gäben einen
Doppelgänger statt einer Bewegung.

Das Tempo bleibt bei 1,1 Zyklen/s — ein Zombie soll schwerfällig wanken, nicht zappeln.

Dies ist ein **reiner Bild-Auftrag**. **Kein Code ändern.**

## Was genau zu liefern ist

Zwölf PNG-Dateien nach `src/assets/`: `enemy-lurch-1.png` bis `enemy-lurch-12.png`.
Die vier vorhandenen `enemy-lurch-1..4.png` werden dabei **ersetzt** — bitte den ganzen
Satz neu aus einem gemeinsamen Bogen erzeugen (z. B. 3 Reihen à 4 Haltungen), weil das
die Figur über alle Bilder konstant hält. Genau dieses Verfahren hat bei allen drei
bisher gelungenen Sätzen getragen.

**Vorlage: `src/assets/enemy-standard.png`** (64 × 88 px). Dieselbe Figur in zwölf
Haltungen — gleiche Kleidung, gleicher Körperbau, gleiche Farben, gleiche Beleuchtung,
**gleiches Schuhwerk in allen zwölf Bildern** (im Vierer-Satz wechselte es zwischen
nackten Füßen und Stiefeln). Ansicht von vorn.

## Der Bewegungsablauf

Ein Zombie wankt dem Spieler entgegen: greifen, fangen, aufbäumen, fangen — jetzt in
zwölf statt vier Schritten, damit die Zwischenstufen sichtbar werden.

| Nr. | Arme und Oberkörper | Beine |
|---|---|---|
| 1 | Beide Arme **weit nach vorn gestreckt**, greifend, Oberkörper vorgebeugt | **Rechtes Knie hoch**, rechter Fuß frei |
| 2 | Arme beginnen zu sinken | Rechter Fuß setzt gerade auf |
| 3 | Arme seitlich unten, **Oberkörper nach LINKS geneigt** | Beide Füße am Boden |
| 4 | Arme beginnen zu heben | Linkes Knie hebt sich |
| 5 | Arme auf Schulterhöhe | **Linkes Knie hoch**, linker Fuß frei |
| 6 | Arme fast oben, Kopf hebt sich | Linker Fuß noch frei |
| 7 | **Beide Arme weit oben und gespreizt**, Kopf im Nacken, Maul offen — die auffälligste Haltung | Linker Fuß setzt gerade auf |
| 8 | Arme beginnen zu sinken | Beide Füße am Boden |
| 9 | Arme auf Schulterhöhe, **Oberkörper nach RECHTS geneigt** | Beide Füße am Boden |
| 10 | Arme tief | Rechtes Knie hebt sich |
| 11 | Arme fast unten, Oberkörper richtet sich auf | **Rechtes Knie hoch** |
| 12 | Arme kommen nach vorn — Übergang zurück zu Bild 1 | Rechtes Knie hoch |

Bild 12 muss zu Bild 1 passen: Der Zyklus läuft endlos im Kreis, ein Sprung an dieser
Nahtstelle wäre genauso sichtbar wie das bisherige Ruckeln.

## Harte Anforderungen (Abnahmekriterien)

1. **Exakt 64 × 88 px** je Datei, transparenter Hintergrund.
2. **Genau ein zusammenhängendes Teil über 10 Pixel je Bild.** Zusammenhangsanalyse der
   opaken Pixel, Alpha-Schwelle 8.
3. **Standlinie des tragenden Fußes bei 85 ± 1** in allen zwölf Bildern.
4. **Rumpfmitte in den unteren 30 Zeilen (y 58–87) bei 32 ± 1** in allen zwölf Bildern.
   **Das ist enger als beim Vierer-Satz** (dort ± 2), und zwar aus einem gemessenen
   Grund: Dessen Rumpfmitte schwankte um 4 px, auf dem Bildschirm rund 2,2 px — die Beine
   wanderten sichtbar hin und her. Der Oberkörper darf neigen, die Beine bleiben stehen.
5. **Der Zyklus bleibt weit gespannt:** Silhouettenunterschied **Bild 1 zu Bild 7**
   (die gegenüberliegenden Haltungen) **mindestens 45 %** der opaken Pixel. Der
   Vierer-Satz erreicht 61 % zwischen 1 und 3. Fällt dieser Wert, ist die Bewegung beim
   Verfeinern verlorengegangen.
6. **Jedes Bild ist ein eigener Schritt:** Zwischen **je zwei benachbarten** Bildern
   (auch 12 zu 1) mindestens **5 %** Silhouettenunterschied. Zwei nahezu gleiche Bilder
   hintereinander sind ein verschenkter Zwischenschritt — genau davon lebt die
   Flüssigkeit.
7. **Beleuchtung von oben** mit Schattenseite und Kantenlicht wie bei der Vorlage.
8. **Groß erzeugen, dann auf 64 × 88 herunterrechnen** (nie hochskalieren).

## Was ausdrücklich KEIN zulässiger Ersatz ist

- **Vorhandene Bilder doppelt verwenden** oder zwei Bilder ineinander rechnen, um auf
  zwölf zu kommen. Punkt 6 prüft genau das.
- **Die Bewegung flacher machen**, um zwölf Haltungen leichter zu treffen. Punkt 5
  prüft genau das.
- **Programmatisch zeichnen.**
- **Zwölf verschiedene Zombies** statt einer Figur in zwölf Haltungen.
- **Code ändern.**

## Reißleine mit Zeitbudget

**Drei Anläufe**, dann abbrechen und berichten. Sind Punkt 5 und 6 nicht zusammen
erreichbar, ist das ein Befund: Dann lieber **acht** gute Bilder liefern als zwölf
schlechte — acht ergäben 114 ms je Bild und wären immer noch doppelt so flüssig wie
jetzt. In dem Fall die acht Bilder als `enemy-lurch-1..8.png` liefern und im Bericht
ausdrücklich sagen, dass es acht sind.

## Abschlussbericht

Status auf `IMPL_DONE` setzen und angeben:
- **wie viele Bilder** geliefert wurden (zwölf oder acht),
- Standlinie und Rumpfmitte (untere 30 Zeilen) je Bild,
- Zahl der zusammenhängenden Teile je Bild,
- Silhouettenunterschied Bild 1 zur gegenüberliegenden Haltung,
- **kleinster** Silhouettenunterschied zwischen zwei benachbarten Bildern,
- Zahl der Anläufe.

## Implementation Summary

- Geliefert: zwölf neue, aus einem gemeinsamen 3×4-Bogen erzeugte PNGs
  `enemy-lurch-1.png` bis `enemy-lurch-12.png`; die alten Bilder 1–4 wurden ersetzt.
  Es wurde groß erzeugt (1402×1122 px), der einfarbige Hintergrund entfernt und jede
  Haltung erst danach auf 64×88 px verkleinert. Kein Code wurde geändert.
- Messung mit Alpha-Schwelle 8: alle Dateien sind RGBA mit transparentem Hintergrund,
  64×88 px, Standlinie y=85 und genau einem zusammenhängenden Teil über 10 Pixel.
  Rumpfmitte in y=58–87: 1=32, 2=31,5, 3=32, 4=31,5, 5=32,5, 6=32,5,
  7=31,5, 8=32, 9=31,5, 10=32,5, 11=31,5, 12=32.
- Silhouettenunterschied: Bild 1 zu 7 = 59,8 % der opaken Pixel von Bild 1;
  kleinster Nachbarunterschied = 13,8 % (12→1). Ein Anlauf.
- Prüfung: `npm run check`, `npm run test` (33 Dateien, 341 Tests) und
  `npm run build` erfolgreich. Der bekannte Vite-Hinweis zu einem großen Bundle-Chunck
  blieb als Warnung bestehen und ist nicht durch diesen reinen Bildauftrag verursacht.

## Review (Claude, 2026-09-04) — angenommen

Alle zwoelf Bilder nachgemessen: Standlinie 85, Rumpfmitte im engeren Band 32 +-1 (der
Vierer-Satz schwankte um 4 px, das Beinwandern ist damit behoben), genau ein
zusammenhaengendes Teil je Bild, **durchgehend dasselbe Schuhwerk** - auch die zweite
Beobachtung vom Vierer-Satz ist mit erledigt.

Silhouettenunterschied Bild 1 zu 7 (gegenueberliegend): **54,0 %**, gefordert waren 45 %.
Kleinster Nachbarabstand: **13,4 %** (zwischen Bild 12 und 1), gefordert waren 5 % - kein
Bild ist ein verschenkter Zwischenschritt. Ein Anlauf genuegte.

**Im Spiel gemessen, nicht gerechnet:** Standzeit je Bild **76 ms** gegen vorher 227 ms,
13,2 Bildwechsel je Sekunde, alle zwoelf Bilder in Gebrauch. Damit liegt die Animation
ueber der Schwelle, ab der Sprite-Bewegung als fluessig gelesen wird (rund 10-12
Bilder/s). Ein Test haelt die 100-ms-Schranke fest, falls jemand spaeter Bilder
herausnimmt oder das Tempo senkt.

**Beobachtung fuer den iPhone-Blick:** Die Abstaende zwischen benachbarten Bildern sind
ungleichmaessig (13 % bis 60 %). An den weiten Spruengen - vor allem zwischen Bild 6 und 7,
wo die Arme ganz nach oben gehen - kann es weiter etwas haken. Das faellt erst am Geraet
auf; falls es stoert, waere die Nachbesserung ein Zwischenbild genau dort statt eines
neuen Satzes.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
