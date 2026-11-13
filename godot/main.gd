extends Node2D
## Native 2D renderer prototype. All objects are flat 2D geometry.
const FPS := 24
var frame_index := 0
var total_frames := 72
var action := "wake"
var place := "bedroom"
var output_dir := "/tmp/shorts-godot-frames"
var render_size := Vector2i(540, 960)

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
	var stand := Vector2(260, 440)
	var wake := clampf((frame_index - 10.0) / 38.0, 0.0, 1.0)
	if action == "wake":
		stand += Vector2(-80 * (1.0 - wake), 130 * (1.0 - wake))
	var walking := action == "travel" or action == "carry"
	var gait := sin(t * 7.0) * 25.0 if walking else 0.0
	var torso := stand + Vector2(0, sin(t * 2.5) * 2.0)
	var hip := torso + Vector2(0, 150)
	var shoulder := torso + Vector2(0, -35)
	var skin := Color("#e9ad8b")
	var blue := Color("#397fb2")
	draw_line(hip, hip + Vector2(-30 + gait, 185), Color("#304969"), 29, true)
	draw_line(hip, hip + Vector2(30 - gait, 185), Color("#304969"), 29, true)
	draw_line(shoulder + Vector2(-37, 0), shoulder + Vector2(-62 - gait * .4, 135), blue, 27, true)
	var right_hand := shoulder + Vector2(62 + gait * .4, 135)
	if action == "brush":
		right_hand = stand + Vector2(30, -108 + sin(t * 9) * 5)
	draw_line(shoulder + Vector2(37, 0), right_hand, blue, 27, true)
	draw_circle(right_hand, 13, skin)
	draw_rect(Rect2(torso.x - 48, torso.y - 45, 96, 195), blue)
	var head := torso + Vector2(0, -110)
	draw_circle(head, 55, skin)
	draw_arc(head + Vector2(0, -14), 47, PI, TAU, 28, Color("#26364b"), 18, true)
	draw_circle(head + Vector2(-19, -4), 4, Color("#283449"))
	draw_circle(head + Vector2(19, -4), 4, Color("#283449"))
	draw_arc(head + Vector2(0, 20), 15, .2, PI - .2, 12, Color("#9a5149"), 3, true)
	if action == "brush":
		draw_line(right_hand, head + Vector2(0, 24), Color.WHITE, 7, true)
		draw_line(head + Vector2(-8, 22), head + Vector2(9, 22), Color("#4cc0d0"), 7, true)
	if action == "pick":
		var reach := clampf(frame_index / 25.0, 0.0, 1.0)
		var apple := Vector2(380 - 90 * reach, 540 - 70 * reach)
		draw_circle(apple, 20, Color("#dd333e"))
		draw_line(apple + Vector2(0, -19), apple + Vector2(5, -30), Color("#5b4934"), 4, true)
		draw_line(shoulder + Vector2(37, 0), apple, blue, 22, true)
