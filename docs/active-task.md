# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**V5 / E2r — Der Strom: im Torlauf sind die Figuren die Kugeln.**

Plan: `docs/plan-v5.md`, Kernmechanik am 2026-09-19 von Thomas bestaetigt: Die Truppe
unten ist die **Quelle** mit N Einheiten und schickt laufend Figuren nach oben; eine
Figur hackt Pfeiler (ein Treffer, ein Punkt, laeuft weiter), wird an einer Platte ×k
vervielfacht, erhoeht an einer +1-Kachel die Quelle. **Kein Schiessen.** E2 (`eb38515`)
hat Torpaare, Restwert, Partner, Ankerseite und den 150er-Deckel gebaut — das bleibt.
E2r tauscht die Kugel gegen die Figur und ergaenzt Platte und +1-Kachel. Horde (E3) und
Boss-Nahkampf (E4) kommen danach. Thomas' Auswahl fuer E5 (2026-09-19): Horde aus der
`standard`-Figur, `heavy` als Hindernisse zwischendurch, am Ende Boss und Elite-Boss —
alles auf Truppengroesse skaliert. **Die Strom-Figuren sind die eigenen Einheiten und
tragen deshalb die Truppentextur `player`.**

### Was der Bestand vorgibt (gelesen)

- `Weapons.fire()`/`update()` (`weapons.ts:183-270`): rotierende Startpunkte aus der
  Truppe (`getSalvoPositions`), spurtreue Bahn ueber `laneRatio`/`laneOriginX`/
  `lateralPx` mit `getLaneRatio`/`getRoadHalfWidth`, Recycling an der Kampflinie.
  `pierces`-Waffen fuehren `hitSpawnIds`, damit ein Projektil dasselbe Ziel nur einmal
  trifft (`GameScene.handleProjectileWallHit`, Z.~995) — genau das Verhalten "hackt und
  laeuft weiter".
- Collider: `syncWallColliders` (Z.~598) legt Projektile auf `walls.getWalls()` und die
  Truppenhuelle auf `getWalls()` (Pickup) und `getRewards()`.
- `WeaponKey` ist ein festes Union mit `WEAPON_KEYS`, Shop-Sortierung, Staffelungs- und
  Preis-Tests. **Eine neue "Waffe" dort einzuhaengen wuerde den Run beruehren.**
- `Torbahn` (E2): Tore mit `wirkung`, `startwert`, `treffer`, `partner`, `istAnkerseite`,
  `collectPickup` (Huelle), `damage` (ein Punkt). `hasActivePair()` steuert die Collider.
- Die grosse Zahl (E0) zeigt `runStats.hp` = N.

### Die Architekturentscheidung

**Der Strom ist ein eigenes System `Strom` (`src/systems/strom.ts`) mit eigenem
Sprite-Pool und eigener Physik-Gruppe.** Er benutzt die freien Funktionen des
Projektilpfads (`getLaneRatio`, `getRoadHalfWidth`, `getLaneSlope`) und kopiert die drei
Zeilen der Spurbewegung aus `weapons.ts:206-210` mit Quellenangabe — **`Weapons` und
`WeaponKey` werden nicht angefasst.** Im Torlauf wird `Weapons` stillgelegt (neuer
Schalter `setFeuerAktiv(false)`, der `update()` nur noch Projektile bewegen, aber nicht
mehr `fire()` laesst) und das Waffen-HUD (`hud.weapon`, Z.1716) ausgeblendet.

---

## A — Die Quelle schickt Figuren los

- `Strom` wird in `create()` **nur im Torlauf** angelegt (im selben Zweig wie die
  `Torbahn`) und in `update()` nach `walls.update` bewegt.
- **Rate:** `figurenProSek = min(N, torlauf.strom.deckelEinheiten) x
  torlauf.strom.figurenJeEinheitProSek`, N = `runStats.hp`. Vorschlag Deckel 60,
  0,4/s → N=10: 4/s, N≥60: 24/s (Rechenweg: 24/s entspricht der heutigen Trefferrate
  von 8 Schuetzen x Rate 3, die Thomas im Versuch als gut abgenommen hat). Ein
  Akkumulator wie `fireAccumulatorMs`, kein `setTimeout`.
- **Startpunkt:** rotierend ueber die aktive Formation (`crowd.getNextSalvoPositions(1)`
  liefert die Ruheposition der naechsten Figur).
- **Bewegung:** `y -= tempoPxPerSec x dt`, `x` spurtreu (Formel aus `weapons.ts`), Tempo
  `torlauf.strom.tempoPxPerSec` **260** (Scroll 135-305 px/s je Level; 260 laesst die
  Figur auf Level 1-12 sichtbar vorwaerts laufen und auf hohen Leveln fast stehen —
  Balance-Stellschraube, im Kommentar so benannt). Recycling am Horizont
  (`BALANCE.road.horizonY`) oder am Rand.
- **Darstellung:** Textur `player` (dieselbe wie die Truppe — es sind ihre Einheiten),
  Skalierung wie die Torlauf-Truppe (`figureTextureScale x torlauf.crowd.figureScale`),
  keine Einfaerbung, Laufhub gerechnet wie bei der Truppe (`getBobOffsetPx` mit
  Phasenversatz je Poolplatz), Depth `layers.gameplay`.
- **Pool `pools.strom`, hergeleitet:** 24 Figuren/s x Flugzeit (Anker 624 → Horizont
  ~120 = 500 px bei 260 px/s ≈ 1,9 s) = 46, x groesster Plattenfaktor 3 = 138; **200**
  laesst 45 % Reserve. Ueberlauf: keine neue Figur, DEV-Warnung wie
  `warnPoolExhausted`, nie stumm.

## B — Beruehrung: Pfeiler, Platte, +1-Kachel

Collider `strom.getGroup()` ↔ `walls.getWalls()` (nur im Torlauf), Handler
`handleStromTreffer(figur, wall)` in `GameScene`. **Der Verteiler `handleCombatOverlap`
(Z.~1053) kennt heute nur zwei Faelle: Projektil (`getData('weapon')`) und
Truppenhuelle — eine Strom-Figur fiele durch, und kein isolierter Handler-Test merkt
es.** Deshalb: Strom-Figuren tragen `setData('strom', true)`, und `handleCombatOverlap`
bekommt **vor** den beiden bestehenden Zweigen einen dritten, der bei
`findObjectWithData(first, second, 'strom')` direkt `handleStromTreffer` aufruft. Ein
Test belegt den Dispatch ueber `handleCombatOverlap`, nicht nur ueber den Handler.

- **Pfeiler** (`Torbahn`-Tor mit `stand < 0`): `walls.damage(wall, 1)` — ein Punkt.
  Die Figur merkt sich die `spawnId` (Set wie `hitSpawnIds`) und **laeuft weiter**; ein
  zweiter Treffer am selben Pfeiler zaehlt nicht.
- **Platte `mal`** (`stand >= 0`, `wirkung.art === 'mal'`): die Figur laeuft durch;
  `Strom.vervielfache(figur, faktor - 1)` spawnt Kopien an derselben Stelle mit
  seitlichem Versatz (`torlauf.strom.kopieVersatzPx` 6), gleicher Spur. Die Figur merkt
  sich die `spawnId` — **und jede Kopie bekommt beim Erzeugen dieselbe Markierung** in
  ihr (geleertes) Set, sonst ueberlappt die Kopie im naechsten Bild dieselbe Platte und
  vervielfacht sich exponentiell. Ein Test: eine Figur, eine ×3-Platte, drei Bilder →
  genau drei Figuren. **Die Platte bleibt liegen**, bis sie aus dem Bild ist, und
  vervielfacht jede Figur — das ist die ×88-Wirkung des Videos. Das Partner-Tor
  verfaellt beim ersten Durchlauf (Recycling ueber `partner`).
- **Platte `plus`** (`stand >= 0`, `wirkung.art === 'plus'`): die **erste** Figur, die
  durchlaeuft, loest `applyReinforcement(n => min(150, n + stand))` aus; danach werden
  Tor **und** Partner recycelt. (Im Video gibt es nur ×-Platten und +1-Kacheln; das
  +N-Tor bleibt als Paar-Alternative erhalten, wirkt aber einmalig.)
- **Verpasster Pfeiler** (`stand < 0`, erreicht die Quelle): **nichts** — kein Malus
  mehr. `Torbahn.collectPickup` bekommt **am Funktionsanfang** einen Guard, der im
  Torlauf sofort zurueckkehrt (0) — **nicht** nur den Rueckgabewert verwerfen: die
  Funktion enthaelt heute den `applyReinforcement`-Aufruf mit ×-Faktor auf die Quelle
  (`torbahn.ts:102-113`), und der darf nie mehr laufen. Ausloeser bleibt allein der
  bestehende `crowdPickupCollider`-Kontakt; **keine zweite Pruefung in `update()`.**
  Das Paar wird beim Huellen-Kontakt recycelt (beide Tore), ohne Wirkung.
- **Nie zwei ×-Platten im selben Flugfenster.** Zwei ×3-Platten innerhalb einer
  Flugstrecke ergaeben Faktor 9 und 410 Figuren gegen Pool 200 — Ueberlauf als
  Normalfall. Deshalb: `torPaarZiehen` bekommt `pxSeitLetztemMal` und zieht `mal` nur,
  wenn `pxSeitLetztemMal >= torlauf.tor.malMindestabstandPx` (Vorschlag **1100**, mehr
  als die doppelte Flugstrecke von 500 px, damit auch eine spaet liegende Platte aus dem
  Bild ist). Die `Torbahn` fuehrt den Zaehler. Rechentest: Folge von Ziehungen erzeugt
  nie zwei `mal` innerhalb 1100 px.
- **+1-Kachel:** neues Objekt in der `Torbahn`, Kette am **linken Rand** wie die
  Sammelbahn (`walls.ts`-Vorbild, Textur `wall-pickup`-artig, Beschriftung `+1`),
  gespawnt alle `torlauf.kachel.abstandPx` (Vorschlag 140) auf der linken Randspur,
  Pool 12 (Anflugstrecke 500 px / 140 px = 4 gleichzeitig, 12 Reserve fuer Level-Tempo).
  Beruehrt eine Strom-Figur eine Kachel: Quelle +1 (`applyReinforcement`), Kachel
  recycelt, Figur laeuft weiter. Die Kacheln liegen in `getWalls()` (Handler
  unterscheidet ueber `Torbahn.istKachel`).
- **Quittung:** Popups wie bisher (`+1`, `+12`, `×2`), an der Stelle der Beruehrung.

## C — Was im Torlauf aus ist

- `Weapons.setFeuerAktiv(false)` im Torlauf-Zweig von `create()`; `hud.weapon`
  unsichtbar; `updateHud` schreibt DMG/RATE weiter (unschaedlich).
- **Gegner-Nachschub aus:** `Spawner.resetForLevel()` setzt `spawningEnabled = true`
  (`spawner.ts`, geprueft) und wird in `startLevel()` (Z.~1661) bei jedem Level gerufen.
  Deshalb steht **direkt danach** im Torlauf-Zweig von `startLevel()`
  `this.spawner.setSpawningEnabled(false)` — unabhaengig davon, was `resetForLevel`
  tut. Ein Test belegt es fuer Level 1 **und** Level 2.
- **Levelende, Zwischenloesung bis E3/E4:** Ohne Waffen kann der Boss nicht besiegt
  werden. Im Torlauf springt `updateLevelPhase` nach der Gegnerphase **direkt auf
  `cleared`** (kein `warning`, kein `boss`). **`currentLevel += 1` und
  `syncBossColliders()` passieren heute nur in `handleBossDefeated()`** (Z.~1394) — der
  Torlauf-Sprung uebernimmt deshalb als eigener, kommentierter Block dieselben Schritte
  (`currentLevel += 1`, `syncBossColliders()`; `speichere` sperrt im Torlauf ohnehin),
  ruft aber `handleBossDefeated` **nicht** auf. Tests: Run/Probelauf laufen weiter
  `warning → boss`; im Torlauf nimmt `levelPhase` **nie** den Wert `'boss'` an; das
  Level zaehlt nach `cleared` hoch.
- **Keine Niederlage in E2r — bewusst.** Ohne Gegner und ohne Malus sinkt N nie; der
  Torlauf endet nur ueber ZURUECK INS MENUE. Das ist der Zwischenzustand bis E3 (die
  Horde frisst die Quelle). Im Kommentar am `cleared`-Sprung benennen.
- **Zaehler fuer den Bot:** `Torbahn` fuehrt `paareVerbraucht` (je Recycling eines
  Paars +1), im DEV-Build lesbar — A10 zaehlt Paare darueber, nicht ueber N.

## D — Balance-Block und Sonde

`BALANCE.torlauf.strom` (`deckelEinheiten`, `figurenJeEinheitProSek`, `tempoPxPerSec`,
`kopieVersatzPx`), `BALANCE.torlauf.kachel` (`abstandPx`), `pools.strom`, `pools.kacheln`
— je mit Rechenweg. DEV-Sonde bleibt; der Reviewer faehrt den Bot selbst.

---

## Akzeptanzkriterien

- **A1** Im Torlauf feuert keine Waffe (Test: `Weapons.update` ruft `fire()` bei
  `feuerAktiv=false` nicht; Quelltext-Muster fuer den Schalter im Torlauf-Zweig). Run,
  Testgelaende, Bahnen-Probelauf feuern unveraendert (Rechentest ohne Schalter).
- **A2** Der Strom sendet mit der hergeleiteten Rate (Rechentest: N=10 → 4/s, N=60 →
  24/s, N=150 → 24/s), Figuren laufen spurtreu (Rechentest der x-Formel gegen
  `weapons.ts`-Werte bei zwei y).
- **A3** Pfeiler-Treffer: ein Punkt je Figur und Pfeiler, Figur laeuft weiter (Test
  ueber den Handler mit Stub-Objekten: zwei Ueberlappungen derselben Figur am selben
  Pfeiler = ein Treffer).
- **A4** Platte `mal`: `faktor - 1` Kopien je durchlaufender Figur, Pool-Deckel
  eingehalten (Test: bei vollem Pool keine Kopie, Warnung gezaehlt). Platte `plus`:
  einmalig, beide Tore weg.
- **A5** +1-Kachel: Quelle +1, Kachel weg, Figur weiter (Test).
- **A6** Kein Malus mehr: Huellen-Kontakt mit einem Tor aendert N nicht (Test).
- **A7** Gegner-Nachschub im Torlauf aus; Level endet nach der Gegnerphase mit
  `cleared`; Run/Probelauf unveraendert `warning → boss` (Test).
- **A8** `pools.strom` 200 und `pools.kacheln` 12 mit Rechenweg; Ueberlauf warnt.
- **A9** `npm run check`, `npm test`, `npm run build` gruen. `VersuchBahnen`, `Weapons`
  (bis auf den Schalter), `BALANCE.weapon`, `WEAPON_KEYS` unveraendert.
- **A10 (Reviewer)** Bot-Messung: Quelle 10, ohne Horde: ein Pfeiler mit -12 faellt in
  ≤ 4 s; ueber 9 Paare (`paareVerbraucht`) waechst N auf 40-120 (weniger als E2, weil +N
  einmalig und × nur den Strom trifft — die Quelle waechst jetzt ueber +1-Kacheln und
  +N); Bildzeit ≤ 16,7 ms **im Lastfall N=60 mit einer ×3-Platte im Bild** (Pool-Spitze
  ~138), gezielt herbeigefuehrt, nicht abgewartet.
- **A11 (Thomas)** iPhone: Der Strom liest sich als losgeschickte Einheiten, Pfeiler
  fallen sichtbar unter dem Strom, ×2 verdoppelt die Dichte, +1 zaehlt hoch. Und N1.4.

## Reissleine

**Pool-Ueberlauf:** Meldet die DEV-Warnung im Lastfall regelmaessig Ueberlauf oder
zeigt der Strom sichtbare Luecken, dann `malMindestabstandPx` erhoehen oder
`deckelEinheiten` senken — **nicht** den Pool hochsetzen.

Traegt die spurtreue Bewegung oder der Collider die Figuren nicht in **einer Session**,
dann Treffer per Rechteckvergleich (`rectangles.ts`) statt Arcade-Overlap — nicht das
Waffensystem umbauen. Wird die Quelle ueber +1 und +N zu langsam (A10 unter 40), dann
`figurenJeEinheitProSek` oder `kachel.abstandPx` drehen, nicht die Platte auf die
Quelle wirken lassen.

## Was kein zulaessiger Ersatz ist

- **Nicht** einen `WeaponKey 'strom'` anlegen (Shop, Staffelung, Preise, Tests).
- **Nicht** die Kugeln im Torlauf behalten.
- **Nicht** `VersuchBahnen`, `BALANCE.versuch`, `BALANCE.weapon` anfassen.
- **Nicht** ×-Platten auf die Quelle wirken lassen — sie vervielfachen den Strom.
- **Nicht** den Boss im Torlauf mit Kugeln bekaempfbar lassen; die Zwischenloesung ist
  das Ueberspringen, die Abloesung E3/E4.
- **Nicht** Bilder erzeugen — Pfeiler-Bilder sind E2b.

---

## Wo die Historie steht

Projektstand: `docs/UEBERGABE.md`, Regeln: `docs/lessons.md`, Plan: `docs/plan-v5.md`.
**Zuletzt abgeschlossen:** E2 Torpaare (`eb38515`), am 2026-09-19 durch die
Kernmechanik-Korrektur ueberholt; E2r baut darauf auf.
