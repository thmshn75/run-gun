# Lessons: Run & Gun

Jede Nutzerkorrektur wird hier als Regel eingetragen. Zu Sitzungsbeginn lesen.

## Format
- **Fehler:** Was lief falsch?
- **Regel:** Was verhindert denselben Fehler künftig?

---

### 2026-08-19 — Nutzeränderung als Fehler diagnostiziert
- **Fehler:** Eine von Thomas manuell gekürzte Todo-Zeile wurde ungefragt als „Speicherfehler" bewertet.
- **Regel:** Änderungen an Dateien, die Thomas selbst editiert, als bewusste Entscheidung annehmen. Nur nachfragen, wenn die Änderung eine laufende Aufgabe konkret blockiert — keine Ferndiagnose.

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
