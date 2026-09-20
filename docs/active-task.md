# Aktive Aufgabe

Status: SPEC_READY

## Aufgabe: V6/S1 — Gerüst und Menüknopf für "Run Gun V2"

Verbindlicher Plan: `docs/plan-v6.md`. Diesen Plan zuerst lesen — besonders die
Randbedingungen. Dieser Task ist **Schritt 1 von 8** und bewusst klein.

## Was gebaut wird

1. **Neue Szene** `RunGunV2Scene` in `src/v2/RunGunV2Scene.ts`.
   - Registrierung in `src/main.ts` in der Szenenliste (additiv, keine bestehende
     Zeile ändern).
   - Zeigt: Himmel, Bahn mit zwei Seitenmauern, sonst nichts.
   - Oben links ein Knopf "MENÜ", der zurück zur `MenuScene` führt.
   - Kein Physik-Setup, keine Gegner, keine Truppe — das kommt in S2 bis S7.

2. **Menüknopf** in `src/scenes/MenuScene.ts`: ein zusätzlicher Knopf **"RUN GUN V2"**
   im selben Bereich wie "TESTGELÄNDE / PROBELAUF / TORLAUF", aber in einer eigenen
   Zeile (siehe Layout-Hinweis unten).
   - Er startet `RunGunV2Scene` **direkt**, ohne Levelwahl und ohne Waffenwahl.
   - **Die bestehenden drei Knöpfe und ihr Verhalten bleiben unverändert.**
   - **Achtung Layout:** Die Knopfbreite wird in `MenuScene.ts` als
     `(safeWidth - 2 * sidePadding - 16) / 3` gerechnet — sie ist auf DREI Knöpfe
     festgelegt. Ein vierter Knopf in derselben Zeile macht alle vier zu schmal für
     ihre Beschriftung. Deshalb: **eigene Zeile unter der bestehenden Reihe**, volle
     Breite, mit demselben Abstand wie zwischen den anderen Elementen. Die Rechnung
     für die drei bestehenden Knöpfe darf nicht verändert werden, und was darunter
     liegt (Fortschritt-zurückholen, Shop, Fortsetzen, Spielen) darf nicht verdeckt
     werden — die Reihe wandert entsprechend nach unten oder der neue Knopf setzt
     sich in eine freie Lücke. Im Browser prüfen, dass jeder Knopf vollständig
     sichtbar und antippbar ist.

3. **Eigene Konfiguration** `src/v2/balanceV2.ts` mit den Werten dieses Schritts
   (Bahnbreite, Mauerbreite, Himmelhöhe, Farben). Jeder Wert mit Rechenweg als
   Kommentar, wie im Projekt üblich.

## Harte Grenzen (Thomas 2026-09-20, wörtlich)

- "die bestehenden logiken und spiele die es schon gibt dürfen aber nicht verändert
  werden, auch der shop und das bereits erworbene nicht"
- Erlaubte Änderungen außerhalb von `src/v2/`: **ausschließlich** die Knopfzeile in
  `MenuScene.ts` und die Szenenregistrierung in `main.ts`. Sonst nichts.
- `src/config/balance.ts` wird **nicht** angefasst.
- Kein Zugriff auf Speicherstand, Konto, Upgrades, Waffen.
- Keine Wiederverwendung von `src/systems/*` — auch nicht "nur die eine Funktion".
  Geerbt werden nur Bildschlüssel (`player`, `enemy-*`), und in diesem Schritt noch
  nicht einmal die.

## Akzeptanzkriterien

1. `npm run build` und `npx tsc --noEmit` laufen sauber.
2. Alle bestehenden Tests bleiben grün (derzeit 443).
3. Neuer Test `tests/v2Geruest.test.ts`:
   - `RunGunV2Scene` ist registriert und hat den Schlüssel `RunGunV2Scene`.
   - `src/v2/` importiert nichts aus `src/systems/` und nichts aus
     `src/config/balance`. (Quelltextprüfung über die Import-Zeilen der Dateien in
     `src/v2/` — hier ist sie zulässig, weil genau die Abwesenheit einer Kopplung
     geprüft wird und es dafür kein Verhalten gibt.)
   - **`src/v2/` enthält nirgends die Zeichenketten `localStorage` oder `indexedDB`.**
     Die Import-Prüfung allein genügt nicht: Ein direkter Speicherzugriff unter
     Umgehung von `src/systems/save.ts` käme durch sie hindurch, durch den Build und
     durch jede Diff-Durchsicht — und könnte denselben Schlüssel treffen wie der
     echte Spielstand. Genau das wäre der Bruch der Zusage "auch der Shop und das
     bereits Erworbene nicht".
   - `MenuScene.ts` enthält weiterhin die Starts für Testgelände, Probelauf und
     Torlauf.
   - **Die Breitenrechnung der bestehenden Knopfreihe steht unverändert im Quelltext**
     (`(safeWidth - 2 * BALANCE.menu.sidePadding - 16) / 3`). Ohne dieses Kriterium
     gälte ein vierter Knopf in derselben Reihe formal als "unverändert", obwohl die
     drei bestehenden dadurch von rund 113 px auf 83 px schrumpfen — zu schmal für
     "TESTGELÄNDE".
4. Im Browser: Der Knopf "RUN GUN V2" startet die neue Szene; "MENÜ" führt zurück;
   die drei bestehenden Knöpfe starten unverändert ihre Modi.
5. **Doppelstart in derselben Sitzung:** Menü → RUN GUN V2 → MENÜ → RUN GUN V2 → MENÜ,
   zweimal hintereinander, alle Übergänge fehlerfrei, keine Fehler in der Konsole.
   Phaser-Szenen sind Singletons — `create()` läuft beim zweiten Start auf derselben
   Instanz. Im Torlauf war genau deshalb beim zweiten Start ein Collider still kaputt,
   während der erste Lauf und alle Tests sauber waren (`docs/lessons.md` 2026-09-19).
   Das Muster wird hier schon im leeren Gerüst verankert, bevor Zustand dazukommt.
6. **Sichtprüfung des Menüs:** Alle vier Knöpfe vollständig sichtbar, Beschriftung
   nicht abgeschnitten, nichts verdeckt (Fortschritt-zurückholen, Shop, Fortsetzen,
   Spielen).

## Abschlussbericht

Was geändert, Testergebnisse, was nicht ging und warum. Status am Ende auf
`IMPL_DONE` setzen.
