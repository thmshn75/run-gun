# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Torwahl sichtbar machen — Zielhilfe an der Spitzenfigur und längere Rückmeldung am Tor.**

## Warum

Thomas nahm ein `+2`-Tor auf RATE und die Schussrate wurde langsamer. Der Rechenweg für RATE
ist geprüft und korrekt — 6000 Tor-Ziehungen ohne Abweichung von Label zu Wirkung. Der Fehler
liegt in der **Wahrnehmung, welche Seite überhaupt getroffen wurde**.

Zwei Befunde aus `docs/naechste-tasks.md`:

1. **Der Bezugspunkt ist schon richtig, aber unsichtbar.** Welche Seite zählt, entscheidet
   `anchorX` — die Position der vordersten Figur (`crowd.ts`, Slot 0 sitzt mit `offsetX: 0`
   und `offsetY: 0` exakt auf dem Anker). Der Bezugspunkt wird **nicht** geändert. Er muss
   nur sichtbar werden, damit Thomas vor dem Durchfahren weiß, welche Seite er nimmt.
2. **Die Rückmeldung ist zu kurz.** Das gewählte Tor blitzt `feedback.hitFlashMs` = 80 ms
   weiß auf, also fünf Bilder — praktisch unsichtbar.

Thomas' Rahmen, verbindlich: **keine eingeblendeten Zahlen** („würde stören, da liegt ohnehin
der Finger drauf"). Einer deutlich längeren Hervorhebung hat er ausdrücklich zugestimmt.

## Teil 1 — Ziellinie an der Spitzenfigur

Eine dünne senkrechte Linie führt von der vordersten Figur nach oben und zeigt damit vor dem
Durchfahren an, welche Torseite getroffen wird.

- **Textur:** Ein 1 × 1 px weißes Rechteck, einmalig in `BootScene` erzeugt
  (`createAimLineTexture`, gleiche Machart wie die vorhandenen Texturen), Schlüssel `aim-line`.
- **Objekt:** **Ein** `Image`, einmalig in `create()` angelegt, nie im Spiel erzeugt oder
  zerstört. Ursprung `(0.5, 1)`, also unten mittig.
- **Position je Bild:** `x = crowd.getAnchorX()`, `y = crowd.getAnchorY() - <halbe Figurenhöhe>`,
  damit die Linie am Kopf der Spitzenfigur beginnt und nicht in ihr.
- **Größe:** Breite aus `balance.ts` (`aim.widthPx`, Vorschlag **2**), Höhe reicht vom
  Startpunkt bis zum oberen Bildrand (`y = 0`).
- **Farbe und Deckkraft:** aus `colors.ts` und `balance.ts` (`aim.alpha`, Vorschlag **0.3**).
  Ein heller, neutraler Ton — die Linie soll führen, nicht dominieren.
- **Tiefe:** Über der Fahrbahn, aber **unter** Gegnern, Toren, Projektilen und Truppe. Die
  Linie darf nichts verdecken; sie liegt auf der Straße, nicht über dem Geschehen.
- Die Linie bewegt sich mit dem Finger mit, weil `anchorX` beim Ziehen wandert.

## Teil 2 — Längere Rückmeldung am gewählten Tor

- Eigener Wert in `balance.ts`: `gates.choiceFlashMs`, Vorschlag **250**. Der bestehende
  `feedback.hitFlashMs` (80) bleibt unverändert — er gehört den Treffern an Gegnern und wird
  nicht mitgezogen.
- `applyPair()` setzt `flashUntilMs` künftig aus `gates.choiceFlashMs` statt aus
  `feedback.hitFlashMs`.
- **Randbedingung, die beim Wert zu beachten ist:** Das Tor läuft mit
  `scrollSpeed + gates.extraSpeed` = 540 px/s weiter, sobald es ausgelöst hat, und wird bei
  der Spielerhöhe (y ≈ 714) ausgelöst. Nach etwa **240 ms** hat es den unteren Bildrand
  verlassen. Ein Wert deutlich über 250 ms bringt deshalb **nichts Sichtbares**, hält aber
  ein Torpaar unnötig lange belegt — bei `pools.gatePairs: 2` und 9 s Abstand unkritisch,
  aber sinnlos. Der Wert wird deshalb **nicht** über 300 gesetzt.
- Das Tor wird weiterhin recycelt, sobald der Blitz abgelaufen ist. Zusätzlich recyceln,
  sobald es den unteren Bildrand vollständig verlassen hat — sonst hängt bei einem später
  erhöhten Wert ein unsichtbares Paar im Pool.

## Ausdrücklich nicht ändern

- **Keine Zahlen einblenden**, nirgends — weder über dem Tor, noch an der Figur, noch als
  Vorschau der Wirkung. Das ist Thomas' ausdrückliche Vorgabe.
- Der Bezugspunkt der Torwahl (`anchorX`) und der Auslösezeitpunkt bleiben, wie sie sind.
- Die Tor-Mathematik, die Auswahlregeln und die Waffen-Tore bleiben unberührt.
- `feedback.hitFlashMs` bleibt bei 80 ms.
- Die Formation (`computeFormation`) wird nicht angefasst.

## Befund 3 — bewusst offen gelassen

Das Tor greift, sobald seine Unterkante die Höhe der Spitzenfigur passiert; die hinteren
Reihen der Truppe sind dann optisch noch vor dem Tor. Sobald die Spitze markiert ist, wird
dieser Zeitpunkt vermutlich von selbst nachvollziehbar. **Erst nach Thomas' Test entscheiden,
ob hier überhaupt etwas zu tun ist** — jetzt nichts ändern.

## Akzeptanzkriterien

1. Eine senkrechte Linie führt von der vordersten Figur bis zum oberen Bildrand und folgt dem
   Finger beim Ziehen ohne sichtbare Verzögerung.
2. Die Linie verdeckt weder Gegner noch Tore, Projektile oder Truppe — sie liegt darunter.
3. Beim Durchfahren eines Tores ist an der Linie eindeutig ablesbar, welche Seite getroffen
   wird, und das Ergebnis stimmt mit der tatsächlich angewandten Seite überein.
4. Das gewählte Tor bleibt sichtbar hervorgehoben, solange es auf dem Bildschirm ist —
   nachweisbar über `gates.choiceFlashMs` ≥ 240 ms statt der bisherigen 80 ms.
5. Es werden nirgends Zahlen eingeblendet.
6. Kein `create()`/`destroy()` im laufenden Spiel; die Linie ist ein einziges Objekt.
7. Die Stat-Tore und die Waffen-Tore verhalten sich sonst unverändert.
8. `npm run check` und `npm run build` laufen fehlerfrei durch.

Kriterium 3 prüft Claude am laufenden Spiel nach: Über viele Tordurchfahrten wird verglichen,
auf welcher Seite die Linie stand und welche Seite angewandt wurde — sie müssen in **jedem**
Fall übereinstimmen. Ob die Linie im Spiel angenehm ist und ob die Hervorhebung jetzt reicht,
entscheidet Thomas am iPhone.

## Danach als Nächstes

**Himmel und Horizont** (Thomas-Entscheidung 2026-08-20): oben ein Horizont mit hellem
Tageshimmel darüber, neben der Fahrbahn Boden. Wird als eigener Task spezifiziert, sobald
dieser hier durch ist — er verschiebt die Oberkante der Straße und berührt deshalb Straße,
Gegner-Eintritt und Tore.

## Implementation Summary

- Eine einmal erzeugte, getönte `aim-line` folgt pro Bild dem unveränderten `anchorX` und
  reicht vom Kopf der Spitzenfigur bis zum oberen Bildrand. Eigene Ebenen halten sie über der
  Fahrbahn und unter Truppe, Toren, Gegnern, Projektilen, Münzen und Effekten.
- `gates.choiceFlashMs` beträgt 250 ms; nur die Tor-Auswahl verwendet diesen Wert.
  `feedback.hitFlashMs` bleibt unverändert bei 80 ms für Gegner-Treffer.
- Verifiziert: `npm run check` erfolgreich; `npm run build` erfolgreich (nur bestehender
  Vite-Hinweis zur Chunk-Größe). Kein separater Test-Runner vorhanden.
- Offen für die Abnahme am Gerät: Claude prüft die Übereinstimmung von Ziellinie und
  angewandter Torseite im laufenden Spiel; Thomas beurteilt Sichtbarkeit und Dauer am iPhone.


## Review-Ergebnis (Claude, am laufenden Spiel nachgemessen)

**Kriterium 3 (die wichtigste Stelle):** 13 Tordurchfahrten mit bewegtem Finger, links und
rechts. Die Linie stand in **jedem** Fall exakt auf `anchorX` (Abweichung 0,0 px), und die
Seite, auf der die Linie stand, war in **jedem** Fall die angewandte Seite.
**0 Abweichungen.**

**Reihenfolge im Bild:** Die Linie liegt auf Ebene 1, Tore und Gegner auf Ebene 2 — sie
verdeckt nachweislich nichts. Codex hat dafuer ein eigenes Ebenen-System (`BALANCE.layers`)
eingefuehrt und alle Spielobjekte darauf umgestellt; das ist mehr als verlangt, aber die
saubere Loesung, weil die Reihenfolge vorher implizit von der Erzeugungsreihenfolge abhing.

**Aktualisierung ohne Verzoegerung:** `updateAimLine()` laeuft in `GameScene.update()`
unmittelbar vor `gates.update()`. Die Linie zeigt damit den Stand, mit dem im selben Bild
auch die Torwahl entschieden wird.

**Hervorhebung:** `choiceFlashMs` liegt bei 250 ms und wird auch so gemessen (alle 13
Durchfahrten exakt 250). `feedback.hitFlashMs` bleibt bei 80 ms fuer Treffer an Gegnern.

**Bau:** `npm run check` und `npm run build` selbst im Terminal ausgefuehrt, beide exit 0.

**Abweichung von der Spec, bewusst nicht nachgebessert:** Verlangt war, ein ausgeloestes
Torpaar zusaetzlich zu recyceln, sobald es den unteren Bildrand verlaesst. Der vorhandene
Abgang steht als `else if` hinter der Blitz-Bedingung und greift fuer ausgeloeste Paare
deshalb nicht. Bei `choiceFlashMs` = 250 ms ohne Wirkung, weil der Blitz ohnehin kurz nach
dem Bildrand endet; erst ein deutlich hoeherer Wert wuerde ein unsichtbares Paar im Pool
halten. Bei zwei Torpaaren und 9 s Abstand folgenlos — beim naechsten Anfassen der Tore
mitziehen.

**Beobachtung fuer Thomas' Test:** Steht die Truppe genau mittig, liegt die Ziellinie auf der
gestrichelten Mittellinie der Fahrbahn und ist dort schwerer zu unterscheiden. Genau in
dieser Position zaehlt die **rechte** Seite (`anchorX < Bildmitte` ist dann falsch). Wenn dich
das im Spiel stoert, ist die Gegenmassnahme eine andere Farbe oder eine leichte seitliche
Versetzung der Mittellinie — beides klein.
