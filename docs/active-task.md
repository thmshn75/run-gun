# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Menü-Fußbereich: Knöpfe überlappen am iPhone. Dazu Sichern/Laden aus dem Hauptmenü
verlagern und das Titelbild im Spiel aufhellen.**

---

# Teil 1 — Überlappende Knöpfe (Fehler)

## Befund

Auf Thomas' iPhone liegen SICHERN und LADEN **auf** dem SPIELEN-Knopf.

Ursache ist ein gemischter Bezugspunkt:

- Die Sichern-Reihe sitzt bei `insets.top + menu.saveLoadButtonsY` (682) — also **vom oberen
  Rand** aus.
- Der Spielen-Knopf sitzt bei `height - insets.bottom - menu.playButtonBottom - …` — also
  **vom unteren Rand** aus.

Auf dem iPhone (oben 47, unten 34) landet die Sichern-Reihe bei 711 bis 747, der Spielen-Knopf
bei 736 bis 790 — **11 px Überlappung**. Am Desktop sind beide Ränder 0, dort berühren sie
sich knapp nicht. **Genau deshalb hat die Prüfung am Desktop den Fehler nicht finden können.**

## Verlangte Korrektur

1. **Der gesamte Fußbereich wird von unten nach oben aufgebaut.** Der Spielen-Knopf sitzt
   unten, alles darüber staffelt sich mit festen Abständen nach oben. Kein Element des
   Fußbereichs wird mehr vom oberen Rand aus positioniert.
2. **Die vertikale Anordnung des Menüs wird als reine Funktion herausgezogen**, zum Beispiel
   `computeMenuLayout(height, insets, scoreLines)`, die alle y-Positionen und Höhen liefert.
   Keine Phaser-Abhängigkeit, damit sie ohne Browser prüfbar ist.
3. **Unit-Tests für diese Funktion** mit mindestens zwei Randfällen:
   - Ränder `{ top: 0, bottom: 0 }` (Desktop)
   - Ränder `{ top: 47, bottom: 34 }` (iPhone)
   Geprüft wird jeweils: **kein Bereich überlappt einen anderen**, und alle Bereiche liegen
   innerhalb der Safe-Area. Das ist der eigentliche Schutz — am Desktop ist dieser Fehler
   grundsätzlich unerreichbar.

---

# Teil 2 — Sichern und Laden aus dem Hauptmenü verlagern

Thomas fragt, ob Laden und Speichern überhaupt nötig sind. Antwort: Die Funktion bleibt, weil
sie beim Wechsel auf ein neues iPhone der einzige Weg ist — aber sie muss nicht zwei Knöpfe im
Hauptbild belegen.

- Statt zweier Knöpfe **ein** kleiner Knopf **SPIELSTAND**, oberhalb von SPIELEN, in
  gedämpfter Farbe (kein kräftiges Orange — er konkurriert nicht mit dem Spielen-Knopf).
- Ein Tippen öffnet eine schlichte Ansicht mit **SICHERN**, **LADEN** und **ZURÜCK**.
- Die bestehenden Abläufe für Sichern und Laden bleiben **unverändert**, samt Textfeld,
  Prüfung und Meldungen. Es ändert sich nur, von wo aus sie erreichbar sind.

## Hinweiszeile vereinfachen

Die Zeile „Speicher nicht gesichert — sichere deinen Stand gelegentlich." **entfällt**. Sie
steht dauerhaft da, ohne dass Thomas etwas dagegen tun kann, und liest sich wie eine Warnung.

Es bleibt allein die Erinnerung **„Seit N Läufen nicht gesichert."**, sobald
`menu.exportReminderRuns` = 10 erreicht ist. Vorher steht dort nichts.

Die Anfrage auf Dauerspeicher (`navigator.storage.persist()`) bleibt bestehen — nur ihr
Ergebnis wird nicht mehr angezeigt.

---

# Teil 3 — Titelbild im Spiel aufhellen

Thomas: „auch die Titelbild Helligkeit im Spiel höher".

Das Bild selbst ist hell; abgedunkelt wird es durch die halbdurchsichtige schwarze Fläche
darüber (`menu.overlayAlpha` = 0.45), die für die Lesbarkeit der Kaufzeilen gedacht war.

- `menu.overlayAlpha` von **0.45 auf 0.20** senken.
- Die Kaufzeilen und die Bestenliste haben bereits eigene halbdurchsichtige Hintergründe.
  Reicht die Lesbarkeit nicht, wird **der Hintergrund dieser Zeilen kräftiger**, nicht die
  Fläche über dem ganzen Bild wieder dunkler.
- Die Bestenliste und die Erinnerungszeile stehen heute **ohne** eigenen Hintergrund direkt
  auf dem Bild. Sie bekommen denselben Zeilenhintergrund wie die Kaufzeilen, damit sie auf dem
  helleren Bild lesbar bleiben.

---

## Ausdrücklich nicht ändern

- Keine Spielbalance, keine Werte von Boss, Gegnern, Waffen oder Toren.
- Die Abläufe von Sichern und Laden selbst, samt Prüfung, bleiben unverändert.
- Das Titelbild als Datei bleibt unverändert; nur die Fläche darüber ändert sich.
- Die Icons bleiben, wie sie sind.

## Reißleine

Sind Kaufzeilen oder Bestenliste nach dem Aufhellen nicht sicher lesbar: **den Hintergrund der
Zeilen kräftiger machen und melden**, nicht die Fläche über dem Bild wieder abdunkeln.

## Akzeptanzkriterien

1. Mit Rändern `{ top: 47, bottom: 34 }` überlappt **kein** Menüelement ein anderes, und
   nichts ragt aus der Safe-Area — nachgewiesen durch Unit-Tests der Layout-Funktion.
2. Dasselbe gilt für Ränder `{ top: 0, bottom: 0 }`.
3. Im Hauptmenü gibt es genau **einen** Knopf für den Spielstand; SICHERN und LADEN sind über
   ihn erreichbar und funktionieren unverändert, inklusive der Prüfung kaputter Texte.
4. Die Zeile über den Zustand des Dauerspeichers erscheint nicht mehr; die Erinnerung ab zehn
   Läufen bleibt.
5. `menu.overlayAlpha` steht auf 0.20; Kaufzeilen, Bestenliste und Erinnerungszeile sind
   lesbar, weil sie einen eigenen Hintergrund haben.
6. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 1 und 2 prüft Claude über die Unit-Tests **und** an einer Messung im Browser mit
erzwungenen Rändern; Kriterien 3 bis 5 am laufenden Spiel.
