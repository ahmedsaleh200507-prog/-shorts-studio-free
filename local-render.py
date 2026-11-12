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
    args = p.parse_args()
    if args.setup:
        run([sys.executable, "-m", "pip", "install", "edge-tts", "mutagen"])
        run(["npm", "install", "--no-audit", "--no-fund"], cwd=ANIMATION)
        run(["npx", "remotion", "browser", "ensure"], cwd=ANIMATION)
        print("Setup complete. Run again with --text or --file.")
        return
    if bool(args.text) == bool(args.file):
        p.error("Supply exactly one of --text or --file")
    script = args.text if args.text is not None else args.file.read_text(encoding="utf-8")
    script = script.strip()
    if not script:
        p.error("Script is empty")
    if len(script) > 3000:
        p.error("Current renderer supports up to 3000 characters per video; split longer scripts.")
    if not shutil.which("ffmpeg"):
        p.error("FFmpeg is required on PATH")
    env = os.environ.copy()
    env["SCRIPT"] = script
    env["LANGUAGE"] = args.language
    run([sys.executable, "prepare-job.py"], cwd=ANIMATION, env=env)
    OUTPUT.mkdir(exist_ok=True)
    target = args.output or OUTPUT / ("shorts-" + time.strftime("%Y%m%d-%H%M%S") + ".mp4")
    target = target.expanduser().resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    run(["npx", "remotion", "render", "job-entry.mjs", "ShortsJob", str(target),
         "--codec", "h264", "--crf", "26", "--concurrency", "1", "--scale", "0.5"], cwd=ANIMATION)
    run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,width,height",
         "-of", "default=noprint_wrappers=1", str(target)])
    if not target.is_file() or target.stat().st_size < 10000:
        raise RuntimeError("MP4 output missing or too small")
    print("\nVideo created:", target)

if __name__ == "__main__":
    main()
