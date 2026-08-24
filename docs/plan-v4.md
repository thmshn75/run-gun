# Run & Gun — Umsetzungsplan V4 (Endlos-Modus: Skalierung, Meta-Ausbau, neue Waffen und Gegner)

Basis: **V3 ist am 2026-08-24 von Thomas und Benni am iPhone abgenommen** („test ok für
alles was wir gemacht haben"). Stand `3d330de`. **Vor der ersten V4-Etappe `v3.0` als
Rückschrittspunkt setzen** — `v1.0` und `v2.0` liegen vor.

Die Regeln aus V1–V3 gelten unverändert: Objekt-Pools mit hergeleiteten Größen, alle
Tuning-Werte in `balance.ts` mit Rechenweg als Kommentar, keine externen Requests, keine
Kosten, Reißleinen benennen was **kein** zulässiger Ersatz ist, Bilder erzeugt Codex,
Gamefeel gilt erst nach dem iPhone-Test. **Bei Leistungsfragen zuerst profilieren, dann
Hypothesen bilden.** Jede Etappe endet in einem spielbaren Stand auf `main`.

## Auslöser

Bennis Test von V3: alles abgenommen, aber

1. **Zu leicht.** Er erreichte auf Anhieb Level 16.
2. **Granatwerfer zu schwach.**
3. Wunsch: **dauerhafte Aufwertungen im Hauptmenü** für Feuerkraft und Truppe, die über
   Runs hinweg bleiben — „muss halt sehr teuer sein".
4. Die **Zwischenlevel-Preise dürfen höher** sein: „durchaus so, dass man zwei Level
   spielen muss, um sich ein Upgrade zu kaufen".
5. Die **Levelschwierigkeit soll nicht bei 12 aufhören**, sondern weiter steigen.
6. **Mehr Gegner-Gestalten** in allen drei Stärken, nicht nur mehr Farben.
7. **Mehr Waffen**, stark, erst in späteren Leveln.
8. **Zwischenboss** mit neuem Bild — größer, böser, in Bewegung.

## Der Befund, der alles andere bestimmt

**Ab Level 13 fängt das Spiel von vorne an.** `levelPlan.getLevelPlan` rechnet
`designLevel = ((level − 1) mod 12) + 1`. Level 13 bekommt damit die Gegnermischung von
Level 1:

| Level | leicht / normal / schwer |
|---|---|
| 12 | 41 % / 39 % / 20 % |
| **13** | **96 % / 4 % / 0 %** |

Dazu stehen ab Level 12 **alle** Wachstumsgrößen still:

| Größe | Verhalten ab Level 12 |
|---|---|
| `stats.damage` / `shotsPerSec` / `hp` | konstant (`getStatCap` klemmt auf Level 12) |
| `level.hardness` | läuft bei Level 14 in den Deckel 1,6 |
| Gegnermischung | springt auf Level 1 zurück |

**Das ist die Ursache für „zu leicht", nicht der Shop-Bonus.** Es ist derselbe Fehlertyp
wie der Level-5-Sprung vom 2026-08-23: eine Tabelle, die etwas anderes tut, als die Kurve
verspricht. Wer hier nur an Zahlen dreht, ohne den Rücksprung zu beseitigen, macht die
Level 1–12 härter und lässt 13+ unverändert leicht.

## Der Zielkonflikt — und warum er sich auflöst

Dauerhafte Aufwertungen (Punkt 3) sind **genau der Shop, den Thomas am 2026-08-23
gestrichen hat**, und der V3-Plan warnte ausdrücklich: „Sie summieren sich über viele Runs,
bis das Spiel von selbst durchläuft."

**Diese Warnung gilt nur, solange die Schwierigkeit bei Level 12 endet.** Läuft die
Skalierung endlos weiter, sind dauerhafte Aufwertungen nicht bloß harmlos, sondern die
Voraussetzung dafür, dass ein Kind je Level 25 sieht. Das ist das übliche
Roguelite-Prinzip: dauerhafter Fortschritt **plus** endlose Steigerung. Beides zusammen
trägt sich, einzeln bricht es.

**Daraus folgt eine harte Reihenfolge-Regel: E1 vor E4, E6 und E7.** Wer E4 zuerst baut,
macht ein Spiel dauerhaft leichter, dessen Obergrenze noch bei Level 12 klebt. Dasselbe
gilt für die anderen beiden, und zwar aus demselben Grund: **E6** rechtfertigt starke
Waffen ab Level 9–15 ausdrücklich damit, dass diese Level härter werden — ohne E1 fallen
sie in den Modulo-Bereich zurück (Level 15 wäre `designLevel` 3, also Level-3-Gegner gegen
eine 1,85×-Waffe). **E7** setzt den Elite-Boss auf Level 15 und 20, die ohne E1 ebenfalls
zurückfallen. Da jede Etappe laut Projektregel einzeln live geht, muss die Abhängigkeit
für alle drei stehen, nicht nur für E4.

## Der zweite Zielkonflikt: drei Multiplikatoren

Nach V4 wirken **drei** Verstärker gleichzeitig auf dieselbe Feuerkraft:

1. die Levelkurve (`getStatCap`),
2. der Run-Shop aus V3 (+39 % bei vollem Ausbau),
3. der neue Meta-Ausbau (E4).

Feuerkraft ist das **Produkt** aus Schaden und Rate — dieser Fehler ist im V3-Plan schon
einmal passiert (geplant +38 %, gerechnet +92 %). Bei drei multiplikativen Quellen
potenziert sich das.

**Regel für V4: Es gibt eine einzige Zahl, die den Gesamtvorsprung deckelt**
(`stats.totalBoostCap`), und ein Test hält sie fest. Meta und Run-Shop dürfen zusammen
diesen Deckel nie überschreiten, egal wie ihre Einzelwerte gesetzt sind.

---

## E1 — Endlos-Skalierung (Kern, alles andere setzt darauf auf)

**Umbau:**

- `designLevel = Math.min(12, level)` statt Modulo. Ab Level 12 bleibt die härteste
  Mischung stehen, statt zurückzuspringen.
- Neuer Abschnitt `level.endless`, der **oberhalb von Level 12** weiterrechnet:
  - Gegnermischung verschiebt sich weiter Richtung schwer (`weightShiftPerLevel`), bis
    ein Enddeckel erreicht ist — sonst bestünde die Horde irgendwann nur aus schweren
    Gegnern und die Münzrate explodiert.
  - `hardness` läuft weiter (flacherer Anstieg als bis 12, aber **ohne** den Deckel 1,6).
  - `enemy.types[].hp` wächst ab Level 12 weiter.
- `getStatCap` wächst ebenfalls über Level 12 hinaus weiter — **langsamer als die
  Gegner**, sonst bleibt es ewig gleich schwer. Der Abstand ist die Stellschraube.
- `level.squads.maxSizeCap` (26) und `pools.enemies` (264) **neu herleiten, nicht nur
  „prüfen"**. Der Kommentar an `pools.enemies` warnt selbst: „Wer den Deckel weiter anhebt,
  muss diese Zahl mit anheben" — die 264 haben bei Level 12 nur rund 5 % Reserve. Ohne eine
  festgelegte Endlos-Steigung lässt sich gar nicht ausrechnen, ob sie auf Level 30 reicht.
  **Reihenfolge daher: erst die Steigung festlegen, dann den Höchstbestand auf Level 30
  messen, dann die Poolgröße daraus ableiten.** Jeder frühere „Pool erschöpft"-Vorfall in
  diesem Projekt kam aus genau dieser Lücke.

**Zielgröße — die etablierte Messgröße aus V2:** Der **Anteil durchkommender Gegner** soll
im Korridor **4–12 %** bleiben, gemessen auf Level 12, 16, 20, 25 und 30. Nicht „mehr
Gegner", nicht „mehr Lebenspunkte" — die Erlebnisgröße.

**Wie gemessen wird, ist hier keine Formsache.** `docs/lessons.md` hält fest, dass genau
diese Größe **bistabil** ist (mehr Durchkommer → freie Spawn-Spuren → mehr Nachschub → noch
mehr Durchkommer) und schon **zweimal falsch gemessen** wurde: einmal mit einem Zustand aus
dem Vorlauf, einmal ohne Einschwingzeit. Deshalb verbindlich: **frische Szene je Messpunkt,
mindestens 8 Sekunden Einschwingen, dann mindestens 30 Sekunden zählen, drei Wiederholungen
je Level, verglichen wird der Median.** Ein Einzelwert ist kein Beleg.

### Was mit vorhandenen Spielständen passiert — vor dem Bauen zu klären

**Bennis offener Run steht auf Level 16.** Heute bedeutet das `designLevel` 4, also leichte
Gegner. Nach E1 bedeutet es `designLevel` 12 plus vier Level Endlos-Aufschlag — die
härteste Mischung, die das Spiel je hatte. Seine Werte liegen als **feste Zahlen** im
`RunSnapshot` und werden beim Fortsetzen nicht neu gerechnet. Er würde denselben
Charakter, mit dem er gerade mühelos durchkam, ohne Vorwarnung gegen die härtesten Gegner
des Spiels setzen — und zwar an genau der Stelle, die V4 eigentlich reparieren soll.

**Regel:** Ein gespeicherter offener Run oberhalb von Level 12 wird beim ersten Start
unter V4 **auf Level 12 zurückgestuft**, Werte und gekaufte Stufen bleiben. Das ist die
mildeste Variante: kein Spielstandverlust, kein Fortschrittsverlust, nur ein Rücksetzen an
die Stelle, ab der die neue Kurve gilt.

**Die Bestenliste wird beim Umstieg einmalig geleert** (Thomas 2026-08-24: „leeren").
Bennis Level-16-Ergebnis entstand unter dem Modulo-Fehler — Höchstwerte (ab Level 12
eingefroren) gegen Level-1-Gegner, also eine Farm-Situation. Ein so erzielter Münzstand
stünde über allem, was unter der härteren V4-Kurve noch erreichbar ist, und die Liste
verlöre ihren Zweck genau für das Kind, für das sie gebaut ist.

**Umsetzung, damit es genau einmal passiert:** Ein Marker im Spielstand
(`scoresResetForV4: true`) wird beim ersten Start unter V4 gesetzt und die Liste dabei
geleert. Ohne diesen Marker würde die Liste bei **jedem** Start geleert — der Fehler wäre
schlimmer als das Problem. Der Marker unterliegt derselben Regel wie alle neuen Felder:
fehlend heißt „noch nicht geleert", nie ein Fehler. **Das Konto bleibt unangetastet** —
Benni hat es erspielt, und E4 baut darauf auf.

**Und ein Marathon-Run bleibt heute unbelohnt:** Ein Eintrag entsteht nur beim Game Over.
Bei rund 80 Sekunden je Level sind 30 Level etwa **40 Minuten reine Spielzeit** — für einen
Siebenjährigen mehrere Abende, die er dank Fortsetzen auch spielen kann. Wer über Wochen
immer weiterkommt und nie stirbt, taucht in der Liste nie auf. E1 muss deshalb festlegen,
**dass der Zwischenstand beim „SPEICHERN & BEENDEN" ebenfalls als Bestenlisten-Eintrag
zählt** (mit dem bis dahin gesammelten Münzstand), sonst ist der Endlosmodus ohne Belohnung.

**Akzeptanz:**
1. Level 13 ist messbar **härter** als Level 12, nicht leichter (Gegnermischung,
   mittlere Lebenspunkte je Gegner, Durchkommensanteil).
1b. Ein offener Run oberhalb Level 12 aus einem V3-Spielstand wird auf Level 12
   zurückgestuft und ist danach spielbar — mit einem echten V3-Spielstand geprüft, nicht
   mit einem konstruierten.
2. Durchkommensanteil auf Level 12/16/20/25/30 je im Korridor 4–12 %.
3. Kein Deckel wird stillschweigend erreicht: Ein Test prüft, dass `hardness`,
   Hordengröße und Gegner-Lebenspunkte auf Level 30 über den Werten von Level 12 liegen.
4. Bildrate unter Volllast auf **Level 30** nicht schlechter als heute auf Level 12.
5. Level 1–12 bleiben unverändert — Benni soll den Anfang wiedererkennen.

**Reißleine (Zeitbudget: zwei Balance-Zyklen):** Lässt sich der Korridor über Level 20
nicht halten, wird die **Steigung gesenkt**, nicht der Deckel wieder eingeführt. **Kein
zulässiger Ersatz:** die Levelzahl künstlich zu begrenzen — das ist der heutige Zustand
unter neuem Namen.

## E2 — Preise anheben

**Thomas:** „Durchaus so, dass man zwei Level spielen muss, um sich ein Upgrade zu kaufen."

Heute kostet eine Stufe 37,5 % der Levelseinnahme. Neu: **200 %** — Faktor 5,3. Aus 160
auf Level 1 werden rund 850; die Einnahme von Level 1 (423) reicht dann nicht, man kauft
frühestens nach Level 2. Genau das ist gewollt.

**Folge, die mitgedacht werden muss:** Über einen ganzen Run sind bei 11 Stufen je Linie
nicht mehr 6.800, sondern rund 36.000 Münzen nötig — bei einer Gesamteinnahme von 10.454
kauft man also **höchstens ein Viertel** der Stufen. Der Run-Shop wird damit von „fast
alles" zu „wenige, wichtige Entscheidungen". Das ist die Absicht, verschiebt aber auch die
Grundlage von E4: Was übrig bleibt, fließt aufs Konto.

**Die Taktung muss mitwandern, sonst entsteht ein Frustbildschirm.** Der Shop erscheint
nach **jedem** Level und erlaubt höchstens eine Stufe je Knopf. Kostet eine Stufe künftig
zwei Level Einkommen, zeigt das Overlay in der Mehrzahl der Pausen **zwei ausgegraute
Knöpfe** — ein Kind sieht wiederholt einen Kaufbildschirm, auf dem nichts zu kaufen ist.
Das ist kein Rechenfehler, sondern ein Rhythmusfehler.

Zwei Wege, einer davon zu wählen: entweder **der Shop erscheint nur, wenn mindestens eine
Stufe bezahlbar ist** (sonst läuft die Pause wie früher durch), oder er zeigt sichtbar
**„noch X Münzen bis zur nächsten Stufe"** statt eines toten Knopfes. Der zweite Weg ist
für ein Kind der bessere: Er macht das Sparen zum sichtbaren Fortschritt statt zur
Blockade. **Empfehlung: Weg zwei.**

**Nachgerechnet, weil die erste Schätzung falsch war:** Der Plan nannte zunächst „4–6
Stufen je Run" — abgeleitet aus dem Geldanteil (10.454 von 36.000 nötigen Münzen ≈ 29 %).
Das ist der falsche Schluss: Bei steigenden Preisen kauft man **zuerst die günstigen frühen
Stufen**, der Stufenanteil liegt also über dem Geldanteil. Simuliert mit den gemessenen
Level-Einnahmen und der Regel „immer die günstigste leistbare Stufe": **9 Stufen bis Level
12 für 10.330 Münzen**, Konto-Rest 124.

**Akzeptanz:** Ein normal gespielter Run bis Level 12 erlaubt **8–10 Stufen** von 22
(nicht 22, nicht 4). In keiner Pause steht ein Knopf ohne Erklärung tot da. Der Preis für
Weiterspielen bleibt bezahlbar — Gegenrechnung im Test.

**Ein Folgefund, der ohne E1 unsichtbar bliebe:** Der Run-Shop hat **11 Stufen je Linie für
12 Level**. Im Endlosbereich ab Level 13 ist er damit **leer** — es gibt nichts mehr zu
kaufen, und die Levelpause zeigt nur noch WEITER. Die Stufenzahl muss deshalb mit dem
Endlosmodus mitwachsen (Preisformel weiterrechnen statt Liste), sonst verliert der längste
Teil des Spiels seine einzige Entscheidung.

## E3 — Granatwerfer stärker

**Bennis Befund:** zu schwach. **Gemessen ist er das nicht** (1,21× der Standardwaffe,
13,47 Tötungen/s gegen 11,13). Was er spürt, ist die **Trägheit**: `rateFactor` 0,15 ist
mit Abstand der niedrigste Wert im Spiel — man wartet auf jeden Schuss.

**Deshalb beides anheben, Schaden und Rate**, und ihn bewusst über das alte Band legen: Er
ist die letzte Waffe der V3-Staffelung, ab Level 7, und darf der Höhepunkt sein.
Richtwert **1,45×**, gemessen wie in V3.

**Der Projektil-Pool muss mit.** `pools.projectiles.grenade` (12) ist exakt aus
`rateFactor 0,15` gerechnet („1,2 Salven/s × 4 Schützen × 1,41 s Flugzeit = 6,8"). Wer die
Feuerrate anhebt, ohne den Pool neu herzuleiten, bekommt unter Volllast ein stumm
ausfallendes Geschoss. E6 verlangt diese Herleitung ausdrücklich für die neuen Waffen — für
die bestehende gilt sie genauso.

**Akzeptanz:** Gemessen 1,40–1,50×, Todeshöhe weiterhin über 250 px (das Kriterium aus V3
bleibt — sonst sterben alle Gegner am Horizont), Pool neu hergeleitet und unter Volllast
nicht erschöpft.

## E4 — Dauerhafte Aufwertungen im Hauptmenü

**Zwei Linien wie im Run-Shop — FEUERKRAFT und TRUPPE —, aber dauerhaft.** Sie wirken auf
die **Startwerte und die Deckel** jedes neuen Runs und bleiben über Runs hinweg.

**Die Finanzierung kommt aus dem Endlosbereich — das ist der Kern, und die erste Fassung
dieses Absatzes hatte ihn falsch.** Dort stand, nach E2 bleibe „deutlich mehr übrig als
heute". Das Gegenteil stimmt: Nachgerechnet bleiben von einem Run **bis Level 12** nach
E2 nur noch **124 Münzen** übrig (heute 2.292), weil die teureren Stufen fast die gesamte
Einnahme binden. Bei 25.000 für die erste Meta-Stufe wären das über vierzig Runs.

**Was die Rechnung rettet, ist E1 selbst:** Ab Level 13 ist der Run-Shop erschöpft (siehe
E2), also fließt dort **alles** aufs Konto. Fortgeschrieben mit der gemessenen Münzrate
(4,55/s auf Level 1 bis 13,30/s auf Level 12, darüber konservativ +0,5 je Level):

| Run bis Level | Einnahme gesamt | davon aufs Konto |
|---|---|---|
| 12 | 10.454 | 124 |
| 16 | 16.274 | 5.944 |
| 20 | 22.894 | 12.564 |
| 25 | 32.294 | 21.964 |
| 30 | 42.944 | 32.614 |

**Daraus die Preise:** erste Stufe **6.000** — etwa ein guter Run bis Level 16 —, dann
**×1,7 je weiterer**, fünf Stufen je Linie: 6.000 / 10.200 / 17.340 / 29.500 / 50.100,
zusammen rund 113.000 je Linie. Wer regelmäßig bis Level 20 kommt, hat die erste Stufe nach
einem Run und die fünfte nach etwa acht. Beide Linien voll ausgebaut sind ein Ziel über
viele Abende — und genau deshalb funktioniert es nur mit E1.

**Damit hängt E4 doppelt an E1:** nicht nur, weil das Spiel sonst dauerhaft leichter wird,
sondern weil es sonst **nicht bezahlbar** ist.

**Wirkung klein halten:** +4 % je Stufe, fünf Stufen = +22 % je Linie. Zusammen mit dem
Run-Shop ergibt das für die Feuerkraft rund +70 % gegenüber der reinen Levelkurve.

**Der Deckel aus dem Zielkonflikt oben:** `stats.totalBoostCap` begrenzt Meta plus
Run-Shop gemeinsam. Ein Test prüft ihn gegen die Einzelwerte, damit eine spätere Änderung
an einer der beiden Quellen den Deckel nicht still überschreitet.

**Zurücksetzen:** Der vorhandene ZURÜCKSETZEN-Knopf im Menü muss die Meta-Stufen
mitlöschen — sonst behält ein zurückgesetzter Spielstand einen unsichtbaren Vorsprung.

### Spielstand: die Falle, in die das Projekt schon zweimal gelaufen ist

E4 braucht zwei neue dauerhafte Zahlen im Spielstand (`metaFirepowerSteps`,
`metaTeamSteps`). `save.ts` trägt an zwei Stellen den Kommentar, warum das gefährlich ist:
Beim entfernten `upgrades`-Feld und beim `run`-Feld wäre eine strenge Prüfung neuer Felder
dem Gerät fast die **ganze Bestenliste** wert gewesen.

**Regel, wörtlich wie beim `run`-Feld:** Fehlende Meta-Felder bedeuten **0**, nie einen
Fehler. `parseSave` verwirft einen unvollständigen Meta-Block stillschweigend, statt den
Spielstand abzulehnen. Ein Test lädt einen echten V3-Spielstand **ohne** Meta-Felder und
prüft, dass Konto, Bestenliste und offener Run erhalten bleiben.

### Bedienoberfläche — sonst entscheidet das der Zufall

Der Plan sagte bisher „im Hauptmenü", und das ist zu wenig: `menuLayout.ts` kennt genau
sechs Blöcke, an obere und untere Safe Area verankert, **ohne Reserve**. Zwei Linien à fünf
Stufen passen dort nicht dazwischen.

**Vorgabe:** Ein zusätzlicher Knopf im Hauptmenü öffnet eine **eigene Ansicht** (wie die
Rücksetz-Bestätigung, die es schon gibt). Dort dieselbe Bauform wie im Run-Shop — zwei
große Flächen, Preis, Stufenanzeige, Zurück-Knopf. Der Menü-Knopf bekommt einen eigenen
Slot in `computeMenuLayout`, damit nichts überlappt; der Test dafür existiert bereits und
wird erweitert.

**Eigene Bezeichnungen, nicht dieselben.** Der Run-Shop heißt heute FEUERKRAFT und TRUPPE.
Hießen die dauerhaften Aufwertungen genauso, wäre für ein Kind nicht mehr unterscheidbar,
was es gerade besitzt — ein System verfällt am Rundenende, das andere kostet mehrere
Abende. **Vorschlag: „DAUERHAFT: SCHLAGKRAFT" und „DAUERHAFT: MANNSCHAFT"**, plus eine
andere Farbe als im Run-Shop.

**Akzeptanz:** Ohne gekaufte Meta-Stufen ist das Spiel identisch zum Stand nach E1
(Test). Voll ausgebaut liegt der Gesamtvorsprung unter `totalBoostCap`. Der
Durchkommensanteil auf Level 20 bleibt auch voll ausgebaut im Korridor.

## E5 — Mehr Gegner-Gestalten

**Thomas:** „Verschiedene Farben haben wir, und zusätzliche andere Gestalten in allen drei
Figurstärken."

**Der Freiheitsgrad ist größer als beim V3-Bildauftrag.** Dort wurde eine pixelgenau
identische Silhouette verlangt — richtig für reine Umfärbungen, aber strenger als nötig.
Die Trefferflächen hängen **nicht am Bild**, sondern an `enemy.types[].bodyWidth` und
`bodyHeight`. Solange die **Körpermasse** gleich bleibt, darf die Gestalt abweichen:
Kapuze, Hut, Helm, zerfetztes Hemd, fehlender Arm.

**Umfang:** Je Stärke drei neue Gestalten, jede wieder in den vier vorhandenen Farbtönen —
oder als Kombination aus Gestalt und Farbe im vorhandenen Auswahlmechanismus. Der Einbau
existiert bereits (`enemy.variantUnlockLevels`, `getEnemyTexture`); es kommen nur mehr
Einträge dazu.

**Akzeptanz:** Sichtbare Körpermaße jeder neuen Gestalt weichen um höchstens 2 px von der
Vorlage ab (selbst nachmessen, nicht dem Bericht glauben — in V3 war das der Grund, warum
alle elf Bilder brauchbar waren). Bildrate unter Volllast unverändert.

## E6 — Vier neue Waffen, stark, spät

**Thomas:** „Die Waffen alle, und sie müssen stark sein und erst in späteren Leveln
zusätzlich kommen."

**Damit wird das Stärkeband bewusst nach oben geöffnet** — das war in V3 noch verboten und
ist jetzt richtig, **weil E1 die Level endlos härter macht**. Die Stärke koppelt an das
Freischaltlevel: Eine Waffe ab Level 15 darf 1,85× sein, weil Level 15 entsprechend härter
ist.

| Waffe | ab Level | Zielstärke | Was sie anders macht |
|---|---|---|---|
| **PRELLSCHUSS** | 9 | 1,40× | Kugeln springen von den Korridorwänden ab — die einzige Waffe, die die prägendste Eigenschaft des Spielfelds nutzt. Am Rand zu fahren wird offensiv statt riskant. |
| **STREUBOMBE** | 11 | 1,55× | Teilt sich in der Luft in mehrere kleine Sprengsätze. Fläche statt Punkt — der Gegenentwurf zum Granatwerfer. |
| **SÄGEBLATT** | 13 | 1,70× | Langsames Blatt, das nicht verschwindet, sondern durch die Horde mäht und im Bild bleibt. Völlig anderes Timing: Man legt eine Schneise, statt auf Ziele zu schießen. |
| **SCHOCKWELLE** | 15 | 1,85× | Radialstoß rund um die Truppe, kurze Reichweite, seltener Einsatz. Die einzige Waffe, die **nach hinten** wirkt — sie löst das Durchbruch-Problem aus V2. |

**Neue Flugbahn-Logik** braucht es bei Prellschuss (Abprall an den Wandkanten) und
Sägeblatt (bleibt aktiv, statt beim Treffer zu verschwinden). Streubombe und Schockwelle
bauen auf dem vorhandenen Splash auf.

**Pools** je Waffe aus der Feuerrate herleiten, wie bei allen bisherigen.

**Akzeptanz:** Jede Waffe im Zielband ±0,1, gemessen wie in V3. Todeshöhe je Waffe über
250 px. Auf jedem Level mindestens zwei Toralternativen. Pools laufen unter Volllast nicht
leer.

## E7 — Elite-Boss alle fünf Level

**Thomas:** „Ein neues Bild, größer und böser, und er darf sich hin und her bewegen."

**Ein Vorbehalt, der die Umsetzung bestimmt:** Am 2026-08-22 und erneut am 2026-08-23
wurde gemessen, dass die **Boss-Kampfdauer nicht an seinen Lebenspunkten hängt, sondern am
Gegnerschild**. Ein Boss mit mehr Lebenspunkten wird also nur **länger**, nicht schwerer.
Wer den Elite-Boss über Lebenspunkte baut, bekommt dieselbe Wartezeit mit größerer Zahl.

**ACHTUNG — der naheliegende Hebel ist toter Code.** Die erste Fassung dieses Abschnitts
wollte die Begleiter über `level.plans[].companionLimit` hochsetzen. Nachgeprüft: Dieser
Wert wird von `levelPlan.ts` nur **durchgereicht** und in einem Test abgefragt — **im Spiel
liest ihn niemand**. Wer E7 so umsetzt, ändert am Verhalten nichts, und es fällt erst beim
iPhone-Test auf. Der tatsächliche Begleiterdruck läuft über
`boss.hordePressure.maxActiveCalled` (28) und `hordeSizeCap` (14), aufgerufen in
`GameScene.ts:279`, sowie über `phaseOne/phaseTwo.hordePressureShare`.

**Deshalb über Verhalten, nicht über Zahlen:**
- **Seitliche Bewegung** — das Pendeln, das am 2026-08-23 bewusst entfernt wurde, kommt
  hier als *Eigenschaft des Elite-Bosses* zurück. Beim normalen Boss bleibt es entfernt.
- **Mehr Begleiter** über `boss.hordePressure.hordeSizeCap` und `maxActiveCalled` als
  Elite-Aufschlag — **nicht** über `companionLimit`.
- **Schnelleres Vorrücken** (`advanceSpeed`).
- Neues Bild von Codex: größer und bedrohlicher als der normale Boss.

**Nebenbei zu klären:** `companionLimit` steht in allen zwölf Leveleinträgen und sieht wie
ein Hebel aus. Entweder anschließen oder entfernen — ein Wert, der aussieht wie eine
Stellschraube und keine ist, kostet beim nächsten Mal wieder einen Zyklus.

**Erscheint auf Level 5, 10, 15, 20, …** Auf Level 5 und 10 muss er schaffbar bleiben —
dort hat man weder Meta-Ausbau noch die späten Waffen.

**Akzeptanz:** Kampfdauer auf Level 10 höchstens 50 % über dem normalen Boss (sonst ist er
nur zäh), Durchkommensanteil während des Elite-Kampfs im Korridor, Bildrate unverändert.

**Mindestens drei Läufe je Seite, mit frischem Zustand.** `docs/lessons.md` hält für genau
diese Größe fest, dass dieselbe Boss-Konfiguration einmal 29 und einmal 109 Sekunden
lieferte — **Faktor 3,7 Streuung bei identischem Aufbau**, weil die zufällige Zusammen-
setzung des Gegnerschilds entscheidet. Ein Einzellauf je Seite kann die 50-Prozent-Schwelle
durch reinen Zufall reißen oder unterschreiten; verglichen wird der Median aus drei Läufen.

**Reißleine:** Bleibt der Elite-Boss trotz Verhaltensänderung „nur länger", wird die
Etappe **geschlossen und der Befund dokumentiert**, statt weiter an Zahlen zu drehen — die
Boss-Reißleine aus V2 (max. zwei Balance-Zyklen) gilt weiter.

---

## Später, bewusst nicht in V4

- **Vierter Gegnertyp (schneller Renner).** Als Idee gut — er zwingt zum Reagieren statt
  zum Draufhalten. Er braucht aber eigene Lebenspunkte, Tempo, Münzwert und eine eigene
  Balance-Runde. V4 ist ohne ihn schon groß; er wäre die natürliche erste Etappe von V5.

## Was die beiden Gegenprüfungen geändert haben

Die Spec ist am 2026-08-24 durch zwei unabhängige Gegenprüfungen gelaufen (Premortem und
Betriebssicht). Sie haben zusammen **sechzehn Befunde** geliefert; alle sind oben in die
betroffenen Abschnitte eingearbeitet, nicht angehängt. Die fünf, die den Plan inhaltlich
verändert haben:

1. **`companionLimit` ist toter Code** (E7). Der zentrale Hebel des Elite-Bosses hätte
   nichts bewirkt — nachgeprüft: Der Wert wird nur durchgereicht und in einem Test
   abgefragt, im Spiel liest ihn niemand. Ohne diesen Befund wäre ein kompletter Bau- und
   Testzyklus für Thomas' meistgenannten Wunsch verbrannt.
2. **Die Preisrechnung in E2 war falsch** — 9 Stufen statt der behaupteten 4–6. Der
   Denkfehler: Der Geldanteil wurde linear auf den Stufenanteil übertragen, obwohl man
   zuerst die günstigen frühen Stufen kauft.
3. **Die Finanzierung von E4 stand auf dem Kopf.** Der Plan behauptete, nach E2 bleibe mehr
   übrig; nachgerechnet bleiben von einem Run bis Level 12 nur **124 Münzen** statt heute
   2.292. Die Meta-Preise sind daraufhin von 25.000 auf 6.000 für die erste Stufe gesenkt
   und die Finanzierung ausdrücklich auf den Endlosbereich gestellt.
4. **Bennis Spielstand wäre das erste Opfer gewesen** (E1). Sein offener Run auf Level 16
   hätte nach der Umstellung dieselben Werte gegen die härtesten Gegner des Spiels gesetzt.
5. **Zwei dokumentierte Messfallen wären wiederholt worden**: der bistabile
   Durchkommensanteil ohne Einschwingen und Wiederholung (E1) und die Boss-Kampfdauer mit
   Faktor 3,7 Streuung als Einzelmessung (E7). Beide stehen als Fehler in `lessons.md`.

Zwei weitere Befunde ergaben sich beim Nachrechnen selbst und stehen ebenfalls oben: Der
**Run-Shop wäre ab Level 13 leer** (11 Stufen für 12 Level), und **`pools.enemies` muss neu
hergeleitet** statt nur geprüft werden.

## Risiken & Reißleinen (Überblick)

| Risiko | Reißleine |
|---|---|
| Skalierung explodiert oder flacht ab | Korridor 4–12 % auf Level 12/16/20/25/30; Steigung senken, nie den Deckel zurückholen |
| Drei Multiplikatoren potenzieren sich | `stats.totalBoostCap` deckelt Meta + Run-Shop gemeinsam, Test hält ihn fest |
| Meta-Ausbau macht das Spiel dauerhaft leicht | Nur nach E1; Wirkung klein (+4 % je Stufe); Preis mehrere Runs |
| Preiserhöhung macht den Run-Shop wertlos | Akzeptanz 4–6 Stufen je Run — nicht 0, nicht 22 |
| Starke Waffen brechen die Balance der frühen Level | Stärke koppelt ans Freischaltlevel, frühestens Level 9 |
| Elite-Boss wird nur zäher statt schwerer | Kampfdauer-Deckel 50 % über Median aus drei Läufen; bei Scheitern Etappe schließen |
| Elite-Boss über `companionLimit` gebaut — wirkungslos | Der Wert ist toter Code; Hebel ist `boss.hordePressure` |
| Durchkommensanteil bistabil, Einzelmessung trügt | Frische Szene, 8 s einschwingen, 30 s zählen, drei Wiederholungen, Median |
| Run-Shop ab Level 13 leer | Preisformel weiterrechnen statt fester Stufenliste |
| Mehr Texturen kosten Bildrate | In V3 gemessen widerlegt (12 gleichzeitig = 60 fps); bei jeder Erweiterung erneut messen |
| Pools laufen über (mehr Gegner, neue Waffen) | Jede Poolgröße neu herleiten; Volllast auf Level 30 messen |
| Vorhandener Spielstand wird durch E1 unfair hart | Offener Run über Level 12 wird auf Level 12 zurückgestuft; mit echtem V3-Spielstand geprüft |
| Bestenliste wird bei JEDEM Start geleert statt einmal | Marker `scoresResetForV4` im Spielstand; Test startet zweimal und prüft, dass nur einmal geleert wird |
| Neues Spielstandfeld verwirft alte Spielstände | Fehlend = 0, nie Fehler; Test mit echtem V3-Spielstand (dieselbe Falle wie 2026-08-23) |
| Shop zeigt nach jeder Pause nur tote Knöpfe | „Noch X Münzen bis zur nächsten Stufe" statt ausgegrautem Knopf |
| Zwei Aufwertungssysteme mit gleichen Namen | Eigene Bezeichnungen und eigene Farbe für die dauerhaften |

## Offene Entscheidungen

Keine — alle Punkte sind von Thomas am 2026-08-24 entschieden, zuletzt das einmalige
Leeren der Bestenliste beim Umstieg (siehe E1).
