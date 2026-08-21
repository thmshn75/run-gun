# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Treffer an der Truppe nur noch, wenn wirklich eine Figur berührt wird.**

## Befund (gemessen, Thomas' Beobachtung bestätigt)

Thomas: „ich habe das Gefühl meine Truppe wird vom Boss immer getroffen auch wenn niemand
berührt wird".

Nachgemessen über einen vollständigen Bosskampf, **70 Treffer** von Boss-Geschossen. Zu jedem
Treffer wurde der Abstand des Geschosses zur nächstgelegenen sichtbaren Figur berechnet
(0 = Berührung):

- **70 von 70 Treffern ohne jede Berührung — 100 %.**
- Typischer Abstand **11 bis 15 px**, größter **25,7 px**.

Ursache: Die Kollisionshülle der Truppe (`crowd.getHullBounds()`) ist ein festes Rechteck von
**82 × 74 px** (`hullWidthFigures: 2.4`, `hullHeightFigures: 1.6` mal Figurengröße 34 × 46).
Sie sitzt mittig auf dem Anker und schrumpft **nicht** mit der Truppe. Bei kleiner Truppe liegt
damit ein unsichtbarer Rahmen von rund 24 px seitlich und 14 px oben und unten um die Figuren,
der alles einsammelt. Boss-Geschosse sind nur 8 px breit — der Rahmen fällt dort besonders auf.

Dass die Hülle fest ist, war eine bewusste Entscheidung aus `docs/plan.md`: Eine mitwachsende
Hülle würde eine große Truppe zu einem größeren Ziel machen. Diese Entscheidung bleibt.
**Falsch ist nicht die feste Größe, sondern dass die Hülle allein über den Treffer entscheidet.**

## Verlangte Korrektur — grobe Vorauswahl, feine Entscheidung

Die Hülle bleibt, wird aber zur **Vorauswahl** degradiert. Ob ein Treffer zählt, entscheidet
erst eine zweite Prüfung gegen die **tatsächlich sichtbaren Figuren**.

- Neue Methode in `Crowd`, etwa `overlapsFigure(rect): boolean`: prüft ein Rechteck gegen die
  Rechtecke aller **sichtbaren und aktiven** Figuren der Formation und liefert, ob mindestens
  eine getroffen wird.
- In `GameScene` wird bei einem Treffer an der Hülle — sowohl durch einen Gegner als auch
  durch ein Boss-Geschoss — zusätzlich diese Prüfung durchgeführt. Fällt sie negativ aus,
  passiert **nichts**: kein Schaden, keine Unverwundbarkeitszeit, kein Blinken, und das
  Geschoss beziehungsweise der Gegner bleibt bestehen.
- Die Hülle bleibt als Vorauswahl erhalten, damit nicht bei jedem Bild gegen bis zu
  30 Figuren geprüft wird. Der Kommentar an der Hülle ist entsprechend zu ergänzen.

**Aufwand:** Höchstens `crowd.max` = 30 Rechteckvergleiche, und nur in den Bildern, in denen
die Hülle überhaupt berührt wird. Das ist unkritisch.

## Bewusste Folge, die Thomas kennen muss

Das Spiel wird dadurch **leichter**: Treffer, die es bisher gab, fallen weg. Genau das ist das
Ziel — sie waren nicht nachvollziehbar. Fühlt sich das Spiel danach zu leicht an, wird an
`boss.fireIntervalMs` oder `boss.burstCount` gedreht, **nicht** die Hülle wieder aufgeblasen.

## Ausdrücklich nicht ändern

- Die Hülle wird **nicht** verkleinert und wächst **nicht** mit der Truppe.
- Keine Änderung an Schaden, Unverwundbarkeitszeit, Blinken oder Gegnerwerten.
- Keine Änderung an der Formation.
- Die Trefferprüfung zwischen eigenen Projektilen und Gegnern bleibt unangetastet.

## Reißleine

Führt die zweite Prüfung dazu, dass Gegner die Truppe durchqueren, ohne je zu treffen:
**melden und stoppen**. Kein zulässiger Ersatz ist es, die Prüfung wieder zu entfernen oder
sie auf einen größeren Rahmen als die Figuren aufzuweiten.

## Akzeptanzkriterien

1. Ein Treffer an der Truppe entsteht **nur**, wenn das Geschoss beziehungsweise der Gegner
   mindestens eine sichtbare Figur tatsächlich überlappt.
2. Über einen vollständigen Bosskampf gemessen: **0 Treffer ohne Berührung** (vorher 70 von 70).
3. Es gibt weiterhin Treffer — ein Bosskampf ohne jeden Treffer wäre kein Erfolg, sondern ein
   neuer Fehler. Mindestens ein Treffer pro Kampf, wenn die Truppe im Beschuss steht.
4. Normale Gegner, die die Truppe berühren, verursachen unverändert Schaden.
5. Unverwundbarkeitszeit und Blinken verhalten sich unverändert, wenn ein Treffer zählt.
6. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 1 bis 4 prüft Claude am laufenden Spiel mit derselben Messung wie beim Befund:
Abstand zwischen Geschoss und nächster Figur im Moment jedes gezählten Treffers.
