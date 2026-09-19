# Run & Gun — Umsetzungsplan V5 (TORLAUF: zweiter Probelauf nach dem Genre-Video)

Status: **FREIGEGEBEN von Thomas am 2026-09-19 ("go").** Zuschnitt: "so nah als
moeglich an dem Video", Truppendeckel faellt nur im neuen Modus. E0 ist der erste Task. Der bestehende
PROBELAUF bleibt unveraendert; der neue Modus kommt **zusaetzlich**.

Die Regeln aus V1-V4 gelten unveraendert: Objekt-Pools mit hergeleiteten Groessen, alle
Tuning-Werte in `balance.ts` mit Rechenweg, keine externen Requests, keine Kosten,
Reissleinen benennen, was **kein** zulaessiger Ersatz ist, Bilder erzeugt Codex, Gamefeel
gilt erst nach dem iPhone-Test. Jede Etappe endet spielbar auf `main`. **Es gibt weiter
eine einzige Zahl, die den Gesamtvorsprung deckelt (`stats.totalBoostCap`, V4)** — auch
der neue Modus rechnet dagegen.

## Ausloeser

Thomas' Genre-Video vom 2026-09-19 (`Downloads/111.mov`, Facebook-Anzeige "Top Lords",
Machart Count Masters). Auswertung Bild fuer Bild (Kontaktbogen und Ausschnitte im
Session-Scratchpad; hier das Ergebnis):

1. **Tor-Pfeiler mit Restwert.** Links steht ein grosser Pfeiler "×88" mit einer kleinen
   Zahl darunter (9 → 8 → 6 → 3). Die Truppe **schiesst** darauf, die Zahl sinkt, bei 0
   kippt der Pfeiler und zerbricht; am Boden bleibt eine flache "×88"-Platte, durch die
   die Truppe laeuft und sich vervielfacht (von ~3 Figuren auf eine hellblaue Masse).
   Das ist **unsere Tor-Logik aus dem Zwei-Bahnen-Versuch** (`getTorStand`: ein
   Treffer ist ein Punkt) — nur ist die Wirkung dort Addition, hier Multiplikation.
2. **Randstreifen "+1" links, "+99" rechts**, als Kette kleiner Kacheln entlang beider
   Bahnraender. Das ist **unsere linke Sammelbahn** (`walls.ts`: "+1"-Plaettchen ohne
   Lebenspunkte, Einsammeln durch Beruehrung).
3. **Die Gegnerhorde ist eine rote Flaeche ueber die ganze Bahn mit einer Zahl**
   (858). Die Truppe rennt hinein, beide Zahlen schmelzen: 858 → 792 → 695 → 600 → 505
   → 402 → 310 → 229 → 147 → 63 → 0, waehrend die blaue Masse sichtbar schrumpft.
   Bei uns wird geschossen statt gerannt — das aendert die Darstellung, nicht das
   Prinzip: eine **beschiessbare Flaeche mit Lebenspunktzahl, die bei Beruehrung
   Figuren frisst**. Beides gibt es in `walls.ts` getrennt (rechte Segmente mit
   Lebenspunkten; rote linke Plaettchen, die Figuren abziehen). Die Horde ist die
   Vereinigung beider ueber die volle Breite.
4. **Boss mit Lebenspunktzahl ueber dem Kopf** (4000 → 3719 → 2691 → 2005), rueckt
   auf die Truppe vor. Das ist **unser Boss** samt der am 2026-09-19 gebauten Zahl.
5. **Die Truppe ist eine sichtbare Masse**, die waechst — im Video Hunderte winziger
   Figuren, acht Reihen tief, fast volle Bahnbreite. Bei uns endet die Anzeige bei 30
   (`crowd.max`, `pools.crowd`, `maxWidthRatio` 0,2) — offener Punkt 1 der Uebergabe,
   **von Thomas am 2026-09-19 fuer diesen Modus entschieden: der Deckel faellt.**

**Die erste Einschaetzung ("Zahlenkampf bricht mit dem Kollisionsmodell") war zu
pessimistisch.** Alle fuenf Bausteine haben ein Gegenstueck im Spiel; neu ist die
Verknuepfung, die Multiplikation und die Masse.

## Der Zielkonflikt, der alles bestimmt: Masse ist Leben, nicht Feuer

Die Truppenzahl **ist** die Lebenspunktzahl (`stats.hp`), und die Feuerkraft ist ein
Produkt aus Schuetzenzahl x Truppenbonus x Schaden x Rate. Der Truppenbonus ist bei 30
gedeckelt (`crowd.damageMultiplierCap`); oberhalb "entsteht aus ihr keine Feuerkraft"
(Kommentar `balance.ts` ~Z.996). Das Projekt hat sich mit Multiplikatoren schon zweimal
verrechnet (V3: geplant +38 %, gerechnet +92 %; V4: drei Verstaerker auf dieselbe
Groesse).

**Deshalb die harte Regel fuer V5: Tore, Horde und Multiplikatoren wirken ausschliesslich
auf die Truppenzahl, nie auf Schaden, Rate oder Truppenbonus.** Eine Truppe von 300 hat
zehnmal so viel Leben wie eine von 30 — und exakt dieselbe Feuerkraft. Das ist auch die
Logik des Videos: Die Masse ist der Puffer, der die Horde ueberlebt. Ein Test haelt fest,
dass `damageMultiplierCap*` und `shotsPerSec` im Modus unveraendert bleiben.

Zweite Folge: **Multiplikatoren sind gedeckelt.** ×2 und ×3 statt ×88 — bei ×88 ist die
Zahl nach zwei Toren jenseits jeder Anzeige und jeder Balance. Das Video benutzt ×88
als Werbeversprechen, nicht als Spieldesign.

## Reihenfolge und warum

**E0 → E1 → E2 → E3**, danach E4 und E5 nach Bedarf. E1 (sichtbare Masse) kommt vor
E2 (Tore), weil ein Multiplikator-Tor ohne sichtbares Wachstum wirkungslos ist — man
saehe eine Zahl steigen und nichts passieren. E3 (Horde) kommt nach E2, weil erst die
Masse etwas ist, das die Horde fressen kann.

---

## E0 — Modus-Geruest: TORLAUF neben PROBELAUF

**Umbau, nach dem vorhandenen Muster (`PROBELAUF`, 2026-09-15):**

- Menue: dritter Knopf `TORLAUF` neben `PROBELAUF`, gleiche Startlevel-Wahl
  (`MenuScene.zeigeProbelaufWahl` als Vorlage, Z.473-511).
- Szene: eigener Einstieg (`einstieg === 'torlauf'`), Schalter `istTorlauf()` neben
  `istProbelauf()`/`istTestgelaende()` (GameScene Z.758-773).
- **Speicherschutz 1:1 vom Probelauf:** Muenzen nur im Speicher
  (`bucheMuenzenAufsKonto`, Z.1385-1394), keine `speichere()` mit echten Werten, kein
  `highestLevel`. Ein Test belegt, dass ein Torlauf den Spielstand nicht anfasst — der
  Browser-Nachweis aus dem Probelauf wird wiederholt.
- Ein eigenes Bahnsystem `Torbahn` hinter dem `BahnSystem`-Interface
  (`versuchBahnen.ts` Z.61-75), in E0 noch leer: keine Waende, keine Tore, nur Gegner
  wie im Run. **Nicht** ein drittes `BahnRegeln`-Objekt — das Interface kennt nur
  Fass/Tor der Zwei-Bahnen-Mechanik, und der Torlauf braucht andere Objekte.
- **Truppenzahl als grosse Zahl im Bild**, ueber der Truppe, wie die Boss-Zahl
  (`bossBarText` als Vorlage; `setText` nur bei Aenderung). Nur im Torlauf.

**Zielgroesse:** Torlauf startet, laeuft wie der Run, speichert nichts, zeigt die Zahl.
**Aufwand:** Konfiguration und Kopie eines vorhandenen Musters.

---

## E1 — Die Truppe als sichtbare Masse (nur im Torlauf)

**Der offene Punkt 1 der Uebergabe, hier entschieden.** Gemessen am 2026-09-05: 180
zusaetzliche Sprites kosten keine Bildzeit (Median unveraendert 16,7 ms); der Grund fuer
den Deckel ist Platz (`maxWidthRatio` 0,2 = 78 px Feuerlinie, bei 30 Figuren am
Mindestabstand).

**Umbau:**

- `pools.crowd` auf einen hergeleiteten Wert (Vorschlag 150: das Video zeigt ~8 Reihen
  x ~18 Figuren; dahinter traegt die Zahl weiter, die Menge bleibt stehen).
- Im Torlauf eigene Formationswerte: kleinere Figuren (eigene `figureScale`), engerer
  `minColSpacing`, groesseres `maxWidthRatio` (Video: fast volle Bahnbreite), mehr
  Reihen in die Tiefe (`maxDepth`). **Der echte Run behaelt seine Werte** — die
  Torlauf-Werte liegen in einem eigenen Block `BALANCE.torlauf.crowd`, und ein Test
  belegt, dass `BALANCE.crowd` unveraendert ist.
- `crowd.max` im Torlauf an die Poolgroesse gekoppelt, nicht an 30.
- **Die Feuerlinie bleibt bei 30 Schuetzen** (`shootersPerSalvo`, `damageMultiplierCap`):
  Figur 31 bis 150 laeuft mit, schiesst aber nicht. Das ist die Regel aus dem
  Zielkonflikt oben.
- Kollisionshuelle: bleibt an der Formationsbreite (`hullWidthFigures`), waechst also
  mit — die Masse ist breiter und damit leichter zu treffen. Das ist gewollt (mehr Leben,
  mehr Angriffsflaeche) und wird in E3 gebraucht.

**Zielgroesse:** Bildzeit-Median bei 150 Figuren plus voller Horde **nicht ueber 16,7 ms**
(gemessen, nicht geschaetzt — Chrome-Profil mit gedrosselter CPU wie am 2026-08-23).
Formation liest sich als Masse, nicht als Raster: Thomas' Urteil am iPhone.

**Reissleine:** Liegt der Median darueber, zuerst die Poolgroesse halbieren (75), dann
die Figuren-Streuung aus dem Abwechslungs-Task fuer Figur 31+ abschalten. **Kein
Umbau der Renderschleife.**

---

## E2 — Tor-Paare mit Restwert: die Entscheidung links oder rechts

**Umbau:**

- Die `Torbahn` setzt in Abstaenden **Paare** von Pfeilern: einer links, einer rechts,
  jeder mit Aufschrift (Wirkung) und Restwert (Zahl darunter). Wirkungen:
  `+N` (additiv, N als Anteil der Truppe wie `getTorStartwert`), `×2`, `×3`
  (multiplikativ, **hoechstens ×3**). Das Paar wird so gezogen, dass eines besser ist —
  die Entscheidung ist der Kern des Genres.
- **Restwert wird heruntergeschossen**, ein Treffer ein Punkt (`getTorStand`-Logik).
  Bei 0 kippt der Pfeiler und hinterlaesst eine flache Platte; wer durch die Platte
  laeuft, bekommt die Wirkung. Ein Pfeiler mit Restwert > 0 blockiert wie eine Wand
  (`getWallPresence`), man muss ausweichen oder freischiessen. Das andere Tor des
  Paars verfaellt, sobald eines genommen ist.
- Restwert als Anteil der Truppe (wie `getTorStartwert`, "an Teamgroesse und
  Schwierigkeit anpassen", Thomas 2026-09-05), Levelhaerte wie `getProbeHaerte`.
- **Wirkung nur auf die Truppenzahl** (Zielkonflikt oben). `×2` bei 60 Figuren = 120
  Figuren, dieselbe Feuerkraft.
- Bilder: Pfeiler stehend, gekippt, Platte — drei Bilder je Wirkungsart. **Codex
  erzeugt sie.** Bis sie da sind, Rechtecke mit Text (wie die Wandkacheln heute).

**Befund aus dem E1-Review (2026-09-19), der E2 bestimmt:** `runStats.set('hp', …)`
klemmt jeden Wert am Level-Cap (`getStatCap('hp', level)`, auf Level 20 = 113). Ein
×2-Tor, das ueber `set` schreibt, kann die Truppe **nie ueber den Cap heben** — auf
Level 5 (Cap ~50) waere ×2 ab 25 Figuren wirkungslos. E2 braucht deshalb eine
Entscheidung, die hier vorbereitet ist: **Im Torlauf gilt ein eigener Truppendeckel
(`torlauf.crowd.max` 150), nicht der Level-Cap.** Der Level-Cap bleibt im Run
unveraendert; die Klemme bekommt im Torlauf den Torlauf-Deckel. Wer das uebersieht,
baut Tore, die nichts tun, und misst dann "zu schwer".

**Zielgroesse:** In einem Level mit 6 Torpaaren waechst die Truppe ohne Gegner von 10
auf 60-150 (gemessen ueber 10 Laeufe mit Bot-Wahl "immer das bessere Tor").
**Gemessen 2026-09-19 nach N2:** 9 Paare 10 → 106, gleichmaessig, kein Malus, keine
Saettigung. **Das Verlust-Kriterium (54 % je Level wie im Probelauf) ist in E2 nicht
erreichbar und gehoert nach E3:** Mit Gegnern auf Level 5 spielte der Bot 24 → 148 und
besiegte den Boss ohne nennenswerten Verlust — Level-5-Gegner sterben am Beschuss,
bevor sie eine 150er-Masse beruehren. Der Gegenspieler der Masse ist die Horde; erst
sie macht die Verlustquote messbar. In E2 wurde deshalb nach N2 **nicht** weiter an der
Balance gedreht.

**Reissleine (die riskanteste Stelle des Plans):** Laesst sich die Wahl nach **zwei
Sessions** nicht so balancieren, dass "beide Tore freischiessen" nicht die beste
Strategie ist (Befund aus dem Versuch, `getTorPlusDeckel`), dann statt Restwert eine
**Zeitgrenze**: Der Pfeiler kippt nur, wenn er vor dem Anflug frei ist, danach ist er
Wand. Nicht weiterbohren am Restwert.

---

## E3 — Die Horde als Zahl

**Umbau:**

- Am Levelende (Phase `warning` → statt oder vor `boss`) faehrt eine **rote Flaeche
  ueber die volle Bahnbreite** ein, mit Lebenspunktzahl (Startwert aus Level und
  Truppe, Korridor unten). Sie ist ein Objekt der `Torbahn`, kein Gegnerschwarm — der
  Gegnerpool bleibt unberuehrt.
- **Beschiessbar:** jeder Treffer zieht Schaden ab (Waffen-Schaden, nicht "ein Punkt" —
  hier soll Feuerkraft zaehlen, sonst ist die Aufruestung im Torlauf wertlos).
- **Frisst bei Beruehrung:** Solange die Flaeche die Truppenhuelle beruehrt, verliert
  die Truppe `fressRate` Figuren je Sekunde **und die Horde ebenso viele Punkte** —
  gegenseitig, wie im Video. Die Flaeche rueckt langsam vor (`vorrueckTempo`, unter dem
  Gegnertempo), man kann also nicht ewig zurueckweichen.
- Bei 0: Flaeche zerplatzt (Sterbeeffekt-Pool), Level geschafft oder Boss (E4).
  Truppe bei 0: Game Over wie bisher.
- Darstellung: zunaechst rote Flaeche mit Zahl (Rechteck + Text, wie Wandkacheln).
  **Die Figurenmasse der Horde ist eine eigene, spaetere Etappe**, falls Thomas sie
  vermisst: ein Sprite-Pool roter Figuren, die mit der Zahl ausduennen. Das ist
  Optik, nicht Mechanik — erst die Mechanik abnehmen.

**Zielgroesse (uebernimmt das Verlust-Kriterium aus E2):** Ein Torlauf-Level ist mit dem
"immer das bessere Tor"-Bot auf Level 5 in 60-80 % der Laeufe gewinnbar, auf Level 15 in 20-40 % — gemessen mit frischer Szene
je Messpunkt, dreifach (Lessons 2026-08-22, Bistabilitaet). Beim Sieg bleiben
10-40 % der Truppe uebrig, nicht 90 % — die Horde muss weh tun.

**Reissleine:** Tragen Beschuss und Fressen nach **zwei Sessions** nicht zusammen (typisch:
Beschuss raeumt die Horde, bevor sie ankommt, oder Fressen ist unabwendbar), dann die
Horde als **reinen Nahkampf** wie im Video: Beschuss wirkt nicht, nur Masse gegen Masse.
Das ist das Genre-Original und der einfachere Fall.

---

## E4 — Boss im Torlauf (nach Bedarf)

Der vorhandene Boss mit seiner Zahl reicht als erste Fassung. Falls Thomas den
Nahkampf-Boss aus dem Video will (rueckt in die Truppe, frisst): dieselbe Fress-Logik
wie E3 auf den Boss legen. Kein neues System.

## E5 — Randstreifen "+1" / "+99" (nach Bedarf)

Die linke Sammelbahn aus `walls.ts` auf beide Seiten legen, mit Werten als Anteil der
Truppe. Bausteine vorhanden; nur, wenn die Bahn zwischen den Torpaaren zu leer wirkt.

---

## Was kein zulaessiger Ersatz ist

- **Nicht** den echten Run oder den bestehenden Probelauf anfassen. Beide bleiben; der
  Torlauf ist ein dritter Einstieg.
- **Nicht** Multiplikatoren auf Schaden, Rate oder Truppenbonus wirken lassen.
- **Nicht** ×88. Deckel ×3.
- **Nicht** die Horde aus dem Gegnerpool bauen (Poolreserve 5 %, plan-v4 E1).
- **Nicht** die Torlauf-Formationswerte in `BALANCE.crowd` schreiben — eigener Block.
- **Nicht** Bilder von Thomas anfordern; Codex erzeugt sie, Rechtecke bis dahin.

## Aufwand (Maschinenzeit, ohne Thomas' Tests)

E0 20-40 min. E1 1-2 h inkl. Messung. E2 2-4 h plus bis zu zwei Balance-Sessions.
E3 2-4 h plus bis zu zwei Balance-Sessions. E4/E5 je unter 1 h. Dazwischen jeweils
Thomas' iPhone-Test, ohne den keine Etappe als abgenommen gilt.
