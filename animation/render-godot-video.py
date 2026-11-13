"""Render a Godot 2D scene to an H.264/AAC MP4, with optional voiceover.

Usage:
 python animation/render-godot-video.py --action brush --place bathroom --seconds 3 --out output/godot-video.mp4
 python animation/render-godot-video.py --action wake --audio animation/public/audio/job-0.mp3 --out output/scene.mp4

Godot 4 and FFmpeg/ffprobe must be on PATH. All subprocesses are checked.
"""
import argparse
import json
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FPS = 24
ACTIONS = {"wake", "brush", "pick", "travel", "carry", "talk"}
PLACES = {"bedroom", "bathroom", "supermarket", "transport", "generic"}

def run(args, timeout=600):
    return subprocess.run(args, check=True, timeout=timeout, capture_output=True, text=True)

def render(action, place, seconds, aspect, audio, output, character=0, emotion="neutral", camera="slow-push"):
    if not isinstance(character, int) or character not in range(4):
        raise ValueError("Invalid character variant")
    if emotion not in {"neutral", "happy", "sad", "angry", "surprised"}:
        raise ValueError("Invalid emotion")
    if camera not in {"slow-push", "follow", "close-up", "reveal", "static"}:
        raise ValueError("Invalid camera")
    if action not in ACTIONS:
        raise ValueError(f"Unsupported action: {action}")
    if place not in PLACES:
        raise ValueError(f"Unsupported place: {place}")
    if not (1 / FPS <= seconds <= 100):
        raise ValueError("Scene length must be between one frame and 100 seconds")
    if aspect not in ("9:16", "16:9"):
        raise ValueError("Unsupported aspect ratio")
    for binary in ("godot", "ffmpeg", "ffprobe"):
        if not shutil.which(binary):
            raise RuntimeError(f"Missing required executable: {binary}")
    if audio and not audio.is_file():
        raise FileNotFoundError(audio)
    frames = math.ceil(seconds * FPS)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="shorts-godot-") as temp:
        frame_dir = Path(temp) / "frames"
        frame_dir.mkdir()
        run(["godot", "--path", str(ROOT / "godot"), "--rendering-driver", "opengl3", "--",
             f"--action={action}", f"--place={place}", f"--frames={frames}",
             f"--aspect={aspect}", f"--character={character}", f"--emotion={emotion}", f"--camera={camera}", f"--out={frame_dir}"], timeout=max(120, frames * 2))
        images = sorted(frame_dir.glob("frame_*.png"))
        if len(images) != frames:
            raise RuntimeError(f"Expected {frames} rendered frames, got {len(images)}")
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", str(FPS),
               "-i", str(frame_dir / "frame_%05d.png")]
        if audio:
            cmd += ["-i", str(audio)]
        cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS)]
        if audio:
            cmd += ["-c:a", "aac", "-b:a", "160k", "-af", "apad", "-t", str(frames / FPS)]
        else:
            cmd += ["-an"]
        cmd += ["-movflags", "+faststart", str(output)]
        run(cmd, timeout=max(120, frames * 2))
    if not output.is_file() or output.stat().st_size < 10000:
        raise RuntimeError("Missing or too-small MP4 output")
    result = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(output)]).stdout)
    streams = result.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    if not video or video.get("codec_name") != "h264":
        raise RuntimeError("H.264 video stream missing")
    expected = (960, 540) if aspect == "16:9" else (540, 960)
    if (video.get("width"), video.get("height")) != expected:
        raise RuntimeError(f"Unexpected video dimensions: {video.get('width')}x{video.get('height')}")
    if audio and not any(s.get("codec_type") == "audio" and s.get("codec_name") == "aac" for s in streams):
        raise RuntimeError("AAC narration track missing")
    return {"output": str(output), "frames": frames, "aspect": aspect, "has_audio": bool(audio)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--action", default="wake", choices=sorted(ACTIONS))
    parser.add_argument("--place", default="bedroom", choices=sorted(PLACES))
    parser.add_argument("--seconds", type=float, default=3)
    parser.add_argument("--aspect", default="9:16", choices=["9:16", "16:9"])
    parser.add_argument("--audio", type=Path)
    parser.add_argument("--out", type=Path, default=ROOT / "output" / "godot-video.mp4")
    args = parser.parse_args()
    print(json.dumps(render(args.action, args.place, args.seconds, args.aspect, args.audio, args.out), indent=2))
