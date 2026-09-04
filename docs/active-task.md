# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Vier Bewegungsbilder für EINEN Zombie erzeugen — zweiter Anlauf, andere Bewegung.**

Thomas am 2026-09-04: „versuche punkt 5 im testlevel" — gemeint ist die Frage, ob die
Zombies doch gezeichnete Bewegung bekommen können.

**Der erste Anlauf am selben Tag ist gescheitert** (Commit `1c113a7`): Bestellt war ein
Gangzyklus, geliefert wurden vier fast gleiche Haltungen — Bild 1 und 3 unterschieden
sich in nur **15 %** ihrer Silhouette, im Spiel las sich das als Flackern.

**Beim Boss hat es danach funktioniert** (69 % Unterschied). Der Grund ist bekannt und
bestimmt diesen Auftrag: Ein Gangzyklus besteht aus vier **ähnlichen** Haltungen. Ein
Aufbäumen aus vier **sehr verschiedenen**. Deshalb wird hier kein Gehen bestellt, sondern
**Taumeln und Greifen** — die Bewegung eines Zombies, der einem entgegenwankt.

Dies ist ein **reiner Bild-Auftrag**. **Kein Code ändern.**

## Was genau zu liefern ist

Vier PNG-Dateien nach `src/assets/`: `enemy-lurch-1.png` bis `enemy-lurch-4.png`.

**Vorlage: `src/assets/enemy-standard.png`** (64 × 88 px). Dieselbe Figur in vier
Haltungen — gleiche Kleidung, gleicher Körperbau, gleiche Farben, gleiche Beleuchtung.
Die Figur wird von vorn gesehen; die Zombies wanken dem Spieler entgegen.

| Datei | Arme und Oberkörper | Beine |
|---|---|---|
| `enemy-lurch-1` | **Beide Arme weit nach vorn gestreckt**, greifend, Hände etwa auf Brusthöhe; Oberkörper nach vorn gebeugt | **Rechtes Knie deutlich angehoben**, rechter Fuß frei in der Luft; linkes Bein trägt |
| `enemy-lurch-2` | Arme sinken seitlich herab, **Oberkörper nach LINKS geneigt** (er fängt sich) | Beide Füße am Boden |
| `enemy-lurch-3` | **Beide Arme hoch und weit gespreizt**, Kopf im Nacken, Maul offen — die auffälligste Haltung der vier | **Linkes Knie deutlich angehoben**, linker Fuß frei in der Luft; rechtes Bein trägt |
| `enemy-lurch-4` | Arme sinken, **Oberkörper nach RECHTS geneigt** | Beide Füße am Boden |

Als Folge abgespielt ergibt das ein Wanken: greifen, fangen, aufbäumen, fangen.

Bewährtes Verfahren: **einen gemeinsamen Bogen mit allen vier Haltungen erzeugen und ihn
zerschneiden** — so bleibt die Figur konstant. Das hat bei beiden Boss-Sätzen getragen.

## Harte Anforderungen (Abnahmekriterien)

Die Werte sind an der Vorlage nachgemessen; die Prozentwerte stammen aus dem
abgenommenen Boss-Satz.

1. **Exakt 64 × 88 px**, transparenter Hintergrund.
2. **Genau ein zusammenhängendes Teil über 10 Pixel je Bild** (keine freischwebenden
   Körperteile). Zusammenhangsanalyse der opaken Pixel, Alpha-Schwelle 8.
3. **Standlinie des tragenden Fußes bei 85 ± 1** in allen vier Bildern (Vorlage: 85).
4. **Rumpfmitte in den unteren 30 Zeilen (y 58–87) bei 32 ± 2** in allen vier Bildern
   (Vorlage: 32,0). Der Zombie wankt mit dem Oberkörper, aber seine Beine bleiben an
   derselben Stelle — sonst zuckt er seitlich über den Bildschirm.
5. **Figurenhöhe wie die Vorlage:** Oberkante bei 2 ± 2 in den Bildern 1, 2 und 4. In
   Bild 3 darf sie höher liegen, weil die Arme über den Kopf gehen.
6. **Fußkontakt wechselt** — das ist der Punkt, an dem der erste Anlauf gescheitert ist:
   In `enemy-lurch-1` berührt **nur der linke Fuß** die Standlinie, die unterste
   Pixelzeile des rechten Fußes liegt **mindestens 5 px höher**. In `enemy-lurch-3`
   genau umgekehrt. In `enemy-lurch-2` und `-4` stehen **beide Füße** auf gleicher Höhe
   (± 2 px).
7. **Silhouettenunterschied Bild 1 zu Bild 3: mindestens 45 % der opaken Pixel.** Zum
   Vergleich: Der gescheiterte erste Anlauf lag bei 15 %, der abgenommene Boss-Satz bei
   69 %. **Unter 45 % flackert es wieder — dann bitte melden statt liefern.**
8. **Beleuchtung von oben** mit Schattenseite und Kantenlicht wie bei der Vorlage.
9. **Groß erzeugen, dann auf 64 × 88 herunterrechnen** (nie hochskalieren).

## Was ausdrücklich KEIN zulässiger Ersatz ist

- **Einen Gangzyklus liefern** (vier Schritte). Genau daran ist der erste Anlauf
  gescheitert. Bestellt sind Greifen, Fangen, Aufbäumen, Fangen.
- **Die Beine nur leicht öffnen und schließen.** Ein Fuß muss sichtbar in der Luft sein
  (Punkt 6).
- **Programmatisch zeichnen.**
- **Vier verschiedene Zombies** statt einer Figur in vier Haltungen.
- **Code ändern.**

## Reißleine mit Zeitbudget

**Drei Anläufe**, dann abbrechen und berichten, welches Kriterium wie weit verfehlt
wurde. Ein belegtes „unter 45 % nicht erreichbar" ist ein brauchbares Ergebnis — dann
bleibt es bei der gerechneten Bewegung, die im Spiel bereits funktioniert.

## Abschlussbericht

Status auf `IMPL_DONE` setzen und **alle** Messwerte angeben:
- Standlinie, Oberkante und Rumpfmitte (untere 30 Zeilen) je Bild,
- Zahl der zusammenhängenden Teile je Bild,
- unterste Pixelzeile des linken und des rechten Fußes je Bild,
- Silhouettenunterschied Bild 1 zu Bild 3 in Prozent,
- Zahl der Anläufe.

## Implementation Summary

- Vier KI-erzeugte, freigestellte Bewegungsbilder in `src/assets/enemy-lurch-1.png`
  bis `enemy-lurch-4.png` abgelegt; aus einem gemeinsamen großen Vierer-Bogen
  ausgeschnitten und erst danach auf 64 × 88 px heruntergerechnet.
- Prüfung mit Alpha-Schwelle 8: Standlinie / Oberkante / Rumpfmitte unten je Bild:
  1: 85 / 2 / 33,94; 2: 85 / 2 / 32,37; 3: 85 / 0 / 30,68; 4: 85 / 2 / 32,40.
  Je Bild genau ein zusammenhängendes Teil über 10 Pixel. Fußunterkanten
  (links / rechts, aus Zombiesicht): 1: 85 / 65; 2: 85 / 85; 3: 67 / 85;
  4: 85 / 85. Silhouettenunterschied Bild 1 zu 3: 60,93 % (1.070 XOR-Pixel
  bei durchschnittlich 1.756 opaken Pixeln).
- Anläufe: 1 von maximal 3. Sichtprüfung bestätigt die vorgegebene Folge
  Greifen, links fangen, Aufbäumen, rechts fangen sowie Licht von oben.

## Review (Claude, 2026-09-04) — eingebaut, mit einem offenen Befund

**Der Bewegungswechsel hat getragen.** Silhouettenunterschied Bild 1 zu 3: **60,9 %**
(erster Anlauf mit Gangzyklus: 15 %, Boss-Satz: 69 %). Damit ist die Lehre vom selben Tag
bestaetigt: Nicht die Figurenart entscheidet, sondern ob die bestellte BEWEGUNG weit
auseinanderliegende Haltungen hat. Ein Anlauf genuegte.

Nachgemessen: Standlinie 85 in allen vier Bildern, genau ein zusammenhaengendes Teil je
Bild, keine freischwebenden Koerperteile.

**Eigene Messung korrigiert:** Beim ersten Nachmessen schien in Bild 3 kein Fuss
angehoben. Das war ein Messfehler - der angehobene und der tragende Fuss lagen auf
DERSELBEN Bildhaelfte, und die Aufteilung bei x=32 fand deshalb in beiden Haelften die
Standlinie. Der Blick aufs Bild zeigt den Beinwechsel eindeutig. Codex' Messung war
richtig, meine zu grob.

**OFFENER BEFUND fuer Thomas' Urteil: Die Beine wandern zwischen den Bildern.** Die
Rumpfmitte der unteren 30 Zeilen liegt bei 30,0 / 33,0 / 34,0 / 32,0 - eine Spanne von
4 px auf 64 px Bildbreite. Auf dem Bildschirm sind das rund 2,2 px bei 35,8 px
Figurenbreite. Zum Vergleich: Beim abgenommenen Boss-Satz betraegt dieselbe Spanne 2 px
auf 240 px, auf dem Bildschirm rund 0,9 px - der Zombie wackelt relativ also gut
siebenmal staerker.

Das kann als Taumeln gewollt wirken oder als Zucken stoeren; das ist eine
Gamefeel-Frage und deshalb Thomas' Urteil, keine Messfrage. Faellt es negativ aus, ist
die Nachbesserung klar benannt: Rumpfmitte auf 32 +-1 statt +-2.

Zweite Beobachtung fuer denselben Blick: Die Fussbekleidung wechselt zwischen den
Bildern (nackte Fuesse gegen Stiefel). Bei 4 px Fussgroesse im Spiel vermutlich unsichtbar.

Browser-Beleg Testgelaende: alle vier Bilder in Gebrauch, 4,29 Bildwechsel je Sekunde
(= 1,07 Taumelzyklen), Rotation konstant 0, groesster Positionssprung beim Bildwechsel
0,06 px. Daneben laufen `enemy-light`-Gegner mit der gerechneten Bewegung.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
