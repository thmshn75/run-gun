# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Leichten Zombie fülliger machen (Nacharbeit aus Thomas' iPhone-Test 2026-08-20)**

Thomas hat den aktuellen Stand am iPhone freigegeben. Ein Befund: der **leichte Gegner
wirkt zu dünn**. Es geht ausschließlich um die Optik, nicht um die Treffbarkeit — die
Trefferfläche soll weiterhin exakt der sichtbaren Figur entsprechen, nicht großzügiger sein.

Kleiner, klar umrissener Task. Nichts anderes anfassen.

## Ausgangslage

- `src/assets/enemy-light.png` ist **26 × 36 px**, sichtbare Figurenbreite **14 px**
  (`BALANCE.enemy.types[0].bodyWidth`).
- Zum Vergleich: `enemy-standard.png` ist 32 × 44 px bei 21 px sichtbarer Breite,
  `enemy-heavy.png` ist 42 × 52 px bei 40 px.
- Der leichte Zombie **soll** der kleinste der drei bleiben — er ist der schnelle,
  schwache Typ. Er wirkt aber im Verhältnis zu schmal: 14 von 26 px Bildbreite sind
  Figur, beim Standard sind es 21 von 32.

## Anforderungen

### 1. Neues Sprite für den leichten Zombie

Zielgröße: **30 × 42 px**, transparenter Hintergrund, Dateiname und Pfad bleiben
unverändert (`src/assets/enemy-light.png` wird ersetzt).

- **Dieselbe Figur, derselbe Stil, dieselbe Farbgebung** wie das jetzige Sprite —
  es ist eine Nachbesserung, keine Neugestaltung. Wer das Bild sieht, soll denselben
  Zombie erkennen, nur nicht mehr so mager.
- Die Figur soll **breiter im Körper** werden (Schultern, Rumpf, Arme), nicht nur
  insgesamt hochskaliert. Zielwert: sichtbare Figurenbreite **etwa 18–20 px** von
  30 px Bildbreite — dasselbe Verhältnis wie beim Standardgegner.
- Ansicht bleibt **von vorne** (die Gegner laufen von oben auf den Spieler zu).
- Das Spiel läuft mit `pixelArt: true` (Nearest-Neighbor): klare Silhouette,
  kräftige Farben, keine weichen Verläufe, keine Anti-Aliasing-Ränder.

**Verfahren — verbindlich, nicht abkürzen:** Das Bild zuerst **groß** erzeugen
(mindestens 4-fach, also ab 120 × 168 px) und **danach** auf 30 × 42 px herunterrechnen.
Direkt in Zielgröße erzeugte Bilder waren in diesem Projekt schon einmal unbrauchbar
(siehe `docs/lessons.md`, Eintrag vom 2026-08-20).

Die große Zwischenversion und eine Vorschau in `assets/probe/zombies/` ablegen
(der Ordner ist gitignored, wird also nicht eingecheckt). Vorschau: der neue leichte
Zombie **neben** dem unveränderten Standard- und dem schweren Zombie, alle drei
vierfach vergrößert, hinterlegt mit der Spielfeld-Hintergrundfarbe `#10131d`, damit
Thomas die Größenverhältnisse beurteilen kann. Dateiname `vorschau-light-neu.png`.

### 2. `src/config/balance.ts` — Trefferfläche neu messen

`BALANCE.enemy.types[0].bodyWidth` von `14` auf die **tatsächlich gemessene** sichtbare
Breite des neuen Sprites setzen. Nicht schätzen, nicht aufrunden: die Breite des nicht
transparenten Bereichs im fertigen 30 × 42-PNG auszählen und diesen Wert eintragen.
Den Kommentar über `types` unverändert lassen — er sagt bereits, dass die Werte gemessen sind.

`hp`, `speedFactor`, `contactDamage`, `coinValue` und die Wellengewichte bleiben **unverändert**.

### 3. Sonst nichts

Keine Änderungen an `BootScene.ts` (Import- und Texturschlüssel bleiben gleich, nur die
Bilddatei dahinter ändert sich), keine Änderungen an Spawner, Balance-Werten außer
`bodyWidth`, Waffen, Toren oder HUD.

## Reißleine

Lässt sich das Bild nach zwei Versuchen nicht in gleichbleibendem Stil erzeugen:
**melden und stoppen**, das alte Sprite unverändert lassen.

**Kein zulässiger Ersatz ist:** das vorhandene 26 × 36-PNG hochskalieren; die Figur
programmatisch aus Rechtecken, Kreisen oder anderen geometrischen Formen zeichnen;
einen anderen Zombie-Entwurf liefern als den vorhandenen; die Trefferfläche größer
setzen als die sichtbare Figur, um die Optik zu umgehen. Wird das Ziel nicht erreicht,
ist die Meldung das Ergebnis — kein Ersatzprodukt.

## Akzeptanzkriterien

1. `src/assets/enemy-light.png` ist 30 × 42 px, transparenter Hintergrund.
2. Die sichtbare Figurenbreite liegt bei 18–20 px und ist in `bodyWidth` eingetragen —
   der Wert stammt aus einer Messung am fertigen PNG, nicht aus einer Schätzung.
3. Der leichte Zombie ist als derselbe Zombie erkennbar wie vorher, nur fülliger.
4. Er bleibt sichtbar kleiner als der Standardgegner.
5. `assets/probe/zombies/vorschau-light-neu.png` zeigt alle drei Gegner nebeneinander,
   vierfach vergrößert, auf `#10131d`.
6. `npm run check` und `npm run build` laufen fehlerfrei durch.
7. Keine Datei außerhalb von `src/assets/enemy-light.png`, `src/config/balance.ts`,
   `assets/probe/zombies/` und `docs/active-task.md` ist verändert.

**Offen bis zu Thomas' Urteil:** Ob die neue Figur optisch passt, entscheidet Thomas
am Vorschaubild und am iPhone. Codex' Selbsteinschätzung zählt nicht als Nachweis.

## Implementation Summary

- `enemy-light.png` aus der bereits freigegebenen großen Vorlage unverändert auf 28 × 38 px heruntergerechnet; sichtbare Breite am fertigen PNG gemessen: 18 px.
- `bodyWidth` auf den Messwert 18 gesetzt; die Vorschau unter `assets/probe/zombies/vorschau-light-neu.png` ist mit dem kleineren Sprite neu erzeugt.
- `npm run check` und `npm run build` erfolgreich; die optische Freigabe am iPhone bleibt bei Thomas.

## Nacharbeit 1 (Claude-Review, 2026-08-20)

Das neue Sprite ist gut geworden — die Figur ist deutlich fülliger und die hellere
Farbgebung bleibt so, Thomas hat sie ausdrücklich freigegeben (der helle Zombie hebt sich
besser vom dunklen Hintergrund ab, was beim schnellsten Gegnertyp von Vorteil ist).

**Ein Punkt muss korrigiert werden: die Figur ist zu groß geraten.**

Mit 30 × 42 px und 20 px Figurenbreite ist der leichte Gegner praktisch so groß wie der
Standardgegner (32 × 44 px, 21 px Figurenbreite). Damit sind die beiden Typen im Spiel nicht
mehr auf einen Blick zu unterscheiden, obwohl der eine 1 HP und der andere 3 HP hat.
Das verletzt Akzeptanzkriterium 4 („bleibt sichtbar kleiner als der Standardgegner").

Die Ursache liegt in der Spec, nicht in der Umsetzung: die Zielgröße 30 × 42 war zu
großzügig gesetzt.

### Was zu tun ist

1. **`src/assets/enemy-light.png` auf 28 × 38 px** neu herunterrechnen — aus derselben
   großen Vorlage `assets/probe/zombies/enemy-light-neu-gross-transparent.png`, die bereits
   vorliegt. **Kein neues Bild erzeugen**, die Figur und ihre Farbgebung bleiben exakt wie
   jetzt, es ändert sich nur die Zielgröße.
2. **`BALANCE.enemy.types[0].bodyWidth`** auf die am fertigen 28 × 38-PNG **gemessene**
   sichtbare Figurenbreite setzen. Erwartungswert etwa 18 px; maßgeblich ist die Messung,
   nicht der Erwartungswert. Liegt der gemessene Wert über 19, ist die Figur im Bild zu
   breit — dann die Vorlage vor dem Herunterrechnen seitlich so beschneiden, dass die
   Figur etwa zwei Drittel der Bildbreite einnimmt, und erneut messen.
3. **Vorschau `assets/probe/zombies/vorschau-light-neu.png` neu erzeugen**, gleiche Form wie
   bisher: die drei Gegner nebeneinander, vierfach vergrößert, auf `#10131d`.

### Grenzen

Nichts anderes anfassen. Insbesondere nicht: die Farbgebung ändern, die Figur neu zeichnen,
die anderen beiden Gegner-Sprites anfassen, `hp`/`speedFactor`/`contactDamage`/`coinValue`
oder die Wellengewichte ändern.

### Zusätzliches Akzeptanzkriterium

13. `src/assets/enemy-light.png` ist 28 × 38 px; die gemessene Figurenbreite liegt bei
    höchstens 19 px und steht so in `bodyWidth`. Die Figur ist gegenüber dem Standardgegner
    im Vorschaubild klar als der kleinere Typ erkennbar.

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
