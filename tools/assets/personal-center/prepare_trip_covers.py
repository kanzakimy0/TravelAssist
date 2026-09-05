#!/usr/bin/env python3
"""Download reviewed photo sources and export four quiet, warm travel covers.

Requires Python 3.10+ and Pillow with WebP support. No API key or plugin.
Never writes website code, Git refs, or existing output directories.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import sys
import tempfile
import warnings
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

try:
    from PIL import Image, ImageCms, ImageDraw, ImageEnhance, ImageOps, features
except ImportError:
    raise SystemExit("Install Pillow in a temporary environment: python -m pip install Pillow==12.3.0")

MAX_BYTES = 32 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 45_000_000
warnings.simplefilter("error", Image.DecompressionBombWarning)
LICENSE = "https://creativecommons.org/publicdomain/zero/1.0/"
SOURCES = (
    {
        "id": "izu", "author": "Peter Nguyen", "title": "Izu Peninsula, Izu, Japan",
        "page": "https://commons.wikimedia.org/wiki/File:Izu_Peninsula,_Izu,_Japan_(Unsplash).jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/8/8d/Izu_Peninsula%2C_Izu%2C_Japan_%28Unsplash%29.jpg",
        "size": [3872, 2592], "bytes": 1332546,
        "sha1": "f528f99ae671a3c2a389dfabbe02624a3a5d7b8e",
    },
    {
        "id": "coast", "author": "Saigen Jiro", "title": "Shirahama-kaigan (Izu)",
        "page": "https://commons.wikimedia.org/wiki/File:Shirahama-kaigan_(Izu).JPG",
        "url": "https://upload.wikimedia.org/wikipedia/commons/d/d9/Shirahama-kaigan_%28Izu%29.JPG",
        "size": [6016, 4000], "bytes": 4218401,
        "sha1": "a3ec6a018cf0d516e2ebd90f4a0f551718b386a6",
    },
    {
        "id": "weekend", "author": "Sorasak", "title": "Kyoto, Japan",
        "page": "https://commons.wikimedia.org/wiki/File:Kyoto,_Japan_(Unsplash_UIN-pFfJ7c).jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/4/47/Kyoto%2C_Japan_%28Unsplash_UIN-pFfJ7c%29.jpg",
        "size": [7360, 4912], "bytes": 21040337,
        "sha1": None,
    },
)
# Source identity: dimensions/bytes are checked for all; SHA-1 additionally for
# the two files whose hashes are published in the inspected Commons records.
# Kyoto's SHA-1 was not available: record computed SHA-256, never invent a pin.
OUTPUTS = (
    ("izu-hero-soft.webp", "izu", (1920, 720), (0.5, 0.35)),
    ("izu-card-soft.webp", "izu", (960, 600), (0.5, 0.5)),
    ("coast-card-soft.webp", "coast", (960, 600), (0.5, 0.55)),
    ("weekend-card-soft.webp", "weekend", (960, 600), (0.53, 0.45)),
)


def permitted(url: str) -> bool:
    parts = urlsplit(url)
    return (parts.scheme == "https" and parts.hostname == "upload.wikimedia.org"
            and parts.port in (None, 443) and not parts.username and not parts.password)


class SameHostRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not permitted(newurl):
            raise ValueError("Refusing redirect away from the reviewed image host")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def download(url: str, timeout: float) -> bytes:
    if not permitted(url):
        raise ValueError("Unapproved download host")
    request = Request(url, headers={
        "User-Agent": "TravelAssistAssetPrep/1.0 (https://github.com/kanzakimy0/TravelAssist)",
        "Accept": "image/jpeg",
    })
    with build_opener(SameHostRedirect()).open(request, timeout=timeout) as response:
        if response.headers.get_content_type() != "image/jpeg":
            raise ValueError("Expected an original JPEG; refusing HTML/error/thumbnail content")
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError("Source exceeds the 32 MiB download limit")
    return data


def validate(data: bytes, source: dict) -> None:
    if len(data) != source["bytes"]:
        raise ValueError(f"{source['id']}: original byte length changed; review source, do not bypass")
    if source["sha1"] and hashlib.sha1(data).hexdigest() != source["sha1"]:
        raise ValueError(f"{source['id']}: published source hash mismatch")
    with Image.open(io.BytesIO(data)) as image:
        if image.format != "JPEG" or list(image.size) != source["size"]:
            raise ValueError(f"{source['id']}: original format or dimensions changed")
        image.verify()


def rgb_source(data: bytes) -> Image.Image:
    with Image.open(io.BytesIO(data)) as opened:
        opened.load()
        image = ImageOps.exif_transpose(opened)
        profile = image.info.get("icc_profile")
        if profile:
            image = ImageCms.profileToProfile(
                image, ImageCms.ImageCmsProfile(io.BytesIO(profile)),
                ImageCms.createProfile("sRGB"), outputMode="RGB",
            )
        else:
            image = image.convert("RGB")  # Untagged sources are treated as sRGB.
        return image.copy()


def render(image: Image.Image, size: tuple[int, int], centering: tuple[float, float]) -> Image.Image:
    if image.width < size[0] or image.height < size[1]:
        raise ValueError("Source is too small; refusing to upscale")
    result = ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=centering)
    result = ImageEnhance.Color(result).enhance(0.90)
    result = ImageEnhance.Contrast(result).enhance(0.90)
    result = ImageEnhance.Brightness(result).enhance(1.03)
    result = Image.blend(result, Image.new("RGB", size, "#FAF6EF"), 0.04)
    # Strip EXIF/GPS and source metadata from derivatives. Credits live in files.
    clean = Image.new("RGB", size)
    clean.paste(result)
    return clean


def encode(image: Image.Image, budget: int) -> tuple[bytes, int]:
    for quality in (84, 80, 76):
        buffer = io.BytesIO()
        image.save(buffer, "WEBP", quality=quality, method=6)
        data = buffer.getvalue()
        if len(data) <= budget:
            with Image.open(io.BytesIO(data)) as check:
                check.load()
                if check.format != "WEBP" or check.size != image.size:
                    raise ValueError("Derivative validation failed")
            return data, quality
    raise ValueError("Cover exceeds the byte budget; review composition rather than lowering quality blindly")


def run(output: Path, cache: Path, offline: bool, timeout: float) -> None:
    if not features.check("webp"):
        raise ValueError("This Pillow installation has no WebP encoder")
    if output.exists():
        raise FileExistsError(f"Output already exists, refusing overwrite: {output}")
    if cache == output or output in cache.parents or cache in output.parents:
        raise ValueError("Cache and output must be separate, non-nested directories")
    cache.mkdir(parents=True, exist_ok=True)
    source_data = {}
    for source in SOURCES:
        path = cache / (source["id"] + ".jpg")
        if path.exists():
            if path.stat().st_size > MAX_BYTES:
                raise ValueError("Cached source is too large")
            data = path.read_bytes()
        elif offline:
            raise FileNotFoundError(f"Offline source missing: {path}")
        else:
            data = download(source["url"], timeout)
        validate(data, source)
        if not path.exists():
            with path.open("xb") as file:
                file.write(data)
        source_data[source["id"]] = data
    if len({hashlib.sha256(data).hexdigest() for data in source_data.values()}) != 3:
        raise ValueError("Three distinct original scenes are required")
    # Nothing enters the output folder until ALL sources and exports succeed.
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".trip-covers-", dir=output.parent) as directory:
        stage = Path(directory) / "ready"
        stage.mkdir()
        records, previews = [], []
        for name, source_id, size, centering in OUTPUTS:
            image = render(rgb_source(source_data[source_id]), size, centering)
            data, quality = encode(image, 450 * 1024 if size[0] == 1920 else 240 * 1024)
            (stage / name).write_bytes(data)
            records.append({
                "file": name, "source_id": source_id, "width": size[0], "height": size[1],
                "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                "crop_centering": list(centering), "webp_quality": quality,
                "runtime_integrated": False,
            })
            previews.append((name, image))
        manifest = {
            "status": "GENERATED_PENDING_VISUAL_REVIEW", "synthetic": False,
            "created_utc": datetime.now(timezone.utc).isoformat(),
            "scenes": 3, "cover_files": 4, "files": records,
            "processing": {"saturation": 0.9, "contrast": 0.9, "brightness": 1.03,
                           "ivory_blend": 0.04, "ivory": "#FAF6EF"},
            "sources": [dict(s, license="CC0-1.0", license_url=LICENSE,
                             sha256=hashlib.sha256(source_data[s["id"]]).hexdigest(),
                             license_page_checked="2026-09-05") for s in SOURCES],
            "notes": ["Real photographs adapted for Mock travel cards, not user photographs.",
                      "Inspect source licenses and crops before website integration.",
                      "Kyoto source has dimensions/length checks but no pre-pinned hash.",
                      "Untagged original color profiles are treated as sRGB."],
        }
        (stage / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        credits = ["# Travel cover credits", "", "These are real-photo derivatives, not AI-generated scenes.", "",
                   "Changes: crop, 90% saturation, 90% contrast, 103% brightness, 4% warm-ivory blend; WebP export.", ""]
        for source in SOURCES:
            credits += [f"## {source['id']}: {source['title']}", f"Author: {source['author']}",
                        f"Source: <{source['page']}>", f"License recorded on file page: [CC0 1.0]({LICENSE})", ""]
        (stage / "ATTRIBUTION.md").write_text("\n".join(credits), encoding="utf-8")
        sheet = Image.new("RGB", (1000, 760), "#FAF6EF")
        draw = ImageDraw.Draw(sheet)
        draw.text((20, 15), "DERIVATIVE PREVIEW - pending visual review, not a website screenshot", fill="#383632")
        for index, (name, image) in enumerate(previews):
            x, y = 20 + (index % 2) * 500, 50 + (index // 2) * 350
            thumbnail = ImageOps.contain(image, (460, 290))
            sheet.paste(thumbnail, (x, y))
            draw.text((x, y + 305), name, fill="#383632")
        sheet.save(stage / "preview.jpg", quality=88)
        if output.exists():
            raise FileExistsError("Output appeared during processing; refusing overwrite")
        stage.rename(output)
    print(f"Generated 4 covers from 3 sources in {output}. Visual acceptance remains pending.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="A new, non-existing export directory")
    parser.add_argument("--cache", type=Path, required=True, help="Private source cache outside version control")
    parser.add_argument("--offline", action="store_true", help="Only use the exact originals already in cache")
    parser.add_argument("--timeout", type=float, default=35)
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error("--timeout must be positive")
    try:
        run(args.output.resolve(), args.cache.resolve(), args.offline, args.timeout)
    except Exception as error:
        print(f"NOT COMPLETE: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
