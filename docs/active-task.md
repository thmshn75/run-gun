# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Boss-Lebenspunkte an der tatsächlichen Truppe bemessen, gedämpft.**

Thomas' iPhone-Test vom 2026-08-21: „die Bosse sind jetzt zu schwach".

Das ist der **dritte** Anlauf auf die Kampfdauer. Die Reißleine E8 in `docs/plan.md` greift damit:
„Liegt sie nach zwei Balance-Zyklen immer noch außerhalb von 20–40 Sekunden, ist nicht die Zahl
falsch, sondern die Schadensskalierung der Truppe — dann Design-Entscheidung mit Thomas statt
weiter an den Lebenspunkten drehen." Diese Entscheidung ist am 2026-08-21 getroffen worden und
steht unten. **An `teamGrowthFactor` wird nicht noch einmal gedreht — der Wert verschwindet.**

---

## Befund: die Referenz misst die falsche Größe

`getReferenceTeamAtBoss()` in `src/systems/bossPlan.ts` leitet die angenommene Truppenstärke
ausschließlich aus dem **Kaufstand** ab:

```ts
const startTeam = teamUpgrade.base + upgrades.team * teamUpgrade.effectPerLevel  // 2 … 7
return Math.min(BALANCE.crowd.max, startTeam * BALANCE.boss.referenceFirepower.teamGrowthFactor)
```

Die Truppe am Boss hängt aber kaum am Kaufstand, sondern fast nur daran, was die Tore im Run
ausgeworfen haben — sie wirken multiplikativ (`×2`, `×1.5`, `+50 %`). Ein frischer Spielstand
kann mit 4 Figuren oder mit 25 am Boss ankommen; die Referenz sagt in beiden Fällen 6.

Gerechnet mit den echten Werten aus `balance.ts` (`crowd.shootersPerSalvo = 8`,
`damagePerExtraFigure = 0.14`, `damageMultiplierCap = 4`, `crowd.max = 30`) ergibt der heutige
Stand diese Kampfdauern — Zielfenster laut Plan ist **20–40 s**:

| Kaufstand | angenommene Truppe | echte Truppe 6 | 12 | 20 | 30 |
|---|---|---|---|---|---|
| 0 (frisch) | 6 | 20,0 s | **9,6 s** | **5,6 s** | **3,8 s** |
| 5 (voll) | 21 | **75,2 s** | 36,2 s | 21,0 s | **14,1 s** |

Der frische Spielstand ist der Normalfall, und dort platzt der Boss. Genau das beschreibt Thomas.
Die vorige Fassung (`teamAtBoss: 22` fest) hatte denselben Fehler mit umgekehrtem Vorzeichen —
75 Sekunden bei kleiner Truppe. Beide Male wurde eine **Annahme** justiert, statt die vorhandene
**Messung** zu benutzen.

---

## Entscheidung (Thomas, 2026-08-21)

**Die Lebenspunkte richten sich nach der tatsächlichen Truppengröße beim Bossstart — gedämpft.**

Verworfen wurden: volle Mitskalierung (jeder Kampf exakt gleich lang, Stärkerwerden beim Boss
nicht spürbar) und feste Werte je Level (schwache Runs kommen gar nicht durch).

Gedämpft heißt: Eine stärkere Truppe verkürzt den Kampf spürbar, aber nicht proportional. Über
die ganze Spanne von der kleinsten bis zur maximalen Truppe halbiert sich die Kampfdauer — von
40 auf 20 Sekunden.

---

## Umsetzung

### 1. Die Truppen-Feuerkraft als eigene Funktion

Neu in `src/systems/bossPlan.ts`, exportiert und ohne Phaser:

```ts
// Feuerkraft-Beitrag einer Truppe: gedeckelte Schützenzahl mal Truppen-Schadensbonus.
// Das ist derselbe Term, mit dem die Truppe im Spiel tatsächlich Schaden macht.
export function getTeamFirepower(teamSize: number): number {
  return Math.min(teamSize, BALANCE.crowd.shootersPerSalvo) * getCrowdDamageMultiplier(teamSize)
}
```

Nicht neu erfinden — das ist exakt der Term, der in `getBossPlan` und `getBlockerPlan` heute
schon aus `activeShooters * getCrowdDamageMultiplier(...)` gebildet wird. Beide Stellen benutzen
danach diese eine Funktion.

### 2. Neue Werte in `balance.ts`

`boss.referenceFirepower.teamGrowthFactor` **entfällt ersatzlos** — kein toter Wert, der beim
nächsten Umbau wiederbelebt wird. `targetFightSec: 20` bleibt, bekommt aber eine neue Bedeutung
und deshalb einen neuen Namen. Neu:

```ts
referenceFirepower: {
  // Kampfdauer bei maximaler Truppe (crowd.max). Kleinere Truppen brauchen länger,
  // gedeckelt durch maxFightSec. Ersetzt targetFightSec und teamGrowthFactor.
  fightSecAtMaxTeam: 20,
  // Obergrenze, damit eine Notfall-Truppe von 2 Figuren keinen 60-Sekunden-Kampf erzeugt.
  maxFightSec: 40,
  // Dämpfung der Truppenstärke. 0 = Boss ignoriert die Truppe (heutiger Fehler,
  // Kampf platzt bei großer Truppe), 1 = Boss wächst voll mit (Kampf immer gleich lang).
  // 0.41 ergibt genau die gewollte Halbierung von 40 s auf 20 s über die volle Spanne.
  teamDampening: 0.41,
  damagePerLevel: 0.15,
  damageCap: 8,
  ratePerLevel: 0.1,
  rateCap: 8,
},
```

### 3. Die Berechnung in `getBossPlan`

`getBossPlan(level, upgrades)` bekommt einen dritten Parameter **`teamSize: number`** — die
tatsächliche Truppengröße, also `runStats.get('hp')`.

```
firepower      = getTeamFirepower(teamSize)
maxFirepower   = getTeamFirepower(BALANCE.crowd.max)          // = 32
fightSec       = min(maxFightSec, fightSecAtMaxTeam × (maxFirepower / firepower) ^ teamDampening)
referenceDps   = firepower × damage(level) × rate(level) × weapon.normal-Faktoren
maxHp          = min(hpCap, round(referenceDps × fightSec))
```

`damage(level)` und `rate(level)` bleiben unverändert, wie sie heute berechnet werden —
inklusive Kaufstand und Levelaufschlag. **Nur der Truppen-Anteil wird gedämpft**, der
Level-Anteil geht weiterhin voll in die Lebenspunkte ein. Sonst würden Bosse mit steigendem
Level immer schneller fallen.

`referenceFightSec` im zurückgegebenen Plan ist danach `maxHp / referenceDps` und muss dem
oben berechneten `fightSec` entsprechen (bis auf die Rundung von `maxHp`).

Damit ergeben sich diese Kampfdauern, für **jeden** Kaufstand und **jedes** Level gleich:

| Truppe beim Boss | 2 | 4 | 6 | 8 | 12 | 16 | 20 | 25 | 30 |
|---|---|---|---|---|---|---|---|---|---|
| Kampfdauer | 40,0 s | 40,0 s | 39,7 s | 35,3 s | 29,4 s | 25,9 s | 23,6 s | 21,4 s | 20,0 s |

Alle im Zielfenster 20–40 s. Die Halbierung über die Spanne ist die gewollte Belohnung fürs
Stärkerwerden.

### 4. Der Plan wird beim Bossstart eingefroren

`getBossPlan` wird **einmal** aufgerufen, wenn der Boss erscheint (`src/systems/boss.ts`), mit
der Truppengröße in genau diesem Moment. Verliert der Spieler während des Kampfes Figuren,
ändern sich die Lebenspunkte des Bosses **nicht** — sonst würde der Boss mitten im Kampf
schwächer werden und der Spieler würde für seine Verluste belohnt.

Der zweite Aufruf in `src/systems/spawner.ts` (Zeile 89) dient nur der Begleiter-Steuerung. Er
darf keinen zweiten, abweichenden Lebenspunkte-Wert erzeugen: Entweder er bekommt dieselbe
Truppengröße durchgereicht, oder die dort benötigten Felder (`companionLimit`,
`companionIntervalMs`) werden aus einer eigenen, truppenunabhängigen Funktion gezogen. Codex
wählt den Weg; zwei divergierende Lebenspunkte-Werte im Spiel sind ein Fehler.

### 5. Sperren ziehen mit — aber ungedämpft

`getBlockerPlan` in `src/systems/blockerPlan.ts` benutzt heute dieselbe kaufstandsbasierte
Referenz und hat deshalb denselben Fehler: Bei großer Truppe zerfällt eine Sperre sofort, bei
kleiner steht sie zu lange.

Auch `getBlockerPlan` bekommt die **tatsächliche** Truppengröße beim Spawn der Sperre
(`src/systems/blockers.ts`, Zeile 164). Aber **ohne Dämpfung**:

```
maxHp = round(getTeamFirepower(teamSize) × damage(level) × rate(level) × referenceDestroySec)
```

Damit hält eine Sperre immer die vorgesehenen 2 Sekunden — unabhängig von Truppe und
Kaufstand. Das ist gewollt: Die Sperre ist ein Hindernis mit fester Kosten-Nutzen-Rechnung
(„Waffe holen oder Gegner bekämpfen"), keine Belohnung für Stärke. Der Plan verlangt 1,5–2,5 s
für alle geprüften Fälle; ohne Dämpfung ist es exakt 2,0 s.

### 6. Waffen bleiben außen vor

Die Referenz rechnet weiterhin mit `weapon.normal`. Wer mit einer stärkeren Waffe am Boss
ankommt, legt ihn schneller — das ist die Belohnung für den Waffenwechsel und bleibt so. Nicht
in die Formel aufnehmen.

---

## Ausdrücklich nicht ändern

- Die Bossphasen, das Vorrücken, die getrennten Unverwundbarkeitszeiten, die Begleiter-Grenzen
  je Level (`companionLimit`, ab Level 5).
- `crowd.shootersPerSalvo`, `damagePerExtraFigure`, `damageMultiplierCap`, `crowd.max` — die
  Truppen-Mechanik selbst ist nicht das Problem und wird nicht angefasst.
- Die Tor-Mathematik und alles aus E10 (mehrspurige Tore), gerade committet als `c8e5607`.
- Die Preise der Aufwertungen und die Leveltabelle.

---

## Akzeptanzkriterien

1. `boss.referenceFirepower.teamGrowthFactor` und `targetFightSec` existieren nicht mehr;
   `fightSecAtMaxTeam`, `maxFightSec` und `teamDampening` sind da. `npm run check` findet keine
   verwaisten Verweise.
2. `getTeamFirepower` ist exportiert und wird von `getBossPlan` **und** `getBlockerPlan`
   benutzt — die Feuerkraft-Formel steht nur an einer Stelle.
3. Unit-Test über die Kampfdauer: Für Truppengrößen **2, 4, 6, 8, 12, 16, 20, 25, 30** liegt
   `plan.referenceFightSec` zwischen **20 und 40 Sekunden**, und zwar für die Level 1, 6 und 12
   **und** für frischen wie voll gekauften Spielstand. Kein Fall darf herausfallen.
4. Unit-Test über die Monotonie: Bei gleichem Level und Kaufstand sinkt `referenceFightSec`,
   wenn die Truppe wächst — nie umgekehrt. Das ist die Eigenschaft, die „Stärke lohnt sich"
   überhaupt erst herstellt.
5. Unit-Test über die Unabhängigkeit: Bei **gleicher Truppengröße** liefert Level 1 und Level 12
   dieselbe `referenceFightSec` (bis auf Rundung). Die Lebenspunkte selbst unterscheiden sich
   sehr wohl.
6. `getBlockerPlan` liefert für dieselben Truppengrößen, Level und Kaufstände eine
   Zerstörungsdauer zwischen **1,5 und 2,5 Sekunden** — bei ungedämpfter Rechnung also
   durchgehend 2,0 s.
7. Der Boss-Plan wird beim Erscheinen des Bosses einmal gebildet und danach nicht neu berechnet;
   im Review nachweisbar, dass `getBossPlan` nicht aus `update()` heraus aufgerufen wird.
8. Es existiert kein zweiter, abweichender `maxHp`-Wert für denselben Bosskampf.
9. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch. Die bestehenden
   Tests in `tests/bossPlan.test.ts` und `tests/blockers.test.ts` werden auf die neue Signatur
   umgestellt, nicht gelöscht.
10. **Nur nach Thomas' iPhone-Test erfüllbar:** Der Boss ist auf Level 1, 6 und 12 fordernd,
    aber nicht unfair — und er platzt nicht mehr sofort.

---

## Reißleine

**Das ist der dritte und letzte Balance-Anlauf auf die Kampfdauer.** Fühlt sich der Boss nach
diesem Zyklus immer noch falsch an, wird **nicht** an `teamDampening`, `fightSecAtMaxTeam` oder
`maxFightSec` weitergedreht.

**Kein zulässiger Ersatz ist:**
- eine neue Annahme über die Truppengröße einführen (das war zweimal der Fehler);
- die Lebenspunkte pauschal mit einem Faktor multiplizieren;
- die Truppen-Mechanik (`shootersPerSalvo`, `damagePerExtraFigure`) verändern, um die Rechnung
  passend zu machen — das trifft das ganze Spiel, nicht den Boss.

**Stattdessen** liegt das Problem dann nicht bei den Lebenspunkten, sondern beim
**Kampfverhalten**: Ein Boss, der 30 Sekunden dasteht und Salven abgibt, ist zäh statt fordernd.
Dann Design-Entscheidung mit Thomas über Phasen, Vorrücken und Begleiter — nicht über Zahlen.

**Zeitbudget:** Steht die Formel nach zwei Nacharbeitszyklen nicht (Kampfdauern außerhalb
20–40 s in den Tests), ist die Dämpfungsformel selbst der Fehler. Dann auf die einfachste Form
zurückfallen, die das Zielfenster hält: feste Kampfdauer von 30 Sekunden für alle
Truppengrößen (`teamDampening = 1`), und Thomas entscheidet danach, ob ihm das reicht.

## Implementation Summary

- Boss- und Sperrenpläne erhalten beim jeweiligen Spawn die tatsächliche Truppengröße und
  verwenden die gemeinsame Funktion `getTeamFirepower()`. Die Boss-Kampfdauer wird mit
  `teamDampening` zwischen 20 und 40 Sekunden berechnet; Sperren bleiben ungedämpft bei 2 Sekunden.
- Der Boss-Plan entsteht nur beim Aktivieren des Bosses. Die Begleiter-Grenze liest nun direkt die
  truppenunabhängige Levelvorgabe, statt einen zweiten Boss-Plan zu bilden.
- `npm run check`, `npm run build` und `npm test` sind erfolgreich; die Suite umfasst 57 Tests.
  Der iPhone-Spieltest für das subjektive Fairnessgefühl kann nur von Thomas ausgeführt werden.
