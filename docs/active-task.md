# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Teil 1: Schaden und Feuerrate in der Boss-Rechnung messen statt raten (Bug).
Teil 2: Kulisse am Straßenrand — Bäume und Häuser, die vorbeiziehen.**

Thomas' iPhone-Test vom 2026-08-21: „konnte Level 1 Boss nicht besiegen, 3 Team und Rakete und
Rate down funktioniert halt nicht" sowie „im grünen Bereich hätte ich gerne Bäume und Häuser die
vorbeiziehen wie am Titelbild".

---

# Teil 1 — Der dritte und letzte Rest derselben Fehlerklasse

## Befund

Die Boss-Rechnung kannte drei Größen, die sie hätte messen können, und hat sie geraten. Zwei
sind behoben, **eine fehlt noch**:

| Größe | Woher heute | Status |
|---|---|---|
| Truppengröße | ~~aus dem Kaufstand geraten~~ → `runStats.get('hp')` | behoben (`b36fdb0`) |
| Waffe | ~~immer `weapon.normal`~~ → tatsächliche Waffe | behoben (`8472f94`) |
| **Schaden und Feuerrate** | **aus Kaufstand + Levelaufschlag geraten** | **offen** |

In `getBossPlan` und `getBlockerPlan` steht weiterhin:

```ts
const damage = Math.min(reference.damageCap, damageUpgrade.base + upgrades.damage * ... + (level-1) * ...)
const rate   = Math.min(reference.rateCap,   rateUpgrade.base   + upgrades.rate   * ... + (level-1) * ...)
```

Das ist eine **Annahme über den Kaufstand**, nicht der Wert, mit dem der Spieler schießt. Die
DMG- und RATE-Tore verändern `runStats` im Run in beide Richtungen — genau darum geht es bei der
Tor-Mathematik. Wer ein RATE-Tor nach unten nimmt, schießt langsamer, der Boss bekommt aber
unverändert die Lebenspunkte für die angenommene Feuerrate.

Thomas' Fall nachgerechnet — Level 1, frischer Spielstand, Truppe 3, Rakete:

| Tatsächliche Werte | Kampf dauert | |
|---|---|---|
| damage 1, rate 3 (= die Annahme) | 40,0 s | gerade noch schaffbar |
| damage 1, rate 1,5 (RATE einmal runter) | **80,0 s** | nicht schaffbar |
| damage 1, rate 1 (RATE zweimal runter) | **120,0 s** | nicht schaffbar |
| damage 0,7, rate 1 (RATE und DMG runter) | **171,4 s** | nicht schaffbar |

Der Boss wird ab Sekunde 45,8 tödlich. Alles über 40 s ist verloren.

## Umsetzung

### 1.1 Die letzten zwei geratenen Größen verschwinden

`getBossPlan` und `getBlockerPlan` bekommen `damage` und `rate` **als Parameter**, aus
`runStats.get('damage')` und `runStats.get('shotsPerSec')`. Die Herleitung aus
`upgradesShop.*.base + upgrades.* + (level − 1) × *PerLevel` entfällt in der DPS-Rechnung.

`referenceFirepower.damagePerLevel`, `damageCap`, `ratePerLevel` und `rateCap` werden dadurch
für den DPS nicht mehr gebraucht — **sie bleiben aber als Anker für die Dämpfung erhalten**
(Abschnitt 1.3) und behalten ihre Werte. Kein toter Code: Wer sie streicht, bricht die Dämpfung.

### 1.2 Ein Clamp beendet die Serie strukturell

Bisher wurde nach unten nichts begrenzt und nach oben nur durch `maxFightSec`. Neu ist die
Kampfdauer **beidseitig geklemmt**:

```ts
// Untergrenze, damit ein starker Run den Boss nicht wieder zerplatzen lässt — das war der
// Ausgangsfehler. Obergrenze, damit kein Run über das Zeitdruckfenster hinausläuft.
minFightSec: 15,
maxFightSec: 40,   // unverändert
```

```
echterDps = getCombatFirepower(teamSize, weapon) × damage × rate      // alles gemessen
fightSec  = clamp(minFightSec, maxFightSec, fightSecAtMaxTeam × Truppenterm × Waffenterm × Statterm)
maxHp     = min(hpCap, round(echterDps × fightSec))
```

**Das ist der eigentliche Fix.** Weil `maxHp` aus dem *echten* Ausstoß gebildet wird, ist die
tatsächliche Kampfdauer exakt `fightSec` — und die liegt per Konstruktion zwischen 15 und 40
Sekunden. Für **jede** Kombination aus Truppe, Waffe, Schaden, Feuerrate, Level und Kaufstand,
ohne dass man Fälle durchprobieren muss. Damit ist diese Fehlerklasse geschlossen, nicht nur der
gemeldete Fall.

### 1.3 Der neue Stat-Term

Analog zum Waffen-Term. Die bisher **geratenen** Werte bleiben als Bezugspunkt — sie
beschreiben, was ein durchschnittlicher Run an dieser Stelle hätte:

```
Statterm = (angenommenDamage × angenommenRate / (echtDamage × echtRate)) ^ (1 − statDampening)
```

```ts
// Wie stark erspielte Schadens- und Feuerratenwerte die Bosskampfdauer beeinflussen.
// Gleiche Begründung wie beim Waffen-Wert: spürbar, aber nie so weit, dass ein schlechter
// Torlauf den Kampf über das Zeitdruckfenster hinauszieht. Der Clamp fängt die Extreme.
statDampening: 0.8,
```

`teamDampening` (0.41), `weaponDampening` (0.8) und `fightSecAtMaxTeam` (20) bleiben
**unverändert**. Nachgerechnet ergibt das:

| Fall | Dauer |
|---|---|
| **Thomas: Truppe 3, Rakete, rate 1** | **40,0 s** (vorher 120,0 s) |
| Truppe 3, Normalwaffe, rate 1 | 40,0 s |
| Truppe 12, Normalwaffe, dmg 3, rate 4 | 22,3 s |
| Truppe 30, Schrot, dmg 20, rate 8 (Top-Run) | 15,0 s |
| Truppe 30, Minigun, dmg 1, rate 1 | 33,4 s |
| Truppe 2, Minigun, dmg 1, rate 1 (schlimmster Fall) | 40,0 s |

### 1.4 Sperren

`getBlockerPlan` bekommt `damage` und `rate` genauso aus `runStats` — **ohne Dämpfung und ohne
Clamp**, damit eine Sperre für jeden Zustand konstant 2,0 s hält. Aufrufer in
`src/systems/blockers.ts` reicht die Werte beim Spawn durch, wie schon Truppe und Waffe.

### 1.5 Verhältnis zur Reißleine des letzten Tasks

Die Reißleine verbietet, an `teamDampening`, `fightSecAtMaxTeam` oder `maxFightSec` zu drehen.
**Daran wird nichts gedreht.** Hier werden zwei Größen von *geraten* auf *gemessen* umgestellt —
derselbe Bug wie bei Truppe und Waffe, nur bei der letzten verbliebenen Variablen. Der neue
Clamp ist keine Feinjustierung, sondern die Garantie, dass die Frage nicht ein viertes Mal
aufkommt.

---

# Teil 2 — Kulisse am Straßenrand

## Ziel

Der grüne Bereich links und rechts der Straße ist heute eine leere Fläche. Er soll aussehen wie
auf dem Titelbild (`src/assets/title.png`): Bäume, Büsche, Steine, Häuser und Zäune, die mit der
Straße vorbeiziehen. Reine Kulisse — **kein Spielelement**.

## Umsetzung

### 2.1 Bilder

Codex erzeugt die Sprites im Stil von `src/assets/title.png` (Pixel-Art, gleiche Farbwelt,
gleiche Kantenhärte). Mindestens fünf verschiedene, damit sich das Muster nicht sofort
wiederholt:

- ein Laubbaum, ein zweiter Baum in anderer Form/Größe
- ein Busch oder eine Grasgruppe
- ein Stein oder Felsblock
- ein kleines Haus oder eine Hütte

Alle mit transparentem Hintergrund, Fußpunkt unten mittig (Origin `(0.5, 1)`), damit sie auf dem
Boden stehen und nicht schweben. Größe so, dass ein Baum am unteren Bildrand etwa 90–130 px hoch
wirkt; die Perspektive macht ihn oben kleiner.

### 2.2 Bewegung und Perspektive

Eigenes System `src/systems/scenery.ts` nach dem Muster der bestehenden Systeme:

- Objekte erscheinen bei `road.horizonY` und wandern mit `BALANCE.scrollSpeed` nach unten —
  **dieselbe Geschwindigkeit wie die Straße**, sonst schwimmt die Kulisse gegen den Untergrund.
- Die Größe wächst mit der Perspektive, hergeleitet aus derselben Funktion, die die Straße
  benutzt: `getRoadHalfWidth(width, height, y)`. Am Horizont ist die Straße `topWidthRatio 0.46`
  breit, unten `bottomWidthRatio 1` — der Maßstab eines Kulissenobjekts folgt genau diesem
  Verhältnis. Keine zweite, eigene Perspektivformel.
- **Seitliche Position:** außerhalb der Straße. Der linke Rand der Straße bei Höhe `y` liegt bei
  `width/2 − getRoadHalfWidth(…, y)`, der rechte spiegelbildlich. Ein Objekt steht mit einem
  Zufallsabstand von `scenery.marginPx` bis `scenery.marginPx + scenery.spreadPx` **außerhalb**
  dieser Kante. Weil die Straße nach unten breiter wird, wandern die Objekte dabei automatisch
  nach außen aus dem Bild — genau wie auf dem Titelbild.
- Ein Objekt, dessen Oberkante unter `scale.height` liegt oder das seitlich vollständig aus dem
  Bild gelaufen ist, wird recycelt.
- Erscheinungsrhythmus: `scenery.spawnIntervalMs` mit einer Zufallsstreuung, Seite (links/rechts)
  und Art werden gezogen. Beide Seiten unabhängig, damit keine Symmetrie entsteht.

### 2.3 Ebene

Neue Ebene in `BALANCE.layers` **zwischen** `background (-1)` und `road (0)`, damit die Kulisse
über dem Boden, aber unter Straße, Gegnern, Toren und Truppe liegt. Nichts darf ein Spielelement
verdecken — die Kulisse steht ohnehin neben der Straße, aber die Ebene sichert es ab.

### 2.4 Pool, mit Herleitung

Wie jedes andere System: alle Objekte einmal im Konstruktor, kein `create()`/`destroy()` zur
Laufzeit.

Herleitung: Ein Objekt braucht von `horizonY` (150) bis zum unteren Rand (844) `694 px` bei
`scrollSpeed 180 px/s`, also **3,86 s**. Bei `spawnIntervalMs = 900` und zwei Seiten sind das
`3,86 / 0,9 × 2 = 8,6` gleichzeitig sichtbare Objekte. **Pool `scenery: 16`** lässt 86 % Reserve
für die Zufallsstreuung im Rhythmus.

Kulissenobjekte sind reine Bilder ohne Physikkörper und ohne Kollisionsprüfung — sie kosten
Zeichenzeit, keine Rechenzeit. Die Regel „nie alle Pools in eine Physik-Gruppe legen" wird nicht
berührt, weil hier gar keine Physik im Spiel ist.

### 2.5 Nicht mitnehmen

Keine Wolken, keine Skyline, keine Vögel, keine Animation der Objekte. Das Titelbild zeigt eine
Skyline am Horizont — die ist Teil des Bildes, nicht Teil dieses Tasks. Feature-Deckel aus
`docs/plan.md` gilt.

---

## Ausdrücklich nicht ändern

- `teamDampening` (0.41), `weaponDampening` (0.8), `fightSecAtMaxTeam` (20), `maxFightSec` (40).
- Die Bossphasen, das Vorrücken, `pressureDelayMs`, `battleY`, Begleiter-Grenzen.
- Die Tor-Mathematik, E10, die Reichweiten und Poolgrößen aus `8472f94`.
- Der Entwickler-Zugang `window.__runGun` / `debugSetState` — er wird für die Abnahme gebraucht.
- Straße, Horizont und Perspektivformel. Die Kulisse benutzt sie, sie ändert sie nicht.

---

## Akzeptanzkriterien

1. `getBossPlan` und `getBlockerPlan` erhalten `damage` und `rate` als Parameter; in ihrer
   DPS-Rechnung kommt keine Herleitung aus `upgradesShop` oder `*PerLevel` mehr vor.
2. Die Aufrufer reichen `runStats.get('damage')` und `runStats.get('shotsPerSec')` durch.
3. `minFightSec: 15` existiert; `fightSec` ist beidseitig geklemmt.
4. **Der entscheidende Test:** Über das Kreuzprodukt aus Truppengrößen `[2, 3, 6, 12, 20, 30]`,
   **allen sieben Waffen**, Schadenswerten `[1, 3, 10, 20]`, Feuerraten `[1, 1.5, 3, 8]`, Leveln
   `[1, 6, 12]` und beiden Kaufständen liegt `referenceFightSec` **immer** zwischen 15 und 40
   Sekunden. Das sind über 8.000 Fälle — der Test läuft sie durch, statt Stichproben zu nehmen.
5. Ein Test für Thomas' konkreten Fall: Level 1, frischer Spielstand, Truppe 3, Rakete,
   `damage = 1`, `rate = 1` → `referenceFightSec ≤ 40` und `maxHp` liegt unter dem Wert, den die
   alte geratene Rechnung ergeben hätte.
6. `getBlockerPlan` liefert über dasselbe Kreuzprodukt eine Zerstörungsdauer zwischen 1,5 und
   2,5 s.
7. Kulissenobjekte erscheinen links und rechts **außerhalb** der Straßenkante — ein Test weist
   über `getRoadHalfWidth` nach, dass kein Objekt bei seiner Höhe in die Straße ragt.
8. Der Maßstab eines Kulissenobjekts folgt derselben Perspektive wie die Straßenbreite; im Test
   nachgewiesen, dass er bei `horizonY` kleiner ist als am unteren Rand und dem Verhältnis der
   Straßenbreiten entspricht.
9. `pools.scenery` existiert mit der Herleitung im Kommentar; im Review nachweisbar, dass die
   Kulissen-Objekte nur im Konstruktor erzeugt werden.
10. Die Kulisse liegt auf einer Ebene unter `layers.road` und verdeckt kein Spielelement.
11. Mindestens fünf verschiedene Kulissen-Sprites im Stil von `title.png`, mit transparentem
    Hintergrund und Fußpunkt-Origin.
12. `npm run check`, `npm run build` und `npm test` laufen fehlerfrei durch.
13. **Nur nach Thomas' iPhone-Test erfüllbar:** Level-1-Boss ist auch mit kleiner Truppe,
    schwacher Waffe und gesenkter Feuerrate zu besiegen; die Kulisse wirkt wie auf dem
    Titelbild und lenkt nicht vom Spielgeschehen ab.

---

## Reißleine

**Teil 1 ist mit dem Clamp abgeschlossen.** Sollte ein Bosskampf danach immer noch nicht zu
gewinnen sein, liegt es **nicht** an den Lebenspunkten — die Dauer ist dann per Konstruktion
höchstens 40 Sekunden und der Boss wird erst ab 45,8 Sekunden tödlich. Dann ist entweder der
tatsächliche Schaden nicht der berechnete (Trefferprüfung messen, nicht Zahlen drehen) oder der
Spieler stirbt vorher an Bossgeschossen und Begleitern — das ist eine Frage des Kampfverhaltens,
über die Thomas entscheidet. **Kein zulässiger Ersatz:** an `statDampening`, `teamDampening`,
`weaponDampening`, `minFightSec` oder `maxFightSec` drehen.

**Ruckelt die Kulisse am iPhone**, wird `scenery.spawnIntervalMs` erhöht (900 → 1400 → 2000) und
der Pool entsprechend verkleinert. **Kein zulässiger Ersatz:** die Perspektivrechnung
vereinfachen oder die Kulisse auf eine Seite beschränken — dann sieht es falsch aus statt
sparsam. Bleibt es zäh, fliegt Teil 2 raus; er ist Kosmetik und darf das Spielgefühl nicht
kosten.

**Zeitbudget Teil 2:** Sitzt die Kulisse nach zwei Nacharbeitszyklen optisch nicht (Objekte
schweben, ragen in die Straße, springen beim Erscheinen), liegt es an der Kopplung von
Perspektive und Fußpunkt. Dann die Positionsrechnung als reine Funktion nach
`src/systems/sceneryLayout.ts` ziehen und dort isoliert gegen Tests bringen, statt im
Zusammenspiel mit Phaser weiterzusuchen.
