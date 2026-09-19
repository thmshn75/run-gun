# Active Task

## Status
`IMPL_DONE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**V5 / E2 — Tor-Paare mit Restwert: die Entscheidung links oder rechts.**

Plan: `docs/plan-v5.md`. E0 (Geruest) und E1 (Masse, inkl. Nacharbeit N1) sind gebaut;
E1 wartet nur noch auf Thomas' Sichtpruefung des Wipptakts, die mit E2 zusammen erfolgt.
E2 fuellt die bisher leere `Torbahn` mit dem Kern des Genres.

### Was der Bestand vorgibt (gelesen)

- **Die Tor-Mechanik existiert vollstaendig** in `src/systems/versuchBahnen.ts`:
  `TorZustand` (Z.~80), Pool von 4 Toren (Z.169), `spawneTor` (Z.331), Bewegung entlang
  der Strasse mit `advanceAlongRoad`/`getRoadSegment`/`getRoadScale` (Z.311-329),
  Treffer = ein Punkt in `damage()` (Z.~380), Durchfahren in `collectPickup` (Z.249) mit
  `getTorStand` und `getTruppeNachTor` (`versuchPlan.ts`), Beschriftung nach Stand
  (`beschrifteTor`, Z.355), Recycling (Z.364). Reine Rechenfunktionen liegen in
  `versuchPlan.ts` und sind ohne Phaser getestet.
- **Die Spawnsperre** (kein Gegner hinter einem Tor, Thomas 2026-09-05) haengt an
  `istImTorFenster` und wird in `GameScene.ts:506` nur hinter
  `this.walls instanceof VersuchBahnen` aufgerufen.
- **Die Truppenaenderung** laeuft ueber `applyReinforcement` (`GameScene.ts:335`):
  `runStats.set('hp', apply(before))` plus Popup. `runStats.set` klemmt ueber
  `clampStat` (`upgrades.ts:160`) am **Level-Cap** `getStatCap('hp', level)` — auf
  Level 20 = 113. **Ohne Aenderung kann kein Tor die Truppe ueber den Level-Cap heben;
  ein ×2 waere ab dem halben Cap wirkungslos** (Befund E1-Review).
- Collider: `syncWallColliders` (`GameScene.ts:588`) legt Projektile auf
  `walls.getWalls()` und die Truppenhuelle auf `walls.getRewards()`, sobald
  `hasActivePair()` wahr ist. `collectPickup` wird ueber `isPickupSegment` erreicht.
- Texturen: `wall-segment-right` (gruen, Stand > 0), `wall-segment-bad` (rot), Label
  als Text. Das Video zeigt Pfeiler und eine flache Platte — **Bilder sind ein eigener
  Folgeschritt (E2b, Codex erzeugt sie)**; E2 laeuft mit den Versuchs-Texturen.

### Die Architekturentscheidung

**`Torbahn` bekommt eine eigene Tor-Implementierung, die die Rechenfunktionen aus
`versuchPlan.ts` wiederverwendet, aber `VersuchBahnen` nicht anfasst.** Grund: Der
Bahnen-Probelauf ist abgenommen und darf sich nicht bewegen; `VersuchBahnen` traegt
zusaetzlich Faesser und die Seitenlogik (rechts Tor, links Fass), die der Torlauf nicht
hat. Was sich sauber teilen laesst, wandert in eine gemeinsame Datei
`src/systems/torObjekt.ts` (Bewegung entlang der Strasse, Beschriftung, Recycling —
**nur, wenn `VersuchBahnen` danach bitgleich weiterlaeuft**; sonst kopieren, und der
Kommentar nennt die Quelle).

---

## A — Der Torlauf-Deckel: die Klemme bekommt einen Override

- `RunStats` (`upgrades.ts`) bekommt ein optionales Feld `hpDeckelOverride?: number`
  mit Setter. `clampStat` bekommt einen optionalen Parameter `capOverride`; ist er
  gesetzt, ersetzt er **fuer `hp`** den Wert aus `getStatCap`. `setRaw`, `Z.262`, `Z.270`,
  `Z.286`, `Z.367` reichen ihn durch, wo `hp` betroffen ist.
- Die Szene setzt ihn **im bestehenden Probe-Zweig** von `stelleEinstiegHer`
  (`GameScene.ts:633`, `if (probe !== undefined)`), hinter `if (this.istTorlauf())`, auf
  `BALANCE.torlauf.crowd.max` (150) — **kein neuer Zweig davor**: Der Torlauf ist eine
  Probelauf-Variante (E0), und `probe.variante` darf nur in `istTorlauf()` gelesen werden
  (E0-Test). `clampStat` hat keine Aufrufer ausserhalb von `upgrades.ts` (gegrept), der
  optionale Parameter reicht. **Im Run, Testgelaende und Bahnen-Probelauf bleibt er
  `undefined`** — ein Test belegt, dass `clampStat` ohne Override bitgleich rechnet.
- Der Startwert der Truppe im Torlauf bleibt wie im Probelauf (Level-Cap x 0,5).

## B — Tor-Paare in der `Torbahn`

- Alle `BALANCE.versuch.tor.abstandPx`-analogen Werte in einem eigenen Block
  `BALANCE.torlauf.tor` mit Rechenweg: `abstandPx` (Vorschlag 900 — dichter als der
  Versuch, das Video zeigt alle ~4 s ein Paar bei unserem Tempo ~135 px/s → 540 px;
  900 laesst Beschusszeit), `hoehePx` 84, `startAnteilMin/Max` 0,25/0,55 (wie Versuch),
  `startMindest` 3, `plusAnteilRest` 0,35, `plusMindest` 3, `gegnerSperreVorPx` 150,
  `gegnerSperreNachPx` 380, `innenkanteAnteil`, `randSpaltPx` (Geometrie wie Versuch).
- **Ein Spawn erzeugt zwei Tore**, eines links, eines rechts, beide auf derselben
  `anchorY`. Pool 8 (4 Paare). Jedes Tor hat `wirkung: { art: 'plus' } | { art: 'mal', faktor: 2 | 3 }`.
- **Restwert** wie im Versuch: Startwert negativ als Anteil der Truppe
  (`getTorStartwert`), ein Treffer ein Punkt, Deckel nach oben `getTorPlusDeckel`
  (Restweg zum **Torlauf-Deckel 150**, nicht zum Level-Cap — `getTruppenDeckel` liefert
  im Torlauf 150).
- **Durchfahren (`collectPickup`)**:
  - `stand < 0` → Truppe + stand (Malus, wie im Versuch, `getTruppeNachTor`).
  - `stand >= 0` und `art: 'plus'` → Truppe + stand.
  - `stand >= 0` und `art: 'mal'` → Truppe × faktor, **geklemmt auf 150** (durch A).
  Danach: **beide Tore des Paars werden recycelt** — die Wahl ist getroffen.
  `TorZustand` bekommt dafuer ein Feld `partner: TorZustand | undefined`, beim Spawn
  gegenseitig gesetzt; `collectPickup` recycelt `tor` und `tor.partner`.
- **Die Wahl faellt ueber die Seite des Truppen-Ankers, nicht ueber die Huelle.**
  Rechnung: `innenkanteAnteil` 0,15 laesst auf Kampfhoehe (Strasse ~300 px) einen
  Mittelstreifen von nur ~45 px; die Torlauf-Huelle ist bis 214 px breit und beruehrt
  deshalb **beide** Tore eines Paars im selben Bild — `crowdPickupCollider` ruft
  `collectPickup` je Ueberlappung auf, beide Wirkungen wuerden gezogen. Deshalb:
  `collectPickup(wall)` wendet die Wirkung **nur** an, wenn das Tor auf der Seite liegt,
  auf der `getCrowdAnchorX()` relativ zur Strassenmitte steht (bei exakt Mitte: rechts);
  fuer das andere Tor liefert es 0 und recycelt nichts — das Ankerseiten-Tor recycelt
  dann beide. Ein Test deckt "Huelle auf voller Breite mittig durchs Paar" ab: genau eine
  Wirkung. `Torbahn` bekommt dafuer `getCrowdAnchorX` injiziert (wie der Spawner).
  Folge: Beide Tore zu verpassen ist im Torlauf **nicht** moeglich — wie im Genre.
- **Paar-Ziehung** (`torPaarZiehen(zufall, truppe)` als reine Funktion in einer neuen
  `torlaufPlan.ts`, getestet — `truppe` wird an `getTorStartwert` durchgereicht, genau wie
  im Versuch; ohne sie ist der Startwert als Truppenanteil nicht rechenbar): Mit `BALANCE.torlauf.tor.malChance` (Vorschlag 0,35)
  ist eines der beiden ein `mal`-Tor (Faktor 2 mit 0,8, 3 mit 0,2), das andere `plus`;
  sonst beide `plus` mit unterschiedlichen Startwerten (der Unterschied ist die
  Entscheidung). Welche Seite das bessere bekommt, ist Zufall. **Deckel Faktor 3**, nie
  mehr (Plan V5).
- **Beschriftung**: `plus`-Tore wie im Versuch (`+12` gruen / `-8` rot). `mal`-Tore
  zeigen `×2` bzw. `×3` in violett (`HUD_COLORS`-Erweiterung) **und** den Restwert
  darunter, solange er negativ ist; bei `>= 0` nur `×2`. Das ist die Lesart des Videos
  (grosse Aufschrift, kleine Zahl darunter).
- **Spawnsperre**: `BahnSystem` bekommt `istTorFenster` als **optionales
  Interface-Member** mit derselben Signatur wie `VersuchBahnen.istTorFenster` (Z.218);
  `Torbahn` implementiert es mit den Torlauf-Werten, `VersuchBahnen` behaelt seins
  unveraendert. Die Abfrage in `GameScene` (heute `instanceof VersuchBahnen`, grep) wird
  `this.walls.istTorFenster?.(…) ?? false` — **kein `in`-Check** (narrowt nicht, `tsc`
  bricht) und **kein Cast**. Ein Test belegt, dass beide Klassen erfasst werden.
- **Collider**: unveraendert ueber `getWalls()` (beide Tore drin) und `isPickupSegment`
  → `collectPickup`. `getRewards()` bleibt leer (keine Faesser im Torlauf).
- **Geometrie**: `torObjekt.ts` bekommt eine eigene `torGeometrie(y, seite)`, die fuer
  `'rechts'` **bitgleich** zur heutigen `VersuchBahnen.torGeometrie` (Z.604) rechnet und
  fuer `'links'` an der Strassenmitte spiegelt (`x = mitte - (innen + aussen) / 2`).
  `VersuchBahnen` behaelt seine private Version; `kontext()`/`BahnRegeln` werden nicht
  geteilt.

## C — Quittung und Zahl

- Beim Durchfahren erscheint das Popup wie im Versuch (`applyReinforcement`-Pfad); bei
  `mal` zeigt es `×2 → 84` (Faktor und Ergebnis). Die grosse Zahl aus E0 tickt mit.

---

## Akzeptanzkriterien

- **A1** `clampStat` rechnet ohne Override bitgleich wie vorher (Test mit Fixtures fuer
  hp auf Level 1, 12, 20). Mit Override 150 klemmt hp bei 150.
- **A2** Im Torlauf steht der Override auf 150; in Run, Testgelaende und Bahnen-Probelauf
  ist er `undefined` (Test ueber den Einstiegspfad).
- **A3** Jeder Spawn liefert ein Paar (links + rechts, gleiche Hoehe). Reine Funktion
  `torPaarZiehen` getestet: Faktor nie ueber 3, `malChance` eingehalten, bei zwei
  `plus`-Toren verschiedene Startwerte.
- **A4** Treffer zaehlen ein Punkt, Beschriftung folgt dem Stand; `mal`-Tore zeigen
  Faktor und Restwert.
- **A5** Durchfahren wendet die Wirkung an (`plus`, `mal`, Malus) und recycelt beide
  Tore des Paars. `mal` klemmt bei 150. Rechentests ueber `collectPickup`-Logik ohne
  Phaser.
- **A6** Spawnsperre greift im Torlauf; `VersuchBahnen` weiterhin (Test auf die
  `in`-Abfrage und beide Klassen).
- **A7** `VersuchBahnen` und `BALANCE.versuch` sind unveraendert (Diff-Test:
  `versuchBahnen.ts` nur, falls Code nach `torObjekt.ts` ausgelagert wurde — dann
  belegen die bestehenden Versuchs-Tests Bitgleichheit).
- **A8** Bot-Messung (Reviewer, DEV-Sonde `window.__runGunMessung.torlaufBot(paare)`
  von Codex geliefert: waehlt immer das bessere Tor und schiesst nur darauf): Ohne
  Gegner waechst die Truppe ueber 6 Paare von 10 auf **60-150**. Mit Gegnern auf Level 5
  liegt der Truppenverlust je Level nicht unter dem Probelauf-Wert (54 %). **Zusaetzlich:**
  Anteil der Paare, bei denen die Truppe schon am 150er-Deckel steht — saettigt sie in
  der ersten Haelfte eines Levels, sind `startAnteil`/`plusAnteilRest` oder der Deckel
  nachzuschaerfen, nicht nur `malChance`; ein frueh gezogenes ×3 darf die Wahl nicht fuer
  den Rest des Levels entwerten.
- **A9** `npm run check`, `npm test`, `npm run build` gruen.
- **A10 (Thomas)** iPhone: Die Wahl zwischen zwei Toren ist lesbar, das Herunterschiessen
  fuehlt sich beantwortet an, ×2 laesst die Masse sichtbar springen. Und N1.4: die
  Truppe wippt im Run-Takt.

## Reissleine (aus dem Plan, die riskanteste Stelle)

Laesst sich die Wahl nach **zwei Sessions** nicht so balancieren, dass "beide Tore
freischiessen" nicht die beste Strategie ist, dann statt Restwert eine **Zeitgrenze**:
Der Pfeiler kippt nur, wenn er vor dem Anflug frei ist, danach ist er verpasst. Nicht
weiterbohren am Restwert.

## Was kein zulaessiger Ersatz ist

- **Nicht** `VersuchBahnen` erweitern oder `BALANCE.versuch` anfassen.
- **Nicht** den Level-Cap fuer hp global aendern — nur der Override im Torlauf.
- **Nicht** Faktor ueber 3.
- **Nicht** die Wirkung auf Schaden/Rate/Truppenbonus legen (Plan V5, Zielkonflikt).
- **Nicht** neue Bilder erzeugen — das ist E2b.
- **Nicht** `instanceof` fuer die Spawnsperre beibehalten, keinen `in`-Check, keinen
  Cast — optionales Interface-Member.
- **Nicht** die Wahl ueber die Huelle entscheiden lassen (beide Tore wuerden ziehen).

---

## Wo die Historie steht

Projektstand: `docs/UEBERGABE.md`, Regeln: `docs/lessons.md`, Plan: `docs/plan-v5.md`.
**Zuletzt abgeschlossen:** V5/E1 sichtbare Masse (inkl. N1 Wipptakt), Commit folgt in
der Uebergabe; E0 Commit `5c0c2dc`.

---

## NACHARBEIT N2 (2026-09-19, nach der Bot-Messung des Reviewers)

**Die Umsetzung ist korrekt; zwei Balance-Annahmen der Spec waren es nicht.** Gemessen
im Browser (Torlauf Level 5, Bot lenkt auf das bessere Tor, keine Gegner, Truppe
startet bei 10): Verlauf je Paar 10 → 50 → 100 → 85 → 77 → **150** → 130 → 122 → 95 → 80.
Nach zwei Paaren bei 100, nach fuenf am Deckel — und **ab dem dritten Paar nur noch
Malus**, obwohl der Bot richtig lenkt (Tore mit -25 bis -59 bei 100+ Figuren).
Trefferrate am Tor nahe am Anker: **24 Treffer/s** (= 8 Schuetzen x Rate 3, jede Kugel
trifft), aber das Tor ist nur ~3-4 s im Schussfeld — ~20-70 Treffer je Anflug.

**Ursache 1 — der Startwert waechst mit der Truppe, die Feuerlinie nicht.** Der
Versuchs-Kommentar ("die Trefferrate waechst mit der Truppe, deshalb kuerzt sich die
Truppe heraus") gilt im Torlauf **nicht**: Hier schiessen immer 8 (Plan-Regel "Masse ist
Leben, nicht Feuer"). Ab ~100 Figuren ist kein Tor mehr freizuschiessen.
**Umbau:** `startwert()` in `torlaufPlan.ts` rechnet den Anteil von
`Math.min(truppe, BALANCE.crowd.max)` (30) — der Feuerlinien-Truppe —, nicht von der
ganzen Truppe. Ergebnis -8 bis -17 wie im abgenommenen Versuch bei 30 Figuren; die
Zeit bis zur Null bleibt ueber alle Truppengroessen konstant. Kommentar am Wert nennt
diese Rechnung.

**Ursache 2 — der Plus-Deckel ist zu gross.** `plusAnteilRest` 0,35 vom Restweg zu 150
ergibt bei 10 Figuren +49 (ein Tor vervierfacht die Truppe). **Umbau:** 0,35 → **0,12**
(bei 10 Figuren +17, bei 100 +6), `plusMindest` bleibt 3.

**Ursache 3 — Saettigung zu frueh.** ×2 bei 77 → 150 nach fuenf Paaren; ein Level hat
~9 Paare (55 s Gegnerphase / 6,7 s). **Umbau:** `malChance` 0,35 → **0,25**, Anteil
Faktor 3 innerhalb `mal` 0,2 → **0,1** (als Wert `malDreiAnteil` in `balance.ts`, nicht
hart in `torPaarZiehen`). Ziel: Saettigung, wenn ueberhaupt, erst in der zweiten
Levelhaelfte; wird per Bot erneut gemessen.

**Qualitaet, zwei Punkte:**
- `GameScene.ts` Weiche in `create()`: Der alte Code steht als `void \`...\``-Template-String
  im Quelltext (Z.~320-328). **Loeschen.** Ein Kommentar "E0-Form der Weiche" ist ebenfalls
  zu entfernen — Git traegt die Historie.
- `src/systems/torbahn.ts` ist in Einzeiler mit Semikolon-Ketten gequetscht (`update()` ist
  eine Zeile mit zehn Anweisungen, der Konstruktor eine mit fuenf). **Umformatieren wie der
  Rest des Projekts** (eine Anweisung je Zeile, Kommentare wie in `versuchBahnen.ts`).
  Kein Verhalten aendern — die Tests muessen unveraendert gruen bleiben.

**Akzeptanz N2:**
- **N2.1** Startwert bei Truppe 10, 30, 100, 150 liegt jeweils in [-17, -8] (Rechentest mit
  festem Zufall).
- **N2.2** `plusAnteilRest` 0,12, `malChance` 0,25, `malDreiAnteil` 0,1 in `balance.ts` mit
  Rechenweg; `torPaarZiehen` liest sie.
- **N2.3** Kein `void`-Template-String in `GameScene.ts`; `torbahn.ts` ohne
  Semikolon-Ketten (Test: keine Zeile mit mehr als zwei `;`).
- **N2.4** `npm run check`, `npm test`, `npm run build` gruen.
- **N2.5 (Reviewer)** Bot-Messung wiederholt: ueber 9 Paare ohne Gegner Wachstum von 10 auf
  60-150, keine Saettigung vor Paar 5, kein Malus bei richtiger Wahl; mit Gegnern Level 5
  Verlust im Korridor.

---

## NACHARBEIT N3 (2026-09-19): Formatierung — der zweite und letzte Anlauf

**N2 ist fachlich richtig** (Bot-Messung: 9 Paare, 10 → 106, kein Malus, keine
Saettigung). Zwei Stellen sind aber unbrauchbar formatiert, und das ist der zweite
Anlauf dafuer — beim naechsten Fehlschlag wird gestoppt und Thomas informiert.

1. **`src/systems/torbahn.ts`:** N2 hat die Semikolon-Ketten mechanisch durch
   Zeilenumbrueche ersetzt — **ohne Einrueckung**, mitten in Methoden, sogar im
   `for`-Kopf (`for (let i = 0;\ni < 8;\ni += 1)`). Der Mustertest "keine Zeile mit
   drei Semikolons" ist gruen und trotzdem ist die Datei unlesbar. **Verlangt ist die
   Form von `versuchBahnen.ts`**: zwei Leerzeichen je Ebene, eine Anweisung je Zeile,
   Bloecke mit Klammern auf eigenen Zeilen, `type TorZustand` mit einem Feld je Zeile
   eingerueckt, Methoden durch Leerzeilen getrennt, kein `;` am Zeilenende (das Projekt
   schreibt ohne). Es gibt keinen Formatter im Projekt — von Hand, nach Vorbild.
   Kein Verhalten aendern; alle Tests bleiben gruen.
2. **`src/systems/torlaufPlan.ts` Z.11:** `Math.max(BALANCE.crowd.max, Math.min(truppe,
   BALANCE.crowd.max))` ist immer `BALANCE.crowd.max`. Das ist fachlich sogar richtig
   (die Feuerlinie ist bei jeder Truppengroesse dieselbe: 8 Schuetzen rotieren ueber
   alle Figuren, die Trefferrate am Tor ist konstant — gemessen 24/s), aber der
   Ausdruck verschleiert es. **Schreiben:** `const feuerlinie = BALANCE.crowd.max` mit
   dem Kommentar, warum die Truppengroesse hier bewusst **nicht** eingeht (`truppe`
   bleibt als Parameter fuer `getTorlaufStand`, der Rechenweg steht daneben).

**Akzeptanz N3:** N3.1 `torbahn.ts` liest sich wie `versuchBahnen.ts` (Test: jede
nicht-leere Zeile innerhalb der Klasse beginnt mit mindestens zwei Leerzeichen; keine
Zeile beginnt mit `this.` oder `tor.` ohne Einrueckung). N3.2 Z.11 wie oben, Test N2.1
bleibt gruen. N3.3 check/test/build gruen.

## Stand des Reviews (2026-09-19)

**Code-Review bestanden nach drei Nacharbeiten** (N2 Balance, N3 Form; N1 gehoerte zu
E1). Torpaare mit Partner-Feld und Wahl ueber die Ankerseite, `hpDeckelOverride` nur
fuer `hp` und nur im Probe-Zweig hinter `istTorlauf()`, Spawnsperre als optionales
Interface-Member (`istTorFenster?.() ?? false`), `VersuchBahnen` bis auf die eine
Interface-Zeile unveraendert, `torlaufPlan.ts`/`torObjekt.ts` als reine Funktionen.
`npm run check`, `npm test` (40 Dateien, 429 Tests), `npm run build` gruen, im Terminal
nachgelaufen.

**A8 — Bot-Messung, selbst durchgefuehrt (Playwright, Vite-Dev, Bot lenkt den Anker auf
das bessere Tor des vordersten Paars, 100-ms-Takt):**

| Lauf | Ergebnis |
|---|---|
| Erste Fassung, Level 5, ohne Gegner, Start 10 | 10 → 50 → 100 → 85 → 77 → **150** → 130 → 122 → 95 → 80: nach 2 Paaren bei 100, nach 5 am Deckel, **ab Paar 3 nur Malus** (Startwerte -25..-59 bei 100+ Figuren, Trefferrate am Tor 24/s, Tor ~3-4 s im Schussfeld) |
| Nach N2, Level 5, ohne Gegner, Start 10 | **10 → 27 → 42 → 55 → 66 → 76 → 85 → 93 → 100 → 106**, 9 Gewinne, 0 Malus, 0 Saettigung, Startwerte -8/-15 |
| Nach N2, Level 5, **mit Gegnern**, Start 24 | 24 → 148 (max 150), Boss besiegt, 18 Gewinne, 0 Malus, **praktisch kein Verlust**, 128 s |

Wachstum ohne Gegner im Zielkorridor. **Das Verlust-Kriterium (≥ 54 % je Level) ist in
E2 nicht erreichbar:** Level-5-Gegner sterben am Beschuss, bevor sie eine 150er-Masse
beruehren; der Gegenspieler der Masse ist die Horde aus E3. Kriterium in `docs/plan-v5.md`
nach E3 verschoben; in E2 nach N2 nicht weiter an der Balance gedreht (Reissleine).
Screenshot des ersten Torpaars im Session-Scratchpad (`nachweis-e2/`).

**Zwei Lehren, beide in `docs/lessons.md` (2026-09-19):** Startwert als Anteil der
ganzen Truppe passt nicht zu einer festen Feuerlinie; und eine Zaehlregel als Formtest
("keine drei Semikolons") wurde mechanisch erfuellt — Form verlangt ein Vorbild.

**Offen: A10 — Thomas' iPhone-Test** (Wahl lesbar, Herunterschiessen beantwortet, ×2
laesst die Masse springen; plus N1.4 Wipptakt). Bis dahin `IMPL_DONE`, nicht `APPROVED`.
**E2b (Pfeiler-Bilder, Codex) bleibt offen.**
