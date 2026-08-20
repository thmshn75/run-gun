# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Jeder Zombie lässt so viele Münzen fallen, wie er wert ist**

Thomas' Beobachtung im iPhone-Test: Der Münzzähler springt immer nur um eins weiter, obwohl
ein schwerer Zombie drei Münzen wert sein soll. Der Wert existiert heute nur als Zahl im
Inneren einer einzelnen Münze — sichtbar ist er nie, und ob er beim Zähler ankommt, lässt
sich beim Spielen nicht erkennen.

**Entscheidung (Thomas, 2026-08-20):** Der versteckte Münzwert entfällt. Stattdessen wirft
ein sterbender Zombie **so viele einzelne Münzen ab, wie er wert ist** — der leichte und
der Standardgegner je eine, der schwere drei. Jede eingesammelte Münze zählt genau eins.
Damit ist der Unterschied sichtbar, und der Zähler zeigt exakt das Eingesammelte.

Kleiner, klar umrissener Task. Er berührt `coins.ts`, `GameScene.ts` und `balance.ts`.
Er hat **nichts** mit E4b (Zusatzwaffen) zu tun; deren Spec in `docs/spec-e4b-entwurf.md`
bleibt unberührt.

## Anforderungen

### 1. `src/systems/coins.ts` — Wertmechanik entfällt

- `spawnAt(x, y)` verliert den Parameter `value`. Kein `setData('value', …)` mehr.
- Beim Einsammeln wird `collected` um **1** erhöht statt um einen gespeicherten Wert.
- `BALANCE.coins.value` entfällt ersatzlos aus `balance.ts` — der Wert wird nirgends mehr
  gebraucht, und toter Code, der wie eine Stellschraube aussieht, führt später in die Irre.

Grund für den Ausbau statt eines zusätzlichen Wegs: Der heutige Default-Parameter
(`value: number = BALANCE.coins.value`) greift stillschweigend, sobald `undefined`
ankommt. Ein Gegner ohne gesetzten Wert gäbe dann lautlos eine Münze statt drei — der
Fehler wäre unsichtbar. Genau diese Klasse von stillem Fehlverhalten fällt mit dem
Parameter weg.

### 2. `src/scenes/GameScene.ts` — mehrere Münzen je Kill

In `handleProjectileHit` wird beim tödlichen Treffer nicht mehr **eine** Münze mit einem
Wert geworfen, sondern `coinValue` mal `spawnAt(...)` aufgerufen.

`coinValue` weiterhin **vor** dem Schadensaufruf vom Gegner lesen — nach dem Tod ist der
Gegner recycelt. Das ist im heutigen Code bereits richtig gelöst und muss so bleiben.

**Die Münzen müssen versetzt liegen.** Drei Münzen auf demselben Punkt sehen aus wie eine,
und der ganze Zweck des Umbaus wäre verfehlt. Vorgabe: die Münzen eines Kills um den
Sterbepunkt herum verteilen, mit rund **12 px Abstand** zueinander, in einem festen
Muster (nicht zufällig — Zufall pro Kill kostet nichts, bringt hier aber nichts und macht
das Ergebnis schlechter prüfbar). Die X-Position jeder Münze auf den sichtbaren Bereich
begrenzen, damit am Bildrand keine Münze außerhalb liegt und unerreichbar wird.

### 3. `src/config/balance.ts` — Münz-Pool neu herleiten

`pools.coins` steigt von **20 auf 48**. Die heutige Herleitung geht von einer Münze je
Gegner aus und stimmt nicht mehr:

- Mehr Gegner töten als nachkommen geht nicht, also ist die Kill-Rate durch den kürzesten
  Spawnabstand gedeckelt: 1 / 0,45 s = 2,22 Gegner pro Sekunde.
- Schlimmster Fall sind lauter schwere Gegner: 3 Münzen je Kill.
- Eine Münze fällt mit 180 px/s über die 844 px hohe Fläche, ist also bis zu 4,7 s sichtbar.
  Die Rechnung unterstellt bewusst, dass der Magnet sie **nicht** einsammelt — er tut es
  meist früher, aber darauf darf der Pool sich nicht verlassen.
- Spitze = 2,22 × 3 × 4,7 = **31 gleichzeitig**. 48 lässt 54 % Reserve.

Der Kommentar über `pools.coins` wird entsprechend ersetzt, gleiche Form wie die anderen
Pool-Kommentare.

Die Werte `coinValue` je Gegnertyp (1 / 1 / 3) bleiben **unverändert** — sie bedeuten ab
jetzt „Anzahl Münzen" statt „Wert einer Münze". Der Kommentar an der Typtabelle soll das
sagen, damit der Unterschied später nicht falsch gelesen wird.

## Grenzen

Nichts anderes anfassen. Insbesondere nicht: Magnetradius, Sammelabstand oder Fallgeschwin-
digkeit ändern; das Aussehen der Münze ändern; die Gegnerwerte ändern; am HUD arbeiten;
irgendetwas aus der E4b-Spec vorwegnehmen.

## Reißleine

Reicht der Pool von 48 im Spielbetrieb nachweislich nicht (Dev-Warnung „Coin pool
exhausted" erscheint), **melden statt selbst hochsetzen** — dann stimmt eine Annahme in der
Herleitung nicht, und die gehört korrigiert, nicht überschrieben.

**Kein zulässiger Ersatz ist:** den Münzwert doch wieder in der Münze speichern; weniger
Münzen werfen als der Gegner wert ist; Münzen ohne Versatz übereinanderlegen; die
Fallgeschwindigkeit erhöhen, damit weniger gleichzeitig sichtbar sind.

## Akzeptanzkriterien

1. Ein schwerer Zombie hinterlässt **drei sichtbar getrennte Münzen**, ein leichter und ein
   Standardgegner je eine.
2. Jede eingesammelte Münze erhöht den Zähler um genau eins; drei eingesammelte Münzen
   ergeben drei.
3. `spawnAt` hat keinen Wert-Parameter mehr, und `BALANCE.coins.value` existiert nicht mehr.
4. `pools.coins` steht auf 48 und trägt die neue Herleitung als Kommentar.
5. Keine Münze liegt außerhalb des sichtbaren Bereichs.
6. Kein `create()`/`destroy()` im laufenden Spiel; die Münzen kommen weiterhin aus dem
   einmalig angelegten Pool.
7. `npm run check` und `npm run build` laufen fehlerfrei durch.
8. `docs/spec-e4b-entwurf.md` ist unverändert.

## Implementation Summary

- `Coins.spawnAt` erzeugt keine Wertdaten mehr; jede eingesammelte Pool-Münze zählt genau eins.
- Ein tödlicher Treffer wirft nun `coinValue` einzelne Münzen im festen 12-px-Raster ab; ihre X-Position bleibt zwischen den sichtbaren Münzrändern.
- `coinValue` bedeutet in der Gegnertabelle jetzt ausdrücklich Anzahl der Münzen. Der Münz-Pool ist mit der Worst-Case-Herleitung auf 48 erhöht; `BALANCE.coins.value` ist entfernt.
- `npm run check` und `npm run build` erfolgreich ausgeführt. E4b-Spec per Diff unverändert bestätigt.

**Offen bis zu Thomas' iPhone-Test:** ob drei Münzen je schwerem Zombie sich gut anfühlen
oder den Bildschirm zumüllen.

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
