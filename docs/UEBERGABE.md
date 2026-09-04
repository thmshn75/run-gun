# Uebergabe: Run & Gun

Stand: 2026-08-30 (V4 gebaut inkl. aller Aenderungen vom 25.–28.08.; Bennis
iPhone-Test am 2026-08-29 erledigt und ok — kein neuer Befund. Am 30.08. der Ton
komplett entfernt.)

## Ziel
Kostenloses iPhone-PWA-Spiel (Auto-Runner-Shooter, Hochformat), gespielt von Benni (7).
Live: https://thmshn75.github.io/run-gun/ · **V4 = Endlos-Modus**, Plan `docs/plan-v4.md`.

## Harte Randbedingungen
- Claude setzt direkt um (kein Codex-Handoff) — **ausser Bildern**, die erzeugt Codex.
- Testsuite, Builds und Codex-Laeufe ins Terminal (`.command` + `open -a Terminal`).
- **Nie eine Groesse raten, die das Spiel messen kann.** Rechenweg als Kommentar in
  `balance.ts`. Messsonden danach loeschen.
- **Bei Leistungsfragen zuerst profilieren, dann Hypothesen bilden.**
- Browser-Pruefung: echte Spielschleife laufen lassen und per `setInterval` eingreifen —
  kuenstliches Takten mit `game.step()` verfaelscht die Physik. Zugriff `window.__runGun`.
- Gamefeel gilt erst nach Thomas'/Bennis iPhone-Test als erfuellt.
- Nach jeder Etappe: `npm run check`, Terminal-Testsuite, Browser-Pruefung, commit + push,
  Deploy per `gh run watch` verifizieren.

## Fertig
- **V1 (`v1.0`), V2 (`v2.0`), V3 (`v3.0`)** — alle abgenommen, alle drei Tags sind
  Rueckschrittspunkte. Letzter Commit `6bd5994`, Arbeitsverzeichnis sauber, alles gepusht.
- V3 brachte: Sammelbahn-Fix, Startruckeln behoben (Kollisions-Suchbaum fraß 48 % der
  Rechenzeit), Shop nach jedem Level, Weiterspielen + Fortsetzen, Zombie-Farbvarianten,
  Granatwerfer, Waffenstaffelung, Musik statt Geballer, scharfe Schrift.
- **V4-E1 Endlos-Skalierung** — Der Modulo-Ruecksprung ist weg (Level 13 war siebenmal
  leichter als Level 12), Spielstand-Migration mit Marker, Bestenliste bei „SPEICHERN &
  BEENDEN". Durchkommensanteil auf Level 12/16/20/25/30: 7,5 / 9,2 / 9,4 / 8,1 / 8,7 %.
- **Ton komplett entfernt** (2026-08-30, Thomas: "nimm den ton, musik usw. komplett
  raus"). Weg sind `src/systems/audio.ts`, `audioPlan.ts`, `tests/audioPlan.test.ts`,
  der `BALANCE.audio`-Block und der Menue-Schalter TON AN/AUS. In `main.ts` steht
  `audio: { noAudio: true }`, damit Phaser gar keinen AudioContext mehr anlegt. Die
  Historie (Klangeffekte, zwei zurueckgebaute Musikversuche) steht in den Commits bis
  `267d2d1`; wer den Ton je zurueckwill, holt ihn dort.
- **Waffenstaffelung auf dreizehn Waffen** — Pistole 1, Sturmgewehr 2, Shotgun 3,
  Minigun 5, Laser 7, Flamme 9, Blitz 11, Rakete 13, Granate 15, dann 18/21/25/30.
  Der Haertegewinn steckt in der Umsortierung: Die Rakete ist die staerkste Waffe des
  Spiels und war ab Level 3 zu haben. Gemessen: Pistole auf Level 1 bei 3,8 % gegen
  3,4 % mit dem Sturmgewehr — sie ist messbar NICHT schwaecher, weil dort der Nachschub
  der Engpass ist und nicht die Feuerkraft.
- **E3 Granatwerfer** — nicht staerker, sondern schneller: Rate +73 %, Schaden -15 %.
  Er war gemessen 1,35x stark, aber die traegste Waffe im Spiel. Pool 12 -> 24.
- **Linke Sammelbahn** — wird mit dem Level dichter (kuerzere Kacheln, nicht schneller).
  Plaettchen je Sekunde: Level 1 1,88 (unveraendert) bis Level 30 3,65.
- **E4 Dauerhafte Aufwertungen** — eigener Menue-Knopf, eigene Ansicht, zwei Linien
  SCHLAGKRAFT und MANNSCHAFT a fuenf Stufen (6.000 x1,7). Gemeinsamer Deckel mit dem
  Run-Shop auf der Feuerkraft. Waffenkauf noch offen.
- **Feuerkraft-Tore laufen nicht mehr ins Leere** (2026-08-28, Thomas: "gibt es bei den
  dmg und rate waenden irgendwann ein maximum in den hoeheren leveln?"). Ja, ein hartes:
  Der Deckel der Feuerrate waechst ab Level 13 gar nicht mehr, der des Schadens um 0,4 %
  je Level. Ab dort war praktisch jedes der 22 bis 46 Tore je Level wirkungslos. Geaendert
  ist NICHT der Deckel (gemessen, dicht am Kipppunkt), sondern was ein Tor tut, das nichts
  mehr zu heben findet: erst Umleitung auf den anderen Wert (mit DESSEN Wachstumsfaktor),
  dann Ueberlauf als Muenze. Die Kachel sagt es vorher an ("MAX +1 ¢" statt "+DMG").
  Rote Kacheln werden NICHT umgeleitet. Browser-Beleg (Level 13, Truppe unsterblich an der
  rechten Wand): 34 Ueberlaeufe je 20 s, "→ DMG +0.01" bei nur gedeckelter Rate.
  Der Muenzbonus steht auf 1, nicht auf 3: Mit 3 haette derselbe Extremfall die
  Levelseinnahme um 31 % gehoben, die Preise stehen aber auf 200 % davon.

- **Gegner alle fuenf Level zaeher** (2026-08-30, Thomas: "die normalen gegener alle 5
  level um 20% schwerer machen (auch endgegener)"). Treppe auf die Lebenspunkte: ab
  Level 6 x1,2, dann jede weitere Stufe nur noch 40 % des vorigen Aufschlags, Grenzwert
  1,321. **Der Aufschlag flacht ab, weil die woertliche Fassung das Spiel zerlegt hat:**
  Mit 20 % je Stufe ohne Deckel stieg der Durchkommensanteil voll ausgebaut auf Level 20
  von 0,2 auf 43,9 % und auf Level 30 auf 62,4 %. Gebaut ist jetzt Level 20 1,1 %,
  Level 30 18,8 %, Level 40 16,0 %. **Der Endgegner wird nicht zaeher, sondern
  gefaehrlicher** (Thomas' Wahl): mehr Begleiter, mehr gleichzeitig gerufene Gegner,
  schnelleres Vorruecken - Kampfdauer im Browser gemessen 21,4 s (L12) und 23,5 s (L30),
  also unveraendert. Achtung beim Nachmessen: Der hier benutzte Aufbau ist milder als der
  von E1 (Baseline 0,0-0,2 % statt 7,5-9,4 %), nur der A/B-Vergleich zaehlt.

- **E2 Preise** — 37,5 % -> 200 % der Levelseinnahme je Stufe. Ein Run bis Level 12
  erlaubt 9 von 22 Stufen. Der Knopf zeigt "NOCH ¢ X" statt tot dazustehen.
- **SHOP** (Thomas 2026-08-25: "es soll wie ein echter shop sein ... wie ein laden in dem
  man aussuchen und einkaufen kann"). Aus "DAUERHAFTE AUFWERTUNG" wurde ein Laden mit zwei
  Regalen: oben die beiden Aufwertungen mit Stufen als Punktreihe, unten alle zwoelf
  Waffen als Kacheln mit Bild und Preis, nach Preis sortiert. Vorher wurde immer nur die
  naechste Waffe angeboten - aussuchen konnte man nichts.
  - **Preise aus der gemessenen Staerke** statt aus der Levelnummer: 2.100 (Schrotflinte)
    bis 20.000 (Streubombe), zusammen rund 100.000 = gut acht gute Runs.
  - **Startwaffe vor jedem Level waehlbar** (Levelpause, Reihe STARTWAFFE). Waehlbar sind
    gekaufte Waffen. **Seit dem Abend des 2026-08-25 ab Level 1** (Thomas: "beim kauf
    der waffen, die waffen von Level 1 an verfuegbar machen") - die Gegenmessung
    (Streubombe ab Level 1 = kein Gegner kommt mehr durch) steht weiter und wird bewusst
    ueberstimmt: Der Kauf soll sich sofort auszahlen, der Gegenhebel ist der Preis.
  - **Detailansicht** fuer jede Waffe UND fuer beide Aufwertungen: grosses Bild (Waffen
    zeigen ihr Wandtor-Bild), Staerke als Sterne aus dem gemessenen `killsPerSec`, ein
    Satz zur Wirkung und die LEVELANGABE in beiden Faellen ("Ohne Kauf ab Level 30 ...
    gekauft schon ab Level 29"). Gekauft wird nur dort, nicht durch Antippen der Kachel -
    kein Fehlkauf durch Danebentippen. Bei den Aufwertungen bleibt die Ansicht nach dem
    Kauf offen, weil es fuenf Stufen sind.
  - **Muenzanzeige vereinheitlicht** (Thomas: "im Shop und im Spiel werden aber 2
    verschiedene Werte angezeigt wieso?"). Das HUD zeigte den RUN-Zaehler, das Menue den
    Kontostand - beides richtig, nebeneinander aber wie ein Fehler (4.565 gegen 1.254).
    Jetzt zeigt das HUD ueberall das Gesamtvermoegen.
- **Startwaffe frei waehlbar - hin und her, und auch vor dem FORTSETZEN** (Thomas
  2026-08-25: "wenn ich z. B. eine auswaehle, kann ich nicht direkt zurueck auf die
  anderen" und "wenn ich speicher und bevor ich weiterspiele will ich auch waehlen
  koennen"). Die Wahlliste wurde bei JEDER Wahl neu aus der gerade getragenen Waffe
  gebaut - eine im Lauf gefundene, nicht gekaufte Waffe fiel damit beim Abwaehlen aus der
  Liste. Regel jetzt in `getStartWeaponChoices`, mit der Ausgangswaffe der Pause als
  drittem Eingang. Der FORTSETZEN-Knopf im Menue oeffnet dieselbe Wahl als Fenster (nur,
  wenn es mehr als eine Moeglichkeit gibt) und schreibt sie in den gesicherten Run.
  - **Dabei gefunden: die zweite Kachelreihe lag auf dem iPhone unter dem Knopf.** Feste
    Y-Position plus obere Safe Area gegen einen unten verankerten Knopf - am Schreibtisch
    178 px Luft, auf dem iPhone 85. Die Position kommt jetzt aus `shopWeaponRow.ts`, die
    Kaufknoepfe sind von 132 auf 112 px gekuerzt, damit die Kacheln ihre volle Hoehe
    behalten. Test prueft vier Geraeteprofile. Siehe `docs/lessons.md`, 2026-08-25.
  - **Am iPhone bestaetigt** (Thomas, 2026-08-25): Kacheln sitzen, Knoepfe stimmig.
- **Waffen-Staffelung nach gemessener Staerke neu sortiert** (Thomas: "flammenwerfer ist
  schlechter als Laser, obwohl er spaeter kommt"). Er hatte recht: Gestaffelt wurde nach
  `getWeaponFirepower`, und die zaehlt Durchschlag, Sprengwirkung und Kettenspruenge
  ABSICHTLICH nicht mit - sie ist fuer den Bosskampf gedacht, wo es nur ein Ziel gibt. Im
  Normalspiel entscheiden genau diese Eigenschaften. Nach der Kennzahl lagen alle Waffen
  im Band 1,15-1,27; gemessen liegt zwischen der schwaechsten und der staerksten
  **Faktor acht**. Groesster Ausreisser war der Laser: viertstaerkste Waffe des Spiels,
  kam als dritte - jetzt von Level 7 auf 18. Elf der dreizehn Waffen sind verschoben.
- **Bosskampf laenger** (Thomas nach dem Spielen bis Level 9: "die Bosse sind zu einfach
  (zu schnell) zu besiegen"). Gemessen dauerte ein Kampf mit seinem Ausbaustand 20 bis
  22 s - das System hielt genau seine Untergrenze, sie war nur zu niedrig. Fenster von
  20-40 auf 30-45 s angehoben, `boss.advanceSpeed` nachgerechnet (334 px / maxFightSecCap).
  Dabei fiel auf: Die obere Stuetzstelle des Trefferwirkungsgrads gehoert auf Level 12,
  nicht 20 - dort ist die Rate BEREITS auf Endniveau (Laser 0,372 / 0,371 / 0,369 auf
  Level 12 / 20 / 30), weil dort die Leveltabelle endet. Ergebnis: Level 5 bis 30 liegen
  zwischen 26,5 und 32 s.
- **Tore der rechten Wand** (Thomas: "man erreicht zu schnell die hoechste Stufe im
  Level"). Ein Tor gab einen festen Betrag gegen einen prozentual wachsenden Deckel und
  deckte ab Level 2 den ganzen Levelsprung ab - bei 22 bis 46 Toren je Level. Jetzt
  bringt ein Tor den 16. Teil des Levelsprungs (+0,88 % Schaden, +0,47 % Rate), rote
  Kacheln kosten drei Tore statt eines festen Betrags. Der Deckel faellt damit etwa zur
  Levelmitte statt nach zwei Prozent des Levels.
- **E5 Gegner-Gestalten und E7 Elite-Boss** — 18 neue Gestalten in drei Figurstaerken,
  Elite-Boss alle fuenf Level (anderes Bild, pendelt leicht, mehr Begleiter, schneller
  vorrueckend). Bilder von Thomas abgenommen.
- **Bosskampfdauer** (Thomas: "9 Sekunden ist eindeutig zu wenig, dann lieber mit Pistole
  viel laenger"). Zwei Aenderungen:
  1. **Das Zeitfenster wirkt jetzt auf die ERLEBTE Dauer**, nicht auf eine gerechnete, die
     niemand erlebt. minFightSec 20 und getMaxFightSec sind damit eine Zusage statt einer
     Rechengroesse; ein Test prueft sie fuer jede Waffe auf sechs Leveln.
  2. **Trefferwirkungsgrad je Waffe, an drei Leveln gemessen** (1 / 9 / 20, dazwischen
     linear, ab 20 konstant). Vorher dauerte ein Kampf zwischen 4,0 s (Streubombe) und
     74,3 s (Pistole auf Level 20), jetzt liegen neun bis elf der dreizehn Waffen auf
     jedem Level zwischen 19 und 23 s.
- **FEHLER GEFUNDEN UND BEHOBEN: Prellschuss und Saegeblatt richteten im ganzen Spiel
  keinen Schaden an** — die Trefferliste durchschlagender Geschosse hing am Waffennamen
  "laser" statt an `pierces`. Beide sind erst seither ueberhaupt spielbar. **Ihre Staerke
  im Normalspiel ist damit ungemessen** (der Durchkommensanteil wurde nie mit ihnen
  bestimmt) — das ist der einzige neue offene Punkt aus dieser Sitzung.

- **Laufbewegung fuer alle Figuren** (2026-09-03, Thomas nach einem Genre-Video: "die
  Zombies bewegen sich (bein und armarbeit)"). **Gerechnet statt gezeichnet:** Es gibt
  30 einzelne Gegner-Gestalten; echte Laufbilder waeren rund 130 neue Dateien gewesen,
  und nur einen Teil zu animieren haette geheissen, dass drei von dreissig laufen und
  der Rest steht. Neu sind zwei Bewegungen in `gamefeel.ts` auf derselben Phase wie das
  bestehende Wippen: **Wiegen** des Oberkoerpers (voller Sinus, einmal je Doppelschritt)
  und **Federn** beim Aufsetzen (Betrag, zweimal je Doppelschritt, volumenerhaltend).
  Genau dieser Frequenzunterschied liest sich als Gang; laufen beide gleich schnell,
  sieht es aus wie Zittern.
  - Werte hergeleitet, nicht gesetzt: Wiegen 4,6 Grad aus der seitlichen Kopfauslenkung
    beim Gehen (4 % der Koerperhoehe, Drehachse in Sprite-Mitte), Federn 3 % aus der
    Koerperverformung beim Aufsetzen. Gegner und Boss tragen 2/3 davon, dasselbe
    Verhaeltnis wie beim Hub (2 von 3 px).
  - **Reihenfolge ist die Pointe:** Wiegen und Federn kommen ZULETZT im Bild, nach dem
    Nachfuehren der Trefferflaeche und nach dem Schatten. Lagen sie davor, atmete die
    Trefferflaeche im Schritttakt mit und Schaden haenge am Zufall des Laufzyklus. Ein
    Test prueft die Reihenfolge im Quelltext, damit sie nicht still zurueckrutscht.
  - **Browser-Beleg** (Level 1, ein Gegner ueber 342 Bilder verfolgt): Rotation
    -3,09 bis +3,10 Grad (hergeleitet: +-3,1), Sprite-Verhaeltnis Hoehe zu Breite
    0,961 bis 1,041 (hergeleitet: 0,961 bis 1,041). Die Trefferflaeche zeigte bei
    35 Wiege-Vorzeichenwechseln genau EINE Richtungsumkehr - dieselbe wie die Position.
    Sie folgt also der Perspektive, nicht dem Schritt.
  - **Noch offen: Bennis iPhone-Urteil.** Reicht die gerechnete Bewegung nicht, ist der
    naechste Schritt der teure - rund 130 Einzelbilder von Codex.

- **Zweites Weltthema: Bruecke ueber Wasser** (2026-09-03, Thomas nach demselben Video:
  "die Bruecke ueber Wasser als zusaetzliches Level bauen - wir entscheiden dann ob wir
  switchen von Level zu Level oder ob wir komplett umstellen auf diese Optik").
  - **Beide Entscheidungen haengen an einem Wort:** `BALANCE.welt.thema` kennt `'stadt'`,
    `'bruecke'` und `'wechsel'`. Steht derzeit auf `'wechsel'`, damit Thomas beide Optiken
    im selben Run sieht: Level 1 Stadt, Level 2 Bruecke, danach immer abwechselnd.
  - **Reine Kulisse, kein Gameplay.** Fahrbahn, Waende, Sammelbahn, Gegner und Boss sind
    in beiden Themen identisch. Ein Test verbietet, dass `getWeltThema` oder die neuen
    Balance-Bloecke in Gegner-, Waffen-, Wand- oder Bossdateien auftauchen - die Wahl
    soll keine Balance-Frage werden.
  - Neu: Wasser statt Gruenflaeche (`ground-water`, gestapelte Streifen), Betonkante und
    durchgehendes Gelaender an beiden Fahrbahnraendern, scrollende Pfosten und ein Pool
    aus 40 Wellen, die langsamer laufen als die Bruecke (Wasser faehrt nicht mit).
  - **Das Gelaender wird gezeichnet, nicht aus Segmenten gebaut.** Beim Stadtbild musste
    der Spawn-Takt so gewaehlt werden, dass sich Haeuser ueberlappen, und die
    Lueckenfreiheit war eine Messfrage. Ein gezeichneter Zug ist lueckenlos, weil er
    einer ist.
  - **Browser-Befund und Korrektur:** Zuerst endete das Gelaender am Horizont als
    abrupte schraege Strebe im Himmel. Ursache: Die Strasse laeuft hier nicht auf einen
    Punkt zu (am Horizont noch 52 % breit), das Gelaender wird dort also nie klein genug,
    um von selbst zu verschwinden. Es waechst jetzt ueber `road.entryFadePx` aus der
    Horizontlinie heraus - dieselbe Strecke, mit der Gegner und Boss erscheinen, nur auf
    die Hoehe statt auf die Deckkraft angewandt (ein Deckkraft-Verlauf haette 288
    Einzelfuellungen je Bild gekostet statt sechs).
  - **Bildrate gemessen** (Desktop, Truppe 60, je 7 s): Stadt 60,5 im Mittel / 60,3
    Minimum, Bruecke 60,4 / 60,2. Kein Unterschied. **Das iPhone-Urteil steht aus.**
  - **Noch offen: Thomas' Entscheidung** zwischen Wechsel und kompletter Umstellung.

- **Wasser blauer und bewegter** (2026-09-04, Thomas: "das wasser noch blauer und noch
  bewegter"). Farbton am Himmel ausgerichtet statt am Hafenbecken; Wellen 40 -> 90 und
  neu mit **Kraeuseln**: seitliches Schwingen um ein Viertel der Wellenbreite plus
  Kaemme, die im selben Takt auftauchen und vergehen. Die alte Begruendung "mehr als 40
  wird unruhig" ist bewusst ueberstimmt und im Kommentar so vermerkt.

- **Testgelaende ist der Pruefplatz** (2026-09-04, Thomas: "ein zusaetzliches Testlevel
  mit der Bruecke, sodass wir in diesem Testlevel alles Neue pruefen koennen ohne den
  eigentlichen Run angreifen zu muessen"). Es hat jetzt ein FESTES Thema (Bruecke) statt
  eines, das seine Levelnummer zufaellig traefe. Erreichbar wie bisher ueber den
  Menue-Knopf.

- **Laufbild-Versuch (E-Versuch, abgeschlossen mit Befund).** Vier gezeichnete Laufbilder
  eines Zombies von Codex laufen im Testgelaende - nur dort und nur fuer die Staerke
  `standard`. Alle anderen Gegner behalten die gerechnete Bewegung, sodass im selben Bild
  **gezeichnet gegen gerechnet** steht.
  - Die Versuchsfigur bekommt KEINE gerechnete Bewegung dazu (Hub, Wiegen, Federn stecken
    in den Bildern). Belegt: Rotation ueber 2.175 Proben konstant 0, genau ein
    Seitenverhaeltnis, 6,6 Bildwechsel je Sekunde; daneben wiegen die normalen Gegner
    -3,1 bis +3,1 Grad. Im normalen Run null Versuchsfiguren ueber 8 s.
  - **DER BEFUND, auf den es ankommt:** Die Bildgenerierung haelt eine Figur ueber vier
    Bilder konstant - gleiche Kleidung, gleicher Koerperbau, gleiche Farben. Das war das
    schwierigste Kriterium und es ist gelungen (Codex erzeugt einen gemeinsamen Bogen und
    zerschneidet ihn). Was sie NICHT liefert, sind kontrollierte Posen: Der in Runde 2
    ausdruecklich geforderte Kniewechsel kam nicht, Bild 1 und Bild 3 unterscheiden sich
    in der Silhouette um 285 von rund 1.900 opaken Pixeln. Die Beine oeffnen und
    schliessen sich leicht, ein angehobenes Knie gibt es in keinem Bild.
  - **Konsequenz fuer die Kostenfrage:** Der teure Weg (rund 130 Bilder fuer alle
    30 Gestalten) wuerde 30 konsistente Figuren liefern, die alle nur leicht wackeln.
    Das ist vor Bennis Urteil zu wissen wichtiger als die Stundenzahl.

- **Laufbild-Versuch zurueckgebaut, Bildvariante beim Boss** (2026-09-04, Thomas: "die
  bewegten figuren flackern, also bei den normalen figuren sollte die gerechnete bewegung
  besser funktionieren, aber bei den Bossen die Bildvariante einbauen - alles nur fuer
  den testlauf").
  - Alle normalen Gegner tragen wieder die gerechnete Bewegung; die vier Zombie-Bilder
    sind aus dem Bundle entfernt (sie liegen im Commit `1c113a7`, falls sie je
    gebraucht werden).
  - Der **Elite-Boss im Testgelaende** traegt vier gezeichnete Haltungen: Ruhe,
    Ausholen, Hoehepunkt, Zuruecksinken. Kein Laufzyklus - eine schwere Drohbewegung, bei
    der Arme, Schultern und Kopf arbeiten, waehrend die Beine stehen bleiben.
  - **DIE ENTSCHEIDENDE ZAHL:** Der Silhouettenunterschied zwischen Bild 1 und Bild 3
    liegt bei **56 %**. Beim gescheiterten Zombie-Versuch waren es **15 %** - genau daran
    lag das Flackern. Die Lehre steht in `docs/lessons.md`: Bildgenerierung kann
    kontrollierte Posen, wenn die Haltungen weit genug auseinanderliegen UND das
    Pruefkriterium in Pixeln in der Spec steht. Zwei Codex-Laeufe, der zweite behob
    freistehende Bildteile und einen 20-px-Seitenversatz des Rumpfes.
  - Belegt: 2,21 Bildwechsel je Sekunde, Rotation ueber 1.412 Proben konstant 0 (keine
    doppelte Bewegung); im normalen Run ueber 1.100 Proben null Bildvariante.
  - **Noch offen: das iPhone-Urteil.** Traegt die Bildvariante beim Boss, ist der Weg
    fuer die 30 Gegner-Gestalten neu zu bewerten - dort muessten die Posen aber ebenso
    weit auseinanderliegen, und ein Gangzyklus gibt das schwerer her als ein Aufbaeumen.

- **Wasser realistischer** (2026-09-04, Thomas: "sieh zu ob du das wasser noch
  realistischer hinbekommst"). Drei Aenderungen: Wellenkaemme laufen zu den Enden hin
  **weich aus** statt als hartes Rechteck zu enden (ein Strich liest sich als Kratzer,
  eine verschwindende Linie als Kraeuselung); dazu kommen **dunkle Wellentaeler**
  (45 % des Pools), weil echtes Wasser Senken ebenso zeigt wie Kaemme; und jede Welle
  bekommt eine **eigene Laenge** (Faktor 0,55 bis 1,5), weil gleich lange Wellen sich
  als Muster lesen. Gemessen: 90 sichtbare Wellen, 51 Kaemme zu 39 Taelern, 81
  verschiedene Breiten.

## Offen — naechster Schritt zuerst
1. ~~Bennis iPhone-Test~~ — **erledigt am 2026-08-29, ok** (Thomas). Gamefeel damit
   abgenommen. Noch nachzuziehen (siehe unten): Wirkung der Aufruestungsstufen im Spiel
   und die neuen Preise gegen die Einnahmen eines echten Runs messen.
2. **Vier Entscheidungen fuer Thomas** — alle dokumentiert, keine eigenmaechtig getroffen:
   - **Waffen-Staerkeband.** Der Plan wollte bis 1,85x. Alles ueber **1,25x** hebt den
     E1-Effekt auf: Level 30 waere damit LEICHTER als Level 12. Das Band endet deshalb
     beim heutigen Maximum (Rakete 1,45x).
   - **Stufenzahl im Run-Shop.** Bleibt bei elf, der Shop ist ab Level 13 also leer. Der
     Versuch mit 22 Stufen scheiterte an der internen Wertestufung - die ist seit dem
     2026-08-25 zehnmal feiner, ein neuer Anlauf haette also Aussicht auf Erfolg.
   - **Schwierigkeits-Korridor 4–12 %.** Laesst nur eine flache Steigerung zu
     (Level 12: 7,5 %, Level 30: 8,7 %).
3. **Staerke von Prellschuss und Saegeblatt im Normalspiel** — bis zum 2026-08-25
   richteten beide keinen Schaden an, ihre Balance-Werte sind also nie an einem echten
   Lauf geprueft worden. Vor dem naechsten Feinschliff den Durchkommensanteil auf Level 18
   und 25 mit ihnen messen.

## Wissen, das sonst Zyklen kostet
- **Der Durchkommensanteil ist bistabil UND seine Empfindlichkeit waechst mit.**
  Faktor 2,4 zwischen Level 12 und 16, Faktor 8,7 zwischen 16 und 20. Der Kipppunkt
  liegt bei rund 10–12 %; darueber misst man die Spawn-Sperre statt der Schwierigkeit
  (Level 25 mass dort *weniger* als Level 20). Nie aus einem Modell extrapolieren.
- **Die Messstreuung derselben Groesse betraegt rund 2 Prozentpunkte.** Level 12 mass in
  zwei Zyklen 5,7 % und 7,5 %, obwohl es unveraendert ist. Feinabstimmung unterhalb
  dieser Schwelle ist nicht belegbar.
- **Feuerkraft ist ein Produkt** aus Schuetzenzahl x Truppenbonus x Schaden x Rate. Im
  Endlosbereich traegt nur `stats.endless.damageGrowthPerLevel` den Zuwachs; `shotsPerSec`
  und `crowd.damageMultiplierCap*` stehen bewusst still, und ein Test haelt das fest.
- **Auf den unteren Leveln ist der NACHSCHUB der Engpass, nicht die Feuerkraft.** Jede
  Waffe raeumt dort weg, was ankommt. Waffenstaerken trennen sich erst unter Ueberlast
  (hohes Level, kleine Truppe, niedrige Werte) - das hat in einer Nacht drei Messreihen
  gekostet. Auch die Pistole ist deshalb auf Level 1 nicht messbar schwaecher.
- **Der Wandsegment-Zaehler laesst sich nicht ueber `spawn` messen** - eine Sonde darauf
  zeigte Faktor 7,5 zu wenig. Die Kachelhoehe direkt aus `walls.getSegmentHeight(side)`
  lesen; die Kette selbst laesst sich ueber `walls.pairs.filter(p => p.active)` pruefen.
- **DIE ANZEIGE WAR NIE DAS PROBLEM (Korrektur vom 2026-08-25).** `clampStat` rundet
  Schaden und Rate INTERN - bis zum 2026-08-25 auf eine Nachkommastelle, seither auf
  zwei. Ein Zugewinn unter der halben Stufe verschwand nicht aus der Anzeige, er kam nie
  an. Daran ist die Erweiterung des Run-Shops auf 22 Stufen gescheitert, und der Grund
  stand hier zwei Monate lang falsch. **Der Run-Shop koennte damit jetzt erweiterbar
  sein** - vor einem neuen Anlauf die Stufung pruefen, nicht die Anzeige.
- **Feuerkraft-Deckel muessen auf das PRODUKT wirken**, nicht auf jeden Wert einzeln.
  Ein Deckel von 1,7 je auf Schaden und Rate laesst zusammen 1,9 zu.
- **`getEnemyHp` rundet auf ganze Punkte.** Der leichte Gegner (2 Punkte) waechst mit
  0,3 %/Level bis Level 87 nicht. Kleine Wachstumsfaktoren wirken bei kleinen
  Grundwerten gar nicht.
- **`companionLimit` ist toter Code** — sieht aus wie ein Hebel, wird im Spiel nirgends
  gelesen. Begleiterdruck laeuft ueber `boss.hordePressure`.
- **Messvorschrift dafuer:** frische Szene, 8 s einschwingen, 30 s zaehlen, drei
  Wiederholungen, Median. Sonde: `scratchpad/messung.mjs` (Playwright, zaehlt in
  `activateEnemy` und `meldeDurchbruch`). Wurde schon zweimal falsch gemessen.
- **Boss-Kampfdauer streut um Faktor 3,7** bei identischem Aufbau — nie einzeln messen.
  Der Wert gilt fuer die vier KURZREICHWEITIGEN Waffen (Pistole, Schrotflinte,
  Flammenwerfer, Sturmgewehr); die uebrigen neun messen auf 0,5 s reproduzierbar. Wer bei
  den ersten vier unter Faktor zwei einstellt, kalibriert Rauschen.
- **Trefferwirkungsgrad und Kampfdauer bedingen sich gegenseitig.** Ein kurzer Kampf
  laesst dem Boss keine Zeit, Horden zu rufen, also trifft alles — die gemessene Rate
  faellt, sobald der Kampf laenger wird. Beim Nachmessen deshalb ZWEI Runden fahren und
  das geometrische Mittel nehmen (Herleitung in `balance.ts` bei `hitEfficiencyLevels`).
- **Ein kalibriertes Modell immer AUSSERHALB des kalibrierten Bereichs nachmessen.**
  Innerhalb passt es zwangslaeufig. Die Wirkungsgrad-Formel sass auf Level 9 und 20 genau
  und war auf Level 1 um Faktor 3 daneben.
- **Neue Spielstand-Felder: fehlend = 0, nie Fehler.** Sonst verliert ein bespieltes
  Geraet seine Bestenliste (die Falle ist in `save.ts` zweimal kommentiert).
- **GameObject-Position der Truppenhuelle klebt bei −15** — ungeklaert, wird umgangen.

## Am Abend des 2026-08-25 dazugekommen (fuenf Punkte von Thomas, einer von Benni)

1. **Flammenwerfer und Kettenblitz reichen weiter** (Thomas: "Flammenwerfer braucht
   groessere Reichweite" und "ab level 8-10 werden die mobs so schnell bzw. die
   staerkeren so viele, dass Flammenwerfer oder blitz nicht mehr nachkommt").
   **Gemessen und bestaetigt** (Level 12, Truppe 12, Schaden 2, Rate 4, je 25 s, Anteil
   durchkommender Gegner): Flamme 18,7 % und Blitz 9,5 % gegen Sturmgewehr 9,9 %,
   Minigun 0,9 %, Rakete 0,5 % - beide liessen mehr durch als Waffen drei bis vier
   Plaetze unter ihnen. Die Kills je Sekunde lagen dabei dicht beieinander: Es fehlte
   nicht Feuerkraft, sondern die Strecke, auf der gefeuert werden darf.
   `engageShare` Flamme 0,28 -> 0,58, Blitz 0,45 -> 0,56. **Gegenprobe nach der
   Aenderung** (eine Reihe, frischer Browser): Pistole 56,2 % · Sturmgewehr 13,7 % ·
   Flamme 4,6 % · Blitz 0 % · Minigun 0,7 % - die Rangfolge folgt jetzt der Staffelung.
2. **Der gescheiterte Run war im Menue eine Falle.** Nach dem Tod stand dort
   "FORTSETZEN - LEVEL 7"; ein Druck darauf startete das Spiel mit der Truppengroesse aus
   dem Todeszeitpunkt (null Figuren) und landete sofort wieder im Game Over. Jetzt traegt
   der Run einen Todes-Marker, das Menue zeigt "WEITERSPIELEN - LEVEL 7 · ¢ 1750", und
   beide Wege (Menue und Game-Over-Bildschirm) laufen ueber dieselbe Funktion. Der
   Weiterspiel-Knopf verschwindet auch nicht mehr, wenn das Konto nicht reicht - er zeigt
   "NOCH ¢ X".
3. **Waffen 22 % billiger, Aufwertungen 25 % billiger, dafuer Waffen aufruestbar.**
   Fuenf Stufen je Waffe, +7 % Feuerkraft je Stufe (+40 % voll), Preis 30 % des
   Waffenpreises fuer die erste Stufe, dann x1,45. Die Aufruestung sitzt am `damageFactor`
   der EINEN Waffe und faellt deshalb bewusst NICHT unter `meta.totalBoostCap`.
4. **Testgelaende** (Benni: "ob es sowas wie ein testlevel geben kann, wo man alle waffen
   einzeln ausprobieren kann"). Eigener Menueknopf. Es ist KEIN zweiter Spielmodus,
   sondern das normale Spiel mit vier Aenderungen: Die Truppe kann nicht sterben, es
   faellt keine Muenze, die Gegnerphase dauert 20 statt 80 s, und es wird NICHTS
   gespeichert. Der Knopf "WAFFE WECHSELN" oeffnet die vorhandene Levelpause mit allen
   dreizehn Waffen; Stufen sind dort kostenlos und ohne Deckel.
   **Mit Boss und Wiederholung** (Thomas 2026-08-26): Nach der Gegnerphase kommt der
   normale Bosskampf, danach die Pause mit der Waffenwahl, dann dasselbe Level wieder -
   das Level zaehlt NICHT hoch, sonst liefe der naechste Waffenvergleich gegen andere
   Gegner. Gekuerzt wird nur die Gegnerphase, nie der Bosskampf.
   **Gemessen im Browser:** 20 s Gegner, 1 s Warnung, 34 s Boss, dann Pause - 57 s gegen
   117 s fuer ein normales Level 5, also 48,7 %. Muenzzaehler durchgehend 0, HUD konstant
   beim Kontostand, Spielstand vor und nach dem Testgelaende byte-identisch.
   **Alle sechs Schreibwege der GameScene laufen ueber `speichere()`, und nur dort steht
   die Sperre** - ein Test liest den Quelltext und schlaegt an, wenn jemand wieder direkt
   `writeSave` aufruft.
   **Grosse Waffenansicht im Testgelaende** (Thomas 2026-08-26: "man weiss nicht wirklich
   welche waffe es ist"): Ein Tipp auf eine Kachel oeffnet Bild, Name, Sterne und die
   Beschreibung aus dem Laden, mit den Knoepfen DAMIT SPIELEN und ZURUECK. Nur im
   Testgelaende - im echten Lauf bleibt der Sofortwechsel, dort waere ein Zwischenschritt
   vor jedem Level ein Tipp mehr. Die Sterne-Rechnung liegt in `weaponStars.ts` und wird
   von beiden Ansichten benutzt (Phaser-frei, damit Tests sie aufrufen koennen).
6. **Aufruestung auf den Kacheln sichtbar** (Thomas 2026-08-26): Eine aufgeruestete Waffe
   traegt in der Waffenwahl unten rechts die Marke "★3". Ohne sie sieht eine voll
   ausgebaute Waffe aus wie eine frisch gekaufte.
   Dabei korrigiert: Die Beschreibungen von Flamme ("nur ganz nah vor der Truppe") und
   Laser ("die weiteste Reichweite") stimmten nach der Reichweiten-Aenderung nicht mehr.
5. **Gekaufte Waffen ab Level 1** statt ein Level vor dem regulaeren Erscheinen.

**Was am Abend NICHT gemessen wurde:** die Wirkung der Aufruestungsstufen im Spiel (nur
die Rechenkette ist per Test gesichert) und die neuen Preise gegen die Einnahmen eines
echten Runs. Beides sollte nach Bennis Test nachgezogen werden.

## Am 2026-08-26 dazugekommen

- **Testgelaende mit Boss, halber Dauer, ohne Muenzen** (siehe Punkt 4 oben).
- **Grosse Waffenansicht im Testgelaende** und **Aufruestungsmarken auf den Kacheln**.
- **Schockwelle raeumt jetzt den Bildschirm** (Thomas: "schockwelle muss fuer diesen preis
  noch staerker werden, weiter nach vorne schiessen und den gesamten bildschirm, alle
  gegner wegraeumen"). `engageShare` 0,22 -> 0,85, Splashradius 135 -> 480 px. Gerechnet:
  Bei 0,85 schlaegt die Welle 479 px vor der Truppe ein, 480 px Radius reichen von dort
  bis zur Truppe und ueber die volle Strassenbreite.
  **Gemessen** (Level 12, Truppe 12, Schaden 2, Rate 4, je 20 s): 12,6 Kills/s bei
  **0 % durchgekommen** - gegen Streubombe 8,1/s und Sturmgewehr 7,35/s bei 8,1 % durch.
  Sie ist damit die staerkste Waffe des Spiels.
  **Bosskampf gegengeprueft:** 29,3 und 29,2 s auf Level 25 (Zusage 30-45 s) - 0,8 s
  unter der Untergrenze und praktisch unveraendert gegenueber vorher. Grund: Am Boss
  bringt der RADIUS nichts, er ist ein einzelnes Ziel; im Bossduell ist die Reichweite
  ohnehin ausgesetzt. Der Wirkungsgrad in `hitEfficiencyLevels` wurde deshalb NICHT
  angefasst - eine Korrektur auf Basis einer anders aufgebauten Messung waere geraten.
  **Nebenbefund:** Der Aufschlagblitz folgte dem Wirkradius und wurde 960 px breit, auf
  einem 390-px-Bildschirm, mehrmals je Sekunde. Jetzt gedeckelt
  (`weapon.splashFlashMaxRadiusPx` 120 = 240 px Blitz); die Wirkung bleibt bei 480 px.
- **ZURUECKSETZEN ist aus dem Menue verschwunden** (Thomas: "Benni ist gerade
  unabsichtlich angekommen und ist jetzt völlig verzweifelt, weil sein Fortschritt weg
  ist"). Es liegt jetzt hinter einem DREI SEKUNDEN LANGEN DRUCK auf den Titel "RUN & GUN",
  danach kommt die bisherige Sicherheitsfrage. Ein Tipp loest nichts aus, auch ein
  schneller Doppeltipp nicht.
  **Und es ist rueckholbar:** `resetSave` legt den alten Stand vorher in einen dritten
  Slot (`rungun_save_v1_vorReset`), den `writeSave` NICHT anfasst - genau daran ist es
  gescheitert, denn die vorhandene Sicherung wird bei jedem Speichern mitgeschrieben.
  Danach steht im Menue "FORTSCHRITT ZURÜCKHOLEN — ¢ 24500, LEVEL 14", solange nichts
  Neues erspielt wurde. Im Browser durchgespielt: Ein Tipp holt Muenzen, Hoechstlevel,
  Bestenliste, gekaufte Waffen und alle Stufen zurueck.
  **Fuer Bennis konkreten Verlust kommt das zu spaet** - sein Stand war beim Zuruecksetzen
  aus beiden Kopien verschwunden.

- **Sicherheitsfrage vor SPIELEN** (Thomas 2026-08-26). SPIELEN startet einen NEUEN Lauf
  und wirft den gesicherten weg - dieselbe Falle wie beim Zuruecksetzen, nur leiser. Die
  Frage nennt das verlorene Level und stellt klar, dass Muenzen und gekaufte Waffen
  bleiben. **Sie kommt nur bei offenem Lauf**: Ohne ihn gibt es nichts zu verlieren, und
  eine Huerde ohne Zweck wird irgendwann blind weggetippt.
- **Staerke als Sterne an allen drei Auswahlstellen** (Thomas 2026-08-26). Laden im
  Menue, Startwaffenwahl vor dem FORTSETZEN und Waffenwahl in der Levelpause zeigen jetzt
  die Staerke - mit eingerechneter Aufruestung, damit sich ein Kauf auch dort zeigt.
  In der Levelpause sind die Kacheln auf dem iPhone nur 40 px breit und die volle Reihe
  ist 48 px: Das Overlay MISST und schaltet dann auf die Kurzform "★4" um
  (`shopOverlay.setzeSterne`). Die Rechnung steht einmal in `weaponStars.ts`.
- **Die Aufruestungsstufe steht NEBEN den Sternen** (Thomas 2026-08-26: "wenn ich die
  waffe schon upgeradet habe ... soll die auch die upgradestufe anzeigen"). Nachgerechnet
  war das noetig: Die Sterne runden auf fuenf Stufen, und ein Ausbau auf Stufe 4
  veraendert bei SECHS der dreizehn Waffen keinen einzigen Stern - bei der Flamme ueber
  alle fuenf Stufen keinen. Jetzt traegt jede Kachel zusaetzlich eine gruene Marke "+4",
  der Laden seinen Klartext "✓ STUFE 4/5" und die grosse Ansicht "AUSGEBAUT: STUFE 4 VON
  5" plus den Prozentwert. Ein Test rechnet die Begruendung nach und faellt weg, sobald
  die Sterne feiner werden - dann darf die Marke verschwinden.

- **Die rechte Wand war ab Level 13 nicht mehr zu schaffen** (Thomas 2026-08-26: "ab
  level 13, 14 usw. werden die waende rechts fast nicht mehr erwerbbar ... richtig schlimm
  ab level 22 und aufwaerts"). **Gemessen, und der Fund liegt tiefer als die Zahlen:**
  `maxFocusSec` ist als Zusage gedacht (eine Kachel kostet nie mehr als 0,6 s Dauerfeuer),
  wurde aber gegen die VOLLE Truppenfeuerkraft gerechnet. An einer schmalen Kachel am
  Bildrand kommt die nie an - die Figuren schiessen spurtreu nach oben.
  Gemessen (Level 13, Truppe 40, Schaden 5, Rate 6, Truppe an der Wand gehalten):
  Sturmgewehr 960/s geplant gegen 174/s echt (18 %), Schrot 1210 -> 179 (15 %), Minigun
  1331 -> 164 (12 %), Rakete 375 -> 172 (46 %). Die ECHTE Wandwirkung ist bei allen vier
  fast gleich, die geplante liegt um Faktor 3,5 auseinander.
  Folge ohne Korrektur: 0,87 s je Kachel auf Level 13, 3,2 s auf Level 20, 3,4 s ab
  Level 25 - bei DREI Kacheln je Abschnitt und 6,0 s, die er im Bild ist.
  Jetzt rechnet der Deckel gegen `wallHardness.wallHitShare` (0,18, der Wert der
  Standardwaffe). **Gegenprobe:** Kachel-HP auf jedem Level 104 statt 151/261/542/576,
  Abschnitt 1,6 bis 3,3 s von 6,0 s.
- **Waffenwahl auch beim NEUEN Spiel** (Thomas 2026-08-26). Wer eine Waffe gekauft hat,
  waehlt sie jetzt auch fuer Level 1 - vorher musste er bis zur ersten Levelpause warten.
  Das Wahlfenster bedient beide Faelle ueber ein `Waffenwahl`-Objekt (Level plus
  Startaktion), weil es beim neuen Spiel keinen RunSnapshot gibt.
- **Die Pistole ist aufruestbar, ohne kaufbar zu sein** (Thomas 2026-08-26: "die muss man
  aber nicht extra kaufen, sondern die soll man einfach immer haben"). Sie steht jetzt im
  Regal (vorn, weil nach Preis sortiert) mit "✓ IMMER DABEI" statt einem Preis. Ihre
  Stufenpreise brauchen eine Basis: 900, hergeleitet wie alle Waffenpreise aus der
  gemessenen Staerke (guenstigste kaufbare Waffe 1.600 bei killsPerSec 3,13, Pistole
  1,75 -> 895). Fuenf Stufen kosten zusammen 3.500 - der billigste Ausbau des Spiels.

## Wichtige Dateien und Befehle
- Plan `docs/plan-v4.md` (enthaelt die Befunde beider Gegenpruefungen) ·
  Endlos-Regler: `BALANCE.level.endless`, `enemy.endlessHpGrowthPerLevel`,
  `stats.endless` — jeder mit Rechenweg und Messbeleg im Kommentar ·
  Task `docs/active-task.md` · **Lessons `docs/lessons.md`** (zu Sitzungsbeginn lesen)
- Balance `src/config/balance.ts` · Levelkurve `src/systems/levelPlan.ts` ·
  Deckel `src/systems/upgrades.ts` · Boss `src/systems/bossPlan.ts`
- `npm run check` · `npm run dev` · Tests via Terminal-Skript · `npm run test:dist`
- Deploy: `gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`

## Einstiegssatz
"Lies `docs/UEBERGABE.md`, `docs/lessons.md` und `docs/plan-v4.md` und arbeite dort weiter.
**Nichts neu aufsetzen** — V1/V2/V3 sind abgenommen und getaggt, V4 ist gebaut, gemessen
und am 2026-08-29 per iPhone-Test abgenommen. Naechste Schritte: die zwei offenen
Nachmessungen (Aufruestungsstufen im Spiel, Preise gegen echte Run-Einnahmen) und die
Staerke von Prellschuss und Saegeblatt im Normalspiel."
