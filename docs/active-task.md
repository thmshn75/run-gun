# Active Task

## Status
`SPEC_READY`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Waffen-Tore und HUD zeigen Bilder der Waffen statt der Wörter NORMAL/SCHROT/LASER/RAKETE.**

Thomas-Entscheidung vom 2026-08-20: „für die Waffen möchte ich Bilder haben, keine Schrift",
auf Rückfrage präzisiert zu **die Waffe als realistisches Bild**, und zwar **an beiden
Stellen — Tor und HUD**.

Der Task besteht aus zwei Teilen: erst die vier Bilder erzeugen, dann Tor und HUD umbauen.

---

# Teil 1 — Die vier Waffenbilder erzeugen

## Verfahren (im Projekt bewährt, nicht abkürzen)

Die vorhandene Spielfigur und die drei Zombies sind entstanden, indem das Bild **groß**
erzeugt und danach auf Zielgröße **heruntergerechnet** wurde. Direkt in Zielgröße zu
erzeugen hat im selben Projekt bereits ein unbrauchbares Ergebnis geliefert
(`docs/lessons.md`, Eintrag vom 2026-08-20). Also:

1. Je Waffe **ein großes Bild** erzeugen, Breite mindestens 1024 px, Querformat etwa 1536 × 640.
2. Das große Original ablegen unter `assets/probe/waffen/<key>-gross.png`
   (`normal`, `shotgun`, `laser`, `rocket`). Der Ordner liegt in `.gitignore` — die großen
   Dateien kommen bewusst **nicht** ins Repo.
3. Freistellen (voll transparenter Hintergrund), auf den sichtbaren Inhalt zuschneiden.
4. Herunterrechnen auf **zwei** Zielgrößen je Waffe und unter `src/assets/` ablegen:
   - `weapon-<key>-gate.png` — **150 × 44 px**, für das Tor
   - `weapon-<key>-hud.png` — **72 × 20 px**, für die HUD-Zeile
   Beim Verkleinern die Seitenverhältnisse halten und innerhalb der Zielgröße zentrieren;
   die Waffe soll die Breite möglichst ausfüllen, oben und unten darf transparenter Rand
   bleiben.
5. Zwischenschritte (freigestellt, zugeschnitten) ebenfalls in `assets/probe/waffen/`
   lassen, damit sie beim nächsten Anfassen ohne Neuerzeugung prüfbar sind.

## Bildinhalt

**Für alle vier Bilder gleich** — ohne diesen gemeinsamen Rahmen passen die vier Bilder
nebeneinander am Tor nicht zusammen:

> Seitenansicht, Waffe zeigt nach rechts, exakt waagerecht ausgerichtet. Freigestellt auf
> vollständig transparentem Hintergrund, kein Schatten, kein Boden, keine Hand, keine
> Person, kein Text, kein Rahmen. Gleichmäßige Ausleuchtung von vorne, kräftige Farben,
> klare Kanten, hoher Kontrast gegen dunklen Untergrund (das Spiel ist dunkel, Fahrbahn
> `#1a2133`). Stil einheitlich über alle vier Bilder: kompakte Spielgrafik mit deutlichen
> Konturen — kein Foto, keine Weichzeichnung, keine Spiegelungen, kein Verlauf im
> Hintergrund.

**1. `normal`** — Ein kompaktes Sturmgewehr in Schwarz und Gunmetal-Grau, kurzer Lauf,
gerades Magazin, schlichter Schaft. Nüchtern und funktional, keine Verzierungen. Ein
orangefarbener Akzentstreifen am Lauf (Ton wie `#e8590c`).

**2. `shotgun`** — Eine Pump-Action-Schrotflinte mit dickem, kurzem Lauf, Holzschaft in
warmem Braun und Vorderschaft-Pumpe. Wuchtig und breit, deutlich massiver als ein Gewehr.
Warme gelb-orange Akzente an der Mündung (Ton wie `#ffb347`).

**3. `laser`** — Ein futuristisches Lasergewehr mit glatten weißen und dunkelgrauen
Gehäuseflächen, einer leuchtenden cyanfarbenen Energiezelle in der Mitte und einem cyan
glühenden Emitter an der Spitze. Kantiges Science-Fiction-Design, keine Rundungen. Das Cyan
muss kräftig leuchten (Ton wie `#7af4ff`).

**4. `rocket`** — Ein schultergestützter Raketenwerfer: dickes graugrünes Rohr, Griff und
Visier oben, vorne ragt eine Rakete mit leuchtend rotem Kopf heraus (Ton wie `#f03e3e`).
Militärisch, gedrungen, deutlich dicker als die anderen drei.

Jede Waffe trägt damit die Farbe ihres Geschosses. Am Tor ist so vor der Entscheidung
erkennbar, was gleich aus den Läufen kommt.

## Reißleine Teil 1

Lässt sich ein Bild nicht in brauchbarer Qualität erzeugen: **melden und stoppen**.

**Kein zulässiger Ersatz ist insbesondere:**
- Die Symbole programmatisch in `BootScene` zeichnen. Genau dieser Ausweg wurde im Projekt
  schon einmal gezogen und lieferte abstrakte Formen statt erkennbarer Objekte
  (`docs/lessons.md`, 2026-08-20). Thomas musste den Auftrag wiederholen.
- Ein Bild direkt in Zielgröße erzeugen statt groß und herunterrechnen.
- Die Schrift stehen lassen und zusätzlich ein Symbol danebensetzen — es soll das Bild
  **statt** des Wortes zu sehen sein.
- Für eine Waffe ein Bild in anderem Stil liefern als für die übrigen drei.

---

# Teil 2 — Tor und HUD auf Bilder umstellen

## Torbild

`src/systems/gates.ts`:

- `GatePair` bekommt zwei zusätzliche Bildobjekte `leftIcon` / `rightIcon`, **einmalig in
  `createPair()` angelegt** wie die vorhandenen Texte, standardmäßig inaktiv und unsichtbar.
  Keine Erzeugung im laufenden Spiel.
- `configureWeaponGate()` setzt auf den beiden Bildobjekten die Textur der jeweiligen Waffe,
  macht sie sichtbar und **blendet `leftText` / `rightText` aus**.
  `setTexture()` ist hier ausdrücklich erlaubt: ein Tor erscheint etwa alle 36 Sekunden,
  das ist kein Hot Path. Vier Bildobjekte je Seite vorzuhalten wäre unnötig.
- `configureStatGate()` blendet umgekehrt die Bildobjekte aus und die Texte wieder ein.
  Die Stat-Tore ändern sich sonst nicht.
- `layoutPair()` positioniert die Bilder wie die Texte auf `leftX` / `rightX` und `y`.
  **Anders als der Text skalieren die Bilder mit dem Tor mit:** auf beiden Achsen mit
  demselben `scaleX`, das das Tor bekommt (`gateWidth / this.baseGateWidth`). Damit wächst
  das Bild perspektivisch mit und ragt oben, wo das Tor nur etwa 86 px breit ist, nicht
  über den Rahmen hinaus. Das Seitenverhältnis bleibt erhalten.
- Der weiße Aufblitz beim Durchfahren (`applyPair`) muss beim Waffen-Tor auf dem **Bild**
  ausgelöst werden statt auf dem Text.
- Die Kopfzeile `WAFFE` über dem Tor bleibt als Schrift bestehen — sie benennt die Art des
  Tors, nicht die Waffe.
- Die für Waffen-Tore eingeführte Schriftgröße 26 px wird nicht mehr gebraucht und entfällt.
  `WEAPON_LABELS` bleibt bestehen, es wird weiterhin für die DEV-Warnung bei erschöpftem
  Projektil-Pool gebraucht.

## HUD

`src/scenes/GameScene.ts`:

- Die vierte Spalte der zweiten HUD-Zeile zeigt statt des Waffennamens das HUD-Bild der
  aktiven Waffe. Das Textobjekt `hud.weapon` wird durch ein **einmalig in `create()`
  angelegtes** Bildobjekt ersetzt; `updateHud()` setzt nur noch dessen Textur.
- Position wie bisher: Spaltenmitte bei `panelX + colW * 3.5`, gleiche Zeilenhöhe wie die
  anderen drei Werte, vertikal an ihnen ausgerichtet. Ursprung mittig setzen, damit das Bild
  in der Spalte zentriert sitzt.
- Das Bild wird **nicht** skaliert; es ist in `72 × 20 px` bereits in Zielgröße und passt in
  die 91 px breite Spalte.
- Die Schriftgröße der zweiten Zeile steht derzeit als `BALANCE.hud.statFontPx - 1` im Code.
  Bei dieser Gelegenheit sauber ziehen: den tatsächlichen Wert als eigenen Eintrag in
  `balance.ts` führen und im Code nur diesen Wert lesen. Keine Rechnung im Code.

## Laden der Bilder

`src/scenes/BootScene.ts`: Die acht PNG-Dateien wie die vorhandenen Gegner-Sprites per
Vite-Import einbinden und in `preload()` laden. Texturschlüssel:
`weapon-<key>-gate` und `weapon-<key>-hud`.

## Ausdrücklich nicht ändern

- Waffenwerte, Pools, Feuerraten, Reichweiten, Flächenschaden — nichts aus der Balance.
- Die Auswahlregeln der Waffen-Tore (jedes vierte Tor, nie die aktuelle Waffe, nie zweimal
  dieselbe) und die Stat-Tore.
- Die Reihenfolge `gates.update()` vor `weapons.update()` in `GameScene.update()`.
- Die violette Torfarbe `WEAPON_GATE_COLOR` bleibt für Rahmen und Kopfzeile.

## Akzeptanzkriterien

1. Acht PNG-Dateien liegen unter `src/assets/`: je Waffe `-gate.png` (150 × 44) und
   `-hud.png` (72 × 20), alle mit transparentem Hintergrund.
2. Die vier großen Originale liegen unter `assets/probe/waffen/` und sind mindestens
   1024 px breit. Sie sind **nicht** eingecheckt (Ordner steht in `.gitignore`).
3. Jedes der vier Bilder zeigt die jeweilige Waffe als erkennbares Objekt in Seitenansicht,
   nicht als abstrakte Form, und alle vier in einheitlichem Stil.
4. Am Waffen-Tor steht das Bild, **kein** Waffenname mehr. Die Kopfzeile `WAFFE` bleibt.
5. Das Torbild skaliert mit dem Tor mit und ragt zu keinem Zeitpunkt über den Torrahmen
   hinaus — auch nicht oben, wo das Tor am schmalsten ist.
6. Stat-Tore zeigen unverändert ihre Rechenoperationen als Schrift.
7. Die HUD-Zeile zeigt das Bild der aktiven Waffe; TEAM, Münzen, DMG, RATE und SPD bleiben
   auch bei ihren Höchstwerten vollständig sichtbar und überlappen nicht.
8. Keine Erzeugung von Bild- oder Textobjekten im laufenden Spiel; alle Objekte entstehen
   einmalig im Konstruktor beziehungsweise in `create()`.
9. Die Schriftgröße der zweiten HUD-Zeile steht als eigener Wert in `balance.ts`, nicht als
   Rechnung im Code.
10. `npm run check` und `npm run build` laufen fehlerfrei durch.
11. Keine neuen Abhängigkeiten, keine Requests zur Laufzeit.

Die Bildqualität und den Torlauf prüft Claude nach der Umsetzung am laufenden Spiel und an
den großen Vorlagen im Probeordner. Ob die Waffen auf Anhieb erkennbar sind, entscheidet
Thomas am iPhone.
