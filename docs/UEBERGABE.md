# Uebergabe: Run & Gun

Stand: 2026-09-05 (Versuch "Zwei Bahnen" fertig und von Benni abgenommen - er BLEIBT
vorerst im Testgelaende, der echte Run ist unveraendert. Davor: zehn Gangarten mit Tempo
und Bildtakt, V4, Bennis iPhone-Test am 2026-08-29 ok, am 30.08. der Ton entfernt.)

**Das Naechste liegt in `## Offen — naechster Schritt zuerst

**Es laeuft gerade nichts.** Der Bahnversuch ist abgeschlossen und bleibt im
Testgelaende. Was liegen bleibt, in der Reihenfolge, in der es beim naechsten Mal
sinnvoll ist:

1. **Truppenanzeige: gedeckelt oder echte Zahl?** Gemessen (2026-09-05): Die Truppe hat
   einen Figuren-Pool von genau 30 Objekten (`BALANCE.crowd.max`), gesetzt auf 60 oder
   120 zeigt sie weiterhin 30 - ab Level 2 sieht man also weniger, als man hat (Level 30:
   120). **Leistung ist NICHT der Grund:** 180 zusaetzliche Sprites in die laufende Szene
   gezeichnet, Bildzeit unveraendert bei 16,7 ms Median. Der Grund ist Platz: Die
   Formation darf nur `crowd.maxWidthRatio` breit werden und steht bei 30 Figuren schon
   am Mindestabstand. Machbar waere es - Pool auf 120, `crowd.max` an `getStatCap('hp')`
   koppeln, Formationstiefe pruefen. **Thomas' Entscheidung steht aus.**

2. **Am Anfang eines Levels sollen weniger Gegner kommen, besonders im ersten Level**
   (Thomas 2026-09-05, ausdruecklich "nur zur Info"). Betrifft den ECHTEN Run und die
   abgenommene Level-1-Balance - erst nach eigener Beauftragung anfassen.

3. **Die Schwierigkeit ist dreimal gesenkt worden, ohne Nachmessung** - mittleres Tempo
   je Staerke leicht 0,93, mittel 0,95, schwer 0,91 statt 1,00. Thomas: "Schwierigkeiten
   momentan ok", also kein Handlungsbedarf, aber der Durchkommensanteil ist ungemessen.
   Wer ihn misst, findet den Weg in `docs/lessons.md` (2026-09-05, Lebendpruefung der Sonde).

4. **Stampfen und Schreiten sind nie im Spiel beobachtet worden** - schwere Gestalten
   spawnen zu selten. Gleicher Codepfad wie die acht gemessenen, aber unbelegt.

5. **Staerke von Prellschuss und Saegeblatt im Normalspiel** - bis zum 2026-08-25
   richteten beide keinen Schaden an, ihre Balance-Werte sind nie an einem echten Lauf
   geprueft worden. Vor dem naechsten Feinschliff den Durchkommensanteil auf Level 18
   und 25 mit ihnen messen.

6. **Vier Entscheidungen fuer Thomas** (alle dokumentiert, keine eigenmaechtig getroffen):
   Waffen-Staerkeband endet bei 1,25x (alles darueber hebt den E1-Effekt auf), Stufenzahl
   im Run-Shop bleibt bei elf (Shop ab Level 13 leer; ein neuer Anlauf mit 22 Stufen
   haette seit der feineren Wertestufung Aussicht auf Erfolg), Schwierigkeits-Korridor
   4-12 %.

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
**Nichts neu aufsetzen** — V1/V2/V3 sind abgenommen und getaggt, V4 ist gebaut und
gemessen, die zehn Gangarten sind seit dem 2026-09-05 fertig und im Spiel.
Naechster Schritt ist eine BESPRECHUNG, kein Bauauftrag: die Wandlogik aus dem
Genre-Vorbild Last Z: Survival Shooter (Punkt 0a in `## Offen`). Der Rechercheteil ist
erledigt, es fehlt Thomas' Entscheidung. Danach die aelteren Nachmessungen."
