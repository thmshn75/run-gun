# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Das harte Dunstband am Horizont entfernen — der Himmelsverlauf läuft durchgehend aus.**

Thomas nach dem Test: „Den Dunststreifen weg oder viel dünner oder Farbe verlaufend."

Umgesetzt wird die dritte Variante, weil sie die erste mit erledigt: Das Band verschwindet
als eigenes Element, und der Verlauf des Himmels endet stattdessen selbst im hellen Dunstton.
Es bleibt kein Streifen mit sichtbarer Kante, die Tiefenwirkung zum Horizont hin bleibt aber
erhalten.

## Was heute falsch aussieht

`BootScene.createBackgroundTextures()` zeichnet den Himmel als Verlauf von `skyTop` nach
`skyHorizon` und legt danach ein **hartes Rechteck** von 12 px Höhe in `horizonHaze` darüber:

```ts
graphics.fillStyle(WORLD_COLORS.horizonHaze)
graphics.fillRect(0, horizonY - 12, width, 12)
```

Das erzeugt zwei sichtbare Kanten — eine dort, wo der Verlauf auf das Band trifft, und eine
am Horizont selbst. Genau das liest sich als aufgeklebter Streifen.

## Änderung

- Das `fillRect` für das Dunstband **entfällt ersatzlos**.
- Der Himmelsverlauf endet stattdessen im hellen Dunstton: `WORLD_COLORS.skyHorizon` wird von
  `0xbfe3f7` auf **`0xdfeef8`** gesetzt — den heutigen Wert von `horizonHaze`. Der Verlauf
  läuft damit über die volle Höhe des Himmels von `skyTop` bis zu diesem hellen Ton aus.
- `WORLD_COLORS.horizonHaze` entfällt, sofern danach nirgends mehr verwendet.
- `skyTop` (`0x2f7fd1`) bleibt unverändert.

Sonst ändert sich an Himmel, Boden, Fahrbahn und Geometrie **nichts**.

## Ausdrücklich nicht ändern

- Keine anderen Farben, insbesondere nicht Boden (`0x3f5a3a`) oder Fahrbahn (`0x4a4f57`).
- `road.horizonY` (150) und `road.entryFadePx` (40) bleiben.
- Kein zusätzlicher Verlauf im Boden, keine Nebel- oder Weichzeichnungseffekte, keine
  zusätzliche Grafik am Horizont. Es wird etwas entfernt, nicht etwas hinzugefügt.
- Die Einblendung von Gegnern, Toren und Projektilen an der Oberkante bleibt unangetastet.

## Akzeptanzkriterien

1. Am Horizont ist kein Band mit sichtbarer Oberkante mehr zu erkennen; der Himmel wird von
   oben nach unten gleichmäßig heller.
2. Direkt oberhalb des Horizonts ist der Himmel hell (`0xdfeef8`), sodass die Tiefenwirkung
   erhalten bleibt.
3. Im Code gibt es kein `fillRect` für ein Dunstband mehr und keine ungenutzte Farbe.
4. Boden, Fahrbahn und alle Spielobjekte sehen unverändert aus.
5. `npm run check` und `npm run build` laufen fehlerfrei durch.

Kriterium 1 und 2 prüft Claude am laufenden Spiel über die Pixelfarben entlang einer
senkrechten Linie durch den Himmel: Der Farbverlauf muss von oben bis zum Horizont monoton
heller werden, **ohne Sprung**. Ob es Thomas so gefällt, entscheidet er am iPhone.
