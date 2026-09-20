# Aktive Aufgabe

Status: IDLE

## Aufgabe

(keine)

## Letzter Stand — Run Gun V2

Thomas hat die Arbeit am 2026-09-20 abends unterbrochen: *"lassen wir es gut sein
fürs erste ... dauert alles zu lange und viel zu umständlich - und irgendwie wird
es nicht wie es sein soll"*. Kein offener Auftrag, nichts in Arbeit.

Wer hier weitermacht, findet den Stand so vor:

**Gebaut und gemessen.** Run Gun V2 läuft als eigener Modus, vollständig getrennt
vom bestehenden Spiel (kein gemeinsamer Code, kein Speicherzugriff — durch Test
abgesichert). Zwei Abschnitte: Die Horde marschiert allein auf die Truppe zu und
erreicht sie nach 63 Sekunden; ist sie aufgerieben, übernimmt der Boss von ihrer
letzten Stelle aus. Links sammelt man Menge (dabei ruht der Nachschub), rechts
baut man Wände ab, die den Torfaktor dauerhaft heben. Gemessene Spanne: passiv,
5 s und 10 s Sammeln verlieren; ab 15 s Sammeln oder mit einer abgebauten Wand
gewinnt man nach 41 bis 60 Sekunden. Die Spanne ist in `tests/v2Balance.test.ts`
festgeschrieben.

**Was offen blieb — Thomas' eigene Einschätzung war, dass es "nicht wird, wie es
sein soll".** Konkret benannt und nicht umgesetzt:
- Die Bahn ist gerade; im Vorbildvideo (112.mov) macht sie eine Kurve.
- Die eigene Truppe ist eine Traube (so gewünscht); im Video stehen geordnete Reihen.
- Der Hintergrund ist Wasser (so gewünscht); im Video eine Schneelandschaft.
- Beim Sieg bleibt ein Rest der roten Masse stehen — gewonnen wird über den Boss.

**Vor dem Weiterbauen lesen:** `docs/lessons.md`. Die Einträge vom 2026-09-20
erklären die teuersten Fehler dieser Sitzung — darunter zwei, die Thomas mehrfach
melden musste, bevor sie gefunden waren.
