"""Render the requested production mode to the same downloadable final.mp4."""
import os
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
    print("Rendered", "Godot native 2D" if vector else "Remotion AI illustration", output)

if __name__ == "__main__":
    main()
