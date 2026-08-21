# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Waffe in die Boss-Rechnung aufnehmen, Reichweiten von Schrot und Flamme erhöhen,
Levelanzeige ins HUD.**

Thomas' iPhone-Test vom 2026-08-21: „Level 1 Boss mit Laser nicht besiegbar" und „das Level soll
auch im HUD in der Mitte stehen".

**Das ist kein weiterer Balance-Anlauf auf die Kampfdauer.** Die Reißleine aus dem letzten Task
verbietet, an `teamDampening`, `fightSecAtMaxTeam` oder `maxFightSec` zu drehen — daran wird
auch nichts gedreht. Hier fehlt eine **Größe in der Formel**: Die Boss-Lebenspunkte werden
immer mit `weapon.normal` gerechnet, egal welche Waffe der Spieler trägt. Das ist ein
Strukturfehler derselben Art wie die geratene Truppengröße, nur bei der zweiten Variablen.

---

# Teil 1 — Die Waffe fehlt in der Rechnung

## Befund

`getBossPlan` und `getBlockerPlan` multiplizieren fest mit
`BALANCE.weapon.normal.damageFactor` und `BALANCE.weapon.normal.bulletsPerShot` und rechnen die
Schützenzahl über `crowd.shootersPerSalvo` (8). Die getragene Waffe kommt nicht vor. Tatsächlich
liegen die Waffen um den **Faktor 18** auseinander — gerechnet als
`shootersPerSalvo × rateFactor × damageFactor × bulletsPerShot`, normiert auf `normal`:

| Waffe | Schützen | Feuerkraft ggü. normal | Bosskampf dauert heute |
|---|---|---|---|
| Schrot | 8 | 4,200 | 0,24× |
| Flamme | 3 | 1,148 | 0,87× |
| Normal | 8 | 1,000 | 1,00× |
| **Laser** | 8 | **0,560** | **1,79×** |
| Kettenblitz | 6 | 0,551 | 1,81× |
| Rakete | 3 | 0,234 | 4,27× |
| Minigun | 3 | 0,231 | 4,33× |

Die Level-1-Auslegung ist 40 s (kleine Truppe). Mit Laser werden daraus **71 s**. Der Boss
beginnt nach `boss.pressureDelayMs` (36 s) vorzurücken und steht nach weiteren
`(634 − 300) / advanceSpeed (34) = 9,8 s`, also ab **Sekunde 45,8**, auf dem Spieler und macht
Dauerschaden. Ein 71-Sekunden-Kampf ist damit nicht zu gewinnen. Genau das beschreibt Thomas.
Mit Rakete oder Minigun wären es 171 s.

Splash- und Kettenschaden sind bewusst **nicht** in der Tabelle: Gegen ein Einzelziel bringt
`splashRadiusPx` keinen Zusatzschaden, und `chainCount` findet kein zweites Ziel.

## Entscheidung: Truppe und Waffe getrennt dämpfen

Eine gemeinsame Dämpfung funktioniert nicht — nachgerechnet: Truppe (Faktor 16) und Waffe
(Faktor 18) ergeben zusammen Faktor 75, und ein einzelner Exponent, der das ins Zielfenster
bringt, macht die Truppenstärke unspürbar. Das widerspräche Thomas' Entscheidung vom selben Tag.

Deshalb zwei getrennte Exponenten, und zwar aus einem inhaltlichen Grund:

- **Die Truppe ist verdient** — sie wächst durch gute Torentscheidungen im Run. Sie bleibt bei
  `teamDampening = 0.41`, also deutlich spürbar. **Unverändert.**
- **Die Waffe ist Zufall** — sie fällt aus einem Tor oder hinter einer Sperre. Sie darf den Boss
  nicht unschaffbar machen, soll aber nicht völlig folgenlos sein. Neu:
  **`weaponDampening = 0.8`**, also zu 80 % ausgeglichen.

## Umsetzung

### 1.1 Zwei Kennzahlen statt einer

In `src/systems/bossPlan.ts`. `getTeamFirepower` bleibt **unverändert** — sie ist die
Truppen-Kennzahl und wird weiter für die Truppen-Dämpfung benutzt. Neu dazu:

```ts
// Feuerkraft der Waffe, normiert auf die Normalwaffe. Normal = 1.0, Schrot = 4.2,
// Minigun = 0.231. Splash und Kette fehlen bewusst: gegen ein Einzelziel wirken sie nicht.
export function getWeaponFirepower(weapon: WeaponKey): number {
  const config = BALANCE.weapon[weapon]
  return (config.shootersPerSalvo / BALANCE.crowd.shootersPerSalvo)
    * config.rateFactor * config.damageFactor * config.bulletsPerShot
}

// Der tatsächliche Schadensausstoß, mit dem der Spieler wirklich schießt.
// Hier zählt die echte Schützenzahl der Waffe, nicht die der Truppe.
export function getCombatFirepower(teamSize: number, weapon: WeaponKey): number {
  const config = BALANCE.weapon[weapon]
  return Math.min(teamSize, config.shootersPerSalvo)
    * getCrowdDamageMultiplier(teamSize)
    * config.rateFactor * config.damageFactor * config.bulletsPerShot
}
```

`getWeaponFirepower` steuert **nur die Dämpfung**, `getCombatFirepower` liefert den **echten
DPS**. Die beiden sind nicht dasselbe: Bei einer Truppe unter der Schützenzahl der Waffe
(`min(2, 3)` bei der Rakete) weicht der echte Ausstoß vom normierten Verhältnis ab. Wer beide
zusammenlegt, bekommt bei kleinen Truppen falsche Lebenspunkte.

### 1.2 Neuer Wert in `balance.ts`

```ts
// Ausgleich der Waffenstärke in den Boss-Lebenspunkten. 0 = Waffe wird ignoriert
// (der Fehler, an dem Level 1 mit Laser unschaffbar war), 1 = voll ausgeglichen,
// jede Waffe legt den Boss gleich schnell. 0.8 lässt die Waffe spürbar, ohne dass eine
// schwache Waffe den Kampf über den Zeitdruck hinaus zieht.
weaponDampening: 0.8,
```

`teamDampening`, `fightSecAtMaxTeam` und `maxFightSec` bleiben **unangetastet** (0.41 / 20 / 40).

### 1.3 Die Formel in `getBossPlan`

`getBossPlan(level, upgrades, teamSize)` bekommt einen vierten Parameter **`weapon: WeaponKey`**.

```
referenceDps = getCombatFirepower(teamSize, weapon) × damage(level) × rate(level)
fightSec     = min(maxFightSec,
                   fightSecAtMaxTeam
                   × (getTeamFirepower(crowd.max) / getTeamFirepower(teamSize)) ^ teamDampening
                   × (1 / getWeaponFirepower(weapon)) ^ (1 − weaponDampening))
maxHp        = min(hpCap, round(referenceDps × fightSec))
```

Der Waffen-Term ist `1` für die Normalwaffe — `fightSecAtMaxTeam = 20` behält damit seine
Bedeutung: 20 Sekunden bei maximaler Truppe **und Normalwaffe**. Der Kommentar an dem Wert ist
entsprechend zu ergänzen.

Nachgerechnet ergibt das (Ausschnitt, alle 49 Kombinationen liegen zwischen 15 und 40 s):

| Truppe | Normal | Schrot | Laser | Rakete | Minigun | Flamme | Blitz |
|---|---|---|---|---|---|---|---|
| 2 | 40 s | 40 s | 40 s | 40 s | 40 s | 40 s | 40 s |
| 6 | 40 s | 30 s | 40 s | 40 s | 40 s | 39 s | 40 s |
| 12 | 29 s | 22 s | 33 s | 39 s | 39 s | 29 s | 33 s |
| 20 | 24 s | 18 s | 26 s | 32 s | 32 s | 23 s | 27 s |
| 30 | 20 s | 15 s | 22 s | 27 s | 27 s | 19 s | 23 s |

**Kein Fall überschreitet 40 s**, und der Boss wird erst ab Sekunde 45,8 gefährlich. Die
4 Sekunden Puffer sind knapp gewollt — so wirkt der Zeitdruck aus E8 spürbar, ohne zu töten.

**Diese Kopplung ist zu dokumentieren:** `maxFightSec` (40) muss unter
`pressureDelayMs / 1000 + (battleY-Weg / advanceSpeed)` (45,8) bleiben. Wer künftig
`pressureDelayMs`, `advanceSpeed`, `battleY` oder `advanceStopBeforeAnchorPx` ändert, muss
`maxFightSec` nachziehen. Als Kommentar an `maxFightSec` schreiben.

### 1.4 Aufrufer

`src/scenes/GameScene.ts` Zeile 610 reicht die getragene Waffe mit durch
(`this.weapons.getWeapon()`), analog zur Truppengröße. Die Waffe kann sich während des
Bosskampfs nicht ändern — Tore und Sperren laufen in der Bossphase nicht —, der Plan bleibt
also korrekt eingefroren.

### 1.5 Sperren ziehen mit, weiterhin ungedämpft

`getBlockerPlan` hat denselben Fehler: Mit Laser hält eine Sperre 3,6 s statt der vorgesehenen
2,0 s, mit Minigun 8,7 s. Sie bekommt ebenfalls die Waffe und benutzt `getCombatFirepower` —
**ohne jede Dämpfung**, damit die Zerstörungsdauer für jede Waffe konstant 2,0 s bleibt. Die
Sperre ist ein Hindernis mit fester Kosten-Nutzen-Rechnung, keine Belohnung.

---

# Teil 2 — Schrot und Flamme erreichen den Boss nicht

## Befund

Der Boss steht bei `boss.battleY = 300`, der Anker bei `844 − 130 = 714`. Abstand: **414 px**.
`rangePx` recycelt Projektile, sobald sie diese Strecke zurückgelegt haben
(`src/systems/weapons.ts`, Zeile 136). Schrot hat 280 px, Flamme 190 px — **beide treffen den
Boss die ersten 36 Sekunden überhaupt nicht**, bis er vorgerückt ist.

Ohne Behebung würde Teil 1 die Lage sogar verschlimmern: Die Schrotflinte gilt dort als
stärkste Waffe und bekäme den zähesten Boss — den sie nicht trifft.

## Entscheidung (Thomas, 2026-08-21)

**Die Reichweiten werden erhöht, der Boss bleibt, wo er ist.** Verworfen wurden: Boss näher
stellen (weniger Ausweichzeit) und ein Mittelweg. Thomas ist bekannt und akzeptiert, dass beide
Waffen dadurch auch gegen normale Gegner weiter reichen und ihren Nahkampf-Charakter verlieren.

- `weapon.shotgun.rangePx`: 280 → **430**
- `weapon.flamethrower.rangePx`: 190 → **430**

430 statt 414, damit ein Projektil, das leicht schräg fliegt (Schrot fächert 34°, Flamme 52°),
den Boss noch erreicht.

## Folge: beide Projektil-Pools reichen nicht mehr

Längere Reichweite heißt längere Flugzeit heißt mehr Projektile gleichzeitig im Bild. Neu
gerechnet bei `shotsPerSec`-Cap 8:

| Waffe | Salven/s | Flugzeit neu | Spitzenbedarf | Pool heute | Pool neu |
|---|---|---|---|---|---|
| Schrot | 3,2 | 430/640 = 0,672 s | 120,4 | 144 | **168** (39 % Reserve) |
| Flamme | 14,4 | 430/620 = 0,694 s | 149,8 | 88 | **200** (33 % Reserve) |

Die Kommentare über den Werten in `pools.projectiles` sind mit der neuen Rechnung zu ersetzen.

## Das muss gemessen werden, nicht angenommen

**150 gleichzeitig aktive Flammen-Projektile sind der höchste Wert, den dieses Spiel je hatte** —
bisheriges Maximum waren 112 (Schrot). Genau in diesem Bereich lag am 2026-08-21 das Ruckeln.
Seit `64fc795` prüft die Kollision zwar nur noch gegen die aktive Waffe, aber 150 Projektile
gegen bis zu 88 Gegner sind trotzdem die dichteste Last im Spiel.

Vor der Fertigmeldung ist eine Messung Pflicht, nach dem Verfahren aus `docs/UEBERGABE.md`:
Playwright mit CDP, `Emulation.setCPUThrottlingRate {rate: 8}`, Frame-Zeiten über
`requestAnimationFrame` sammeln, **mit Flammenwerfer bei voller Truppe in einem späten Level**.
Screenshot als Gegenprobe, dass wirklich das Spiel lief und nicht das Menü. Gemessene
Frame-Zeit in den Abschlussbericht.

---

# Teil 3 — Levelanzeige im HUD

## Umsetzung

Das HUD-Panel hat in Zeile 1 links die Truppengröße (`hp`, Origin links) und rechts die Münzen
(Origin rechts). **Die Mitte ist frei** — dorthin kommt die Levelanzeige:

- Position `panelX + panelW / 2`, `rowOneY`, Origin `(0.5, 0)`.
- Stil: `primaryHudStyle` wie Truppe und Münzen, damit die Zeile einheitlich wirkt.
- Text: `LEVEL <n>`, wobei `<n>` die tatsächliche Levelnummer ist (`currentLevel`), nicht die
  Design-Levelnummer aus der Zwölfer-Schleife. Ab Level 13 steht dort also 13, nicht 1.
- Farbe: eine eigene, ruhige HUD-Farbe aus `src/config/colors.ts`. **Nicht** eine der
  Stat-Farben wiederverwenden — die stehen im HUD für Truppe, Schaden, Feuerrate und Tempo und
  bekämen sonst eine zweite Bedeutung.
- Wird bei jedem Levelwechsel mit aktualisiert (`updateHud()`), wie die anderen Felder.
- Das bestehende `levelOverlay` („LEVEL X GESCHAFFT") bleibt unverändert. Es ist die
  Zwischenmeldung, nicht die Daueranzeige.

Prüfen, dass `LEVEL 12` bei `primaryFontPx` (22 px) zwischen Truppe und Münzen passt, ohne sie
zu überlappen — die Zeile ist `panelW` breit, links und rechts stehen je etwa 60 px Text.
Reicht der Platz nicht, wird die Levelanzeige auf `secondaryFontPx` verkleinert, **nicht** eines
der anderen Felder verschoben.

---

## Ausdrücklich nicht ändern

- `teamDampening` (0.41), `fightSecAtMaxTeam` (20), `maxFightSec` (40) — die Reißleine des
  letzten Tasks gilt.
- `boss.battleY`, `pressureDelayMs`, `advanceSpeed`, `advanceStopBeforeAnchorPx` — Thomas hat
  sich gegen einen näheren Boss entschieden.
- Die Bossphasen, Begleiter-Grenzen, die Truppen-Mechanik, die Tor-Mathematik, E10.
- `rangePx` der übrigen Waffen (Laser, Rakete, Minigun, Blitz stehen auf 0 = unbegrenzt und
  bleiben so).

---

## Akzeptanzkriterien

1. `getWeaponFirepower` und `getCombatFirepower` sind exportiert; `getBossPlan` und
   `getBlockerPlan` benutzen `getCombatFirepower` und rechnen nirgends mehr fest mit
   `weapon.normal`.
2. Unit-Test über **alle sieben Waffen** und die Truppengrößen 2, 4, 6, 8, 12, 20, 30, für die
   Level 1, 6 und 12 und für frischen wie voll gekauften Spielstand: `referenceFightSec` liegt
   zwischen **15 und 40 Sekunden**. Kein Fall darf herausfallen — das sind die Fälle, in denen
   der Boss heute unschaffbar ist.
3. Unit-Test: `referenceFightSec` überschreitet nie `maxFightSec`, und `maxFightSec` ist kleiner
   als `pressureDelayMs / 1000 + (battleY-Weg / advanceSpeed)`. Der Test rechnet diese Grenze
   aus den Balance-Werten aus, statt 45,8 als Zahl einzusetzen.
4. Unit-Test: Eine stärkere Waffe verkürzt den Kampf bei gleicher Truppe (Monotonie über
   `getWeaponFirepower`), und die Truppen-Monotonie aus dem letzten Task bleibt erhalten.
5. `getWeaponFirepower('normal')` ist exakt 1; `getWeaponFirepower('shotgun')` ist 4,2.
6. `getBlockerPlan` liefert für **jede** Waffe, jede geprüfte Truppengröße und jedes Level eine
   Zerstörungsdauer zwischen 1,5 und 2,5 s — bei ungedämpfter Rechnung also durchgehend 2,0 s.
7. `weapon.shotgun.rangePx` und `weapon.flamethrower.rangePx` stehen auf 430; ein Test weist
   nach, dass beide größer sind als der Abstand `anchorY − boss.battleY`, aus den Balance-Werten
   berechnet.
8. `pools.projectiles.shotgun = 168` und `pools.projectiles.flamethrower = 200`, Kommentare mit
   der neuen Flugzeit-Rechnung. Ein Test weist nach, dass beide Pools über dem aus den
   Balance-Werten berechneten Spitzenbedarf liegen.
9. **Gemessen, nicht geschätzt:** Frame-Zeit mit Flammenwerfer bei voller Truppe unter
   8-facher CPU-Drosselung, mit Screenshot-Gegenprobe, Ergebnis im Abschlussbericht.
10. Die Levelanzeige steht mittig in Zeile 1 des HUD, zeigt die tatsächliche Levelnummer und
    überlappt weder Truppe noch Münzen.
11. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch; bestehende Tests
    werden auf die neuen Signaturen umgestellt, nicht gelöscht.
12. **Nur nach Thomas' iPhone-Test erfüllbar:** Level-1-Boss ist mit **jeder** Waffe zu
    besiegen, insbesondere mit Laser, Rakete und Minigun.

---

## Reißleine

**Ruckelt der Flammenwerfer nach der Reichweitenerhöhung am iPhone**, wird zuerst
`weapon.flamethrower.bulletsPerShot` gesenkt (5 → 4 → 3) und der Pool entsprechend nachgezogen.
Das trifft die Projektilzahl direkt und lässt Reichweite und Feuerrate unangetastet. **Kein
zulässiger Ersatz:** die Reichweite wieder senken (dann trifft die Waffe den Boss nicht mehr —
das war der Ausgangsfehler), oder die Kollisionsprüfung wieder verbreitern.

**Ist der Boss danach mit einer Waffe immer noch nicht zu schaffen**, wird `weaponDampening`
einmalig auf 0.9 erhöht (Waffe fast voll ausgeglichen). Reicht auch das nicht, liegt es nicht an
den Lebenspunkten, sondern daran, dass die Waffe den Boss nicht trifft oder nicht trifft, was
sie soll — dann Trefferprüfung messen statt Zahlen drehen.

**Zeitbudget:** Steht die getrennte Dämpfung nach zwei Nacharbeitszyklen nicht (Kampfdauern
außerhalb 15–40 s in den Tests), auf die einfachste Form zurückfallen, die das Fenster hält:
`weaponDampening = 1`, also Waffe voll ausgeglichen, jede Waffe legt den Boss gleich schnell.
Die Waffe wirkt dann nur noch im normalen Level — und Thomas entscheidet, ob ihm das reicht.
