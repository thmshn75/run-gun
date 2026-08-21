# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E8c — Boss-Lebenspunkte wachsen mit den gekauften Aufwertungen.**

Thomas-Entscheidung vom 2026-08-21. Ersetzt den Ansatz aus E8b, der auf eine feste
Lebenspunktzahl setzte. **Die Änderungen aus E8b sind noch nicht committet** — dieser Task
baut auf dem aktuellen Arbeitsstand auf und korrigiert ihn.

---

## Befund: Warum eine feste Zahl nicht funktioniert

Zwischen einem frischen und einem voll gekauften Spielstand liegt beim Schaden Faktor 3,5
(1 → 3,5) und bei der Feuerrate Faktor 1,5 (3 → 4,5), zusammen also **Faktor 5,25**. Eine
feste Lebenspunktzahl ist deshalb zwangsläufig für die eine oder die andere Seite falsch:

| Auslegung | frischer Spielstand | voll gekaufter Spielstand |
|---|---|---|
| auf stark (13.052 HP, Stand E8b) | 162 s — unbesiegbar | 20 s |
| auf mittel | 35 s | 6 s — zu leicht |

## Verlangte Umsetzung

1. **`getBossPlan` bekommt die gekauften Aufwertungsstufen als Parameter** und berechnet die
   Referenz-Feuerkraft daraus. Die Funktion bleibt **rein** und ohne Phaser-Abhängigkeit; die
   Stufen werden übergeben, **nicht** in der Funktion aus dem Speicher gelesen.

2. **Die Referenz-Feuerkraft setzt sich künftig so zusammen:**
   - **Schaden und Feuerrate** aus den tatsächlich gekauften Stufen, über `upgradesShop`
     (`base + stufe × effectPerLevel`), zuzüglich des bereits vorhandenen Zuwachses je Level.
   - **Truppengröße zum Bosszeitpunkt** als eigener Modellwert. Sie hängt fast nur von den
     Toren ab, kaum vom Startwert aus dem Menü: Im gemessenen Kampf wuchs eine Starttruppe
     von 7 auf **22**. Die Tore mischen multiplikative und additive Wirkung, kleine Truppen
     wachsen dadurch relativ schneller — deshalb wird **ein** Modellwert für alle
     Kaufstände angesetzt und als solcher kommentiert, nicht aus der Startgröße hochgerechnet.
   - Die Zahl der gleichzeitig feuernden Figuren bleibt auf `crowd.shootersPerSalvo` begrenzt;
     jede weitere Figur wirkt über `getCrowdDamageMultiplier` aus
     `src/systems/crowdDamage.ts` — weiterhin der **einzige** Ort dieser Formel.

3. **Zielkampfdauer 20 Sekunden — für jeden Kaufstand.** Das ist der Kern dieser Änderung:
   Ein frischer Spielstand trifft auf einen entsprechend schwächeren Boss.

4. **Die Aufwertungen bleiben spürbar.** Sie wirken unverändert gegen alle normalen Gegner und
   Trupps; nur der Boss zieht mit. Das ist die bewusst gewählte Nebenwirkung und gehört als
   Kommentar an die Formel — damit später niemand sie für einen Fehler hält und „korrigiert".

5. **`GameScene` übergibt die geladenen Stufen** an den Boss. Der Spielstand ändert sich
   während eines Laufs nicht, ein Lesen beim Levelstart genügt.

6. **Die Obergrenze der Lebenspunkte** wird auf das neue Niveau angepasst und darf auf keinem
   der geprüften Level und bei keinem Kaufstand greifen.

## Ausdrücklich nicht ändern

- Phasen, Begleiter, Zeitdruck und die getrennten Unverwundbarkeitszeiten aus E8.
- Der Truppen-Schadensbonus (`crowd.damagePerExtraFigure`, `crowd.damageMultiplierCap`).
- Preise und Wirkung der Aufwertungen im Menü.
- Leveltabelle, Trupps, Tore, Waffen, Menü, Titelbildschirm, Speicherformat.

## Akzeptanzkriterien

1. `getBossPlan` ist weiterhin eine reine Funktion ohne Phaser-Abhängigkeit und nimmt die
   Aufwertungsstufen als Parameter entgegen.
2. Ein Unit-Test weist über das **Kreuzprodukt** aus den Leveln 1, 6, 12 und 30 und den
   Kaufständen **„nichts gekauft"**, **„halb ausgebaut"** und **„voll ausgebaut"** nach, dass
   die rechnerische Kampfdauer überall zwischen 18 und 24 Sekunden liegt. Das ersetzt die
   bisherige Unterscheidung in starke und mittlere Läufe.
3. Kein Testfall umgeht die echten Werte aus `upgradesShop`: Schaden und Feuerrate der
   Kaufstände werden **aus `upgradesShop` abgeleitet**, nicht frei gewählt. Im letzten Anlauf
   rechnete der Test mit Feuerrate 6, obwohl im Menü höchstens 4,5 kaufbar sind — dadurch sah
   ein unspielbarer Boss im Test gesund aus.
4. Die Obergrenze der Lebenspunkte greift bei keiner geprüften Kombination.
5. Die Formel für den Truppen-Schadensbonus steht weiterhin nur in
   `src/systems/crowdDamage.ts` und wird von Spiel und Bossrechnung gemeinsam genutzt.
6. Phasen, Begleiter und Zeitdruck verhalten sich unverändert.
7. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 1 bis 5 und 7 prüfst du selbst. Kriterium 6 prüft Claude am laufenden Spiel; wie sich
der Boss anfühlt, entscheidet Thomas am iPhone.

## Implementation Summary

<!-- Von Codex auszufüllen -->

## Verification

<!-- Von Codex auszufüllen -->
