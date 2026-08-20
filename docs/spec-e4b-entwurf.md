# Spec-Entwurf E4b — Zusatzwaffen und Waffen-Tore

> Vorbereitet am 2026-08-20, während der Sprite-Nacharbeit. Wird nach deren Freigabe
> unverändert nach `docs/active-task.md` übernommen und auf `SPEC_READY` gesetzt.

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

Der Waffentyp **multipliziert** die bestehenden Stats, er ersetzt sie nicht:
tatsächliche Feuerrate = `runStats.shotsPerSec × weapon.rateFactor`,
tatsächlicher Schaden pro Kugel = `runStats.damage × weapon.damageFactor`.
So bleiben die RATE- und DMG-Tore für alle Waffen wirksam.

### B. Vier getrennte Projektil-Pools, eine Phaser-Gruppe

Der Plan verlangt einen getrennten Pool je Typ. Umsetzung: **eine** `physics.add.group()`
wie bisher, darin vier fest zugeteilte Segmente. Jedes Objekt bekommt beim einmaligen
Anlegen im Konstruktor seinen Waffentyp und seine Textur **fest** zugewiesen und behält
beide bis Spielende.

Vorteile, die diese Bauweise erzwingt und die eingehalten werden müssen:
- **Kein `setTexture()` im Hot Path** — die Textur steht beim Anlegen fest.
- **Ein einziger `physics.add.overlap`** in `GameScene` bleibt bestehen; er muss nicht
  vervierfacht werden.
- Die Suche nach einem freien Projektil läuft **nur im Segment der aktiven Waffe**, nicht
  über alle 328 Objekte.

Warum alle vier Segmente dauerhaft existieren, obwohl immer nur eine Waffe feuert: Beim
Waffenwechsel fliegt die Ladung der alten Waffe noch aus. Sie muss weiterfliegen, treffen
und regulär despawnen. Alle Segmente laufen deshalb in `update()` und in der Kollision
mit, unabhängig davon, welche Waffe gerade aktiv ist. **Nichts beim Wechsel wegräumen.**

### C. Bewegung bekommt zwei Achsen

Heute bewegt `weapons.ts` Projektile nur in Y. Der Schrot-Fächer braucht schräge Bahnen.
Jedes Projektil führt ab jetzt einen Geschwindigkeitsvektor mit (`vx`, `vy`) und wird auf
beiden Achsen bewegt. Beim Standard ist `vx = 0` — das Verhalten bleibt identisch.

Die Bewegung bleibt **manuell** in `update()` wie bisher (`x += vx·dt`, `y += vy·dt`,
danach `body.updateFromGameObject()`). Nicht auf Arcade-Velocity umstellen — die
bestehende Bauweise ist bewusst so und funktioniert.

### D. Despawn-Bedingungen

Ein Projektil wird recycelt, sobald **eine** davon zutrifft:
1. Es hat den oberen Bildrand verlassen (wie bisher).
2. Es hat den linken oder rechten Bildrand verlassen (neu, wegen der Fächerbahnen).
3. Es hat seine **Reichweite** aufgebraucht (neu, nur bei Waffen mit `rangePx > 0`).
4. Es hat getroffen und die Waffe durchschlägt nicht.

Reichweite wird als zurückgelegte Strecke mitgeführt und pro Frame um
`√(vx² + vy²) · dt` erhöht — nicht als Timer, damit sie unabhängig von der Framerate ist.
`rangePx: 0` bedeutet „unbegrenzt, fliegt bis zum Bildrand".

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

### F. Rakete: Flächenschaden ohne Partikelsystem

Beim Einschlag nehmen alle aktiven Gegner innerhalb von `splashRadiusPx` Schaden
(`runStats.damage × splashDamageFactor`), der getroffene Gegner zusätzlich den direkten
Treffer. Umsetzung als Schleife über die aktiven Gegner mit Distanzprüfung — bei höchstens
48 Gegnern ist das unkritisch.

Der Einschlag wird sichtbar durch einen **kurzen Kreis-Flash aus einem eigenen kleinen
Pool** (Größe 12, Herleitung unten). Ein einmalig in `BootScene` erzeugtes Kreis-Sprite,
das beim Einschlag auf `splashRadiusPx` skaliert und über `flashMs` ausgeblendet wird.
**Kein Phaser-Partikelsystem** — das ist eine V1-Regel aus `docs/plan.md`.

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
| Flächenradius | – | – | – | **70 px** (Faktor 1,5) |

Die Schützenzahl je Waffe ist durch `BALANCE.crowd.shootersPerSalvo` (8) nach oben
gedeckelt — dieser Wert bleibt das globale Maximum und wird nicht erhöht.

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

Formel für alle: `gleichzeitig aktiv = Salven/s × Schützen × Kugeln × Flugzeit`.
Die Salvenrate ist durch `BALANCE.stats.shotsPerSec.cap = 8` gedeckelt, multipliziert mit
dem Ratenfaktor der Waffe. Bildhöhe 844 px, Anker bei y = 714.

- **Normal: 96.** 8 Salven/s × 8 Schützen × 1 Kugel × (714 px / 640 px/s = 1,12 s) = 72.
  Unverändert gegenüber heute.
- **Schrot: 112.** 8 × 0,4 = 3,2 Salven/s × 8 Schützen × 7 Kugeln × (280 px / 640 px/s
  = 0,44 s) = 79. Die kurze Reichweite kompensiert die sieben Kugeln fast vollständig.
- **Laser: 96.** 8 × 1,4 = 11,2 Salven/s × 8 Schützen × 1 Kugel × (714 px / 900 px/s
  = 0,79 s) = 71. Der Laser despawnt beim Treffer nicht, fliegt also immer die volle Bahn —
  die Rechnung darf keinen vorzeitigen Abgang unterstellen.
- **Rakete: 24.** 8 × 0,25 = 2 Salven/s × 3 Schützen × 1 Kugel × (714 px / 300 px/s
  = 2,38 s) = 14. Langsam, aber wenige.
- **Einschlag-Flash: 12.** 2 Salven/s × 3 Schützen = 6 Einschläge/s × 0,18 s Sichtbarkeit
  = 1,1 gleichzeitig. 12 ist großzügige Reserve für gleichzeitige Einschläge.

Zusammen 328 Projektile plus 12 Flashes, alle **einmalig im Konstruktor** angelegt.
Inaktive Objekte werden nicht gerendert und nicht von der Physik bewegt; die
`update()`-Schleife überspringt sie mit einem Vergleich. Das ist bewusst so gewählt und
kein Versehen.

Jede dieser Herleitungen gehört als Kommentar an die jeweilige Poolgröße in `balance.ts` —
gleiche Form wie die bestehenden Kommentare.

Die Dev-Konsolenwarnung bei Poolerschöpfung (`warnPoolExhausted`) bleibt und muss
**benennen, welche Waffe** den Pool erschöpft hat. Ein zu kleiner Pool lässt Schüsse still
verschwinden und sähe sonst wie ein Balance-Problem aus statt wie ein Technik-Bug.

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
- Der Wechsel greift **sofort** beim Durchlaufen. Die auslaufende Ladung der alten Waffe
  fliegt weiter (siehe Punkt B).

## HUD

Die aktive Waffe muss jederzeit ablesbar sein, sonst ist nach einem Torwechsel unklar,
womit man schießt.

Zeile 2 des HUD hat heute drei Spalten (DMG, RATE, SPD). Sie wird auf **vier** Spalten
aufgeteilt (Spaltenbreite `panelW / 4`, Positionen bei 0,5 / 1,5 / 2,5 / 3,5), die vierte
zeigt den Waffennamen in der Waffen-Tor-Farbe.

Keine bestehende Anzeige darf dabei verschwinden, abgeschnitten werden oder überlappen.
Bei 390 px Bildbreite ergibt das rund 91 px je Spalte — `SCHROT` bei 15 px Schriftgröße
braucht etwa 55 px und passt.

## Reißleine

**Riskanteste Stelle ist die Framerate am iPhone bei voller Truppe (30 Figuren) plus
Schrot.** Der Waffenwechsel ist dabei der Spitzenmoment: die auslaufende Ladung der alten
Waffe und die neue Waffe sind gleichzeitig in der Luft, in Summe rund 120 Projektile gegen
bis zu 48 Gegner in der Kollisionsprüfung. Das ist die Zahl, an der es bricht — nicht die
Poolgröße.

Ruckelt es bei Thomas' iPhone-Test, in dieser Reihenfolge nachziehen:
1. Schützenzahl für Schrot von 8 auf 5 senken (Pool sinkt auf 72).
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
2. Alle Projektil- und Flash-Objekte werden **einmalig im Konstruktor** angelegt. Kein
   `create()`, `destroy()`, `new Set()` oder `setTexture()` im laufenden Spiel — im Diff
   nachweisbar.
3. Jede Poolgröße steht mit ihrer Herleitung als Kommentar in `balance.ts`.
4. Der Schrot-Fächer besteht aus 7 Kugeln auf schrägen Bahnen und verschwindet nach 280 px.
5. Der Laser durchschlägt und schädigt denselben Gegner **nachweislich nur einmal** pro
   Durchflug; die Identität läuft über die Spawn-Nummer, nicht über die Objektreferenz.
6. Der Raketeneinschlag schädigt Gegner im Radius und zeigt einen Kreis-Flash aus dem
   eigenen Pool. Kein Partikelsystem im Diff.
7. Waffen-Tore erscheinen als jedes vierte Tor, zeigen nie die aktuelle Waffe und nie
   zweimal dieselbe.
8. Die Stat-Tore funktionieren unverändert weiter; `RunStats` und `StatKey` sind nicht
   verändert.
9. Beim Waffenwechsel fliegt die Ladung der alten Waffe zu Ende und trifft weiterhin.
10. Das HUD zeigt die aktive Waffe; DMG, RATE, SPD, TEAM und Münzen bleiben vollständig
    sichtbar und überlappen nicht.
11. `npm run check` und `npm run build` laufen fehlerfrei durch.
12. Keine Requests an fremde Hosts, keine neuen Abhängigkeiten.

**Offen bis zu Thomas' iPhone-Test:** ob es bei voller Truppe plus Schrot flüssig läuft,
ob sich die drei Waffen unterschiedlich anfühlen und ob die Torwahl eine Entscheidung ist.

## Nicht in diesem Task

- **Startwaffe im Menü kaufen** — der Plan nennt das unter „Erwerb", es braucht aber das
  Menü- und Persistenzsystem aus Etappe E5. In E4b ist die Startwaffe immer `NORMAL`.
- E4c (Gegner als Truppen), Hintergrundgestaltung, die HUD-Überlappung beim Torerscheinen.
