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

    def test_punctuation_boundary_keeps_real_speech_timing(self):
        scene = {"frames": 72, "text": "Hallo, Welt!"}
        aligned = [
            {"word": "Hallo", "start": 0.2, "end": 0.8},
            {"word": ",", "start": 0.8, "end": 0.85},
            {"word": "Welt", "start": 1.0, "end": 1.7},
            {"word": "!", "start": 1.7, "end": 1.75},
        ]
        timed = story.caption_word_timings(scene, 0, aligned)
        self.assertEqual(timed, [("Hallo,", 0.2, 0.85), ("Welt!", 1.0, 1.75)])

    def test_long_captions_split_into_readable_groups(self):
        scene = [{"frames": 120, "text": "Eine sehr lange Überschrift braucht eine klare gut lesbare Aufteilung"}]
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "captions.ass"
            story.make_animated_subtitles(scene, path)
            output = path.read_text(encoding="utf-8")
        self.assertEqual(output.count("Dialogue: 0,"), 10)
        self.assertIn("Eine ", output)
        self.assertIn("sehr ", output)
        self.assertIn("lange", output)
        self.assertIn("gut", output)
        self.assertIn("lesbare", output)

    def test_scene_timeline_and_video_validation(self):
        scenes = [
            {"text": "Hello", "frames": 48, "startFrame": 0, "endFrame": 48},
            {"text": "World", "frames": 24, "startFrame": 48, "endFrame": 72},
        ]
        self.assertEqual(story.validate_scene_plan(scenes), 72)
        broken = [dict(scenes[0]), dict(scenes[1], startFrame=47)]
        with self.assertRaisesRegex(ValueError, "wrong frame"):
            story.validate_scene_plan(broken)
        streams = [
            {"codec_type": "video", "codec_name": "h264", "width": 540, "height": 960, "duration": "3.0"},
            {"codec_type": "audio", "codec_name": "aac"},
        ]
        self.assertTrue(story.validate_final_video(streams, "9:16", 3.0))
        with self.assertRaisesRegex(RuntimeError, "dimensions"):
            story.validate_final_video(streams, "16:9", 3.0)
        with self.assertRaisesRegex(RuntimeError, "duration"):
            story.validate_final_video(streams, "9:16", 5.0)
        with self.assertRaisesRegex(RuntimeError, "AAC"):
            story.validate_final_video(streams[:1], "9:16", 3.0)

    def test_character_and_object_continuity(self):
        doctor = {"narrative": {"actor": "doctor", "objects": ["phone"]}, "props": ["irrelevant"]}
        follow_up = {"narrative": {"actor": "doctor", "objects": ["phone"]}, "props": []}
        self.assertEqual(story.stable_character(doctor, 0), 2)
        self.assertEqual(story.stable_character(follow_up, 2), 2)
        self.assertEqual(story.visual_props(follow_up), ["phone"])
        self.assertEqual(story.visual_props({"narrative": {"objects": ["phone"]}, "props": ["desk", "phone", "window"]}), ["phone", "desk", "window"])
        self.assertEqual(story.stable_character({"narrative": {"actor": "main"}}, 2), 2)

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
