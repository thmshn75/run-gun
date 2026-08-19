# Architektur: Run & Gun

Verbindlicher Umsetzungsplan mit vollständiger Architektur, Etappen und Akzeptanzkriterien:
`docs/plan.md`. Diese Datei hält nur den Stack-Überblick und das Entscheidungslog.

## Stack

| Layer | Technologie |
|-------|-------------|
| Engine | Phaser 3 (Arcade Physics) |
| Sprache/Build | TypeScript + Vite |
| PWA | vite-plugin-pwa (`registerType: 'autoUpdate'`, `virtual:pwa-register`) |
| Speicherung | localStorage (`rungun_save_v1`, versioniert) + JSON-Export/Import |
| Hosting | GitHub Pages via GitHub Actions (Default, public Repo) — Fallback Cloudflare Pages |
| Backend / Accounts / APIs | keine (harte Vorgabe) |

## Ordnerstruktur

```
src/        ← Produktivcode (scenes/, systems/, config/balance.ts)
tests/      ← Unit-Tests für reine Logik (save, upgrades)
docs/       ← Spezifikationen, Plan, Architektur
public/     ← Manifest-Assets, Icons, .nojekyll
```

## Entscheidungslog

| Datum | Entscheidung | Begründung |
|-------|-------------|------------|
| 2026-08-19 | Projekt initialisiert | /newproject |
| 2026-08-19 | Plan V1 erstellt und durch 2×2 Critic-Runden gehärtet (Premortem + Angriffssicht, je Sonnet) | Spec-Härtung nach globaler Regel; Befunde direkt in docs/plan.md eingearbeitet |
| 2026-08-19 | Etappenschnitt: Infrastruktur (Deploy/PWA/Subpfad) als E1 vor dem Gameplay | Deploy-Risiko in der billigsten Etappe aufdecken statt am Ende |
| 2026-08-19 | localStorage statt IndexedDB, plus Pflicht-Export/Import in E4 | Datenmenge winzig; iOS kann WebKit-Storage still verwerfen |
| 2026-08-19 | GitHub Pages als Default, Cloudflare Pages als Fallback | Bestehender GitHub-Account; Free-Plan erfordert public Repo |
