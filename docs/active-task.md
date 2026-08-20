# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Der Himmel hat gar keinen Verlauf — er muss zeilenweise gezeichnet werden.**

## Befund (gemessen, nicht vermutet)

Nach dem Entfernen des Dunstbands wurde der Himmel entlang einer senkrechten Linie
ausgelesen. Ergebnis über die volle Höhe von y = 0 bis zum Horizont bei y = 149:

```
y=  0  #2f7fd1      y= 60  #2f7fd1      y=120  #2f7fd1
y= 20  #2f7fd1      y= 80  #2f7fd1      y=140  #2f7fd1
y= 40  #2f7fd1      y=100  #2f7fd1      y=148  #2f7fd1
```

**Größter Helligkeitsunterschied zwischen zwei benachbarten Zeilen: 0.** Auch waagerecht
(x = 2 bis x = 387) ist jeder Punkt exakt `#2f7fd1`. Der Himmel ist eine einzige Farbfläche;
der Verlauf von `skyTop` nach `skyHorizon` hat **nie** funktioniert. Sichtbar wurde das erst,
als das Dunstband wegfiel — es hatte die Fläche vorher gegliedert und Struktur vorgetäuscht.

**Ursache:** `Graphics.fillGradientStyle()` ist in Phaser eine reine WebGL-Fähigkeit. Beim
Weg über `generateTexture()` wird die Grafik über den Canvas-Pfad gezeichnet, und der kennt
keine Verlaufsfüllung — er nimmt die erste übergebene Farbe (`topLeft`) für die ganze Fläche.

Nebenbefund: Die vier Farben wurden zudem als `(skyTop, skyHorizon, skyTop, skyHorizon)`
übergeben. Das entspricht in Phaser der Reihenfolge oben-links, oben-rechts, unten-links,
unten-rechts — also einem Verlauf von **links nach rechts**, nicht von oben nach unten. Selbst
in WebGL wäre der Verlauf falsch herum gelaufen.

## Änderung

In `BootScene.createBackgroundTextures()` den Himmel **zeilenweise** zeichnen statt über
`fillGradientStyle`:

- Über alle Zeilen von 0 bis `road.horizonY` laufen und je Zeile ein 1 px hohes Rechteck über
  die volle Breite füllen.
- Die Farbe je Zeile linear zwischen `WORLD_COLORS.skyTop` (oben) und
  `WORLD_COLORS.skyHorizon` (am Horizont) mischen, kanalweise über Rot, Grün und Blau.
- Für die Mischung eine benannte Hilfsfunktion verwenden oder die vorhandene in `colors.ts`
  ergänzen (z. B. `mix(colorA, colorB, t)`); `lighten()` bleibt unverändert bestehen, es wird
  weiterhin für die Torhervorhebung gebraucht.
- `fillGradientStyle` entfällt an dieser Stelle ersatzlos.

150 Rechtecke, **einmalig beim Start** — im laufenden Spiel passiert nichts davon.

## Ausdrücklich nicht ändern

- Die Farbwerte `skyTop` (`0x2f7fd1`) und `skyHorizon` (`0xdfeef8`) bleiben, wie sie sind.
- Kein Dunstband, kein zusätzliches Element am Horizont wieder einführen — die weiche
  Aufhellung entsteht aus dem Verlauf selbst.
- Boden, Fahrbahn, Geometrie und alle Spielobjekte bleiben unangetastet.
- Der Boden bleibt eine einfarbige Fläche; er bekommt **keinen** Verlauf.

## Reißleine

Lässt sich der Verlauf so nicht erzeugen: **melden und stoppen**. Kein zulässiger Ersatz ist
ein erneutes hartes Band, ein Bild aus einer externen Quelle, oder ein Verlauf, der zur
Laufzeit je Bild neu gezeichnet wird.

## Akzeptanzkriterien

1. Entlang einer senkrechten Linie durch den Himmel nimmt die Helligkeit von y = 0 bis zum
   Horizont **stetig zu**; kein Rückschritt.
2. Der Unterschied zwischen erster und letzter Zeile ist deutlich: oben `#2f7fd1`, direkt über
   dem Horizont `#dfeef8` (Toleranz zwei Stufen je Kanal).
3. Zwischen zwei benachbarten Zeilen springt die Helligkeit **nirgends** um mehr als 6 Stufen
   (Summe über die drei Kanäle) — sonst ist es wieder eine Kante statt eines Verlaufs.
4. Waagerecht ist der Himmel auf gleicher Höhe überall gleich; der Verlauf läuft nach unten,
   nicht zur Seite.
5. Es gibt kein `fillGradientStyle` mehr in `BootScene`.
6. Boden, Fahrbahn und Spielobjekte sehen unverändert aus.
7. `npm run check` und `npm run build` laufen fehlerfrei durch.

Kriterien 1 bis 4 misst Claude am laufenden Spiel direkt an den Pixelfarben.

## Implementation Summary

- Der Himmel wird in `BootScene.createBackgroundTextures()` einmalig mit 150 horizontalen
  1-px-Rechtecken erzeugt. Die neue Funktion `mix()` mischt `skyTop` und `skyHorizon`
  kanalweise und erreicht beide Endfarben exakt.
- `fillGradientStyle` und das frühere Dunstband sind entfernt; Boden, Fahrbahn und
  Spielobjekte wurden nicht verändert.
- Verifiziert mit `npm run check`, `npm run build`, `git diff --check`, einer Quellcode-Suche
  nach `fillGradientStyle` in `BootScene` sowie einer Berechnung der 150 Farbzeilen
  (monoton, maximaler RGB-Schritt 4).


## Review-Ergebnis (Claude, an den Pixelfarben gemessen)

Senkrechte Linie durch den Himmel bei x = 5, von y = 0 bis zum Horizont:

```
y=  0  #2f7fd1      y= 60  #75abe0      y=120  #bcd8f0
y= 30  #5195d9      y= 90  #98c1e8      y=149  #deedf8
```

- **Kriterium 1:** durchgehend heller, **kein einziger Rueckschritt** ueber 150 Zeilen.
- **Kriterium 2:** oben `#2f7fd1`, am Horizont `#deedf8` — Zielwert `#dfeef8`, Abweichung
  eine Stufe je Kanal, innerhalb der Toleranz. Gesamtzunahme 324 Helligkeitsstufen.
- **Kriterium 3:** groesster Schritt zwischen zwei benachbarten Messzeilen 6 Stufen, an der
  Grenze — und das nur durch die Skalierung der Messung (900 Bildzeilen auf 844 Spielzeilen).
  Rechnerisch sind es 324 / 149 = **2,2 Stufen je Spielzeile**. Keine sichtbare Kante.
- **Kriterium 4:** Auf gleicher Hoehe genau **eine** Farbe ueber die volle Breite — der
  Verlauf laeuft nach unten, nicht zur Seite. Das war vorher nicht so.
- **Kriterium 5:** kein `fillGradientStyle` mehr im Code.
- **Kriterium 7:** `npm run check` und `npm run build` selbst im Terminal, beide exit 0.

Vorher zum Vergleich: jede Zeile und jede Spalte exakt `#2f7fd1`, Unterschied zwischen
benachbarten Zeilen 0.
