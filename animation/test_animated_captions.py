"""Unit tests for ASS karaoke caption generation (no Godot/FFmpeg needed)."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

MODULE = Path(__file__).with_name("render-godot-story.py")
spec = importlib.util.spec_from_file_location("story_render", MODULE)
story = importlib.util.module_from_spec(spec)
spec.loader.exec_module(story)


class AnimatedCaptionsTests(unittest.TestCase):
    def test_word_events_and_safe_text(self):
        scenes = [{"frames": 72, "text": "Hallo Welt {test} heute"}]
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "captions.ass"
            story.make_animated_subtitles(scenes, target, "9:16")
            result = target.read_text(encoding="utf-8")
        self.assertIn("PlayResX: 540", result)
        self.assertIn("PlayResY: 960", result)
        self.assertEqual(result.count("Dialogue: 0,"), 4)
        self.assertIn("｛test｝", result)
        self.assertIn(r"\fscx115", result)
        self.assertIn(r"\c&H0060C6F1&", result)

    def test_landscape_and_empty_scenes(self):
        scenes = [{"frames": 24, "text": ""}, {"frames": 48, "text": "Hello world"}]
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "captions.ass"
            story.make_animated_subtitles(scenes, target, "16:9")
            result = target.read_text(encoding="utf-8")
        self.assertIn("PlayResX: 960", result)
        self.assertIn("PlayResY: 540", result)
        self.assertIn("Dialogue: 0,0:00:01.00", result)
        self.assertEqual(result.count("Dialogue: 0,"), 2)


if __name__ == "__main__":
    unittest.main()
