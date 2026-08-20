# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task
**Update-Pfad der PWA reparieren + Salvengröße auf 8**

Zwei Punkte aus Thomas' drittem iPhone-Test. Der erste ist ein Betriebsmangel, der die
gesamte Test-Rückmeldeschleife blockiert; der zweite ist eine Balance-Entscheidung.

**Nicht Teil dieses Tasks:** E4b (Zusatzwaffen + Waffen-Tore), E4c (Gegner als Truppen),
Hintergrundgestaltung, Torlogik, Formation, Kollision, Drag.

## Befund zu Teil 1 (nachgeprüft, nicht vermutet)

Nach dem Deploy von `e2b2fba` liefert der Server nachweislich die neue Fassung aus: In
`assets/index-CGY24OHT.js` kommt die Zeichenkette `GUNS` null Mal vor, `shootersPerSalvo`
und `salvoCursor` sind enthalten. Auf Thomas' iPhone erschien trotzdem weiter die alte
Version mit GUNS-Anzeige und GUNS-Toren.

Ursache ist der normale Ablauf einer installierten PWA: Beim Start rendert die App aus dem
Cache des Service Workers, prüft erst danach im Hintergrund auf eine neue Fassung und lädt
sie herunter. `skipWaiting` und `clientsClaim` sind in `vite.config.ts` bereits gesetzt, der
neue Service Worker übernimmt also — aber die **bereits laufende Seite** lädt sich nicht neu.
Sichtbar wird die neue Version deshalb frühestens beim übernächsten Start. Verschärfend:
iOS friert eine weggewischte PWA häufig nur ein, statt sie zu beenden; dann findet gar keine
neue Prüfung statt und der Zustand kann beliebig lange bestehen bleiben.

Das ist auch das E6-Kriterium „neue Version wird nach Force-Quit + Neuöffnen sichtbar" —
es wird hier vorgezogen, weil sonst jeder weitere iPhone-Test die vorletzte Version prüft.

## Anforderungen

### 1. `src/main.ts` — App lädt sich nach einem Update selbst neu

`registerSW` wird um Update-Behandlung erweitert. `vite.config.ts` bleibt **unverändert** —
`registerType: 'autoUpdate'`, `skipWaiting` und `clientsClaim` sind bereits richtig gesetzt;
was fehlt, ist ausschließlich das Neuladen der laufenden Seite.

Zu implementieren, in dieser Logik:

- Vor der Registrierung merken, ob die Seite bereits von einem Service Worker bedient wird:
  ```ts
  const hadController = navigator.serviceWorker?.controller != null
  ```
  **Das ist Pflicht:** Bei der allerersten Installation übernimmt der Service Worker durch
  `clientsClaim` ebenfalls, ohne dass eine neue Version vorliegt. Ohne diese Abfrage würde
  die App bei jedem Erstbesuch einmal grundlos neu laden.
- Ein `controllerchange`-Listener auf `navigator.serviceWorker` löst das Neuladen aus,
  aber nur wenn `hadController` wahr ist und noch kein Neuladen läuft (Flag gegen
  Doppelauslösung).
- **Kein Neuladen mitten im Spiel.** Regel:
  - Passiert der Wechsel innerhalb der ersten 5000 ms nach dem Laden (`performance.now()`),
    sofort `location.reload()`. Das ist der Normalfall: Der Nutzer startet die App, der
    Service Worker aktualisiert kurz darauf, und die neue Version ist noch im selben Start
    sichtbar.
  - Danach wird nur ein Merker `pendingReload = true` gesetzt und das Neuladen auf den
    nächsten Wechsel nach `document.visibilityState === 'visible'` verschoben. Damit
    passiert es beim Zurückholen der App, nie in einem laufenden Run.
- Zusätzlich beim Sichtbarwerden aktiv auf Updates prüfen:
  ```ts
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) { /* Registration merken */ },
  })
  ```
  und bei `visibilitychange` auf `'visible'` `registration?.update()` aufrufen. Grund: iOS
  friert die PWA ein; ohne diesen Anstoß prüft sie beim Zurückholen von selbst nicht.
- Der Code gehört vor die Erzeugung der `Phaser.Game`-Instanz und darf beim Fehlen von
  `navigator.serviceWorker` (Desktop-Dev ohne HTTPS) **nicht** werfen — überall optional
  zugreifen.

### 2. `src/config/balance.ts` — Salvengröße 8

- `crowd.shootersPerSalvo` von `5` auf `8`.
- `crowd.damagePerExtraFigure` von `0.12` auf `0.14`. **Grund, nicht optional:** Der
  Schadensmultiplikator rechnet `1 + (TEAM − shootersPerSalvo) × damagePerExtraFigure`.
  Steigt die Salvengröße auf 8, ohne den Faktor anzuheben, erreicht eine volle Truppe nur
  noch `1 + 22 × 0,12 = 3,64` statt des vorgesehenen Vierfach-Caps. Mit `0,14` sind es
  `1 + 22 × 0,14 = 4,08`, der Cap 4 wird bei Truppengröße 30 also genau erreicht.
- `pools.projectiles` von `64` auf `96`, mit neu hergeleitetem Kommentar:
  8 Schuss/s (RATE-Cap) × 8 Figuren pro Salve × 1,12 s Flugzeit = 72 gleichzeitig aktive
  Projektile; 96 lässt Reserve.
- `crowd.damageMultiplierCap` bleibt bei `4`. Alle übrigen Werte unverändert.

### 3. Keine weiteren Codeänderungen

Der Rundlauf in `crowd.ts` und `fire()` in `weapons.ts` lesen `shootersPerSalvo` bereits aus
`BALANCE` — dort ist **nichts** anzupassen. Wirkung der neuen Zahl: Bis Truppengröße 8
feuern alle Figuren gleichzeitig, darüber wandert die Achter-Salve weiter reihum durch die
Truppe (bei TEAM 30 also knapp vier Salven für einen vollen Durchlauf).

## Akzeptanzkriterien

1. `npm run check` und `npm run build` laufen fehlerfrei.
2. `grep -n "controllerchange\|visibilitychange\|pendingReload" src/main.ts` zeigt alle drei
   Bestandteile; `grep -n "hadController" src/main.ts` zeigt die Erstinstallations-Abfrage.
3. `vite.config.ts` ist unverändert (`git diff vite.config.ts` ist leer).
4. Der Dev-Server startet ohne Fehler in der Browser-Konsole, obwohl dort kein Service
   Worker aktiv ist — der Update-Code darf ohne `navigator.serviceWorker` nicht werfen.
   Im Abschlussbericht bestätigen.
5. `BALANCE.crowd.shootersPerSalvo === 8`, `BALANCE.crowd.damagePerExtraFigure === 0.14`,
   `BALANCE.pools.projectiles === 96`.
6. Im Abschlussbericht vorrechnen: Schadensmultiplikator bei Truppengröße 8, 20 und 30
   (erwartet 1,00 / 2,68 / 4,00 nach Cap) sowie die Projektil-Spitzenlast
   (8 × 8 × 1,12 ≈ 72 gegen Pool 96).
7. Die Salvenrotation ist unverändert: `git diff src/systems/crowd.ts src/systems/weapons.ts`
   ist leer.
8. Der eigentliche Beweis für Teil 1 — dass die neue Version am iPhone nach einem Neustart
   erscheint — ist **kein** Codex-Kriterium. Er wird nach dem Deploy geprüft: erst durch
   Abruf der ausgelieferten Datei, dann durch Thomas am Gerät.

## Reißleine
Führt der Reload-Mechanismus zu einer Schleife (App lädt sich beim Start wiederholt neu),
**sofort abbrechen** und nur die Variante mit `pendingReload` behalten, also ausschließlich
beim Zurückholen der App neu laden — nie im 5-Sekunden-Fenster nach dem Start. Eine sich
selbst neu ladende App ist schlimmer als eine, die einen Start hinterherhinkt.

## Nicht ändern
- `vite.config.ts`, `index.html`, `src/systems/crowd.ts`, `src/systems/weapons.ts`,
  `src/systems/formation.ts`, `src/systems/gates.ts`, `src/systems/spawner.ts`,
  `src/systems/upgrades.ts`, `src/scenes/`, `src/config/colors.ts`.
- Alle Balance-Werte außer den drei unter Anforderung 2 genannten.

## Implementation Summary
Update-Handling in `src/main.ts` ergänzt: Vorhandener Service-Worker-Controller wird vor
der Registrierung erfasst; ein Controller-Wechsel lädt innerhalb der ersten fünf Sekunden
einmal neu, später erst beim nächsten Sichtbarwerden. Beim Sichtbarwerden wird außerdem
aktiv `registration.update()` angefordert. Ohne Service Worker bleibt der Pfad durchgehend
optional und wirft daher nicht.

Balance: Salvengröße 8, Schadensfaktor 0,14 und Projektilpool 96; der Pool-Kommentar ist
auf 8 × 8 × 1,12 ≈ 72 aktive Projektile neu hergeleitet. `npm run check` und `npm run build`
waren erfolgreich (nur die bekannte, nicht blockierende Vite-Chunk-Warnung). `vite.config.ts`
sowie `src/systems/crowd.ts` und `src/systems/weapons.ts` sind unverändert.

Offen: Der verlangte Browser-Konsolencheck des Dev-Servers konnte nicht laufen, weil in
dieser Sitzung kein steuerbarer Browser verfügbar ist. Status bleibt deshalb `SPEC_READY`;
die iPhone-Prüfung erfolgt weiterhin erst nach dem Deploy.
