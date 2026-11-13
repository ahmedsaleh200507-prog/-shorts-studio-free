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
var character_variant := 0
var emotion := "neutral"
var camera_mode := "slow-push"
var mouth_levels: Array = []
var visual_objects: Array = []

func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--action="): action = arg.trim_prefix("--action=")
		if arg.begins_with("--character="): character_variant = clampi(int(arg.trim_prefix("--character=")), 0, 3)
		if arg.begins_with("--emotion="): emotion = arg.trim_prefix("--emotion=")
		if arg.begins_with("--camera="): camera_mode = arg.trim_prefix("--camera=")
		if arg.begins_with("--mouth-file="):
			var mouth_path := arg.trim_prefix("--mouth-file=")
			if FileAccess.file_exists(mouth_path):
				var parsed = JSON.parse_string(FileAccess.get_file_as_string(mouth_path))
				if parsed is Array: mouth_levels = parsed
		if arg.begins_with("--objects-file="):
			var objects_path := arg.trim_prefix("--objects-file=")
			if FileAccess.file_exists(objects_path):
				var objects_data = JSON.parse_string(FileAccess.get_file_as_string(objects_path))
				if objects_data is Array: visual_objects = objects_data.slice(0, 12)
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
	# Camera rig: eased dolly, pan and a restrained handheld drift in 2D.
	var ease := smoothstep(0.0, 1.0, scene_progress)
	var zoom := 1.0
	var camera_pan := Vector2.ZERO
	match camera_mode:
		"follow":
			zoom = 1.06
			camera_pan = Vector2(-65.0 * (ease - 0.5), -8.0)
		"close-up":
			zoom = lerpf(1.08, 1.22, ease)
			camera_pan = Vector2(0, 45)
		"reveal":
			zoom = lerpf(1.17, 1.0, ease)
			camera_pan = Vector2(-22.0 * (1.0 - ease), 0)
		"static":
			zoom = 1.0
		_:
			zoom = lerpf(1.0, 1.055, ease)
			camera_pan = Vector2(14.0 * sin(scene_progress * PI), -10.0 * ease)
	var camera_offset := Vector2(270, 480) * (1.0 - zoom) + camera_pan
	# Paint the full output canvas before the portrait-safe composition.
	# Landscape previously left large empty side bars around the portrait scene.
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	draw_rect(Rect2(Vector2.ZERO, Vector2(render_size)), Color("#c6dfeb"))
	var floor_y := offset.y + 690.0 * scale_factor
	draw_rect(Rect2(0, floor_y, render_size.x, render_size.y - floor_y), Color("#b88e70"))
	# Architectural side panels fill the widescreen margins while preserving the actor.
	if render_size.x > render_size.y:
		var left_edge := offset.x
		var right_edge := offset.x + 540.0 * scale_factor
		for panel in [Rect2(0, 0, left_edge, floor_y), Rect2(right_edge, 0, render_size.x - right_edge, floor_y)]:
			draw_rect(panel, Color("#b1d2df"))
			draw_line(panel.position + Vector2(0, floor_y * 0.45), panel.position + Vector2(panel.size.x, floor_y * 0.45), Color("#91b6c5"), 3.0)
	draw_set_transform(offset + camera_offset * scale_factor, 0.0, Vector2.ONE * scale_factor * zoom)
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
	elif place == "hospital":
		# Hospital ward: examination bed, wall monitor and clinical panels.
		draw_rect(Rect2(25, 180, 490, 410), Color("#e8f5f5"))
		draw_rect(Rect2(35, 220, 170, 125), Color("#496c83"))
		draw_rect(Rect2(48, 235, 145, 94), Color("#a9d6dd"))
		draw_line(Vector2(55, 285), Vector2(180, 285), Color("#52a77d"), 5, true)
		draw_rect(Rect2(305, 590, 205, 40), Color("#f7fbfc"))
		draw_rect(Rect2(330, 625, 13, 75), Color("#77909d"))
		draw_rect(Rect2(475, 625, 13, 75), Color("#77909d"))
	elif place == "school":
		# Classroom: chalkboard, desk and window.
		draw_rect(Rect2(25, 190, 320, 250), Color("#76563b"))
		draw_rect(Rect2(37, 203, 295, 222), Color("#386f63"))
		draw_line(Vector2(70, 265), Vector2(230, 265), Color("#f3f3dd"), 4, true)
		draw_rect(Rect2(395, 220, 110, 200), Color("#f9f5e7"))
		draw_rect(Rect2(405, 230, 90, 180), Color("#a7d9e9"))
		draw_rect(Rect2(35, 615, 185, 25), Color("#9c7654"))
		draw_rect(Rect2(55, 640, 12, 90), Color("#654b39"))
		draw_rect(Rect2(192, 640, 12, 90), Color("#654b39"))
	elif place == "supermarket":
		for x in [25, 400]:
			draw_rect(Rect2(x, 230, 115, 470), Color("#8b5e43"))
			for y in [270, 390, 510]:
				draw_rect(Rect2(x + 12, y, 90, 14), Color("#f1cc69"))
	if action == "sit":
		draw_rect(Rect2(192, 655, 156, 18), Color("#80624b"))
		draw_rect(Rect2(200, 670, 12, 96), Color("#58453c"))
		draw_rect(Rect2(330, 670, 12, 96), Color("#58453c"))
		draw_rect(Rect2(192, 520, 16, 150), Color("#80624b"))
	# Contact shadow keeps the character visually grounded.
	var shadow_x := 270.0 + (lerpf(-78.0, 78.0, smoothstep(0.0, 1.0, scene_progress)) if action == "travel" or action == "carry" else 0.0)
	draw_circle(Vector2(shadow_x, 755), 48, Color(0.12, 0.14, 0.20, 0.16))
	if place in ["space", "science", "nature", "technology", "phone", "clock", "alert", "map", "history", "infographic", "door", "metro", "radio"]:
		_draw_topic_graphic(t)
	else:
		_draw_character(float(frame_index) / FPS)
	if place not in ["space", "science", "nature", "technology", "phone", "clock", "alert", "map", "history", "infographic", "door", "metro", "radio"]:
		_draw_procedural_objects(t)
	_draw_reference_header()
	# Subtle scene fade at clip boundaries; character animation remains continuous within the scene.
	var fade_in := 1.0 - smoothstep(0.0, 0.10, scene_progress)
	var fade_out := smoothstep(0.90, 1.0, scene_progress)
	# Overlay uses the original viewport transform to avoid moving with the camera.
	draw_set_transform(offset, 0.0, Vector2.ONE * scale_factor)
	draw_rect(Rect2(0, 0, 540, 960), Color(0.04, 0.07, 0.12, maxf(fade_in, fade_out) * 0.65))

# Reference-inspired 2D motion graphics: restrained grid, small outlined chapter
# label and a consistent visual hierarchy. No image-generation model is used.
func _draw_reference_header() -> void:
	var font := ThemeDB.fallback_font
	if font == null: return
	var heading := place.to_upper().substr(0, 16)
	var navy := Color("#0d132b")
	var gold := Color("#d9ad5c")
	# Header remains inside the safe region for 9:16 and 16:9.
	draw_rect(Rect2(150, 42, 240, 35), navy)
	draw_line(Vector2(150, 42), Vector2(390, 42), gold, 1.5, true)
	draw_line(Vector2(150, 77), Vector2(390, 77), gold, 1.5, true)
	draw_line(Vector2(150, 42), Vector2(150, 77), gold, 1.5, true)
	draw_line(Vector2(390, 42), Vector2(390, 77), gold, 1.5, true)
	draw_string(font, Vector2(169, 65), heading, HORIZONTAL_ALIGNMENT_CENTER, 204, 15, gold)

# Extendable documentary illustrations: all primitives are native 2D, with
# animated positions and no hardcoded stock image or 3D asset.
func _draw_topic_graphic(t: float) -> void:
	var pulse := 1.0 + 0.035 * sin(t * 2.4)
	var navy := Color("#182a4a")
	var cyan := Color("#60cbd6")
	var gold := Color("#f4c65a")
	draw_rect(Rect2(0, 0, 540, 960), Color("#111b36"))
	for i in range(28):
		var sx := float((i * 97 + 29) % 530)
		var sy := float((i * 173 + 61) % 920)
		draw_circle(Vector2(sx, sy), 1.5 + 0.6 * sin(t + float(i)), Color("#a9bedc"))
	match place:
		"space", "map":
			var center := Vector2(270, 450)
			draw_circle(center, 188 * pulse, Color("#253f83"))
			for i in range(7):
				var latitude := -130.0 + float(i) * 43.0
				var half_width := sqrt(maxf(0.0, 188.0 * 188.0 - latitude * latitude))
				draw_line(center + Vector2(-half_width, latitude), center + Vector2(half_width, latitude), Color("#5273b2"), 2.0, true)
			for i in range(5):
				var longitude := float(i) * 0.4 - 0.8
				draw_arc(center, 188.0 * absf(longitude) + 10.0, -PI * 0.5, PI * 0.5, 36, Color("#5273b2"), 2.0, true)
			draw_circle(center + Vector2(70 * sin(t * 0.7), -40), 14, gold)
			if place == "space":
				draw_circle(Vector2(100, 210), 40, gold)
		"science":
			var center := Vector2(270, 440)
			for i in range(3):
				draw_arc(center, 105.0 + float(i) * 25.0, t * 0.23 + float(i), t * 0.23 + float(i) + PI * 1.5, 70, cyan, 3.0, true)
			draw_circle(center, 38 * pulse, gold)
			for i in range(6):
				var angle := t + float(i) * TAU / 6.0
				draw_circle(center + Vector2(cos(angle), sin(angle)) * 155.0, 12, cyan)
		"phone", "technology":
			draw_rect(Rect2(100, 186, 340, 534), Color("#10172b"))
			draw_rect(Rect2(106, 192, 328, 522), Color("#7e95ac"))
			draw_rect(Rect2(119, 207, 302, 488), navy)
			draw_rect(Rect2(230, 215, 80, 12), Color("#10172b"))
			draw_circle(Vector2(270, 704), 6, Color("#d6b26e"))
			draw_rect(Rect2(150, 250, 240, 65), cyan)
			draw_circle(Vector2(180, 283), 19, Color("#f3d8a8"))
			draw_rect(Rect2(210, 272, 154, 9), navy)
			draw_rect(Rect2(210, 288, 95, 7), Color("#34577b"))
			for i in range(4):
				var y := 350.0 + float(i) * 75.0
				draw_rect(Rect2(150, y, 240, 45), Color("#344d79"))
				draw_rect(Rect2(165, y + 12, 155 + 20 * sin(t + float(i)), 8), gold)
				draw_rect(Rect2(165, y + 28, 110, 5), Color("#9bb2c5"))
			# A fingertip follows an eased touch gesture onto the notification.
			var touch_progress := smoothstep(0.12, 0.66, scene_progress)
			var finger_tip := Vector2(487.0 - 165.0 * touch_progress, 760.0 - 145.0 * touch_progress)
			draw_line(finger_tip + Vector2(62, 105), finger_tip + Vector2(14, 23), Color("#c78766"), 29, true)
			draw_circle(finger_tip, 17, Color("#e3a585"))
			if scene_progress > 0.60 and scene_progress < 0.83:
				draw_arc(finger_tip, 27.0 + 12.0 * (scene_progress - 0.6), 0, TAU, 40, Color("#e7bd64", 0.75), 3, true)
			var notification_y := 580.0 - 30.0 * smoothstep(0.2, 0.75, scene_progress)
			draw_rect(Rect2(135, notification_y, 270, 54), Color("#e4b75f"))
			draw_circle(Vector2(166, notification_y + 27), 12, Color("#b34c52"))
			draw_rect(Rect2(190, notification_y + 17, 176, 7), navy)
			draw_rect(Rect2(190, notification_y + 31, 120, 5), Color("#6a593c"))
		"metro":
			# Perspective-free metro carriage: animated sliding doors, signage and rails.
			draw_rect(Rect2(35, 180, 470, 565), Color("#283b56"))
			draw_rect(Rect2(49, 195, 442, 510), Color("#c6d1dc"))
			draw_rect(Rect2(65, 220, 410, 68), Color("#172a43"))
			draw_string(ThemeDB.fallback_font, Vector2(98, 266), "METRO", HORIZONTAL_ALIGNMENT_CENTER, 340, 31, gold)
			for i in range(4):
				var wx := 81.0 + float(i) * 101.0
				draw_rect(Rect2(wx, 313, 85, 120), Color("#294c72"))
				draw_rect(Rect2(wx + 8, 321, 69, 104), Color("#74afc6"))
				for j in range(3):
					draw_line(Vector2(wx + 12, 350 + j * 25), Vector2(wx + 72, 350 + j * 25), Color("#9ed0d7"), 2, true)
			var opening := 72.0 * smoothstep(0.15, 0.8, scene_progress)
			draw_rect(Rect2(167 - opening, 445, 104, 235), Color("#546d88"))
			draw_rect(Rect2(272 + opening, 445, 104, 235), Color("#546d88"))
			draw_line(Vector2(271 - opening, 450), Vector2(271 - opening, 680), gold, 4, true)
			draw_line(Vector2(272 + opening, 450), Vector2(272 + opening, 680), gold, 4, true)
			draw_rect(Rect2(0, 720, 540, 28), Color("#d9ad5c"))
			for i in range(12):
				draw_rect(Rect2(i * 48, 746, 27, 8), Color("#a2b5c8"))
		"radio":
			# Detailed vintage broadcast receiver and concentric signal waves.
			var center := Vector2(270, 468)
			for i in range(4):
				var radius := 155.0 + float(i) * 39.0 + fmod(t * 20.0, 39.0)
				draw_arc(center, radius, PI * 1.18, PI * 1.82, 48, Color("#527ba1", 0.58), 3, true)
			draw_line(Vector2(190, 355), Vector2(345, 220), Color("#d6ad62"), 7, true)
			draw_rect(Rect2(75, 360, 390, 245), Color("#0b152b"))
			draw_rect(Rect2(87, 372, 366, 221), Color("#b97855"))
			draw_rect(Rect2(110, 401, 240, 155), Color("#24364f"))
			for i in range(12):
				var xx := 122.0 + float(i) * 18.0
				draw_line(Vector2(xx, 412), Vector2(xx, 545), Color("#a7b9c4"), 3, true)
			# Animated pointer and sound bars make the broadcast state legible.
			for i in range(5):
				var bar_height := 8.0 + 18.0 * absf(sin(t * 3.0 + float(i) * 0.75))
				draw_rect(Rect2(135.0 + float(i) * 37.0, 490.0 - bar_height, 14.0, bar_height), Color("#e5c37a"))
			draw_line(Vector2(397, 441), Vector2(397 + 17 * cos(t * 0.6), 441 + 17 * sin(t * 0.6)), Color("#e5c37a"), 4, true)
			for i in range(2):
				draw_circle(Vector2(398, 440 + i * 76), 29, Color("#25364c"))
				draw_arc(Vector2(398, 440 + i * 76), 24, 0, TAU, 32, gold, 3, true)
			draw_rect(Rect2(110, 566, 240, 10), Color("#e5c37a"))
			var needle_x := 140.0 + 170.0 * (0.5 + 0.5 * sin(t * 1.8))
			draw_line(Vector2(needle_x, 561), Vector2(needle_x, 582), Color("#f0e2c7"), 4, true)
		"clock", "infographic":
			var center := Vector2(270, 445)
			draw_circle(center, 175, Color("#253f64"))
			draw_arc(center, 170, 0, TAU, 100, cyan, 6, true)
			for i in range(12):
				var angle := float(i) * TAU / 12.0
				draw_line(center + Vector2(cos(angle), sin(angle)) * 143, center + Vector2(cos(angle), sin(angle)) * 157, gold, 4, true)
			draw_line(center, center + Vector2(sin(t * 0.6), -cos(t * 0.6)) * 120, gold, 8, true)
			draw_line(center, center + Vector2(sin(t * 0.1), -cos(t * 0.1)) * 80, cyan, 10, true)
		"alert":
			var points := PackedVector2Array([Vector2(270, 245), Vector2(465, 630), Vector2(75, 630)])
			draw_colored_polygon(points, Color("#b44361"))
			draw_line(Vector2(270, 365), Vector2(270, 505), Color.WHITE, 22, true)
			draw_circle(Vector2(270, 555), 14, Color.WHITE)
		"history":
			draw_rect(Rect2(70, 190, 400, 550), Color("#d5c4a0"))
			draw_rect(Rect2(95, 220, 350, 80), Color("#6b5545"))
			for i in range(7):
				draw_rect(Rect2(100, 340 + i * 48, 330 - (i % 3) * 60, 9), Color("#8a785e"))
			draw_circle(Vector2(365, 610), 45 * pulse, Color("#b94e55"))
		"nature":
			draw_circle(Vector2(420, 230), 72, gold)
			for i in range(5):
				var x := 75.0 + float(i) * 100.0
				draw_line(Vector2(x, 710), Vector2(x, 440), Color("#684d3e"), 26, true)
				draw_circle(Vector2(x, 410 + 9 * sin(t + i)), 78, Color("#3c9474"))
		"door":
			draw_rect(Rect2(110, 150, 320, 650), Color("#8b6c58"))
			draw_rect(Rect2(130, 170, 280, 610), Color("#b58d68"))
			draw_rect(Rect2(160, 200, 220, 245), Color("#9c7459"))
			draw_circle(Vector2(365, 510), 13, gold)

# Deterministic procedural visual vocabulary derived from each sentence.
# This is a fallback illustration system, not a generative image model.
func _draw_procedural_objects(t: float) -> void:
	var count := mini(visual_objects.size(), 5)
	if count == 0: return
	var font := ThemeDB.fallback_font
	for i in range(count):
		var word := str(visual_objects[i]).substr(0, 20)
		var seed_value := absi(word.hash())
		var x := 45.0 + float(i % 2) * 260.0
		var y := 85.0 + float(i / 2) * 130.0
		var center := Vector2(x + 90.0, y + 45.0 + 5.0 * sin(t * 1.5 + float(i)))
		var hue := fmod(float(seed_value % 997) / 997.0, 1.0)
		var ink := Color.from_hsv(hue, 0.55, 0.9)
		draw_rect(Rect2(center - Vector2(88, 40), Vector2(176, 86)), Color("#1d3150"))
		var noun := word.to_lower()
		if noun in ["apple", "apfel", "planet", "erde", "earth", "moon", "mond", "sun", "sonne"]:
			draw_circle(center + Vector2(-54, -2), 24, Color("#d95b56") if noun in ["apple", "apfel"] else Color("#4f9ed3"))
			draw_arc(center + Vector2(-54, -2), 27, 0, TAU, 32, ink, 3, true)
		elif noun in ["tree", "baum", "forest", "wald", "flower", "blume"]:
			draw_line(center + Vector2(-53, 24), center + Vector2(-53, -12), Color("#88634a"), 9, true)
			draw_circle(center + Vector2(-53, -20), 22, Color("#65bb82"))
		elif noun in ["phone", "smartphone", "handy", "screen", "computer", "laptop"]:
			draw_rect(Rect2(center + Vector2(-76, -29), Vector2(46, 53)), ink)
			draw_rect(Rect2(center + Vector2(-71, -23), Vector2(36, 37)), Color("#1a3e61"))
		elif noun in ["house", "haus", "home", "building", "gebäude"]:
			draw_rect(Rect2(center + Vector2(-74, -11), Vector2(44, 35)), ink)
			draw_colored_polygon(PackedVector2Array([center + Vector2(-80, -11), center + Vector2(-52, -36), center + Vector2(-24, -11)]), Color("#db9b61"))
		elif noun in ["car", "auto", "bus", "train", "zug"]:
			draw_rect(Rect2(center + Vector2(-78, -12), Vector2(52, 28)), ink)
			draw_circle(center + Vector2(-67, 18), 8, Color("#0a172e"))
			draw_circle(center + Vector2(-37, 18), 8, Color("#0a172e"))
		else:
			match seed_value % 4:
				0:
					draw_circle(center + Vector2(-55, -4), 20, ink)
				1:
					draw_rect(Rect2(center + Vector2(-73, -23), Vector2(38, 38)), ink)
				2:
					draw_colored_polygon(PackedVector2Array([center + Vector2(-70, 18), center + Vector2(-50, -24), center + Vector2(-30, 18)]), ink)
				_:
					draw_line(center + Vector2(-74, -20), center + Vector2(-37, 19), ink, 8, true)
		if font != null:
			draw_string(font, center + Vector2(-23, 7), word, HORIZONTAL_ALIGNMENT_LEFT, 105, 16, Color.WHITE)

func _draw_character(t: float) -> void:
	# Layered vector character with articulated joints, clothing, hair, face and props.
	var palettes := [
		["#e8ac8a", "#c78267", "#397fb2", "#235c8c", "#273d61", "#263044"],
		["#b97958", "#8f543e", "#c45b70", "#9b3d57", "#303c53", "#1c2535"],
		["#f0c6a4", "#d5a182", "#54a18d", "#367d6d", "#394765", "#6b4430"],
		["#91664f", "#6c4938", "#d49a3c", "#a8792b", "#334b58", "#25222e"]
	]
	var palette: Array = palettes[character_variant]
	var skin := Color(palette[0])
	var shadow := Color(palette[1])
	var shirt := Color(palette[2])
	var shirt_dark := Color(palette[3])
	var trousers := Color(palette[4])
	var outline := Color("#24354a")
	var hair := Color(palette[5])
	var phase := sin(t * 7.0)
	var walking := action in ["travel", "carry", "walk", "run"]
	var running := action == "run"
	var sitting := action == "sit"
	var gait := sin(t * (12.0 if running else 7.0)) * (45.0 if running else 28.0) if walking else 0.0
	var sway := sin(t * 3.5) * 3.0
	var breathe := sin(t * 2.4) * 2.5
	var travel_x := lerpf(-78.0, 78.0, smoothstep(0.0, 1.0, scene_progress)) if walking else 0.0
	var root := Vector2(270 + travel_x + (sin(t * 1.3) * 4.0 if not walking else 0.0), 420 + (absf(phase) * 3.0 if walking else breathe))
	if action == "wake":
		var rise := smoothstep(0.0, 1.5, t)
		root += Vector2(-75.0 * (1.0 - rise), 130.0 * (1.0 - rise))
		root += Vector2(0, -12.0 * (1.0 - rise))
	if sitting:
		root += Vector2(0, 135)
	var hip := root + Vector2(0, 150)
	var shoulder := root + Vector2(sway, -30)
	var stride := 156.0 * 0.9 / maxf(float(total_frames) / FPS, 0.9)
	var foot_origin := Vector2((t / 0.9) * stride - 78.0, 0)
	var left_ankle := FootPlant.foot(t * (1.65 if running else 1.0), -1, stride) + foot_origin if walking else hip + Vector2(-75, 85) if sitting else hip + Vector2(-29, 185)
	var right_ankle := FootPlant.foot(t * (1.65 if running else 1.0), 1, stride) + foot_origin if walking else hip + Vector2(75, 85) if sitting else hip + Vector2(29, 185)
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
	# Tailoring details: jacket seam, buttons, collar and fabric folds.
	draw_colored_polygon(PackedVector2Array([shoulder + Vector2(-31, -9), shoulder + Vector2(-8, 28), shoulder + Vector2(0, 8)]), shirt_dark)
	draw_colored_polygon(PackedVector2Array([shoulder + Vector2(31, -9), shoulder + Vector2(8, 28), shoulder + Vector2(0, 8)]), shirt_dark)
	draw_line(shoulder + Vector2(0, 16), hip + Vector2(0, -7), shirt_dark, 3, true)
	for button_y in [58.0, 91.0]:
		draw_circle(shoulder + Vector2(6, button_y), 3.0, Color("#d6c3a5"))
	draw_line(hip + Vector2(-28, -30), hip + Vector2(-8, -42), shirt_dark, 2, true)
	draw_line(hip + Vector2(28, -30), hip + Vector2(8, -42), shirt_dark, 2, true)
	# Neck, ears, head and hairstyle, all 2D vector primitives.
	var head := root + Vector2(sway * 0.4, -110)
	draw_line(shoulder + Vector2(0, -15), head + Vector2(0, 37), outline, 27, true)
	draw_line(shoulder + Vector2(0, -15), head + Vector2(0, 37), skin, 20, true)
	draw_circle(head + Vector2(-53, 4), 14, shadow)
	draw_circle(head + Vector2(53, 4), 14, shadow)
	draw_circle(head, 57, outline)
	draw_circle(head, 53, skin)
	# Cel-shaded cheeks and subtle ear details improve facial readability.
	draw_circle(head + Vector2(-35, 19), 11, Color(0.88, 0.39, 0.39, 0.20))
	draw_circle(head + Vector2(35, 19), 11, Color(0.88, 0.39, 0.39, 0.20))
	draw_arc(head + Vector2(-53, 4), 7, -PI * 0.5, PI * 0.5, 10, shadow, 2, true)
	draw_arc(head + Vector2(53, 4), 7, PI * 0.5, PI * 1.5, 10, shadow, 2, true)
	draw_arc(head + Vector2(-6, 1), 47, 1.8, 2.6, 12, shadow, 3, true)
	# Asymmetric hair cap and fringe.
	draw_arc(head + Vector2(0, -14), 47, PI * 1.03, TAU * 1.02, 30, hair, 19, true)
	draw_colored_polygon(PackedVector2Array([
		head + Vector2(-44, -38), head + Vector2(-20, -62),
		head + Vector2(23, -58), head + Vector2(45, -39),
		head + Vector2(11, -37), head + Vector2(-13, -27)]), hair)
	var blink := fmod(t + 0.1, 3.6) > 3.48 or emotion == "sad" and fmod(t, 2.7) > 2.55
	for x in [-20.0, 20.0]:
		var eye := head + Vector2(x, -5)
		if blink:
			draw_line(eye + Vector2(-8, 0), eye + Vector2(8, 0), outline, 3, true)
		else:
			draw_circle(eye, 9, Color("#fffaf3"))
			draw_circle(eye + Vector2(1, 1), 4, outline)
			draw_circle(eye + Vector2(2, -1), 1.5, Color.WHITE)
		var eyebrow_shift := -8.0 if emotion == "surprised" else (5.0 if emotion == "angry" else 0.0)
		draw_line(eye + Vector2(-9, -15 + eyebrow_shift), eye + Vector2(8, -17 + eyebrow_shift), hair, 4, true)
	draw_line(head + Vector2(0, 1), head + Vector2(-3, 17), shadow, 3, true)
	var speech_envelope := 0.0
	if frame_index < mouth_levels.size():
		speech_envelope = clampf(float(mouth_levels[frame_index]), 0.0, 1.0)
	elif mouth_levels.is_empty() and action == "talk":
		speech_envelope = pow(maxf(0.0, sin(t * 11.0)), 1.5)
	var mouth_open := speech_envelope > 0.3
	if mouth_open:
		draw_circle(head + Vector2(0, 29), 5.0 + 7.0 * speech_envelope, Color("#923f4a"))
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
