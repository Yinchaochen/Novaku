#!/usr/bin/env python3
"""Cut the Chinese cover faces down to the characters a title actually uses (D-166).

The cover packs set a Chinese title in a Chinese face the way the prototype does
(outputs/cover-asset-library-prototype): ZCOOL KuaiLe, Ma Shan Zheng, Long Cang, Zhi Mang Xing,
Smiley Sans and Noto Serif SC Black. Whole, the six are 34 MB; a phone app cannot carry that.
Each is subset to GB2312 level 1 (the 3,755 most common hanzi, which is what modern text is
written in) plus GB2312's punctuation rows, ASCII, Latin-1, general punctuation, CJK punctuation
and full-width forms. A title with a character outside that set keeps the system face whole,
the D-148 rule, which lib/coverFontCoverage.ts enforces from the cmap this script writes.

All six are SIL OFL 1.1 and none declares a Reserved Font Name, so a subset may keep its name.
The licence travels with the files: assets/fonts/cover/OFL.txt.

Sources (fetched into CJK_FONT_CACHE, or a temp dir):
    npm pack @expo-google-fonts/{zcool-kuaile,ma-shan-zheng,long-cang,zhi-mang-xing,noto-serif-sc}
    https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip

Usage (from novaku-app/):
    python scripts/build-cover-cjk-fonts.py
    python scripts/build-cover-font-coverage.py   # then refresh the coverage lists
"""
import io
import os
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path

import httpx
from fontTools import subset
from fontTools.ttLib import TTFont

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "assets" / "fonts" / "cover"
CACHE = Path(os.environ.get("CJK_FONT_CACHE") or Path(tempfile.gettempdir()) / "postervia-cjk-font-cache")

# output file stem (also the family name expo-font registers) -> (npm package, path inside it)
NPM = {
    "ZCOOLKuaiLe_Cover": ("zcool-kuaile", "400Regular/ZCOOLKuaiLe_400Regular.ttf"),
    "MaShanZheng_Cover": ("ma-shan-zheng", "400Regular/MaShanZheng_400Regular.ttf"),
    "LongCang_Cover": ("long-cang", "400Regular/LongCang_400Regular.ttf"),
    "ZhiMangXing_Cover": ("zhi-mang-xing", "400Regular/ZhiMangXing_400Regular.ttf"),
    "NotoSerifSC900_Cover": ("noto-serif-sc", "900Black/NotoSerifSC_900Black.ttf"),
}
SMILEY_ZIP = "https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip"
SMILEY_STEM = "SmileySans_Cover"


def gb2312_rows(first: int, last: int) -> set[int]:
    out: set[int] = set()
    for hi in range(first, last + 1):
        for lo in range(0xA1, 0xFF):
            try:
                out.add(ord(bytes([hi, lo]).decode("gb2312")))
            except UnicodeDecodeError:
                pass
    return out


def character_set() -> set[int]:
    chars = gb2312_rows(0xB0, 0xD7) | gb2312_rows(0xA1, 0xA9)
    for start, end in ((0x20, 0x7E), (0xA0, 0xFF), (0x2000, 0x206F), (0x3000, 0x303F), (0xFF00, 0xFFEF)):
        chars.update(range(start, end + 1))
    return chars


def npm_font(package: str, inner: str) -> bytes:
    tgz = next(CACHE.glob(f"expo-google-fonts-{package}-*.tgz"), None)
    if tgz is None:
        subprocess.run(["npm", "pack", f"@expo-google-fonts/{package}", "--silent"], cwd=CACHE, check=True, shell=os.name == "nt")
        tgz = next(CACHE.glob(f"expo-google-fonts-{package}-*.tgz"))
    with tarfile.open(tgz) as tar:
        return tar.extractfile(f"package/{inner}").read()


def smiley_font() -> bytes:
    cached = CACHE / "smiley-sans-v2.0.1.zip"
    if not cached.exists():
        cached.write_bytes(httpx.get(SMILEY_ZIP, follow_redirects=True, timeout=120).raise_for_status().content)
    with zipfile.ZipFile(cached) as z:
        return z.read("SmileySans-Oblique.ttf")


def cut(source: bytes, stem: str, chars: set[int]) -> int:
    font = TTFont(io.BytesIO(source))
    options = subset.Options()
    options.layout_features = ["*"]
    options.hinting = False
    options.name_IDs = ["*"]
    options.notdef_outline = True
    sub = subset.Subsetter(options)
    sub.populate(unicodes=chars)
    sub.subset(font)
    dest = OUT / f"{stem}.ttf"
    font.save(dest)
    return dest.stat().st_size


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    chars = character_set()
    total = 0
    for stem, (package, inner) in NPM.items():
        size = cut(npm_font(package, inner), stem, chars)
        total += size
        print(f"{stem:24s} {size / 1e6:.2f} MB")
    size = cut(smiley_font(), SMILEY_STEM, chars)
    total += size
    print(f"{SMILEY_STEM:24s} {size / 1e6:.2f} MB")
    print(f"{len(chars)} codepoints requested, {total / 1e6:.1f} MB written to {OUT.relative_to(HERE.parent)}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main()
