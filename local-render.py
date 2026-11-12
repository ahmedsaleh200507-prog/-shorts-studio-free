"""Run the existing Shorts Studio pipeline on your own computer, without GitHub Actions quotas.

Requirements: Python 3.12, Node.js 22+, FFmpeg, internet for Edge TTS.
First run installs dependencies and Remotion's browser. No paid API or token.
This is NOT a text-to-image diffusion engine: visuals use existing Remotion scenes.
"""
from __future__ import annotations
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent
ANIMATION = ROOT / "animation"
OUTPUT = ROOT / "output"

def run(args, *, cwd=ROOT, env=None):
    print("\n>", " ".join(map(str, args)), flush=True)
    subprocess.run(args, cwd=cwd, env=env, check=True)

def main():
    p = argparse.ArgumentParser(description="No per-day video limit; local render.")
    p.add_argument("--text", help="German or English script")
    p.add_argument("--file", type=Path, help="UTF-8 script file")
    p.add_argument("--language", choices=["de", "en"], default="de")
    p.add_argument("--output", type=Path, help="MP4 output path")
    p.add_argument("--setup", action="store_true", help="Install free dependencies")
    p.add_argument("--piper-model", type=Path, help="Use installed Piper and this downloaded ONNX voice model for offline TTS")
    p.add_argument("--mode", choices=["vector", "ai"], default="vector")
    p.add_argument("--voice", choices=["female", "male"], default="female")
    p.add_argument("--aspect", choices=["9:16", "16:9"], default="9:16")
    p.add_argument("--duration", choices=["auto", "15", "30", "60", "180", "300", "600"], default="auto")
    p.add_argument("--browser", help="Existing Chromium executable")
    args = p.parse_args()
    if args.setup:
        run([sys.executable, "-m", "pip", "install", "edge-tts==7.3.1", "mutagen==1.48.1"])
        run(["npm", "ci", "--no-audit", "--no-fund"], cwd=ANIMATION)
        run(["npx", "remotion", "browser", "ensure"], cwd=ANIMATION)
        print("Setup complete. Run again with --text or --file.")
        return
    if bool(args.text) == bool(args.file):
        p.error("Supply exactly one of --text or --file")
    script = args.text if args.text is not None else args.file.read_text(encoding="utf-8")
    script = script.strip()
    if not script:
        p.error("Script is empty")
    if len(script) > 12000:
        p.error("Renderer supports up to 12000 characters / 180 scenes; split longer scripts.")
    if not shutil.which("ffmpeg"):
        p.error("FFmpeg is required on PATH")
    env = os.environ.copy()
    env["SCRIPT"] = script
    env["LANGUAGE"] = args.language
    env["VIDEO_MODE"] = args.mode
    env["VOICE"] = args.voice
    env["ASPECT_RATIO"] = args.aspect
    env["TARGET_DURATION"] = args.duration
    if args.piper_model:
        env["TTS_ENGINE"] = "piper"
        env["PIPER_MODEL"] = str(args.piper_model.expanduser().resolve())
    run([sys.executable, "prepare-job.py"], cwd=ANIMATION, env=env)
    OUTPUT.mkdir(exist_ok=True)
    target = args.output or OUTPUT / ("shorts-" + time.strftime("%Y%m%d-%H%M%S") + ".mp4")
    target = target.expanduser().resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    run([sys.executable, "generate-ai-scenes.py"], cwd=ANIMATION, env=env)
    render = [sys.executable, "render-job.py", "--output", str(target)]
    if args.browser:
        render.extend(["--browser", args.browser])
    run(render, cwd=ANIMATION, env=env)
    print("\nVideo created:", target)

if __name__ == "__main__":
    main()
