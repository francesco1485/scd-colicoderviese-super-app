#!/usr/bin/env python3
"""
Derive trimmed, transparent display renditions of the official sponsor and affiliation marks
(Direzione 13/10/2026 15:31: "loghi scontornati", "loghi sponsor ... sembrano fatti da bambini").

Rules (config/scd-assets.v1.json format_policy):
- never redraw, recolour or upscale a mark: pixels are only cropped and the flat white background
  connected to the image border is made transparent (interior whites of the mark stay as they are);
- derivatives are lossless WebP, registered in runtime_assets with derived_from + git_blob_sha;
- marks that already carry an alpha channel are only trimmed.

Outputs:
- apps/superapp/public/media/sponsor/cut/<slug>.webp
- apps/superapp/public/media/affiliazioni/cut/<id>.webp
- apps/superapp/src/lib/logo-art.gen.ts (intrinsic sizes for layout, no data invented)
- runtime_assets entries in config/scd-assets.v1.json (added or refreshed)

Usage: python3 apps/superapp/scripts/derive-logo-cutouts.py   (from the repo root)
"""
from __future__ import annotations

import json
import re
import subprocess
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[3]
APP = REPO / "apps/superapp"
PUBLIC = APP / "public"
REGISTRY = REPO / "config/scd-assets.v1.json"

# Official affiliation marks: the transparent cut-outs already approved in assets/ (LOCKED,
# SCD_INTERNAL_APPROVED). Monza: ONLY the registered "Insieme al Monza" affiliation badge.
# Order by importance (Direzione 13/10/2026 15:55): SGS 3° livello, LND/FIGC, AC Monza.
AFFILIATIONS = [
    ("figc-sgs-3-livello", "assets/logo-sgs.png", "FIGC Settore Giovanile e Scolastico, Club Giovanile di 3° livello"),
    ("lnd", "assets/logo-lnd.png", "FIGC Lega Nazionale Dilettanti, Comitato Regionale Lombardia"),
    ("insieme-al-monza", "assets/logo-monza.png", "Insieme al Monza, programma di affiliazione AC Monza"),
]

WHITE_MIN = 226  # a pixel is "background white" when all channels are >= this and it touches the border region
ALPHA_MIN = 16   # trim threshold on existing alpha


def git_blob_sha(path: Path) -> str:
    return subprocess.check_output(["git", "hash-object", str(path)], text=True).strip()


def edge_white_to_alpha(rgb: np.ndarray) -> np.ndarray:
    """RGBA array: flat white connected to the border becomes transparent; a 1 px ring is un-blended."""
    h, w, _ = rgb.shape
    near_white = rgb.min(axis=2) >= WHITE_MIN
    bg = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near_white[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near_white[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and near_white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    out = np.dstack([rgb, np.full((h, w), 255, dtype=np.uint8)]).astype(np.float64)
    out[bg, 3] = 0
    # Anti-aliased ring next to the removed background: colour-to-alpha against white.
    ring = np.zeros_like(bg)
    ring[1:, :] |= bg[:-1, :]
    ring[:-1, :] |= bg[1:, :]
    ring[:, 1:] |= bg[:, :-1]
    ring[:, :-1] |= bg[:, 1:]
    ring &= ~bg
    ys, xs = np.nonzero(ring)
    for y, x in zip(ys, xs):
        c = out[y, x, :3]
        a = max((255 - c).max() / 255.0, 0.0)
        if a <= 0:
            out[y, x, 3] = 0
            continue
        out[y, x, :3] = 255 - (255 - c) / a
        out[y, x, 3] = round(a * 255)
    return np.clip(out, 0, 255).astype(np.uint8)


def trim(rgba: np.ndarray, pad: int = 1) -> np.ndarray:
    alpha = rgba[:, :, 3]
    ys, xs = np.nonzero(alpha > ALPHA_MIN)
    if len(ys) == 0:
        return rgba
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, rgba.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, rgba.shape[1])
    return rgba[y0:y1, x0:x1]


def derive(src: Path, dst: Path) -> tuple[int, int, str]:
    im = Image.open(src)
    has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    if has_alpha:
        arr = np.array(im.convert("RGBA"))
        how = "trim to the alpha bounding box (source already transparent)"
    else:
        arr = edge_white_to_alpha(np.array(im.convert("RGB")))
        how = "flat white background connected to the border made transparent, then trimmed"
    arr = trim(arr)
    dst.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, "RGBA").save(dst, "WEBP", lossless=True, quality=100, method=6, exact=True)
    return arr.shape[1], arr.shape[0], how


def main() -> None:
    sponsors_ts = (APP / "src/lib/sponsors.ts").read_text(encoding="utf8")
    sponsors = re.findall(r'slug: "([^"]+)".*?src: "(/media/sponsor/[^"]+)"', sponsors_ts)
    registry = json.loads(REGISTRY.read_text(encoding="utf8"))
    by_path = {a["path"]: a for a in registry["runtime_assets"]}
    locked = {a["path"]: a for a in registry["locked_assets"]}

    def register(path: Path, cls: str, src_rel: str, how: str, w: int, h: int, status: str) -> None:
        rel = str(path.relative_to(REPO))
        entry = {
            "path": rel,
            "class": cls,
            "status": status,
            "source": "display rendition of the official file (Direzione 2026-10-13 15:31: cut-out, uniform logo boxes)",
            "git_blob_sha": git_blob_sha(path),
            "derived_from": src_rel,
            "transform": f"{how}; {w}x{h} px, lossless WebP; no redraw, no recolour, no upscale",
            "vector_status": "RESEARCH_REAL_ASSET",
        }
        if rel in by_path:
            by_path[rel].update(entry)
        else:
            registry["runtime_assets"].append(entry)
            by_path[rel] = entry

    art_lines = []
    for slug, url in sponsors:
        src = PUBLIC / url.lstrip("/")
        dst = PUBLIC / "media/sponsor/cut" / f"{slug}.webp"
        w, h, how = derive(src, dst)
        src_rel = str(src.relative_to(REPO))
        status = by_path.get(src_rel, {}).get("status", "VERIFIED")
        register(dst, "SPONSOR_LOGO", src_rel, how, w, h, status)
        sw = Image.open(src).size[0]
        art_lines.append(f'  "{slug}": {{ src: "/media/sponsor/cut/{slug}.webp", w: {w}, h: {h}, sourceWidth: {sw} }},')

    aff_lines = []
    for ident, src_rel, label in AFFILIATIONS:
        src = REPO / src_rel
        dst = PUBLIC / "media/affiliazioni/cut" / f"{ident}.webp"
        w, h, how = derive(src, dst)
        status = locked.get(src_rel, {}).get("status", "LOCKED")
        register(dst, "OFFICIAL_AFFILIATION_LOGO", src_rel, how, w, h, "VERIFIED" if status == "LOCKED" else status)
        aff_lines.append(f'  {{ id: "{ident}", label: "{label}", src: "/media/affiliazioni/cut/{ident}.webp", w: {w}, h: {h} }},')

    REGISTRY.write_text(json.dumps(registry, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    gen = APP / "src/lib/logo-art.gen.ts"
    gen.write_text(
        "/* Generated by apps/superapp/scripts/derive-logo-cutouts.py: do not edit by hand. */\n"
        "/** Trimmed transparent renditions of the official sponsor files with their intrinsic size (px). */\n"
        "export interface LogoArt { src: string; w: number; h: number; sourceWidth?: number }\n\n"
        "export const SPONSOR_ART: Readonly<Record<string, LogoArt>> = {\n" + "\n".join(art_lines) + "\n};\n\n"
        "/** Official affiliation marks (FIGC SGS 3° livello, LND, Insieme al Monza), trimmed cut-outs. */\n"
        "export const AFFILIATION_ART: ReadonlyArray<LogoArt & { id: string; label: string }> = [\n" + "\n".join(aff_lines) + "\n];\n",
        encoding="utf8",
    )
    print(f"{len(sponsors)} sponsor + {len(AFFILIATIONS)} affiliation renditions written")


if __name__ == "__main__":
    main()
