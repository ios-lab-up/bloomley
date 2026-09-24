"""Cut the app icon off its white canvas and write every logo size the landing uses.

The source (src/assets/AppIconBloomely.png) is an RGB render: a rounded tile on
white, no alpha. We crop to the tile, square it, and mask it with a rounded
rect set 1.2% inside the edge so no white fringe survives.

Usage (from apps/web):  python3 scripts/make-icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src/assets/AppIconBloomely.png'
RADIUS = 0.24  # measured on the render: corners start ~260px into a 1098px tile
SS = 4  # supersample the mask for a smooth edge


def tile() -> Image.Image:
    im = Image.open(SRC).convert('RGB')
    left, top, right, bottom = im.convert('L').point(lambda v: 255 if v < 240 else 0).getbbox()
    side = min(right - left, bottom - top)
    cx, cy = (left + right) // 2, (top + bottom) // 2
    im = im.crop((cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)).convert('RGBA')

    inset = round(side * 0.012) * SS
    mask = Image.new('L', (side * SS, side * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (inset, inset, side * SS - inset, side * SS - inset), radius=int(side * SS * RADIUS), fill=255
    )
    im.putalpha(mask.resize((side, side), Image.LANCZOS))
    return im


def main() -> None:
    icon = tile()
    assert icon.getpixel((0, 0))[3] == 0, 'corner should be transparent'
    assert icon.getpixel((icon.width // 2, icon.height // 2))[3] == 255, 'centre should be opaque'

    icon.resize((512, 512), Image.LANCZOS).save(ROOT / 'src/assets/bloomley-icon.png', optimize=True)
    icon.resize((64, 64), Image.LANCZOS).save(ROOT / 'public/favicon.png', optimize=True)

    # iOS rounds and ignores alpha (it fills black), so the touch icon is the tile on its own mint.
    mint = icon.getpixel((icon.width // 2, icon.height // 12))
    touch = Image.new('RGBA', icon.size, mint)
    touch.alpha_composite(icon)
    touch.convert('RGB').resize((180, 180), Image.LANCZOS).save(ROOT / 'public/apple-touch-icon.png', optimize=True)
    print('icons written')


if __name__ == '__main__':
    main()
