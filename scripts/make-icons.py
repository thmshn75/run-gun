from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TITLE_PATH = ROOT / 'src/assets/title.png'
OUTPUTS = {
    192: ROOT / 'public/icon-192.png',
    512: ROOT / 'public/icon-512.png',
    180: ROOT / 'public/apple-touch-icon.png',
}
# This 390px square includes the three foreground survivors and the oncoming horde,
# so the small icon stays recognisable without relying on the ignored source artwork.
TITLE_CROP_BOX = (0, 155, 390, 545)
CONTACT_SHEET_PATH = ROOT / 'assets/probe/icons-kontrolle.png'


def make_icon(size: int, title: Image.Image) -> Image.Image:
    return title.crop(TITLE_CROP_BOX).resize((size, size), Image.Resampling.NEAREST).convert('RGB')


def make_contact_sheet(icons: dict[int, Image.Image]) -> Image.Image:
    preview_size = 192
    contact_sheet = Image.new('RGB', (preview_size * 3, preview_size), '#ffffff')
    for index, size in enumerate((192, 512, 180)):
        preview = icons[size].resize((preview_size, preview_size), Image.Resampling.NEAREST)
        contact_sheet.paste(preview, (index * preview_size, 0))
    return contact_sheet


def main() -> None:
    title = Image.open(TITLE_PATH).convert('RGB')
    icons = {}
    for size, output in OUTPUTS.items():
        icons[size] = make_icon(size, title)
        icons[size].save(output, optimize=True)
    CONTACT_SHEET_PATH.parent.mkdir(parents=True, exist_ok=True)
    make_contact_sheet(icons).save(CONTACT_SHEET_PATH, optimize=True)


if __name__ == '__main__':
    main()
