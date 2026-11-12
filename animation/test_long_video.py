"""Offline tests for long-form scene batching; no Pollinations credits used."""
import os
import pathlib
import runpy
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

SCRIPT_FILE = pathlib.Path(__file__).with_name("generate-ai-scenes.py")

class FakeResponse:
    headers = {"Content-Type": "image/jpeg"}
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self, size): return b"\xff\xd8" + b"x" * 1200

class LongVideoTests(unittest.TestCase):
    def test_eighteen_images_cover_180_scenes(self):
        sentences = [f"Scene {i} continues." for i in range(180)]
        script = " ".join(sentences)
        self.assertLess(len(script), 12000)
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = pathlib.Path(tmp)
            # runpy runs with the real source path; redirect generated output
            # to a temporary directory by patching pathlib.Path.resolve.
            original_resolve = pathlib.Path.resolve
            def fake_resolve(path, *args, **kwargs):
                if path == SCRIPT_FILE:
                    return tmpdir / "generate-ai-scenes.py"
                return original_resolve(path, *args, **kwargs)
            calls = []
            def fake_urlopen(request, timeout=180):
                calls.append(request.full_url)
                return FakeResponse()
            env = {"SCRIPT": script, "POLLINATIONS_KEY": "sk_test",
                   "AI_MAX_IMAGES": "18", "ASPECT_RATIO": "16:9"}
            with patch.dict(os.environ, env), patch.object(pathlib.Path, "resolve", fake_resolve), patch(
                "urllib.request.urlopen", side_effect=fake_urlopen
            ):
                runpy.run_path(str(SCRIPT_FILE), run_name="__main__")
            manifest = (tmpdir / "ai-scene-images.mjs").read_text()
            self.assertEqual(len(calls), 18)
            self.assertEqual(manifest.count('"/ai-scenes/scene-'), 180)
            self.assertTrue(all(parse_qs(urlsplit(url).query)["width"] == ["1024"] for url in calls))
            self.assertTrue(all(parse_qs(urlsplit(url).query)["height"] == ["576"] for url in calls))
    def test_missing_image_key_uses_free_vector_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = pathlib.Path(tmp)
            original_resolve = pathlib.Path.resolve
            def fake_resolve(path, *args, **kwargs):
                if path == SCRIPT_FILE:
                    return tmpdir / "generate-ai-scenes.py"
                return original_resolve(path, *args, **kwargs)
            with patch.dict(os.environ, {"SCRIPT": "Ein Mann geht zur Schule. Er lernt.",
                                      "POLLINATIONS_KEY": "", "AI_MAX_IMAGES": "18"}), patch.object(
                    pathlib.Path, "resolve", fake_resolve
                ), patch("urllib.request.urlopen", side_effect=AssertionError("Image API must not be called")):
                runpy.run_path(str(SCRIPT_FILE), run_name="__main__")
            manifest = (tmpdir / "ai-scene-images.mjs").read_text()
            self.assertIn("[null, null]", manifest)

    def test_image_quota_error_falls_back_to_vector(self):
        import urllib.error
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = pathlib.Path(tmp)
            original_resolve = pathlib.Path.resolve
            def fake_resolve(path, *args, **kwargs):
                if path == SCRIPT_FILE:
                    return tmpdir / "generate-ai-scenes.py"
                return original_resolve(path, *args, **kwargs)
            def quota_error(request, timeout=180):
                raise urllib.error.HTTPError(request.full_url, 429, "quota exhausted", {}, None)
            with patch.dict(os.environ, {"SCRIPT": "Ein Mann geht. Er spricht.",
                                      "POLLINATIONS_KEY": "sk_test", "AI_MAX_IMAGES": "18"}), patch.object(
                    pathlib.Path, "resolve", fake_resolve
                ), patch("urllib.request.urlopen", side_effect=quota_error):
                runpy.run_path(str(SCRIPT_FILE), run_name="__main__")
            manifest = (tmpdir / "ai-scene-images.mjs").read_text()
            self.assertIn("[null, null]", manifest)

    def test_overlong_script_rejected(self):
        with patch.dict(os.environ, {"SCRIPT": "a" * 12001, "POLLINATIONS_KEY": "sk_test"}):
            with self.assertRaises(SystemExit):
                runpy.run_path(str(SCRIPT_FILE), run_name="__main__")

if __name__ == "__main__":
    unittest.main()
