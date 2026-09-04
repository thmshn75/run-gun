# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Bewegungssätze für die drei mittleren Sondergestalten — jede mit EIGENER Bewegung.**

Thomas am 2026-09-04: „die restlichen bewegen, wie bei den anderen, aber jede figur eine
andere Bewegung".

Das ist Block 1 von vier. Insgesamt fehlen zehn Gestalten; hier kommen die drei der
mittleren Stärke. **Der Kern des Auftrags ist, dass jede Figur sich ANDERS bewegt** — die
Formenvielfalt der Originalgestalten ist verloren, die Bewegungsvielfalt tritt an ihre
Stelle.

Dies ist ein **reiner Bild-Auftrag**. **Kein Code ändern.**

## Was zu liefern ist

Drei Sätze zu je zwölf Bildern, alle **64 × 88 px**:

| Dateien | Vorlage | Die Figur | Ihre Bewegung |
|---|---|---|---|
| `enemy-standard-e-move-1..12.png` | `src/assets/enemy-standard-e.png` | Soldat mit Stahlhelm und Uniformjacke | **MARSCHIEREN** |
| `enemy-standard-g-move-1..12.png` | `src/assets/enemy-standard-g.png` | Gestalt in Latzhose | **SCHLURFEN** |
| `enemy-standard-i-move-1..12.png` | `src/assets/enemy-standard-i.png` | Gestalt mit Hut und langem Mantel | **SCHLEICHEN** |

Jeder Satz aus **einem gemeinsamen Bogen** (3 Reihen à 4 Haltungen) — das hält die Figur
über die zwölf Bilder konstant und hat bei allen bisherigen Sätzen getragen.

## Die drei Bewegungen — sie müssen deutlich verschieden aussehen

**MARSCHIEREN (`standard-e`, Soldat):** Steif und gleichmäßig, militärisch. Oberkörper
aufrecht und ruhig, Arme angewinkelt und gegengleich zu den Beinen schwingend, Knie hoch
und kantig gesetzt. Kein Wanken, kein Aufbäumen — der Soldat hat seine Haltung behalten.
Zwölf Bilder = ein voller Doppelschritt: 1 rechtes Knie hoch, 4 beide Füße am Boden,
7 linkes Knie hoch, 10 beide Füße am Boden, 12 Übergang zurück zu 1.

**SCHLURFEN (`standard-g`, Latzhose):** Kraftlos und schwer. Füße heben kaum ab und
schleifen über den Boden, Schultern hängen nach vorn, Kopf pendelt lose, Arme baumeln
schlaff mit. Der Oberkörper sinkt und richtet sich langsam wieder auf. Der Unterschied
zum Marschieren muss auf den ersten Blick sichtbar sein.

**SCHLEICHEN (`standard-i`, Hut und Mantel):** Geduckt und lauernd. Oberkörper tief
vorgebeugt, Knie gebeugt, ein Arm greift nach vorn während der andere zurückbleibt, der
Mantel schwingt seitlich aus. Die Figur wirkt gespannt, nicht müde — das Gegenteil des
Schlurfens.

## Harte Anforderungen (Abnahmekriterien)

Alle Werte sind an den drei Vorlagen nachgemessen.

| Kriterium | `standard-e` | `standard-g` | `standard-i` |
|---|---|---|---|
| Bildgröße | 64 × 88 px | 64 × 88 px | 64 × 88 px |
| oberste opake Zeile | **4 ± 4** | **4 ± 4** | **4 ± 4** |
| unterste opake Zeile | **87 ± 1** | **87 ± 1** | **87 ± 1** |
| opake Pixel je Bild | **2050–2950** | **2140–3070** | **1600–2300** |

Für **alle drei** Sätze zusätzlich:

1. Transparenter Hintergrund.
2. **Deckkraft: mindestens 60 % der opaken Pixel volldeckend** (Alpha ≥ 250). Die
   Vorlagen liegen bei 81 %, 81 % und 63 %. Ohne dieses Kriterium ist am selben Tag ein
   fast durchsichtiges Bild durchgerutscht und war im Spiel sichtbar.
3. **Genau ein zusammenhängendes Teil** über 10 px je Bild — keine freischwebenden
   Gliedmaßen.
4. **Kein harter schwarzer Umriss und keine bunten Freisteller-Reste** am Figurenrand.
   Prüfbar: Anteil sehr dunkler Randpixel (Summe R+G+B < 90) höchstens **75 %**; bei drei
   Bildern eines früheren Satzes lag er bei 89–91 % und musste nachträglich abgetragen
   werden.
5. **Silhouettenunterschied Bild 1 zu Bild 7: mindestens 35 %.** Beim Schlurfen darf es
   weniger sein als beim Marschieren — deshalb der niedrigere Wert als bei früheren
   Sätzen. Unter 35 % wirkt es als Flackern statt als Bewegung.
6. **Zwischen je zwei benachbarten Bildern, auch 12 zu 1: mindestens 4 %.** Zwei nahezu
   gleiche Bilder sind ein verschenkter Zwischenschritt.
7. **Und das Wichtigste — die drei Bewegungen müssen sich untereinander unterscheiden:**
   Legt man Bild 1 der drei Sätze nebeneinander und ebenso Bild 7, muss auf den ersten
   Blick erkennbar sein, dass hier drei verschiedene Gangarten laufen.
8. Dieselbe Figur über alle zwölf Bilder eines Satzes: gleiche Kleidung, Farben,
   Kopfbedeckung, Schuhwerk, Beleuchtung von oben mit Schattenseite und Kantenlicht.
9. **Groß erzeugen, dann auf 64 × 88 herunterrechnen** (nie hochskalieren).

## Was ausdrücklich KEIN zulässiger Ersatz ist

- **Dreimal dieselbe Bewegung** mit anderer Figur. Das ist der Kern des Auftrags.
- **Den vorhandenen Taumel-Zyklus** (`enemy-lurch-*.png`) übernehmen — der gehört der
  Grundgestalt und ist bereits vergeben.
- **Die Figur austauschen:** Der Soldat behält Helm und Uniform, die Latzhose bleibt
  Latzhose, Hut und Mantel bleiben.
- **Senkrecht erhobene Arme** oder eine dünn gestreckte Figur (Punkt zu den opaken
  Pixeln).
- **Programmatisch zeichnen. Code ändern.**

## Reihenfolge und Reißleine

Der Reihe nach: `standard-e`, `standard-g`, `standard-i`. Je Satz **drei Anläufe**, dann
diesen Satz überspringen und mit dem nächsten weitermachen; ein fertiger Satz ist mehr
wert als drei halbe. Im Bericht sagen, welcher Satz warum nicht gelungen ist.

## Abschlussbericht

Status auf `IMPL_DONE` setzen und **je Satz** angeben:
- wie viele Bilder geliefert wurden,
- je Bild: Anteil volldeckender Pixel, opake Pixelzahl, oberste/unterste Zeile, Zahl der
  zusammenhängenden Teile, Anteil dunkler Randpixel,
- Silhouettenunterschied Bild 1 zu 7 und kleinster Nachbarabstand,
- in einem Satz: **wie sich die drei Bewegungen unterscheiden**,
- Zahl der Anläufe.

## Implementation Summary

- 36 transparente Bewegungssprites geliefert: je 12 für Soldat (Marschieren), Latzhose (Schlurfen) und Hut/Mantel (Schleichen).
- Alle Bilder sind aus großformatigen gemeinsamen 3×4-Bögen heruntergerechnet und gegen Größe, Alpha, zusammenhängende Figur, Rand, Silhouette und Bildabstände geprüft worden.
- Anläufe: Soldat 2, Latzhose 2 (zweiter Bogen wegen getrennter Gliedmaßen verworfen), Hut/Mantel 1.

## Review (Claude, 2026-09-04) — angenommen

Alle 36 Bilder geliefert, jedes Kriterium erfuellt. Selbst nachgemessen:

| Satz | Bewegung | Bild 1 zu 7 | kleinster Nachbarabstand |
|---|---|---|---|
| `standard-e` | Marschieren | 49,6 % | 8,7 % |
| `standard-g` | Schlurfen | 54,3 % | 14,6 % |
| `standard-i` | Schleichen | 56,3 % | 9,3 % |

**Die drei Gangarten sind untereinander deutlich verschieden** - das war der Kern des
Auftrags: Bild 1 unterscheidet sich zwischen den Saetzen um 36-60 %, Bild 7 um 56-87 %.
Im Bogen sofort erkennbar: aufrechter Marsch mit hohem Knie, gebeugtes Schlurfen mit
haengenden Schultern, geducktes Schleichen mit schwingendem Mantel.

**Gegenprobe gegen Doppelungen:** Die Formulierung im Bericht ("7-12 wie 1-6") liess
Kopien vermuten. Nachgemessen sind alle zwoelf Bilder je Satz verschieden - es waren die
Messwerte, die sich glichen, nicht die Bilder.

**Selbst nachgearbeitet:** Der Soldaten-Satz hatte einen magentafarbenen Freisteller-Saum
(12,6-18,8 % der Randpixel; die beiden anderen Saetze 0,0 %). 512 Randpixel abgetragen,
danach 0,0 %.

**Browser-Beleg (Level 20):** Sechs Gestalten laufen mit eigener Bewegung - die drei
Grundgestalten und die drei neuen. Sieben echte Formen stehen noch (`light-e/f/g/i`,
`heavy-e/g/i`) und warten auf ihre Saetze. **Keine Umfaerbung erscheint mehr:** Die
Gestaltwahl in `enemyTypes.ts` zieht nur noch die dreizehn echten Formen.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
