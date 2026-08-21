# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**E10 — Zwei- und dreispurige Tore.**

Letzter Feature-Punkt aus `docs/plan.md`. Heute steht immer genau ein Torpaar auf der Straße.
Künftig kommt ab Level 3 gelegentlich eine dritte Spur dazu, die eine andere Waffe anbietet.
Das Feld `reserved.gateLanes` in der Leveltabelle wartet seit E7 auf genau diese Wirkung.

Zwei Thomas-Entscheidungen vom 2026-08-21 sind bereits getroffen und stehen nicht mehr zur
Debatte:

1. **Das Rechen-Paar bleibt vollständig erhalten.** Die dritte Spur ist ein *Zusatz*, kein
   Ersatz für eine der beiden Rechen-Seiten. Der Planwortlaut „Mitte rechnet, Seiten bewaffnen"
   (`docs/plan.md`, Abschnitt „Mehrspurige Tore") hätte in diesen Leveln das Abwägen zwischen
   zwei Zahlen abgeschafft — das ist der Kern des Spiels und bleibt.
2. **Dreispurige Tore ab Level 3**, nicht erst ab Level 9. Grund: Sonst sieht Thomas die neue
   Mechanik erst nach rund zehn Minuten Spielzeit.

---

## Zielbild

Ein dreispuriges Tor sieht so aus — zwei Rechen-Spuren nebeneinander, eine Waffenspur außen:

```
┌─────────┬─────────┬─────────┐        ┌─────────┬─────────┬─────────┐
│   ×2    │   +7    │  LASER  │        │ RAKETE  │   /2    │  +40 %  │
└─────────┴─────────┴─────────┘        └─────────┴─────────┴─────────┘
   108px     108px     108px              108px     108px     108px
```

Auf welcher Seite die Waffenspur steht, wird je Tor neu ausgewürfelt. Die beiden Rechen-Spuren
stehen immer nebeneinander, nie durch die Waffenspur getrennt — sonst müsste der Blick beim
Vergleichen über ein drittes Tor springen.

Zweispuriges Tor = das heutige Bild, unverändert.

---

## Befund: die Straßenbreite lässt genau drei Spuren zu

Gerechnet mit den echten Werten aus `src/config/balance.ts` und `src/main.ts`, nicht geschätzt:

- Spielfeld 390 × 844 px; `road.horizonY = 150`, `road.topWidthRatio = 0.46`,
  `road.bottomWidthRatio = 1`.
- Der Anker steht bei `844 − player.anchorBottomOffset (130) = 714`.
- Ausgelöst wird ein Tor, wenn seine **Unterkante** den Anker passiert
  (`gates.ts`, `update()`), die Tormitte liegt dann bei `714 − gateHeight/2 (35) = 679`.
- `getRoadHalfWidth(390, 844, 679)`: `progress = (679 − 150) / 694 = 0,762`,
  halbe Breite `= (179,4 + 210,6 × 0,762) / 2 = 170,0` → **Straßenbreite 340 px** an der
  Entscheidungsstelle.

Daraus mit `gates.gapBetween = 8`:

| Spuren | Rechnung | Breite je Spur | Plan-Grenze 90 px |
|---|---|---|---|
| 2 | (340 − 8) / 2 | **166 px** | erfüllt |
| 3 | (340 − 16) / 3 | **108 px** | erfüllt |
| 4 | (340 − 24) / 4 | 79 px | **verletzt** |

**Vier Spuren sind damit rechnerisch ausgeschlossen**, nicht nur per Regel. Der Typ muss das
abbilden, damit die Grenze nicht später versehentlich überschritten wird.

---

## Umsetzung

### 1. Leveltabelle: `gateLanes` bekommt Wirkung

In `src/config/balance.ts`:

- Der Typ von `reserved.gateLanes` wechselt von `1 | 3` auf **`2 | 3`**. Die Zahl bedeutet ab
  jetzt eindeutig **Anzahl der Tore nebeneinander**. Die bisherige `1` war als „ein Torpaar"
  gemeint und ist mehrdeutig — sie verschwindet, es bleibt kein Altwert stehen.
- **Level 1 und 2: `gateLanes: 2`.** Einstieg ohne Waffenwechsel, wie in der Dramaturgie in
  `docs/plan.md` beschrieben.
- **Level 3 bis 12: `gateLanes: 3`.**
- Der Kommentar `// blockers/gateLanes reserve the later E9/E10 layout…` in der Leveltabelle
  ist danach falsch und wird entfernt.

Ab Level 13 greift wie gehabt die Design-Level-Zuordnung `((level − 1) mod 12) + 1`; Level 13
ist damit zweispurig, weil Level 1 es ist. Nichts daran ändern.

### 2. Nicht jedes Tor in einem Dreispur-Level ist dreispurig

Ein Waffenwechsel in jedem Tor würde die Waffenwahl entwerten — sie gilt bis Run-Ende und soll
eine Entscheidung bleiben, kein Dauerangebot. Deshalb ein neuer Wert in `balance.ts`:

```ts
gates: {
  // Jedes n-te Tor in einem Dreispur-Level trägt die Waffenspur, die übrigen bleiben
  // zweispurig. Level 3 (78 s Fahrt, erstes Tor nach 5 s, dann alle 9 s) hat 9 Tore;
  // bei 3 ergibt das 3 Waffenangebote pro Level, dazu ~3 aus den Sperren (Kadenz 21 s).
  // Das ist die erste Stellschraube, wenn der iPhone-Test „zu oft" sagt.
  weaponLaneEvery: 3,
  ...
}
```

Der Zähler läuft **pro Run über alle Tore**, nicht pro Level neu — sonst häufen sich die
Waffenangebote an jedem Levelanfang. Zweispurige Level zählen nicht mit: In Level 1 und 2 wird
der Zähler nicht erhöht, damit das erste Waffenangebot in Level 3 nicht sofort im ersten Tor
steht.

**Zusätzliche Bedingung:** Die Waffenspur entfällt für dieses Tor, wenn
`getWeaponRewardChoices(currentWeapon, level)` leer ist. Das Tor ist dann zweispurig. Kein
Ersatz-Tor, kein Platzhalter.

### 3. Woher die angebotene Waffe kommt

`src/systems/blockerWeaponChoices.ts` wird zu **`src/systems/weaponChoices.ts`** umbenannt, die
Funktion `getBlockerWeaponChoices` zu **`getWeaponRewardChoices`**. Sie wird ab jetzt von zwei
Systemen benutzt (Sperren und Tore); der alte Name behauptet etwas Falsches. Aufrufer in
`src/systems/spawner.ts` (`chooseBlockerWeapon`) und `src/scenes/GameScene.ts` mitziehen.

Die Funktion bleibt inhaltlich unverändert: sie schließt die aktuell getragene Waffe aus und
respektiert `weapon.<key>.minLevel`. Damit wird nie die eigene Waffe angeboten und nie eine, die
für das Level noch gesperrt ist.

Die Ziehung aus der Liste läuft über dieselbe `rng`, die `Gates` schon im Konstruktor bekommt —
kein zweiter Zufallsgenerator.

### 4. Darstellung der Waffenspur

- Bild: `weapon-<key>-gate` (existiert bereits, wird in `BootScene` geladen und von den Sperren
  benutzt). Es wird auf die Spurbreite skaliert wie die Rechen-Tore auch.
- Text: `WEAPON_LABELS[key]` aus `src/systems/weapons.ts`, also `SCHROT`, `LASER`, `RAKETE`,
  `MINIGUN`, `FLAMME`, `BLITZ`. Schriftgröße **26 px** statt der 34 px der Rechen-Tore, weil die
  Wörter länger sind als eine Zahl und bei 108 px Spurbreite sonst überstehen.
- **Farbe:** eine einzige, feste Torfarbe für *jede* Waffe, neu in `src/config/colors.ts`. Nicht
  pro Waffe verschieden. Sonst lernt man nach drei Runs „türkis = Laser" und muss nicht mehr
  hinschauen — genau das verbietet die Regel „einheitliche Torfarbe, keine Erklärtexte" aus
  `docs/plan.md`, Abschnitt „Tor-Mathematik".
- Die Hervorhebung der gerade angesteuerten Spur (`gates.highlightLighten`) gilt für alle drei
  Spuren gleich.
- Das Stat-Kürzel über dem Tor (`TEAM` / `DMG` / `RATE` / `SPD`) steht weiterhin **mittig über
  den beiden Rechen-Spuren**, nicht über der Bildmitte — sonst zeigt es bei einer linken
  Waffenspur auf das falsche Tor.

### 5. Auswahl der Spur

`isLeftSelected(anchorX, width)` teilt heute hart an der Bildschirmmitte (195 px) und kennt die
tatsächlichen Torgrenzen nicht. Das trägt bei drei Spuren nicht mehr.

Zwei neue **reine Funktionen** in `src/systems/gates.ts` (ohne Phaser-Import, damit direkt
testbar):

```ts
export interface GateLane { readonly centerX: number; readonly width: number }

// Liefert 2 oder 3 Spuren, gleich breit, mittig auf der Straße, getrennt durch gapPx.
export function getGateLanes(laneCount: 2 | 3, roadCenterX: number, roadWidth: number, gapPx: number): GateLane[]

// Liefert den Index der getroffenen Spur. Liegt anchorX außerhalb aller Spuren,
// gewinnt die nächstgelegene — der Anker kann per Drag neben die Straße geraten
// (Straße 340px breit bei 390px Feld, Drag-Rand nur player.dragClampMargin = 8px).
export function selectedLaneIndex(anchorX: number, lanes: readonly GateLane[]): number
```

`isLeftSelected` wird durch `selectedLaneIndex` **ersetzt und gelöscht**, nicht danebengestellt.
Begründung steht in `docs/lessons.md`: Ein toter Zweig wird beim nächsten Umbau versehentlich
wiederbelebt — genau deshalb wurden am 2026-08-21 die Waffentore ersatzlos entfernt statt
abgeschaltet. Der bestehende Test dazu in `tests/gates.test.ts` wird auf die neue Funktion
umgeschrieben, nicht gelöscht.

### 6. Pool

`pools.gatePairs: 2` heißt künftig **`pools.gateGroups: 2`**, weil eine Gruppe nicht mehr
zwingend ein Paar ist.

Jede Gruppe erzeugt im Konstruktor **fest drei Tor-Bilder und drei Texte** plus ein Stat-Kürzel,
auch wenn im aktuellen Level nur zwei sichtbar sind. Die dritte Spur wird bei zweispurigen Toren
per `setActive(false).setVisible(false)` weggeschaltet. **Kein `create()` oder `destroy()` zur
Laufzeit** — das ist die harte Pool-Regel aus `docs/plan.md` und gilt hier genauso.

Herleitung, dass zwei Gruppen weiter reichen: Ein Tor ist von `horizonY` (150) bis zum Anker
(714) unterwegs, das sind 564 px bei `scrollSpeed (180) + gates.extraSpeed (227) = 407 px/s`,
also **1,39 s**, plus `choiceFlashMs (250 ms)` = **1,64 s** belegt. Der Abstand zwischen zwei
Toren ist `gates.spawnIntervalMs = 9000 ms`. Eine Gruppe genügt rechnerisch; die zweite deckt
ein verzögertes Recycling. Objektzahl steigt von 2 × 5 = 10 auf 2 × 7 = 14.

### 7. Kollisions- und Zeichenlast

Die Tore laufen nicht über Arcade-Physik, sondern über den Y-Vergleich in `update()`. Die dritte
Spur erhöht die Last daher **nicht** über die Kollisionsprüfung. Die Regel aus der Übergabe
(„nie alle Pools in eine Physik-Gruppe legen") wird durch diesen Task nicht berührt und darf
nicht als Anlass genommen werden, an den Physik-Gruppen etwas zu ändern.

### 8. Zwei Projektil-Pools mit zu wenig Reserve (aus der Übergabe mitgenommen)

`docs/plan.md` verlangt Reserve auf den berechneten Spitzenbedarf. Zwei Pools liegen darunter:

| Waffe | Spitzenbedarf | heute | Reserve heute | neu | Reserve neu |
|---|---|---|---|---|---|
| Flammenwerfer | 66,2 | 72 | 9 % | **88** | 33 % |
| Schrotflinte | 112 | 128 | 14 % | **144** | 29 % |

Die Kommentare über den Werten in `pools.projectiles` sind entsprechend nachzuziehen. Das
kostet nichts: Seit `64fc795` prüft die Kollision nur noch gegen die **aktive** Waffe, inaktive
Pool-Objekte sind reiner Speicher.

---

## Ausdrücklich nicht ändern

- **`drawGatePair` und `drawGateOp`/`drawDirectionalOp` bleiben Zeile für Zeile unangetastet.**
  Die gesamte Tor-Mathematik — gemischte Operatoren, zustandsabhängige Ziehung, „nie beide
  Seiten auf 0", die Rückfallkette bei erschöpften Ziehversuchen — gilt bei drei Spuren
  unverändert für die zwei Rechen-Spuren. Die Waffenspur ist an dieser Ziehung nicht beteiligt.
- **Das Zeitfenster.** `gates.spawnIntervalMs`, `gates.firstSpawnDelayMs` und
  `gates.extraSpeed` bleiben, wie sie sind. Drei Angebote in derselben Zeit sind der Reiz, nicht
  der Fehler.
- Die Sperren aus E9 und ihre Waffenbelohnung. Sie bleiben die zweite Waffenquelle.
- Boss, Leveldauer, Gegnermischung, Trupps, Preise der Aufwertungen.
- Die Physik-Gruppen und der Kollisionsumfang aus `64fc795`.

---

## Akzeptanzkriterien

1. `reserved.gateLanes` hat den Typ `2 | 3`; Level 1 und 2 stehen auf `2`, Level 3 bis 12 auf
   `3`. Unit-Test über `getLevelPlan` für Level 1, 2, 3, 12, 13 und 25.
2. `getGateLanes` liefert bei `laneCount = 3` und der echten Straßenbreite an der
   Entscheidungsstelle (340 px, `gapPx = 8`) drei Spuren von je **mindestens 90 px**. Ein Test
   rechnet die Breite über `getRoadHalfWidth(390, 844, 679)` aus, statt 340 als Konstante
   einzusetzen — sonst bricht der Nachweis still, wenn jemand die Straßenform ändert.
3. `getGateLanes` ist für keinen Eingabewert mit mehr als drei Spuren aufrufbar (Typ) und die
   Spuren überlappen nicht, liegen mittig auf der Straße und füllen sie bis auf die Lücken aus.
4. `selectedLaneIndex` liefert für die Mitte jeder Spur deren Index, für einen Punkt in einer
   Lücke die nähere Spur, und für `anchorX` links bzw. rechts außerhalb der Straße die äußerste
   Spur. Test mit zwei und mit drei Spuren.
5. Bei drei Spuren stehen die beiden Rechen-Spuren immer **direkt nebeneinander**; die
   Waffenspur ist entweder ganz links oder ganz rechts. Im Test über mehrere Ziehungen
   nachweisen, dass beide Seiten vorkommen.
6. Die Waffenspur zeigt nie die aktuell getragene Waffe und nie eine Waffe, deren `minLevel`
   über dem Level liegt. Test über `getWeaponRewardChoices` für Level 1, 2, 3 und 12.
7. Ein Waffenangebot erscheint in Dreispur-Leveln in jedem `gates.weaponLaneEvery`-ten Tor; die
   Tore dazwischen sind zweispurig. In Level 1 und 2 erscheint keins und der Zähler bewegt sich
   nicht.
8. Durchfahren der Waffenspur wechselt die Waffe (`equipWeapon`), Durchfahren einer Rechen-Spur
   wendet die Rechnung an — beides wie bisher, keine Doppelwirkung.
9. `pools.gateGroups` existiert, `pools.gatePairs` nicht mehr. Im Review nachweisbar: kein
   `scene.add.*` und kein `destroy()` innerhalb von `update()`, `spawn()` oder `recycle()` in
   `src/systems/gates.ts`.
10. `pools.projectiles.flamethrower = 88` und `pools.projectiles.shotgun = 144`, Kommentare mit
    der neuen Reserve nachgezogen.
11. `isLeftSelected` existiert nicht mehr; `npm run check` findet keinen unbenutzten Export.
12. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch. Alle bestehenden
    Tests bleiben grün, insbesondere die zu `drawGatePair`.
13. **Nur nach Thomas' iPhone-Test erfüllbar:** Drei Spuren werden in der vorhandenen Zeit
    zuverlässig getroffen, und die Waffenangebote kommen nicht zu oft.

---

## Reißleine

**Werden die drei Spuren am iPhone unzuverlässig getroffen, bleibt es bei zwei Spuren** — dann
gehen alle Level auf `gateLanes: 2` zurück und die Waffen kommen weiterhin nur über die Sperren.

**Kein zulässiger Ersatz ist:**
- das Zeitfenster verlängern (`spawnIntervalMs`, `extraSpeed`, `horizonY`) — das entwertet die
  Tor-Mathematik, deren ganzer Reiz der Zeitdruck ist;
- die Tore über die Straßenbreite hinaus verbreitern;
- die Torfarbe nach gut/schlecht einfärben oder einen Erklärtext ergänzen;
- die Waffenspur an die Stelle einer Rechen-Spur setzen (das war die verworfene Variante).

**Kommen die Waffenangebote zu oft** (Thomas-Urteil), wird zuerst `gates.weaponLaneEvery`
erhöht (3 → 4 → 5) und **nicht** an der Sperren-Kadenz gedreht. Erst wenn auch bei 5 der Wechsel
beliebig wirkt, liegt es nicht an der Häufigkeit, sondern daran, dass ein Waffenwechsel zu
folgenlos ist — dann Design-Entscheidung mit Thomas statt weiter an der Zahl drehen.

**Zeitbudget:** Steht die Spur-Geometrie nach zwei Nacharbeitszyklen nicht (Spuren falsch
positioniert, Auswahl trifft die falsche Spur), ist nicht die Rechnung das Problem, sondern die
Vermischung von Layout und Auswahl in `Gates` — dann beide reinen Funktionen in eine eigene
Datei `src/systems/gateLanes.ts` ziehen und dort isoliert gegen die Tests bringen.
