# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D5b-Nacharbeit 2 — Panzer fährt ganz durch, Haubitze langsamer, Steuerung schneller (Thomas 2026-09-30 16:27)

Thomas (iPhone): "Der Panzer stoppt kurz nachdem er in die Horde fährt und verschwindet dann,
er sollte aber komplett nach oben durchfahren, die Schneise ziehen (Zombies sichtlich
dezimieren) und dann oben verschwinden. Die Bewegung mit dem Finger funktioniert schon wieder
nicht ordentlich (mein Team reagiert zu langsam und lässt sich nicht mit einem Zug von links
nach rechts ziehen). Die 2 Schüsse der Haubitze sollen langsamer hintereinander stattfinden."

**Befunde Claude:**
- Panzer: Schneisenziel ist `min(Halt2, −y_s − 6)` → er fährt nur 6 m in die Horde; die
  Schneise wirkt 1 s × 40/s = 40 Treffer — zu wenig für eine sichtbare Gasse.
- Steuerung: Die Truppe folgt dem Finger mit höchstens `STEUERUNG.MAX_M_PRO_S = 8` m/s → ein
  Wisch über die volle Breite (6 m) braucht ≥ 0,75 s, der Finger ist nach ~0,2 s drüben — das
  wirkt träge. (Plan D3 hatte "höchstens 8 m/s"; Thomas' Rückmeldung ersetzt das.)

## Erlaubte Änderungen (abschließend)

`src/v3d/balance3d.ts` (`SPEZIAL.panzer`, `SPEZIAL.haubitze`, `STEUERUNG`), `src/v3d/lauf.ts`,
`src/v3d/steuerung.ts` (nur falls für S2 nötig), Tests `tests/v3dLauf.test.ts`,
`tests/v3dRechnung.test.ts`, `tests/v3dSteuerung.test.ts`. **Zuerst** `npm run bots3d` als
"Vorher" festhalten.

## Akzeptanzkriterien

### P1 Panzer fährt ganz durch
- Kern-Ablauf (Gesamtwirkung bleibt **160**): `fahrt 1,2 → feuer 0,75 s @ 40/s (30) → fahrt
  1,5 → feuer 0,75 s @ 40/s (30) → schneise 2,5 s @ 40/s (100)`.
- Schneise: fährt von Halt 2 **durch die ganze Horde** bis `z = −y_s − T_h − 4`
  (`T_h` = Tiefe der sichtbaren Horde beim Schneisenstart, aus der Aufstellung), linear über
  die Phase; Treffer-Löcher an der Panzerspitze (Radius 1,4 m) — die 100 Treffer werden
  **gleichmäßig über den Weg** verteilt (je zurückgelegtem Meter anteilig), damit eine
  durchgehende Gasse entsteht.
- **Abgang oben:** nach der Schneise fährt er 0,6 s weiter geradeaus und verschwindet dabei
  (Skalierung → 0), statt am Ort zu schrumpfen.
- Schüsse links/rechts wie bisher (je Feuerphase 2 Schüsse statt 3 wegen 0,75 s).

### P2 Haubitze langsamer
- Abstand der 2 Einschläge **2,0 s** (statt 1 s), Phasendauer 2,05 s; sonst unverändert
  (links, dann rechts, Ø 7 m, Abfahrt).

### S1 Steuerung direkter
- `STEUERUNG.MAX_M_PRO_S` 8 → **24** m/s (volle Breite in 0,25 s).
- Test: bei einem simulierten Wisch von x = −3 nach +3 in 0,2 s (Ziel springt) ist die Truppe
  nach 0,3 s bei ≥ 2,9.
- Plan-Hinweis (Claude trägt ein): D3 "höchstens 8 m/s" → 24 m/s.

### S2 Wisch reißt nicht ab (Prüfung)
- Test mit simulierten Ereignissen: `pointerdown` links, 10 `pointermove` in 200 ms bis
  ganz rechts (teils am `canvas`, teils am `window`), `pointerup` → `ziel` folgt jeder
  Bewegung, `aktiv` bleibt bis `pointerup` wahr. Schlägt das fehl, Ursache beheben und im
  Bericht nennen.

### Nachweise
- Bots vorher/nachher (Siegquote ±1/20, Ø-Dauer ±5 %), `npm test`, `tsc`, `build` grün.
- Claude prüft `?pruefung=1&einsatz=panzer|haubitze` im Browser und einen schnellen Wisch
  mit Touch-Ereignissen; Thomas iPhone.

## Implementation Summary

- Panzerablauf auf 30 + 30 + 100 Treffer umgestellt; Schneisenziel aus der sichtbaren Horde berechnet, Treffer entlang des Fahrwegs verteilt und Abgang über 0,6 s vorwärts animiert. Vier Schüsse links/rechts.
- Haubitzeneinschläge auf 2,0 s Abstand und 2,05 s Phase gesetzt; Steuerungslimit auf 24 m/s erhöht. Zehn Pointer-Bewegungen über Canvas/Fenster bleiben durchgehend aktiv.
- Bots vorher/nachher identisch in allen sechs Profilen. `npm run check` und `npm run build` grün; `npm test`: 580/581 grün. Ein alter Test in `tests/v3dFahrzeuge.test.ts` erwartet die alten Haubitzen- und Panzerzeiten. Diese Datei liegt außerhalb der abschließenden Freigabeliste; Freigabe zur Aktualisierung angefragt. Browser- und iPhone-Prüfung stehen bei Claude/Thomas.
