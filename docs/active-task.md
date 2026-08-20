# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Perspektivische Straße statt flacher Draufsicht (3D-Optik, Schritt 1 von 2)**

Thomas' Wunsch nach dem Vergleich mit „Real War: Not Fake" und ähnlichen Titeln desselben
Genres: Das Spielfeld soll räumlich wirken — die Gegner sollen von hinten nach vorne
kommen, nicht von oben nach unten über eine flache Fläche.

**Der Effekt kommt fast ganz vom Hintergrund.** In den Vorbildern ist es die Straße, die
sich nach oben verjüngt, mit Rändern und einer laufenden Mittellinie. Die Figuren selbst
wachsen dort nur moderat. Deshalb ist dieser Task **Schritt 1 von 2**:

- **Schritt 1 (dieser Task):** perspektivische Straße, Gegner folgen ihrem Verlauf,
  Tore passen sich der Straßenbreite an. **Keine Größenänderung von Figuren.**
- **Schritt 2 (später, eigener Task):** Figuren wachsen beim Näherkommen. Das ist der Teil,
  der die Trefferflächen zu beweglichen Größen macht — deshalb bewusst getrennt.

Thomas beurteilt nach Schritt 1 am iPhone, ob der Effekt schon reicht.

Zwei kleine Korrekturen aus dem Münz-Task laufen mit (Abschnitt 5) — sie betreffen dieselbe
Datei und wären ein eigener Durchlauf nicht wert.

## Anforderungen

### 1. Straßengeometrie — eine Funktion, an der alles hängt

Die Straße füllt das Bild von oben bis unten. **Kein sichtbarer Himmel, kein Horizont**:
der Fluchtpunkt liegt rechnerisch oberhalb des Bildschirms, die Straße läuft am oberen
Bildrand mit einer Restbreite hinaus. Das passt zum bestehenden Verhalten, bei dem Gegner
oberhalb des Bildrands erscheinen, und erspart die Frage, wo sie „aus dem Nichts" auftauchen.

Es gibt genau **eine** zentrale Funktion, aus der sich alles andere ableitet:

```
halbeStrassenbreite(y) = (breiteOben + (breiteUnten − breiteOben) × y / bildhoehe) / 2
```

mit `breiteOben = 0,46 × Bildbreite` (179 px bei 390) und `breiteUnten = Bildbreite`.
Beide Werte gehören nach `balance.ts` unter einen neuen Abschnitt `road`, zusammen mit
allen anderen Zahlen dieses Tasks. **Keine Zahl davon im Code hartkodieren.**

Der Verlauf ist bewusst **linear**, nicht mathematisch exakt perspektivisch (dort wäre er
1/Tiefe). Auf diesem Bildausschnitt ist der Unterschied nicht zu sehen, aber die lineare
Form hält die Umrechnung der Gegnerpositionen trivial und robust. Reicht die Tiefenwirkung
nicht, wird zuerst `breiteOben` verkleinert — nicht die Formel getauscht.

Ergebnis zur Kontrolle: y = 0 → 179 px breit, y = 400 → 279 px, y = 714 (Höhe der Truppe)
→ 358 px, y = 844 → volle 390 px.

### 2. Darstellung der Straße

Die heutige gekachelte Fläche (`createBackgroundTexture` + `TileSprite`, `GameScene.ts:51`
und `:110`) entfällt und wird ersetzt durch:

- **Fahrbahn:** die Fläche zwischen den beiden Rändern, etwas heller als der heutige
  Hintergrund. Außerhalb bleibt die bisherige dunkle Hintergrundfarbe stehen — das ist
  „neben der Straße".
- **Zwei Randlinien**, die dem Verlauf aus Abschnitt 1 folgen. Sie sind statisch; die
  Bewegung entsteht allein durch die Mittellinie.
- **Laufende Mittellinie:** **12 Striche**, die von oben nach unten wandern und dabei
  breiter, länger und schneller werden. Das ist der eigentliche Tiefeneindruck.

**Die Striche müssen unten schneller laufen als oben** — läuft alles gleich schnell, wirkt
das Bild flach, egal wie gut die Straße gezeichnet ist. Umsetzung: jeder Strich trägt einen
Fortschrittswert zwischen 0 und 1, der pro Bild gleichmäßig wächst; seine Bildschirmposition
ist `bildhoehe × Fortschritt²`. Erreicht ein Strich 1, springt sein Fortschritt auf 0
zurück. Die 12 Striche sind gleichmäßig über den Fortschritt verteilt (0/12, 1/12, …).

Breite und Länge jedes Strichs skalieren mit `halbeStrassenbreite(y)`, damit er in die
Fahrbahn passt.

Zwölf Striche sind **kein Pool im üblichen Sinn**, sondern ein geschlossener Ring: sie
existieren immer alle, es kann nie einer fehlen. Sie werden einmalig angelegt und danach nur
noch bewegt — kein `create()`/`destroy()` im laufenden Spiel, wie überall sonst.

Die Geschwindigkeit der Striche leitet sich aus `BALANCE.scrollSpeed` ab, damit Straße und
Spielgeschwindigkeit zusammenpassen und ein späteres Tempo-Tuning an einer Stelle wirkt.

### 3. Gegner folgen dem Straßenverlauf

Ohne diesen Punkt sieht der ganze Umbau falsch aus: Gegner würden auf halber Höhe neben der
Fahrbahn laufen.

Ein Gegner bekommt beim Spawnen statt einer festen X-Position eine **relative Spur**
zwischen −1 (linker Fahrbahnrand) und +1 (rechter Rand). Seine Bildschirmposition ist in
jedem Bild:

```
x = Bildmitte + Spur × halbeStrassenbreite(y)
```

Er behält seine Spur und fächert dadurch beim Näherkommen nach außen auf — genau wie in den
Vorbildern.

**Was sich dadurch nicht ändert:** Die Gegner bleiben gleich groß, also bleiben die
gemessenen Trefferflächen (`bodyWidth`) unverändert gültig. Das Größenwachstum ist Schritt 2
und wird hier **nicht** vorweggenommen.

Die Spur wird beim Spawnen aus dem bestehenden Bereich `crowd.getAnchorRange()` abgeleitet,
damit Gegner weiterhin dort erscheinen, wo die Truppe sie erreichen kann.

### 4. Tore folgen der Straßenbreite

Ein Torpaar über die volle Bildbreite sieht vor einer schmalen Fahrbahn falsch aus. Die
Tore werden deshalb in der Breite mit `halbeStrassenbreite(y)` skaliert (`setScale` in X,
Höhe unverändert) und ihre X-Positionen entsprechend mitgeführt.

**Die Torlogik selbst bleibt unangetastet.** Die Trennlinie zwischen linker und rechter
Wahl ist die Bildmitte und bleibt es — die Skalierung ist symmetrisch, an der Entscheidung
ändert sich nichts. Beim Erreichen der Truppe (y = 714) hat das Tor 92 % der vollen Breite,
die Wahl bleibt also genauso eindeutig wie heute.

### 5. Zwei Korrekturen aus dem Münz-Task

- **Abstand:** Die Münzen eines Kills liegen mit 12 px Abstand nebeneinander, sind selbst
  aber 14 px breit und überlappen sich dadurch. Der Abstand steigt auf **18 px**. Als Wert
  nach `balance.ts` unter `coins`, nicht als Zahl im Code.
- **Bildrand:** Heute wird jede Münze einzeln in den sichtbaren Bereich geklemmt
  (`GameScene.ts`, `Phaser.Math.Clamp` je Münze). Stirbt ein Zombie am Rand, landen dadurch
  zwei Münzen exakt aufeinander und sehen aus wie eine. Stattdessen wird die **gesamte
  Gruppe** um denselben Betrag nach innen verschoben, sodass die äußerste Münze gerade noch
  im Bild liegt und die Abstände erhalten bleiben.

## Grenzen

Nichts anderes anfassen. Insbesondere **nicht**:
- Figuren, Gegner, Projektile oder Münzen in der Größe skalieren — das ist Schritt 2.
- Trefferflächen, `bodyWidth`, HP, Tempo, Wellen oder Waffenwerte ändern.
- Die Spielerfigur oder die Truppenformation umbauen.
- Neue Bilddateien erzeugen — die Straße wird wie die bisherigen Weltgrafiken programmatisch
  in `BootScene` gezeichnet.
- Irgendetwas aus `docs/spec-e4b-entwurf.md` vorwegnehmen. Diese Datei bleibt unverändert.

## Reißleine

**Riskanteste Stelle ist das Zielgefühl.** Durch das Auffächern bewegen sich Gegner nicht
mehr nur auf den Spieler zu, sondern auch seitwärts: ein Gegner am äußersten Rand driftet
über die volle Bahn 105 px zur Seite, beim schnellsten Gegnertyp rund 30 px pro Sekunde.
Das ist gewollt und Teil des Effekts — es kann das Treffen aber spürbar erschweren.

Fühlt es sich bei Thomas' iPhone-Test schlecht an, wird **`breiteOben` erhöht** (z. B. von
0,46 auf 0,65). Damit sinkt die Querdrift, die Tiefenwirkung nimmt ab — eine bewusste
Abwägung, die Thomas trifft.

**Kein zulässiger Ersatz ist:** die Gegner wieder geradeaus laufen zu lassen, während die
Straße sich verjüngt (dann laufen sie sichtbar neben der Fahrbahn); die Straße wieder flach
zu machen; die Gegnergeschwindigkeit zu ändern, um die Drift zu kaschieren; Figuren zu
skalieren, um es „auszugleichen". Führt das Erhöhen von `breiteOben` nicht zum Ziel:
**melden und stoppen.**

**Zeitbudget:** Steht die Straße nach zwei Codex-Läufen nicht, wird der Umfang auf den
reinen Hintergrund reduziert (Abschnitte 1, 2 und 5) und die Gegnerführung vertagt — dann
sieht es räumlich aus, verhält sich aber wie bisher. Diese Kürzung entscheidet **Thomas**.

## Akzeptanzkriterien

1. Die Straße verjüngt sich nach oben auf 46 % der Bildbreite; alle Maße stammen aus einer
   einzigen Funktion und alle Zahlen stehen in `balance.ts` unter `road`.
2. Die Mittellinie läuft sichtbar **unten schneller als oben**.
3. Die 12 Striche werden einmalig angelegt; im laufenden Spiel gibt es kein `create()` oder
   `destroy()`.
4. Gegner behalten ihre Spur und fächern beim Näherkommen nach außen auf; keiner läuft
   sichtbar neben der Fahrbahn.
5. Gegner sind unverändert groß; `bodyWidth` und alle anderen Gegnerwerte sind nicht
   angefasst.
6. Torpaare passen sich der Straßenbreite an; die Wahl links/rechts funktioniert unverändert.
7. Münzen eines Kills liegen 18 px auseinander und überlappen nicht; am Bildrand wird die
   ganze Gruppe verschoben, nie zwei Münzen aufeinander.
8. `npm run check` und `npm run build` laufen fehlerfrei durch.
9. `docs/spec-e4b-entwurf.md` ist unverändert.

## Implementation Summary

- `Road` zeichnet die programmatische Trapez-Fahrbahn mit Rändern und einem dauerhaft angelegten 12er-Ring aus beschleunigten Mittellinien-Strichen. Die gemeinsame Breitenfunktion liegt in `src/systems/road.ts`; sämtliche Stellwerte stehen in `BALANCE.road`.
- Gegner speichern beim Spawn eine aus `crowd.getAnchorRange()` abgeleitete Spur und erhalten ihre X-Position in jedem Frame aus der Straßenbreite. Die Gegner-Skalierung und Trefferflächen bleiben unverändert.
- Tore werden bei jeder Bewegung symmetrisch in die aktuelle Straßenbreite gesetzt und nur horizontal skaliert; die Auswahl bleibt an der Bildmitte.
- Münzen eines Kills liegen nun mit `BALANCE.coins.dropSpacing` (18 px) auseinander. Am Rand wird die gesamte Gruppe gemeinsam verschoben.
- `npm run check` und `npm run build` erfolgreich ausgeführt. `docs/spec-e4b-entwurf.md` per Git-Status unverändert bestätigt.

**Offen bis zu Thomas' iPhone-Test:** ob die Tiefenwirkung überzeugt, ob das Zielen sich
noch gut anfühlt und ob der Effekt schon ausreicht oder Schritt 2 folgen soll.

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
