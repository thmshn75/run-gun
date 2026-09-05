# Active Task

## Status
`IMPL_DONE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Versuch "Zwei Bahnen" — NUR im Testgelaende.**

Thomas am 2026-09-05, nach der Genre-Recherche zu *Last Z: Survival Shooter* (Punkt 0a
der Uebergabe). Zwei Dinge gleichzeitig, weil sie erst zusammen die Entscheidung
erzeugen, die dem Spiel fehlt:

- **Rechte Fahrbahnhaelfte:** dort kommen die Gegner UND Tore, die **im Minus starten
  und ins Plus gehen, wenn man draufschiesst**. Der Stand beim Durchfahren ist die
  Aenderung der Truppengroesse — bei -3 durchfahren kostet 3 Figuren, bei +5 bringt es 5
  (Thomas' ausdrueckliche Wahl gegen die harmlose Variante "nur die Belohnung entfaellt").
  Die Tore kommen **zwischen den Gegnern**, nicht als laufende Kette.
- **Linke Fahrbahnhaelfte:** **stehende Faesser**, die freigeschossen werden muessen und
  **nicht weiterlaufen**, solange man nicht schiesst. Sie tragen die Aufruestungen (DMG,
  RATE) und die Waffen. Weil man immer nur EINES vor sich hat, muessen die Aufruestungen
  entsprechend gross sein, und die Waffen kommen **in logischer Reihenfolge nach Staerke**.

**Die harte Randbedingung: Der normale Run bleibt Byte fuer Byte unveraendert.** Erprobt
wird ausschliesslich im Testgelaende; erst nach Thomas' Go wandert etwas davon ins Spiel.
(Regel Thomas 2026-09-05: "wenn wir etwas versuchen, dann NUR im Testgelaende, dort
testen wir bis ich mein Go gebe".)

---

## Architektur

**Eigene Klasse statt Umbau von `walls.ts`.** `Walls` traegt die abgenommene Mechanik des
echten Runs (Sammelbahn links, Feuerkraftwand rechts). Ein Versuchsschalter mitten darin
waere genau der Weg, auf dem der echte Run doch beschaedigt wird. Stattdessen:

- Neues `src/systems/versuchBahnen.ts` mit der Klasse `VersuchBahnen`, die **dieselbe
  oeffentliche Schnittstelle** wie `Walls` anbietet (`getWalls`, `getRewards`,
  `hasActivePair`, `update`, `damage`, `isWall`, `isReward`, `collect`,
  `getWallPresence`, `isPickupSegment`, `isDrainSegment`, `collectPickup`,
  `resetForLevel`, `deactivateAll`, `getSegmentHeight`). Ein Interface `BahnSystem` in
  `versuchBahnen.ts` haelt beide Seiten aneinander fest.
- `GameScene` belegt `this.walls` je nach Einstieg mit `Walls` oder `VersuchBahnen`.
  **Genau eine Weiche**, an der Stelle der heutigen Instanziierung (`GameScene.ts:285`) —
  nicht verstreut ueber die Kollisionsanbindung.
- Reine Rechenlogik (Torstand, Fasshaerte, Inhaltsreihenfolge) in `versuchBahnen.ts` als
  **exportierte Funktionen ohne Phaser**, damit sie ohne Renderer testbar sind.
- Alle Zahlen in `BALANCE.versuch` mit Rechenweg als Kommentar (Projektregel: nie eine
  Groesse raten, die das Spiel messen kann).

---

## Rechte Bahn: Minus-Tore

**Zaehler und Fortschritt.** Der Zaehler ist eine **Figurenzahl**, keine Lebenspunkte —
er steht als `-12` bzw. `+5` auf dem Tor und ist beim Durchfahren wortwoertlich die
Aenderung der Truppe. Treffer duerfen ihn deshalb nicht 1:1 hochzaehlen: Bei Truppe 30
und rund 5 Schuss/s kommen je nach Waffe 40-50 Treffer je Sekunde an der schmalen Kachel
an, ein `-12` waere in einer Viertelsekunde weg und die Entscheidung nie eine.

Gerechnet statt gesetzt: Ein Punkt kostet `schadenProPunkt = dpsAnDerKachel / punkteProSek`.
`dpsAnDerKachel` ist die bereits belegte Groesse aus `wallPlan.ts` (Feuerkraft der Truppe
mal `wallHitShare`, gemessen 12-46 % je nach Waffe). `punkteProSek` = 6 heisst: ein Tor
mit -12 braucht rund **2,0 s konzentriertes Feuer** bis zur Null — lang genug, dass
"schaffe ich die Null noch?" eine echte Frage ist, kurz genug, dass es zwischen zwei
Horden passt. Der Wert skaliert damit automatisch mit Waffe, Truppe und Level.

- Startwert: zufaellig zwischen `startMin` (-8) und `startMax` (-18). Bei der festen
  Testgelaende-Truppe von 30 Figuren sind das 27-60 % der Truppe — spuerbar, nie toedlich.
- Ueber Null laeuft der Zaehler weiter, gedeckelt bei `plusMax` (+10). Ohne Deckel waere
  Draufhalten bis zum Toranflug immer richtig und die Entscheidung wieder weg.
- **Kein Zerbrechen.** Das Tor faellt nicht, es faehrt weiter, bis es an der Truppe vorbei
  ist. Nur so kann der Stand beim Durchfahren die Frage beantworten.
- **Einloesen bei Beruehrung** der Truppenhuelle: `applyReinforcement(n => n + stand)`,
  danach verschwindet das Tor. Wer daran vorbeisteuert, bekommt und verliert nichts — das
  ist der Zielkonflikt: rechts Truppe holen oder links aufruesten.
- Takt: `torAbstandPx` (560 px) zwischen zwei Toren, also rund alle 4 s bei Testgelaende-
  Tempo. Dazwischen ist die rechte Bahn frei fuer Gegner ("die Waende kommen zwischen den
  Gegnern - nicht laufend").
- Breite: `torBreiteShare` 0.62 der rechten Fahrbahnhaelfte. Breit genug, dass Durchfahren
  eine Entscheidung ist, schmal genug zum Ausweichen.
- Farbe und Beschriftung folgen dem Vorzeichen: negativ rot (`wall-segment-bad`), null
  oder positiv blau (`wall-segment-right`). Das Vorzeichen steht immer davor.

**Gegner nach rechts.** Im Versuch verschiebt sich der Spawn-Schwerpunkt auf die rechte
Haelfte: `versuch.gegnerBandMitte` 0.42, `versuch.gegnerBandBreite` 0.24 (Anteile der
halben Spielfeldbreite). Umgesetzt als Verschiebung der Lane-Wahl in `spawner.ts` hinter
**einer** Abfrage — die bestehenden `spawnBands` bleiben unangetastet.

## Linke Bahn: stehende Faesser

- Ein Fass rollt vom Horizont heran und **haelt bei `haltYShare` 0.58** der Bildschirmhoehe
  an. Dort bleibt es, bis es zerschossen ist. Erst danach rollt das naechste heran.
- **Optik gegen den Stillstand** (Thomas: "wenn die Strasse darunter scrollt sieht es bloed
  aus, eventuell Faesser die sich gegengleich zur Strasse drehen"): Das Fass zeigt eine
  Rollbildfolge (`barrel-roll-1..8`, Codex-Lauf), deren Phase mit der **gefahrenen
  Weltstrecke** weiterlaeuft, entgegen der Scrollrichtung. Es rollt also sichtbar gegen die
  Strasse an und bleibt genau deshalb am Platz. Bildwechsel je `fassUmfangPx` gefahrener
  Strecke geteilt durch 8 — an die Strecke gehaengt, nicht an eine Zeitkonstante, sonst
  entkoppelt sich die Drehung beim Tempowechsel und der Effekt kippt ins Rutschen.
  **Reissleine Optik:** Fehlt die Bildfolge (Codex-Lauf nicht fertig), laeuft das Fass mit
  der vorhandenen Wandtextur ohne Drehung — die Mechanik ist dann trotzdem testbar; das
  wird gemeldet, nicht stillschweigend als fertig ausgegeben.
- Lebenspunkte: `getWallPlan`-Rechnung mit eigener Zielzeit `fassFokusSec` 2,5 s. Laenger
  als eine heutige Wandkachel (0,3-0,6 s), weil das Fass das einzige Ziel der linken Bahn
  ist und nicht in einer Kette steht.
- **Inhalt in fester Reihenfolge, kein Zufall** (Thomas: "in einer logischen Reihenfolge
  nach Staerke"): `Waffe, DMG, RATE, Waffe, DMG, RATE, …`. Die Waffe ist jedes Mal die
  **naechststaerkere aus `WEAPON_KEYS`**, die auf diesem Level freigeschaltet ist —
  `WEAPON_KEYS` ist bereits nach der Staffelung (`BALANCE.weapon[].minLevel`) sortiert, die
  Reihenfolge wird also nicht neu erfunden, sondern uebernommen. Ist die Reihe ausgereizt,
  faellt die Waffe aus dem Zyklus und es bleiben DMG und RATE.
- **Aufruestungsstaerke:** ein Fass gibt so viel wie `fassTorSchritte` (4) heutige Tore,
  also ein Viertel eines Levelsprungs statt eines Sechzehntels (`walls.gatesPerLevelStep`).
  Gerechnet: Die heutige rechte Bahn liefert rund zwei Kacheln je Sekunde Fahrt, die linke
  Fassbahn ein Fass je rund 4 s (Anfahrt plus 2,5 s Feuer). Der Faktor 4 gleicht den
  Durchsatz grob aus, ohne ihn zu ueberholen.
- Waffen fallen wie heute nach dem Zerschiessen als einsammelbares Objekt an die
  Korridorkante; DMG und RATE wirken sofort.
- **Kein Roter Inhalt in der linken Bahn.** Der Versuch prueft, ob der Zielkonflikt
  zwischen den Bahnen traegt. Ein zweiter Konflikt innerhalb der linken Bahn wuerde das
  Ergebnis nicht mehr zuordenbar machen.

## Laufzeit des Versuchs

Die Gegnerphase des Testgelaendes ist mit 20 s auf den Waffenvergleich gerechnet
(`testground.normalPhaseSec`) und fuer einen Bahnversuch zu kurz — in 20 s kommen rund
fuenf Tore und vier Faesser, das reicht fuer kein Urteil. Im Versuch gilt deshalb
`versuch.gegnerphaseSec` 90. **`testground.normalPhaseSec` bleibt unveraendert**, damit
die abgenommene "maximal die Haelfte"-Regel und ihr Test weiter gelten; der Waffentest
laeuft unveraendert weiter, sobald der Versuchsschalter aus ist.

---

## Akzeptanzkriterien

1. **Der echte Run ist nachweislich unberuehrt.** Ein Test belegt, dass `Walls`,
   `spawner.ts` und `GameScene` ausserhalb des Testgelaendes denselben Weg nehmen wie
   heute: `VersuchBahnen` wird nur bei `einstieg === 'test'` instanziiert, und der
   Versuchsschalter ist an genau einer Stelle abgefragt (Quelltext-Test wie in
   `tests/testgelaende.test.ts` etabliert).
2. **Torstand rechnet richtig** (reine Funktion, ohne Phaser): Startwert im Band, Zaehler
   steigt mit dem Schaden, ueberschreitet Null und stoppt bei `plusMax`; Property-Test,
   dass er nie unter den Startwert faellt und nie ueber den Deckel steigt.
3. **Zielzeit gemessen, nicht behauptet:** Der Weg von `startMax` (-18) auf 0 liegt bei
   Testgelaende-Truppe und drei verschiedenen Waffen im Fenster **1,5-4,0 s** (gerechnet
   aus `dpsAnDerKachel`, Test mit echten Balance-Werten).
4. **Durchfahren aendert die Truppe um genau den angezeigten Stand** — inklusive des
   Randfalls, dass die Truppe dadurch nicht unter 1 Figur faellt.
5. **Fassreihenfolge ist deterministisch** und liefert Waffen aufsteigend nach
   `WEAPON_KEYS`; ein Test zeigt die ersten zwoelf Inhalte einer Fassreihe auf
   Testgelaende-Level.
6. **Das Fass steht wirklich still:** Test ueber die reine Positionsfunktion, dass die
   Bildschirmhoehe eines haltenden Fasses ueber beliebig viel gefahrene Strecke konstant
   bleibt, waehrend die Rollphase weiterlaeuft.
7. **Gegner kommen rechts an:** Browser-Pruefung in der echten Spielschleife (Zugriff
   `window.__runGun`, per `setInterval` eingreifen — nie `game.step()`): ueber 60 s
   gemessen liegt der Schwerpunkt der Gegner-X-Positionen rechts der Strassenmitte, und
   die linke Fahrbahnhaelfte bleibt fuer die Faesser frei.
8. `npm run check` und die vollstaendige Testsuite gruen (Terminal-Lauf, nicht in der
   Extension).
9. **Gamefeel gilt erst nach Thomas' Test.** Kein "fertig" ohne sein Urteil am Geraet.

## Reissleine

Traegt der Zielkonflikt nach **zwei** Balance-Zyklen nicht (Tore fuehlen sich wie Pflicht
an, oder die linke Bahn wird nie angefahren), wird das an Thomas gemeldet statt
weitergedreht. **Kein zulaessiger Ersatz:** Tore harmlos machen (Minus abschaffen),
Faesser von selbst weiterlaufen lassen oder die Aufruestung ohne Freischiessen ausgeben —
alles drei tauscht still das Ziel gegen ein Ersatzprodukt (Lesson 2026-08-20).


---

## Was beim Bauen dazugelernt wurde (2026-09-05)

Drei Befunde aus der Browser-Pruefung, alle bereits behoben und in `docs/lessons.md`
festgehalten:

1. **Das Fass fliegt nicht mehr heran, es erscheint an seinem Platz.** Der Anflug vom
   Horizont dauert rund fuenf Sekunden bei durchgehend feuernder Truppe - das Fass war
   jedes Mal zerschossen, bevor es ankam. Gemessen: nur 4 % der Zeit war ueberhaupt ein
   Fass zu sehen.
2. **Die Halteregel gilt nur fuer das Fass, nicht fuer die freigeschossene Waffe.** Sonst
   blieb die Waffe fuer immer an der Halteposition liegen und blockierte die Bahn.
   Gemessen: ein einziges Fass in 20 Sekunden, danach Stillstand.
3. **Ein Fass ist zwoelf Torschritte wert, nicht vier.** Am Durchsatz gerechnet waren es
   vier; im Spiel gemessen kommen die Faesser rund zweieinhalbmal schneller als
   gerechnet, und vier Schritte hoben den Schaden in 30 s um vier Prozent - unter der
   Wahrnehmungsschwelle.

**Messwerte nach den Korrekturen** (23 s Testgelaende, echte Spielschleife):
Fass sichtbar 83 % der Zeit; Standzeiten 1,5 / 4,2 / 10,6 s (die langen, wenn die Truppe
rechts kaempft - genau der gesuchte Zielkonflikt); Gegner zu 75 % rechts der
Strassenmitte, Schwerpunkt 0,18; Tore durchgehend sichtbar.

**Offen bis zu Thomas' Urteil:** ob die Drehung des Fasses am Handy als Rollen liest,
ob das Startband der Tore (-8 bis -18) passt und ob die Gegner weit genug rechts laufen
(Schwerpunkt 0,18 statt der geplanten 0,42 - die Spurvergabe draengt sie zur Mitte).


## Nachtrag 2026-09-05, zweite Runde (Thomas' Korrekturen)

Vier Aenderungen auf Zuruf, alle im Browser nachgemessen:

1. **Faesser weiter nach links** (`versuch.fass.bahnAnteil` 0,68 statt 0,50) - sie stehen
   jetzt am linken Fahrbahnrand statt auf halber Strecke zur Mitte.
2. **Tore weiter nach rechts und breiter** (`bahnAnteil` 0,58, `breiteShare` 0,80 statt
   0,62). Die Aussenkante endet bei 0,98 der halben Spielfeldbreite, also knapp
   INNERHALB der Strasse - ein Tor, das ueberragt, koennte man nicht mehr umfahren.
3. **Ein Treffer ist ein Punkt** - auf beiden Bahnen. Die Umrechnung ueber den Schaden
   (`schadenProPunkt`) ist ersatzlos gestrichen; `damage()` liest den Schadenswert nicht
   mehr.
4. **Rollbilder mit breiten Farbbaendern** (dritter Codex-Lauf; Bildunterschied 1 zu 5
   jetzt 28,7 % statt 10,6 %) und die Drehrate am TATSAECHLICHEN Durchmesser statt an
   der Nenngroesse - sonst dreht ein perspektivisch kleineres Fass zu langsam und
   rutscht sichtbar.

**Was die Trefferzaehlung gekostet hat, und was daraus zu lernen war:** Die erste
Trefferzahl des Fasses (90) war aus der Salve gerechnet - 30 Figuren mal 3 Schuss je
Sekunde. Im Spiel kommt davon ein Bruchteil an: **gemessen 3,3 Treffer je Sekunde** an
einem Objekt der Seitenbahn, weil nur die Kugeln zaehlen, die zufaellig in seiner Spur
liegen. Mit 90 stand ein Fass 24,5 Sekunden. Auf 20 gesenkt.

**Messwerte danach** (21 s Testgelaende): Fass 94 % der Zeit sichtbar, Standzeit 6,2 s
ohne aktives Hinsteuern, alle acht Rollbilder werden durchlaufen, Inhaltsreihenfolge
(Waffe, DMG, RATE) haelt.


## Nachtrag 2026-09-05, dritte Runde (Thomas' Korrekturen)

1. **Fass am linken Strassenrand**, nur ein Spalt von 6 px dazwischen, und 10 % groesser
   (Durchmesser 96 -> 106). Beide Bahnen werden jetzt VOM RAND HER gerechnet statt ueber
   einen Anteil, und sie beziehen sich auf die volle Strassenbreite statt auf die um die
   Wandzone gekuerzte Spielfeldbreite - im Versuch gibt es keine Randwaende, die Zone
   waere hier nur eine geerbte Sperre.
2. **Tor bis an den rechten Strassenrand.** Beschrieben wird jetzt seine Innenkante
   (0,15 der halben Strassenbreite); die Aussenkante steht fest am Rand. Gemessen bei
   390 px Bildbreite: Torbreite 112 px statt 54 px, rechte Kante 11 px vor dem Rand.
3. **Startwert und Fasshaerte haengen an der Truppengroesse** (Thomas: "man muss das halt
   dann an die teamgroesse und schwierigkeit anpassen"). Der Torstartwert ist ein Anteil
   der Truppe (25-55 %), die Fasshaerte kommt aus Truppe x Feuerrate x der gemessenen
   Trefferquote 0,037. **Die Zeit bleibt dabei konstant, der Einsatz waechst:** Weil die
   Trefferrate linear mit der Truppe steigt, kuerzt sich die Truppengroesse aus der Zeit
   heraus.

**Was die Randlage veraendert hat - gemessen:** Vorher fiel das Fass nebenbei (6,2 s bei
mittiger Truppe). Jetzt steht es bei mittiger Truppe **24 Sekunden unberuehrt**, weil
keine Kugel mehr dorthin faellt - und ist **in 1,0 Sekunde weg, sobald die Truppe
hinfaehrt**. Das ist der Zielkonflikt in Reinform: Die linke Bahn kostet jetzt einen
echten Bahnwechsel, keinen Streifschuss mehr. Ob eine Sekunde am Fass zu kurz ist,
entscheidet Thomas am Geraet.

## Vorgemerkt, nicht umgesetzt (Thomas 2026-09-05, "das nur zur Info")

**Am Anfang eines Levels sollen weniger Gegner kommen, besonders im ersten Level.**
Ausdruecklich als Hinweis gegeben, nicht als Auftrag - gehoert in den echten Run, nicht
in den Testgelaende-Versuch, und beruehrt die abgenommene Level-1-Balance
(`enemy.spawnBands`, Leveltabelle). Erst nach eigener Beauftragung anfassen.


## Befund 2026-09-05: Verteilung gegen eigene Staerke und Gegnerstaerke

Thomas' Auftrag: "die verteilung wie oft man was bekommt in der relation zur eigenen
staerke und der gegenerstaerke musst du dir noch ansehen". **Nur angesehen, nichts
geaendert.** Gerechnet mit den echten Balance-Funktionen ueber Level 1-30, Trefferraten
aus den Browser-Messungen.

**1. Beide Bahnen laufen binnen Sekunden in ihren Deckel - und ab da ist nur noch die
Strafe uebrig.** `RunStats.set` deckelt jeden Wert an `getStatCap`. Die Truppe startet im
Testgelaende bei 30, der Deckel auf Level 5 liegt bei 46. Ein volles Tor gibt 33 % der
Truppe, also 10 Figuren - **nach zwei Toren (rund 8 Sekunden) ist der Deckel erreicht**,
und jedes weitere Tor gibt nichts mehr. Die Strafe fuer ein verpasstes Tor bleibt aber
voll bestehen (bis -16). Die rechte Bahn kippt damit nach kurzer Zeit von einer Chance zu
einer reinen Strafbahn. Dasselbe bei der Feuerkraft: **ausgereizt nach 12 Faessern auf
Level 1, nach 27 auf Level 5, nach 56 auf Level 12** - bei bis zu 60 Faessern je Minute
sind das 12 bis 27 Sekunden.

**2. Der Truppenertrag ist ein Zinseszins.** Der Plusdeckel ist ein ANTEIL der Truppe
(33 %), und er wirkt auf die schon gewachsene Truppe. Ohne den Statdeckel waeren aus 30
Figuren in einer Minute 2.852 geworden. Der Statdeckel faengt das ab - aber damit
entscheidet nicht mehr die Bahn ueber die Truppengroesse, sondern die Levelnummer.

**3. Die Waffenreihe ist nicht nach Staerke sortiert und faellt am Ende zurueck.**
Sortiert wird nach Freischaltlevel (`minLevel`), und das ist nicht dasselbe wie Staerke.
Gemessen an `getCombatFirepower` (Truppe 30, Level 5) ergibt die Ausgabereihenfolge:
12,2 -> 17,1 -> 21,6 -> **23,8 (Minigun)** -> 19,7 -> 8,1 -> 6,7 -> 11,3 -> 9,4 -> 11,0
-> **6,0 (Granate)** -> 7,6 -> 8,3 -> **und dann wieder Pistole 12,2**. Nach der Minigun
geht es also bergab, und nach der dreizehnten Waffe faengt die Reihe von vorn an. Der
Vorbehalt dazu: `getCombatFirepower` misst Schaden mal Rate und unterschaetzt
Flaechenwaffen, die mehrere Gegner auf einmal treffen - der Absturz von 23,8 auf 6,0 ist
aber zu gross, um daran allein zu liegen.

**4. Die Bilanz kippt innerhalb eines Levels.** Spielerkraft geteilt durch Gegnerbedarf
auf Level 5, ueber die 90 s Gegnerphase: **0,9 -> 1,1 -> 1,3 -> 1,6 -> 2,1 -> 2,2 ->
2,6**. Der Start ist knapp, nach einer Minute ist es doppelt so leicht.

**Was daraus folgen wuerde** (Vorschlag, nicht umgesetzt):
- Ertraege am ABSTAND ZUM DECKEL bemessen statt an festen Anteilen - dann verpufft nichts
  und die Bahn bleibt bis zum Levelende eine Entscheidung.
- Takt strecken: weniger Tore und Faesser, dafuer jedes einzelne wertvoller. Bei 15 Toren
  und bis zu 60 Faessern je Minute ist beides heute eher Dauerbeschuss als Entscheidung.
- Waffenreihe nach gemessener Feuerkraft sortieren statt nach Freischaltlevel, und am
  staerksten Eintrag stehenbleiben statt zur Pistole zurueckzurotieren.


## Umsetzung 2026-09-05, vierte Runde: die drei Befunde behoben

Thomas: "setze alles um, wie von dir vorgeschlagen."

**1. Ertraege am Restweg zum Deckel statt an festen Anteilen.**
- *Tore:* Der Plusdeckel ist jetzt ein Anteil des Wegs zwischen aktueller Truppe und
  `getStatCap('hp')` (35 %), nicht mehr 33 % der Truppe. Gerechnet fuer Truppe 30 bei
  Deckel 46: +6, +4, +3, +3 - der Ertrag sinkt, je naeher man dem Deckel kommt, und
  erreicht ihn nach acht vollen Toren statt nach zwei. Der Zinseszins ist damit weg.
- *Faesser:* Ein Fass schliesst 10 % des Wegs zum Feuerkraftdeckel
  (`getFassGateSchritte`). Gemessen an den echten Balance-Werten: Das erste Fass auf
  Level 5 gibt 11 Torschritte (vorher fest 12), der Deckel wird aber erst nach **34
  Faessern** erreicht statt nach 10 - auf Level 12 nach 40 statt 19, auf Level 1 nach 26
  statt 4. **Warum nicht grosszuegiger:** Mit 18 % waeren es nur 25 Faesser gewesen; der
  Restanteil laeuft exponentiell in den Deckel, ein hoeherer Anteil kauft kaum Zeit.

**2. Takt gestreckt.** Torabstand 560 -> 1100 px (im Spiel gemessen: **9 Tore je Minute**
statt 15,5). Faesser bekommen eine Pause von 420 px zwischen zwei Stueck; rechnerisch
sind das rund 13 je Minute statt bis zu 60, im Spiel ohne aktives Hinsteuern deutlich
weniger (gemessen 3), weil ein Fass am Rand nur getroffen wird, wenn man hinfaehrt.

**3. Waffenreihe nach gemessener Staerke, oben stehenbleibend.**
Sortiert wird jetzt nach `killsPerSec` - dem MESSWERT aus der Waffen-Vergleichsreihe des
Projekts, aus dem auch der Laden seine Sterne und die Kaufpreise ableitet. Die Reihe
lautet damit: **pistol 1,75 -> shotgun 3,13 -> normal 3,40 -> minigun 3,97 ->
flamethrower 4,83 -> chainlightning 5,07 -> rocket 7,47 -> ricochet 7,67 -> sawblade
7,67 -> laser 8,27 -> grenade 10,27 -> shockwave 12,47 -> cluster 13,80.** Nach der
letzten bleibt sie stehen, statt zur Pistole zurueckzurotieren.

**Ein Zwischenschritt, der verworfen wurde:** Zuerst hatte ich nach
`getCombatFirepower` sortiert (Schaden mal Rate). Das stellte ausgerechnet die vier
Flaechenwaffen ganz nach vorn, weil diese Groesse nur ein Ziel sieht und uebersieht, dass
eine Granate mehrere Gegner auf einmal nimmt. `killsPerSec` misst das mit.
**Bekannte Grenze davon** (im Projekt schon zweimal teuer bezahlt, `docs/lessons.md`
2026-08-25): Es misst die REICHWEITE nicht mit - zwei Waffen mit gleichem Wert koennen
sich im Durchkommensanteil um Faktor 20 unterscheiden.

**Belegt durch:** 371 Tests gruen inkl. Gegenprobe-Test, der die neue Restwegrechnung
gegen die alte feste Schrittzahl misst; im Browser 9 Tore je Minute gemessen und
belegt, dass Tore die Truppe in beide Richtungen aendern (30 -> 27 -> 34).


## Umsetzung 2026-09-05, fuenfte Runde

**1. Jeder Gegner an der Truppe kostet eine Figur.** Neue Weiche in `handleCombatOverlap`,
VOR der Unverwundbarkeitspruefung - ein iframe schuetzt vor einer Trefferserie, hier soll
aber jeder einzelne Gegner zaehlen. Der Gegner verschwindet dabei; im echten Run bleibt
die alte Regel Zeile fuer Zeile unveraendert (ein Test haelt beide Pfade fest).
**Markierte Annahme:** Die Truppe faellt nie unter eine Figur, es gibt also kein Game Over
im Versuch - Thomas hat keines verlangt, und ein abbrechender Lauf koennte die
Bahnoekonomie nicht mehr zeigen.

**2. Die Faesser rollen durch, statt anzuhalten.** Aus dem Einzelfass ist ein Pool von
vier geworden; sie kommen alle 520 px (rund 3,6 s) und laufen mit 55 % der
Strassengeschwindigkeit - langsamer als der Boden, also fast doppelt so lange im Bild.
Wer nicht trifft, verpasst sie: genau das war der Auftrag. **Die Drehung folgt dabei der
Bewegung RELATIV ZUR STRASSE** (1 - tempoAnteil), nicht der auf dem Bildschirm; sonst
rutscht das Fass sichtbar. Die Zielzeit ist von 10 s auf 4 s gesenkt, weil jetzt die Zeit
im Bild die Grenze ist und nicht mehr die Geduld. Gemessen: **8 Faesser in 22 s (rund 22
je Minute), bis zu vier gleichzeitig**, Inhaltsreihenfolge haelt (pistol, damage, rate,
shotgun, damage, rate, normal, damage).

**3. Der Boss war nie ausgebaut.** Im Browser geprueft: Phase `boss`, Boss aktiv und in
Position. Er kam nur erst nach 90 s Gegnerphase, und so lange spielt niemand einen
Versuch. Gegnerphase deshalb auf **55 s** - traegt die Bahnbeurteilung (rund 8 Tore, 20
Faesser) und laesst den Boss innerhalb einer Minute kommen.

## Befund zur Frage "muss die Truppe gedeckelt dargestellt werden?"

**Gemessen, nicht geschaetzt:**
- Die Truppe hat einen **Figuren-Pool von genau 30 Objekten** (`BALANCE.crowd.max`).
  Gesetzt auf 60 oder 120 zeigt sie weiterhin 30 - der Rest existiert nur als Zahl im HUD.
- Ab Level 2 laufen beide auseinander: `getStatCap('hp')` erlaubt 37 Figuren auf Level 3,
  65 auf Level 8, 120 auf Level 30. Man sieht also den groessten Teil seiner Truppe nicht.
- **Leistung ist NICHT der Grund:** 180 zusaetzliche Sprites (90 Figuren plus Schatten) in
  die laufende Szene gezeichnet - Bildzeit unveraendert bei 16,7 ms Median und 18,8 ms im
  95. Perzentil, also weiter 60 Bilder je Sekunde. Der Deckel kostet Darstellung, ohne
  Rechenzeit zu sparen.
- **Der wirkliche Grund ist Platz:** Die Formation darf nur `crowd.maxWidthRatio` breit
  werden (rund 78 px) und steht schon bei 30 Figuren am Mindestabstand von 11 px. Mehr
  Figuren muessten nach hinten wachsen, und die Tiefe ist durch den Bildschirmrand
  begrenzt.

**Empfehlung:** Die echte Anzahl ist darstellbar - das Genre-Vorbild zeigt genau solche
Massen. Noetig waeren drei Dinge: Figuren-Pool auf den hoechsten Truppendeckel vergroessern
(120), `crowd.max` an `getStatCap('hp')` koppeln statt fest zu setzen, und die
Formationstiefe pruefen (bei 8 Spalten braeuchten 120 Figuren 15 Reihen, das sind rund
210 px nach hinten). **Nicht umgesetzt** - die Truppendarstellung gehoert dem echten Run,
und das waere ein Eingriff dort.


## Umsetzung 2026-09-05, sechste Runde

**Luecke hinter der Wand** (Thomas: "wenn Waende kommen, kann ich nicht auf die Gegner
schiessen und dann sind sie so nah, dass ich sie nicht wegbekomme"). Ursache: Das Tor
deckt seit dem Verbreitern die rechte Fahrbahn von 0,15 bis zum Rand - genau den
Streifen, in dem auch die Gegner laufen. Wer auf die Zahl haelt, trifft dahinter nichts,
und seit der neuen Kontaktregel kostet jeder Durchkommer eine Figur.

Umgesetzt als **Spawnsperre in einem Fenster um den Tor-Spawn**: 150 px davor, 380 px
danach (von 1100 px Torabstand). Das Fenster haengt am Spawn-Zeitpunkt, nicht an der
Torposition - ein Gegner, der gleichzeitig mit dem Tor am Horizont erscheint, laeuft die
ganze Strecke in dessen Schatten. Der Spawner bekam dafuer einen ZWEITEN Schalter
(`setSpawnSperre`), getrennt von `setSpawningEnabled`: Das gehoert der Levelphase, und
ein gemeinsames Flag haette der Versuch jedes Bild neu gesetzt und damit die Bossphase
ueberschrieben.

**Gemessen (29 s Testgelaende):** Das Fenster deckt 47 % der Zeit, aber nur 15 von 175
Gegner-Spawns fielen hinein (8,6 %) - der Rest ist Randschaerfe der Sonde, die alle
100 ms abtastet. Die Truppe stand nach 29 s bei **14 Figuren statt bei 1** wie im Lauf
davor. Bewusste Nebenwirkung: Der Gegnernachschub halbiert sich ungefaehr. Das ist hier
erwuenscht - die Kontaktregel rieb die Truppe zuvor in 22 s von 30 auf 1 auf.

**Zu den doppelten Waffen** ("wenn ich Faesser wegschiesse erscheinen immer 2 Waffen
gleiche"): Die Ursache lag im alten Zaehler - `waffenIndex` wurde beim EINLOESEN
weitergestellt. Wurde ein Waffenfass nicht eingeloest, sondern lief aus dem Bild, blieb
der Zaehler stehen und das naechste Waffenfass zeigte dieselbe Waffe. Mit dem Umbau auf
durchrollende Faesser stellt der Zaehler beim SPAWN weiter; im Browser nachgemessen:
Waffenfolge pistol -> shotgun -> normal ueber 29 s, keine einzige Wiederholung, und nie
mehr als ein Waffen-Fund gleichzeitig im Bild.


## Nachtrag: Gegner meiden die Waende auch im Bosskampf (Thomas 2026-09-05)

"Als der Boss erschienen ist, waren die Gegner wieder in und um die Waende." - und nach
dem ersten Anlauf praezisiert: "Es soll schon alles weiterlaufen, nur bei den Waenden
keine kleinen Gegner wie vorher im Spiel."

**Ursache:** Die Horden, die der Boss ruft, gehen ueber `requestBossHorde` und umgehen
den regulaeren Spawntakt bewusst (so war es schon vor dem Versuch). Die Torsperre der
Gegnerphase griff dort deshalb nicht.

**Verworfener erster Anlauf:** Die Bahnen im Bosskampf ganz anzuhalten. Das loeste das
Problem, nahm aber mehr weg als noetig - Thomas will die Bahnen durchlaufen sehen.

**Behoben:** Die Sperre steht jetzt in `requestBossHorde` selbst und gilt damit in jeder
Phase. **Bewusste Folge:** Ein Ruf, der ins Torfenster faellt, verfaellt - wie heute
schon ein Ruf, der am Begleiter-Deckel scheitert. Der Hordendruck des Bosses sinkt damit
um den Fensteranteil (rund 47 %). Ihn stattdessen aufzustauen haette den Takt in
`boss.ts` geaendert, und der gehoert dem echten Run.

**Gemessen im Bosskampf:** Tore und Faesser laufen weiter (in 29 Proben durchgehend
Faesser, dazu Tore), und von 58 gerufenen Gegnern fiel **kein einziger** ins Torfenster.

---

## Nachtrag: Waffenfunde (Thomas 2026-09-05)

**"Die erste Waffe soll nicht die Pistole sein, weil man mit dieser startet."** Die
Fassreihe laesst die Startwaffe jetzt weg - erkannt an `minLevel === 1`, also der Waffe,
die von Anfang an da ist. Die Reihe beginnt damit bei der Schrotflinte.

**"Waffen erscheinen immer noch doppelt."** Im aktuellen Stand nicht reproduzierbar: Ueber
35 s mit der Truppe direkt an der Fassbahn stand **nie mehr als ein Waffenobjekt**
gleichzeitig im Bild (Rewards und waffentragende Faesser zusammen gezaehlt). Zwei
Massnahmen trotzdem:

1. **Harte Garantie statt Hoffnung:** Rechnerisch KANN es vorkommen - der Zyklus gibt
   jedes dritte Fass als Waffe aus, und es sind bis zu drei gleichzeitig unterwegs, ein
   zerschossener Fund eingeschlossen, der noch ausrollt. Ist eine Waffe unterwegs, wird
   aus dem naechsten Waffenfass ein Schadensfass, **und der Zaehler bleibt stehen** - die
   Waffe ist damit nicht verloren, sie kommt beim naechsten freien Fass.
2. **Der Fund ist kleiner** (70 % der Fassgroesse): In voller Groesse lag eine Schrotflinte
   quer ueber der halben Fahrbahn und las sich als Hindernis statt als Fund. Das kann die
   Beobachtung "doppelt" miterklaeren.

**Wenn es am Geraet weiter auftritt**, ist der naechste Verdacht der Zwischenspeicher der
App: Die Seite ist eine PWA mit Offline-Speicher, ein alter Stand haelt sich dort, bis
die Seite hart neu geladen wird.

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
