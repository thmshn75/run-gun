# Aktive Aufgabe

Status: APPROVED

## Aufgabe: V6/N14 — Kampf 1:1, keine wachsende Truppe, Boss rückt vor, Gehsteige, kleinere Helme

Thomas am 2026-09-20, wörtlich:
> "wenn meine truppen auf die feinde treffen müssen sie 1:1 getötet werden, beide
> seiten, es muss immer ausgewogen sein und nur durch stärke oder truppen anzahl
> verschiebbar sein"
> "meine truppen sollen nicht anwachsen, nur gerade soviel feinde wegräumen wie
> nötig und der boss muss kommen, er darf nicht stehen bleiben"
> "die wände sollen abgegrenzt von der fahrbahn laufen, sozusagen in eigenen
> fahrbahnen (gehsteig)"
> "helme kleiner"

### 1. Die Kampfbilanz wird ein echter 1:1-Austausch

In `src/v2/front.ts` steht heute:

```ts
const eigenerDruck = zustand.eigenerWert * (staerke / start) * raten.abbauProEigenerEinheitProSek * sekunden
const gegnerDruck  = zustand.vorrat * raten.verlustProVorratProSek * sekunden
vorrat      = zustand.vorrat      - eigenerDruck + gegnerDruck
eigenerWert = zustand.eigenerWert + eigenerDruck - gegnerDruck
```

Das ist die Ursache für beide Beschwerden: **Die eigene Seite wächst um ihren
eigenen Druck** (Töten vermehrt die eigene Truppe), und der Gegnervorrat wächst
um seinen. Beides ist zu ersetzen.

Neue Rechnung — ein Austausch, zwei Verluste:

```
begegnungen   = min(eigenerWert, vorrat) * austauschProSek * sekunden
eigenerVerlust = begegnungen
gegnerVerlust  = begegnungen * (staerke / staerke.start)

eigenerWert = max(0, eigenerWert - eigenerVerlust)
vorrat      = max(0, vorrat      - gegnerVerlust)
```

Damit gilt:
- Bei Stärke 100 (dem Grundwert) fällt **auf jeder Seite genau gleich viel** — der
  reine 1:1-Austausch, den Thomas verlangt.
- **Die eigene Seite wächst im Kampf nie.** Sie wächst ausschliesslich durch
  ankommende Stromfiguren in `mitAnkunft` — das bleibt unverändert.
- **Der Gegnervorrat wächst nie.** Er wird nur abgebaut.
- Verschieben lässt sich das Ergebnis genau über die zwei Größen, die Thomas nennt:
  **Menge** (mehr Nachschub durch die linke Reihe) und **Stärke** (rechte Reihe).

`austauschProSek` kommt neu nach `balanceV2.ts` und ersetzt
`abbauProEigenerEinheitProSek` und `verlustProVorratProSek`. Wert so wählen, dass
ein Spiel weiterhin in etwa derselben Zeit entschieden ist wie bisher — Rechenweg
als Kommentar, einmal für den passiven Fall (keine Eingabe → Niederlage), einmal
für nur links und einmal für nur rechts.

**Bleibt zwingend erhalten:** Ohne Eingabe muss der Spieler verlieren. Das war
schon einmal kaputt (N5) und ist der schärfste Prüfstein dieser Änderung.

### 2. Der Boss rückt vor

Der Boss hängt heute allein am Gegnervorrat: Solange nichts passiert, steht er.
Thomas will, dass er kommt. Neu: Der Boss rückt **mit der Zeit** vor, unabhängig
vom Vorrat — ein fester Wert `ende.bossTempoPxProSek` (Richtwert 6, mit
Rechenweg: bei rund 92 px Weg braucht er etwa 15 Sekunden bis nach vorn).

Erreicht er die Truppe, ist das Spiel verloren — dieselbe Niederlage wie bisher.
Damit entsteht der Zeitdruck, der dem Level ein Ende gibt. Die bestehende
Siegbedingung über den Bossvorrat bleibt.

### 3. Die Schilderreihen bekommen eigene Spuren (Gehsteige)

Die beiden Schilderreihen laufen heute auf der Fahrbahn. Sie sollen **abgegrenzt**
laufen, wie ein Gehsteig: links und rechts je ein eigener Streifen zwischen Mauer
und Fahrbahn, mit einer sichtbaren Kante zur Fahrbahn und in einem anderen
Grauton (heller als die Fahrbahn).

- Breite des Streifens als Wert in `balanceV2.ts`, Richtwert 46 px im Vordergrund,
  über `tiefenSkala` nach hinten schmaler.
- Die Schilder stehen mittig auf ihrem Streifen; `randEinzugPx` entsprechend
  anpassen, damit das aufgeht.
- Die Fahrbahn ist danach entsprechend schmaler — **die Massen und die Truppe
  bewegen sich weiterhin auf der Fahrbahn**, also auf dem Bereich zwischen den
  beiden Gehsteigen. Die Sammelreichweite zur Seite bleibt so, dass die Schilder
  vom Fahrbahnrand aus erreichbar sind.
- Alles holt seine Geometrie aus derselben Kantenquelle wie bisher — **keine
  zweite Geometrie danebenbauen.**

### 4. Kleinere Helme

`front.helmTextureScale` auf etwa **zwei Drittel** des heutigen Werts, damit die
Massen dichter und feinkörniger wirken. Die Zahl der sichtbaren Helme entsprechend
erhöhen, damit die Fläche nicht löchrig wird — die Bilanzrechnung bleibt davon
unberührt, das ist reine Darstellung.

### Grenzen

- Nur `src/v2/`. Keine Importe aus `src/systems/`, `src/config/balance`,
  `src/scenes/`. Kein Speicherzugriff.
- Steuerung, Sammellogik, Tiefenskala und Kurvenformel bleiben unverändert.
- Bildrate bleibt 60.

### Akzeptanzkriterien

1. `npx tsc --noEmit`, `npm test`, `npm run build` sauber; alle Tests grün.
   Bestehende Fronttests auf die neue Rechnung umstellen, nicht löschen.
2. Tests über die Bilanzfunktion, ohne Phaser:
   - Bei Stärke 100 verlieren **beide Seiten in jedem Schritt exakt gleich viel**.
   - Die eigene Seite wird im Kampf **nie größer**, der Gegnervorrat **nie größer**.
   - Höhere Stärke verschiebt das Ergebnis zugunsten des Spielers, mehr Menge
     ebenfalls — je einmal durchgerechnet.
   - **Ohne jede Eingabe verliert der Spieler** — über die Bilanz durchgerechnet.
   - Der Boss kommt mit der Zeit näher, auch wenn sich am Vorrat nichts ändert.
3. **Browser-Nachweis bei 390×844** (führt Claude): Die eigene Fläche wächst beim
   Kämpfen nicht mehr; der Boss rückt sichtbar vor; die Schilder laufen auf eigenen
   Streifen neben der Fahrbahn; Helme kleiner und dichter; 60 Bilder je Sekunde;
   passiv verliert man, links und rechts führen beide zum Sieg.

### 5. Dringend zuerst: die Zeichenebenen sind durcheinander

Beim Nachweis bei 390×844 lag hinter der Gegnermasse ein **hellblauer Kasten**, und
die Massen waren teils unsichtbar. Ursache: In `erstelleFlaechen` stehen die
Gegnerbilder auf `setDepth(0)` und die eigenen auf `setDepth(1)` — die Fahrbahn
liegt seit dem Umbau aber selbst auf `setDepth(1)`. Die Massen stecken damit hinter
bzw. auf derselben Ebene wie die Straße.

Die Zeichenebenen sind **einmal sauber festzulegen** und als benannte Werte nach
`balanceV2.ts` zu legen (etwa `ebenen: { wasser, strasse, gehsteig, mauer,
gelaender, massen, truppe, schilder, boss }`), statt weiter verstreute Zahlen zu
setzen. Reihenfolge von hinten nach vorn:

1. Wasser und Horizontbänder
2. Fahrbahn
3. Gehsteige
4. Mauern, dann Geländer
5. **Beide Massen und die Truppe** — immer über der Fahrbahn
6. Schilder und deren Beschriftung
7. Zähler
8. Boss und Bosszähler ganz vorn

Jede `setDepth`-Stelle in `src/v2/` zieht ihren Wert künftig aus dieser einen
Quelle. **Keine nackten Zahlen mehr im Szenencode.**

### Zusätzliches Akzeptanzkriterium

- Test: In `src/v2/RunGunV2Scene.ts` steht kein `setDepth(` mit einer nackten Zahl
  mehr — jeder Aufruf verweist auf die Ebenen-Tabelle (Textprüfung, wie
  `v2Geruest` sie für Importe schon macht).
- Im Browser ist hinter den Massen **die Fahrbahn** zu sehen, kein blauer Kasten.
