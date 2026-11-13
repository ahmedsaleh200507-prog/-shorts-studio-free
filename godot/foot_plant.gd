extends RefCounted
class_name FootPlant
## Deterministic stance/swing gait. A stance foot is stationary in world space.
## stride is the distance travelled by the body in one complete gait cycle.
static func foot(t: float, side: int, stride: float = 76.0, period: float = 0.9, ground_y: float = 755.0) -> Vector2:
	var cycle := t / period + (0.5 if side > 0 else 0.0)
	var step_index := floorf(cycle)
	var phase := cycle - step_index
	var center := 270.0 + (step_index + (0.5 if side > 0 else 0.0)) * stride
	var x := center
	var y := ground_y
	if phase >= 0.62:
		var swing := (phase - 0.62) / 0.38
		var eased := swing * swing * (3.0 - 2.0 * swing)
		x += eased * stride
		y -= sin(PI * swing) * 32.0
	return Vector2(x, y)
