# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E5-3 — Startbildschirm mit erzeugtem Bild und permanenten Stufenkäufen.**

Dritter von vier Läufen für E5. Rahmen und Zahlen: `docs/e5-design.md`, Entscheidungen 2 und 4,
sowie `docs/plan.md`, Abschnitt „Startbildschirm und Bestenliste" — **vor dem Bauen lesen**.
E5-1 (Speicherstand) und E5-2 (Boss, Level) sind fertig und freigegeben.

## Neue Szene `MenuScene`

Heute startet `BootScene` direkt in die `GameScene`. Künftig startet sie in die `MenuScene`;
von dort geht es per Tippen auf „SPIELEN" in den Run. Nach Game Over führt der Weg über die
`GameOverScene` **zurück ins Menü**, nicht direkt in einen neuen Run.

Aufbau von oben nach unten:

1. **Titelbild** als Hintergrund über die volle Fläche.
2. **Titel** „RUN & GUN" als Schrift darüber.
3. **Kontostand** in Münzen, in der Münzfarbe des HUD.
4. **Drei Kaufzeilen** (siehe unten).
5. **Knopf „SPIELEN"**, deutlich abgesetzt, unterster Bereich.

Alles wird als Phaser-Objekte gezeichnet — **kein DOM, keine HTML-Elemente**. Safe-Area-Insets
wie im HUD einrechnen, damit auf dem iPhone nichts unter der Statusleiste oder am unteren
Rand klemmt.

## Das Titelbild

**Erzeugt Codex** nach dem im Projekt bewährten Verfahren: groß erzeugen, freistellen falls
nötig, dann auf Zielgröße herunterrechnen. Große Vorlage nach `assets/probe/titel-gross.png`
(gitignored), fertiges Bild nach `src/assets/title.png`, **390 × 844 px**.

**Motiv:** die rote Truppe von hinten auf der Straße, vor ihr Zombies, Tageslicht mit dem
Himmel und Horizont des Spiels — dieselbe Welt, nur als Bild. Stil wie die vorhandenen
Sprites: Pixel-Art, kräftige Farben, klare Konturen.

**Kein Text im Bild.** Titel und Knöpfe zeichnet das Spiel darüber; im Bild wären sie nicht
änderbar und würden nicht mit der Bildschirmgröße mitgehen.

**Ruhige Zone einplanen:** Im unteren Drittel muss das Bild flächig und kontrastarm sein,
damit Kaufzeilen und Knopf darauf lesbar bleiben. Zusätzlich legt die Szene über das Bild eine
halbdurchsichtige dunkle Fläche (`menu.overlayAlpha`, Vorschlag **0.45**) — Lesbarkeit darf
nicht allein vom Bild abhängen.

## Die drei Stufenkäufe

Aus `docs/e5-design.md`, Entscheidung 4. Alles nach `balance.ts` unter `upgradesShop`:

| Schlüssel | Beschriftung | Wirkung je Stufe | Grundwert → Höchstwert |
|---|---|---|---|
| `team` | TRUPPE | +1 Startfigur | 3 → 8 |
| `damage` | SCHADEN | +0,5 Startschaden | 1 → 3,5 |
| `rate` | FEUERRATE | +0,3 Schuss/s | 3,5 → 5,0 |

- Fünf Stufen je Aufwertung, gleiche Preisreihe: **50, 120, 250, 450, 750** Münzen.
- Je Zeile: Beschriftung, fünf Stufenpunkte (gefüllt = gekauft), der Preis der **nächsten**
  Stufe und ein Kaufknopf.
- Reicht der Kontostand nicht, ist der Knopf sichtbar **gedämpft** und reagiert nicht.
  Kein Fehlertext, kein Aufblinken — nicht kaufbar erklärt sich über die Zahl daneben.
- Ist die letzte Stufe erreicht, steht statt des Preises „MAX" und der Knopf entfällt.
- Ein Kauf zieht den Preis vom Konto ab, erhöht die Stufe um eins und **schreibt sofort**
  über `writeSave`. Ein Absturz danach darf keinen bezahlten Kauf verschlucken.
- Die Wirkung der Stufen auf die Startwerte ist in E5-1 bereits angeschlossen und wird
  **nicht** erneut implementiert.

## Anschluss der Szenen

- `BootScene` startet `MenuScene` statt `GameScene`.
- `MenuScene` startet `GameScene` beim Tippen auf „SPIELEN".
- `GameOverScene` kehrt beim Tippen ins Menü zurück und zeigt weiterhin die Münzen des Runs.
  Der Text „Tippen für Neustart" wird zu **„Tippen für Menü"**.

## Ausdrücklich nicht in diesem Lauf

- **Keine Bestenliste** — weder im Menü noch nach dem Game Over. Das ist E5-4.
- **Kein Export/Import** — ebenfalls E5-4.
- Keine Wahl der Startwaffe (die bleibt `NORMAL`, siehe Plan: gehört nicht in V1).
- Keine Änderung an Spielmechanik, Boss, Gegnern, Waffen, Toren oder HUD.
- Keine Tweens, kein Ton, keine Animation des Menüs.

## Reißleine

Lässt sich das Titelbild nicht in brauchbarer Qualität erzeugen: **melden und stoppen**. Kein
zulässiger Ersatz ist ein programmatisch gezeichneter Hintergrund, ein einfarbiger Verlauf
oder ein vergrößertes vorhandenes Sprite.

Sind Kaufzeilen oder Knopf auf dem Bild nicht sicher lesbar, wird **`menu.overlayAlpha`
erhöht** — nicht die Schriftgröße gesenkt und nicht das Bild ausgetauscht.

## Akzeptanzkriterien

1. Das Spiel startet im Menü, nicht im Run. Ein Tippen auf „SPIELEN" startet einen Run.
2. Nach Game Over führt ein Tippen zurück ins Menü; die Münzen des Runs sind vorher auf dem
   Konto gelandet und im Menü sichtbar.
3. Das Titelbild ist 390 × 844 px, liegt lokal im Bündel und zeigt kein Wort Text.
4. Die drei Kaufzeilen zeigen Stufe, Preis der nächsten Stufe und den Zustand des Knopfs
   richtig; bei zu wenig Münzen ist der Knopf gedämpft und wirkungslos.
5. Ein Kauf zieht genau den Preis ab, erhöht genau eine Stufe und ist **nach einem Neuladen
   der Seite noch da**.
6. Auf der letzten Stufe steht „MAX" und es lässt sich nichts mehr kaufen.
7. Ein Run nach dem Kauf startet mit den erhöhten Werten (Truppe, Schaden, Feuerrate).
8. Alle Texte und Knöpfe liegen innerhalb der Safe-Area und überlappen einander nicht.
9. Kein DOM-Element; alles sind Phaser-Objekte.
10. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 1 bis 9 prüft Claude am laufenden Spiel nach, Kriterium 5 über den Speicherstand
vor und nach einem Neuladen. Ob das Bild gefällt, entscheidet Thomas.
