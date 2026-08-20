from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'src/assets'
PREVIEW = ROOT / 'assets/probe/gegner/vorschau.png'


def sprite(size: int) -> Image.Image:
    return Image.new('RGBA', (size, size), (0, 0, 0, 0))


def make_light() -> Image.Image:
    image = sprite(24)
    draw = ImageDraw.Draw(image)
    edge = '#0c4a5a'
    body = '#34d1e0'
    bright = '#a5f3fc'
    # A narrow arrowhead with side fins reads as a fast attacker at 24px.
    draw.polygon([(12, 1), (18, 8), (17, 17), (14, 21), (10, 21), (7, 17), (6, 8)], fill=edge)
    draw.polygon([(12, 3), (16, 9), (15, 15), (13, 19), (11, 19), (9, 15), (8, 9)], fill=body)
    draw.rectangle((10, 8, 13, 15), fill=bright)
    draw.rectangle((4, 12, 7, 16), fill=edge)
    draw.rectangle((16, 12, 19, 16), fill=edge)
    draw.rectangle((4, 13, 6, 14), fill=body)
    draw.rectangle((17, 13, 19, 14), fill=body)
    return image


def make_standard() -> Image.Image:
    image = sprite(30)
    draw = ImageDraw.Draw(image)
    edge = '#501f2f'
    body = '#df4d66'
    bright = '#ff9aab'
    # A square hull and shoulder blocks make the standard unit visibly heavier.
    draw.polygon([(7, 4), (22, 4), (26, 8), (26, 22), (22, 26), (7, 26), (3, 22), (3, 8)], fill=edge)
    draw.rectangle((7, 7, 22, 22), fill=body)
    draw.rectangle((10, 9, 19, 14), fill=bright)
    draw.rectangle((8, 16, 21, 21), fill='#b93650')
    draw.rectangle((3, 11, 6, 19), fill=edge)
    draw.rectangle((23, 11, 26, 19), fill=edge)
    draw.rectangle((4, 12, 6, 17), fill=body)
    draw.rectangle((23, 12, 25, 17), fill=body)
    return image


def make_heavy() -> Image.Image:
    image = sprite(38)
    draw = ImageDraw.Draw(image)
    edge = '#2e1a5b'
    body = '#8b5cf6'
    bright = '#c4b5fd'
    # Broad armor plates and a low, wide stance make the heavy unit unmistakable.
    draw.polygon([(10, 3), (27, 3), (34, 10), (34, 28), (28, 35), (9, 35), (3, 28), (3, 10)], fill=edge)
    draw.polygon([(11, 6), (26, 6), (31, 11), (31, 27), (26, 32), (11, 32), (6, 27), (6, 11)], fill=body)
    draw.rectangle((10, 10, 27, 16), fill=bright)
    draw.rectangle((8, 19, 29, 28), fill='#6d3fd1')
    draw.rectangle((3, 14, 8, 25), fill=edge)
    draw.rectangle((29, 14, 34, 25), fill=edge)
    draw.rectangle((4, 16, 7, 23), fill=body)
    draw.rectangle((30, 16, 33, 23), fill=body)
    draw.rectangle((16, 20, 21, 25), fill=bright)
    return image


def make_preview(enemies: list[Image.Image]) -> Image.Image:
    scale = 4
    gap = 24
    margin = 24
    width = margin * 2 + sum(enemy.width * scale for enemy in enemies) + gap * (len(enemies) - 1)
    height = margin * 2 + max(enemy.height * scale for enemy in enemies)
    preview = Image.new('RGB', (width, height), '#10131d')
    x = margin
    for enemy in enemies:
        enlarged = enemy.resize((enemy.width * scale, enemy.height * scale), Image.Resampling.NEAREST)
        preview.paste(enlarged, (x, (height - enlarged.height) // 2), enlarged)
        x += enlarged.width + gap
    return preview


def main() -> None:
    enemies = [make_light(), make_standard(), make_heavy()]
    for name, image in zip(('enemy-light.png', 'enemy-standard.png', 'enemy-heavy.png'), enemies):
        image.save(OUTPUT / name, optimize=True)
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    make_preview(enemies).save(PREVIEW, optimize=True)


if __name__ == '__main__':
    main()
