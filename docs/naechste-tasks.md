# Vorgemerkte Tasks

Kurznotizen für Tasks, die noch nicht spezifiziert sind. Beim Aufsetzen des jeweiligen
Tasks hierher schauen und den Eintrag danach entfernen.

## Torwahl sichtbar machen (Thomas, 2026-08-20)

Auslöser: Thomas nahm ein „+2"-Tor auf RATE und die Schussrate wurde langsamer. Der
Rechenweg für RATE ist geprüft und korrekt — die Ursache liegt in der Wahrnehmung, welches
Tor überhaupt gewählt wurde.

**Befund 1 — Bezugspunkt ist bereits richtig, aber unsichtbar.** Thomas' Vorschlag, die
Position der vordersten Figur entscheiden zu lassen, ist schon umgesetzt: `computeFormation`
baut eine Pyramide, Slot 0 hat `offsetX: 0` und `offsetY: 0` und sitzt damit exakt auf
`anchorX`/`anchorY` (`crowd.ts:124`). Genau dieser Wert geht in `applyPair`
(`gates.ts`, `selectedLeft = anchorX < width / 2`). Der Bezugspunkt muss also **nicht**
geändert werden.

Zu tun: die Spitzenfigur sichtbar machen — Vorschlag ist eine dünne senkrechte Linie von
ihr nach oben, damit vor dem Durchlaufen erkennbar ist, welche Seite getroffen wird.
Thomas' Rahmen: **keine eingeblendeten Zahlen** („würde stören, da liegt ohnehin der
Finger drauf").

**Befund 2 — Rückmeldung zu kurz.** Das gewählte Tor blitzt `feedback.hitFlashMs` = 80 ms
weiß auf, also fünf Bilder. Praktisch unsichtbar. Thomas hat einer deutlich längeren
Hervorhebung ausdrücklich zugestimmt.

**Befund 3 — Auslösezeitpunkt.** Das Tor greift, sobald seine Unterkante die Höhe der
Spitzenfigur passiert (`gates.ts`, `prevBottomY < anchor.y && bottomY >= anchor.y`). Die
hinteren Reihen sind dann optisch noch vor dem Tor. Beim Umsetzen von Befund 1 mitdenken:
Wenn die Spitze markiert ist, wird auch dieser Zeitpunkt nachvollziehbar — dann ist
vermutlich keine eigene Änderung nötig. Erst nach Thomas' Test entscheiden.

## 3D-Schritt 2: Figuren wachsen beim Näherkommen

Der Teil, der aus den festen gemessenen Trefferflächen bewegliche Größen macht. Erst nach
Thomas' Urteil zu Schritt 1 (perspektivische Straße) aufsetzen — womöglich reicht ihm der
Effekt schon ohne.
