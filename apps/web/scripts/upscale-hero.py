"""Upscale hero assets 2x: Real-ESRGAN edges, original colour and clay grain.

Plain Real-ESRGAN sharpens edges but wipes the felt texture and shifts the
colour a little. So we split frequencies:
    out = blur(lanczos) + (esr - blur(esr)) + GRAIN * (lanczos - blur(lanczos))
Low frequencies (colour) come from the original, edges from ESRGAN, and part
of the original grain goes back on top. Alpha comes from ESRGAN.

Usage (from apps/web):
    python3 scripts/upscale-hero.py <dir with the generator's originals>
    python3 scripts/upscale-hero.py --self-test

Needs Pillow and realesrgan-ncnn-vulkan (github.com/xinntao/Real-ESRGAN
releases). Set REALESRGAN=/path/to/binary if it is not on PATH; the models/
folder must sit next to it.
"""

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageChops as C, ImageFilter

OUT = Path(__file__).resolve().parent.parent / 'src/assets/hero'
MODEL = 'realesrgan-x4plus'
SIGMA = 2.0  # blur radius at 2x that separates "colour" from "edges"
GRAIN = 0.6
MAX_SOURCE_WIDTH = 2000  # anything wider is already upscaled; never do it twice


def fuse(src: Image.Image, esr: Image.Image) -> Image.Image:
    size = (src.width * 2, src.height * 2)
    low = src.convert('RGBA').resize(size, Image.LANCZOS)
    esr = esr.convert('RGBA').resize(size, Image.LANCZOS)

    l_rgb, e_rgb = low.convert('RGB'), esr.convert('RGB')
    l_blur = l_rgb.filter(ImageFilter.GaussianBlur(SIGMA))
    e_blur = e_rgb.filter(ImageFilter.GaussianBlur(SIGMA))

    # Signed differences are stored around 128 so they survive 8-bit clipping.
    out = C.add(l_blur, C.subtract(e_rgb, e_blur, 1, 128), 1, -128)
    grain = C.subtract(l_rgb, l_blur, 1, 128).point(lambda v: int(128 + GRAIN * (v - 128)))
    out = C.add(out, grain, 1, -128).convert('RGBA')
    out.putalpha(esr.getchannel('A'))
    return out


def esrgan(path: Path, tmp: Path) -> Image.Image:
    binary = os.environ.get('REALESRGAN') or shutil.which('realesrgan-ncnn-vulkan')
    if not binary:
        sys.exit('realesrgan-ncnn-vulkan not found. Set REALESRGAN=/path/to/binary.')
    out = tmp / path.name
    subprocess.run(
        [binary, '-i', str(path), '-o', str(out), '-n', MODEL, '-m', str(Path(binary).parent / 'models')],
        check=True,
        capture_output=True,
    )
    return Image.open(out)


def self_test() -> None:
    # Fusing with a "perfect" ESRGAN (the Lanczos itself) must keep colour and alpha.
    src = Image.new('RGBA', (64, 64), (158, 207, 188, 255))
    src.paste((110, 66, 193, 0), (16, 16, 48, 48))
    fake = src.resize((128, 128), Image.LANCZOS)
    out = fuse(src, fake)
    assert out.size == (128, 128)
    assert out.getchannel('A').getextrema() == fake.getchannel('A').getextrema()
    assert abs(out.getpixel((4, 4))[1] - 207) <= 2, out.getpixel((4, 4))
    print('self-test ok')


def main(src_dir: Path) -> None:
    files = sorted(src_dir.glob('*.png'))
    if not files:
        sys.exit(f'no PNGs in {src_dir}')
    with tempfile.TemporaryDirectory() as tmp:
        for path in files:
            src = Image.open(path)
            if src.width > MAX_SOURCE_WIDTH:
                print(f'skip {path.name}: {src.width}px wide, already upscaled')
                continue
            fuse(src, esrgan(path, Path(tmp))).save(OUT / path.name, optimize=True)
            print(f'{path.name}: {src.width}x{src.height} -> {src.width * 2}x{src.height * 2}')


if __name__ == '__main__':
    if sys.argv[1:] == ['--self-test']:
        self_test()
    elif len(sys.argv) == 2:
        main(Path(sys.argv[1]))
    else:
        sys.exit(__doc__)
