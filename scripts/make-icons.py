from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PLAYER_PATH = ROOT / 'src/assets/player.png'
OUTPUTS = {
    192: ROOT / 'public/icon-192.png',
    512: ROOT / 'public/icon-512.png',
    180: ROOT / 'public/apple-touch-icon.png',
}
BACKGROUND = '#10131d'
BACKGROUND_LINE = '#172033'
BACKGROUND_DOT = '#26344e'
GLOW = '#e8590c'


def background_tile() -> Image.Image:
    tile = Image.new('RGB', (64, 64), BACKGROUND)
    draw = ImageDraw.Draw(tile)
    draw.rectangle((0, 12, 63, 13), fill=BACKGROUND_LINE)
    draw.rectangle((0, 44, 63, 45), fill=BACKGROUND_LINE)
    draw.rectangle((8, 28, 11, 29), fill=BACKGROUND_DOT)
    draw.rectangle((42, 58, 45, 59), fill=BACKGROUND_DOT)
    return tile


def make_icon(size: int, player: Image.Image, tile: Image.Image) -> Image.Image:
    icon = tile.resize((size, size), Image.Resampling.NEAREST).convert('RGBA')
    glow = Image.new('RGBA', (size, size))
    radius = round(size * 0.34)
    center = size // 2
    ImageDraw.Draw(glow).ellipse(
        (center - radius, center - radius, center + radius, center + radius),
        fill=GLOW + '5a',
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=round(size * 0.08)))
    icon = Image.alpha_composite(icon, glow)

    player_height = round(size * 0.58)
    player_width = round(player.width * player_height / player.height)
    figure = player.resize((player_width, player_height), Image.Resampling.NEAREST)
    icon.alpha_composite(figure, ((size - player_width) // 2, (size - player_height) // 2))
    return icon.convert('RGB')


def main() -> None:
    player = Image.open(PLAYER_PATH).convert('RGBA')
    tile = background_tile()
    for size, output in OUTPUTS.items():
        make_icon(size, player, tile).save(output, optimize=True)


if __name__ == '__main__':
    main()
