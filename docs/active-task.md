# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Betongraue Straße** (Rückenansicht der Truppe: Reißleine gezogen, siehe unten)

Zwei Optik-Nachbesserungen zum 3D-Schritt 1, beide von Thomas beauftragt (2026-08-20):

1. Die Straße ist heute fast so dunkel wie ihre Umgebung und hebt sich kaum ab. Sie soll
   **hellgrau wie Beton** werden.
2. Die Spielfiguren schauen den Spieler frontal an. In den Vorbildern sieht man die eigene
   Truppe **von hinten**. Das passt nicht zur perspektivischen Straße und wird nachgezogen.

Beides betrifft nur das Aussehen. **Keine Spielmechanik anfassen.**

## Anforderungen

### 1. Straßenfarben

In `src/config/colors.ts` unter `WORLD_COLORS`:

- `road`: von `0x172033` (dunkelblau) auf ein **helles Betongrau**, Vorschlag `0x9b9b94`.
- `roadEdge`: von `0x34415d` auf einen **dunkleren** Grauton als die Fahrbahn, Vorschlag
  `0x6e6e68`, damit der Rand vor der hellen Fläche als Kante lesbar bleibt.
- `roadCenterLine`: von `0xd8e0ef` auf **reines Weiß** `0xffffff`. Auf hellgrauem Beton
  wäre der bisherige, leicht bläuliche Ton kaum noch zu sehen.

`WORLD_COLORS.background` bleibt **unverändert dunkel** — der Kontrast zwischen heller
Fahrbahn und dunkler Umgebung ist es, der die Straße überhaupt sichtbar macht.

**Der kritische Punkt dabei ist der Kontrast zu den Figuren.** Der leichte Zombie ist seit
heute hell-beige. Auf einer hellgrauen Straße kann er verschwinden — genau der Gegner, der
am schnellsten läuft und deshalb am besten erkennbar sein muss. Deshalb ist ein
Kontrollbild Pflicht (Abschnitt 3).

Ergibt die Kontrolle, dass der leichte Zombie auf der Fahrbahn schlecht erkennbar ist:
**Straße dunkler machen** (in Richtung `0x86867f`), bis er sich abhebt — und im
Abschlussbericht sagen, welcher Wert es geworden ist und warum. Den Zombie **nicht**
umfärben, der ist von Thomas freigegeben.

### 2. Spielfigur in Rückenansicht

`src/assets/player.png` wird ersetzt. Zielgröße bleibt **exakt 34 × 46 px** — dadurch
bleiben Formation, Kollisionshülle (`crowd.hullWidthFigures` × Figurenbreite) und alle
Abstände unverändert gültig. Es ist ein reiner Bildtausch, kein Umbau.

- **Dieselbe Figur wie heute**, nur von hinten gesehen: derselbe rot-orange Soldat,
  dieselbe Silhouette, dieselbe Farbwelt. Es ist eine Drehung, keine Neugestaltung.
- Von hinten heißt: man sieht Rücken, Hinterkopf und die Rückseite der Beine. Die Waffe
  zeigt vom Betrachter weg nach vorne — sie darf seitlich sichtbar bleiben.
- **Kein Gesicht.** Wenn nach dem Umbau noch Augen zu sehen sind, ist es keine
  Rückenansicht.
- Leicht von schräg oben, passend zur Straßenperspektive.
- Das Spiel läuft mit `pixelArt: true`: klare Silhouette, kräftige Farben, keine weichen
  Verläufe.
- Die Figur muss sich **vor der neuen hellgrauen Straße** klar abheben. Rot-orange auf
  Betongrau tut das — falls nicht, im Bericht melden.

**Verfahren — verbindlich:** Das Bild zuerst **groß** erzeugen (mindestens 4-fach, also ab
136 × 184 px) und **danach** auf 34 × 46 px herunterrechnen. Direkt in Zielgröße erzeugte
Bilder waren in diesem Projekt bereits zweimal unbrauchbar (`docs/lessons.md`, 2026-08-20).
Die große Zwischenversion in `assets/probe/` ablegen (gitignored).

### 3. Kontrollbild (Pflicht)

Nach `assets/probe/vorschau-strasse.png`: ein Ausschnitt der neuen Straße in Spielgröße mit
**allen vier Figuren nebeneinander darauf** — die drei Zombies und die neue Spielfigur von
hinten, in Originalgröße, auf der neuen Fahrbahnfarbe, mit dem dunklen Umgebungston an den
Seiten. Daran beurteilt Thomas Farbe und Erkennbarkeit in einem Bild.

## Grenzen

Nichts anderes anfassen. Insbesondere **nicht**: Straßengeometrie, Gegnerführung, Torlogik,
Münzen, `balance.ts`, Trefferflächen, Formationswerte oder Gegner-Sprites. Keine
Größenänderung von Figuren — das bleibt 3D-Schritt 2. `docs/spec-e4b-entwurf.md` und
`docs/naechste-tasks.md` bleiben unverändert.

## Reißleine

Lässt sich die Rückenansicht nach zwei Versuchen nicht in gleichbleibendem Stil erzeugen:
**melden und stoppen**, die alte Frontalfigur unverändert lassen. Die Straßenfarbe ist davon
unabhängig und wird trotzdem geliefert.

**Kein zulässiger Ersatz ist:** die vorhandene Frontalfigur spiegeln oder drehen; die Figur
programmatisch aus geometrischen Formen zeichnen; eine andere Figur liefern als den
vorhandenen Soldaten; die Zielgröße ändern; das Gesicht stehen lassen und als
„Dreiviertelansicht" ausgeben.

## Akzeptanzkriterien

1. Die Fahrbahn ist hellgrau und hebt sich deutlich von der dunklen Umgebung ab.
2. Randlinien und Mittellinie sind auf der hellen Fahrbahn klar erkennbar.
3. `src/assets/player.png` ist 34 × 46 px und zeigt dieselbe Figur von hinten — kein
   Gesicht, keine Augen.
4. Alle drei Zombies sind auf der neuen Fahrbahn klar erkennbar, besonders der helle
   leichte Gegner.
5. `assets/probe/vorschau-strasse.png` zeigt alle vier Figuren auf der neuen Straße.
6. Keine Änderung an Geometrie, Mechanik oder `balance.ts`.
7. `npm run check` und `npm run build` laufen fehlerfrei durch.

## Implementation Summary

- `WORLD_COLORS.road` ist Betongrau `0x9b9b94`; Rand `0x6e6e68` und Mittellinie `0xffffff` bleiben darauf klar lesbar. Das Kontrollbild bestätigt auch den Kontrast des hellen leichten Zombies.
- `src/assets/player.png` ist die rot-orange Spielerfigur in Rückenansicht (34 × 46 px), mit geschlossenem Helm, orangefarbenem Rucksack und seitlich nach vorn gerichteter Waffe. Gesicht und Augen sind nicht sichtbar.
- `assets/probe/vorschau-strasse.png` enthält alle drei unveränderten Zombies und die neue Spielerfigur in Originalgröße auf der neuen Fahrbahn.
- Nacharbeit 1: Das 136 × 184-Pixel-Zwischenbild wurde auf 34 × 46 px heruntergerechnet, anschließend auf 22 RGBA-Farben reduziert und der Alpha-Kanal auf 0 oder 255 geschwellen. `assets/probe/figur-schaerfe.png` zeigt links den bisherigen und rechts den neuen Sprite, jeweils 8-fach vergrößert.
- `git diff --check`, `npm run check` und `npm run build` erfolgreich. Der sichtbare Terminal-Start war in dieser Umgebung nicht verfügbar; die identischen Prüfungen liefen direkt im Projekt.

**Offen bis zu Thomas' iPhone-Test:** ob der Grauton stimmt und ob die Truppe von hinten
richtig wirkt.

## Ergebnis: Straße abgenommen, Rückenansicht vertagt

Die Straßenfarben sind umgesetzt und abgenommen. Die Rückenansicht ist in zwei Anläufen
gescheitert — beide Male kam wieder eine Frontalansicht zurück. Die Reißleine dieser Spec
wurde gezogen, `src/assets/player.png` bleibt unverändert. Weiteres Vorgehen steht in
`docs/naechste-tasks.md`, die Ursache in `docs/lessons.md`.

## Nacharbeit 1 (Claude-Review, 2026-08-20) — nur Schärfe erreicht

**Die Straßenfarben sind in Ordnung und bleiben, wie sie sind** (`road: 0x9b9b94`,
`roadEdge: 0x6e6e68`, weiße Mittellinie). Das Kontrollbild zeigt: auch der helle leichte
Zombie ist auf der Fahrbahn klar erkennbar. Dieser Teil ist abgenommen.

**Die neue Spielfigur muss nachgearbeitet werden — zwei Mängel.**

### Mangel 1: Das Bild ist matschig

Ein direkter Vergleich mit der alten Figur (beide 9-fach vergrößert) zeigt es deutlich: Die
alte Figur hat harte Pixelkanten, die neue ist weichgezeichnet, die Silhouette zerfließt.
Das Spiel läuft mit `pixelArt: true`, also mit harten Kanten ohne Glättung — ein
weichgezeichnetes Sprite passt nicht dazu und sieht bei jeder Vergrößerung schlechter aus.

Ursache ist mit hoher Wahrscheinlichkeit das Herunterrechnen mit einem glättenden Filter.
**Nach dem Verkleinern müssen die Kanten wieder hart gemacht werden:**
- Die Transparenz auf hart schwellen: jeder Bildpunkt ist entweder ganz sichtbar oder ganz
  durchsichtig, keine halbtransparenten Ränder.
- Die Farben auf eine begrenzte Palette reduzieren (Größenordnung 16–24 Farben), so wie es
  die vorhandenen Sprites auch sind.

Prüfe das Ergebnis, indem du das fertige 34 × 46-PNG **8-fach vergrößert neben die alte
Figur** legst (`assets/probe/figur-schaerfe.png`). Sind die Kanten der neuen Figur nicht
genauso hart wie die der alten, ist die Nacharbeit nicht fertig.

### Mangel 2: Man erkennt nicht, dass es eine Rückenansicht ist

Das Gesicht ist korrekt verschwunden. Aber sonst fehlt jedes Merkmal, an dem man einen
Rücken erkennt — die Figur wirkt wie eine unscharfe Frontalfigur ohne Kopf-Details.

Eine Rückenansicht braucht sichtbare Rückenmerkmale:
- **Helm von hinten**: geschlossene Kalotte, gern mit Nackenschutz. Keine Sichtöffnung.
- **Rücken-Ausrüstung**: ein Rucksack, ein Tornister oder Gurte über dem Rücken. Das ist das
  stärkste einzelne Erkennungsmerkmal und darf ruhig deutlich ausfallen.
- **Keine Vorderseiten-Details**: keine Brusttaschen, keine Gürtelschnalle vorn, keine
  Frontgurte.
- Die Waffe zeigt vom Betrachter weg nach vorne und darf seitlich neben dem Körper
  hervorstehen.

Farbwelt, Größe (**exakt 34 × 46 px**) und Grundsilhouette bleiben wie beim vorhandenen
roten Soldaten. Es bleibt eine Drehung derselben Figur, keine neue.

### Grenzen der Nacharbeit

Nur `src/assets/player.png` und die Probebilder anfassen. `colors.ts` bleibt unverändert,
ebenso alles andere aus der Grenzen-Liste oben.

### Zusätzliche Akzeptanzkriterien

8. Das neue Sprite hat harte Kanten: keine halbtransparenten Randpixel, begrenzte Palette.
9. `assets/probe/figur-schaerfe.png` zeigt alte und neue Figur 8-fach vergrößert
   nebeneinander; die Kanten der neuen sind so hart wie die der alten.
10. Die Figur ist als Rückenansicht erkennbar — Helm von hinten und Rücken-Ausrüstung sind
    zu sehen, keine Vorderseiten-Details.


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
