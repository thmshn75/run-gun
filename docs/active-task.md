# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/N6 — Die Gegnerfläche sitzt falsch

Verbindlicher Plan: `docs/plan-v6.md`. Alle acht Schritte sind gebaut und committet.
Thomas hat am Gerät getestet und drei Abweichungen gemeldet. Sie sind im Browser bei
iPhone-Maßen (390×844) nachgestellt und bestätigt.

## Befund 1 (der schwerste): Die Gegnerfläche wächst aus dem Tor heraus

Gemessen bei Spielstart: Die Gegnerfiguren stehen von y=154 bis y=606. Das Tor liegt
bei y≈610. Die Fläche beginnt also unmittelbar über dem Tor und reicht bis zum
Horizont — sie füllt fast die ganze Bahn.

Thomas: "die Horde wächst aus dem Tor in der Mitte, statt von oben zu kommen ... es
sieht in keiner Weise so aus, als wäre es ein Block wie am Bild."

**Im Video** (beide Aufnahmen) liegt die rote Masse im **oberen Drittel** der Bahn.
Darunter folgt die blaue Fläche, darunter **freie Bahn**, auf der der Strom sichtbar
läuft, und ganz unten das Tor mit der Truppe. Der Abstand zwischen Tor und Masse ist
der Raum, in dem das Spiel stattfindet — bei uns fehlt er ganz.

**Zu tun:**
- `front.frontStartY` so setzen, dass die Gegnerfläche bei vollem Vorrat **im oberen
  Drittel endet** und zwischen ihr und dem Tor freie Bahn bleibt. Richtwert aus dem
  Video: Die Unterkante der Masse liegt bei rund einem Drittel der Bahnhöhe, also
  deutlich oberhalb der Bahnmitte.
- Die Grenzlinie wandert weiterhin mit dem Vorrat: voller Vorrat = diese Startlinie,
  Vorrat null = Horizont.
- **Die eigene Fläche muss sichtbar sein.** Im Startbild ist von ihr nichts zu sehen;
  im Video ist sie ein breites blaues Band unter der roten Masse. Sie wächst mit dem
  Zustrom von der Grenzlinie nach unten.
- Test: Bei vollem Vorrat liegt die Unterkante der Gegnerfläche oberhalb der Bahnmitte
  und mit deutlichem Abstand über dem Tor. Rechnerisch prüfbar, ohne Phaser.

## Befund 2: Die +99-Reihe steht halb außerhalb der Bahn

Im Bild bei 390×844 ragen die gelben Schilder über den rechten Bahnrand hinaus; auf
Thomas' Gerät waren sie gar nicht zu sehen ("es gibt keine +99 Wände").

**Zu tun:** Beide Schilderreihen sitzen **innerhalb** der Bahnkanten, mit demselben
Abstand zum Rand wie im Video. Test: Für jede Schildhöhe liegt die äußere Kante des
Schildes innerhalb der Bahnkante aus `bahnKanten` — bei allen Höhen von Horizont bis
Bahnunterkante, nicht nur bei einer.

## Befund 3: Der Block wirkt nicht wie im Video

Die Masse ist ein Trapez, das sich nach unten verbreitert und unmittelbar am Tor
endet. Im Video ist es ein kompakter Block mit klarer Unterkante. Ergibt sich
größtenteils aus Befund 1; nach dessen Korrektur im Browser prüfen und, falls nötig,
die Kanten der Fläche schärfen.

## Grenzen

Unverändert: alles in `src/v2/`, keine Fremdimporte, kein Speicherzugriff, keine
Physik. Die Bilanzrechnung aus S4/S7 bleibt unangetastet — es geht um Startlage und
Platzierung, nicht um das Kräfteverhältnis.

## Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm run build`, `npm test` sauber; 480 Tests bleiben grün.
2. Die drei genannten Tests sind ergänzt.
3. **Browser-Nachweis bei 390×844** (führe ich, Claude, selbst): Startbild zeigt die
   Masse im oberen Drittel, freie Bahn darunter, beide Schilderreihen vollständig
   innerhalb der Bahn; Doppelstart identisch.

## Abschlussbericht

Was geändert, Testergebnisse, was nicht ging und warum. Status am Ende auf
`IMPL_DONE`.

## Implementation Summary

- Die volle rote Gegnerfläche endet bei 390×844 jetzt auf y=380 im oberen
  Bahndrittel; bis zum Tor bleiben 320 px freie Laufbahn. Die Bilanzrechnung und
  die Bewegung der Grenzlinie bleiben unverändert.
- Die blaue Fläche startet als dichtes, sichtbares Band direkt unter der Front und
  wächst mit dem Zustrom nach unten; ihre untere Sichtgrenze lässt die Laufbahn vor
  dem Tor frei.
- Beide Schildreihen sind mit 42 px Einzug so platziert, dass ihre vollständigen
  Außenkanten über die gesamte Bahnhöhe innerhalb der jeweiligen Bahnkante liegen.
- Ergänzt: drei Regressionstests für Frontlage/Torabstand, sichtbares Startband und
  beide Schildkanten auf jeder Bahnhohe. `npx tsc --noEmit`, `npm run build` und
  `npm test` sind grün (483 Tests); der Browser-Nachweis bei 390×844 bleibt gemäß
  Aufgabenbeschreibung bei Claude.
