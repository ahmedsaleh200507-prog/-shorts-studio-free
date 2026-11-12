import unittest
from scene_planner import plan

class ScenePlannerTests(unittest.TestCase):
    def test_german_scene_types(self):
        result = plan("Die Stadt ist dunkel. Das Handy zeigt eine Warnung. Die Karte zeigt den Weg.")
        self.assertEqual([s["visual"] for s in result["scenes"]], ["city", "phone", "map"])
        self.assertTrue(result["all_supported"])

    def test_english_scene_types(self):
        result = plan("The city is dark. An emergency phone rings. The map shows a route.")
        self.assertEqual([s["visual"] for s in result["scenes"]], ["city", "phone", "map"])

    def test_unknown_scene_is_not_faked(self):
        result = plan("Ein Mann putzt seine Zähne.")
        self.assertEqual(result["scenes"][0]["visual"], "unsupported")
        self.assertFalse(result["all_supported"])

    def test_permuted_script_preserves_order(self):
        result = plan("The map shows a route. A phone displays a warning. The city goes dark.")
        self.assertEqual([scene["visual"] for scene in result["scenes"]], ["map", "phone", "city"])
        self.assertTrue(result["all_supported"])

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            plan("   ")

if __name__ == "__main__":
    unittest.main()
