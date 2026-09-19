# Active Task

## Status
`IMPL_DONE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Abwechslung in den Bewegungen — Streuung je Figur statt einer Rechnung fuer alle.**

Ausloeser: Thomas am 2026-09-19, nach der Abnahme des Fluessigkeits-Tasks: "ist ok,
aber so richtig wie gekaufte App ist es nicht, immer die gleichen bewegungen, keine
abwechslung und immer noch mechanisch."

**Der Befund dahinter.** Im ganzen Spiel gibt es **keine einzige Zufallsstreuung in der
Bewegung**. Zufall entscheidet nur, *welche* Gestalt kommt (`spawner.ts`, alle
`RND.frac()`-Aufrufe sind Auswahl, nicht Bewegung). Der Versatz im Laufzyklus haengt am
**Poolplatz** statt an der Figur (`getPhaseOffset(poolIndex)`, `gamefeel.ts:63`), ist
also ueber die ganze Laufzeit dieselbe kurze Folge. Ausschlag und Frequenz sind global
konstant. Das Ergebnis liest das Auge als Maschine: dieselbe Bewegung, nur zeitversetzt,
endlos.

### Was dieser Task erreichen kann — und was nicht

**Wichtige Einschraenkung, die den Zuschnitt bestimmt:** Gegner laufen fast nie ueber
die gerechnete Bewegung. `BALANCE.enemy.bilder.aktiv` steht auf `true`, und fuer **alle
dreizehn Gestalten** liegen vollstaendige Bildsaetze vor — `spawner.ts` schaltet Hub,
Wiegen und Federn fuer sie ausdruecklich ab (`istBildsatz ? 0 : getBobOffsetPx(...)`).
Ihre Beinarbeit steckt in den Bildern, nicht in einer Formel.

Daraus folgt:

- **Die Truppe** laeuft gerechnet (`player`-Textur, `crowd.ts:219-231`). Dort wirken
  Streuung und Ueberlagerung voll. Sie steht dauerhaft im Vordergrund, der Spieler sieht
  sie die ganze Zeit — das ist kein Nebenschauplatz.
- **Die Gegner** koennen rechnerisch nur ueber den **Bildtakt** gestreut werden, und der
  haengt an einem engen Korridor (siehe C). Die Wirkung ist dort begrenzt.
- **Der grosse Hebel bei Gegnern waeren zusaetzliche Bilder** (gelegentliches Stolpern,
  Umsehen, zweiter Laufzyklus je Gestalt). Das ist **nicht Teil dieses Tasks**, sondern
  der naechste Schritt, falls Thomas nach diesem hier weiter Abwechslung vermisst.
  Bilder erzeugt Codex mit seinem Bildwerkzeug; der Aufwand liegt in der Zahl der
  Gestalten, nicht in der Technik.

---

## 0 — Zuerst messen: der Sprungwert des Bosses

**Warum das vor allem anderen kommt.** Im Fluessigkeits-Task ist
`BALANCE.boss.bilder.zyklenProSekunde` von 0,8 auf 1,0 gesetzt worden, begruendet mit
der Faustregel "unter zwoelf Bildwechseln je Sekunde ruckelt es". **Diese Faustregel ist
in diesem Projekt ausdruecklich verworfen.** Der Kommentar bei
`BALANCE.enemy.bilder.gangarten` haelt fest, was stattdessen gilt:

> "Massgeblich ist die Aenderung je Sekunde, nicht die Standzeit."
> Aenderung je Sekunde = Silhouettensprung je Bild x Bilder je Sekunde, Korridor
> **110-190 %** ("darueber wirkt es hektisch, darunter schleppend").

Alle zehn Gegner-Gangarten sind in **drei Anlaeufen** auf rund 120 %/s gebracht worden,
nachdem Thomas dreimal "zu schnell" gemeldet hatte. `tests/gangarten.test.ts:63-75`
sichert das mit gemessenen Sprungwerten ab — **aber nur fuer die Gangarten. Der Boss
fehlt dort, und fuer seine Bildsaetze existiert kein gemessener Sprungwert.** Die
Erhoehung auf 1,0 hat seine Aenderung je Sekunde um 25 % angehoben, ohne dass jemand
weiss, wo er im Korridor liegt.

**Zu tun:**

1. Den Silhouettensprung je Bild fuer beide Boss-Bildsaetze (`basic`, `elite`) messen.
   Das Verfahren liegt vor: `scripts/bildabnahme/` (`abnahme-leicht.py`,
   `abnahme-schwer.py`, dazu die README). Dasselbe Verfahren hat die Sprungwerte der
   Gangarten geliefert — **kein neues erfinden**, sonst sind die Zahlen nicht
   vergleichbar.
2. Aenderung je Sekunde ausrechnen: Sprung x 12 Bilder x `zyklenProSekunde`.
3. **Liegt der Wert bei 1,0 ueber 190 %**, ist `zyklenProSekunde` auf den hoechsten Wert
   zu senken, der im Korridor bleibt — der Boss wirkt sonst hektisch, und genau das hat
   Thomas an den Gegnern dreimal zurueckgewiesen. Liegt er darin, bleibt 1,0 stehen.
4. Den Korridor-Test auf den Boss ausweiten, mit den gemessenen Sprungwerten, nach dem
   Muster von `tests/gangarten.test.ts`.
5. **Die Zusicherung `expect(zyklenProSekunde).toBe(1)` in `tests/weltThema.test.ts:218`
   ist zu ersetzen.** Sie zementiert genau die Zahl, die hier zur Disposition steht.
   An ihre Stelle gehoert die Korridor-Pruefung aus Punkt 4.

**Der gemessene Wert und die Rechnung gehoeren als Kommentar an `boss.bilder`**, damit
der naechste Anlauf nicht wieder raet.

---

## A — Jede Figur der Truppe bewegt sich ein wenig anders

**Heute:** `crowd.ts:219-231` holt Hub, Wiegen und Federn mit
`getPhaseOffset(index)` — dem **Listenplatz** der Figur — und mit global konstanten
Amplituden (`BALANCE.gamefeel.bobAmplitudePx`, `stepSwayMaxDeg`, `stepSquashShare`).
Jede Figur macht damit dieselbe Bewegung in derselben Groesse.

**Neu:** Jede Figur bekommt **einmalig beim Anlegen** ihre eigenen leichten
Abweichungen und behaelt sie:

- ein eigener Phasenversatz (echter Zufall statt Listenplatz),
- ein eigener Amplitudenfaktor fuer Hub, Wiegen und Federn,
- ein eigener Faktor auf die Schrittfrequenz.

**Spanne:** je **±12 %** um den heutigen Wert, als ein Wert in `balance.ts` mit
Rechenweg. Begruendung fuer die Groessenordnung: Darunter sieht man es nicht, darueber
faellt einzelnen Figuren die Zugehoerigkeit zur Truppe ab — sie sollen wie eine Gruppe
wirken, nicht wie Einzelgaenger. Der **Mittelwert ueber die Truppe bleibt 1,0**, damit
sich das Gesamtbild nicht verschiebt; ein Test haelt das fest.

**Gezogen wird einmal je Figur, nicht je Bild.** Ein je Bild neu gewuerfelter Wert waere
Zittern, keine Individualitaet.

**Was unberuehrt bleibt:** Die Kollisionshuelle der Truppe ist bewusst ruhig gehalten
(Kommentar in `spawner.ts` verweist darauf). Diese Streuung ist reine Optik und darf
die Huelle, die Feuerpositionen (`getNextSalvoPositions`) und die Formation
(`rowSpacingY`, `colSpacing`, `maxWidthRatio`) **nicht** beruehren.

---

## B — Die Bewegung aus zwei Schwingungen statt einer

**Heute:** Hub, Wiegen und Federn sitzen **auf derselben Phase**. Der Kommentar in
`gamefeel.ts:21-23` nennt den Grund — sie sollen zusammengehoeren statt gegeneinander zu
laufen — und das bleibt richtig. Die Folge ist aber, dass **ein einziger Sinus** die
ganze Figur steuert, und ein einziger Sinus wiederholt sich exakt.

**Neu:** Dem Hub wird eine **zweite, langsamere Schwingung** ueberlagert, deren Frequenz
in keinem glatten Verhaeltnis zur ersten steht (etwa das 0,37-fache). Dadurch faellt der
Gesamtzyklus nie wieder exakt auf sich selbst zusammen: Die Figur wippt weiter im
Schritttakt, aber mal etwas hoeher, mal etwas flacher.

**Staerke:** hoechstens **ein Viertel** der Hauptamplitude. Darueber wird aus der
Variation ein eigener Rhythmus, und der Schritt verliert seine Lesbarkeit.

**Nur auf den Hub, nicht auf Wiegen und Federn.** Sonst ist der Zusammenhang der drei
Bewegungen dahin, den der Kommentar ausdruecklich schuetzt.

**Gilt fuer die gerechnete Bewegung**, also Truppe und jene Gegner, denen ein Bildsatz
fehlt. Bildsatz-Gegner sind davon per Konstruktion nicht betroffen.

---

## C — Takt-Streuung bei den Bildsatz-Gegnern

**Heute:** Alle Gegner derselben Gestalt wechseln ihre Bilder in **exakt demselben
Takt** (`BALANCE.enemy.bilder.gangarten[gestalt].takt`). Nur die Phase ist versetzt.
Zwei Schleicher nebeneinander laufen im Gleichschritt, nur zeitverschoben.

**Neu:** Jeder Gegner zieht beim Auftauchen einen eigenen Taktfaktor.

**Die Spanne ist hier NICHT frei waehlbar, und das ist der Kern dieses Abschnitts.**
`tests/gangarten.test.ts:74-75` verlangt fuer jede Gangart eine Aenderung je Sekunde
zwischen **110 und 130 %**; die Gangarten liegen alle bei 118-121 %. Eine Streuung von
**±8 %** bleibt damit im Korridor, eine groessere nicht. **±8 % ist die Vorgabe**, und
der Test ist so zu erweitern, dass er die **Raender** der Streuung prueft, nicht nur den
Mittelwert — sonst faellt eine spaetere Vergroesserung der Spanne niemandem auf.

**Was ausdruecklich NICHT gestreut wird:**

- **Die Fortbewegung** (`speedFactor`, `gangartTempo`). Das ist Balance: Der
  Durchkommensanteil ist bistabil, Kipppunkt bei 10-12 % (`docs/UEBERGABE.md`).
- **Die Groesse der Figuren.** Sie bestimmt die Trefferflaeche.
- **Die Gangart selbst.** Sie gehoert zur Gestalt, weil die Bilder zu ihr gehoeren.

**Erwartungsmanagement:** ±8 % Takt sind sichtbar, aber sie machen aus dreizehn
Gestalten keine dreissig. Bleibt der Eindruck "immer dasselbe", ist der naechste Schritt
der teure: zusaetzliche Bilder.

---

## Akzeptanzkriterien

- **A1** Der Silhouettensprung beider Boss-Bildsaetze ist mit dem vorhandenen Verfahren
  gemessen, die Aenderung je Sekunde ausgerechnet und als Kommentar bei `boss.bilder`
  festgehalten.
- **A2** Liegt der Wert ueber 190 %, ist `zyklenProSekunde` entsprechend gesenkt; sonst
  bleibt 1,0. Die Entscheidung steht mit Zahl im Kommentar.
- **A3** Ein Test prueft die Aenderung je Sekunde des Bosses gegen den Korridor, nach
  dem Muster von `tests/gangarten.test.ts`. Die Zusicherung
  `expect(zyklenProSekunde).toBe(1)` in `tests/weltThema.test.ts` ist dadurch ersetzt.
- **A4** Jede Truppenfigur hat einen eigenen, ueber ihre Lebensdauer **stabilen**
  Satz aus Phasenversatz, Amplitudenfaktoren und Frequenzfaktor. Ein Test belegt die
  Stabilitaet ueber viele Bilder — ein je Bild neu gezogener Wert faellt durch.
- **A5** Der Mittelwert der Amplitudenfaktoren ueber die Truppe liegt bei 1,0
  (Toleranz nennen), damit sich das Gesamtbild nicht verschiebt. Ein Test belegt es.
- **A6** Die Streuung beruehrt weder Kollisionshuelle noch Feuerpositionen noch
  Formationsmasse. Ein Test belegt, dass die Huelle unveraendert bleibt.
- **A7** Der Hub traegt eine zweite Schwingung mit hoechstens einem Viertel der
  Hauptamplitude und einem Frequenzverhaeltnis, das keine gemeinsame Periode erzeugt.
  Ein Test belegt, dass zwei Zeitpunkte im Abstand eines Hauptzyklus **nicht** denselben
  Wert liefern.
- **A8** Wiegen und Federn bleiben auf der Hauptphase, ohne zweite Schwingung.
- **A9** Jeder Bildsatz-Gegner hat einen eigenen, stabilen Taktfaktor mit einer Spanne
  von ±8 %.
- **A10** Der Korridor-Test prueft die **Raender** der Taktstreuung: Auch die
  schnellste und die langsamste gestreute Figur jeder Gangart bleibt zwischen 110 und
  130 % Aenderung je Sekunde.
- **A11** Fortbewegungstempo, Figurengroesse und Gangart-Zuordnung sind **nicht**
  gestreut. `speedFactor`, `gangartTempo` und alle Balance-Werte sind unveraendert.
- **A12** Alle neuen Werte stehen in `balance.ts` mit Rechenweg als Kommentar.
- **A13** `npm run check` und `npm test` laufen durch.
- **A14 (Thomas)** Test am echten iPhone: Wirken Truppe und Gegner weniger gleichfoermig
  als vorher? **Ohne diesen Punkt gilt der Task nicht als erfuellt.**

## Was kein zulaessiger Ersatz ist

- **Nicht** je Bild neu wuerfeln statt einmal je Figur (das ist Zittern).
- **Nicht** die Streuung ueber den Listenplatz ableiten — genau das ist der heutige
  Zustand, der als gleichfoermig gemeldet wurde.
- **Nicht** Groesse oder Fortbewegungstempo streuen (Trefferflaeche und Balance).
- **Nicht** die Taktspanne ueber ±8 % hinaus vergroessern, um mehr Wirkung zu erzielen —
  der Korridor ist in drei Anlaeufen mit Thomas erarbeitet worden.
- **Nicht** neue Bilder erzeugen. Das ist bewusst der naechste, eigene Schritt.

---

---

## NACHARBEIT (2026-09-19, nach dem Review der ersten Umsetzung)

Zwei Dinge sind zurueckzudrehen. Beide sind **Fehler dieser Spec**, nicht der
Umsetzung — Codex hat getan, was hier stand.

### N1 — Der Boss-Korridor war falsch uebertragen. `zyklenProSekunde` geht auf 1,0 zurueck.

Die Messung aus Abschnitt 0 ist richtig und bleibt: **basic springt 29,172189 %,
elite 20,332005 %** je Bild. Falsch war die Schlussfolgerung in A2, den
Gegner-Korridor 110-190 %/s auf den Boss anzuwenden. **Thomas' eigene Urteile
widerlegen ihn fuer diese Figur:**

| `zyklenProSekunde` | Aenderung/s (basic) | Thomas' Urteil |
|---|---|---|
| 0,55 | **192,5 %/s** | 2026-09-04: **"abgehakt … fluessiger gestalten"** |
| 0,8 | 280,1 %/s | danach nie bemaengelt |
| 1,0 | 350,1 %/s | 2026-09-19: **"ist ok"** |
| **0,542** | **189,7 %/s** | **das ist der gebaute Stand** |

Der Korridor sagt, oberhalb von 190 %/s wirke es hektisch. Thomas hat bei 192,5 %/s
das **Gegenteil** gemeldet: zu stufig. Der gebaute Wert 0,542 liegt bei 189,7 %/s und
damit praktisch genau auf dem Zustand, den er vor zwei Wochen abgelehnt hat — **die
Umsetzung faellt hinter den Ausgangspunkt zurueck.**

**Warum der Korridor hier nicht traegt (Hypothese, ausdruecklich nicht belegt):** Er ist
an laufenden Kleinfiguren erarbeitet worden, bei denen zu schneller Bildwechsel als
Trippeln erscheint. Der Boss laeuft nicht, er baeumt sich auf der Stelle auf, und er ist
bildschirmfuellend — derselbe Prozentsatz Silhouette verteilt sich auf ein Vielfaches an
Pixeln. Das ist eine Vermutung; **belegt ist nur, dass Thomas' Urteil dem Korridor
widerspricht**, und sein Urteil zaehlt.

**Zu tun:** `zyklenProSekunde` zurueck auf **1,0**. Der Kommentar behaelt die gemessenen
Sprungwerte und die Rechnung, haelt aber zusaetzlich fest, dass der Gegner-Korridor auf
den Boss **nicht** angewendet wird, samt der Tabelle oben als Begruendung. Der Test aus
A3 prueft den Boss deshalb **nicht** gegen 110-190 %/s. Er haelt stattdessen fest, dass
die Sprungwerte gemessen und dokumentiert sind und dass `zyklenProSekunde` bei 1,0
steht — bricht also, wenn jemand ohne neues Urteil von Thomas daran dreht.

### N2 — Die abgenommenen Gangart-Takte bleiben unveraendert. Streuung auf ±6 %.

Die erste Umsetzung hat neun der zehn Takte verschoben (0,32 → 0,321, 0,26 → 0,265 …),
um Platz fuer ±8 % zu schaffen. Diese Werte sind in **drei Anlaeufen mit Thomas**
erarbeitet worden; sie standen hier nicht zur Disposition, und die Spanne an die Basis
anzupassen statt umgekehrt ist der falsche Weg herum.

**Nachgerechnet mit den Originalwerten und ±6 %** — alle zehn Gangarten bleiben im
Korridor 110-130 %/s:

```
Rennen      119,8 -> 112,6..127,0     Schlurfen   119,3 -> 112,2..126,5
Kriechen    117,9 -> 110,9..125,0     Schleichen  118,6 -> 111,5..125,7
Zucken      121,0 -> 113,7..128,2     Watscheln   120,7 -> 113,5..128,0
Humpeln     120,9 -> 113,6..128,2     Stampfen    119,0 -> 111,9..126,2
Marschieren 120,0 -> 112,8..127,2     Schreiten   119,3 -> 112,2..126,5
```

**Zu tun:** Alle zehn `takt`-Werte auf den Stand vor dieser Umsetzung zuruecksetzen,
`imageGaitTaktVariation` von 0,08 auf **0,06**. Die Randpruefung aus A10 bleibt und
rechnet mit 0,06.

### Was aus der ersten Umsetzung ausdruecklich BLEIBT

- Die Streuung der Truppe und die zweite Hubwelle (A und B) — unveraendert uebernehmen.
- Die Entkopplung des Schussursprungs von der Optik in `crowd.ts`
  (`getNextSalvoPositions` liefert jetzt die Ruheposition statt der gewippten). Das ist
  **richtig und gewollt**: Vorher wanderte der Schussursprung im Schritttakt mit. Der
  Kommentar dort bleibt.
- Die gemessenen Sprungwerte samt Verfahren.

## Stand des Reviews (2026-09-19)

**Code-Review bestanden, nach einer Runde Nacharbeit (N1/N2).** Boss steht wieder auf
1,0 mit dokumentierter Ausnahme vom Gegner-Korridor, die zehn Gangart-Takte sind im
Original, die Taktstreuung liegt bei ±6 %. Truppen-Profile und zweite Hubwelle
unveraendert uebernommen. `npm run check`, `npm test` (37 Dateien, 405 Tests) und
`npm run build` gruen, im Terminal selbst nachgelaufen.

**Angemerkt, nicht behoben:** Unter den neuen Tests stehen zwei wirkungslose
Zusicherungen — eine vergleicht `getStepSwayRadians` mit sich selbst, eine prueft in
einer 500er-Schleife dieselbe unveraenderte Objektidentitaet. Dasselbe Muster wie in
der Lesson vom 2026-09-19. Die tragenden Pruefungen daneben (Spanne, Mittelwert 1,0,
Nicht-Periodizitaet der zweiten Welle, Entkopplung des Schussursprungs) sind echte
Rechnungen. Beim naechsten Anfassen dieser Datei mitnehmen.

**Offen: A14 — Thomas' iPhone-Test.** Wirken Truppe und Gegner weniger gleichfoermig?
Bis dahin `IMPL_DONE`, nicht `APPROVED`.
