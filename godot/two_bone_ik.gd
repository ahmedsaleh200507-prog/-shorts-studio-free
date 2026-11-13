extends RefCounted
class_name TwoBoneIK
## Analytic two-bone inverse kinematics in flat 2D.
## Returns [joint, end_effector]. Reach is clamped to physically valid lengths.
static func solve(origin: Vector2, target: Vector2, upper: float, lower: float, bend: float = 1.0) -> Array[Vector2]:
	if upper <= 0.0 or lower <= 0.0:
		return [origin, origin]
	var displacement := target - origin
	var distance := displacement.length()
	var direction := displacement.normalized() if distance > 0.00001 else Vector2.RIGHT
	var minimum := absf(upper - lower) + 0.0001
	var maximum := upper + lower - 0.0001
	var reach := clampf(distance, minimum, maximum)
	var end_point := origin + direction * reach
	var along := (upper * upper - lower * lower + reach * reach) / (2.0 * reach)
	var height := sqrt(maxf(0.0, upper * upper - along * along))
	var normal := Vector2(-direction.y, direction.x)
	var joint := origin + direction * along + normal * height * (1.0 if bend >= 0.0 else -1.0)
	return [joint, end_point]
