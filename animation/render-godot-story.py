"""Render multiple text-matched Godot scenes into one narrated, subtitled MP4.

Requires Node 22, Godot 4, FFmpeg and ffprobe. Uses existing scene-plan.mjs.
Optional --audio-dir holds job-0.mp3, job-1.mp3, etc. If absent, video is silent.
"""
import argparse
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "animation"))
import importlib.util
spec = importlib.util.spec_from_file_location("godot_render", ROOT / "animation" / "render-godot-video.py")
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)

def stamp(seconds):
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3600000)
    minutes, milliseconds = divmod(milliseconds, 60000)
    secs, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{milliseconds:03}"

def make_subtitles(scenes, path):
    cursor = 0
    lines = []
    for index, scene in enumerate(scenes, 1):
        seconds = scene["frames"] / 24
        lines.extend([str(index), f"{stamp(cursor)} --> {stamp(cursor + seconds)}", scene["text"].replace("\n", " "), ""])
        cursor += seconds
    path.write_text("\n".join(lines), encoding="utf-8")

def ass_stamp(seconds):
    centiseconds = max(0, round(seconds * 100))
    hours, remainder = divmod(centiseconds, 360000)
    minutes, remainder = divmod(remainder, 6000)
    secs, remainder = divmod(remainder, 100)
    return f"{hours}:{minutes:02}:{secs:02}.{remainder:02}"


def ass_escape(value):
    # Prevent user-authored text from becoming ASS override tags.
    return value.replace("\\", "＼").replace("{", "｛").replace("}", "｝").replace("\\n", " ")


def make_animated_subtitles(scenes, path, aspect="9:16"):
    """Burn-in-ready ASS: one highlighted word at a time, with eased pop-in."""
    portrait = aspect == "9:16"
    width, height = (540, 960) if portrait else (960, 540)
    font_size = 35 if portrait else 31
    margin = 110 if portrait else 55
    header = (
        "[Script Info]\\nScriptType: v4.00+\\n"
        f"PlayResX: {width}\\nPlayResY: {height}\\n"
        "WrapStyle: 2\\nScaledBorderAndShadow: yes\\n\\n"
        "[V4+ Styles]\\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\\n"
        f"Style: Words,DejaVu Sans,{font_size},&H00FFFFFF,&H00FFFFFF,"
        f"&H00111A2D,&H70000000,-1,0,0,0,100,100,0,0,1,3,0,2,45,45,{margin},1\\n\\n"
        "[Events]\\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\\n"
    )
    events = []
    cursor = 0.0
    for scene in scenes:
        duration = scene["frames"] / 24.0
        words = scene["text"].replace("\\n", " ").split()
        if not words:
            cursor += duration
            continue
        # Estimate word boundaries by length; exact phoneme timing needs alignment.
        weights = [max(2, min(12, len(word.strip(".,!?;:")))) for word in words]
        total = sum(weights)
        elapsed = 0.0
        for index, word in enumerate(words):
            start = cursor + duration * elapsed / total
            elapsed += weights[index]
            end = cursor + duration * elapsed / total
            # Show at most four words at once; active word in warm gold.
            chunk_start = (index // 4) * 4
            chunk = words[chunk_start:chunk_start + 4]
            fragments = []
            for j, part in enumerate(chunk):
                active = chunk_start + j == index
                color = "&H0060C6F1&" if active else "&H00FFFFFF&"
                fragments.append("{\\c" + color + "}" + ass_escape(part))
            text = " ".join(fragments)
            # 115% -> 100% pop-in, with short fade; text remains readable.
            animation = "{\\fad(65,45)\\fscx115\\fscy115\\t(0,150,\\fscx100\\fscy100)}"
            events.append(
                f"Dialogue: 0,{ass_stamp(start)},{ass_stamp(max(end, start + 0.02))},"
                f"Words,,0,0,0,,{animation}{text}"
            )
        cursor += duration
    path.write_text(header + "\\n".join(events) + "\\n", encoding="utf-8")


def scene_direction(scene, index):
    text = scene["text"].lower()
    action = scene["action"]
    if any(word in text for word in ("happy", "glücklich", "freut", "smile", "lacht")):
        emotion = "happy"
    elif any(word in text for word in ("sad", "traurig", "weint", "cries")):
        emotion = "sad"
    elif any(word in text for word in ("angry", "wütend", "zornig")):
        emotion = "angry"
    elif any(word in text for word in ("surprise", "überrasch", "plötzlich", "suddenly")):
        emotion = "surprised"
    else:
        emotion = "neutral"
    camera = ("follow" if action in ("travel", "carry") else
              "close-up" if action in ("talk", "brush") else
              "reveal" if action in ("wake", "pick") else "slow-push")
    # Explicit actor descriptions select a palette; default remains stable across scenes.
    if any(word in text for word in ("frau", "woman", "mother", "mutter")):
        character = 1
    elif any(word in text for word in ("mädchen", "girl", "daughter", "tochter")):
        character = 2
    elif any(word in text for word in ("mann", "man", "father", "vater")):
        character = 3
    else:
        character = 0
    # Documentary objects benefit from a stable establishing shot rather than
    # an automatic talking-head close-up.
    if scene.get("place") in {"phone", "metro", "radio", "map", "infographic"}:
        camera = "reveal"
    elif scene.get("place") in {"space", "science", "technology", "history"}:
        camera = "slow-push"
    return character, emotion, camera

def render_story(script, aspect, audio_dir, output):
    with tempfile.TemporaryDirectory(prefix="shorts-plan-") as planning:
        args = ["node", str(ROOT / "animation" / "export-godot-plan.mjs"), script, aspect]
        if audio_dir:
            audio_dir = audio_dir.resolve()
            if not audio_dir.is_dir():
                raise FileNotFoundError(audio_dir)
            audio_files = sorted(audio_dir.glob("job-*.mp3"), key=lambda p: int(p.stem.split("-")[-1]))
            if not audio_files:
                raise ValueError("No narration MP3 files found")
            frames = []
            for index, audio in enumerate(audio_files):
                if audio.name != f"job-{index}.mp3":
                    raise ValueError("Narration files must be numbered consecutively from job-0.mp3")
                probe = json.loads(engine.run(["ffprobe", "-v", "error", "-show_entries",
                    "format=duration", "-of", "json", str(audio)]).stdout)
                seconds = float(probe["format"]["duration"])
                if not math.isfinite(seconds) or seconds <= 0:
                    raise ValueError("Invalid narration duration")
                frames.append(max(1, math.ceil((seconds + 0.2) * 24)))
            timing = Path(planning) / "durations.json"
            timing.write_text(json.dumps(frames), encoding="utf-8")
            args.append(str(timing))
        plan = json.loads(engine.run(args).stdout)
    if audio_dir and len(plan["scenes"]) != len(frames):
        raise ValueError("Narration count must match scene count")
    scenes = plan["scenes"]
    if sum(s["frames"] for s in scenes) > 24 * 660:
        raise ValueError("Story exceeds 11 minute safety limit")
    if not 1 <= len(scenes) <= 180:
        raise ValueError("Expected 1 to 180 scenes")
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="shorts-story-") as work:
        temp = Path(work)
        clips = []
        for index, scene in enumerate(scenes):
            audio = (audio_dir / f"job-{index}.mp3") if audio_dir else None
            if audio is not None and not audio.is_file():
                raise FileNotFoundError(audio)
            clip = temp / f"scene-{index:04}.mp4"
            # Every segment must carry an audio stream; otherwise concat may drop
            # narration when the first segment has no audio.
            if audio is None:
                silent = temp / f"silence-{index:04}.mp3"
                engine.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
                            "-t", str(scene["frames"] / 24), "-c:a", "libmp3lame",
                            str(silent)])
                audio = silent
            character, emotion, camera = scene_direction(scene, index)
            engine.render(scene["action"], scene["place"], scene["frames"] / 24, aspect, audio, clip, character, emotion, camera, scene.get("props", []))
            clips.append(clip)
        concat = temp / "clips.txt"
        concat.write_text("".join(f"file '{clip.as_posix()}'\n" for clip in clips), encoding="utf-8")
        subtitles = temp / "captions.srt"
        make_subtitles(scenes, subtitles)
        joined = temp / "joined.mp4"
        engine.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
                    "-i", str(concat), "-c", "copy", "-movflags", "+faststart", str(joined)], timeout=1200)
        # Burn captions after concatenation; escape filtergraph-sensitive paths.
        subtitle_path = subtitles.as_posix().replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
        engine.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(joined),
                    "-vf", f"ass='{subtitle_path}'", "-c:v", "libx264", "-crf", "24",
                    "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", str(output)], timeout=1200)
    probe = json.loads(engine.run(["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(output)]).stdout)
    streams = probe["streams"]
    if not any(s.get("codec_type") == "video" and s.get("codec_name") == "h264" for s in streams):
        raise RuntimeError("Final MP4 missing H.264 video")
    if not any(s.get("codec_type") == "audio" and s.get("codec_name") == "aac" for s in streams):
        raise RuntimeError("Final MP4 missing narration")
    return {"output": str(output), "scenes": len(scenes), "has_audio": bool(audio_dir)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--script", required=True)
    parser.add_argument("--aspect", choices=["9:16", "16:9"], default="9:16")
    parser.add_argument("--audio-dir", type=Path)
    parser.add_argument("--out", type=Path, default=ROOT / "output" / "godot-story.mp4")
    args = parser.parse_args()
    print(json.dumps(render_story(args.script, args.aspect, args.audio_dir, args.out), indent=2))
