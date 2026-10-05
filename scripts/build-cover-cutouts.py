#!/usr/bin/env python3
"""Cut public-domain botanical plates out of their paper for the collage cover pack.

Reads scripts/cover-cutouts.sources.json (one Wikimedia Commons file per entry, chosen by hand
for a heavy colour: the collage rule is that the piece on top is the strongest colour on the
page), checks each file's licence on Commons, separates the plant from the plate's paper, and
writes assets/cover-cutouts/<id>.webp plus lib/coverCutouts.ts.

The licence check is the point of the script, not a courtesy: a file whose Commons record is not
public domain or CC0 stops the build. These are the only bitmaps on a cover, and the sticker
standard (outputs/cover-asset-library-prototype/STANDARD.md §6) keeps outside material out of the
drawn-sticker set and behind its own whitelist; this is that whitelist.

Usage (from novaku-app/):
    python scripts/build-cover-cutouts.py            # downloads into CUTOUT_CACHE or a temp dir
    CUTOUT_CACHE=F:/some/dir python scripts/build-cover-cutouts.py
"""
import html
import json
import os
import re
import sys
import tempfile
import time
from pathlib import Path

import httpx
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = Path(__file__).resolve().parent
SOURCES = HERE / "cover-cutouts.sources.json"
ASSETS = HERE.parent / "assets" / "cover-cutouts"
OUT_TS = HERE.parent / "lib" / "coverCutouts.ts"
CACHE = Path(os.environ.get("CUTOUT_CACHE") or Path(tempfile.gettempdir()) / "postervia-cutout-cache")
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "PostervIaCoverAssets/0.1 (https://postervia.app)"}
LICENCES = {"public domain": "Public domain", "cc0": "CC0"}
LONG_SIDE = 560
WORK_WIDTH = 960  # a standard Commons thumbnail step; other widths are refused


def licence_of(meta: dict) -> str | None:
    raw = re.sub(r"\s+", " ", (meta.get("LicenseShortName") or {}).get("value", "")).strip().lower()
    for key, name in LICENCES.items():
        if raw == key or raw.startswith(key):
            return name
    return None


def plain(meta: dict, key: str) -> str:
    text = re.sub(r"<[^>]+>", " ", (meta.get(key) or {}).get("value", ""))
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def fetch(client: httpx.Client, title: str) -> tuple[Path, dict]:
    params = {"action": "query", "format": "json", "titles": title, "prop": "imageinfo",
              "iiprop": "url|extmetadata", "iiurlwidth": WORK_WIDTH}
    page = next(iter(client.get(API, params=params).json()["query"]["pages"].values()))
    info = page["imageinfo"][0]
    meta = info.get("extmetadata") or {}
    dest = CACHE / (re.sub(r"[^A-Za-z0-9]+", "_", title)[:80] + ".img")
    if not dest.exists():
        for _ in range(4):
            resp = client.get(info["thumburl"])
            if resp.status_code == 429:
                time.sleep(int(resp.headers.get("retry-after", "5") or 5) + 2)
                continue
            resp.raise_for_status()
            dest.write_bytes(resp.content)
            break
        time.sleep(0.8)
    return dest, {"meta": meta, "page": info["descriptionurl"]}


def srgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    c = np.where(rgb > 0.04045, ((rgb + 0.055) / 1.055) ** 2.4, rgb / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def cut_out(path: Path, crop: list[float] | None) -> Image.Image:
    img = Image.open(path).convert("RGB")
    if crop:
        w, h = img.size
        img = img.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    rgb = np.asarray(img).astype(np.float64) / 255.0
    lab = srgb_to_lab(rgb)
    h, w = lab.shape[:2]
    band = max(4, int(0.03 * min(h, w)))
    ring = np.concatenate([lab[:band].reshape(-1, 3), lab[-band:].reshape(-1, 3),
                           lab[:, :band].reshape(-1, 3), lab[:, -band:].reshape(-1, 3)])
    paper = np.median(ring, axis=0)
    dist = np.linalg.norm(lab - paper, axis=2)
    noise = np.percentile(np.linalg.norm(ring - paper, axis=1), 95)
    low, high = max(9.0, noise * 1.35), max(9.0, noise * 1.35) + 16.0

    solid = dist > (low + high) / 2
    solid = ndi.binary_opening(solid, iterations=1)
    solid = ndi.binary_closing(solid, iterations=3)
    labels, count = ndi.label(solid)
    if count == 0:
        raise SystemExit(f"{path.name}: nothing separates from the paper")
    sizes = ndi.sum(solid, labels, range(1, count + 1))
    # The plant and anything as large as a fifth of it (a butterfly, a cut fruit) stay;
    # captions, plate numbers and specks of foxing go.
    keep = [i + 1 for i, s in enumerate(sizes) if s >= max(0.2 * sizes.max(), 0.002 * solid.size)]
    kept = np.isin(labels, keep)
    # A hole is either a pale petal (keep it opaque) or paper the stems happen to enclose (cut
    # it out). Filling every hole put cream patches between the leaves of half the roses.
    mask = ndi.binary_fill_holes(kept)
    holes, hole_count = ndi.label(mask & ~kept)
    if hole_count:
        medians = ndi.median(dist, holes, range(1, hole_count + 1))
        paper_holes = [i + 1 for i, m in enumerate(np.atleast_1d(medians)) if m < low]
        mask &= ~np.isin(holes, paper_holes)

    soft = np.clip((dist - low) / (high - low), 0.0, 1.0)
    alpha = np.where(ndi.binary_erosion(mask, iterations=2), 1.0, soft * ndi.binary_dilation(mask, iterations=2))
    alpha = ndi.gaussian_filter(alpha, 0.6)
    # Lift the paper out of the fringe so a cream halo does not ride along onto kraft paper.
    paper_rgb = np.median(np.concatenate([rgb[:band].reshape(-1, 3), rgb[-band:].reshape(-1, 3)]), axis=0)
    a = alpha[..., None]
    fg = np.where(a > 0.02, (rgb - (1 - a) * paper_rgb) / np.maximum(a, 0.02), rgb)
    out = np.dstack([np.clip(fg, 0, 1), alpha])

    ys, xs = np.where(alpha > 0.05)
    pad = 6
    y0, y1 = max(0, ys.min() - pad), min(h, ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(w, xs.max() + pad)
    cut = Image.fromarray((out[y0:y1, x0:x1] * 255).round().astype(np.uint8), "RGBA")
    scale = LONG_SIDE / max(cut.size)
    if scale < 1:
        cut = cut.convert("RGBa").resize((round(cut.width * scale), round(cut.height * scale)), Image.LANCZOS).convert("RGBA")
    return cut


def main() -> None:
    sources = json.loads(SOURCES.read_text(encoding="utf-8"))
    CACHE.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)
    client = httpx.Client(headers=UA, timeout=60, follow_redirects=True)
    records = []
    for entry in sources:
        path, info = fetch(client, entry["file"])
        licence = licence_of(info["meta"])
        if licence is None:
            raise SystemExit(f"{entry['id']}: Commons licence is not public domain or CC0, refusing")
        cut = cut_out(path, entry.get("crop"))
        dest = ASSETS / f"{entry['id']}.webp"
        cut.save(dest, "WEBP", quality=82, alpha_quality=90, method=6)
        artist = entry.get("artist") or plain(info["meta"], "Artist")[:80]
        records.append({
            "id": entry["id"], "w": cut.width, "h": cut.height, "hue": entry["hue"],
            "title": entry["file"].removeprefix("File:").rsplit(".", 1)[0][:90],
            "artist": artist, "licence": licence, "page": info["page"], "kb": dest.stat().st_size // 1024,
        })
        print(f"{entry['id']:34s} {cut.width}x{cut.height} {records[-1]['kb']}KB {licence}")

    lines = [
        "// Generated by scripts/build-cover-cutouts.py from scripts/cover-cutouts.sources.json. Do not edit.",
        "// Every image is public domain or CC0 on Wikimedia Commons; the script refuses anything else.",
        "",
        "export type CutoutHue = 'red' | 'pink' | 'orange' | 'yellow' | 'green' | 'blue' | 'brown';",
        "",
        "export interface CoverCutout {",
        "  id: string;",
        "  image: number;",
        "  width: number;",
        "  height: number;",
        "  hue: CutoutHue;",
        "  title: string;",
        "  artist: string;",
        "  licence: 'Public domain' | 'CC0';",
        "  page: string;",
        "}",
        "",
        "export const COVER_CUTOUTS: CoverCutout[] = [",
    ]
    for r in records:
        lines.append(
            f"  {{ id: {json.dumps(r['id'])}, image: require('../assets/cover-cutouts/{r['id']}.webp'), "
            f"width: {r['w']}, height: {r['h']}, hue: {json.dumps(r['hue'])}, title: {json.dumps(r['title'], ensure_ascii=False)}, "
            f"artist: {json.dumps(r['artist'], ensure_ascii=False)}, licence: {json.dumps(r['licence'])}, page: {json.dumps(r['page'])} }},"
        )
    lines += ["];", ""]
    OUT_TS.write_text("\n".join(lines), encoding="utf-8")
    total = sum(r["kb"] for r in records)
    print(f"{len(records)} cutouts, {total} KB, wrote {OUT_TS.relative_to(HERE.parent)}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main()
