# Run & Gun — Umsetzungsplan V3 (Bennis Runde: Sammelbahn, Ruckeln, Shop-Bonus, Weiterspielen, Fortsetzen, Zombie-Varianten, Waffenstaffelung, Granatwerfer)

Basis: **V2 ist am 2026-08-23 von Thomas abgenommen** und steht auf `main` (letzter
Commit `f77dc11`). Ein Git-Tag für V2 fehlt noch — **vor der ersten V3-Etappe `v2.0`
setzen**, sonst gibt es keinen sauberen Rückschrittspunkt (V1 liegt als `v1.0` vor, ist
aber inzwischen fünf Balance-Umbauten entfernt).

Die Regeln aus `docs/plan.md` (V1) und `docs/plan-v2.md` gelten unverändert weiter:
Objekt-Pools mit hergeleiteten Größen, alle Tuning-Werte in `balance.ts` mit Rechenweg
als Kommentar, keine externen Requests, keine Kosten, Reißleinen benennen was **kein**
zulässiger Ersatz ist, Gamefeel gilt erst nach Thomas' iPhone-Test als erfüllt. Jede
Etappe endet in einem vollständig spielbaren Stand auf `main`.

## Auslöser

Alle fünf Punkte kommen aus **Bennis Rückmeldung** (Thomas' Sohn, 7 Jahre, der Tester
des Spiels), plus einem Punkt, den Thomas selbst schon zweimal gemeldet hat:

1. Es ruckelt in den ersten Sekunden nach dem Start.
2. Nach jedem Level soll man Schaden und maximale Truppe gegen Münzen ausbauen können.
3. Wer ein Level nicht schafft, soll es gegen Münzen noch einmal spielen können.
4. Eine neue Waffe: Granatwerfer — schießt selten, macht viel Schaden, reicht über den
   ganzen Bildschirm.
5. **(Thomas, dritte Meldung)** Wer am linken Rand kämpft, löst die Plättchen der
   Sammelbahn ungewollt mit ein — das +1 wie das −3.
6. Mehr Abwechslung bei den Gegnern — mehr Zombie-Aussehen.
7. **Bessere Waffen sollen erst in höheren Leveln kommen** — in jedem Level etwas Neues;
   dasselbe gilt für die Zombie-Kleidung.
8. **Aufhören und später an derselben Stelle weiterspielen** — Spielstand sichern und den
   Run fortsetzen.
9. **(Thomas, mit Beleg-Screenshot Level 11, TEAM 48)** Die Sammelbahn löst aus, obwohl die
   Truppe rechts steht — „ist aber nicht immer so".

## Der Kern: Kaufen als Bonus auf die bestehende Levelkurve

**Vorgeschichte, die den Bauplan bestimmt.** Einen Upgrade-Shop gab es schon; Thomas hat
ihn am 2026-08-23 gestrichen (Commit `120f784`, „Shop entfernt — nicht notwendig"). Der
Grund steht im selben Commit: Die Obergrenzen für Schaden, Feuerrate und Truppe sind über
die beiden Wandbahnen nach rund 40 Sekunden von selbst erreicht, ein Level dauert 75–88
Sekunden. Ein Shop, der zusätzlich etwas obendrauf legt, macht das Spiel deshalb leichter —
der Befund, den Thomas dreimal korrigieren musste („man erreicht schnell das Maximum
überall und verliert nie etwas").

**Entscheidung Thomas 2026-08-23, zweite Fassung:** Die automatische Erhöhung je Level
**bleibt** (`stats.damage` 1,5 → 7, `stats.shotsPerSec` 3,5 → 8, `stats.hp` 30 → 100 über
elf Level, exponentiell interpoliert in `upgrades.getStatCap`). Das Kaufen zwischen den
Leveln ist ein **Bonus obendrauf**. Eine erste Fassung dieses Plans hatte den Automatismus
durch die Kaufkurve ersetzt; das ist verworfen.

**Damit ist der Zielkonflikt bewusst in Kauf genommen:** Wer kauft, hat es leichter als
heute. Genau das ist der Zweck — Benni soll für seine Münzen etwas spüren. Die Aufgabe
dieses Plans ist deshalb nicht, den Effekt zu vermeiden, sondern ihn **zu begrenzen und
messbar zu halten** (siehe Bonushöhe und Reißleine unten).

Zwei Knöpfe, nicht mehr (der Tester ist 7 Jahre alt):

| Knopf | Wirkung je Stufe | Nach 11 Stufen |
|---|---|---|
| **TRUPPE** | Obergrenze +8 % | +134 % Reserve (Level 12: 100 → 234) |
| **FEUERKRAFT** | Schaden und Feuerrate je +3 % | +38 % Feuerkraft |

**Warum die beiden so unterschiedlich großzügig sind — das ist der eigentliche
Balance-Gedanke dieser Etappe:**

- **Truppe ist harmlos.** Aus ihr entsteht keine Feuerkraft: Der Schadensbonus der Truppe
  ist bei 30 Figuren ausgereizt (`crowd.damageMultiplierCap`, per Test gesichert), alles
  darüber ist reine Reserve, also Überlebenszeit. Ein großzügiger Truppen-Bonus macht das
  Spiel **nachsichtiger**, nicht schneller — er verzeiht Fehler, statt Gegner
  wegzuräumen. Deshalb darf er deutlich ausfallen; das ist der Knopf, der sich für ein
  Kind gut anfühlt.
- **Feuerkraft ist heikel und braucht einen harten Deckel.** Die heutigen Deckel liefern
  gemessen das 14,2-fache des Bedarfs auf Level 1, 8,5-fach auf Level 4, 4,6-fach auf
  Level 8 und **2,5-fach auf Level 12**. Unten ist also viel Luft (ein Bonus fällt gar
  nicht auf), oben fast keine. +38 % heben Level 12 von 2,5× auf 3,5× Bedarf. **Das ist
  die Grenze**, ab der das Endspiel spürbar seinen Druck verliert. Mehr als 3 % je Stufe
  ohne neue Messung ist deshalb nicht zulässig.

**Zwei Regeln halten den Bonus dicht:**

1. **Höchstens eine Stufe je Knopf und Levelpause.** Ohne diese Regel kauft ein volles
   Konto nach Level 1 alles frei, und der Bonus ist kein Bonus mehr, sondern ein
   Startvorteil.
2. **Gekaufte Stufen gelten nur für den laufenden Run.** Dauerhafte Stufen wären der
   gestrichene Shop von 2026-08-23 unter neuem Namen — und würden sich über viele Runs
   aufsummieren, bis das Spiel von selbst durchläuft.

**Was NICHT angefasst wird:** `bossPlan.ts:158-159` liest die Boss-Härte aus
`getStatCap(stat, level)`, also aus der Levelnummer. Das bleibt **unverändert** — der Boss
zieht mit dem gekauften Bonus nicht mit. Genau darin besteht der Vorteil, den Benni kauft.
Dasselbe gilt für die Wandhärte. Damit entfällt der größte Teil des Umbaus, den die erste
Planfassung noch vorsah.

## Ökonomie: was es kosten soll

### Einnahme je Level (gerechnet)

Aus den gemessenen Größen des Projekts: Gegner je Sekunde (Browser-Messung 2026-08-23,
L1 6,49 / L4 8,31 / L8 10,30 / L12 12,56, dazwischen linear), Gegnergewichte und
Münzwerte aus `level.plans` und `enemy.types` (leicht/standard 1, schwer 3), Leveldauer
`normalPhaseSec` plus Bossphase mit halber Gegnerrate, 92 % getötet (Durchkommensanteil
4–12 %, gemessen), Boss `coinReward` 25.

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Münzen | 440 | 500 | 540 | 590 | 640 | 710 | 780 | 870 | 970 | 1.090 | 1.190 | 1.330 |

Ganzer Run bis Level 12: **~9.650 Münzen**; bis zur letzten Kaufgelegenheit (nach Level
11) **~8.320**.

**ACHTUNG, die eine geschätzte Zahl:** In diesen Werten steckt eine **Einsammelquote von
80 %** — wie viele der gedroppten Münzen tatsächlich eingesammelt werden
(`coins.magnetRadius` 200 px bei 390 px Bildbreite). Diese Zahl ist **nicht gemessen**.
Liegt sie real bei 60 %, ist die Preistabelle unten 25 % zu teuer. Seit der Kauf ein Bonus
ist, führt das nicht mehr in die Unspielbarkeit — aber der Shop bliebe für Benni
weitgehend leer, und damit wäre die Etappe ihren Zweck los. **Die Messung läuft als
Vorarbeit von B2, bevor Preise gesetzt werden.**

### Preistabelle

Preis je Stufe = **37,5 % des Levels-Einkommens**. Beide Knöpfe zusammen kosten damit
drei Viertel dessen, was das Level einbringt.

| Stufe (kaufbar nach Level) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Preis je Knopf | 150 | 190 | 200 | 220 | 240 | 270 | 290 | 330 | 360 | 410 | 450 |

Voller Ausbau beider Linien: **6.220 von 8.320 möglichen Münzen**. Wer sauber sammelt,
kriegt fast alles und behält rund 2.100 fürs Konto. Wer schlampig sammelt, muss zwei bis
drei Stufen auslassen und wählen: mehr Feuerkraft oder mehr Reserve. **Das ist die
Entscheidung, die Benni haben will** — sie entsteht aus dem Sammeln, nicht aus einer
künstlich hohen Preisliste. Weil der Kauf ein Bonus ist, kostet ein leeres Konto nie den
Run, sondern nur den Vorsprung.

### Ein Konto, kein zweites Geld

Alles Gesammelte fließt auf das bestehende Konto (`save.coins`, wird heute schon
akkumuliert und im Menü als „KONTO ¢ X" angezeigt — ein Konto ohne Verwendung). Shop und
Weiterspielen zahlen von dort. Zwei getrennte Töpfe wären für einen 7-Jährigen eine Regel
zu viel; die Stufenbegrenzung (eine je Knopf und Pause) verhindert, dass ein volles Konto
das Spiel entwertet.

### Weiterspielen nach dem Scheitern

Preis **250 × erreichtes Level**, verdoppelt sich beim zweiten Mal, danach ist Schluss
(höchstens zwei je Run). Also 750 auf Level 3, 2.000 auf Level 8, 3.000 auf Level 12; ein
zweites Mal auf Level 8 kostet 4.000. Das Level beginnt **von vorn**, alle gekauften
Stufen bleiben, die Truppe startet bei der **Hälfte der aktuellen Obergrenze** — spürbare
Strafe, aber spielbar. Gegenprobe: Ein voller Run bringt ~9.650 und kostet ~6.220 an
Stufen, also ist etwa ein Weiterspielen pro Run finanzierbar. Ein früher Tod auf Level 3
lässt ~940 auf dem Konto gegen 750 Preis — gerade so, wie gewollt.

## Etappen

Reihenfolge: **B0 → B1 → B2 → B3 → B5 → B4 → B6.** Erst die zwei Dinge, die den
bestehenden Stand reparieren, ohne ihn umzubauen (B0 Sammelbahn und Wand-Bug, B1 Ruckeln),
dann der Umbau (B2 Shop, B3 Weiterspielen und Fortsetzen), dann die Zusätze (B5 Zombies,
B4 Granatwerfer, B6 Waffenstaffelung).

Drei Abhängigkeiten sind zwingend, nicht Geschmack:
- **B5 nach B1** — es fügt Texturlast hinzu und würde eine unbehobene Ruckel-Ursache
  verschleiern.
- **B6 nach B4** — die Staffelung stuft den Granatwerfer mit ein; vorher gäbe es einen
  Tabelleneintrag für eine Waffe, die es noch nicht gibt.
- **B3 Teil 2 nach B3 Teil 1** — das Fortsetzen benutzt denselben Wiedereinstieg wie das
  gekaufte Weiterspielen.

B4 und B5 brauchen beide neue Bilder von Codex; dieser Auftrag geht **einmal gemeinsam**
raus, sobald B1 läuft, damit die Bilder fertig sind, wenn der Einbau drankommt.

### B0 — Sammelbahn: kämpfen ohne ungewolltes Einsammeln

**Befund.** Die heutige Regel ist eine **unsichtbare Schwelle**
(`GameScene.crowdStehtInSammelbahn`, `walls.pickupOverlapFigures` 1,2): Ein Plättchen wird
eingelöst, sobald die Truppe mit 1,2 von 2,4 Figurenbreiten in der Bahn steht — für das
+1 und das −3 **gleichermaßen**. Gemessen war es ein harter Schalter: bis 60 px links der
Mitte gar nichts, ab 80 px alles. Zwanzig Pixel entscheiden, und nichts im Bild zeigt, wo
sie liegen.

Der Grund, warum man überhaupt dort steht, ist struktureller: Die Feuerlinie ist 78 px
breit (`crowd.maxWidthRatio` 0,20, laut Übergabe am unteren Anschlag), der Anflugbereich
155 px. Wer linke Gegner treffen will, **muss** an den Rand. Dieselbe Fingerbewegung
steuert damit zielen, sammeln und ausweichen zugleich. Zweimal an den Zahlen zu drehen
(`pickupOverlapFigures`, `drainTeam` 5 → 3) hat das nicht gelöst, weil die Zahlen nicht
das Problem sind.

**Umsetzung: Rot verlangt mehr Tiefe als Blau.** Neuer Wert
`walls.drainOverlapFigures` = 2,0 neben dem bestehenden `pickupOverlapFigures` = 1,2
(Hüllenbreite ist 2,4). Das +1 löst weiter bei halber Überlappung aus, das −3 erst, wenn
die Truppe fast vollständig in der Bahn steht. Wer am Rand kämpft und streift, nimmt nur
das Gute mit; wer bewusst zum Sammeln hineinfährt, trägt das Risiko wie bisher. Die
Entscheidung, die die roten Kacheln bauen sollen, bleibt vollständig erhalten — sie
verlangt nur eine Absicht statt eines Zufalls.

#### Zusätzlich zu klären: löst die Bahn auch von rechts aus?

**Beleg (Thomas 2026-08-23, Screenshot Level 11, TEAM 48, DMG 5,3, RATE 6,9):** Die Truppe
steht rechts der Mitte, über ihr steht die grüne Quittung „+1" — es wurde also eingelöst.
„Ist aber nicht immer so."

**Was der Code dazu schon hergibt** (gelesen, nicht gemessen): Die Kollisionshülle ist
**fest** 2,4 Figurenbreiten breit und wächst **nicht** mit der Truppengröße
(`crowd.ts:47`, Kommentar „The collision hull stays fixed instead of growing with the
formation"). **Die Teamzahl scheidet damit als Ursache aus** — Thomas' Verdacht „Level oder
Teamzahl" ist zur Hälfte beantwortet. Rein geometrisch aus dem Screenshot gerechnet liegt
zwischen Hülle und linker Bahn zu diesem Zeitpunkt kein Kontakt.

**Zwei Hypothesen, jede mit Vorhersage — beide werden geprüft, keine gilt ohne Gegenprobe
als erledigt:**

- **(A) Die Quittung wandert mit, die Einlösung war früher.** `GameScene` spawnt das
  Popup an `crowd.getAnchorX()`, also dort, wo die Truppe **jetzt** steht — nicht an der
  Kachel. Wer nach dem Einsammeln nach rechts zieht, sieht das „+1" mitfahren. **Vorhersage:
  In der Messung liegt zwischen Einlösezeitpunkt und Anzeigezeitpunkt eine Ankerbewegung
  nach rechts, und zum Einlösezeitpunkt lag echte Überlappung vor.** Trifft das zu, ist es
  kein Sammel-Fehler, sondern eine irreführende Anzeige — Behebung: Quittung an der
  Kachelposition erscheinen lassen. Das erklärt auch „nicht immer": Es passiert nur, wenn
  man direkt nach dem Einsammeln wegzieht.
- **(B) Echte Fehlauslösung durch zu breite Kollisionskörper.** Die Wandsegmente bekommen
  in `walls.ts:276` einen festen Körper `setSize(128, segmentHeightPx)`, während die Grafik
  perspektivisch skaliert wird. Weicht der Körper von der gezeichneten Kachel ab, meldet
  die Physik einen Kontakt, den man im Bild nicht sieht. **Vorhersage: Bei fester
  Ankerposition rechts der Mitte wird ein Kontakt gemeldet UND `crowdStehtInSammelbahn`
  liefert `true`, obwohl die gezeichneten Rechtecke sich nicht überlappen.** Trifft das zu,
  wird der Körper an die gezeichnete Kachel angeglichen.

**Messvorschrift:** Anker in 10-px-Schritten von der linken Straßenkante bis zur rechten
festhalten, je 15 s, protokolliert werden Ankerposition, gemeldeter Kontakt, Ergebnis von
`crowdStehtInSammelbahn`, gezeichnete Überlappung in Pixeln und Einlösungen. Zusätzlich
**auf mindestens drei Leveln** (1, 6, 11), weil Thomas' zweiter Verdacht — Levelabhängigkeit
— noch offen ist. Aus derselben Messreihe fällt der Nachweis für den Streifen oben mit ab.

**Bewusst NICHT gebaut (Thomas 2026-08-23):** eine sichtbare Markierung der Sammelgrenze.
Der Vorschlag lag vor und ist gestrichen. Damit bleibt die Schwelle unsichtbar, und die
Wirkung von B0 hängt allein daran, dass der Streifen breit genug ist — das macht das
Messkriterium unten zum eigentlichen Beleg der Etappe.

**Akzeptanz:** (1) Aus der Messreihe: Es gibt einen Bereich von mindestens 30 px Breite, in
dem +1 eingelöst wird und −3 nicht. (2) **Rechts der Straßenmitte wird auf keinem der drei
gemessenen Level etwas eingelöst.** (3) Beide Hypothesen sind mit ihrer Vorhersage geprüft
und im Commit beantwortet — auch die, die sich nicht bestätigt hat. (4) Thomas bestätigt am
iPhone, dass Kämpfen am linken Rand keine Figuren mehr kostet und dass die Quittung dort
erscheint, wo eingelöst wurde.

**Reißleine:** Bleibt der Effekt nach einer Runde Nachjustieren aus, **rote Kacheln links
ersatzlos streichen** und den Verlust ganz auf die rechte Bahn legen (dort heißt die
Handlung „Feuer einstellen" und kollidiert nicht mit dem Zielen). **Kein zulässiger
Ersatz:** die roten Kacheln nur seltener oder billiger machen — das ist die dritte Runde
desselben Fehlers.

### B1 — Ruckeln am Start finden und beheben

**Zwei Verdächtige, keiner belegt.** (a) Der Service Worker: `main.ts` registriert mit
`immediate: true` und prüft bei jedem `visibilitychange` auf Updates — beim ersten Start
wird der komplette Precache geschrieben. (b) Texturen, die erst beim ersten Erscheinen
zur GPU hochgeladen werden: In den ersten Sekunden erscheinen nacheinander Kulisse (8
Texturen), Wandkacheln (3), Gegnertypen (3), Projektile, Münze, Schatten — jeder
Erst-Upload ist ein Frame-Hänger. Dazu erzeugt `GameScene.create()` rund 1.500
Pool-Objekte, das ist aber ein einmaliger Freeze **vor** dem ersten Bild, kein Ruckeln
über Sekunden.

**Bennis Antwort vom 2026-08-23 grenzt es ein: „wenn das Spiel losläuft, aber nicht
immer."** Beide Hälften zählen. „Wenn das Spiel losläuft" schließt den App-Start aus, es
geht also um den Übergang Menü → `GameScene`. **„Nicht immer" spricht gegen den
Textur-Upload** — der wäre bei jedem ersten Start gleich und danach nie wieder, also
reproduzierbar. Ein Ruckeln, das mal auftritt und mal nicht, ist typisch für einen
Zustand, der von außen kommt: ein Service-Worker-Update, das nur manchmal vorliegt, ein
kalter gegen einen warmen Start, oder die Speicherbereinigung nach der Erzeugung der rund
1.500 Pool-Objekte in `GameScene.create()`.

**Erst messen, dann bauen:** DEV-Marker auf die Frame-Zeiten der ersten fünf Sekunden,
getrennt nach erstem Start, Folgestart und Start direkt nach einem Game Over. Mindestens
fünf Starts, weil der Fehler nicht immer auftritt — ein einzelner sauberer Lauf ist
**kein** Beleg für Behebung.

**Wahrscheinlichste Behebung** (erst nach der Messung festlegen): Update-Check des Service
Workers aus dem Startpfad heraus verzögern; Pool-Erzeugung auf mehrere Bilder verteilen
oder in die Menü-Szene vorziehen; ein Warm-up-Pass, der alle Texturen einmal unsichtbar
zeichnet, bevor `GameScene` startet.

**Akzeptanz:** Gemessene Frame-Zeit in den ersten fünf Sekunden bleibt über **fünf
aufeinanderfolgende Starts** unter 20 ms (kein Bild über zwei Bildschirmaktualisierungen),
auf dem iPhone von Benni bestätigt.

**Reißleine:** Findet die Messung nach zwei Anläufen keine Ursache, wird der Befund in
der Übergabe dokumentiert und die Etappe geschlossen — **kein zulässiger Ersatz:** auf
Verdacht Optimierungen einbauen, die nichts belegen.

### B2 — Shop nach jedem Level

**Vorarbeit (Pflicht, bevor Preise gesetzt werden):** Münz-Einnahme je Level im Browser
messen (Messsonde als temporäre `tests/_income.test.ts` bzw. Playwright mit manuell
getaktetem `coins.update`, danach löschen). Ergebnis ersetzt die 80-%-Schätzung oben; die
Preistabelle wird mit dem gemessenen Wert neu gerechnet und der Rechenweg als Kommentar
in `balance.ts` hinterlegt.

**Umbau (klein, seit der Bonus-Entscheidung):**
- `upgrades.getStatCap(stat, level)` bekommt einen **Bonusfaktor** obendrauf: Der
  Levelwert wird wie heute berechnet und anschließend mit `(1 + bonusProStufe)^Stufen`
  multipliziert. `RunStats` hält die gekauften Stufen je Knopf.
- **`bossPlan.ts` und die Wandhärte bleiben unangetastet** — sie rufen weiterhin die
  reine Levelvariante auf. Ein neuer Parameter mit Standardwert 0 hält beide Aufrufe
  gültig, ohne sie zu ändern.
- **`tests/enemyResistance.test.ts:143-144` bleibt ebenfalls gültig** (rechnet mit der
  Levelvariante). Neu dazu: ein Test, der die Bonusobergrenze festhält — 11 Stufen
  Feuerkraft dürfen den Deckel um höchstens 38 % heben.
- Shop-Overlay in der Levelpause (`GameScene.advanceLevel`, heute 1.800 ms
  „LEVEL X GESCHAFFT"): zwei große Knöpfe mit Preis und Wirkung, Kontostand, Weiter-Knopf.
  Die Pause wartet auf den Weiter-Knopf statt auf einen Timer.
- Konto: `save.coins` wird beim Kauf belastet und geschrieben.

**Akzeptanz:** Wer nichts kauft, spielt exakt das heutige Spiel — messbar identische
Deckel auf jedem Level, ein Test sichert das. Wer nach jedem Level beide Stufen kauft, hat
auf Level 12 +38 % Feuerkraft und +134 % Truppenreserve, nicht mehr. Höchstens eine Stufe
je Knopf und Pause. Boss-HP und Wandhärte verändern sich durch das Kaufverhalten nicht.
Thomas bestätigt am iPhone, dass das Overlay bedienbar ist.

**Reißleine (Zeitbudget: zwei Balance-Zyklen).** Der Bonus ist der bewusst eingegangene
Kompromiss dieser Etappe; die Gegenprobe gehört deshalb fest dazu: **Gemessen wird der
Anteil durchkommender Gegner auf Level 8 und 12, einmal ohne Käufe und einmal voll
ausgebaut** (dasselbe Verfahren wie beim Gegner-Widerstand am 2026-08-23, Zielkorridor
4–12 %). Fällt der Anteil voll ausgebaut unter 2 %, läuft das Spiel wieder durch — dann
wird **der Bonus je Stufe gesenkt** (zuerst Feuerkraft, die Truppe zuletzt) oder die
Gegner-Kopplung `enemy.firepowerCoupling.dampening` angehoben, bis der Korridor wieder
steht. **Kein zulässiger Ersatz:** den Bonus stehen lassen und das Ergebnis als „fühlt
sich gut an" abhaken — genau diese Abkürzung hat 2026-08-23 drei Korrekturrunden gekostet.

### B3 — Weiterspielen gegen Münzen

`GameOverScene` bekommt einen Knopf „WEITERSPIELEN — ¢ X", solange das Konto reicht und
weniger als zwei Weiterspielen in diesem Run verbraucht sind. `GameScene` muss dafür einen
Wiedereinstieg bekommen: Level von vorn, gekaufte Stufen und Run-Münzen bleiben, Truppe
auf die Hälfte der aktuellen Obergrenze, Zähler „verbrauchte Weiterspielen" hoch.

**Bestenliste (Thomas 2026-08-23):** Ein Run mit gekauftem Weiterspielen **zählt weiter**,
wird aber **farblich markiert** — der Eintrag erscheint in einer eigenen Farbe, damit
erkämpft und erkauft auf einen Blick auseinandergehen.

**Achtung, bekannte Falle:** `ScoreEntry` braucht dafür ein neues Feld. `save.parseSave`
prüft die Struktur streng und verwirft bei Fehlschlag den **ganzen** Spielstand. Das Feld
muss deshalb optional gelesen werden (fehlt es, gilt „kein Weiterspielen") — genau wie es
2026-08-23 beim entfernten `upgrades`-Feld gemacht wurde, um bespielte Geräte nicht ihre
Bestenliste zu kosten. Ein Test sichert, dass ein alter Spielstand ohne das Feld weiter
geladen wird.

#### Teil 2: Aufhören und später weiterspielen

**Wunsch (Thomas 2026-08-23):** „Die Möglichkeit aufzuhören und später an dieser Stelle
weiterspielen."

**Warum das hierher gehört und fast nichts extra kostet:** Teil 1 baut ohnehin einen
Wiedereinstieg — „Level von vorn, gekaufte Stufen und Münzen bleiben". Das Fortsetzen nutzt
**exakt dieselbe Funktion**, nur ausgelöst aus dem Menü statt aus dem Game Over. Als eigene
Etappe wäre es doppelte Arbeit.

**Wo gespeichert wird: an der Levelgrenze, sonst nirgends.** Den kompletten Spielzustand
mitten im Level zu sichern (Gegner im Anflug, Wandkette, Bossphase, alle Objekt-Pools) wäre
ein Vielfaches an Aufwand und die häufigste Fehlerquelle für kaputte Spielstände. Beim
Levelwechsel dagegen ist der Zustand klein und vollständig beschreibbar: Levelnummer,
Truppe, Schaden, Feuerrate, Waffe, Run-Münzen, gekaufte Stufen, verbrauchte Weiterspielen.
Das Menü zeigt dann „FORTSETZEN — LEVEL 8", und dieses Level beginnt von vorn.

**Missbrauch verhindern, ohne unfair zu werden:** Ohne Regel könnte man kurz vor dem Tod die
App schließen und gratis beim letzten Levelanfang neu einsteigen — das würde Teil 1
entwerten, der Münzen kostet. Regel deshalb: **Der Fortsetzen-Punkt wird gelöscht, sobald
der Run endet** (Game Over). Wer stirbt, hat nur noch den kostenpflichtigen Knopf. Wer die
App schließt, ohne zu sterben, findet seinen Punkt vor. Ein abgestürztes Handy verliert
höchstens das angefangene Level, nie den Run.

**Akzeptanz:** Preis stimmt mit der Formel überein, Konto wird korrekt belastet, nach dem
zweiten Mal ist der Knopf weg, markierte Einträge sind in der Bestenliste erkennbar, ein
Spielstand aus der Zeit davor lädt weiterhin, der Spielstand überlebt einen App-Neustart.
Fortsetzen erscheint im Menü nur, wenn ein Punkt existiert; nach einem Game Over ist er
weg; ein fortgesetzter Run behält Stufen, Waffe und Münzen.

### B5 — Mehr Zombie-Aussehen

**Wunsch (Benni, über Thomas 2026-08-23):** mehr verschiedene Gegner. **Entscheidung
Thomas:** keine neuen Gegnertypen, sondern die drei vorhandenen Zombie-Arten in
**verschiedenen Kleidungsfarben**. Das ändert nur die Optik, keine einzige Balance-Größe —
`enemy.types` (hp, Tempo, Schaden, Münzwert, Körpermaße) bleibt unangetastet, sonst wäre
es keine Textur-Etappe mehr, sondern ein Balance-Umbau.

**Umsetzung:** Vier Farbvarianten je Typ statt einer, also zwölf statt drei Bildern. Codex
erzeugt sie aus den bestehenden Sprites — **gleiche Figur, gleiche Haltung, gleiche
Körpermaße, nur andere Kleidungsfarbe.** Das ist Bedingung, nicht Wunsch: Die Körpermaße
in `enemy.types` sind an den vorhandenen Bildern nachgemessen (W7), eine abweichende
Silhouette würde Trefferflächen und Formationsabstände verschieben. Der Spawner zieht beim
Spawn eine Variante zufällig; das Recycling im Pool setzt die Textur ohnehin schon.

**Ein technischer Punkt, der über Erfolg oder Ruckeln entscheidet:** Die zwölf Varianten
gehören in **einen Textur-Atlas** (eine große Bilddatei mit allen Figuren darin), nicht in
zwölf Einzeldateien. Grund: Die Grafikkarte zeichnet alles, was dieselbe Textur benutzt, in
einem Rutsch. Zwölf Einzeltexturen zwingen sie bei bis zu 73 gleichzeitigen Gegnern
(gemessen auf Level 12) zu deutlich mehr Einzelaufträgen — auf einem iPhone genau die Art
von Last, die B1 gerade beseitigt hat.

**Reihenfolge zwingend nach B1.** Diese Etappe fügt Texturlast hinzu; sie darf erst laufen,
wenn das Startruckeln gemessen und behoben ist, sonst ist nicht mehr zu trennen, was die
Ursache war.

**Gestaffelt freischalten (Thomas 2026-08-23):** Nicht alle vier Varianten von Anfang an,
sondern **ab Level 1 eine, ab Level 3 zwei, ab Level 6 drei, ab Level 9 vier**. Damit
verändert sich das Bild über den Run sichtbar weiter, auch nachdem alle Waffen da sind
(B6 staffelt die bis Level 7) — die „immer noch was Neues"-Kette reißt dadurch nicht ab.
Kostet keine zusätzliche Arbeit: eine Tabelle in `balance.ts`, die der Spawner beim Ziehen
der Variante auswertet.

**Akzeptanz:** Zwölf Varianten im Atlas, sichtbar gemischte Horden, Freischaltstufen greifen
(Test), `enemy.types` unverändert, Bildbudget unter Volllast (Level 12) nicht schlechter als
vor der Etappe — gemessen mit demselben Verfahren wie in W6 (dort 3 % Bildbudget). Benni
bestätigt am iPhone, dass die Gegner abwechslungsreicher aussehen.

**Reißleine:** Reicht Codex' Ergebnis optisch nicht, wird die Variantenzahl auf zwei je Typ
gesenkt. **Kein zulässiger Ersatz:** die Sprites im Spiel einfach einfärben (`setTint`) —
das färbt Gesicht und Hände mit und macht aus Zombies bunte Klötze.

### B4 — Granatwerfer

Achte Waffe. Alle sieben vorhandenen liegen im gemessenen Stärkeband 1,15–1,27× der
Standardwaffe (Commit `a98a920`); die neue muss dort hinein.

**Startwerte, gerechnet** (Nominalstärke = Rate × Schaden × Schützen × Kugeln, Splash als
Faktor; Standardwaffe = 8,0):

| Wert | Vorschlag | Begründung |
|---|---|---|
| `rateFactor` | 0,15 | Langsamste Waffe im Spiel (Rakete 0,25) — „schießt selten" |
| `damageFactor` | 3,2 | Höchster Wert im Spiel (Rakete 2,5) — „viel Schaden" |
| `shootersPerSalvo` | 4 | 0,15 × 3,2 × 4 = 1,92 nominal |
| `splashRadiusPx` | 110 | Rakete 70; größter Wirkbereich im Spiel |
| `splashDamageFactor` | 1,6 | Rakete 1,5 |
| `projectileSpeed` | 380 | Rakete 300 — langsam, man schießt auf Vorhalt |
| `engageShare` | 0,95 | „ganzer Bildschirm" — siehe Warnung unten |
| `minLevel` | 5 | Späte Belohnung |
| Pool | 12 | 1,2 Salven/s × 4 Schützen × 1,41 s Flugzeit = 6,8; 12 lässt 76 % Reserve |

Mit einem geschätzten Splash-Faktor von 5,0 ergibt das 9,6 → **1,20× der Standardwaffe**,
also am unteren Rand des Bandes. Der Splash-Faktor ist **geschätzt** und muss wie bei den
anderen Waffen gemessen werden; `damageFactor` wird danach nachgezogen, bis 1,2–1,3×
erreicht sind.

**Warnung zur Reichweite.** `engageShare` nahe 1,0 ist genau die Stellschraube, die Thomas
am 2026-08-23 beim Laser zurückdrehen musste (0,85 → 0,60): Bei zu großer Reichweite
sterben alle Gegner am Horizont und kommen nie an — „Gegner sollen ankommen" fiele mit dem
ersten Waffenfund wieder um. Die niedrige Feuerrate entschärft das teilweise, hebt es aber
nicht auf. **Messkriterium: Fällt die mittlere Todeshöhe mit dem Granatwerfer unter
250 px, muss `engageShare` gesenkt werden** — die Reichweite ist dann nicht verhandelbar,
der Wunsch „ganzer Bildschirm" wird auf „weiteste Waffe im Spiel" reduziert und Thomas
informiert.

**Assets:** `weapon-grenade-gate.png` und `weapon-grenade-hud.png` plus Projektil-Textur.
**Bilder erzeugt Codex**, nicht Thomas — normaler Codex-Auftrag, kein Blocker.

**Akzeptanz:** Stärke gemessen im Band 1,2–1,3×, Todeshöhe über 250 px, Pool läuft unter
Volllast nicht leer, Waffe erscheint ab Level 5 in der Auswahl, Thomas bestätigt am
iPhone, dass sie sich nach Granatwerfer anfühlt.

### B6 — Waffen über die Level staffeln

**Wunsch (Benni, über Thomas 2026-08-23):** „Die besseren Waffen sollen auch erst in den
höheren Leveln kommen — also immer noch was Neues dazu."

**Ein ehrlicher Punkt vorweg, der die Umsetzung bestimmt.** „Bessere Waffen" gibt es im
Spiel nicht: Alle sieben vorhandenen liegen bewusst im gemessenen Stärkeband 1,15–1,27×
der Standardwaffe (Commit `a98a920`), der Granatwerfer kommt mit 1,20× dazu. Eine echte
Steigerung — späte Waffen wirklich stärker — würde dieses Band aufbrechen und das Endspiel
leichter machen; das wäre derselbe Fehler wie ein zu großer Feuerkraft-Bonus, nur an
anderer Stelle.

**Also: Freischaltung staffeln, Stärke gleich lassen.** Was sich steigert, ist die
**Auffälligkeit** — was eine Waffe tut, nicht wie viel sie tut. Die Reihenfolge ist danach
gewählt: schlicht → Durchschlag → Sprengwirkung → Dauerfeuer → Fächer → Kette → großer
Sprengradius. Das fühlt sich nach Aufstieg an, ohne einer zu sein.

| Waffe | `minLevel` heute | neu | Was neu daran auffällt |
|---|---|---|---|
| NORMAL | 1 | 1 | Startwaffe |
| SCHROT | 1 | 1 | Streuung |
| LASER | 1 | **2** | Durchschlag |
| RAKETE | 1 | **3** | Sprengwirkung |
| MINIGUN | 3 | **4** | Dauerfeuer |
| FLAMME | 3 | **5** | Fächer, Nahbereich |
| BLITZ | 3 | **6** | springt auf Nachbarn über |
| GRANATWERFER | — | **7** | größter Sprengradius, ganze Bildbreite |

**Prüfen, nicht annehmen:** Auf Level 1 bleibt damit **eine einzige** Alternative zur
Startwaffe übrig (`weaponChoices.getWeaponRewardChoices` filtert nach `minLevel`), das
Waffentor zeigt dort also immer dasselbe. Das ist für das Lernlevel vertretbar, muss aber
im iPhone-Test bestätigt werden; ab Level 2 sind es zwei, ab Level 3 drei Alternativen.

**Zusammenspiel mit B5:** Waffen liefern bis Level 7 in jedem Level etwas Neues, die
Zombie-Farben ab Level 3, 6 und 9. Zusammen reißt die Kette über den ganzen Run nicht ab.

**Aufwand:** Reine Zahlenänderung in `balance.ts` plus ein Test, der die Staffelung und die
Mindestzahl an Toralternativen je Level festhält.

**Akzeptanz:** Auf jedem Level erscheinen nur freigeschaltete Waffen; ab Level 7 sind alle
acht verfügbar; kein Stärkewert wurde angefasst (das Waffenband bleibt unverändert, Test).

### B7 — Ton (noch nicht startbereit)

**Thomas 2026-08-23: „Den Ton müssen wir uns auch nochmal vornehmen irgendwann."**

Der Ton ist gebaut und funktioniert: sieben synthetisch erzeugte Klänge über Web Audio,
ohne eine einzige Audiodatei, mit Schalter im Menü (`audio.ts`, `audioPlan.ts`, seit
2026-08-22). Was daran stört, ist **nicht gesagt** — und ohne diese Angabe ist die Etappe
nicht spezifizierbar. Möglich ist alles von „klingt billig" über „zu laut / zu oft" bis
„die falschen Ereignisse machen Geräusch".

**Diese Etappe bleibt bewusst leer, bis Thomas oder Benni beschreibt, was konkret stört.**
Sie hinter B4 zu setzen und mit einer erfundenen Aufgabenstellung zu füllen, wäre genau
der Fehler, vor dem `docs/lessons.md` beim Sprite-Auftrag warnt: ein Ersatzprodukt statt
der gefragten Sache.

**Sinnvolle Frage an Benni, wenn es soweit ist:** Welcher Ton nervt, und welcher fehlt?
Zwei konkrete Antworten reichen für eine Spec.

## Risiken & Reißleinen (Überblick)

| Risiko | Reißleine |
|---|---|
| Einsammelquote real deutlich unter 80 % → Preise zu teuer, der Bonus bleibt unerreichbar | Messung **vor** B2; Preisformel senken, nicht die Bonushöhe anheben |
| **Bonus macht das Spiel wieder zu leicht — bewusst eingegangen, siehe Kern** | Feuerkraft-Bonus auf +38 % gedeckelt; Stufenbegrenzung; Stufen nur run-lokal; Pflichtmessung des Durchkommensanteils in B2 |
| Sammelbahn-Fix wirkt nicht | Rote Kacheln links streichen, Verlust ganz nach rechts |
| Granatwerfer hebt die Kampfzone auf | `engageShare` senken, Wunsch auf „weiteste Waffe" reduzieren, Thomas informieren |
| Ruckel-Ursache nicht auffindbar | Nach zwei Messanläufen als Befund dokumentieren und schließen |
| Zwölf Gegner-Texturen kosten Bildrate | Atlas statt Einzeldateien; B5 zwingend nach B1; bei Bedarf zwei Varianten je Typ |
| Wand-Bug bleibt unerklärt, weil eine Hypothese ungeprüft „erledigt" wirkt | Beide Hypothesen aus B0 mit vorab formulierter Vorhersage prüfen; auch die widerlegte im Commit beantworten |
| Fortsetzen wird zum Gratis-Weiterspielen | Fortsetzen-Punkt wird beim Game Over gelöscht |
| Waffenstaffelung macht Level 1 eintönig (nur eine Toralternative) | Im iPhone-Test prüfen; notfalls LASER auf `minLevel` 1 zurück |

## Maschinenzeit-Schätzung

| Etappe | Maschinenzeit |
|---|---|
| B0 Sammelbahn inkl. Wand-Bug (Messreihe über drei Level) | 1,25–2 Std |
| B1 Ruckeln (messen + beheben) | 45–90 Min |
| B2 Shop (inkl. Einnahme-Messung und Gegenprobe) | 2–3 Std |
| B3 Weiterspielen **+ Fortsetzen** | 1,75–2,5 Std |
| B5 Zombie-Farbvarianten (inkl. Codex-Bilder, Atlas, Staffelung) | 1–1,5 Std |
| B6 Waffen staffeln | 20–30 Min |
| B4 Granatwerfer (inkl. Codex-Bilder, Balance-Messung) | 1,5–2 Std |
| B7 Ton | noch nicht schätzbar — Aufgabenstellung fehlt |
| **Summe** | **8,75–13 Std** (ohne B7) |

Dazu kommen Thomas'/Bennis iPhone-Tests nach B0, B1, B2, B5, B6 und B4 — die zählen nicht
als Maschinenzeit und bestimmen den Takt. Der gemeinsame Codex-Bildauftrag für B4 und B5
läuft parallel zu B1/B2 und steht deshalb nicht eigens in der Tabelle.

**Warum die Spanne so weit ist:** Die Untergrenze gilt, wenn die Messungen in B0 und B1
beim ersten Anlauf eine klare Ursache zeigen. Die Obergrenze enthält je einen zweiten
Messanlauf und den zusätzlichen Balance-Zyklus, den die Reißleine in B2 vorsieht.

## Entscheidungen (alle getroffen, 2026-08-23)

1. **Die automatische Erhöhung je Level bleibt; Kaufen ist ein Bonus obendrauf** —
   Thomas, zweite Fassung: „die automatische Erhöhung pro Level von Team rate dmg usw
   soll bleiben - das kaufen dazwischen wird zum Bonus". Ersetzt die erste Fassung
   („Levelkurve wird zur Kaufkurve", von Thomas zunächst mit „wie von dir vorgeschlagen"
   angenommen). Der bekannte Nebeneffekt — wer kauft, hat es leichter als heute — ist
   ausdrücklich in Kauf genommen und wird über die Bonushöhe begrenzt statt vermieden.
   Siehe Kern oben.
2. **Ein Run mit gekauftem Weiterspielen zählt weiter in der Bestenliste, wird aber
   farblich markiert** — Thomas: „ja aber farblich markieren". Siehe B3.
3. **Das Ruckeln tritt beim Start des Spiels auf, aber nicht immer** — Benni über Thomas.
   Grenzt B1 auf den Übergang Menü → `GameScene` ein und schließt den reinen
   Textur-Upload als Alleinursache aus. Siehe B1.
4. **Mehr Gegner-Abwechslung über Kleidungsfarben, keine neuen Gegnertypen** — Thomas:
   „die bestehenden 3 Arten von Zombies einfach mit mehr verschiedenen Kleidungsfarben
   ausstatten". Siehe B5.

5. **Waffen erst in höheren Leveln freischalten, Stärke bleibt gleich** — Thomas/Benni:
   „die besseren Waffen auch erst in den höheren Leveln". Echte Steigerung würde das
   gemessene Waffenband aufbrechen; gestaffelt wird die Freischaltung, gesteigert die
   Auffälligkeit. Siehe B6.
6. **Zombie-Farben ebenfalls gestaffelt** (ab Level 1/3/6/9) — Thomas: „genauso könnten
   wir das bei der Kleidung machen". Siehe B5.
7. **Aufhören und später weiterspielen: Speicherpunkt an der Levelgrenze** — Thomas: „die
   Möglichkeit aufzuhören und später an dieser Stelle weiterspielen". Mitten im Level zu
   speichern wäre ein Vielfaches an Aufwand; der Punkt wird beim Game Over gelöscht, damit
   daraus kein Gratis-Weiterspielen wird. Siehe B3 Teil 2.
9. **Ton kommt „irgendwann"** — Thomas, ohne nähere Angabe. Als B7 aufgenommen, aber
   ausdrücklich nicht startbereit: Was stört, ist nicht gesagt. Braucht zwei konkrete
   Sätze von Thomas oder Benni, bevor daraus eine Spec wird.
10. **Titelbild bleibt wie es ist** — Thomas 2026-08-23, nachdem er die Anpassung an die
   neuen Mobs zuerst angefragt und dann gestrichen hat. Kein Punkt im Plan.
8. **Wand-Bug wird in B0 mitbehoben** — Thomas mit Beleg-Screenshot. Die Teamzahl scheidet
   nach Codelage bereits aus (die Kollisionshülle ist fest); die Levelabhängigkeit ist
   offen und wird mitgemessen. Siehe B0.

**Keine offene Entscheidung mehr — V3 ist startbereit, sobald Thomas das Go gibt.**
