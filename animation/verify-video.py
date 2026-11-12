"""Bounded, dependency-free post-render checks using FFmpeg and FFprobe.

This verifies technical output and sampled motion, not the meaning of an image.
Usage: python animation/verify-video.py output/final.mp4 --aspect 9:16
"""
import argparse
import array
import json
import math
import re
import statistics
import subprocess
import sys
from pathlib import Path

SAMPLE_WIDTH, SAMPLE_HEIGHT = 96, 54
AUDIO_RATE = 8000


def run(command, timeout=90):
    return subprocess.run(command, check=True, capture_output=True, timeout=timeout)


def duration(stream):
    try:
        value = float(stream.get("duration", 0))
        return value if math.isfinite(value) and value > 0 else None
    except (ValueError, TypeError):
        return None


def sample_windows(seconds, plan=None):
    """Sample within scenes, so a cut alone cannot count as character motion."""
    if plan and plan.get("scenes") and plan.get("fps"):
        fps = float(plan["fps"])
        scenes = plan["scenes"]
        indices = sorted({round(i * (len(scenes) - 1) / 11) for i in range(12)})
        windows = []
        for index in indices:
            scene = scenes[index]
            start, end = scene["startFrame"] / fps, scene["endFrame"] / fps
            # Stay clear of the fade at the beginning/end of each scene.
            windows.append((start + (end - start) * .35,
                            min(seconds - .05, start + (end - start) * .65)))
        return windows
    count = min(8, max(1, math.ceil(seconds / 2)))
    return [(seconds * (i + .3) / count, seconds * (i + .7) / count)
            for i in range(count)]


def frame_pixels(file, timestamp):
    data = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{timestamp:.6f}",
                "-i", str(file), "-map", "0:v:0", "-frames:v", "1", "-vf",
                f"scale={SAMPLE_WIDTH}:{SAMPLE_HEIGHT}:flags=area,format=gray",
                "-threads", "1", "-f", "rawvideo", "pipe:1"]).stdout
    if len(data) != SAMPLE_WIDTH * SAMPLE_HEIGHT:
        raise ValueError(f"Could not decode a complete frame at {timestamp:.3f}s")
    return data


def audio_samples(file, start, seconds):
    raw = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{start:.6f}",
               "-i", str(file), "-map", "0:a:0", "-t", f"{seconds:.6f}",
               "-ac", "1", "-ar", str(AUDIO_RATE), "-f", "s16le", "pipe:1"]).stdout
    samples = array.array("h")
    samples.frombytes(raw)
    if sys.byteorder != "little":
        samples.byteswap()
    return samples


def best_correlation(reference, candidate):
    """Normalized waveform match; gain changes and AAC quantization are tolerated."""
    count = len(reference)
    if count < 400 or len(candidate) < count:
        raise ValueError("Insufficient audio samples for waveform comparison")
    sum_ref = sum(reference)
    energy_ref = sum(x * x for x in reference) - sum_ref * sum_ref / count
    if energy_ref < count * 4:
        raise ValueError("Reference waveform has insufficient speech energy")
    sums, squares = [0], [0]
    for value in candidate:
        sums.append(sums[-1] + value)
        squares.append(squares[-1] + value * value)

    def coefficient(offset):
        total = sums[offset + count] - sums[offset]
        energy = squares[offset + count] - squares[offset] - total * total / count
        if energy <= 0:
            return -1
        dot = sum(a * candidate[offset + i] for i, a in enumerate(reference))
        return (dot - sum_ref * total / count) / math.sqrt(energy_ref * energy)

    # Coarse 1ms steps followed by sample-accurate refinement near the peak.
    maximum = len(candidate) - count
    offsets = range(0, maximum + 1, 8)
    score, offset = max((coefficient(i), i) for i in offsets)
    return max((coefficient(i), i) for i in range(max(0, offset - 7), min(maximum, offset + 7) + 1))


def verify_audio_alignment(file, audio_dir, plan, failures, warnings):
    if not plan or not plan.get("scenes") or not plan.get("fps"):
        raise ValueError("--audio-dir requires a scene plan with scenes and fps")
    scenes, fps = plan["scenes"], float(plan["fps"])
    indices = sorted({round(i * (len(scenes) - 1) / 11) for i in range(12)})
    results = []
    for index in indices:
        choices = [Path(audio_dir) / f"job-{index}.{ext}" for ext in ("mp3", "wav", "ogg")]
        reference_file = next((path for path in choices if path.is_file()), None)
        if reference_file is None:
            failures.append(f"Missing original narration for scene {index + 1}")
            continue
        original = audio_samples(reference_file, 0, 1.2)
        count = min(2400, len(original))
        if count < 400:
            failures.append(f"Original narration too short for scene {index + 1}")
            continue
        # Select energetic speech rather than leading silence. Never decode the
        # entire ten-minute soundtrack into memory.
        candidates = range(0, len(original) - count + 1, 400)
        offset = max(candidates, key=lambda i: sum(x * x for x in original[i:i + count]))
        reference = original[offset:offset + count]
        expected = scenes[index]["startFrame"] / fps + offset / AUDIO_RATE
        search_start = max(0, expected - .08)
        actual = audio_samples(file, search_start, count / AUDIO_RATE + .16)
        correlation, found = best_correlation(reference, actual)
        shift = search_start + found / AUDIO_RATE - expected
        results.append({"scene": index + 1, "reference": reference_file.name,
                        "expected_seconds": round(expected, 4),
                        "correlation": round(correlation, 4), "offset_seconds": round(shift, 5)})
        if correlation < .65:
            failures.append(f"Narration waveform mismatch in scene {index + 1}: correlation {correlation:.3f}")
        elif abs(shift) > .05:
            warnings.append(f"Narration offset in scene {index + 1}: {shift:+.3f}s")
    return results


def verify(file, *, aspect=None, width=None, height=None, expected_duration=None, plan=None, audio_dir=None):
    file = Path(file)
    report = {"file": str(file), "checks": {}, "failures": [], "warnings": [],
              "manual_review_required": ["scene meaning and missing/wrong objects", "unwanted 3D imagery",
                                         "character or subtitle clipping", "speech intelligibility",
                                         "phoneme and subtitle accuracy"]}
    failures, warnings = report["failures"], report["warnings"]
    try:
        probe = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                                "-of", "json", str(file)]).stdout)
        videos = [s for s in probe.get("streams", []) if s.get("codec_type") == "video"]
        audios = [s for s in probe.get("streams", []) if s.get("codec_type") == "audio"]
        if not videos:
            raise ValueError("Missing video stream")
        video = videos[0]
        audio = audios[0] if audios else {}
        seconds = duration(video) or duration(probe.get("format", {}))
        if not seconds:
            raise ValueError("Invalid video duration")
        w, h = int(video.get("width", 0)), int(video.get("height", 0))
        report["checks"]["streams"] = {"video_codec": video.get("codec_name"),
            "audio_codec": audio.get("codec_name"), "pixel_format": video.get("pix_fmt"),
            "width": w, "height": h, "video_seconds": seconds,
            "audio_seconds": duration(audio)}
        if video.get("codec_name") != "h264":
            failures.append("Video must use H.264")
        if video.get("pix_fmt") != "yuv420p":
            failures.append("Video must use yuv420p for Safari compatibility")
        if audio.get("codec_name") != "aac":
            failures.append("Missing compatible AAC audio stream")
        if w <= 0 or h <= 0:
            failures.append("Invalid dimensions")
        if width and w != width:
            failures.append(f"Expected width {width}, found {w}")
        if height and h != height:
            failures.append(f"Expected height {height}, found {h}")
        if aspect:
            aw, ah = map(int, aspect.split(":"))
            if abs(w * ah - h * aw) > max(aw, ah):
                failures.append(f"Expected aspect {aspect}, found {w}:{h}")
        if expected_duration is not None and abs(seconds - expected_duration) > .15:
            failures.append(f"Video duration differs from plan by {abs(seconds - expected_duration):.3f}s")
        audio_seconds = duration(audio)
        if audio and audio_seconds is None:
            warnings.append("Audio stream duration unavailable; exact audio/video endpoint check skipped")
        if audio_seconds and abs(seconds - audio_seconds) > .5:
            failures.append(f"Audio/video duration mismatch: {seconds:.3f}s / {audio_seconds:.3f}s")
        if audio:
            measured = run(["ffmpeg", "-hide_banner", "-i", str(file), "-map", "0:a:0", "-vn",
                            "-af", "volumedetect", "-f", "null", "-"]).stderr.decode(errors="replace")
            match = re.search(r"max_volume:\s*(-?inf|[-\d.]+) dB", measured)
            if match:
                peak = float(match.group(1))
                report["checks"]["audio_peak_db"] = peak if math.isfinite(peak) else None
                if peak < -60:
                    failures.append("Audio stream is silent or below -60 dB peak")
            else:
                warnings.append("Audio loudness could not be measured")
            if audio_dir is not None:
                report["checks"]["narration_alignment"] = verify_audio_alignment(
                    file, audio_dir, plan, failures, warnings)
        windows = sample_windows(seconds, plan)
        samples, frozen, black, low_variance = [], 0, 0, 0
        for start, end in windows:
            first, second = frame_pixels(file, start), frame_pixels(file, end)
            means = [statistics.fmean(pixels) for pixels in (first, second)]
            variances = [statistics.pvariance(pixels) for pixels in (first, second)]
            difference = statistics.fmean(abs(a - b) for a, b in zip(first, second))
            frozen += difference < .15
            black += any(mean < 3 and var < 5 for mean, var in zip(means, variances))
            low_variance += any(var < 8 for var in variances)
            samples.append({"from": round(start, 3), "to": round(end, 3),
                            "mean_pixel_difference": round(difference, 4),
                            "brightness": [round(m, 3) for m in means]})
        report["checks"]["motion_samples"] = samples
        if black:
            failures.append(f"Black/empty frames detected in {black}/{len(windows)} sampled windows")
        if frozen == len(windows):
            failures.append("No detectable motion in any sampled window")
        elif frozen:
            warnings.append(f"Little or no movement in {frozen}/{len(windows)} sampled windows")
        if low_variance:
            warnings.append(f"Low-detail frames in {low_variance}/{len(windows)} sampled windows")
        warnings.append("Sampling cannot prove every frame or every action is correct; inspect scene previews")
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as exc:
        failures.append(f"Verification could not complete: {type(exc).__name__}: {exc}")
    report["passed"] = not failures
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    parser.add_argument("--aspect", choices=["9:16", "16:9"])
    parser.add_argument("--width", type=int)
    parser.add_argument("--height", type=int)
    parser.add_argument("--expected-duration", type=float)
    parser.add_argument("--plan", type=Path, help="Scene plan JSON; samples inside individual scenes")
    parser.add_argument("--audio-dir", type=Path,
                        help="Compare exported speech against original job-N.mp3/wav files (requires --plan)")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    plan = json.loads(args.plan.read_text()) if args.plan else None
    report = verify(args.file, aspect=args.aspect, width=args.width, height=args.height,
                    expected_duration=args.expected_duration, plan=plan, audio_dir=args.audio_dir)
    serialized = json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(serialized, encoding="utf-8")
    print(serialized, end="")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
