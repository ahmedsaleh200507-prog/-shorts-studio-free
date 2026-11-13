"""Offline tests for the iPhone production renderer mode router."""
import importlib.util
import os
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

    def test_ai_illustration_keeps_remotion(self):
        with patch.dict(os.environ, {"ASPECT_RATIO": "9:16"}):
            self.assertEqual(production.normalize("The sky is blue."), ("The sky is blue.", False, "9:16"))

if __name__ == "__main__":
    unittest.main()
