# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E5-4 — Bestenliste anzeigen, Speicherstand aus- und einlesen.**

Letzter von vier Läufen für E5. Rahmen: `docs/e5-design.md` (Entscheidungen 1, 5) und
`docs/plan.md`, Abschnitte „Startbildschirm und Bestenliste" sowie „Upgrade-System" —
**vor dem Bauen lesen**. E5-1 bis E5-3 sind fertig und freigegeben.

Die gesamte Logik dafür steht bereits in `save.ts` (`addScore`, `qualifiesForScores`,
`parseSave`, `serializeSave`) und ist durch Tests abgedeckt. **Dieser Lauf baut die Anzeige
und die Bedienung — die Speicherlogik wird nicht angefasst.**

## Teil 1 — Bestenliste im Menü

Unter den drei Kaufzeilen, im heute leeren Bereich über dem SPIELEN-Knopf:

- Überschrift **BESTE LÄUFE**.
- Bis zu **fünf** Zeilen (nicht zehn — mehr passt nicht lesbar in den freien Bereich;
  gespeichert bleiben weiterhin zehn). Wert in `balance.ts`: `menu.scoresShown` = **5**.
- Je Zeile: Platznummer, Münzzahl, erreichtes Level, Laufzeit als `m:ss`.
- Ist die Liste leer, steht dort eine einzelne Zeile **„Noch kein Lauf gewertet."** — kein
  leerer Kasten.
- Gleiche Schrift- und Farbwelt wie die Kaufzeilen.

## Teil 2 — Bestenliste nach dem Game Over

Die `GameOverScene` zeigt zusätzlich zur Münzzahl des Runs:

- Den **Platz**, falls der Lauf es in die gespeicherten zehn geschafft hat: „PLATZ 3".
- Ist er nicht in den zehn, steht dort nichts — kein „leider nicht".
- Der eigene Eintrag wird in einer kurzen Liste der besten fünf **hervorgehoben**
  (andere Farbe), damit der eigene Lauf im Vergleich sichtbar ist.

## Teil 3 — Speicherstand aus- und einlesen

Im Menü, unterhalb der Bestenliste, zwei kleine Knöpfe: **SICHERN** und **LADEN**.

Zweck laut Plan: iOS kann Website-Daten ohne Vorwarnung verwerfen. Ohne diesen Weg wäre der
gesamte Fortschritt eines Tages still weg.

### SICHERN

- Erzeugt den Text über `serializeSave(loadSave())`.
- Zeigt ihn in einem Feld an, aus dem er sich markieren und kopieren lässt.
  **Für dieses eine Feld ist ein DOM-`<textarea>` ausdrücklich erlaubt** — der Plan verlangt
  es so, weil man aus einem Phaser-Text nichts kopieren kann. Es wird über dem Canvas
  eingeblendet und beim Schließen wieder entfernt.
- Zusätzlich `navigator.clipboard.writeText()` versuchen; schlägt es fehl, bleibt das Feld
  der Weg. **Kein** `navigator.clipboard.readText()` — dessen Verhalten ist in einer
  iOS-Standalone-PWA nicht verlässlich (Plan).
- Ein Knopf **FERTIG** schließt die Ansicht.

### LADEN

- Zeigt ein leeres `<textarea>` zum Einfügen per Langdruck.
- **ÜBERNEHMEN** prüft den Text mit `parseSave`:
  - Gültig → schreiben, Ansicht schließen, Menü mit den neuen Werten neu aufbauen.
  - Ungültig → **der bestehende Spielstand bleibt unangetastet**, und der Grund aus
    `parseSave` wird unverändert angezeigt. Die Gründe sind bereits deutsche Sätze.
- **ABBRECHEN** schließt ohne Änderung.

### Verbindlich

- Beide Ansichten legen ihre DOM-Elemente **beim Öffnen** an und entfernen sie **beim
  Schließen** vollständig. Kein zurückbleibendes Element, das später Eingaben abfängt.
- Solange eine Ansicht offen ist, sind die Menüknöpfe darunter nicht bedienbar.
- Die Textfelder brauchen `font-size: 16px` oder mehr, sonst zoomt iOS-Safari beim
  Hineintippen ungefragt in die Seite hinein.

## Ausdrücklich nicht ändern

- Keine Änderung an `save.ts` — die Logik ist fertig und getestet.
- Keine Namenseingabe für die Bestenliste (Plan, ausdrücklich nicht in V1).
- Keine Änderung an Spielmechanik, Boss, Leveln, Kaufzeilen oder Titelbild.
- Kein DOM außerhalb der beiden Sichern/Laden-Ansichten.

## Reißleine

Lässt sich das Textfeld nicht so einblenden, dass es auf dem iPhone bedienbar ist:
**melden und stoppen**. Kein zulässiger Ersatz ist `clipboard.readText()`, ein Download als
Datei oder ein Verzicht auf die Ladefunktion — ohne sie ist der Export wertlos.

## Akzeptanzkriterien

1. Das Menü zeigt bis zu fünf Bestenlisten-Zeilen mit Platz, Münzen, Level und Zeit als
   `m:ss`; bei leerer Liste stattdessen genau einen Hinweissatz.
2. Nach einem Lauf, der es in die Liste schafft, zeigt Game Over den Platz und hebt den
   eigenen Eintrag hervor; ein Lauf ausserhalb der zehn zeigt keinen Platz.
3. SICHERN zeigt einen Text, der sich markieren lässt und `parseSave` besteht.
4. LADEN mit diesem Text stellt den Stand wieder her — geprüft über: Stand ändern, laden,
   Menüwerte stimmen wieder.
5. LADEN mit kaputtem Text ändert den gespeicherten Stand **nicht** und zeigt den Grund an.
6. Nach dem Schließen beider Ansichten ist **kein** zusätzliches DOM-Element mehr vorhanden.
7. Die Textfelder haben mindestens 16 px Schriftgröße.
8. Alle Menüelemente bleiben innerhalb der Safe-Area und überlappen einander nicht.
9. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 1 bis 8 prüft Claude am laufenden Spiel nach, Kriterium 5 mit einem absichtlich
zerstörten Text und einem Vergleich des Speicherstands vorher und nachher.
