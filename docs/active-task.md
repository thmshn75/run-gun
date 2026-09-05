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

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
