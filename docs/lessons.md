# Lessons: Run & Gun

Jede Nutzerkorrektur wird hier als Regel eingetragen. Zu Sitzungsbeginn lesen.

## Format
- **Fehler:** Was lief falsch?
- **Regel:** Was verhindert denselben Fehler künftig?

---

### 2026-08-19 — Nutzeränderung als Fehler diagnostiziert
- **Fehler:** Eine von Thomas manuell gekürzte Todo-Zeile wurde ungefragt als „Speicherfehler" bewertet.
- **Regel:** Änderungen an Dateien, die Thomas selbst editiert, als bewusste Entscheidung annehmen. Nur nachfragen, wenn die Änderung eine laufende Aufgabe konkret blockiert — keine Ferndiagnose.

### 2026-08-20 — Reißleine erlaubte stillen Zielwechsel
- **Fehler:** Die Spec für die Gegner-Sprites enthielt als Reißleine „notfalls programmatisch zeichnen". Codex zog sie, lieferte abstrakte Formen statt Figuren — spec-konform, aber am Wunsch vorbei. Thomas musste den Auftrag wiederholen.
- **Regel:** Jede Reißleine benennt ausdrücklich, was **kein** zulässiger Ersatz ist, und verlangt bei Nichterreichbarkeit des Ziels eine Meldung statt eines Ersatzprodukts. Ein Ausweg ohne diese Grenze ist eine Erlaubnis, das Ziel zu tauschen.

### 2026-08-20 — Erfolgreiches Verfahren stand nirgends
- **Fehler:** Die vorhandene Spielerfigur war groß erzeugt und heruntergerechnet worden. Das stand in keiner Datei (Probeordner ist gitignored), also fehlte es in der ersten Sprite-Spec — Codex erzeugte direkt in Zielgröße, das Ergebnis war unbrauchbar.
- **Regel:** Wenn im Projekt etwas schon einmal gelungen ist, gehört der Weg dorthin in die Spec, nicht nur das Ergebnis ins Repo. Vor jeder Asset-Spec prüfen, wie vergleichbare Assets entstanden sind — und das Verfahren beim ersten Mal mitdokumentieren.


### 2026-08-20 — Vorhandenes Asset falsch beurteilt, zwei Laeufe verschwendet
- **Fehler:** Zwei Codex-Laeufe beauftragt, um die Spielfigur als Rueckenansicht neu zu erzeugen — sie **war** bereits eine Rueckenansicht. `src/assets/player.png` ist bitgleich `assets/probe/r3/figur-r3-2-34x46.png`. Grundlage des Fehlurteils war das 9-fach vergroesserte 34x46-Sprite: der dunkle Bereich unter dem Helm wurde als Gesicht gelesen, tatsaechlich ist es der Nacken. Auf die Frage des Nutzers kam die falsche Auskunft "noch frontal". Erst sein Hinweis auf den Probeordner klaerte es.
- **Regel:** Vor jedem Auftrag, ein Asset zu **aendern**, den Ist-Zustand an der **grossen Vorlage** im Probeordner pruefen, nie nur am Sprite in Spielgroesse — bei 34 px ist eine Ansicht nicht sicher zu erkennen, und genau das war hier vorher schon selbst festgestellt worden. Ebenso vorher pruefen, ob das Gewuenschte im Probeordner bereits fertig liegt: die Ordner enthalten verworfene **und** eingesetzte Varianten. Ein Datei-Hash-Vergleich zwischen Probe und `src/assets/` kostet Sekunden und haette beide Laeufe erspart.

### 2026-08-20 — Geometrie-Fix ohne Messlauf als erledigt gemeldet
- **Fehler:** Der Fix `fddcb63` („Gegner erscheinen nicht mehr uebereinander") wurde nach Sichtpruefung abgeschlossen. Thomas musste denselben Fehler ein zweites Mal melden. Die Messung danach zeigte: 1,7 % aller Frames enthielten weiterhin ueberlappende Gegner. Der Fix hatte nur die Spawn-Verteilung repariert, nicht das Einholen schnellerer Gegner. Anschliessend wurde erneut lange ueber Ursachen spekuliert (Display-Flimmern, Sprite-Fehler, Skalierungsartefakte), obwohl eine Messung in Minuten Klarheit brachte.
- **Regel:** Fehler, die sich als Haeufigkeit ausdruecken lassen („erscheint manchmal doppelt"), nie per Augenschein oder Hypothese beurteilen, sondern **zaehlen**: Spiel per Playwright starten, `update` der betroffenen Klasse am Prototyp instrumentieren, ueber Minuten protokollieren, Vorkommen zaehlen. Vorher-Wert festhalten, damit der Fix eine Zahl gegen sich hat. Ohne Zahl gilt ein Geometrie- oder Timing-Fix nicht als belegt. Gilt auch fuer die Rueckfrage an Thomas: eine Bildschirmaufnahme kostet ihn 20 Sekunden und trennt „echtes Objekt" von „Anzeigeeffekt" sofort — frueh danach fragen statt Varianten durchzuspielen.

### 2026-08-20 — Logische statt gezeichneter Position gemessen, Fehler zweimal verfehlt
- **Fehler:** Thomas meldete dreimal doppelt erscheinende Zombies. Die Instrumentierung las `enemy.x` **direkt nach** dem Setzen im eigenen Update aus — der Wert war glatt, also galt die Sache als erledigt. Tatsaechlich schrieb der Arcade-Physikschritt die Position **danach** um `body.offset.x` versetzt zurueck ins Sprite, mit wechselndem Vorzeichen je Bild; gerendert wurde dieser Stand. Ein ganzer Codex-Lauf ging in einen zwar echten, aber anderen Fehler (Gegner holten einander ein), weil die Messung den eigentlichen nicht sehen konnte.
- **Regel:** Bei sichtbaren Fehlern das messen, was **gezeichnet** wird, nicht den Wert, den der eigene Code gerade geschrieben hat. Praktisch: den Wert am **Anfang** des naechsten Frames gegen das Ende des vorigen pruefen — die Differenz ist alles, was Engine, Physik und Renderer dazwischen getan haben. Ist sie ungleich null, obwohl nur der eigene Code die Position setzt, ist genau dort der Fehler. Zusaetzlich frueh die eine Frage stellen, die eine Figur von zwei Objekten trennt: **"zaehlt es beim Abschiessen als eins oder als zwei?"** Thomas' Satz "zaehlt wie einer" hat den Fall in einem Zug entschieden, nachdem Stunden in die falsche Richtung gelaufen waren.
- **Zusatz:** Wer die Position eines Arcade-Koerpers selbst setzt, muss `body.moves = false` setzen. Sonst kaempfen eigenes Update und Physik-Rueckschreibung gegeneinander, und der sichtbare Versatz betraegt genau das Doppelte von `body.offset.x` — also proportional zum transparenten Rand des Sprites. Das erklaert, warum ein Fehler nur manche Sprites trifft.
