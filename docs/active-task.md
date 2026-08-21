# Active Task

## Status
`SPEC_READY`
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

<!-- Von Codex auszufüllen -->

## Verification

<!-- Von Codex auszufüllen -->
