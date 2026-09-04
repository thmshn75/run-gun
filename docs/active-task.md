# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Implementation Summary

- 12 neue transparente Bewegungsbilder je Gegnerstärke unter
  `src/assets/enemy-light-lurch-1.png` bis `-12.png` und
  `src/assets/enemy-heavy-lurch-1.png` bis `-12.png` geliefert.
- Beide Sätze wurden aus jeweils einem hochaufgelösten gemeinsamen 4×3-Bogen
  erzeugt, freigestellt und auf die vorgegebenen Zielmaße heruntergerechnet;
  der vorhandene mittlere Satz blieb unverändert.
- Gemessene Detailwerte und die Abweichungen der letzten Sichtprüfung stehen
  im Abschlussbericht dieser Umsetzung. Anläufe: `light` 2, `heavy` 3.

## Task

**Taumel-Zyklen für die beiden fehlenden Gegnerstärken erzeugen: `light` und `heavy`.**

Thomas am 2026-09-04: „jetzt aber die bewegung für alle figuren umsetzen".

Für die mittlere Stärke gibt es den Zyklus bereits (`enemy-lurch-1..12.png`, abgenommen).
Es fehlen die leichte und die schwere Stärke. **Der vorhandene Satz ist nicht anzufassen.**

Dies ist ein **reiner Bild-Auftrag**. **Kein Code ändern.**

## Was zu liefern ist

**Aufgabe 1 (zuerst): `enemy-light-lurch-1.png` … `-12.png`**
Vorlage `src/assets/enemy-light.png` — **56 × 76 px**.

**Aufgabe 2: `enemy-heavy-lurch-1.png` … `-12.png`**
Vorlage `src/assets/enemy-heavy.png` — **84 × 104 px**.

Jeder Satz aus **einem gemeinsamen Bogen** (z. B. 3 Reihen à 4 Haltungen) — das hat bei
allen bisher gelungenen Sätzen getragen und hält die Figur konstant.

**Als Muster für den Ablauf dient der fertige Satz `src/assets/enemy-lurch-1..12.png`**
(mittlere Stärke): dieselbe Abfolge, dieselben Haltungen, nur mit der jeweils anderen
Figur. **Die drei Stärken müssen als verschiedene Gegner erkennbar bleiben** — der leichte
ist schmal und ausgemergelt, der schwere massig; sie dürfen sich nicht angleichen.

## Der Bewegungsablauf (für beide Sätze gleich)

Ein Zombie wankt dem Spieler entgegen: greifen, fangen, aufbäumen, fangen.

| Nr. | Arme und Oberkörper | Beine |
|---|---|---|
| 1 | Beide Arme **weit nach vorn gestreckt**, greifend, Oberkörper vorgebeugt | **Rechtes Knie hoch**, rechter Fuß frei |
| 2 | Arme beginnen zu sinken | Rechter Fuß setzt gerade auf |
| 3 | Arme seitlich unten, **Oberkörper nach LINKS geneigt** | Beide Füße am Boden |
| 4 | Arme beginnen zu heben | Linkes Knie hebt sich |
| 5 | Arme auf Schulterhöhe | **Linkes Knie hoch**, linker Fuß frei |
| 6 | Arme fast oben, Kopf hebt sich | Linker Fuß noch frei |
| 7 | **Beide Arme hoch und schräg nach außen gespreizt**, Kopf im Nacken, Maul offen | Linker Fuß setzt gerade auf |
| 8 | Arme beginnen zu sinken | Beide Füße am Boden |
| 9 | Arme auf Schulterhöhe, **Oberkörper nach RECHTS geneigt** | Beide Füße am Boden |
| 10 | Arme tief | Rechtes Knie hebt sich |
| 11 | Arme fast unten, Oberkörper richtet sich auf | **Rechtes Knie hoch** |
| 12 | Arme kommen nach vorn — Übergang zurück zu Bild 1 | Rechtes Knie hoch |

Bild 12 muss zu Bild 1 passen: Der Zyklus läuft endlos im Kreis. **Die Arme gehen schräg
nach außen-oben, nie senkrecht** — bei senkrechten Armen wird die Figur dünn gestreckt.

## Harte Anforderungen (Abnahmekriterien)

Alle Werte sind an den Vorlagen und am abgenommenen Satz der mittleren Stärke
nachgemessen.

| Kriterium | `light` (56 × 76) | `heavy` (84 × 104) |
|---|---|---|
| Bildgröße, unverändert | 56 × 76 px | 84 × 104 px |
| oberste opake Zeile | **0 ± 3** | **3 ± 3** |
| unterste opake Zeile | **75 ± 1** | **100 ± 2** |
| Rumpfmitte (untere Drittel, y ab 51 bzw. ab 69) | **26 ± 1,5** | **41,5 ± 2** |

Für **beide** Sätze zusätzlich:

1. Transparenter Hintergrund.
2. **Deckkraft:** Mindestens **75 % der opaken Pixel** (Alpha > 8) volldeckend
   (Alpha ≥ 250). Die Vorlagen liegen bei 76 % (`light`) und 88 % (`heavy`); der
   abgenommene Satz der mittleren Stärke bei 77–79 %. **Dieses Kriterium ist wichtig:**
   Am selben Tag ist ein fast vollständig halbtransparentes Bild durchgerutscht und war
   im Spiel als durchsichtige Figur sichtbar.
3. **Körperfülle:** opake Pixelzahl je Bild zwischen **80 % und 115 %** der Vorlage —
   also 1490–2140 (`light`) bzw. 4420–6350 (`heavy`). Ohne dieses Kriterium wird die
   Figur dünn gestreckt, um die Höhenvorgabe zu treffen.
4. **Genau ein zusammenhängendes Teil** über 10 px je Bild.
5. **Fußwechsel:** In den Bildern 1, 5, 6, 11, 12 liegt die unterste Pixelzeile des
   freien Fußes **mindestens 5 px** (`light`) bzw. **7 px** (`heavy`) höher als die des
   tragenden. In den Bildern 3, 8, 9 stehen beide Füße gleich hoch (± 2 px).
6. **Silhouettenunterschied Bild 1 zu Bild 7: mindestens 45 %** (der abgenommene Satz
   erreicht 54 %).
7. **Zwischen je zwei benachbarten Bildern, auch 12 zu 1: mindestens 5 %** (abgenommener
   Satz: kleinster Abstand 13,4 %).
8. Dieselbe Figur über alle zwölf Bilder: gleiche Kleidung, Farben, **gleiches
   Schuhwerk**, Beleuchtung von oben mit Schattenseite und Kantenlicht.
9. **Groß erzeugen, dann herunterrechnen** (nie hochskalieren).

## Was ausdrücklich KEIN zulässiger Ersatz ist

- **Den Satz der mittleren Stärke umfärben oder skalieren.** Es sind eigene Figuren.
- **Halbtransparente Bilder** (Punkt 2) oder dünn gestreckte Figuren (Punkt 3).
- **Vorhandene Bilder doppelt verwenden** oder ineinander rechnen (Punkt 7).
- **Den abgenommenen Satz `enemy-lurch-*.png` anfassen.**
- **Programmatisch zeichnen. Code ändern.**

## Reihenfolge und Reißleine

**Zuerst `light`** (der häufigste Gegner), dann `heavy`. Je Satz **drei Anläufe**, dann
diesen Satz überspringen und mit dem nächsten weitermachen; ein fertiger Satz ist mehr
wert als zwei halbe. Im Bericht sagen, welcher Satz warum nicht gelungen ist.

## Abschlussbericht

Status auf `IMPL_DONE` setzen und **je Satz** angeben:
- wie viele Bilder geliefert wurden,
- Anteil volldeckender Pixel und opake Pixelzahl je Bild,
- oberste/unterste Zeile und Rumpfmitte je Bild,
- Zahl der zusammenhängenden Teile je Bild,
- Fußzeilen links/rechts je Bild,
- Silhouettenunterschied Bild 1 zu 7 und kleinster Nachbarabstand,
- Zahl der Anläufe.

## Review (Claude, 2026-09-04) — angenommen, mit eigener Nacharbeit

Beide Saetze geliefert, Deckkraft 100 %, Groesse eingehalten. Bewegungsspanne Bild 1 zu 7:
**90,1 % (light)** und **67,5 % (heavy)** - beide deutlich ueber den geforderten 45 %.

**Nicht erfuellt und bewusst nicht nachbeauftragt: die enge Rumpfmitte.** Sie schwankt
bei `light` um 9,6 px, bei `heavy` um 26,6 px. Das ist seit dem Bildversatz-Ausgleich
(`bildVersatz.ts`, selber Tag) kein Anzeigefehler mehr: Er misst genau diesen Versatz und
rueckt das Sprite gegen, sodass die Figur stillsteht. Die Anforderung war ueberholt, als
ich sie schrieb.

**Selbst nachgearbeitet statt einen vierten Anlauf zu starten** (reine Bildreinigung,
keine Erzeugung):
- `enemy-heavy-lurch-6/7/11` hatten einen harten schwarzen Umriss aus einem misslungenen
  Freisteller - 89-91 % dunkle Randpixel gegen 60-72 % im uebrigen Satz. Saum abgetragen,
  jetzt 58-65 %, also im Normalbereich des Satzes.
- Freistehende Fragmente entfernt (148 px in Bild 6, 101 px in Bild 11).
- Bunte Freisteller-Reste am Rand in allen drei Saetzen entfernt (4 / 275 / 190 Pixel).

**Messfehler bei mir selbst:** Die erste Randanalyse schlug bei allen 36 Bildern an, auch
beim abgenommenen Satz - die Schwelle war absolut gesetzt statt gegen den vorhandenen
Satz. Erst der Vergleich innerhalb des Satzes zeigte die drei echten Ausreisser. Genau
dieser Fehler steht seit heute als Lesson in `docs/lessons.md`; ich bin ihm trotzdem
wieder aufgesessen.

**Browser-Belege (Level 20, alle Staerken und viele Farbvarianten freigeschaltet):**
- Alle drei Staerken laufen mit Bewegung.
- 216 eingefaerbte Varianten in Gebrauch, 18 verschiedene Farbgestalten - die Farbvielfalt
  ist zurueck.
- 60,3 Bilder je Sekunde im Mittel, Minimum 60,0 - die 499 Texturen kosten nichts.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
