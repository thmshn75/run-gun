# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Gegner zittern jedes Bild um ±`body.offset.x` seitwärts und erscheinen dadurch doppelt.**

## Befund (gemessen, Ursache belegt, Gegentest bestanden)

Thomas' entscheidender Hinweis: „wenn man sie abschießt zählt wie einer". Es ist **eine**
Figur, die als zwei erscheint — nicht zwei Gegner. Der vorige Task (`97e02c8`) hat einen
echten, gemessenen Fehler behoben (zwei verschiedene Gegner überlappten sich beim
Einholen), aber nicht diesen hier.

### Was passiert

Aus Thomas' Bildschirmaufnahme, auf Spielauflösung zurückgerechnet und Bild für Bild
vermessen — die x-Position eines einzelnen Zombies:

```
Frame 449  x=229.01
Frame 450  x=219.56   (−9.45)
Frame 451  x=229.06   (+9.50)
Frame 452  x=220.01   (−9.05)
```

Die Figur springt in **jedem** Bild um 9,5 px hin und her. Bei 18 px Figurenbreite sieht
das Auge zwei halb überlappende Figuren nebeneinander — genau Thomas' Beschreibung
„doppelt nebeneinander, Armbereich überlappend, gleiche Geschwindigkeit".

### Warum

Am laufenden Spiel nachgemessen, ein einzelner Gegner über aufeinanderfolgende Bilder,
jeweils Wert am Ende unseres Updates gegen Wert am Anfang des nächsten:

```
Ende Frame N:    151.484
Start Frame N+1: 152.516   → Physik hat +1.032 addiert
Ende Frame N+1:  151.409
Start Frame N+2: 150.302   → Physik hat −1.107 addiert
Ende Frame N+2:  151.333
Start Frame N+3: 152.365   → Physik hat +1.032 addiert
```

Der Spawner setzt die Position selbst (`enemy.x = …`, dann `body.updateFromGameObject()`).
Danach läuft der Arcade-Physikschritt und **schreibt die Position aus dem Körper zurück
in das Sprite** — versetzt um `body.offset.x`, mit wechselndem Vorzeichen je Bild.
Gerendert wird der Stand **nach** der Physik. Unser Update korrigiert im nächsten Bild
zurück, die Physik versetzt wieder, und so weiter.

Der sichtbare Abstand der beiden Bilder ist **2 × `body.offset.x`**. Dieser Versatz
entsteht in `spawn()` durch `body.setSize(bodyWidth, bodyHeight, true)` — das zentrierte
Setzen der Trefferfläche innerhalb des Sprites, das transparenten Rand hat:

| Typ | Sprite | sichtbare Figur | `offset.x` | Sichtbarer Doppelabstand |
|---|---|---|---|---|
| `light` | 28 px | 18 px | 5 | **10 px — deutlich sichtbar** |
| `standard` | 32 px | 21 px | 5,5 | **11 px — deutlich sichtbar** |
| `heavy` | 42 px | 40 px | 1 | 2 px — nicht wahrnehmbar |

**Das erklärt vollständig, warum es nur die kleinen und mittleren trifft.** Der schwere
Zombie hat fast keinen transparenten Rand, also fast keinen Versatz.

Auf einem Standbild ist nichts zu sehen, weil jedes einzelne Bild nur **eine** Figur
enthält — der Doppeleindruck entsteht erst im Auge über zwei Bilder hinweg.

### Gegentest (bereits durchgeführt, damit die Ursache nicht nur plausibel ist)

`body.moves = false` für aktive Gegner gesetzt und erneut gemessen:

- **18 878 Proben, größter Versatz durch die Physik: 0,000 px** (vorher jedes Bild ±offset).
- Treffererkennung bleibt intakt: 109 Treffer und 33 Abschüsse in 20 Sekunden.

## Umzusetzende Änderung

**`src/systems/spawner.ts`, in `spawn()`:**

Nach `enemy.enableBody(...)` und dem Setzen der Körpergröße den Körper auf
„bewegt sich nicht selbst" stellen:

```ts
body.moves = false
```

Dazu ein Kommentar, der erklärt, **warum** — sonst wird es beim nächsten Umbau wieder
entfernt. Sinngemäß: Gegner werden vom Spawner selbst bewegt; bliebe `moves` aktiv,
schriebe der Arcade-Schritt die Position um `offset.x` versetzt zurück ins Sprite und die
Figur würde jedes Bild seitwärts springen.

Die Zeile `body.setVelocity(0, 0)` am Ende von `spawn()` entfällt: Mit `moves = false`
wertet Arcade keine Geschwindigkeit mehr aus, und die Zeile suggeriert fälschlich eine
physikgetriebene Bewegung.

`body.updateFromGameObject()` in `update()` bleibt unverändert — es hält die Trefferfläche
an der Figur und wird für die Überlappungsprüfung weiterhin gebraucht.

### Ausdrücklich nicht ändern

- **Nicht** den Versatz beseitigen, indem die Trefferfläche auf die Sprite-Größe
  aufgeblasen wird (`setSize` mit voller Sprite-Breite oder ohne Zentrierung). Die
  Trefferfläche soll weiterhin die sichtbare Figur abbilden, nicht den transparenten Rand.
- **Nicht** die transparenten Ränder aus den PNG-Dateien schneiden. Das würde den Versatz
  zufällig auf 0 bringen und den Fehler nur verstecken, bis das nächste Sprite wieder Rand
  hat.
- **Nicht** die Position glätten, interpolieren oder mitteln.
- **Nicht** `updateFromGameObject()` entfernen — dann wandert die Trefferfläche nicht mit.
- Die Spurwahl aus `spawnLanes.ts` bleibt unangetastet.

### Reißleine

Führt `body.moves = false` wider Erwarten dazu, dass Treffer oder der Kontaktschaden an
der Truppe nicht mehr auslösen: **melden und stoppen**, nicht durch eine andere Mechanik
ersetzen. Der Gegentest oben zeigt, dass beides funktioniert; eine Abweichung wäre ein
neuer Befund und gehört gemeldet.

## Akzeptanzkriterien

1. `npm run check` und `npm run build` laufen fehlerfrei durch.
2. **Messlauf: die gerenderte x-Position eines Gegners ändert sich zwischen zwei Bildern
   nie um mehr als die reguläre Fahrbahn-Drift (< 0,5 px).** Gemessen wird der Wert am
   Anfang eines Updates gegen den Wert am Ende des vorigen Updates — genau dort trat der
   Sprung auf. Vorher: ±1 px (`heavy`) bis ±5,5 px (`standard`) in jedem Bild.
3. Treffer und Abschüsse funktionieren unverändert; Kontaktschaden an der Truppe löst aus.
4. Der Messwert aus dem vorigen Task bleibt gehalten: 0 Frames mit überlappenden Gegnern
   über 3 Minuten. (Erst jetzt ist diese Messung überhaupt aussagekräftig — vorher wurde
   die logische Position gemessen, die gerenderte wich um bis zu 5,5 px ab.)
5. Kein `create()`/`destroy()` im Hot Path; Pools unverändert.

Kriterien 2 bis 4 prüft Claude nach der Umsetzung selbst am laufenden Spiel nach.

## Implementation Summary

- Gegnerkörper bewegen sich nicht mehr selbst; der Spawner hält Sprite und Trefferfläche
  weiterhin pro Update synchron. Arcade kann die Sprite-Position dadurch nicht mehr um
  den zentrierten `offset.x` versetzen.
- Die überflüssige physikgetriebene Geschwindigkeitszeile in `spawn()` ist entfernt.

## Review-Ergebnis (Claude, am laufenden Spiel nachgemessen)

Messlauf 12 314 Frames (~205 s) plus 45 s Nachlauf, frisch geladene Seite:

- **Größter Positionssprung durch die Physik: 0,0005 px bei 65 847 Proben.**
  Vorher: in *jedem* Bild ±1 px (`heavy`) bis ±5,5 px (`standard`). Kriterium 2 erfüllt.
- Treffer 588, Abschüsse 210, Kontaktschaden an der Truppe 4-mal ausgelöst.
  Kriterium 3 erfüllt — `moves = false` schaltet die Treffererkennung nicht ab.
- 0 Frames mit überlappenden Gegnern; Kriterium 4 gehalten, jetzt erstmals mit einer
  Position gemessen, die auch der gezeichneten entspricht.
- `npm run check` und `npm run build` selbst im Terminal ausgeführt, beide exit 0.

## Randnotiz, bewusst nicht Teil dieses Tasks

`src/systems/weapons.ts` bewegt Projektile nach demselben Muster (manuell setzen,
`updateFromGameObject()`, `moves` bleibt aktiv). Dort ist `body.offset` heute (0, 0), weil
für Projektile nie `setSize` aufgerufen wird — der Fehler tritt deshalb nicht auf. Bekommt
ein Projektil-Sprite später einen transparenten Rand und eine gesetzte Trefferfläche,
zittert es genauso. Hier festgehalten, damit es dann nicht wieder gesucht werden muss.

## Danach als Nächstes

- **E4b** — drei Zusatzwaffen + Waffen-Tore. Gehärtete Spec liegt fertig in
  `docs/spec-e4b-entwurf.md`, muss nur hierher übernommen werden. Größter Task des
  Projekts.
- Torwahl sichtbar machen; Hintergrund gestalten; 3D-Schritt 2; E4c (Gegner als Truppen).
