# Active Task

## Status
`APPROVED`
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

- `TitleScene` ergänzt und zwischen Boot- und Menüszene registriert. Boot startet nun den
  bildschirmfüllenden Startbildschirm; START führt in das unveränderte Menü.
- Titel und START-Knopf nutzen `computeTitleLayout(height, insets)` mit getrennten oberen bzw.
  unteren Safe-Area-Bezugspunkten. Die Szene enthält nur Phaser-Canvas-Objekte, ohne Abdunklung
  über dem Titelbild oder DOM-Elemente.
- Unit-Tests für beide verlangten Safe-Area-Fälle ergänzt. Der Game-Over-Rückweg bleibt direkt
  zum Menü unverändert.

## Verification

- `npm run check` erfolgreich.
- `npm run build` erfolgreich; nur die bestehende Vite-Hinweiswarnung zu einem großen
  JavaScript-Chunk, kein Build-Fehler.
- `npm test` erfolgreich: 6 Testdateien, 26 Tests bestanden, einschließlich der neuen
  `computeTitleLayout`-Tests für `{ top: 0, bottom: 0 }` und `{ top: 47, bottom: 34 }`.
- Laufzeitprüfung von Start, START und Game-Over sowie iPhone-Optik sind gemäß Akzeptanzkriterien
  für Claude bzw. Thomas vorgesehen und wurden hier nicht per Browser ausgeführt.

## Review-Ergebnis (Claude, am laufenden Spiel gemessen)

Alle sieben Kriterien erfuellt.

- **Kriterium 1, 2:** Nach dem Laden erscheint der Titelbildschirm. Sichtbar sind nur die
  Titelschrift und der Knopf START; das Titelbild liegt ohne Abdunklung ueber der ganzen
  Flaeche darunter.
- **Kriterium 3:** START oeffnet das Menue, das inhaltlich unveraendert ist (Kaufzeilen,
  Bestenliste, ZURUECKSETZEN, SPIELEN). Der Diff bestaetigt das: `MenuScene` wurde nicht
  angefasst, geaendert wurden nur `main.ts` (Szenenliste) und `BootScene.ts` (Startziel).
- **Kriterium 4:** `GameOverScene` startet unveraendert `MenuScene`; die Datei ist nicht im
  Diff.
- **Kriterium 5:** Unit-Tests fuer beide Randfaelle. Zusaetzlich im Browser mit erzwungenen
  iPhone-Raendern (oben 47, unten 34) nachgesehen: Titel unter der Notch, START ueber dem
  Home-Indikator, keine Ueberlappung, nichts ausserhalb der Safe-Area.
- **Kriterium 6:** Zahl der DOM-Elemente konstant 2 (Canvas plus Vite-Skript) auf dem
  Titelbildschirm und nach dem Wechsel ins Menue. Kein neues DOM-Element.
- **Kriterium 7:** `npm run check`, `npm run build`, `npm test` selbst im Terminal ausgefuehrt,
  Exit 0, 6 Testdateien, 26 Tests.

**Optischer Befund fuer Thomas:** Der Wunsch ist erfuellt, aber das Bild traegt die untere
Haelfte nicht. Motiv (Stadt, Truppe, Zombies) sitzt im oberen Drittel, darunter folgt leerer
dunkler Asphalt — das ist genau die ruhige Zone, die laut `docs/plan.md` bewusst fuer die
Menue-Knoepfe eingeplant wurde. Auf dem Titelbildschirm ohne Knoepfe steht sie jetzt leer.
Wer das voller haben will, braucht ein neues Bild mit Motiv ueber die volle Hoehe; das ist
eine eigene Entscheidung und kein Mangel dieser Umsetzung.
