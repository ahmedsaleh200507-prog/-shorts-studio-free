"""Real tiny FFmpeg fixtures exercise the quality checker, including its failures."""
import importlib.util
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("verify_video", Path(__file__).with_name("verify-video.py"))
VERIFY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VERIFY)


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "Requires FFmpeg and FFprobe")
class QualityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.file = Path(self.temp.name) / "fixture.mp4"

    def fixture(self, source="testsrc2=size=160x90:rate=12", audio="sine=frequency=440:sample_rate=24000"):
        command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", source]
        if audio:
            command += ["-f", "lavfi", "-i", audio]
        command += ["-t", "1.2", "-c:v", "libx264", "-threads", "1", "-pix_fmt", "yuv420p"]
        if audio:
            command += ["-c:a", "aac"]
        subprocess.run(command + [str(self.file)], check=True, capture_output=True)

    def test_real_h264_aac_motion_and_scene_samples(self):
        self.fixture()
        plan = {"fps": 12, "scenes": [{"startFrame": 0, "endFrame": 14}]}
        report = VERIFY.verify(self.file, aspect="16:9", width=160, height=90,
                               expected_duration=1.2, plan=plan)
        self.assertTrue(report["passed"], report)
        sample = report["checks"]["motion_samples"][0]
        self.assertGreater(sample["mean_pixel_difference"], .15)
        self.assertGreater(sample["from"], 0)
        self.assertLess(sample["to"], 1.2)

    def test_missing_audio_is_rejected(self):
        self.fixture(audio=None)
        self.assertIn("Missing compatible AAC audio stream", VERIFY.verify(self.file)["failures"])

    def test_silent_audio_is_rejected(self):
        self.fixture(audio="anullsrc=channel_layout=mono:sample_rate=24000")
        self.assertTrue(any("silent" in item for item in VERIFY.verify(self.file)["failures"]))

    def test_black_frozen_video_is_rejected(self):
        self.fixture(source="color=c=black:size=160x90:rate=12")
        failures = VERIFY.verify(self.file)["failures"]
        self.assertTrue(any("Black/empty" in item for item in failures), failures)
        self.assertIn("No detectable motion in any sampled window", failures)

    def test_wrong_ratio_and_duration_are_rejected(self):
        self.fixture()
        failures = VERIFY.verify(self.file, aspect="9:16", expected_duration=5)["failures"]
        self.assertTrue(any("aspect" in item for item in failures), failures)
        self.assertTrue(any("duration differs" in item for item in failures), failures)

    def aligned_fixture(self, repeat_wrong_scene=False):
        audio_dir = Path(self.temp.name)
        for index, frequency in enumerate((220, 730)):
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
                            f"aevalsrc=0.4*sin(2*PI*({frequency}*t+157*t*t)):s=24000:d=1.2",
                            str(audio_dir / f"job-{index}.wav")], check=True, capture_output=True)
        second = 0 if repeat_wrong_scene else 1
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
                        "testsrc2=size=160x90:rate=12", "-i", str(audio_dir / "job-0.wav"),
                        "-i", str(audio_dir / f"job-{second}.wav"), "-filter_complex",
                        "[1:a][2:a]concat=n=2:v=0:a=1[a]", "-map", "0:v", "-map", "[a]", "-t", "2.4",
                        "-c:v", "libx264", "-threads", "1", "-pix_fmt", "yuv420p", "-c:a", "aac",
                        str(self.file)], check=True, capture_output=True)
        plan = {"fps": 10, "scenes": [{"startFrame": 0, "endFrame": 12},
                                      {"startFrame": 12, "endFrame": 24}]}
        return VERIFY.verify(self.file, plan=plan, audio_dir=audio_dir)

    def test_exported_audio_matches_each_original_scene(self):
        report = self.aligned_fixture()
        self.assertTrue(report["passed"], report)
        matches = report["checks"]["narration_alignment"]
        self.assertEqual(len(matches), 2)
        self.assertTrue(all(match["correlation"] > .9 for match in matches), matches)
        self.assertTrue(all(abs(match["offset_seconds"]) < .01 for match in matches), matches)

    def test_equal_duration_wrong_repeated_audio_is_rejected(self):
        report = self.aligned_fixture(repeat_wrong_scene=True)
        streams = report["checks"]["streams"]
        self.assertLess(abs(streams["video_seconds"] - streams["audio_seconds"]), .1)
        self.assertTrue(any("Narration waveform mismatch in scene 2" in item
                            for item in report["failures"]), report)


if __name__ == "__main__":
    unittest.main()
