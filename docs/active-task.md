# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Start mit einer Figur und Feuerrate 3; dazu automatische Absicherung des Spielstands.**

Drei Punkte aus Thomas' Test vom 2026-08-21.

---

# Teil 1 — Startwerte

- `stats.hp.base` von **3 auf 1**: Ein Run beginnt mit einer einzigen Figur.
- `stats.shotsPerSec.base` von **3.5 auf 3**.

Sonst wird an der Balance **nichts** geändert — keine Gegnerwerte, keine Torwerte, keine
Boss-Lebenspunkte.

**Folge, die mitgezogen werden muss:** Die Aufwertung „Truppe" gibt +1 Startfigur je Stufe.
Mit Grundwert 1 reicht sie künftig von **1 bis 6** statt von 3 bis 8. Die Anzeige im Menü
rechnet ohnehin aus dem Grundwert und folgt automatisch; in `docs/e5-design.md`,
Entscheidung 4, ist die Tabelle entsprechend zu berichtigen (1 → 6 und 3 → 5 Schuss/s).

---

# Teil 2 — Automatische Absicherung des Spielstands

Thomas: „hier brauchen wir eine automatische Speicherung am Handy".

Gespeichert wird bereits automatisch — nach jedem Level, bei Game Over und sofort bei jedem
Kauf. Das eigentliche Anliegen ist, dass dieser Speicher nicht verschwindet. Drei Maßnahmen,
alle kostenlos und ohne Server:

## 2a — Dauerspeicher anfordern

WebKit kennt seit iOS 17 `navigator.storage.persist()`. Wird der Modus gewährt, ist der
Speicher der Seite von der üblichen automatischen Räumung ausgenommen. **Bei Web-Apps auf dem
Homescreen ist genau das eine der Bedingungen, nach denen WebKit die Anfrage bewilligt**
(WebKit-Blog „Updates to Storage Policy").

- Beim Start des Spiels einmalig `navigator.storage.persist()` aufrufen, falls vorhanden.
- Das Ergebnis merken und über `navigator.storage.persisted()` beim Menüaufbau abfragen.
- **Nie darauf verlassen und nie darauf warten:** Der Aufruf läuft nebenher, das Spiel startet
  unabhängig davon. Ältere Geräte und Browser ohne diese Möglichkeit dürfen keinen Fehler
  erzeugen.

## 2b — Zweitkopie gegen Beschädigung

Bei jedem Schreiben zusätzlich eine Kopie unter `rungun_save_v1_backup` ablegen.
Beim Laden: Ist der Haupteintrag fehlend oder ungültig, **aber die Zweitkopie gültig**, wird
die Zweitkopie genommen und sofort wieder als Haupteintrag geschrieben.

Das schützt gegen einen beschädigten Eintrag, **nicht** gegen das Löschen aller Websitedaten —
beide liegen im selben Speicherbereich. Genau so ist es im Code zu kommentieren, damit später
niemand die Zweitkopie für eine Sicherung hält, die sie nicht ist.

## 2c — Sichtbarer Hinweis im Menü

Eine Zeile unter der Bestenliste, klein und unaufdringlich:

- Ist Dauerspeicher gewährt: **„Speicher gesichert"**.
- Sonst: **„Speicher nicht gesichert — sichere deinen Stand gelegentlich."**

Zusätzlich mitzählen, wie viele Läufe seit der letzten Sicherung über den SICHERN-Knopf
vergangen sind (`runsSinceExport` im Speicherstand, bei SICHERN auf 0). Ab
`menu.exportReminderRuns` = **10** Läufen steht dort stattdessen:
**„Seit N Läufen nicht gesichert."**

Das ist ein Hinweis, keine Sperre — es blockiert nichts und öffnet nichts von selbst.

## Was ausdrücklich **nicht** gebaut wird

- **Kein Server, kein Konto, keine Cloud.** Widerspricht dem Plan und wäre nicht kostenlos.
- **Kein automatischer Datei-Download** als Sicherung: iOS verlangt dafür eine Nutzergeste,
  ein Versuch ohne Geste wird stillschweigend verworfen.
- **Kein `navigator.clipboard.readText()`** — bleibt aus den bekannten Gründen verboten.
- Keine Verschlüsselung, keine Manipulationssicherung.

**Ehrliche Grenze, die im Code als Kommentar festzuhalten ist:** Löscht der Nutzer die
Website-Daten oder entfernt die App vom Homescreen, ist der Stand weg. Dagegen hilft
ausschließlich die Sicherung über SICHERN. Keine der drei Maßnahmen ändert daran etwas.

## Erweiterung des Speicherstands

`SaveData` bekommt ein Feld `runsSinceExport: number` (Grundwert 0). `parseSave` prüft es wie
die anderen Zahlen; **fehlt es in einem älteren Text, gilt 0 und der Text bleibt gültig** —
ein Spielstand aus der Version von gestern darf nicht plötzlich abgelehnt werden. Dafür ein
eigener Testfall.

---

## Reißleine

Lässt sich `navigator.storage.persist()` nicht ohne Fehler aufrufen oder blockiert es den
Start: **den Aufruf entfernen und melden**. Kein zulässiger Ersatz ist es, den Start zu
verzögern, bis eine Antwort da ist.

## Akzeptanzkriterien

1. Ein Run startet mit genau **einer** Figur und `RATE 3`.
2. Die Aufwertung „Truppe" zeigt im Menü den Bereich 1 bis 6; fünf Stufen führen auf 6 Figuren.
3. `navigator.storage.persist()` wird beim Start aufgerufen; das Spiel startet auch dann
   normal, wenn die Möglichkeit fehlt oder abgelehnt wird.
4. Bei jedem Schreiben liegt eine gültige Zweitkopie unter `rungun_save_v1_backup`.
5. Wird der Haupteintrag zerstört, die Zweitkopie aber nicht, startet das Spiel mit dem
   Stand aus der Zweitkopie und schreibt ihn wieder als Haupteintrag.
6. Sind beide zerstört, startet das Spiel mit Standardwerten und ohne Fehler.
7. Das Menü zeigt eine der drei Hinweiszeilen, passend zum Zustand.
8. Ein Spielstandstext **ohne** `runsSinceExport` wird weiterhin angenommen.
9. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch; die neuen Fälle
   4, 5, 6 und 8 sind als Tests abgedeckt.

Kriterien 1 bis 7 prüft Claude am laufenden Spiel nach.

## Implementation Summary

- Startwerte sowie die fünf Stufen von Truppe und Feuerrate auf 2 → 7 beziehungsweise 3,0 → 4,5 angepasst.
- Nebenläufige WebKit-Dauerspeicher-Anfrage, Menühinweis und Laufzähler seit SICHERN ergänzt.
- Jeder Speicherstand erhält eine zweite lokale Kopie; bei beschädigtem Haupteintrag wird sie wiederhergestellt. Beide Kopien bleiben bei gelöschten Websitedaten verloren; dafür bleibt SICHERN nötig.
- `npm run check`, `npm run build` und `npm test` erfolgreich; die Speicherfälle sind mit 12 Unit-Tests abgedeckt.


---

# NACHTRAG (Thomas, 2026-08-21)

## Befund des Reviews: alles erfüllt

Am laufenden Spiel gemessen, bevor der Nachtrag kam:

- Zweitkopie entsteht bei jedem Schreiben und ist zeichengleich dem Haupteintrag.
- Haupteintrag zerstört, Zweitkopie heil → das Spiel startet mit dem geretteten Stand und
  **schreibt ihn wieder als Haupteintrag**.
- Beide zerstört → Standardwerte, Spiel läuft, **kein Seitenfehler**.
- `navigator.storage.persist()` ist vorhanden und wird aufgerufen; die Bewilligung ist im
  Desktop-Browser erwartungsgemäß `false` und blockiert nichts.
- Menü zeigt `TRUPPE 3 / 6`, `FEUERRATE 3 / 4.5` und die Zeile „Seit 12 Läufen nicht
  gesichert."

## Einzige Änderung

Thomas nach dem Test: **„Dann starte mit 2 Team"**.

- `stats.hp.base` von **1 auf 2**.
- Damit reicht die Aufwertung „Truppe" von **2 bis 7**. In `docs/e5-design.md`,
  Entscheidung 4, die Tabelle entsprechend berichtigen (2 → 7).
- Sonst **nichts** ändern — Feuerrate bleibt bei 3, alle Maßnahmen zur Absicherung des
  Spielstands bleiben unangetastet.

## Zusätzliches Akzeptanzkriterium

10. Ein Run startet mit genau **zwei** Figuren; das Menü zeigt bei der Truppe den Bereich
    2 bis 7.


---

# NACHTRAG 2 (Thomas, 2026-08-21) — Icon ist zu dunkel

Thomas nach dem Blick auf den Homescreen: „Und das Icon Bild aufhellen - wirkt am Bildschirm
sehr dunkel."

## Befund, gemessen an den erzeugten Dateien

- Mittlere Helligkeit **69 von 255**.
- **65 % der Fläche** sind dunkler als 60.

Ursache ist der Ausschnitt: Die dunkelgraue Fahrbahn nimmt den größten Teil des Quadrats ein,
das helle Grün und der Himmel liegen fast vollständig außerhalb.

## Verlangte Korrektur

**Zuerst über den Ausschnitt, erst danach über die Helligkeit** — ein hellgerechnetes dunkles
Bild wird grau und flau, ein besserer Ausschnitt ist von sich aus hell.

1. Den quadratischen Ausschnitt **nach oben verschieben**, sodass deutlich mehr Wiese und
   Himmel hineinfallen. Die drei Figuren bleiben das Hauptmotiv und sollen weiterhin
   mindestens **ein Drittel der Icon-Höhe** einnehmen; sie dürfen im unteren Bereich sitzen.
2. Reicht das nicht, den Ausschnitt zusätzlich moderat aufhellen — **höchstens 25 %**, damit
   die Farben kräftig bleiben und das Bild nicht ausbleicht.
3. Die Zielwerte unten sind im Skript als Kommentar festzuhalten, damit beim nächsten
   Anfassen klar ist, wonach der Ausschnitt gewählt wurde.

## Zusätzliche Akzeptanzkriterien

11. Die mittlere Helligkeit von `public/icon-512.png` liegt bei **mindestens 115** von 255
    (vorher 69).
12. Höchstens **35 %** der Fläche sind dunkler als 60 (vorher 65 %).
13. Die drei Figuren sind weiterhin klar erkennbar und nehmen mindestens ein Drittel der
    Icon-Höhe ein.
14. Alle drei Dateien werden neu erzeugt und sind weiterhin quadratisch, deckend und in der
    richtigen Größe; das Kontrollbild unter `assets/probe/icons-kontrolle.png` wird erneuert.

Kriterien 11 und 12 misst Claude an den erzeugten Dateien nach, Kriterium 13 am Kontrollbild.
