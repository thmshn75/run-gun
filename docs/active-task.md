# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Straßenfarbe zurücknehmen und die Gegner wieder über die volle Fahrbahn verteilen**

Zwei Befunde aus Thomas' Test des perspektivischen Straßen-Umbaus (2026-08-20):

1. Das Betongrau gefällt ihm nicht — die Straße soll wieder ihre ursprüngliche dunkle
   Farbe bekommen.
2. **Die Zombies erscheinen ständig doppelt nebeneinander.** Das ist ein echter Fehler,
   verursacht durch die Spec des Straßen-Tasks.

## Anforderungen

### 1. Straßenfarben zurücksetzen

In `src/config/colors.ts` unter `WORLD_COLORS` die Werte von vor dem Betongrau
wiederherstellen:

- `road`: `0x172033`
- `roadEdge`: `0x34415d`
- `roadCenterLine`: `0xd8e0ef`

Das ist eine Geschmacksentscheidung von Thomas und wird ohne Diskussion umgesetzt.
Sonst nichts an `colors.ts` ändern.

### 2. Fehler: Gegner erscheinen zu dicht beieinander

**Ursache — nachgerechnet, nicht vermutet.** Der Straßen-Task legte fest, dass die
Fahrspur eines Gegners beim Spawnen aus `crowd.getAnchorRange()` abgeleitet wird. Das ist
falsch: Dieser Bereich beschreibt, wie weit sich **die eigene Truppe** bewegen darf, und
geht über nahezu die volle Bildbreite (25 bis 365 px, also 340 px). Die Umrechnung normiert
ihn auf die halbe **Bild**breite (195 px), multipliziert das Ergebnis aber mit der halben
**Straßen**breite am Spawnpunkt (87 px).

Folge: Alle Gegner erscheinen in einem Streifen von nur 152 px statt über die volle
Fahrbahn verteilt. Bei Gegnern, die selbst 21 bis 40 px breit sind, überlappen sie sich
dadurch zwangsläufig — Thomas sieht sie „doppelt nebeneinander".

Der Fehler liegt in der Spec des Straßen-Tasks, nicht in dessen Umsetzung.

**Korrektur:** Die Fahrspur wird **gleichmäßig über die volle Fahrbahnbreite gezogen**,
also als Zufallswert zwischen −1 (linker Rand) und +1 (rechter Rand). Sie wird **nicht**
mehr aus `crowd.getAnchorRange()` abgeleitet — dieser Bereich hat mit der Fahrbahn nichts
zu tun.

Der bestehende Mechanismus bleibt sonst unverändert: Der Gegner behält seine Spur und
fächert beim Näherkommen nach außen auf.

Damit ein Gegner nicht halb neben der Fahrbahn erscheint, wird die Spur so begrenzt, dass
seine **sichtbare Breite** am Spawnpunkt noch auf der Straße liegt (halbe `bodyWidth` des
Typs gegen die halbe Straßenbreite rechnen).

### 3. Mindestabstand beim Erscheinen

Auch bei gleichmäßiger Verteilung können zwei Gegner zufällig nebeneinander erscheinen —
die Fahrbahn ist oben nun einmal schmal. Deshalb zusätzlich:

Beim Spawnen prüfen, ob bereits ein aktiver Gegner **im oberen Bildbereich** (Vorschlag:
`y` kleiner als seine eigene Höhe plus 20 px) eine zu ähnliche Spur hat. „Zu ähnlich"
heißt: Der horizontale Abstand der beiden am Spawnpunkt beträgt weniger als die Summe ihrer
halben `bodyWidth` plus einen Sicherheitsabstand von 6 px.

Ist das der Fall, wird die Spur neu gezogen — **höchstens fünf Versuche**, danach wird der
Gegner mit der zuletzt gezogenen Spur gespawnt. Kein Verwerfen des Spawns, keine
Endlosschleife.

Die Zahl der Versuche und der Sicherheitsabstand gehören nach `balance.ts` unter `enemy`,
nicht in den Code.

## Grenzen

Nichts anderes anfassen. Insbesondere **nicht**: die Straßengeometrie oder
`road.topWidthRatio` ändern; Gegnerwerte (`hp`, `speedFactor`, `bodyWidth`, `coinValue`,
Wellen) ändern; die Spawnrate ändern; `src/assets/player.png` anfassen (die Figur ist
korrekt und bleibt); an Toren, Münzen oder Waffen arbeiten. `docs/spec-e4b-entwurf.md` und
`docs/naechste-tasks.md` bleiben unverändert.

## Reißleine

Verteilen sich die Gegner nach der Korrektur immer noch sichtbar zu eng, liegt es an der
schmalen Fahrbahn selbst. Dann **melden und stoppen** — die Lösung wäre, `topWidthRatio`
von 0,46 anzuheben, und das ist eine Abwägung zwischen Tiefenwirkung und Spielbarkeit, die
Thomas trifft.

**Kein zulässiger Ersatz ist:** die Spawnrate senken, damit weniger Gegner gleichzeitig
erscheinen; Gegner kleiner machen; die Perspektive abschalten; die Spur wieder aus dem
Ankerbereich ableiten; mehr als fünf Wiederholungsversuche zulassen.

## Akzeptanzkriterien

1. Die Straßenfarben stehen wieder auf `0x172033` / `0x34415d` / `0xd8e0ef`.
2. Die Fahrspur wird gleichmäßig über die volle Fahrbahnbreite gezogen und **nicht** mehr
   aus `crowd.getAnchorRange()` abgeleitet.
3. Kein Gegner erscheint teilweise neben der Fahrbahn.
4. Zwei gleichzeitig im oberen Bildbereich sichtbare Gegner überlappen sich nicht; der
   Abstandstest nutzt die `bodyWidth` der beteiligten Typen.
5. Die Wiederholung ist auf fünf Versuche begrenzt; ein Spawn wird nie verworfen.
6. Sicherheitsabstand und Versuchszahl stehen in `balance.ts`.
7. Gegner behalten weiterhin ihre Spur und fächern beim Näherkommen auf.
8. `npm run check` und `npm run build` laufen fehlerfrei durch.

**Offen bis zu Thomas' iPhone-Test:** ob sich die Gegner jetzt angenehm verteilen.

## Implementation Summary

- `WORLD_COLORS.road`, `roadEdge` und `roadCenterLine` stehen wieder auf `0x172033`, `0x34415d` und `0xd8e0ef`.
- Der Spawner zieht die Gegner-Spur nun gleichmäßig innerhalb der am Spawnpunkt sichtbaren Fahrbahn; die Truppen-Ankerreichweite wird nicht mehr verwendet. Der Gegner behält die Spur weiterhin beim Auffächern nach außen.
- Aktive Gegner im oberen Bildbereich blockieren zu nahe Spuren anhand beider `bodyWidth`-Werte. `spawnLaneMaxAttempts: 5`, `spawnLaneSafetyGap: 6` und der obere Prüfrand stehen unter `BALANCE.enemy`; ein Spawn wird nach dem letzten Versuch nie verworfen.
- Erfolgreich: `git diff --check`, `npm run check` und `npm run build` (nur die bekannte nicht blockierende Vite-Warnung zur Bundlegröße). Kein iPhone-Test möglich, weil er Thomas' Gerät erfordert; die Spielgefühl-Prüfung bleibt wie spezifiziert offen.

## Zuletzt abgeschlossen (2026-08-20)

- E4a inklusive drei Nacharbeiten: Truppe als Lebensanzeige, Trefferzone am Bildrand,
  ehrliche SPD-Anzeige, Tore ohne Leerwahl.
- GUNS in TEAM aufgegangen; alle Figuren feuern reihum, Salvengröße 8.
- PWA lädt sich nach einem Update selbst neu.
- Drei Gegnertypen mit Wellenverteilung, Kontaktschaden und Münzwerten; Sprites sind Zombies,
  Trefferflächen auf die sichtbare Figur begrenzt.
- iPhone-Test bestanden (Thomas, 2026-08-20). Einziger Befund: leichter Gegner zu dünn.

## Offen / als Nächstes

- **E4b** — drei Zusatzwaffen (Schrot, Laser, Rakete) + Waffen-Tore. Projektil-Spitzenlast
  ist gerechnet (Schrot brachial: 7 Kugeln, Rate 40 %, Reichweite 280 px → Pool 112).
  Spec liegt vorbereitet in `docs/spec-e4b-entwurf.md`.
- **E4c** — Gegner als Truppen (Formationsrechnung ist dafür vorbereitet).
- Hintergrundgestaltung (Thomas' Wunsch, eigener Task).
- Kleinigkeit: Tore überlappen beim Erscheinen kurz die HUD-Leiste.
