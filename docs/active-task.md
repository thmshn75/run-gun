# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Teil 1: Level-1-Boss ist tödlich — Kampfdauer nach Level staffeln.
Teil 2: Häuserschlucht statt Streusiedlung — kleine Häuser raus, Türme dichter an die Straße.**

Thomas' iPhone-Test vom 2026-08-21: „level 1 boss ist zu schwer" (auf Rückfrage: **er stirbt**,
nicht „es dauert zu lang"; gewählter Hebel: **nur Level 1 leichter**, spätere Level wie bisher)
sowie „nimm die kleinen Häuser komplett weg, die großen bleiben und näher zur Strasse und näher
zusammen wie eine Häuserschlucht in der Großstadt".

---

## Teil 1 — Kampfdauer nach Level staffeln

### Befund (gemessen, nicht geschätzt)
Alle Level-1-Kombinationen aus `getBossPlan` wurden durchgerechnet (4 Truppengrößen × 7 Waffen ×
3 Schaden/Rate-Stände). Ergebnis: **praktisch jede Kombination landet auf exakt 40,0 s** — dem
Wert `maxFightSec`. Der Clamp ist also nicht das Sicherheitsnetz für Ausnahmefälle, für das er
gehalten wurde, sondern der Normalfall auf Level 1.

Aus `balance.ts` nachgerechnet (`anchorY = 844 - player.anchorBottomOffset = 714`):
- Der Boss beginnt nach `pressureDelayMs / 1000 = 36 s` vorzurücken.
- Er steht bei `stopY = anchorY - advanceStopBeforeAnchorPx = 634`, erreicht nach **45,8 s**,
  und macht dort `advanceContactDamage = 2` an der Truppe.
- Der bestehende Test prüft gegen `48,2 s` (Anker selbst) — das ist die großzügigere Schwelle;
  gefährlich wird es real ab 45,8 s.

Der Puffer zwischen berechneter Kampfdauer (40 s) und Gefahr (45,8 s) beträgt **5,8 s**. Die
gesamte HP-Rechnung setzt voraus, dass **jeder** Schuss den Boss trifft. Daraus folgt: Die
Trefferquote muss `40 / 45,8 = 87 %` betragen, sonst stirbt die Truppe. Wer den Boss-Projektilen
seitlich ausweicht, erreicht 87 % nicht. Das ist die Ursache, nicht das Kampfverhalten.

### Auftrag
`maxFightSec` wird von einer Konstante zu einer **Funktion des Levels**:

```
maxFightSec(level) = min(40, 18 + 2 * (level - 1))
```

- Level 1: **18 s** — Trefferquote muss nur noch `18 / 45,8 = 39 %` betragen.
- Level 2: 20 s · Level 3: 22 s · Level 6: 28 s · Level 12: 40 s (wie bisher).

Umsetzung:
1. In `src/config/balance.ts` `referenceFirepower.maxFightSec: 40` ersetzen durch die beiden
   Stützwerte, aus denen die Gerade entsteht — `maxFightSecAtLevelOne: 18` und
   `maxFightSecPerLevel: 2`, plus den bestehenden Deckel als `maxFightSecCap: 40`. Keine
   Magic Numbers in der Funktion.
2. In `src/systems/bossPlan.ts` eine exportierte Funktion `getMaxFightSec(level: number): number`
   ergänzen und im Clamp statt `reference.maxFightSec` verwenden. `minFightSec: 15` bleibt.
3. `getMaxFightSec` muss für Level 1 mindestens `minFightSec` liefern — sonst wäre der Clamp
   widersprüchlich. 18 ≥ 15 ist erfüllt; ein Test sichert die Bedingung für alle 12 Level ab.

### Tests
Der bestehende Test `keeps the specified separate dampening values and pressure safety margin`
nagelt `reference.maxFightSec === 40` fest und muss nachgezogen werden. Er prüft künftig:
- `getMaxFightSec(1) === 18`, `getMaxFightSec(12) === 40`,
- für **jedes** Level 1…12: `minFightSec <= getMaxFightSec(level) < pressureContactSec`,
- zusätzlich neu: `getMaxFightSec(level)` liegt auch unter der **schärferen** Schwelle
  `pressureDelayMs / 1000 + (stopY - battleY) / advanceSpeed` (= 45,8 s). Diese Schwelle ist die
  real gefährliche, weil der Boss dort stehen bleibt und Kontaktschaden macht.

Der bestehende Test, der über alle Kombinationen `actualFightSec <= maxFightSec + 0.5` prüft,
wird auf `getMaxFightSec(level)` umgestellt und muss weiter über alle 8.064 Fälle grün sein.

### Bekannte, bewusst offen gelassene Konsequenz
Thomas hat „nur Level 1 leichter" gewählt. Damit bleibt für **hohe Level** (ab ca. Level 10) der
alte enge Puffer bestehen: 40 s Kampf gegen 45,8 s Gefahr, also weiterhin 87 % Trefferquote nötig.
Das ist bewusst so entschieden und **kein** Fehler, der in diesem Task zu beheben ist. Nicht
eigenmächtig zusätzlich die hohen Level entschärfen.

---

## Teil 2 — Häuserschlucht

### Kleine Häuser raus
`scenery-cottage` verschwindet vollständig: Eintrag aus `src/systems/sceneryKinds.ts`, Import und
`this.load.image`-Zeile aus `src/scenes/BootScene.ts`, und die Datei `src/assets/scenery-cottage.png`
löschen. Kein totes Asset im Bundle stehen lassen.

### Türme dominieren, Grün bleibt Beiwerk
Neue Gewichte in `sceneryKinds.ts` (Türme zusammen 82 %):

| Art | Gewicht |
|---|---|
| `scenery-tower-a` | 6 |
| `scenery-tower-b` | 6 |
| `scenery-tower-c` | 6 |
| `scenery-oak` | 1 |
| `scenery-conifer` | 1 |
| `scenery-bush` | 1 |
| `scenery-stone` | 1 |

Bäume, Busch und Stein bleiben als vereinzelte Straßenbepflanzung — sie sollen die Schlucht
auflockern, nicht prägen. `baseHeightPx` aller Arten bleibt unverändert.

### Näher an die Straße, näher zusammen
In `src/config/balance.ts`:
- `scenery.marginPx`: `12` → `4` (Fassaden stehen direkt an der Fahrbahnkante)
- `scenery.spreadPx`: `20` → `6` (fast eine Flucht statt Streuung)
- `scenery.spawnIntervalMs`: `650` → `400` (dichte Folge)

Seitliche Überlappung der Türme ist der gewünschte Effekt. Der bestehende Test
`keeps every sampled roadside object fully outside the road` muss trotzdem grün bleiben — bei
`marginPx: 4` wird es knapp, aber kein Objekt darf in die Fahrbahn ragen.

### Poolgröße erneut messen — mit Obergrenze
Engerer Abstand zur Straße bedeutet, dass Objekte **länger** im Bild bleiben (sie wandern später
seitlich hinaus), und das kürzere Spawn-Intervall erhöht die Zahl zusätzlich. Die vorhandene
`simulateSceneryPool` erneut über 120 s laufen lassen und `BALANCE.pools.scenery` auf
`maxActive + 4` setzen; der Kommentar an der Konstante wird auf den neuen Messwert aktualisiert.
Der Test, der heute `measured.maxActive` auf `16` und `pools.scenery` auf `20` festnagelt, wird
auf die neuen Messwerte nachgezogen.

**Obergrenze:** Ergibt die Messung mehr als **40** gleichzeitig aktive Objekte, wird
`spawnIntervalMs` in 50-ms-Schritten erhöht, bis der Messwert bei höchstens 40 liegt — und der
tatsächlich verwendete Wert im Kommentar begründet. Herleitung der 40: das Spiel lief mit 16
gleichzeitigen Kulissenobjekten flüssig; Kulissenobjekte sind einfache `Image`-Sprites ohne
Physik und ohne Kollision, der Faktor 2,5 ist die Reserve, die dieser Task ohne neue
Leistungsmessung ausschöpfen darf.

---

## Akzeptanzkriterien
1. `getMaxFightSec(1) === 18` und `getMaxFightSec(12) === 40`; die Konstanten 18, 2 und 40 stehen
   in `balance.ts`, nicht in der Funktion.
2. Für alle Level 1…12 gilt `minFightSec <= getMaxFightSec(level) < 45,8 s` (die stopY-Schwelle),
   per Test abgesichert.
3. Der Kombinationstest über alle 8.064 Fälle nutzt `getMaxFightSec(level)` und ist grün.
4. `BALANCE.boss.pressureDelayMs`, `advanceSpeed`, `battleY` und `advanceStopBeforeAnchorPx` sind
   **unverändert** — dieser Task dreht nur an der Kampfdauer.
5. `scenery-cottage` existiert nirgends mehr: nicht in `sceneryKinds.ts`, nicht in `BootScene.ts`,
   und die PNG-Datei ist gelöscht.
6. Türme haben Gewicht 6, die vier Naturarten je 1; ein Test belegt einen Turmanteil zwischen
   78 % und 86 % über 2.000 Ziehungen.
7. `marginPx: 4`, `spreadPx: 6`, `spawnIntervalMs` wie gemessen (Start 400, ggf. erhöht).
8. `BALANCE.pools.scenery` stammt aus der erneuten Simulation, der Messwert liegt bei höchstens 40,
   und die Herleitung steht als Kommentar an der Konstante.
9. Der Test `keeps every sampled roadside object fully outside the road` ist mit `marginPx: 4` grün.
10. `npm run check`, `npm run build` und `npm test` laufen sauber durch.
11. Keine neuen Laufzeit-Requests, keine neuen Abhängigkeiten.

## Reißleine
Wenn die Poolsimulation auch nach dreimaligem Erhöhen von `spawnIntervalMs` über 40 gleichzeitigen
Objekten bleibt, ist die Annahme über den Zusammenhang von Abstand und Lebensdauer falsch:
dann `marginPx` und `spreadPx` auf den alten Werten belassen, nur die Gewichte und das Entfernen
des Cottage abliefern, und im Abschlussbericht die gemessene Kurve nennen.
**Kein zulässiger Ersatz** ist: den Pool über 44 hinaus wachsen zu lassen, die Poolgröße zu
schätzen, oder Objekte im Hot Path zu erzeugen statt vorzuhalten.

Für Teil 1 gilt: Wenn die Umstellung auf `getMaxFightSec` den 8.064-Fälle-Test nicht grün bekommt,
**nicht** den Test aufweichen und **nicht** `minFightSec` senken — stattdessen melden, welche
Kombination die Grenze reißt und mit welchem Wert.
