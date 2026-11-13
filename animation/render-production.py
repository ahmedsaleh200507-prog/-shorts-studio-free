"""Render the requested production mode to the same downloadable final.mp4."""
import os
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def normalize(script):
    script = script.strip()
    vector = False
    aspect = os.environ.get("ASPECT_RATIO", "9:16")
    for _ in range(3):
        if script.startswith("[[VECTOR_2D]]"):
            vector = True
            script = script[len("[[VECTOR_2D]]"):].strip()
        elif script.startswith("[[ASPECT_16_9]]"):
            aspect = "16:9"
            script = script[len("[[ASPECT_16_9]]"):].strip()
        else:
            break
    if aspect not in ("9:16", "16:9"):
        raise ValueError("Invalid aspect")
    return script, vector, aspect

def main():
    script, vector, aspect = normalize(os.environ.get("SCRIPT", ""))
    if not script:
        raise ValueError("Empty script")
    output = ROOT / "output" / "final.mp4"
    output.parent.mkdir(exist_ok=True)
    if vector:
        command = [
            "python", str(ROOT / "animation" / "render-godot-story.py"),
            "--script", script, "--aspect", aspect,
            "--audio-dir", str(ROOT / "animation" / "public" / "audio"),
            "--out", str(output)
        ]
    else:
        command = [
            "npx", "remotion", "render", "job-entry.mjs", "ShortsJob",
            str(output), "--codec", "h264", "--crf", "26",
            "--concurrency", "1", "--scale", "0.5"
        ]
    subprocess.run(command, check=True, cwd=ROOT / "animation")
    if not output.is_file() or output.stat().st_size < 10000:
        raise RuntimeError("Production MP4 is missing or empty")
    # The file existing is not sufficient: verify codec, aspect and audible AAC.
    if not shutil.which("ffprobe"):
        raise RuntimeError("ffprobe is required to validate the final MP4")
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(output)],
        check=True, capture_output=True, text=True, timeout=60)
    streams = json.loads(probe.stdout).get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    expected = (960, 540) if aspect == "16:9" else (540, 960)
    if not video or video.get("codec_name") != "h264":
        raise RuntimeError("Final MP4 is missing H.264 video")
    # Remotion production renders at half resolution to stay within free runner limits.
    valid_sizes = {expected, (expected[0] // 2, expected[1] // 2)}
    if (video.get("width"), video.get("height")) not in valid_sizes:
        raise RuntimeError("Final MP4 has an unexpected aspect or resolution")
    if not any(s.get("codec_type") == "audio" and s.get("codec_name") == "aac" for s in streams):
        raise RuntimeError("Final MP4 is missing AAC narration")
    print("Rendered", "Godot native 2D" if vector else "Remotion AI illustration", output)

if __name__ == "__main__":
    main()
