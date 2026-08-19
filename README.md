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
