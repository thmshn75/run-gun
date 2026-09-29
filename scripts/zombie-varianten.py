#!/usr/bin/env python3
"""Färbt die UV-Flächen von Hose und Körper der fertigen Zombie-GLB um."""
import io
import json
import struct
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

pfad = Path('src/v3d/modelle/v3d-zombie.glb')
daten = pfad.read_bytes()
if daten[:4] != b'glTF':
    raise ValueError('Keine GLB-Datei')
pos = 12
segmente = []
while pos < len(daten):
    laenge, art = struct.unpack_from('<I4s', daten, pos)
    pos += 8
    segmente.append((art, daten[pos:pos + laenge]))
    pos += laenge
modell = json.loads(next(x for art, x in segmente if art == b'JSON'))
bin_daten = next(x for art, x in segmente if art == b'BIN\0')


def accessor(n):
    a = modell['accessors'][n]
    sicht = modell['bufferViews'][a['bufferView']]
    typ = {5123: 'H', 5125: 'I', 5126: 'f'}[a['componentType']]
    teile = {'SCALAR': 1, 'VEC2': 2}[a['type']]
    schritt = sicht.get('byteStride', struct.calcsize('<' + typ * teile))
    start = sicht.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack_from('<' + typ * teile, bin_daten, start + i * schritt)
            for i in range(a['count'])]


bild = modell['images'][0]
sicht = modell['bufferViews'][bild['bufferView']]
original = Image.open(io.BytesIO(bin_daten[sicht['byteOffset']:
                                           sicht['byteOffset'] + sicht['byteLength']])).convert('RGB')
if original.size != (512, 512):
    raise ValueError('Bemalung muss 512 × 512 sein')

masken = {teil: Image.new('L', original.size) for teil in ('Body', 'Bottoms')}
for mesh in modell['meshes']:
    teil = mesh['name'].split('__')[0]
    if teil not in masken:
        continue
    zeichner = ImageDraw.Draw(masken[teil])
    for primitive in mesh['primitives']:
        uv = accessor(primitive['attributes']['TEXCOORD_0'])
        ind = accessor(primitive['indices'])
        for i in range(0, len(ind), 3):
            punkte = [(round(uv[ind[j][0]][0] * 511),
                       round(uv[ind[j][0]][1] * 511)) for j in (i, i + 1, i + 2)]
            zeichner.polygon(punkte, fill=255)
if any(not maske.getbbox() for maske in masken.values()):
    raise ValueError('UV-Fläche für Body oder Bottoms fehlt')


def blutflecken(teil, anzahl):
    """Kleine weiche Flecken, deren Deckkraft auf die Teilnetz-UVs begrenzt bleibt."""
    maske = masken[teil]
    obere_grenze = 310 if teil == 'Body' else 504
    punkte = [(x, y) for y in range(8, obere_grenze) for x in range(8, 504)
              if maske.getpixel((x, y)) and all(maske.getpixel((x + dx, y + dy))
                                             for dx, dy in ((-5, 0), (5, 0), (0, -5), (0, 5)))]
    if not punkte:
        return Image.new('L', original.size)
    flecken = Image.new('L', original.size)
    zeichner = ImageDraw.Draw(flecken)
    for i in range(anzahl):
        x, y = punkte[((i + 1) * len(punkte)) // (anzahl + 1)]
        rx, ry = 3 + i % 3, 4 + (i * 2) % 4
        zeichner.ellipse((x - rx, y - ry, x + rx, y + ry), fill=155 + (i % 2) * 35)
    flecken = flecken.filter(ImageFilter.GaussianBlur(2))
    # Auch der weichgezeichnete Rand darf keine andere UV-Insel anfärben.
    return Image.frombytes('L', original.size,
                           bytes(min(a, b) for a, b in zip(flecken.tobytes(), maske.tobytes())))


blut = Image.frombytes('L', original.size,
                       bytes(max(a, b) for a, b in zip(blutflecken('Body', 3).tobytes(),
                                                        blutflecken('Bottoms', 3).tobytes())))
ausgabe = Path('src/v3d/bilder')
ausgabe.mkdir(exist_ok=True)
varianten = [original]
for variante in ('b', 'c'):
    neu = original.copy()
    px = neu.load()
    koerper = masken['Body'].load()
    hose = masken['Bottoms'].load()
    flecken = blut.load()
    werte = []
    for y in range(512):
        for x in range(512):
            if not (koerper[x, y] or hose[x, y]):
                continue
            r, g, b = px[x, y]
            if koerper[x, y]:
                # Helligkeitsdetails bleiben erhalten; die gesamte Haut bekommt denselben Farbstich.
                if variante == 'b':
                    farbe = (r * .77 + 19, g * .85 + 25, b * .75 + 19)
                else:
                    farbe = (r * .88 + 22, g * .86 + 20, b * .70 + 18)
            elif variante == 'b':
                farbe = (r * .55 + 16, g * .67 + 25, b * .91 + 40)
            else:
                farbe = (r * .72 + 31, g * .68 + 27, b * .45 + 13)
            if variante == 'c' and flecken[x, y]:
                deckung = flecken[x, y] / 255
                farbe = tuple(f * (1 - deckung) + z * deckung
                              for f, z in zip(farbe, (95, 18, 17)))
            px[x, y] = tuple(max(0, min(255, round(wert))) for wert in farbe)
            werte.append(sum(px[x, y]) / 3)
    helligkeit = sum(werte) / len(werte)
    if helligkeit < 45:
        raise ValueError(f'Variante {variante} zu dunkel: {helligkeit:.1f}')
    neu.save(ausgabe / f'v3d-zombie-{variante}.webp', 'WEBP', quality=90)
    varianten.append(neu)
    print(f'{variante}: mittlere Helligkeit {helligkeit:.1f}')
kontrolle = Image.new('RGB', (1536, 512))
for i, variante in enumerate(varianten):
    kontrolle.paste(variante, (i * 512, 0))
Path('tmp').mkdir(exist_ok=True)
kontrolle.save('tmp/zombie-varianten.png')
