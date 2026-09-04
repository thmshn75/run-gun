# Active Task

## Status
`APPROVED`
<!-- Werte: IDLE → SPEC_READY → IMPL_DONE → APPROVED → IDLE -->

## Task

**Vierter Anlauf: `light-f` und `light-g` — saubere Kante UND dieselbe Figur.**

Drei Anläufe sind gescheitert, jeder an etwas anderem. **Das Muster ist immer dasselbe:
Das jeweils genannte Kriterium wurde erfüllt und das nicht Gemessene ging kaputt.**
Deshalb misst das Prüfskript diesmal alle drei Dinge zusammen. Es gibt keinen Weg mehr,
eines davon gegen ein anderes einzutauschen.

| Anlauf | Was erfüllt war | Was kaputtging |
|---|---|---|
| 1 | Bewegung, Pixelmaße | heller Freisteller-Saum |
| 2 | „höchstens 1 % Randpixel über 200" — formal bestanden | Saum blieb sichtbar, Silhouette zerfranst |
| 3 | Kante sauber, Skript bestanden | **die Figur wurde ausgetauscht**, dazu Magenta-Flecken |

Im dritten Anlauf kam statt der hageren orangeroten Gestalt mit Kapuze eine massige
braune Gestalt heraus, und statt des dünnen Kerls mit Hut und offener Weste ein
kräftiger Mann in geschlossener blauer Uniformjacke. Farbabstand zur Vorlage 92 und 61,
wo die abgenommenen Sätze bei 13 und 20 liegen.

## Was zu liefern ist

Zwei Sätze zu je zwölf Bildern, alle **56 × 76 px**, die die bestehenden Dateien
ersetzen:

| Dateien | Vorlage | Ihre Bewegung |
|---|---|---|
| `enemy-light-f-move-1..12.png` | `src/assets/enemy-light-f.png` | **KRIECHEND VORGEBEUGT** |
| `enemy-light-g-move-1..12.png` | `src/assets/enemy-light-g.png` | **ZUCKEN** |

**Die Vorlage ist verbindlich, nicht ihre Beschreibung.** Zuerst
`src/assets/enemy-light-f.png` und `src/assets/enemy-light-g.png` ansehen und die
Figur von dort übernehmen: Statur, Kleidung, Hautton, Farben, Kopfbedeckung, Schuhwerk
oder Barfüßigkeit. **Die Vorlage als Referenzbild in die Bilderzeugung geben, nicht nur
in Worten beschreiben** — die Textbeschreibung allein hat im dritten Anlauf zu einer
anderen Figur geführt.

**KRIECHEND VORGEBEUGT (`light-f`):** Extrem tief gebeugt, fast auf allen vieren.
Oberkörper weit nach vorn gekippt, Arme hängen bis fast zum Boden und greifen abwechselnd
nach vorn, Beine schieben nach. Wirkt tierisch, nicht menschlich.

**ZUCKEN (`light-g`):** Ruckartig und krampfhaft, **am Platz**. Der Körper bewegt sich
kaum von der Stelle, dafür zucken Kopf, Schultern und Arme in harten, unregelmäßigen
Stößen. Die Beine machen nur kleine, unsichere Schritte. **Keine ausladenden
Ganzkörperposen** — im dritten Anlauf war ein Bild mit senkrecht ausgestrecktem Arm
dabei, das ist kein Zucken.

## Der Weg, der alle drei Anforderungen zugleich erfüllt

1. **Vorlage als Referenzbild** in die Bilderzeugung geben. Groß erzeugen, nie
   hochskalieren, **auf transparentem Grund**.
2. Auf 56 × 76 herunterrechnen.
3. **Alpha hart schwellen:** ≥ 128 wird 255, alles darunter 0. Keine halbtransparenten
   Pixel übrig lassen.
4. **Randpixel-Farbe aus dem nächstinneren Pixel nachziehen**, statt die vom Skalierer
   mit dem Hintergrund gemischte Farbe stehen zu lassen. Das behebt den hellen Saum —
   im dritten Anlauf hat genau das funktioniert.
5. **Die Farben auf die Palette der Vorlage abbilden.** Jede Farbe des fertigen Bildes
   auf die nächstliegende Farbe der Vorlagendatei ziehen. Das hält die Figur farblich
   an der Vorlage und entfernt zugleich die pinken und magentafarbenen Ausreißer, die im
   dritten Anlauf an Händen und Füßen saßen — Pink kommt in keiner der Vorlagen vor.
6. Erst danach messen.

**Achtung, das ist keine Einladung zum Umfärben:** Die Figur muss erkennbar dieselbe
sein, nicht nur farblich passend eingestellt. Die Bilder werden zusätzlich vergrößert
neben die Vorlage gelegt und angesehen. Ein Satz, der das Skript besteht und daneben
sichtbar eine andere Gestalt zeigt, wird wieder abgelehnt.

## Abnahme: das Prüfskript entscheidet

```
python3 /private/tmp/claude-501/-Users-mcbooktehn-1-Projekte-Run-Gun/a01e2688-06ab-436b-af35-c43521826646/scratchpad/abnahme-check.py f g
```

Es muss **`ALLES BESTANDEN`** ausgeben (Exit 0).

**Alle Grenzwerte sind an den abgenommenen Sätzen `light-e` und `light-i` kalibriert.**
Zum Nachvollziehen: `python3 /private/tmp/claude-501/-Users-mcbooktehn-1-Projekte-Run-Gun/a01e2688-06ab-436b-af35-c43521826646/scratchpad/abnahme-check.py e i` läuft durch — die Grenzen sind
also erreichbar, sie sind an echten, freigegebenen Bildern derselben Reihe gemessen.

Geprüft wird je Bild: Größe, opake Pixelzahl, oberste und unterste Zeile, ein
zusammenhängendes Teil, Volldeckung, ausgefranste Einzelpunkte, heller Saum,
**Pink/Magenta im Körper**, Magenta am Rand, **Farbabstand zur Vorlage** und
**Farbverteilung gegen die Vorlage**. Je Satz zusätzlich: **Größenspanne zwischen den
zwölf Bildern**, **Einheitlichkeit der zwölf Bilder untereinander**,
Silhouettenunterschied 1 zu 7 und kleinster Nachbarabstand.

Dies ist ein **reiner Bild-Auftrag**. **Kein Code ändern. Das Prüfskript nicht ändern.**

## Was ausdrücklich KEIN zulässiger Ersatz ist

- **`enemy-light-e-move-*` oder `enemy-light-i-move-*` anfassen** — abgenommen, per
  Prüfsumme kontrolliert.
- **Eine andere Gestalt liefern als die der Vorlage.** Das war der Fehler des dritten
  Anlaufs.
- **Den vorhandenen Bildern Pixel abtragen.** Das war der Fehler des zweiten Anlaufs.
- **An einem Zahlenwert arbeiten statt an der Sache.**
- **Vorhandene Sätze anfassen** (`enemy-lurch-*`, `enemy-light-lurch-*`,
  `enemy-heavy-lurch-*`, `enemy-standard-*-move-*`).
- **Programmatisch zeichnen. Code ändern. Das Prüfskript ändern.**

## Reihenfolge und Reißleine

Erst `light-g`, dann `light-f`. Je Satz **drei Anläufe**. Besteht ein Satz danach
nicht, **die alten Dateien unverändert stehen lassen** und im Abschlussbericht sagen,
welches Kriterium hartnäckig gescheitert ist und was dabei versucht wurde — keine
Notlösung, kein Kompromiss zulasten eines anderen Kriteriums.

## Abschlussbericht

Status auf `IMPL_DONE` setzen. Anzugeben: die **vollständige Ausgabe des Prüfskripts**,
je Satz die Zahl der Anläufe, ob die Vorlage als Referenzbild verwendet wurde, welcher
der sechs Schritte oben den Ausschlag gab, und die Bestätigung per SHA-256, dass
`light-e` und `light-i` unverändert sind.

## Implementation Summary

Vierter Anlauf, angenommen. `light-f` (Kriechen) und `light-g` (Zucken) sind neu erzeugt,
diesmal mit der Vorlage als Referenzbild und Abbildung auf deren Farbpalette. Damit sind
alle drei Fehler der Vorlaeufer zugleich behoben: kein heller Freisteller-Saum, keine
pinken Ausreisser, und die Figuren entsprechen wieder ihren Vorlagen.

Geprueft mit `abnahme-check.py` (Grenzwerte an den abgenommenen Saetzen `light-e`/`light-i`
kalibriert, in beide Richtungen gegengeprueft): beide Saetze ALLES BESTANDEN. Zusaetzlich
vergroessert neben die Vorlage gelegt und angesehen. `light-e` und `light-i` per SHA-256
unveraendert. `npm run check` fehlerfrei, 33 Testdateien mit 346 Tests bestanden.

Einschraenkung: Der Codex-Lauf lief am Ende in sein Nutzungslimit und lieferte keinen
Abschlussbericht. Die Freigabe stuetzt sich auf die eigene Messung und den Augenschein.

Damit ist Block 2 komplett: `light-e` rennt, `light-f` kriecht, `light-g` zuckt,
`light-i` humpelt. Offen bleibt Block 3 (drei schwere Gestalten).

---

## Wo die Historie steht

Diese Datei traegt nur den LAUFENDEN Task. Der Stand des Projekts und alle
abgeschlossenen Arbeiten stehen in `docs/UEBERGABE.md`, die Regeln in `docs/lessons.md`.
