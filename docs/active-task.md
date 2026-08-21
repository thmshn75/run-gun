# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Eigener Startbildschirm vor dem Menü.**

Thomas-Entscheidung vom 2026-08-21 nach dem iPhone-Test von E7: Das Titelbild soll beim Start
einmal ungestört zu sehen sein. Heute liegen Kaufzeilen, Bestenliste und drei Knöpfe direkt
darauf, sodass vom Stadtbild nur schmale Streifen sichtbar bleiben.

**E7 ist damit freigegeben.** Nach diesem Task geht es planmäßig mit E8 (Boss mit Phasen)
weiter.

---

## Verlangte Umsetzung

1. **Eine neue Szene `TitleScene`** zwischen `BootScene` und `MenuScene`. `BootScene` startet
   künftig `TitleScene` statt `MenuScene` (heute `src/scenes/BootScene.ts`, Zeile 49). Die
   Szene wird in `src/main.ts` in die Szenenliste aufgenommen.

2. **Inhalt: ausschließlich Titelbild, Titelschrift und ein Knopf START.** Keine Kaufzeilen,
   keine Bestenliste, kein Kontostand, kein ZURÜCKSETZEN. Wer diese Dinge sucht, findet sie
   nach dem Tippen im Menü — unverändert.

3. **Das Bild bleibt unangetastet hell.** Die Fläche über dem ganzen Bild (`menu.overlayAlpha`,
   heute 0.20) gilt **nicht** für diesen Bildschirm. Genau diese Abdunklung wäre der Grund,
   warum das Bild wieder nicht wirkt. Titelschrift und Knopf bleiben trotzdem lesbar, weil die
   Schrift bereits eine Kontur hat und der Knopf eine eigene Fläche mitbringt. Reicht das
   nicht, bekommt **nur der Titeltext** einen eigenen schmalen Hintergrund — nicht die ganze
   Fläche.

4. **Der Knopf wird von der unteren Safe-Area-Kante aus gesetzt, die Titelschrift von der
   oberen.** Das ist die Lehre aus dem Überlappungsfehler im Menü (Commit `57b3e9f`): gemischte
   Bezugspunkte fallen am Desktop nicht auf, am iPhone schon.

5. **Eine reine Funktion `computeTitleLayout(height, insets)`** ohne Phaser-Abhängigkeit
   liefert die senkrechte Anordnung, analog zu `computeMenuLayout` in
   `src/systems/menuLayout.ts`. Dazu Unit-Tests mit den Rändern `{ top: 0, bottom: 0 }` und
   `{ top: 47, bottom: 34 }`.

6. **START führt ins Menü.** Von dort führt SPIELEN wie bisher ins Spiel. **Nach Game Over
   geht es weiterhin direkt ins Menü**, nicht auf den Startbildschirm — sonst steht nach jedem
   Lauf ein zusätzlicher Tipp zwischen Thomas und dem nächsten Versuch.

7. **Kein DOM.** Das Spiel benutzt außer dem Canvas kein DOM-Element; das gilt auch für diese
   Szene.

## Ausdrücklich nicht ändern

- Die `MenuScene` bleibt inhaltlich unverändert, inklusive `menu.overlayAlpha` von 0.20.
- Die Leveltabelle und die Trupps aus E7 bleiben unberührt.
- Boss, Tore, Waffen, Speicherstand und Bestenliste bleiben unverändert.
- Das Titelbild als Datei wird nicht neu erzeugt und nicht bearbeitet.

## Akzeptanzkriterien

1. Nach dem Laden erscheint der Startbildschirm, nicht das Menü.
2. Auf dem Startbildschirm sind **nur** Titelschrift und der Knopf START zu sehen; das
   Titelbild ist großflächig sichtbar und nicht durch eine Fläche über dem ganzen Bild
   gedämpft.
3. START öffnet das Menü; von dort startet SPIELEN das Spiel wie bisher.
4. Nach Game Over erscheint weiterhin das Menü, nicht der Startbildschirm.
5. Mit den Rändern `{ top: 47, bottom: 34 }` und mit `{ top: 0, bottom: 0 }` überlappen Titel
   und Knopf einander nicht und liegen innerhalb der Safe-Area — nachgewiesen durch Unit-Tests
   von `computeTitleLayout`.
6. Während des gesamten Ablaufs gibt es kein DOM-Element außer dem Canvas.
7. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 5 und 7 prüfst du selbst; Kriterien 1 bis 4 und 6 prüft Claude am laufenden Spiel,
die endgültige Optik beurteilt Thomas am iPhone.

## Implementation Summary

<!-- Von Codex auszufüllen -->

## Verification

<!-- Von Codex auszufüllen -->
