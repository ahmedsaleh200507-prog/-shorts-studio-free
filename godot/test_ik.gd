extends SceneTree
const IK = preload("res://two_bone_ik.gd")
func _initialize() -> void:
	var tests := [
		[Vector2.ZERO, Vector2(100, 40), 70.0, 65.0, 1.0],
		[Vector2(10, 20), Vector2(1000, 20), 80.0, 80.0, -1.0],
		[Vector2.ZERO, Vector2.ZERO, 80.0, 60.0, 1.0],
		[Vector2(10, 20), Vector2(11, 20), 80.0, 60.0, -1.0]
	]
	for t in tests:
		var pose: Array[Vector2] = IK.solve(t[0], t[1], t[2], t[3], t[4])
		assert(absf(pose[0].distance_to(t[0]) - t[2]) < 0.02, "Upper bone changed length")
		assert(absf(pose[1].distance_to(pose[0]) - t[3]) < 0.02, "Lower bone changed length")
		assert(pose[0].is_finite() and pose[1].is_finite(), "Nonfinite joint")
	print("Two-bone IK: all four test poses passed")
	quit(0)
