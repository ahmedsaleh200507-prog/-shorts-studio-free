"""Fast unit tests for Godot render argument validation (no GPU needed)."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("render-godot-video.py")
spec = importlib.util.spec_from_file_location("godot_video", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class RenderValidationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.output = Path(self.tmp.name) / "demo.mp4"

    def tearDown(self):
        self.tmp.cleanup()

    def test_rejects_unknown_action(self):
        with self.assertRaisesRegex(ValueError, "Unsupported action"):
            module.render("teleport", "bedroom", 2, "9:16", None, self.output)

    def test_rejects_unknown_place(self):
        with self.assertRaisesRegex(ValueError, "Unsupported place"):
            module.render("wake", "mars", 2, "9:16", None, self.output)

    def test_rejects_invalid_aspect(self):
        with self.assertRaisesRegex(ValueError, "Unsupported aspect"):
            module.render("wake", "bedroom", 2, "4:3", None, self.output)

    def test_rejects_excessive_scene_length(self):
        with self.assertRaisesRegex(ValueError, "Scene length"):
            module.render("wake", "bedroom", 200, "9:16", None, self.output)

    def test_reports_missing_executable(self):
        with patch.object(module.shutil, "which", return_value=None):
            with self.assertRaisesRegex(RuntimeError, "Missing required executable: godot"):
                module.render("wake", "bedroom", 2, "9:16", None, self.output)

if __name__ == "__main__":
    unittest.main()
