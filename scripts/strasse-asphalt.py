#!/usr/bin/env python3
"""Make the 12 m × 6 m road tile from an image-generated asphalt base."""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, features


WIDTH, HEIGHT = 1024, 512
PIXELS_PER_METRE = WIDTH / 12
TARGET = np.array([0x5A, 0x5D, 0x61], dtype=np.float32)
WHITE = np.array([0xE8, 0xE6, 0xDE], dtype=np.float32)


def make_tile(source: Path) -> Image.Image:
    image = Image.open(source).convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    pixels = np.asarray(image, dtype=np.float32).copy()

    # Match the specified base brightness before the markings raise the average.
    pixels = np.clip(pixels + TARGET - pixels.mean(axis=(0, 1)), 0, 255)

    # Join only the longitudinal ends. The road edges are clamped, never tiled sideways.
    original = pixels.copy()
    for i in range(48):
        weight = (1 + np.cos(np.pi * i / 48)) / 2
        common = (original[i] + original[HEIGHT - 1 - i]) / 2
        pixels[i] = original[i] * (1 - weight) + common * weight
        pixels[HEIGHT - 1 - i] = original[HEIGHT - 1 - i] * (1 - weight) + common * weight

    x = np.arange(WIDTH, dtype=np.float32) + 0.5
    y = np.arange(HEIGHT, dtype=np.float32) + 0.5

    # Two broad, low-opacity tyre traces in each of the three four-metre lanes.
    tracks = np.zeros(WIDTH, dtype=np.float32)
    for lane_centre in (-4, 0, 4):
        for offset in (-0.55, 0.55):
            centre = (lane_centre + offset + 6) * PIXELS_PER_METRE
            tracks = np.maximum(tracks, 0.12 * np.exp(-0.5 * ((x - centre) / 9) ** 2))
    pixels *= (1 - tracks)[None, :, None]

    rng = np.random.default_rng(31729)

    def paint_line(centre_x: float, width_m: float, dash: bool) -> None:
        nonlocal pixels
        centre = (centre_x + 6) * PIXELS_PER_METRE
        half = width_m * PIXELS_PER_METRE / 2
        # Subpixel edge coverage, with tiny deterministic wear in the white paint.
        coverage = np.clip(half + 0.5 - np.abs(x - centre), 0, 1)[None, :]
        if dash:
            coverage = coverage * ((y >= HEIGHT / 4) & (y < 3 * HEIGHT / 4))[:, None]
        wear = rng.uniform(0.77, 0.97, (HEIGHT, WIDTH)).astype(np.float32)
        alpha = coverage * wear
        pixels = pixels * (1 - alpha[:, :, None]) + WHITE * alpha[:, :, None]

    # Inner edges 0.35 m from the road edge; each solid line is 0.15 m wide.
    paint_line(-6 + 0.35 + 0.075, 0.15, False)
    paint_line(6 - 0.35 - 0.075, 0.15, False)
    # One 3 m dash plus 3 m gap per six-metre tile.
    paint_line(-2, 0.12, True)
    paint_line(2, 0.12, True)
    return Image.fromarray(np.rint(np.clip(pixels, 0, 255)).astype(np.uint8))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="image-generated unmarked asphalt")
    parser.add_argument("--output", type=Path, default=Path("src/v3d/bilder/v3d-strasse.webp"))
    parser.add_argument("--preview", type=Path, default=Path("/private/tmp/run-gun-d1-kacheln/strasse-asphalt-2x2.png"))
    args = parser.parse_args()
    if not features.check("webp"):
        parser.error("PIL has no WebP encoder")
    tile = make_tile(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    tile.save(args.output, "WEBP", quality=88)
    preview = Image.new("RGB", (WIDTH * 2, HEIGHT * 2))
    for column in range(2):
        for row in range(2):
            preview.paste(tile, (column * WIDTH, row * HEIGHT))
    args.preview.parent.mkdir(parents=True, exist_ok=True)
    preview.save(args.preview)
    print(f"{args.output}: {tile.size[0]}x{tile.size[1]}, WebP quality 88")
    print(f"2x2 preview: {args.preview}")


if __name__ == "__main__":
    main()
