# Active Task

## Status
`APPROVED`
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

- Preisreihe auf `200, 450, 1000, 2100, 4300` gesetzt: voller Ausbau aller drei
  Reihen kostet 24.150 Münzen, jede Stufe mehr als das Doppelte der vorherigen.
- Herleitung aus der Leveltabelle direkt an der Preisreihe dokumentiert.
- Regressionstest für Preisrahmen, Steigung, erste Stufe sowie unveränderte
  Aufwertungswerte ergänzt; bestehende Kauftests auf die neuen Preise angepasst.

## Verification

- `npm run check` — erfolgreich (TypeScript ohne Fehler).
- `npm run build` — erfolgreich (Vite-Produktions-Build und PWA-Service-Worker erstellt;
  nur die bestehende Chunk-Größen-Warnung).
- `npm test` — erfolgreich: 8 Testdateien, 31 Tests bestanden. Enthält weiterhin den
  Speichertest mit bereits gekauften Stufen und den neuen Preisreihen-Regressionstest.

## Review-Ergebnis (Claude)

Alle sieben Kriterien erfuellt. Preisreihe **200, 450, 1000, 2100, 4300**.

- **Kriterium 1:** Summe aller drei Reihen 24.150 Muenzen (vorher 4.860).
- **Kriterium 2:** Jede Stufe kostet mehr als das Doppelte der vorherigen (Faktoren 2,25 /
  2,22 / 2,10 / 2,05).
- **Kriterium 3:** Erste Stufe 200 Muenzen — etwa zwei vollstaendige Level statt eines.
- **Kriterium 4:** `tests/upgradesShop.test.ts` prueft Rahmen, Steigung und erste Stufe direkt
  an `BALANCE.upgradesShop.prices`.
- **Kriterium 5:** Der Diff an `balance.ts` enthaelt **keine** Aenderung an `base`, `max`,
  `effectPerLevel` oder `coinValue`; ein eigener Test haelt die Werte zusaetzlich fest.
- **Kriterium 6:** Der bestehende Speichertest mit gekauften Stufen laeuft unveraendert; die
  Anpassungen in `tests/save.test.ts` betreffen nur die erwarteten Preisbetraege.
- **Kriterium 7:** `npm run check`, `npm run build`, `npm test` selbst im Terminal ausgefuehrt,
  Exit 0, 8 Testdateien, 31 Tests.

**Wirkung:** Ein Lauf bis Level 8 bringt rund 1.070 Muenzen; der volle Ausbau kostet damit
etwa 23 gute Laeufe statt bisher fuenf.
