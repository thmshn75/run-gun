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

