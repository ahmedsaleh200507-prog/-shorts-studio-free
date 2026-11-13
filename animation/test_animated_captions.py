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

    def test_verified_word_alignment_and_fallback(self):
        scene = {"frames": 72, "text": "Hallo Welt"}
        aligned = [{"word": "Hallo", "start": 0.4, "end": 1.2},
                   {"word": "Welt", "start": 1.4, "end": 2.8}]
        timed = story.caption_word_timings(scene, 5.0, aligned)
        self.assertEqual(timed, [("Hallo", 5.4, 6.2), ("Welt", 6.4, 7.8)])
        bad = [{"word": "Wrong", "start": 0.4, "end": 1.2},
               {"word": "Welt", "start": 1.4, "end": 2.8}]
        fallback = story.caption_word_timings(scene, 5.0, bad)
        self.assertEqual(fallback[0][1], 5.0)

    def test_long_captions_split_into_readable_groups(self):
        scene = [{"frames": 120, "text": "Eine sehr lange Überschrift braucht eine klare gut lesbare Aufteilung"}]
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "captions.ass"
            story.make_animated_subtitles(scene, path)
            output = path.read_text(encoding="utf-8")
        self.assertEqual(output.count("Dialogue: 0,"), 10)
        self.assertIn("Eine sehr lange", output)
        self.assertIn("gut lesbare", output)

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
