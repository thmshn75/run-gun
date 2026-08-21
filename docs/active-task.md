# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E8b — Boss auf starke Läufe auslegen.**

Thomas-Entscheidung vom 2026-08-21, nachdem die Reißleine von E8 gezogen wurde: Die
Lebenspunkte des Bosses werden mit **aufgewerteter** Feuerrate und **aufgewertetem** Schaden
gerechnet, nicht mit den Basiswerten. E8 selbst (Phasen, Begleiter, Zeitdruck, getrennte
Unverwundbarkeit) ist abgenommen und wird **nicht** angefasst.

---

## Befund aus dem gespielten Bosskampf

Im Spiel gemessen (HUD während des Kampfs auf Level 1): **TEAM 22, RATE 5.2, DMG 1.5**. Die
Referenzrechnung in `src/systems/bossPlan.ts` nimmt dagegen `rateStart: 3` und
`damageStart: 1` an — also die Werte **ohne** Menü-Käufe und **ohne** Tore. Beide steigen im
Lauf aber erheblich. Ergebnis heute bei 1426 Lebenspunkten:

| Fall | Feuerkraft | Kampfdauer |
|---|---|---|
| starker Lauf (volle Menü-Käufe, gute Tore) | 185 DPS | 7,7 s |
| mittlerer Lauf (frischer Spielstand, nur Tore) | 81 DPS | 17,7 s |
| schwacher Lauf (Truppe 8, keine Aufwertung) | 24 DPS | 59,4 s |

## Verlangte Umsetzung

1. **Die Referenz-Feuerkraft modelliert künftig einen starken Lauf zum Bosszeitpunkt:** volle
   permanente Käufe aus `upgradesShop` **plus** die Aufwertung durch Tore während der
   Fahrtphase. Die drei Größen — Truppengröße, Feuerrate, Schaden — werden begründet gewählt
   und als Kommentar hergeleitet. Die gemessenen Werte oben sind der Anhaltspunkt für Level 1.

2. **Zielkampfdauer für diesen starken Fall: 20 Sekunden**, nicht 30. Begründung, die als
   Kommentar mit in `balance.ts` gehört: Bei 20 Sekunden für den starken Lauf braucht ein
   mittlerer Lauf rund 46 Sekunden. Das Vorrücken beginnt nach 36 Sekunden, der mittlere Lauf
   steht also etwa 10 Sekunden unter Druck und kann den Boss trotzdem noch besiegen. Bei 30
   Sekunden Ziel wären es 69 Sekunden und damit über 30 Sekunden unter Vorrück-Druck — das
   überlebt keine Truppe, und der erste Boss wäre mit einem frischen Spielstand unschaffbar.

3. **Feuerrate und Schaden der Referenz wachsen weiterhin mit dem Level**, wie heute über
   `damagePerLevel`, `ratePerLevel` und die zugehörigen Obergrenzen. Nur das Startniveau
   ändert sich.

4. **Die Obergrenze der Lebenspunkte** wird auf das neue Niveau angehoben, damit sie nicht
   schon auf mittleren Leveln greift und die Auslegung wieder aushebelt.

5. **Die gemeinsame Multiplikatorfunktion `getCrowdDamageMultiplier` aus
   `src/systems/crowdDamage.ts` bleibt der einzige Ort für diese Formel.** Beide Seiten nutzen
   sie weiterhin.

## Ausdrücklich nicht ändern

- Phasen, Begleiter, Zeitdruck, Vorrückgeschwindigkeit und die getrennten
  Unverwundbarkeitszeiten aus E8 bleiben unverändert.
- Der Truppen-Schadensbonus (`crowd.damagePerExtraFigure`, `crowd.damageMultiplierCap`) wird
  **nicht** angetastet. Thomas hat sich ausdrücklich gegen diesen Weg entschieden.
- Leveltabelle, Trupps, Tore, Waffen, Menü, Titelbildschirm und Speicherformat bleiben
  unverändert.

## Akzeptanzkriterien

1. Die Referenzrechnung nutzt Feuerrate und Schaden auf aufgewertetem Niveau; die Herleitung
   steht als Kommentar in `balance.ts`.
2. Ein Unit-Test weist für Level 1, 6, 12 und 30 nach: Der **starke** Fall liegt bei 18–24
   Sekunden.
3. Ein Unit-Test weist für dieselben Level nach: Der **mittlere** Fall bleibt unter 50
   Sekunden. Das ist die Sicherung dagegen, dass ein frischer Spielstand am ersten Boss
   hängenbleibt — sie ist wichtiger als jede andere Zahl in dieser Spec.
4. Die Obergrenze der Lebenspunkte greift auf keinem der geprüften Level.
5. Die Formel für den Truppen-Schadensbonus steht weiterhin nur an einer Stelle und wird von
   Spiel und Bossrechnung gemeinsam genutzt.
6. Phasen, Begleiter und Zeitdruck verhalten sich unverändert.
7. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

Kriterien 1 bis 5 und 7 prüfst du selbst über Tests und Diff. Kriterium 6 prüft Claude; ob der
Boss sich am Ende richtig anfühlt, entscheidet Thomas am iPhone.

## Implementation Summary

<!-- Von Codex auszufüllen -->

## Verification

<!-- Von Codex auszufüllen -->
