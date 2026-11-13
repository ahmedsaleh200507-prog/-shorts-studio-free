extends SceneTree
const FootPlant = preload("res://foot_plant.gd")
func _initialize() -> void:
	for side in [-1, 1]:
		for cycle in range(4):
			var start := (float(cycle) + (0.5 if side > 0 else 0.0)) * 0.9
			# Check a complete stance interval after accounting for the half-cycle offset.
			start = (float(cycle) - (0.5 if side > 0 else 0.0)) * 0.9
			if start < 0.0:
				continue
			var first: Vector2 = FootPlant.foot(start + 0.01, side)
			var last: Vector2 = FootPlant.foot(start + 0.50, side)
			var body_motion := (0.50 - 0.01) / 0.9 * 76.0
			assert(absf((last.x - first.x) + body_motion) < 0.05, "Stance foot slides in world space")
			assert(absf(first.y - 755.0) < 0.01 and absf(last.y - 755.0) < 0.01, "Stance foot leaves ground")
	var swing: Vector2 = FootPlant.foot(0.72, -1)
	assert(swing.y < 755.0, "Swing foot never lifts")
	print("Foot planting: stance lock and swing lift verified")
	quit(0)
