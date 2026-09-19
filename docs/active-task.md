# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**V5 / E0 — Modus-Geruest TORLAUF: ein zweiter Probelauf, der nichts speichert und die
Truppenzahl gross zeigt.**

Plan: `docs/plan-v5.md`, von Thomas am 2026-09-19 freigegeben. E0 ist das Fundament fuer
E1-E5; hier wird **nur das Geruest** gebaut — keine Tore, keine Horde, keine Masse. Der
Torlauf spielt sich in E0 wie der echte Run auf dem gewaehlten Startlevel, nur ohne
Waende und ohne Speichern, und mit einer grossen Zahl ueber der Truppe.

### Die Architekturentscheidung, die diesen Task klein macht

**Der Torlauf ist eine Variante des Probelaufs, kein dritter Einstieg.** Das Feld
`this.probe` (GameScene Z.235) wird um eine Variante erweitert:

```ts
private probe: { readonly startLevel: number; readonly variante: 'bahnen' | 'torlauf' } | undefined
```

`istProbelauf()` bleibt `this.probe !== undefined` und ist damit **auch im Torlauf wahr**.
Folge: Alle vierzehn Sonderstellen aus der Probelauf-Tabelle (Commit `fc704e3`,
`docs/active-task.md` Z.63-81) greifen automatisch — Speicher-Waechter (`speichere`,
Z.889), Konto nur im Speicher (`bucheMuenzenAufsKonto`, Z.1393), Probe-Ende statt
GameOverScene (`triggerGameOver`, Z.1267), Shop-Kauf gegen `kontoStand` (Z.1518),
ZURUECK-INS-MENUE (Z.1564), `shopZustand.probelauf` (Z.1416). **Keine dieser Stellen
wird angefasst.** Der Test `probelauf.test.ts` ("haengt am unveraenderlichen probe-Feld",
genau eine Zuweisung `this.probe = ` in `init`) bleibt gueltig und **muss gruen
bleiben** — er ist der Waechter dafuer, dass der Torlauf den Spielstand nicht anfasst.

Neu ist ein zweiter Schalter, der nur die Variante liest:

```ts
private istTorlauf(): boolean { return this.probe?.variante === 'torlauf' }
```

**Was kein zulaessiger Ersatz ist:** ein eigener `einstieg: 'torlauf'` mit eigenem
Feld und eigenem Nachbau der Tabelle. Das waere die Angriffsflaeche, vor der die
Probelauf-Spec gewarnt hat ("ein vergessener Pfad wuerde Bennis echten Lauf
ueberschreiben").

---

## A — Einstieg und Menue

- `MenuScene`: neben `PROBELAUF` ein Knopf `TORLAUF`. Er oeffnet dieselbe
  Startlevel-Wahl (`zeigeProbelaufWahl`, Z.477, als Vorlage — parametrisiert ueber die
  Variante, **nicht** kopiert), Titel "TORLAUF", Text: "Tore, Masse und Horde nach dem
  Genre-Vorbild. Es wird nichts gespeichert." Start wie `starteProbelauf` (Z.515/524),
  aber mit `einstieg: 'probe', probeVariante: 'torlauf'`.
- `GameScene.init` (Z.241): liest `probeVariante` (Standard `'bahnen'`, damit der
  bestehende Probelauf-Aufruf unveraendert funktioniert) und legt sie in `this.probe`
  ab — in derselben einen Zuweisung, die es heute gibt, **als eine Zeile**
  `this.probe = data.einstieg === 'probe' ? { ... } : undefined`. `probelauf.test.ts`
  zaehlt Zeilen mit `this.probe = ` und verlangt genau eine; ein Zeilenumbruch vor dem
  Ternary wuerde den Test irrefuehrend rot machen. Bei Bedarf Startlevel vorher in
  eine `const` ziehen, damit die Zeile kurz bleibt.
- `stelleEinstiegHer` (Z.623): der Probe-Zweig gilt unveraendert fuer beide Varianten
  (Startlevel, Truppe wie beim Weiterspielen, Startwaffe).

## B — Bahnsystem `Torbahn` (leer)

- Neue Datei `src/systems/torbahn.ts`, Klasse `Torbahn implements BahnSystem`
  (`versuchBahnen.ts` Z.61-75). In E0 **leer, aber vollstaendig** — das Interface hat
  **fuenfzehn** Methoden, und die Szene ruft alle bis auf eine unbedingt auf
  (`grep "this.walls."`): `getWalls()` und `getRewards()` liefern je eine **eigene
  leere `scene.physics.add.group()`** (sie gehen in `addCombatOverlap`, Z.579-590 —
  `undefined` dort crasht im ersten Bild), `hasActivePair()` `false`,
  `getWallPresence` `{ left: false, right: false }`, `isWall`/`isPickupSegment`/
  `isReward`/`isDrainSegment` `false`, `collectPickup` 0, `collect` `undefined`,
  `damage` `false`, `update`/`deactivateAll`/`resetForLevel` tun nichts,
  `getSegmentHeight` 0. Der Konstruktor nimmt die Szene (fuer die Gruppen), sonst
  nichts. `istTorFenster` steht **nicht** im Interface; die Szene ruft es nur hinter
  `this.walls instanceof VersuchBahnen` (Z.506) auf — im Torlauf laeuft dieser Block
  still leer, das ist in E0 gewollt (keine Tore, keine Spawnsperre). Kommentar am
  Kopf der Klasse nennt E2/E3 als das, was hier einzieht.
- Weiche in `create()` (Z.316): **die drei Zweige bilden EINE Kette**
  `if (this.istTorlauf()) { this.walls = new Torbahn(this) } else if (this.nutztBahnen()) { ... } else { ... }`.
  **Kein eigenstaendiges `if` davor** — `nutztBahnen()` ist im Torlauf ebenfalls wahr
  und wuerde `this.walls` sofort wieder mit `baueVersuchsBahnen()` ueberschreiben; der
  Torlauf haette dann Waende, und kein Test wuerde es merken. Die Inhalte der beiden
  bestehenden Zweige bleiben Zeile fuer Zeile.
- `nutztBahnen()` (Z.772) bleibt **unveraendert** `istTestgelaende() || istProbelauf()`
  — und ist damit im Torlauf wahr. Das steuert laut Kommentar zwei weitere Dinge:
  `setVersuchsBahnen` (Gegner kommen von rechts) und `setSpawnSperre` (kein Gegner
  hinter einer Wand). **Im Torlauf sollen die Gegner von oben kommen wie im Run**
  (im Video kommt alles frontal). Deshalb: `this.spawner.setVersuchsBahnen(this.nutztBahnen() && !this.istTorlauf())`
  an der einen Stelle (Z.~310). Die Spawnsperre ist in E0 ohne Wirkung (keine Tore) und
  bleibt, wie sie ist.
- `bahnRegeln()` (Z.776) wird im Torlauf nie gebraucht (die Torbahn nimmt keine
  Regeln). Nicht anfassen.

## C — Die grosse Truppenzahl

- Ein Text ueber der Truppe, zentriert auf `crowd.getAnchorX()`, in Hoehe der
  vordersten Reihe minus einem festen Abstand (`BALANCE.torlauf.zahlAbstandPx`), Stil
  wie `bossBarText` (Z.449: system-ui, fett, weiss mit dunklem Rand), aber groesser
  (`BALANCE.torlauf.zahlFontPx`, Vorschlag 28). Inhalt: `runStats.get('hp')` gerundet.
- `setText()` **nur bei Aenderung** (Vorlage `updateBossBar`, Z.1648). Position jedes
  Bild nachfuehren (die Truppe lenkt).
- **Nur im Torlauf sichtbar.** Im Run, Testgelaende und Bahnen-Probelauf existiert das
  Objekt, ist aber unsichtbar — kein Abzweig im HUD-Aufbau, nur `setVisible(istTorlauf())`
  einmal in `create()`.
- Depth ueber der Truppe, unter den Popups.

## D — Overlay und Texte

- `beendeProbelauf` (Z.~1262): Overlay-Text `PROBELAUF VORBEI` wird im Torlauf zu
  `TORLAUF VORBEI`. Eine Stelle, ein Ternary.
- Sonst keine Textaenderung.

## E — Balance-Block

`BALANCE.torlauf` als neuer Block, in E0 nur mit `zahlFontPx` und `zahlAbstandPx`,
jeweils mit Rechenweg als Kommentar. Kopfkommentar nennt `docs/plan-v5.md` und dass
E1 (`crowd`-Werte) und E2/E3 hier einziehen. **`BALANCE.crowd`, `BALANCE.versuch` und
alle anderen Bloecke bleiben unveraendert.**

---

## Akzeptanzkriterien

- **A1** Menue zeigt `TORLAUF` neben `PROBELAUF`; beide oeffnen die Startlevel-Wahl mit
  passendem Titel und Text.
- **A2** `this.probe` hat genau eine Zuweisung, in `init`; `istProbelauf()` bleibt
  `this.probe !== undefined`. `tests/probelauf.test.ts` ist **unveraendert und gruen**.
- **A3** Ein Torlauf schreibt nichts in den Spielstand: Ein Test belegt, dass
  `speichere()` im Torlauf sperrt, `triggerGameOver` in `beendeProbelauf` faellt und
  `bucheMuenzenAufsKonto` nicht aus `loadSave()` liest — **ueber `istProbelauf()`, nicht
  ueber neue Abfragen.** Zusaetzlich der Browser-Nachweis wie beim Probelauf
  (2026-09-15): Torlauf spielen, Level schaffen, Muenzen sammeln, ins Menue — Laufstand,
  Konto und Bestenliste im Menue unveraendert. Ergebnis in den Abschlussbericht.
- **A4** Der bestehende Probelauf (`PROBELAUF`-Knopf) verhaelt sich exakt wie vorher:
  gleiche Bahnen, gleiche Regeln, Gegner von rechts. Ein Test belegt die Weiche in
  `create()` als if/else-if/else-Kette (Quelltextmuster) **und** dass im Torlauf
  `this.walls` eine `Torbahn` ist und im Bahnen-Probelauf eine `VersuchBahnen`
  (Verhaltenstest ueber die Klassenzuordnung, nicht nur Muster).
- **A5** Im Torlauf gibt es keine Waende, keine Faesser, keine Tore; Gegner kommen von
  oben wie im Run; Boss, Level, Shop und Muenzen laufen wie im Bahnen-Probelauf.
- **A6** Die Truppenzahl steht gross ueber der Truppe, folgt ihr beim Lenken, aendert
  sich mit jedem Zugang und Verlust und ist ausserhalb des Torlaufs unsichtbar.
  `setText` nur bei Aenderung — ein Test belegt es.
- **A7** `BALANCE.crowd`, `BALANCE.versuch`, `BALANCE.stats` und `BALANCE.walls` sind
  unveraendert. Keine Balance-Zahl geaendert.
- **A8** `npm run check`, `npm test`, `npm run build` gruen.
- **A9 (Thomas)** iPhone: Torlauf startet aus dem Menue, spielt sich wie der Run ohne
  Waende, die Zahl ist lesbar und stoert nicht, und nach dem Torlauf ist im Menue alles
  wie vorher. **Gilt erst nach Thomas' Test am echten iPhone; der Abschlussbericht
  meldet A9 nicht als erledigt, der Desktop-Preview zaehlt nicht.**

## Reissleine

E0 ist Konfiguration und Kopie. **Dauert es laenger als eine Session**, ist etwas am
Ansatz falsch — dann nicht weiterbohren, sondern im Abschlussbericht benennen, welche
Sonderstelle sich der Variante verweigert. Kein Nachbau der Tabelle als Ausweg.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Projektstand: `docs/UEBERGABE.md`, Regeln:
`docs/lessons.md`, Plan: `docs/plan-v5.md`.

**Zuletzt abgeschlossen:** ABWECHSLUNG IN DEN BEWEGUNGEN, Commit `25b4ac7`, am
2026-09-19 von Thomas abgenommen.

## Stand des Reviews (2026-09-19)

**Code-Review bestanden.** Torlauf als Probelauf-Variante (`probe.variante`),
`istProbelauf()` woertlich unveraendert, Weiche in `create()` als eine
if/else-if/else-Kette, `Torbahn` mit allen fuenfzehn Interface-Methoden und leeren
Physik-Gruppen, Menue mit drei Knoepfen im geteilten Slot, grosse Zahl mit `setText`
nur bei Aenderung, `BALANCE.torlauf` mit zwei Werten. `probelauf.test.ts` unveraendert.
Nachgezogen im Review: `tests/torlauf.test.ts` prueft jetzt zusaetzlich, dass
`probe.variante` genau einmal gelesen wird, in `istTorlauf()` (A3).

`npm run check`, `npm test` (38 Dateien, 408 Tests), `npm run build` gruen, im Terminal
nachgelaufen.

**Browser-Nachweis Speicherschutz (A3), selbst durchgefuehrt, Playwright, Vite-Dev,
Viewport 390x844:** Spielstand gesetzt mit Konto 777, Hoechstlevel 7, ein
Bestenlisten-Eintrag, Meta-Stufen 2/1; Menue zeigte "KONTO ¢ 777" und "1. ¢ 777 LEVEL 7".
Torlauf Level 5 gestartet (`einstieg: 'probe', probeVariante: 'torlauf'`): `this.walls`
ist `Torbahn`, Truppe 24, Zahl "24" sichtbar und mitlaufend, 15 aktive Gegner von oben
ueber die volle Breite (x 155-231, y 109-214), keine Waende, HUD-Konto im Lauf 821
(777 + 44 gesammelt). Lauf endete durch Tod der Truppe, zurueck im Menue: Konto 777,
Bestenliste unveraendert, kein offener Run, `localStorage` byte-gleich mit der
Referenz vor dem Lauf. 0 Konsolenfehler. Screenshots im Session-Scratchpad
(`nachweis-e0/`).

**Angemerkt, nicht behoben:** Die Zahl liegt auf `layers.gameplay + 1`, die
Truppenreihen auf `gameplay + row`; im Screenshot stand sie frei ueber der Truppe. Faellt
am iPhone eine Ueberdeckung durch hintere Reihen auf, ist die Depth auf
`gameplay + 1.9` (unter den Popups bei +2) zu heben — eine Zahl.

**A9 am 2026-09-19 von Thomas abgenommen** ("mach weiter mit E1"; sein Befund "nur mein Mann und die Gegner" ist genau der E0-Zuschnitt).
