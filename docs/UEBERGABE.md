# Uebergabe: Run & Gun

Stand: 2026-08-25 (V4 gebaut: E1-E7 plus Bosskampfdauer; offen ist Bennis iPhone-Test)

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
- **Ton** — alle sieben Klangeffekte aus, nur Musik (Schalter `audio.effectsEnabled`).
  Musik: zwei Umbauversuche zurueckgebaut, geblieben ist 6 -> 4 s je Akkord.
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
    gekaufte Waffen ab einem Level VOR ihrem regulaeren Erscheinen (`ownedLevelBonus`).
    Gemessene Begruendung: Mit der Streubombe ab Level 1 kommt auf Level 1, 5 und 12 KEIN
    Gegner mehr durch (gegen 4,3 / 15,8 / 19,1 % mit der Pistole, Korridor 4-12 %). Der
    Kauf gibt Sicherheit statt Vorsprung.
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

## Offen — naechster Schritt zuerst
1. **Bennis iPhone-Test.** Alles Gebaute ist im Browser gemessen, Gamefeel gilt erst
   nach seinem Test. Konkrete Fragen: Wird es ab Level 13 spuerbar schwerer? Reicht die
   Pistole auf Level 1? Sind die neuen Preise zu hart?
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
**Nichts neu aufsetzen** — V1/V2/V3 sind abgenommen und getaggt, V4 ist gebaut und
gemessen. Naechster Schritt: Bennis iPhone-Test des ganzen V4."
