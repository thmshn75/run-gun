# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Korrekturen nach Thomas' iPhone-Test von Level 1.**

Drei Punkte aus dem Test vom 2026-08-21: Der Boss war zu schwer, die Begleiter kamen zu früh,
und die Waffen sollen aus den normalen Toren verschwinden.

---

# Teil 1 — Die angenommene Truppengröße beim Boss ist zu hoch

## Befund

`boss.referenceFirepower.teamAtBoss` steht auf **22** — für **alle** Kaufstände. Diese Zahl
stammt aus einem Testlauf mit **voll gekaufter** Starttruppe (7 Figuren). Mit einem frischen
Spielstand startet die Truppe bei 2 und erreicht beim Boss realistisch 6 bis 10 Figuren.

Damit greift der Truppen-Schadensbonus gar nicht (er beginnt erst über
`crowd.shootersPerSalvo` = 8), und die tatsächliche Feuerkraft liegt weit unter der
angenommenen:

| Truppe beim Kampfbeginn | Feuerkraft | Kampf gegen 1.421 HP |
|---|---|---|
| 6 | 18 DPS | **79 s** |
| 10 | 31 DPS | **46 s** |
| 22 (bisherige Annahme) | 71 DPS | 20 s |

Das Vorrücken beginnt nach 36 Sekunden — Thomas stand also die längste Zeit des Kampfs unter
Druck. Genau das hat er erlebt.

## Verlangte Korrektur

1. **Die angenommene Truppengröße beim Boss wird aus der gekauften Starttruppe abgeleitet**,
   nicht mehr fest gesetzt: Startgröße aus `upgradesShop.team` (`base + stufe * effectPerLevel`)
   mal einem **Wachstumsfaktor** aus `balance.ts`, gedeckelt bei `crowd.max`.
2. **Der Wachstumsfaktor beträgt 3** und wird als solcher kommentiert: gemessen wurde eine
   Starttruppe von 7, die beim Boss auf 22 angewachsen war. Das ist **ein** Messpunkt — der
   Kommentar muss das sagen, damit der Wert später nicht für gesichert gehalten wird.
3. **Die Zielkampfdauer von 20 Sekunden gilt weiterhin für jeden Kaufstand.** Mit dem
   abgeleiteten Wert ergibt das für einen frischen Stand deutlich weniger Boss-Lebenspunkte
   als heute — das ist der Zweck der Korrektur.
4. **Die Sperren aus E9 ziehen automatisch mit**, weil sie dieselbe Referenz nutzen. Ihre
   Zerstörungsdauer muss nach der Änderung weiterhin zwischen 1,5 und 2,5 Sekunden liegen;
   der bestehende Test muss das für alle geprüften Kaufstände weiterhin bestätigen.

# Teil 2 — Begleiter erst in späteren Leveln

## Befund

Thomas: „es sind während des Boss runs auch andere Zombies gekommen". Das ist die
Begleiter-Mechanik aus E8 — sie funktioniert, kommt aber ab Level 1 und traf mit dem zu harten
Boss zusammen. `docs/plan.md` sieht Begleiter ohnehin erst im Höhepunkt der Dramaturgie vor
(„11–12: alles zusammen, Boss ruft Begleiter"); die E8-Spec hat das versäumt einzuschränken.

## Verlangte Korrektur

1. **Die Begleiter-Obergrenze wird ein Feld der Leveltabelle**, nicht mehr ein globaler Wert.
   `0` bedeutet: keine Begleiter in diesem Level.
2. **Level 1 bis 4 bekommen keine Begleiter.** Ab Level 5 steigt die Zahl schrittweise bis zur
   bisherigen Obergrenze von 4 in den Leveln 11 und 12.
3. Die Mechanik selbst — Rückruf, Pool, Aufräumen beim Bosstod — bleibt unverändert.

# Teil 3 — Waffen verschwinden aus den normalen Toren

## Befund

Thomas: „die waffentore dann aus dem normalen lauf rausnehmen nur mehr seitlich". Heute ist
jedes vierte Torpaar ein Waffen-Tor (`gates.weaponGateEvery`). Künftig kommen Waffen nur noch
über die Sperren aus E9 und später über die seitlichen Torspuren aus E10.

## Verlangte Korrektur

1. **Waffen-Tore entfallen ersatzlos.** Alle Torpaare tragen künftig die Truppen-Rechnungen
   aus dem Abschnitt „Tor-Mathematik" in `docs/plan.md`. `gates.weaponGateEvery` und der
   zugehörige Zweig in `src/systems/gates.ts` werden entfernt, nicht nur abgeschaltet — ein
   toter Zweig wird beim nächsten Umbau versehentlich wiederbelebt.
2. **Die Waffensymbole `weapon-*-gate` bleiben erhalten**, weil die Sperren aus E9 sie
   verwenden.
3. **Sperren rücken von Level 7 auf Level 3 vor.** Sonst gäbe es bis Level 6 überhaupt keinen
   Weg mehr zu einer anderen Waffe, und drei der vier Waffentypen wären für den ganzen frühen
   Teil des Spiels unerreichbar. Level 1 und 2 bleiben bewusst ohne Waffenwechsel — das ist
   der Einstieg.

---

## Ausdrücklich nicht ändern

- Die Tor-Mathematik selbst (gemischte Operatoren, zustandsabhängige Paare, einheitliche
  Farbe, nie beide Seiten auf 0).
- Phasen, Vorrücken und die getrennten Unverwundbarkeitszeiten des Bosses.
- Der Truppen-Schadensbonus und die Preise der Aufwertungen.
- Leveltabelle im Übrigen, Trupps, Menü, Titelbildschirm, Speicherformat.

## Akzeptanzkriterien

1. Die angenommene Truppengröße beim Boss wird aus der gekauften Starttruppe berechnet; ein
   Unit-Test weist für die Kaufstände „nichts gekauft", „halb" und „voll" **unterschiedliche**
   Werte nach.
2. Die rechnerische Kampfdauer liegt für alle drei Kaufstände und die Level 1, 6, 12 und 30
   weiterhin zwischen 18 und 24 Sekunden.
3. Die Boss-Lebenspunkte auf Level 1 sind bei einem frischen Spielstand **deutlich niedriger**
   als die bisherigen 1.421; ein Test hält die Größenordnung fest.
4. Die Zerstörungsdauer der Sperren liegt weiterhin zwischen 1,5 und 2,5 Sekunden — für alle
   geprüften Level und Kaufstände.
5. In den Leveln 1 bis 4 ruft der Boss keine Begleiter; ab Level 5 steigt die Zahl bis 4.
   Unit-Test über die Leveltabelle.
6. `gates.weaponGateEvery` existiert nicht mehr, und `src/systems/gates.ts` enthält keinen
   Waffen-Zweig. Alle Torpaare sind Stat-Tore.
7. Sperren erscheinen ab Level 3 statt ab Level 7.
8. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

## Implementation Summary

- Boss-Referenztruppe wird aus der gekauften Starttruppe mit dem als Messwert kommentierten Wachstumsfaktor 3 abgeleitet; Boss- und Sperren-Plan nutzen dieselbe Berechnung.
- Die Leveltabelle trägt nun die Begleiterobergrenze: Level 1–4 = 0, danach schrittweise bis 4 in Level 11–12. Sperren starten ab Level 3.
- Normale Tore sind ausschließlich Stat-Tore; Waffen-Tor-Kadenz und -Auswahlzweig wurden entfernt. Waffen-Symbole für Sperren bleiben unverändert erhalten.
- Tests decken die drei Kaufstände, Bossdauer/-HP, Sperren-Dauer, Begleiterstaffelung, Sperrenstart und das Fehlen der Waffen-Tore ab.

## Verification

- `npm run check` erfolgreich.
- `npm test` erfolgreich: 10 Testdateien, 39 Tests.
- `npm run build` erfolgreich; einzig die bestehende, nicht blockierende Vite-Warnung zu einem JavaScript-Chunk über 500 kB wurde ausgegeben.
- `git diff --check` erfolgreich; Suche bestätigt: keine `teamAtBoss`-/`weaponGateEvery`-Verwendung in `src` oder `tests` und keine Waffenlogik in `src/systems/gates.ts`.

## Review-Ergebnis (Claude)

Alle acht Kriterien erfuellt.

- **Kriterium 1, 2, 3:** Die Referenztruppe kommt jetzt aus `startTeam * teamGrowthFactor`,
  gedeckelt bei `crowd.max`. Nachgerechnet fuer Level 1: nichts gekauft Start 2 -> Truppe 6 ->
  **360 HP** (vorher 1.421), halb ausgebaut Truppe 12 -> 1.797 HP, voll ausgebaut Truppe 21 ->
  7.106 HP. Alle drei ergeben 20 Sekunden.
- **Robustheitsprobe:** Faellt die Truppe schlechter aus als angenommen, bleibt es spielbar —
  bei Truppe 4 statt 6 dauert der Kampf 30 statt 118 Sekunden. Der Modellwert ist damit keine
  scharfe Kante mehr.
- **Kriterium 4:** Die Sperren nutzen dieselbe Ableitung und bleiben laut Test in der Spanne
  von 1,5 bis 2,5 Sekunden.
- **Kriterium 5:** `companionLimit` ist ein Feld der Leveltabelle: Level 1–4 null, dann 1, 1,
  2, 2, 3, 3, 4, 4. Unit-Test vorhanden.
- **Kriterium 6:** `src/systems/gates.ts` enthaelt keine Waffenlogik mehr; `weaponGateEvery`
  existiert nirgends in `src` oder `tests`. Neuer `tests/gates.test.ts` haelt das fest.
- **Kriterium 7:** Sperren ab Level 3, per Test geprueft.
- **Kriterium 8:** `npm run check`, `npm run build`, `npm test` selbst im Terminal
  ausgefuehrt, Exit 0, 10 Testdateien, 39 Tests.
