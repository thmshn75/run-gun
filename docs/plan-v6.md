# Plan V6 — "Run Gun V2": das Video-Spiel eigenständig nachbauen

**Status: VERBINDLICH für alles, was unter `src/v2/` und `RunGunV2Scene` entsteht.**
`docs/plan-v5.md` (Torlauf) ist damit Archiv — der Torlauf bleibt als Modus im Spiel,
wird aber nicht weitergebaut.

## Warum es diesen Plan gibt

Der Torlauf ist gescheitert, und zwar nicht an einzelnen Fehlern, sondern am Ansatz:
Die Video-Mechanik wurde in die bestehende Run-Maschinerie hineingebaut — Spawner,
Spurvergabe, Levelphasen, Waffen-Collider. Jede dieser Mechaniken ist für etwas
anderes gedacht. Deshalb brach bei jeder Korrektur an einer Stelle etwas an der
nächsten, über rund zwanzig Runden (Thomas 2026-09-20: "ich sehe wir kommen nicht
wirklich voran ... du verstehst es offensichtlich nicht einfach das Spiel nachzubauen,
das auf dem Video ist").

**V2 erbt nichts als die Bilder.** Keine gemeinsamen Systeme, keine gemeinsamen
Balance-Zweige, keine Wiederverwendung "weil es schon da ist".

## Unverhandelbare Randbedingungen

1. **Nichts Bestehendes wird verändert.** Nicht der Run, nicht der Probelauf, nicht
   der Torlauf, nicht das Testgelände, **nicht der Shop und nicht das bereits
   Erworbene** (Thomas 2026-09-20). Einzige erlaubte Änderung außerhalb von `src/v2/`:
   ein zusätzlicher Menüknopf.
2. **Geerbt werden ausschließlich Bilddateien**: die Zombie-Texturen
   (`enemy-standard`, `enemy-heavy`, `enemy-boss`, `enemy-boss-elite`) und die eigene
   Figur (`player`). Keine Logik, keine Konfiguration, keine Hilfsfunktionen aus
   `src/systems/`.
3. **Eigene Konfiguration** in `src/v2/balanceV2.ts`. `src/config/balance.ts` wird
   nicht angefasst.
4. **Kein Speicherzugriff.** V2 liest und schreibt weder Konto noch Fortschritt noch
   Upgrades. Es ist ein reiner Probelauf.
5. Jeder Schritt endet mit einem eigenen Commit und läuft nachweislich im Browser.
6. **Jeder Browser-Nachweis ab S2 enthält einen ZWEITEN Start in derselben Sitzung**
   (Menü → Run Gun V2 → Menü → Run Gun V2). Phaser-Szenen sind Singletons; Felder wie
   Gruppen, Timer und Collider überleben den ersten Lauf. Genau dieser Fehler ist im
   Torlauf aufgetreten (null Treffer im zweiten Lauf bei grüner erster Messung,
   `docs/lessons.md` 2026-09-19). Ein einzelner Lauf ist kein Nachweis.
7. **iPhone-Eigenheiten werden nicht neu erfunden.** Safe-Area-Ränder, Touch-Flächen
   und Seitenverhältnis sind im Projekt teuer erkauft (`docs/lessons.md` 2026-08-25).
   Diese Werte werden aus dem bestehenden Code **abgelesen und als Zahlen nach
   `balanceV2.ts` kopiert** — nicht importiert. Die Isolationsregel bleibt damit
   gewahrt, ohne dass die Fallen ein zweites Mal ins Netz gehen.

## Die Mechanik aus dem Video, Bild für Bild belegt

Quelle: `/Users/mcbooktehn/Downloads/111.mov`, 27 s, Einzelbilder ausgewertet.

### Aufbau der Bahn
- Gerade Bahn im Hochformat, seitlich Mauern. **Keine Perspektivkurve nötig** — die
  Bahn ist ein schräg gesehener Streifen konstanter Breite.
- **Links** eine durchgehende Reihe blauer **+1**-Schilder am Bahnrand, dicht
  gestaffelt, waagrecht stehend.
- **Rechts** eine Reihe gelber **+99**-Schilder, ebenso gestaffelt.
- **Rechts** zusätzlich eine graue **×8888-Säule** mit eigenem Zähler (858 → 819
  gemessen), die umkippt, wenn der Zähler null erreicht.
- **Quer über die Bahn** ein festes **×88**-Feld, unmittelbar vor der eigenen Front.

### Die eigene Seite
- Unten eine kleine **blaue Truppe** (im Video ~10 Figuren), seitlich steuerbar.
- Sie schickt **laufend Figuren nach oben** — je mehr Einheiten, desto mehr Figuren.
- Die ausgesandten Figuren **sammeln sich an der Front zu einer blauen Fläche**, die
  gegen die rote drückt. Sie laufen nicht hindurch und verschwinden nicht einzeln.

### Die gegnerische Seite — der Kern, den der Torlauf verfehlt hat
- Die rote Masse ist ein **stehender Teppich** aus dicht gepackten Figuren, der vom
  Boss bis zur Front reicht. **Sie läuft nicht heran.**
- Sie trägt **einen Gesamtzähler** (858 → 792 → 695 → 600 → 505 → 408 → 402 → 310 →
  229 → 147 → 63 über den Videoverlauf).
- **Die Front wandert nach oben**, während der Zähler sinkt: Die blaue Fläche wächst,
  die rote schrumpft. Der Teppich selbst bewegt sich dabei nicht.
- Ganz oben steht der **Boss** mit eigenem Zähler (4000, später 2005). Erreicht die
  Front ihn, **schlägt er mit dem Schwert zu und vernichtet die blaue Fläche** — im
  Video endet der Lauf genau so.

### Was das für die Umsetzung heißt — der Satz, auf dem alles steht

**Im Video kämpfen keine Figuren gegeneinander. Zwei Flächen treffen sich, und ihre
Grenzlinie verschiebt sich.** Die rote Fläche hat einen Vorrat (858 → 63), die blaue
wächst mit jeder Figur, die von unten nachkommt. Wer mehr nachliefert, schiebt die
Grenze nach oben. Die einzelnen Figuren sind **Darstellung des Flächeninhalts**, keine
handelnden Einheiten.

### Warum das nicht dasselbe ist wie der gescheiterte Torlauf

Der Torlauf hatte am Ende ebenfalls einen "stehenden Teppich" (Commit `0f59a3e`,
davor `7ee8d37`, `091cc9c`, `194554c`) — und traf das Video trotzdem nicht. Der
Unterschied liegt nicht im Stehen der Masse, sondern in der Ebene der Mechanik:

| | Torlauf (gescheitert) | V2 (dieser Plan) |
|---|---|---|
| Gegner | viele Einzelobjekte mit eigenen Lebenspunkten | **eine Fläche mit einem Vorrat** |
| Eigene Figur | sucht sich ein Ziel, bindet sich, kämpft einzeln | **erhöht den eigenen Flächeninhalt** |
| Front | Summe vieler Einzelkämpfe, unscharf | **eine Linie, aus der Bilanz berechnet** |
| Fehlerquellen | Zielbindung, Collider, Spurvergabe, Rundung | eine Rechnung je Bild |

Genau die Einzelkampf-Ebene hat die zwanzig Korrekturrunden erzeugt: Zielbindung, die
sich zurücksetzt; Collider, die stillschweigend wegfallen; Figuren, die geschoben
werden. **In V2 gibt es diese Ebene nicht.** Es gibt eine Grenzlinie und zwei Zahlen.

**Vor S4 vorzulegen:** Trifft dieser eine Satz zu ("zwei Flächen, eine Grenzlinie,
keine Einzelkämpfe"), wird gebaut. Trifft er nicht zu, ist der ganze Plan falsch und
nicht nur ein Schritt davon — dann zurück zu Thomas, bevor weitergebaut wird.

## Zweites Video (112.mov, 13 s) — bestätigt und ergänzt

Thomas hat am 2026-09-20 ein zweites Video nachgereicht. Es zeigt dieselbe Mechanik,
liefert aber Details für S5 bis S8:

- **Der Aufbau ist bestätigt:** geschlossene rote Masse oben, blaue Fläche darunter,
  Grenze dazwischen, eigene Truppe unten. Der Gegnerzähler sinkt stetig
  (478 → 429 → 379 → 331 → 281 → 266 → 228 → 201 → 173 → 146 → 118 → 91).
- **Beide Ränder sind durchgehend:** links die blaue +1-Reihe, rechts eine gelbe
  +99-Reihe, beide ohne Lücke über die ganze Strecke.
- **Das Tor** (hier ×99) steht fest quer über die Bahn, unmittelbar vor der eigenen
  Truppe — nicht in der Bahnmitte, sondern am unteren Ende.
- **Der Boss** sitzt am oberen Ende der roten Masse, ist groß und deutlich animiert
  (wechselnde Posen und Waffen). Er wird im Verlauf sichtbar größer: Masse und Boss
  rücken langsam nach unten, während die Masse schrumpft.
- **Die Front hat sichtbare Kampfeffekte**: weiße Partikelwolken genau an der
  Grenzlinie, dauerhaft, solange gekämpft wird. Das ist der optische Kern, der die
  Grenze lebendig macht — ohne ihn sieht die Grenze nach einer Trennlinie aus.
- **Die eigene Truppe unten** besteht aus klar erkennbaren Einzelfiguren in lockeren
  Reihen, nicht aus einer Fläche. Nur die vorgeschobene Masse ab der Grenze ist Fläche.
- **Am Ende** wird die blaue Fläche aufgerieben, übrig bleiben die Truppe unten und
  die rote Masse mit dem Boss — so endet der Lauf, wenn man verliert.

## Schrittfolge (jeder Schritt = ein Commit, jeder Schritt im Browser belegt)

**S1 — Gerüst und Knopf.** Menüknopf "RUN GUN V2" neben "TORLAUF"; neue Szene
`RunGunV2Scene` unter `src/v2/`; leere Bahn mit Mauern, Zurück-ins-Menü. Nachweis: Der
Knopf startet die Szene, alle anderen Knöpfe verhalten sich unverändert.

**S2 — Eigene Truppe.** Blaue Figurengruppe unten, seitlich per Finger steuerbar,
Zähler über der Gruppe. Nachweis: Zahl und Gruppe stimmen überein, Steuerung erreicht
beide Bahnränder.

**S3 — Der Strom.** Figuren lösen sich laufend aus der Truppe und laufen nach oben.
Rate hängt an der Truppengröße. Nachweis: gemessene Figuren je Sekunde gegen die
Formel.

**S4 — Die beiden Flächen und ihre Grenze. DER KRITISCHE SCHRITT.** Rote Fläche mit
Vorrat, blaue Fläche, die mit dem Zustrom wächst, Grenzlinie aus der Bilanz. Die
Figuren stellen den Flächeninhalt dar und handeln nicht selbst — **kein Ziel, keine
Bindung, kein Einzelkampf**. Damit fällt die Falle aus `docs/lessons.md` 2026-09-20
("Eine Bindung darf nicht bei jeder Berührung neu gesetzt werden") strukturell weg:
Es gibt keine Bindung, die sich zurücksetzen könnte.

Nachweise, alle drei nötig:
- Vorrat sinkt und Grenzlinie steigt, gemessen über die Zeit.
- **Bildvergleich:** Ein Bildschirmfoto von V2 neben dem Referenzausschnitt aus
  `111.mov`. Erst wenn Thomas diesen Vergleich freigibt, beginnt S5. Eine grüne
  Messung allein ist ausdrücklich kein Nachweis (`docs/lessons.md` 2026-09-04,
  "grüne Tests, falsches Bild").
- Zweiter Start in derselben Sitzung, Verhalten identisch.

**S5 — Ränder.** +1-Reihe links und +99-Reihe rechts, einsammeln durch Hinfahren.
Nachweis: Truppengröße steigt beim Entlangfahren, nicht in der Mitte.

**S6 — Tor.** Festes ×N-Feld quer über die Bahn mit Freischaltzähler wie die Säule im
Video. Nachweis: Zähler sinkt sichtbar, danach vervielfacht es messbar.

**S7 — Boss und Ende.** Boss oben mit eigenem Zähler; erreicht die Front ihn, beginnt
der Schlagabtausch. Sieg bei Boss auf null, Niederlage bei eigener Fläche auf null.
Nachweis: beide Ausgänge je einmal gemessen.

**S8 — Politur.** Bewegung, Trefferfeedback, Zahlen, Balance. Erst hier.

## Reißleine

Läuft S4 nach **einem** Anlauf nicht so, dass der Bildvergleich überzeugt, wird nicht
nachgebessert, sondern **zurück zu Thomas** — mit dem Bildvergleich als Beleg. Denn
dann ist nicht die Umsetzung schuld, sondern die Deutung der Video-Mechanik, und
weitere Anläufe auf falscher Grundlage sind genau das, was den Torlauf zwanzig Runden
gekostet hat. Für alle anderen Schritte gilt: höchstens zwei Anläufe, dann zurück.
