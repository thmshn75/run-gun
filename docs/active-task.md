# Aktive Aufgabe

Status: APPROVED

## Aufgabe: D5d-Nacharbeit 4 — Haubitze: Muendungsfeuer + erster Einschlag am iPhone

Thomas am iPhone 2026-09-30 21:34 (nach Nacharbeit 3): "Haubitze hat kein Muendungsfeuer und
den ersten Einschlag sehe ich immer noch nicht — alles andere ok".

**Befund Claude (Browser 390×844, `?pruefung=1&einsatz=haubitze`, Aufrufe mitgeschnitten):**
Beide Schuesse rufen `schiesse` und `explosionen.starte` auf (t 1,2 s Ziel z −65,5; t 5,2 s
Ziel z −61,3; Ø 7), und **beide Explosionen sind im Desktop-Bild sichtbar**. Der erste
Einschlag fehlt also nur am iPhone. Staerkster Verdacht: Die Grafikprogramme (Shader) von
`Explosionen` und `Muendungsblitze` werden erst beim allerersten Zeichnen uebersetzt — genau
beim ersten Schuss, beim zweiten sind sie fertig. Safari am iPhone haengt dabei spuerbar. Dazu
kommt: `Explosionen` legt `instanceColor` erst beim ersten `setColorAt` an, das erzeugt eine
**neue Programmvariante** genau in diesem Bild. Das ist ein Verdacht, kein Beleg — deshalb
misst dieser Task am iPhone mit Gegenprobe (A7).
Muendungsfeuer: Der Blitz ist fuer alle Fahrzeuge eine 0,45-m-Flaeche, bei der Haubitze
0,08 s lang, rund 62 m von der Kamera entfernt → etwa 6 px Kern, teils im Rohr verborgen
(`depthTest` an). Das ist die Ursache, kein Verdacht.

## Erlaubte Änderungen (abschließend)
- `src/v3d/anzeigen.ts`, `src/v3d/lauf.ts` (nur `Einsatzbilder` und die Pruef-Diagnose),
  `src/v3d/balance3d.ts` (nur neue Darstellungswerte), `src/v3d/einstieg.ts` (Vorwaermen,
  Diagnose-Anzeige), ggf. `src/v3d/messung.ts` nur fuer "Letzte Messung"
- `tests/`
- Nicht: `rechnung.ts` (Kern, Zeitpunkte der Einschlaege bleiben), 2D-Code, Speicher.

## Akzeptanzkriterien

**A1 Muendungsblitz je Fahrzeug.** Neue Darstellungswerte in `balance3d.ts`, je Fahrzeug
Durchmesser und Dauer: Haubitze **Ø 2,4 m, 0,15 s**; Panzer **Ø 1,6 m, 0,12 s**; Humvee und
Hubschrauber unveraendert (Ø 0,45 m; 0,15 s bzw. 0,08 s). `Muendungsblitze` bekommt je
Instanz eine eigene Groesse (Geometrie 1×1, Skalierung je Instanz), damit alles in EINEM
Zeichenaufruf bleibt.

**A2 Blitz sitzt vor der Muendung und wird nicht verdeckt.** Blitzmitte 0,3 × Durchmesser vor
dem Muendungspunkt in Rohrrichtung (Rohrrichtung = lokale −z des Fahrzeugs, nach
`FELD_DREHUNG`), Material `depthTest: false`, `renderOrder` wie Explosionen. Kurzes Ausklingen:
Groesse 100 % → 60 %, Helligkeit 1 → 0 ueber die Dauer.

**A2b Jeder Blitz wird gezeichnet (Befund Claude 21:45, Panzer im Browser).** Heute zieht
`ticke` die Bildzeit schon in dem Bild ab, in dem der Blitz entsteht; bei einem Bild ≥ 0,08 s
verschwindet er, bevor er je gezeichnet wurde (Panzer: Schuss 1 und 4 ohne ein einziges
Blitzbild, Schuss 2/3 je 4 Bilder à ~10 px). Neu: Ein Blitz altert erst ab dem Bild NACH
seinem ersten Zeichnen und ist in mindestens **3 gerenderten Bildern** zu sehen, auch bei
dt 0,1. Test: dt 0,1 und 1/60, je Schuss (Panzer 4, Haubitze 2) ≥ 3 Bilder mit Blitz.

**A3 Grosse Blitze haben Vorrang.** Ist der Blitz-Pool (4) voll, verdraengt ein Haubitzen-
oder Panzerblitz den aeltesten kleinen Blitz; er wird nie verworfen.

**A4 Vorwaermen.** Nach dem Aufbau der Welt und vor dem ersten Laufbild werden alle
Programmvarianten, die Explosionen und Muendungsblitze spaeter brauchen, einmal uebersetzt
(z. B. je ein unsichtbarer bzw. ausserhalb des Bildes liegender Eintrag + `renderer.compile`,
oder ein Bild mit count 1). `instanceColor` der Explosionen existiert ab dem Konstruktor. **Nachweis
im Browser:** `renderer.info.programs.length` ist unmittelbar vor dem ersten Haubitzenschuss
und 1 s nach dem zweiten gleich (im Bericht beide Zahlen). URL-Schalter `&vorwaermen=0`
schaltet das Vorwaermen ab (nur fuer die Gegenprobe; ohne Schalter ist es immer an).

**A5 Pruef-Diagnose je Schuss.** Nur im Pruefmodus (`?pruefung=1&einsatz=…`): Fuer jeden
Haubitzen- und Panzerschuss wird mitgeschrieben: Laufzeit t, Anzahl **gerenderter** Bilder,
in denen der Blitz bzw. die Explosion dieses Schusses zu sehen war (count > 0 und Eintrag
aktiv), laengstes Bild (ms, echte Zeit zwischen zwei `requestAnimationFrame`) im Fenster
±0,5 s um den Schuss, neue Grafikprogramme seit dem Bild vor dem Schuss
(`renderer.info.programs.length`-Differenz), Vorwaermen an/aus. Nach Ende des Einsatzes
erscheint das als Text in der Messanzeige (scrollbar, schliessbar wie heute) und wird als
"Letzte Messung" gespeichert (unter INFO abrufbar), z. B.
`Haubitze Schuss 1 · t 1,20 s · Blitz 9 Bilder · Explosion 36 Bilder · laengstes Bild 18 ms · neue Programme 0 · Vorwaermen an`.
Im normalen Spiel wird nichts mitgeschrieben und nichts angezeigt.

**A6 Tests (Verhalten, keine Quelltextsuche).** (1) Blitz je Fahrzeug: nach `schiesse` fuer
die Haubitze liegt ein Blitz mit Groesse 2,4 und Lebensdauer 0,15 s vor der Muendung (Abstand
0,72 m in −z-Richtung des Fahrzeugs), bei vollem Pool ebenfalls. (2) Erster UND zweiter
Haubitzenschuss erzeugen je genau einen Blitz und eine Explosion (dt 1/60 und 0,1).
(3) Explosionen: `instanceColor` existiert direkt nach dem Konstruktor. (4) Diagnose-Zaehler
zaehlen nur gerenderte Bilder (Test mit simulierten Bildern) und sind ohne Pruefmodus aus.

**A7 Gegenprobe am iPhone (macht Claude mit Thomas, nicht Codex).** Zwei Links:
A `?pruefung=1&einsatz=haubitze&vorwaermen=0`, B `?pruefung=1&einsatz=haubitze`.
Vorhersage, wenn der Verdacht stimmt: bei A hat Schuss 1 ein deutlich laengeres Bild und
neue Programme > 0, Schuss 2 nicht; bei B sind beide Schuesse gleich und die Explosion ist
in ≥ 20 Bildern zu sehen. Stimmt die Vorhersage nicht, ist der Verdacht widerlegt und die
Zahlen zeigen, wo weiterzusuchen ist.

## Nachweise
`npm run check`, `npm test`, `npm run build`, `npm run bots3d` gruen (Kern unveraendert).
Status am Ende IMPL_DONE, Abschlussbericht: was geaendert, Testergebnisse, die beiden
Programmzahlen aus A4, was nicht ging und warum.

## Reißleine
Laesst sich das Vorwaermen nicht ohne sichtbares Aufblitzen im ersten Bild machen: melden,
Rest fertig bauen. Keine Aenderung am Kern oder an Einschlagzeitpunkten.

## Implementation Summary (Codex)
- A2b-Nacharbeit: Blitzalterung beginnt erst nach dem ersten Blitzbild; jeder Blitz bleibt mindestens drei gezeichnete Bilder mit positiver Helligkeit sichtbar. Verhaltenstests fuer alle vier Panzerschuesse und beide Haubitzenschuesse bei `dt=0,1` und `1/60` ergaenzt. Nach letzter A2b-Aenderung: `npm run check` Exit 0, `npm test` 67 Dateien/624 Tests gruen, `git diff --check` ohne Befund. A4-Programmzahlen weiterhin nicht gemessen: In-App-Browser nicht verfuegbar, Zugriff auf Chrome abgelehnt.
- A1–A3: Fahrzeugwerte, skalierte und ausklingende Instanz-Blitze vor der Muendung sowie Vorrang grosser Blitze umgesetzt.
- A4: Explosion-`instanceColor` ab Konstruktor; beide Effektprogramme vor dem ersten Laufbild mit je einem Eintrag ausserhalb des Bildes vorbereitet und danach auf `count = 0` zurueckgesetzt. `vorwaermen=0` deaktiviert das Vorwaermen.
- A5: Schussbezogene Diagnose nur im Pruefmodus nach gerenderten Bildern, mit echtem Bildabstand, Programmzaehler und Anzeige/Speicherung als "Letzte Messung".
- A6: Verhaltenstests fuer Groesse, Dauer, Lage, Pool, beide Schuesse bei `dt=1/60` und `0,1`, `instanceColor`, Vorwaerm-Platzhalter und Diagnose.
- Nachweise nach letzter Codeaenderung: `npm run check` Exit 0; `npm test` 67 Dateien/620 Tests gruen; `npm run build` Exit 0; `npm run bots3d` Exit 0; `git diff --check` ohne Befund.
- A4-Browserzahlen: vor Schuss 1 **nicht gemessen**, 1 s nach Schuss 2 **nicht gemessen**. Die Browseroberflaeche war in dieser Codex-Sitzung nicht freigegeben; die zwei Werte werden im Pruefergebnis ausgegeben. Sichtbares Aufblitzen des Vorwaermens und die iPhone-Gegenprobe A7 sind deshalb ebenfalls nicht praktisch geprueft; A7 liegt bei Claude und Thomas.
