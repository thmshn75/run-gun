# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E7 — Leveltabelle und Gegner-Trupps.**

Erste Etappe der Scope-Erweiterung V1.3 (siehe `docs/plan.md`, Abschnitt „Levelaufbau, Trupps,
Boss, Sperren und Tore"). Ziel: Jedes Level bekommt ein eigenes Gesicht, und Gegner kommen
nicht mehr nur einzeln.

**Boss, Tore, Sperren und Waffen werden in dieser Etappe nicht angefasst.** Sie folgen in
E8–E10. Wer hier schon am Boss dreht, macht den Review unmöglich.

---

# Teil 1 — Leveltabelle statt verstreuter Formeln

## Befund

Heute unterscheiden sich Level nur durch zwei Zahlen: Boss-Lebenspunkte (Faktor 1,6 pro Level)
und Spawnabstand (`level.spawnBonusPerLevel`, 150 ms kürzer pro Level). Gegnerarten sind in
jedem Level identisch.

**Dazu ein echter Fehler:** `chooseEnemyType` in `src/systems/enemyTypes.ts` wählt die
Gegnerart nach `elapsedMs`, und `Spawner.resetForLevel` setzt `elapsedMs` bei jedem
Levelwechsel auf 0. Ein Level dauert 75 Sekunden (`level.normalPhaseSec`), die dritte Welle
in `enemy.waves` gilt aber erst ab Sekunde 90 (`untilSec: 0` nach `untilSec: 90`). **Diese
Welle wird nie erreicht** — die 35 % schweren Gegner sind toter Code. Das wird hier mitbehoben.

## Verlangte Umsetzung

1. **Neue reine Funktion `getLevelPlan(level: number): LevelPlan`** in einer neuen Datei
   `src/systems/levelPlan.ts`, **ohne Phaser-Abhängigkeit**, damit sie testbar ist.

2. **Neue Leveltabelle in `src/config/balance.ts`** mit **zwölf** Einträgen. Pro Eintrag
   mindestens: Dauer der Fahrtphase in Sekunden, Gewichte für leicht/normal/schwer,
   Start-Spawnabstand und Untergrenze, sowie welche Trupp-Arten in welcher Häufigkeit
   vorkommen dürfen.

3. **Schleife ab Level 13:** Die Gestaltung kommt aus `((level − 1) mod 12) + 1`. Zusätzlich
   ein **Härtefaktor**, der mit der echten Levelnummer wächst und Spawnabstand sowie
   Trupp-Größe beeinflusst. **Der Härtefaktor bekommt eine Obergrenze in `balance.ts`** —
   ohne Deckel wäre Level 40 nicht mehr spielbar, sondern nur noch eine Wand.

4. **Die zeitbasierte Wellenstruktur `enemy.waves` wird entfernt, nicht danebengestellt.**
   `chooseEnemyType` bekommt die Gewichte künftig als Parameter statt sie selbst aus der Uhr
   abzuleiten. Bleiben beide Wege im Code, entscheidet später der Zufall, welcher greift —
   und genau daraus ist der oben beschriebene Fehler entstanden. Die bestehenden Tests zu
   `chooseEnemyType` werden entsprechend mitgezogen, nicht gelöscht.

5. `elapsedMs` im Spawner bleibt erhalten, hat aber nur noch **eine** Aufgabe: das allmähliche
   Verkürzen des Spawnabstands innerhalb eines Levels (`spawnRampPerSec`). Das im Code
   kommentieren, sonst wandert die Gegnerwahl beim nächsten Umbau wieder dorthin zurück.

6. **Dramaturgie der zwölf Level** — die konkreten Zahlen wählst du, die Reihenfolge ist
   vorgegeben und nicht verhandelbar:
   - **1–2:** einzelne leichte und normale Gegner, keine Trupps, ruhiger Einstieg.
   - **3–4:** erste Keile aus leichten Gegnern.
   - **5–6:** schwere Gegner regelmäßig, Reihenformationen.
   - **7–8:** höherer Druck, Pulks kommen dazu.
   - **9–10:** Trupps häufiger und größer, Mischung aus allen Arten.
   - **11–12:** Höhepunkt, dichteste Mischung.
   Level 7–12 dürfen bereits Platz für Sperren (E9) und mehrspurige Tore (E10) in der Tabelle
   vorsehen; diese Felder bleiben in E7 wirkungslos und sind als solche zu kommentieren.

---

# Teil 2 — Gegner-Trupps

## Befund

Trupps sind heute nicht nur abwesend, sie sind **aktiv verhindert**: `chooseSpawnLane` in
`src/systems/spawnLanes.ts` sucht für jeden neuen Gegner eine Spur mit Sicherheitsabstand
(`spawnLaneSafetyGap`) zu allen anderen aktiven Gegnern. Ein Trupp ist genau das Gegenteil.

## Verlangte Umsetzung

1. **Neue reine Funktion für die Anordnung**, zum Beispiel
   `computeSquadOffsets(kind, size, spacing): readonly { laneOffset, yOffset }[]`, in einer
   neuen Datei `src/systems/squads.ts`, **ohne Phaser-Abhängigkeit**. Sie liefert nur relative
   Versätze zur Trupp-Mitte, keine Bildschirmkoordinaten.

2. **Drei Arten, mehr nicht:**
   - **Keil:** Spitze vorn, nach hinten breiter. Leichte Gegner.
   - **Reihe:** mehrere nebeneinander auf gleicher Höhe. Versperrt spürbar den Weg.
   - **Pulk:** versetzter Block aus gemischten Arten.

3. **Der Trupp wird als eine Einheit platziert.** `chooseSpawnLane` wird **genau einmal** pro
   Trupp aufgerufen, mit der **Gesamtbreite** des Trupps als `bodyWidth`. Die Mitglieder werden
   danach um die gefundene Mitte verteilt und **umgehen die Einzelspur-Prüfung**.
   **Ein Aufruf pro Mitglied ist ausdrücklich falsch** — das Ergebnis wären wieder
   Einzelgegner mit Sicherheitsabstand, also genau das, was diese Etappe beseitigen soll.

4. **Alles oder nichts.** Ein Trupp wird nur gespawnt, wenn im Gegner-Pool **genug freie
   Objekte für alle Mitglieder** vorhanden sind und die Spurwahl einen Platz findet.
   Andernfalls wird der ganze Trupp auf den nächsten Versuch verschoben (wie heute schon
   `deferredType`). Ein halb gespawnter Keil sieht aus wie ein Zeichenfehler, nicht wie ein
   Gegner.

5. **Ein Trupp zählt als ein Spawn-Ereignis, und danach folgt eine Pause.** Ohne diese Pause
   verdoppelt oder verdreifacht ein Trupp die Gegnerdichte schlagartig, weil der normale
   Spawn-Takt unverändert weiterläuft. Die Länge der Pause gehört als eigener Wert nach
   `balance.ts`, hergeleitet aus der Trupp-Größe.

6. **Passt ein Trupp nicht auf die Straße, wird er verkleinert, nicht verschoben.** Die
   Straße ist am Horizont schmal (`road.topWidthRatio` 0,46); ein breiter Trupp muss dort
   Mitglieder abgeben statt halb neben der Fahrbahn zu erscheinen.

7. **Poolgröße neu herleiten.** `pools.enemies` steht heute auf 48 mit einer dokumentierten
   Rechnung für Einzelgegner. Diese Rechnung wird auf den neuen schlimmsten Fall aktualisiert
   (dichtestes Level × größter Trupp × Verweildauer schwerer Gegner) und der Rechenweg wie
   bisher als Kommentar hinterlegt. Läuft der Pool leer, greift die bestehende
   Dev-Konsolenwarnung — sie muss auch für verhinderte Trupps anschlagen.

8. Trupp-Mitglieder sind **normale Gegner** mit den bestehenden Eigenschaften. Es gibt keinen
   neuen Gegnertyp und keine neue Kollisionsart.

---

## Ausdrücklich nicht ändern

- **Der Boss bleibt vollständig unberührt** — Lebenspunkte, Verhalten, Skalierung. Das ist E8.
- **Die Tore bleiben unberührt** (`src/systems/gates.ts`), auch die Tor-Mathematik. Das ist E10.
- **Die Trefferprüfung aus Commit `729df4d`** (Treffer nur bei echter Berührung einer Figur)
  wird nicht angefasst.
- Die Truppe des Spielers, die Waffen, das Menü, die Bestenliste und die Speicherung bleiben
  unverändert. Der Speicherstand bekommt kein neues Feld.
- Keine externen Requests, keine neuen Abhängigkeiten, keine neuen Bilddateien.

## Reißleine

Ruckelt ein voller Pulk am iPhone, wird die Trupp-Größe in `balance.ts` gesenkt (8 → 6 → 4).
**Die Mechanik wird nicht zurückgebaut.** Erst wenn auch ein Vierer ruckelt, liegt es nicht an
der Zahl, sondern an der Zeichenweise — dann melden statt weiter drehen.

Zeitbudget: Bekommst du die Trupp-Platzierung nach zwei Anläufen nicht sauber in die
bestehende Spurwahl integriert, baue die Trupp-Platzierung als **eigenen Weg neben**
`chooseSpawnLane` (Trupp reserviert seinen Bereich, Einzelgegner meiden ihn) und melde das —
statt `chooseSpawnLane` immer weiter umzubauen und dabei die Einzelgegner zu beschädigen.

## Akzeptanzkriterien

1. `getLevelPlan` ist eine reine Funktion ohne Phaser-Import und durch Unit-Tests abgedeckt,
   die mindestens **Level 1, 12, 13 und 25** prüfen. Nachgewiesen wird: Level 13 hat dieselbe
   Gestaltung wie Level 1, aber einen höheren Härtefaktor, und der Härtefaktor überschreitet
   seine Obergrenze nie.
2. Die Gegnermischung hängt am Level, nicht an der Uhr. `enemy.waves` existiert nicht mehr.
   Ein Unit-Test weist nach, dass die Mischung mit hohem Schwer-Anteil in mindestens einem
   der zwölf Level tatsächlich vorkommt — der Fehler aus dem Befund ist damit ausgeschlossen.
3. Die Trupp-Anordnung ist eine reine Funktion ohne Phaser-Import. Unit-Tests weisen für alle
   drei Arten und für die größte vorgesehene Trupp-Größe nach: **kein Mitglied überlappt ein
   anderes**, und **kein Mitglied liegt außerhalb der am Horizont verfügbaren Straßenbreite**.
4. `chooseSpawnLane` wird pro Trupp genau einmal aufgerufen, mit der Gesamtbreite. Im Code
   nachweisbar, nicht nur behauptet.
5. Ein Trupp erscheint entweder vollständig oder gar nicht. Bei zu kleinem Pool oder fehlendem
   Platz wird er verschoben, nicht gestückelt.
6. Nach einem Trupp folgt eine Pause im Spawn-Takt; der Wert steht in `balance.ts` und ist
   dort hergeleitet.
7. Die Herleitung von `pools.enemies` ist auf den neuen schlimmsten Fall aktualisiert und als
   Kommentar nachvollziehbar.
8. Level 1, 5 und 9 zeigen im Spiel sichtbar unterschiedliche Gegnerbilder.
9. Boss, Tore, Waffen, Truppe, Menü und Speicherstand verhalten sich unverändert.
10. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 1–7 und 10 prüfst du selbst über Tests und Diff. Kriterien 8 und 9 prüft Claude am
laufenden Spiel; die endgültige Gamefeel-Freigabe gibt Thomas am iPhone.

## Implementation Summary

<!-- Von Codex auszufüllen -->

## Verification

<!-- Von Codex auszufüllen -->
