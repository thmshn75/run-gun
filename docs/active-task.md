# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Himmel und Horizont: oben Tageshimmel, darunter der Horizont, neben der Fahrbahn Boden.**

Thomas-Entscheidungen vom 2026-08-20: **Aufbau** = Horizont oben mit Himmel darüber, neben
der Fahrbahn Boden (nicht: Straße schwebt im Himmel). **Stimmung** = heller Tag.

Damit wird auch die offene Frage aus `docs/naechste-tasks.md` eingelöst: Die Fahrbahnfarbe
wurde testweise betongrau gemacht und zurückgesetzt, weil Thomas den Kontrast aus dem neuen
Hintergrund holen wollte. **Fahrbahn- und Umgebungsfarben werden deshalb in diesem Task
zusammen entschieden, nicht nacheinander.**

## Was sich dadurch geometrisch ändert

Heute beginnt die Fahrbahn am oberen Bildrand (`y = 0`). Ein Horizont bedeutet, dass sie
weiter unten beginnt. Oberhalb liegt Himmel, unterhalb links und rechts Boden.

- Neuer Balance-Wert `road.horizonY`, **150**. Herleitung: Auf dem iPhone liegt die
  HUD-Leiste bei y ≈ 59 bis 121 (Safe-Area oben ≈ 47 px + 12 px Rand + 62 px Höhe). Ein
  Horizont darüber wäre von der Leiste verdeckt. Bei 150 bleibt darunter ein frei sichtbarer
  Himmelsstreifen, und oberhalb der Leiste ist ebenfalls Himmel zu sehen; die Leiste ist
  halbdurchsichtig, der Himmel scheint durch.
- `getRoadHalfWidth()` interpoliert künftig von `horizonY` bis `height` statt von `0` bis
  `height` — **und klemmt Werte oberhalb des Horizonts auf die Horizontbreite**. Dadurch
  liefern alle bestehenden Aufrufstellen (auch die mit `y = 0` in `spawnLanes`) weiterhin
  denselben Wert wie bisher am oberen Rand, und die Spurlogik bleibt unverändert gültig.
- Die Fahrbahn ist am Horizont **genauso breit wie heute am oberen Bildrand**
  (`topWidthRatio: 0.46`). Es wird nichts auf einen Punkt zusammengezogen — sonst passt kein
  Gegner mehr in die Spur und die Spurwahl aus `spawnLanes.ts` liefe leer.

## Eintritt am Horizont statt von oben

Gegner und Tore können nicht mehr von außerhalb des Bildes hereinrutschen — dort ist jetzt
Himmel. Sie erscheinen **am Horizont** und blenden auf, damit sie nicht aufpoppen.

- Gegner erscheinen bei `y = road.horizonY` statt bei `y = -bodyHeight / 2`.
- Tore erscheinen bei `y = road.horizonY` statt bei `y = -gateHeight / 2`.
- Neuer Wert `road.entryFadePx`, **40**: Über die ersten 40 px unterhalb des Horizonts steigt
  die Deckkraft linear von 0 auf 1. Danach normal. Die Berechnung läuft über die
  **zurückgelegte Strecke**, nicht über einen Zeitgeber — sonst hängt sie an der Bildrate.
- Der Aufblend-Zustand darf die Trefferlogik **nicht** verändern: Ein Gegner ist ab dem
  ersten Bild vollständig aktiv und trefferbar, nur eben noch durchscheinend.

## Weitere Stellen, die der Horizont berührt

Diese Punkte sind leicht zu übersehen und gehören ausdrücklich dazu:

- **Projektile** verschwinden heute bei `y + displayHeight / 2 < 0`. Künftig am Horizont
  (`< road.horizonY`), sonst fliegen die Geschosse sichtbar in den Himmel hinein.
- **Die Ziellinie** aus dem vorigen Task reicht heute bis `y = 0`. Künftig endet sie am
  Horizont.
- **Die Mittellinien-Segmente** in `road.ts` laufen heute über `y = height * progress²` von 0
  bis `height`. Sie müssen künftig am Horizont beginnen; die perspektivische Stauchung bleibt.
- **Die Fahrbahn-Textur** in `BootScene.createRoadTextures()` wird nur noch unterhalb des
  Horizonts gezeichnet.
- **Der Kamera-Hintergrund** (`WORLD_COLORS.background`) wird auf die obere Himmelsfarbe
  gesetzt, damit an keiner Kante Dunkles durchblitzt.

## Gate-Lesezeit — die einzige Kompensation in diesem Task

Der Weg eines Tores verkürzt sich von 749 px auf 564 px. Bei unveränderten 540 px/s
(`scrollSpeed` 180 + `gates.extraSpeed` 360) sinkt die Zeit, in der ein Tor sichtbar ist, von
**1,39 s auf 1,04 s** — ein Viertel weniger Lesezeit, direkt nachdem die Torlesbarkeit im
vorigen Task verbessert wurde.

Deshalb: `gates.extraSpeed` von 360 auf **227** senken. Rechnung: 564 px ÷ 1,39 s = 406 px/s
Gesamtgeschwindigkeit, minus `scrollSpeed` 180 = 226,6 → 227. Damit ist ein Tor exakt so lange
sichtbar wie heute. Den vorhandenen Kommentar zur Torstrecke entsprechend nachziehen.

## Was **nicht** kompensiert wird — und warum

Ich hatte Thomas zunächst angekündigt, die Fahrgeschwindigkeit auszugleichen, damit ein Gegner
genauso lange bis zu ihm braucht wie heute. **Das wird hier bewusst nicht gemacht.** Grund:
Der Ausgleich müsste `scrollSpeed`, alle drei `stats.speed`-Werte und die Schrot-Reichweite
gleichzeitig um 23 % senken. Das verlangsamt sichtbar den Bildlauf der Fahrbahn — also genau
das, was das Tempogefühl des Spiels ausmacht — und es vermischt eine Balance-Änderung mit
einer Optikänderung, sodass eine spätere Verschlechterung nicht mehr zuzuordnen wäre.

**Messbare Folge, die so bleibt:** Ein Standard-Gegner braucht bei Grundgeschwindigkeit vom
Erscheinen bis zur Truppe künftig **5,4 s statt 7,0 s** (564 px statt 736 px bei 105 px/s).
Die Vorwarnzeit sinkt um 23 %.

Ist das am iPhone zu hart, wird **ein einziger Wert** gesenkt: `stats.speed.base`. Das ist
Thomas' Entscheidung nach seinem Test, nicht Codex' und nicht Claudes.

## Farben

Alle neuen Farben nach `colors.ts` unter `WORLD_COLORS`. Startwerte, die Codex einsetzt:

| Zweck | Wert | Anmerkung |
|---|---|---|
| Himmel oben | `0x2f7fd1` | kräftiges Tagesblau |
| Himmel am Horizont | `0xbfe3f7` | hell, fast weiß |
| Horizontdunst | `0xdfeef8` | schmales helles Band direkt am Horizont |
| Boden | `0x3f5a3a` | gedämpftes Grün, deutlich dunkler als der Himmel |
| Fahrbahn | `0x4a4f57` | Asphaltgrau statt des heutigen `0x172033` |
| Fahrbahnrand | `0xe8ecf2` | helle Begrenzungslinie statt `0x34415d` |

Himmel und Boden werden als **je eine einmalig in `BootScene` erzeugte Textur** angelegt
(Verlauf im Himmel), nicht pro Bild gezeichnet. Beide liegen auf einer Ebene **unter**
`BALANCE.layers.road`; das Ebenensystem aus dem vorigen Task wird dafür um einen Eintrag
`background` ergänzt.

## Pflicht: Kontrollbild

Vor dem Abschluss ein Kontrollbild erzeugen und unter `assets/probe/hintergrund-kontrolle.png`
ablegen (Ordner liegt in `.gitignore`): die vier Figuren — Spielertruppe, leichter, mittlerer
und schwerer Zombie — auf der neuen Fahrbahn, dazu ein Ausschnitt mit Himmel, Horizont und
Boden. Beim Betongrau-Versuch hat genau dieses Vorgehen den Ausschlag gegeben.

**Zu prüfen ist am Kontrollbild:** Der leichte Zombie ist hell-beige, die eigene Truppe
rot-orange. Beide müssen sich vor der neuen Fahrbahn **und** vor dem Boden klar abheben.

## Reißleine

Hebt sich eine der vier Figuren auf dem neuen Untergrund nicht ab: **melden und stoppen**.

**Kein zulässiger Ersatz ist:**
- Die Sprites der Figuren ändern, um den Kontrast herzustellen.
- Den Himmel dunkler machen, bis es passt — Thomas hat „heller Tag" gewählt.
- Eine Kontur oder einen Schatten um die Figuren legen.
- Den Horizont weiter nach oben schieben, um dem Problem auszuweichen.

Die Fahrbahnfarbe ist der Wert, an dem gedreht werden darf — aber die Entscheidung darüber
trifft Thomas am Kontrollbild, nicht Codex im Alleingang.

## Akzeptanzkriterien

1. Oberhalb von `road.horizonY` ist Himmel mit Verlauf zu sehen, darunter links und rechts
   der Fahrbahn Boden. Am Horizont liegt ein schmales helles Dunstband.
2. Die Fahrbahn beginnt am Horizont und ist dort genauso breit wie heute am oberen Bildrand.
3. Gegner und Tore erscheinen am Horizont und blenden über die ersten 40 px auf; nichts
   springt sichtbar ins Bild und nichts erscheint oberhalb des Horizonts.
4. Ein Gegner ist vom ersten Bild an trefferbar, auch während er noch durchscheinend ist.
5. Projektile verschwinden am Horizont, nicht erst am oberen Bildrand; kein Geschoss ist im
   Himmel zu sehen.
6. Die Ziellinie endet am Horizont.
7. Ein Tor ist genauso lange sichtbar wie vorher — nachweisbar über `gates.extraSpeed` = 227
   und eine Sichtbarkeitsdauer von rund 1,39 s.
8. Die Spurwahl der Gegner funktioniert unverändert: 0 überlappende Gegner und eine
   Aufschub-Quote unter 5 % über drei Minuten, wie im Task vom 2026-08-20 gemessen.
9. Das Kontrollbild liegt vor und zeigt alle vier Figurentypen auf dem neuen Untergrund.
10. Kein `create()`/`destroy()` im laufenden Spiel; Himmel und Boden sind je ein einmalig
    erzeugtes Objekt.
11. `npm run check` und `npm run build` laufen fehlerfrei durch.

Kriterien 3 bis 8 prüft Claude am laufenden Spiel nach. Über Farbwirkung und darüber, ob die
kürzere Vorwarnzeit trägt, entscheidet Thomas am iPhone.
