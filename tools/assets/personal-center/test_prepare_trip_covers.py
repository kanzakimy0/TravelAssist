"""Offline tests use synthetic fixtures only; they do not deliver real covers."""
import hashlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
import prepare_trip_covers as prep


class CoverTests(unittest.TestCase):
    def test_download_host_allowlist(self):
        self.assertTrue(prep.permitted(prep.SOURCES[0]["url"]))
        for url in ("http://upload.wikimedia.org/x", "https://upload.wikimedia.org.evil/x",
                    "https://user@upload.wikimedia.org/x", "file:///tmp/image.jpg"):
            self.assertFalse(prep.permitted(url))

    def test_render_has_dimensions_and_no_metadata(self):
        image = Image.new("RGB", (1000, 700), (40, 130, 200))
        image.info["exif"] = b"not-user-metadata"
        result = prep.render(image, (960, 600), (0.5, 0.5))
        self.assertEqual(result.size, (960, 600))
        self.assertEqual(result.info, {})
        self.assertNotEqual(result.getpixel((0, 0)), image.getpixel((0, 0)))

    def test_no_upscale(self):
        with self.assertRaises(ValueError):
            prep.render(Image.new("RGB", (200, 100)), (960, 600), (0.5, 0.5))

    def test_webp_export(self):
        data, quality = prep.encode(Image.new("RGB", (960, 600), (80, 120, 160)), 240 * 1024)
        self.assertIn(quality, (84, 80, 76))
        with Image.open(io.BytesIO(data)) as image:
            self.assertEqual(image.format, "WEBP")
            self.assertEqual(image.size, (960, 600))

    def test_invalid_original_hash(self):
        buffer = io.BytesIO()
        Image.new("RGB", (50, 50)).save(buffer, "JPEG")
        data = buffer.getvalue()
        source = {"id": "test", "bytes": len(data), "size": [50, 50], "sha1": "0" * 40}
        with self.assertRaisesRegex(ValueError, "hash mismatch"):
            prep.validate(data, source)

    def test_existing_output_is_untouched(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            out = root / "existing"
            out.mkdir()
            (out / "keep.txt").write_text("untouched")
            with self.assertRaises(FileExistsError):
                prep.run(out, root / "cache", True, 1)
            self.assertEqual((out / "keep.txt").read_text(), "untouched")

    def test_missing_source_produces_no_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaises(FileNotFoundError):
                prep.run(root / "output", root / "cache", True, 1)
            self.assertFalse((root / "output").exists())

    def test_full_pipeline_with_temporary_synthetic_fixtures(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cache = root / "cache"
            cache.mkdir()
            fixtures = []
            for index, original in enumerate(prep.SOURCES):
                image = Image.new("RGB", (2000, 1400), (40 + 60 * index, 140, 190))
                buffer = io.BytesIO()
                image.save(buffer, "JPEG")
                data = buffer.getvalue()
                (cache / (original["id"] + ".jpg")).write_bytes(data)
                fixtures.append(dict(original, size=[2000, 1400], bytes=len(data),
                                     sha1=hashlib.sha1(data).hexdigest()))
            with patch.object(prep, "SOURCES", tuple(fixtures)), patch.object(prep, "download") as network:
                prep.run(root / "output", cache, True, 1)
                network.assert_not_called()
            manifest = json.loads((root / "output" / "manifest.json").read_text())
            self.assertEqual(manifest["cover_files"], 4)
            self.assertEqual(manifest["scenes"], 3)
            self.assertEqual(manifest["status"], "GENERATED_PENDING_VISUAL_REVIEW")
            for file in manifest["files"]:
                data = (root / "output" / file["file"]).read_bytes()
                self.assertEqual(hashlib.sha256(data).hexdigest(), file["sha256"])
                with Image.open(io.BytesIO(data)) as image:
                    self.assertEqual(image.size, (file["width"], file["height"]))
            # This temporary folder is discarded, not published as photo delivery.


if __name__ == "__main__":
    unittest.main()
