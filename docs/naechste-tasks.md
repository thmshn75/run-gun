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

## Hintergrund gestalten (Thomas, 2026-08-20)

Stand schon länger auf der Liste, hat jetzt aber einen konkreten Bezug: Die Straße wurde
testweise betongrau gemacht und wieder auf das dunkle `0x172033` zurückgesetzt, weil der
Ton nicht gefiel. Thomas' Begründung: **Er will ohnehin den Hintergrund ändern, dann hebt
sich die Straße von selbst ab.**

Daraus folgt für den Task: Fahrbahnfarbe und Umgebung **zusammen** entscheiden, nicht
nacheinander. Heute ist die Straße (`road: 0x172033`) fast so dunkel wie ihre Umgebung
(`background: 0x10131d`) — der Kontrast muss aus dem neuen Hintergrund kommen.

Beim Festlegen der Farben mitprüfen: Der leichte Zombie ist hell-beige, die eigene Truppe
rot-orange. Beide müssen sich vor Fahrbahn **und** Umgebung abheben. Ein Kontrollbild mit
allen vier Figuren auf dem neuen Untergrund ist Pflicht — das hat beim Betongrau gut
funktioniert.

## 3D-Schritt 2: Figuren wachsen beim Näherkommen

Der Teil, der aus den festen gemessenen Trefferflächen bewegliche Größen macht. Erst nach
Thomas' Urteil zu Schritt 1 (perspektivische Straße) aufsetzen — womöglich reicht ihm der
Effekt schon ohne.

## Referenzvorbild von Thomas (2026-08-22, Screenshots aus einem Reel)

Thomas hat zwei Bilder eines 3D-Vorbilds geschickt ("annaehernd so realistisch").
Abgelesen, nicht interpretiert:
- **Tore sind eine lange Kette einzelner "+1"-Plaettchen** die ganze Spur entlang,
  dicht gestapelt - nicht ein Tor mit "+7". Man faehrt durch die Kette und sammelt
  jedes Plaettchen einzeln ein. Unser heutiges System gibt Verstaerkung als EINEN
  Betrag mit Operator-Anzeige.
- **Die Horde ist eine dichte Masse ueber die volle Spurbreite**, hunderte Figuren
  bis in die Tiefe gestaffelt. Thomas dazu: die Horden sind "zu selten zu klein".
- **Der Boss traegt seine Lebenspunkte als grosse Zahl ueber dem Kopf** (403), die
  Wand ihre daneben (725/999). Wir zeigen eine Boss-Leiste.
- **Optik:** beleuchtete Figuren mit Volumen und Bodenschatten.

Geprueft zur Machbarkeit: Codex kann plastische Sprites erzeugen (alle vorhandenen
stammen aus Codex-Laeufen, Verfahren gross-rendern-dann-herunterrechnen ist etabliert,
Vorlagen liegen in `assets/probe/`). Echtes 3D geht NICHT - Phaser ist ein 2D-Renderer,
ein Wechsel waere ein anderer Motor. Den optischen Abstand schliessen, nach Wirkung
sortiert: Schlagschatten am Boden unter jeder Figur, beleuchtete statt flacher Sprites,
glatte statt harter Pixelkanten (`pixelArt: true` in `main.ts` muesste fallen, Sprites
in doppelter Aufloesung), mehr Figuren in der Masse.
