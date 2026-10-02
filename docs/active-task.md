# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D8 — Politur (Plan V7), Liste von Thomas bestätigt

Thomas 2026-10-02 08:26: "1–4 umsetzen, kein Klang". Liste:
1. Soldat: Ärmel heller als die Weste, echte Gewehr-Anschlagpose statt Pistolenhaltung,
   Gesichtsmaske Coyote (vorgemerkt 2026-09-29).
2. Niederlage: Die Horde überrennt die Truppe sichtbar, statt im letzten Moment zu verschwinden.
3. Mecha-Raketen: kräftigerer Rauch.
4. Treffer-Rückmeldung: Zahlen über getroffenen Bossen.
Vorgänger Arsenal (Commit fd48402).

**Ist-Zustand:** `scripts/modelle.mjs` färbt den Soldaten über `COYOTE_FARBEN` (Jacke
`Mark_Kitel_1` #b39a74, Weste/Taschen #7a6549, Helm #a58a64, Handschuhe #141414; Maske
`Mark_HeadMasked` ungefärbt). Bewegungen aus der Quaternius-Bibliothek `tmp/UAL1_Standard.glb`
(nur Pistolen-Clips: `Pistol_Aim_Neutral`, `Pistol_Idle_Loop`, `Pistol_Shoot`; **keine**
Gewehr-Clips), gebacken in `soldaten.ts` (`laufen`/`stehen`/`schiessen`, M4 an der rechten Hand).
Bei `z.y ≤ 0` wird die Horde unsichtbar (`lauf.ts` ~Z. 106, 912, 941). Raketenrauch:
`this.rauch.starte(start, .6, 1.4, .5)` und Spur `(pos, .25, .45, .4)` (`lauf.ts` ~Z. 139, 217).
Boss-Treffer kommen als `bossTreffer`-Ereignisse.

## Erlaubte Änderungen (abschließend)
`scripts/modelle.mjs` (Soldat: Farben, ggf. Pose beim Backen), `src/v3d/soldaten.ts`,
`src/v3d/modelle/` (neu gebackener Soldat), `src/v3d/lauf.ts`, `src/v3d/anzeigen.ts`,
`src/v3d/balance3d.ts` (nur Darstellungswerte), `tests/`. Nicht: Kern, Level, Werkstatt, 2D.

## Akzeptanzkriterien

**P1a Farben.** Jacke/Ärmel `Mark_Kitel_1` heller: #c8b08a; Weste/Taschen bleiben; Maske
`Mark_HeadMasked` Coyote #a58a64 (Augenbereich `Mark_Eye`/`Mark_SunGlusses_Glus` bleibt dunkel).
Messbar: mittlere Helligkeit der Ärmelpixel im Nahbild ≥ 15 % über der Weste. Nahbild Soldat
vorn/seitlich (Pruefbild wie bei `?pruefung=soldat`) in den Bericht.

**P1b Gewehr-Anschlag.** Für `stehen` und `schiessen` (nicht `laufen`, `fallen`) wird die
Oberkörperhaltung beim Backen so korrigiert, dass das M4 wie ein Gewehr gehalten wird:
rechte Hand am Griff (wie heute), **linke Hand am Vorderschaft** (Abstand Handwurzel links ↔
Punkt 0,35 m vor dem Griff entlang der M4-Achse ≤ 4 cm), **Kolben an der rechten Schulter**
(Kolbenende ≤ 8 cm vom Schultergelenk), Lauf zeigt nach vorn (−z, Abweichung ≤ 10°). Umsetzung
über Zwei-Gelenk-Ausrichtung (Oberarm/Unterarm, "Two-Bone-IK") je Bild beim Backen, Körper
und Beine aus dem bisherigen Clip. Messwerte je Pose in den Bericht, Nahbild von vorn und von
der Seite.

**P2 Horde überrennt.** Bei `niederlage` im Nachlauf (bestehende 3 s): Die sichtbare Horde
bleibt sichtbar und rückt in 1,5 s um 4 m weiter vor (über die Truppenposition hinaus),
während die Truppe fällt (bestehend); Zombies im Vordergrund überdecken die Gefallenen. Kein
Sprung: die Horde startet an ihrer letzten Lage. Test: nach `niederlage` sind > 0 Zombies
sichtbar und ihre vorderste Reihe liegt nach 1,5 s ≥ 3 m weiter vorn.

**P3 Raketenrauch kräftiger.** Abschusswolke Ø 1,0 → 2,4 m, 0,9 s, dunkler (#6d6d6d,
Deckkraft 0,75 → 0); Spur je Rakete 6–8 Puffs Ø 0,45 → 0,9 m, 0,7 s, Deckkraft 0,6 → 0.
Pool so groß, dass zwei Salven gleichzeitig Platz haben (keine Verdrängung). Kurzlebig-Regel.

**P4 Trefferzahlen über Bossen.** Bei `bossTreffer` (Mini- und Elite-Boss): Zahl "−N"
(gerundete Summe der Treffer der letzten 0,3 s) über dem Kopf des Bosses, steigt in 0,8 s um
1,2 m und blendet aus; weiß mit dunklem Rand, Ziffernhöhe ≥ 16 px bei 390 × 844; höchstens
6 gleichzeitig (Pool, ein Zeichenaufruf oder Sprite-Pool), älteste wird ersetzt. Keine
Zahlen bei 0. Test: Summe der angezeigten Zahlen = Summe der `bossTreffer` (± Rundung je Zahl).

## Nachweise
`npm run check`, `npm test`, `npm run build`, `npm run bots3d` (unverändert). Status
`IMPL_DONE`, Bericht: P1a-Helligkeiten, P1b-Messwerte je Pose, Nahbilder, Testergebnisse.

## Reißleine
P1b ist der riskante Punkt: Überzeugt die Gewehrhaltung nach **einem** Anlauf nicht (Messwerte
verfehlt, Arm verdreht, Hand im Körper): **melden** mit Messwerten und Nahbild, Pistolenhaltung
bleibt, P1a/P2/P3/P4 trotzdem fertig bauen. Kein anderes Modell, keine neue Bewegungsbibliothek.

## Implementation Summary (2026-10-02)

- **P1a umgesetzt:** `Mark_Kitel_1` auf `#c8b08a`, `Mark_HeadMasked` auf `#a58a64` umgefärbt und den Soldaten mit `node scripts/modelle.mjs soldat` neu gebacken. Die dunklen Augenmaterialien blieben unverändert. Im Modell-Prüfbild `stehen-vorn` ergaben die Ärmelpixel (x 273–311, y 225–301) im Mittel 148,03 Helligkeitseinheiten und die Weste (x 123–265, y 284–388) 91,45; die Ärmel liegen damit **61,9 %** darüber. Die Stichprobe berücksichtigt sichtbare Coyote-Pixel mit Mittelwert 70–220 und R > 1,06 × B. Zusätzlich liegt die mittlere Helligkeit der belegten Atlas-Kacheln bei 115,28 (Jacke) gegen 83,66 (Weste), also 37,8 % höher.
- **P1b Reißleine ausgelöst:** Ein Versuch mit Zwei-Gelenk-Ausrichtung je Backbild verfehlte die Grenzwerte. `stehen`: linke Hand zum Vorderschaft 57,75–58,04 cm, Kolben zur rechten Schulter 14,19–14,51 cm, Laufwinkel 0–0,00002°. `schiessen`: 57,98–58,03 cm, 13,39–14,26 cm, 0–0,00001°. Die rechte Hand blieb als M4-Bindung am Griff; der bestehende Test begrenzt den Griffabstand auf 3 cm. Die Poseänderung wurde vollständig zurückgenommen, die bisherige Pistolenhaltung bleibt. Die Bilder unten zeigen den **beibehaltenen** Stand; vom verworfenen Versuch wurde vor der Rücknahme kein Bild gespeichert.
- **P2 umgesetzt:** Die Horde bleibt beim Verlust sichtbar und rückt während des Nachlaufs ohne Positionssprung in 1,5 s um 4 m über die fallende Truppe vor. Der neue Test prüft sichtbare Zombies und mindestens 3 m Vorrücken.
- **P3 umgesetzt:** Abschussrauch 1,0 → 2,4 m, 0,9 s, `#6d6d6d`, Deckkraft 0,75 → 0. Je Rakete sieben Spurwolken 0,45 → 0,9 m, 0,7 s, Deckkraft 0,6 → 0. Der Pool hält 80 Wolken; der Test belegt 64 gleichzeitig für zwei Salven.
- **P4 umgesetzt:** Boss-Treffer beider Bossarten werden je 0,3 s summiert und gerundet, als `−N` über dem Kopf angezeigt, steigen in 0,8 s um 1,2 m und blenden aus. Sechs wiederverwendete Sprites ersetzen das älteste; null wird nicht gezeigt. Die Größe passt sich für mindestens 16 nominelle Ziffernpixel bei 390 × 844 an. Test: 2,2 + 3,4 + 4 = 9,6 Treffer ergeben 6 + 4 = 10 angezeigte Punkte, innerhalb der Rundung je Zahl.

Modell-Prüfbilder der beibehaltenen Pose: [stehen vorn](../tests/nachweise/d8-soldat-stehen-vorn.png), [stehen seitlich](../tests/nachweise/d8-soldat-stehen-seite.png), [schiessen vorn](../tests/nachweise/d8-soldat-schiessen-vorn.png), [schiessen seitlich](../tests/nachweise/d8-soldat-schiessen-seite.png). Sie wurden aus den gebackenen Geometrien und dem Atlas erzeugt. Eine echte Browser-, WebGL- oder iPhone-Sichtung war in dieser Umgebung nicht möglich.

Prüfungen: `npm run check` erfolgreich; `npm test` 76 Dateien/680 Tests erfolgreich; `npm run build` erfolgreich (bestehende Chunk-Größenwarnung); `npm run bots3d` erfolgreich, passiv 0/20, beste ausgerüstete Spielweise in jedem Level 20/20. `git diff --check` ohne Befund. Die vorgeschriebene Terminal-App war nicht erreichbar (`open -a Terminal`: „Unable to find application named 'Terminal'“); die Befehle liefen im verfügbaren Terminal-Werkzeug. Kein Commit und kein Push.


## Nacharbeit 1 — Gewehr verkehrt herum, Ärmel, Anschlag zweiter Anlauf (Thomas 2026-10-02 10:05)

**Befund Claude (Soldaten-Nahansicht `?nahaufnahme=soldat`, im Spiel):** Das M4 hängt seit D2b
**verkehrt herum**: rechte Hand am Pistolengriff, aber der **Lauf zeigt nach hinten** zum eigenen
Kopf, der Kolben nach vorn. Der als `m4MuzzleVertex` gewählte Punkt ist in Wahrheit das
**Kolbenende** — deshalb bestand der Test "Mündung vor Brust" und das Mündungsfeuer blitzte
vorn, obwohl das Gewehr falsch lag. Die hellen Ärmel aus P1a (#c8b08a) wirken fast weiß und
lassen die Arme im Prüfbild im Rumpf verschwinden (Thomas: "sieht schrecklich aus", "keine Arme").
Thomas: "Achte darauf, dass das Mündungsfeuer dann auch vorne rauskommt."

**N1 Gewehr richtig herum.** M4 so ausrichten, dass der **Lauf** nach vorn (−z) zeigt und der
Kolben zum Körper; rechte Hand bleibt am Pistolengriff (≤ 3 cm wie bisher). Die **Mündung** wird
aus der Geometrie bestimmt, nicht über ein Achsenvorzeichen: das Ende der M4-Längsachse mit dem
**kleinsten Querschnitt** (Lauf), Kolbenende = breites Ende. `m4MuzzleVertex` = Punkt am
Laufende. **Verhaltenstests:** (a) Querschnitt (Ausdehnung quer zur Achse) an der Mündung
< halber Querschnitt am anderen Ende; (b) Mündung liegt in `stehen`/`schiessen` ≥ 0,3 m **vor**
der Brust (−z) **und** das Kolbenende liegt näher am Körper als die Mündung; (c) der Laufwinkel
gegen −z ≤ 15°.
**N2 Mündungsfeuer vorn.** Front- und Truppen-Mündungsblitze sitzen an der neuen Mündung
(`debugMuzzle` aus N1, umbenennen in `muendung`), 0,1 m davor in Laufrichtung. Test: Abstand
Blitzmitte ↔ Mündung ≤ 0,15 m und Blitz liegt vor (−z) der Mündung; im Nahbild sichtbar vorn.
**N3 Ärmel.** `Mark_Kitel_1` #b39a74 → **#bda683** (nur leicht heller als vorher, kräftig
Coyote); Kriterium: Ärmel 10–25 % heller als die Weste im Prüfbild, nicht weißlich (B < R − 25).
**N4 Gewehr-Anschlag, zweiter und letzter Anlauf** (gilt erst nach N1): Für `stehen` und
`schiessen` zuerst den **rechten Arm anwinkeln** (Ellbogen ~70–100°), sodass der Kolben an der
rechten Schulter liegt (≤ 8 cm) und der Lauf nach vorn zeigt; **danach** die linke Hand per
Zwei-Gelenk-Ausrichtung an den Vorderschaft (Punkt 0,35 m vor dem Griff entlang der Laufachse,
≤ 4 cm). **Vorher rechnerisch prüfen**, ob der Punkt erreichbar ist (Abstand Schulter links ↔
Ziel ≤ Oberarm + Unterarm); wenn nicht, Kolben/Gewehr näher an den Körper, bis erreichbar.
`laufen` bleibt einhändig. Messwerte je Pose in den Bericht.
**Nahbilder** (vorn, seitlich, schräg von hinten wie die Spielkamera) für `stehen`/`schiessen`
in `tests/nachweise/` (überschreiben).
Reißleine N4: verfehlt → melden mit Messwerten und Nahbild; N1–N3 bleiben, Haltung einhändig,
aber **mit richtig herum gehaltenem Gewehr**.
`node scripts/modelle.mjs soldat`, `npm run check`, `npm test`, `npm run build`. Status
`IMPL_DONE`, Bericht unter diesem Abschnitt.

### Bericht Nacharbeit 1 (2026-10-02)

- **N1 umgesetzt:** Das M4-Laufende wird aus dem kleineren Querschnitt der beiden Achsenenden ermittelt (110,06 gegen 471,82 Quell-Einheiten; Verhältnis 0,233). Der Soldat wurde mit `node scripts/modelle.mjs soldat` neu gebacken. Über alle acht Bilder je Pose: `stehen` Griffabstand höchstens 0,001 cm, Mündung mindestens 0,753 m vor der Brust, Kolben mindestens 0,105 m näher am Körper, Laufwinkel höchstens 4,86°; `schiessen` 0,001 cm, 0,737 m, 0,066 m und 3,76°. Der Lauf zeigt damit nach −z, der Kolben zum Körper.
- **N2 umgesetzt:** Truppen- und Frontblitze verwenden `muendung` und `laufrichtung`; ihr Mittelpunkt liegt 0,10 m vor der Mündung. Die Tests prüfen Abstand und Vorzeichen auch nach einer Truppendrehung sowie den Abstand über die Schussbilder. Die [seitliche Blitzvorschau](../tests/nachweise/d8-soldat-schiessen-blitz-seite.png) und die [vordere Blitzvorschau](../tests/nachweise/d8-soldat-schiessen-blitz-vorn.png) markieren diese berechnete Stelle. Der orange Blitz ist in diesen Modell-Prüfbildern schematisch ergänzt, kein Browser-Screenshot.
- **N3 umgesetzt:** `Mark_Kitel_1` verwendet `#bda683`; die Texturhelligkeit wurde so angepasst, dass die Ärmel in der vorderen Modellansicht bei `stehen` im Mittel 109,25 gegen 92,87 Helligkeitseinheiten der Weste erreichen, also **17,6 %** mehr. Bei `schiessen` sind es 109,28 gegen 92,88, ebenfalls **17,6 %**. Der mittlere Rot-Blau-Abstand der sichtbaren Ärmel beträgt 38,95 und liegt über 25; die Ärmel wirken nicht weißlich.
- **N4 Reißleine nach einem IK-Anlauf:** Beide Handziele waren rechnerisch erreichbar (links 0,461 m Abstand bei 0,506 m Armlänge), der rechte Ellbogen erreichte 79,76°. Dabei verdrehte sich jedoch das Gewehr: `stehen`/`schiessen` Kolben–Schulter 112,18/112,06 cm (Soll ≤ 8 cm), linke Hand–Vorderschaft 62,18/62,13 cm (Soll ≤ 4 cm), Laufwinkel 125,31/125,15° (Soll ≤ 15°). Die Poseänderung wurde zurückgenommen; die einhändige Haltung mit richtig herum liegendem Gewehr bleibt. Das [seitliche Fehlnahbild](../tests/nachweise/d8-soldat-n4-versuch-stehen-seite.png) zeigt den verworfenen Anlauf.

Neu erzeugte Modell-Prüfbilder der **beibehaltenen** Pose: `stehen` [vorn](../tests/nachweise/d8-soldat-stehen-vorn.png), [seitlich](../tests/nachweise/d8-soldat-stehen-seite.png), [schräg hinten](../tests/nachweise/d8-soldat-stehen-kamera.png); `schiessen` [vorn](../tests/nachweise/d8-soldat-schiessen-vorn.png), [seitlich](../tests/nachweise/d8-soldat-schiessen-seite.png), [schräg hinten](../tests/nachweise/d8-soldat-schiessen-kamera.png). Sie wurden aus den gebackenen Geometrien und dem Atlas als Modellansichten gerendert.

Abschlussprüfungen: `npm run check` erfolgreich; `npm test` 76 Dateien/681 Tests erfolgreich; `npm run build` erfolgreich (bestehende Chunk-Größenwarnung); `git diff --check` ohne Befund. Echte Browser-/WebGL-/iPhone-Sichtung fehlt: Die automatische Freigabe verweigerte den Zugriff auf Google Chrome. Die vorgeschriebene Terminal-App war per `open -a Terminal` nicht erreichbar; die drei Befehle liefen deshalb im verfügbaren Terminal-Werkzeug. Kein Commit und kein Push.
