# Lessons: Run & Gun

Jede Nutzerkorrektur wird hier als Regel eingetragen. Zu Sitzungsbeginn lesen.

## Format
- **Fehler:** Was lief falsch?
- **Regel:** Was verhindert denselben Fehler künftig?

---

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
