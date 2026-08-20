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


### 2026-08-20 — Bildgenerator dreht Figuren nicht
- **Fehler:** Zwei Anläufe, die vorhandene Spielfigur als Rückenansicht neu zu erzeugen, lieferten beide wieder eine Frontalansicht — beim zweiten Mal trotz ausdrücklicher Vorgabe „Helm von hinten, Rucksack, keine Vorderseiten-Details, kein Gesicht". Die Schärfe-Nacharbeit im selben Lauf gelang dagegen sofort.
- **Regel:** Eine **Blickrichtungsänderung** an einer bestehenden Figur ist keine Nachbesserung, sondern eine Neuzeichnung — der Bildgenerator hält am Ausgangsbild fest. Solche Aufträge nicht als „dieselbe Figur, nur gedreht" formulieren (das erzeugt genau die Kopie), sondern als eigenständige Figur mit vollständiger Beschreibung von hinten, ohne Verweis auf das vorhandene Bild. Und nur **einen** Mangel pro Nacharbeitslauf, wenn einer davon die Blickrichtung ist: Sonst gilt der Lauf als erfolgreich, weil der einfachere Teil geklappt hat.
