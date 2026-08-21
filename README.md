# Run & Gun

Ein kostenloses, privates iPhone-PWA-Spiel im Hochformat. Es verwendet nur lokal
gebündelte Dateien und stellt zur Laufzeit keine externen Anfragen.

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

## GitHub Pages vorbereiten

1. Ein öffentliches GitHub-Repository namens `run-gun` anlegen und diesen Stand auf
   den Branch `main` pushen.
2. In GitHub unter **Settings → Pages** bei **Source** die Option **GitHub Actions**
   auswählen.
3. Jeder Push auf `main` baut und veröffentlicht die Seite automatisch. Die Pages-URL
   enthält den Pfad `/run-gun/`.

Vor einem Deploy lokal `npm run build` und `npm run check` ausführen.

## Abnahme-Checks (E6)

**Offline-Start:** Das installierte Spiel per USB mit Safari Web Inspector verbinden,
im Netzwerk-Tab die Verbindung des iPhones deaktivieren und mehrere Läufe starten. Die
Request-Liste muss dabei leer bleiben; die Strings `phaser.io` und `bit.ly` im Bundle sind
nur Phasers Konsolen-Banner, keine Anfragen.

**Update sichtbar:** Nach einem Deploy das installierte Spiel einmal öffnen, dann per
Force-Quit vollständig beenden und erneut starten. Die neue Version muss danach sichtbar
sein; so wird geprüft, dass der aktualisierte Service Worker übernommen wurde.
