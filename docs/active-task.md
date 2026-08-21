# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Boss Phase 2 nach Level staffeln — die Fünfersalve macht Ausweichen und Treffen
gleichzeitig unmöglich (Bug, geometrisch belegt).**

Thomas' iPhone-Test vom 2026-08-21: „level 1 boss ist immer noch nicht schlagbar, wenn er eine
5er-Salve schiesst, muss man soviel ausweichen, dass man ihn nicht mehr treffen kann."

---

## Befund (nachgerechnet aus balance.ts und crowd.ts, nicht geschätzt)

Die Kampfdauer stimmt seit dem letzten Fix (Level 1: ~18 s). Das Problem ist **Phase 2**
(unter halber Boss-HP, also die zweite Kampfhälfte):

- Salvenband Phase 2: `burstSpreadPx 150` → Projektile fallen auf `bossX ± 75`.
- Truppen-Hülle: `player.png` ist 34 px breit, Hülle `34 × hullWidthFigures 2,4 = 81,6 px`,
  Halbbreite ≈ 41 px.
- **Ausweichen** erfordert `|crowdX − bossX| > 75 + 41 = 116 px`.
- **Treffen** erfordert (Schüsse gehen senkrecht nach oben, Startpunkte über die Hüllenbreite
  verteilt, Boss-Körper 118 px breit): `|crowdX − bossX| ≲ 59 + 41 = 100 px`.
- 116 > 100: **Es gibt keine Position, aus der man ausweicht und trifft.** Dazu ist die
  Salven-Flugzeit (714−300)/260 ≈ 1,6 s länger als das Feuerintervall 0,82 s — es sind immer
  zwei Salven in der Luft, es gibt also auch kein Zeitfenster zwischen den Salven.

Phase 1 (`spread 60`) hat dagegen ein Fenster von ~29 px (ausweichen ab 71, treffen bis 100) —
deshalb fühlt sich die erste Kampfhälfte fair an und die zweite unmöglich.

Auf hohen Leveln ist die unausweichbare Salve tolerierbar, weil große Truppen Treffer
wegstecken (Tank-Strategie). Auf Level 1 mit 3 Figuren ist sie ein Todesurteil.

## Auftrag

Phase 2 wird nach Level gestaffelt, analog zur bereits gestaffelten Kampfdauer:

1. Neue Konstanten in `BALANCE.boss.phaseTwo` (die bestehenden Endwerte bleiben als Deckel):
   - `burstSpreadPxAtLevelOne: 60`
   - `burstSpreadPxPerLevel: 9`
   (Deckel ist das vorhandene `burstSpreadPx: 150`.)
   - `burstCountAtLevelOne: 3`
   - `burstCountPerThreeLevels: 1`
   (Deckel ist das vorhandene `burstCount: 5`.)
2. In `src/systems/bossPlan.ts` eine exportierte Funktion `getPhaseTwoProfile(level)`, die
   `burstCount` und `burstSpreadPx` liefert:
   - `burstSpreadPx(level) = min(150, 60 + 9 × (level − 1))` → L1: 60, L3: 78, L4: 87, L7: 114, ab L11: 150.
   - `burstCount(level) = min(5, 3 + floor((level − 1) / 3))` → L1–3: 3, L4–6: 4, ab L7: 5.
3. `getBossPlan` legt das Ergebnis in `plan.phaseTwo` (übrige Felder aus `BALANCE.boss.phaseTwo`
   unverändert übernehmen: `fireIntervalMs`, `moveSpeed`, `tint`, `transitionFlashMs`).
   `src/systems/boss.ts` liest bereits `plan.phaseTwo` — dort ist **keine** Änderung nötig,
   das bitte verifizieren statt annehmen.
4. Phase 1 bleibt komplett unverändert.

## Geometrie-Test (der eigentliche Kern)

Ein neuer Test rechnet das Ausweich-und-Treffen-Fenster **aus den echten Werten** nach, nicht
aus den Zahlen dieser Spec:

- Hüllen-Halbbreite aus der `player.png`-Breite × `hullWidthFigures / 2` ableiten (die
  PNG-Breite darf im Test als 34 gelesen oder aus der Datei gemessen werden).
- Fenster(level) = (`bodyWidth / 2` + Hüllen-Halbbreite) − (`spread(level) / 2` + Hüllen-Halbbreite)
  = `bodyWidth / 2 − spread(level) / 2`.
- Anforderung: Fenster ≥ **20 px** für Level 1–3. L1: 59 − 30 = 29 px, L2: 59 − 34,5 = 24,5 px, L3: 59 − 39 = 20 px — alle drei erfüllt (L3 exakt an der Schwelle, deshalb Vergleich mit >=, nicht >). Der Test dokumentiert zusätzlich (als Kommentar), ab welchem Level
  das Fenster schließt (spread ≥ 118 ab Level 8, Fenster null ab ca. Level 8–9) und dass das die
  bewusste Tank-Schwelle ist.
- Zweiter Test: `getPhaseTwoProfile(1)` = {count 3, spread 60}, `getPhaseTwoProfile(12)` =
  {count 5, spread 150} (Deckel greift ab L11), Monotonie über Level 1–12 (nie fallend).

Bestehende Tests: `bossPlan.test.ts` prüft `plan.phaseTwo` bisher als direkte Referenz auf
`BALANCE.boss.phaseTwo` — falls ein Test darauf baut, auf das Profil umstellen. Der
Poolgrößen-Kommentar an `bossProjectiles: 24` (ceil(2,1 s / 0,82 s) × 5 = 15) bleibt korrekt,
weil der Worst Case (5er-Salve ab L7) unverändert existiert — Kommentar prüfen, nicht ändern,
außer er wäre jetzt falsch.

## Akzeptanzkriterien
1. `getPhaseTwoProfile(1)` liefert burstCount 3 und burstSpreadPx 60; `getPhaseTwoProfile(12)`
   liefert 5 und 150; alle Stützwerte stehen in `balance.ts`.
2. Geometrie-Test: Fenster ≥ 20 px für Level 1–3, hergeleitet aus `bodyWidth`, `spread` und
   der echten Figurbreite — keine der Zahlen im Test hart aus dieser Spec kopiert, außer der
   20-px-Schwelle selbst.
3. `boss.ts` bezieht Phase-2-Werte ausschließlich aus `plan.phaseTwo`; Phase 1 unverändert;
   `fireIntervalMs`, `moveSpeed`, `pressureDelayMs`, Kampfdauer-Staffelung: alles unverändert.
4. Alle bestehenden Tests grün, `npm run check`, `npm run build`, `npm test` sauber.
5. Keine neuen Abhängigkeiten, keine Laufzeit-Requests.

## Reißleine
Stellt sich beim Umsetzen heraus, dass die Schuss-Startpunkte NICHT über die Hüllenbreite
verteilt sind (z. B. alle aus der Mitte), gilt die Fenster-Formel dieser Spec nicht — dann die
tatsächliche Geometrie aus `crowd.ts`/`weapons.ts` in den Test übernehmen und `spreadAtLevelOne`
so wählen, dass das Fenster ≥ 20 px bleibt; die Abweichung im Abschlussbericht begründen.
**Kein zulässiger Ersatz** ist: die Kampfdauer weiter zu senken, Boss-HP zu ändern, das
Feuerintervall zu strecken oder den Geometrie-Test wegzulassen.

## Implementation Summary

- Phase 2 skaliert nun über `getPhaseTwoProfile(level)`: Level 1 beginnt mit 3 Projektilen auf
  60 px, Spread und Anzahl steigen nur bis zu den bestehenden Deckeln 150 px beziehungsweise 5.
- `getBossPlan` übernimmt das Profil, während `boss.ts` weiterhin ausschließlich
  `plan.phaseTwo` verwendet; Phase 1, Feuerintervall, Bewegung, Druckbeginn und Kampfdauer
  blieben unverändert.
- Die Tests prüfen die Deckel, die Monotonie und das Ausweich-/Trefferfenster bis Level 3 aus
  der gemessenen PNG-Breite von `player.png`, der realen Hüllenbreite und der Boss-Körperbreite.
