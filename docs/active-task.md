# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Probefigur einbauen — KI-Sprite ersetzt das Platzhalter-Rechteck des Spielers**

Thomas hat `assets/probe/r3/figur-r3-2-34x46.png` gewählt (rote Figur von
hinten, 34×46, transparent). Diese Datei wird der Spieler-Sprite. Das bisherige
Platzhalter-Rechteck (`createPlayerTexture()` in `BootScene`) entfällt.

Größe und Physik bleiben unverändert: Die Datei ist exakt 34×46 — genau die
Maße der bisherigen Platzhalter-Textur. Der Physik-Body hängt an der
Texturgröße und darf sich **nicht** ändern.

## Anforderungen

### 1. Asset ins Projekt

`assets/probe/r3/figur-r3-2-34x46.png` nach **`src/assets/player.png`**
kopieren (Ordner neu anlegen). Original in `assets/probe/` liegen lassen.

Der Import-Weg über `src/` ist Pflicht, **nicht** über `public/`: Vite löst den
Import gegen `base: '/run-gun/'` auf, ein handgeschriebener `public/`-Pfad würde
auf GitHub Pages im Unterpfad brechen.

### 2. `src/scenes/BootScene.ts` — laden statt zeichnen

- Oben importieren: `import playerUrl from '../assets/player.png'`
  (`vite/client`-Typen sind in `tsconfig.json` bereits eingetragen, der Import
  typt also ohne zusätzliche Deklarationsdatei).
- Neue Methode `preload()` anlegen:
  `this.load.image('player', playerUrl)`.
  Phaser führt `preload()` vor `create()` aus; der bestehende
  `this.scene.start('GameScene')` bleibt am Ende von `create()` stehen.
- `createPlayerTexture()` samt Aufruf in `create()` **löschen**.
- Alle anderen `create*Texture()`-Methoden bleiben unverändert.

### 3. `src/systems/crowd.ts` — Texturschlüssel umstellen

Beide Vorkommen von `'player-placeholder'` (Zeilen 19 und 25) auf `'player'`
ändern. Sonst nichts in der Datei anfassen.

Danach darf `'player-placeholder'` im gesamten `src/` nicht mehr vorkommen.

### 4. `.gitignore`

Zeile `assets/probe/` ergänzen — die Probebilder bleiben lokal, sollen aber
nicht ins Repo. `src/assets/player.png` ist davon **nicht** betroffen und wird
committet.

## Akzeptanzkriterien

1. `npm run check` (tsc) und `npm run build` laufen fehlerfrei.
2. `src/assets/player.png` existiert, ist exakt 34×46 Pixel und hat Transparenz.
3. `grep -r "player-placeholder" src/` liefert keinen Treffer.
4. `BootScene` hat `preload()` mit `this.load.image('player', playerUrl)` und
   keine `createPlayerTexture()`-Methode mehr.
5. `.gitignore` enthält `assets/probe/`.
6. Keine Änderungen an `balance.ts`, `main.ts`, `public/` oder `package.json`.

## Reißleine
Kleiner Drei-Dateien-Task. Läuft er nicht im ersten Anlauf plus einem
Nacharbeitszyklus grün, stoppen und Thomas informieren — insbesondere **nicht**
auf einen `public/`-Pfad ausweichen, wenn der Import zickt.

## Implementation Summary
Die gewählte KI-Probe `assets/probe/r3/figur-r3-2-34x46.png` wurde unverändert
nach `src/assets/player.png` übernommen (34×46, RGBA mit Transparenz). `BootScene`
lädt sie über den Vite-Import in `preload()` unter dem Schlüssel `player`; die
gezeichnete Platzhalter-Textur entfällt. `Crowd` verwendet ausschließlich
`player`; die lokalen Probedateien sind über `assets/probe/` ignoriert.

Validierung: `npm run check && npm run build` erfolgreich (Exit 0; 21 Module,
PWA-Dateien erzeugt). Die statischen Prüfungen bestätigen Größe, Alpha-Kanal,
keinen Resttreffer für `player-placeholder` und unveränderte geschützte Dateien.
Der vorgesehene sichtbare Terminal-Start war nicht möglich, da die Umgebung
keine Anwendung namens `Terminal` findet; daher lief dieselbe Prüfung direkt im
Projektprozess.

## Review Notes
Diff exakt nach Spec: Asset über Vite-Import statt `public/`-Pfad, `preload()`
lädt `'player'`, `createPlayerTexture()` entfernt, beide Vorkommen in
`crowd.ts` umgestellt, `assets/probe/` ignoriert.

Selbst verifiziert (nicht nur Codex' Bericht):
- `src/assets/player.png` ist 34×46 RGBA und bytegleich mit der von Thomas
  gewählten Probe `assets/probe/r3/figur-r3-2-34x46.png` → Physik-Body unverändert.
- `grep -r "player-placeholder" src/` ohne Treffer.
- `npm run check` und `npm run build` Exit 0 (nur die bekannte Chunk-Warnung).
- Vite inlined das 2261-Byte-PNG als data-URI ins Bundle (unter dem 4-KB-Limit);
  damit gibt es keinen separaten Request und der Offline-Betrieb bleibt gedeckt.
- Vite-Preview im iPhone-Format per Screenshot geprüft: Figur wird gerendert,
  kein Missing-Texture-Rechteck, keine Konsolenfehler.

Offen und bewusst nicht als erfüllt gewertet: die Optik-Abnahme am echten iPhone
durch Thomas. Aufgefallen dabei: Spielerfigur und Gegner-Rechteck sind beide rot
— beim Gegner-Sprite später auf eine andere Farbfamilie gehen.
