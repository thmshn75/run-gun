from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
# Quelle seit 2026-09-30: Variante 2 der 3D-Icon-Entwuerfe (Soldaten, Horde, Hubschrauber),
# von Thomas gewaehlt. 1024x1024, randlos, ohne Transparenz; hier nur verkleinert.
ICON_PATH = ROOT / 'assets/icon-quelle.png'
OUTPUTS = {
    192: ROOT / 'public/icon-192.png',
    512: ROOT / 'public/icon-512.png',
    180: ROOT / 'public/apple-touch-icon.png',
}
CONTACT_SHEET_PATH = ROOT / 'assets/probe/icons-kontrolle.png'


def make_icon(size: int, quelle: Image.Image) -> Image.Image:
    return quelle.resize((size, size), Image.Resampling.LANCZOS).convert('RGB')


def make_contact_sheet(icons: dict[int, Image.Image]) -> Image.Image:
    preview_size = 192
    contact_sheet = Image.new('RGB', (preview_size * 3, preview_size), '#ffffff')
    for index, size in enumerate((192, 512, 180)):
        preview = icons[size].resize((preview_size, preview_size), Image.Resampling.NEAREST)
        contact_sheet.paste(preview, (index * preview_size, 0))
    return contact_sheet


def main() -> None:
    quelle = Image.open(ICON_PATH).convert('RGB')
    icons = {}
    for size, output in OUTPUTS.items():
        icons[size] = make_icon(size, quelle)
        icons[size].save(output, optimize=True)
    CONTACT_SHEET_PATH.parent.mkdir(parents=True, exist_ok=True)
    make_contact_sheet(icons).save(CONTACT_SHEET_PATH, optimize=True)


if __name__ == '__main__':
    main()
