# Run & Gun — Umsetzungsplan V5 (TORLAUF: zweiter Probelauf nach dem Genre-Video)

Status: **FREIGEGEBEN von Thomas am 2026-09-19 ("go"); Kernmechanik am 2026-09-19
korrigiert und von Thomas bestaetigt ("ja stimmt").** E0, E1, E2 sind gebaut (Commits
`5c0c2dc`, `84de8c1`/`0996a7f`, `eb38515`); E2 wird nach der Korrektur umgebaut (E2r).
Der bestehende PROBELAUF bleibt unveraendert; der Torlauf kommt zusaetzlich.

Die Regeln aus V1-V4 gelten unveraendert: Objekt-Pools mit hergeleiteten Groessen, alle
Tuning-Werte in `balance.ts` mit Rechenweg, keine externen Requests, keine Kosten,
Reissleinen benennen, was **kein** zulaessiger Ersatz ist, Bilder erzeugt Codex, Gamefeel
gilt erst nach dem iPhone-Test. Jede Etappe endet spielbar auf `main`.

## Die Kernmechanik des Vorbilds (korrigiert, bestaetigt)

Die erste Fassung dieses Plans hatte das Video in unseren Shooter uebersetzt ("Pfeiler
werden heruntergeschossen") — das war falsch, siehe `docs/lessons.md` 2026-09-19. Bild
fuer Bild (4 Bilder je Sekunde) und von Thomas bestaetigt:

**Die Truppe unten ist die Quelle mit N Einheiten. Sie schickt laufend Figuren nach oben
los — je mehr Einheiten, desto mehr Figuren je Sekunde. Eine losgeschickte Figur laeuft
selbstaendig:**

1. **+1-Kachel** (Kette am linken Rand): die Figur laeuft durch, die Quelle waechst um 1.
2. **Pfeiler** (mit Zahl darunter, z. B. 9): die Figur hackt ihn um einen Punkt und
   laeuft weiter; bei 0 kippt er und wird zur **Platte**.
3. **Platte ×88**: aus einer durchlaufenden Figur wird ein Strom von 88.
4. **Horde** (rote Flaeche mit Zahl, z. B. 858): jede Figur nimmt ihr einen Punkt und
   ist verbraucht — ein Schiebe-Kampf Masse gegen Masse, beide Zahlen schmelzen.
5. **Boss** mit Zahl ueber dem Kopf: wird genauso im Nahkampf abgebaut.

**Der Spieler lenkt nur, wohin der Strom laeuft. Es wird nicht geschossen — die Figuren
sind die Kugeln.** Thomas' Ergaenzung: Die Gegner sind im Torlauf **kleiner** (wie die
Truppe), und es reichen **wenige Gestalten**: eine Standardfigur (Thomas waehlt sie aus),
dazu die groesseren Figuren und die Endbosse **mit Zaehler**.

## Warum das naeher an unserem Stack liegt als gedacht

Der Shooter hat bereits: rotierende Salven aus der Truppe (`Weapons.fire`), spurtreue
Projektile mit Pool (`projectile.laneFollow`, `pools.projectiles`), Treffer-Wirkung an
Wandsegmenten (`walls.damage` ueber den Projektil-Collider), Aufsammeln durch
Beruehrung (`collectPickup`). **Im Torlauf wird das Projektil zur laufenden Figur**, der
Treffer zur Beruehrung, und drei Dinge kommen dazu: die Platte spawnt Kopien, die Horde
verbraucht Figuren, die +1-Kachel erhoeht die Quelle. Der Welt-Scroll bleibt, wie er ist.

## Der Zielkonflikt, neu gefasst: im Torlauf ist Masse gleich Strom

Im Run gilt "Masse ist Leben, nicht Feuer" (Truppenbonus gedeckelt bei 30). **Im Torlauf
gilt das Vorbild: mehr Einheiten, mehr Strom.** Das ist erlaubt, weil der Torlauf nichts
speichert und seine Balance eigenstaendig ist. Zwei Deckel halten es beherrschbar:
`torlauf.crowd.max` 150 fuer die Quelle (E2) und ein **Pool-Deckel fuer den Strom** —
die Strom-Rate ist `min(N, stromDeckel) x figurenJeEinheitUndSekunde`, und der
Figuren-Pool wird aus Rate x Flugzeit hergeleitet, nicht geschaetzt (V4-Regel). Eine
Platte ×k spawnt hoechstens so viele Kopien, wie der Pool frei hat; der Rest verfaellt
mit Quittung ("Pool voll" im DEV-Log), nie stumm.

## Was von E0-E2 bleibt

- **E0** (Modus, Speicherschutz, grosse Zahl): unveraendert.
- **E1** (Masse-Formation, Deckel 150, Anker 220, Huelle folgt): unveraendert — die
  Quelle ist diese Masse.
- **E2** (Torpaare, Restwert, `plus`/`mal`, Partner, Ankerseite, `hpDeckelOverride`,
  Spawnsperre): **Struktur bleibt**, geaendert wird nur, **wer den Restwert senkt** (die
  laufende Figur statt der Kugel) und was ein verpasster Pfeiler tut (nichts statt Malus).

## Reihenfolge

**E2r → E3 → E4 → E5**, E2b (Pfeiler-Bilder) parallel dazu, sobald Codex Zeit hat.

---

## E2r — Der Strom: Figuren statt Kugeln

**Umbau:**
- Im Torlauf feuert `Weapons` **nicht**; das Waffen-HUD ist ausgeblendet. Stattdessen
  ein eigenes System `Strom` (`src/systems/strom.ts`): aus der Quelle laufen Figuren
  nach oben — Textur die Standardfigur (E5), skaliert wie die Truppe (0,6), spurtreu wie
  Projektile, Tempo `torlauf.strom.tempoPxPerSec` (Vorschlag 260, etwas ueber dem
  Scroll, damit die Figur sichtbar vorwaerts kommt).
- **Rate:** `min(N, torlauf.strom.deckelEinheiten) x torlauf.strom.figurenJeEinheitProSek`
  (Vorschlag Deckel 60, 0,4/s → bei N=10 4 Figuren/s, bei 60+ 24/s). Startpunkte wie
  `getNextSalvoPositions`, rotierend ueber die Formation.
- **Pfeiler:** Beruehrung → `walls.damage` (ein Treffer, ein Punkt) — die Figur laeuft
  **weiter** (anders als eine Kugel). Ein Pfeiler mit Restwert < 0, der die Quelle
  erreicht: **nichts** (kein Malus, wie im Video), beide Tore verfallen.
- **Platte** (`stand >= 0`): jede durchlaufende Figur erzeugt `faktor - 1` Kopien
  (Pool-Deckel, siehe oben). Die Platte bleibt liegen, bis sie aus dem Bild ist —
  **die Quelle selbst durchfaehrt sie nicht mehr**; die Wirkung kommt allein ueber den
  Strom. `collectPickup` fuer die Huelle entfaellt im Torlauf.
- **Was wird gezaehlt?** Die grosse Zahl zeigt weiter die Quelle N. Der Strom ist
  Feuerkraft, kein Leben.
- Balance-Werte in `BALANCE.torlauf.strom` mit Rechenweg; Pool `pools.strom` hergeleitet
  aus Rate x Flugzeit x groesstem Faktor.

**Zielgroesse:** Ein Pfeiler mit Startwert -12 faellt bei N=10 in 3-4 s Beschuss durch
den Strom (gemessen mit dem Bot). Ein ×2 verdoppelt sichtbar die Dichte des Stroms.
Bildzeit-Median mit Pool voll ≤ 16,7 ms (DEV-Sonde).

**Reissleine:** Traegt der Projektilpfad die Figuren nicht in **einer Session** (z. B.
weil `laneFollow` und Kollision an Kugel-Annahmen haengen), dann ein eigener Sprite-Pool
im `Strom` ohne Arcade-Body, Treffer per Rechteckvergleich (`rectangles.ts`) — nicht
das Waffensystem umbauen.

## E3 — Die Horde als Flaeche, die Figuren verbraucht ✓ GEBAUT (2026-09-19)

**Stand:** Mechanik, Nahkampf, Sieg und Niederlage laufen und sind im Browser belegt
(docs/active-task.md). Offen bleibt die Zielgroessen-Messreihe unten — sie setzt
voraus, dass die Quelle im Spiel waechst, also dass die Tore und Kacheln mit der
Steuerung erreichbar sind. Das ist Thomas' iPhone-Test.


- Rote Flaeche ueber die volle Bahn mit Zahl, rueckt langsam vor. Jede Strom-Figur, die
  sie beruehrt, zieht einen Punkt ab und verschwindet. Beruehrt die Flaeche die Quelle,
  frisst sie `fressRate` Einheiten je Sekunde (die Quelle schrumpft) und verliert ebenso
  viele Punkte. Horde bei 0 → zerplatzt, Level geschafft oder Boss. Quelle bei 0 → Torlauf
  vorbei.
- Darstellung zunaechst Flaeche + Zahl; die Figurenmasse der Horde (kleine
  Standardfiguren in Rot, Pool) ist Optik danach.
- **Zielgroesse (uebernimmt das Verlust-Kriterium aus E2):** Bot auf Level 5 gewinnt
  60-80 %, Level 15 20-40 %; beim Sieg bleiben 10-40 % der Quelle. Dreifach gemessen,
  frische Szene.

## E4 — Boss mit Zaehler, Nahkampf

Der vorhandene Boss mit seiner Zahl; Strom-Figuren nehmen ihm je Beruehrung Punkte
(`torlauf.boss.punkteJeFigur`), er rueckt auf die Quelle vor und frisst sie bei Kontakt
wie die Horde. Kein neues System.

## E5 — Gestalten im Torlauf (Thomas' Auswahl, 2026-09-19)

- **Strom:** die eigenen Einheiten tragen die Truppentextur `player`, skaliert 0,6.
- **Horde:** die `standard`-Figur, skaliert 0,6, als dichte Masse (Pool, E3-Optik).
- **Zwischendurch:** `heavy`-Figuren als Hindernisse mit Zaehler zwischen den Torpaaren
  (stehen, Zahl sinkt je Strom-Figur, fallen bei 0) — nach E4.
- **Am Ende:** `enemy-boss` und `enemy-boss-elite` mit Zaehler (E4), ebenfalls auf
  Truppengroesse skaliert.
- Keine normalen Gegner-Spawns im Torlauf (Spawner aus, ab E2r).

## E2b — Pfeiler-Bilder (Codex, parallel)

Pfeiler stehend, gekippt, Platte — je Wirkungsart. Bis dahin Wandsegment-Texturen.

## Was kein zulaessiger Ersatz ist

- **Nicht** den Run, das Testgelaende oder den Bahnen-Probelauf anfassen.
- **Nicht** im Torlauf Kugeln behalten "weil es schon geht" — die Figuren sind die Kugeln.
- **Nicht** den Strom ohne hergeleiteten Pool-Deckel bauen.
- **Nicht** ×88. Deckel ×3 bleibt.
- **Nicht** Bilder von Thomas anfordern; Codex erzeugt sie.

## Aufwand (Maschinenzeit, ohne Thomas' Tests)

E2r 2-3 h plus eine Balance-Session. E3 2-3 h plus eine Balance-Session. E4 unter 1 h.
E5 unter 1 h (nach Thomas' Auswahl). E2b 1-2 h Bilder.
