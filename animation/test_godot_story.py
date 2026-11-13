"""Offline tests for Godot story subtitle timing and input validation."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("render-godot-story.py")
spec = importlib.util.spec_from_file_location("godot_story", SCRIPT)
story = importlib.util.module_from_spec(spec)
spec.loader.exec_module(story)

class StoryTests(unittest.TestCase):
    def test_subtitles_use_exact_frame_boundaries(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "captions.srt"
            story.make_subtitles([
                {"frames": 48, "text": "Er wacht auf."},
                {"frames": 72, "text": "Er geht zur Schule."}
            ], path)
            captions = path.read_text(encoding="utf-8")
            self.assertIn("00:00:00,000 --> 00:00:02,000", captions)
            self.assertIn("00:00:02,000 --> 00:00:05,000", captions)
            self.assertIn("Er geht zur Schule.", captions)

    def test_missing_audio_directory_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            missing = Path(tmp) / "missing"
            with self.assertRaises(FileNotFoundError):
                story.render_story("Er wacht auf.", "9:16", missing, Path(tmp) / "out.mp4")

    def test_stamp_handles_ten_minute_timeline(self):
        self.assertEqual(story.stamp(600.125), "00:10:00,125")

if __name__ == "__main__":
    unittest.main()
