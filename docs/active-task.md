# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Aufwertungen im Menü deutlich teurer machen.**

Thomas-Entscheidung vom 2026-08-21: „die Käufe werden mit jeder Stufe teurer, generell müssen
sie teurer werden."

---

## Befund: Wie schnell ist heute alles gekauft?

Die Münzausbeute pro Lauf lässt sich aus der Leveltabelle herleiten (Gegnerzahl aus Dauer und
Spawnabstand, Münzwert je Gegnerart, dazu 25 Münzen je besiegtem Boss). Konservativ gerechnet,
also ohne die zusätzlichen Gegner aus Trupps:

| Lauf endet nach | Ausbeute |
|---|---|
| Level 3 | rund 260 Münzen |
| Level 5 | rund 505 Münzen |
| Level 8 | rund 1.070 Münzen |
| Level 12 | rund 2.180 Münzen |

Alle drei Aufwertungsreihen zusammen kosten heute **4.860 Münzen** (je Reihe 50, 120, 250,
450, 750). Fünf Läufe bis Level 8 reichen damit für den **kompletten** Ausbau, und die erste
Stufe ist nach einem einzigen Level bezahlt. Das ist der Grund für Thomas' Beobachtung.

## Verlangte Umsetzung

1. **Die Preisreihe wird höher und steiler.** Richtwert: Der volle Ausbau aller drei Reihen
   soll rund **20 gute Läufe** kosten statt fünf, also in der Größenordnung von 20.000 bis
   25.000 Münzen insgesamt. Die genauen Werte wählst du innerhalb dieses Rahmens.
2. **Der Abstand zwischen den Stufen wächst mit.** Jede Stufe kostet spürbar mehr als das
   Doppelte der vorherigen, damit die letzte Stufe ein echtes Ziel bleibt und nicht nebenbei
   abfällt.
3. **Die erste Stufe darf kein Sofortkauf sein.** Sie soll etwa zwei vollständige Level
   kosten, nicht eines — der erste Kauf ist damit eine kleine Entscheidung statt einer
   Formalie.
4. **Die Herleitung gehört als Kommentar an die Preisreihe in `balance.ts`**: Ausbeute je
   Lauf, Zielanzahl Läufe für den vollen Ausbau, und der Hinweis, dass die Ausbeute aus der
   Leveltabelle folgt und beim Ändern der Leveltabelle mit nachgezogen werden muss.
5. **Nur die Preise ändern sich, nicht die Wirkung.** `effectPerLevel`, `base` und `max` der
   drei Aufwertungen bleiben unverändert — sonst verschiebt sich die Boss-Skalierung aus E8c
   gleich wieder.

## Ausdrücklich nicht ändern

- Die Wirkung der Aufwertungen und die Zahl der Stufen.
- Die Münzwerte der Gegner (`enemy.types[].coinValue`) und die Bossbelohnung.
- Boss, Leveltabelle, Trupps, Tore, Waffen, Titelbildschirm, Speicherformat.
- Der Speicherstand behält sein Format; ein alter Stand mit bereits gekauften Stufen bleibt
  gültig und wird **nicht** rückwirkend verrechnet.

## Akzeptanzkriterien

1. Die Summe aller drei Aufwertungsreihen liegt zwischen 20.000 und 25.000 Münzen.
2. Jede Stufe kostet mehr als das Doppelte der vorherigen.
3. Die erste Stufe kostet mindestens 150 Münzen.
4. Ein Unit-Test prüft die Punkte 1 bis 3 direkt an `BALANCE.upgradesShop.prices`, damit eine
   spätere Änderung der Preise nicht unbemerkt hinter diese Entscheidung zurückfällt.
5. Wirkung, Grundwerte und Höchstwerte der Aufwertungen sind unverändert.
6. Ein Spielstand mit bereits gekauften Stufen lädt weiterhin fehlerfrei.
7. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.

## Implementation Summary

<!-- Von Codex auszufüllen -->

## Verification

<!-- Von Codex auszufüllen -->
