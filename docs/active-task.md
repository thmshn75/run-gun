# Aktive Aufgabe

Status: SPEC_READY

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
