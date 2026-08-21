# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Ruckeln beseitigen: Kollisionsprüfung auf die aktive Waffe beschränken.**

Thomas' iPhone-Test vom 2026-08-21: „irgendwas stimmt mit der neuen Version nicht, sie ruckelt
… ist nicht wirklich spielbar."

**Dies ist ein reiner Leistungs-Task. Am Spielverhalten darf sich nichts ändern.**

---

## Befund: gemessen, nicht vermutet

CPU-Profil im laufenden Spiel (Chrome, Level 1, 6 Sekunden):

| Anteil an der Rechenzeit | Funktion |
|---|---|
| **49,7 %** | `collideSpriteVsGroup` (Phaser) |
| **8,1 %** | `collideGroupVsGroup` (Phaser) |
| 2,1 % | `separate` (Phaser) |
| unter 1,5 % | jeweils der eigene Spielcode |

**Rund 60 % der Rechenzeit stecken in der Kollisionsprüfung.** Der Grund steht in
`src/systems/weapons.ts`: Alle Projektile **aller sieben Waffen** werden in **eine einzige**
Physik-Gruppe gelegt — heute 520 Objekte. Diese Gruppe geht in drei Prüfungen pro Bild ein
(gegen Gegner, gegen Boss, gegen Sperren). Phaser läuft dabei über **jedes** Mitglied, auch
über die mehr als 400 Projektile der Waffen, die gerade gar nicht getragen werden.

Frame-Zeiten bei achtfach gedrosselter CPU, gemessen an drei Ständen:

| Stand | Frame-Zeit |
|---|---|
| `346665a` (nach E7, von Thomas als gut bewertet) | 217 ms |
| `f548e32` (vor den neuen Waffen) | 233 ms |
| `4f4b288` (heute) | 267 ms |

Der Anstieg ist die Summe mehrerer Etappen; die drei neuen Waffen waren der letzte Tropfen
(+51 % Poolgröße in genau der teuersten Schleife).

## Verlangte Umsetzung

1. **Jede Waffe bekommt ihre eigene Physik-Gruppe** statt einer gemeinsamen. Die Pools bleiben
   wie sie sind — es ändert sich nur, in welcher Gruppe die Objekte liegen.
2. **In die Kollisionsprüfung geht nur die Gruppe der aktiven Waffe.** Beim Waffenwechsel wird
   die Prüfung auf die neue Gruppe umgehängt: alten Collider entfernen
   (`Phaser.Physics.Arcade.Collider.destroy()` oder `physics.world.removeCollider`), neuen
   anlegen. Damit sinkt die Zahl geprüfter Objekte von 520 auf 24 bis 128, je nach Waffe.
3. **Prüfungen gegen Ziele, die es gerade nicht gibt, werden abgeschaltet:**
   - Der Collider gegen den Boss ist nur während der Bossphase aktiv.
   - Die Collider gegen Sperren und deren Belohnung sind nur aktiv, während eine Sperre im
     Bild ist.
   Ein Collider auf ein inaktives Ziel kostet trotzdem den vollen Durchlauf über die Gruppe.
4. **`getProjectiles()` bleibt für alles erhalten, was den Gesamtbestand braucht** (etwa die
   Bewegung im `update`). Nur die Kollisionsprüfung wird eingeschränkt.

## Ausdrücklich nicht ändern

- **Kein Spielverhalten.** Trefferverhalten, Schaden, Reichweite, Waffenwerte, Poolgrößen,
  Balance — alles bleibt. Das ist ein reiner Umbau der Kollisionsverdrahtung.
- Die Trefferprüfung aus Commit `729df4d` (Treffer nur bei echter Berührung einer Figur).
- Die Kettenblitz-Logik, die Sperren-Mechanik, die Trupps, den Boss.
- Keine neuen Abhängigkeiten.

## Reißleine

Reicht die Umstellung nicht, ist der nächste Hebel die **Zahl der Kollisionspaare**, nicht die
Spielbalance: Gegner und Sperren könnten in einer gemeinsamen Gruppe geprüft und danach
unterschieden werden. **Poolgrößen oder Gegnerzahlen zu senken ist ausdrücklich nicht der
erste Weg** — das wäre Scope-Abbau statt einer Behebung der Ursache.

## Akzeptanzkriterien

1. Jede Waffe hat eine eigene Physik-Gruppe; in den Kollisionsprüfungen steckt nie mehr als
   die Gruppe der aktiven Waffe.
2. Ein Wechsel der Waffe hängt die Prüfung korrekt um: Nach dem Wechsel treffen die Projektile
   der neuen Waffe, und die der alten sind sauber recycelt. Unit-Test oder klar belegbarer
   Codepfad.
3. Der Collider gegen den Boss ist außerhalb der Bossphase nicht registriert; die Collider
   gegen Sperre und Belohnung nur, während eine Sperre im Bild ist.
4. Das Spielverhalten ist unverändert: Alle bestehenden Tests laufen ohne inhaltliche Anpassung
   weiter durch. Werden Tests angepasst, ist im Bericht **einzeln zu begründen**, warum das
   keine Verhaltensänderung ist.
5. Es gibt keinen Weg mehr, über den eine inaktive Waffe in eine Kollisionsprüfung gerät.
6. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

**Claude misst nach:** CPU-Profil und Frame-Zeit bei achtfacher Drosselung. Zielwert: **unter
217 ms**, also besser als der von Thomas als gut bewertete Stand — und der Anteil der
Kollisionsfunktionen deutlich unter den heutigen 58 %.

## Implementation Summary

- Jede der sieben Waffen besitzt jetzt eine eigene Arcade-Physikgruppe. `getProjectiles()`
  liefert weiterhin den Gesamtbestand fuer Bewegung und Recycling, ist aber aus allen
  Kollisionspfaden entfernt.
- `GameScene` registriert Projektile nur gegen die Gruppe der aktiven Waffe. Beim Aufheben
  einer neuen Waffe werden die noch aktiven Projektile der alten Waffe recycelt, die drei
  projektilbasierten Collider entfernt und fuer die neue Gruppe passend neu angelegt.
- Boss-Collider (Boss, Boss-Projektile) bestehen nur in der Bossphase. Sperren- und
  Belohnungs-Collider werden nur angelegt, solange mindestens ein Sperrenpaar aktiv ist,
  und danach wieder zerstoert.
- Zwei Regressionstests sichern Gruppenaufteilung, Wechselpfad und die bedingte
  Registrierung ab. Bestehende Tests wurden nicht inhaltlich geaendert.

## Verification

- `npm run check` erfolgreich (TypeScript ohne Fehler).
- `npm run build` erfolgreich; einzig die bestehende Vite-Hinweiswarnung fuer einen Chunk
  ueber 500 kB.
- `npm test` erfolgreich: 11 Dateien, 45 Tests bestanden.
- `git diff --check` erfolgreich.
- CPU-Profil und Achtfach-Drosselung wurden nicht hier ausgefuehrt: laut Auftrag misst Claude
  diese Laufzeitakzeptanz im Browser/iPhone nach.

## Review-Ergebnis (Claude, im Browser nachgemessen)

**Das Ruckeln ist behoben.** Alle sechs Kriterien erfuellt.

| Messung bei achtfach gedrosselter CPU | Frame-Zeit | Bilder/s |
|---|---|---|
| `346665a` (von Thomas als gut bewertet) | 217 ms | 4,6 |
| `4f4b288` (ruckelnder Stand) | 267 ms | 3,7 |
| **nach dieser Korrektur** | **16,7 ms** | **59,9** |

- **Kollisionsanteil im CPU-Profil: von 58 % auf 3,3 % gefallen.** Die CPU ist jetzt zu 91 %
  unbeschaeftigt, wo vorher `collideSpriteVsGroup` allein die Haelfte der Zeit verbrauchte.
- **Gegenprobe gemacht:** Ein Bildschirmfoto waehrend der Messung belegt das laufende Spiel
  mit Gegnern, Toren und Truppe — die Messung stammt nicht versehentlich aus dem Menue.
- **Kriterium 4:** Bestehende Tests wurden **nicht** inhaltlich geaendert, nur ergaenzt.
  45 Tests gruen, `npm run check` und `npm run build` erfolgreich.

**Anmerkung zur Testqualitaet:** Die beiden neuen Regressionstests pruefen den **Quelltext**
per `readFileSync` auf bestimmte Zeichenketten, nicht das Verhalten. Das haelt die Struktur
fest, bricht aber bei jeder Umformulierung und beweist die Wirkung nicht. Der eigentliche
Nachweis ist die Messung oben. Ein echter Verhaltenstest waere besser, braucht aber eine
Phaser-Instanz im Test — als moegliche spaetere Verbesserung notiert, kein Mangel dieser
Korrektur.
