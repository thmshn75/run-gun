# Lessons: Run & Gun

Jede Nutzerkorrektur wird hier als Regel eingetragen. Zu Sitzungsbeginn lesen.

## Format
- **Fehler:** Was lief falsch?
- **Regel:** Was verhindert denselben Fehler künftig?

---

### 2026-09-04 — Ein durchsichtiges Sprite ist messbar, bevor es auffaellt
- **Fehler:** Ein Bild eines Bewegungssatzes kam fast vollstaendig halbtransparent zurueck
  (5,2 % volldeckende Pixel gegen 92-94 % bei allen anderen) - ein Rest der
  Hintergrundentfernung. Im Spiel wurde der Boss dadurch einmal je Zyklus durchsichtig.
  Keines meiner Bildkriterien hat Deckkraft geprueft; gemeldet hat es Thomas.
- **Regel:** In jede Bild-Spec gehoert ein Deckkraft-Kriterium: mindestens 85 % der opaken
  Pixel (Alpha > 8) muessen volldeckend sein (Alpha >= 250). Die Messung ist zwei Zeilen
  und faengt eine ganze Fehlerklasse ab, die aus Chroma-Key-Verfahren stammt.

### 2026-09-04 — Gezeichnete Bilder haben keinen gemeinsamen Ankerpunkt
- **Befund:** In einem Satz gezeichneter Bewegungsbilder steht die Figur nicht in jedem
  Bild an derselben Stelle der Leinwand - gemessen bis zu 30 von 240 px. Beim Abspielen
  rutscht sie dadurch seitlich, obwohl ihre Position im Spiel unveraendert bleibt. Das ist
  kein Fehler der Bilderzeugung, sondern eine Eigenschaft jedes gezeichneten Satzes.
- **Regel:** Bei Sprite-Animationen den Versatz je Bild AUS DER TEXTUR messen und die
  Anzeige gegenruecken (`src/systems/bildVersatz.ts`), statt ihn den Bildern abzuverlangen.
  Einmal gebaut, traegt es jeden kuenftigen Satz.
- **Falle dabei:** Wer die logische Position aus der Sprite-Position zurueckliest, addiert
  den Ausgleich Bild fuer Bild auf. Sie muss getrennt gefuehrt werden - besonders bei
  Objekten, die ihre Position sonst nie neu setzen.

### 2026-09-04 — Was kein Kriterium misst, faellt niemandem auf ausser dem Nutzer
- **Fehler:** Fuenf Bild-Auftraege in Folge forderten Standlinie, Rumpfmitte,
  Silhouettenunterschied und Fusswechsel - aber nie die GESAMTHOEHE der Figur. Alle
  gelieferten Saetze bestanden jede Pruefung und massen dabei nur 76-92 % ihrer Vorlage.
  Aufgefallen ist es erst Thomas beim Ansehen: "die figuren sind deutlich kleiner".
- **Regel:** Bei einem Auftrag, der etwas ERSETZT, gehoert in die Spec eine Zeile, die den
  Ersatz insgesamt an das Original bindet - hier die Ausdehnung von der obersten zur
  untersten opaken Zeile. Kriterien, die nur Einzelheiten pruefen (sitzt sie richtig,
  bewegt sie sich genug), lassen die Gesamtwirkung frei. Nuetzliche Gegenfrage vor jedem
  Ersatz-Auftrag: "Woran wuerde man merken, dass das Neue nicht mehr zum Alten passt?"

### 2026-09-04 — Senkrechte Arme strecken die Figur duenn
- **Befund:** Ein Bild des Zombie-Zyklus kam mit 72 % der Koerperfuelle seiner Nachbarn -
  eine ausgemergelte, zerfaserte Gestalt. Ursache war die Kombination aus zwei Vorgaben:
  "Arme weit oben" plus "Figur fuellt die Leinwand". Um beides zu erfuellen, wurde die
  Figur in die Hoehe gezogen.
- **Regel:** Bei Posen mit erhobenen Gliedmassen die Richtung mitspezifizieren - **schraeg
  nach aussen-oben statt senkrecht**. Und die Koerperfuelle (Zahl der opaken Pixel) als
  eigenes Kriterium mitgeben, sonst wird an der Figur gespart, um die Geometrie zu
  treffen.

### 2026-09-04 — "Abgehakt" ist eine Standzeit, keine Geschmacksfrage
- **Befund:** Auf "wirkt abgehakt" gibt es eine Zahl statt einer Meinung: die Standzeit je
  Einzelbild. Vier Bilder bei 1,1 Zyklen je Sekunde ergeben 227 ms - das Auge liest
  Standbilder. Als fluessig gelten Sprite-Animationen ab rund 10-12 Bildern je Sekunde,
  also unter 100 ms. Zwoelf Bilder bei unveraendertem Tempo ergaben gemessene 76 ms.
- **Regel:** Bei jeder Ruckel-Meldung zuerst Bildzahl x Zyklen je Sekunde ausrechnen und
  gegen die 100-ms-Schwelle halten. Erst dann entscheiden, ob mehr Bilder, ein anderes
  Tempo oder etwas ganz anderes noetig ist - und die Schwelle als Test festschreiben,
  sonst faellt sie beim naechsten Feinschliff still wieder darunter.
- **Ueberblenden ist kein Ersatz fuer Zwischenbilder**, wenn die Haltungen weit
  auseinanderliegen: Zwei halbtransparente Bilder mit 54 % Silhouettenunterschied geben
  einen Doppelgaenger, keine Bewegung. Je besser die Posen, desto schlechter der
  Weichzeichner - Ueberblenden taugt nur bei ohnehin aehnlichen Bildern.

### 2026-09-04 — Nicht die Figur entscheidet, sondern die Wahl der Bewegung
- **Bestaetigt an drei Bildsaetzen desselben Tages:** Zombie mit Gangzyklus 15 %
  Haltungsunterschied (gescheitert), Boss mit Aufbaeumen 69 % (gelungen), Zombie mit
  Taumeln und Greifen 60,9 % (gelungen, ein Anlauf). Der Schluss nach dem ersten
  Fehlschlag - "Bildgenerierung liefert keine kontrollierten Posen" - war falsch, und der
  zweite Schluss - "beim Boss geht es, weil er gross und einzeln ist" - ebenfalls.
- **Regel:** Wer eine Sprite-Animation bestellt, waehlt zuerst die BEWEGUNG danach aus,
  wie weit ihre Haltungen auseinanderliegen, nicht danach, was die Figur "eigentlich"
  tut. Ein Gangzyklus ist die schwerste Wahl, weil vier Schritte einander aehneln. Fast
  jede Figur hat eine Alternative: taumeln, greifen, aufbaeumen, ausholen.

### 2026-09-04 — Die Bildhaelfte ist keine Koerperhaelfte
- **Fehler:** Um zu pruefen, ob ein Fuss angehoben ist, wurde die unterste opake Zeile je
  BILDHAELFTE (x unter/ueber der Bildmitte) gemessen. In einem Bild standen der tragende
  und der angehobene Fuss beide rechts der Mitte - die Messung fand in beiden Haelften die
  Standlinie und meldete faelschlich "kein Fuss angehoben". Der Blick aufs Bild zeigte den
  Beinwechsel eindeutig; die Messung von Codex war richtig, meine zu grob.
- **Regel:** Koerperteile nicht ueber feste Bildkoordinaten trennen, sondern ueber
  zusammenhaengende Gruppen. Und bei einem Messergebnis, das dem Augenschein
  widerspricht, zuerst die Messung pruefen - nicht das Ergebnis melden.

### 2026-09-04 — Ein auffaelliges Bilddetail zuerst gegen die Vorlage messen
- **Beinahe-Fehler:** Im Kontaktbogen der neuen Boss-Sprites fiel ein blaeulicher Saum um
  die Figuren auf; er sah nach einem Generierungsfehler aus und waere fast ein vierter
  Codex-Lauf geworden. Nachgemessen (mittlere Randpixelfarbe, Blau minus Mittel aus Rot
  und Gruen) hatte die ABGENOMMENE Vorlage einen Blaustich von +56, die neuen Bilder nur
  +20. Der Saum war schwaecher als im Original - sichtbar wurde er nur vor dem dunklen
  Hintergrund meines eigenen Vergleichsbogens.
- **Regel:** Faellt an einem neuen Bild ein Detail auf, dieselbe Groesse zuerst am
  bestehenden, abgenommenen Bild messen. Ein Kontaktbogen mit eigenem Hintergrund ist ein
  Messgeraet mit Eigenanteil - was darauf auffaellt, muss im Spiel nicht auffallen.

### 2026-09-04 — Die Pose-Vorgabe braucht ein Merkmal, keinen Prozentsatz
- **Befund:** Fuer die Beinarbeit des Bosses stand zuerst nur ein Prozentwert in der Spec
  ("mindestens 45 % Silhouettenunterschied im Beinbereich"). Erreicht wurden am Ende
  73 % - aber erst, nachdem zusaetzlich ein **anschauliches Merkmal** gefordert war:
  "In Bild 1 beruehrt nur der linke Fuss die Standlinie, der rechte liegt mindestens
  12 px hoeher." Zwei Codex-Anlaeufe scheiterten vorher an der reinen Prozentvorgabe.
- **Regel:** Ein Prozentsatz ist die Pruefung, nicht die Anweisung. In die Spec gehoert
  BEIDES: was zu sehen sein soll (ein Fuss in der Luft) und woran man es misst (12 px
  Hoehenunterschied). Der Prozentsatz allein laesst offen, WORIN der Unterschied besteht -
  und wird dann durch Kleidungsfalten erfuellt.

### 2026-09-04 — Neigung folgt der Geschwindigkeit, nicht dem Ort
- **Fallstrick:** Der Elite-Boss pendelt seitlich per Sinus. Wer ihn "in die Kurve legen"
  will und dafuer denselben Sinus nimmt, neigt ihn genau falsch: am weitesten aussen am
  staerksten, in der Bahnmitte gar nicht - er wuerde am Umkehrpunkt umkippen und beim
  schnellsten Lauf aufrecht stehen. Richtig ist die Ableitung, also der Kosinus.
- **Regel:** Bei jeder Neigung, jedem Lehnen, jedem Nachfuehren zuerst fragen: haengt es
  am ORT oder an der GESCHWINDIGKEIT? Und die Antwort mit einer Gegenprobe belegen, die
  beide Faelle unterscheidet (hier: Neigung bei hoechstem Tempo gegen Neigung am
  Umkehrpunkt gemessen - 6,98 gegen 0 Grad).

### 2026-09-04 — Bildgenerierung KANN kontrollierte Posen, wenn zwei Dinge stimmen
- **Vorgeschichte:** Der Zombie-Laufversuch scheiterte an zu aehnlichen Haltungen (15 %
  Silhouettenunterschied zwischen Bild 1 und 3, im Spiel als Flackern sichtbar). Der
  Schluss "Bildgenerierung liefert keine kontrollierten Posen" war voreilig.
- **Was beim Boss anders lief und funktionierte (56 % Unterschied):**
  1. **Die Bewegung passte zur Figur.** Ein Gangzyklus braucht vier aehnliche Haltungen,
     ein Aufbaeumen (Arme heben und sinken) vier sehr verschiedene. Wer eine Animation
     bestellt, waehlt die Bewegung nach dem, was sich stark unterscheidet - nicht nach
     dem, was die Figur "eigentlich" tut.
  2. **Das Pruefkriterium stand als PIXELZAHL in der Spec** ("mindestens 15 % der opaken
     Pixel muessen sich unterscheiden, gemessen und im Bericht angegeben"). Ohne Zahl
     liefert die Bildgenerierung vier brave Varianten derselben Pose.
- **Regel:** Bei Sprite-Animationen immer (a) die Bewegung mit den groessten
  Haltungsunterschieden waehlen und (b) den geforderten Unterschied als messbare Zahl in
  die Spec schreiben. Und selbst nachmessen: Codex meldete die Bounding-Box-Mitte als
  eingehalten - die Rumpfmitte lag in einem Bild trotzdem 20 px daneben, weil ein
  ausgestreckter Arm die Box verschob. Zusammenhangsanalyse deckt freistehende
  Bildfehler auf, die im Bericht nicht auftauchen.

### 2026-09-04 — Der Screenshot kam nach dem Spielende
- **Fehler:** Fuer eine Sichtpruefung wurde die Truppengroesse per `crowd.setSize` gehalten
  - das setzt nur die ANZEIGE. Die Lebenspunkte liefen weiter herunter, der Run endete,
  und der Screenshot zeigte den Game-Over-Bildschirm statt der Spielszene.
- **Regel:** Zum Offenhalten einer Szene `runStats.set('hp', ...)` setzen, nicht
  `crowd.setSize`. Und Aufbau und Screenshot nie ueber zwei Tool-Aufrufe trennen, wenn die
  Szene von selbst enden kann.

### 2026-09-04 — Zwei Selbsttests scheiterten an Zeichenketten statt an der Sache
- **Fehler:** Ein Test sollte belegen, dass ein Bauteil ohne ein bestimmtes Verfahren
  auskommt, und verbot dafuer dessen Wort im Quelltext. Er schlug an - das Wort stand im
  eigenen Erklaerkommentar direkt darueber, der begruendete, warum das Verfahren gerade
  NICHT benutzt wird. Ein zweiter Test las ein Aufrufargument per Klammer-Regex
  (`\(([^)]*)\)`) und brach an der inneren Klammer von `istTestgelaende()` ab.
- **Regel:** Quelltext-Tests pruefen SACHVERHALTE, nicht Woerter. Statt ein Wort zu
  verbieten, das Gegenteil positiv nachweisen (kein `CityPlanner`-Import, kein
  `pickSceneryKind`-Aufruf). Argumente zeilenweise pruefen statt mit Klammer-Regex.
  Schlaegt ein selbst geschriebener Test an, zuerst pruefen, ob der TEST falsch ist -
  an diesem Tag war er es dreimal in Folge, der Code kein einziges Mal.

### 2026-09-04 — Gruene Tests, falsches Bild
- **Fehler:** 327 Tests liefen gruen, das Bruecken-Gelaender war rechnerisch korrekt - im
  Bild ragte es am Horizont als schraege Strebe in den Himmel. Gefunden erst beim Ansehen
  eines Bildschirmabzugs.
- **Regel:** Fuer alles Sichtbare gilt gruen = geprueft, nicht = richtig. Nach jeder
  Aenderung an der Darstellung ein Bild ansehen, und zwar vergroessert am kritischen Ort
  (hier der Horizont), nicht nur die Gesamtansicht.

### 2026-09-04 — Was Bildgenerierung kann und was nicht
- **Befund (kein Fehler):** Vier Laufbilder eines Zombies, zwei Codex-Laeufe. Die
  KONSISTENZ gelang vollstaendig - dieselbe Figur, Kleidung, Farben, Koerperbau ueber
  alle vier Bilder (Verfahren: einen gemeinsamen Bogen erzeugen und zerschneiden). Die
  KONTROLLIERTEN POSEN gelangen nicht, auch nicht nach ausdruecklicher Nachforderung mit
  Tabelle je Bild: Bild 1 und 3 unterschieden sich um 285 von 1.900 opaken Pixeln.
- **Regel:** Bei Sprite-Auftraegen ist die Figurenkonsistenz das leichtere Problem, die
  Pose das schwerere. Wer eine Animation plant, prueft die Pose an EINER Figur, bevor er
  sie fuer dreissig beauftragt - und misst den Posenunterschied in Pixeln, statt ihn zu
  beurteilen.

### 2026-08-19 — Nutzeränderung als Fehler diagnostiziert
- **Fehler:** Eine von Thomas manuell gekürzte Todo-Zeile wurde ungefragt als „Speicherfehler" bewertet.
- **Regel:** Änderungen an Dateien, die Thomas selbst editiert, als bewusste Entscheidung annehmen. Nur nachfragen, wenn die Änderung eine laufende Aufgabe konkret blockiert — keine Ferndiagnose.

### 2026-08-23 — Ursache zu früh benannt, Fix ohne Beleg gebaut
- **Fehler:** Beim Startruckeln zeigte die Messung „Hänger nur bei den ersten ein bis zwei
  Spielstarts, danach nie". Daraus wurde sofort „Textur-Upload zur Grafikkarte"
  geschlossen und ein Aufwärm-Durchlauf gebaut. Die Gegenprobe war **negativ** — der
  erste Lauf wurde sogar schlechter. Das Muster passte genauso gut auf die
  JIT-Kompilierung des Codes, und die echte Ursache war eine dritte: Phasers
  Kollisions-Suchbaum, der 48 % der Rechenzeit fraß.
- **Regel:** Ein Zeitmuster („nur am Anfang", „nur beim ersten Mal") benennt keine
  Ursache, es grenzt nur ein. Vor dem Bauen die Ursache **messen** — beim Rechenzeit-Thema
  heißt das ein Profil, nicht eine Plausibilitätskette. Ein Profil hätte hier zwei
  Anläufe gespart und stand nach einem einzigen Aufruf zur Verfügung.

### 2026-08-23 — Die teuerste Funktion stand in keiner der Hypothesen
- **Fehler/Fund:** Die Verdächtigenliste für das Startruckeln (Service Worker,
  Textur-Upload, Pool-Erzeugung, Speicherbereinigung) war vollständig aus dem Code
  hergeleitet — und keiner davon war es. Das Chrome-Profil zeigte auf Anhieb etwas, das
  in keiner Hypothese vorkam: `contains` aus Phasers RTree mit 31 % der aktiven
  Rechenzeit, die Baumfunktionen zusammen 48 %. `useTree: false` halbierte die
  Rechenzeit und beseitigte das Ruckeln.
- **Regel:** Bei Leistungsfragen zuerst profilieren, dann Hypothesen bilden — nicht
  umgekehrt. Fremdcode (Engine, Bibliothek) taucht in selbst erstellten Verdächtigenlisten
  systematisch nicht auf, ist aber genau dort, wo die Zeit verschwindet.

### 2026-08-23 — Kollisionsprüfung las eine Position, die der Truppe nicht folgt
- **Fehler:** `GameScene.crowdStehtInSammelbahn` rechnete die Überlappung aus
  `crowd.getHullBounds().getBounds()`. Im laufenden Spiel gemessen (Anker auf 90 / 150 /
  250 festgehalten): Der **Physics-Body** der Hülle folgte korrekt (49 / 109 / 209), die
  **GameObject-Position derselben Zone** stand dabei konstant bei −15. Die Prüfung
  verglich also die Kachel mit einer Truppenposition, die es nicht gab — Einlösungen
  waren faktisch zufällig, und Thomas meldete dreimal dasselbe Symptom („da verliere ich
  immer Team", zuletzt mit Screenshot: rechts stehen und trotzdem einsammeln).
- **Regel:** Für eine Prüfung, die eine Physik-Kollision *bewertet*, nie die
  Darstellungs-Bounds eines Objekts heranziehen, das der Physik nachläuft. Die
  maßgebliche Größe aus der Quelle rechnen, die die Bewegung erzeugt — hier der Anker
  plus die Hüllenmaße aus `BALANCE`. Zwei Positionen für dieselbe Sache sind immer eine
  zu viel.

### 2026-08-23 — Test sicherte nur die Richtung, aus der die Beschwerde kam
- **Fehler:** Der erste Test zu den zwei Sammelbahn-Schwellen prüfte, dass rechts nichts
  ausgelöst wird, und dass ein Kampfstreifen existiert. Beides war grün bei
  `drainOverlapFigures` 2,2 — im laufenden Spiel gemessen löste damit **keine einzige
  rote Kachel mehr aus**, an keiner erreichbaren Position. Die Fahrgrenze deckelt den
  Anker bei x = 60,9, die Bahn endet bei x = 84, mehr als 1,88 Figurenbreiten
  Überlappung sind also nicht erreichbar. Der Test kannte die Fahrgrenze nicht.
- **Regel:** Wer eine Schwelle anhebt, um etwas zu verhindern, testet im selben Zug, dass
  das Verhinderte **erreichbar bleibt**. Ein Grenzwert braucht immer beide Enden im
  Test: „greift nicht zu früh" UND „greift überhaupt noch". Und: Schwellen, die gegen
  eine Bewegungsgrenze arbeiten, sind aus dieser Grenze herzuleiten, nicht aus der Größe
  des bewegten Objekts.

### 2026-08-20 — Reißleine erlaubte stillen Zielwechsel
- **Fehler:** Die Spec für die Gegner-Sprites enthielt als Reißleine „notfalls programmatisch zeichnen". Codex zog sie, lieferte abstrakte Formen statt Figuren — spec-konform, aber am Wunsch vorbei. Thomas musste den Auftrag wiederholen.
- **Regel:** Jede Reißleine benennt ausdrücklich, was **kein** zulässiger Ersatz ist, und verlangt bei Nichterreichbarkeit des Ziels eine Meldung statt eines Ersatzprodukts. Ein Ausweg ohne diese Grenze ist eine Erlaubnis, das Ziel zu tauschen.

### 2026-08-20 — Erfolgreiches Verfahren stand nirgends
- **Fehler:** Die vorhandene Spielerfigur war groß erzeugt und heruntergerechnet worden. Das stand in keiner Datei (Probeordner ist gitignored), also fehlte es in der ersten Sprite-Spec — Codex erzeugte direkt in Zielgröße, das Ergebnis war unbrauchbar.
- **Regel:** Wenn im Projekt etwas schon einmal gelungen ist, gehört der Weg dorthin in die Spec, nicht nur das Ergebnis ins Repo. Vor jeder Asset-Spec prüfen, wie vergleichbare Assets entstanden sind — und das Verfahren beim ersten Mal mitdokumentieren.


### 2026-08-20 — Vorhandenes Asset falsch beurteilt, zwei Laeufe verschwendet
- **Fehler:** Zwei Codex-Laeufe beauftragt, um die Spielfigur als Rueckenansicht neu zu erzeugen — sie **war** bereits eine Rueckenansicht. `src/assets/player.png` ist bitgleich `assets/probe/r3/figur-r3-2-34x46.png`. Grundlage des Fehlurteils war das 9-fach vergroesserte 34x46-Sprite: der dunkle Bereich unter dem Helm wurde als Gesicht gelesen, tatsaechlich ist es der Nacken. Auf die Frage des Nutzers kam die falsche Auskunft "noch frontal". Erst sein Hinweis auf den Probeordner klaerte es.
- **Regel:** Vor jedem Auftrag, ein Asset zu **aendern**, den Ist-Zustand an der **grossen Vorlage** im Probeordner pruefen, nie nur am Sprite in Spielgroesse — bei 34 px ist eine Ansicht nicht sicher zu erkennen, und genau das war hier vorher schon selbst festgestellt worden. Ebenso vorher pruefen, ob das Gewuenschte im Probeordner bereits fertig liegt: die Ordner enthalten verworfene **und** eingesetzte Varianten. Ein Datei-Hash-Vergleich zwischen Probe und `src/assets/` kostet Sekunden und haette beide Laeufe erspart.

### 2026-08-20 — Geometrie-Fix ohne Messlauf als erledigt gemeldet
- **Fehler:** Der Fix `fddcb63` („Gegner erscheinen nicht mehr uebereinander") wurde nach Sichtpruefung abgeschlossen. Thomas musste denselben Fehler ein zweites Mal melden. Die Messung danach zeigte: 1,7 % aller Frames enthielten weiterhin ueberlappende Gegner. Der Fix hatte nur die Spawn-Verteilung repariert, nicht das Einholen schnellerer Gegner. Anschliessend wurde erneut lange ueber Ursachen spekuliert (Display-Flimmern, Sprite-Fehler, Skalierungsartefakte), obwohl eine Messung in Minuten Klarheit brachte.
- **Regel:** Fehler, die sich als Haeufigkeit ausdruecken lassen („erscheint manchmal doppelt"), nie per Augenschein oder Hypothese beurteilen, sondern **zaehlen**: Spiel per Playwright starten, `update` der betroffenen Klasse am Prototyp instrumentieren, ueber Minuten protokollieren, Vorkommen zaehlen. Vorher-Wert festhalten, damit der Fix eine Zahl gegen sich hat. Ohne Zahl gilt ein Geometrie- oder Timing-Fix nicht als belegt. Gilt auch fuer die Rueckfrage an Thomas: eine Bildschirmaufnahme kostet ihn 20 Sekunden und trennt „echtes Objekt" von „Anzeigeeffekt" sofort — frueh danach fragen statt Varianten durchzuspielen.

### 2026-08-20 — Logische statt gezeichneter Position gemessen, Fehler zweimal verfehlt
- **Fehler:** Thomas meldete dreimal doppelt erscheinende Zombies. Die Instrumentierung las `enemy.x` **direkt nach** dem Setzen im eigenen Update aus — der Wert war glatt, also galt die Sache als erledigt. Tatsaechlich schrieb der Arcade-Physikschritt die Position **danach** um `body.offset.x` versetzt zurueck ins Sprite, mit wechselndem Vorzeichen je Bild; gerendert wurde dieser Stand. Ein ganzer Codex-Lauf ging in einen zwar echten, aber anderen Fehler (Gegner holten einander ein), weil die Messung den eigentlichen nicht sehen konnte.
- **Regel:** Bei sichtbaren Fehlern das messen, was **gezeichnet** wird, nicht den Wert, den der eigene Code gerade geschrieben hat. Praktisch: den Wert am **Anfang** des naechsten Frames gegen das Ende des vorigen pruefen — die Differenz ist alles, was Engine, Physik und Renderer dazwischen getan haben. Ist sie ungleich null, obwohl nur der eigene Code die Position setzt, ist genau dort der Fehler. Zusaetzlich frueh die eine Frage stellen, die eine Figur von zwei Objekten trennt: **"zaehlt es beim Abschiessen als eins oder als zwei?"** Thomas' Satz "zaehlt wie einer" hat den Fall in einem Zug entschieden, nachdem Stunden in die falsche Richtung gelaufen waren.
- **Zusatz:** Wer die Position eines Arcade-Koerpers selbst setzt, muss `body.moves = false` setzen. Sonst kaempfen eigenes Update und Physik-Rueckschreibung gegeneinander, und der sichtbare Versatz betraegt genau das Doppelte von `body.offset.x` — also proportional zum transparenten Rand des Sprites. Das erklaert, warum ein Fehler nur manche Sprites trifft.

### 2026-08-20 — Bilderzeugung faelschlich als eigenen Blocker gemeldet
- **Fehler:** Auf Thomas' Wunsch nach Waffen-Bildern statt Schrift meldete Claude, es koenne in dieser Sitzung keine Bilder erzeugen, und lieferte ihm Bildauftraege zum Selbermachen. Grundlage war die Commit-Notiz "KI-generierte Spielerfigur", die Claude einer frueheren Claude-Sitzung zuschrieb. Tatsaechlich erzeugt **Codex** die Bilder — alle vorhandenen Sprites stammen aus Codex-Laeufen. Thomas musste korrigieren: "Bilder erzeugt Codex, solltest du dir endlich mal merken."
- **Regel:** Bildbedarf ist ein normaler Codex-Task, kein Blocker und keine Aufgabe fuer Thomas. Spec schreiben, `SPEC_READY`, Terminal-Handoff — mit dem bewaehrten Verfahren (gross erzeugen, dann herunterrechnen) und der Reissleine, die "programmatisch zeichnen" als Ersatz ausdruecklich verbietet. Vor dem Melden einer fehlenden eigenen Faehigkeit zuerst pruefen, ob die Faehigkeit im Projekt woanders sitzt.

### 2026-08-20 — Verlauf am Screenshot fuer vorhanden gehalten, statt ihn zu messen
- **Fehler:** Der Himmel wurde als „Verlauf von oben nach unten" abgenommen, weil er auf dem Screenshot passend aussah. Tatsaechlich war er eine einzige Farbflaeche — `Graphics.fillGradientStyle()` wirkt in Phaser nur beim WebGL-Zeichnen und wird von `generateTexture()` (Canvas-Pfad) stillschweigend auf die erste Farbe reduziert. Zusaetzlich war die Farbreihenfolge so uebergeben, dass der Verlauf seitwaerts gelaufen waere. Aufgefallen ist es erst, als ein daruebergelegtes Element wegfiel, das die Flaeche gegliedert und Struktur vorgetaeuscht hatte.
- **Regel:** Eine Eigenschaft, die sich als Verlauf, Abstufung oder Uebergang beschreibt, nie am Bildeindruck abnehmen. Sie wird **entlang der Achse gemessen**, auf der sie sich aendern soll: Pixelfarben auslesen und pruefen, ob sich der Wert ueberhaupt aendert, in die richtige Richtung laeuft und ohne Sprung. Ein Screenshot unterscheidet eine flaeche Fuellung nicht von einem feinen Verlauf, besonders wenn daneben ein anderes Element Struktur liefert. Zweite Lehre: Zeichenbefehle, die nur unter einem von mehreren Render-Pfaden wirken, scheitern **lautlos** — bei allem, was ueber `generateTexture` laeuft, das Ergebnis pruefen statt den Aufruf.

### 2026-08-21 — Argumentreihenfolge einer Physik-Rueckruffunktion zum zweiten Mal falsch angenommen
- **Fehler:** `physics.add.overlap(gruppe, einzelObjekt, callback)` liefert die Argumente als `(einzelObjekt, gruppenkind)` — umgekehrt zur Registrierungsreihenfolge. Der Trefferbehandler las die Waffe vom Boss statt vom Projektil, warf jedes Bild eine Ausnahme, der Boss nahm keinen Schaden, und die geworfene Ausnahme brach zusaetzlich den restlichen Kollisionsdurchlauf ab, sodass auch die Boss-Geschosse die Truppe nie trafen. Dieselbe Falle war im selben Projekt schon einmal aufgetreten und stand als Kommentar zwei Zeilen darueber im Code.
- **Regel:** Die Reihenfolge der Rueckrufargumente einer Physik-Ueberlappung nie voraussetzen — auch nicht, wenn man sie beim letzten Mal nachgeschlagen hat. Die beteiligten Objekte werden **an ihren eigenen Daten erkannt** (welches traegt die Waffenmarke, welches die Schadensmarke), nicht an ihrer Position im Aufruf. Ein Kommentar, der die richtige Reihenfolge festhaelt, verhindert den Fehler nachweislich nicht; eine Hilfsfunktion, die ihn unmoeglich macht, schon. Und: Eine Ausnahme in einem Kollisions-Rueckruf reisst still weitere Kollisionspruefungen desselben Bildes mit — der sichtbare Schaden ist dann groesser als die Fehlerstelle und zeigt woanders hin.

### 2026-08-21 — Zahlen fuer eine Nutzerentscheidung geschaetzt statt gerechnet
Die Auswahlvorschau zur Boss-Daempfung nannte Kampfdauern (24/20/17/15 s), die aus dem Kopf
geschaetzt waren. Die anschliessende Rechnung mit den echten `balance.ts`-Werten ergab
40/29/23/20 s — eine Abweichung von bis zu 67 %. Thomas hat auf dieser Basis entschieden.
**Regel:** Zahlen, die in einer Entscheidungsvorlage stehen, sind Balance-Modellrechnungen und
unterliegen derselben Pflicht wie die in der Spec: erst aus `balance.ts` ableiten, dann
anzeigen. Ist das vor der Frage nicht leistbar, die Vorschau ohne Zahlen formulieren statt mit
geschaetzten.

### 2026-08-22 — Vergleichs-Wunsch in die falsche Richtung aufgeloest
- **Fehler:** Thomas' Feedback „Haeuser erscheinen oben frueher als Mobs" wurde als Auftrag
  gelesen, die **Haeuser** frueher erscheinen zu lassen (Kulissen-Vorlauf vergroessern). Gemeint
  war das Gegenteil: Die Haeuser machen es schon richtig, die **Gegner** sollen wie sie leicht
  aus dem Horizont kommen statt erst unter der weissen Linie aufzupoppen. Der V2-Plan stand
  einen Commit lang mit dem falschen W1-Ziel und -Akzeptanzkriterium.
- **Regel:** Ein Wunsch der Form „X passiert frueher/besser als Y" legt nicht fest, ob X das
  Vorbild oder das Problem ist. Vor dem Einarbeiten die Richtung explizit machen: hinschreiben,
  welches Element als Ist-Zustand gilt und welches geaendert wird — als markierte Annahme,
  wenn Thomas' Formulierung beides zulaesst. Dann faellt eine Fehldeutung beim Lesen des Plans
  auf, statt erst in der gebauten Etappe.

### 2026-08-22 — Geaeusserte Formfaktor-Praeferenz beim naechsten Bauteil wieder ignoriert
- **Fehler:** Thomas hatte bei den Wandsegmenten bereits korrigiert "breiter, nicht hoeher".
  Beim Umbau zur Dauerwand wurde die Segmenthoehe trotzdem auf 120 px gesetzt (Motiv:
  weniger Pool-Objekte) — die Kacheln wirkten wieder hochkant, Thomas musste dieselbe
  Korrektur ein zweites Mal geben.
- **Regel:** Eine einmal geaeusserte Gestaltungs-Praeferenz (Formfaktor, Farbe, Dichte)
  gilt fuer alle folgenden Bauteile derselben Art weiter, auch wenn ein technisches Motiv
  dagegen spricht. Wenn das technische Motiv wichtig erscheint: Konflikt benennen und
  fragen, nicht still zugunsten der Technik entscheiden.

### 2026-08-22 — An eigene Grenze gestossen und still einen Kompromiss gebaut
- **Fehler:** Thomas wollte die Waende "breiter". Die Breite war intern durch die
  90-px-Torspuren gedeckelt; statt diese Grenze zu benennen und Auswege anzubieten,
  wurde die Breite nur bis zur Grenze erhoeht und stattdessen die Hoehe vergroessert.
  Thomas musste nachkorrigieren — und lieferte den Ausweg selbst (Ueberhang ueber die
  Strassenkante), der die Grenze gar nicht beruehrt.
- **Regel:** Stoesst eine Nutzerforderung an eine interne Randbedingung, wird die
  Randbedingung in der Antwort benannt und mindestens ein Ausweg angeboten, der die
  Forderung voll erfuellt — nicht still ein Teilkompromiss in einer anderen Dimension
  gebaut. Vorher pruefen, ob die Randbedingung ueberhaupt fuer die geforderte Aenderung
  gilt (der Korridor begrenzte nur die Innenseite, nicht die Aussenseite).

### 2026-08-22 — Referenzverhalten nachgebaut statt uebernommen
- **Fehler:** Thomas wollte, dass Gegner am Horizont erscheinen "wie die Haeuser". Umgesetzt
  wurde ein eigener Effekt (Abschneiden an der Linie per Crop), der plausibel wirkte, aber dem
  Referenzverhalten widersprach: Haeuser stehen ab der Linie VOLL da und ragen darueber hinaus.
  Thomas musste korrigieren ("das sollte angeglichen sein").
- **Regel:** Nennt ein Wunsch ein Referenzsystem ("wie X", "angleichen an X"), zuerst das
  Verhalten von X am Objekt selbst ablesen und exakt dieselbe Regel uebernehmen — keinen
  eigenen Effekt erfinden, der das Ziel nur aehnlich erreicht. Vor dem Bauen die uebernommene
  Regel in einem Satz notieren ("sichtbar ab Unterkante >= Linie, voll gezeichnet") und gegen
  das Referenzobjekt pruefen.

### 2026-08-22 — Balance-Zahl sauber hergeleitet, Erreichbarkeit nie geprueft
- **Fehler:** Die Wandsegmente waren korrekt auf ~0,7 s Fokusfeuer ausgelegt (hpFactor 0.35 x
  referenceDestroySec 2 s), mit Herleitung im Kommentar. Thomas meldete trotzdem "voll schwer
  ueberhaupt Waende wegzubekommen". Die Messung zeigte: Die Zahl stimmte, war aber unerreichbar
  — der Fahrbereich endete auf Spuranteil 0,519, die Wand begann bei 0,660, und der starre
  Senkrechtschuss lief perspektivisch aus der Wandzone heraus. Ein Segment neben der Truppe war
  nicht beschiessbar. Zwei Systeme (Balance, Geometrie) waren je fuer sich richtig hergeleitet
  und trafen sich nicht.
- **Regel:** Eine Balance-Zahl gilt erst als hergeleitet, wenn auch belegt ist, dass der Spieler
  die Bedingung **erreichen** kann, unter der sie gilt. Zu jedem "X faellt nach t Sekunden Fokus"
  gehoert die zweite Messung: Von welcher Position aus trifft der Spieler X ueberhaupt, kommt er
  dorthin, und wie lange darf er bleiben? Praktisch: die Trefferbedingung als geometrische
  Groesse ausdruecken (hier laneRatio), Spielerreichweite und Zielzone in derselben Groesse
  angeben und beide vergleichen. Fehlt diese Gegenprobe, ist die Herleitung im Kommentar nur
  eine Rechnung ueber ein System, nicht ueber das Spiel.
- **Zusatz:** Auch die eigene Loesungsvorschau unterliegt dem. Die Thomas vorgelegte Option
  "Kugeln der Strasse folgen lassen" versprach "was neben dir ist, triffst du auch" — gemessen
  traf sie danach **gar nichts** mehr, weil der Fahrbereich weiter vor der Wand endete. Vor dem
  Vorlegen einer Option pruefen, ob sie allein wirkt oder eine zweite Aenderung zwingend
  braucht; sonst waehlt Thomas eine Haelfte und bekommt eine Verschlechterung.

### 2026-08-21 — Auswahloption ohne Zuordnung beschriftet, Rueckfrage ausgeloest
Die Vorschau `│ ×2 │ +7 │ LASER │` zeigte die Anordnung der drei Torspuren, aber nicht, welche
Spur was bewirkt. Thomas verstand es als "die Waffe steckt in einem Rechen-Tor" und
widersprach — obwohl die gewaehlte Variante genau sein Anliegen umsetzte.
**Regel:** In einer Auswahlvorschau bekommt jedes Element eine Wirkungsbeschriftung, nicht nur
eine Position. Bei Spielelementen heisst das: darunterschreiben, was das Element tut.

### 2026-08-22 — Zwei Systeme je fuer sich korrekt, gemeinsam kaputt
- **Fehler:** Die Wandhaerte war sauber hergeleitet (Feuerkraft x 2 s x 0,35 = 0,7 s
  Fokus, Rechenweg als Kommentar daneben) und trotzdem falsch: Weil die HP 1:1 mit der
  Spielerstaerke wuchsen, blieb die Fokusdauer ueber den ganzen Run konstant —
  Aufruesten war gegen Waende folgenlos. Zusaetzlich hing die Zahl an der Waffe und
  sprang bei Truppe 8 zwischen 4 und 71; wer eine Schrotflinte aufhob, machte sich die
  Waende 4x haerter. Aufgefallen ist es erst, als Thomas es zum dritten Mal meldete.
- **Regel:** Eine Balance-Groesse, die aus der Spielerstaerke abgeleitet wird, erzeugt
  per Konstruktion ein NULL-Ergebnis fuer jede Verbesserung — der Spieler wird staerker,
  die Aufgabe genauso. Vor jeder solchen Kopplung die Frage stellen und beantworten:
  "Was merkt der Spieler davon, dass er sich verbessert hat?" Wenn die Antwort "nichts"
  ist, gehoert eine Daempfung oder eine andere Bezugsgroesse hinein (hier: Levelnummer).
  Zweitens: Wo mehrere Ausruestungsteile in dieselbe Formel eingehen, die Spanne ueber
  ALLE Kombinationen ausrechnen, nicht nur den Referenzfall. Faktor 18 zwischen Rakete
  und Schrot stand seit Wochen im Code und war nie jemandem aufgefallen.

### 2026-08-22 — Fehlende Faehigkeit gemeldet, die es schon gab
- **Fehler:** Auf Thomas' "fuehlt sich nicht an wie im App Store" wurde eine Liste
  fehlender Dinge geliefert, darunter "kein Trefferfeedback, Gegner blitzen nicht auf".
  Den Blitz gab es laengst (`setTintFill` in `spawner.damage`). Der Suchlauf hatte nur
  nach `setTint(` gegriffen und die Variante uebersehen.
- **Regel:** Eine Aussage der Form "X gibt es im Projekt nicht" ist eine Tatsachen-
  behauptung und braucht einen Suchlauf, der Varianten des Namens abdeckt (`setTint`,
  `setTintFill`, `tint`), nicht einen einzelnen exakten Treffer. Bei Negativbefunden
  breiter greppen als bei Positivbefunden — ein verpasster Treffer dreht die Aussage um.

### 2026-08-22 — Drossel nach fester Mindestpause bevorzugte die langsamere Waffe
- **Fehler:** Die erste Ton-Drossel war eine feste Mindestpause (125 ms = 1000 /
  shotsPerSec.cap). Sauber hergeleitet, trotzdem falsch: Faellt der Eingangstakt nicht
  auf das Drosselraster, fallen Ereignisse aus. Die Minigun (17,6 Salven/s) kam damit
  auf 5,9 Toene/s und haette LANGSAMER geklungen als die Standardwaffe mit 8. Der Test
  hat es gefunden, nicht das Ohr.
- **Regel:** Eine Bremse, die "hoechstens alle X ms" sagt, ist keine Ratenbegrenzung,
  sondern ein Raster - und Raster erzeugen Schwebungen mit jedem Eingangstakt, der
  nicht darauf passt. Wo eine mittlere Rate gemeint ist, gehoert eine Rate hin
  (Marken, die nachwachsen und deren Rest nicht verfaellt). Pruefkriterium beim
  Schreiben des Tests: **das schnellste Eingangssignal gegen das langsamste antreten
  lassen** - kehrt sich die Reihenfolge um, ist die Bremse falsch gebaut.

### 2026-08-22 — Balance an einer Groesse gedreht, die den Ausgang gar nicht bestimmt
- **Fehler:** Die Boss-Kampfdauer sollte ins Fenster 20-40 s. Zwei Runden lang wurden
  dafuer die Lebenspunkte nachgezogen (Grenzen, Daempfungen, Faktoren aus gemessenen
  Abweichungen). Die dritte Messung mit Wiederholungen zeigte: Dieselbe Kombination
  brauchte je nach Zufall 29 s oder 109 s. Nicht die Lebenspunkte bestimmten die
  Dauer, sondern wie viele und welche Gegner gerade als Schild vor dem Boss standen -
  und deren Typen werden gezogen. Jede weitere HP-Anpassung haette nur die eine
  Messung schoengerechnet, die gerade lief.
- **Regel:** Bevor eine Balance-Zahl an eine Messung angepasst wird, denselben Fall
  **mindestens dreimal mit frischem Zustand** messen. Ist die Streuung innerhalb eines
  Falls groesser als der Abstand zwischen den Faellen, ist die gedrehte Groesse nicht
  die bestimmende - dann gehoert die Ursache benannt und dem Nutzer als Befund
  vorgelegt, statt weiter zu drehen. Zweite Lehre: Rueckstaende aus dem vorigen
  Messlauf (aktive Objekte, Akkumulatoren) machen jede Wiederholung wertlos; jede
  Wiederholung braucht eine frische Szene.

### 2026-08-22 — Sperrdatei geloescht statt Prozess beendet, Nutzer-Rechner blockiert
- **Fehler:** Der Playwright-Browser meldete "Browser is already in use for
  ~/.playwright-profiles/oscar-chrome". Statt den haengenden Prozess zu beenden, wurden
  die Sperrdateien (`SingletonLock` und Geschwister) geloescht. Beim naechsten Start
  meldete Chrome das Profil als beschaedigt; der Dialog liess sich nicht wegklicken,
  weil ein ferngesteuerter Browser keine Nutzereingaben annimmt. Thomas sass vor einem
  Fenster, das er nicht schliessen konnte, und musste es melden.
- **Regel:** Eine Sperrdatei ist ein Symptom, kein Muell - sie zeigt auf einen Prozess,
  der noch laeuft. Erst `pkill -f "<profilpfad>"`, kurz warten, pruefen dass keiner mehr
  laeuft, dann neu starten. Sperrdateien nur anfassen, wenn nachweislich kein Prozess
  mehr existiert. Zweitens: Jeder ferngesteuerte Browser gehoert am Ende einer
  Pruefsitzung beendet, nicht nur der Tab geschlossen - ein offener Prozess ist die
  Sperrdatei des naechsten Laufs. Drittens: Faellt so etwas auf, zuerst aufraeumen und
  es dem Nutzer sagen, dann weiterarbeiten.

### 2026-08-22 — Dieselbe Beschwerde zweimal gehoert, zweimal am falschen Wert gedreht
- **Fehler:** Thomas meldete zweimal "die Horden sind viel zu klein in der Menge".
  Beide Male wurde die Gruppengroesse in der Leveltabelle erhoeht - beim zweiten Mal
  zusammen mit dem Deckel `level.squads.maxSize` (8 auf 14). Die Messung im laufenden
  Spiel zeigte danach: Bei Level 12 wurde eine 14er-Horde angefordert und **zwei**
  Gegner kamen an. Ursache war die Breitenregel: Passte die breiteste Reihe nicht in
  die Strasse am Horizont, verkleinerte `computeHordeOffsets` die ganze Horde, statt
  die Reihe schmaler und die Formation tiefer zu machen. Der Wert, an dem zweimal
  gedreht wurde, hatte auf das Ergebnis nie eine Wirkung.
- **Regel:** Wiederholt der Nutzer eine Beschwerde, nachdem sie angeblich behoben
  wurde, war die Ursache **nicht** an der geaenderten Stelle. Dann nicht denselben Wert
  weiter erhoehen, sondern messen, was am Ende der Kette tatsaechlich ankommt -
  angefordert gegen geliefert, an der Quelle abgegriffen. Der Unterschied zwischen
  beidem ist die Ursache. Zweite Lehre: Wenn eine Grenze verletzt wird, zuerst pruefen,
  ob die Konstruktion ausweichen kann (hier: in die Tiefe wachsen), bevor beschnitten
  wird. Beschneiden ist der Notausgang, nicht die erste Antwort.

### 2026-08-22 — Test schrieb die Formel ab und deckte einen Faktor-4,7-Fehler nicht auf
- **Fehler:** `getNormalPhaseEnemiesPerSec` teilte die erwarteten Gegner je
  Spawn-Ereignis durch das Spawn-Intervall - und ignorierte die Nachlaufpause, die der
  Spawner nach jeder Horde setzt und die das Intervall ueberschreibt. Bei Level 12
  ergab das 31,9 Gegner/s statt real 6,8. Der zugehoerige Test baute exakt dieselbe
  Rechnung nach und war deshalb immer gruen. Der Fehler blieb unbemerkt, weil der
  Boss-Ruftakt in seine Untergrenze lief und die ueberhoehte Zahl dort abgeschnitten
  wurde - er waere erst mit groesseren Horden als geschlossene Gegnerwand sichtbar
  geworden.
- **Regel:** Eine Berechnung nie gegen ihre eigene Formel testen. Der Test prueft
  entweder gegen eine **unabhaengige Schranke** (hier: mehr Gegner je Sekunde, als der
  Spawner mit seiner Pause ueberhaupt setzen kann, darf nicht herauskommen) oder gegen
  einen **im Spiel gemessenen** Wert. Formelkopien sichern nur ab, dass niemand die
  Zeile umformuliert.

### 2026-08-22 — Nebenbedingung veraendert die Wahrscheinlichkeit, auf die gerechnet wurde
- **Fehler:** Rote Kacheln sollten mit 25 % erscheinen (`badChance: 0.25`), und die
  Abzugsbetraege wurden auf genau dieses Verhaeltnis ausgerechnet (drei gute je roter).
  Eine zweite Regel verbot zwei rote in Folge - damit sank der tatsaechliche Anteil auf
  p / (1 + p) = 20 %, im Spiel gemessen 19,5 %. Die Netto-Null-Rechnung, die den ganzen
  Sinn der Aenderung traegt, war damit falsch: Blindes Draufhalten haette weiter
  Feuerkraft aufgebaut.
- **Regel:** Sobald eine Nebenbedingung (Mindestabstand, Garantie, Deckel, Sperre) auf
  eine Zufallsgroesse wirkt, ist der eingestellte Wert nicht mehr der wirksame. Den
  wirksamen Anteil ausrechnen **und im Spiel nachzaehlen**, bevor andere Werte darauf
  aufgebaut werden. Faustregel fuer diesen Fall: Verbietet eine Regel Wiederholungen,
  gilt p / (1 + p) statt p.

### 2026-08-22 — Drei Anlaeufe an der Hordengroesse, waehrend der Durchsatz die Grenze war
- **Fehler:** Thomas meldete DREIMAL "zu wenig Mobs". Anlauf 1 erhoehte die Gruppengroessen
  in der Leveltabelle, Anlauf 2 zusaetzlich den Deckel `maxSize` und reparierte die
  Breitenregel. Beide Male blieb der gemessene Gegnerbestand niedrig. Erst Anlauf 3 mass
  den DURCHSATZ statt der Gruppengroesse - und fand drei voneinander unabhaengige
  Bremsen, von denen keine mit der Gruppengroesse zu tun hatte:
  1. Die Nachlaufpause nach einer Horde (650 + 100 je Mitglied) deckelte den Nachschub
     auf 6,8 Gegner/s, egal wie gross die Horde war.
  2. Die Spurwahl sperrte 97 % aller Spawn-Versuche, weil sie eine Formation als
     soliden Block behandelte und jeden langsameren Bestandsgegner als Blocker zaehlte.
  3. Die Gegner-Lebenspunkte waren ueber alle zwoelf Level FEST, waehrend die Truppe von
     9 auf ueber 5.000 Schaden je Sekunde wuchs - gemessen 144 Toetungen je Sekunde bei
     6 Nachschub. Kein Hordenwert kann das ausgleichen.
- **Regel:** Bei "zu wenig X" nie die Erzeugungsgroesse anfassen, sondern die KETTE
  durchmessen: angefordert -> erzeugt -> ueberlebend -> sichtbar. Der Bestand ist immer
  Zufluss mal Verweildauer; beide Faktoren muessen einzeln gemessen werden. Eine
  Gruppengroesse ist nur der erste Schritt der Kette und meist nicht der begrenzende.
  Zweite Lehre: Wenn eine Sicherheitspruefung fast alles ablehnt, ist sie nicht streng,
  sondern falsch parametrisiert - eine Ablehnungsquote gehoert gemessen, sonst arbeitet
  sie unbemerkt gegen das Ziel.

### 2026-08-22 — Gegenmassnahme half dem Gegner, weil ich die Wirkungskette nicht zu Ende dachte
- **Fehler:** Damit Stehenbleiben nicht mehr funktioniert, wurde eine Zielsuche gebaut:
  Gegner driften seitlich auf die Truppe zu. Die Messung danach zeigte das GEGENTEIL des
  Gewollten - der Gegnerbestand sank von 20,7 auf 8,6. Grund: Die Truppe schiesst
  spurtreu, trifft also genau das, was in ihrer Spur steht. Die Zielsuche fuehrte die
  Gegner geradewegs in die Feuerlinie und machte das Spiel leichter statt schwerer.
- **Regel:** Vor dem Bau einer Gegenmassnahme die Wirkungskette bis zum Ende durchspielen
  und eine VORHERSAGE aufschreiben ("danach muessten mehr Gegner durchkommen"). Trifft
  die Messung das Gegenteil, ist nicht die Zahl falsch, sondern die Annahme ueber den
  Mechanismus. Hier hiess die uebersehene Kopplung: Wer sich zum Spieler bewegt, bewegt
  sich auch in dessen Waffenwirkung.

### 2026-08-22 — Projektstand aus der falschen Datei beantwortet
- **Fehler:** Auf Thomas' Frage nach dem naechsten Punkt habe ich `docs/plan.md` gelesen
  und "E6, die V1-Abnahme" geantwortet. Falsch: V1 war seit dem Vormittag abgenommen und
  als Tag `v1.0` gesichert, wir arbeiten seit Tagen in `docs/plan-v2.md` (W1-W5 gebaut).
  Thomas musste selbst korrigieren ("wir sind doch schon bei V2 oder?"). Die richtige
  Antwort stand im ERSTEN Absatz von `plan-v2.md` - ich hatte die Datei nie geoeffnet,
  weil `plan.md` der kanonisch klingende Name ist.
- **Regel:** Vor jeder Aussage ueber Projektstand, naechste Schritte oder offene Punkte
  ERST `ls docs/` und die jeweils juengste Plandatei lesen, nicht die mit dem
  naheliegendsten Namen. Bei mehreren Plaenen gilt der mit der hoechsten Versionsnummer,
  und `git tag -l` zeigt, was bereits abgenommen ist. Ein Projektstand wird nie aus dem
  Gedaechtnis oder aus einer einzelnen Datei beantwortet.

### 2026-08-25 — `git add src/` sammelte ein, was ein Codex-Lauf parallel schrieb
- **Fehler:** Waehrend ein Codex-Bildauftrag im Terminal lief und 19 PNGs nach
  `src/assets/` schrieb, wurden zwei Code-Commits mit `git add src/ tests/ docs/`
  gemacht. Beide haben die gerade entstehenden Bilder eingesammelt: Ein Commit ueber die
  Spawn-Schonfrist enthielt eine Gegnerdatei, der Commit ueber den Waffenkauf achtzehn
  weitere **plus eine Loeschung** - Codex hatte die erste Datei zwischenzeitlich selbst
  entfernt, weil sie ihm als "vom Nutzer geloescht" erschien. Beide Commits sind gepusht
  und deployt worden, bevor auch nur ein Bild angesehen war. Aufgefallen ist es nur, weil
  der Codex-Bericht "18 PNGs erzeugt" meldete und `git status` gleichzeitig ein sauberes
  Arbeitsverzeichnis zeigte - ein Widerspruch, der ohne Nachrechnen als Erfolg
  durchgegangen waere.
- **Regel:** Solange ein Hintergrundlauf (Codex, Generator, Build) in ein Verzeichnis
  schreibt, wird dort **nie mit Verzeichnis-Pfaden** committet. Entweder die betroffenen
  Dateien einzeln nennen, oder den Lauf abwarten. Praktisch: Vor jedem `git add <ordner>`
  pruefen, ob ein `.done`-Marker eines laufenden Auftrags noch fehlt.
- **Zweite Lehre (der Widerspruch war der Beleg):** Ein Abschlussbericht, der Dateien
  meldet, und ein sauberes `git status` schliessen einander aus. Wo Bericht und
  Repository-Zustand sich widersprechen, gilt keiner von beiden als wahr, bis die Dateien
  selbst nachgemessen sind - `ls`, Bildmasse, Inhalt. Der Bericht eines Subagenten ist
  ein Rueckgabewert, kein Nachweis.
- **Dritte Lehre (was gut ging):** Die Bilder selbst waren einwandfrei - alle 19 Masse
  exakt, alle opaken Koerpermasse ohne jede Abweichung. Der Schaden lag nicht im
  Ergebnis, sondern darin, dass es ungeprueft und unter falscher Ueberschrift ins Repo
  und live ging. Genau dafuer ist die Trennung von Erzeugen und Abnehmen da.

### 2026-08-24 — Dreimal eine 14-Minuten-Messreihe gestartet, zweimal mass sie das Falsche
- **Fehler:** Fuer die Waffenliste wurden nacheinander DREI volle Messreihen (je 24 Laeufe,
  rund 14 Minuten) gestartet. Die ersten beiden massen nicht die Waffenstaerke, sondern
  den Gegnernachschub — alle Waffen lagen bei 11-13 Toetungen/s, exakt beim Nachschub von
  12,6/s. Ursache eins: zu schwache Ueberlast (die Truppe raeumte alles weg). Ursache
  zwei: Die Sonde patchte `recycle()`, das an ZWEI Stellen gerufen wird — beim Tod durch
  Schaden UND wenn ein Gegner unten aus dem Bild laeuft; gezaehlt wurde also der
  Durchsatz. Beide Male stand der Beleg schon nach dem ERSTEN Lauf da (35 Sekunden), und
  beide Male fiel es erst auf, weil **Thomas nachfragte**. Ohne seine Nachfrage waere
  jeweils die volle Reihe durchgelaufen.
- **Regel:** Eine Messreihe wird nie am Stueck gestartet. Erst **ein** Lauf, dann die
  Plausibilitaetspruefung, dann die Reihe. Die Pruefung wird VOR dem Start hingeschrieben,
  nicht danach improvisiert — als Bilanz, die aufgehen muss, und als Grenze, die nicht
  verletzt werden darf. Hier waren es zwei Zeilen: „Toetungen + Durchgelaufene muessen dem
  Nachschub entsprechen" und „die Todeshoehe muss ueber der Truppe liegen". Beide haetten
  den Fehler sofort gezeigt; die zweite Zahl (722 px gegen Truppe bei 714 px) lag in der
  Ausgabe der ersten falschen Reihe bereits vor und wurde ueberlesen.
- **Zweite Lehre (wer die Abbruchbedingung prueft):** Ein laufender Langlauf gehoert vom
  Agenten selbst kontrolliert, nicht vom Nutzer. Wer eine Messung startet und erst auf
  Nachfrage hinsieht, verlagert die Qualitaetssicherung auf den Auftraggeber — und
  verbrennt dessen Zeit und Kontingent. Bei jedem Lauf ueber ein paar Minuten gilt:
  Zwischenstand nach dem ersten Ergebnis selbst pruefen und bei Verdacht sofort abbrechen.
- **Dritte Lehre (verdaechtige Gleichheit):** Wenn mehrere Varianten, die sich unterscheiden
  SOLLEN, alle dasselbe Ergebnis liefern, misst die Sonde fast immer eine gemeinsame
  vorgelagerte Groesse — nicht die Varianten. Gleichheit ist dann kein Befund, sondern ein
  Alarmzeichen.

### 2026-08-24 — Steuergroesse war bistabil, das Modell sagte die Haelfte voraus
- **Fehler/Fund:** Fuer die Endlos-Skalierung (E1) wurde eine Kurve aus dem Verhaeltnis
  „Feuerkraft geteilt durch Bedarf" hergeleitet und die Steigung so gewaehlt, dass dieses
  Verhaeltnis bis Level 30 auf 0,57 faellt. Die Rechnung war sauber und im Kommentar
  belegt. Gemessen wurde damit auf Level 20 ein Durchkommensanteil von **23,1 %** — der
  Zielkorridor endet bei 12 %. Das Modell hatte 11,3 % vorhergesagt, also **die Haelfte**.
  Ursache ist die schon zweimal dokumentierte Bistabilitaet: Zwischen Level 16 und 20
  faellt das Verhaeltnis nur um 11 %, der Anteil steigt um 168 %. Die Empfindlichkeit
  waechst dabei **selbst** mit — Faktor 2,4 zwischen Level 12 und 16, Faktor 8,7 zwischen
  16 und 20. Die vier Regler mussten danach um das Vier- bis Sechsfache flacher gestellt
  werden.
- **Regel:** Eine Balance-Groesse, die als bistabil bekannt ist, darf nicht aus einem
  Modell **extrapoliert** werden — auch nicht aus einem, das an zwei Messpunkten geeicht
  ist. Aus zwei Punkten laesst sich die Empfindlichkeit nur *innerhalb* ihres Bereichs
  ablesen; ausserhalb ist sie eine andere Zahl. Praktisch: Den Arbeitspunkt so waehlen,
  dass er im **gemessenen** Bereich liegt, und den Abstand zum Kipppunkt ausdruecklich
  als Sicherheitsabstand hinschreiben. Wo das Modell trotzdem gebraucht wird, gehoert
  eine zweite, pessimistische Schaetzung daneben — ausgelegt wird auf die pessimistische.
- **Zweite Lehre (Sattigung tauscht das Vorzeichen):** Level 25 mass mit 21,0 % **weniger**
  als Level 20 mit 23,1 %, obwohl es rechnerisch haerter ist. Grund: Jenseits des
  Kipppunkts stehen so viele Gegner im Feld, dass die Spurvergabe den Nachschub selbst
  bremst (Spawn-Versuche fielen von 520 auf 402). Oberhalb des Kipppunkts misst man also
  nicht mehr die Schwierigkeit, sondern die Sperre — eine Messung dort taugt weder zum
  Steuern noch zum Vergleichen.
- **Dritte Lehre (der uebersehene dritte Kanal):** Die Steigung wurde zuerst nur an
  Gegner-Zaehigkeit und Gegnermischung eingestellt. `hardness` lief als dritter Kanal mit
  und traf Spawntakt UND Gegnertempo zugleich — auf Level 50 allein +23 % Nachschub. Wer
  eine Zielgroesse ueber mehrere Regler steuert, muss vorher **aufzaehlen, welche Regler
  ueberhaupt auf sie wirken**, und jeden einzeln beziffern. Ein Kanal, der in der
  Aufzaehlung fehlt, taucht als unerklaerliche Abweichung wieder auf.

### 2026-08-24 — Ein Zuwachs auf drei Faktoren eines Produkts wirkt kubisch
- **Fehler:** Der erste Entwurf der Endlos-Skalierung liess die Spielerdeckel fuer
  Schaden, Feuerrate und Truppen-Schadensbonus gemeinsam um 5 % je Level wachsen.
  Feuerkraft ist das **Produkt** dieser Groessen, der Zuwachs wirkte also kubisch
  (1,05 hoch 3 = 1,157 je Level), waehrend die Gegnerseite nur linear-exponentiell stieg
  und ihr Nachschub ohnehin gesaettigt war. Das Modell zeigte: Bis Level 20 wurde es
  haerter, ab Level 25 **wieder leichter** (Verhaeltnis 0,87 bei L20, dann 5,92 bei L25
  und 9,25 bei L30). Der Umbau haette den Sagezahn also nur um zwoelf Level verschoben.
  Derselbe Fehlertyp steht im V3-Plan bereits (geplant +38 %, real +92 %).
- **Regel:** Wo mehrere Groessen **multiplikativ** in dieselbe Wirkung eingehen, traegt
  den Zuwachs genau EINE davon. Vor dem Setzen eines Wachstumsfaktors die Wirkungsformel
  hinschreiben und abzaehlen, wie oft der Faktor darin vorkommt. Ein Test, der die
  unbeteiligten Groessen ausdruecklich als **konstant** festhaelt, ist billiger als die
  Messung, die den Rueckfall spaeter findet.

### 2026-08-23 — Vier Anlaeufe an der Menge, waehrend ein Einheitenfehler sie auf null zog
- **Fehler:** Thomas meldete zum FUENFTEN Mal zu wenige Gegner ("Gegnermenge darf mit
  Levels noch steigen"). Die vier Anlaeufe davor hatten Gruppengroesse, Deckel,
  Nachlaufpause und Spawn-Baender angefasst — alles in `balance.ts`, alles wirkungslos.
  Die Messung im Browser zeigte, dass die Menge mit dem Level nicht flach blieb, sondern
  auf NULL fiel: Level 1 4,95 Gegner/s, Level 6 0,03, Level 12 exakt 0,00 (0 von 3.577
  Spawn-Versuchen erfolgreich). Ursache war ein doppelter Perspektiv-Aufschlag:
  `computeHordeOffsets` entwirft die Horde auf bis zu 220 px Korridorbreite, und
  `spawnSquad` prüfte dieselbe Horde danach mit 220 × 1,519 = 334 px gegen genau diesen
  234 px breiten Korridor. `chooseSpawnLane` lieferte deshalb konstruktiv `maxLane = 0`
  und nie eine Spur. Verschärft durch eine zweite Stelle: Eine abgelehnte Horde blieb als
  `deferredSpawn` liegen und blockierte den gesamten Takt — gemessen über 55 Sekunden, in
  denen auch kein einziger Einzelgegner mehr kam.
- **Regel:** Wird dieselbe Beschwerde ein drittes Mal gemeldet, ist der eingestellte Wert
  nicht mehr die Frage. Dann wird nicht die nächste Stellschraube gesucht, sondern **eine
  Zahl gemessen, die den Wert gar nicht enthält**: erfolgreiche gegen versuchte
  Operationen. `spawned / (spawned + abgelehnt)` hätte den Fehler in Minuten gezeigt und
  war vier Anläufe lang nie erhoben worden — der `balance.ts`-Kommentar nannte die
  Ablehnungsquote sogar ausdrücklich als Grenze für den nächsten Anlauf, und trotzdem
  wurde erneut an der Menge gedreht statt sie zu messen. Eine Ablehnungsquote nahe 100 %
  ist nie Auslastung, sondern immer ein Konstruktionsfehler.
- **Zusatz (die eigentliche Falle):** Wo ein Wert einmal umgerechnet, gestaucht oder
  normiert wurde, darf dieselbe Umrechnung nicht ein zweites Mal auf ihn angewendet
  werden. Praktischer Test beim Schreiben: Für jeden Faktor in einer Bedingung benennen,
  **welche Größe er in welches Bezugssystem bringt** — und ob die Vergleichsgröße auf der
  anderen Seite schon in diesem System steht. Beide Seiten waren hier je für sich korrekt
  hergeleitet und ausführlich kommentiert; der Fehler lag ausschließlich in ihrer
  Kombination und ist deshalb durch Lesen einer einzelnen Stelle nicht zu finden.
- **Dritte Lehre:** Ein Wartemechanismus ohne Verfallszeit ist eine Sperre. `deferredSpawn`
  war als Höflichkeit gedacht ("die Horde kommt gleich"), wirkte aber als Totalblockade,
  weil nichts sie je aufgab. Jede Warteschlange braucht eine hergeleitete Obergrenze, nach
  der der Eintrag verworfen wird.

### 2026-08-23 — Faktor 18 zwischen zwei Waffen, weil die Vergleichszahl nie gebildet wurde
- **Fehler:** Thomas meldete "Minigun macht kaum Schaden". Die Messung ergab: Sie lag bei
  0,23x der Standardwaffe, die Schrotflinte bei 4,20x — **Faktor 18** zwischen der
  staerksten und der schwaechsten Waffe. Jede einzelne Waffe war fuer sich plausibel
  parametrisiert und ausfuehrlich kommentiert; die Minigun hatte einen hohen Takt, dafuer
  wenig Schaden, das liest sich beim Draufschauen richtig. Unsichtbar blieb, dass sie als
  einzige gar keinen Flaecheneffekt hat (kein Durchschlag, kein Splash, keine Kette) UND
  zusaetzlich nur mit 3 statt 8 Figuren feuerte — zwei Nachteile, die sich multiplizieren.
  Der Abstand stand seit Wochen im Code und war in einem frueheren Lesson-Eintrag sogar
  schon einmal beilaeufig erwaehnt worden, ohne dass jemand daraus eine Pruefung machte.
- **Regel:** Wo mehrere Varianten desselben Bauteils nebeneinander existieren (Waffen,
  Gegnertypen, Fahrzeuge, Tarife), gehoert **eine gemeinsame Vergleichszahl** in einen
  Test — nicht die Einzelwerte, sondern ihr Verhaeltnis zueinander und die Spanne zwischen
  Bestem und Schlechtestem. Solange diese Zahl nirgends gebildet wird, faellt kein
  Ausreisser auf, weil jede Variante einzeln betrachtet vernuenftig aussieht. Der Test
  prueft ein Band, keine Einzelwerte; sonst zementiert er den Zustand, statt ihn zu
  ueberwachen.
- **Zweite Lehre (Messaufbau):** Bei normaler Last sahen im Spiel ALLE Waffen gleich gut
  aus (0,95x bis 1,06x) — die Messung bildete den Gegner-Nachschub ab, nicht die
  Waffenstaerke, weil jede Waffe alles wegraeumte, was ankam. Erst unter **Ueberlast**
  (hohes Level, kleine Truppe) trennte sie die Waffen. Wer die Leistungsgrenze eines
  Bauteils messen will, muss es ueberfordern; im Normalbetrieb misst er die Zufuhr.
- **Dritte Lehre (Auftrag mit bekanntem Fehlermuster):** Thomas' Auftrag lautete
  woertlich, die Gegnerstaerke an Waffe und Truppengroesse zu koppeln — exakt die
  Konstruktion, die in diesem Projekt schon einmal gebaut und wieder ausgebaut wurde. Ein
  Satz genuegte, um das zu benennen ("im Projekt schon einmal schiefgegangen"), und
  Thomas entschied selbst um. Ein bekanntes Fehlermuster im Auftrag gehoert **vor** dem
  Bauen benannt, nicht danach im Abschlussbericht — aber als kurzer Hinweis mit Beleg,
  nicht als Verweigerung.

### 2026-08-23 — Die Vergleichszahl war richtig gebildet und trotzdem die falsche
- **Fehler:** Ueber Wochen wurde die Balance an einer Zahl gesteuert, die "Feuerkraft
  gegen Bedarf" vergleicht (Schaden je Sekunde gegen Nachschub mal Lebenspunkte). Sie war
  sauber hergeleitet, dokumentiert und wurde mehrfach nachgerechnet. Sie hat trotzdem in
  die Irre gefuehrt, weil sie eine **Bilanz** misst und nicht das, was der Spieler erlebt.
  Erst eine Messung der eigentlichen Zielgroesse — *wie viele Gegner erreichen die
  Truppe?* — zeigte, dass das Spiel bis Level 6 vollstaendig folgenlos war (0 % kommen an,
  0 Figurenverlust) und ab Level 8 komplett kippte (100 %). Beide Haelften waren mit der
  alten Zahl unauffaellig.
- **Regel:** Die Steuerungsgroesse muss die **Erlebnisgroesse** sein, nicht ihre
  Vorstufe. Bevor an einer Balance gedreht wird, einmal fragen: Welche Zahl wuerde der
  Nutzer nennen, wenn er das Problem beschreibt? Thomas sagte "es laeuft einfach durch" —
  die passende Messung ist der Anteil durchkommender Gegner, nicht ein Schadensverhaeltnis.
  Eine Bilanz taugt zum Rechnen einer Zielgroesse, nie als Abnahmekriterium.
- **Zweite Lehre (die Messung selbst war zweimal falsch):** Der erste Messaufbau uebernahm
  beim Zustandswechsel die Gegner des Vorlaufs — Level 1 zeigte dadurch 78 % Durchkommen
  statt 0 %. Der zweite mass ohne Einschwingzeit ein halb leeres Feld. Beide Fehler waren
  nur zu sehen, weil derselbe Fall **zweimal hintereinander** gemessen wurde und
  unterschiedliche Werte lieferte. Eine Messsonde ist erst brauchbar, wenn sie diese
  Wiederholprobe besteht; ein einzelner plausibler Wert beweist nichts.
- **Dritte Lehre (eigene Empfehlung widerlegt):** Die Empfehlung an Thomas lautete
  "zaehere Gegner verbreitern das Spielfenster". Die Messung zeigte: Zaehere Gegner
  verschieben den Kipppunkt, verbreitern ihn aber nicht — das System ist bistabil
  (mehr Durchkommer -> freie Spuren -> mehr Nachschub -> mehr Durchkommer). Wirksam war
  stattdessen die **raeumliche** Aenderung: Die Truppe war 130 px breit und deckte damit
  den ganzen 155 px breiten Anflugbereich ab, die Zielsuche zog den Rest vor sie. Wo eine
  Bilanz bistabil ist, hilft kein Nachjustieren der Bilanz, sondern nur ein Mechanismus,
  der am selben Ergebnis unabhaengig von ihr beteiligt ist.
- **Vierte Lehre (Regler gegen sich selbst):** `seekSpeedPxPerSec` war 2026-08-22 mit
  ausfuehrlicher Herleitung eingebaut worden, um Stehenbleiben zu bestrafen. Gemessen hat
  er es **belohnt**: Er zog jeden Gegner vor die mittig stehende Truppe (mittlerer
  Seitenabstand der Todesorte: 4 px). Die Herleitung war rechnerisch korrekt und die
  Wirkung genau umgekehrt, weil sie nur den Fall "Truppe steht aussen" betrachtete. Ein
  Regler, der ein Verhalten bestrafen soll, gehoert **in genau der Situation gemessen, die
  er bestrafen soll** — nicht in der, fuer die er gerechnet wurde.

### 2026-08-23 — Eine Formations-Eigenschaft bestimmte heimlich die Schwierigkeit
- **Fehler:** Thomas meldete "bis Level 4 alles ok, bei Level 5 keine Chance mehr". In
  `spawner.getSquadTypes` stand eine Zeile, nach der ein `wedge` **immer nur aus leichten
  Gegnern** besteht — unabhaengig von der Leveltabelle. Die Level 1-4 kennen
  ausschliesslich Keile, ab Level 5 kommen `cluster` und `row` dazu, und die werten die
  Gewichte aus. Da rund zwei Drittel aller Spawns Horden mit je zehn bis zwoelf
  Mitgliedern sind, galten die `enemyWeights` der unteren Level faktisch nur fuer
  Einzelgegner. Gemessen sprangen die mittleren Lebenspunkte je Gegner von 4,1 auf 18,0
  (Faktor 4,4 in einem Level), die Abschussrate fiel von 6,1 auf 0,7 je Sekunde. Level 6
  war danach wieder leichter, weil dort zwei Drittel der Horden wieder Keile sind.
- **Regel:** Ein Parameter, der eine **Form, Anordnung oder Darstellung** benennt
  (Formation, Layout, Variante, Skin), darf keine **Wirkung** mit sich tragen. Wo doch,
  gehoert es in den Namen — oder besser getrennt. Sonst aendert jemand die Form, um das
  Bild zu variieren, und verschiebt ungewollt die Balance. Der Nutzer sieht "Level 5 ist
  unmoeglich" und niemand sucht in einer Formationsfunktion.
- **Zweite Lehre (Ursache isolieren statt raten):** Zwischen Level 4 und 5 aendern sich
  drei Dinge gleichzeitig (Gegnermischung, Hordenform, Begleiterzahl). Statt zu vermuten,
  wurde die Leveltabelle **zur Laufzeit umgebogen** und jeder Unterschied einzeln
  zurueckgesetzt. Nur einer wirkte — mit den Keilen von Level 4 fielen die Lebenspunkte
  von 16,4 auf 4,5. Das kostete eine Messung statt einer Diskussion. Wo mehrere Groessen
  gleichzeitig springen, ist die Einzelabschaltung der schnellste Weg zur Ursache.
- **Dritte Lehre (Tests, die nur Werte abnicken):** Zwei bestehende Tests hielten die
  alten Gewichte als feste Zahlen fest (`[75, 25, 0]`, `[15, 35, 50]`). Sie haben den
  Fehler nicht gefunden — der lag im Code, nicht in der Tabelle — aber sie haetten die
  Korrektur blockiert. Ein Test auf exakte Konfigurationswerte sichert nichts, er
  zementiert. Was gesichert gehoert, ist die EIGENSCHAFT: dass die Haerte monoton steigt
  und kein Level mehr als die Haelfte drauflegt. Genau diese Zahl hatte niemand gebildet,
  deshalb blieb der Zickzack unbemerkt.

### 2026-08-25 — Zwei Waffen richteten im ganzen Spiel keinen Schaden an
- **Fehler:** PRELLSCHUSS (ab Level 18) und SAEGEBLATT (ab Level 25) toeteten nichts. Kein
  Gegner, keine Wand, kein Boss. Aufgefallen ist es erst, weil ein Bosskampf mit ihnen
  nach 150 Sekunden noch lief — im normalen Spiel sah man nur Geschosse fliegen und hielt
  die Waffen fuer schwach. Ursache: Durchschlagende Geschosse brauchen eine Trefferliste,
  damit dasselbe Geschoss denselben Gegner nicht mehrfach schaedigt. Die Liste wurde in
  `weapons.ts` an **zwei Stellen am Waffennamen** angelegt und geleert (`key === 'laser'`),
  weil der Laser einmal die einzige durchschlagende Waffe war. Die beiden neuen Waffen aus
  V4 haben `pierces: true`, bekamen die Liste aber nie — jeder ihrer Treffer lief in einen
  Fehler, noch bevor Schaden gerechnet wurde.
- **Regel:** Ein Sonderfall haengt an der **Eigenschaft**, nie am Namen. `if (key ===
  'laser')` ist immer ein Fehler in Wartestellung: Er ist zum Zeitpunkt des Schreibens
  richtig und wird beim naechsten Zuwachs still falsch. Wo eine Vorbereitung so billig ist
  wie ein leeres Set je Geschoss, gehoert sie fuer **alle** angelegt, nicht fuer die
  aktuell betroffenen.
- **Zweite Lehre (was 265 gruene Tests nicht sehen):** Keine einzige Pruefung deckte ab,
  dass eine Waffe ueberhaupt Schaden anrichtet. Getestet waren Konfigurationswerte,
  Pools, Reichweiten — alles, was ohne Phaser-Szene zu haben ist. Der Ausfall lag genau
  dort, wo die Tests aufhoeren. Eine Waffe, die niemand im Spiel ausprobiert hat, ist
  ungetestet, auch wenn ihre Zahlen gepruefte Zahlen sind.

### 2026-08-25 — Ein Modell, das nur dort stimmt, wo es kalibriert wurde
- **Fehler:** Der Trefferwirkungsgrad des Bosses (welcher Anteil der gerechneten
  Feuerkraft ihn wirklich trifft) wurde als Formel mit festem Verfall je Level gebaut und
  am Median von neun Waffen zwischen Level 9 und 20 kalibriert. Auf Level 9 und 20 sass er
  danach genau. Die erste Messung ausserhalb dieses Bereichs zeigte Level 1 mit 6 bis 12
  Sekunden statt 20 (Faktor 3 daneben) und Level 30 mit 15 statt 20. An beiden Enden gilt
  die Kurve nicht: Auf Level 1 schirmt nichts ab, alle Waffen treffen fast alles und
  liegen deshalb dicht beieinander; ab Level 20 saettigt der Abfall und geht gar nicht
  mehr weiter (Laser 0,370 -> 0,369 zwischen Level 20 und 30).
- **Regel:** Ein kalibriertes Modell **immer ausserhalb des kalibrierten Bereichs
  nachmessen**, bevor es eingebaut bleibt. Innerhalb passt es zwangslaeufig — das ist
  keine Bestaetigung, das ist die Kalibrierung, die sich selbst bescheinigt. Drei
  gemessene Stuetzstellen mit linearer Interpolation schlagen jede Kurve, die aus einem
  Ausschnitt hochgerechnet ist.
- **Zweite Lehre (Rueckkopplung erkennen):** Der Wirkungsgrad haengt an der Kampfdauer,
  und die Kampfdauer haengt am Wirkungsgrad — ein kurzer Kampf laesst dem Boss keine Zeit,
  Horden zu rufen, also trifft alles. Erste Messung Level 1 mit der Pistole: 6,5 s und
  Rate 0,88. Mit diesem Wert eingebaut: 61 s und Rate 0,375. Der direkte Wechsel auf den
  neuen Messwert kippt nur auf die andere Seite. Wo Messgroesse und Stellgroesse sich
  gegenseitig bedingen, den **geometrischen Mittelwert beider Runden** nehmen und die
  Zahl der Runden vorher festlegen — sonst hat das Verfahren kein Ende.
- **Dritte Lehre (Hypothesen mit Vorhersage pruefen):** Aus vier Messpunkten sah es so
  aus, als verloeren Waffen mit Einzelgeschoss beim Levelanstieg deutlich mehr als
  durchschlagende und sprengende. Die Gegenprobe wurde MIT VORHERSAGE gestartet
  (Schrotflinte, Minigun, Flammenwerfer bei 0,54-0,60 erwartet) und ergab 0,74 / 0,72 /
  0,84 — die Hypothese war widerlegt, die vermeintliche Gruppenstruktur bestand aus der
  Streuung von zwei Waffen. Ohne vorab notierte Vorhersage waere aus denselben Zahlen eine
  Bestaetigung geworden.

### 2026-08-25 — Nicht die Anzeige rundete, sondern der Wert selbst
- **Fehler:** Thomas meldete, man erreiche die hoechste Stufe im Level zu schnell. Die
  Ursache war zweiteilig, und der zweite Teil war seit Wochen falsch verstanden. Erstens
  gab ein Tor der rechten Wand einen FESTEN Betrag (+0,5 Schaden), waehrend der Deckel
  PROZENTUAL um 15,2 % je Level waechst — absolut sind das 0,23 Punkte bei Level 2, ein
  einziges Tor deckte den Levelsprung also vollstaendig ab, obwohl je Level 22 bis 46
  Tore erscheinen. Zweitens, und das war der eigentliche Fund: `clampStat` rundet Schaden
  und Rate **intern** auf eine Nachkommastelle. Die kleinste moegliche Aenderung betrug
  damit 0,05. Jeder Zugewinn darunter verschwand nicht nur aus der Anzeige, er kam nie
  an — der Wert stand nach dem Einsammeln exakt da wie vorher.
- **Regel:** Wenn ein Zugewinn "nicht sichtbar" ist, zuerst pruefen, ob er **existiert**.
  Die Vermutung "die Anzeige rundet zu grob" stand seit Juli in der Uebergabe und war
  falsch; sie hat den Ausbau des Run-Shops auf 22 Stufen scheitern lassen, ohne dass
  jemand die Stufung dahinter angesehen hat. Eine Rundung im Datenmodell ist keine
  Darstellungsfrage, sondern legt fest, welche Werte es ueberhaupt GIBT.
- **Zweite Lehre (was der Test pruefen muss):** Ein Test auf den Zuwachs-FAKTOR haette
  den Fehler nie gefunden — der Faktor war richtig. Gepruerft gehoert der Weg durch die
  Stufung: Wert setzen, Zuwachs anwenden, und der Wert muss danach groesser sein. Genau
  dieser Test steht jetzt in `walls.test.ts`.
- **Dritte Lehre (Messsonden muessen ueberleben):** Die erste Messreihe zur Torfrequenz
  ergab 2-3 Tore je Level, die zweite 22-46. Der Unterschied: In der ersten starb die
  Truppe nach wenigen Sekunden, danach spawnen keine Wandstuecke mehr. Gemessen wurde die
  Ueberlebenszeit. Jede Sonde, die das Spiel laufen laesst, muss die Truppe am Leben
  halten — sonst misst sie etwas anderes als gedacht, und zwar plausibel aussehend.

### 2026-08-25 — Nach der falschen Kennzahl gestaffelt
- **Fehler:** Thomas meldete "Flammenwerfer ist schlechter als Laser, obwohl er spaeter
  kommt". Die Reihenfolge, in der die dreizehn Waffen im Spiel erscheinen, war nach
  `getWeaponFirepower` festgelegt. Diese Groesse zaehlt Durchschlag, Sprengwirkung und
  Kettenspruenge **absichtlich nicht** mit - sie ist fuer den Bosskampf gedacht, und dort
  gibt es nur ein Ziel. Im Normalspiel fliegen die Gegner in Reihen an, und genau diese
  Eigenschaften entscheiden. Nach der Kennzahl lagen alle Waffen im engen Band 1,15 bis
  1,27; im Spiel gemessen liegen zwischen der schwaechsten und der staerksten Faktor acht.
  Der Laser ist die viertstaerkste Waffe und kam als dritte.
- **Regel:** Eine Kennzahl gilt nur fuer den Zweck, fuer den sie gebaut wurde. Wer sie
  fuer eine andere Entscheidung heranzieht, muss zuerst pruefen, was sie WEGLAESST - hier
  stand die Einschraenkung sogar als Kommentar an der Funktion ("Splash and chaining
  intentionally do not count: a boss is one target") und wurde trotzdem uebersehen.
- **Zweite Lehre:** Zwei Tests standen auf Waffennamen statt auf Eigenschaften ("die
  Schockwelle ist die teuerste Waffe"). Beim Umsortieren schlugen sie an, obwohl die
  gepruefte Eigenschaft weiter galt - die teuerste Waffe war nur eine andere geworden.

### 2026-08-25 — Layout an beiden Safe-Area-Raendern zugleich
- **Fehler:** Die Startwaffen-Kacheln in der Levelpause standen auf einem festen Y-Wert,
  zu dem `insets.top` addiert wurde. Der Knopf "SPEICHERN & BEENDEN" darunter haengt an
  `insets.bottom`. Am Schreibtisch (beide Insets 0) lagen 178 px dazwischen und alles sah
  richtig aus; auf dem iPhone (oben 59, unten 34) sind es 85 px, und die zweite
  Kachelreihe lag komplett unter dem Knopf - unsichtbar und nicht antippbar. Aufgefallen
  ist es nur, weil beim Bau einer neuen Kachelreihe nachgerechnet wurde, nicht beim
  Ansehen im Browser.
- **Regel:** Zwei Elemente, die an VERSCHIEDENEN Safe-Area-Raendern haengen, laufen bei
  wachsenden Raendern aufeinander zu. Wer eins davon fest setzt, hat den Abstand nur fuer
  sein eigenes Geraet richtig. Der freie Raum dazwischen muss gerechnet werden
  (`shopWeaponRow.ts`), und der Test muss die echten Geraetewerte mitpruefen - ein Test
  mit Insets 0 haette hier bestanden.
- **Zweite Lehre:** Eine Auswahl, die ihre Liste aus dem AKTUELLEN Zustand neu baut, ist
  eine Einbahnstrasse. Die getragene Waffe stand in der Liste, weil sie getragen wurde -
  wer wechselte, verlor damit den Weg zurueck. Was zu Beginn einer Auswahl galt, muss bis
  zu ihrem Ende gelten (`behalten`-Argument in `getStartWeaponChoices`).

### 2026-08-25 — Dieselbe Kennzahl, eine Ebene tiefer: Reichweite schlägt Feuerkraft
- **Fehler:** Thomas meldete, ab Level 8-10 kämen Flammenwerfer und Kettenblitz „nicht
  mehr nach, obwohl das eigentlich die stärkeren Waffen sind". Gemessen (Level 12, Truppe
  12, Schaden 2, Rate 4, je 25 s, Anteil durchkommender Gegner): Flamme 18,7 %, Blitz
  9,5 % — gegen Sturmgewehr 9,9 %, Minigun 0,9 %, Rakete 0,5 %. Die Flamme ließ also fast
  doppelt so viele durch wie eine Waffe drei Plätze unter ihr. Die Kills je Sekunde lagen
  dabei dicht beieinander (7,64 gegen 8,96 und 8,56): **Nicht die Feuerkraft fehlte,
  sondern die Strecke, auf der gefeuert werden darf.** Je schneller die Gegner mit dem
  Level werden, desto weniger Zeit bleibt auf der kurzen Strecke.
- **Regel:** `killsPerSec` — die Größe, auf der Waffenstaffelung UND Preise stehen —
  misst die Reichweite nicht mit. Zwei Waffen mit praktisch gleichem `killsPerSec` können
  sich im Spiel um Faktor 20 im Durchkommensanteil unterscheiden. Wer eine Waffe nach
  dieser Kennzahl einsortiert, muss `engageShare` daneben legen. Das ist derselbe Fehler
  wie am Vortag (Staffelung nach `getWeaponFirepower`), nur eine Ebene tiefer — die
  Kennzahl war diesmal die richtige für die Feuerkraft und trotzdem die falsche für die
  Frage „kommt die Waffe nach?".
- **Zweite Lehre (welcher Hebel):** Der Rückstand wäre über Schaden nur mit Faktor 1,65
  aufzuholen gewesen — und im Bossduell ist die Reichweitengrenze ausgesetzt. Über
  Schaden korrigiert hätte die Waffe dort zwei Drittel mehr geleistet, wo sie gar kein
  Problem hat. Die Korrektur gehört an die Größe, die den Fehler verursacht.

### 2026-08-25 — Die Sonde maß eine Szene, die gar nicht mehr lief
- **Fehler:** Die erste Waffenmessung im Browser lieferte Unsinn und beim Waffenwechsel
  einen Absturz (`disableBody` auf einem Projektil ohne Body). Die naheliegende Deutung
  war ein schwerer Spielfehler: „Jeder Waffenwechsel stürzt ab" — Waffenwechsel ist
  Kernmechanik. Tatsächlich war die Truppe (Startgröße 1, keine Steuerung) längst
  gestorben, die GameScene gestoppt, und Phaser hatte beim Shutdown alle Physik-Körper
  abgeräumt. Die Sonde maß ein totes Objekt und lieferte ein Ergebnis, das wie ein
  Befund am lebenden aussah.
- **Regel:** Jede Sonde prüft ZUERST, ob ihr Messobjekt lebt (`scene.isActive()`, ein
  Zähler, der weiterläuft), und stellt die Lebensbedingungen her, BEVOR sie misst — hier:
  die Truppe am Leben halten, ab dem `create`-Ereignis, nicht erst beim ersten
  Messaufruf. Ein Fehler aus einer toten Szene ist kein Befund über das Spiel.
- **Zweite Lehre (Messdrift):** Über eine Browser-Sitzung driften die Werte deutlich —
  dieselbe unveränderte Kontrollwaffe lag bei 9,9 %, später bei 23,1 %, 38,2 % und
  31,7 %. Vergleiche gelten deshalb nur zwischen BENACHBARTEN Messungen derselben Reihe,
  und eine unveränderte Kontrollwaffe gehört in jede Reihe. Wer Werte aus zwei Reihen
  gegeneinander stellt, vergleicht den Drift.
- **Dritte Lehre (Hot Reload):** Eine Codeänderung während einer laufenden Messung lädt
  die Seite über den Vite-Dev-Server neu und löscht die Messreihe **still** — sie war
  nach drei von sechs Werten weg, ohne Fehlermeldung. Während einer Browser-Messung wird
  keine Quelldatei angefasst.
