# Bildabnahme für Bewegungssätze

Prüft einen Satz von zwölf Bewegungsbildern gegen die Kriterien, an denen Block 2 und 3
abgenommen wurden. **Aus dem Projektwurzelverzeichnis aufrufen**, die Skripte lesen
`src/assets/` relativ:

```sh
python3 scripts/bildabnahme/abnahme-leicht.py f g     # 56 x 76 px, enemy-light-*
python3 scripts/bildabnahme/abnahme-schwer.py e g i   # 84 x 104 px, enemy-heavy-*
```

Ausgabe endet mit `ALLES BESTANDEN` (Exit 0) oder `NICHT BESTANDEN` (Exit 1).

## Warum es diese Skripte gibt

Block 2 brauchte **vier Anläufe**, und jeder scheiterte an etwas anderem als der vorige:
erst ein heller Freisteller-Saum, dann derselbe Saum knapp unter die genannte Zahl
gedrückt und die Silhouette dabei zerfranst, dann eine saubere Kante mit
**ausgetauschter Figur**. Das Muster: Wer eine einzelne Schwelle nennt, bekommt Arbeit
an der Schwelle — bezahlt mit dem benachbarten Merkmal, das gerade nicht gemessen wird.

Deshalb prüfen die Skripte alle Merkmale **zusammen**, die gemeinsam „richtig" ergeben:

- Größe, opake Pixelzahl, oberste und unterste Zeile, ein zusammenhängendes Teil
- Volldeckung, ausgefranste Einzelpunkte, heller Saum, Pink/Magenta im Körper
- **Figurentreue**: Farbabstand und Farbverteilung gegen die Vorlagendatei
- je Satz: Größenspanne, Einheitlichkeit der zwölf Bilder, Silhouettenunterschied
  Bild 1 zu 7, kleinster Nachbarabstand

## Die Grenzwerte sind kalibriert, nicht geraten

Alle Schwellen stammen aus den **abgenommenen** Sätzen `light-e` und `light-i` und sind
in beide Richtungen gegengeprüft: Die guten Sätze bestehen mit Reserve, die bekannten
Fehlversuche fallen an genau ihrem Fehler durch. Zum Nachvollziehen:

```sh
python3 scripts/bildabnahme/abnahme-leicht.py e i   # muss bestehen
```

## Was die Skripte NICHT können

Sie ersetzen den Augenschein nicht. Jeder der drei Fehlschläge war auf einem
vergrößerten Kontaktbogen in Sekunden zu sehen, zwei davon hatten die jeweils geltende
Messung bestanden. Ein Satz wird zusätzlich vergrößert **neben die Vorlage gelegt und
angesehen**, bevor er abgenommen wird.

Ebenso ungeprüft bleibt die Bewegungsgeschwindigkeit: Wie schnell ein Satz laufen darf,
steht in `BALANCE.enemy.bilder.gangarten` und wird von `tests/gangarten.test.ts`
gehalten — maßgeblich ist dort die Änderung je Sekunde, nicht der Takt.

Hintergrund und die Lehren im Einzelnen: `docs/lessons.md`, Einträge vom 2026-09-04
und 2026-09-05.
