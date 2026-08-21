# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E8 — Boss mit Phasen, Begleitern und Zeitdruck.**

Zweite Etappe der Scope-Erweiterung V1.3 (siehe `docs/plan.md`). Ziel: Der Boss wird **anders**,
nicht zäher.

**Tore, Sperren und Waffen werden hier nicht angefasst.** Das sind E9 und E10.

---

## Befund

Der Boss hat heute genau ein Verhalten: Dreier-Salve alle 1400 ms, langsame Geschosse
(260 px/s), seitliches Pendeln bei `battleY` 300. Keine Phasen, keine Begleiter, kein
Zeitdruck. Drei konkrete Ursachen, warum er sich harmlos anfühlt:

1. **Ein gemeinsames Unverwundbarkeitsfenster.** `GameScene` prüft `iframeUntilMs` sowohl für
   Gegnerkontakt (Zeile 293) als auch für Bossgeschosse (Zeile 283). Nach dem ersten Treffer
   ist die Truppe 1200 ms unverwundbar — von einer Dreier-Salve zählt damit praktisch **ein**
   Geschoss.
2. **Der Boss berührt nicht.** In `Boss.activate` steht `contactDamage: 0`. Er kann nicht
   gefährlich werden, egal wie lange der Kampf dauert.
3. **Die Lebenspunkte wachsen exponentiell und lösen das Problem nicht.**
   `baseHp * hpPerLevel^(level-1)` mit 400 und Faktor 1,6 ergibt auf Level 8 rund 6700 und auf
   Level 12 über 60 000 Punkte. Das ist kein schwerer Kampf, das ist eine Minute Dauerfeuer.

---

# Teil 1 — Zwei Phasen

1. **Unter der Hälfte seiner Lebenspunkte wechselt der Boss in Phase 2** mit: kürzerem
   Feuerabstand, mehr Geschossen pro Salve oder breiterem Fächer, und schnellerem Pendeln.
   Alle Werte je Phase in `balance.ts`.
2. **Der Wechsel ist ohne Erklärtext erkennbar** — dauerhafte Einfärbung des Bosses plus ein
   kurzes Aufblitzen im Moment des Wechsels. **Kein Text, kein Symbol, keine Erklärzeile**;
   das Spiel erklärt sich sonst nirgends.
3. Der Wechsel passiert **genau einmal pro Kampf**. Heilt oder verändert sich die
   Lebenspunktzahl anders, darf er nicht zurückspringen.

# Teil 2 — Begleiter

1. **Der Boss ruft während des Kampfs Gegner.** Diese kommen aus dem **bestehenden
   Gegner-Pool** über den vorhandenen Spawner; es wird kein zweiter Pool angelegt und zur
   Laufzeit nichts erzeugt.
2. **Der Spawner wird heute während der Bossphase abgeschaltet**
   (`setSpawningEnabled(false)`). Er bekommt einen Weg, auf Anforderung des Bosses einzelne
   Gegner zu spawnen, ohne dass der normale Takt wieder anläuft. Kein Umbau der
   Trupp-Logik aus E7.
3. **Harte Obergrenze für gleichzeitig lebende Begleiter** in `balance.ts` (Startwert 4).
   Grund: Bossgeschosse, Begleiter und eine volle Truppe treffen sonst genau im
   anstrengendsten Moment aufeinander — das ist die Stelle, an der ein iPhone einbricht.
4. Begleiter sind normale Gegner mit den Eigenschaften des aktuellen Levels. Kein neuer Typ.
5. **Beim Tod des Bosses werden verbliebene Begleiter eingesammelt** (recycelt), bevor das
   „LEVEL GESCHAFFT"-Overlay erscheint. Sonst kostet ein Gegner in der Siegespause Figuren,
   während der Spieler das Overlay liest — und das fühlt sich wie ein Fehler an.

# Teil 3 — Zeitdruck

1. **Ist der Boss nach einer Frist nicht besiegt, rückt er vor** — langsam und sichtbar, in
   Richtung der Truppe. Frist und Vorrückgeschwindigkeit in `balance.ts`.
2. **Erst beim Vorrücken bekommt er Kontaktschaden** (heute 0). Die Berührung kostet Figuren
   wie ein schwerer Gegner, nicht sofort den ganzen Lauf.
3. Er rückt **nicht unbegrenzt** vor: Er stoppt an einer Grenze kurz vor dem Ankerpunkt der
   Truppe, damit der Spieler ihm bis zuletzt seitlich ausweichen kann. Ein Boss, der die
   Truppe einfach überrollt, ist kein Zeitdruck, sondern eine Uhr, die den Lauf beendet.

# Teil 4 — Unverwundbarkeit trennen und Lebenspunkte deckeln

1. **Getrennte Unverwundbarkeitszeit für Bossgeschosse**, eigener Wert in `balance.ts`,
   deutlich kürzer als die 1200 ms für Gegnerkontakt. Der Wert für Gegnerkontakt bleibt
   **unverändert** — er schützt vor Kettenverlusten beim Durchfahren einer Gruppe, und das ist
   ein anderes Problem.
2. **Die Lebenspunkte des Bosses wachsen nicht mehr exponentiell.** Neue Formel mit moderatem
   Wachstum und einer Obergrenze, beides in `balance.ts` hergeleitet.
3. **Zielgröße: 20 bis 40 Sekunden Kampf auf jedem Level.** Dafür kommt eine
   **Referenz-Feuerkraft** als dokumentierte Konstante nach `balance.ts` — abgeleitet aus einer
   typischen Truppengröße mit Standardwaffe auf dem jeweiligen Level, mit Rechenweg als
   Kommentar. Ehrlich benennen: Das ist eine Modellrechnung, kein gemessener Spielwert. Ein
   sehr stark aufgerüsteter Lauf wird darunter liegen, ein schwacher darüber — dafür gibt es
   den Zeitdruck aus Teil 3.

---

## Ausdrücklich nicht ändern

- Die Leveltabelle, die Trupps und die Gegnerwahl aus E7 bleiben unberührt.
- Tore (`src/systems/gates.ts`), Waffen, Truppe des Spielers, Menü, Titelbildschirm,
  Bestenliste und Speicherformat bleiben unverändert.
- Die Unverwundbarkeitszeit für **Gegnerkontakt** (`player.iframesMs`, 1200 ms) bleibt.
- Die Trefferprüfung aus Commit `729df4d` wird nicht angefasst.
- Keine neuen Bilddateien, keine neuen Abhängigkeiten, keine externen Requests.

## Reißleine

Maximal **zwei** Balance-Zyklen für die Kampfdauer. Liegt sie danach immer noch außerhalb von
20–40 Sekunden, ist nicht die Zahl falsch, sondern die Schadensskalierung der Truppe — dann
**melden statt weiter an den Lebenspunkten drehen**.

Ruckelt der Kampf mit Begleitern am iPhone, wird die Obergrenze gesenkt (4 → 3 → 2), nicht die
Begleiter-Mechanik entfernt.

## Akzeptanzkriterien

1. Eine reine Funktion (etwa `getBossPlan(level)`) ohne Phaser-Abhängigkeit liefert
   Lebenspunkte, Phasenschwelle, Werte je Phase, Begleiter-Takt und Frist. Unit-Tests decken
   mindestens Level 1, 6, 12 und 30 ab.
2. Ein Unit-Test weist nach, dass die Lebenspunkte **nie** über der Obergrenze liegen und dass
   sie bei der dokumentierten Referenz-Feuerkraft auf jedem geprüften Level eine rechnerische
   Kampfdauer zwischen 20 und 40 Sekunden ergeben.
3. Der Phasenwechsel geschieht genau einmal pro Kampf, unter der Hälfte der Lebenspunkte, und
   ist an einer sichtbaren Einfärbung erkennbar — ohne Text.
4. In Phase 2 ist mindestens der Feuerabstand kürzer **und** eine zweite Größe verändert
   (Geschosszahl, Fächer oder Pendeltempo).
5. Nie mehr als die konfigurierte Obergrenze an Begleitern gleichzeitig am Leben; alle stammen
   aus dem bestehenden Gegner-Pool, ohne `create()` oder `destroy()` zur Laufzeit.
6. Beim Tod des Bosses sind vor dem „GESCHAFFT"-Overlay keine Begleiter mehr aktiv.
7. Nach Ablauf der Frist rückt der Boss sichtbar vor, macht dann Kontaktschaden und stoppt vor
   dem Ankerpunkt der Truppe, sodass seitliches Ausweichen möglich bleibt.
8. Bossgeschosse nutzen eine eigene, kürzere Unverwundbarkeitszeit; `player.iframesMs` ist
   unverändert.
9. Leveltabelle, Trupps, Tore, Waffen, Menü, Titelbildschirm und Speicherstand verhalten sich
   unverändert.
10. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 1, 2, 5 und 10 prüfst du selbst über Tests und Diff. Kriterien 3, 4, 6, 7, 8 und 9
prüft Claude am laufenden Spiel; die endgültige Beurteilung „fordernd, aber nicht unfair" gibt
Thomas am iPhone.

## Implementation Summary

<!-- Von Codex auszufüllen -->

## Verification

<!-- Von Codex auszufüllen -->
