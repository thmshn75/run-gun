# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Ein einziges Bild neu: `enemy-heavy-g-move-6.png`.**

Block 3 ist bis auf dieses eine Bild fertig. `heavy-e` (Watscheln), `heavy-i`
(Schreiten) und die übrigen elf Bilder von `heavy-g` (Stampfen) sind abgenommen und
**dürfen nicht angefasst werden**.

### Was mit Bild 6 nicht stimmt

Es fällt farblich aus dem Satz: Die Farbverteilung stimmt nur zu **0,71** mit den anderen
elf Bildern überein, verlangt sind **0,80**. Alle übrigen Kriterien erfüllt es (Saum,
Geometrie, Deckkraft, Figurentreue).

Hintergrund, damit der Fehler nicht wiederkehrt: Die zuvor abgenommene Fassung dieses
Bildes ist beim Aufräumen verlorengegangen; was jetzt in `src/assets/` liegt, ist die
unbearbeitete Rohfassung. Sie braucht dieselbe Nachbearbeitung wie der Rest des Satzes.

## Was zu liefern ist

**Genau eine Datei:** `src/assets/enemy-heavy-g-move-6.png`, **84 × 104 px**.

Es ist Bild 6 von zwölf eines **STAMPFEN**-Zyklus: massiger Kerl mit gelbem Bauhelm,
nackter Oberkörper, Jeans, barfuß (Vorlage `src/assets/enemy-heavy-g.png`). Wuchtiger
Schritt mit vollem Gewicht, beim Aufsetzen sackt der Körper kurz in die Knie.

**Das Bild muss sich zwischen Bild 5 und Bild 7 einfügen.** Beide ansehen und die
Zwischenhaltung daraus ableiten — Farbstimmung, Beleuchtung und Körperhaltung müssen zu
ihnen passen, nicht nur zur Vorlage.

## Der Weg

1. Vorlage **und** die Nachbarbilder 5 und 7 als Referenz in die Bilderzeugung geben.
   Groß erzeugen, auf transparentem Grund, nie hochskalieren.
2. Auf 84 × 104 herunterrechnen.
3. Alpha hart schwellen: ≥ 128 wird 255, alles darunter 0.
4. Randpixel-Farbe aus dem nächstinneren Pixel nachziehen.
5. Farbstimmung an die elf anderen Bilder des Satzes angleichen — **das ist hier der
   entscheidende Schritt**, daran ist die Rohfassung gescheitert.

## Abnahme

```
python3 /private/tmp/claude-501/-Users-mcbooktehn-1-Projekte-Run-Gun/a01e2688-06ab-436b-af35-c43521826646/scratchpad/abnahme-check-heavy.py g
```

Muss **`ALLES BESTANDEN`** ausgeben (Exit 0). Der Wert, auf den es ankommt, steht in der
Satzzeile: **untereinander mindestens 0,80**.

**Kein Code ändern. Das Prüfskript nicht ändern. Kein anderes Bild anfassen.**

## Reißleine

**Drei Anläufe.** Danach das Bild in Ruhe lassen und im Abschlussbericht sagen, welcher
Wert nicht erreicht wurde.

## Abschlussbericht

Status auf `IMPL_DONE` setzen, vollständige Ausgabe des Prüfskripts, Zahl der Anläufe,
und per SHA-256 bestätigen, dass die übrigen 35 Bilder von Block 3 unverändert sind.

## Implementation Summary

Block 3 abgeschlossen: Alle drei schweren Gestalten haben ihre eigene Gangart.
`heavy-e` watschelt breitbeinig, `heavy-g` stampft mit gehobenem Knie, `heavy-i`
schreitet aufrecht mit nachschwingendem Mantel. Geprueft mit `abnahme-check-heavy.py`
(Grenzwerte aus Block 2 uebernommen, geometrische Grenzen an den drei Vorlagen
gemessen): alle drei Saetze ALLES BESTANDEN, zusaetzlich vergroessert neben den
Vorlagen angesehen. Block 1 und 2 per SHA-256 unveraendert. `npm run check` fehlerfrei,
33 Testdateien mit 346 Tests bestanden.

Zusammen mit Block 1 und 2 laufen jetzt **zehn verschiedene Gangarten** im Spiel.
Alle drei Saetze sind in `BootScene.ts` geladen und in `balance.ts` registriert, jeder
mit eigenem Bildtakt (Stampfen 0,8, Watscheln 0,6, Schreiten 0,5 Zyklen je Sekunde).

Zwei Dinge, die Zeit gekostet haben und in `docs/lessons.md` stehen:
- `heavy-g` und `heavy-i` scheiterten im ersten Durchgang an der Reissleine (32,7 %
  statt 35 % Bewegungsunterschied). Die Grenze wurde NICHT gesenkt; stattdessen kam der
  fachliche Hinweis dazu, woher die Auslenkung kommt (gehobenes Knie, Schrittlaenge).
- Drei bereits abgenommene Bilder wurden beim Entfernen vermeintlicher Streupixel
  ueberschrieben, ohne vorher zu sichern. Zwei liessen sich gezielt reparieren, eines
  musste Codex neu erzeugen.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
