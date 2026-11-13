extends Node2D
## Native 2D renderer prototype. All objects are flat 2D geometry.
const FPS := 24
const TwoBoneIK = preload("res://two_bone_ik.gd")
const FootPlant = preload("res://foot_plant.gd")
var frame_index := 0
var total_frames := 72
var action := "wake"
var place := "bedroom"
var output_dir := "/tmp/shorts-godot-frames"
var render_size := Vector2i(540, 960)
var scene_progress := 0.0

func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--action="): action = arg.trim_prefix("--action=")
		if arg.begins_with("--place="): place = arg.trim_prefix("--place=")
		if arg.begins_with("--frames="): total_frames = clampi(int(arg.trim_prefix("--frames=")), 1, 2400)
		if arg.begins_with("--out="): output_dir = arg.trim_prefix("--out=")
		if arg.begins_with("--aspect="):
			if arg.trim_prefix("--aspect=") == "16:9": render_size = Vector2i(960, 540)
	DirAccess.make_dir_recursive_absolute(output_dir)
	get_window().size = render_size
	get_viewport().size = render_size
	# One sequential capture loop prevents overlapping asynchronous _process calls.
	for i in range(total_frames):
		frame_index = i
		scene_progress = float(i) / float(maxi(total_frames - 1, 1))
		queue_redraw()
		await RenderingServer.frame_post_draw
		if not _save_frame():
			get_tree().quit(1)
			return
	get_tree().quit()

func _save_frame() -> bool:
	if frame_index >= total_frames: return false
	var image := get_viewport().get_texture().get_image()
	if image.is_empty():
		push_error("Empty rendered frame")
		return false
	var filename := "%s/frame_%05d.png" % [output_dir, frame_index]
	if image.save_png(filename) != OK:
		push_error("Could not save frame")
		return false
	# Frame index is controlled exclusively by the sequential capture loop.
	return true

func _draw() -> void:
	# Authoring coordinates use a 540x960 portrait canvas.
	# Fit the entire scene to landscape without clipping.
	var scale_factor := minf(float(render_size.x) / 540.0, float(render_size.y) / 960.0)
	var offset := (Vector2(render_size) - Vector2(540, 960) * scale_factor) / 2.0
	draw_set_transform(offset, 0.0, Vector2.ONE * scale_factor)
	var t := float(frame_index) / FPS
	draw_rect(Rect2(0, 0, 540, 960), Color("#c6dfeb"))
	draw_rect(Rect2(0, 690, 540, 270), Color("#b88e70"))
	if place == "bathroom":
		draw_rect(Rect2(35, 200, 180, 300), Color("#eaf4f5"))
		draw_rect(Rect2(45, 460, 160, 25), Color("#83adb8"))
		draw_rect(Rect2(70, 485, 110, 80), Color("#f5f8f8"))
		draw_rect(Rect2(110, 400, 15, 60), Color("#a5b4bd"))
	elif place == "transport":
		draw_rect(Rect2(20, 260, 500, 340), Color("#537a9c"))
		for x in [55, 205, 355]:
			draw_rect(Rect2(x, 295, 110, 130), Color("#b8e3ef"))
		draw_rect(Rect2(30, 570, 480, 35), Color("#243b52"))
	elif place == "bedroom":
		draw_rect(Rect2(20, 625, 305, 85), Color("#f3e8e0"))
		draw_rect(Rect2(30, 611, 95, 36), Color.WHITE)
	elif place == "supermarket":
		for x in [25, 400]:
			draw_rect(Rect2(x, 230, 115, 470), Color("#8b5e43"))
			for y in [270, 390, 510]:
				draw_rect(Rect2(x + 12, y, 90, 14), Color("#f1cc69"))
	_draw_character(float(frame_index) / FPS)
	# Subtle scene fade at clip boundaries; character animation remains continuous within the scene.
	var fade_in := 1.0 - smoothstep(0.0, 0.10, scene_progress)
	var fade_out := smoothstep(0.90, 1.0, scene_progress)
	draw_rect(Rect2(0, 0, 540, 960), Color(0.04, 0.07, 0.12, maxf(fade_in, fade_out) * 0.65))

func _draw_character(t: float) -> void:
	# Layered vector character with articulated joints, clothing, hair, face and props.
	var skin := Color("#e8ac8a")
	var shadow := Color("#c78267")
	var shirt := Color("#397fb2")
	var shirt_dark := Color("#235c8c")
	var trousers := Color("#273d61")
	var outline := Color("#24354a")
	var hair := Color("#263044")
	var phase := sin(t * 7.0)
	var walking := action == "travel" or action == "carry"
	var gait := phase * 28.0 if walking else 0.0
	var sway := sin(t * 3.5) * 3.0
	var breathe := sin(t * 2.4) * 2.5
	var travel_x := lerpf(-78.0, 78.0, smoothstep(0.0, 1.0, scene_progress)) if walking else 0.0
	var root := Vector2(270 + travel_x + (sin(t * 1.3) * 4.0 if not walking else 0.0), 420 + (absf(phase) * 3.0 if walking else breathe))
	if action == "wake":
		var rise := smoothstep(0.0, 1.5, t)
		root += Vector2(-75.0 * (1.0 - rise), 130.0 * (1.0 - rise))
		root += Vector2(0, -12.0 * (1.0 - rise))
	var hip := root + Vector2(0, 150)
	var shoulder := root + Vector2(sway, -30)
	var stride := 156.0 * 0.9 / maxf(float(total_frames) / FPS, 0.9)
	var foot_origin := Vector2((t / 0.9) * stride - 78.0, 0)
	var left_ankle := FootPlant.foot(t, -1, stride) + foot_origin if walking else hip + Vector2(-29, 185)
	var right_ankle := FootPlant.foot(t, 1, stride) + foot_origin if walking else hip + Vector2(29, 185)
	var left_hip := hip + Vector2(-19, 0)
	var right_hip := hip + Vector2(19, 0)
	var left_knee: Vector2 = TwoBoneIK.solve(left_hip, left_ankle, 96.0, 96.0, 1.0)[0]
	var right_knee: Vector2 = TwoBoneIK.solve(right_hip, right_ankle, 96.0, 96.0, -1.0)[0]
	# Back leg, shoes and seams.
	for leg in [[left_hip, left_knee, left_ankle], [right_hip, right_knee, right_ankle]]:
		draw_line(leg[0], leg[1], outline, 37, true)
		draw_line(leg[0], leg[1], trousers, 30, true)
		draw_line(leg[1], leg[2], outline, 34, true)
		draw_line(leg[1], leg[2], trousers, 27, true)
		draw_circle(leg[1], 15, trousers)
	for ankle in [left_ankle, right_ankle]:
		draw_line(ankle + Vector2(-9, 3), ankle + Vector2(22, 4), outline, 18, true)
		draw_line(ankle + Vector2(-7, 0), ankle + Vector2(19, 1), Color("#f4f1e8"), 11, true)
	var left_elbow := shoulder + Vector2(-63 - gait * 0.35, 72)
	var left_hand := shoulder + Vector2(-59 - gait * 0.5, 139)
	var right_elbow := shoulder + Vector2(62 + gait * 0.25, 70)
	var right_hand := shoulder + Vector2(62 + gait * 0.5, 139)
	if action == "brush":
		right_elbow = shoulder + Vector2(76, 34)
		right_hand = root + Vector2(19, -104 + sin(t * 11.0) * 5.0)
	elif action == "pick":
		var reach := smoothstep(0.0, 1.0, t)
		right_elbow = shoulder + Vector2(90, 56)
		right_hand = Vector2(385, 538).lerp(Vector2(307, 494), reach)
	elif action == "talk":
		right_hand += Vector2(24, -35 + sin(t * 5.0) * 17)
	# Two-bone IK maintains forearm/upper-arm lengths while tracking props.
	var left_shoulder := shoulder + Vector2(-40, 0)
	var right_shoulder := shoulder + Vector2(40, 0)
	var left_pose: Array[Vector2] = TwoBoneIK.solve(left_shoulder, left_hand, 81.0, 81.0, -1.0)
	var right_pose: Array[Vector2] = TwoBoneIK.solve(right_shoulder, right_hand, 81.0, 81.0, 1.0)
	left_elbow = left_pose[0]
	left_hand = left_pose[1]
	right_elbow = right_pose[0]
	right_hand = right_pose[1]
	# Arms have jointed sleeves and visible hands.
	for points in [[shoulder + Vector2(-40, 0), left_elbow, left_hand], [shoulder + Vector2(40, 0), right_elbow, right_hand]]:
		draw_line(points[0], points[1], outline, 35, true)
		draw_line(points[0], points[1], shirt_dark, 28, true)
		draw_line(points[1], points[2], outline, 24, true)
		draw_line(points[1], points[2], skin, 19, true)
		draw_circle(points[2], 13, skin)
		draw_circle(points[2] + Vector2(3, 3), 5, shadow)
	# Tailored silhouette instead of a rectangular torso.
	var body := PackedVector2Array([
		shoulder + Vector2(-45, -12), shoulder + Vector2(45, -12),
		hip + Vector2(43, 0), hip + Vector2(-43, 0)])
	draw_colored_polygon(body, outline)
	var inner := PackedVector2Array([
		shoulder + Vector2(-40, -8), shoulder + Vector2(40, -8),
		hip + Vector2(37, -5), hip + Vector2(-37, -5)])
	draw_colored_polygon(inner, shirt)
	draw_line(shoulder + Vector2(-26, 8), hip + Vector2(-25, -18), Color("#5aa0cc"), 5, true)
	draw_line(hip + Vector2(-37, -4), hip + Vector2(37, -4), shirt_dark, 9, true)
	# Neck, ears, head and hairstyle, all 2D vector primitives.
	var head := root + Vector2(sway * 0.4, -110)
	draw_line(shoulder + Vector2(0, -15), head + Vector2(0, 37), outline, 27, true)
	draw_line(shoulder + Vector2(0, -15), head + Vector2(0, 37), skin, 20, true)
	draw_circle(head + Vector2(-53, 4), 14, shadow)
	draw_circle(head + Vector2(53, 4), 14, shadow)
	draw_circle(head, 57, outline)
	draw_circle(head, 53, skin)
	draw_arc(head + Vector2(-6, 1), 47, 1.8, 2.6, 12, shadow, 3, true)
	# Asymmetric hair cap and fringe.
	draw_arc(head + Vector2(0, -14), 47, PI * 1.03, TAU * 1.02, 30, hair, 19, true)
	draw_colored_polygon(PackedVector2Array([
		head + Vector2(-44, -38), head + Vector2(-20, -62),
		head + Vector2(23, -58), head + Vector2(45, -39),
		head + Vector2(11, -37), head + Vector2(-13, -27)]), hair)
	var blink := fmod(t + 0.1, 3.6) > 3.48
	for x in [-20.0, 20.0]:
		var eye := head + Vector2(x, -5)
		if blink:
			draw_line(eye + Vector2(-8, 0), eye + Vector2(8, 0), outline, 3, true)
		else:
			draw_circle(eye, 9, Color("#fffaf3"))
			draw_circle(eye + Vector2(1, 1), 4, outline)
			draw_circle(eye + Vector2(2, -1), 1.5, Color.WHITE)
		draw_line(eye + Vector2(-9, -15), eye + Vector2(8, -17), hair, 4, true)
	draw_line(head + Vector2(0, 1), head + Vector2(-3, 17), shadow, 3, true)
	var mouth_open := action == "talk" and sin(t * 10.0) > 0
	if mouth_open:
		draw_circle(head + Vector2(0, 29), 9, Color("#923f4a"))
		draw_line(head + Vector2(-5, 32), head + Vector2(5, 32), Color("#f5b2aa"), 3, true)
	else:
		draw_arc(head + Vector2(0, 22), 15, 0.25, PI - 0.25, 12, Color("#9d5050"), 3, true)
	if action == "brush":
		draw_line(right_hand, head + Vector2(0, 27), Color("#f6ffff"), 7, true)
		draw_line(head + Vector2(-8, 27), head + Vector2(10, 27), Color("#44c8d7"), 7, true)
	if action == "pick":
		var apple := right_hand + Vector2(5, -10)
		draw_circle(apple, 18, Color("#d83f47"))
		draw_line(apple + Vector2(0, -16), apple + Vector2(5, -27), Color("#554333"), 4, true)
		draw_circle(apple + Vector2(-6, -6), 4, Color("#f47a7b"))
	if action == "carry":
		var bag := left_hand + Vector2(-7, 20)
		draw_rect(Rect2(bag + Vector2(-30, -7), Vector2(62, 69)), outline)
		draw_rect(Rect2(bag + Vector2(-25, -3), Vector2(52, 60)), Color("#e2ad64"))
		draw_arc(bag + Vector2(0, -7), 16, PI, TAU, 14, outline, 5, true)
