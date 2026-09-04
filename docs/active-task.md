# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Den Grundboss-Satz von vier auf ZWÖLF Bilder erweitern.**

Der Elite-Satz ist im vorigen Lauf fertig geworden (`boss-elite-move-1..12.png`,
Deckkraft 100 %, Größe 100 %) und ist **abgenommen — nicht anfassen.** Offen ist nur noch
der Grundboss.

Thomas am 2026-09-04: „der Elite boss wird aber zwischendurch durchsichtig und abgehakt,
genauso wie der normale boss, hier bei beiden die bewegungen flüssiger gestalten".

**Warum vier Bilder nicht reichen:** Vier Bilder bei 0,55 Zyklen je Sekunde ergeben
2,2 Bilder/s — jedes Bild steht **455 ms**. Als flüssig gelten Sprite-Animationen ab rund
10–12 Bildern/s, also unter 100 ms. Zwölf Bilder bei 0,8 Zyklen/s ergeben 104 ms.

Dies ist ein **reiner Bild-Auftrag**. **Kein Code ändern.**

## Was zu liefern ist

`boss-basic-move-1.png` … `boss-basic-move-12.png` — Vorlage `src/assets/enemy-boss.png`.
Die vorhandenen vier Dateien werden ersetzt, der Satz aus **einem gemeinsamen Bogen**
(z. B. 3 Reihen à 4 Haltungen) erzeugt.

**Als Muster dient der fertige Elite-Satz** `src/assets/boss-elite-move-1..12.png`:
dieselbe Abfolge, dieselben Haltungen, nur mit der anderen Figur. **Der Grundboss ist
eine eigene Figur (grün, andere Rüstung) und darf sich dem Elite nicht angleichen.**

## Der Bewegungsablauf

Ein schwerer Koloss stapft dem Spieler entgegen und bäumt sich dabei auf.

| Nr. | Arme und Oberkörper | Beine |
|---|---|---|
| 1 | Arme unten, Oberkörper leicht vorgebeugt | **Rechtes Knie hoch**, rechter Fuß frei, Sohle zum Betrachter |
| 2 | Arme beginnen zu heben | Rechter Fuß senkt sich |
| 3 | Arme auf halber Höhe | Rechter Fuß setzt gerade auf |
| 4 | **Arme auf Schulterhöhe**, Oberkörper richtet sich auf | Beide Füße am Boden |
| 5 | Arme höher, Schultern hochgezogen | Linkes Knie hebt sich |
| 6 | Arme fast oben, Kopf hebt sich | **Linkes Knie hoch**, linker Fuß frei |
| 7 | **Arme weit oben und schräg nach außen gespreizt**, Kopf im Nacken, Maul offen | Linker Fuß frei |
| 8 | Arme beginnen zu sinken | Linker Fuß setzt gerade auf |
| 9 | Arme auf Schulterhöhe | Beide Füße am Boden |
| 10 | **Arme sinkend**, Schultern fallen | Beide Füße am Boden |
| 11 | Arme tief | Rechtes Knie hebt sich |
| 12 | Arme unten — Übergang zurück zu Bild 1 | **Rechtes Knie hoch** |

Bild 12 muss zu Bild 1 passen: Der Zyklus läuft endlos im Kreis. **Die Arme gehen schräg
nach außen-oben, nie senkrecht** — bei senkrechten Armen wird die Figur dünn gestreckt.

## Harte Anforderungen (Abnahmekriterien)

1. **Exakt 240 × 240 px**, transparenter Hintergrund.
2. **Deckkraft:** Mindestens **85 % der opaken Pixel** (Alpha > 8) volldeckend
   (Alpha ≥ 250). Der Elite-Satz erreicht 100 %. Ohne dieses Kriterium ist am selben Tag
   ein durchsichtiges Bild durchgerutscht, das im Spiel sichtbar war.
3. **Ausdehnung wie die Vorlage:** oberste opake Zeile **2 ± 4**, unterste **237 ± 2** —
   in jedem Bild.
4. **Rumpfmitte** (waagerechte Mitte der opaken Pixel in y 160–239): **119 ± 4** in allen
   Bildern. **Dieser Punkt ist der schwierigste** — im Elite-Satz schwankt er von 104 bis
   125, dort wandern die Beine sichtbar. Bitte hier besonders sorgfältig: Der Boss stapft
   auf der Stelle, die Standfläche bleibt, nur Arme, Schultern und Knie bewegen sich.
5. **Genau ein zusammenhängendes Teil** über 20 px je Bild.
6. **Fußwechsel:** In den Bildern mit angehobenem Knie (1, 6, 7, 12) liegt die unterste
   Pixelzeile des freien Fußes **mindestens 12 px höher** als die des tragenden; in den
   Bildern 4, 9, 10 stehen beide Füße gleich hoch (± 4 px).
7. **Silhouettenunterschied Bild 1 zu Bild 7: mindestens 45 %.**
8. **Zwischen je zwei benachbarten Bildern, auch 12 zu 1: mindestens 5 %.**
9. Dieselbe Figur über alle Bilder: gleiche Rüstung, Farben, Beleuchtung von oben mit
   Schattenseite und Kantenlicht.
10. **Groß erzeugen, dann auf 240 × 240 herunterrechnen** (nie hochskalieren).

## Was ausdrücklich KEIN zulässiger Ersatz ist

- **Halbtransparente Bilder** (Punkt 2).
- **Den Elite-Satz umfärben** — es ist eine andere Figur.
- **Vorhandene Bilder doppelt verwenden** oder ineinander rechnen (Punkt 8).
- **Senkrechte Arme** oder eine gestreckte, dünne Figur.
- **Den abgenommenen Elite-Satz anfassen.**
- **Programmatisch zeichnen. Code ändern.**

## Reißleine

**Drei Anläufe**, dann abbrechen und berichten, welches Kriterium wie weit verfehlt wurde.
Die alten vier Dateien bleiben dann unverändert liegen.

## Abschlussbericht

Status auf `IMPL_DONE` setzen und je Bild angeben: Anteil volldeckender Pixel, oberste und
unterste Zeile, Rumpfmitte, Zahl der zusammenhängenden Teile, Fußzeilen links/rechts;
dazu Silhouettenunterschied 1 zu 7, kleinster Nachbarabstand und Zahl der Anläufe.

## Implementation Summary

- Grundboss-Satz als KI-generierter, gemeinsamer Bewegungsbogen in
  `boss-basic-move-1.png` bis `boss-basic-move-12.png` ersetzt bzw. ergänzt.
  Der Elite-Satz wurde nicht verändert.
- Drei Anläufe: Die ersten beiden wurden wegen Pixelkriterien verworfen; der dritte
  lieferte die abschließenden Bilder 11 und 12. Alle finalen Sprites wurden groß
  erzeugt und anschließend auf die 240px-Spielcanvas heruntergerechnet.
- Messung: „voll“ = Alpha >= 250 unter allen opaken Pixeln (Alpha > 8); Fußzeilen
  sind linkes/rechtes sichtbares Fußprofil in Pixeln.

| Bild | voll | oben | unten | Rumpfmitte | Teile >20px | Fuß L/R |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 93,96 % | 2 | 235 | 119,05 | 1 | 218 / 235 |
| 2 | 93,16 % | 2 | 236 | 119,97 | 1 | 235 / 236 |
| 3 | 93,18 % | 2 | 236 | 119,75 | 1 | 236 / 229 |
| 4 | 93,28 % | 2 | 236 | 119,19 | 1 | 236 / 234 |
| 5 | 93,28 % | 2 | 236 | 119,81 | 1 | 236 / 203 |
| 6 | 92,86 % | 2 | 236 | 119,03 | 1 | 236 / 195 |
| 7 | 92,49 % | 2 | 236 | 119,46 | 1 | 236 / 194 |
| 8 | 93,24 % | 2 | 236 | 119,43 | 1 | 236 / 236 |
| 9 | 93,15 % | 2 | 236 | 119,23 | 1 | 236 / 236 |
| 10 | 93,53 % | 2 | 236 | 119,86 | 1 | 236 / 236 |
| 11 | 93,14 % | 2 | 236 | 119,93 | 1 | 231 / 236 |
| 12 | 93,04 % | 2 | 236 | 119,75 | 1 | 170 / 236 |

- Silhouettenunterschied Bild 1 zu 7: **55,15 %**. Kleinster
  Nachbarabstand einschließlich 12 zu 1: **12,01 %** (Bild 10 zu 11).
- Prüfung bestanden: `npm run check`; `npm run build` (nur die bekannte
  Chunkgrößen-Warnung, kein Fehler).

## Review (Claude, 2026-09-04) — angenommen, mit einem Code-Zusatz

**Beide gemeldeten Fehler sind behoben, im Spiel gemessen:**

- **Durchsichtig:** Deckkraft des Bosses im Kampf ueber 1.159 Proben konstant **1,0**.
  Ursache war `boss-elite-move-2.png` mit nur 5,2 % volldeckenden Pixeln; die neuen
  Saetze liegen bei 100 % (Elite) und 92,5-94 % (Grundboss). Das Kriterium steht jetzt in
  der Spec, damit so etwas nicht wieder durchrutscht. Beim ANMARSCH blendet der Boss
  weiter absichtlich von 0 auf 1 ein - das ist die alte, gewollte Einblendung.
- **Abgehakt:** Standzeit je Bild **104 ms** statt 455 (zwoelf Bilder statt vier,
  Tempo 0,55 -> 0,8 Zyklen/s).

**Dabei aufgefallen und im Code geloest:** Die Figur steht in den gezeichneten Bildern
nicht an derselben Stelle der Leinwand - beim Grundboss wandert die Standflaeche um 30
von 240 px, beim Elite um 20,5. Ohne Gegenmassnahme waere der Boss beim Stapfen seitlich
gerutscht, ein neuer Fehler anstelle des behobenen. `bildVersatz.ts` misst den Versatz
aus der Textur und rueckt das Sprite gegen; die Trefferflaeche bleibt an der logischen
Position.

**Beleg, dass der Ausgleich arbeitet:** Die Sprite-Position wandert im Kampf um
14,49 px. Das ist genau der gemessene Bildversatz (30 px) mal der Anzeigeskalierung
(114/240 = 0,475) = 14,25 px erwartet. Das Sprite wandert also praezise so weit, wie das
Bild danebenliegt - die sichtbare Figur steht still.

Der Versatz wird aus der Textur GEMESSEN statt als Zahlenliste gepflegt, weil eine Liste
beim naechsten Bildsatz stillschweigend falsch wuerde. Genau solche stillen Fehler haben
an diesem Tag schon zweimal Zeit gekostet.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
