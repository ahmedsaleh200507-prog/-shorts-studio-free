"""Offline tests for the iPhone production renderer mode router."""
import importlib.util
import os
import json
import tempfile
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("render-production.py")
spec = importlib.util.spec_from_file_location("render_production", SCRIPT)
production = importlib.util.module_from_spec(spec)
spec.loader.exec_module(production)

class ProductionModeTests(unittest.TestCase):
    def test_vector_portrait(self):
        with patch.dict(os.environ, {"ASPECT_RATIO": "9:16"}):
            self.assertEqual(production.normalize("[[VECTOR_2D]]\nEr geht."), ("Er geht.", True, "9:16"))

    def test_vector_landscape_either_marker_order(self):
        with patch.dict(os.environ, {"ASPECT_RATIO": "9:16"}):
            for script in ("[[VECTOR_2D]]\n[[ASPECT_16_9]]\nEr geht.",
                           "[[ASPECT_16_9]]\n[[VECTOR_2D]]\nEr geht."):
                self.assertEqual(production.normalize(script), ("Er geht.", True, "16:9"))

    def test_mp4_validation_rejects_missing_audio_and_duration_drift(self):
        def check(streams):
            result = subprocess.CompletedProcess(["ffprobe"], 0, stdout=json.dumps({"streams": streams}))
            with patch.object(production.shutil, "which", return_value="/usr/bin/ffprobe"), patch.object(production.subprocess, "run", return_value=result):
                return production.validate_mp4(Path("unused.mp4"), "9:16")
        video = {"codec_type": "video", "codec_name": "h264", "width": 540, "height": 960, "duration": "10.0"}
        audio = {"codec_type": "audio", "codec_name": "aac", "duration": "10.0"}
        self.assertEqual(check([video, audio]), 10.0)
        with self.assertRaisesRegex(RuntimeError, "AAC"):
            check([video])
        with self.assertRaisesRegex(RuntimeError, "out of sync"):
            check([video, dict(audio, duration="7.0")])
        for invalid in ("nan", "inf", "0", "-2", "N/A"):
            with self.subTest(invalid=invalid), self.assertRaisesRegex(RuntimeError, "duration"):
                check([video, dict(audio, duration=invalid)])
        with self.assertRaisesRegex(RuntimeError, "resolution"):
            check([dict(video, width=960, height=540), audio])

    def test_invalid_encoded_video_is_removed_before_download(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "output").mkdir()
            output = root / "output" / "final.mp4"
            def fake_render(*args, **kwargs):
                output.write_bytes(b"broken-video" * 3000)
                return subprocess.CompletedProcess(args, 0)
            with patch.object(production, "ROOT", root), patch.dict(os.environ, {"SCRIPT": "Neue Geschichte.", "ASPECT_RATIO": "9:16"}), patch.object(production.subprocess, "run", side_effect=fake_render), patch.object(production, "validate_mp4", side_effect=RuntimeError("Missing AAC")):
                with self.assertRaisesRegex(RuntimeError, "AAC"):
                    production.main()
            self.assertFalse(output.exists())

    def test_failed_render_does_not_leave_previous_download(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "output").mkdir()
            stale = root / "output" / "final.mp4"
            stale.write_bytes(b"old-successful-video")
            with patch.object(production, "ROOT", root), patch.dict(os.environ, {"SCRIPT": "Neue Geschichte.", "ASPECT_RATIO": "9:16"}), patch.object(production.subprocess, "run", side_effect=subprocess.CalledProcessError(1, ["npx"])):
                with self.assertRaises(subprocess.CalledProcessError):
                    production.main()
            self.assertFalse(stale.exists())

    def test_ai_illustration_keeps_remotion(self):
        with patch.dict(os.environ, {"ASPECT_RATIO": "9:16"}):
            self.assertEqual(production.normalize("The sky is blue."), ("The sky is blue.", False, "9:16"))

if __name__ == "__main__":
    unittest.main()
