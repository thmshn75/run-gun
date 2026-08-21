# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Menü aufräumen: Sichern/Laden ersatzlos raus, Zurücksetzen rein, Fußbereich reparieren,
Titelbild aufhellen.**

Thomas-Entscheidungen vom 2026-08-21 nach dem Test am iPhone.

---

# Teil 1 — Überlappende Knöpfe (Fehler)

## Befund

Auf dem iPhone liegen die Knöpfe des Fußbereichs **übereinander**.

Ursache ist ein gemischter Bezugspunkt: Die Sichern-Reihe sitzt bei
`insets.top + menu.saveLoadButtonsY` — also vom **oberen** Rand aus. Der Spielen-Knopf sitzt
bei `height - insets.bottom - …` — also vom **unteren**. Mit den iPhone-Rändern (oben 47,
unten 34) ergibt das eine Überlappung von **11 px**; am Desktop sind beide Ränder 0 und die
Elemente berühren sich knapp nicht.

**Genau deshalb konnte keine Prüfung am Desktop diesen Fehler finden.**

## Verlangte Korrektur

1. **Der Fußbereich wird von unten nach oben aufgebaut.** Der Spielen-Knopf sitzt unten, alles
   darüber staffelt sich mit festen Abständen nach oben. Kein Element des Fußbereichs wird
   mehr vom oberen Rand aus positioniert.
2. **Die vertikale Anordnung wird als reine Funktion herausgezogen**, zum Beispiel
   `computeMenuLayout(height, insets, scoreLines)`, ohne Phaser-Abhängigkeit.
3. **Unit-Tests dieser Funktion** mit mindestens zwei Randfällen — `{ top: 0, bottom: 0 }` und
   `{ top: 47, bottom: 34 }` — die prüfen: **kein Bereich überlappt einen anderen**, und alles
   liegt innerhalb der Safe-Area. Das ist der eigentliche Schutz gegen eine Wiederholung.

---

# Teil 2 — Sichern und Laden ersatzlos entfernen

Thomas: „Nimm laden und speichern komplett raus".

Zu entfernen:

- Die Knöpfe SICHERN und LADEN im Menü.
- Die gesamte eingeblendete Ansicht mit Textfeld, samt der DOM-Elemente. **Danach benutzt das
  Spiel überhaupt kein DOM mehr** — der Kommentar dazu im Code entfällt entsprechend.
- Die Erinnerungszeile „Seit N Läufen nicht gesichert." und das Feld `runsSinceExport` im
  Speicherstand samt der Stelle, die es hochzählt.
- Die Zeile über den Zustand des Dauerspeichers.
- `serializeSave` bleibt, weil `writeSave` es benutzt. `parseSave` bleibt, weil `loadSave` es
  benutzt. Nur die Bedienung verschwindet, nicht die Prüfung.

**Was bleibt:** die automatische Speicherung, die Zweitkopie unter `rungun_save_v1_backup` und
die Anfrage auf Dauerspeicher. Der Schutz vor Beschädigung bleibt also vollständig erhalten.

**Ehrliche Folge, als Kommentar an `save.ts` festzuhalten:** Ohne Ausleseweg ist der
Fortschritt verloren, wenn iOS die Websitedaten verwirft oder die App vom Homescreen entfernt
wird. Das ist eine bewusste Entscheidung von Thomas, keine Auslassung.

Ein Spielstandstext mit einem übrig gebliebenen `runsSinceExport` muss weiterhin **angenommen**
werden — unbekannte Felder werden ohnehin verworfen. Dafür bleibt ein Testfall.

---

# Teil 3 — Knopf „Spielstände zurücksetzen"

Thomas: „Und dafür einen Button mit der Funktion Spielstände zurücksetzen".

- Ein Knopf **ZURÜCKSETZEN** im Fußbereich, oberhalb von SPIELEN, in gedämpfter Farbe — er
  konkurriert nicht mit dem Spielen-Knopf.
- Ein Tippen **löscht nicht sofort**. Es erscheint eine Rückfrage mitten im Bild:
  „Alles zurücksetzen? Münzen, Aufwertungen und Bestenliste gehen verloren." mit den beiden
  Knöpfen **JA, LÖSCHEN** und **ABBRECHEN**.
- Erst „JA, LÖSCHEN" setzt den Speicherstand auf die Standardwerte, schreibt ihn (samt
  Zweitkopie) und baut das Menü neu auf.
- Die Rückfrage wird mit Phaser-Objekten gezeichnet, **nicht** mit DOM.
- Solange die Rückfrage offen ist, sind die Knöpfe darunter nicht bedienbar.

**Grund für die Rückfrage:** Ein Fehlgriff auf einem Telefon ist schnell passiert, und ohne
Ausleseweg gibt es danach keinen Weg zurück.

---

# Teil 4 — Titelbild im Spiel aufhellen

Thomas: „auch die Titelbild Helligkeit im Spiel höher".

Das Bild selbst ist hell; abgedunkelt wird es durch die halbdurchsichtige schwarze Fläche
darüber (`menu.overlayAlpha` = 0.45).

- `menu.overlayAlpha` auf **0.20** senken.
- Die Bestenliste und ihre Überschrift stehen heute ohne eigenen Hintergrund direkt auf dem
  Bild. Sie bekommen denselben halbdurchsichtigen Zeilenhintergrund wie die Kaufzeilen, damit
  sie auf dem helleren Bild lesbar bleiben.
- Reicht die Lesbarkeit trotzdem nicht, wird **der Hintergrund dieser Zeilen kräftiger** —
  nicht die Fläche über dem ganzen Bild wieder dunkler.

---

## Ausdrücklich nicht ändern

- Keine Spielbalance, keine Werte von Boss, Gegnern, Waffen oder Toren.
- Die automatische Speicherung, die Zweitkopie und die Dauerspeicher-Anfrage bleiben.
- Das Titelbild als Datei und die Icons bleiben unverändert.
- Die Trefferprüfung aus `729df4d` bleibt unangetastet.

## Reißleine

Sind Kaufzeilen oder Bestenliste nach dem Aufhellen nicht sicher lesbar: **den Hintergrund der
Zeilen kräftiger machen und melden**, nicht die Fläche über dem Bild wieder abdunkeln.

## Akzeptanzkriterien

1. Mit Rändern `{ top: 47, bottom: 34 }` überlappt **kein** Menüelement ein anderes und nichts
   ragt aus der Safe-Area — nachgewiesen durch Unit-Tests der Layout-Funktion.
2. Dasselbe gilt für Ränder `{ top: 0, bottom: 0 }`.
3. Es gibt keine Knöpfe für Sichern und Laden mehr, keine eingeblendete Textansicht und **kein
   DOM-Element** außer dem Canvas — auch nicht kurzzeitig.
4. Im Speicherstand gibt es kein `runsSinceExport` mehr; ein Text, der es noch enthält, wird
   weiterhin angenommen.
5. Der Knopf ZURÜCKSETZEN fragt zurück; ABBRECHEN lässt den Speicherstand **bitgleich**.
6. „JA, LÖSCHEN" setzt Münzen, Aufwertungen, höchstes Level und Bestenliste auf die
   Standardwerte, und das gilt auch nach einem Neuladen der Seite.
7. `menu.overlayAlpha` steht auf 0.20; Bestenliste und Überschrift haben einen eigenen
   Hintergrund und sind lesbar.
8. Die automatische Speicherung und die Zweitkopie funktionieren unverändert.
9. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 1 und 2 prüft Claude über die Unit-Tests, Kriterien 3 bis 8 am laufenden Spiel.
