# Run & Gun

Ein kostenloses, privates iPhone-PWA-Spiel im Hochformat: Auto-Runner-Shooter mit
mitlaufender Truppe. Kein App Store, keine Accounts, kein Backend, keine laufenden
Kosten. Alle Dateien sind lokal gebündelt, zur Laufzeit gibt es **keine** externen
Anfragen.

Live: https://thmshn75.github.io/run-gun/

## Wie es sich spielt

Die Truppe läuft von selbst nach vorn und schießt automatisch. Gesteuert wird nur
seitwärts — und genau darin liegt das Spiel, weil links, rechts und in der Mitte
Verschiedenes passiert:

- **Mitte — Kampf.** Gegner laufen in Horden über die ganze Straßenbreite an. Die
  Feuerlinie der Truppe ist schmaler als der Anflugbereich: Was daneben läuft, kommt
  durch. Wer die Truppenhöhe passiert, ohne getötet zu werden, **kostet Figuren**
  (ab Level 2).
- **Links — Sammelbahn.** Eine durchgehende Kette von Plättchen, die durch Hineinfahren
  eingelöst werden: blau `+1`, rot zieht ab. Bloßes Streifen sammelt nicht — man muss
  zur Hälfte in der Bahn stehen. So kann man am linken Rand kämpfen, ohne ungewollt
  rote Kacheln mitzunehmen.
- **Rechts — Feuerkraft.** Zerschießbare Wandsegmente, jedes mit einem Gewinn: Waffe
  (selten, mit Garantie nach Nieten), sonst Schaden oder Feuerrate. Der Preis ist
  Feuerzeit, in der keine Gegner getroffen werden.

Am Ende jedes Levels steht ein Boss. Er schießt nicht, sondern ruft Horden und rückt
langsam vor.

## Lokal starten

```sh
npm install
npm run dev
```

Der konfigurierte GitHub-Pages-Unterpfad ist verpflichtend: Im Dev-Server liegt das
Spiel unter `http://localhost:5173/run-gun/`. Die Root-URL `/` zeigt erwartungsgemäß
nichts an.

```sh
npm run build
npm run preview
```

Die Vorschau ist unter `http://localhost:4173/run-gun/` erreichbar. Nur in der
Vorschau wird der Service Worker erzeugt; im Dev-Server fehlt er absichtlich.

## Prüfen

```sh
npm run check      # Typprüfung
npm test           # Testsuite
npm run test:dist  # Build plus Testsuite - das gilt vor einem Deploy
```

Längere Läufe (Testsuite, Codex-Handoffs) gehören ins Terminal, nicht in die
VS-Code-Extension — siehe `docs/UEBERGABE.md`.

## Wo was steht

| Datei | Inhalt |
|---|---|
| `src/config/balance.ts` | **Alle** Tuning-Werte, jeder mit Herleitung als Kommentar |
| `src/systems/walls.ts`, `wallPlan.ts`, `wallPattern.ts` | Wände links und rechts |
| `src/systems/spawner.ts`, `squads.ts`, `spawnLanes.ts` | Gegner und Horden |
| `src/systems/crowd.ts`, `formation.ts` | Eigene Truppe |
| `src/systems/boss.ts`, `bossPlan.ts` | Boss |
| `src/systems/roadGeometry.ts` | Perspektive, Straßenbreite, Spurumrechnung |
| `docs/plan-v2.md` | Der verbindliche Etappenplan |
| `docs/UEBERGABE.md` | Wo die Arbeit steht |
| `docs/lessons.md` | Teuer bezahlte Regeln — vor dem Arbeiten lesen |

Grundregel für Änderungen: **Nie eine Größe raten, die das Spiel messen kann.**
Balance-Zahlen werden aus `balance.ts` abgeleitet und der Rechenweg steht als Kommentar
daneben.

## GitHub Pages

1. Ein öffentliches GitHub-Repository namens `run-gun` anlegen und diesen Stand auf
   den Branch `main` pushen.
2. In GitHub unter **Settings → Pages** bei **Source** die Option **GitHub Actions**
   auswählen.
3. Jeder Push auf `main` baut und veröffentlicht die Seite automatisch. Die Pages-URL
   enthält den Pfad `/run-gun/`.

Deploy verifizieren:

```sh
gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status
```

## Abnahme-Checks (W6)

Diese vier Punkte sind die V2-Abnahme. Die ersten drei sind am 2026-08-23 am Desktop
belegt worden (Werte unten); der vierte ist Thomas' Urteil am iPhone und ersetzt keine
der Messungen.

**1. Offline-Start.** Das installierte Spiel per USB mit Safari Web Inspector verbinden,
im Netzwerk-Tab die Verbindung des iPhones deaktivieren und mehrere Läufe starten. Die
Request-Liste muss leer bleiben.
*Am Desktop belegt:* Bei gestopptem Server lädt die App vollständig aus dem
Service-Worker-Cache (28 Einträge). Während 12 Sekunden Spiel: **0 Requests**, davon 0
externe. Die Strings `phaser.io` und `bit.ly` im Bundle sind Phasers Konsolen-Banner,
keine Anfragen.

**2. Update sichtbar.** Nach einem Deploy das installierte Spiel einmal öffnen, dann per
Force-Quit vollständig beenden und erneut starten. Die neue Version muss danach sichtbar
sein.
*Wie es gebaut ist:* `registerType: 'autoUpdate'` mit `skipWaiting`. Ein Update lädt die
Seite **nicht mitten im Spiel** neu — `src/main.ts` merkt sich den Wechsel und führt ihn
erst aus, wenn die App das nächste Mal sichtbar wird.

**3. Volllast ruckelt nicht.** Höchstes Level, volle Truppe, Schrotflinte (die meisten
Projektile), Boss aktiv, Wände beidseitig, durchgehende Häuserzeilen.
*Am Desktop gemessen* (900 Bilder): Spiellogik **0,3 ms je Bild** im Mittel, 0,5 ms im
95. Perzentil, 0,7 ms im schlechtesten Fall — bei einem 60-fps-Budget von 16,67 ms sind
das **3 % Auslastung**. Gleichzeitig 68 Gegner und 311 sichtbare Objekte, gemessene
Bildrate 60/s. **Einschränkung:** Gemessen ist die Rechenzeit, nicht das Zeichnen; am
iPhone kann die Grafik der Engpass sein. Deshalb bleibt Punkt 4 nötig.

**4. Spielgefühl am iPhone** (Thomas). Gamefeel und Optik gelten grundsätzlich erst nach
einem Test am echten Gerät als erfüllt, nie nach Desktop-Vorschau allein.
