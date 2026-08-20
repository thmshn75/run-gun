# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

<!-- Uebernommen aus docs/spec-e4b-entwurf.md am 2026-08-20, unveraendert.
     Zwei Gegenpruefungen (Premortem, Betriebssicht) sind dort bereits eingearbeitet. -->

## Task

**Drei Zusatzwaffen (Schrot, Laser, Rakete) plus Waffen-Tore**

Zweite Hälfte der Etappe E4 aus `docs/plan.md`, Abschnitt „Waffentypen". Die Truppe (E4a)
ist fertig und freigegeben. Jetzt bekommt sie etwas anderes als den Standardschuss.

Das ist der umfangreichste Task des Projekts. Er greift in `weapons.ts`, `gates.ts`,
`balance.ts`, `colors.ts`, `BootScene.ts` und `GameScene.ts` ein.

## Verbindliche Architekturentscheidungen

Diese Punkte sind entschieden, nicht Codex' Ermessen. Abweichung nur mit Meldung, nie still.

### A. Waffe ist Run-Zustand, kein Stat

`RunStats` bleibt **unverändert** — es bleibt bei `hp | damage | shotsPerSec | speed`.
Die aktive Waffe ist kein numerischer Wert und darf nicht in `StatKey` aufgenommen werden.
Sie lebt als eigener Zustand (Vorschlag: `activeWeapon: WeaponKey` in `Weapons`, mit
`setWeapon()` und `getWeapon()`).

Der Waffentyp **multipliziert** die bestehenden Stats, er ersetzt sie nicht. Es sind
**drei** Werte, die die Waffe beeinflusst — nicht zwei:

1. Feuerrate = `runStats.shotsPerSec × weapon.rateFactor`
2. Schaden pro Kugel = `runStats.damage × weapon.damageFactor`
3. **Schützen pro Salve = `weapon.shootersPerSalvo`**

Punkt 3 ist die Stelle, die am leichtesten übersehen wird: `weapons.ts:60` ruft heute fest
`this.getSalvoPositions(BALANCE.crowd.shootersPerSalvo)` mit dem globalen Wert 8 auf.
**Diese Zeile muss waffenabhängig werden.** Bleibt sie unverändert, feuert die Rakete mit
8 statt 3 Figuren — also mit dem 2,7-fachen Volumen — und wird bei voller Truppe zum
Raketenhagel, der alle anderen Waffen entwertet. Genau das soll die Zahl 3 verhindern.

`BALANCE.crowd.shootersPerSalvo` (8) bleibt bestehen und ist ab jetzt die **Obergrenze**:
keine Waffe darf einen höheren Wert setzen, und der Wert selbst wird nicht erhöht.

### B. Vier getrennte Projektil-Pools, eine Phaser-Gruppe

Der Plan verlangt einen getrennten Pool je Typ. Umsetzung: **eine** `physics.add.group()`
wie bisher, darin vier fest zugeteilte Segmente. Jedes Objekt bekommt beim einmaligen
Anlegen im Konstruktor seinen Waffentyp und seine Textur **fest** zugewiesen und behält
beide bis Spielende.

Daraus folgen drei Pflichten:

- **Kein `setTexture()` im Hot Path** — die Textur steht beim Anlegen fest.
- **Jedes Projektil trägt seinen Waffentyp als Marke** (`setData('weapon', key)`, einmalig
  beim Anlegen gesetzt, nie wieder geändert). `GameScene` braucht diese Marke, um beim
  Treffer zu entscheiden, welcher Schadensfaktor gilt, ob durchschlagen wird und ob ein
  Flächenschaden ausgelöst wird. Ohne sie ist der Trefferbehandler nicht baubar.
- **Ein einziger `physics.add.overlap`** in `GameScene` bleibt bestehen; er wird nicht
  vervierfacht.

**Die Suche nach einem freien Projektil darf nichts allokieren.** `fire()` baut heute pro
Schuss zwei neue Arrays (`.filter(...)` und `.slice(...)`, `weapons.ts:61-63`). Das ist
schon jetzt Müll im Hot Path, und mit der Laser-Feuerrate von 11,2 Salven pro Sekunde
entsteht er häufiger als bisher — auf iOS sind solche Muster ein typischer Auslöser für
Ruckler durch die Speicherbereinigung. Stattdessen: je Segment ein Anfangs- und Endindex
plus ein **Suchzeiger**, der beim Abfeuern durch das Segment läuft und die ersten freien
Objekte direkt belegt. Kein `filter`, kein `slice`, kein `map`, keine Zwischen-Arrays.
Dasselbe gilt für die Ursprungspositionen: `getNextSalvoPositions` baut heute ebenfalls ein
Array pro Schuss — das darf bestehen bleiben (eine Allokation statt drei), muss aber nicht
zusätzlich vervielfacht werden.

Warum alle vier Segmente dauerhaft existieren, obwohl immer nur eine Waffe feuert: Beim
Waffenwechsel fliegt die Ladung der alten Waffe noch aus. Sie muss weiterfliegen, treffen
und regulär despawnen. Alle Segmente laufen deshalb in `update()` und in der Kollision
mit, unabhängig davon, welche Waffe gerade aktiv ist. **Nichts beim Wechsel wegräumen.**

Preis dieser Bauweise, bewusst akzeptiert: Die Zahl der Physik-Körper steigt von 96 auf 344.
Die Arcade-Physik läuft einmal pro Frame über alle Körper, auch über abgeschaltete — das
sind rund 20.600 zusätzliche Kurz-Durchläufe pro Sekunde, die je nur eine Abfrage kosten.
Gemessen an 60 Bildern pro Sekunde ist das unkritisch; es ist hier festgehalten, damit es
bei einem Performance-Problem nicht als unbekannte Größe dasteht.

### C. Bewegung bekommt zwei Achsen

Heute bewegt `weapons.ts` Projektile nur in Y. Der Schrot-Fächer braucht schräge Bahnen.
Jedes Projektil führt ab jetzt einen Geschwindigkeitsvektor mit (`vx`, `vy`) und wird auf
beiden Achsen bewegt. Beim Standard ist `vx = 0` — das Verhalten bleibt identisch.

Die Bewegung bleibt **manuell** in `update()` wie bisher (`x += vx·dt`, `y += vy·dt`,
danach `body.updateFromGameObject()`). Nicht auf Arcade-Velocity umstellen — die
bestehende Bauweise ist bewusst so und funktioniert.

Projektile mit schräger Bahn werden zusätzlich in Flugrichtung gedreht (`setRotation`),
damit der Fächer als Fächer lesbar ist.

### D. Despawn-Bedingungen

Ein Projektil wird recycelt, sobald **eine** davon zutrifft:
1. Es hat den oberen Bildrand verlassen (wie bisher).
2. Es hat den linken oder rechten Bildrand verlassen (neu, wegen der Fächerbahnen).
3. Es hat seine **Reichweite** aufgebraucht (neu, nur bei Waffen mit `rangePx > 0`).
4. Es hat getroffen und die Waffe durchschlägt nicht.

Reichweite wird als zurückgelegte Strecke mitgeführt und pro Frame um
`√(vx² + vy²) · dt` erhöht — nicht als Timer, damit sie unabhängig von der Bildrate ist.
`rangePx: 0` bedeutet „unbegrenzt, fliegt bis zum Bildrand".

Die Reichweitenprüfung muss **im selben Frame** greifen, in dem die Strecke überschritten
wird. Ein um einen Frame verspätetes Aufräumen lässt beim Schrot kurzzeitig mehr
Projektile in der Luft, als der Pool hergibt (siehe Pool-Herleitung).

### E. Laser durchschlägt — Trefferliste ist Pflicht

`physics.add.overlap` feuert **jeden Frame erneut**, solange sich zwei Körper überlappen.
Beim Standard fällt das nicht auf, weil das Projektil beim Treffer verschwindet. Der Laser
verschwindet nicht — ohne Trefferliste würde er denselben Gegner 60-mal pro Sekunde
schädigen und wäre nicht spielbar. **Das ist die kritischste Einzelstelle dieses Tasks.**

Umsetzung:
- Jedes Laser-Projektil bekommt beim einmaligen Anlegen ein `Set<number>` zugewiesen. Beim
  Abfeuern wird es mit `.clear()` geleert. **Kein `new Set()` im Hot Path.**
- Gegner können nicht über ihre Objektreferenz identifiziert werden — sie sind gepoolt, ein
  recycelter Gegner ist dasselbe Objekt. Der `Spawner` vergibt deshalb beim Spawnen eine
  **fortlaufende Nummer** (`spawnId`, einfacher Zähler, in `setData` abgelegt). Das Set
  speichert diese Nummern.
- Vor jedem Schaden prüfen, ob die `spawnId` schon im Set steht; wenn ja, nichts tun.

### F. `GameScene.handleProjectileHit` muss umgebaut werden

Das ist der Punkt, an dem die Umsetzung sonst scheitert. `GameScene.ts:137-143` recycelt
heute **ausnahmslos jedes** Projektil beim Treffer:

```ts
private handleProjectileHit(projectile, enemy): void {
  if (!projectile.active || !enemy.active) return
  // ... Schaden ...
  this.weapons.recycle(projectile)      // <- unbedingt
}
```

Solange diese Zeile unbedingt läuft, ist der Laser-Durchschlag technisch unmöglich, egal
wie sauber `weapons.ts` gebaut ist. Der Behandler muss die Marke `weapon` vom Projektil
lesen (Abschnitt B) und danach verzweigen:

- **Normal, Schrot:** Schaden `runStats.damage × damageFactor`, danach recyceln — wie heute.
- **Laser:** `spawnId` des Gegners gegen die Trefferliste prüfen; unbekannt → Schaden und
  `spawnId` eintragen, bekannt → nichts tun. **In keinem Fall recyceln.**
- **Rakete:** direkter Schaden auf den getroffenen Gegner, danach Flächenschaden (unten),
  dann recyceln.

Der Schadenswert wird an genau einer Stelle berechnet, nicht je Zweig neu.

### G. Rakete: Flächenschaden ohne Partikelsystem

Beim Einschlag nehmen alle aktiven Gegner innerhalb von `splashRadiusPx` **70 px** Schaden
in Höhe von `runStats.damage × splashDamageFactor`, mit **`splashDamageFactor: 1.5`**.
Der direkt getroffene Gegner nimmt zusätzlich den direkten Treffer
(`runStats.damage × damageFactor`, also × 2,5). Umsetzung als Schleife über die aktiven
Gegner mit Distanzprüfung — bei höchstens 48 Gegnern ist das unkritisch.

Der Einschlag wird sichtbar durch einen **kurzen Kreis-Flash aus einem eigenen kleinen
Pool** (Größe 12, Herleitung unten): ein einmalig in `BootScene` erzeugtes Kreis-Sprite,
das beim Einschlag auf `splashRadiusPx` skaliert und über `flashMs` **180 ms** ausgeblendet
wird.

**Wie ausgeblendet wird, ist vorgegeben:** eine Restzeit je Flash mitführen, sie in
`update()` um `dt` verringern und daraus die Deckkraft setzen — genau wie der bestehende
Code Trefferblitze und Torblitze behandelt. **Kein `scene.tweens.add(...)`** und keine
andere Phaser-Animation: ein Tween legt pro Einschlag ein neues Objekt an, bei bis zu
6 Einschlägen pro Sekunde ist das genau die Art von Speichermüll, die diese ganze
Pool-Architektur vermeiden soll. **Kein Partikelsystem** — das ist eine V1-Regel aus
`docs/plan.md`.

## Balance-Werte

Neu in `src/config/balance.ts` unter `weapon`. Die bestehende `weapon.projectileSpeed`
geht im Standard-Eintrag auf; alle anderen Werte werden ergänzt, nichts Bestehendes
außerhalb dieses Abschnitts geändert.

| | Normal | Schrot | Laser | Rakete |
|---|---|---|---|---|
| Kugeln pro Schuss | 1 | **7** | 1 | 1 |
| Fächerwinkel gesamt | 0° | **34°** | 0° | 0° |
| Schützen pro Salve | 8 | 8 | 8 | **3** |
| Ratenfaktor | 1,0 | **0,4** | **1,4** | **0,25** |
| Schadensfaktor | 1,0 | **1,5** | **0,4** | **2,5** |
| Geschwindigkeit | 640 | 640 | **900** | **300** |
| Reichweite | ∞ | **280 px** | ∞ | ∞ |
| durchschlägt | nein | nein | **ja** | nein |
| Flächenradius | – | – | – | **70 px** |
| Flächen-Schadensfaktor | – | – | – | **1,5** |

**Warum diese Werte:**
- **Schrot** ist absichtlich träge und laut statt schnell: 40 % Feuerrate, dafür sieben
  Kugeln mit anderthalbfachem Schaden. Ein Fächer aus Nahdistanz macht rund
  10-fachen Schaden und legt einen schweren Zombie (9 HP) mit einem Schuss um. Die
  Reichweite von 280 px reicht vom Anker (y = 714) bis y = 434 — man muss die Gegner
  herankommen lassen. Das ist der Preis für die Wucht.
- **Laser** ist das Gegenteil: schnelles Geknatter mit wenig Einzelschaden, das aber ganze
  Kolonnen auf einmal durchschlägt. Stark bei vielen leichten Gegnern, schwach gegen
  einzelne schwere.
- **Rakete** feuert nur mit drei Figuren gleichzeitig statt acht — sonst wäre sie bei voller
  Truppe ein Raketenhagel mit 16 Flächentreffern pro Sekunde und würde alles andere
  entwerten. Drei Raketen mit 70 px Radius decken bereits einen großen Teil der Breite ab.

## Pool-Herleitungen

**Die Formel ist nicht der Durchschnitt, sondern die Spitze.** Ein Durchschnitt
(Salven/s × Schützen × Kugeln × Flugzeit) unterschätzt den Bedarf, sobald eine Salve groß
und die Zahl der gleichzeitig fliegenden Salven klein ist — genau der Fall beim Schrot.
Richtig ist:

```
gleichzeitig fliegende Salven = aufgerundet( Flugzeit / Salvenabstand )
Spitze                        = Salven × Schützen × Kugeln pro Schuss
```

Die Salvenrate ist durch `BALANCE.stats.shotsPerSec.cap = 8` gedeckelt, multipliziert mit
dem Ratenfaktor der Waffe. Bildhöhe 844 px, Anker bei y = 714.

- **Normal: 96.** 8 Salven/s, Abstand 0,125 s, Flugzeit 714/640 = 1,12 s → 9 Salven
  gleichzeitig × 8 Kugeln = **Spitze 72**. 96 lässt 33 % Reserve. Unverändert gegenüber heute.
- **Schrot: 128.** 3,2 Salven/s, Abstand 0,3125 s, Flugzeit 280/640 = 0,44 s → 2 Salven
  gleichzeitig × 56 Kugeln (8 Schützen × 7) = **Spitze 112**. Der Durchschnitt läge bei 79 —
  die Salve ist hier so groß, dass die Aufrundung von 1,4 auf 2 Salven 43 % ausmacht. 128
  lässt 14 % Reserve. Ein Pool von 112 wäre exakt die Spitze und würde beim ersten um einen
  Frame verspäteten Reichweiten-Despawn überlaufen — sichtbar als schrumpfender Fächer.
- **Laser: 96.** 11,2 Salven/s, Abstand 0,089 s, Flugzeit 714/900 = 0,79 s → 9 Salven × 8 =
  **Spitze 72**. Der Laser despawnt beim Treffer nicht, fliegt also immer die volle Bahn —
  die Rechnung darf keinen vorzeitigen Abgang unterstellen. 96 lässt 33 % Reserve.
- **Rakete: 24.** 2 Salven/s, Abstand 0,5 s, Flugzeit 714/300 = 2,38 s → 5 Salven × 3
  Schützen = **Spitze 15**. 24 lässt 60 % Reserve.
- **Einschlag-Flash: 12.** 2 Salven/s × 3 Schützen = 6 Einschläge/s × 0,18 s Sichtbarkeit
  = 1,1 gleichzeitig. 12 ist großzügige Reserve für gleichzeitige Einschläge.

Zusammen 344 Projektile plus 12 Flashes, alle **einmalig im Konstruktor** angelegt.

Jede dieser Herleitungen gehört als Kommentar an die jeweilige Poolgröße in `balance.ts` —
gleiche Form wie die bestehenden Kommentare, und mit der Spitzen-Formel, nicht mit dem
Durchschnitt.

Die Dev-Konsolenwarnung bei Poolerschöpfung (`warnPoolExhausted`) bleibt und muss
**benennen, welche Waffe** den Pool erschöpft hat. Ein zu kleiner Pool lässt Schüsse still
verschwinden und sähe sonst wie ein Balance-Problem aus statt wie ein Technik-Bug.

## Aussehen der Projektile

Die drei neuen Geschosse müssen auf einen Blick unterscheidbar sein, sonst merkt man den
Waffenwechsel nur an der Wirkung. Alle vier Texturen werden wie bisher programmatisch in
`BootScene` erzeugt (das sind abstrakte Geschosse, keine Figuren — hier ist das zulässig).
Neue Farben in `colors.ts` unter `WORLD_COLORS`.

- **Normal:** unverändert, 6 × 14 px, orange (`projectileShell` / `projectileCore`).
- **Schrot:** kleines Korn, 4 × 6 px, helles Gelb-Orange. Sieben davon müssen als Fächer
  lesbar sein, nicht als Klumpen.
- **Laser:** dünner langer Strahl, 3 × 20 px, helles Cyan. Deutlich anders als die
  RATE-Farbe im HUD (`0x34d1e0`), damit HUD und Geschoss nicht verwechselt werden.
- **Rakete:** gedrungener Körper, 8 × 16 px, grau mit rotem Kopf.
- **Einschlag-Flash:** gefüllter Kreis, 32 px Durchmesser, warmes Orange-Weiß. Wird beim
  Einschlag auf 70 px Radius skaliert — deshalb klein erzeugt und hochskaliert, nicht
  in Zielgröße.

## Waffen-Tore

Die Waffe wird im Run an Toren erworben und gilt bis Run-Ende.

- **Häufigkeit:** jedes vierte Tor ist ein Waffen-Tor. Bei 9 s Torabstand also etwa alle
  36 s — in einem 2–3-Minuten-Run drei bis fünf Gelegenheiten. Als Wert in `balance.ts`
  (`gates.weaponGateEvery: 4`), nicht als Zahl im Code.
- **Kein Leerlauf:** Beide Seiten zeigen eine Waffe, beide **verschieden von der aktuellen**
  und **voneinander verschieden**. Bei vier Waffen und einer aktiven bleiben immer drei zur
  Auswahl, eine gültige Ziehung ist also immer möglich. Dieselbe Regel wie bei den
  Stat-Toren, wo bereits gilt, dass keine Seite wirkungslos sein darf.
- **Beschriftung:** der Waffenname statt einer Rechenoperation — `NORMAL`, `SCHROT`,
  `LASER`, `RAKETE`. Die Torschrift ist heute 34 px; für Waffen-Tore auf **26 px**
  reduzieren, sonst läuft der Text bei 191 px Torbreite über den Rand.
- **Kopfzeile** über dem Tor: `WAFFE` statt eines Statkürzels.
- **Farbe:** eine eigene Farbe, die sich von allen vier `STAT_COLORS` klar unterscheidet
  (Vorschlag `0xb18cff`, ein helles Violett). Als `WEAPON_GATE_COLOR` in `colors.ts`.
  `STAT_COLORS` und der `StatKey`-Typ bleiben unverändert — die Waffe ist kein Stat.
- Die bestehende Logik für Stat-Tore (`drawGatePair`, gemischte Operatoren, zustands-
  abhängige Ziehung) bleibt **vollständig erhalten**. Das Waffen-Tor ist eine zweite
  Tor-Art daneben, kein Umbau der ersten.
- Der Wechsel greift **sofort** beim Durchlaufen. Damit das stimmt, muss in
  `GameScene.update()` der Aufruf `gates.update(...)` **vor** `weapons.update(...)`
  stehen — heute ist es umgekehrt (Zeilen 112 und 115), wodurch der Wechsel einen Frame zu
  spät wirkte. Die Reihenfolge der übrigen Aufrufe bleibt unverändert.
- Die auslaufende Ladung der alten Waffe fliegt weiter (siehe Abschnitt B).

## HUD

Die aktive Waffe muss jederzeit ablesbar sein, sonst ist nach einem Torwechsel unklar,
womit man schießt.

Zeile 2 des HUD hat heute drei Spalten (DMG, RATE, SPD). Sie wird auf **vier** Spalten
aufgeteilt (Spaltenbreite `panelW / 4`, Positionen bei 0,5 / 1,5 / 2,5 / 3,5), die vierte
zeigt den Waffennamen in der Waffen-Tor-Farbe.

Die Spalten werden dabei von rund 122 px auf 91 px schmaler. Zu prüfen ist deshalb nicht
nur, ob der längste Waffenname hineinpasst, sondern auch, ob die **Bestandswerte an ihrer
Obergrenze** noch passen: `DMG 20.0`, `RATE 8.0` und `SPD 305` erreicht ein Run durch die
Tore zwangsläufig. Passt einer davon nicht, wird die Schriftgröße in Zeile 2 abgesenkt —
nicht eine Anzeige weggelassen.

Keine bestehende Anzeige darf verschwinden, abgeschnitten werden oder überlappen.

## Reißleine

**Riskanteste Stelle ist die Bildrate am iPhone bei voller Truppe (30 Figuren) plus
Schrot.** Der Waffenwechsel ist dabei der Spitzenmoment: die auslaufende Ladung der alten
Waffe und die neue Waffe sind gleichzeitig in der Luft. Für den Wechsel Normal → Schrot
sind das rund 122 Projektile gegen bis zu 48 Gegner in der Kollisionsprüfung. Das ist die
Zahl, an der es bricht — nicht die Poolgröße.

Ruckelt es bei Thomas' iPhone-Test, in dieser Reihenfolge nachziehen:
1. Schützenzahl für Schrot von 8 auf 5 senken (Spitze sinkt von 112 auf 70, Pool auf 80).
2. Erst danach die Kugelzahl von 7 auf 5.

**Kein zulässiger Ersatz ist:** eine Waffe streichen; den Pool kleiner setzen als die
Herleitung ergibt und Schüsse still verschlucken lassen; `crowd.max` senken; die Gegnerzahl
oder `pools.enemies` reduzieren; die Kollisionsprüfung ausdünnen (etwa nur jeden zweiten
Frame prüfen). Führt keiner der beiden erlaubten Schritte zum Ziel: **melden und stoppen**,
nicht selbst etwas anderes wählen.

**Zeitbudget:** Ist der Task nach zwei Codex-Läufen nicht lauffähig, wird der Umfang auf
zwei Waffen reduziert (Schrot und Laser, Rakete entfällt) — das entspricht der Reißleine
in `docs/plan.md` („zwei Waffen mit unterschiedlichem Gefühl sind mehr wert als drei
gleiche"). Diese Kürzung trifft **Thomas**, nicht Codex und nicht Claude eigenmächtig.

**Balance-Urteil:** Ob sich eine Waffe spürbar anders anfühlt als der Standard, entscheidet
Thomas am iPhone. Codex' Selbsteinschätzung und die Desktop-Vorschau zählen nicht als
Nachweis.

## Akzeptanzkriterien

1. Vier Waffen sind spielbar; die Startwaffe ist `NORMAL`.
2. Alle Projektil- und Flash-Objekte werden **einmalig im Konstruktor** angelegt. Im
   laufenden Spiel gibt es weder `create()`, `destroy()`, `new Set()`, `setTexture()` noch
   `tweens.add()`; `fire()` erzeugt **keine Zwischen-Arrays** mehr (kein `filter`, `slice`
   oder `map` pro Schuss). Im Diff nachweisbar.
3. Jede Poolgröße steht mit ihrer Herleitung als Kommentar in `balance.ts`, gerechnet über
   die gleichzeitig fliegenden Salven, nicht über den Durchschnitt.
4. Die Rakete feuert mit 3 Figuren pro Salve, alle anderen Waffen mit bis zu 8 — im Diff an
   der waffenabhängigen Schützenzahl nachweisbar, nicht nur in der Balance-Tabelle.
5. Der Schrot-Fächer besteht aus 7 Kugeln auf schrägen Bahnen und verschwindet nach 280 px.
6. Der Laser durchschlägt und schädigt denselben Gegner **nachweislich nur einmal** pro
   Durchflug; die Identität läuft über die Spawn-Nummer, nicht über die Objektreferenz.
7. `handleProjectileHit` verzweigt nach dem Waffentyp des Projektils und recycelt den Laser
   nicht.
8. Der Raketeneinschlag schädigt Gegner im Radius von 70 px mit Faktor 1,5 und zeigt einen
   Kreis-Flash aus dem eigenen Pool, der über eine mitgeführte Restzeit ausgeblendet wird.
9. Waffen-Tore erscheinen als jedes vierte Tor, zeigen nie die aktuelle Waffe und nie
   zweimal dieselbe; der Wechsel wirkt im selben Frame.
10. Die Stat-Tore funktionieren unverändert weiter; `RunStats` und `StatKey` sind nicht
    verändert.
11. Beim Waffenwechsel fliegt die Ladung der alten Waffe zu Ende und trifft weiterhin.
12. Das HUD zeigt die aktive Waffe; TEAM, Münzen, DMG, RATE und SPD bleiben auch bei ihren
    Höchstwerten (20.0 / 8.0 / 305) vollständig sichtbar und überlappen nicht.
13. Die vier Projektiltypen sind optisch klar unterscheidbar.
14. `npm run check` und `npm run build` laufen fehlerfrei durch.
15. Keine Requests an fremde Hosts, keine neuen Abhängigkeiten.

**Offen bis zu Thomas' iPhone-Test:** ob es bei voller Truppe plus Schrot flüssig läuft,
ob sich die drei Waffen unterschiedlich anfühlen und ob die Torwahl eine Entscheidung ist.

## Nicht in diesem Task

- **Startwaffe im Menü kaufen** — der Plan nennt das unter „Erwerb", es braucht aber das
  Menü- und Persistenzsystem aus Etappe E5. In E4b ist die Startwaffe immer `NORMAL`.
- E4c (Gegner als Truppen), Hintergrundgestaltung, die HUD-Überlappung beim Torerscheinen.

## Hinweis zum aktuellen Codestand

`src/systems/spawner.ts` wurde heute zweimal geaendert (`97e02c8`, `2efa02c`):
Spurwahl liegt jetzt als reine Funktion in `src/systems/spawnLanes.ts`, und Gegnerkoerper
stehen auf `body.moves = false`. Beides bleibt unangetastet. Die in Abschnitt E verlangte
fortlaufende `spawnId` kommt als zusaetzliches `setData` in `spawn()` dazu — die
bestehenden Datenfelder und die Poollogik bleiben, wie sie sind.
