extends Node2D
## Native 2D renderer prototype. All objects are flat 2D geometry.
const FPS := 24
var frame_index := 0
var total_frames := 72
var action := "wake"
var place := "bedroom"
var output_dir := "/tmp/shorts-godot-frames"

func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--action="): action = arg.trim_prefix("--action=")
		if arg.begins_with("--place="): place = arg.trim_prefix("--place=")
		if arg.begins_with("--frames="): total_frames = clampi(int(arg.trim_prefix("--frames=")), 1, 2400)
		if arg.begins_with("--out="): output_dir = arg.trim_prefix("--out=")
	DirAccess.make_dir_recursive_absolute(output_dir)
	get_window().size = Vector2i(540, 960)
	queue_redraw()
	await RenderingServer.frame_post_draw
	_save_frame()

func _process(_delta: float) -> void:
	if frame_index >= total_frames:
		get_tree().quit()
		return
	queue_redraw()
	await RenderingServer.frame_post_draw
	_save_frame()

func _save_frame() -> void:
	if frame_index >= total_frames: return
	var image := get_viewport().get_texture().get_image()
	if image.is_empty():
		push_error("Empty rendered frame")
		get_tree().quit(1)
		return
	var filename := "%s/frame_%05d.png" % [output_dir, frame_index]
	if image.save_png(filename) != OK:
		push_error("Could not save frame")
		get_tree().quit(1)
		return
	frame_index += 1

func _draw() -> void:
	var t := float(frame_index) / FPS
	draw_rect(Rect2(0, 0, 540, 960), Color("#c6dfeb"))
	draw_rect(Rect2(0, 690, 540, 270), Color("#b88e70"))
	if place == "bedroom":
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
