"""Offline provider-contract tests; these consume no provider credits."""
import contextlib
import json
import os
import pathlib
import runpy
import struct
import tempfile
import unittest
import urllib.error
import zlib
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

SCRIPT_FILE = pathlib.Path(__file__).with_name("generate-ai-scenes.py")


def png(width, height):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
    # A real, complete PNG with matching requested dimensions.
    scanline = b"\0" + b"\x33\x88\xbb" * width
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(scanline * height)) + chunk(b"IEND", b"")


class FakeResponse:
    headers = {"Content-Type": "image/png"}
    def __init__(self, data=None): self.data = png(1024, 576) if data is None else data
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self, size): return self.data[:size]


@contextlib.contextmanager
def generation(env, provider=None):
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = pathlib.Path(tmp)
        original_resolve = pathlib.Path.resolve
        def fake_resolve(path, *args, **kwargs):
            return tmpdir / "generate-ai-scenes.py" if path == SCRIPT_FILE else original_resolve(path, *args, **kwargs)
        defaults = {"SCRIPT": "A man reads a message. He opens the door.", "POLLINATIONS_KEY": "sk_test",
                    "AI_MAX_IMAGES": "18", "ASPECT_RATIO": "16:9", "VIDEO_MODE": "ai"}
        defaults.update(env)
        provider = provider or (lambda *args, **kwargs: FakeResponse())
        with patch.dict(os.environ, defaults), patch.object(pathlib.Path, "resolve", fake_resolve), patch(
            "urllib.request.urlopen", side_effect=provider) as calls:
            runpy.run_path(str(SCRIPT_FILE), run_name="__main__")
        report = json.loads((tmpdir / "visual-report.json").read_text())
        yield tmpdir, report, calls


class LongVideoTests(unittest.TestCase):
    def test_eighteen_distinct_images_and_vectors_cover_180_scenes(self):
        script = " ".join(f"Scene {i} continues." for i in range(180))
        with generation({"SCRIPT": script}) as (root, report, calls):
            manifest = (root / "ai-scene-images.mjs").read_text()
            self.assertEqual(calls.call_count, 18)
            self.assertEqual(manifest.count('"/ai-scenes/scene-'), 18)
            self.assertEqual(report["imageCount"], 18)
            self.assertEqual(report["vectorSceneCount"], 162)
            self.assertEqual(len(report["scenes"]), 180)
            self.assertFalse(report["nativeAiVideo"])
            self.assertTrue(all(not x.get("reused", False) for x in report["scenes"]))
            self.assertTrue(all(parse_qs(urlsplit(c.args[0].full_url).query)["width"] == ["1024"] for c in calls.call_args_list))
            self.assertTrue(all(parse_qs(urlsplit(c.args[0].full_url).query)["height"] == ["576"] for c in calls.call_args_list))

    def test_missing_key_no_network(self):
        with generation({"POLLINATIONS_KEY": ""}) as (_, report, calls):
            calls.assert_not_called()
            self.assertEqual(report["vectorSceneCount"], 2)
            self.assertTrue(all(x["reason"] == "missing-provider-key" for x in report["scenes"]))

    def test_quota_never_retries_or_rotates_models(self):
        def quota(request, **kwargs):
            raise urllib.error.HTTPError(request.full_url, 429, "quota exhausted", {}, None)
        with generation({"AI_IMAGE_MODELS": "one,two,three"}, quota) as (_, report, calls):
            self.assertEqual(calls.call_count, 1)
            self.assertEqual(report["vectorSceneCount"], 2)
            self.assertIn("provider-auth-or-quota-http-429", report["warnings"])

    def test_vector_mode_env_and_legacy_markers_skip_provider(self):
        for env in [{"VIDEO_MODE": "vector"}, {"SCRIPT": "[[VECTOR_2D]]\n[[ASPECT_16_9]]\nEin Mann liest Nachrichten."}]:
            with self.subTest(env=env), generation(env) as (_, report, calls):
                calls.assert_not_called()
                self.assertEqual(report["imageCount"], 0)
                self.assertEqual(report["requestedMode"], "vector")

    def test_html_disguised_as_image_falls_back(self):
        with generation({}, lambda *args, **kwargs: FakeResponse(b"<html>" + b"x" * 1500)) as (_, report, calls):
            self.assertEqual(calls.call_count, 1)
            self.assertEqual(report["imageCount"], 0)
            self.assertIn("MIME/signature", report["warnings"][0])

    def test_wrong_aspect_falls_back(self):
        with generation({}, lambda *args, **kwargs: FakeResponse(png(576, 1024))) as (_, report, calls):
            self.assertEqual(calls.call_count, 1)
            self.assertIn("aspect", report["warnings"][0])

    def test_server_errors_cannot_exceed_total_request_budget(self):
        def fail(request, **kwargs):
            raise urllib.error.HTTPError(request.full_url, 503, "down", {}, None)
        with generation({"AI_MAX_IMAGES": "1", "AI_IMAGE_MODELS": "one,two,three"}, fail) as (_, report, calls):
            self.assertEqual(calls.call_count, 1)
            self.assertEqual(report["requestBudget"], 1)
            self.assertEqual(report["imageCount"], 0)

    def test_zero_budget_offline(self):
        with generation({"AI_MAX_IMAGES": "0"}) as (_, report, calls):
            calls.assert_not_called()
            self.assertEqual(report["requestCount"], 0)

    def test_prompt_registry_style_and_current_event(self):
        with generation({"SCRIPT": "A woman walks to the hospital. She reads her phone."}) as (_, report, calls):
            prompt = urllib.parse.unquote(urlsplit(calls.call_args_list[1].args[0].full_url).path)
            self.assertIn("strictly 2D", prompt)
            self.assertIn("Depict ONLY this current event: She reads her phone.", prompt)
            self.assertEqual(report["scenes"][1]["identityConsistency"], "prompt-guided-unverified")

    def test_decimal_and_abbreviation_split_matches_planner(self):
        with generation({"SCRIPT": "Dr. Jones measures 3.5 meters. He checks the graph."}) as (_, report, calls):
            self.assertEqual(len(report["scenes"]), 2)
            self.assertEqual(calls.call_count, 2)

    def test_truncated_jpeg_frame_header_falls_back(self):
        class TruncatedResponse(FakeResponse):
            headers = {"Content-Type": "image/jpeg"}
        # Valid SOI and EOI, but truncated SOF payload after a long APP segment.
        malformed = b"\xff\xd8\xff\xe0" + (102).to_bytes(2, "big") + b"x" * 100 + b"\xff\xc0\x00\x02\xff\xd9"
        with generation({}, lambda *args, **kwargs: TruncatedResponse(malformed)) as (_, report, calls):
            self.assertEqual(calls.call_count, 1)
            self.assertEqual(report["imageCount"], 0)
            self.assertTrue(report["warnings"])

    def test_too_many_sentences_rejected(self):
        with patch.dict(os.environ, {"SCRIPT": "A sentence. " * 181, "POLLINATIONS_KEY": ""}):
            with self.assertRaises(SystemExit):
                runpy.run_path(str(SCRIPT_FILE), run_name="__main__")

    def test_overlong_script_rejected(self):
        with patch.dict(os.environ, {"SCRIPT": "a" * 12001, "POLLINATIONS_KEY": "sk_test"}):
            with self.assertRaises(SystemExit):
                runpy.run_path(str(SCRIPT_FILE), run_name="__main__")

if __name__ == "__main__": unittest.main()
