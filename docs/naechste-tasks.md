# Vorgemerkte Tasks

Kurznotizen für Tasks, die noch nicht spezifiziert sind. Beim Aufsetzen des jeweiligen
Tasks hierher schauen und den Eintrag danach entfernen.

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
ein Wechsel waere ein anderer Motor.

**Stand 2026-08-22:** Von der Liste sind drei Punkte erledigt und stehen nicht mehr hier:
Bodenschatten unter jeder Figur, mehr Figuren in der Masse (Gegnermenge vervierfacht) und
die Groesse der Figuren. Der Rest - **beleuchtete statt flacher Sprites und glatte statt
harter Pixelkanten in doppelter Aufloesung** - ist jetzt als Etappe **W7 in
`docs/plan-v2.md`** aufgesetzt, mit Akzeptanzkriterien. Diese Notiz bleibt nur als
Herkunftsbeleg des Referenzvorbilds stehen.
