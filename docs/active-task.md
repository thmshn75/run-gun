# Active Task

## Status
`IMPL_DONE`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Fluessigere Bewegungen — drei Stellen, alle rein optisch.**

Ausloeser: Thomas am 2026-09-19, nach der Abnahme der Trefferquittung: "pruefe ob die
bewegungen noch etwas fluessiger gemacht werden koennen". Die Analyse hat sieben
Stellen gefunden; drei davon werden gebaut, vier bewusst nicht (siehe unten).

**Die harte Grenze, wie im Vorgaenger-Task:** Keine Balance-Zahl aendert sich, keine
Trefferflaeche bewegt sich, kein Timing des Bosskampfs verschiebt sich. Alles hier ist
Optik.

---

## A — Boss-Laufbilder ueber die Ruckelschwelle heben

**Heute:** `BALANCE.boss.bilder.zyklenProSekunde` steht auf **0,8**. Bei zwoelf
Einzelbildern je Zyklus sind das **9,6 Bildwechsel/s**, also 104 ms Standzeit je Bild.
Ab rund 12 Wechseln/s (83 ms) liest das Auge eine Bildfolge als Bewegung statt als
Folge von Standbildern. **Der Kommentar an der Stelle sagt das selbst**: "104 ms —
knapp an der Schwelle von rund 100 ms".

**Das ist bereits der zweite Anlauf.** Thomas hat dieselbe Figur am 2026-09-04 schon
einmal gemeldet ("abgehakt … fluessiger gestalten"); damals ging der Wert von 0,55 auf
0,8. Die Richtung stimmte, die Strecke war zu kurz.

**Neu: 1,0** — zwoelf Bildwechsel je Sekunde, 83 ms je Bild, genau auf der Schwelle.
Der Kommentar ist entsprechend nachzurechnen und zu aktualisieren (auch der Satz zur
Aufbaeum-Dauer: bei 1,0 sind es 1,0 s statt 1,25 s).

**Belegte Unbedenklichkeit:** `zyklenProSekunde` wird ausschliesslich in `boss.ts:216`
fuer die Bildauswahl gelesen. Das Kampf-Timing haengt an anderen Groessen
(`fightElapsedMs`, `pressureDelayMs`, `advanceSpeed` in `advanceTowardsCrowd`) und
bleibt unberuehrt.

**Reissleine:** Wirkt der Boss dadurch hektisch statt schwerfaellig — Thomas' Urteil am
iPhone entscheidet, nicht die Rechnung —, dann **zurueck auf 0,9** (10,8 Wechsel/s) und
die restliche Strecke ueber **mehr Einzelbilder** statt schnelleren Takt gehen. Das
waere ein eigener Task (Codex erzeugt die Bilder mit seinem Bildwerkzeug), kein
Nachbessern in diesem hier.

---

## B — Rueckstoss mit Ausklingkurve statt gleichmaessigem Abbau

**Heute:** `decayRueckstoss()` in `src/systems/rueckstoss.ts` baut den Sichtversatz
**streng gleichmaessig** ab: gleicher Betrag je Millisekunde, bis null erreicht ist.
Das liest sich wie ein Schieberegler, nicht wie ein Stoss. Ein Treffer schlaegt schnell
aus und laeuft dann weich aus — die Geschwindigkeit des Ruecklaufs muss also
**abnehmen**, nicht konstant sein.

**Der passende Baustein liegt im Projekt:** `approachAngle()` in
`src/systems/gamefeel.ts:78` glaettet die Neigung der Truppe beim Lenken. Sie arbeitet
mit einer **Halbwertszeit** und ist damit ausdruecklich bildratenunabhaengig — bei
120 Hz auf einem neueren iPhone laeuft sie genauso ab wie bei 60 Hz. Diese Eigenschaft
ist der Grund, sie zu nehmen, und sie darf nicht verlorengehen.

**Umbau:** `decayRueckstoss` naehert den Versatz mit derselben Technik an null an,
statt linear abzuziehen. Die Halbwertszeit kommt als neuer Wert nach `balance.ts`, mit
Rechenweg: Sie ist so zu waehlen, dass der Versatz nach den bisherigen **120 ms**
praktisch verschwunden ist (nach vier Halbwertszeiten sind noch rund 6 % uebrig — eine
Halbwertszeit von **30 ms** trifft das). `rueckstossMs` wird dadurch ueberfluessig und
ist zu entfernen, **nicht** als toter Wert stehenzulassen.

**Was dabei nicht kaputtgehen darf:** Die Buchfuehrungs-Regel aus dem Vorgaenger-Task
gilt unveraendert — `enemy.y` wird immer genau um die Differenz bewegt, die auch in
`rueckstossPx` landet. Eine Annaeherung erreicht die Null nur asymptotisch; unterhalb
eines halben Pixels ist deshalb **hart auf 0 zu setzen**, sonst schleppt jeder Gegner
einen Rest-Versatz bis ans Lebensende mit sich und die Laufstrecke stimmt nicht mehr.
Die bestehenden Tests, die genau das pruefen, muessen gruen bleiben.

---

## C — Zerplatzen mit Ausklingkurve

**Heute:** `Sterbeeffekte.update()` in `src/systems/sterbeeffekte.ts:45-47` rechnet
Groesse und Durchsichtigkeit **linear** ueber die Lebensdauer. Der Effekt waechst und
verblasst mit konstanter Geschwindigkeit und wirkt dadurch flach.

**Der Baustein liegt ebenfalls im Projekt:** `getPopScale()` in `gamefeel.ts:87` ist
der Sinusbogen, mit dem eingesammelte Muenzen aufploppen. Kommentar dort: "ein
einzelner Sinus-Bogen genuegt und ist billiger als eine Tween-Kurve im Hot Path" —
dieselbe Ueberlegung gilt hier.

**Umbau:** Wachstum und Ausblenden folgen einer Kurve, die schnell beginnt und weich
endet, statt einer Geraden. Ob `getPopScale` direkt passt oder eine verwandte Kurve
nebenan besser ist, entscheidet Codex innerhalb dieser Vorgabe; eine neue
Tween-Maschinerie im Hot Path ist **kein** zulaessiger Weg. Die Gesamtdauer von 150 ms
bleibt.

---

## Ausdruecklich NICHT Teil dieses Tasks

Die Analyse hat vier weitere Stellen gefunden. Sie bleiben aus jeweils eigenem Grund
liegen — wer sie "nebenbei" mitnimmt, verletzt die harte Grenze:

- **Der Knick im Laufrhythmus** (`getBobOffsetPx`, `-Math.abs(sin)`). Das ist Absicht
  und steht so im Kommentar: Ein Laeufer faellt nach unten und stoesst sich ab, er
  schwingt nicht symmetrisch. **Von Thomas abgenommenes Gamefeel** — nicht anfassen.
- **Das harte Anhalten des Bosses beim Vorruecken** (`advanceTowardsCrowd`,
  `boss.ts:256`). `advanceSpeed` und `advanceStopBeforeAnchorPx` sind aus der
  gewuenschten Kampfdauer zurueckgerechnet. Ein Abbremsen verschoebe die Ankunftszeit
  und damit die Balance — das braucht eine Messreihe, keinen Formelwechsel.
- **Die Korrektur der Truppe an Waenden** (`crowd.ts`, `wallNudgeSpeedPxPerSec`).
  Stoppt ebenfalls hart, tritt aber nur auf, wenn eine Wand in den Fahrbereich ragt.
  Zurueckgestellt, bis es jemandem im Spiel auffaellt.
- **`maxDeltaMs: 100`.** Nach einem Ruckler holt die Welt bis zu sechs normale Bilder
  in einem einzigen nach. Das mildert man, indem man die Zahl senkt — es behebt aber
  den Ruckler nicht, sondern verteilt ihn. Ohne einen gemeldeten Fall nicht anfassen.

---

## Akzeptanzkriterien

- **A1** `BALANCE.boss.bilder.zyklenProSekunde` steht auf 1,0, und der Kommentar
  daneben rechnet die neue Bildwechselrate und die neue Aufbaeum-Dauer korrekt vor.
- **A2** Ein Test haelt fest, dass Bildanzahl x Zyklenrate mindestens 12 Bildwechsel/s
  ergibt — damit faellt auf, wenn spaeter jemand an einer der beiden Zahlen dreht.
- **A3** Der Rueckstoss klingt mit abnehmender Geschwindigkeit aus: In der ersten
  Haelfte der Zeit wird mehr Versatz abgebaut als in der zweiten. Ein Rechentest ueber
  mehrere Bilder belegt es.
- **A4** Der Ausklang ist bildratenunabhaengig: Derselbe Zeitraum, einmal in Schritten
  von 8 ms und einmal in Schritten von 16 ms durchgerechnet, endet beim praktisch
  gleichen Versatz. Ein Test belegt es.
- **A5** Der Versatz erreicht **exakt** null und nicht nur beinahe; kein Gegner
  schleppt einen Rest mit. Die bestehenden Tests zur Laufstrecke (`getroffen.y`
  gegen `baseline.y`) bleiben gruen.
- **A6** `rueckstossMs` existiert nicht mehr, weder als genutzter noch als toter Wert.
- **A7** Der Sterbeeffekt waechst und verblasst mit einer Kurve statt linear; die
  Gesamtdauer bleibt 150 ms, und es entsteht keine neue Tween-Maschinerie im Hot Path.
- **A8** Keine Balance-Zahl ausserhalb der hier genannten ist geaendert. Insbesondere
  bleiben `advanceSpeed`, `advanceStopBeforeAnchorPx`, `wallNudgeSpeedPxPerSec`,
  `maxDeltaMs` und alle `gamefeel`-Werte unveraendert.
- **A9** `npm run check` und `npm test` laufen durch.
- **A10 (Thomas)** Test am echten iPhone: Laufen Boss, Treffer und Sterbeeffekt
  fluessiger als vorher — und bleibt der Boss dabei schwerfaellig? **Ohne diesen Punkt
  gilt der Task nicht als erfuellt.**

## Stand des Reviews (2026-09-19)

**Code-Review bestanden.** Boss-Bildtakt auf 1,0 (12 Bildwechsel/s), Rueckstoss klingt
ueber eine Halbwertszeit von 30 ms aus und wird unter 0,5 px hart auf null gesetzt,
Sterbeeffekt nutzt die neue Kurve `getEaseOutProgress` in `gamefeel.ts`. `rueckstossMs`
ist entfernt. `npm run check`, `npm test` (37 Dateien, 401 Tests) und `npm run build`
sind gruen, im Terminal selbst nachgelaufen.

**Angemerkt fuer den Fall, dass die Reissleine aus A greift:** Der Test in
`tests/weltThema.test.ts` legt `zyklenProSekunde` jetzt auf exakt 1 fest (plus die
Rate-Pruefung aus A2). Ein Rueckgang auf 0,9 muss beide Zusicherungen dort mitnehmen.

**Offen: A10 — Thomas' iPhone-Test.** Laufen Boss, Treffer und Sterbeeffekt fluessiger,
und bleibt der Boss dabei schwerfaellig? Bis dahin `IMPL_DONE`, nicht `APPROVED`.
